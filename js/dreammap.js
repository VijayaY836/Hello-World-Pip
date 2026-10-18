// HOME · The Dream Cartographer — a living, explorable map of Pip's dreamland.
// Three illustrated panoramas are joined into one wide world (6245 × 760 "map units").
// The world is only ever scaled DOWN (never above its real size), so the art stays sharp.
// Pick a place and Pip flies along a glowing trail to it, then the page opens.

import { plink, chime } from './audio.js';
import { sparks, say } from './fx.js';
import { memory, remember } from './memory.js';

const W = 6245, H = 760;
const PIP = { x: 3260, y: 400 };

// Places on the map. `main` places get big banners; the rest are little pins.
const PLACES = [
  { id: 'story', href: '#/story', x: 2370, y: 470, icon: '📖', name: 'The Midnight Nursery', sub: 'my story', main: true, line: 'that’s the nursery where Nana found me!' },
  { id: 'work', href: '#/work', x: 2560, y: 150, icon: '🛠️', name: 'The Dream Workshop', sub: 'things i make', main: true, line: 'my workshop! the windmill powers the music boxes.' },
  { id: 'play', href: '#/play', x: 5883, y: 250, icon: '🎮', name: 'Mushroom Hollow', sub: 'games & secrets', main: true, line: 'the mushroom house is where we play!' },
  { id: 'lab', href: '#lab', x: 270, y: 250, icon: '🎼', name: 'The Singing Tree', sub: 'lullaby lab', line: 'the star tree hums any tune you write.' },
  { id: 'book', href: '#book', x: 760, y: 430, icon: '📕', name: 'The Reading Tree', sub: 'Mumble’s storybook', line: 'Mumble’s book lives in that tree.' },
  { id: 'pip3d', href: '#pip3d-sec', x: 1840, y: 110, icon: '🎈', name: 'The Balloon', sub: '3D me!', line: 'hop in the balloon to see me in 3D!' },
  { id: 'routes', href: '#routes', x: 2730, y: 170, up: true, icon: '🗺️', name: 'Sky Post', sub: 'dream deliveries', line: 'every dream gets sorted at the sky post.' },
  { id: 'lights', href: '#nightroom', x: 2850, y: 360, icon: '🏮', name: 'The Lantern', sub: 'lights-out nursery', line: 'bring the lantern into the dark room…' },
  { id: 'wall', href: '#guestbook', x: 3995, y: 380, icon: '📌', name: 'Wishing Cottage', sub: 'the dream wall', line: 'leave me a wish at the cottage ♡' },
  { id: 'catch', href: '#play', x: 5250, y: 600, icon: '🌙', name: 'Stepping Stones', sub: 'catch the dreams', line: 'hop the stones and catch falling dreams!' },
];

// Little living details painted over the art (in map units).
const GLOWS = [[2222, 482, 30], [2300, 492, 30], [2372, 482, 40], [2850, 352, 40], [3520, 522, 34], [4026, 422, 26], [4078, 422, 26], [5883, 246, 46],
  [175, 175, 22], [245, 120, 22], [355, 205, 24], [450, 175, 22], [270, 380, 26], [405, 345, 24], [180, 410, 20], [745, 360, 18], [1870, 340, 22], [1985, 360, 20]];
const FALLS = [[3644, 472, 40, 180], [3865, 528, 60, 235], [5792, 301, 70, 200], [1855, 590, 130, 110]];
const FIREFLIES = 26;

const SVG_NS = 'http://www.w3.org/2000/svg';
const calm = matchMedia('(prefers-reduced-motion: reduce)');

/** A gentle arching trail from Pip to a place (quadratic Bézier, lifted toward the sky). */
function trail(to) {
  const mx = (PIP.x + to.x) / 2;
  const lift = Math.min(260, Math.abs(to.x - PIP.x) * 0.18 + 60);
  const my = Math.min(PIP.y, to.y) - lift;
  return { d: `M${PIP.x} ${PIP.y} Q${mx} ${my} ${to.x} ${to.y}`, c: { x: mx, y: my } };
}
const qpoint = (p0, c, p1, t) => ({ x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t * t * p1.x, y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t * t * p1.y });

export function initDreamMap() {
  const view = document.getElementById('dmViewport');
  if (!view) return;
  const track = document.getElementById('dmTrack');
  const world = document.getElementById('dmWorld');
  const places = document.getElementById('dmPlaces');
  const paths = document.getElementById('dmPaths');
  const life = document.getElementById('dmLife');
  const legend = document.getElementById('dmLegend');
  const flyer = document.getElementById('dmFlyer');
  const pipEl = document.getElementById('dmPip');
  const hint = document.getElementById('dmHint');
  const section = view.closest('.dreammap');
  let scale = 1;

  // ---------- build: trails, places, legend, living details ----------
  const trailEls = {};
  for (const p of PLACES) {
    const t = trail(p);
    const glow = document.createElementNS(SVG_NS, 'path');
    glow.setAttribute('d', t.d); glow.setAttribute('class', `dm__trail${p.main ? ' dm__trail--main' : ''}`);
    const dust = document.createElementNS(SVG_NS, 'path');
    dust.setAttribute('d', t.d); dust.setAttribute('class', 'dm__dust');
    paths.append(glow, dust);
    trailEls[p.id] = { glow, dust, c: t.c };
  }

  const visited = () => memory().visited || {};
  function placeEl(p) {
    const a = document.createElement('a');
    a.className = `dm__place${p.main ? ' dm__place--main' : ''}${p.up ? ' dm__place--up' : ''}`;
    a.href = p.href;
    a.draggable = false; // so dragging the map never picks up the link instead
    a.dataset.id = p.id;
    a.style.setProperty('--x', p.x); a.style.setProperty('--y', p.y);
    a.style.setProperty('--wob', `${(p.x % 7) * 0.31}s`);
    a.innerHTML = `<span class="dm__pin" aria-hidden="true"><span class="dm__icon">${p.icon}</span></span>
      <span class="dm__flag"><b>${p.name}</b><small>${p.sub}</small><i class="dm__seen" aria-hidden="true">✓</i></span>`;
    a.setAttribute('aria-label', `${p.name}: ${p.sub}`);
    return a;
  }
  PLACES.forEach((p) => places.appendChild(placeEl(p)));
  legend.innerHTML = '<span class="dm__legend-title">places</span>' + PLACES.map((p) => `<a class="chip" href="${p.href}" data-id="${p.id}">${p.icon} ${p.sub}</a>`).join('');

  // The little living details are added once the page has settled, so they never slow the first paint.
  const buildLife = () => {
  const lifeFrag = document.createDocumentFragment();
  GLOWS.forEach(([x, y, r], i) => {
    const g = document.createElement('span');
    g.className = 'dm__glow'; g.style.cssText = `--x:${x};--y:${y};--r:${r};--d:${(i % 5) * 0.7}s`;
    lifeFrag.appendChild(g);
  });
  FALLS.forEach(([x, y, w, h]) => {
    const f = document.createElement('span');
    f.className = 'dm__fall'; f.style.cssText = `--x:${x};--y:${y};--w:${w};--h:${h}`;
    lifeFrag.appendChild(f);
  });
  for (let i = 0; i < FIREFLIES; i++) {
    const f = document.createElement('span');
    const zone = i % 3; // forest, islands, pond
    const x = zone === 0 ? 80 + Math.random() * 1900 : zone === 1 ? 2100 + Math.random() * 1900 : 4150 + Math.random() * 1960;
    f.className = 'dm__fly';
    f.style.cssText = `--x:${x.toFixed(0)};--y:${(260 + Math.random() * 460).toFixed(0)};--dur:${(6 + Math.random() * 6).toFixed(1)}s;--delay:${(-Math.random() * 10).toFixed(1)}s;--dx:${(Math.random() * 120 - 60).toFixed(0)}px;--dy:${(-40 - Math.random() * 80).toFixed(0)}px`;
    lifeFrag.appendChild(f);
  }
  const plane = document.createElement('span');
  plane.className = 'dm__plane'; plane.textContent = '✉︎';
  lifeFrag.appendChild(plane);
  life.appendChild(lifeFrag);
  };
  const later = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));
  if (document.readyState === 'complete') later(buildLife); else addEventListener('load', () => later(buildLife), { once: true });

  // (Pip's spot on the map is set in CSS too, so he's already in place before this script runs)

  function markVisited() {
    const v = visited();
    document.querySelectorAll('.dm__place').forEach((a) => {
      const page = PLACES.find((p) => p.id === a.dataset.id);
      const seen = v[a.dataset.id] || (page?.main && v[page.id]);
      a.classList.toggle('is-visited', Boolean(seen));
    });
  }
  markVisited();

  // ---------- sizing: fit the map's height to the screen, never larger than the art ----------
  function size() {
    const avail = section.clientHeight;
    if (!avail) return false; // home page not showing yet
    scale = Math.min(1, avail / H);
    view.style.setProperty('--s', scale.toFixed(4));
    view.style.setProperty('--inv', Math.min(1.4, 1 / scale).toFixed(3)); // labels stay readable when the map is small
    track.style.width = `${W * scale}px`;
    track.style.height = `${H * scale}px`; // the same value the CSS already gave it
    return true;
  }
  // First view: on a wide screen, show Pip together with the Nursery and the Workshop; on a phone, centre on Pip.
  function home() {
    const span = view.clientWidth / scale;
    if (span >= 1300) view.scrollLeft = Math.max(0, Math.min(2110, PIP.x + 260 - span)) * scale;
    else centerOn(PIP.x, false);
  }
  const centerOn = (x, smooth) => view.scrollTo({ left: x * scale - view.clientWidth / 2, behavior: smooth && !calm.matches ? 'smooth' : 'instant' });

  // ---------- panning: drag, buttons, keys (wheel scrolls the page as normal; shift+wheel / trackpad pans) ----------
  let drag = null;
  view.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return; // touch uses native scrolling (with momentum)
    drag = { x: e.clientX, left: view.scrollLeft, moved: 0 };
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    if (drag.moved > 4) { view.classList.add('is-dragging'); view.scrollLeft = drag.left - dx; }
  });
  addEventListener('pointerup', () => { setTimeout(() => view.classList.remove('is-dragging'), 0); drag = drag && drag.moved > 4 ? { ...drag, justDragged: true } : null; setTimeout(() => { drag = null; }, 0); });
  const panBy = (dx) => view.scrollBy({ left: dx, behavior: calm.matches ? 'instant' : 'smooth' });
  document.getElementById('dmLeft').addEventListener('click', () => { panBy(-view.clientWidth * 0.7); plink(0.9); });
  document.getElementById('dmRight').addEventListener('click', () => { panBy(view.clientWidth * 0.7); plink(1.1); });
  document.getElementById('dmCompass').addEventListener('click', () => { centerOn(PIP.x, true); plink(1.2); say('here i am! ♡', 2000); });
  view.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); panBy(-260); }
    if (e.key === 'ArrowRight') { e.preventDefault(); panBy(260); }
  });
  let hinted = false, startLeft = 0;
  view.addEventListener('scroll', () => {
    if (!hinted && view.dataset.ready && Math.abs(view.scrollLeft - startLeft) > 60) { hinted = true; hint.classList.add('is-gone'); section.classList.add('is-exploring'); }
    dispatchEvent(new Event('pip:moved'));
  }, { passive: true });

  // ---------- hover: light up the trail, Pip glances and comments ----------
  function highlight(id, on) {
    const t = trailEls[id];
    if (!t) return;
    t.glow.classList.toggle('is-lit', on); t.dust.classList.toggle('is-lit', on);
  }
  let lastLine = '';
  section.addEventListener('pointerover', (e) => {
    const a = e.target.closest('[data-id]');
    if (!a) return;
    highlight(a.dataset.id, true);
    const p = PLACES.find((x) => x.id === a.dataset.id);
    if (p && p.line !== lastLine && document.documentElement.dataset.theme !== 'day') { lastLine = p.line; say(p.line, 2600); }
  });
  section.addEventListener('pointerout', (e) => { const a = e.target.closest('[data-id]'); if (a) highlight(a.dataset.id, false); });
  section.addEventListener('focusin', (e) => { const a = e.target.closest('[data-id]'); if (a) highlight(a.dataset.id, true); });
  section.addEventListener('focusout', (e) => { const a = e.target.closest('[data-id]'); if (a) highlight(a.dataset.id, false); });

  // ---------- travel: Pip flies along the trail, the map follows, then the page opens ----------
  let flying = false;
  function travel(p) {
    if (flying) return;
    const v = { ...visited(), [p.id]: true };
    remember({ visited: v });
    if (calm.matches) { location.hash = p.href; return; }
    flying = true;
    const t = trailEls[p.id];
    highlight(p.id, true);
    chime();
    world.classList.add('is-travelling');
    const dist = Math.hypot(p.x - PIP.x, p.y - PIP.y);
    const dur = Math.min(2200, 800 + dist * 0.35);
    const start = performance.now();
    let lastSpark = 0;
    flyer.classList.add('is-on');
    (function step(now) {
      const k = Math.min(1, (now - start) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const pt = qpoint(PIP, t.c, p, e);
      flyer.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -78%) rotate(${Math.sin(now / 120) * 8}deg)`;
      view.scrollLeft = pt.x * scale - view.clientWidth / 2; // the map follows Pip
      if (now - lastSpark > 90) {
        lastSpark = now;
        const r = flyer.getBoundingClientRect();
        sparks(r.left + r.width / 2, r.top + r.height * 0.7, { count: 3, spread: 30 });
      }
      if (k < 1) { requestAnimationFrame(step); return; }
      plink(1.4);
      section.classList.add('is-swooping');
      section.style.setProperty('--ox', `${((p.x * scale - view.scrollLeft) / view.clientWidth * 100).toFixed(1)}%`);
      section.style.setProperty('--oy', `${(p.y / H * 100).toFixed(1)}%`);
      setTimeout(() => {
        location.hash = p.href;
        flyer.classList.remove('is-on');
        world.classList.remove('is-travelling');
        section.classList.remove('is-swooping');
        highlight(p.id, false);
        flying = false;
        markVisited();
      }, 520);
    })(start);
  }
  section.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-id]');
    if (!a) return;
    e.preventDefault();
    if (drag?.justDragged) return; // that was a drag, not a click
    const p = PLACES.find((x) => x.id === a.dataset.id);
    if (a.closest('.dm__legend')) {           // from the legend: glide the map there first, then fly
      centerOn((p.x + PIP.x) / 2, true);
      setTimeout(() => travel(p), calm.matches ? 0 : 450);
      return;
    }
    travel(p);
  });

  // ---------- day / night, resizing, coming back home ----------
  addEventListener('resize', () => { if (!section.clientHeight) return; const mid = (view.scrollLeft + view.clientWidth / 2) / scale; size(); centerOn(mid, false); });
  addEventListener('pip:view', (e) => { if (e.detail === 'home') { requestAnimationFrame(() => { if (!size()) return; markVisited(); if (!view.dataset.ready) { home(); startLeft = view.scrollLeft; view.dataset.ready = '1'; } }); } });
  size();
  requestAnimationFrame(() => { if (!size()) return; home(); startLeft = view.scrollLeft; view.dataset.ready = '1'; });
}