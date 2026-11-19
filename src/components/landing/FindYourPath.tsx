import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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
type Row = { key: "expat" | "nomads" | "settle" | "russian"; emoji: string; wa: string; tg: string; ruClass?: boolean };
const ROWS: Record<Row["key"], Row> = {
  expat: { key: "expat", emoji: "🌴", wa: "hola", tg: TG },
  nomads: { key: "nomads", emoji: "🧭", wa: "hola", tg: TG },
  settle: { key: "settle", emoji: "🗣️", /* a flag emoji renders as "ES" on Windows */ wa: "settle", tg: `${TG}?start=settle` },
  russian: { key: "russian", emoji: "🪆", wa: "hola", tg: TG, ruClass: true },
};
const ORDER: Record<string, Row["key"][]> = {
  en: ["expat", "nomads", "settle", "russian"],
  es: ["settle", "nomads", "expat", "russian"],
  ru: ["russian", "expat", "nomads", "settle"],
};

const btn = "inline-flex min-h-[40px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors";

export function FindYourPath() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ru") ? "ru" : i18n.language?.startsWith("es") ? "es" : "en";
  return (
    <Part tag={t("path.tag")} name={t("path.title")} count={t("path.count")} defaultOpen>
      <p className="px-1 text-sm text-muted-foreground">{t("path.lede")}</p>
      {ORDER[lang].map((k) => {
        const r = ROWS[k];
        return (
          <Item key={k} group="family-path" title={<span className="font-semibold text-foreground">{r.emoji} {t(`path.${k}.title`)}</span>}>
            <ul className="space-y-1.5 text-sm leading-relaxed text-foreground/85">
              <li><span className="font-semibold">{t("path.learnLabel")}</span> {t(`path.${k}.learn`)}</li>
              <li><span className="font-semibold">{t("path.getLabel")}</span> {t(`path.${k}.get`)}</li>
              <li className="text-primary">✓ {t(`path.${k}.calm`)}</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/auth" className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}>{t("path.startFree")}</Link>
              <a href={WA + encodeURIComponent(r.wa)} target="_blank" rel="noopener noreferrer"
                 className={`${btn} border border-green-600/40 text-green-700 hover:bg-green-50`}>{t("path.wa")}</a>
              <a href={r.tg} target="_blank" rel="noopener noreferrer"
                 className={`${btn} border border-sky-600/40 text-sky-700 hover:bg-sky-50`}>{t("path.tg")}</a>
              {r.ruClass && <Link to="/classroom-ru" className={`${btn} border border-amber-600/40 text-amber-800 hover:bg-amber-50`}>Мишка & Лиса</Link>}
            </div>
            {k === "settle" && <p className="mt-2 text-xs text-muted-foreground">{t("path.settleNote")}</p>}
          </Item>
        );
      })}
    </Part>
  );
}
