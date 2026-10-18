// Tier 2 · Catch the Dreams
// 30-second canvas mini-game. Pip's cloud follows your pointer, finger or arrow keys.

import { catchNote, chime, bzzt, plink } from './audio.js';
import { sparks, centerOf } from './fx.js';

const ROUND = 30;
const BEST_KEY = 'pip-best';
const TOTAL_KEY = 'pip-dreams-total';
const TYPES = {
  dream: { points: 1, r: 13 },
  star: { points: 3, r: 15 },
  clock: { points: -2, r: 16 },
};
const TITLES = [
  [40, 'Legendary Lullaby Legend'],
  [25, 'Senior Snooze Specialist'],
  [12, 'Junior Dream Engineer'],
  [0, 'Sleepy Intern'],
];

const store = {
  get(k) { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* storage unavailable */ } },
};

function loadImage(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
}

export function initGame() {
  const root = document.getElementById('game');
  if (!root) return;
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const screen = document.getElementById('gameScreen');
  const titleEl = document.getElementById('gameTitle');
  const textEl = document.getElementById('gameText');
  const startBtn = document.getElementById('gameStart');
  const bestEl = document.getElementById('gameBest');
  const hudScore = document.getElementById('hudScore');
  const hudTime = document.getElementById('hudTime');
  const hudCombo = document.getElementById('hudCombo');
  const live = document.getElementById('gameLive');
  const pipImg = loadImage('assets/pip-cloud.webp');

  let W = 0, H = 0, dpr = 1;
  let backdrop = null;           // pre-rendered sky + rooftops
  let state = 'ready';           // ready | playing | paused | over
  let score = 0, combo = 0, timeLeft = ROUND, spawnIn = 0, last = 0, raf = 0;
  let items = [];
  let floaters = [];
  const player = { x: 0, target: 0, w: 90, h: 120, tilt: 0, stun: 0 };
  const keys = { left: false, right: false };

  function renderBest() {
    const best = store.get(BEST_KEY);
    const total = store.get(TOTAL_KEY);
    bestEl.textContent = best ? `best: ${best} ★ · dreams delivered, all-time: ${total}` : '';
  }

  // ---------- sizing & backdrop ----------
  function measure() {
    const r = root.getBoundingClientRect();
    if (!r.width || !r.height) return; // its page is hidden right now
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    player.w = Math.max(72, Math.min(120, W * 0.16));
    player.h = player.w * (781 / 587);
    if (!player.x) player.x = player.target = W / 2;
    backdrop = buildBackdrop();
    if (state !== 'playing') draw();
  }

  function buildBackdrop() {
    const off = document.createElement('canvas');
    off.width = canvas.width; off.height = canvas.height;
    const c = off.getContext('2d');
    c.scale(dpr, dpr);
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0c0a2a'); sky.addColorStop(1, '#2c2370');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    let seed = 3;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      c.fillStyle = rand() > 0.7 ? '#ffe9a8' : '#ffffff';
      c.globalAlpha = 0.4 + rand() * 0.6;
      c.beginPath(); c.arc(rand() * W, rand() * H * 0.8, rand() * 1.6 + 0.4, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    c.fillStyle = '#1d1850';
    let x = -10;
    while (x < W + 10) {
      const w = 40 + rand() * 60, h = H * (0.06 + rand() * 0.08);
      c.fillRect(x, H - h, w, h);
      c.beginPath(); c.moveTo(x - 3, H - h); c.lineTo(x + w / 2, H - h - 18); c.lineTo(x + w + 3, H - h); c.fill();
      x += w + 4;
    }
    return off;
  }

  // ---------- game flow ----------
  function begin() {
    plink();
    score = 0; combo = 0; timeLeft = ROUND; spawnIn = 400;
    items = []; floaters = [];
    player.stun = 0;
    state = 'playing';
    screen.hidden = true;
    root.classList.add('is-playing');
    root.focus({ preventScroll: true });
    updateHud();
    last = performance.now();
    loop();
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    root.classList.remove('is-playing');
    titleEl.textContent = 'Paused';
    textEl.textContent = 'Pip is having a little nap.';
    startBtn.textContent = '▶ keep going';
    screen.hidden = false;
  }

  function resume() {
    state = 'playing';
    screen.hidden = true;
    root.classList.add('is-playing');
    root.focus({ preventScroll: true });
    last = performance.now();
    loop();
  }

  function end() {
    state = 'over';
    root.classList.remove('is-playing');
    const best = store.get(BEST_KEY);
    const isBest = score > best;
    if (isBest) store.set(BEST_KEY, score);
    store.set(TOTAL_KEY, store.get(TOTAL_KEY) + Math.max(0, score));
    const title = TITLES.find(([min]) => score >= min)[1];
    titleEl.textContent = isBest && score > 0 ? `New best: ${score} ★` : `Shift over: ${score} ★`;
    textEl.textContent = `Your rank: ${title}.`;
    startBtn.textContent = '↻ another shift';
    screen.hidden = false;
    renderBest();
    live.textContent = `Shift over. You scored ${score}. Rank: ${title}.`;
    chime();
    if (isBest && score > 0) { const c = centerOf(root); sparks(c.x, c.y, { count: 30, spread: 220 }); }
    draw();
  }

  startBtn.addEventListener('click', () => (state === 'paused' ? resume() : begin()));

  // ---------- input ----------
  function aim(e) {
    if (state !== 'playing') return;
    const r = root.getBoundingClientRect();
    player.target = Math.max(player.w / 2, Math.min(W - player.w / 2, e.clientX - r.left));
  }
  root.addEventListener('pointermove', aim);
  root.addEventListener('pointerdown', aim);

  root.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') { keys.left = true; e.preventDefault(); }
    if (k === 'arrowright' || k === 'd') { keys.right = true; e.preventDefault(); }
    if (k === ' ' || k === 'enter') {
      if (e.target !== root) return; // let real buttons handle their own keys
      e.preventDefault();
      if (state === 'playing') pause();
      else if (state === 'paused') resume();
      else begin();
    }
  });
  root.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keys.left = false;
    if (k === 'arrowright' || k === 'd') keys.right = false;
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) pause(); }, { threshold: 0.3 }).observe(root);

  // ---------- simulation ----------
  function spawn() {
    const elapsed = ROUND - timeLeft;
    const roll = Math.random();
    const type = roll < 0.12 ? 'star' : roll < 0.12 + Math.min(0.28, 0.12 + elapsed * 0.006) ? 'clock' : 'dream';
    const r = TYPES[type].r * Math.max(0.85, Math.min(1.25, W / 640));
    items.push({
      type, r,
      x: r + Math.random() * (W - r * 2),
      y: -r,
      vy: H * (0.22 + elapsed * 0.012 + Math.random() * 0.1) * (type === 'star' ? 1.25 : 1),
      sway: Math.random() * Math.PI * 2,
    });
    spawnIn = Math.max(330, 850 - elapsed * 18) * (0.7 + Math.random() * 0.6);
  }

  function updateHud() {
    hudScore.textContent = String(score);
    hudTime.textContent = String(Math.ceil(timeLeft));
    hudCombo.textContent = combo >= 3 ? `combo ×${combo}` : '';
  }

  function addFloater(text, x, y, color) { floaters.push({ text, x, y, color, life: 1 }); }

  function step(dt) {
    const s = dt / 1000;
    timeLeft -= s;
    if (timeLeft <= 0) { timeLeft = 0; updateHud(); end(); return; }

    spawnIn -= dt;
    if (spawnIn <= 0) spawn();

    if (keys.left) player.target -= W * 0.9 * s;
    if (keys.right) player.target += W * 0.9 * s;
    player.target = Math.max(player.w / 2, Math.min(W - player.w / 2, player.target));
    const before = player.x;
    if (player.stun > 0) player.stun -= dt;
    else player.x += (player.target - player.x) * Math.min(1, s * 12);
    player.tilt += (((player.x - before) / Math.max(s, 0.001)) * 0.0004 - player.tilt) * 0.2;

    // The catch zone is the top of Pip's cloud.
    const top = H - player.h * 0.62;
    const half = player.w * 0.44;
    for (const it of items) {
      it.y += it.vy * s;
      it.sway += s * 2;
      it.x += Math.sin(it.sway) * 0.4;
      if (!it.done && it.y + it.r > top && it.y - it.r < top + player.h * 0.3 && Math.abs(it.x - player.x) < half + it.r) {
        it.done = true;
        const pts = TYPES[it.type].points;
        if (pts > 0) {
          combo += 1;
          const bonus = combo >= 5 ? 1 : 0;
          score += pts + bonus;
          catchNote(combo);
          addFloater(`+${pts + bonus}`, it.x, it.y, it.type === 'star' ? '#ffd27a' : '#fbeee0');
          if (combo >= 3 && combo % 3 === 0) { hudCombo.classList.remove('is-pop'); void hudCombo.offsetWidth; hudCombo.classList.add('is-pop'); }
        } else {
          combo = 0;
          score = Math.max(0, score + pts);
          player.stun = 450;
          bzzt();
          addFloater('BRRING! −2', it.x, it.y, '#ff9fbd');
          root.classList.remove('is-shake'); void root.offsetWidth; root.classList.add('is-shake');
        }
      } else if (!it.done && it.y - it.r > H) {
        it.done = true;
        if (it.type !== 'clock') combo = 0; // a dropped dream breaks the combo
      }
    }
    items = items.filter((it) => !it.done);
    floaters.forEach((f) => { f.life -= s * 1.4; f.y -= s * 50; });
    floaters = floaters.filter((f) => f.life > 0);
    updateHud();
  }

  // ---------- drawing ----------
  function drawDream(it) {
    const g = ctx.createRadialGradient(it.x - it.r * 0.3, it.y - it.r * 0.3, 1, it.x, it.y, it.r * 1.8);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#ffd9f0'); g.addColorStop(0.6, 'rgba(185,168,255,.9)'); g.addColorStop(1, 'rgba(185,168,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(it.x, it.y, it.r * 1.8, 0, Math.PI * 2); ctx.fill();
  }
  function drawStar(it) {
    ctx.save();
    ctx.translate(it.x, it.y); ctx.rotate(it.sway * 0.5);
    ctx.shadowColor = '#ffcf6e'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? it.r * 0.45 : it.r;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawClock(it) {
    const { x, y, r } = it;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(Math.sin(it.sway * 6) * 0.15); // it rattles
    ctx.fillStyle = '#ff7aa2';
    ctx.beginPath(); ctx.arc(-r * 0.6, -r * 0.8, r * 0.38, 0, Math.PI * 2); ctx.arc(r * 0.6, -r * 0.8, r * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6ec';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a1d3a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.5); ctx.moveTo(0, 0); ctx.lineTo(r * 0.35, r * 0.1); ctx.stroke();
    ctx.restore();
  }

  function draw() {
    if (!W || !H) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (backdrop) ctx.drawImage(backdrop, 0, 0); else { ctx.fillStyle = '#120f33'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const it of items) {
      if (it.type === 'dream') drawDream(it);
      else if (it.type === 'star') drawStar(it);
      else drawClock(it);
    }

    if (pipImg.complete && pipImg.naturalWidth) {
      ctx.save();
      const bob = Math.sin(performance.now() / 300) * 2;
      ctx.translate(player.x, H - player.h / 2 + 6 + bob);
      ctx.rotate(Math.max(-0.25, Math.min(0.25, player.tilt)) + (player.stun > 0 ? Math.sin(performance.now() / 30) * 0.08 : 0));
      ctx.drawImage(pipImg, -player.w / 2, -player.h / 2, player.w, player.h);
      ctx.restore();
    }

    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(Math.max(16, W / 34))}px "Fredoka", system-ui, sans-serif`;
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function tick(now) {
      if (state !== 'playing') return;
      step(Math.min(50, now - last));
      last = now;
      if (state === 'playing') { draw(); raf = requestAnimationFrame(tick); }
    });
  }

  new ResizeObserver(measure).observe(root);
  pipImg.addEventListener('load', () => { if (state !== 'playing') draw(); });
  renderBest();
}