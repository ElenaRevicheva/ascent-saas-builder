import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Home, Compass, Languages, Users, Check, Info, Briefcase } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Part, Item } from "./Tree";

/*
 * 19 Nov 2026 - "Find your family's path" (Elena: "above 'What only EspaLuz does', every category finds its own path,
 * with clickable links to move forward"). Built from the two source-of-truth tables (cto-aipa
 * docs/espaluz/USER_CATEGORIES_2026-11-18.md = Table 1, WEEKLY_PLAN_RESEARCH_2026-11-18.md = Table 2):
 * one row per category - what you practise (Table 1), what you get first (Table 2 "they'd pay if", ONLY what works today),
 * and the reassurance from Table 2 "must not happen". Every button lands somewhere real:
 *   WhatsApp opens with the path word already typed; Telegram ?start=settle switches the path (Familybot handle_start);
 *   "Start free" = sign-up. Not promised until built: "Where next?" country comparison, Russian under rehearsals.
 * The visitor's language puts the most likely path first.
 */
const WA = "https://wa.me/50766623757?text=";
const TG = "https://t.me/EspaLuzFamily_bot";
// 19 Nov 2026 (Elena: "ugly, toyish emojis - enhance the text formatting"): line icons in soft round badges - the same
// pattern as the landing's "Moments EspaLuz helps with" rows - and a structured, readable inside.
type Row = { key: "expat" | "nomads" | "settle" | "russian" | "pro"; icon: LucideIcon; wa: string; tg: string; ruClass?: boolean; web?: string };
const ROWS: Record<Row["key"], Row> = {
  // 19 Nov 2026 (Elena: "other categories open with Hola and the user is stuck"): every row switches ITS path on.
  expat: { key: "expat", icon: Home, wa: "spanish", tg: `${TG}?start=spanish` },
  nomads: { key: "nomads", icon: Compass, wa: "both", tg: `${TG}?start=both` },
  settle: { key: "settle", icon: Languages, wa: "settle", tg: `${TG}?start=settle` },
  russian: { key: "russian", icon: Users, wa: "both", tg: `${TG}?start=both`, ruClass: true },
  // 20 Nov 2026 (Elena): Pro English, a SEPARATE layer for native Spanish speakers who need English for work. Its own doors:
  // the web coach (/pro-english), WhatsApp "pro english", Telegram ?start=proen-landing. The four rows above are unchanged.
  pro: { key: "pro", icon: Briefcase, wa: "pro english", tg: `${TG}?start=proen-landing`, web: "/pro-english" },
};
const ORDER: Record<string, Row["key"][]> = {
  en: ["expat", "nomads", "settle", "russian", "pro"],
  es: ["settle", "pro", "nomads", "expat", "russian"],
  ru: ["russian", "expat", "nomads", "settle", "pro"],
};

const btn = "inline-flex min-h-[40px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors";

export function FindYourPath() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ru") ? "ru" : i18n.language?.startsWith("es") ? "es" : "en";
  return (
    <Part tag={t("path.tag")} name={t("path.title")} count={t("path.count")} defaultOpen>
      <p className="px-1 font-sans text-[15px] text-muted-foreground">{t("path.lede")}</p>
      {ORDER[lang].map((k) => {
        const r = ROWS[k];
        const Icon = r.icon;
        const gets = t(`path.${k}.get`).split(" · ");
        return (
          <Item key={k} group="family-path" title={
            <span className="flex items-center gap-3">
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
              <h3 className="text-lg font-semibold text-foreground">{t(`path.${k}.title`)}</h3>
            </span>}>
            <div className="space-y-4 font-sans">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t("path.learnLabel").replace(/:$/, "")}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-foreground/85">{t(`path.${k}.learn`)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t("path.getLabel").replace(/:$/, "")}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {gets.map((g, i) => (
                    <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-foreground/85">
                      <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                      <span className="first-letter:uppercase">{g.replace(/\.$/, "")}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="inline-flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />{t(`path.${k}.calm`)}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link to={r.web ?? "/auth"} className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}>{r.web ? t(`path.${k}.open`) : t("path.startFree")}</Link>
                <a href={WA + encodeURIComponent(r.wa)} target="_blank" rel="noopener noreferrer"
                   className={`${btn} border border-green-600/40 text-green-700 hover:bg-green-50`}>{t("path.wa")}</a>
                <a href={r.tg} target="_blank" rel="noopener noreferrer"
                   className={`${btn} border border-sky-600/40 text-sky-700 hover:bg-sky-50`}>{t("path.tg")}</a>
                {r.ruClass && <Link to="/classroom-ru" className={`${btn} border border-amber-600/40 text-amber-800 hover:bg-amber-50`}>Мишка & Лиса</Link>}
              </div>
              <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />{r.web ? t(`path.${k}.note`) : t("path.note", { option: t(`path.${k}.option`) })}
              </p>
            </div>
          </Item>
        );
      })}
    </Part>
  );
}
