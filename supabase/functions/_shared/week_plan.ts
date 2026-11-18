// 18 Nov 2026 - "Your plan this week" (Elena: "go plan step 1 - surgical, additive, no new engines").
// Source of truth: cto-aipa docs/espaluz/USER_CATEGORIES_2026-11-18.md (Table 1) + WEEKLY_PLAN_RESEARCH_2026-11-18.md (Table 2).
// READ-ONLY over what the brain already saves (learning_sessions, family_members, the family profile): nothing is written
// here and nothing new is generated. A step is ticked ONLY by real activity this week (Monday 00:00 Panamá time onwards):
//   - phrases EspaLuz taught on any channel (conversation / dashboard_chat rows - the same phrase finder as everywhere),
//   - a face-to-face rehearsal (event practice_session; lang 'en' = an English rehearsal),
//   - the child's class days (classroom + classroom_ru turns by the child, 3+ on a day),
//   - a finished lesson (event lesson_done, written by the lesson page next to its old save),
//   - a family note (event family_fact) when there is no child yet.
// Table 1: every family whose first language is not English gets an ENGLISH step every week; native Spanish speakers
// settling in get the English path as their main track. ONE reader for the web (espaluz-chat weekPlan) and both bots
// (kids-memory plan_get -> /plan), so the plan can never differ between channels.
import { phrasesIn } from './phrases.ts';

export type PlanStep = { key: string; done: boolean; count?: number; target?: number; topic?: string; scene?: string };
export type WeekPlan = { weekStart: string; track: 'spanish' | 'english'; englishStep: boolean; steps: PlanStep[];
  moments: { kind: string; text: string }[]; week: number };

const DAY = 86400000;
const panamaDay = (ms: number) => new Date(ms - 5 * 3600000).toISOString().slice(0, 10);
// Twin of settles() in espaluz-chat and _settles() in both bots.
const settles = (p: Record<string, any>) => /already speak spanish|ya hablo espa[nñ]ol|уже говорю по-испански/i.test(String(p.learn ?? ''))
  || /^(spanish|espa[nñ]ol|castellano|испанский)$/i.test(String(p.native_language ?? '').trim());
const STARTER = /quiero empezar la clase|i want to start the class/i;
const EN_WORDS = /\b(the|and|you|is|are|with|for|this|that|what|how|can|my|have|i'm|we)\b/gi;
// The 4-week English path (Table 2: Carlos - a structured work-English course), chosen by the family's English goal.
const ENGLISH_PATHS: [RegExp, string[]][] = [
  [/conversation|conversaci|разговор|fluent|fluid/i, ['Small talk that keeps going', 'Asking and giving opinions', 'Telling a story about your week', 'Making plans with people']],
  [/child|niñ|hij|дет/i, ['Morning routine and getting ready', 'Homework help', 'Play and praise', 'Bedtime and feelings']],
  [/./, ['Tell me about yourself', 'Professional emails', 'Meetings: agree, disagree, sum up', 'Calls and the interview']],
];

export function weekStartMs(now = Date.now()): number {
  const p = new Date(now - 5 * 3600000);           // Panamá clock (UTC-5, no DST)
  const dow = (p.getUTCDay() + 6) % 7;              // Monday = 0
  return Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate() - dow) + 5 * 3600000;
}

export async function weekPlan(db: any, userId: string, uiLang = 'en'): Promise<WeekPlan> {
  const start = weekStartMs();
  const since = new Date(start).toISOString();
  const [{ data: prof }, { data: kids }, { data: rows }] = await Promise.all([
    db.from('learning_sessions').select('content').eq('user_id', userId).eq('session_type', 'analytics')
      .eq('content->>event', 'family_profile').order('created_at', { ascending: false }).limit(1),
    db.from('family_members').select('name, role').eq('user_id', userId).eq('is_active', true).eq('role', 'child'),
    db.from('learning_sessions').select('created_at, session_type, source, content').eq('user_id', userId).gte('created_at', since)
      .in('session_type', ['conversation', 'dashboard_chat', 'classroom', 'classroom_ru', 'analytics'])
      .order('created_at', { ascending: true }).limit(1000),
  ]);
  const p = (prof?.[0]?.content ?? {}) as Record<string, any>;
  const all = (rows ?? []) as any[];
  const native = String(p.native_language ?? '').trim();
  const settling = settles(p);
  const englishNative = /^(english|ingl[eé]s|английский)$/i.test(native) || (!native && uiLang === 'en');
  const englishStep = settling || !englishNative;
  // phrases this week, any channel (the brain's own finder)
  const phrases: string[] = [];
  for (const r of all) {
    if (r.session_type !== 'conversation' && r.session_type !== 'dashboard_chat') continue;
    const c = r.content ?? {};
    const found = Array.isArray(c.phrases) ? c.phrases.filter((x: any) => x?.es).map((x: any) => String(x.es))
      : phrasesIn(String(c.ai_response ?? c.bot_response ?? '')).map((x) => x.es);
    for (const f of found) if (!phrases.includes(f)) phrases.push(f);
  }
  const events = (name: string) => all.filter((r) => r.session_type === 'analytics' && r.content?.event === name);
  const practice = events('practice_session');
  const practiceEn = practice.filter((r) => r.content?.lang === 'en');
  const lessons = events('lesson_done');
  const notes = events('family_fact');
  // class days this week: 3+ child turns on a Panamá day (Pere & Titi or Мишка & Лиса)
  const perDay = new Map<string, number>();
  const childSaid: string[] = [];
  for (const r of all) {
    if (r.session_type !== 'classroom' && r.session_type !== 'classroom_ru') continue;
    const said = String(r.content?.user_message ?? '').trim();
    if (!said || STARTER.test(said) || r.content?.speaker === 'parent') continue;
    const d = panamaDay(Date.parse(r.created_at));
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
    if (said.split(/\s+/).length >= 3 && !/^(📷|✏️|🎨)/.test(said)) childSaid.push(said);
  }
  const classDays = [...perDay.values()].filter((n) => n >= 3).length;
  // an English message in the web chat this week (bots keep no message text - the rehearsal in English counts too)
  const wroteEnglish = all.some((r) => r.session_type === 'dashboard_chat' && (String(r.content?.user_message ?? '').match(EN_WORDS) ?? []).length >= 3);
  const isoWeek = Math.floor((start / DAY + 3) / 7);
  const goals = ([] as string[]).concat(p.english_goal ?? []).join(' ');
  const path = (ENGLISH_PATHS.find(([re]) => re.test(goals || 'work')) ?? ENGLISH_PATHS[2])[1];
  const week = (isoWeek % 4) + 1;
  const topic = path[week - 1];
  const coming = String(notes.map((r) => r.content?.fact).find((f: string) => /meeting|reuni|cita|appointment|interview|entrevista|school|escuela/i.test(String(f ?? ''))) ?? '');

  const steps: PlanStep[] = [];
  if (settling) {
    steps.push({ key: 'english_week', done: phrases.length >= 2 || wroteEnglish, count: phrases.length, target: 2, topic });
    steps.push({ key: 'rehearse_en', done: practiceEn.length > 0, topic });
  } else {
    steps.push({ key: 'spanish_moment', done: phrases.length >= 2, count: phrases.length, target: 2 });
    if (englishStep) steps.push({ key: 'english_step', done: wroteEnglish || practiceEn.length > 0, topic });
    else steps.push({ key: 'rehearse', done: practice.length > 0, scene: coming });
  }
  if (kids?.length) steps.push({ key: 'child_class', done: classDays >= 2, count: classDays, target: 2 });
  else steps.push({ key: 'family_note', done: notes.length > 0 });
  steps.push({ key: 'belong', done: lessons.length > 0 });

  const moments: { kind: string; text: string }[] = [];
  for (const r of practice.slice(-1)) moments.push({ kind: 'rehearsed', text: String(r.content?.scene ?? '').slice(0, 90) });
  for (const ph of phrases.slice(0, 2)) moments.push({ kind: 'phrase', text: ph.slice(0, 80) });
  if (childSaid.length) moments.push({ kind: 'child', text: childSaid[childSaid.length - 1].slice(0, 90) });
  for (const r of lessons.slice(-1)) moments.push({ kind: 'lesson', text: String(r.content?.title ?? '').slice(0, 80) });

  return { weekStart: panamaDay(start), track: settling ? 'english' : 'spanish', englishStep, steps, moments: moments.slice(0, 4), week };
}

// The bots' text (WhatsApp, Telegram): bilingual Spanish / English, as every EspaLuz message.
const LABEL: Record<string, [string, string]> = {
  english_week: ['Inglés de la semana', 'English of the week'],
  rehearse_en: ['Ensaya en inglés (web: Preparación cara a cara)', 'Rehearse in English (web: Face-to-face prep)'],
  spanish_moment: ['Español para un momento real (2 frases nuevas)', 'Spanish for a real moment (2 new phrases)'],
  english_step: ['Paso de inglés: escríbeme en inglés o ensaya en inglés', 'English step: write to me in English or rehearse in English'],
  rehearse: ['Ensaya un momento que viene (web: Preparación cara a cara)', 'Rehearse a coming moment (web: Face-to-face prep)'],
  child_class: ['Clase de tu hijo/a: 2 días', "Your child's class: 2 days"],
  family_note: ['Cuéntame algo nuevo de tu familia', 'Tell me one new thing about your family'],
  belong: ['Una lección de tu país (web)', 'One lesson about your country (web)'],
};
export function weekPlanText(plan: WeekPlan): string {
  const done = plan.steps.filter((s) => s.done).length;
  const lines = plan.steps.map((s) => {
    const [es, en] = LABEL[s.key] ?? [s.key, s.key];
    const extra = s.topic ? ` - "${s.topic}"` : s.target ? ` (${s.count ?? 0}/${s.target})` : '';
    return `${s.done ? '✅' : '⬜'} ${es}${extra} / ${en}`;
  });
  const moments = plan.moments.length ? `\n\nEsta semana lograste / This week you handled:\n${plan.moments.map((m) => `• ${m.text}`).join('\n')}` : '';
  return `🗓 Tu plan esta semana / Your plan this week (${done}/${plan.steps.length} ✓)` +
    (plan.track === 'english' ? `\nSemana ${plan.week} de 4 / Week ${plan.week} of 4` : '') + `\n\n${lines.join('\n')}${moments}` +
    `\n\nTodo el plan en / The whole plan at app.espaluz.lat`;
}
