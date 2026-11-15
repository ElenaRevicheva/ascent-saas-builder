// 15 Nov 2026 (Elena: "EspaLuz opens with a callback to a dated family moment - 'How did Alisa's first day back go?'").
// ONE rule for every channel: espaluz-chat (web) and kids-memory facts_get (WhatsApp + Telegram) both call this.
//
// Why it was missing: the notebook loaders keep a dated note only while its date is today or later (until >= today), so
// the day after "Alisa returns to school on Monday" EspaLuz had already forgotten it - exactly when a friend would ask.
//
// What it does, in order, and only at the START of a conversation (no grown-up turn on any channel in the last 4 hours):
//   1. a dated moment that passed 1-3 days ago and was never followed up -> "ask how it went";
//   2. otherwise a dated moment that is today -> "wish them well today".
// Each moment is followed up ONCE across all channels: the hand-over is logged as {event:'memory_callback', fact_id},
// so WhatsApp never repeats what the web already asked. Private notes are never used (another member may be reading).

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export async function memoryCallback(db: any, userId: string, source: string): Promise<string> {
  try {
    const now = Date.now();
    const since4h = new Date(now - 4 * 3600000).toISOString();
    const { count: recent } = await db.from('learning_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      .in('session_type', ['conversation', 'dashboard_chat']).gte('created_at', since4h);
    if ((recent ?? 0) > 0) return '';

    const today = iso(now);
    const from = iso(now - 3 * DAY), to = iso(now - DAY);
    const { data: rows } = await db.from('learning_sessions').select('id, content').eq('user_id', userId)
      .eq('session_type', 'analytics').eq('content->>event', 'family_fact').gte('content->>until', from).lte('content->>until', today)
      .order('created_at', { ascending: false }).limit(20);
    const notes = (rows ?? []).filter((r: any) => !r.content?.retired && !r.content?.private && typeof r.content?.fact === 'string'
      && r.content.fact !== '[object Object]');
    if (!notes.length) return '';

    const { data: done } = await db.from('learning_sessions').select('content').eq('user_id', userId).eq('session_type', 'analytics')
      .eq('content->>event', 'memory_callback').gte('created_at', new Date(now - 10 * DAY).toISOString()).limit(50);
    const asked = new Set((done ?? []).map((d: any) => String(d.content?.fact_id ?? '')));
    const fresh = notes.filter((n: any) => !asked.has(String(n.id)));
    const past = fresh.filter((n: any) => String(n.content.until) >= from && String(n.content.until) <= to)
      .sort((a: any, b: any) => String(b.content.until).localeCompare(String(a.content.until)))[0];
    const todays = fresh.find((n: any) => String(n.content.until) === today);
    const pick = past ?? todays;
    if (!pick) return '';

    await db.from('learning_sessions').insert({ user_id: userId, session_type: 'analytics', source,
      content: { event: 'memory_callback', fact_id: pick.id, kind: past ? 'how_did_it_go' : 'today', until: pick.content.until } });
    console.log(`[callback] ${past ? 'how_did_it_go' : 'today'} handed to ${source}`);
    const fact = String(pick.content.fact).slice(0, 200);
    return past
      ? `\nMEMORY CALLBACK - this is the start of a new conversation. Before anything else, in ONE warm short line (Spanish first, ` +
        `then English), ask how this went - it was on ${pick.content.until}: "${fact}". Like a friend who remembered, never like a ` +
        `form; use the family member's name if the note has it. Then answer their message as usual. Ask it once only.\n`
      : `\nMEMORY CALLBACK - this is the start of a new conversation, and today is the day of: "${fact}". In ONE warm short line ` +
        `(Spanish first, then English) wish them well for it, with one useful phrase if it fits. Then answer their message as usual. Once only.\n`;
  } catch (e) {
    console.error('[callback] non-fatal', (e as Error).message);
    return '';
  }
}
