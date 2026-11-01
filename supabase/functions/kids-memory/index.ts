import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

// 31 Oct 2026 (Elena, step 3 finished: "a lesson on one is remembered on the other"). The web classroom already reads
// Alisa's Telegram kids turns (espaluz-chat kidsMemoryCard); the Telegram bot could not read her web lessons. This
// function gives the bot her web memory card. It returns child data, so it answers ONLY with the bot's shared secret
// (ESPALUZ_BOT_SECRET, a Supabase secret and the bot's .env - never in the web bundle) and fails closed without it.
// Filters are the twins of espaluz-chat kidsMemoryCard; one kids brain is Phase 3 of ONE_FAMILY_MEMORY_PLAN.

const KIDS_STARTER = /quiero empezar la clase|i want to start the class/i;
const KIDS_HARD = /peg|golpe|\bhit|grit|yell|scold|rega[nñ]|castig|punish|llor|\bcry|cried|triste|\bsad\b|miedo|scared|asust|duele|hurt|enoj|angry|frustr|sangr|blood|lastim|herid|accident|terremoto|sismo|temblor|earthquake/i;
const KIDS_ADULT = /\bmi hij[oa]\b|\bmy (daughter|son)\b|\bmam[aá] aqu[ií]\b|\bsoy (la|su) mam[aá]\b|\b(it'?s|it is|this is|soy|habla) [^.!?]{0,20}\b(mom|mum|mother|mam[aá])\b|\balisa'?s (mom|mum|mother)\b|\b(mom|mum|mother|mam[aá]) (of|de) alisa\b|\balisa (has|had|is|was|does|doesn'?t|did|didn'?t|promised|no quiere|quiere|tiene|est[aá])\b/i;
const kidWords = (s: string): string[] =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zñ]+/g) ?? [];
const firstLine = (reply: string): string =>
  (reply.split('\n').map((l) => l.trim()).find(Boolean) ?? '').replace(/^[^:\[]*(\[[^\]]*\])?:\s*/, '').split(' / ')[0].slice(0, 120);

// 1 Nov 2026 (Elena: "not just Buddy.ai but the neuro app" = Leaply Kids): the habit Leaply sells is a short daily game
// the parent does WITH the child. One game a day, the same for every channel (the bots put it in the parent report and
// the daily reminder). Plain movement and calm games - no health claims.
const TOGETHER = [
  "Cross-crawl: right hand to left knee, left hand to right knee, 10 times, counting in Spanish (uno, dos, tres…).",
  "Rojo salta, azul congela: you call a colour - on \"rojo\" she jumps, on \"azul\" she freezes like a statue.",
  "Lazy 8: draw a big sideways 8 in the air with one finger, slowly, 5 times with each hand, saying \"ocho\".",
  "Balloon breaths: hands on the belly, breathe in like a balloon, out slowly, 3 times - then \"Me siento tranquila / I feel calm\".",
  "Flamingo: stand on one foot and count to 10 in Spanish, then the other foot.",
  "Simón dice: 3 commands in Spanish (\"Simón dice: toca tu nariz\", \"…salta dos veces\", \"…aplaude\").",
  "Espejo / mirror: copy each other's slow moves for one minute, then each says one feeling (\"Estoy feliz\").",
];
const panamaDay = (offset = 0): number => Math.floor((Date.now() - 5 * 3600 * 1000) / 86400000) + offset; // UTC-5, no DST

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

serve(async (req) => {
  const secret = Deno.env.get('ESPALUZ_BOT_SECRET');
  if (!secret || req.headers.get('x-espaluz-bot-secret') !== secret) return json({ error: 'unauthorized' }, 401);
  try {
    const { telegram_user_id, mode, since, platform: asked, whatsapp_user_id } = await req.json();
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // 1 Nov 2026 (WhatsApp parity step 6): the child's stars on WhatsApp are the SAME number as in the web classroom -
    // every saved classroom answer, web or WhatsApp, minus the "start the class" turns (twin of Classroom.tsx's count).
    // 1 Nov 2026 (Phase 3, one brain): Telegram asks too, by its Telegram user id.
    if (mode === 'stars') {
      const tg = telegram_user_id != null && telegram_user_id !== '';
      const { data: link } = await db.from('connected_bots').select('user_id')
        .eq('platform', tg ? 'telegram' : 'whatsapp').eq('platform_user_id', String(tg ? telegram_user_id : whatsapp_user_id ?? '')).eq('is_active', true)
        .order('connected_at', { ascending: false }).limit(1);
      if (!link?.[0]?.user_id) return json({ linked: false, stars: 0 });
      const { count, error } = await db.from('learning_sessions').select('id', { count: 'exact', head: true })
        .eq('user_id', link[0].user_id).eq('session_type', 'classroom')
        .not('content->>user_message', 'ilike', '%quiero empezar la clase%');
      if (error) throw error;
      return json({ linked: true, stars: count ?? 0 });
    }
    // 31 Oct 2026 (step 4, the parent report): the bot asks for the recent classroom turns of every Telegram-linked
    // family and assembles the after-lesson report itself, by code. At most 48 h back, at most 300 turns.
    // 31 Oct 2026 (WhatsApp parity step 5): EspaLuz WhatsApp asks with platform 'whatsapp'. Each lesson is reported on
    // ONE channel: a WhatsApp lesson on WhatsApp, a web lesson on Telegram - or on WhatsApp when the family has no
    // Telegram link. `user_key` is the platform id (Telegram user id, or the hashed WhatsApp id).
    if (mode === 'lessons') {
      const platform = asked === 'whatsapp' ? 'whatsapp' : 'telegram';
      const from = new Date(Math.max(Date.parse(since) || 0, Date.now() - 48 * 3600 * 1000)).toISOString();
      const { data: links } = await db.from('connected_bots').select('user_id, platform_user_id, connected_at')
        .eq('platform', platform).eq('is_active', true).order('connected_at', { ascending: false });
      const families: { telegram_user_id: string; user_key: string; has_telegram: boolean; turns: { at: string; said: string; reply: string; src: string }[] }[] = [];
      const seen = new Set<string>();
      for (const l of links ?? []) {
        if (seen.has(l.platform_user_id)) continue; // an account belongs to its newest link only
        seen.add(l.platform_user_id);
        // 1 Nov 2026 (Phase 3): Telegram lessons now run on the kids brain and are saved as source 'telegram'.
        let sources = ['telegram', 'web'];
        let hasTelegram = platform === 'telegram';
        if (platform === 'whatsapp') {
          const { data: tg } = await db.from('connected_bots').select('id').eq('user_id', l.user_id)
            .eq('platform', 'telegram').eq('is_active', true).limit(1);
          hasTelegram = !!tg?.length;
          sources = hasTelegram ? ['whatsapp'] : ['whatsapp', 'web'];
        }
        const { data: rows } = await db.from('learning_sessions').select('content, created_at, source')
          .eq('user_id', l.user_id).eq('session_type', 'classroom').in('source', sources).gte('created_at', from)
          .order('created_at', { ascending: true }).limit(300);
        // has_telegram: the daily ritual goes to ONE channel too - Telegram when the family has it.
        if (rows?.length) families.push({ telegram_user_id: l.platform_user_id, user_key: l.platform_user_id, has_telegram: hasTelegram, turns: rows.map((r: any) => ({
          at: r.created_at, said: String(r.content?.user_message ?? '').slice(0, 300), reply: String(r.content?.ai_response ?? '').slice(0, 1500),
          src: String(r.source ?? 'web') })) });
      }
      console.log(`kids-memory lessons (${platform}): ${families.length} families with turns since ${from}`);
      return json({ families, together_today: TOGETHER[panamaDay() % TOGETHER.length],
                    together_tomorrow: TOGETHER[panamaDay(1) % TOGETHER.length] });
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
