// Side quest · Sparkle cursor trail.
// A full-screen canvas (clicks pass straight through) draws little four-point
// sparkles behind the pointer. Colours follow day / night / chaos mode.
// Skipped inside the Lights-Out room and the game, and for reduced-motion visitors.

const PALETTES = {
  night: ['#ffd27a', '#ff9fbd', '#c9b6f2', '#ffffff'],
  day: ['#e2a23b', '#a34063', '#d77a9c', '#f3b7c8'],
};
const MAX = 140;

export function initSparkles() {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'sparkles';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let dpr = 1;
  let parts = [];
  let last = null;
  let raf = 0;
  let prev = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  const chaos = () => document.documentElement.classList.contains('chaos');
  function colour() {
    if (chaos()) return `hsl(${Math.floor(Math.random() * 360)} 95% 70%)`;
    const set = PALETTES[document.documentElement.dataset.theme === 'day' ? 'day' : 'night'];
    return set[Math.floor(Math.random() * set.length)];
  }

  function spawn(x, y, n, burst = false) {
    for (let i = 0; i < n && parts.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = burst ? 1.2 + Math.random() * 2.2 : 0.15 + Math.random() * 0.5;
      parts.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed + (burst ? 0 : 0.35), // trail sparkles drift down, like falling glitter
        size: (burst ? 4 : 3) + Math.random() * (chaos() ? 8 : 5),
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2,
        life: 1,
        decay: 0.012 + Math.random() * 0.014,
        c: colour(),
      });
    }
    if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame); }
  }

  function sparkle(p) {
    const s = p.size * (0.5 + p.life * 0.5);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.c;
    ctx.shadowColor = p.c;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(0, 0, s, 0);
    ctx.quadraticCurveTo(0, 0, 0, s);
    ctx.quadraticCurveTo(0, 0, -s, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s);
    ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    const k = Math.min(3, (now - prev) / 16.7);
    prev = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.x += p.vx * k; p.y += p.vy * k;
      p.vx *= 0.97; p.rot += p.spin * k;
      p.life -= p.decay * k;
      sparkle(p);
    }
    parts = parts.filter((p) => p.life > 0);
    raf = parts.length ? requestAnimationFrame(frame) : 0;
    if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  const blocked = (t) => calm.matches || (t instanceof Element && t.closest('.room, .game'));

  window.addEventListener('pointermove', (e) => {
    if (blocked(e.target)) { last = null; return; }
    if (!last) { last = { x: e.clientX, y: e.clientY }; return; }
    const d = Math.hypot(e.clientX - last.x, e.clientY - last.y);
    if (d < 12) return;
    spawn(e.clientX, e.clientY, chaos() ? 3 : d > 40 ? 2 : 1);
    last = { x: e.clientX, y: e.clientY };
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    if (!blocked(e.target)) spawn(e.clientX, e.clientY, chaos() ? 14 : 7, true);
  }, { passive: true });
}