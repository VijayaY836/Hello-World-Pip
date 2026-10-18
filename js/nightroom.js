// Tier 2 · Lights-Out Nursery
// A dark canvas sits over the room. Each frame we fill it with darkness and
// "erase" a soft circle where Pip's lantern is (destination-out), plus a faint
// moonbeam at the window and a lingering glow on every dream you've found.

import { plink, chime } from './audio.js';
import { sparks, toast, say, centerOf } from './fx.js';
import { remember } from './memory.js';

const DWELL_MS = 350; // how long the light must rest on a doodle to "find" it

export function initNightRoom() {
  const room = document.getElementById('room');
  if (!room) return;
  const canvas = document.getElementById('roomDark');
  const ctx = canvas.getContext('2d');
  const lantern = document.getElementById('roomLantern');
  const counter = document.getElementById('roomCount');
  const status = document.getElementById('roomFound');
  const lightsBtn = document.getElementById('roomLights');
  const windowEl = room.querySelector('.room__window');
  const doodles = [...room.querySelectorAll('.doodle')].map((el) => ({ el, found: false, dwell: 0, box: null }));
  const total = doodles.length;

  let W = 0, H = 0, dpr = 1;
  let light = { x: 0, y: 0 };
  let target = null;          // where the visitor is pointing (null = idle)
  let visible = false;
  let lit = false;
  let last = performance.now();
  let raf = 0;

  function measure() {
    const r = room.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const rel = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2, r: Math.max(b.width, b.height) / 2 };
    };
    doodles.forEach((d) => { d.box = rel(d.el); });
    moon = rel(windowEl);
    if (!light.x) light = { x: W * 0.5, y: H * 0.45 };
  }
  let moon = { x: 0, y: 0, r: 0 };

  function radius() { return Math.max(70, Math.min(150, Math.min(W, H) * 0.24)); }

  function hole(x, y, r, strength) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.85})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function found(d) {
    d.found = true;
    d.el.classList.add('is-found');
    const n = doodles.filter((x) => x.found).length;
    remember({ dreams: n });
    counter.textContent = `✦ ${n}/${total} found`;
    status.textContent = n < total ? `Found: ${d.el.dataset.dream}! (${n} of ${total})` : `All ${total} dreams found!`;
    plink(1 + n * 0.12);
    const c = centerOf(d.el);
    sparks(c.x, c.y, { count: 12, spread: 80 });
    if (n === total) setTimeout(celebrate, 500);
  }

  function celebrate() {
    setLights(true);
    chime();
    const c = centerOf(room);
    sparks(c.x, c.y, { count: 40, spread: 260 });
    toast('★ you found every dream on the wall! ★');
    say('you found all my doodles!! ♡', 3500);
  }

  function setLights(on) {
    lit = on;
    room.classList.toggle('is-lit', on);
    lightsBtn.textContent = on ? 'turn the lights off' : 'turn the lights on';
    if (!on) {
      status.textContent = 'Lights are off. Shine the lantern around the room.';
      start();
    } else if (doodles.some((d) => !d.found)) {
      status.textContent = `Lights on! Here are all ${total} dreams: ${doodles.map((d) => d.el.dataset.dream).join(', ')}.`;
    }
  }

  function frame(now) {
    raf = 0;
    if (!visible || lit) return;
    const dt = Math.min(50, now - last);
    last = now;

    // Idle: the lantern drifts on its own so the room is never just black.
    const goal = target || {
      x: W * (0.5 + 0.32 * Math.sin(now / 2300)),
      y: H * (0.42 + 0.22 * Math.sin(now / 1700)),
    };
    const k = target ? 0.22 : 0.03;
    light.x += (goal.x - light.x) * k;
    light.y += (goal.y - light.y) * k;
    lantern.style.setProperty('--lx', `${light.x.toFixed(1)}px`);
    lantern.style.setProperty('--ly', `${light.y.toFixed(1)}px`);

    const r = radius() * (0.97 + Math.random() * 0.05); // gentle candle flicker
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(7, 5, 24, 0.97)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    hole(moon.x, moon.y, moon.r * 1.25, 0.45);
    for (const d of doodles) if (d.found) hole(d.box.x, d.box.y, d.box.r * 1.15, 0.7);
    hole(light.x, light.y, r, 1);

    // Only the visitor's own light can discover dreams (not the idle drift).
    if (target) {
      for (const d of doodles) {
        if (d.found) continue;
        const close = Math.hypot(d.box.x - light.x, d.box.y - light.y) < r * 0.55;
        d.dwell = close ? d.dwell + dt : 0;
        if (d.dwell > DWELL_MS) found(d);
      }
    }
    start();
  }

  function start() { if (!raf && visible && !lit) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  function point(e) {
    const r = room.getBoundingClientRect();
    const lift = e.pointerType === 'touch' ? 60 : 0; // keep the light above your finger
    target = { x: e.clientX - r.left, y: e.clientY - r.top - lift };
    room.classList.add('is-touched');
  }
  room.addEventListener('pointermove', point);
  room.addEventListener('pointerdown', point);
  // Mouse: leaving the room hands the lantern back to the idle drift.
  // Touch: the light stays where you tapped, so a tap-and-wait can find dreams too.
  room.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') target = null; });

  lightsBtn.addEventListener('click', () => { plink(); setLights(!lit); });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) { measure(); start(); }
  }).observe(room);
  new ResizeObserver(() => { measure(); start(); }).observe(room);
}