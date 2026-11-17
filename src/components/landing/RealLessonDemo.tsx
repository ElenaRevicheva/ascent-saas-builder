import { useTranslation } from 'react-i18next';
import waQ from '@/assets/demo/wa-q2.webp';
import waTeacher from '@/assets/demo/wa-teacher.webp';
import tgAhorita from '@/assets/demo/tg-ahorita.webp';
import tgPhoto from '@/assets/demo/tg-photo.webp';
import tgClassButtons from '@/assets/demo/tg-class-buttons.webp';
import waMenu from '@/assets/demo/wa-menu.webp';
import classStart from '@/assets/demo/class-start.webp';
import classShot from '@/assets/demo/class.webp';
import classTools from '@/assets/demo/class-tools.webp';
import yearEn from '@/assets/demo/year-en.webp';
import yearEs from '@/assets/demo/year-es.webp';
import yearRu from '@/assets/demo/year-ru.webp';
import weekEn from '@/assets/demo/week-en.webp';
import weekEs from '@/assets/demo/week-es.webp';
import weekRu from '@/assets/demo/week-ru.webp';
import lessonsEn from '@/assets/demo/lessons-en.webp';
import lessonsEs from '@/assets/demo/lessons-es.webp';
import lessonsRu from '@/assets/demo/lessons-ru.webp';
import videoEn from '@/assets/demo/video-en.webp';
import videoEs from '@/assets/demo/video-es.webp';
import videoRu from '@/assets/demo/video-ru.webp';

/*
 * 17 Nov 2026 - "How EspaLuz works": a 3-step roadmap, each step a full-width row of REAL screens (Elena: "the roadmap
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

const SERIF = { fontFamily: '"Newsreader", "Iowan Old Style", Georgia, serif' };

export const RealLessonDemo = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ru') ? 'ru' : i18n.language?.startsWith('es') ? 'es' : 'en';
  const pick = (m: Record<'en' | 'es' | 'ru', string>) => m[lang];
  const steps: { title: string; line: string; shots: Shot[] }[] = [
    { title: t('demo.s1'), line: t('demo.s1Line'), shots: [
      // 17 Nov 2026: Elena's own WhatsApp + Telegram chats from that afternoon, cropped so no name shows.
      { src: waQ, cap: t('demo.c.wa'), alt: t('demo.waAlt'), bg: '#f4f2ea' },
      { src: waTeacher, cap: t('demo.c.teacher'), alt: t('demo.c.teacher'), bg: '#f4f2ea' },
      { src: tgAhorita, cap: t('demo.c.tgWords'), alt: t('demo.c.tgWords'), bg: '#bfe3c8' },
      { src: tgPhoto, cap: t('demo.c.photo'), alt: t('demo.c.photo'), bg: '#bfe3c8' },
      { src: waMenu, cap: t('demo.c.waMenu'), alt: t('demo.c.waMenu'), bg: '#f4f2ea' },
    ] },
    { title: t('demo.s2'), line: t('demo.s2Line'), shots: [
      { src: tgClassButtons, cap: t('demo.c.oneTap'), alt: t('demo.c.oneTap'), bg: '#bfe3c8' }, // Elena's Telegram: the class is one tap from the chat
      { src: classStart, cap: t('demo.c.start'), alt: t('demo.c.start'), fill: true },
      { src: classShot, cap: t('demo.c.class'), alt: t('demo.classAlt') },
      { src: classTools, cap: t('demo.c.tools'), alt: t('demo.c.tools'), fill: true },
    ] },
    { title: t('demo.s3'), line: t('demo.s3Line'), shots: [
      { src: pick({ en: yearEn, es: yearEs, ru: yearRu }), cap: t('demo.c.year'), alt: t('demo.yearAlt') },
      { src: pick({ en: weekEn, es: weekEs, ru: weekRu }), cap: t('demo.c.week'), alt: t('demo.c.week') },
      { src: pick({ en: lessonsEn, es: lessonsEs, ru: lessonsRu }), cap: t('demo.c.lessons'), alt: t('demo.c.lessons') },
      { src: pick({ en: videoEn, es: videoEs, ru: videoRu }), cap: t('demo.c.video'), alt: t('demo.c.video') },
    ] },
  ];
  return (
    <div className="mx-auto max-w-6xl">
      <ol className="space-y-14 md:space-y-16">
        {steps.map((s, i) => (
          <li key={i} className="grid items-center gap-6 lg:grid-cols-[240px_1fr] lg:gap-8">
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
                <figure key={k} className="w-[180px] shrink-0 snap-start sm:w-[190px] lg:w-[158px]">
                  <div className="relative h-[360px] overflow-hidden rounded-[1.6rem] border-[5px] border-foreground/85 bg-card shadow-lg lg:h-[316px]" style={{ background: sh.bg }}>
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
