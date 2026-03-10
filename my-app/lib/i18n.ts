import en from '@/locales/en';
import es from '@/locales/es';
import fr from '@/locales/fr';

const translations: Record<string, Record<string, unknown>> = { en, es, fr };

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function interpolate(str: string, options?: Record<string, unknown>): string {
  if (!options) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(options[key] ?? ''));
}

let currentLocale: string = 'en';

export type SupportedLocale = 'en' | 'es' | 'fr';

export const SUPPORTED_LOCALES: { code: SupportedLocale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

export function setI18nLocale(locale: SupportedLocale) {
  currentLocale = locale;
}

export function getI18nLocale(): SupportedLocale {
  if (currentLocale === 'es' || currentLocale === 'fr') return currentLocale;
  return 'en';
}

export function t(key: string, options?: Record<string, unknown>): string {
  const localeData = translations[currentLocale] ?? translations.en;
  let value = getNested(localeData, key);
  if (value === undefined) {
    value = getNested(translations.en, key);
  }
  if (typeof value !== 'string') return key;
  return interpolate(value, options);
}

const i18n = { t };
export default i18n;
