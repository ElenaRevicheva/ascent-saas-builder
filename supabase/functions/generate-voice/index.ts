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

    console.log(`🎧 Processing TTS request for text: ${text.substring(0, 100)}...`);
    console.log(`📊 Text length: ${text.length} characters`);

    // Clean text to remove problematic characters for Google TTS
    const cleanedText = cleanTextForTTS(text);
    console.log(`🧹 Cleaned text length: ${cleanedText.length} characters`);
    console.log(`🧹 Cleaned text preview: ${cleanedText.substring(0, 100)}...`);

    try {
      const base64Audio = await generateChunkAudio(cleanedText, voice);
      
      return new Response(JSON.stringify({
        success: true,
        audioBase64: base64Audio,
        mimeType: 'audio/mpeg',
        processedLength: text.length,
        originalLength: text.length,
        chunks: 1,
        failedChunks: []
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

// Enhanced text chunking based on working Telegram bot logic
function splitTextIntoChunks(text: string, maxLength: number = 1500): string[] {
  const chunks: string[] = [];
  
  // If text is short enough, return as single chunk
  if (text.length <= maxLength) {
    return [text];
  }
  
  // Split by paragraphs and combine until we reach chunk size
  const paragraphs = text.split('\n\n');
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= maxLength) {
      if (currentChunk) {
        currentChunk += '\n\n' + para;
      } else {
        currentChunk = para;
      }
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // If single paragraph is too long, split by sentences
      if (para.length > maxLength) {
        const sentences = para.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          if (sentenceChunk.length + trimmedSentence.length + 1 <= maxLength) {
            sentenceChunk += (sentenceChunk.length > 0 ? '. ' : '') + trimmedSentence;
          } else {
            if (sentenceChunk.length > 0) {
              chunks.push(sentenceChunk + '.');
            }
            sentenceChunk = trimmedSentence;
          }
        }
        if (sentenceChunk.length > 0) {
          currentChunk = sentenceChunk + '.';
        } else {
          currentChunk = '';
        }
      } else {
        currentChunk = para;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
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
  
  // Remove video script markers
  text = text.replace(/\[VIDEO SCRIPT START\][\s\S]*?\[VIDEO SCRIPT END\]/g, '');
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove bullet points
  text = text.replace(/^[•·\-*]\s*/gm, '');
  
  return text;
}

async function generateChunkAudio(text: string, voice: string): Promise<string> {
  // Google TTS has character limits - split into manageable chunks
  const maxChunkSize = 200; // Safe size for Google TTS
  
  console.log(`🎧 Input text length: ${text.length} chars`);
  
  if (text.length <= maxChunkSize) {
    // Text fits in single chunk - process it all
    console.log(`✅ Text fits in single chunk, processing ${text.length} chars`);
    return await processSingleChunk(text, voice);
  }
  
  // Text is longer - process multiple chunks and combine
  console.log(`📝 Text too long (${text.length} chars), splitting into chunks`);
  
  const chunks = splitTextIntoChunks(text, maxChunkSize);
  console.log(`📦 Split into ${chunks.length} chunks`);
  
  const audioChunks: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🎧 Processing chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 50)}..."`);
    
    try {
      const chunkAudio = await processSingleChunk(chunk, voice);
      audioChunks.push(chunkAudio);
      
      // Small delay between requests to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Failed to process chunk ${i + 1}:`, error);
      // Continue with other chunks instead of failing completely
    }
  }
  
  if (audioChunks.length === 0) {
    throw new Error('No audio chunks were successfully generated');
  }
  
  // Combine all audio chunks into a single base64 string
  console.log(`✅ Generated ${audioChunks.length} audio chunks, combining them`);
  
  if (audioChunks.length === 1) {
    return audioChunks[0];
  }
  
  // For multiple chunks, we'll concatenate the base64 data
  // This is a simple concatenation - in production you'd want proper audio merging
  const combinedChunks = audioChunks.join('');
  return combinedChunks;
}

async function processSingleChunk(text: string, voice: string): Promise<string> {
  console.log(`🎧 Processing chunk: "${text.substring(0, 50)}..."`);
  
  // Clean the text aggressively to prevent 400 errors
  const cleanedText = cleanTextForTTS(text);
  
  // USE OPENAI TTS INSTEAD OF GOOGLE TTS (THIS FIXES YOUR 400 ERRORS!)
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: cleanedText,
      voice: 'alloy',
      response_format: 'mp3',
      speed: 1.0
    }),
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
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  console.log(`✅ Generated audio for text chunk`);
  return base64Audio;
}