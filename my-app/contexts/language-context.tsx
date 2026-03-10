import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import i18n, { setI18nLocale, type SupportedLocale } from '@/lib/i18n';

const STORAGE_KEY = '@nutrinav_language';

const LanguageContext = createContext<{
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && (stored === 'en' || stored === 'es' || stored === 'fr')) {
          setLocaleState(stored as SupportedLocale);
          setI18nLocale(stored as SupportedLocale);
        } else {
          const deviceLocale = Localization.getLocales()[0]?.languageCode;
          const supported: SupportedLocale[] = ['en', 'es', 'fr'];
          const matched = supported.find((s) => deviceLocale?.startsWith(s)) ?? 'en';
          setLocaleState(matched);
          setI18nLocale(matched);
        }
        setLoaded(true);
      })
      .catch(() => {
        setI18nLocale('en');
        setLoaded(true);
      });
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    setI18nLocale(newLocale);
    AsyncStorage.setItem(STORAGE_KEY, newLocale).catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded) {
      setI18nLocale(locale);
    }
  }, [locale, loaded]);

  const t = useCallback((key: string, options?: object) => i18n.t(key, options), []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
