import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "nova", userId } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    console.log(`🎧 Processing TTS request for text: ${text.substring(0, 100)}...`);
    console.log(`📊 Text length: ${text.length} characters`);

    // Clean text for speech
    const cleanedText = cleanTextForTTS(text);
    console.log(`🧹 Cleaned text length: ${cleanedText.length} characters`);

    // Generate audio using OpenAI TTS
    const audioBuffer = await generateAudio(cleanedText, voice);
    
    // Upload to Supabase storage
    const fileName = `${userId || 'anonymous'}/${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(fileName);

    console.log(`✅ Audio uploaded successfully: ${publicUrl}`);

    return new Response(JSON.stringify({
      success: true,
      audioUrl: publicUrl,
      fileName: fileName,
      mimeType: 'audio/mpeg',
      textLength: text.length,
      cleanedTextLength: cleanedText.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-voice:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: 'TTS service temporarily unavailable. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Clean text for speech synthesis
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

async function generateAudio(text: string, voice: string): Promise<ArrayBuffer> {
  console.log(`🎧 Generating audio with Google TTS (lang=es)`);
  
  try {
    const params = new URLSearchParams({
      ie: 'UTF-8',
      q: text,
      tl: 'es', // Spanish language
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
      console.error('❌ Google TTS API error:', {
        status: response.status,
        error: errorText.substring(0, 200)
      });
      
      // If Google TTS fails, fallback to OpenAI TTS
      console.log('🔄 Falling back to OpenAI TTS...');
      return await generateAudioWithOpenAI(text, voice);
    }

    console.log(`✅ Audio generated successfully with Google TTS`);
    return await response.arrayBuffer();
  } catch (error) {
    console.error('❌ Google TTS failed:', error);
    console.log('🔄 Falling back to OpenAI TTS...');
    return await generateAudioWithOpenAI(text, voice);
  }
}

async function generateAudioWithOpenAI(text: string, voice: string): Promise<ArrayBuffer> {
  console.log(`🎧 Generating audio with OpenAI TTS as fallback`);
  
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'nova', // Use Nova for Spanish-friendly pronunciation
      response_format: 'mp3',
      speed: 1.0
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI TTS API error:', {
      status: response.status,
      error: errorText.substring(0, 200)
    });
    throw new Error(`Both TTS services failed. Google TTS and OpenAI TTS are unavailable.`);
  }

  console.log(`✅ Audio generated successfully with OpenAI TTS fallback`);
  return await response.arrayBuffer();
}

