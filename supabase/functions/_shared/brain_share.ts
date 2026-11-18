// 18 Nov 2026 (Elena: "the ecosystem is valuable only when its pieces share one source of truth and each part's learning
// contributes to further progress - WhatsApp, Telegram, the web chat, the kids' classroom, like my AI Lab agents"). Brain map:
// cto-aipa docs/espaluz/BRAIN_MAP_2026-11-18.md. Three things one part learned that no other part built on:
//   1. phrases EspaLuz taught (WhatsApp, Telegram, the web) - now every chat reuses them instead of starting from zero;
//   2. what the child did in Pere & Titi's class - now the parents' chats can help reinforce it at home;
//   3. the parent's last face-to-face rehearsal - now one gentle follow-up on its one fix.
// ONE reader and ONE rule text: espaluz-chat (web) calls it directly; kids-memory sends the SAME rendered text to both bots
// (`share_text`), so the three channels can never word it differently. Only what was saved - nothing generated here.
import { phrasesIn } from './phrases.ts';

export type BrainShare = {
  phrases: { es: string; en: string; from: string }[];
  classRecent: { child: string; day: string; said: string[]; words: string[] } | null;
  practice: { scene: string; phrase: string; fix: string; day: string } | null;
};

const STARTER = /quiero empezar la clase|i want to start the class/i;
const day = (iso: string) => new Date(Date.parse(iso) - 5 * 3600000).toISOString().slice(0, 10); // Panamá, like the class

export async function brainShare(db: any, userId: string): Promise<BrainShare> {
  const since = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  const [{ data: talks }, { data: cls }, { data: prac }, { data: kids }] = await Promise.all([
    db.from('learning_sessions').select('created_at, session_type, source, phrases:content->phrases, ai:content->>ai_response, bot:content->>bot_response')
      .eq('user_id', userId).in('session_type', ['conversation', 'dashboard_chat']).gte('created_at', since(21))
      .order('created_at', { ascending: false }).limit(120),
    db.from('learning_sessions').select('created_at, said:content->>user_message, speaker:content->>speaker, name:content->>speaker_name, words:content->vocabulary_taught')
      .eq('user_id', userId).eq('session_type', 'classroom').gte('created_at', since(7)).order('created_at', { ascending: false }).limit(80),
    db.from('learning_sessions').select('created_at, content').eq('user_id', userId).eq('session_type', 'analytics')
      .eq('content->>event', 'practice_session').gte('created_at', since(14)).order('created_at', { ascending: false }).limit(1),
    db.from('family_members').select('name').eq('user_id', userId).eq('role', 'child').eq('is_active', true).order('created_at', { ascending: true }).limit(1),
  ]);
  // 1. phrases taught on any channel, newest first, each once
  const phrases: BrainShare['phrases'] = [];
  for (const r of (talks ?? []) as any[]) {
    const from = r.session_type === 'dashboard_chat' ? 'the web' : r.source === 'whatsapp' ? 'WhatsApp' : 'Telegram';
    const found = Array.isArray(r.phrases) ? r.phrases.filter((p: any) => p?.es).map((p: any) => ({ es: String(p.es), en: String(p.en ?? '') }))
      : phrasesIn(String(r.ai ?? r.bot ?? ''));
    for (const p of found) if (!phrases.some((x) => x.es.toLowerCase() === p.es.toLowerCase())) phrases.push({ ...p, from });
    if (phrases.length >= 6) break;
  }
  // 2. the child's latest class day: their own words and the words taught
  let classRecent: BrainShare['classRecent'] = null;
  const rows = ((cls ?? []) as any[]).filter((r) => r.speaker !== 'parent');
  const spoke = rows.find((r) => r.said && !STARTER.test(r.said));
  if (spoke) {
    const d = day(spoke.created_at);
    const thatDay = rows.filter((r) => day(r.created_at) === d);
    const said = thatDay.map((r) => String(r.said ?? '').replace(/\s+/g, ' ').trim())
      .filter((s) => s && !STARTER.test(s) && !/^(📷|✏️|🎨)/.test(s) && s.split(' ').length >= 2).slice(0, 2);
    const words = [...new Set(thatDay.flatMap((r) => (Array.isArray(r.words) ? r.words : [])).map((w: unknown) => String(w).trim()).filter((w) => w.length >= 2))].slice(0, 6);
    if (said.length || words.length) classRecent = { child: String(spoke.name || kids?.[0]?.name || 'the child'), day: d, said, words };
  }
  // 3. the parent's last rehearsal
  const pc = (prac?.[0]?.content ?? null) as any;
  const practice = pc && (pc.phrase || pc.fix) ? { scene: String(pc.scene ?? '').slice(0, 120), phrase: String(pc.phrase ?? '').slice(0, 160),
    fix: String(pc.fix ?? '').slice(0, 200), day: day(prac![0].created_at) } : null;
  return { phrases, classRecent, practice };
}

// The rule text for grown-up chats (web, WhatsApp, Telegram). Empty when there is nothing to share.
export function brainShareText(s: BrainShare): string {
  const out: string[] = [];
  if (s.phrases.length) out.push(
    `PHRASES YOU ALREADY TAUGHT THIS FAMILY (on any channel, newest first): ${s.phrases.map((p) => `"${p.es}"${p.en ? ` (${p.en})` : ''} [${p.from}]`).join('; ')}. ` +
    'Build on them: when it fits, reuse ONE naturally or invite them to try it in a new sentence ("¿te acuerdas de...?"); never teach a listed phrase as new.');
  if (s.classRecent) out.push(
    `WHAT ${s.classRecent.child.toUpperCase()} DID IN PERE & TITI'S CLASS (${s.classRecent.day}, true): ` +
    `${s.classRecent.said.length ? `said ${s.classRecent.said.map((x) => `«${x}»`).join(' and ')}` : ''}` +
    `${s.classRecent.words.length ? `${s.classRecent.said.length ? '; ' : ''}words practised: ${s.classRecent.words.join(', ')}` : ''}. ` +
    'When the talk turns to the child, home or school, suggest ONE small way to use this at home (a question in Spanish, a word at dinner) - once, lightly, never as a report.');
  if (s.practice) out.push(
    `THEIR LAST REHEARSAL WITH YOU (${s.practice.day}${s.practice.scene ? `: ${s.practice.scene}` : ''}): ` +
    `${s.practice.phrase ? `the phrase to keep «${s.practice.phrase}»` : ''}${s.practice.fix ? `${s.practice.phrase ? '; ' : ''}the one thing to fix: ${s.practice.fix}` : ''}. ` +
    'If that moment comes up or is near, offer ONE short re-try of the fixed part - once, never pushy.');
  return out.length ? `\n${out.join('\n')}\n` : '';
}
