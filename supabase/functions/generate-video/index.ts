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

    // Extract proper video script from the full response (following Telegram bot logic)
    const extractedScript = extractVideoScript(videoScript);
    console.log('🎬 Extracted video script:', extractedScript);

    // Generate TTS audio for video script - clean text first
    console.log('🎬 Generating video audio...');
    console.log(`📝 Original video script length: ${videoScript.length} characters`);
    console.log(`📝 Extracted script length: ${extractedScript.length} characters`);
    
    // Clean text to remove problematic characters for Google TTS
    const cleanedScript = cleanTextForTTS(extractedScript);
    console.log(`🧹 Cleaned script length: ${cleanedScript.length} characters`);
    console.log(`📄 Cleaned script preview: ${cleanedScript.substring(0, 100)}...`);

    let base64Audio = '';
    
    try {
      base64Audio = await generateVideoChunkAudio(cleanedScript, voice);
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

// Extract video script from Claude's response based on working Telegram bot logic
function extractVideoScript(fullResponse: string): string {
  // Look for the video script section
  if (fullResponse.includes('[VIDEO SCRIPT START]') && fullResponse.includes('[VIDEO SCRIPT END]')) {
    const startMarker = '[VIDEO SCRIPT START]';
    const endMarker = '[VIDEO SCRIPT END]';
    const startIndex = fullResponse.indexOf(startMarker) + startMarker.length;
    const endIndex = fullResponse.indexOf(endMarker, startIndex);

    if (startIndex < endIndex) {
      const script = fullResponse.substring(startIndex, endIndex).trim();
      return script;
    }
  }

  // Fallback approach: try to find sections that look like Spanish/English pairs
  const lines = fullResponse.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Español:') && i + 1 < lines.length && lines[i + 1].includes('English:')) {
      return `${line}\n${lines[i + 1]}`;
    }
  }

  // Default message if all else fails
  return 'Español: Gracias por practicar conmigo. Me encanta ayudarte con español.\nEnglish: Thank you for practicing with me. I love helping you with Spanish.';
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
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove bullet points
  text = text.replace(/^[•·\-*]\s*/gm, '');
  
  return text;
}

async function generateVideoChunkAudio(text: string, voice: string): Promise<string> {
  // Google TTS has character limits - split into manageable chunks
  const maxChunkSize = 200; // Safe size for Google TTS
  
  console.log(`🎬 Input video script length: ${text.length} chars`);
  
  if (text.length <= maxChunkSize) {
    // Text fits in single chunk - process it all
    console.log(`✅ Video script fits in single chunk, processing ${text.length} chars`);
    return await processVideoSingleChunk(text, voice);
  }
  
  // Text is longer - process multiple chunks and combine
  console.log(`📝 Video script too long (${text.length} chars), splitting into chunks`);
  
  const chunks = splitTextIntoChunks(text, maxChunkSize);
  console.log(`📦 Split into ${chunks.length} chunks`);
  
  const audioChunks: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🎬 Processing video chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 50)}..."`);
    
    try {
      const chunkAudio = await processVideoSingleChunk(chunk, voice);
      audioChunks.push(chunkAudio);
      
      // Small delay between requests to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Failed to process video chunk ${i + 1}:`, error);
      // Continue with other chunks instead of failing completely
    }
  }
  
  if (audioChunks.length === 0) {
    throw new Error('No video audio chunks were successfully generated');
  }
  
  // Combine all audio chunks into a single base64 string
  console.log(`✅ Generated ${audioChunks.length} video audio chunks, combining them`);
  
  if (audioChunks.length === 1) {
    return audioChunks[0];
  }
  
  // For multiple chunks, we'll concatenate the base64 data
  // This is a simple concatenation - in production you'd want proper audio merging
  const combinedChunks = audioChunks.join('');
  return combinedChunks;
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