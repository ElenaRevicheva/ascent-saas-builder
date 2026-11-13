// 13 Nov 2026 - car mode step 2: "every lesson heard at home travels with you". The classroom hands each line it plays
// (text + the hero's voice it ALREADY received) to keepLine(); nothing is generated for the road, so it costs nothing.
// Everything stays on this tablet: voices in Cache Storage, the list in localStorage. Never sent anywhere.
// Elena's rule (13 Nov): nothing sticky. Only the last 6 lessons; a lesson older than 7 days or replayed 3 times on the
// road retires for good - the pack follows the family's life and changes every drive.

export type RoadLine = { text: string; who?: string; audio?: string | null };
export type RoadLesson = { id: string; at: number; title: string; lines: RoadLine[]; roadPlays: number; lang: 'es' | 'ru' };

const INDEX = 'espaluz-road-lessons';
const CACHE = 'espaluz-road-voices';
const KEEP = 6, MAX_DAYS = 7, MAX_PLAYS = 3, MAX_LINES = 40;

const read = (): RoadLesson[] => { try { return JSON.parse(localStorage.getItem(INDEX) || '[]'); } catch { return []; } };
const write = (all: RoadLesson[]) => { try { localStorage.setItem(INDEX, JSON.stringify(all)); } catch { /* storage full */ } };

async function forget(lessons: RoadLesson[]) {
  if (!lessons.length || typeof caches === 'undefined') return;
  const c = await caches.open(CACHE);
  await Promise.all(lessons.flatMap((l) => l.lines.map((x) => (x.audio ? c.delete(x.audio) : Promise.resolve(false)))));
}

/** Drops what is too old, too often replayed, or beyond the last 6. Returns what stays. */
export async function tidyRoad(): Promise<RoadLesson[]> {
  const now = Date.now();
  const all = read().sort((a, b) => b.at - a.at);
  const keep = all.filter((l) => now - l.at < MAX_DAYS * 864e5 && l.roadPlays < MAX_PLAYS && l.lines.length).slice(0, KEEP);
  await forget(all.filter((l) => !keep.includes(l)));
  write(keep);
  return keep;
}

export function roadLessons(): RoadLesson[] { return read().sort((a, b) => b.at - a.at); }

/** Called by the classroom for every line it plays. audioUrl = the blob/data URL it is about to play (or null). */
export async function keepLine(lessonId: string, lang: 'es' | 'ru', line: { text: string; who?: string }, audioUrl: string | null) {
  try {
    const text = line.text.trim();
    if (!text) return;
    const all = read();
    let l = all.find((x) => x.id === lessonId);
    if (!l) { l = { id: lessonId, at: Date.now(), title: text.slice(0, 60), lines: [], roadPlays: 0, lang }; all.push(l); }
    if (l.lines.length >= MAX_LINES || l.lines.some((x) => x.text === text)) return;
    let audio: string | null = null;
    if (audioUrl && typeof caches !== 'undefined') {
      const blob = await (await fetch(audioUrl)).blob();
      audio = `/road-voice/${lessonId}/${l.lines.length}`;
      await (await caches.open(CACHE)).put(audio, new Response(blob, { headers: { 'Content-Type': blob.type || 'audio/mpeg' } }));
    }
    l.lines.push({ text, who: line.who, audio });
    write(all);
    if (l.lines.length === 1) void tidyRoad();
  } catch { /* the road copy is a bonus: never disturb the lesson */ }
}

/** A saved voice as a playable URL (null = read it with the tablet's own voice). */
export async function roadVoice(path?: string | null): Promise<string | null> {
  if (!path || typeof caches === 'undefined') return null;
  const r = await (await caches.open(CACHE)).match(path);
  return r ? URL.createObjectURL(await r.blob()) : null;
}

export function markRoadPlayed(id: string) {
  const all = read();
  const l = all.find((x) => x.id === id);
  if (l) { l.roadPlays += 1; write(all); }
}
