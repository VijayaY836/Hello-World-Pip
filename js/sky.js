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
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    seed();
  }

  const COLORS = { white: '255,248,230', gold: '255,222,150', pink: '255,200,230' };

  function drawSparkle(x, y, size, alpha, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.6);
    g.addColorStop(0, `rgba(255,240,210,${0.45 * alpha})`);
    g.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, size * 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,250,235,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(0, 0, size, 0);
    ctx.quadraticCurveTo(0, 0, 0, size);
    ctx.quadraticCurveTo(0, 0, -size, 0);
    ctx.quadraticCurveTo(0, 0, 0, -size);
    ctx.fill();
    ctx.restore();
  }

  function frame(now, dtMs) {
    const t = now / 1000;
    const dt = dtMs / 1000;
    night += ((isNight() ? 1 : 0) - night) * Math.min(1, dt * 2.5);
    const scroll = scrollY;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (night > 0.02) {
      // twinkling stars (each on its own rhythm), with a soft glow on the brighter ones
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        const a = (0.25 + 0.75 * tw) * night;
        const y = ((s.y - scroll * s.depth) % H + H) % H;
        const c = COLORS[s.hue];
        if (s.r > 1.3) {
          const g = ctx.createRadialGradient(s.x, y, 0, s.x, y, s.r * 5);
          g.addColorStop(0, `rgba(${c},${0.35 * a})`); g.addColorStop(1, `rgba(${c},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, y, s.r * 5, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = `rgba(${c},${a})`;
        ctx.beginPath(); ctx.arc(s.x, y, s.r * (0.85 + 0.25 * tw), 0, TAU); ctx.fill();
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
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - nx * len, sh.y - ny * len); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,245,${sh.life * night})`;
        ctx.beginPath(); ctx.arc(sh.x, sh.y, 2.2, 0, TAU); ctx.fill();
      }
      shooters = shooters.filter((sh) => sh.life > 0);
    }

    // dream-motes drifting upward (lavender at night, sunny gold by day)
    const moteColor = night > 0.5 ? '215,195,255' : '255,214,150';
    for (const m of motes) {
      m.y -= m.vy * dt; m.sway += dt * m.swaySpeed;
      if (m.y < -10) Object.assign(m, newMote(false));
      const x = m.x + Math.sin(m.sway) * 14;
      const a = m.life * (0.35 + 0.35 * Math.sin(m.sway * 1.7)) * (0.55 + 0.45 * night);
      const g = ctx.createRadialGradient(x, m.y, 0, x, m.y, m.r * 4);
      g.addColorStop(0, `rgba(${moteColor},${a})`); g.addColorStop(1, `rgba(${moteColor},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, m.y, m.r * 4, 0, TAU); ctx.fill();
    }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) { last = now; return; }
    const d = Math.min(100, now - (last || now)); last = now; acc += d;
    if (acc < 24) return;         // cap at ~40fps: plenty for a gentle sky, kind to batteries
    frame(now, acc); acc = 0;
  }

  addEventListener('resize', resize);
  resize();
  if (calm.matches) { frame(performance.now(), 16); return; } // one still, starry frame
  requestAnimationFrame(loop);
}