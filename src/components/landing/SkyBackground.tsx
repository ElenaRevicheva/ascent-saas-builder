import { useEffect, useRef, useState } from "react";
import sky from "@/assets/heroes/sky.mp4";
import skyPoster from "@/assets/heroes/sky-poster.jpg";

/* Whole-page sunset sky (Elena 5 Nov 2026): "vivid, clouds moving, rays of light flowing, violet and sun, a little rose,
   very light palette" - built like aideazz.xyz/api (background video under a veil) + sop-ai-ops (light-leak, glow, grain).
   Sky = 15 s Grok Imagine loop (seam 1.7/255), fixed behind everything. The veil keeps dark text readable.
   Reduced-motion users get the still sky and no moving light. */
export function SkyBackground() {
  const [still, setStill] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setStill(true);
    else ref.current?.play?.().catch(() => {});
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {still
        ? <img src={skyPoster} alt="" className="h-full w-full object-cover" />
        : <video ref={ref} src={sky} poster={skyPoster} autoPlay muted loop playsInline preload="auto" className="h-full w-full object-cover" />}
      {/* veil: lighter at the top where the headline sits, letting more sky through lower down */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,251,247,.58) 0%, rgba(255,250,246,.42) 35%, rgba(252,247,255,.34) 70%, rgba(255,249,240,.42) 100%)" }} />
      {!still && <>
        <i className="sky-glow absolute" />
        <i className="sky-rays absolute inset-0" />
      </>}
      <i className="sky-grain absolute inset-0" />
    </div>
  );
}
