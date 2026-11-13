import { useState } from 'react';
import { Link } from 'react-router-dom';
import TracePad from '@/components/kids/TracePad';
import { useOnline } from '@/lib/carMode';

/*
 * 13 Nov 2026 - "En el camino · On the road" (car mode step 1). What works with no signal, and nothing it cannot keep:
 * the heroes (clips kept on the tablet by public/sw.js), and paint / trace / music / program / games (TracePad works
 * on the tablet alone). Lessons heard at home come in step 2. Honest about what needs the internet.
 */
const TARGETS = ['a', 'e', 'i', 'o', 'u'];

export default function OnTheRoad() {
  const online = useOnline();
  const [pad, setPad] = useState(false);
  const [clip, setClip] = useState('/heroes/duo-hello.mp4');
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

        <section className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">🎧 Lecciones para el camino · Lessons for the road</p>
          <p>Soon: the lessons your family heard at home will wait here, ready with no signal.</p>
        </section>

        {online && (
          <div className="text-center">
            <Link to="/dashboard" className="text-sm font-semibold text-primary hover:underline">← Back to EspaLuz</Link>
          </div>
        )}
      </div>
    </main>
  );
}
