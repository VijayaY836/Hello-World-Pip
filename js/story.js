// "The Dream Nobody Dreamed" — a six-scene story driven by scroll.
// The section is tall; the stage sticks to the viewport while scroll progress
// picks the scene (CSS handles each scene's look via [data-scene]).

const SCENES = 6;
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Deterministic little skyline so the town looks the same on every visit. */
function buildTown(svg) {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const frag = document.createDocumentFragment();
  let x = -10;
  while (x < 1610) {
    const w = 70 + rand() * 90;
    const h = 70 + rand() * 120;
    const y = 260 - h;
    const g = document.createElementNS(SVG_NS, 'g');
    const body = document.createElementNS(SVG_NS, 'rect');
    Object.entries({ x, y, width: w, height: h + 2, rx: 4, class: 'bld' }).forEach(([k, v]) => body.setAttribute(k, v));
    g.appendChild(body);
    if (rand() > 0.45) {
      const roof = document.createElementNS(SVG_NS, 'path');
      roof.setAttribute('d', `M${x - 4} ${y + 2} L${x + w / 2} ${y - 28 - rand() * 18} L${x + w + 4} ${y + 2} Z`);
      roof.setAttribute('class', 'bld');
      g.appendChild(roof);
    }
    const cols = Math.max(1, Math.floor((w - 16) / 26));
    const rows = Math.max(1, Math.floor((h - 24) / 34));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.35) continue;
        const win = document.createElementNS(SVG_NS, 'rect');
        const gap = (w - cols * 14) / (cols + 1);
        Object.entries({ x: x + gap + c * (14 + gap), y: y + 16 + r * 34, width: 14, height: 18, rx: 3, class: 'w' })
          .forEach(([k, v]) => win.setAttribute(k, v));
        g.appendChild(win);
      }
    }
    frag.appendChild(g);
    x += w + 6;
  }
  svg.appendChild(frag);
}

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
function bezier(p0, p1, p2, t) {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
}

export function initStory({ onScene } = {}) {
  const section = document.getElementById('story');
  const stage = document.getElementById('stage');
  if (!section || !stage) return null;

  const orb = document.getElementById('orb');
  const bonk = document.getElementById('bonk');
  const caps = [...stage.querySelectorAll('.cap')];
  const capFile = document.getElementById('capFile');
  const dotsWrap = document.getElementById('capDots');
  const glass = stage.querySelector('.wisp-house__glass');
  const chimney = stage.querySelector('.nursery__chimney');
  const caption = stage.querySelector('.caption');

  buildTown(document.getElementById('town'));

  // Chapter dots double as a tiny scene navigator.
  const dots = caps.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Go to chapter ${i + 1}`);
    b.addEventListener('click', () => jumpTo(i + 1));
    dotsWrap.appendChild(b);
    return b;
  });

  let geo = null;
  let scene = 0;

  function measure() {
    const s = stage.getBoundingClientRect();
    const rel = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2, top: r.top - s.top };
    };
    const g = rel(glass);
    const c = rel(chimney);
    geo = {
      w: s.width, h: s.height,
      start: { x: g.x, y: g.y },
      rise: { x: g.x + s.width * 0.08, y: Math.max(s.height * 0.3, g.y - s.height * 0.3) },
      // arc past the moon, kept below the narration window
      ctrl: { x: s.width * 0.6, y: Math.max(s.height * 0.2, rel(caption).top + caption.offsetHeight + 30) },
      land: { x: c.x, y: c.top + 4 },
      sectionTop: section.offsetTop,
      range: section.offsetHeight - stage.offsetHeight,
      barH: parseFloat(getComputedStyle(stage).top) || 0, // the sticky offset (top bar height)
    };
    bonk.style.setProperty('--bx', `${geo.land.x}px`);
    bonk.style.setProperty('--by', `${geo.land.y - 6}px`);
  }

  function setScene(n) {
    if (n === scene) return;
    scene = n;
    stage.dataset.scene = String(n);
    caps.forEach((cap, i) => {
      const active = i + 1 === n;
      cap.classList.toggle('is-active', active);
      cap.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((d, i) => (i + 1 === n ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current')));
    capFile.textContent = `story_0${n}.txt`;
    onScene?.(n);
  }

  function placeOrb(local) {
    let p;
    if (scene === 1) {
      const t = ease(Math.min(1, local * 1.3));
      p = { x: lerp(geo.start.x, geo.rise.x, t), y: lerp(geo.start.y, geo.rise.y, t) };
    } else if (scene === 2) {
      p = bezier(geo.rise, geo.ctrl, geo.land, ease(Math.min(1, local / 0.85)));
    } else {
      return;
    }
    orb.style.setProperty('--ox', `${p.x.toFixed(1)}px`);
    orb.style.setProperty('--oy', `${p.y.toFixed(1)}px`);
  }

  function update() {
    ticking = false;
    if (!section.offsetParent) return; // page not showing
    if (!geo) measure();
    const raw = (window.scrollY + geo.barH - geo.sectionTop) / Math.max(1, geo.range);
    const progress = Math.min(0.9999, Math.max(0, raw));
    const exact = progress * SCENES;
    const n = Math.floor(exact) + 1;
    const local = exact - (n - 1);
    setScene(n);
    placeOrb(local);
    stage.classList.toggle('is-bonk', n === 2 && local > 0.84);
  }

  function jumpTo(n) {
    if (!geo) measure();
    const y = geo.sectionTop - geo.barH + ((n - 1 + 0.35) / SCENES) * geo.range;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  let ticking = false;
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => { geo = null; request(); });
  window.addEventListener('load', () => { geo = null; request(); });
  update();

  return { get scene() { return scene; } };
}