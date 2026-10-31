import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

// 31 Oct 2026 (Elena: "hear her better"): Whisper listened blind and wrote a 6-year-old's answers as "Starberry",
// "Eu me espethe muito em branco" (Portuguese), "Ana, Ana, me viene perezoso". Whisper takes a `prompt` - text that
// tells it what to expect - and we never sent one. During a classroom lesson the hint is the heroes' last question
// (like a teacher who knows what she just asked); otherwise a neutral language hint.
async function whisperHint(authHeader: string | null): Promise<string> {
  const base = 'Spanish and English, sometimes Russian. ';
  if (!authHeader) return base;
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
                                  { global: { headers: { Authorization: authHeader } } });
    const { data } = await supabase.from('learning_sessions').select('content, created_at')
      .eq('session_type', 'classroom').order('created_at', { ascending: false }).limit(1);
    const row = data?.[0];
    if (!row || Date.now() - new Date(row.created_at).getTime() > 20 * 60 * 1000) return base;
    const lines = String(row.content?.ai_response ?? '').split('\n')
      .map((l: string) => l.replace(/^[^:\[]*(\[[^\]]*\])?:\s*/, '').trim()).filter(Boolean);
    const question = [...lines].reverse().find((l) => l.includes('?')) ?? lines[lines.length - 1] ?? '';
    return `A 6-year-old girl answers Pere and Titi in Spanish or English. They just asked: ${question.slice(0, 200)}`;
  } catch (_) {
    return base;
  }
}

// With a hint and near-silence Whisper can "hear" the hint itself. A transcript made only of hint words is dropped,
// and the page then says "No te escuché bien".
const words = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zñа-яё]+/g) ?? [];
function echoesHint(text: string, hint: string): boolean {
  const t = words(text);
  if (t.length < 3) return false;
  const h = new Set(words(hint));
  return t.filter((w) => h.has(w)).length / t.length > 0.8;
}
// Whisper's known phantoms on silence or noise. Measured 31 Oct on Groq whisper-large-v3-turbo: 3 s of pure silence ->
// "Thank you." (no hint) / "you" (hint); pink noise -> "I'm not sure." (hint). Groq reports no_speech_prob 0 and the
// phantom's avg_logprob is no worse than real speech, so only the text can tell. A bare "gracias" is NOT on the list:
// a child may really say it.
const PHANTOMS = new Set(['thank you', 'you', 'thanks for watching', 'thank you for watching', 'im not sure', 'i m not sure',
  'subtitles by the amara org community', 'gracias por ver el video', 'subtitulos realizados por la comunidad de amara org', '']);
const isPhantom = (text: string) => PHANTOMS.has(words(text).join(' '));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, language } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log(`Processing voice message in language: ${language || 'auto-detect'}`);
    console.log(`Audio data length: ${audio.length} characters`);

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    console.log(`Processed binary audio length: ${binaryAudio.length} bytes`);

    // 30 Oct 2026: OpenAI has no credits since 23 Oct (Whisper 429 insufficient_quota -> every classroom answer was
    // "I didn't hear you"). Free first, the fleet's order rule: Groq's Whisper (same model family, free tier), then
    // OpenAI. A provider without a secret is skipped; a failing one hands over to the next.
    const providers: [string, string | undefined, string, string][] = [
      ['groq', Deno.env.get('GROQ_API_KEY'), 'https://api.groq.com/openai/v1/audio/transcriptions', 'whisper-large-v3-turbo'],
      ['groq', Deno.env.get('GROQ_API_KEY'), 'https://api.groq.com/openai/v1/audio/transcriptions', 'whisper-large-v3'],
      ['openai', Deno.env.get('OPENAI_API_KEY'), 'https://api.openai.com/v1/audio/transcriptions', 'whisper-1'],
    ];
    const errors: string[] = [];
    let result: any = null;
    const hint = await whisperHint(req.headers.get('Authorization'));
    // verbose_json returns the detected language and per-segment confidence (avg_logprob).
    const send = (key: string, url: string, model: string, lang?: string) => {
      const formData = new FormData();
      formData.append('file', new Blob([binaryAudio], { type: 'audio/webm' }), 'audio.webm');
      formData.append('model', model);
      formData.append('response_format', 'verbose_json');
      formData.append('prompt', hint);
      formData.append('temperature', '0');
      if (lang) formData.append('language', lang);
      return fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${key}` }, body: formData });
    };
    const confidence = (r: any): number => {
      const segs = Array.isArray(r?.segments) ? r.segments : [];
      return segs.length ? segs.reduce((s: number, x: any) => s + (x.avg_logprob ?? -9), 0) / segs.length : -9;
    };
    for (const [name, key, url, model] of providers) {
      if (!key) continue;
      const response = await send(key, url, model, language);
      if (!response.ok) {
        const why = `${name} ${model}: ${response.status} ${(await response.text()).slice(0, 200)}`;
        console.error('Whisper provider failed, trying the next:', why);
        errors.push(why);
        continue;
      }
      result = await response.json();
      console.log(`transcribed by ${name} ${model}`);
      // 31 Oct 2026: auto-detect heard a child's Spanish/English as Portuguese ("Eu me espethe muito em branco") and
      // the tutor answered the garble. The families speak Spanish, English or Russian: any other detected language is
      // re-transcribed as Spanish and as English, and the more confident of the three wins.
      const detected = String(result.language || '').toLowerCase();
      if (!language && detected && !['spanish', 'english', 'russian', 'es', 'en', 'ru'].includes(detected)) {
        for (const lang of ['es', 'en']) {
          const again = await send(key, url, model, lang);
          if (!again.ok) continue;
          const alt = await again.json();
          if (confidence(alt) > confidence(result)) result = { ...alt, language: lang };
        }
        console.log(`language "${detected}" is not ES/EN/RU -> kept ${result.language} (confidence ${confidence(result).toFixed(2)})`);
        // 31 Oct 15:41: detected "icelandic", the best retry scored -1.17 and was still garble ("A couple of menes have
        // a guest of Elin Láttú"), which the heroes then treated as a real sentence. Unsure in every language = not heard.
        if (confidence(result) < -1.0) {
          console.log(`no language is confident -> treated as not heard: ${String(result.text).slice(0, 120)}`);
          result.text = '';
        }
      }
      break;
    }
    if (!result) {
      throw new Error(errors.length ? `Whisper API error: ${errors.join(' | ')}` : 'No speech-to-text provider configured (GROQ_API_KEY or OPENAI_API_KEY)');
    }
    // 31 Oct 15:56: "Man, að mér kom úr teléfón" (icelandic, retry -0.82, above the -1.0 cut). Letters that exist in
    // none of the families' languages prove the transcript is garble, whatever the confidence says.
    if (/[ðþæøå]/i.test(String(result.text))) {
      console.log(`transcript has letters from no family language -> treated as not heard: ${String(result.text).slice(0, 120)}`);
      result.text = '';
    }
    if (echoesHint(result.text, hint) || isPhantom(result.text)) {
      console.log(`transcript is a silence phantom or only repeats the hint -> treated as silence: ${String(result.text).slice(0, 120)}`);
      result.text = '';
    }
    console.log(`hint: ${hint.slice(0, 160)}`);
    console.log('Transcription result:', result.text);

    return new Response(
      JSON.stringify({ 
        text: result.text,
        detectedLanguage: result.language || language || 'unknown'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in voice-to-text:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});