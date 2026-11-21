// EspaLuz PRO ENGLISH (20 Nov 2026, Elena after meeting Michael, a Panamanian English coach): a SEPARATE layer for NATIVE
// Spanish speakers (Panama, Costa Rica, all LATAM) who need professional English to earn - English-speaking clients,
// remote jobs, business travel. Loora-style: they speak or type, the coach fixes their sentence, answers IN ENGLISH, and
// scores pronunciation (Azure). Plan: cto-aipa docs/espaluz/PRO_ENGLISH_COACH_PLAN_2026-11-20.md.
//
// ONE BRAIN: web, WhatsApp and Telegram all call espaluz-chat with `proEnglish`; every rule lives HERE, the clients only
// carry text and voice. ONE MEMORY: a linked family's turns are rows in learning_sessions (event 'pro_english_turn'), so
// the phone and the laptop continue the same session. A bot guest (no linked account) keeps its state on the bot's disk
// and nothing is saved here.
// NOTHING EXISTING CHANGES: the family brain, the bilingual replies, the "I already speak Spanish" path, the rehearsal and
// the classroom never read this file; this layer never reads their rules. The door is its own (`start`).

type Msg = { role: 'user' | 'assistant'; content: string };
export type ProState = { phase?: 'check' | 'menu' | 'scene' | 'free'; step?: number; level?: string; goal?: string; work?: string; scene?: string; history?: Msg[] };
export type ProAsk = (system: string, messages: Msg[], maxTokens: number) => Promise<string>;
export type ProInput = {
  db: any; userId: string | null; platform: 'web' | 'whatsapp' | 'telegram'; ask: ProAsk;
  said?: string; start?: boolean; state?: ProState; audio?: { b64: string; mime: string } | null;
};
export type ProOutput = { text: string; speak: string; state: ProState; off?: boolean; pron?: Pron | null; saved: boolean };
type Pron = { score: number; accuracy: number; fluency: number; worst: { word: string; score: number }[] };

export const PRO_SCENES: { key: string; en: string; es: string; role: string }[] = [
  { key: 'client_call', en: 'Call with a new client', es: 'Llamada con un cliente nuevo', role: 'a new English-speaking client calling about their service; you want to understand what they do and what they need' },
  { key: 'price_quote', en: 'Quoting a price', es: 'Cotizar un precio', role: 'a client asking for a quote; ask what is included, the timeline, and push back once with "that is a bit expensive"' },
  { key: 'customer_service', en: 'Customer service', es: 'Atención al cliente', role: 'a polite but unhappy customer with a real problem (a late delivery, a wrong booking, a bug); you want it solved' },
  { key: 'job_interview', en: 'Remote job interview', es: 'Entrevista para trabajo remoto', role: 'an interviewer from a US or Canadian company hiring for a remote role; ask about experience, a hard situation, availability and time zones' },
  { key: 'investor_talk', en: 'Small talk with investors', es: 'Small talk con inversionistas', role: 'a foreign investor at a business event in Panama City; friendly small talk that turns to what they do and how they could work together' },
  { key: 'business_trip', en: 'Business trip', es: 'Viaje de negocios', role: 'airport, hotel and meeting staff on a business trip (check-in, a problem with the room, meeting a partner at reception)' },
  { key: 'email', en: 'Professional email', es: 'Email profesional', role: 'EMAIL MODE: they paste or dictate an email or message for a client; you rewrite it as a clear, warm, professional email' },
];

const CHECK_QUESTIONS = [
  { en: "Hi! I'm your EspaLuz English coach. Let's start with a quick level check - three questions. What do you do for work?", es: 'Escribe o habla, en inglés o en español: siempre te respondo en inglés correcto.' },
  { en: 'Great. Tell me about a client, a customer or a problem you solved recently. Mistakes are welcome.', es: '' },
  { en: 'Last one: why do you need English - clients, a remote job, travel, or something else?', es: '' },
];

const COACH = `You are EspaLuz Pro English, a professional English coach for NATIVE Spanish speakers in Latin America who use English to earn
money: English-speaking clients, remote jobs, business travel. Warm, direct, encouraging, never childish.
LEVEL: {LEVEL}. GOAL: {GOAL}. THEIR WORK: {WORK}. {SCENE}
Adapt every scene to THEIR real work (a client of a tour agency asks about tours, not websites).
YOU ARE A CONVERSATION PARTNER, NOT A SCRIPT (Elena, 20 Nov): scenes are only suggestions. They may bring ANY PROFESSIONAL topic
(Elena, 21 Nov: "this path is professional English - any topic meaningful professionally, not 'the sky is blue'"): their own
job and field, a client, a meeting, a negotiation, an email, an interview, a work worry, a word or grammar they need for work.
If they change to such a topic, even in the middle of a scene, follow them: answer it truly and helpfully in English, then keep
the conversation going. If they drift into everyday small talk unrelated to work, answer it in one kind sentence and steer back
to their work English (for everyday life there is EspaLuz's other path).
Length: A2 = 1-2 short sentences with simple words; B1 = up to 2; B2/C1 = up to 3.
For THEIR LAST MESSAGE return ONLY JSON {"better":"","why":"","reply":"","es_help":""}:
- "better": if their message has a mistake, sounds unnatural or is a word-for-word Spanish construction, the natural professional
  English version of THEIR sentence, keeping their meaning. If they wrote in Spanish: how to say it in English. If it is already
  good: "". Fix only what matters most for sounding professional - never rewrite a good sentence.
- "why": only when "better" is not empty: ONE short reason in simple ENGLISH, max 12 words ("We say 'ask a question', not 'make a question'.").
- "reply": YOUR answer, ONLY IN ENGLISH, 1 to 3 short sentences pitched at their level (a real question may need a bit more),
  in your role if a scene is on and they stay in it, ending with a question that moves the conversation forward. Use real professional English people use today, never textbook English.
- "es_help": ONE short Spanish line ONLY if they say they do not understand or are clearly stuck; otherwise "". Aim for 90% English:
  this is an English-immersion coach (Loora-style), not the bilingual family companion.
Never invent facts about them. Never add anything outside the JSON.`;

const LEVEL_JUDGE = `You assess the English of a native Spanish speaker from three short answers (TRANSCRIPT). Return ONLY JSON
{"level":"A2|B1|B2|C1","goal":"clients|remote_job|travel|other","strong_es":"<one thing they do well, simple English, max 12 words>",
"focus_es":"<the one thing to work on first, simple English, max 12 words>","work":"<what they do for work, English, max 12 words, or empty>"}. Judge only what they actually wrote.`;

const OFF = /^\s*\/?(salir|exit|stop|adios|adiós|bye|terminar|fin|end)\s*[!.]?\s*$/i;
const MENU = /^\s*\/?(menu|men[uú]|escenas|scenes|opciones)\s*[!.]?\s*$/i;
const PROGRESS = /^\s*\/?(progress|progreso|mi progreso|my progress)\s*[!.?]?\s*$/i;
const LEVEL = /^\s*\/?(level|nivel|level check|test de nivel)\s*[!.?]?\s*$/i;
const FREE = /^\s*\/?(free|libre|conversaci[oó]n libre|free talk)\s*[!.]?\s*$/i;

function json(text: string): Record<string, string> {
  const m = String(text ?? '').match(/\{[\s\S]*\}/);
  if (!m) return {};
  try { return Object.fromEntries(Object.entries(JSON.parse(m[0])).map(([k, v]) => [k, String(v ?? '').replace(/\*/g, '').trim()])); } catch { return {}; }
}

function menuText(level?: string): string {
  return `${level ? `📊 Your level: *${level}*\n\n` : ''}🎯 *Choose a scene* (send the number):\n` +
    PRO_SCENES.map((s, i) => `${i + 1}. ${s.en}`).join('\n') +
    `\n\n💼 Or bring your own work topic - your job, a client, a meeting, an email - in English or Spanish, by text or voice note 🎙️. I always answer in English.` +
    `\n📈 *progress* · 🚪 *exit*`;
}

// Azure Pronunciation Assessment, short-audio REST (max ~60 s). The reference text is the transcript the client already
// made, so the score says how clearly THEY said what they meant. F0 (free) key shared with the voices; null on any failure.
export async function pronounce(audio: { b64: string; mime: string }, reference: string): Promise<Pron | null> {
  const key = Deno.env.get('AZURE_SPEECH_KEY'), region = Deno.env.get('AZURE_SPEECH_REGION');
  if (!key || !region || !audio?.b64 || !reference.trim()) return null;
  const mime = /ogg|opus/i.test(audio.mime) ? 'audio/ogg; codecs=opus' : /wav/i.test(audio.mime) ? 'audio/wav; codecs=audio/pcm; samplerate=16000' : '';
  if (!mime) return null; // the browser's webm is not accepted by this endpoint; the web sends wav
  const cfg = btoa(JSON.stringify({ ReferenceText: reference.slice(0, 500), GradingSystem: 'HundredMark', Granularity: 'Word', Dimension: 'Comprehensive', EnableMiscue: false }));
  try {
    const bytes = Uint8Array.from(atob(audio.b64), (c) => c.charCodeAt(0));
    const r = await fetch(`https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`, {
      method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': mime, 'Pronunciation-Assessment': cfg, Accept: 'application/json' }, body: bytes,
    });
    if (!r.ok) { console.log(`[pro-english] azure pronunciation HTTP ${r.status}`); return null; }
    const best = (await r.json())?.NBest?.[0];
    const pa = best?.PronunciationAssessment ?? best;
    if (!pa || typeof pa.PronScore !== 'number') return null;
    const worst = (best.Words ?? []).map((w: any) => ({ word: String(w.Word ?? ''), score: Math.round(Number(w.PronunciationAssessment?.AccuracyScore ?? w.AccuracyScore ?? 100)) }))
      .filter((w: any) => w.word.length > 2 && w.score < 75).sort((a: any, b: any) => a.score - b.score).slice(0, 2);
    return { score: Math.round(pa.PronScore), accuracy: Math.round(pa.AccuracyScore ?? 0), fluency: Math.round(pa.FluencyScore ?? 0), worst };
  } catch (e) { console.log(`[pro-english] azure pronunciation failed: ${(e as Error).message}`); return null; }
}

async function lastState(db: any, userId: string): Promise<{ state: ProState; history: Msg[] }> {
  const { data } = await db.from('learning_sessions').select('content').eq('user_id', userId).eq('session_type', 'analytics')
    .eq('content->>event', 'pro_english_turn').order('created_at', { ascending: false }).limit(8);
  const rows = (data ?? []).map((r: any) => r.content ?? {});
  const history: Msg[] = [];
  for (const c of [...rows].reverse()) {
    if (c.said) history.push({ role: 'user', content: String(c.said).slice(0, 600) });
    if (c.reply) history.push({ role: 'assistant', content: String(c.reply).slice(0, 600) });
  }
  return { state: (rows[0]?.state ?? {}) as ProState, history };
}

async function progressText(db: any, userId: string | null): Promise<string> {
  if (!userId) return '📈 To keep your progress on the web, WhatsApp and Telegram together, connect your EspaLuz account (app.espaluz.lat → Dashboard → Connect).';
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data } = await db.from('learning_sessions').select('content, created_at').eq('user_id', userId).eq('session_type', 'analytics')
    .in('content->>event', ['pro_english_turn', 'pro_english_drill']).gte('created_at', since).limit(1000);
  const weekAgo = Date.now() - 7 * 86400000;
  const pick = (recent: boolean, event = 'pro_english_turn') => (data ?? []).filter((r: any) => r.content?.event === event
    && (new Date(r.created_at).getTime() >= weekAgo) === recent).map((r: any) => r.content ?? {});
  // 21 Nov 2026: the word drills (practice loop) count too - words practised, and how many reached 80+.
  const drills = pick(true, 'pro_english_drill'), drilled = new Set(drills.map((c: any) => c.word)),
    mastered = new Set(drills.filter((c: any) => c.score >= 80).map((c: any) => c.word));
  const sum = (rows: any[]) => {
    const said = rows.filter((c) => c.said), scores = rows.map((c) => c.pron?.score).filter((n) => typeof n === 'number');
    return { turns: said.length, clean: said.filter((c) => !c.better).length, scenes: new Set(rows.map((c) => c.state?.scene).filter(Boolean)).size,
      pron: scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null };
  };
  const now = sum(pick(true)), before = sum(pick(false));
  if (!now.turns) return '📈 No practice yet this week. Send *menu* and choose a scene.';
  const pct = (s: any) => Math.round((100 * s.clean) / Math.max(1, s.turns));
  return `📈 *Your week*\n• Messages in English: ${now.turns}${before.turns ? ` (week before: ${before.turns})` : ''}\n` +
    `• No correction needed: ${pct(now)}%${before.turns ? ` (week before: ${pct(before)}%)` : ''}\n• Scenes practised: ${now.scenes}\n` +
    (now.pron !== null ? `• Average pronunciation: ${now.pron}/100${before.pron !== null ? ` (week before: ${before.pron})` : ''}\n` : '') +
    (drilled.size ? `• Words practised: ${drilled.size} (${mastered.size} now at 80+)\n` : '');
}

// 21 Nov 2026 (Elena: "make the pronunciation truly work the way Loora and other coaches practise - connect what we have,
// no new bicycle"): the practice LOOP for one weak word. The scoring is the same pronounce() as a coaching turn, with the
// word itself as the reference text; the page plays the word in the coach's voice (generate-voice hero 'coach') and records
// the try with its existing mic code. Each try is saved (event 'pro_english_drill') so progress can show it.
export async function drillWord(db: any, userId: string | null, platform: string, word: string, audio: { b64: string; mime: string }):
  Promise<{ word: string; score: number | null }> {
  const w = String(word ?? '').replace(/[^\p{L}'\- ]/gu, '').trim().slice(0, 40);
  if (!w) return { word: '', score: null };
  const p = await pronounce(audio, w);
  const score = p ? (p.accuracy || p.score) : null;
  if (userId && score !== null) {
    const { error } = await db.from('learning_sessions').insert({ user_id: userId, session_type: 'analytics', source: platform,
      content: { event: 'pro_english_drill', platform, word: w, score } });
    if (error) console.log(`[pro-english] drill save failed: ${error.message}`);
  }
  console.log(`[pro-english] drill ${platform} word="${w}" score=${score ?? '-'}`);
  return { word: w, score };
}

export async function proEnglish(inp: ProInput): Promise<ProOutput> {
  const { db, userId, platform, ask } = inp;
  const said = String(inp.said ?? '').trim().slice(0, 1500);
  const stored = userId ? await lastState(db, userId) : { state: inp.state ?? {}, history: (inp.state?.history ?? []).slice(-16) };
  let state: ProState = { ...stored.state, history: undefined };
  const history = stored.history;
  const save = async (extra: Record<string, unknown>) => {
    if (!userId) return false;
    const { error } = await db.from('learning_sessions').insert({ user_id: userId, session_type: 'analytics', source: platform,
      content: { event: 'pro_english_turn', platform, state, ...extra } });
    if (error) console.log(`[pro-english] save failed: ${error.message}`);
    return !error;
  };
  const out = (text: string, speak: string, extra: Record<string, unknown> = {}, more: Partial<ProOutput> = {}) => save(extra)
    .then((saved) => ({ text, speak, state: { ...state, history: userId ? undefined : [...history, ...(said ? [{ role: 'user' as const, content: said }] : []), ...(extra.reply ? [{ role: 'assistant' as const, content: String(extra.reply) }] : [])].slice(-16) }, saved, ...more }));

  // The door: a level check the first time, the scene menu after.
  if (inp.start || LEVEL.test(said)) {
    if (state.level && !LEVEL.test(said)) { state = { ...state, phase: 'menu' }; console.log(`[pro-english] start ${platform} returning level=${state.level}`); return out(`👋 Welcome back!\n\n${menuText(state.level)}`, 'Welcome back! Choose a scene.'); }
    state = { phase: 'check', step: 0 };
    console.log(`[pro-english] start ${platform} level-check`);
    return out(`🇺🇸 *EspaLuz Pro English*\n\n💬 ${CHECK_QUESTIONS[0].en}\n\n_${CHECK_QUESTIONS[0].es}_`, CHECK_QUESTIONS[0].en, { reply: CHECK_QUESTIONS[0].en });
  }
  if (OFF.test(said)) { console.log(`[pro-english] off ${platform}`); return out('👋 See you soon! Send *pro english* any time to continue.', 'See you soon!', {}, { off: true }); }
  if (PROGRESS.test(said)) return out(await progressText(db, userId), 'Here is your week.');
  if (MENU.test(said)) { state = { ...state, phase: 'menu' }; return out(menuText(state.level), 'Choose a scene.'); }
  if (FREE.test(said)) { state = { ...state, phase: 'free', scene: undefined }; return out("💼 Your own work topic - a client, a meeting, an email, your field. What do you need English for today?", "Your own work topic. What do you need English for today?", { reply: "Your own work topic - a client, a meeting, an email, your field. What do you need English for today?" }); }
  const n = Number(said.replace(/[^\d]/g, ''));
  if (state.phase !== 'check' && /^\s*\d\s*[.)]?\s*$/.test(said) && n >= 1 && n <= PRO_SCENES.length) {
    const sc = PRO_SCENES[n - 1];
    state = { ...state, phase: 'scene', scene: sc.key };
    const first = json(await ask(COACH.replace('{LEVEL}', state.level ?? 'B1').replace('{GOAL}', state.goal ?? 'other').replace('{WORK}', state.work || 'not given')
      .replace('{SCENE}', `SCENE - you play: ${sc.role}. This is the START: "better" and "why" stay empty; greet them in your role and ask your first question.`),
      [{ role: 'user', content: '(start the scene)' }], 400));
    const reply = first.reply || 'Hi, thanks for taking my call. Could you tell me a bit about what you do?';
    console.log(`[pro-english] scene ${sc.key} ${platform}`);
    return out(`🎬 *${sc.en}*\n\n💬 ${reply}\n\n_(menu · progress · exit)_`, reply, { reply });
  }
  if (!said) return out(menuText(state.level), 'Choose a scene.');

  // Level check: three fixed questions, then the level is judged from what they actually wrote.
  if (state.phase === 'check') {
    const step = (state.step ?? 0) + 1;
    if (step < CHECK_QUESTIONS.length) {
      state = { ...state, step };
      const q = CHECK_QUESTIONS[step];
      return out(`💬 ${q.en}${q.es ? `\n\n_${q.es}_` : ''}`, q.en, { said, reply: q.en });
    }
    const answers = [...history.filter((h) => h.role === 'user').slice(-2).map((h) => h.content), said];
    const j = json(await ask(LEVEL_JUDGE, [{ role: 'user', content: `TRANSCRIPT:\n${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}` }], 300));
    const level = /^(A2|B1|B2|C1)$/.test(j.level ?? '') ? j.level : 'B1';
    state = { phase: 'menu', level, goal: j.goal || 'other', work: (j.work ?? '').slice(0, 120) };
    console.log(`[pro-english] level ${level} goal=${state.goal} ${platform}`);
    return out(`✅ *Done!*${j.strong_es ? `\n👍 ${j.strong_es}` : ''}${j.focus_es ? `\n🎯 We'll work on: ${j.focus_es}` : ''}\n\n${menuText(level)}`,
      `Thank you! Your level is ${level}. Choose a scene.`, { said, level, reply: `Level ${level}` });
  }

  // A coaching turn: in a scene, or free talk.
  const sc = PRO_SCENES.find((s) => s.key === state.scene);
  if (!state.phase || state.phase === 'menu') state = { ...state, phase: 'free' };
  const pronP = inp.audio ? pronounce(inp.audio, said) : Promise.resolve(null);
  const j = json(await ask(COACH.replace('{LEVEL}', state.level ?? 'B1').replace('{GOAL}', state.goal ?? 'other').replace('{WORK}', state.work || 'not given')
    .replace('{SCENE}', sc ? `SCENE - you play: ${sc.role}.` : 'FREE CONVERSATION about the professional topic they bring - their job, field, clients, meetings, emails.'),
    [...history.slice(-12), { role: 'user', content: said }], 500));
  const pron = await pronP;
  const reply = j.reply || "Sorry, could you say that again in another way?";
  const lines = [
    j.better ? `✍️ *Better:* ${j.better}${j.why ? `\n_${j.why}_` : ''}` : '✅ Good English!',
    `💬 ${reply}`,
    j.es_help ? `🇪🇸 ${j.es_help}` : '',
    pron ? `🎙️ Pronunciation *${pron.score}/100*${pron.worst.length ? ` · practise: ${pron.worst.map((w) => `*${w.word}* (${w.score})`).join(', ')}` : ''}` : '',
  ].filter(Boolean);
  console.log(`[pro-english] turn ${platform} scene=${state.scene ?? 'free'} better=${j.better ? 1 : 0} pron=${pron?.score ?? '-'}`);
  return out(lines.join('\n\n'), `${j.better ? `Better: ${j.better.replace(/[.!?\s]+$/, '')}. ` : ''}${reply}`, { said, better: j.better ?? '', reply, pron }, { pron });
}
