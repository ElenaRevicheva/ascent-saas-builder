import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

// Letters that exist in none of the families' languages (Spanish, English, Russian): the transcript is garble.
const GARBLE = /[ðþæøå]/i;

// 2 Nov 2026 12:34 UTC (Alisa "they don't hear me"): Groq's free tier answered 413 "seconds of audio per hour: Limit
// 7200" on BOTH Whisper models and OpenAI has no credits, so a 14-second answer had no step left -> 500, not heard.
// The free Gemini project (GEMINI_TTS_API_KEY, the key the hero voices use; Elena accepted Google's free-tier terms)
// listens to audio too, so it is the next step after Groq, before OpenAI. Model from the env, never a literal here.
// 12:52 UTC first live test: gemini-flash-latest answered 503 "high demand". Like the hero voices, the free step is a
// waterfall of models (comma list in GEMINI_HEAR_MODELS), each tried once before OpenAI.
const GEMINI_HEAR_MODELS = (Deno.env.get('GEMINI_HEAR_MODELS') || 'gemini-flash-latest,gemini-flash-lite-latest,gemini-pro-latest')
  .split(',').map((m) => m.trim()).filter(Boolean);
const GEMINI_HEAR_MODEL = GEMINI_HEAR_MODELS.join(' > ');
async function geminiTranscribe(key: string, audio: Uint8Array, hint: string, language?: string): Promise<any> {
  const errs: string[] = [];
  for (const model of GEMINI_HEAR_MODELS) {
    try {
      const out = await geminiTranscribeWith(model, key, audio, hint, language);
      console.log(`gemini hearing model ${model}`);
      return out;
    } catch (e) {
      errs.push(String((e as Error).message || e).slice(0, 160));
    }
  }
  throw new Error(errs.join(' | '));
}
async function geminiTranscribeWith(model: string, key: string, audio: Uint8Array, hint: string, language?: string): Promise<any> {
  let b64 = '';
  for (let i = 0; i < audio.length; i += 0x8000) b64 += String.fromCharCode(...audio.subarray(i, i + 0x8000));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [
        { inline_data: { mime_type: 'audio/webm', data: btoa(b64) } },
        { text: 'Transcribe exactly what the speaker says, word for word, in the language spoken (Spanish, English or ' +
                'Russian; often a young child). Do not translate, correct or add anything. If there is no clear speech, ' +
                'return an empty text. ' + (language ? `The language is ${language}. ` : '') +
                (hint ? `Context (what the speaker was just asked): ${hint.slice(0, 300)}` : '') },
      ] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json',
        responseSchema: { type: 'OBJECT', properties: { text: { type: 'STRING' }, language: { type: 'STRING' } }, required: ['text'] } },
    }),
    signal: AbortSignal.timeout(12000),  // three models must still fit in a child's turn
  });
  if (!r.ok) throw new Error(`gemini ${model}: ${r.status} ${(await r.text()).slice(0, 120)}`);
  const raw = (await r.json()).candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  const j = JSON.parse(raw || '{}');
  return { text: String(j.text ?? '').trim(), language: String(j.language ?? language ?? '').toLowerCase() };
}

// 31 Oct 2026 (Elena: "hear her better"): Whisper listened blind and wrote a 6-year-old's answers as "Starberry",
// "Eu me espethe muito em branco" (Portuguese), "Ana, Ana, me viene perezoso". Whisper takes a `prompt` - text that
// tells it what to expect - and we never sent one. During a classroom lesson the hint is the heroes' last question
// (like a teacher who knows what she just asked); otherwise a neutral language hint.
// 2 Nov 2026 (Elena: "kid, parent, Pere and Titi all together"): the classroom's speaker switch says who talks this
// turn. A parent's turn is not a 6-year-old answering, so it gets the neutral adult hint (no child, no last question).
async function whisperHint(authHeader: string | null, speaker?: string): Promise<string> {
  const base = 'Spanish and English, sometimes Russian. ';
  if (!authHeader) return base;
  if (speaker === 'parent') return 'An adult (the parent) talks to Pere and Titi, in Spanish or English, sometimes Russian. ';
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
// 1 Nov 2026 22:09 UTC (tracing: "¡Lo escribiste: I love you! ¡Ahora dilo!" - Alisa said "I love you!", Whisper heard
// it exactly, and this filter dropped it, because the right answer is made of the question's own words). An echo
// replays most of the QUESTION; a child repeating the phrase she was asked to say covers only a small part of it. So a
// transcript is an echo only if it is all hint words AND it reproduces at least 60% of the question's distinct words.
function echoesHint(text: string, hint: string): boolean {
  const t = words(text);
  if (t.length < 3) return false;
  const h = new Set(words(hint));
  if (t.filter((w) => h.has(w)).length / t.length <= 0.8) return false;
  const q = new Set(words(hint.split('They just asked:')[1] ?? hint));
  const said = new Set(t);
  return q.size > 0 && [...q].filter((w) => said.has(w)).length / q.size >= 0.6;
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
    const { audio, language, force, speaker } = await req.json();
    
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
      ['gemini', Deno.env.get('GEMINI_TTS_API_KEY'), '', GEMINI_HEAR_MODEL],
      ['openai', Deno.env.get('OPENAI_API_KEY'), 'https://api.openai.com/v1/audio/transcriptions', 'whisper-1'],
    ];
    // Private check (bot secret only): `force` names one provider so each step can be proved live, without waiting for
    // the ones before it to fail. Families never send it.
    const secret = Deno.env.get('ESPALUZ_BOT_SECRET');
    if (force && secret && req.headers.get('x-bot-secret') === secret) {
      providers.splice(0, providers.length, ...providers.filter(([n]) => n === force));
    }
    const errors: string[] = [];
    let result: any = null;
    const hint = await whisperHint(req.headers.get('Authorization'), speaker);
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
      if (name === 'gemini') {
        try {
          result = await geminiTranscribe(key, binaryAudio, hint, language);
          console.log(`transcribed by gemini ${model}`);
          break;
        } catch (e) {
          const why = String((e as Error).message || e).slice(0, 240);
          console.error('Whisper provider failed, trying the next:', why);
          errors.push(why);
          continue;
        }
      }
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
        // 1 Nov 2026 17:55 (Alisa: "quiero hacer números, no letras" came back as icelandic "Ég kira þess að numeiru…"
        // at -0.68 and was dropped as not heard): a transcript in real family letters beats a garbled one whatever the
        // confidence, and if the fast model is still garbled or unsure, Groq's full whisper-large-v3 tries too.
        const better = (a: any, b: any) => (GARBLE.test(String(a?.text)) !== GARBLE.test(String(b?.text))
          ? !GARBLE.test(String(a?.text)) : confidence(a) > confidence(b));
        const models = name === 'groq' && model !== 'whisper-large-v3' ? [model, 'whisper-large-v3'] : [model];
        for (const m of models) {
          if (m !== model && !GARBLE.test(String(result.text)) && confidence(result) >= -0.5) break;
          for (const lang of ['es', 'en']) {
            const again = await send(key, url, m, lang);
            if (!again.ok) continue;
            const alt = await again.json();
            if (better(alt, result)) result = { ...alt, language: lang };
          }
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
    if (GARBLE.test(String(result.text))) {
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