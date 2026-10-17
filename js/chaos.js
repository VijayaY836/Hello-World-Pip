// Side quest · Responsive Chaos Mode 🌀
// Turns the homepage into a full 1999 personal site, and the chaos *reshapes to the screen*:
//  · the viewport's shape (tiny / tall / normal / wide) picks a chaos personality
//  · sticker count scales with screen area, windows re-tilt on every resize
//  · a live "best viewed at W×H" badge, and a bouncing Pip screensaver that
//    ricochets off whatever edges your screen has.
// Stickers never take clicks, tilts stay small, so everything still works.

import { plink, chime } from './audio.js';
import { sparks, toast } from './fx.js';

const STORE_KEY = 'pip-chaos';
const STICKERS = [
  '🚧 UNDER CONSTRUCTION 🚧', 'NEW!', '★ HOT ★', 'pip was here ♡', '💾 bookmark me!',
  'cool site award 1999', 'best viewed in Dreamscape 4.0', '🌙 web ring member', 'sign my guestbook!',
  '✉ e-mail pip', 'no nightmares allowed', 'made on a 56k modem', '🔊 turn up ur speakers', 'zzz…',
];
const SHAPES = {
  tiny: 'tiny mode 🐭', tall: 'tall mode 📱', normal: 'desktop mode 🖥️', wide: 'ultra-wide mode 🛸',
};

const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
const rand = (a, b) => a + Math.random() * (b - a);

export function initChaos() {
  const btn = document.getElementById('chaosBtn');
  if (!btn) return;
  const root = document.documentElement;
  let layer = null;
  let bouncer = null;
  let raf = 0;
  let resizeTimer = 0;

  function shapeOf(w, h) {
    if (w < 420) return 'tiny';
    if (w / h < 0.8) return 'tall';
    if (w / h > 2) return 'wide';
    return 'normal';
  }

  function reshape() {
    if (!layer) return; // chaos was switched off while a resize was pending
    const W = innerWidth, H = innerHeight;
    const shape = shapeOf(W, H);
    root.dataset.shape = shape;

    // Re-tilt every window and title, scaled to the screen so phones stay readable.
    const maxTilt = shape === 'tiny' ? 2.2 : shape === 'tall' ? 3 : 4.5;
    document.querySelectorAll('.nfo, .card, .bubble, .sec__head h2, .work__head h2, .b88, .odo, .foot__bye').forEach((el) => {
      el.style.setProperty('--tilt', `${rand(-maxTilt, maxTilt).toFixed(2)}deg`);
    });
    root.style.setProperty('--marquee-speed', `${Math.max(8, W / 60)}s`);

    // Stickers peek in from the edges: more screen, more chaos.
    layer.querySelectorAll('.sticker-x').forEach((s) => s.remove());
    const count = Math.max(3, Math.min(14, Math.round((W * H) / 110000)));
    const pool = [...STICKERS].sort(() => Math.random() - 0.5).slice(0, count);
    pool.forEach((text, i) => {
      const s = document.createElement('span');
      s.className = 'sticker-x';
      s.textContent = text;
      const left = i % 2 === 0;
      s.style.top = `${rand(10, 90).toFixed(1)}%`;
      s.style[left ? 'left' : 'right'] = `${rand(-4, shape === 'tiny' ? 0 : 2).toFixed(1)}%`;
      s.style.setProperty('--r', `${rand(-18, 18).toFixed(1)}deg`);
      s.style.setProperty('--hue', String(Math.floor(rand(0, 360))));
      s.style.animationDelay = `${rand(0, 2).toFixed(2)}s`;
      layer.appendChild(s);
    });

    const badge = layer.querySelector('.dims-x');
    badge.innerHTML = `best viewed at <b>${W}×${H}</b><br>(that's you!) · ${SHAPES[shape]}`;
  }

  function startBouncer() {
    bouncer = document.createElement('button');
    bouncer.type = 'button';
    bouncer.className = 'chaos-pip';
    bouncer.setAttribute('aria-label', 'Bouncing Pip screensaver. Catch it!');
    bouncer.innerHTML = '<img src="assets/pip-cloud.webp" width="587" height="781" alt="" />';
    layer.appendChild(bouncer);
    const pos = { x: rand(0, innerWidth - 80), y: rand(60, innerHeight - 110) };
    const vel = { x: rand(1.4, 2.2) * (Math.random() < 0.5 ? -1 : 1), y: rand(1.2, 2) * (Math.random() < 0.5 ? -1 : 1) };
    let hue = 0;
    const place = () => { bouncer.style.transform = `translate(${pos.x}px, ${pos.y}px)`; bouncer.style.setProperty('--hue', `${hue}deg`); };
    place();
    if (calm.matches) return;
    const step = () => {
      const w = bouncer.offsetWidth, h = bouncer.offsetHeight;
      const maxX = innerWidth - w, maxY = innerHeight - h, minY = 56;
      pos.x += vel.x; pos.y += vel.y;
      let hitX = false, hitY = false;
      if (pos.x <= 0 || pos.x >= maxX) { vel.x *= -1; pos.x = Math.max(0, Math.min(maxX, pos.x)); hitX = true; }
      if (pos.y <= minY || pos.y >= maxY) { vel.y *= -1; pos.y = Math.max(minY, Math.min(maxY, pos.y)); hitY = true; }
      if (hitX || hitY) hue = (hue + 67) % 360;               // change colour on every bounce, like the DVD logo
      if (hitX && hitY) { sparks(pos.x + w / 2, pos.y + h / 2, { count: 24, spread: 160 }); toast('✨ CORNER! ✨', 1600); }
      place();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    bouncer.addEventListener('click', () => {
      const r = bouncer.getBoundingClientRect();
      sparks(r.left + r.width / 2, r.top + r.height / 2, { count: 30, spread: 180 });
      chime();
      toast('you caught Pip! ♡ (pip will escape again)', 2200);
      vel.x *= -1.15; vel.y *= 1.15;
    });
  }

  function apply(on, announce) {
    root.classList.toggle('chaos', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Turn off chaos mode' : 'Turn on chaos mode');
    btn.querySelector('.ctrl__label').textContent = on ? 'calm' : 'chaos';
    btn.querySelector('.ctrl__icon').textContent = on ? '🧘' : '🌀';
    try { localStorage.setItem(STORE_KEY, on ? '1' : '0'); } catch { /* storage unavailable */ }

    cancelAnimationFrame(raf);
    clearTimeout(resizeTimer);
    layer?.remove();
    layer = null;
    if (on) {
      layer = document.createElement('div');
      layer.className = 'chaos-layer';
      layer.innerHTML = '<span class="dims-x" aria-live="polite"></span><div class="side-marquee-x" aria-hidden="true"><span>★ pip ★ dreams ★ lullabies ★ zzz ★ pip ★ dreams ★ lullabies ★ zzz ★</span></div>';
      document.body.appendChild(layer);
      reshape();
      startBouncer();
    } else {
      document.querySelectorAll('[style*="--tilt"]').forEach((el) => el.style.removeProperty('--tilt'));
      delete root.dataset.shape;
    }
    if (announce) {
      plink(on ? 1.4 : 0.7);
      toast(on ? '🌀 CHAOS MODE: welcome to 1999! (resize your window…)' : '🧘 calm restored.', 2600);
    }
  }

  btn.addEventListener('click', () => apply(!root.classList.contains('chaos'), true));
  window.addEventListener('resize', () => {
    if (!root.classList.contains('chaos')) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reshape, 150);
  });

  let saved = false;
  try { saved = localStorage.getItem(STORE_KEY) === '1'; } catch { /* storage unavailable */ }
  if (saved) apply(true, false);
}