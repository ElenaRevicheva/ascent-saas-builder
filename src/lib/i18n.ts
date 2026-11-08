import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';
import ru from './locales/ru.json';

const resources = {
  en: {
    translation: en
  },
  es: {
    translation: es
  },
  ru: {
    translation: ru
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // 8 Nov 2026: lng 'en' was forced here, so a family that chose Русский lost it on every reload. Now the choice
    // saved in this browser wins; anyone who never chose still gets English, exactly as before.
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'ru'],
    nonExplicitSupportedLngs: true,
    debug: false,

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'espaluz-lang', // fresh key: the old one also held auto-detected browser languages
      caches: ['localStorage'],
    }
  });

export default i18n;