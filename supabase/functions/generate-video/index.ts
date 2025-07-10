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

    console.log(`Generating gentle video voice for script: ${videoScript.substring(0, 100)}...`);

    // Check if user has uploaded their own avatar video
    let userAvatarUrl = null;
    let avatarType = 'default';
    
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const fileName = `${userId}/avatar.mp4`;
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Check if file exists
      try {
        const headResponse = await fetch(data.publicUrl, { method: 'HEAD' });
        if (headResponse.ok) {
          userAvatarUrl = data.publicUrl;
          avatarType = 'user';
          console.log(`Found user avatar video: ${userAvatarUrl}`);
        }
      } catch (error) {
        console.log('No user avatar found, will use default');
      }
    }
    
    // If no user avatar, use default avatar
    if (!userAvatarUrl) {
      // Use the avatar.mp4 file that's already uploaded to the avatars bucket
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl('avatar.mp4');
      
      try {
        const headResponse = await fetch(data.publicUrl, { method: 'HEAD' });
        if (headResponse.ok) {
          userAvatarUrl = data.publicUrl;
          console.log(`Using default avatar video: ${userAvatarUrl}`);
        } else {
          console.log('Default avatar not found, will proceed with audio only');
        }
      } catch (error) {
        console.log('Default avatar not available, will proceed with audio only');
      }
    }

    // Generate TTS audio for the video script with gentle teacher voice
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
          stability: 0.85,
          similarity_boost: 0.75,
          style: 0.15,
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
      
      // Handle specific ElevenLabs errors
      if (ttsResponse.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      } else if (ttsResponse.status === 402) {
        throw new Error('QUOTA_EXCEEDED');
      } else if (ttsResponse.status === 401) {
        throw new Error('INVALID_API_KEY');
      } else {
        throw new Error(`ElevenLabs TTS API error: ${ttsResponse.status} - ${errorText}`);
      }
    }

    // Get audio buffer and convert to base64 safely
    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioArrayBuffer);
    
    // Convert to string first, then to base64 (avoiding stack overflow)
    let binaryString = '';
    const chunkSize = 8192;
    
    for (let i = 0; i < audioBytes.length; i += chunkSize) {
      const chunk = audioBytes.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Audio = btoa(binaryString);

    console.log(`Generated audio with ${audioBytes.length} bytes, base64 length: ${base64Audio.length}`);
    
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