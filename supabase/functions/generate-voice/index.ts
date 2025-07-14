import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "es", userId } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    // Clean text for TTS (identical to video)
    const cleanedText = cleanTextForTTS(text);
    
    let base64Audio = '';
    try {
      base64Audio = await generateVoiceChunkAudio(cleanedText, voice);
    } catch (error) {
      console.error(`❌ Voice audio generation failed:`, error);
    }

    // Optionally upload to Supabase storage (if you want to match video exactly, you can skip this and just return base64)
    // For now, return base64 directly for simplicity
    const response = {
      success: true,
      audioContent: base64Audio,
      mimeType: 'audio/mpeg',
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

// --- COPY FROM VIDEO GENERATION ---
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

async function generateVoiceChunkAudio(text: string, voice: string): Promise<string> {
  // Google TTS has character limits - split into manageable chunks
  const maxChunkSize = 200; // Safe size for Google TTS
  
  if (text.length <= maxChunkSize) {
    // Text fits in single chunk - process it all
    return await processVoiceSingleChunk(text, voice);
  }
  
  // Text is longer - process multiple chunks and combine
  const chunks = splitTextIntoChunks(text, maxChunkSize);
  const audioChunks: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const chunkAudio = await processVoiceSingleChunk(chunk, voice);
      audioChunks.push(chunkAudio);
      // Small delay between requests to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      // Continue with other chunks instead of failing completely
    }
  }
  
  if (audioChunks.length === 0) {
    throw new Error('No voice audio chunks were successfully generated');
  }
  
  // Combine all audio chunks into a single base64 string
  if (audioChunks.length === 1) {
    return audioChunks[0];
  }
  // For multiple chunks, we'll concatenate the base64 data
  // This is a simple concatenation - in production you'd want proper audio merging
  const combinedChunks = audioChunks.join('');
  return combinedChunks;
}

async function processVoiceSingleChunk(text: string, voice: string): Promise<string> {
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
    throw new Error(`Voice TTS failed with status ${response.status}`);
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

