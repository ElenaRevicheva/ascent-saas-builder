import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, language } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log(`Processing voice message in language: ${language || 'auto-detect'}`);
    console.log(`Audio data length: ${audio.length} characters`);

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    console.log(`Processed binary audio length: ${binaryAudio.length} bytes`);

    // 30 Oct 2026: OpenAI has no credits since 23 Oct (Whisper 429 insufficient_quota -> every classroom answer was
    // "I didn't hear you"). Free first, the fleet's order rule: Groq's Whisper (same model family, free tier), then
    // OpenAI. A provider without a secret is skipped; a failing one hands over to the next.
    const providers: [string, string | undefined, string, string][] = [
      ['groq', Deno.env.get('GROQ_API_KEY'), 'https://api.groq.com/openai/v1/audio/transcriptions', 'whisper-large-v3-turbo'],
      ['groq', Deno.env.get('GROQ_API_KEY'), 'https://api.groq.com/openai/v1/audio/transcriptions', 'whisper-large-v3'],
      ['openai', Deno.env.get('OPENAI_API_KEY'), 'https://api.openai.com/v1/audio/transcriptions', 'whisper-1'],
    ];
    const errors: string[] = [];
    let result: any = null;
    for (const [name, key, url, model] of providers) {
      if (!key) continue;
      const formData = new FormData();
      formData.append('file', new Blob([binaryAudio], { type: 'audio/webm' }), 'audio.webm');
      formData.append('model', model);
      if (language) {
        formData.append('language', language);
      }
      const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${key}` }, body: formData });
      if (!response.ok) {
        const why = `${name} ${model}: ${response.status} ${(await response.text()).slice(0, 200)}`;
        console.error('Whisper provider failed, trying the next:', why);
        errors.push(why);
        continue;
      }
      result = await response.json();
      console.log(`transcribed by ${name} ${model}`);
      break;
    }
    if (!result) {
      throw new Error(errors.length ? `Whisper API error: ${errors.join(' | ')}` : 'No speech-to-text provider configured (GROQ_API_KEY or OPENAI_API_KEY)');
    }
    console.log('Transcription result:', result.text);

    return new Response(
      JSON.stringify({ 
        text: result.text,
        detectedLanguage: result.language || language || 'unknown'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in voice-to-text:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});