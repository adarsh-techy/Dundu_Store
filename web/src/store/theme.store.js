import { create } from 'zustand';

export const isGenzyMatch = (slug = '', name = '') => {
  const s = String(slug || '').toLowerCase();
  const n = String(name || '').toLowerCase();
  return s.includes('genz') || n.includes('genz');
};

const THEME_PROPERTIES = [
  '--color-primary',
  '--color-primary-soft',
  '--color-primary-deep',
  '--color-bg',
  '--color-surface',
  '--color-card',
  '--color-elevated',
  '--color-line',
  '--color-line-strong',
  '--shadow-glow',
  '--shadow-glow-color',
  '--logo-glow',
  '--pink-glow',
];

export const applyCategoryTheme = (themeColor, themeBgColor) => {
  if (!themeColor) {
    clearCategoryTheme();
    return;
  }
  const root = document.documentElement;
  root.setAttribute('data-theme', 'custom');

  const bg = themeBgColor || '#060609';

  root.style.setProperty('--color-primary', themeColor);
  root.style.setProperty('--color-primary-soft', themeColor);
  root.style.setProperty('--color-primary-deep', themeColor);
  root.style.setProperty('--color-bg', bg);
  root.style.setProperty('--color-surface', bg);
  root.style.setProperty('--color-card', bg);
  root.style.setProperty('--color-elevated', bg);
  root.style.setProperty('--color-line', `${themeColor}2e`);
  root.style.setProperty('--color-line-strong', `${themeColor}4d`);
  root.style.setProperty('--shadow-glow', `0 10px 40px -10px ${themeColor}88`);
  root.style.setProperty('--shadow-glow-color', `${themeColor}b3`);
  root.style.setProperty('--logo-glow', `${themeColor}88`);
  root.style.setProperty('--pink-glow', `${themeColor}26`);
};

export const clearCategoryTheme = () => {
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  THEME_PROPERTIES.forEach((prop) => root.style.removeProperty(prop));
};

const useThemeStore = create((set) => ({
  overrideCategory: null,
  setOverrideCategory: (catOrSlug) => set({ overrideCategory: catOrSlug }),
}));

export default useThemeStore;
