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
export type ProState = { phase?: 'check' | 'menu' | 'scene' | 'free'; step?: number; level?: string; goal?: string; scene?: string; history?: Msg[] };
export type ProAsk = (system: string, messages: Msg[], maxTokens: number) => Promise<string>;
export type ProInput = {
  db: any; userId: string | null; platform: 'web' | 'whatsapp' | 'telegram'; ask: ProAsk;
  said?: string; start?: boolean; state?: ProState; audio?: { b64: string; mime: string } | null;
};
export type ProOutput = { text: string; speak: string; state: ProState; off?: boolean; pron?: Pron | null; saved: boolean };
type Pron = { score: number; accuracy: number; fluency: number; worst: { word: string; score: number }[] };

export const PRO_SCENES: { key: string; es: string; role: string }[] = [
  { key: 'client_call', es: 'Llamada con un cliente nuevo', role: 'a new English-speaking client calling about their service; you want to understand what they do and what they need' },
  { key: 'price_quote', es: 'Cotizar un precio', role: 'a client asking for a quote; ask what is included, the timeline, and push back once with "that is a bit expensive"' },
  { key: 'customer_service', es: 'Atención al cliente', role: 'a polite but unhappy customer with a real problem (a late delivery, a wrong booking, a bug); you want it solved' },
  { key: 'job_interview', es: 'Entrevista para trabajo remoto', role: 'an interviewer from a US or Canadian company hiring for a remote role; ask about experience, a hard situation, availability and time zones' },
  { key: 'investor_talk', es: 'Small talk con inversionistas', role: 'a foreign investor at a business event in Panama City; friendly small talk that turns to what they do and how they could work together' },
  { key: 'business_trip', es: 'Viaje de negocios', role: 'airport, hotel and meeting staff on a business trip (check-in, a problem with the room, meeting a partner at reception)' },
  { key: 'email', es: 'Email profesional', role: 'EMAIL MODE: they paste or dictate an email or message for a client; you rewrite it as a clear, warm, professional email' },
];

const CHECK_QUESTIONS = [
  { en: "Hi! I'm your EspaLuz English coach. Let's start with a quick level check - three questions. What do you do for work?", es: '¿A qué te dedicas? Responde en inglés como puedas; también puedes enviar una nota de voz.' },
  { en: 'Great. Tell me about a client, a customer or a problem you solved recently.', es: 'Cuéntame de un cliente o un problema que resolviste. Errores = bienvenidos.' },
  { en: 'Last one: why do you need English - clients, a remote job, travel, or something else?', es: '¿Para qué necesitas el inglés?' },
];

const COACH = `You are EspaLuz Pro English, a professional English coach for NATIVE Spanish speakers in Latin America who use English to earn
money: English-speaking clients, remote jobs, business travel. Warm, direct, encouraging, never childish.
LEVEL: {LEVEL}. GOAL: {GOAL}. {SCENE}
For THEIR LAST MESSAGE return ONLY JSON {"better":"","why":"","reply":"","es_help":""}:
- "better": if their message has a mistake, sounds unnatural or is a word-for-word Spanish construction, the natural professional
  English version of THEIR sentence, keeping their meaning. If they wrote in Spanish: how to say it in English. If it is already
  good: "". Fix only what matters most for sounding professional - never rewrite a good sentence.
- "why": only when "better" is not empty: ONE short reason in Spanish, max 15 words ("En inglés no se dice 'make a question', se dice 'ask'").
- "reply": YOUR answer, ONLY IN ENGLISH, 1 to 3 short sentences pitched at their level, staying in your role, ending with a question
  that moves the conversation forward. Use real professional English people use today, never textbook English.
- "es_help": ONE short Spanish line ONLY if they wrote mostly in Spanish or said they do not understand; otherwise "".
Never invent facts about them. Never add anything outside the JSON.`;

const LEVEL_JUDGE = `You assess the English of a native Spanish speaker from three short answers (TRANSCRIPT). Return ONLY JSON
{"level":"A2|B1|B2|C1","goal":"clients|remote_job|travel|other","strong_es":"<one thing they do well, Spanish, max 15 words>",
"focus_es":"<the one thing to work on first, Spanish, max 15 words>"}. Judge only what they actually wrote.`;

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
  return `${level ? `📊 Nivel: *${level}*\n\n` : ''}🎯 *Elige una escena* (escribe el número):\n` +
    PRO_SCENES.map((s, i) => `${i + 1}. ${s.es}`).join('\n') +
    `\n\n💬 *libre* = conversación libre · 📈 *progreso* · 🚪 *salir*\nResponde en inglés, por texto o nota de voz 🎙️`;
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
  if (!userId) return '📈 Para guardar tu progreso en la web, WhatsApp y Telegram a la vez, conecta tu cuenta EspaLuz (app.espaluz.lat → Dashboard → Conectar).';
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data } = await db.from('learning_sessions').select('content, created_at').eq('user_id', userId).eq('session_type', 'analytics')
    .eq('content->>event', 'pro_english_turn').gte('created_at', since).limit(1000);
  const weekAgo = Date.now() - 7 * 86400000;
  const pick = (recent: boolean) => (data ?? []).filter((r: any) => (new Date(r.created_at).getTime() >= weekAgo) === recent).map((r: any) => r.content ?? {});
  const sum = (rows: any[]) => {
    const said = rows.filter((c) => c.said), scores = rows.map((c) => c.pron?.score).filter((n) => typeof n === 'number');
    return { turns: said.length, clean: said.filter((c) => !c.better).length, scenes: new Set(rows.map((c) => c.state?.scene).filter(Boolean)).size,
      pron: scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null };
  };
  const now = sum(pick(true)), before = sum(pick(false));
  if (!now.turns) return '📈 Esta semana todavía no practicamos. Escribe *menu* y elige una escena.';
  const pct = (s: any) => Math.round((100 * s.clean) / Math.max(1, s.turns));
  return `📈 *Tu semana*\n• Mensajes en inglés: ${now.turns}${before.turns ? ` (antes: ${before.turns})` : ''}\n` +
    `• Sin corrección: ${pct(now)}%${before.turns ? ` (antes: ${pct(before)}%)` : ''}\n• Escenas practicadas: ${now.scenes}\n` +
    (now.pron !== null ? `• Pronunciación media: ${now.pron}/100${before.pron !== null ? ` (antes: ${before.pron})` : ''}\n` : '');
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
    return out(`🇺🇸 *EspaLuz Pro English*\n\n💬 ${CHECK_QUESTIONS[0].en}\n\n🇪🇸 _${CHECK_QUESTIONS[0].es}_`, CHECK_QUESTIONS[0].en, { reply: CHECK_QUESTIONS[0].en });
  }
  if (OFF.test(said)) { console.log(`[pro-english] off ${platform}`); return out('👋 See you soon! Pro English en pausa. Escribe *pro english* para volver.', 'See you soon!', {}, { off: true }); }
  if (PROGRESS.test(said)) return out(await progressText(db, userId), 'Here is your week.');
  if (MENU.test(said)) { state = { ...state, phase: 'menu' }; return out(menuText(state.level), 'Choose a scene.'); }
  if (FREE.test(said)) { state = { ...state, phase: 'free', scene: undefined }; return out("💬 Free talk. Tell me about your day at work - what's on your plate this week?", "Free talk. Tell me about your day at work. What's on your plate this week?", { reply: "Tell me about your day at work - what's on your plate this week?" }); }
  const n = Number(said.replace(/[^\d]/g, ''));
  if (state.phase !== 'check' && /^\s*\d\s*[.)]?\s*$/.test(said) && n >= 1 && n <= PRO_SCENES.length) {
    const sc = PRO_SCENES[n - 1];
    state = { ...state, phase: 'scene', scene: sc.key };
    const first = json(await ask(COACH.replace('{LEVEL}', state.level ?? 'B1').replace('{GOAL}', state.goal ?? 'other')
      .replace('{SCENE}', `SCENE - you play: ${sc.role}. This is the START: "better" and "why" stay empty; greet them in your role and ask your first question.`),
      [{ role: 'user', content: '(start the scene)' }], 400));
    const reply = first.reply || 'Hi, thanks for taking my call. Could you tell me a bit about what you do?';
    console.log(`[pro-english] scene ${sc.key} ${platform}`);
    return out(`🎬 *${sc.es}*\n\n💬 ${reply}\n\n_(menu · progreso · salir)_`, reply, { reply });
  }
  if (!said) return out(menuText(state.level), 'Choose a scene.');

  // Level check: three fixed questions, then the level is judged from what they actually wrote.
  if (state.phase === 'check') {
    const step = (state.step ?? 0) + 1;
    if (step < CHECK_QUESTIONS.length) {
      state = { ...state, step };
      const q = CHECK_QUESTIONS[step];
      return out(`💬 ${q.en}\n\n🇪🇸 _${q.es}_`, q.en, { said, reply: q.en });
    }
    const answers = [...history.filter((h) => h.role === 'user').slice(-2).map((h) => h.content), said];
    const j = json(await ask(LEVEL_JUDGE, [{ role: 'user', content: `TRANSCRIPT:\n${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}` }], 300));
    const level = /^(A2|B1|B2|C1)$/.test(j.level ?? '') ? j.level : 'B1';
    state = { phase: 'menu', level, goal: j.goal || 'other' };
    console.log(`[pro-english] level ${level} goal=${state.goal} ${platform}`);
    return out(`✅ *Listo.*${j.strong_es ? `\n👍 ${j.strong_es}` : ''}${j.focus_es ? `\n🎯 Vamos a trabajar: ${j.focus_es}` : ''}\n\n${menuText(level)}`,
      `Thank you! Your level is ${level}. Choose a scene.`, { said, level, reply: `Level ${level}` });
  }

  // A coaching turn: in a scene, or free talk.
  const sc = PRO_SCENES.find((s) => s.key === state.scene);
  if (!state.phase || state.phase === 'menu') state = { ...state, phase: 'free' };
  const pronP = inp.audio ? pronounce(inp.audio, said) : Promise.resolve(null);
  const j = json(await ask(COACH.replace('{LEVEL}', state.level ?? 'B1').replace('{GOAL}', state.goal ?? 'other')
    .replace('{SCENE}', sc ? `SCENE - you play: ${sc.role}.` : 'FREE TALK about their work and plans.'),
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
  return out(lines.join('\n\n'), `${j.better ? `Better: ${j.better}. ` : ''}${reply}`, { said, better: j.better ?? '', reply, pron }, { pron });
}
