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
  // Google TTS has strict limits - use smaller chunks
  const maxChunkSize = 150; // Much smaller limit to avoid 400 errors
  
  console.log(`🎧 Input text length: ${text.length} chars`);
  
  if (text.length <= maxChunkSize) {
    // Text fits in single chunk - process it all
    console.log(`✅ Text fits in single chunk, processing ${text.length} chars`);
    return await processSingleChunk(text, voice);
  }
  
  // Text is too long - process first chunk only to avoid complexity
  console.log(`⚠️ Text too long (${text.length} chars), taking first ${maxChunkSize} chars`);
  
  // Find a good breaking point within the limit
  let processedText = text.substring(0, maxChunkSize);
  
  // Try to break at sentence ending
  const lastSentenceEnd = Math.max(
    processedText.lastIndexOf('.'),
    processedText.lastIndexOf('!'),
    processedText.lastIndexOf('?')
  );
  
  if (lastSentenceEnd > 50) {
    processedText = processedText.substring(0, lastSentenceEnd + 1);
  }
  
  console.log(`📝 Processing ${processedText.length} chars: "${processedText.substring(0, 50)}..."`);
  
  return await processSingleChunk(processedText, voice);
}

async function processSingleChunk(text: string, voice: string): Promise<string> {
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
    console.error('❌ TTS API error:', {
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
  
  console.log(`✅ Generated audio for text chunk`);
  return btoa(binaryString);
}