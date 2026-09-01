import React, { createContext, useContext, useState, useEffect } from 'react';
import arTranslations from '../translations/ar.json';
import enTranslations from '../translations/en.json';

const I18nContext = createContext();

const translations = {
  ar: arTranslations,
  en: enTranslations
};

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('sejel_lang') || 'ar';
  });

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem('sejel_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    if (lang === 'ar') {
      document.body.classList.remove('font-roboto');
      document.body.classList.add('font-cairo');
    } else {
      document.body.classList.remove('font-cairo');
      document.body.classList.add('font-roboto');
    }
  }, [lang, dir]);

  const t = (keyPath, fallback = '') => {
    try {
      const keys = keyPath.split('.');
      let current = translations[lang] || translations.ar;
      for (const k of keys) {
        if (current[k] === undefined) {
          // Fallback to ar or raw key
          let fb = translations.ar;
          for (const fbk of keys) {
            fb = fb ? fb[fbk] : undefined;
          }
          return fb !== undefined ? fb : (fallback || keyPath);
        }
        current = current[k];
      }
      return current;
    } catch {
      return fallback || keyPath;
    }
  };

  const toggleLang = () => {
    setLang(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, dir, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
