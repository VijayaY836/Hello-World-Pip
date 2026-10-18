// Tier 2 · Dream Delivery Routes — an SVG map whose flight path draws itself as you scroll.
// Pip flies along the path; at each stop a dream drops down the chimney, the window lights up,
// and the delivery log ticks it off. Desktop and phones get different map shapes.

import { plink } from './audio.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const STOPS = [
  { id: 'wisp', name: 'Wisp’s house', note: 'one lantern dream, extra warm', kind: 'house', x: 140 },
  { id: 'moths', name: 'The Moth House', note: 'a lullaby, hummed slightly off-key', kind: 'tall', x: 330 },
  { id: 'owl', name: 'Nana Noctua’s oak', note: 'a dream about very quiet libraries', kind: 'tree', x: 520 },
  { id: 'mumble', name: 'Midnight Nursery', note: 'a star-sized nightlight dream for Mumble', kind: 'nursery', x: 720 },
  { id: 'you', name: 'Your window', note: 'the last dream is for you ♡', kind: 'you', x: 900 },
];

const LAYOUTS = {
  wide: { w: 1000, h: 600, ground: 560, sx: 1, pad: 0, s: 1, arc: 1 },
  tall: { w: 600, h: 760, ground: 740, sx: 0.58, pad: 10, s: 0.72, arc: 1.25 },
};

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

/** Draws one stop's building; returns the drop target (top of the chimney). */
function drawStop(g, stop, cx, ground, s) {
  const grp = el('g', { class: `stop stop--${stop.kind}`, 'data-id': stop.id }, g);
  const R = (x, y, w, h, cls, rx = 4) => el('rect', { x: cx + x * s, y: ground - y * s, width: w * s, height: h * s, rx: rx * s, class: cls }, grp);
  const P = (d, cls) => el('path', { d, class: cls }, grp);
  const pt = (x, y) => `${(cx + x * s).toFixed(1)} ${(ground - y * s).toFixed(1)}`;
  let target;

  if (stop.kind === 'house' || stop.kind === 'tall' || stop.kind === 'nursery') {
    const w = stop.kind === 'nursery' ? 170 : stop.kind === 'tall' ? 100 : 120;
    const h = stop.kind === 'nursery' ? 150 : stop.kind === 'tall' ? 220 : 150;
    R(w * 0.18, h + 46, 18, 50, 'bld');                               // chimney
    P(`M${pt(-w / 2 - 10, h)} L${pt(0, h + 60)} L${pt(w / 2 + 10, h)} Z`, 'bld');  // roof
    R(-w / 2, h, w, h, 'bld');                                          // body
    const rows = stop.kind === 'tall' ? 4 : 2;
    for (let r = 0; r < rows; r++) {
      for (const c of [-1, 1]) R(c * w * 0.22 - 12, h - 26 - r * 48, 24, 28, 'win', 6);
    }
    if (stop.kind === 'nursery') {
      R(-60, h + 6, 120, 24, 'sign', 6);
      el('text', { x: cx, y: ground - (h - 12) * s, class: 'sign-text', 'text-anchor': 'middle', 'font-size': 15 * s, textLength: 104 * s, lengthAdjust: 'spacingAndGlyphs' }, grp).textContent = 'MIDNIGHT NURSERY';
    }
    target = { x: cx + (w * 0.18 + 9) * s, y: ground - (h + 50) * s };
  } else if (stop.kind === 'tree') {
    R(-14, 120, 28, 120, 'trunk', 6);
    el('circle', { cx, cy: ground - 190 * s, r: 85 * s, class: 'canopy' }, grp);
    el('circle', { cx: cx - 60 * s, cy: ground - 150 * s, r: 50 * s, class: 'canopy' }, grp);
    el('circle', { cx: cx + 62 * s, cy: ground - 155 * s, r: 48 * s, class: 'canopy' }, grp);
    el('ellipse', { cx, cy: ground - 175 * s, rx: 20 * s, ry: 26 * s, class: 'win' }, grp); // the owl's hollow
    el('circle', { cx: cx - 7 * s, cy: ground - 178 * s, r: 5 * s, class: 'owl-eye' }, grp);
    el('circle', { cx: cx + 7 * s, cy: ground - 178 * s, r: 5 * s, class: 'owl-eye' }, grp);
    target = { x: cx, y: ground - 275 * s };
  } else {
    // "Your window": a little house with a big round window and a heart
    R(-55, 130, 110, 130, 'bld');
    P(`M${pt(-65, 130)} L${pt(0, 185)} L${pt(65, 130)} Z`, 'bld');
    el('circle', { cx, cy: ground - 75 * s, r: 30 * s, class: 'win' }, grp);
    el('path', { d: `M${pt(0, 62)} c${-14 * s} ${-10 * s} ${-14 * s} ${-26 * s} 0 ${-20 * s} c${14 * s} ${-6 * s} ${14 * s} ${10 * s} 0 ${20 * s} Z`, class: 'heart' }, grp);
    target = { x: cx, y: ground - 192 * s };
  }
  // the dream that falls in on delivery, and a little tick
  const drop = el('g', { class: 'drop' }, grp);
  el('circle', { cx: target.x, cy: target.y - 40, r: 9, class: 'dream' }, drop);
  el('text', { x: target.x + 14 * s, y: target.y - 8, class: 'tick', 'font-size': 22 }, grp).textContent = '✓';
  return target;
}

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smooth(points) {
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function initRoutes() {
  const section = document.getElementById('routes');
  if (!section) return;
  const svg = document.getElementById('routeMap');
  const stage = section.querySelector('.routes__stage');
  const log = document.getElementById('routeLog');
  const tally = document.getElementById('routeTally');
  const now = document.getElementById('routeNow');
  const wide = window.matchMedia('(min-width: 760px)');

  let path, flown, pip, len = 0, stopAt = [], delivered = 0, lastP = 0;

  // Delivery log
  log.innerHTML = STOPS.map((s) => `<li data-id="${s.id}"><span class="log__box" aria-hidden="true"></span><span><b>${s.name}</b><br><small>${s.note}</small></span></li>`).join('');
  const items = [...log.children];

  function build() {
    const L = LAYOUTS[wide.matches ? 'wide' : 'tall'];
    svg.setAttribute('viewBox', `0 0 ${L.w} ${L.h}`);
    svg.replaceChildren();
    const defs = el('defs', {}, svg);
    const grad = el('linearGradient', { id: 'routeSky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#0c0a2a' }, grad);
    el('stop', { offset: 1, 'stop-color': '#2c2370' }, grad);
    el('rect', { width: L.w, height: L.h, fill: 'url(#routeSky)' }, svg);
    let seed = 5;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) el('circle', { cx: rand() * L.w, cy: rand() * L.h * 0.6, r: rand() * 1.6 + 0.5, class: 'route-star' }, svg);
    el('circle', { cx: L.w * 0.12, cy: L.h * 0.12, r: 26, fill: '#f8dc8f' }, svg);
    el('circle', { cx: L.w * 0.12 + 11, cy: L.h * 0.12 - 7, r: 23, fill: '#0f0c30' }, svg);

    // Filler rooftops in the background
    const back = el('g', { class: 'route-back' }, svg);
    for (let x = -20; x < L.w; x += 46 + rand() * 30) {
      const h = (40 + rand() * 80) * L.s;
      el('rect', { x, y: L.ground - h, width: 44 * L.s + 10, height: h, rx: 3 }, back);
    }

    const g = el('g', {}, svg);
    const targets = STOPS.map((stop) => drawStop(g, stop, L.pad + stop.x * L.sx + (L.w - 1000 * L.sx) / 2, L.ground, L.s));
    el('rect', { x: 0, y: L.ground, width: L.w, height: L.h - L.ground, fill: '#130f38' }, svg);

    // Flight path: start high on the left, dip to each chimney, arc up between them.
    const pts = [{ x: L.w * 0.07, y: L.h * 0.2 }];
    targets.forEach((t, i) => {
      pts.push({ x: t.x, y: t.y - 6 });
      const next = targets[i + 1];
      if (next) pts.push({ x: (t.x + next.x) / 2, y: Math.max(L.h * 0.12, Math.min(t.y, next.y) - 120 * L.arc) });
    });
    const d = smooth(pts);
    el('path', { d, class: 'route-plan' }, svg);
    flown = el('path', { d, class: 'route-flown' }, svg);
    path = flown;
    len = path.getTotalLength();
    flown.style.strokeDasharray = `${len}`;

    // Where along the path each stop sits.
    stopAt = targets.map((t) => {
      let best = 0, bestD = Infinity;
      for (let i = 0; i <= 400; i++) {
        const q = path.getPointAtLength((i / 400) * len);
        const dist = Math.hypot(q.x - t.x, q.y - (t.y - 6));
        if (dist < bestD) { bestD = dist; best = i / 400; }
      }
      return best;
    });

    pip = el('g', { class: 'route-pip' }, svg);
    const size = 78 * (wide.matches ? 1 : 1.25);
    el('image', { href: 'assets/pip-cloud.webp', x: -size / 2, y: -size * 1.15, width: size, height: size * (781 / 587) }, pip);
    delivered = -1;
    update(true);
  }

  function setDelivered(n, animate) {
    if (n === delivered) return;
    const forward = n > delivered;
    delivered = n;
    STOPS.forEach((s, i) => {
      const done = i < n;
      svg.querySelector(`.stop[data-id="${s.id}"]`)?.classList.toggle('is-done', done);
      items[i].classList.toggle('is-done', done);
      items[i].classList.toggle('is-next', i === n);
    });
    tally.textContent = `${n}/${STOPS.length}`;
    now.textContent = n >= STOPS.length ? 'all dreams delivered. goodnight, town ♡' : `en route to: ${STOPS[n].name}…`;
    if (animate && forward && n > 0) plink(1 + n * 0.1);
  }

  function update(initial = false) {
    ticking = false;
    if (!path || !section.offsetParent) return; // page not showing
    const r = section.getBoundingClientRect();
    const range = section.offsetHeight - stage.offsetHeight;
    const top = parseFloat(getComputedStyle(stage).top) || 0;
    const p = Math.min(1, Math.max(0, (top - r.top) / Math.max(1, range)));
    flown.style.strokeDashoffset = `${len * (1 - p)}`;
    const a = path.getPointAtLength(p * len);
    const b = path.getPointAtLength(Math.min(len, p * len + 2));
    const tilt = Math.max(-25, Math.min(25, (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI * 0.5));
    pip.setAttribute('transform', `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${tilt.toFixed(1)})`);
    setDelivered(stopAt.filter((t) => p >= t - 0.004).length, !initial && p > lastP);
    lastP = p;
  }

  let ticking = false;
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => update()); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  wide.addEventListener('change', build);
  build();
  // Path lengths can't be measured while the page is hidden; rebuild once it's shown.
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !len) build(); }).observe(section);
}