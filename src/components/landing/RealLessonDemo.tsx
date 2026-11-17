import { useTranslation } from 'react-i18next';
import classShot from '@/assets/demo/class.webp';
import chatEn from '@/assets/demo/chat-en.webp';
import chatEs from '@/assets/demo/chat-es.webp';
import chatRu from '@/assets/demo/chat-ru.webp';
import yearEn from '@/assets/demo/year-en.webp';
import yearEs from '@/assets/demo/year-es.webp';
import yearRu from '@/assets/demo/year-ru.webp';

/*
 * 17 Nov 2026 - "How EspaLuz works": a 3-step roadmap, each step one REAL screen of the live app + one line (Elena chose
 * a roadmap for the page and a film for promotion; open, never folded). Andy's funnel guide: "Process - make it feel easy,
 * explain how it works in 3 simple steps". Every reader in every test asked "is it an app, a website or a chat?".
 * Screens: taken 17 Nov 2026 with a temporary test family (parent "Ana", child "Sofi", 6, Panamá), deleted right after -
 * no real person in them. Step 1 shows the web chat (its line says "WhatsApp, Telegram or the web"); Elena's own
 * WhatsApp/Telegram screenshots replace it when they arrive. Nothing is mocked up.
 */
export const RealLessonDemo = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ru') ? 'ru' : i18n.language?.startsWith('es') ? 'es' : 'en';
  const steps = [
    { src: { en: chatEn, es: chatEs, ru: chatRu }[lang], title: t('demo.s1'), line: t('demo.s1Line'), alt: t('demo.chatAlt') },
    { src: classShot, title: t('demo.s2'), line: t('demo.s2Line'), alt: t('demo.classAlt') },
    { src: { en: yearEn, es: yearEs, ru: yearRu }[lang], title: t('demo.s3'), line: t('demo.s3Line'), alt: t('demo.yearAlt') },
  ];
  return (
    <div className="mx-auto max-w-5xl">
      <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
        {steps.map((s, i) => (
          <li key={i} className="flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-3 md:min-h-[3.5rem]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground shadow">{i + 1}</span>
              <h3 className="text-left text-lg font-semibold leading-snug text-foreground md:text-xl">{s.title}</h3>
            </div>
            {/* A phone-shaped window onto the real screen; the bottom fades out instead of cutting text mid-line. */}
            <div className="relative w-[240px] overflow-hidden rounded-[2rem] border-[6px] border-foreground/85 bg-card shadow-xl md:w-[230px]" style={{ height: 380 }}>
              <img src={s.src} alt={s.alt} loading="lazy" decoding="async" className="block h-auto w-full" />
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
            </div>
            <p className="mt-4 max-w-xs text-base leading-relaxed text-muted-foreground">{s.line}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-center text-xs text-muted-foreground">{t('demo.note')}</p>
    </div>
  );
};
