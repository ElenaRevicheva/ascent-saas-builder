import { useTranslation } from 'react-i18next';
import chatEn from '@/assets/demo/chat-en.webp';
import chatEs from '@/assets/demo/chat-es.webp';
import chatRu from '@/assets/demo/chat-ru.webp';
// 19 Nov 2026 (Elena): the class step talks about Pere and Titi, so the picture shows THEM opening the class (live classroom,
// 19 Nov; the frame holds the duo-hello clip that was playing). The EspaLuz drop-in picture stays in the repo.
import classEspaluz from '@/assets/demo/class-pere-titi.webp';
import classTiti from '@/assets/demo/class-titi.webp';
import classReading from '@/assets/demo/class-reading.webp';
import classCounting from '@/assets/demo/class-counting.webp';
import practiceShot from '@/assets/demo/practice.webp';
import setupMapEn from '@/assets/demo/setup-map-en.webp';
import setupMapEs from '@/assets/demo/setup-map-es.webp';
import setupMapRu from '@/assets/demo/setup-map-ru.webp';
import setupQuestEn from '@/assets/demo/setup-quest-en.webp';
import setupQuestEs from '@/assets/demo/setup-quest-es.webp';
import setupQuestRu from '@/assets/demo/setup-quest-ru.webp';
import setupConnectEn from '@/assets/demo/setup-connect-en.webp';
import setupConnectEs from '@/assets/demo/setup-connect-es.webp';
import setupConnectRu from '@/assets/demo/setup-connect-ru.webp';
// 19 Nov 2026 (Elena): Step 1 ends with what the setup gives back - the live "Your plan this week" of a test family per language.
import setupPlanEn from '@/assets/demo/setup-plan-en.webp';
import setupPlanEs from '@/assets/demo/setup-plan-es.webp';
import setupPlanRu from '@/assets/demo/setup-plan-ru.webp';
import s1WaChat from '@/assets/demo/s1-wa-chat.webp';
import s1TgChat from '@/assets/demo/s1-tg-chat.webp';
import s1TgPhoto from '@/assets/demo/s1-tg-photo.webp';
import yearEn from '@/assets/demo/year-en.webp';
import yearEs from '@/assets/demo/year-es.webp';
import yearRu from '@/assets/demo/year-ru.webp';
import weekEn from '@/assets/demo/week-en.webp';
import weekEs from '@/assets/demo/week-es.webp';
import weekRu from '@/assets/demo/week-ru.webp';
import lessonsEn from '@/assets/demo/lessons-en.webp';
import lessonsEs from '@/assets/demo/lessons-es.webp';
import lessonsRu from '@/assets/demo/lessons-ru.webp';

/*
 * 17 Nov 2026 - "How EspaLuz works": a 4-step roadmap, each step a full-width row of REAL screens (Elena: "the roadmap
 * should take its place all over the screen"; a roadmap for the page, a film for promotion; open, never folded).
 * Andy's funnel guide: "Process - explain how it works in 3 simple steps".
 * Real screens only, nothing mocked up or edited inside a picture:
 *  - Elena's own WhatsApp + Telegram (17 Nov): a question with its Spanish/English translation, the note for the teacher,
 *    Panamanian phrases for "ahorita", a photo of a medicine leaflet read for her, and the WhatsApp menu with the new
 *    English / Spanish / both line - each cropped so that no name shows;
 *  - the live web app with a temporary test family (parent "Ana", child "Sofi", 6, Panamá), created and deleted on
 *    17 Nov (0 accounts left, checked): Pere & Titi's class, the first year, the family's week, the
 *    country lessons and the video moments.
 */
type Shot = { src: string; cap: string; alt: string; bg?: string; fill?: boolean };

// 17 Nov 2026: vision readers (Gemini looking at the real section image, EN/ES/RU personas) rated each screen. The four
// weakest by consensus (menu + buttons, invite + story, the connect code card when alone, video moments) were removed and
// the phones made bigger - all three asked to read the chats without zooming. At most 4 phones per row.
const SERIF = { fontFamily: '"Newsreader", "Iowan Old Style", Georgia, serif' };

export const RealLessonDemo = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ru') ? 'ru' : i18n.language?.startsWith('es') ? 'es' : 'en';
  const pick = (m: Record<'en' | 'es' | 'ru', string>) => m[lang];
  const steps: { title: string; line: string; shots: Shot[] }[] = [
    // 17 Nov 2026 (Elena: "the very first important step is completing the roadmap inside the dashboard - the
    // questionnaire, the family members, connecting Telegram - that switches on the brain and the memory").
    { title: t('demo.s0'), line: t('demo.s0Line'), shots: [
      { src: pick({ en: setupMapEn, es: setupMapEs, ru: setupMapRu }), cap: t('demo.c.map'), alt: t('demo.c.map') },
      { src: pick({ en: setupQuestEn, es: setupQuestEs, ru: setupQuestRu }), cap: t('demo.c.quest'), alt: t('demo.c.quest') },
      { src: pick({ en: setupConnectEn, es: setupConnectEs, ru: setupConnectRu }), cap: t('demo.c.connect'), alt: t('demo.c.connect') },
      { src: pick({ en: setupPlanEn, es: setupPlanEs, ru: setupPlanRu }), cap: t('demo.c.plan'), alt: t('demo.c.plan') },
    ] },
    { title: t('demo.s1'), line: t('demo.s1Line'), shots: [
      // 17 Nov 2026: Elena's own WhatsApp + Telegram chats, each conversation joined top to bottom in its real order into
      // one phone screen; only the lines carrying a name are left out (a thin gap marks the join).
      { src: s1WaChat, cap: t('demo.c.waChat'), alt: t('demo.waAlt'), bg: '#efeae0' },
      { src: s1TgChat, cap: t('demo.c.tgWords'), alt: t('demo.c.tgWords'), bg: '#bfe3c8' },
      { src: s1TgPhoto, cap: t('demo.c.photo'), alt: t('demo.c.photo'), bg: '#bfe3c8' },
      { src: pick({ en: chatEn, es: chatEs, ru: chatRu }), cap: t('demo.c.webChat'), alt: t('demo.chatAlt') }, // the web chat, after WhatsApp and Telegram
    ] },
    { title: t('demo.s2'), line: t('demo.s2Line'), shots: [
      // 17 Nov 2026: one real voice class (test family, 1st grade, Unit 1): EspaLuz drops into the classroom, Titi's mistake
      // for the child to fix, Pere's reading corner (syllables), counting - Pere and Titi praise the try, show the right sentence.
      { src: classEspaluz, cap: t('demo.c.espaluzClass'), alt: t('demo.c.espaluzClass') },
      { src: classTiti, cap: t('demo.c.titiGame'), alt: t('demo.c.titiGame') },
      { src: classReading, cap: t('demo.c.reading'), alt: t('demo.c.reading') },
      { src: classCounting, cap: t('demo.c.counting'), alt: t('demo.c.counting') },
    ] },
    { title: t('demo.s3'), line: t('demo.s3Line'), shots: [
      { src: pick({ en: yearEn, es: yearEs, ru: yearRu }), cap: t('demo.c.year'), alt: t('demo.yearAlt') },
      { src: pick({ en: weekEn, es: weekEs, ru: weekRu }), cap: t('demo.c.week'), alt: t('demo.c.week') },
      { src: practiceShot, cap: t('demo.c.practice'), alt: t('demo.c.practice') }, // EspaLuz plays the interviewer, face on screen
      { src: pick({ en: lessonsEn, es: lessonsEs, ru: lessonsRu }), cap: t('demo.c.lessons'), alt: t('demo.c.lessons') },
    ] },
  ];
  return (
    <div className="mx-auto max-w-6xl">
      <ol className="space-y-14 md:space-y-16">
        {steps.map((s, i) => (
          <li key={i} className="grid items-center gap-6 lg:grid-cols-[230px_1fr] lg:gap-8">
            <div className="text-left">
              <div className="flex items-end gap-3">
                <span aria-hidden className="bg-gradient-to-br from-primary to-fuchsia-500 bg-clip-text pb-1 pt-2 text-6xl leading-[1.15] text-transparent md:text-7xl" style={SERIF}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t('demo.step', { n: i + 1 })}</span>
              </div>
              <h3 className="mt-3 text-2xl leading-snug text-foreground md:text-[1.7rem]" style={SERIF}>{s.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{s.line}</p>
            </div>
            {/* Phones: a row on wide screens, swipe sideways on a phone. */}
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0">
              {s.shots.map((sh, k) => (
                <figure key={k} className="w-[200px] shrink-0 snap-start sm:w-[210px] lg:w-[196px]">
                  <div className="relative h-[400px] overflow-hidden rounded-[1.6rem] border-[5px] border-foreground/85 bg-card shadow-lg lg:h-[392px]" style={{ background: sh.bg }}>
                    <img src={sh.src} alt={sh.alt} loading="lazy" decoding="async" className={sh.fill ? "block h-full w-full object-cover object-top" : "block h-auto w-full"} />
                    {!sh.bg && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />}
                  </div>
                  <figcaption className="mt-2 text-center text-sm font-medium text-foreground/80">{sh.cap}</figcaption>
                </figure>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-10 text-center text-xs text-muted-foreground">{t('demo.note')}</p>
    </div>
  );
};
