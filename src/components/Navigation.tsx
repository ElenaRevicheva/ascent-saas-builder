import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, Compass, CreditCard, GraduationCap, Mail, Menu, MessageCircle, Sparkles, UserRound, X } from "lucide-react";

/* Menu tree (Elena 5 Nov 2026) - same shape as aideazz.xyz/sop-ai-ops.html: grouped labels, each item = icon + title +
   one line. Laptop: "This page" dropdown next to the old links (kept). Phone: the burger opens the same tree + the old links. */
const GROUPS = [
  { label: "menu.gStart", items: [
    { href: "#start", icon: MessageCircle, title: "menu.start", desc: "menu.startDesc" },
    { to: "/classroom", icon: GraduationCap, title: "menu.classroom", desc: "menu.classroomDesc" },
  ] },
  { label: "menu.gDoes", items: [
    { href: "#features", icon: Sparkles, title: "menu.features", desc: "menu.featuresDesc" },
    { href: "#life", icon: Compass, title: "menu.life", desc: "menu.lifeDesc" },
  ] },
  { label: "menu.gPlans", items: [
    { href: "#pricing", icon: CreditCard, title: "menu.pricing", desc: "menu.pricingDesc" },
    { href: "#about", icon: UserRound, title: "menu.about", desc: "menu.aboutDesc" },
    { href: "#feedback", icon: Mail, title: "menu.feedback", desc: "menu.feedbackDesc" },
  ] },
] as const;

function MenuTree({ onPick }: { onPick: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      {GROUPS.map((g, gi) => (
        <div key={g.label}>
          {gi > 0 && <div className="my-2 border-t border-border" role="separator" />}
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t(g.label)}</p>
          {g.items.map((it) => {
            const Icon = it.icon;
            const body = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">{t(it.title)}</span>
                  <span className="block text-sm leading-snug text-muted-foreground">{t(it.desc)}</span>
                </span>
              </>
            );
            const cls = "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-primary/5";
            return "to" in it
              ? <Link key={it.title} to={it.to} className={cls} onClick={onPick}>{body}</Link>
              : <a key={it.title} href={it.href} className={cls} onClick={onPick}>{body}</a>;
          })}
        </div>
      ))}
    </div>
  );
}

const Navigation = () => {
  const { t } = useTranslation();
  // 7 Nov 2026: a signed-in family saw "Sign In" / "Get Started" on the home page and thought sign-up had failed.
  const { user } = useAuth();
  const [menu, setMenu] = useState<"none" | "desk" | "phone">("none");
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (menu === "none") return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setMenu("none");
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [menu]);

  const pick = () => setMenu("none");

  return (
    <nav ref={ref} className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/" className="flex shrink-0 items-center gap-1.5 text-lg font-bold text-foreground sm:gap-2 sm:text-xl">
          {/* 3 Nov 2026 (Elena: "where is my purple and yellow icon?"): the 🇪🇸 emoji showed as the letters "ES" on Windows,
              which cannot draw flag emojis. The header now uses EspaLuz's own globe icon, the same file as the tab. */}
          <img src="/espaluz-icon.svg?v=el4" alt="" className="h-8 w-8 rounded-lg" />
          <span className="brand-wordmark">Espa<b>Luz</b></span>
        </Link>

        <div className="hidden lg:flex items-center space-x-8 whitespace-nowrap">
          <div className="relative">
            <button type="button" aria-expanded={menu === "desk"} aria-controls="menu-desk"
              onClick={() => setMenu(menu === "desk" ? "none" : "desk")}
              className="flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary">
              {t("menu.thisPage")}
              <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${menu === "desk" ? "rotate-180" : ""}`} />
            </button>
            {menu === "desk" && (
              <div id="menu-desk" className="absolute left-1/2 top-10 w-[22rem] -translate-x-1/2 rounded-2xl border border-border bg-card p-2 shadow-xl">
                <MenuTree onPick={pick} />
              </div>
            )}
          </div>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.features")}
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.pricing")}
          </a>
          <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.about")}
          </a>
          <Link to="/classroom" className="text-muted-foreground hover:text-foreground transition-colors">
            🦥🐒 Kids classroom
          </Link>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-4">
          <LanguageSwitcher />
          {user ? (
            <Link to="/dashboard">
              <Button variant="hero">Mi EspaLuz / My EspaLuz</Button>
            </Link>
          ) : (
            <>
              <Link to="/auth" className="hidden sm:block">
                <Button variant="ghost">{t("nav.signIn")}</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button variant="hero">{t("nav.getStarted")}</Button>
              </Link>
            </>
          )}
          <button type="button" className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground"
            aria-label={t("menu.open")} aria-expanded={menu === "phone"} aria-controls="menu-phone"
            onClick={() => setMenu(menu === "phone" ? "none" : "phone")}>
            {menu === "phone" ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menu === "phone" && (
        <div id="menu-phone" className="lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-card px-3 pb-4 pt-1 shadow-xl">
          <MenuTree onPick={pick} />
          <div className="my-2 border-t border-border" role="separator" />
          <Link to={user ? "/dashboard" : "/auth"} onClick={pick} className="block rounded-xl px-3 py-3 font-semibold text-primary hover:bg-primary/5">{user ? "Mi EspaLuz / My EspaLuz" : t("nav.signIn")}</Link>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
