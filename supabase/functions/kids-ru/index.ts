// Мишка Медок & Лиса Алиса - the Russian classroom (11 Nov 2026, Elena: "a classroom for Russian, in parallel").
// SEPARATE from Pere & Titi on purpose: this function shares no code with espaluz-chat (its KIDS_* prompts are not
// touched). Plan: cto-aipa docs/espaluz/RUSSIAN_CLASSROOM_PLAN_2026-11-11.md.
// Who it is for: a child aged 6-8 raised in a Spanish-speaking country who UNDERSTANDS Russian but does not speak it
// (receptive bilingualism). The whole method is: get her to SAY Russian out loud, a little every day.
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

function lessonPrompt(child: { name: string; age: number | null }, family: string[]): string {
  return `Ты голос двух друзей из русского леса, которые учат ребёнка ${child.age ? `${child.age} лет` : '6-8 лет'} ГОВОРИТЬ по-русски.
Мишка Медок - спокойный бурый медвежонок, говорит медленно, ласково, терпеливо.
Лиса Алиса - весёлая рыжая лисичка, быстрая, любопытная, любит игры и смех.
Ребёнок: ${child.name}. ${family.length ? `Семья: ${family.join(', ')}.` : ''}
Ребёнок живёт в испаноязычной стране. Русский язык он ПОНИМАЕТ, но почти не говорит. Твоя единственная цель - чтобы ребёнок
сам сказал по-русски хотя бы несколько слов в каждом ответе.

ПРАВИЛА:
- Говори только по-русски: короткие простые предложения (5-8 слов), понятные ребёнку 6-8 лет. Никакого сюсюканья.
- КАЖДАЯ реплика заканчивается одной простой просьбой СКАЗАТЬ что-то: назвать предмет, ответить "что это?",
  закончить фразу Мишки ("Утром я ем..."), повторить новое слово, рассказать одно предложение о своём дне.
- Если ребёнок ответил по-испански или по-английски - не говори "неправильно". Лиса Алиса весело даёт русский вариант
  и просит повторить: "По-русски это - яблоко! Скажешь: яблоко?"
- Если ребёнок сказал по-русски - похвали точно ("ты сказал целое предложение!"), не повторяй одну похвалу дважды.
- Если ребёнок явно не понял - одно короткое пояснение по-испански в скобках, потом снова по-русски.
- Темы: его настоящая жизнь (семья, школа, игры, еда, погода вокруг), русские сказки (Колобок, Теремок, Репка),
  времена года в русском лесу, звери, считалки. Одна тема за раз.
- Лиса Алиса всегда называет себя полным именем "Лиса Алиса". Ребёнка называй только его именем: ${child.name}.
- Никогда не выдумывай факты о семье ребёнка.

ФОРМАТ - строго JSON без пояснений:
{"lines":[{"who":"mishka","ru":"..."},{"who":"lisa","ru":"..."}],"said_ru":["слова, которые ребёнок сам сказал по-русски в последней реплике"],"new_words":["новые слова этой реплики"]}
1-3 строки за ход. "who" только "mishka" или "lisa".`;
}

async function gemini(key: string, model: string, system: string, messages: any[]): Promise<string> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 1200, temperature: 0.7, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`gemini ${model} ${r.status}`);
  const j = await r.json();
  const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('');
  if (!text) throw new Error(`gemini ${model} empty`);
  return text;
}

async function groq(key: string, model: string, system: string, messages: any[]): Promise<string> {
  const extra = model.startsWith('openai/gpt-oss') ? { max_tokens: 2000, reasoning_effort: 'low' } : { max_tokens: 1000 };
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

/** Only well-formed lines from the two heroes survive; anything else counts as a failed provider. */
export function parseLesson(raw: string) {
  const s = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  const j = JSON.parse(s);
  const lines = (Array.isArray(j.lines) ? j.lines : [])
    .filter((l: any) => (l?.who === 'mishka' || l?.who === 'lisa') && typeof l.ru === 'string' && l.ru.trim())
    .slice(0, 3).map((l: any) => ({ who: l.who, ru: String(l.ru).trim().slice(0, 300) }));
  if (!lines.length) throw new Error('no hero lines');
  const words = (a: unknown) => (Array.isArray(a) ? a : []).filter((w) => typeof w === 'string').map((w) => w.slice(0, 40)).slice(0, 10);
  return { lines, said_ru: words(j.said_ru), new_words: words(j.new_words) };
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

    const { data: fam } = await sb.from('family_members').select('name, role, age').eq('user_id', user.id).eq('is_active', true);
    const kids = (fam ?? []).filter((m: any) => m.role === 'child');
    const pick = kids.find((k: any) => k.name === body.childName) ?? kids[0];
    const child = { name: pick?.name || body.childName || 'друг', age: pick?.age ?? null };
    const system = lessonPrompt(child, (fam ?? []).map((m: any) => `${m.name} (${m.role})`));

    const gKey = Deno.env.get('GEMINI_TTS_API_KEY');
    const qKey = Deno.env.get('GROQ_API_KEY');
    const steps: [string, () => Promise<string>][] = [];
    if (gKey) steps.push([GEMINI_LITE, () => gemini(gKey, GEMINI_LITE, system, history)], [GEMINI_FLASH, () => gemini(gKey, GEMINI_FLASH, system, history)]);
    if (qKey) for (const m of GROQ_MODELS) steps.push([m, () => groq(qKey, m, system, history)]);

    for (const [name, run] of steps) {
      try {
        const out = parseLesson(await run());
        console.log(`[kids-ru] model=${name} lines=${out.lines.length} said_ru=${out.said_ru.length}`);
        return json({ ...out, model: name });
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
