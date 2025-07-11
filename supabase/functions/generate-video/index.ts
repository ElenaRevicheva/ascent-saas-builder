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
    const { videoScript, voice = "es", userId } = await req.json();
    
    if (!videoScript) {
      throw new Error('Video script is required');
    }

    console.log(`🎬 Processing video request for user: ${userId}`);
    console.log(`📝 Video script length: ${videoScript.length} characters`);
    console.log(`🎭 Voice model: ${voice}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get user's avatar video from storage
    let userAvatarUrl = null;
    
    if (userId) {
      try {
        // First try to find a known avatar
        const { data: avatarData } = await supabase.storage
          .from('avatars')
          .list(`${userId}`, { limit: 10 });

        if (avatarData && avatarData.length > 0) {
          // Look for avatar.mp4 first
          const avatarFile = avatarData.find(file => file.name === 'avatar.mp4');
          if (avatarFile) {
            const { data: signedUrlData } = await supabase.storage
              .from('avatars')
              .createSignedUrl(`${userId}/avatar.mp4`, 3600);
            
            if (signedUrlData?.signedUrl) {
              userAvatarUrl = signedUrlData.signedUrl;
              console.log('Found user avatar video:', userAvatarUrl);
            }
          }
        }
        
        // If no user avatar found, check for default avatar
        if (!userAvatarUrl) {
          const { data: publicUrlData } = await supabase.storage
            .from('avatars')
            .getPublicUrl(`${userId}/avatar.mp4`);
          
          if (publicUrlData?.publicUrl) {
            userAvatarUrl = publicUrlData.publicUrl;
            console.log('Using public avatar URL:', userAvatarUrl);
          }
        }
      } catch (storageError) {
        console.log('Storage access failed, using default:', storageError);
      }
    }
    
    // If still no avatar found, use default
    if (!userAvatarUrl) {
      const { data: defaultAvatarData } = await supabase.storage
        .from('avatars')
        .getPublicUrl('default-avatar-teacher.jpg');
      
      userAvatarUrl = defaultAvatarData?.publicUrl || 'https://euyidvolwqmzijkfrplh.supabase.co/storage/v1/object/public/avatars/default-avatar-teacher.jpg';
      console.log('Using default avatar:', userAvatarUrl);
    }

    // Generate TTS audio for video script like Python gTTS
    console.log('🎬 Generating video audio with full script like Python version...');
    console.log(`📝 Video script length: ${videoScript.length} characters`);
    console.log(`📄 Script preview: ${videoScript.substring(0, 200)}...`);

    let base64Audio = '';
    
    try {
      base64Audio = await generateVideoChunkAudio(videoScript, voice);
      console.log('✅ Video audio generated successfully');
    } catch (error) {
      console.error(`❌ Video audio generation failed:`, error);
    }

    // Calculate estimated duration (rough estimate)
    const estimatedDuration = Math.max(5, Math.floor(videoScript.length / 15));

    const response = {
      audioContent: base64Audio,
      mimeType: 'audio/mpeg',
      userAvatarUrl,
      estimatedDuration,
      processedText: videoScript.length > 0 ? videoScript.substring(0, 100) + '...' : ''
    };

    console.log('🎬 Video generation completed successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-video:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: 'Video generation temporarily unavailable. Please try again later.'
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

async function generateVideoChunkAudio(text: string, voice: string): Promise<string> {
  // Try to fit as much text as possible in a single request first
  const maxSingleChunk = 900; // Increase chunk size significantly
  
  console.log(`🎬 Input video script length: ${text.length} chars`);
  
  if (text.length <= maxSingleChunk) {
    // Text fits in single chunk - process it all
    console.log(`✅ Video script fits in single chunk, processing ${text.length} chars`);
    return await processVideoSingleChunk(text, voice);
  }
  
  // Text is too long - find the best breaking point
  console.log(`⚠️ Video script too long (${text.length} chars), finding best break point...`);
  
  // Try to break at sentence endings
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let processedText = '';
  
  for (const sentence of sentences) {
    const testText = processedText + (processedText ? '. ' : '') + sentence.trim();
    if (testText.length <= maxSingleChunk) {
      processedText = testText;
    } else {
      break;
    }
  }
  
  // If we didn't get enough text, try word boundaries
  if (processedText.length < 200) {
    const words = text.split(' ');
    processedText = '';
    for (const word of words) {
      const testText = processedText + (processedText ? ' ' : '') + word;
      if (testText.length <= maxSingleChunk) {
        processedText = testText;
      } else {
        break;
      }
    }
  }
  
  // Last resort - just truncate
  if (processedText.length < 100) {
    processedText = text.substring(0, maxSingleChunk);
  }
  
  console.log(`📝 Processing ${processedText.length} chars out of ${text.length} total`);
  console.log(`🔊 Video script preview: ${processedText.substring(0, 100)}...`);
  
  return await processVideoSingleChunk(processedText, voice);
}

async function processVideoSingleChunk(text: string, voice: string): Promise<string> {
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
    console.error('❌ Video TTS API error:', {
      status: response.status,
      error: errorText.substring(0, 200)
    });
    throw new Error(`Video TTS failed with status ${response.status}`);
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
  
  console.log(`✅ Generated video audio for text chunk`);
  return btoa(binaryString);
}