// 15 Nov 2026: ONE phrase finder for the whole brain - submit-progress uses it on every WhatsApp/Telegram reply, the
// dashboard (FamilyNextSteps) on web chat replies. Pure TypeScript, no Deno or browser APIs, so both can import it.
// It finds the Spanish phrases EspaLuz really taught in a reply, with their English, in the shapes her replies use
// (tested on 10 real replies): “X” (English) · "X" [pronunciation] - English · X [pronunciation] - English ·
// - X – English. Pronunciation in brackets is never returned as the English.

export type FoundPhrase = { es: string; en: string };

const SPANISH = /[¿¡áéíóúñ]|\b(el|la|los|las|por|para|que|puedes|dónde|cómo|quiero|tengo|necesito|gracias|favor|es|está|una?|mi|mis|se|vamos|no)\b/i;
const ENGLISH = /\b(the|is|are|you|your|my|i|it|to|of|we|can|what|where|how|this|please|do|need|he|she|go|let's|time|name|in|at|with|a)\b/i;
const PRON = /[A-Z]{2,}-|‑|\b[A-Z]{3,}\b.*-|[ɲ]/;
const clean = (s: string) => s.replace(/\*+/g, '').replace(/^[\s"“”'-]+|[\s"“”']+$/g, '').replace(/\s+/g, ' ').trim();

export function phrasesIn(text: string, max = 6): FoundPhrase[] {
  const out: FoundPhrase[] = [];
  const add = (es: string, en?: string, shaped = false) => {
    es = clean(es.includes(': ') ? es.slice(es.lastIndexOf(': ') + 2) : es)
      // 15 Nov 2026 (first real Telegram turn): "Disfrutar el momento [dis-fru-tar el mo-men-to]" - a pronunciation in
      // brackets stuck to the phrase. The phrase is what comes before it.
      .replace(/\s*\[[^\]]*\]?\s*$/, '').trim();
    en = clean(en ?? '').replace(/^[(\s]+|[)\s]+$/g, '').replace(/([?!]).*$/, '$1');
    if (en && (PRON.test(en) || !ENGLISH.test(en))) en = '';
    // `shaped`: the numbered WhatsApp list - phrase (x) - y - proves it is a taught phrase once it carries its English.
    if (es.length < 4 || es.length > 90 || !(SPANISH.test(es) || (shaped && en)) || es.includes('…')) return;
    out.push({ es, en });
  };
  const body = String(text ?? '').replace(/\[VIDEO SCRIPT START\][\s\S]*?(\[VIDEO SCRIPT END\]|$)/g, '');
  for (const m of body.matchAll(/\*{0,2}[“"]([^”"\n]{4,90})[”"]\*{0,2}\s*(?:\[[^\]\n]{2,90}\]\s*[-–]\s*([^.\n(–]{3,90})|\(([^)\n]{3,90})\))/g)) add(m[1], m[2] ?? m[3]);
  for (const m of body.matchAll(/(?:^|\n|:\s)\s*(¿?¡?[A-Za-zÁÉÍÓÚÑáéíóúñ][^\[\n“"]{2,80}?)\s*\[[^\]\n]{3,90}\]\s*[-–]\s*([^.\n(]{3,90})/g)) add(m[1], m[2]);
  for (const m of body.matchAll(/(?:^|\n)\s*-\s+(¿?¡?[^\n“"–]{3,80}?)\s+[–-]\s+([A-Z][^\n(.]{3,90})/g)) add(m[1], m[2]);
  // 17 Nov 2026 (Elena's dashboard: 3 WhatsApp chats, 0 phrases): WhatsApp teaches in a numbered list, and the brackets
  // hold EITHER the English OR the pronunciation, with the other one after the dash:
  //   1. Muchas gracias por la invitación (Thank you very much for the invitation) - [muh-chas gra-syas ...], úsala ...
  //   1. Justificar la ausencia (jus-ti-fi-car la au-sen-cia) - To justify the absence. Use this when ...
  // A numbered heading in CAPITALS (a medicine leaflet read from a photo) is not a phrase.
  for (const m of body.matchAll(/(?:^|\s)\d[.)]\s+(¿?¡?[A-Za-zÁÉÍÓÚÑáéíóúñ][^\n(“"\[]{2,80}?)\s*\(([^)\n]{2,90})\)\s*[-–]\s*(\[[^\]\n]*\]?|[^.\n(]{3,90})/g)) {
    if (m[1] === m[1].toUpperCase()) continue;
    const inBrackets = clean(m[2]);
    const english = !PRON.test(inBrackets) && !/\w-\w+-\w/.test(inBrackets) && ENGLISH.test(inBrackets) ? inBrackets : m[3].startsWith('[') ? '' : m[3];
    add(m[1], english, true);
  }
  // 19 Nov 2026 (Telegram /review: 140 of 141 saved words had no meaning): the most common Telegram shape on 200 real
  // replies (29) was never read -  "Quedo pendiente" = I'll be watching for it.  ·  "Por duelo" [por DWEH-loh] = "Due to
  // mourning". An English-first pair ("Dear families" = "Apreciadas familias") fails the Spanish test and is skipped.
  // Same day: "Un café, por favor." (oon kah-FEH) - "A coffee, please." - pronunciation in ROUND brackets, then the English.
  for (const m of body.matchAll(/[“"]([^”"\n]{4,90})[”"]\*{0,2}\s*(?:[\[(][^\])\n]{2,90}[\])]\s*)?(?:=|[-–])\s*[“"]?([^”"\n.!?]{3,90}[!?]?)/g)) add(m[1], m[2]);
  // A phrase found twice keeps the copy WITH its English (the first pattern may have read only its pronunciation).
  const best = new Map<string, FoundPhrase>();
  for (const p of out) { const k = p.es.toLowerCase(); if (!best.has(k) || (!best.get(k)!.en && p.en)) best.set(k, p); }
  return [...best.values()].slice(0, max);
}
