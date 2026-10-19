// HOME · The Dream Cartographer — a living, explorable map of Pip's dreamland.
// One painting of Pip's mushroom pond (2375 × 822 "map units").
// The world is only ever scaled DOWN (never above its real size), so the art stays sharp.
// Three big banners (Story, Work, Play): pick one and Pip flies along a glowing trail to it, then the page opens.
// And one real secret: knock on the moon three times (at night) and it opens like a little round door.

import { plink, chime } from './audio.js';
import { sparks, say, centerOf } from './fx.js';
import { memory, remember } from './memory.js';

const W = 2375, H = 822;            // the pond painting, at its real size
const PIP = { x: 1060, y: 470 };    // floating over the moonlit lake
const VIEW_X = 1180;                // where a wide screen looks first
const FIT_W = 1800;                 // on a wide screen, fit this much of the map across

// Places on the map (each gets a big banner).
const PLACES = [
  { id: 'story', href: '#/story', x: 1300, y: 262, icon: '📖', name: 'The Moon', sub: 'my story', main: true, line: 'the moon watched over the night i was dreamed…' },
  { id: 'work', href: '#/work', x: 520, y: 360, icon: '🛠️', name: 'The Mushroom Workshop', sub: 'dreams & things i make', main: true, line: 'my workshop! come build a dream with me ✦' },
  { id: 'play', href: '#/play', x: 1840, y: 262, icon: '🎮', name: 'Mushroom Hollow', sub: 'games & secrets', main: true, line: 'the mushroom house is where we play!' },
];

// Little living details painted over the art (in map units).
const GLOWS = [[1265, 135, 90], [1950, 245, 46], [1885, 228, 18], [135, 482, 26], [270, 702, 30], [472, 745, 18], [1610, 640, 20], [2140, 470, 22], [1130, 600, 40]];
const FALLS = [[1925, 330, 90, 215]];
const FIREFLIES = 16;
const MOON = { x: 1270, y: 124, r: 64 }; // the painted crescent: a secret door (see "the moon door" below)

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
  function placeEl(p) {
    const a = document.createElement('a');
    a.className = 'dm__place dm__place--main';
    a.href = p.href;
    a.draggable = false; // so dragging the map never picks up the link instead
    a.dataset.id = p.id;
    a.style.setProperty('--x', p.x); a.style.setProperty('--y', p.y);
    a.style.setProperty('--wob', `${(p.x % 7) * 0.31}s`);
    a.innerHTML = `<span class="dm__pin" aria-hidden="true"><span class="dm__icon">${p.icon}</span></span>`
      + `<span class="dm__flag"><b>${p.name}</b><small>${p.sub}</small><i class="dm__seen" aria-hidden="true">✓</i></span>`;
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
      a.classList.toggle('is-visited', Boolean(v[a.dataset.id]));
    });
  }
  markVisited();

  // ---------- the moon door: a real secret ----------
  // Knock on the painted moon three times at night and it opens: behind it is a secret game (#/moondoor).
  // Nothing on the map says so. By day the moon is asleep and won't open.
  const door = document.createElement('button');
  door.type = 'button';
  door.className = 'dm__moon';
  door.style.cssText = `--x:${MOON.x};--y:${MOON.y};--r:${MOON.r}`;
  door.setAttribute('aria-label', 'the moon');
  door.innerHTML = '<span class="dm__moon-crack" aria-hidden="true"></span><span class="dm__moon-light" aria-hidden="true"></span>';
  places.appendChild(door);
  const KNOCKS = ['…did the moon just wobble?', 'it’s… creaking?! one more knock…'];
  let knocks = 0, knockTimer = 0, opening = false;
  door.addEventListener('click', (e) => {
    e.stopPropagation();
    if (drag?.justDragged || opening) return;
    if (document.documentElement.dataset.theme === 'day') {
      door.classList.remove('is-knock'); void door.offsetWidth; door.classList.add('is-knock');
      say('shh… the moon’s asleep in the daytime. come back tonight 🌙', 3000); plink(0.7);
      return;
    }
    knocks += 1;
    clearTimeout(knockTimer);
    knockTimer = setTimeout(() => { knocks = 0; door.dataset.knocks = '0'; }, 5000); // knock again soon, or it closes up
    door.dataset.knocks = String(knocks);
    door.classList.remove('is-knock'); void door.offsetWidth; door.classList.add('is-knock');
    const c = centerOf(door);
    if (knocks < 3) { plink(0.6 + knocks * 0.15); sparks(c.x, c.y, { count: 4 + knocks * 3, spread: 50, chars: ['✦', '✧'] }); say(KNOCKS[knocks - 1], 2600); return; }
    // third knock: the door swings open and the map swoops inside
    opening = true; clearTimeout(knockTimer);
    chime(); sparks(c.x, c.y, { count: 26, spread: 120 });
    say('the moon was a DOOR?! come on, quick! ♡', 2600);
    remember({ moondoor: true });
    door.classList.add('is-open');
    const go = () => {
      location.hash = '#/moondoor';
      section.classList.remove('is-swooping'); door.classList.remove('is-open'); door.dataset.knocks = '0';
      knocks = 0; opening = false;
    };
    if (calm.matches) { setTimeout(go, 400); return; }
    setTimeout(() => {
      section.style.setProperty('--ox', `${((MOON.x * scale - view.scrollLeft) / view.clientWidth * 100).toFixed(1)}%`);
      section.style.setProperty('--oy', `${(MOON.y / H * 100).toFixed(1)}%`);
      section.classList.add('is-swooping');
      setTimeout(go, 520);
    }, 900);
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
    if (p.line !== lastLine && document.documentElement.dataset.theme !== 'day') { lastLine = p.line; say(p.line, 2600); }
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
    travel(PLACES.find((x) => x.id === a.dataset.id));
  });

  // ---------- day / night, resizing, coming back home ----------
  addEventListener('resize', () => { if (!section.clientHeight) return; const mid = (view.scrollLeft + view.clientWidth / 2) / scale; size(); centerOn(mid, false); });
  addEventListener('pip:view', (e) => { if (e.detail === 'home') { requestAnimationFrame(() => { if (!size()) return; markVisited(); if (!view.dataset.ready) { home(); startLeft = view.scrollLeft; view.dataset.ready = '1'; } }); } });
  size();
  requestAnimationFrame(() => { if (!size()) return; markVisited(); home(); startLeft = view.scrollLeft; view.dataset.ready = '1'; });
}