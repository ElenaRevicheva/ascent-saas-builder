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
  const add = (es: string, en?: string) => {
    es = clean(es.includes(': ') ? es.slice(es.lastIndexOf(': ') + 2) : es)
      // 15 Nov 2026 (first real Telegram turn): "Disfrutar el momento [dis-fru-tar el mo-men-to]" - a pronunciation in
      // brackets stuck to the phrase. The phrase is what comes before it.
      .replace(/\s*\[[^\]]*\]?\s*$/, '').trim();
    en = clean(en ?? '').replace(/^[(\s]+|[)\s]+$/g, '').replace(/([?!]).*$/, '$1');
    if (es.length < 4 || es.length > 90 || !SPANISH.test(es) || es.includes('…')) return;
    if (en && (PRON.test(en) || !ENGLISH.test(en))) en = '';
    out.push({ es, en });
  };
  const body = String(text ?? '').replace(/\[VIDEO SCRIPT START\][\s\S]*?(\[VIDEO SCRIPT END\]|$)/g, '');
  for (const m of body.matchAll(/\*{0,2}[“"]([^”"\n]{4,90})[”"]\*{0,2}\s*(?:\[[^\]\n]{2,90}\]\s*[-–]\s*([^.\n(–]{3,90})|\(([^)\n]{3,90})\))/g)) add(m[1], m[2] ?? m[3]);
  for (const m of body.matchAll(/(?:^|\n|:\s)\s*(¿?¡?[A-Za-zÁÉÍÓÚÑáéíóúñ][^\[\n“"]{2,80}?)\s*\[[^\]\n]{3,90}\]\s*[-–]\s*([^.\n(]{3,90})/g)) add(m[1], m[2]);
  for (const m of body.matchAll(/(?:^|\n)\s*-\s+(¿?¡?[^\n“"–]{3,80}?)\s+[–-]\s+([A-Z][^\n(.]{3,90})/g)) add(m[1], m[2]);
  const seen = new Set<string>();
  return out.filter((p) => { const k = p.es.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, max);
}
