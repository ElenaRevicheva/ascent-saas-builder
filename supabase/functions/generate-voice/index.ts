import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pere + Titi's own voices (28 Oct 2026, Elena: "give voices to Pere and Titi like Telegram"): the same MiniMax Speech
// voices the EspaLuz Telegram bot pins (HERO_VOICES in its main.py), via Replicate. Needs the REPLICATE_API_TOKEN
// secret on this project; without it, or on any failure, the usual single voice below answers, so the classroom never
// goes silent because of the heroes.
const HERO_VOICES: Record<string, { voice_id: string; pitch: number; speed: number; emotion: string }> = {
  pere: { voice_id: "Spanish_Rudolph", pitch: -2, speed: 0.82, emotion: "calm" },
  // 31 Oct 2026 (Alisa: "Titi habla muy rápido, no puedo intentarlo"): 1.15 plus a high cartoon pitch was too fast for a
  // six-year-old to repeat. 0.9 keeps him playful and lets her follow. Twin: main.py TITI_SPEED default.
  titi: { voice_id: "Spanish_AnimeCharacter", pitch: 3, speed: 0.9, emotion: "happy" },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "es", userId, hero } = await req.json();

    if (!text || !userId) {
      throw new Error('Text and userId are required');
    }

    if (text.length > 5000) {
      throw new Error('Text exceeds maximum length of 5000 characters');
    }

    // Clean text for TTS
    const cleanedText = cleanTextForTTS(text);

    let base64Audio = '';
    let spokenBy = 'openai-nova';
    if (hero && HERO_VOICES[hero] && Deno.env.get('REPLICATE_API_TOKEN')) {
      try {
        base64Audio = await generateHeroVoice(hero, cleanedText);
        spokenBy = `minimax-${hero}`;
      } catch (heroError) {
        console.error(`hero voice ${hero} failed, using the usual voice:`, heroError);
      }
    }
    if (!base64Audio) {
      // Generate audio using OpenAI TTS with Nova voice
      base64Audio = await generateOpenAIVoice(cleanedText);
    }

    const response = {
      success: true,
      audioContent: base64Audio,
      mimeType: 'audio/mpeg',
      spokenBy,
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

// One hero line in that hero's cartoon voice: MiniMax Speech 2.6 HD on Replicate -> mp3 bytes as base64.
async function generateHeroVoice(hero: string, text: string): Promise<string> {
  const token = Deno.env.get('REPLICATE_API_TOKEN')!;
  const v = HERO_VOICES[hero];
  const spoken = text.replace(/\s*\/\s*/g, '. ').slice(0, 900); // "Hola. / Hello." pauses between languages, never says "slash"
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait=60' };
  const body = { input: { text: spoken, voice_id: v.voice_id, pitch: v.pitch, speed: v.speed, emotion: v.emotion,
                          language_boost: 'Automatic', audio_format: 'mp3', sample_rate: 32000 } };
  let r = await fetch('https://api.replicate.com/v1/models/minimax/speech-2.6-hd/predictions', { method: 'POST', headers, body: JSON.stringify(body) });
  if (r.status === 429) { // low-balance accounts get ~6 requests a minute
    await new Promise((res) => setTimeout(res, 11000));
    r = await fetch('https://api.replicate.com/v1/models/minimax/speech-2.6-hd/predictions', { method: 'POST', headers, body: JSON.stringify(body) });
  }
  if (!r.ok) throw new Error(`Replicate ${r.status}: ${(await r.text()).slice(0, 200)}`);
  let p = await r.json();
  const t0 = Date.now();
  while ((p.status === 'starting' || p.status === 'processing') && Date.now() - t0 < 50000) {
    await new Promise((res) => setTimeout(res, 2000));
    p = await (await fetch(p.urls.get, { headers })).json();
  }
  const out = Array.isArray(p.output) ? p.output[0] : p.output;
  if (!out) throw new Error(`no audio (${p.status}: ${p.error || ''})`);
  const audio = await fetch(out);
  if (!audio.ok) throw new Error(`audio download ${audio.status}`);
  return bytesToBase64(new Uint8Array(await audio.arrayBuffer()));
}

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
  return bytesToBase64(new Uint8Array(arrayBuffer));
}

function bytesToBase64(audioBytes: Uint8Array): string {
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
