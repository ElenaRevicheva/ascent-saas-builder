import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Real EspaLuz: one photo + our own voice -> photoreal lip-sync video (scripts/espaluz-avatar in cto-aipa, plan in
// docs/espaluz/TALKING_ESPALUZ_IN_CHAT_PLAN_2026-11-05.md). Every clip costs credits, so three guards run FIRST and each
// answers 200 with real:false, because the text and voice have already been delivered: a paid subscription, a monthly
// cap per family, and a wallet floor (Elena approved 100 credits for this stage: 379 -> 279).
const RUNWAY_API = 'https://api.dev.runwayml.com/v1';
const ESPALUZ_AVATAR_ID = Deno.env.get('RUNWAY_ESPALUZ_AVATAR_ID') || 'd1495436-9e57-4151-885f-51c8b1733620';
const TALKING_MONTHLY_CAP = Number(Deno.env.get('TALKING_MONTHLY_CAP') || 30);
const RUNWAY_WALLET_FLOOR = Number(Deno.env.get('RUNWAY_WALLET_FLOOR') || 279);
const TALKING_MAX_CHARS = 450; // about 30 seconds of speech

async function realEspaLuz(req: Request, body: any): Promise<Response> {
  const json = (o: unknown) => new Response(JSON.stringify(o), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const no = (reason: string) => { console.log(`[talking] no clip: ${reason}`); return json({ real: false, reason }); };
  const key = Deno.env.get('RUNWAY_API_KEY');
  if (!key) return no('no_key');
  const authHeader = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return no('not_signed_in');
  const rw = (path: string, init: RequestInit = {}) => fetch(RUNWAY_API + path, { ...init, signal: AbortSignal.timeout(30000),
    headers: { 'Authorization': `Bearer ${key}`, 'X-Runway-Version': '2024-11-06', 'Content-Type': 'application/json' } });

  if (body.mode === 'real_status') {
    if (!/^[0-9a-f-]{36}$/i.test(String(body.taskId))) return no('bad_task');
    const task = await (await rw('/tasks/' + body.taskId)).json();
    if (task.status === 'SUCCEEDED') return json({ real: true, status: 'done', url: task.output?.[0] });
    if (task.status === 'FAILED' || task.status === 'CANCELLED') { console.error('[talking] task failed', task.failure); return no('failed'); }
    return json({ real: true, status: 'working' });
  }

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const nowIso = new Date().toISOString();
  const { data: subs } = await db.from('user_subscriptions').select('id').eq('user_id', user.id).eq('status', 'active').gt('current_period_end', nowIso).limit(1);
  if (!subs?.length) return no('not_paid');
  const monthStart = nowIso.slice(0, 7) + '-01T00:00:00Z';
  const { count } = await db.from('learning_sessions').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('session_type', 'analytics').eq('content->>event', 'talking_video').gte('created_at', monthStart);
  if ((count ?? 0) >= TALKING_MONTHLY_CAP) return no('monthly_cap');
  const org = await (await rw('/organization')).json();
  if (typeof org.creditBalance !== 'number' || org.creditBalance <= RUNWAY_WALLET_FLOOR) return no('wallet_floor');

  const raw = String(body.videoScript ?? '');
  const marked = raw.match(/\[VIDEO SCRIPT START\]([\s\S]*?)\[VIDEO SCRIPT END\]/);
  let text = cleanTextForTTS(marked ? marked[1] : raw.replace(/\[VIDEO SCRIPT (START|END)\]/g, ' ')).trim();
  if (text.length > TALKING_MAX_CHARS) {
    const cut = text.slice(0, TALKING_MAX_CHARS);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
    text = end > 80 ? cut.slice(0, end + 1) : cut;
  }
  if (!text) return no('no_text');

  // Same voice chain as every voice note: nothing new to keep working.
  const voiced = await fetch(`${url}/functions/v1/generate-voice`, { method: 'POST', signal: AbortSignal.timeout(60000),
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice: 'es', userId: user.id }) });
  const v = await voiced.json();
  if (!voiced.ok || !v.audioContent) return no('no_voice');
  const wav = /wav/i.test(String(v.mimeType));
  const name = wav ? 'voice.wav' : 'voice.mp3';
  const up = await (await rw('/uploads', { method: 'POST', body: JSON.stringify({ filename: name, type: 'ephemeral' }) })).json();
  if (!up.uploadUrl) { console.error('[talking] upload start', JSON.stringify(up).slice(0, 200)); return no('upload'); }
  const form = new FormData();
  for (const [k, val] of Object.entries(up.fields as Record<string, string>)) form.append(k, val);
  form.append('file', new Blob([Uint8Array.from(atob(v.audioContent), (c) => c.charCodeAt(0))], { type: wav ? 'audio/wav' : 'audio/mpeg' }), name);
  const stored = await fetch(up.uploadUrl, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
  if (!stored.ok) { console.error('[talking] upload', stored.status); return no('upload'); }
  const task = await (await rw('/avatar_videos', { method: 'POST', body: JSON.stringify({ model: 'gwm1_avatars',
    avatar: { type: 'custom', avatarId: ESPALUZ_AVATAR_ID }, speech: { type: 'audio', audio: up.runwayUri } }) })).json();
  if (!task.id) { console.error('[talking] create', JSON.stringify(task).slice(0, 300)); return no('create'); }
  await db.from('learning_sessions').insert({ user_id: user.id, session_type: 'analytics', source: 'web',
    content: { event: 'talking_video', reason: String(body.reason ?? '').slice(0, 20), chars: text.length, task: task.id, voice: v.spokenBy } });
  console.log(`[talking] clip started reason=${body.reason} chars=${text.length} voice=${v.spokenBy} wallet=${org.creditBalance} used=${(count ?? 0) + 1}/${TALKING_MONTHLY_CAP}`);
  return json({ real: true, status: 'working', taskId: task.id });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // 5 Nov 2026: the real talking EspaLuz (Runway Characters) for paying families only. Old callers send no `mode`
    // and get the old answer below, so a page not yet published keeps working.
    if (body.mode === 'real' || body.mode === 'real_status') return await realEspaLuz(req, body);
    const { videoScript, voice = "es", userId } = body;
    
    // 5 Nov 2026: userId was only checked, never used (fixed avatar, free Google voice) - and the anonymous web free
    // trial has none, so every trial video failed with 500. The script is what matters.
    if (!videoScript) {
      throw new Error('Video script is required');
    }

    if (videoScript.length > 10000) {
      throw new Error('Video script exceeds maximum length of 10000 characters');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use the known working avatar video directly since file copying doesn't work with actual content
    const userAvatarUrl = 'https://euyidvolwqmzijkfrplh.supabase.co/storage/v1/object/public/avatars/5fa36928-3201-4c2f-bc27-c30b7a6d36c6/avatar.mp4';

    // Extract ONLY the text between [VIDEO SCRIPT START] and [VIDEO SCRIPT END] markers
    let scriptToUse = '';
    const videoStartMarker = '[VIDEO SCRIPT START]';
    const videoEndMarker = '[VIDEO SCRIPT END]';
    
    const startIndex = videoScript.indexOf(videoStartMarker);
    const endIndex = videoScript.indexOf(videoEndMarker);
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      scriptToUse = videoScript.substring(startIndex + videoStartMarker.length, endIndex).trim();
    } else {
      // Fallback if no markers found
      scriptToUse = 'Español: Gracias por practicar conmigo. Me encanta ayudarte con español.\nEnglish: Thank you for practicing with me. I love helping you with Spanish.';
    }

    // Clean text for TTS
    const cleanedScript = cleanTextForTTS(scriptToUse);

    let base64Audio = '';
    
    try {
      base64Audio = await generateVideoChunkAudio(cleanedScript, voice);
    } catch (error) {
      // Silent fail for audio generation
    }

    // Calculate estimated duration (rough estimate)
    const estimatedDuration = Math.max(5, Math.floor(scriptToUse.length / 15));

    const response = {
      success: true,
      audioContent: base64Audio,
      mimeType: 'audio/mpeg',
      userAvatarUrl,
      estimatedDuration,
      processedText: scriptToUse.length > 0 ? scriptToUse.substring(0, 100) + '...' : ''
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-video:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: 'Video generation temporarily unavailable. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (trimmedSentence.length === 0) continue;
    
    if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
      }
      currentChunk = trimmedSentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }
  
  return chunks.length > 0 ? chunks : [text];
}

// Enhanced text cleaning for speech based on working Telegram bot logic
function cleanTextForTTS(text: string): string {
  // Remove markdown formatting
  text = text.replace(/\*+([^*]+)\*+/g, '$1'); // Remove asterisks
  text = text.replace(/_+([^_]+)_+/g, '$1');   // Remove underscores
  text = text.replace(/`+([^`]+)`+/g, '$1');   // Remove backticks
  
  // Remove quotes but keep the content
  text = text.replace(/"([^"]+)"/g, '$1');
  text = text.replace(/'([^']+)'/g, '$1');
  
  // Remove numbers in lists (1. 2. etc)
  text = text.replace(/^\d+\.\s*/gm, '');
  text = text.replace(/\n\d+\.\s*/g, '\n');
  
  // Remove emoji numbers
  text = text.replace(/[0-9]️⃣/g, '');
  
  // Remove other common symbols but keep sentence flow
  text = text.replace(/[#@\[\](){}<>]/g, '');
  
  // Remove emojis and special characters
  text = text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove bullet points
  text = text.replace(/^[•·\-*]\s*/gm, '');
  
  return text;
}

async function generateVideoChunkAudio(text: string, voice: string): Promise<string> {
  // Google TTS has character limits - split into manageable chunks
  const maxChunkSize = 200; // Safe size for Google TTS
  
  console.log(`🎬 Input video script length: ${text.length} chars`);
  
  if (text.length <= maxChunkSize) {
    // Text fits in single chunk - process it all
    console.log(`✅ Video script fits in single chunk, processing ${text.length} chars`);
    return await processVideoSingleChunk(text, voice);
  }
  
  // Text is longer - process multiple chunks and combine
  console.log(`📝 Video script too long (${text.length} chars), splitting into chunks`);
  
  const chunks = splitTextIntoChunks(text, maxChunkSize);
  console.log(`📦 Split into ${chunks.length} chunks`);
  
  const audioChunks: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🎬 Processing video chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 50)}..."`);
    
    try {
      const chunkAudio = await processVideoSingleChunk(chunk, voice);
      audioChunks.push(chunkAudio);
      
      // Small delay between requests to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Failed to process video chunk ${i + 1}:`, error);
      // Continue with other chunks instead of failing completely
    }
  }
  
  if (audioChunks.length === 0) {
    throw new Error('No video audio chunks were successfully generated');
  }
  
  // Combine all audio chunks into a single base64 string
  console.log(`✅ Generated ${audioChunks.length} video audio chunks, combining them`);
  
  if (audioChunks.length === 1) {
    return audioChunks[0];
  }
  
  // For multiple chunks, we'll concatenate the base64 data
  // This is a simple concatenation - in production you'd want proper audio merging
  const combinedChunks = audioChunks.join('');
  return combinedChunks;
}

async function processVideoSingleChunk(text: string, voice: string): Promise<string> {
  const params = new URLSearchParams({
    ie: 'UTF-8',
    q: text,
    tl: 'es', // Always Spanish like your Python version
    client: 'tw-ob'
  });

  const response = await fetch(`https://translate.google.com/translate_tts?${params}`, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://translate.google.com/',
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Video TTS API error:', {
      status: response.status,
      error: errorText.substring(0, 200)
    });
    throw new Error(`Video TTS failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBytes = new Uint8Array(arrayBuffer);
  
  // Convert to base64 safely
  let binaryString = '';
  const chunkSize = 8192;
  
  for (let i = 0; i < audioBytes.length; i += chunkSize) {
    const chunk = audioBytes.slice(i, i + chunkSize);
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  console.log(`✅ Generated video audio for text chunk`);
  return btoa(binaryString);
}