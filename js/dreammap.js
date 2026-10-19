// HOME · The Dream Cartographer — a living, explorable map of Pip's dreamland.
// One painting of Pip's mushroom pond (2375 × 822 "map units").
// The world is only ever scaled DOWN (never above its real size), so the art stays sharp.
// Three big banners (Story, Work, Play) are always shown; seven more places are hidden
// sparkles to discover. Pick a place and Pip flies along a glowing trail to it, then the page opens.

import { plink, chime } from './audio.js';
import { sparks, say, toast, centerOf } from './fx.js';
import { memory, remember } from './memory.js';

const W = 2375, H = 822;            // the pond painting, at its real size
const PIP = { x: 1060, y: 470 };    // floating over the moonlit lake
const VIEW_X = 1180;                // where a wide screen looks first
const FIT_W = 1800;                 // on a wide screen, fit this much of the map across

// Places on the map. `main` places get big banners; the rest are hidden sparkles to find.
const PLACES = [
  { id: 'story', href: '#/story', x: 1300, y: 262, icon: '📖', name: 'The Moon', sub: 'my story', main: true, line: 'the moon watched over the night i was dreamed…' },
  { id: 'work', href: '#/work', x: 520, y: 360, icon: '🛠️', name: 'The Mushroom Workshop', sub: 'dreams & things i make', main: true, line: 'my workshop! come build a dream with me ✦' },
  { id: 'play', href: '#/play', x: 1840, y: 262, icon: '🎮', name: 'Mushroom Hollow', sub: 'games & secrets', main: true, line: 'the mushroom house is where we play!' },
  { id: 'lab', href: '#lab', x: 135, y: 480, icon: '🎼', name: 'The Humming Glade', sub: 'lullaby lab', line: 'the glowing glade hums any tune you write.' },
  { id: 'book', href: '#book', x: 440, y: 600, icon: '📕', name: 'The Toadstool Library', sub: 'Mumble’s storybook', line: 'Mumble’s book is tucked under that toadstool.' },
  { id: 'pip3d', href: '#pip3d-sec', x: 640, y: 175, icon: '🎈', name: 'The Floating Isle', sub: '3D me!', line: 'hop up to the floating isle to see me in 3D!' },
  { id: 'routes', href: '#routes', x: 720, y: 535, icon: '🗺️', name: 'The Winding Path', sub: 'dream deliveries', line: 'every dream travels down this path to a sleepy house.' },
  { id: 'lights', href: '#nightroom', x: 2235, y: 140, icon: '🏮', name: 'The Dark Wood', sub: 'lights-out nursery', line: 'it’s dark in the woods… bring a lantern!' },
  { id: 'wall', href: '#guestbook', x: 1595, y: 245, icon: '📌', name: 'Wishing Mushrooms', sub: 'the dream wall', line: 'leave me a wish by the little mushrooms ♡' },
  { id: 'catch', href: '#play', x: 1480, y: 610, icon: '🌙', name: 'Stepping Stones', sub: 'catch the dreams', line: 'hop the stones and catch falling dreams!' },
];

// Little living details painted over the art (in map units).
const GLOWS = [[1265, 135, 90], [1950, 245, 46], [1885, 228, 18], [135, 482, 26], [270, 702, 30], [472, 745, 18], [1610, 640, 20], [2140, 470, 22], [1130, 600, 40]];
const FALLS = [[1925, 330, 90, 215]];
const FIREFLIES = 16;

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
  const foundBtn = document.getElementById('dmFound');
  const foundText = document.getElementById('dmFoundText');
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
    glow.setAttribute('d', t.d); glow.setAttribute('class', 'dm__trail');
    const dust = document.createElementNS(SVG_NS, 'path');
    dust.setAttribute('d', t.d); dust.setAttribute('class', 'dm__dust');
    paths.append(glow, dust);
    trailEls[p.id] = { glow, dust, c: t.c };
  }

  const visited = () => memory().visited || {};
  const found = () => memory().found || {};
  const SPOTS = PLACES.filter((p) => !p.main);
  function placeEl(p) {
    const a = document.createElement('a');
    a.className = `dm__place ${p.main ? 'dm__place--main' : 'dm__place--spot'}`;
    a.href = p.href;
    a.draggable = false; // so dragging the map never picks up the link instead
    a.dataset.id = p.id;
    a.style.setProperty('--x', p.x); a.style.setProperty('--y', p.y);
    a.style.setProperty('--wob', `${(p.x % 7) * 0.31}s`);
    const mark = p.main
      ? `<span class="dm__pin" aria-hidden="true"><span class="dm__icon">${p.icon}</span></span>`
      : '<span class="dm__star" aria-hidden="true"></span>';
    a.innerHTML = `${mark}<span class="dm__flag"><b>${p.main ? '' : `${p.icon} `}${p.name}</b><small>${p.sub}</small><i class="dm__seen" aria-hidden="true">✓</i></span>`;
    return a;
  }
  PLACES.forEach((p) => places.appendChild(placeEl(p)));

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
    const x = 80 + zone * 760 + Math.random() * 740;
    f.className = 'dm__fly';
    f.style.cssText = `--x:${x.toFixed(0)};--y:${(300 + Math.random() * 480).toFixed(0)};--dur:${(6 + Math.random() * 6).toFixed(1)}s;--delay:${(-Math.random() * 10).toFixed(1)}s;--dx:${(Math.random() * 120 - 60).toFixed(0)}px;--dy:${(-40 - Math.random() * 80).toFixed(0)}px`;
    lifeFrag.appendChild(f);
  }
  const plane = document.createElement('span');
  plane.className = 'dm__plane'; plane.textContent = '✉︎';
  lifeFrag.appendChild(plane);
  life.appendChild(lifeFrag);
  };
  // Wake the map up on the visitor's first move, or a few seconds after loading, whichever comes first.
  let alive = false;
  const wake = () => {
    if (alive) return; alive = true;
    ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'].forEach((t) => removeEventListener(t, wake));
    buildLife();
    section.classList.add('is-live');
  };
  ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'].forEach((t) => addEventListener(t, wake, { passive: true }));
  const soon = () => setTimeout(wake, 6000);
  if (document.readyState === 'complete') soon(); else addEventListener('load', soon, { once: true });

  // (Pip's spot on the map is set in CSS too, so he's already in place before this script runs)

  function markVisited() {
    const v = visited();
    document.querySelectorAll('.dm__place').forEach((a) => {
      const page = PLACES.find((p) => p.id === a.dataset.id);
      const seen = v[a.dataset.id] || (page?.main && v[page.id]);
      a.classList.toggle('is-visited', Boolean(seen));
      a.classList.toggle('is-found', Boolean(found()[a.dataset.id]));
    });
    const n = SPOTS.filter((p) => found()[p.id]).length;
    foundText.textContent = n === SPOTS.length ? `all ${n} hidden spots found!` : `${n} of ${SPOTS.length} hidden spots found`;
    foundBtn.classList.toggle('is-complete', n === SPOTS.length);
  }
  markVisited();

  // ---------- hidden spots: finding them, and a little help from Pip ----------
  function discover(p) {
    if (p.main || found()[p.id]) return;
    remember({ found: { [p.id]: true } });
    markVisited();
    const el = places.querySelector(`[data-id="${p.id}"]`);
    const c = centerOf(el.querySelector('.dm__star'));
    sparks(c.x, c.y, { count: 10, spread: 70 });
    plink(1.3);
    if (SPOTS.every((s) => found()[s.id])) {
      setTimeout(() => { chime(); toast('✦ you found every hidden spot in my dreamland! ✦'); sparks(innerWidth / 2, innerHeight / 2, { count: 30 }); }, 400);
    }
  }
  foundBtn.addEventListener('click', () => {
    const left = SPOTS.filter((p) => !found()[p.id]);
    if (!left.length) { say('you found them all! you’re a real dream explorer ♡', 2800); plink(1.4); return; }
    const mid = (view.scrollLeft + view.clientWidth / 2) / scale;
    const next = left.reduce((a, b) => (Math.abs(b.x - mid) < Math.abs(a.x - mid) ? b : a));
    centerOn(next.x, true);
    say('psst… look for the twinkle over there ✦', 2800);
    plink(1.1);
    const el = places.querySelector(`[data-id="${next.id}"]`);
    el.classList.remove('is-calling'); void el.offsetWidth; el.classList.add('is-calling');
    setTimeout(() => el.classList.remove('is-calling'), 4200);
  });

  // ---------- sizing: fit the map's height to the screen, never larger than the art ----------
  function size() {
    const avail = section.clientHeight;
    if (!avail) return false; // home page not showing yet
    // Never bigger than the real painting (so it stays sharp); on wide screens, fit most of it across.
    const vw = innerWidth; // the window's width doesn't change when a scrollbar appears, so the map never jumps
    scale = Math.min(1, avail / H, vw >= 900 ? vw / FIT_W : 1);
    view.style.setProperty('--s', scale.toFixed(4));
    view.style.setProperty('--inv', Math.min(1.4, 1 / scale).toFixed(3)); // labels stay readable when the map is small
    track.style.width = `${W * scale}px`;
    track.style.height = `${H * scale}px`; // the same value the CSS already gave it
    return true;
  }
  // First view: on a wide screen, the whole middle of the map (all three banners); on a phone, Pip.
  function home() { centerOn(innerWidth >= 900 ? VIEW_X : PIP.x, false); }
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
  if (matchMedia('(pointer: coarse)').matches) hint.textContent = '✦ swipe to explore the dreamland ✦';
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
    if (!p) return;
    if (e.pointerType === 'mouse') discover(p); // on touch, the first tap does this instead
    if (p.line !== lastLine && document.documentElement.dataset.theme !== 'day') { lastLine = p.line; say(p.line, 2600); }
  });
  section.addEventListener('pointerout', (e) => { const a = e.target.closest('[data-id]'); if (a) highlight(a.dataset.id, false); });
  section.addEventListener('focusin', (e) => { const a = e.target.closest('[data-id]'); if (!a) return; highlight(a.dataset.id, true); if (a.matches(':focus-visible')) discover(PLACES.find((x) => x.id === a.dataset.id)); });
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
  let pointerType = 'mouse';
  section.addEventListener('pointerdown', (e) => { pointerType = e.pointerType; }, { passive: true });
  const closeSpots = (except) => places.querySelectorAll('.dm__place--spot.is-open').forEach((x) => { if (x !== except) { x.classList.remove('is-open'); highlight(x.dataset.id, false); } });
  section.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-id]');
    if (!a) { closeSpots(); return; }
    e.preventDefault();
    if (drag?.justDragged) return; // that was a drag, not a click
    const p = PLACES.find((x) => x.id === a.dataset.id);
    // On a touch screen there's no hover, so the first tap on a hidden spot reveals it; the second tap travels.
    if (!p.main && pointerType !== 'mouse' && e.detail !== 0 && !a.classList.contains('is-open')) {
      closeSpots(a);
      a.classList.add('is-open');
      highlight(p.id, true);
      discover(p);
      if (document.documentElement.dataset.theme !== 'day') say(`${p.line} (tap again to go!)`, 3200);
      return;
    }
    closeSpots();
    discover(p);
    travel(p);
  });

  // ---------- day / night, resizing, coming back home ----------
  addEventListener('resize', () => { if (!section.clientHeight) return; const mid = (view.scrollLeft + view.clientWidth / 2) / scale; size(); centerOn(mid, false); });
  addEventListener('pip:view', (e) => { if (e.detail === 'home') { requestAnimationFrame(() => { if (!size()) return; markVisited(); if (!view.dataset.ready) { home(); startLeft = view.scrollLeft; view.dataset.ready = '1'; } }); } });
  size();
  requestAnimationFrame(() => { if (!size()) return; home(); startLeft = view.scrollLeft; view.dataset.ready = '1'; });
}