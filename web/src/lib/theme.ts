export type Theme = 'dark';

export function getStoredTheme(): Theme {
  return 'dark';
}

export function applyTheme(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

export function toggleTheme(): Theme {
  applyTheme();
  return 'dark';
}
