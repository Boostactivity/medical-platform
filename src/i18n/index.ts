import fr from './fr.json';
import en from './en.json';
import es from './es.json';

export type Locale = 'fr' | 'en' | 'es';

export const locales: Record<Locale, string> = {
  fr: 'Francais',
  en: 'English',
  es: 'Espanol',
};

export const translations: Record<Locale, Record<string, unknown>> = {
  fr,
  en,
  es,
};

export const defaultLocale: Locale = 'fr';

export function getLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  const stored = localStorage.getItem('locale') as Locale | null;
  if (stored && stored in translations) return stored;
  return defaultLocale;
}

export function setLocale(locale: Locale): void {
  localStorage.setItem('locale', locale);
  window.dispatchEvent(new CustomEvent('locale-changed', { detail: locale }));
}
