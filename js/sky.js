// The living sky: a single lightweight canvas behind every page.
// Night: ~180 stars that each twinkle on their own rhythm, a few big four-point "sparkle" stars
// with soft glows, an occasional shooting star, and tiny dream-motes floating upward.
// Day: stars fade out (the CSS clouds take over), with a few sunny sparkles in the air.
// Runs at most ~40fps, pauses when the tab is hidden, and draws a still sky for reduced motion.

const calm = matchMedia('(prefers-reduced-motion: reduce)');
const TAU = Math.PI * 2;

export function initSky() {
  const host = document.querySelector('.sky');
  if (!host) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'sky__canvas';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = 1;
  let stars = [], sparkles = [], motes = [], shooters = [];
  let nextShooter = 3000;
  let night = 1;           // 1 = night, 0 = day (eased, so switching fades smoothly)
  let last = 0, acc = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const isNight = () => document.documentElement.dataset.theme !== 'day';

  function seed() {
    const area = W * H;
    const count = Math.round(Math.min(240, Math.max(90, area / 7000)));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.92,
      r: Math.random() < 0.85 ? rand(0.5, 1.3) : rand(1.4, 2.2),
      speed: rand(0.6, 2.2), phase: rand(0, TAU),
      hue: Math.random() < 0.2 ? 'gold' : Math.random() < 0.15 ? 'pink' : 'white',
      depth: rand(0.02, 0.12),
    }));
    sparkles = Array.from({ length: Math.max(5, Math.round(count / 22)) }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.75,
      size: rand(5, 11), speed: rand(0.5, 1.2), phase: rand(0, TAU), spin: rand(-0.15, 0.15), depth: rand(0.04, 0.1),
    }));
    motes = Array.from({ length: Math.max(10, Math.round(count / 9)) }, () => newMote(true));
  }
  function newMote(anywhere) {
    return { x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10, r: rand(1, 2.6), vy: rand(6, 16), sway: rand(0, TAU), swaySpeed: rand(0.4, 1), life: rand(0.4, 1) };
  }

  function resize() {
    dpr = 1; // stars are tiny soft dots, so standard resolution looks the same and costs far less
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    seed();
  }

  const COLORS = { white: '255,248,230', gold: '255,222,150', pink: '255,200,230' };

  // Glows are painted once into small sprites and reused every frame (much cheaper than gradients per star).
  function glowSprite(rgb, size = 64) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); const r = size / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, `rgba(${rgb},1)`); grad.addColorStop(0.25, `rgba(${rgb},.5)`); grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
    return c;
  }
  const GLOW = { white: glowSprite(COLORS.white), gold: glowSprite(COLORS.gold), pink: glowSprite(COLORS.pink), lav: glowSprite('215,195,255'), sun: glowSprite('255,214,150') };
  const SPARK = (() => {
    const size = 96, c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); const r = size / 2, s = size * 0.2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r); grad.addColorStop(0, 'rgba(255,240,210,.5)'); grad.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
    g.fillStyle = 'rgba(255,250,235,1)'; g.translate(r, r); g.beginPath();
    g.moveTo(0, -s); g.quadraticCurveTo(0, 0, s, 0); g.quadraticCurveTo(0, 0, 0, s); g.quadraticCurveTo(0, 0, -s, 0); g.quadraticCurveTo(0, 0, 0, -s); g.fill();
    return c;
  })();

  function drawSparkle(x, y, size, alpha, rot) {
    const d = size * 4.8;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot);
    ctx.drawImage(SPARK, -d / 2, -d / 2, d, d);
    ctx.restore();
  }

  function frame(now, dtMs) {
    const t = now / 1000;
    const dt = dtMs / 1000;
    night += ((isNight() ? 1 : 0) - night) * Math.min(1, dt * 2.5);
    const scroll = scrollY;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    if (night > 0.02) {
      // twinkling stars (each on its own rhythm), with a soft glow on the brighter ones
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        const a = (0.25 + 0.75 * tw) * night;
        const y = ((s.y - scroll * s.depth) % H + H) % H;
        const c = COLORS[s.hue];
        if (s.r > 1.3) { const d = s.r * 10; ctx.globalAlpha = 0.45 * a; ctx.drawImage(GLOW[s.hue], s.x - d / 2, y - d / 2, d, d); }
        ctx.globalAlpha = a; ctx.fillStyle = `rgb(${c})`;
        const rr = s.r * (0.85 + 0.25 * tw);
        if (rr < 1.2) ctx.fillRect(s.x - rr, y - rr, rr * 2, rr * 2); // tiny stars: a square looks the same as a dot, and is cheaper
        else { ctx.beginPath(); ctx.arc(s.x, y, rr, 0, TAU); ctx.fill(); }
      }
      // big four-point sparkle stars that slowly pulse and turn
      for (const sp of sparkles) {
        const pulse = 0.5 + 0.5 * Math.sin(t * sp.speed + sp.phase);
        const y = ((sp.y - scroll * sp.depth) % H + H) % H;
        drawSparkle(sp.x, y, sp.size * (0.7 + 0.45 * pulse), (0.35 + 0.65 * pulse) * night, t * sp.spin);
      }
      // the occasional shooting star
      nextShooter -= dtMs;
      if (nextShooter <= 0 && !calm.matches) {
        const fromLeft = Math.random() < 0.5;
        shooters.push({ x: fromLeft ? rand(-50, W * 0.4) : rand(W * 0.6, W + 50), y: rand(0, H * 0.35), vx: (fromLeft ? 1 : -1) * rand(520, 760), vy: rand(160, 260), life: 1 });
        nextShooter = rand(5000, 11000);
      }
      for (const sh of shooters) {
        sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt * 0.9;
        const len = 120;
        const nx = sh.vx / Math.hypot(sh.vx, sh.vy), ny = sh.vy / Math.hypot(sh.vx, sh.vy);
        const g = ctx.createLinearGradient(sh.x, sh.y, sh.x - nx * len, sh.y - ny * len);
        g.addColorStop(0, `rgba(255,250,235,${0.95 * sh.life * night})`); g.addColorStop(1, 'rgba(255,200,230,0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - nx * len, sh.y - ny * len); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,245,${sh.life * night})`;
        ctx.beginPath(); ctx.arc(sh.x, sh.y, 2.2, 0, TAU); ctx.fill();
      }
      shooters = shooters.filter((sh) => sh.life > 0);
    }

    // dream-motes drifting upward (lavender at night, sunny gold by day)
    const moteSprite = night > 0.5 ? GLOW.lav : GLOW.sun;
    for (const m of motes) {
      m.y -= m.vy * dt; m.sway += dt * m.swaySpeed;
      if (m.y < -10) Object.assign(m, newMote(false));
      const x = m.x + Math.sin(m.sway) * 14;
      const a = m.life * (0.35 + 0.35 * Math.sin(m.sway * 1.7)) * (0.55 + 0.45 * night);
      const d = m.r * 8; ctx.globalAlpha = Math.max(0, a); ctx.drawImage(moteSprite, x - d / 2, m.y - d / 2, d, d);
    }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) { last = now; return; }
    const d = Math.min(100, now - (last || now)); last = now; acc += d;
    if (acc < 32) return;         // cap at ~30fps: plenty for a gentle sky, kind to batteries
    frame(now, acc); acc = 0;
  }

  addEventListener('resize', resize);
  resize();
  // Paint a still starry sky right away, then start twinkling once the page has settled
  // (or the moment the visitor interacts), so the first load stays snappy.
  frame(performance.now(), 16);
  if (calm.matches) return; // reduced motion: keep the still sky
  let started = false;
  const begin = () => {
    if (started) return; started = true;
    ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'].forEach((t) => removeEventListener(t, begin));
    requestAnimationFrame(loop);
  };
  ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'].forEach((t) => addEventListener(t, begin, { once: true, passive: true }));
  const later = () => setTimeout(begin, 5000);
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
}