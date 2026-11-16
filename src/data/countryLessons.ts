import type { Lesson, Exercise } from './spanishLessons';
import { localizePack, type Pack as FullPack } from './packI18n';

/*
 * 15 Nov 2026 (Elena: the lessons must "serve the goals, not generic simulations"): "Living in <country>" lessons,
 * built ONLY from the family's checked country guide (supabase/functions/_shared/belonging/<country>.json - the same
 * file the chat and both bots use). No new content is written here: each lesson is one guide section, each card one
 * checked item with its sources; a Spanish phrase is shown only when the guide has it. Exercises exist only where the
 * guide pairs a Spanish line with its meaning ("Ahorita voy. = I'll come in a while."), and the wrong options are the
 * real meanings of OTHER checked phrases - nothing invented. They open in the existing lesson page (/learning/<id>) and
 * save progress in the same table (user_module_progress) as the original five lessons, which stay.
 */

type Item = { id: string; text: string; es?: string; status?: string };
type Pack = { country: string; name: string; sections: Record<string, Item[]> };

const PACKS = import.meta.glob('../../supabase/functions/_shared/belonging/*.json');

// Which guide section is which level, and its title. Beginner = first weeks; advanced = belonging.
const SECTIONS: { key: string; level: Lesson['difficulty']; title: string; about: string }[] = [
  { key: 'greetings_and_courtesy', level: 'beginner', title: 'Greetings and courtesy', about: 'How people greet, thank and address each other - the first thing every newcomer meets.' },
  { key: 'everyday_life', level: 'beginner', title: 'Everyday life', about: 'Shops, directions, errands and the small rules of daily life.' },
  { key: 'food_and_table', level: 'beginner', title: 'Food and the table', about: 'What is on the table, and how meals and invitations work.' },
  { key: 'time', level: 'intermediate', title: 'Time, the local way', about: 'What "ahora" and "ahorita" really mean, and office time versus social time.' },
  { key: 'family_and_friends', level: 'intermediate', title: 'Family and friends', about: 'How families gather, how friendships start, what an invitation means.' },
  { key: 'local_expressions', level: 'intermediate', title: 'Local expressions', about: 'The words you will hear on the street - and when (not) to use them.' },
  { key: 'school_life', level: 'intermediate', title: 'School life', about: 'The school year, the calendar and school customs.' },
  { key: 'rhythm_of_the_year', level: 'advanced', title: 'The rhythm of the year', about: 'Seasons, holidays and the moments the whole country lives together.' },
  { key: 'folk_culture', level: 'advanced', title: 'Folk culture', about: 'Dances, dress, music and traditions families are proud of.' },
  { key: 'newcomers_find_hard', level: 'advanced', title: 'What newcomers find hard', about: 'The quiet misunderstandings - knowing them is half of belonging.' },
];

const SPANISHY = /[¿¡áéíóúñ]|\b(el|la|los|las|que|de|en|por|para|es|está|voy|buenos|buenas|gracias|mi|una?)\b/i;
// The Spanish line of an item: its "es" field, or a quoted Spanish phrase inside the checked text.
function spanishOf(it: Item): { es: string; meaning: string } {
  const raw = String(it.es ?? '').trim();
  if (raw) {
    const m = raw.match(/^(.+?)\s+=\s+(.+)$/);
    // Only a clean single pair counts as a meaning (e.g. "Ahorita voy. = I'll come in a while."); a line that packs
    // several pairs ("verano = ... · invierno = ...") stays a card, never a quiz option.
    const clean = m && !/[=·]/.test(m[2]) && !/[¿¡áéíóúñ]/i.test(m[2]);
    return clean ? { es: m[1].trim(), meaning: m[2].trim() } : { es: raw, meaning: '' };
  }
  const q = String(it.text).match(/'([^']{2,60})'/);
  return q && SPANISHY.test(q[1]) ? { es: q[1], meaning: '' } : { es: '', meaning: '' };
}

// `shown` = the same guide in the family's language (belonging/i18n, via localizePack). Matching, the Spanish lines and
// the quiz answers come from the checked English guide; only the explanatory text a card shows is taken from `shown`.
export function lessonsFromPack(pack: Pack, shown: Pack = pack): Lesson[] {
  const textOf = (sec: string, it: Item) => shown.sections[sec]?.find((x) => x.id === it.id)?.text ?? it.text;
  const out: Lesson[] = [];
  const pairs: { es: string; meaning: string }[] = [];
  for (const s of SECTIONS) for (const it of pack.sections[s.key] ?? []) {
    if (it.status !== 'checked') continue;
    const p = spanishOf(it); if (p.es && p.meaning) pairs.push(p);
  }
  for (const s of SECTIONS) {
    const items = (pack.sections[s.key] ?? []).filter((it) => it.status === 'checked');
    if (items.length < 2) continue;
    const cards = items.map((it) => ({ ...spanishOf(it), text: textOf(s.key, it) }));
    const mine = cards.filter((c) => c.es && c.meaning);
    const exercises: Exercise[] = mine.map((c, i) => {
      const others = pairs.filter((p) => p.meaning !== c.meaning).map((p) => p.meaning);
      const pick = [others[(i * 3) % Math.max(1, others.length)], others[(i * 3 + 1) % Math.max(1, others.length)]].filter(Boolean);
      const options = [...new Set([c.meaning, ...pick])].sort((a, b) => a.localeCompare(b));
      return { id: `${s.key}-${i}`, type: 'multiple_choice' as const, question: `What does "${c.es}" mean?`, options,
        correctAnswer: c.meaning, explanation: c.text };
    }).filter((e) => (e.options?.length ?? 0) >= 2);
    out.push({
      id: `country-${pack.country}-${s.key}`,
      title: `${s.title} in ${pack.name}`,
      description: s.about,
      difficulty: s.level,
      category: 'culture',
      estimatedMinutes: Math.max(5, items.length * 2),
      vocabulary: [...new Set(cards.map((c) => c.es).filter(Boolean))].slice(0, 10),
      phrases: cards.map((c) => ({ spanish: c.es, english: c.meaning ? `${c.meaning} - ${c.text}` : c.text, pronunciation: '' })),
      exercises,
    });
  }
  return out;
}

export async function loadCountryPack(country: string): Promise<Pack | null> {
  const key = Object.keys(PACKS).find((k) => k.endsWith(`/${country}.json`));
  if (!key) return null;
  const mod = (await PACKS[key]()) as { default?: Pack } & Pack;
  return (mod.default ?? mod) as Pack;
}

export async function loadCountryLessons(country: string, lng?: string): Promise<Lesson[]> {
  const pack = await loadCountryPack(country);
  if (!pack) return [];
  const shown = (await localizePack(pack as FullPack, lng).catch(() => pack)) as Pack;
  return lessonsFromPack(pack, shown);
}

// "country-<country>-<section>" -> that lesson (the lesson page opens it by id).
export async function loadCountryLesson(id: string, lng?: string): Promise<Lesson | undefined> {
  const m = id.match(/^country-([a-z_]+?)-(greetings_and_courtesy|everyday_life|food_and_table|time|family_and_friends|local_expressions|school_life|rhythm_of_the_year|folk_culture|newcomers_find_hard)$/);
  if (!m) return undefined;
  return (await loadCountryLessons(m[1], lng)).find((l) => l.id === id);
}
