// 5 Nov 2026 (Elena, from Alisa's 38 turns that day: "this duplicated repetition over and over, it irritates"; 22 of 38 replies
// said "Entiendo que...", and the class number ran through all 12 units in 5 days). Pure functions, no imports, so they can
// be tested on her real sentences outside the function. Review: cto-aipa docs/espaluz/CLASSROOM_LOG_REVIEW_2026-11-05.md

const words = (s: string): string[] =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zñ]+/g) ?? [];

const capital = (s: string): string => s.replace(/^([¡¿"“«\s]*)(\p{L})/u, (_m, a, b) => a + b.toUpperCase());

// "Alisa, entiendo que ..." / "Entiendo que tú ..." and the English twin. Only at the start of a sentence side.
const OPENER_ES = /^(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+,\s*)?(?:ya\s+|sí,?\s+)?entiendo(?:\s+que(?:\s+tú)?)?[\s,:]+/i;
const OPENER_EN = /^(?:[A-Z][a-z]+,\s*)?(?:I\s+understand|I\s+see)(?:\s+that)?[\s,:]+/i;
const HERO = /^((?:Pere|Titi)\s*\[[^\]]*\]:?\s*)/;

/** Takes the "Entiendo que" habit off a line and keeps the rest of the sentence. */
export function kidsStripOpener(line: string): string {
  const hero = (line.match(HERO) ?? ['', ''])[1];
  const body = line.slice(hero.length);
  const cut = body.indexOf(' / ');
  const es = cut >= 0 ? body.slice(0, cut) : body;
  const en = cut >= 0 ? body.slice(cut + 3) : '';
  if (!OPENER_ES.test(es) && !OPENER_EN.test(en)) return line;
  const newEs = capital(es.replace(OPENER_ES, ''));
  const newEn = capital(en.replace(OPENER_EN, ''));
  return hero + newEs + (cut >= 0 ? ` / ${newEn}` : '');
}

/** True when a line only says her own words back: nearly every word of it came from what she just said. */
export function kidsIsEcho(line: string, said: string): boolean {
  const body = line.replace(HERO, '');
  const es = body.includes(' / ') ? body.slice(0, body.indexOf(' / ')) : body;
  if (es.includes('?') || es.includes('¿')) return false; // a question is not an echo
  const heard = new Set(words(said));
  const mine = words(es).filter((w) => !['alisa', 'tu', 'tus', 'te', 'que', 'y', 'muy', 'ahora', 'mismo', 'bien'].includes(w));
  if (heard.size < 4 || mine.length < 3) return false; // a one-word answer said back whole is the lesson, not an echo
  return mine.filter((w) => heard.has(w)).length / mine.length >= 0.8;
}

/** The last word on a kids reply: no "Entiendo que", and a line that only repeats her goes when another line remains. */
export function kidsTidyReply(reply: string, said: string): string {
  const lines = reply.split('\n').map((l) => l.trim()).filter(Boolean).map(kidsStripOpener);
  // 5 Nov probe: with "Entiendo que" gone the model moved to "¡Qué bueno que + her words". The opening recap sentence goes too.
  const first = kidsDropRecap(lines[0] ?? '');
  const base = [first, ...lines.slice(1)].filter(Boolean);
  const start = base.length ? base : lines;
  const kept = start.filter((l) => !kidsIsEcho(l, said));
  return (kept.length ? kept : start).join('\n');
}

const RECAP_ES = /^[¡\s]*(?:qu[eé] (?:bueno|bien|lindo|bonito|genial) que|me (?:alegra|encanta|gusta) que|veo que|dices que|me cuentas que)/i;
const sentences = (s: string): string[] => s.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);

/** Removes an opening "¡Qué bueno que + what she said" sentence; '' when nothing else is left on the line. */
function kidsDropRecap(line: string): string {
  const hero = (line.match(HERO) ?? ['', ''])[1];
  const body = line.slice(hero.length);
  const cut = body.indexOf(' / ');
  const es = sentences(cut >= 0 ? body.slice(0, cut) : body);
  if (!es.length || !RECAP_ES.test(es[0])) return line;
  if (es.length === 1) return '';
  const en = sentences(cut >= 0 ? body.slice(cut + 3) : '');
  return hero + es.slice(1).join(' ') + (en.length === es.length ? ` / ${en.slice(1).join(' ')}` : '');
}

const panamaDay = (ms: number): string => new Date(ms - 5 * 3600000).toISOString().slice(0, 10);
const STARTER = /quiero empezar la clase|i want to start the class/i;

/** Finished class days: Panama days BEFORE today on which she really spoke in a class (at least 3 turns besides the start
 *  button). Pressing start, reloading or re-entering no longer moves the course, and the number never changes mid-day. */
export function kidsClassDaysDone(rows: { at: number; said: string }[], nowMs: number): number {
  const today = panamaDay(nowMs);
  // 13 Nov 2026 (Elena: "she likes just sending photos - progress must be earned"): a day counts only with 3+ messages of
  // which at least 2 are her own words or tracing (not photos) - she reached the reading corner, not just showed pictures.
  const perDay = new Map<string, { all: number; real: number }>();
  for (const r of rows) {
    const day = panamaDay(r.at);
    if (day === today || !r.said.trim() || STARTER.test(r.said)) continue;
    const d = perDay.get(day) ?? { all: 0, real: 0 };
    d.all += 1;
    if (!r.said.trim().startsWith('📷')) d.real += 1;
    perDay.set(day, d);
  }
  return [...perDay.values()].filter((d) => d.all >= 3 && d.real >= 2).length;
}

export const KIDS_RECENT_MS = 20 * 3600000;
/** She has already been greeted within the last 20 hours: the memory game and the mission question do not run again. */
export const kidsGreetedRecently = (rows: { at: number; said: string }[], nowMs: number): boolean =>
  rows.some((r) => nowMs - r.at < KIDS_RECENT_MS && STARTER.test(r.said));
