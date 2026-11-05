import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Play, X } from "lucide-react";
import helloPoster from "@/assets/heroes/hello-poster.jpg";
import landingEn from "@/assets/heroes/hello-landing-en.mp4";
import landingEs from "@/assets/heroes/hello-landing-es.mp4";
import chatEn from "@/assets/heroes/hello-chat-en.mp4";
import chatEs from "@/assets/heroes/hello-chat-es.mp4";

/* EspaLuz says hello in her real face (Elena 5 Nov 2026: "landing page hello" + "also inside the chat").
   Pre-made clips: Runway Characters lip-sync on the free Edge voice, paid once, then free for every visitor
   (cto-aipa scripts/espaluz-avatar). Sound needs a tap, so the video stays mounted and play() runs inside the click:
   Safari refuses sound from a video created after the tap. Nothing downloads until that tap (preload="none"). */
const CLIPS = { landing: { en: landingEn, es: landingEs }, chat: { en: chatEn, es: chatEs } };

export function TalkingHello({ variant }: { variant: "landing" | "chat" }) {
  const { t, i18n } = useTranslation();
  const ref = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const src = CLIPS[variant][i18n.language?.startsWith("es") ? "es" : "en"];

  const start = () => {
    setOpen(true);
    const v = ref.current;
    if (v) { v.currentTime = 0; v.play().catch(() => { /* its own controls are on screen: one more tap plays it */ }); }
  };
  const stop = () => { ref.current?.pause(); setOpen(false); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") stop(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={start} className="mt-3 gap-2 rounded-full">
        <Play className="h-4 w-4" aria-hidden="true" />
        {t("hello.button")}
      </Button>
      <div
        className={open ? "fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4" : "hidden"}
        onClick={stop}
      >
        <div className="relative w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
          <video
            ref={ref}
            src={src}
            poster={helloPoster}
            aria-label={t("hello.label")}
            controls
            playsInline
            preload="none"
            onEnded={stop}
            className="block w-full rounded-2xl bg-black shadow-2xl"
          />
          <Button type="button" variant="secondary" size="icon" onClick={stop} aria-label={t("hello.close")}
            className="absolute right-2 top-2 h-8 w-8 rounded-full">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </>
  );
}
