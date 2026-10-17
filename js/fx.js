// Small shared effects: Pip's speech bubble, toasts and star sparks.

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let bubbleTimer = 0;
let defaultLine = () => "hi! i'm pip ♡";

/** Lets other modules decide what Pip says when idle (e.g. asleep in day mode). */
export function setDefaultLine(fn) { defaultLine = fn; }

/** Pip says something; after `hold` ms the bubble returns to the default line. */
export function say(text, hold = 2600) {
  const bubble = document.getElementById('pipBubble');
  if (!bubble) return;
  bubble.textContent = text;
  bubble.classList.remove('is-pop');
  void bubble.offsetWidth; // restart the pop animation
  bubble.classList.add('is-pop');
  clearTimeout(bubbleTimer);
  if (hold > 0) bubbleTimer = setTimeout(() => { bubble.textContent = defaultLine(); }, hold);
}

let toastTimer = 0;
export function toast(text, hold = 3600) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), hold);
}

/** Burst of little stars from a viewport point. */
export function sparks(x, y, { count = 18, spread = 140, chars = ['★', '✦', '♡', '✧'], colors = ['#ffd27a', '#ff9fbd', '#c9b6f2', '#fff'] } = {}) {
  if (reducedMotion.matches) count = Math.min(count, 6);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    const angle = Math.random() * Math.PI * 2;
    const dist = spread * (0.4 + Math.random() * 0.8);
    s.className = 'spark';
    s.textContent = chars[i % chars.length];
    s.style.setProperty('--x0', `${x}px`);
    s.style.setProperty('--y0', `${y}px`);
    s.style.setProperty('--x1', `${x + Math.cos(angle) * dist}px`);
    s.style.setProperty('--y1', `${y + Math.sin(angle) * dist - 30}px`);
    s.style.setProperty('--sz', `${12 + Math.random() * 16}px`);
    s.style.setProperty('--c', colors[i % colors.length]);
    s.style.setProperty('--rot', `${(Math.random() - 0.5) * 540}deg`);
    s.style.setProperty('--dur', `${0.8 + Math.random() * 0.7}s`);
    s.addEventListener('animationend', () => s.remove(), { once: true });
    frag.appendChild(s);
  }
  document.body.appendChild(frag);
}

export function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
