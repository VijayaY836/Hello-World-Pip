// Day / night toggle. Night: Pip is awake and working. Day: Pip is asleep (night shift).

import { icon } from './icons.js';

const STORE_KEY = 'pip-theme';
const META_COLORS = { night: '#15123a', day: '#fff8f1' };

export function initTheme({ button, onChange }) {
  let theme = 'night';
  try { theme = localStorage.getItem(STORE_KEY) === 'day' ? 'day' : 'night'; } catch { /* storage unavailable */ }

  function apply(next, announce) {
    theme = next;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[theme]);
    const isDay = theme === 'day';
    button.setAttribute('aria-pressed', String(isDay));
    button.setAttribute('aria-label', isDay ? 'Switch to night mode' : 'Switch to day mode');
    button.querySelector('.ctrl__icon').innerHTML = icon(isDay ? 'moon' : 'sun');
    button.querySelector('.ctrl__label').textContent = isDay ? 'night' : 'day';
    try { localStorage.setItem(STORE_KEY, theme); } catch { /* storage unavailable */ }
    if (announce) onChange?.(theme);
  }

  button.addEventListener('click', () => apply(theme === 'day' ? 'night' : 'day', true));
  apply(theme, false);
  return { get current() { return theme; } };
}