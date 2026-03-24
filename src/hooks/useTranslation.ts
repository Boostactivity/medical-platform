import { useState, useEffect, useCallback } from 'react';
import { translations, getLocale, setLocale as setStoredLocale, type Locale } from '../i18n';
import { branding } from '../config/branding';

/**
 * Resolve a dot-separated key path in a nested object.
 * e.g. t('nav.home') reads translations[locale].nav.home
 */
function resolve(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return path; // fallback: return the key itself
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current === 'string') return current;
  if (Array.isArray(current)) return current as unknown as string; // arrays are returned as-is by the caller
  return path;
}

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<Locale>;
      setLocaleState(customEvent.detail);
    };
    window.addEventListener('locale-changed', handler);
    return () => window.removeEventListener('locale-changed', handler);
  }, []);

  const t = useCallback(
    (key: string, replacements?: Record<string, string>): string => {
      const dict = translations[locale] as Record<string, unknown>;
      let value = resolve(dict, key);

      // If the value is still the key, try fallback to 'fr'
      if (value === key && locale !== 'fr') {
        const fallback = translations.fr as Record<string, unknown>;
        value = resolve(fallback, key);
      }

      // Replace {app.name} style placeholders with branding values
      if (typeof value === 'string') {
        value = value.replace(/\{brand\.name\}/g, branding.name);
        value = value.replace(/\{brand\.tagline\}/g, branding.tagline);

        // Apply custom replacements
        if (replacements) {
          for (const [rKey, rVal] of Object.entries(replacements)) {
            value = value.replace(new RegExp(`\\{${rKey}\\}`, 'g'), rVal);
          }
        }
      }

      return value;
    },
    [locale]
  );

  /**
   * Get an array value from translations (e.g. engagement items).
   */
  const tArray = useCallback(
    (key: string): string[] => {
      const dict = translations[locale] as Record<string, unknown>;
      const parts = key.split('.');
      let current: unknown = dict;
      for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object') {
          return [];
        }
        current = (current as Record<string, unknown>)[part];
      }
      if (Array.isArray(current)) return current as string[];
      return [];
    },
    [locale]
  );

  const changeLocale = useCallback((newLocale: Locale) => {
    setStoredLocale(newLocale);
  }, []);

  return { t, tArray, locale, changeLocale };
}
