'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import translations from './translations.json';

type Language = 'ar' | 'fr' | 'en';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (typeof acc === 'object' && acc !== null && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return path;
  }, obj) as string;
}

export function I18nProvider({ children, defaultLanguage = 'en' }: { children: ReactNode; defaultLanguage?: Language }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wassel-language', lang);
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const langData = translations[language] as Record<string, unknown>;
      let value = getNestedValue(langData, key);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return value;
    },
    [language]
  );

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}
