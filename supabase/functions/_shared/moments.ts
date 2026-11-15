// 15 Nov 2026 (Elena: "Your first year in <country>" - the heart of the dashboard). ONE moment finder for the brain's
// server (WhatsApp/Telegram turns, submit-progress) and the dashboard (web chat replies): which of the country guide's
// belonging moments ("Your first Fiestas Patrias", "Your first rainy season"...) EspaLuz's reply talked about, matched by
// the moment's own words from the checked guide. Only moment ids are kept - never the text. Pure TypeScript.

export type Moment = { id: string; label: string; words: string[] };

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function momentsIn(text: string, moments: Moment[] | undefined): string[] {
  const t = ' ' + plain(String(text ?? '')).replace(/[^a-z0-9ñ]+/g, ' ') + ' ';
  if (t.trim().length < 3 || !Array.isArray(moments)) return [];
  const hit: string[] = [];
  for (const m of moments) {
    const words = (m.words ?? []).map((w) => ' ' + plain(w).replace(/[^a-z0-9ñ]+/g, ' ').trim() + ' ').filter((w) => w.trim().length >= 4);
    if (words.some((w) => t.includes(w))) hit.push(m.id);
  }
  return hit;
}

// The next date of a moment, when the guide gives one in its label or words ("8 December", "28 de noviembre").
const MONTHS: Record<string, number> = { january: 0, enero: 0, february: 1, febrero: 1, march: 2, marzo: 2, april: 3, abril: 3, may: 4, mayo: 4,
  june: 5, junio: 5, july: 6, julio: 6, august: 7, agosto: 7, september: 8, septiembre: 8, setiembre: 8, october: 9, octubre: 9,
  november: 10, noviembre: 10, december: 11, diciembre: 11 };
export function nextDateOf(m: Moment, now = new Date()): Date | null {
  const found: Date[] = [];
  for (const s of [m.label, ...(m.words ?? [])]) {
    for (const g of plain(String(s)).matchAll(/(\d{1,2})\s*(?:de\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/g)) {
      const d = new Date(now.getFullYear(), MONTHS[g[2]], Number(g[1]));
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (d < today) d.setFullYear(d.getFullYear() + 1);
      found.push(d);
    }
  }
  return found.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
}
