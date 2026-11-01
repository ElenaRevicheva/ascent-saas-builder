import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pere + Titi's own voices (28 Oct 2026, Elena: "give voices to Pere and Titi like Telegram"): the same MiniMax Speech
// voices the EspaLuz Telegram bot pins (HERO_VOICES in its main.py), via Replicate. Needs the REPLICATE_API_TOKEN
// secret on this project; without it, or on any failure, the usual single voice below answers, so the classroom never
// goes silent because of the heroes.
const HERO_VOICES: Record<string, { voice_id: string; pitch: number; speed: number; emotion: string }> = {
  pere: { voice_id: "Spanish_Rudolph", pitch: -2, speed: 0.82, emotion: "calm" },
  // 31 Oct 2026 (Alisa: "Titi habla muy rápido, no puedo intentarlo"): 1.15 plus a high cartoon pitch was too fast for a
  // six-year-old to repeat. 0.9 keeps him playful and lets her follow. Twin: main.py TITI_SPEED default.
  titi: { voice_id: "Spanish_AnimeCharacter", pitch: 3, speed: 0.9, emotion: "happy" },
};

// 1 Nov 2026 (Elena: "go free" - Replicate is $0.10 per 1,000 characters, ~$0.40-0.80 a lesson, and ran dry at 17:41
// UTC): the FREE voice answers first - Gemini TTS on a key whose Google project has NO billing (free tier; Elena
// accepted that Google may use these lines to improve its products). Secret GEMINI_TTS_API_KEY - deliberately not
// GEMINI_API_KEY, the fleet's prepaid key that answers 402. Without it, or on any failure (daily free limit, 402),
// the old chain answers: Replicate hero voice -> OpenAI -> the page's own device voice. Nothing was switched off.
// Pere: slow, calm, wise; Titi: quick, playful (voices from Google's prebuilt list; env overrides).
const GEMINI_HEROES: Record<string, { voice: string; style: string }> = {
  pere: { voice: Deno.env.get('GEMINI_PERE_VOICE') ?? 'Sadaltager',
          style: 'slow, calm and warm, like a wise old sloth telling a small child something important' },
  titi: { voice: Deno.env.get('GEMINI_TITI_VOICE') ?? 'Puck',
          style: 'playful, cheeky and full of energy, like a happy little monkey, but clear enough for a six-year-old' },
  usual: { voice: Deno.env.get('GEMINI_USUAL_VOICE') ?? 'Sulafat', style: 'warm, kind and clear, like a good teacher' },
};

// 1 Nov 2026 (Elena: "if one fails, the next available must answer at once"): no voice call had a time limit, so a
// provider that hangs instead of failing kept the child waiting. Each now gives up after VOICE_TIMEOUT_MS.
const VOICE_TIMEOUT_MS = Number(Deno.env.get('VOICE_TIMEOUT_MS') || 20000);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { text, voice = "es", userId, hero } = body;

    // 1 Nov 2026 (Elena: "more options - Titi more playful, Pere more kids style"): a PRIVATE voice lab for choosing
    // voices by ear. Only callers holding the bots' secret may use it; the free key never leaves this function.
    // { voiceLab: "list", filters: {language_code: [...], pitch: [...], persona: [...], search: "..."} } -> catalog;
    // { voiceLab: "try", text, testVoice, testStyle, testModel } -> one WAV line in that voice, style and model.
    if (body.voiceLab) {
      const secret = Deno.env.get('ESPALUZ_BOT_SECRET');
      if (!secret || req.headers.get('x-espaluz-bot-secret') !== secret) throw new Error('Unauthorized');
      if (body.voiceLab === 'list') {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(body.filters ?? {})) {
          for (const one of Array.isArray(v) ? v : [v]) q.append(k, String(one));
        }
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/voices?${q}`, {
          headers: { 'x-goog-api-key': Deno.env.get('GEMINI_TTS_API_KEY')! }, signal: AbortSignal.timeout(VOICE_TIMEOUT_MS) });
        return new Response(await r.text(), { status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const audio = await generateGeminiVoice('usual', cleanTextForTTS(String(text ?? '')),
        String(body.testVoice ?? ''), String(body.testStyle ?? ''), String(body.testModel ?? ''));
      return new Response(JSON.stringify({ audioContent: audio, mimeType: 'audio/wav' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!text || !userId) {
      throw new Error('Text and userId are required');
    }

    if (text.length > 5000) {
      throw new Error('Text exceeds maximum length of 5000 characters');
    }

    // Clean text for TTS
    const cleanedText = cleanTextForTTS(text);

    let base64Audio = '';
    let spokenBy = 'openai-nova';
    let mimeType = 'audio/mpeg';
    if (Deno.env.get('GEMINI_TTS_API_KEY')) {
      try {
        base64Audio = await generateGeminiVoice(hero && GEMINI_HEROES[hero] ? hero : 'usual', cleanedText);
        spokenBy = `gemini-${hero || 'usual'}`;
        mimeType = 'audio/wav';
      } catch (geminiError) {
        console.error(`free gemini voice failed, trying the next voice:`, geminiError);
      }
    }
    if (!base64Audio && hero && HERO_VOICES[hero] && Deno.env.get('REPLICATE_API_TOKEN')) {
      try {
        base64Audio = await generateHeroVoice(hero, cleanedText);
        spokenBy = `minimax-${hero}`;
      } catch (heroError) {
        console.error(`hero voice ${hero} failed, using the usual voice:`, heroError);
      }
    }
    if (!base64Audio) {
      // Generate audio using OpenAI TTS with Nova voice
      base64Audio = await generateOpenAIVoice(cleanedText);
    }

    const response = {
      success: true,
      audioContent: base64Audio,
      mimeType,
      spokenBy,
      processedText: cleanedText.length > 0 ? cleanedText.substring(0, 100) + '...' : ''
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-voice:', error);
    return new Response(JSON.stringify({
      error: error.message,
      fallback: 'Voice generation temporarily unavailable. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// One hero line in that hero's cartoon voice: MiniMax Speech 2.6 HD on Replicate -> mp3 bytes as base64.
async function generateHeroVoice(hero: string, text: string): Promise<string> {
  const token = Deno.env.get('REPLICATE_API_TOKEN')!;
  const v = HERO_VOICES[hero];
  const spoken = text.replace(/\s*\/\s*/g, '. ').slice(0, 900); // "Hola. / Hello." pauses between languages, never says "slash"
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait=60' };
  const body = { input: { text: spoken, voice_id: v.voice_id, pitch: v.pitch, speed: v.speed, emotion: v.emotion,
                          language_boost: 'Automatic', audio_format: 'mp3', sample_rate: 32000 } };
  let r = await fetch('https://api.replicate.com/v1/models/minimax/speech-2.6-hd/predictions', { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(VOICE_TIMEOUT_MS) });
  if (r.status === 429) { // low-balance accounts get ~6 requests a minute
    await new Promise((res) => setTimeout(res, 11000));
    r = await fetch('https://api.replicate.com/v1/models/minimax/speech-2.6-hd/predictions', { method: 'POST', headers, body: JSON.stringify(body) });
  }
  if (!r.ok) throw new Error(`Replicate ${r.status}: ${(await r.text()).slice(0, 200)}`);
  let p = await r.json();
  const t0 = Date.now();
  while ((p.status === 'starting' || p.status === 'processing') && Date.now() - t0 < 50000) {
    await new Promise((res) => setTimeout(res, 2000));
    p = await (await fetch(p.urls.get, { headers })).json();
  }
  const out = Array.isArray(p.output) ? p.output[0] : p.output;
  if (!out) throw new Error(`no audio (${p.status}: ${p.error || ''})`);
  const audio = await fetch(out);
  if (!audio.ok) throw new Error(`audio download ${audio.status}`);
  return bytesToBase64(new Uint8Array(await audio.arrayBuffer()));
}

// 1 Nov 2026 19:58 UTC: Google's free tier allows only 10 voice lines A DAY per TTS model ("limit: 10 requests per day
// on Free Tier", 429) - one lesson needs 20-30. Each model has its own allowance, so the free step is itself a
// waterfall of models: a spent one (429) or one this API does not serve hands over to the next, then Replicate.
const GEMINI_TTS_MODELS = (Deno.env.get('GEMINI_TTS_MODELS') || Deno.env.get('GEMINI_TTS_MODEL') ||
  'gemini-3.8-flash-lite-tts,gemini-3.8-flash-tts,gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts')
  .split(',').map((m) => m.trim()).filter(Boolean);

// One line in a free Gemini voice (Interactions API, unary = a whole WAV file).
async function generateGeminiVoice(who: string, text: string, testVoice = '', testStyle = '', testModel = ''): Promise<string> {
  const errors: string[] = [];
  for (const model of testModel ? [testModel] : GEMINI_TTS_MODELS) {
    try {
      return await geminiVoiceOnce(model, who, text, testVoice, testStyle);
    } catch (e) {
      errors.push(`${model}: ${(e as Error).message.slice(0, 120)}`);
    }
  }
  throw new Error(errors.join(' || '));
}

async function geminiVoiceOnce(model: string, who: string, text: string, testVoice: string, testStyle: string): Promise<string> {
  const g = { voice: testVoice || GEMINI_HEROES[who].voice, style: testStyle || GEMINI_HEROES[who].style };
  const spoken = text.replace(/\s*\/\s*/g, '. ').slice(0, 900); // "Hola. / Hello." pauses between languages, never says "slash"
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'x-goog-api-key': Deno.env.get('GEMINI_TTS_API_KEY')!, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(VOICE_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      input: [{ type: 'user_input', content: [{ type: 'text', text: spoken,
        annotations: [{ type: 'speech_metadata', style: g.style }] }] }],
      response_format: { type: 'audio', mime_type: 'audio/wav', sample_rate: 16000 },
      generation_config: { speech_config: [{ voice: g.voice }] },
    }),
  });
  if (!r.ok) throw new Error(`Gemini TTS ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const audio = (j.steps ?? []).filter((s: any) => s.type === 'model_output')
    .flatMap((s: any) => s.content ?? []).filter((c: any) => c.type === 'audio').pop();
  if (!audio?.data) throw new Error('Gemini TTS: no audio in the answer');
  return audio.data;
}

// Generate voice using OpenAI TTS
async function generateOpenAIVoice(text: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'nova', // Female, soft, clear voice
      response_format: 'mp3',
      speed: 0.9 // Slightly slower for better clarity
    }),
    signal: AbortSignal.timeout(VOICE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI TTS error:', errorText);
    throw new Error(`OpenAI TTS failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return bytesToBase64(new Uint8Array(arrayBuffer));
}

function bytesToBase64(audioBytes: Uint8Array): string {
  // Convert to base64
  let binaryString = '';
  const chunkSize = 8192;

  for (let i = 0; i < audioBytes.length; i += chunkSize) {
    const chunk = audioBytes.slice(i, i + chunkSize);
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binaryString);
}

function cleanTextForTTS(text: string): string {
  text = text.replace(/\*+([^*]+)\*+/g, '$1');
  text = text.replace(/_+([^_]+)_+/g, '$1');
  text = text.replace(/`+([^`]+)`+/g, '$1');
  text = text.replace(/"([^"]+)"/g, '$1');
  text = text.replace(/'([^']+)'/g, '$1');
  text = text.replace(/^\d+\.\s*/gm, '');
  text = text.replace(/\n\d+\.\s*/g, '\n');
  text = text.replace(/[0-9]️⃣/g, '');
  text = text.replace(/[#@\[\](){}<>]/g, '');
  text = text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/^[•·\-*]\s*/gm, '');
  return text;
}
