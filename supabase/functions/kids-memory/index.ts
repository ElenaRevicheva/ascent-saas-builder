import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

// 31 Oct 2026 (Elena, step 3 finished: "a lesson on one is remembered on the other"). The web classroom already reads
// Alisa's Telegram kids turns (espaluz-chat kidsMemoryCard); the Telegram bot could not read her web lessons. This
// function gives the bot her web memory card. It returns child data, so it answers ONLY with the bot's shared secret
// (ESPALUZ_BOT_SECRET, a Supabase secret and the bot's .env - never in the web bundle) and fails closed without it.
// Filters are the twins of espaluz-chat kidsMemoryCard; one kids brain is Phase 3 of ONE_FAMILY_MEMORY_PLAN.

const KIDS_STARTER = /quiero empezar la clase|i want to start the class/i;
const KIDS_HARD = /peg|golpe|\bhit|grit|yell|scold|rega[nñ]|castig|punish|llor|\bcry|cried|triste|\bsad\b|miedo|scared|asust|duele|hurt|enoj|angry|frustr|sangr|blood|lastim|herid|accident|terremoto|sismo|temblor|earthquake/i;
const KIDS_ADULT = /\bmi hij[oa]\b|\bmy (daughter|son)\b|\bmam[aá] aqu[ií]\b|\bsoy (la|su) mam[aá]\b|\b(it'?s|this is|soy|habla) [^.!?]{0,20}\b(mom|mum|mother|mam[aá])\b|\balisa'?s (mom|mum|mother)\b|\balisa (has|had|is|was|does|doesn'?t|did|didn'?t|promised|no quiere|quiere|tiene|est[aá])\b/i;
const kidWords = (s: string): string[] =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zñ]+/g) ?? [];
const firstLine = (reply: string): string =>
  (reply.split('\n').map((l) => l.trim()).find(Boolean) ?? '').replace(/^[^:\[]*(\[[^\]]*\])?:\s*/, '').split(' / ')[0].slice(0, 120);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

serve(async (req) => {
  const secret = Deno.env.get('ESPALUZ_BOT_SECRET');
  if (!secret || req.headers.get('x-espaluz-bot-secret') !== secret) return json({ error: 'unauthorized' }, 401);
  try {
    const { telegram_user_id, mode, since } = await req.json();
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // 31 Oct 2026 (step 4, the parent report): the bot asks for the recent classroom turns of every Telegram-linked
    // family and assembles the after-lesson report itself, by code. At most 48 h back, at most 300 turns.
    if (mode === 'lessons') {
      const from = new Date(Math.max(Date.parse(since) || 0, Date.now() - 48 * 3600 * 1000)).toISOString();
      const { data: links } = await db.from('connected_bots').select('user_id, platform_user_id, connected_at')
        .eq('platform', 'telegram').eq('is_active', true).order('connected_at', { ascending: false });
      const families: { telegram_user_id: string; turns: { at: string; said: string; reply: string }[] }[] = [];
      const seen = new Set<string>();
      for (const l of links ?? []) {
        if (seen.has(l.platform_user_id)) continue; // a Telegram account belongs to its newest link only
        seen.add(l.platform_user_id);
        const { data: rows } = await db.from('learning_sessions').select('content, created_at')
          .eq('user_id', l.user_id).eq('session_type', 'classroom').gte('created_at', from)
          .order('created_at', { ascending: true }).limit(300);
        if (rows?.length) families.push({ telegram_user_id: l.platform_user_id, turns: rows.map((r: any) => ({
          at: r.created_at, said: String(r.content?.user_message ?? '').slice(0, 300), reply: String(r.content?.ai_response ?? '').slice(0, 1500) })) });
      }
      console.log(`kids-memory lessons: ${families.length} families with turns since ${from}`);
      return json({ families });
    }
    if (!telegram_user_id) return json({ error: 'telegram_user_id is required' }, 400);
    const { data: link } = await db.from('connected_bots').select('user_id')
      .eq('platform', 'telegram').eq('platform_user_id', String(telegram_user_id)).eq('is_active', true)
      .order('connected_at', { ascending: false }).limit(1);
    const userId = link?.[0]?.user_id;
    if (!userId) return json({ linked: false, said: [], mission: '' });
    const { data, error } = await db.from('learning_sessions').select('content, created_at')
      .eq('user_id', userId).eq('session_type', 'classroom')
      // Same cutoff as espaluz-chat: replies before the 31 Oct 12:47 UTC rules misread her.
      .gte('created_at', '2026-10-31T12:47:00Z')
      .order('created_at', { ascending: false }).limit(60);
    if (error) throw error;
    const said: { words: string; understood: string; at: string }[] = [];
    let mission = '';
    for (const row of data ?? []) {
      const c = (row as any).content || {};
      const words = String(c.user_message ?? '').trim();
      const reply = String(c.ai_response ?? '');
      if (!mission) {
        const line = reply.split('\n').find((l: string) => /misi[oó]n|mission/i.test(l));
        if (line) mission = line.replace(/^.*?\]:\s*/, '').slice(0, 160);
      }
      const understood = firstLine(reply);
      if (!words || KIDS_STARTER.test(words) || KIDS_HARD.test(words) || KIDS_HARD.test(understood) || KIDS_ADULT.test(words)) continue;
      if (/no te escuch|didn't hear/i.test(understood)) continue;
      if (understood && kidWords(understood).join(' ').includes(kidWords(words).join(' '))) continue;
      if (said.some((s) => s.words === words.slice(0, 120))) continue;
      said.push({ words: words.slice(0, 120), understood, at: (row as any).created_at });
      if (said.length >= 6) break;
    }
    console.log(`kids-memory: linked, ${said.length} web lines${mission ? ' + mission' : ''}`);
    return json({ linked: true, said, mission });
  } catch (e) {
    console.error('kids-memory error:', (e as Error).message);
    return json({ error: 'failed' }, 500);
  }
});
