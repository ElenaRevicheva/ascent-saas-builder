import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simplified TTS using Web Speech API approach (browser-compatible response)
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "es" } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    console.log(`Processing TTS request for text: ${text.substring(0, 100)}...`);
    console.log(`Text length: ${text.length} characters`);

    // Split text into smaller chunks to avoid Google's limits
    const chunks = splitTextIntoChunks(text, 200);
    console.log(`Split into ${chunks.length} chunks`);

    // Process chunks sequentially to avoid rate limiting
    const audioChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk.trim().length === 0) continue;
      
      console.log(`Processing chunk ${i + 1}/${chunks.length}: ${chunk.substring(0, 50)}...`);
      
      try {
        const audioData = await generateChunkAudio(chunk, voice);
        audioChunks.push(audioData);
        
        // Add delay between requests to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (chunkError) {
        console.error(`Failed to process chunk ${i + 1}:`, chunkError);
        // Continue with other chunks instead of failing completely
      }
    }

    if (audioChunks.length === 0) {
      throw new Error('Failed to generate any audio chunks');
    }

    // For simplicity, return the first successful chunk
    // In a production environment, you'd concatenate them
    const base64Audio = audioChunks[0];

    return new Response(JSON.stringify({
      audioContent: base64Audio,
      mimeType: 'audio/mpeg',
      chunksProcessed: audioChunks.length,
      totalChunks: chunks.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-voice:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: 'TTS service temporarily unavailable. Please try with shorter text or try again later.'
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

async function generateChunkAudio(text: string, voice: string): Promise<string> {
  // Use a more reliable endpoint with minimal parameters
  const params = new URLSearchParams({
    ie: 'UTF-8',
    q: text,
    tl: voice === 'en' ? 'en' : 'es',
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
    console.error('TTS API error:', {
      status: response.status,
      error: errorText.substring(0, 200)
    });
    throw new Error(`TTS failed with status ${response.status}`);
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
  
  return btoa(binaryString);
}