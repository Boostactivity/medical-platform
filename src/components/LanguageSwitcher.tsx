import { useTranslation } from '../hooks/useTranslation';
import type { Locale } from '../i18n';

const flags: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
  es: 'ES',
};

export function LanguageSwitcher() {
  const { locale, changeLocale } = useTranslation();

  const locales: Locale[] = ['fr', 'en', 'es'];

  return (
    <div className="inline-flex items-center gap-1 bg-[#f1f5f9] rounded-full p-1">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => changeLocale(loc)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
            locale === loc
              ? 'bg-white text-[#3b82f6] shadow-sm'
              : 'text-[#64748b] hover:text-[#1a2b3c]'
          }`}
          aria-label={`Switch to ${flags[loc]}`}
        >
          {flags[loc]}
        </button>
      ))}
    </div>
  );
}
