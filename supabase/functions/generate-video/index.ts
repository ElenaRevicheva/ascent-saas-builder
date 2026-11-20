import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Real EspaLuz: one photo + our own voice -> photoreal lip-sync video (scripts/espaluz-avatar in cto-aipa, plan in
// docs/espaluz/TALKING_ESPALUZ_IN_CHAT_PLAN_2026-11-05.md). Every clip costs credits, so three guards run FIRST and each
// answers 200 with real:false, because the text and voice have already been delivered: a paid subscription, a monthly
// cap per family, and a wallet floor (Elena approved 100 credits for this stage: 379 -> 279).
const RUNWAY_API = 'https://api.dev.runwayml.com/v1';
const ESPALUZ_AVATAR_ID = Deno.env.get('RUNWAY_ESPALUZ_AVATAR_ID') || 'd1495436-9e57-4151-885f-51c8b1733620';
const TALKING_MONTHLY_CAP = Number(Deno.env.get('TALKING_MONTHLY_CAP') || 30);
const RUNWAY_WALLET_FLOOR = Number(Deno.env.get('RUNWAY_WALLET_FLOOR') || 279);
const TALKING_MAX_CHARS = 450; // about 30 seconds of speech
// 14 Nov 2026 (Elena: "let us do celebrations"): "Send EspaLuz your family's moment". The family picks a clip or photo;
// the BROWSER takes 3 still pictures from it (the clip itself never leaves the device), a free reader says what is in
// them, EspaLuz writes a personal wish from the pictures + the occasion they typed + their family list, and the same
// Runway pipeline as the talking videos makes one lip-synced clip. Paid families only, its own monthly allowance.
const CELEBRATION_MONTHLY_CAP = Number(Deno.env.get('CELEBRATION_MONTHLY_CAP') || 1);
// 15 Nov 2026: face-to-face practice ends with EspaLuz's tips as a lip-synced clip. The tips are read from the family's
// saved practice_session row (written by espaluz-chat), never from the browser.
const PRACTICE_MONTHLY_CAP = Number(Deno.env.get('PRACTICE_MONTHLY_CAP') || 2);
// 20 Nov 2026 (Elena): Pro English (separate layer) - the coach's last English reply as a lip-synced clip, 2 a month
// included in the paid plan so they see how it works. Same Runway pipeline, guards and wallet floor as every clip.
const PRO_ENGLISH_MONTHLY_CAP = Number(Deno.env.get('PRO_ENGLISH_MONTHLY_CAP') || 2);

// 6 Nov 2026 (Elena: "they should bring something special... lips moving and repeating the same message is not precious").
// A clip never repeats the reply. TWIN of espaluz_talking.py on the bots. Free models only; no true note, no clip.
const LINE_RULES = "You write what EspaLuz, a warm friend of this family, says aloud in a short personal video. Spanish first, then the same in " +
  "English, under 45 words in all, plain speech, no emojis, no labels, no quotes. NEVER repeat the reply they just read: bring something it does " +
  "not contain. Never invent anything: use only the NOTES and the REPLY. Never state a price, a date or a name that is not there. Never mention marital status, money, health or hardship. " +
  "Speak to this one grown-up, warm and personal, like a friend who knows their life. Bring ONE concrete, practically useful thing tied to a NOTE: what to say, what to bring, who to ask, or the exact Spanish phrase for what is coming up, and why it helps. Never ask how they feel, never offer psychological support or encouragement, never describe their feelings, never praise. Use only facts in the NOTES, no guessed details. You speak to the grown-up named in TALKING TO, by name at most once. Talk ABOUT a child, never TO a child. Never state a rule, a policy or what a school or office will do. Write normal words, never spaced-out letters. If you cannot be really useful, reply exactly NONE. ";
const LINE_MOMENT: Record<string, string> = {
  remembered: "Moment: a surprise visit. Only if a NOTE names something coming up or just past, give the one thing that will help them with it. Otherwise reply NONE.",
  low_mood: "Moment: they are having a hard moment. Do not talk about it. Take one practical thing off their plate, tied to a NOTE: a ready sentence or the next small step.",
  long_road: "Moment: the long road. From the NOTES, the next practical step or Spanish phrase this family is ready for now, and why now.",
  asked: "Moment: they asked to see you. Take the single most useful Spanish phrase from the REPLY. Say it once with commas between small groups of words so it sounds slow, say it again normally, then what it means in English and when to use it.",
};
const lineWords = (t: string) => new Set(t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-zñ]{3,}/g) ?? []);
function repeatsReply(line: string, reply: string): boolean {
  const L = lineWords(line), R = lineWords(reply);
  if (!L.size) return true;
  let n = 0; for (const w of L) if (R.has(w)) n++;
  return n / L.size > 0.7;
}
// 15 Nov 2026 (Elena's first celebration: photo read by gemini-flash-lite, then "no_text" 1.3 s later, no trace why):
// the writer tried ONE Gemini model and a Groq call capped at 400 tokens, and swallowed every error. Now it tries the
// same models the photo reader proved working, gives a reasoning model room to finish, and logs each failure.
async function freeLine(system: string, user: string, maxTokens = 200): Promise<string> {
  const gem = Deno.env.get('GEMINI_TTS_API_KEY');
  const models = [...new Set([Deno.env.get('GEMINI_LITE_MODEL') || 'gemini-flash-lite-latest', Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest', 'gemini-2.5-flash'])];
  if (gem) for (const model of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(20000), headers: { 'x-goog-api-key': gem, 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: Math.max(1024, maxTokens), temperature: 0.6 } }) });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
      const t = (await r.json()).candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim() ?? '';
      if (!t) throw new Error('empty answer');
      console.log(`[line] written by gemini (${model})`);
      return t;
    } catch (e) { console.error(`[line] gemini ${model} failed:`, (e as Error).message); }
  }
  const groq = Deno.env.get('GROQ_API_KEY');
  if (groq) for (const model of (Deno.env.get('GROQ_MODELS') || 'openai/gpt-oss-120b').split(',').map((m) => m.trim()).filter(Boolean).slice(0, 2)) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', signal: AbortSignal.timeout(20000),
        headers: { 'Authorization': `Bearer ${groq}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 1500, temperature: 0.6, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
      const t = String((await r.json()).choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (!t) throw new Error('empty answer');
      console.log(`[line] written by groq (${model})`);
      return t;
    } catch (e) { console.error(`[line] groq ${model} failed:`, (e as Error).message); }
  }
  return '';
}
async function specialLine(db: any, userId: string, reason: string, reply: string): Promise<string> {
  const { data } = await db.from('learning_sessions').select('content').eq('user_id', userId).eq('session_type', 'analytics').eq('content->>event', 'family_fact')
    .order('created_at', { ascending: false }).limit(40);
  const today = new Date().toISOString().slice(0, 10);
  const notes = (data ?? []).filter((r: any) => !r.content?.retired && !r.content?.private && (!r.content?.until || String(r.content.until) >= today))
    .map((r: any) => String(r.content?.fact ?? '')).filter((f: string) => f && !/spouse|single parent|divorc|widow|money|debt|\[object/i.test(f)).slice(0, 12);
  if (reason !== 'asked' && !notes.length) return '';
  if (reason === 'long_road' && notes.length < 5) return '';
  const moment = LINE_MOMENT[reason] ?? LINE_MOMENT.asked;
  const { data: fam } = await db.from('family_members').select('name').eq('user_id', userId).eq('is_active', true).eq('role', 'parent').order('created_at', { ascending: false }).limit(1);
  const line = await freeLine(LINE_RULES + moment, `TODAY: ${today}\nTALKING TO: ${fam?.[0]?.name ?? 'the parent'}\nNOTES:\n${notes.map((n: string) => `- ${n}`).join('\n') || 'none'}\nREPLY THEY JUST READ:\n${reply.slice(0, 1200)}`);
  // A tap on "See EspaLuz" always gets a clip: the phrase comes from the reply, so overlap is expected, and the reply is the last resort.
  if (reason === 'asked') return line && !/^\s*NONE/i.test(line) ? line : reply.slice(0, 300);
  return line && !/^\s*NONE/i.test(line) && !repeatsReply(line, reply) ? line : '';
}
// Her one voice, made by the free Edge voice on Oracle (WhatsApp service). Any failure falls back to the usual voice chain.
async function emmaVoice(text: string): Promise<string> {
  try {
    const r = await fetch('https://webhook.aideazz.xyz/espaluz/internal/emma', { method: 'POST', signal: AbortSignal.timeout(30000),
      headers: { 'x-espaluz-bot-secret': Deno.env.get('ESPALUZ_BOT_SECRET') ?? '', 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    return r.ok ? String((await r.json()).audioBase64 ?? '') : '';
  } catch { return ''; }
}

// Celebrations: what is in the family's pictures. The SAME free-first readers as the classrooms' photo reader
// (espaluz-chat describePhoto: free Gemini -> free Groq vision); no paid reader here - if both are out, the wish is
// written from the occasion alone, which is still true.
const FRAMES_PROMPT = "These are still pictures from one short family video sent to EspaLuz for a celebration. In two short English " +
  "sentences, say what is happening and what can be clearly seen (a cake, candles, balloons, a school uniform, a beach, a dance, " +
  "colours). Only what is plainly visible, never guess. Never name a person or describe a face or body: say only 'a child', " +
  "'a grown-up' or 'the family'. No guesses about where it was taken.";
async function seeFrames(frames: string[]): Promise<string> {
  if (!frames.length) return '';
  const gem = Deno.env.get('GEMINI_TTS_API_KEY');
  if (gem) for (const model of [Deno.env.get('GEMINI_LITE_MODEL') || 'gemini-flash-lite-latest', Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(25000), headers: { 'x-goog-api-key': gem, 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [...frames.map((data) => ({ inline_data: { mime_type: 'image/jpeg', data } })), { text: FRAMES_PROMPT }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.2 } }) });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
      const t = (await r.json()).candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim();
      if (t) { console.log(`[celebrate] frames read by gemini (${model})`); return t; }
    } catch (e) { console.error(`[celebrate] frames gemini ${model}:`, (e as Error).message); }
  }
  const groq = Deno.env.get('GROQ_API_KEY');
  if (groq) try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', signal: AbortSignal.timeout(25000),
      headers: { 'Authorization': `Bearer ${groq}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: Deno.env.get('GROQ_VISION_MODEL') || 'qwen/qwen3.8-27b', max_tokens: 600, temperature: 0.2,
        messages: [{ role: 'user', content: [{ type: 'text', text: FRAMES_PROMPT },
          ...frames.map((d) => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${d}` } }))] }] }) });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    const t = String((await r.json()).choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (t) { console.log('[celebrate] frames read by groq'); return t; }
  } catch (e) { console.error('[celebrate] frames groq:', (e as Error).message); }
  return '';
}
const WISH_RULES = "You are EspaLuz, a warm bilingual friend of this family. Write what you say aloud in a short personal video for their " +
  "celebration. First in Spanish, then the same wish in English. Under 70 words in all, plain speech, no emojis, no labels, no quotes, " +
  "no stage directions. Use ONLY: the OCCASION they typed, the FAMILY list and WHAT IS IN THE PICTURES. Never invent a name, an age, a " +
  "date, a place or a detail that is not there. Mention one or two things from the pictures naturally. If the occasion names a person, " +
  "speak to them by that name. Warm and joyful, golden-middle tone, never over the top. Never mention money, health or hardship.";
async function celebrationWish(db: any, userId: string, body: any): Promise<{ text: string; seen: string; occasion: string }> {
  const occasion = String(body.occasion ?? '').replace(/[<>\[\]{}]/g, ' ').trim().slice(0, 140);
  const frames = (Array.isArray(body.frames) ? body.frames : []).filter((f: unknown) => typeof f === 'string' && f.length < 400_000)
    .slice(0, 4).map((f: string) => f.replace(/^data:image\/\w+;base64,/, ''));
  const seen = await seeFrames(frames);
  const { data: fam } = await db.from('family_members').select('name, role, age').eq('user_id', userId).eq('is_active', true).limit(8);
  const family = (fam ?? []).filter((m: any) => m?.name).map((m: any) => `- ${m.name}${m.role ? ` (${m.role}${m.age ? `, ${m.age}` : ''})` : ''}`).join('\n');
  const text = await freeLine(WISH_RULES, `OCCASION: ${occasion || 'a family moment'}\nFAMILY:\n${family || 'not given'}\nWHAT IS IN THE PICTURES:\n${seen || 'not available'}`, 1024);
  return { text, seen, occasion };
}

async function realEspaLuz(req: Request, body: any): Promise<Response> {
  const json = (o: unknown) => new Response(JSON.stringify(o), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const no = (reason: string) => { console.log(`[talking] no clip: ${reason}`); return json({ real: false, reason }); };
  const key = Deno.env.get('RUNWAY_API_KEY');
  if (!key) return no('no_key');
  const authHeader = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  // 6 Nov 2026: the Telegram and WhatsApp bots use this same door with the bots' secret. Payment truth and the monthly cap
  // live on their side (espaluz_talking.py), because a bot family may have no web account; they send their own Emma voice.
  // The wallet floor below still guards every clip.
  const botSecret = Deno.env.get('ESPALUZ_BOT_SECRET');
  const fromBot = !!botSecret && req.headers.get('x-espaluz-bot-secret') === botSecret;
  let user: any = null;
  if (!fromBot) {
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data, error: authError } = await asUser.auth.getUser(token);
    user = data?.user ?? null;
    if (!user) { console.log('[talking] auth:', authError?.message); return no('not_signed_in'); }
  }
  const rw = (path: string, init: RequestInit = {}) => fetch(RUNWAY_API + path, { ...init, signal: AbortSignal.timeout(30000),
    headers: { 'Authorization': `Bearer ${key}`, 'X-Runway-Version': '2024-11-06', 'Content-Type': 'application/json' } });

  if (body.mode === 'real_status') {
    if (!/^[0-9a-f-]{36}$/i.test(String(body.taskId))) return no('bad_task');
    const task = await (await rw('/tasks/' + body.taskId)).json();
    if (task.status === 'SUCCEEDED' && body.keep && user) {
      // A celebration is kept: Runway's link expires, so the clip is copied into the family's own folder once, and only
      // for a task this family started.
      const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { count: mine } = await db.from('learning_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
        .eq('session_type', 'analytics').in('content->>event', ['celebration_video', 'practice_video']).eq('content->>task', body.taskId);
      if (!mine) return no('bad_task');
      const path = `${user.id}/${body.keep === 'practice' ? 'practice' : 'celebration'}-${body.taskId}.mp4`;
      const clip = await fetch(String(task.output?.[0]), { signal: AbortSignal.timeout(60000) });
      if (clip.ok) {
        const { error } = await db.storage.from('avatars').upload(path, await clip.arrayBuffer(), { upsert: true, contentType: 'video/mp4', cacheControl: '3600' });
        if (!error) { console.log(`[celebrate] kept ${path}`); return json({ real: true, status: 'done', url: db.storage.from('avatars').getPublicUrl(path).data.publicUrl }); }
        console.error('[celebrate] keep failed', error.message);
      }
    }
    if (task.status === 'SUCCEEDED') return json({ real: true, status: 'done', url: task.output?.[0] });
    if (task.status === 'FAILED' || task.status === 'CANCELLED') { console.error('[talking] task failed', task.failure); return no('failed'); }
    return json({ real: true, status: 'working' });
  }

  const celebrate = body.mode === 'celebrate';
  const practice = body.mode === 'practice_tips';
  const pro = body.mode === 'pro_english';
  if ((celebrate || practice || pro) && !user) return no('not_signed_in');
  const event = celebrate ? 'celebration_video' : practice ? 'practice_video' : pro ? 'pro_english_video' : 'talking_video';
  const cap = celebrate ? CELEBRATION_MONTHLY_CAP : practice ? PRACTICE_MONTHLY_CAP : pro ? PRO_ENGLISH_MONTHLY_CAP : TALKING_MONTHLY_CAP;
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const nowIso = new Date().toISOString();
  let count: number | null = 0;
  if (user) {
    const { data: subs } = await db.from('user_subscriptions').select('id').eq('user_id', user.id).eq('status', 'active').gt('current_period_end', nowIso).limit(1);
    if (!subs?.length) return no('not_paid');
    const monthStart = nowIso.slice(0, 7) + '-01T00:00:00Z';
    ({ count } = await db.from('learning_sessions').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('session_type', 'analytics').eq('content->>event', event).gte('created_at', monthStart));
    if ((count ?? 0) >= cap) return no('monthly_cap');
  }
  const org = await (await rw('/organization')).json();
  if (typeof org.creditBalance !== 'number' || org.creditBalance <= RUNWAY_WALLET_FLOOR) return no('wallet_floor');

  let text = '';
  let wish = { text: '', seen: '', occasion: '' };
  if (celebrate) {
    wish = await celebrationWish(db, user.id, body);
    text = cleanTextForTTS(wish.text).trim();
    if (text.length > TALKING_MAX_CHARS) {
      const cut = text.slice(0, TALKING_MAX_CHARS);
      const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '));
      text = end > 80 ? cut.slice(0, end + 1) : cut;
    }
    if (!text) return no('no_text');
  } else if (practice) {
    const { data: rows } = await db.from('learning_sessions').select('content').eq('id', String(body.sessionId ?? ''))
      .eq('user_id', user.id).eq('session_type', 'analytics').eq('content->>event', 'practice_session').limit(1);
    text = cleanTextForTTS(String(rows?.[0]?.content?.tips ?? '')).trim().slice(0, TALKING_MAX_CHARS);
    if (!text) return no('no_text');
  } else if (pro) {
    const { data: rows } = await db.from('learning_sessions').select('content').eq('user_id', user.id).eq('session_type', 'analytics')
      .eq('content->>event', 'pro_english_turn').not('content->>reply', 'is', null).order('created_at', { ascending: false }).limit(1);
    text = cleanTextForTTS(String(rows?.[0]?.content?.reply ?? '')).trim().slice(0, TALKING_MAX_CHARS);
    if (!text) return no('no_text');
  } else {
  const raw = String(body.videoScript ?? '');
  const marked = raw.match(/\[VIDEO SCRIPT START\]([\s\S]*?)\[VIDEO SCRIPT END\]/);
  text = cleanTextForTTS(marked ? marked[1] : raw.replace(/\[VIDEO SCRIPT (START|END)\]/g, ' ')).trim();
  if (text.length > TALKING_MAX_CHARS) {
    const cut = text.slice(0, TALKING_MAX_CHARS);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
    text = end > 80 ? cut.slice(0, end + 1) : cut;
  }
  if (user) {
    const reply = marked ? raw.replace(marked[0], ' ') : raw;
    // Elena, 6 Nov 2026: useful and personal, never 'how do you feel'. The page asks often; the door decides: at most one in 3 days.
    let reason = String(body.reason ?? 'asked');
    if (reason !== 'asked') {
      const since = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
      const auto = async (days: number) => (await db.from('learning_sessions').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('session_type', 'analytics').eq('content->>event', 'talking_video')
        .neq('content->>reason', 'asked').gte('created_at', since(days))).count ?? 0;
      if (await auto(3) > 0) return no('surprise_recently');
      reason = reason === 'low_mood' ? 'low_mood' : (await auto(30) === 0 && (count ?? 0) > 0 ? 'long_road' : 'remembered');
    }
    body.reason = reason;
    text = cleanTextForTTS(await specialLine(db, user.id, reason, reply)).trim().slice(0, TALKING_MAX_CHARS);
    if (!text) return no('nothing_special');
  }
  }
  const botAudio = fromBot && typeof body.audioBase64 === 'string' && body.audioBase64.length < 8_000_000 ? body.audioBase64 : '';
  if (fromBot && !botAudio) return no('no_voice');
  if (!botAudio && !text) return no('no_text');

  // Same voice chain as every voice note: nothing new to keep working. A bot brings its own.
  const emma = botAudio || await emmaVoice(text);
  let v: any = { audioContent: emma, mimeType: 'audio/mpeg', spokenBy: 'emma' };
  if (!emma) {
    const voiced = await fetch(`${url}/functions/v1/generate-voice`, { method: 'POST', signal: AbortSignal.timeout(60000),
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice: 'es', userId: user.id }) });
    v = await voiced.json();
    if (!voiced.ok || !v.audioContent) return no('no_voice');
  }
  const wav = /wav/i.test(String(v.mimeType));
  const name = wav ? 'voice.wav' : 'voice.mp3';
  const up = await (await rw('/uploads', { method: 'POST', body: JSON.stringify({ filename: name, type: 'ephemeral' }) })).json();
  if (!up.uploadUrl) { console.error('[talking] upload start', JSON.stringify(up).slice(0, 200)); return no('upload'); }
  const form = new FormData();
  for (const [k, val] of Object.entries(up.fields as Record<string, string>)) form.append(k, val);
  form.append('file', new Blob([Uint8Array.from(atob(v.audioContent), (c) => c.charCodeAt(0))], { type: wav ? 'audio/wav' : 'audio/mpeg' }), name);
  const stored = await fetch(up.uploadUrl, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
  if (!stored.ok) { console.error('[talking] upload', stored.status); return no('upload'); }
  const task = await (await rw('/avatar_videos', { method: 'POST', body: JSON.stringify({ model: 'gwm1_avatars',
    avatar: { type: 'custom', avatarId: ESPALUZ_AVATAR_ID }, speech: { type: 'audio', audio: up.runwayUri } }) })).json();
  if (!task.id) { console.error('[talking] create', JSON.stringify(task).slice(0, 300)); return no('create'); }
  if (user) await db.from('learning_sessions').insert({ user_id: user.id, session_type: 'analytics', source: 'web',
    content: pro
      ? { event: 'pro_english_video', chars: text.length, task: task.id, voice: v.spokenBy }
      : practice
      ? { event: 'practice_video', session: String(body.sessionId), chars: text.length, task: task.id, voice: v.spokenBy }
      : celebrate
      ? { event: 'celebration_video', occasion: wish.occasion, seen: wish.seen.slice(0, 400), wish: text, chars: text.length, task: task.id, voice: v.spokenBy }
      : { event: 'talking_video', reason: String(body.reason ?? '').slice(0, 20), chars: text.length, task: task.id, voice: v.spokenBy } });
  console.log(`[talking] clip started event=${event} channel=${fromBot ? String(body.platform) : 'web'} reason=${body.reason} chars=${fromBot ? Number(body.chars) || 0 : text.length} voice=${v.spokenBy} wallet=${org.creditBalance} used=${(count ?? 0) + 1}/${cap}`);
  return json({ real: true, status: 'working', taskId: task.id, ...(celebrate ? { wish: text } : {}) });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // 5 Nov 2026: the real talking EspaLuz (Runway Characters) for paying families only. Old callers send no `mode`
    // and get the old answer below, so a page not yet published keeps working.
    if (['real', 'real_status', 'celebrate', 'practice_tips', 'pro_english'].includes(body.mode)) return await realEspaLuz(req, body);
    const { videoScript, voice = "es", userId } = body;
    
    // 5 Nov 2026: userId was only checked, never used (fixed avatar, free Google voice) - and the anonymous web free
    // trial has none, so every trial video failed with 500. The script is what matters.
    if (!videoScript) {
      throw new Error('Video script is required');
    }

    if (videoScript.length > 10000) {
      throw new Error('Video script exceeds maximum length of 10000 characters');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use the known working avatar video directly since file copying doesn't work with actual content
    const userAvatarUrl = 'https://euyidvolwqmzijkfrplh.supabase.co/storage/v1/object/public/avatars/5fa36928-3201-4c2f-bc27-c30b7a6d36c6/avatar.mp4';

    // Extract ONLY the text between [VIDEO SCRIPT START] and [VIDEO SCRIPT END] markers
    let scriptToUse = '';
    const videoStartMarker = '[VIDEO SCRIPT START]';
    const videoEndMarker = '[VIDEO SCRIPT END]';
    
    const startIndex = videoScript.indexOf(videoStartMarker);
    const endIndex = videoScript.indexOf(videoEndMarker);
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      scriptToUse = videoScript.substring(startIndex + videoStartMarker.length, endIndex).trim();
    } else {
      // Fallback if no markers found
      scriptToUse = 'Español: Gracias por practicar conmigo. Me encanta ayudarte con español.\nEnglish: Thank you for practicing with me. I love helping you with Spanish.';
    }

    // Clean text for TTS
    const cleanedScript = cleanTextForTTS(scriptToUse);

    let base64Audio = '';
    
    try {
      base64Audio = await generateVideoChunkAudio(cleanedScript, voice);
    } catch (error) {
      // Silent fail for audio generation
    }

    // Calculate estimated duration (rough estimate)
    const estimatedDuration = Math.max(5, Math.floor(scriptToUse.length / 15));

    const response = {
      success: true,
      audioContent: base64Audio,
      mimeType: 'audio/mpeg',
      userAvatarUrl,
      estimatedDuration,
      processedText: scriptToUse.length > 0 ? scriptToUse.substring(0, 100) + '...' : ''
    };

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