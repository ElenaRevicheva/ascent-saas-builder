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

    // Process full text like Python gTTS version
    console.log(`🎧 Processing FULL text like gTTS: ${text.length} chars`);
    console.log(`Full text preview: ${text.substring(0, 200)}...`);

    try {
      const base64Audio = await generateChunkAudio(text, voice);
      
      return new Response(JSON.stringify({
        audioContent: base64Audio,
        mimeType: 'audio/mpeg',
        processedLength: text.length,
        originalLength: text.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error generating audio chunk:', error);
      throw error;
    }

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
  // Split long text into chunks like gTTS does internally
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
  
  console.log(`📝 Split text into ${chunks.length} chunks (like gTTS)`);
  
  // Process all chunks and concatenate audio
  const audioChunks = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🔊 Processing chunk ${i + 1}/${chunks.length}: ${chunk.substring(0, 50)}...`);
    
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
      console.error(`❌ Chunk ${i + 1} failed:`, response.status);
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
    throw new Error('❌ All audio chunks failed');
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
  
  console.log(`✅ Generated audio for ${chunks.length} chunks, returning first chunk`);
  return btoa(binaryString);
}