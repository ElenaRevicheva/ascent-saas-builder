/*
 * 15 Nov 2026 (Elena: "the translation should be the highest quality in Spanish, English and Russian - of everything").
 * The 21 checked country guides (supabase/functions/_shared/belonging/<country>.json) are written in English and are
 * read as they are by the chat and both bots. Their Spanish and Russian versions live NEXT to them, in
 * belonging/i18n/<country>.json ({ name, items: {"<section>.<id>": {es, ru}}, moments: {<id>: {es, ru}} }), so the
 * originals and everything that reads them stay untouched. The dashboard shows the guide in the family's language;
 * a missing translation falls back to the checked English - never to an empty line.
 */
type Item = { id: string; text: string; es?: string; status?: string; sources?: string[] };
type Moment = { id: string; label: string; words: string[] };
export type Pack = { country: string; name: string; sections: Record<string, Item[]>; belonging_moments?: Moment[] };
type Tr = { es?: string; ru?: string };
type PackTr = { name?: Tr; items?: Record<string, Tr>; moments?: Record<string, Tr> };

const I18N = import.meta.glob('../../supabase/functions/_shared/belonging/i18n/*.json');

export const langOf = (lng?: string): 'en' | 'es' | 'ru' => (lng?.startsWith('ru') ? 'ru' : lng?.startsWith('es') ? 'es' : 'en');

async function loadTr(country: string): Promise<PackTr | null> {
  const key = Object.keys(I18N).find((k) => k.endsWith(`/${country}.json`));
  if (!key) return null;
  const mod = (await I18N[key]()) as { default?: PackTr } & PackTr;
  return (mod.default ?? mod) as PackTr;
}

/** The same pack, with the English texts replaced by the family's language where a translation exists. */
export async function localizePack(pack: Pack, lng?: string): Promise<Pack> {
  const lang = langOf(lng);
  if (lang === 'en') return pack;
  const tr = await loadTr(pack.country).catch(() => null);
  if (!tr) return pack;
  const pick = (t: Tr | undefined, fallback: string) => (t && t[lang] ? String(t[lang]) : fallback);
  const sections: Record<string, Item[]> = {};
  for (const [sec, items] of Object.entries(pack.sections)) {
    sections[sec] = items.map((it) => ({ ...it, text: pick(tr.items?.[`${sec}.${it.id}`], it.text) }));
  }
  return {
    ...pack,
    name: pick(tr.name, pack.name),
    sections,
    belonging_moments: (pack.belonging_moments ?? []).map((m) => ({ ...m, label: pick(tr.moments?.[m.id], m.label) })),
  };
}
