import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ar from './ar.json';
import en from './en.json';

const LANG_KEY = 'app_language';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en }
    },
    fallbackLng: 'ar',
    lng: localStorage.getItem(LANG_KEY) || 'ar',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: LANG_KEY,
      caches: ['localStorage']
    },
    react: {
      useSuspense: false
    }
  });

// Helper: get current direction
export function getDirection() {
  return i18n.language === 'ar' ? 'rtl' : 'ltr';
}

// Helper: is RTL
export function isRTL() {
  return i18n.language === 'ar';
}

// Helper: change language and persist
export function changeLanguage(lang) {
  localStorage.setItem(LANG_KEY, lang);
  i18n.changeLanguage(lang);
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

// Set initial direction
document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;

export default i18n;
