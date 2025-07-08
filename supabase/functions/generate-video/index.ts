import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    const { videoScript, voice = "pFZP5JQG7iQjIQuC4Bku" } = body; // Default to Lily voice
    
    if (!videoScript) {
      console.error('No video script provided');
      return new Response(JSON.stringify({ 
        error: 'Video script is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      console.error('ElevenLabs API key not found');
      return new Response(JSON.stringify({ 
        error: 'ELEVENLABS_API_KEY not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Generating video for script: ${videoScript.substring(0, 100)}...`);

    // First, generate TTS audio for the video script
    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: videoScript,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true
        }
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('ElevenLabs TTS API error:', {
        status: ttsResponse.status,
        statusText: ttsResponse.statusText,
        errorText: errorText,
        voice: voice
      });
      throw new Error(`ElevenLabs TTS API error: ${ttsResponse.status} - ${errorText}`);
    }

    // Get audio buffer and convert to base64 safely
    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioArrayBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow
    let base64Audio = '';
    const chunkSize = 8192; // Process in smaller chunks
    
    for (let i = 0; i < audioBytes.length; i += chunkSize) {
      const chunk = audioBytes.slice(i, i + chunkSize);
      const chunkString = String.fromCharCode.apply(null, Array.from(chunk));
      base64Audio += btoa(chunkString);
    }

    console.log(`Generated audio with ${audioBytes.length} bytes, base64 length: ${base64Audio.length}`);
    
    return new Response(JSON.stringify({
      audioContent: base64Audio,
      mimeType: 'audio/mpeg',
      duration: Math.ceil(videoScript.length / 10), // Rough estimate: 10 chars per second
      message: 'Video generation completed with audio. Avatar video will be overlaid on frontend.'
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