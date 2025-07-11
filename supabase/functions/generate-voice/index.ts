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
    const { text, voice = "pFZP5JQG7iQjIQuC4Bku" } = await req.json(); // Default to Lily voice
    
    if (!text) {
      throw new Error('Text is required');
    }

    console.log(`Generating voice with gTTS for text: ${text.substring(0, 100)}...`);
    console.log(`Text length: ${text.length} characters`);

    // Use Google Text-to-Speech (gTTS) API
    const ttsParams = new URLSearchParams({
      ie: 'UTF-8',
      q: text,
      tl: voice === 'es' ? 'es' : 'en', // Default to Spanish for EspaLuz
      client: 'tw-ob',
      idx: '0',
      total: '1',
      textlen: text.length.toString()
    });

    const response = await fetch(`https://translate.google.com/translate_tts?${ttsParams}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google TTS API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      
      // Handle specific Google TTS errors
      if (response.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      } else if (response.status === 403) {
        throw new Error('ACCESS_DENIED');
      } else {
        throw new Error(`Google TTS API error: ${response.status} ${errorText}`);
      }
    }

    // Get audio buffer and convert to base64 safely
    const arrayBuffer = await response.arrayBuffer();
    const audioBytes = new Uint8Array(arrayBuffer);
    
    // Convert to string first, then to base64 (avoiding stack overflow)
    let binaryString = '';
    const chunkSize = 8192;
    
    for (let i = 0; i < audioBytes.length; i += chunkSize) {
      const chunk = audioBytes.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Audio = btoa(binaryString);

    return new Response(JSON.stringify({
      audioContent: base64Audio,
      mimeType: 'audio/mpeg'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-voice:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});