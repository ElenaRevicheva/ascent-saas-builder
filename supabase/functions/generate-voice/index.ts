import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Clean text for TTS
    const cleanedText = cleanTextForTTS(text);
    
    console.log('🎵 Generating voice for text:', cleanedText);
    
    // Generate audio using OpenAI TTS with Nova voice
    const base64Audio = await generateOpenAIVoice(cleanedText);

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
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI TTS error:', errorText);
    throw new Error(`OpenAI TTS failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBytes = new Uint8Array(arrayBuffer);
  
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

