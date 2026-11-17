import { useTranslation } from 'react-i18next';
import classShot from '@/assets/demo/class.webp';
import chatEn from '@/assets/demo/chat-en.webp';
import chatEs from '@/assets/demo/chat-es.webp';
import chatRu from '@/assets/demo/chat-ru.webp';
import yearEn from '@/assets/demo/year-en.webp';
import yearEs from '@/assets/demo/year-es.webp';
import yearRu from '@/assets/demo/year-ru.webp';

/*
 * 17 Nov 2026 - "See a real lesson" (Andy's funnel guide: hero -> short demo; Elena approved with a temporary test family).
 * Every reader in every test asked "is it an app, a website or a chat?". These are REAL screens of the live app, taken
 * 17 Nov 2026 with a temporary test family (parent "Ana", child "Sofi", 6, Panamá) that was deleted right after - no
 * real person in them: Pere & Titi's first-grade class (Unit 1 of 12), a grown-up chat (a note to the teacher + an
 * English correction), and the family's first year in Panamá from the checked country guide. Nothing is mocked up.
 * Phones: swipe sideways; wider screens: three in a row.
 */
export const RealLessonDemo = ({ bare = false }: { bare?: boolean }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ru') ? 'ru' : i18n.language?.startsWith('es') ? 'es' : 'en';
  const shots = [
    { src: classShot, caption: t('demo.class'), alt: t('demo.classAlt') },
    { src: { en: chatEn, es: chatEs, ru: chatRu }[lang], caption: t('demo.chat'), alt: t('demo.chatAlt') },
    { src: { en: yearEn, es: yearEs, ru: yearRu }[lang], caption: t('demo.year'), alt: t('demo.yearAlt') },
  ];
  return (
    <section aria-label={t('demo.title')} className={bare ? 'pt-1' : 'mx-auto mb-10 max-w-5xl px-4'}>
      {!bare && <h2 className="mb-1 text-xl font-bold text-foreground md:text-2xl">{t('demo.title')}</h2>}
      <p className="mb-4 text-sm text-muted-foreground">{t('demo.note')}</p>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {shots.map((s) => (
          <figure key={s.caption} className="w-[72%] shrink-0 snap-center md:w-auto">
            <div className="h-[420px] overflow-hidden rounded-3xl border border-border bg-card shadow-md md:h-[480px]">
              <img src={s.src} alt={s.alt} loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
            </div>
            <figcaption className="mt-2 text-sm font-medium text-foreground">{s.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};
