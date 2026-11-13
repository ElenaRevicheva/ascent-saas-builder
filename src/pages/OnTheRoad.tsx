import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TracePad from '@/components/kids/TracePad';
import RoadPlayer from '@/components/RoadPlayer';
import { useOnline } from '@/lib/carMode';
import { tidyRoad, type RoadLesson } from '@/lib/roadLessons';
import { insidePlayApp } from '@/lib/playBilling';

/*
 * 13 Nov 2026 - "En el camino · On the road" (car mode step 1). What works with no signal, and nothing it cannot keep:
 * the heroes (clips kept on the tablet by public/sw.js), and paint / trace / music / program / games (TracePad works
 * on the tablet alone), and the classroom lessons the tablet already played (steps 2-3: lib/roadLessons + RoadPlayer).
 */
const TARGETS = ['a', 'e', 'i', 'o', 'u'];

export default function OnTheRoad() {
  const online = useOnline();
  const [pad, setPad] = useState(false);
  const [clip, setClip] = useState('/heroes/duo-hello.mp4');
  const [lessons, setLessons] = useState<RoadLesson[]>([]);
  const [playing, setPlaying] = useState<RoadLesson | null>(null);
  // 13 Nov 2026 (Elena): Мишка & Лиса is a website-only beta, never inside the Google Play app. The app shares Chrome's
  // storage on the tablet, so a Russian lesson played on the website must not appear on the app's road list.
  const app = insidePlayApp();
  useEffect(() => { tidyRoad().then((all) => setLessons(app ? all.filter((l) => l.lang !== 'ru') : all)); }, [app]);
  const cheer = () => setClip((c) => (c.endsWith('titi-dance.mp4') ? '/heroes/duo-hello.mp4' : '/heroes/titi-dance.mp4'));

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-foreground">🚗 En el camino · On the road</h1>
          <p className="text-sm text-muted-foreground">
            {online ? 'You have signal now - everything in EspaLuz works.' : 'No signal right now - these work without internet.'}
          </p>
        </header>

        <video key={clip} src={clip} autoPlay muted={false} playsInline loop={clip.endsWith('duo-hello.mp4')}
          onEnded={() => setClip('/heroes/duo-hello.mp4')} className="mx-auto w-full max-w-sm rounded-2xl shadow" />

        {pad ? (
          <TracePad targets={TARGETS} initialMode="letters" onClose={() => setPad(false)} onTraced={cheer} onPainted={cheer} />
        ) : (
          <button type="button" onClick={() => setPad(true)}
            className="w-full rounded-2xl px-5 py-4 text-lg font-semibold text-white" style={{ background: 'hsl(var(--espaluz-purple))' }}>
            ✏️ Pintar y trazar · Paint and trace
          </button>
        )}

        {playing ? (
          <RoadPlayer lesson={playing} onDone={() => { setPlaying(null); tidyRoad().then((all) => setLessons(app ? all.filter((l) => l.lang !== 'ru') : all)); }} />
        ) : (
          <section className="space-y-2 rounded-2xl border border-border p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">🎧 Lecciones para el camino · Lessons for the road</p>
            {lessons.length === 0 ? (
              <p>The lessons your family hears in the classroom at home wait here, ready with no signal. Open a class at home first.</p>
            ) : (
              <>
                <p>Listen, repeat, hear yourself - no reading, no internet. Each lesson stays a week or 3 road plays, then makes room for new ones.</p>
                {lessons.map((l) => (
                  <button key={l.id} type="button" onClick={() => setPlaying(l)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left">
                    <span className="truncate text-foreground">{l.lang === 'ru' ? '🐻🦊' : '🦥🐒'} {l.title}</span>
                    <span className="shrink-0 text-xs">{new Date(l.at).toLocaleDateString()} · {l.lines.length} ▶</span>
                  </button>
                ))}
              </>
            )}
          </section>
        )}

        {online && (
          <div className="text-center">
            <Link to="/dashboard" className="text-sm font-semibold text-primary hover:underline">← Back to EspaLuz</Link>
          </div>
        )}
      </div>
    </main>
  );
}
