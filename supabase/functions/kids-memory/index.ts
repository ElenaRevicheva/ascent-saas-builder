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
  // 3 Nov 2026: the two calm practice types Leaply uses that were missing (self-massage, body scan) - kid versions,
  // still plain games with no health claims (docs/espaluz/LEAPLY_INSIDE_2026-11-03.md).
  "Manos calientitas: rub your hands together until warm, rest them on your child's cheeks, then she does it for you - and both rub your ears softly from top to bottom, saying \"tranquilo / calm\".",
  "Estatua y gelatina: squeeze the whole body tight like a statue while you count \"uno, dos, tres\" in Spanish, then go soft like jelly - 3 times, then each says how the body feels.",
];
const panamaDay = (offset = 0): number => Math.floor((Date.now() - 5 * 3600 * 1000) / 86400000) + offset; // UTC-5, no DST

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

serve(async (req) => {
  const secret = Deno.env.get('ESPALUZ_BOT_SECRET');
  if (!secret || req.headers.get('x-espaluz-bot-secret') !== secret) return json({ error: 'unauthorized' }, 401);
  try {
    const body = await req.json();
    const { telegram_user_id, mode, since, platform: asked, whatsapp_user_id } = body;
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // 6 Nov 2026 (Elena: "firstly it is about memory, because it will follow the long road"): one grown-up notebook per
    // linked family, across web, Telegram and WhatsApp. Rows are learning_sessions like every other family record, no
    // second store. A family that never linked gets linked:false and its bot keeps its notes to itself.
    // 6 Nov 2026 (Elena: free inside the same 14 days): one tap from a bot chat into the classroom, already signed in. A family
    // with no web account gets one under an internal address built from the hashed id: no phone number, nothing emailed. Its
    // trial end is the bot's (app_metadata.trial_until, read by get_user_subscription_status). An account that exists is untouched.
    if (mode === 'classroom_link') {
      const tgLink = telegram_user_id != null && telegram_user_id !== '';
      const platform = tgLink ? 'telegram' : 'whatsapp';
      const platformId = String(tgLink ? telegram_user_id : whatsapp_user_id ?? '');
      if (!platformId) return json({ ok: false, reason: 'no_id' });
      const redirectTo = 'https://app.espaluz.lat/classroom';
      const { data: found } = await db.from('connected_bots').select('user_id').eq('platform', platform).eq('platform_user_id', platformId)
        .eq('is_active', true).order('connected_at', { ascending: false }).limit(1);
      let email = '';
      if (found?.[0]?.user_id) {
        const { data: existing } = await db.auth.admin.getUserById(found[0].user_id);
        email = existing?.user?.email ?? '';
        if (!email) return json({ ok: false, reason: 'no_email' });
      } else {
        const until = Date.parse(String(body.trial_until ?? ''));
        if (!body.paid && !(until > Date.now())) return json({ ok: false, reason: 'no_access' });
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${platform}:${platformId}`))))
          .map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
        email = `f${hash}@family.espaluz.lat`;
        const { error: made } = await db.auth.admin.createUser({ email, email_confirm: true,
          app_metadata: until > Date.now() ? { trial_until: new Date(until).toISOString() } : {} });
        if (made && !/already/i.test(made.message)) throw made;
      }
      const { data: gen, error: genError } = await db.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } });
      if (genError || !gen?.properties?.action_link || !gen?.user?.id) throw genError ?? new Error('no link');
      if (!found?.[0]?.user_id) {
        const { error: linkError } = await db.from('connected_bots').upsert({ user_id: gen.user.id, platform, platform_user_id: platformId,
          is_active: true, connected_at: new Date().toISOString(), last_activity: new Date().toISOString() }, { onConflict: 'platform,platform_user_id' });
        if (linkError) throw linkError;
      }
      console.log(`[classroom-link] made on ${platform}, ${found?.[0]?.user_id ? 'existing' : 'new'} family`);
      return json({ ok: true, url: gen.properties.action_link });
    }
    if (mode === 'facts_get' || mode === 'facts_add' || mode === 'who_set' || mode === 'profile_fill') {
      const { facts, speaker: said } = body;
      const tg = telegram_user_id != null && telegram_user_id !== '';
      const platform = tg ? 'telegram' : 'whatsapp';
      const platformId = String(tg ? telegram_user_id : whatsapp_user_id ?? '');
      const { data: link } = await db.from('connected_bots').select('user_id')
        .eq('platform', platform).eq('platform_user_id', platformId).eq('is_active', true)
        .order('connected_at', { ascending: false }).limit(1);
      const userId = link?.[0]?.user_id;
      if (!userId) return json({ linked: false, facts: [] });
      // 8 Nov 2026: what a bot learned at its first-day questions (Telegram onboarding, WhatsApp country answer) joins
      // the family profile - only fields still empty, so the family's own answers on the web are never overwritten.
      if (mode === 'profile_fill') {
        const KEYS = ['country_now', 'country_from', 'native_language', 'moved_when', 'household', 'spanish_feel', 'miss_most', 'work', 'profession']; // 13 Nov: + work
        const given = Object.fromEntries(Object.entries(body.profile ?? {}).filter(([k, v]) => KEYS.includes(k) && typeof v === 'string' && v.trim())
          .map(([k, v]) => [k, String(v).trim().slice(0, 60)]));
        const { data: cur } = await db.from('learning_sessions').select('content').eq('user_id', userId).eq('session_type', 'analytics')
          .eq('content->>event', 'family_profile').order('created_at', { ascending: false }).limit(1);
        const now = (cur?.[0]?.content ?? {}) as Record<string, unknown>;
        const fill = Object.fromEntries(Object.entries(given).filter(([k]) => !now[k]));
        if (!Object.keys(fill).length) return json({ linked: true, filled: 0 });
        await db.from('learning_sessions').insert({ user_id: userId, session_type: 'analytics', source: platform,
          content: { ...now, event: 'family_profile', ...fill } });
        console.log(`[profile] ${Object.keys(fill).join(',')} filled from ${platform}`);
        return json({ linked: true, filled: Object.keys(fill).length });
      }
      // Who this number belongs to: one row per link, no schema change. The newest answer wins.
      if (mode === 'who_set') {
        const name = String(said ?? '').trim().slice(0, 40);
        if (!name) return json({ linked: true, saved: false });
        await db.from('learning_sessions').insert({ user_id: userId, session_type: 'analytics', source: platform,
          content: { event: 'family_link', platform, platform_user_id: platformId, member: name } });
        console.log(`[memory] number recognized on ${platform}`);
        return json({ linked: true, saved: true });
      }
      const { data: links } = await db.from('learning_sessions').select('content')
        .eq('user_id', userId).eq('session_type', 'analytics').eq('content->>event', 'family_link')
        .eq('content->>platform_user_id', platformId).order('created_at', { ascending: false }).limit(1);
      const speaker: string = String(links?.[0]?.content?.member ?? '');
      const { data: rows, error } = await db.from('learning_sessions').select('id, content')
        .eq('user_id', userId).eq('session_type', 'analytics').eq('content->>event', 'family_fact')
        .order('created_at', { ascending: false }).limit(80);
      if (error) throw error;
      const today = new Date().toISOString().slice(0, 10);
      const live = (rows ?? []).filter((r: any) => !r.content?.retired && r.content?.fact !== '[object Object]' && (!r.content?.until || String(r.content.until) >= today));
      // A private note (a worry, money, health) is read only on the number of the person who said it.
      const visible = live.filter((r: any) => !r.content?.private || (speaker && r.content?.speaker === speaker));
      if (mode === 'facts_get') {
        const { data: fam } = await db.from('family_members').select('name, role, age, created_at').eq('user_id', userId)
          .eq('is_active', true).order('created_at', { ascending: false });
        const seen = new Set<string>();
        const members = (fam ?? []).filter((m: any) => { const k = String(m.name).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
          .map((m: any) => ({ name: m.name, role: m.role, age: m.age }));
        const week = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data: les } = await db.from('learning_sessions').select('content, created_at').eq('user_id', userId)
          .eq('session_type', 'classroom').gte('created_at', week).order('created_at', { ascending: false }).limit(60);
        const lessons = [...new Set((les ?? []).map((r: any) => String(r.content?.class_label ?? '').slice(0, 120)).filter(Boolean))].slice(0, 3);
        // 6 Nov 2026 (Elena: Telegram exactly like WhatsApp): a family that pays on one channel is paying on all of them.
        const { data: paidRows } = await db.from('user_subscriptions').select('id').eq('user_id', userId).eq('status', 'active')
          .gt('current_period_end', new Date().toISOString()).limit(1);
        // 8 Nov 2026: the family profile ("About your new life", web questionnaire or a bot's first-day answers) - the
        // same note for all three channels: country now, country of origin, native language, when they moved, ...
        const { data: prof } = await db.from('learning_sessions').select('content').eq('user_id', userId).eq('session_type', 'analytics')
          .eq('content->>event', 'family_profile').order('created_at', { ascending: false }).limit(1);
        const { event: _e, ...profile } = (prof?.[0]?.content ?? {}) as Record<string, unknown>;
        // 12 Nov 2026 (Elena: a number re-linked to another family answered with the OLD family's names): an anonymous,
        // stable key of the family this number belongs to. The bots scope their per-number memory to it, so a number that
        // moves to another family never shows that family the previous one's chats. Hash only - never the account id.
        const famHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('espaluz-family:' + userId))))
          .map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
        return json({ linked: true, family: famHash, family_paying: !!paidRows?.length, facts: visible.map((r: any) => String(r.content?.fact ?? '')).filter(Boolean).slice(0, 15),
          members, speaker, lessons, lesson_turns: les?.length ?? 0, profile });
      }
      const words = (t: string) => new Set(t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]+/g) ?? []);
      const same = (a: string, b: string) => { const A = words(a), B = words(b); if (!A.size || !B.size) return false;
        let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.min(A.size, B.size) >= 0.75; };
      const known: string[] = live.map((r: any) => String(r.content?.fact ?? '')).filter(Boolean);
      let added = 0, retired = 0;
      for (const raw of (Array.isArray(facts) ? facts : []).slice(0, 3)) {
        const item = typeof raw === 'string' ? { fact: raw } : (raw ?? {});
        const fact = String(item.fact ?? '').trim();
        if (fact.length < 8 || fact.length > 160) continue;
        if (item.replaces) {
          const old = live.find((r: any) => String(r.content?.fact ?? '').toLowerCase() === String(item.replaces).toLowerCase());
          if (old) { await db.from('learning_sessions').update({ content: { ...old.content, retired: true } }).eq('id', old.id); retired++; }
        } else if (known.some((k) => same(k, fact))) continue;
        const until = /^\d{4}-\d{2}-\d{2}$/.test(String(item.until ?? '')) ? String(item.until) : undefined;
        const { error: addError } = await db.from('learning_sessions').insert({ user_id: userId, session_type: 'analytics', source: platform,
          content: { event: 'family_fact', fact, speaker: speaker || undefined, private: item.private ? true : undefined, until } });
        if (addError) throw addError;
        known.push(fact);
        added++;
      }
      if (added || retired) console.log(`[memory] shared ${added} fact(s), corrected ${retired}, from ${platform}`);
      return json({ linked: true, added, retired });
    }
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
        .not('content->>user_message', 'ilike', '%quiero empezar la clase%')
        .or('content->>speaker.is.null,content->>speaker.neq.parent'); // 2 Nov 2026: a parent's turn earns no star (twin of Classroom.tsx)
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
          src: String(r.source ?? 'web'),
          // 3 Nov 2026: the class unit + skills of this turn (espaluz-chat class_label), for the parent report.
          unit: String(r.content?.class_label ?? '').slice(0, 260) })) });
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
