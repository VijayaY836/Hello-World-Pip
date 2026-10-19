// Counting Sheep: the secret game behind the moon (knock on the painted moon three times, at night).
// Moon-sheep trot across the meadow on the back of the moon. Tap (or press Space) so each one hops the fence.
// Every sheep that makes it over gets counted; 20 and Pip falls asleep. Three bonks and Pip is wide awake again.
// Everything is drawn on one canvas, in sizes relative to a sheep, so it plays the same on a phone and a big screen.

import { baa, boing, bonk, chime, musicBox, plink } from './audio.js';
import { duck } from './music.js';
import { remember } from './memory.js';

const GOAL = 20;
const LIVES = 3;
const BEST_KEY = 'pip-sheep-best';
const WINS_KEY = 'pip-sheep-wins';
const TAU = Math.PI * 2;
const store = {
  get: (k) => { try { return Number(localStorage.getItem(k) || 0); } catch { return 0; } },
  set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* storage unavailable */ } },
};
const rand = (a, b) => a + Math.random() * (b - a);

const LINES = {
  5: '*yaaawn*… keep going…',
  10: 'my eyes are getting heavy…',
  15: 'zzz… just a few… more…',
  18: 'two more… zz…',
};
const OOPS = ['oof! sorry sheepy!', 'eep! i’m awake again…', 'bonk! (nobody saw that)'];

export function initSheep() {
  const box = document.getElementById('sheep');
  if (!box || box.dataset.ready) return;
  box.dataset.ready = '1';
  const canvas = document.getElementById('sheepCanvas');
  const ctx = canvas.getContext('2d');
  if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); }; // older browsers: square corners
  const screen = document.getElementById('sheepScreen');
  const title = document.getElementById('sheepTitle');
  const text = document.getElementById('sheepText');
  const startBtn = document.getElementById('sheepStart');
  const bestEl = document.getElementById('sheepBest');
  const countEl = document.getElementById('sheepCount');
  const livesEl = document.getElementById('sheepLives');
  const live = document.getElementById('sheepLive');

  const pip = new Image();
  pip.src = 'assets/pip-sm.webp';
  pip.onload = () => { if (!running) draw(performance.now()); };

  let W = 0, H = 0, dpr = 1;
  let running = false, ending = 0, raf = 0, last = 0;
  let sheep = [], pops = [], count = 0, lives = LIVES, bonks = 0, gapNeed = 0, golden = 0;
  let bubble = { text: '', until: 0 };
  let endingWon = false;
  let idle = []; // two sheep waiting their turn behind the start screen
  let sleepy = 0; // 0 → 1 as Pip drifts off (eyes and nightcap droop)

  // A starry sky that stays put (seeded once per size)
  let stars = [];
  function resize() {
    const r = box.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const g0 = geo();
    idle = [0, 1].map((i) => ({ x: g0.fx - g0.sw * (2.6 + i * 1.8), y: 0, state: 'walk', phase: i * 1.5, gold: false }));
    stars = Array.from({ length: Math.round(W * H / 5000) }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.62, r: rand(0.5, 1.6), p: rand(0, TAU) }));
    if (!running) draw(performance.now());
  }
  new ResizeObserver(resize).observe(box);

  // ---------- the meadow's measurements (all relative to one sheep) ----------
  function geo() {
    const sw = Math.min(H * 0.16, W * (W < H * 1.2 ? 0.15 : 0.11)); // a sheep's width (bigger on a square phone screen)
    return {
      sw,
      ground: H * 0.82,                                 // where hooves touch the moon
      fx: W * (W < H * 1.2 ? 0.5 : 0.55),               // the fence
      fh: sw * 0.85, fw: sw * 0.3,                      // fence height / width
      J: sw * 3.4, P: sw * 1.75,                        // a hop: how far, how high
      speed: sw * (2.2 + 2.1 * Math.min(1, count / GOAL)), // trot speed: faster as Pip gets sleepier
    };
  }

  // ---------- playing ----------
  function start() {
    sheep = []; pops = []; count = 0; lives = LIVES; bonks = 0; golden = 0; sleepy = 0;
    gapNeed = 0; ending = 0;
    running = true;
    screen.hidden = true;
    box.classList.add('is-playing');
    hud();
    talk('count with me? one… two…', 2200);
    duck('sheep', true);
    plink(1.1);
    box.focus({ preventScroll: true });
    box.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); // the whole meadow on screen
    last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function jump() {
    if (!running || ending) return;
    const g = geo();
    // the sheep nearest the fence that hasn't hopped yet and isn't past it
    const next = sheep.filter((s) => s.state === 'walk' && !s.hopped && s.x - g.sw / 2 < g.fx + g.fw / 2).sort((a, b) => b.x - a.x)[0];
    if (!next) return;
    next.state = 'jump'; next.hopped = true; next.jx = next.x;
    boing();
  }

  function hud() {
    countEl.textContent = String(count);
    livesEl.textContent = '♥'.repeat(lives) + '♡'.repeat(LIVES - lives);
  }
  function talk(t, ms = 2400) { bubble = { text: t, until: performance.now() + ms }; }

  function finish(won) {
    running = false;
    ending = 0;
    box.classList.remove('is-playing');
    duck('sheep', false);
    const bestBefore = store.get(BEST_KEY);
    store.set(BEST_KEY, Math.max(bestBefore, count));
    if (won) {
      store.set(WINS_KEY, store.get(WINS_KEY) + 1);
      remember({ sheepDone: true });
      title.textContent = 'zzz… 💤';
      text.textContent = `You counted me to sleep! ${count} sheep${bonks ? `, ${bonks} bonk${bonks > 1 ? 's' : ''}` : ', not a single bonk'}. Goodnight, dreamer ♡`;
      startBtn.textContent = '🐑 count again';
      chime();
      setTimeout(musicBox, 500);
    } else {
      title.textContent = 'I’m WIDE awake!! 👀';
      text.textContent = `We got to ${count} sheep before the third bonk. One more try? I’m sooo close to sleepy…`;
      startBtn.textContent = '🐑 try again';
      plink(0.7);
    }
    live.textContent = `${title.textContent} ${text.textContent}`;
    showBest();
    screen.hidden = false;
    startBtn.focus({ preventScroll: true });
    draw(performance.now());
  }
  function showBest() {
    const wins = store.get(WINS_KEY), best = store.get(BEST_KEY);
    bestEl.textContent = wins ? `you’ve put me to sleep ${wins}× ✦` : best ? `best so far: ${best} sheep` : '';
  }

  function update(dt, now) {
    const g = geo();
    if (running && !ending) {
      // a new sheep wanders in once the last one is far enough along
      const lastIn = sheep[sheep.length - 1];
      if (!lastIn || lastIn.x + g.sw > gapNeed) {
        const gold = count >= 3 && golden < 3 && Math.random() < 0.12;
        if (gold) golden += 1;
        sheep.push({ x: -g.sw, y: 0, state: 'walk', hopped: false, counted: false, gold, phase: rand(0, TAU), rot: 0, vx: 0, vy: 0, t: 0 });
        const pair = count >= 8 && Math.random() < 0.25;
        gapNeed = pair ? g.sw * 2.3 : g.sw * rand(2.8, 5.6); // how far the next one waits behind this one
      }
    }
    for (const s of sheep) {
      if (s.state === 'bonk') { // tumble back, dizzy
        s.t += dt; s.x += s.vx * dt; s.vy += g.sw * 12 * dt; s.y -= s.vy * dt; if (s.y < 0) { s.y = 0; s.vy *= -0.3; }
        s.rot += dt * 5;
        continue;
      }
      if (ending && s.state === 'walk') { s.dozing = true; continue; } // game over: everyone lies down for a nap
      s.x += g.speed * dt;
      s.phase += dt * 12;
      if (s.state === 'jump') {
        const k = (s.x - s.jx) / g.J;
        if (k >= 1) { s.state = 'walk'; s.y = 0; } else s.y = 4 * g.P * k * (1 - k);
      }
      if (ending) continue; // (a sheep still mid-hop just finishes its hop)
      const overlaps = s.x + g.sw * 0.42 > g.fx - g.fw / 2 && s.x - g.sw * 0.42 < g.fx + g.fw / 2;
      if (!s.counted && overlaps && s.y < g.fh * 0.95) { // bumped the fence
        s.state = 'bonk'; s.vx = -g.speed * 0.7; s.vy = g.sw * 3; s.t = 0;
        lives -= 1; bonks += 1;
        bonk(); hud();
        talk(OOPS[bonks % OOPS.length], 1800);
        sleepy = Math.max(0, sleepy - 0.2);
        box.classList.remove('is-shake'); void box.offsetWidth; box.classList.add('is-shake');
        live.textContent = `Bonk! ${lives} ${lives === 1 ? 'heart' : 'hearts'} left.`;
        if (lives <= 0) { ending = now + 900; endingWon = false; }
        continue;
      }
      if (!s.counted && s.x - g.sw * 0.42 > g.fx + g.fw / 2) { // safely over!
        s.counted = true;
        const add = s.gold ? 2 : 1;
        const before = count;
        count = Math.min(GOAL, count + add);
        pops.push({ x: g.fx + g.sw, y: g.ground - g.fh - g.sw, text: s.gold ? `${count}! ✦` : `${count}!`, t: 0, gold: s.gold });
        baa(s.gold ? 1.25 : rand(0.9, 1.1));
        hud();
        sleepy = count / GOAL;
        for (let n = before + 1; n <= count; n++) if (LINES[n]) talk(LINES[n], 2400);
        if (count % 5 === 0 || count >= GOAL) live.textContent = `${count} sheep.`;
        if (count >= GOAL) { ending = now + 1100; endingWon = true; talk('zzz… goodnight… ♡', 3000); }
      }
    }
    sheep = sheep.filter((s) => s.x < W + g.sw * 2 && !(s.state === 'bonk' && s.t > 1.4));
    for (const p of pops) p.t += dt;
    pops = pops.filter((p) => p.t < 1.1);
    if (ending && now >= ending) finish(endingWon);
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt, now);
    draw(now);
    if (running) raf = requestAnimationFrame(loop);
  }

  // ---------- drawing ----------
  function draw(now) {
    if (!W) return;
    const g = geo();
    const t = now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, g.ground);
    sky.addColorStop(0, '#120e33'); sky.addColorStop(1, '#3b2b72');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 1.3 + s.p);
      ctx.fillStyle = '#fff6dd'; ctx.fillRect(s.x, s.y, s.r * 1.6, s.r * 1.6);
    }
    ctx.globalAlpha = 1;
    // the little blue world, far away (we're on the back of the moon!)
    const ex = W * (W < H * 1.2 ? 0.3 : 0.2), ey = H * (W < H * 1.2 ? 0.36 : 0.27), er = g.sw * 0.75;
    const halo = ctx.createRadialGradient(ex, ey, er * 0.6, ex, ey, er * 2.4);
    halo.addColorStop(0, 'rgba(140,200,255,.35)'); halo.addColorStop(1, 'rgba(140,200,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(ex, ey, er * 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6fb6ff'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8fe0a8';
    ctx.beginPath(); ctx.ellipse(ex - er * 0.3, ey - er * 0.2, er * 0.35, er * 0.22, 0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex + er * 0.35, ey + er * 0.3, er * 0.3, er * 0.18, -0.4, 0, TAU); ctx.fill();
    // the moon's back: soft lavender hills with craters
    ctx.fillStyle = '#cfc5ef';
    ctx.beginPath(); ctx.moveTo(0, g.ground - g.sw * 0.4);
    for (let x = 0; x <= W; x += W / 24) ctx.lineTo(x, g.ground - g.sw * (0.25 + 0.2 * Math.sin(x / W * 5 + 1)));
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b6aadf';
    ctx.fillRect(0, g.ground, W, H - g.ground);
    ctx.fillStyle = 'rgba(120,104,190,.35)';
    for (const [cx, cy, cr] of [[0.12, 0.9, 0.5], [0.38, 0.94, 0.32], [0.72, 0.9, 0.42], [0.9, 0.96, 0.28]]) {
      ctx.beginPath(); ctx.ellipse(W * cx, H * cy, g.sw * cr * 1.6, g.sw * cr * 0.45, 0, 0, TAU); ctx.fill();
    }
    // the fence
    drawFence(g);
    // pip, drifting off on a cloud
    drawPip(g, t);
    // the sheep
    for (const s of (running || sheep.length ? sheep : idle)) drawSheep(g, s);
    // counting pops
    ctx.textAlign = 'center';
    for (const p of pops) {
      ctx.globalAlpha = 1 - p.t / 1.1;
      ctx.font = `700 ${Math.round(g.sw * 0.42)}px "Mali", "Fredoka", system-ui, sans-serif`;
      ctx.fillStyle = p.gold ? '#ffd27a' : '#fff6dd';
      ctx.strokeStyle = 'rgba(30,20,70,.6)'; ctx.lineWidth = 4;
      ctx.strokeText(p.text, p.x, p.y - p.t * g.sw * 0.9);
      ctx.fillText(p.text, p.x, p.y - p.t * g.sw * 0.9);
    }
    ctx.globalAlpha = 1;
  }

  function drawFence(g) {
    const left = g.fx - g.fw / 2, top = g.ground - g.fh;
    ctx.fillStyle = '#c99a72'; ctx.strokeStyle = '#6b4a3a'; ctx.lineWidth = Math.max(2, g.sw * 0.04);
    // two rails across, then the picket in the middle
    for (const ry of [0.3, 0.68]) {
      ctx.beginPath(); ctx.roundRect(left - g.sw * 0.55, top + g.fh * ry, g.fw + g.sw * 1.1, g.fh * 0.14, 3); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(left, g.ground); ctx.lineTo(left, top + g.fw * 0.5); ctx.lineTo(g.fx, top); ctx.lineTo(left + g.fw, top + g.fw * 0.5); ctx.lineTo(left + g.fw, g.ground);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  function drawPip(g, t) {
    const portrait = W < H * 1.2;
    const ph = portrait ? H * 0.2 : H * 0.42, pw = ph * (180 / 240);
    const px = portrait ? W - pw - W * 0.04 : W - pw - W * 0.03, py = portrait ? H * 0.14 : g.ground - ph * 0.95;
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate(-0.04 - sleepy * 0.14 + Math.sin(t * 1.2) * 0.02); // nodding off
    if (pip.complete && pip.naturalWidth) ctx.drawImage(pip, -pw / 2, -ph / 2, pw, ph);
    ctx.restore();
    // zzz…
    const z = Math.floor(sleepy * 4);
    ctx.fillStyle = 'rgba(255,246,221,.9)'; ctx.textAlign = 'left';
    for (let i = 0; i < z; i++) {
      const f = g.sw * (0.22 + i * 0.07);
      ctx.font = `700 ${Math.round(f)}px "Mali", system-ui, sans-serif`;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i);
      ctx.fillText('z', px + pw * (0.8 + i * 0.16), py + ph * (0.12 - i * 0.12) + Math.sin(t * 1.5 + i) * 4);
    }
    ctx.globalAlpha = 1;
    // what Pip says
    if (bubble.text && performance.now() < bubble.until) {
      const fs = Math.max(13, Math.round(g.sw * 0.24));
      ctx.font = `600 ${fs}px "Mali", system-ui, sans-serif`;
      const w = ctx.measureText(bubble.text).width + fs * 1.4, h = fs * 1.9;
      const bx = Math.max(8, Math.min(W - w - 8, px + pw / 2 - w / 2)), by = portrait ? py + ph + 8 : py - h - 6;
      ctx.fillStyle = 'rgba(35,26,85,.92)'; ctx.strokeStyle = '#ff9fbd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx, by, w, h, h / 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6dd'; ctx.textAlign = 'center'; ctx.fillText(bubble.text, bx + w / 2, by + h * 0.64);
    }
  }

  function drawSheep(g, s) {
    const r = g.sw * 0.2, x = s.x, base = g.ground - s.y;
    const legTop = g.sw * 0.3, legLen = g.sw * 0.2, bodyY = base - legTop - legLen; // short stubby legs peek out under the fluff
    ctx.save();
    ctx.translate(x, bodyY);
    if (s.state === 'bonk') ctx.rotate(-Math.min(1.2, s.t * 3) * 0.6);
    else if (s.state === 'jump') ctx.rotate(-0.18 + (s.x - s.jx) / g.J * 0.36);
    // legs (trotting, or tucked mid-hop)
    ctx.strokeStyle = '#3b2d5c'; ctx.lineWidth = Math.max(3, g.sw * 0.07); ctx.lineCap = 'round';
    const tucked = s.state === 'jump';
    [-0.55, -0.2, 0.2, 0.55].forEach((lx, i) => {
      const swing = tucked ? 0 : Math.sin(s.phase + (i % 2) * Math.PI) * g.sw * 0.08;
      const len = tucked ? legLen * 0.35 : legLen;
      ctx.beginPath(); ctx.moveTo(lx * g.sw * 0.5, legTop); ctx.lineTo(lx * g.sw * 0.5 + swing, legTop + len); ctx.stroke();
    });
    // fluffy body: a cloud of puffs, outline first
    const puffs = [[-0.32, 0], [0, -0.18], [0.3, 0], [-0.15, 0.2], [0.16, 0.2], [0.02, 0.05], [-0.42, -0.12]];
    ctx.fillStyle = s.gold ? '#d9a640' : '#b9a8e6';
    for (const [px, py] of puffs) { ctx.beginPath(); ctx.arc(px * g.sw, py * g.sw, r + 2.5, 0, TAU); ctx.fill(); }
    ctx.fillStyle = s.gold ? '#ffe08a' : '#fffaf0';
    for (const [px, py] of puffs) { ctx.beginPath(); ctx.arc(px * g.sw, py * g.sw, r, 0, TAU); ctx.fill(); }
    if (s.gold) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-0.1 * g.sw, -0.22 * g.sw, r * 0.35, 0, TAU); ctx.fill(); }
    // head (facing the way it trots)
    const hx = g.sw * 0.52, hy = -g.sw * 0.08;
    ctx.fillStyle = s.gold ? '#ffe08a' : '#fffaf0'; // a little tuft of fluff behind the head
    ctx.beginPath(); ctx.arc(hx - g.sw * 0.1, hy - g.sw * 0.11, g.sw * 0.075, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4b3b70';
    ctx.beginPath(); ctx.ellipse(hx, hy, g.sw * 0.17, g.sw * 0.14, 0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx - g.sw * 0.1, hy - g.sw * 0.1, g.sw * 0.08, g.sw * 0.04, -0.6, 0, TAU); ctx.fill(); // ear
    // eyes: sleepy arcs, or dizzy crosses after a bonk
    ctx.strokeStyle = '#fff6dd'; ctx.lineWidth = Math.max(1.5, g.sw * 0.025);
    const ex = hx + g.sw * 0.06, ey = hy - g.sw * 0.01, e = g.sw * 0.035;
    ctx.beginPath();
    if (s.state === 'bonk') { ctx.moveTo(ex - e, ey - e); ctx.lineTo(ex + e, ey + e); ctx.moveTo(ex + e, ey - e); ctx.lineTo(ex - e, ey + e); }
    else ctx.arc(ex, ey - e * 0.4, e, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#ff9fbd'; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(hx + g.sw * 0.1, hy + g.sw * 0.06, g.sw * 0.03, 0, TAU); ctx.fill(); // blush
    ctx.globalAlpha = 1;
    ctx.restore();
    if (s.dozing) { ctx.fillStyle = 'rgba(255,246,221,.85)'; ctx.font = `700 ${Math.round(g.sw * 0.22)}px "Mali", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('z', x + g.sw * 0.55, bodyY - g.sw * 0.35); }
    if (s.state === 'bonk') { // little dizzy stars
      ctx.fillStyle = '#ffd27a'; ctx.font = `${Math.round(g.sw * 0.2)}px system-ui, sans-serif`; ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) { const a = s.t * 6 + (i * TAU) / 3; ctx.fillText('✦', x + Math.cos(a) * g.sw * 0.3, bodyY - g.sw * 0.45 + Math.sin(a) * g.sw * 0.1); }
    }
  }

  // ---------- controls ----------
  startBtn.addEventListener('click', (e) => { e.stopPropagation(); start(); });
  box.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || !running) return;
    e.preventDefault();
    jump();
  });
  box.addEventListener('keydown', (e) => {
    if (![' ', 'Enter', 'ArrowUp', 'w', 'W'].includes(e.key)) return;
    if (e.target === startBtn) return; // the button handles itself
    e.preventDefault();
    if (running) jump(); else if (!screen.hidden) start();
  });
  // leaving the secret page (or hiding the tab) quietly stops the game
  const quit = () => {
    if (!running) return;
    running = false; ending = 0; cancelAnimationFrame(raf);
    box.classList.remove('is-playing'); duck('sheep', false);
    title.textContent = 'Can’t sleep?'; startBtn.textContent = '🐑 start counting';
    text.textContent = 'Tap (or press Space) just before each sheep reaches the fence, so it hops over. Count 20 sheep and I’ll fall asleep. Three bonks and I’m wide awake again!';
    screen.hidden = false; showBest(); draw(performance.now());
  };
  addEventListener('pip:view', (e) => { if (e.detail !== 'moondoor') quit(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) quit(); });

  // a still meadow behind the start screen
  showBest();
  resize();

  // for the automated tests only (…/?sheeptest): lets a test aim its jumps the way a player would
  if (location.search.includes('sheeptest')) window.pipSheep = { geo, get sheep() { return sheep; }, get count() { return count; }, get lives() { return lives; }, jump };
}