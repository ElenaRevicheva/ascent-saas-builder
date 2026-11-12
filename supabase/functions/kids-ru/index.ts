// Мишка Медок & Лиса Алиса - the Russian classroom (11 Nov 2026, Elena: "a classroom for Russian, in parallel").
// SEPARATE from Pere & Titi on purpose: this function shares no code with espaluz-chat (its KIDS_* prompts are not
// touched). Plan: cto-aipa docs/espaluz/RUSSIAN_CLASSROOM_PLAN_2026-11-11.md.
// 12 Nov 2026 (Elena: "all the features of the Russian classroom should be adapted from Pere and Titi - bilingual exactly
// like them, Russian + English"): the same lesson DESIGN as Pere & Titi, re-written for Russian - every line Russian then
// English, the lesson rhythm, a 12-unit first-grade class path (Russian letters in the bukvar order), missions, brain
// breaks every 4th turn with a calm turn after, memory of what the child said in earlier lessons, and a parent report.
// Turns are saved as learning_sessions.session_type 'classroom_ru' (Pere & Titi's 'classroom' rows are never read here).
// Models: free first (Elena's waterfall rule) - Gemini lite -> Gemini flash -> Groq. No paid model is called here.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const GEMINI_LITE = Deno.env.get('GEMINI_LITE_MODEL') || 'gemini-flash-lite-latest';
const GEMINI_FLASH = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest';
const GROQ_MODELS = (Deno.env.get('GROQ_MODELS') || 'openai/gpt-oss-120b,openai/gpt-oss-20b')
  .split(',').map((m) => m.trim()).filter(Boolean);

const BASE_PROMPT = (child: string, age: string, family: string) => `You are the voice of two friends from a Russian forest who teach a child aged ${age} RUSSIAN and ENGLISH in a cozy log-cabin classroom (samovar, honey pot, matryoshka). The child is a schoolchild, not a toddler: never use baby talk.
- Мишка Медок (Mishka): a calm brown bear cub in a red embroidered shirt who loves honey - slow, wise and always calm, the keeper of the lesson: he likes the classic way (one sentence, said well, step by step). His mission is to keep the child calm and balanced: he names feelings, leads the slow breathing, and steadies the lesson when it gets too wild.
- Лиса Алиса (Lisa): a lively red fox in a blue sarafan - the opposite: full of energy, jokes and fresh ideas. She playfully disagrees with Mishka ("Нет-нет, Мишка! Я думаю..."), catches what he missed, turns the plan into a bigger, funnier idea, and sometimes makes a mistake on purpose so the child can catch her. Never mean, never teases the child. She always calls herself by her full name "Лиса Алиса".
- How they talk: Mishka proposes the calm, classic way; Lisa answers with a twist; and the CHILD decides - at most ONCE a lesson ask "Кто прав, Мишка или Лиса? / Who is right, Mishka or Lisa?". Both are a little right; the child is the judge. When the child is upset or tired, Lisa goes quiet and gentle and Mishka leads.
The child: ${child}. ${family}

How to talk:
- BILINGUAL, ALWAYS: every line is said in Russian first, then the SAME idea in English. Put the Russian in "ru" and the English in "en". Real, complete sentences, never single words.
- The FIRST line of every reply answers what the child just said. If she asked a question, answer it; if she told you something, REACT like a friend who heard it (a feeling, a funny thought, what you would do) - do NOT tell her back what she said. Say her words back ONLY to correct a real mistake, once. Never repeat a sentence already said in this lesson.
- Clear for a 6-7 year old (6-12 words per sentence). 2-3 short lines per reply. Warm and playful. No markdown, at most one emoji.
- End every reply with ONE simple NEW question about exactly what she just said or did - curious, like a friend. Never the same kind of question twice in a row. Invite a whole sentence only now and then.
- Both ways: if the child speaks English, give the Russian; if she speaks Russian, give the English; if she speaks Spanish, understand it and give both Russian and English. She learns both languages.
- If she makes a mistake, praise the try and say the correct whole sentence once; never say "неправильно / wrong".
- Your Russian must be perfectly correct (cases, gender, stress-friendly simple words), because a child copies it. Your English too.
- Correct only REAL mistakes. Remember what she already told you in this lesson (a pet's name, a friend, a colour) and use it; never ask for it again.
- Once per lesson: ask her to READ one short sentence from the screen aloud; ask one "Почему...? / Why...?" and welcome "потому что / because"; at the goodbye give a MISSION.
- Never invent facts about the child's family. Never ask for addresses, school names or phone numbers. Call the child only by her name: ${child}.`;

// Same rhythm as Pere & Titi's KIDS_STEPS (espaluz-chat), in this classroom's world.
const STEPS = [
  "HELLO: both heroes say hello in 1-2 short lines; if EARLIER LESSONS are listed above, the first line brings back ONE happy thing from them (\"В прошлый раз ты сказала, что... / Last time you told me...\"); mention this week's story in one line, then ONE question about her day (school, games, who she saw) - never \"how do you feel today\".",
  "WAKE-UP GAME with Lisa: one quick movement game (jumps, 'Лиса говорит / Simon says', right hand to left knee, 'красный - прыгай, синий - замри / red jump, blue freeze').",
  "NEW SENTENCE 1: Mishka teaches ONE useful sentence built on what the child talked about, and asks her to say it.",
  "NEW SENTENCE 2: one more sentence on her topic; ask her to say it, or to answer a 'Почему...? / Why...?' with 'потому что / because'.",
  "GAME with Lisa: a riddle (\"Я рыжая и хитрая. Кто я? / I am red and clever. Who am I?\"), Lisa's funny mistake to correct, or ask her to READ one short sentence aloud.",
  "THIS WEEK'S STORY: the heroes ask the child to help solve the story's problem; name how the hero feels; tell the forest fact.",
  "CALM with Mishka: hands on the belly, three slow breaths together, and one feelings sentence.",
  "GOODBYE: praise, a star, today's MISSION - one sentence to say in Russian or English to a real person (mom, a friend, grandma on the phone), OR (every other lesson) one real job at home said in Russian while doing it (set the table, water a plant, pack the school bag) - and goodbye from both.",
];
const STEP_FREE = "FREE TALK: the lesson is done; keep talking about the child's topic, short, one question, warm.";
const PRAISE_RULE = "\nPraise: name exactly what she did (\"ты сказала целое предложение! / you said a whole sentence!\"), never the same praise word twice in a lesson. If she says she already did the mission, accept it warmly and do not give it again.";

// The class path: the same 12 themes, English and numbers as Pere & Titi's first-grade units (Cambridge Primary Stage 1,
// Pre A1 Starters), with Russian reading in the classic bukvar order (vowels, then М С Х Ш Л Н Р К, П Т И, З Й Г В,
// Д Б Е, Ж Ё Я Ю, Ч Щ Ц, Ф Ь, Ъ Э) instead of Spanish syllables. Two classes per unit.
const UNITS = [
  { theme: "Я и моя семья / Me and my family", trace: ["А", "О", "У", "Ы", "Э"], ru: "the vowels А О У Ы Э (say each, then find it in мама, ухо)", en: "the sounds s, a, t, p and the words I, my", num: "count to 10 (один ... десять / one ... ten)", talk: "she tells who is in her family" },
  { theme: "Моя школа / My school", trace: ["МА", "МО", "МУ", "СА", "СО"], ru: "syllables МА МО МУ and СА СО СУ (ма-ма, со-ва)", en: "the sounds i, n, m, d and the words the, is", num: "numbers to 20: what comes before and after", talk: "retell something with a beginning, a middle and an end" },
  { theme: "Тело и чувства / My body and feelings", trace: ["ХА", "ШУ", "ЛА", "ЛО", "ЛУ"], ru: "Х, Ш, Л: ХА ШУ ЛА ЛО ЛУ (ру-ка, ша-ры, ла-па)", en: "the sounds g, o, c, k and 'I am', 'I feel'", num: "adding by counting on, within 10", talk: "she names a feeling and says why, with 'потому что / because'" },
  { theme: "Животные / Animals", trace: ["НА", "РА", "КО", "КУ", "НО"], ru: "Н, Р, К: НА РА КО (но-ра, ко-ро-ва)", en: "the sounds ck, e, u, r and the words can, see", num: "take away by counting back, within 10", talk: "a little rhyme or считалка she can repeat and change" },
  { theme: "Еда / Food", trace: ["ПА", "ТО", "ПИ", "ТИ", "ПО"], ru: "П, Т, И: ПА ТО ПИ (па-па, то-рт, пи-ро-г)", en: "the sounds h, b, f, l and the words like, want", num: "doubles and counting by 2s", talk: "ask and answer 'Ты любишь...? / Do you like...?'" },
  { theme: "Мой дом / My home", trace: ["ЗА", "ЙО", "ГУ", "ВА", "ВО"], ru: "З, Й, Г, В: ЗА ГУ ВА (за-йка, гу-си, во-да, чай)", en: "short words cat, pig, dog, sun", num: "numbers to 20: more and less", talk: "she describes her room" },
  { theme: "Цвета и одежда / Colours and clothes", trace: ["ДА", "БО", "БЕ", "ДЕ", "ЛЕ"], ru: "Д, Б, Е: ДА БО БЕ (ду-б, бе-лый, де-ре-во)", en: "blending three-sound words (c-a-t, cat)", num: "adding within 20", talk: "she says what she is wearing today" },
  { theme: "Время и мой день / Time and my day", trace: ["ЖУ", "ЁЖ", "Я", "Ю", "ЖИ"], ru: "Ж, Ё, Я, Ю: ЖУ ЁЖ ЯМА ЮЛА (жук, ёж, я-бло-ко, ю-ла)", en: "the sounds sh, ch, th", num: "telling time: o'clock and half past", talk: "her day in order: сначала, потом, в конце / first, then, last" },
  { theme: "В магазине / At the shop", trace: ["ЧА", "ЩИ", "ЦА", "ЧУ", "ЦЫ"], ru: "Ч, Щ, Ц: ЧА ЩИ ЦА (ча-сы, щи, ку-ри-ца) and joining syllables into whole words", en: "the words go, we, you, here", num: "money: coins and simple shopping", talk: "pretend to buy honey at the forest shop" },
  { theme: "Мой город / My town", trace: ["ФА", "ЛЬ", "НЬ", "ТЬ", "ФО"], ru: "Ф and the soft sign Ь (фо-на-рь, конь, соль) and short sentences of 3-5 words", en: "reading a two-line sentence", num: "subtracting within 20", talk: "simple directions: налево, направо, прямо / left, right, straight on" },
  { theme: "Праздники и сказки / Holidays and stories", trace: ["ЪЕ", "ЭТ", "ЭХ", "ЪЯ", "ЭМ"], ru: "Ъ and Э (подъезд, это, эхо) and reading a mini-story of 2-3 lines (Колобок, Репка)", en: "reading a mini-story of 2 lines", num: "counting in tens: 10, 20, 30...", talk: "she changes the end of a fairy tale" },
  { theme: "Мои друзья / My friends", trace: ["ДРУ", "ГА", "СТО", "КРА", "БРА"], ru: "her own sentence, read aloud, and blends (дру-г, кра-сный, сто-л)", en: "her own sentence in English", num: "a review game with everything so far", talk: "she tells a short story of her own" },
];
const classLabel = (unit: number): string => {
  const u = UNITS[unit % UNITS.length];
  return `Unit ${(unit % UNITS.length) + 1} · ${u.theme} · Russian: ${u.ru} · English: ${u.en} · Numbers: ${u.num}`;
};
const classSteps = (u: typeof UNITS[number]): string[] => [
  `CLASS HELLO: both heroes say hello in 1-2 short lines and announce today's class in one happy line: "${u.theme}".`,
  `READING CORNER (Mishka, slow and clear): today's Russian reading is ${u.ru}. She is a BEGINNING reader: show at most 3 ` +
    "letters or syllables, big and alone on ONE short line (\"МА  МО  МУ\"); Mishka says each SOUND slowly, she says it after " +
    "him, then she tries to read ONE by herself; Lisa reads one WRONG on purpose so she catches her; then she TRACES one " +
    `letter with her finger in the air. English sounds today: ${u.en} (one or two, said aloud).`,
  `WORDS OF THE CLASS (${u.theme}): Mishka teaches ONE useful sentence the classic way (Russian / English); Lisa offers a ` +
    "funnier version; let her choose and say it (\"Какая тебе больше нравится? / Which one do you like more?\").",
  `NUMBERS CORNER: ${u.num} - with real things from today's theme or her life (honey pots, cones, toys); one small question.`,
  `STORY AND TALK: ${u.talk}. Mishka listens slowly; Lisa adds one surprise idea.`,
  "CALM AND GOODBYE (Mishka): three slow breaths, one feelings sentence, real praise for one thing she did in this class, " +
    "a star, and a small MISSION for real life about today's class. Goodbye from both.",
];

// Forest stories, one per week. Facts are plain and well established.
const STORIES = [
  "Lisa lost her favourite blue ribbon in the birch wood and feels sad; the child helps her look (up, down, behind, under). Fact: birch trees (берёзы) have white bark with black marks.",
  "Mishka is sleepy because winter is coming and feels a little worried; the child helps him get his den ready. Fact: brown bears sleep through the winter in a den (берлога).",
  "A hedgehog feels shy and rolls into a ball; the child tells him why he is wonderful. Fact: a hedgehog (ёжик) rolls into a prickly ball to stay safe.",
  "A squirrel forgot where she hid her nuts and feels upset; the child helps by counting and remembering. Fact: squirrels (белки) hide nuts and cones for the winter.",
  "Lisa hears a tiny mouse under the snow and feels excited; the child helps her listen quietly. Fact: foxes can hear small animals moving under the snow.",
  "Kolobok rolls away from home and feels scared in the forest; the child helps him find the way back. Fact: Колобок is a classic Russian fairy tale about a round bun.",
  "Grandpa cannot pull out the giant turnip and feels tired; the child helps everyone pull together. Fact: Репка is a classic Russian fairy tale where everyone pulls together.",
];
const BREAKS = [
  "the cross-crawl: right hand to left knee, left hand to right knee, 10 times, counting in Russian (раз, два, три...)",
  "'Лиса говорит / Simon says': 3 quick commands (\"Лиса говорит: потрогай нос\", \"...прыгни два раза\", \"...похлопай\")",
  "the heron: stand on one foot and count to 10 in Russian, then the other foot",
  "красный - прыгай, синий - замри: on \"красный\" she jumps, on \"синий\" she freezes like a statue",
];
const CALMS = [
  "slow breathing with counts: in through the nose while Mishka counts \"раз, два, три\", out slowly \"четыре, пять, шесть\", three times",
  "warm paws: rub the hands together until they are warm, rest them softly on the cheeks and close the eyes for three breaths",
  "statue to jelly: squeeze the whole body tight while Mishka counts to three, then go soft and floppy like jelly",
];

const QUESTION = /\?|почему|зачем|как |что такое|где |кто |сколько|why|what|how|where|who|qué|por qué|cómo|dónde/i;
const BYE = /пока[-, ]*пока|до свидания|я устал|хочу закончить|stop|bye|adiós|ya no quiero/i;
const QUIET = /тише|помолчи|не говори|be quiet|too much talk|cállate|silencio/i;
const EMERGENCY = /пожар|скорая|больно|кровь|emergency|fire|ambulance|blood|emergencia|sangre/i;

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}

type Memory = { card: string; unit: number; greeted: boolean };
/** Earlier Russian lessons: her own words, the last mission, today's class unit (two classes per unit). */
async function memoryOf(sb: any, userId: string, nowSaid: Set<string>): Promise<Memory> {
  const { data } = await sb.from('learning_sessions').select('content, created_at').eq('user_id', userId)
    .eq('session_type', 'classroom_ru').order('created_at', { ascending: false }).limit(300);
  const rows = Array.isArray(data) ? data : [];
  const classStarts = rows.filter((r: any) => r.content?.class_start === 'true').length;
  const greeted = rows.some((r: any) => r.content?.turn === 0 && Date.now() - Date.parse(r.created_at) < 20 * 3600000);
  const said: string[] = [];
  let mission = '';
  for (const r of rows) {
    const words = String(r.content?.user_message ?? '').trim();
    if (!mission && typeof r.content?.mission === 'string' && r.content.mission) mission = r.content.mission;
    if (!words || words.startsWith('(') || nowSaid.has(words) || EMERGENCY.test(words)) continue;
    if (said.length < 10 && !said.includes(words.slice(0, 120))) said.push(words.slice(0, 120));
  }
  if (!said.length && !mission) return { card: '', unit: Math.floor(classStarts / 2), greeted };
  const card = '\n\nWHAT THE CHILD TOLD YOU IN EARLIER LESSONS (her own words, newest first; speech-to-text may be imperfect):\n' +
    said.map((s) => `- "${s}"`).join('\n') +
    (mission && !greeted ? `\nLast mission you gave: "${mission}" - at the hello, ask if she did it.` : '') +
    (greeted ? '\nSHE IS BACK TODAY: welcome her back in ONE short new line, no "last time you told me", no mission question.'
      : '\nAt the hello bring back ONE happy, clearly understood thing taken ONLY from this list.') +
    '\nLater in the lesson, use what she told you instead of asking again. Never bring back anything sad, never invent a memory.';
  return { card, unit: Math.floor(classStarts / 2), greeted };
}

function turnContext(message: string, turn: number, mode: string, unit: number, child: string): string {
  if (EMERGENCY.test(message)) {
    return `\n\nSOMEONE SAID THERE IS AN EMERGENCY. THIS TURN OVERRIDES EVERY RULE: no lesson, no game, no question. Exactly two calm lines: ` +
      `Mishka: "Будь рядом с мамой и делай, что она говорит. / Stay close to your mom and do what she says." Lisa: "Мы ждём тебя здесь. / We will be here when you come back."`;
  }
  if (turn > 0 && BYE.test(message)) return "\n\nTHE FAMILY WANTS TO STOP NOW. THIS TURN OVERRIDES EVERY RULE: two short warm goodbye lines, one from each hero, no question.";
  if (QUIET.test(message)) return "\n\nSHE ASKED YOU TO TALK LESS. THIS TURN OVERRIDES EVERY RULE: exactly ONE short line from Mishka: \"Хорошо, теперь я тебя слушаю. / Okay, now I am listening to you.\"";
  const steps = mode === 'class' ? classSteps(UNITS[unit % UNITS.length]) : STEPS;
  const step = turn < steps.length ? steps[turn] : STEP_FREE;
  const story = STORIES[isoWeek(new Date()) % STORIES.length];
  const heard = turn > 0 ? `\n\nTHE CHILD (${child}) JUST SAID (speech-to-text, may be imperfect): "${message.slice(0, 300)}". Your FIRST line answers it.` + PRAISE_RULE : '';
  const out = [heard];
  if (turn > 0 && QUESTION.test(message)) {
    out.push(`THIS TURN: she ASKED A QUESTION. ANSWER IT FIRST, truly and simply (one real fact; never invent). Stay on her topic; no game or new step this turn. (Next turn: ${step})`);
  } else {
    out.push(`THEN, this turn's lesson step (turn ${turn + 1} of ${steps.length}), built on what she just said - her idea always wins over the plan: ${step}`);
  }
  if (mode !== 'class' && (turn === 0 || step.startsWith("THIS WEEK'S STORY"))) out.push(`THIS WEEK'S STORY (one line at the hello; the whole story only on its own step): ${story}`);
  // Pere & Titi's neuro rhythm (3 Nov 2026): every 4th turn the lively hero leads a 20-second brain break, the next turn the calm one.
  if (turn > 0 && turn % 4 === 0) {
    out.push(`BRAIN BREAK NOW (Lisa leads, about 20 seconds, then back to the lesson): ${BREAKS[(turn / 4) % BREAKS.length]}. ` +
      "Three short beats: Lisa frames it with energy (\"Пауза-разминка, 20 секунд! / Energy break, 20 seconds!\"); the movement, counting with her in Russian; one line asking how her body feels now.");
  } else if (turn > 4 && turn % 4 === 1) {
    out.push(`CALM AFTER THE BREAK (Mishka leads, slow and soft): ${CALMS[Math.floor(turn / 4) % CALMS.length]}. One line to invite it, do it with her, then continue.`);
  }
  out.push("BOTH heroes speak in this reply: at least one \"mishka\" line AND one \"lisa\" line (Lisa is the playful one - let her ask the closing question or make it a little game).");
  return out.join('\n');
}

const FORMAT = `

ANSWER FORMAT - strictly JSON, nothing else:
{"lines":[{"who":"mishka","ru":"Russian sentence","en":"the same in English"},{"who":"lisa","ru":"...","en":"..."}],"said_ru":["Russian words the child herself said in her last message"],"new_words":["new Russian words of this reply"],"mission":"only at the goodbye: the mission in Russian / English, else empty"}
1-3 lines per reply. "who" is only "mishka" or "lisa".`;

async function gemini(key: string, model: string, system: string, messages: any[]): Promise<string> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 1500, temperature: 0.7, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error(`gemini ${model} ${r.status}`);
  const j = await r.json();
  const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('');
  if (!text) throw new Error(`gemini ${model} empty`);
  return text;
}

async function groq(key: string, model: string, system: string, messages: any[]): Promise<string> {
  const extra = model.startsWith('openai/gpt-oss') ? { max_tokens: 2500, reasoning_effort: 'low' } : { max_tokens: 1200 };
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, ...extra, temperature: 0.7, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, ...messages] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`groq ${model} ${r.status}`);
  const text = (await r.json()).choices?.[0]?.message?.content;
  if (!text) throw new Error(`groq ${model} empty`);
  return text;
}

/** Only well-formed bilingual lines from the two heroes survive; anything else counts as a failed provider. */
export function parseLesson(raw: string) {
  const s = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  const j = JSON.parse(s);
  const lines = (Array.isArray(j.lines) ? j.lines : [])
    .filter((l: any) => (l?.who === 'mishka' || l?.who === 'lisa') && typeof l.ru === 'string' && l.ru.trim())
    .slice(0, 3).map((l: any) => ({ who: l.who, ru: String(l.ru).trim().slice(0, 300), en: typeof l.en === 'string' ? l.en.trim().slice(0, 300) : '' }));
  if (!lines.length) throw new Error('no hero lines');
  if (lines.some((l: any) => !l.en)) throw new Error('a line without English');
  const words = (a: unknown) => (Array.isArray(a) ? a : []).filter((w) => typeof w === 'string').map((w) => w.slice(0, 40)).slice(0, 10);
  const mission = typeof j.mission === 'string' ? j.mission.trim().slice(0, 200) : '';
  return { lines, said_ru: words(j.said_ru), new_words: words(j.new_words), mission };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: 'sign in' }, 401);

    // Same access rule as every paid feature: active trial or subscription (checked on the server, not only the page).
    const { data: st } = await sb.rpc('get_user_subscription_status', { user_uuid: user.id });
    const s = Array.isArray(st) ? st[0] : st;
    if (!s?.is_trial_active && !s?.is_subscription_active) return json({ error: 'no access' }, 402);

    const body = await req.json().catch(() => ({}));
    const history = (Array.isArray(body.history) ? body.history : [])
      .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
      .slice(-16).map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 800) }));
    if (!history.length || history[history.length - 1].role !== 'user') history.push({ role: 'user', content: '(урок начинается)' });
    const message = history[history.length - 1].content;
    const turn = Number.isInteger(body.turn) && body.turn >= 0 ? body.turn : Math.floor(history.length / 2);
    const mode = body.mode === 'class' ? 'class' : 'talk';

    const { data: fam } = await sb.from('family_members').select('name, role, age').eq('user_id', user.id).eq('is_active', true);
    const kids = (fam ?? []).filter((m: any) => m.role === 'child');
    const pick = kids.find((k: any) => k.name === body.childName) ?? kids[0];
    const child = pick?.name || body.childName || 'друг';
    const age = pick?.age ? `${pick.age}` : '6 to 7';
    const family = (fam ?? []).length ? `Family: ${(fam ?? []).map((m: any) => `${m.name} (${m.role})`).join(', ')}.` : '';

    const mem = await memoryOf(sb, user.id, new Set(history.filter((m: any) => m.role === 'user').map((m: any) => m.content.trim())));
    const unit = mem.unit;
    const system = BASE_PROMPT(child, age, family) + (turn === 0 || turn < 3 ? mem.card : '') +
      turnContext(message, turn, mode, unit, child) + FORMAT;

    const gKey = Deno.env.get('GEMINI_TTS_API_KEY');
    const qKey = Deno.env.get('GROQ_API_KEY');
    const steps: [string, () => Promise<string>][] = [];
    if (gKey) steps.push([GEMINI_LITE, () => gemini(gKey, GEMINI_LITE, system, history)], [GEMINI_FLASH, () => gemini(gKey, GEMINI_FLASH, system, history)]);
    if (qKey) for (const m of GROQ_MODELS) steps.push([m, () => groq(qKey, m, system, history)]);

    for (const [name, run] of steps) {
      try {
        const out = parseLesson(await run());
        console.log(`[kids-ru] model=${name} mode=${mode} turn=${turn} unit=${unit + 1} lines=${out.lines.length} said_ru=${out.said_ru.length}`);
        // Saved like a Pere & Titi turn, under its own type: the memory and the parent report read it back.
        const reply = out.lines.map((l: any) => `${l.who === 'mishka' ? 'Мишка' : 'Лиса'}: ${l.ru} / ${l.en}`).join('\n');
        const { error: saveErr } = await sb.from('learning_sessions').insert({
          user_id: user.id, session_type: 'classroom_ru', source: 'web',
          content: { user_message: turn === 0 ? '' : message.slice(0, 500), ai_response: reply, turn, mode,
            said_ru: out.said_ru, new_words: out.new_words, mission: out.mission,
            ...(mode === 'class' ? { class_unit: unit + 1, class_label: classLabel(unit), ...(turn === 0 ? { class_start: 'true' } : {}) } : {}) },
        });
        if (saveErr) console.error(`[kids-ru] save failed: ${saveErr.message}`);
        return json({ ...out, model: name, mode, unit: unit + 1, unitTheme: UNITS[unit % UNITS.length].theme,
          trace: mode === 'class' ? UNITS[unit % UNITS.length].trace : [] });
      } catch (e) {
        console.error(`[kids-ru] ${name} failed: ${String(e).slice(0, 160)}`);
      }
    }
    return json({ error: 'all free models busy' }, 503);
  } catch (e) {
    console.error('[kids-ru] error', String(e).slice(0, 200));
    return json({ error: 'server' }, 500);
  }
});
