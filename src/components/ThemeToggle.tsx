import React from 'react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          if (theme === 'light') setTheme('dark');
          else if (theme === 'dark') setTheme('system');
          else setTheme('light');
        }}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg
          bg-secondary hover:bg-accent transition-colors border border-border"
        aria-label={`Theme actuel: ${theme}. Cliquez pour changer.`}
        title={`Mode: ${theme === 'system' ? 'systeme' : theme === 'dark' ? 'sombre' : 'clair'}`}
      >
        {/* Soleil */}
        <svg
          className={`w-4 h-4 absolute transition-all duration-300 ${
            isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
          }`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        {/* Lune */}
        <svg
          className={`w-4 h-4 absolute transition-all duration-300 ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
          }`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        {/* Indicateur systeme */}
        {theme === 'system' && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
        )}
      </button>
    </div>
  );
}

export default ThemeToggle;
