import { useEffect, useState } from 'react';
import { Sun, Moon } from '@/components/icons';
import { getStoredTheme, toggleTheme, type Theme } from '@/lib/theme';

export type ToggleProps = {
  className?: string;
};

export function Toggle({ className = '' }: ToggleProps) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const handleToggle = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  return (
    <button
      onClick={handleToggle}
      className={`liquid-glass h-10 w-10 rounded-full flex items-center justify-center text-[var(--fg)] transition-opacity hover:opacity-80 ${className}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      type="button"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
}

