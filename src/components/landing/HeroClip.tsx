import { useEffect, useRef, useState } from "react";

/* Moving hero, Replika-style (Elena 5 Nov 2026): a 10 s silent loop made in Grok Imagine from a photorealistic still.
   - The poster (first frame) shows at once; the video file is only fetched when the clip is on screen
     (a clip inside a closed fold has no size, so it never loads until the fold opens).
   - Muted + playsInline is what lets browsers autoplay it; loop because first and last frames match.
   - People who ask their device for reduced motion get the still poster only. */
export function HeroClip({ src, poster, label, className = "", style }: {
  src: string; poster: string; label: string; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setStill(true); return; }
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); el.play?.().catch(() => {}); }
      else el.pause?.();
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (still) return <img src={poster} alt={label} className={className} style={style} />;
  return (
    <video ref={ref} src={visible ? src : undefined} poster={poster} aria-label={label}
      autoPlay muted loop playsInline preload="none" className={className} style={style} />
  );
}
