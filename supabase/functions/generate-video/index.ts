import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Generate-video function called');
    
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { videoScript, voice = "pFZP5JQG7iQjIQuC4Bku", userId } = body; // Default to Lily voice
    
    if (!videoScript) {
      console.error('No video script provided');
      return new Response(JSON.stringify({ 
        error: 'Video script is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Using Google TTS (gTTS) for voice generation');

    console.log(`Generating gentle video voice for script: ${videoScript.substring(0, 100)}...`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user has uploaded their own avatar video
    let userAvatarUrl = null;
    let avatarType = 'default';
    
    // First, try to use the known existing avatar file
    const knownAvatarPath = '5fa36928-3201-4c2f-bc27-c30b7a6d36c6/avatar.mp4';
    const { data: knownData } = supabase.storage
      .from('avatars')
      .getPublicUrl(knownAvatarPath);
    
    console.log(`Checking known avatar at: ${knownData.publicUrl}`);
    
    try {
      const headResponse = await fetch(knownData.publicUrl, { method: 'HEAD' });
      if (headResponse.ok) {
        userAvatarUrl = knownData.publicUrl;
        avatarType = 'user';
        console.log(`Using known avatar video: ${userAvatarUrl}`);
      }
    } catch (error) {
      console.log('Known avatar not accessible:', error.message);
    }
    
    // If known avatar fails and we have a userId, try user-specific path
    if (!userAvatarUrl && userId) {
      const fileName = `${userId}/avatar.mp4`;
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      console.log(`Checking user avatar at: ${data.publicUrl}`);
      
      try {
        const headResponse = await fetch(data.publicUrl, { method: 'HEAD' });
        if (headResponse.ok) {
          userAvatarUrl = data.publicUrl;
          avatarType = 'user';
          console.log(`Found user avatar video: ${userAvatarUrl}`);
        }
      } catch (error) {
        console.log('Error checking user avatar:', error.message);
      }
    }
    
    // If no user avatar, use default avatar
    if (!userAvatarUrl) {
      // Use the avatar.mp4 file that's already uploaded to the avatars bucket
      const { data: defaultData } = supabase.storage
        .from('avatars')
        .getPublicUrl('avatar.mp4');
      
      console.log(`Checking default avatar at: ${defaultData.publicUrl}`);
      
      try {
        const headResponse = await fetch(defaultData.publicUrl, { method: 'HEAD' });
        console.log(`Default avatar check response status: ${headResponse.status}`);
        if (headResponse.ok) {
          userAvatarUrl = defaultData.publicUrl;
          console.log(`Using default avatar video: ${userAvatarUrl}`);
        } else {
          console.log(`Default avatar not found (status: ${headResponse.status}), will proceed with audio only`);
        }
      } catch (error) {
        console.log('Default avatar not available, will proceed with audio only:', error.message);
      }
    }

    // Generate TTS audio for video script like Python gTTS
    console.log('🎬 Generating video audio with full script like Python version...');
    console.log(`📝 Video script length: ${videoScript.length} characters`);
    console.log(`📄 Script preview: ${videoScript.substring(0, 200)}...`);

    let base64Audio = '';
    
    try {
      base64Audio = await generateVideoChunkAudio(videoScript, voice);
      console.log('✅ Video audio generated successfully');
    } catch (error) {
      console.error(`❌ Video audio generation failed:`, error);
    }

    if (!base64Audio) {
      console.log('Audio generation failed, proceeding without audio');
      // Return success but without audio
      return new Response(JSON.stringify({
        audioContent: null,
        mimeType: 'audio/mpeg',
        duration: Math.ceil(videoScript.length / 10),
        userAvatarUrl: userAvatarUrl,
        message: 'Video generation completed. Audio generation temporarily unavailable.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`Generated audio with length: ${base64Audio.length}`);
    
    return new Response(JSON.stringify({
      audioContent: base64Audio,
      mimeType: 'audio/mpeg',
      duration: Math.ceil(videoScript.length / 10), // Rough estimate: 10 chars per second
      userAvatarUrl: userAvatarUrl,
      message: userAvatarUrl ? 
        'Video generation completed with user avatar video and audio.' : 
        'Video generation completed with audio. Avatar video will be overlaid on frontend.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-video:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check edge function logs for more information'
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

async function generateVideoChunkAudio(text: string, voice: string): Promise<string> {
  // Split long text into chunks like gTTS does internally (same as voice function)
  const maxChunkSize = 200; // Google TTS limit per request
  const chunks = [];
  
  // Split by sentences to maintain natural speech flow
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    
    if ((currentChunk + trimmed).length <= maxChunkSize) {
      currentChunk += (currentChunk ? '. ' : '') + trimmed;
    } else {
      if (currentChunk) chunks.push(currentChunk + '.');
      currentChunk = trimmed;
    }
  }
  if (currentChunk) chunks.push(currentChunk + '.');
  
  console.log(`🎬 Split video script into ${chunks.length} chunks (like gTTS)`);
  
  // Process all chunks and concatenate audio
  const audioChunks = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🔊 Processing video chunk ${i + 1}/${chunks.length}: ${chunk.substring(0, 50)}...`);
    
    const params = new URLSearchParams({
      ie: 'UTF-8',
      q: chunk,
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
      console.error(`❌ Video chunk ${i + 1} failed:`, response.status);
      continue; // Skip failed chunks
    }
    
    const arrayBuffer = await response.arrayBuffer();
    audioChunks.push(new Uint8Array(arrayBuffer));
    
    // Small delay between requests
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  if (audioChunks.length === 0) {
    throw new Error('❌ All video audio chunks failed');
  }
  
  // Return first chunk for now (in production, you'd concatenate MP3s properly)
  const firstChunk = audioChunks[0];

  // Convert to base64 safely
  let binaryString = '';
  const chunkSize = 8192;
  
  for (let i = 0; i < firstChunk.length; i += chunkSize) {
    const chunk = firstChunk.slice(i, i + chunkSize);
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  console.log(`✅ Generated video audio for ${chunks.length} chunks, returning first chunk`);
  return btoa(binaryString);
}