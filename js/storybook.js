// Tier 2 · Bedtime Storybook — "Mumble and the Very Big Dark", written & drawn by Pip.
// Desktop: a two-page spread with 3D page turns. Phones: one page at a time.
// Turn pages with the buttons, ← → keys, a swipe, or a tap on the page edge.

import { pageTurn } from './audio.js';
import { remember } from './memory.js';

// ---------- illustrations (hand-drawn SVG) ----------
const BODY = 'M-56 46 V4 Q-56 -36 0 -36 Q56 -36 56 4 V46 l-14 -10 -14 10 -14 -10 -14 10 -14 -10 -14 10 -14 -10 Z';
const STAR = (x, y, r, fill = '#ffd27a') => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${pts}" fill="${fill}" />`;
};

function mumble(mood, x = 150, y = 130, s = 1) {
  const eyes = {
    scared: '<circle cx="-18" cy="-2" r="12" fill="#fff"/><circle cx="18" cy="-2" r="12" fill="#fff"/><circle cx="-17" cy="-7" r="3.5" fill="#2e2350"/><circle cx="19" cy="-7" r="3.5" fill="#2e2350"/><path d="M-32 -20 l12 5 M32 -20 l-12 5" stroke="#2e2350" stroke-width="3" stroke-linecap="round"/>',
    frizzy: '<circle cx="-18" cy="-2" r="13" fill="#fff"/><circle cx="18" cy="-2" r="13" fill="#fff"/><circle cx="-18" cy="-2" r="4" fill="#2e2350"/><circle cx="18" cy="-2" r="4" fill="#2e2350"/>',
    dim: '<circle cx="-18" cy="-2" r="11" fill="#fff"/><circle cx="18" cy="-2" r="11" fill="#fff"/><circle cx="-18" cy="4" r="4.5" fill="#2e2350"/><circle cx="18" cy="4" r="4.5" fill="#2e2350"/>',
    happy: '<circle cx="-18" cy="-2" r="11" fill="#fff"/><circle cx="18" cy="-2" r="11" fill="#fff"/><circle cx="-16" cy="-1" r="5" fill="#2e2350"/><circle cx="20" cy="-1" r="5" fill="#2e2350"/><circle cx="-14" cy="-3" r="1.6" fill="#fff"/><circle cx="22" cy="-3" r="1.6" fill="#fff"/>',
    sleep: '<path d="M-28 -2 q10 8 20 0 M8 -2 q10 8 20 0" stroke="#2e2350" stroke-width="3" fill="none" stroke-linecap="round"/>',
  }[mood];
  const mouth = {
    scared: '<path d="M-10 22 q5 -5 10 0 q5 5 10 0" stroke="#2e2350" stroke-width="3" fill="none" stroke-linecap="round"/>',
    frizzy: '<ellipse cx="0" cy="22" rx="6" ry="7" fill="#2e2350"/>',
    dim: '<path d="M-8 24 h16" stroke="#2e2350" stroke-width="3" stroke-linecap="round"/>',
    happy: '<path d="M-12 18 q12 12 24 0" stroke="#2e2350" stroke-width="3" fill="none" stroke-linecap="round"/>',
    sleep: '<path d="M-8 18 q8 8 16 0" stroke="#2e2350" stroke-width="3" fill="none" stroke-linecap="round"/>',
  }[mood];
  const cheeks = mood === 'happy' || mood === 'sleep' ? '<circle cx="-34" cy="12" r="6" fill="#ffb5c8"/><circle cx="34" cy="12" r="6" fill="#ffb5c8"/>' : '';
  const extra = {
    scared: '<path d="M-74 -6 q-6 8 0 16 M-82 -10 q-8 12 0 24 M74 -6 q6 8 0 16 M82 -10 q8 12 0 24" stroke="#8a74d6" stroke-width="3" fill="none" stroke-linecap="round"/>',
    frizzy: '<path d="M-56 -4 l-12 -6 8 -8 -10 -12 12 -2 -2 -14 12 4 4 -14 10 10 10 -12 4 14 12 -4 -2 14 12 2 -10 12 8 8 -12 6" fill="#8a74d6" stroke="#8a74d6" stroke-width="2" stroke-linejoin="round"/>',
    dim: '<text x="40" y="-44" font-family="Fredoka, sans-serif" font-weight="800" font-size="30" fill="#c9b6f2">?</text>',
    happy: '',
    sleep: `${STAR(0, 40, 18)}<text x="46" y="-40" font-family="Fredoka, sans-serif" font-weight="800" font-size="20" fill="#c9b6f2">z z</text>`,
  }[mood];
  return `<g transform="translate(${x} ${y}) scale(${s})">${mood === 'frizzy' ? extra : ''}<path d="${BODY}" fill="#8a74d6"/><path d="M-40 -28 l-10 -14 M40 -28 l10 -14" stroke="#8a74d6" stroke-width="6" stroke-linecap="round"/>${eyes}${mouth}${cheeks}${mood === 'frizzy' ? '' : extra}</g>`;
}

const lamp = (x, y, s, glow) => `<g transform="translate(${x} ${y}) scale(${s})">${glow}<path d="M-26 20 V-6 a26 26 0 0 1 52 0 V20 Z" fill="#fff1c9"/><rect x="-32" y="20" width="64" height="12" rx="6" fill="#c9b6f2"/><path d="M-8 -36 a8 8 0 0 1 16 0" stroke="#d9a75d" stroke-width="4" fill="none"/></g>`;

const crib = '<g fill="#e3b77f"><rect x="40" y="70" width="220" height="12" rx="6"/><rect x="40" y="150" width="220" height="10" rx="5"/><rect x="34" y="56" width="12" height="130" rx="6"/><rect x="254" y="56" width="12" height="130" rx="6"/></g><g fill="#efcd9b"><rect x="70" y="82" width="8" height="68"/><rect x="104" y="82" width="8" height="68"/><rect x="138" y="82" width="8" height="68"/><rect x="172" y="82" width="8" height="68"/><rect x="206" y="82" width="8" height="68"/></g>';

const ART = {
  cover: `<circle cx="226" cy="54" r="24" fill="#ffe7a8"/><circle cx="238" cy="46" r="22" fill="#a34063"/>${STAR(60, 40, 8)}${STAR(96, 74, 5)}${STAR(250, 120, 6)}${mumble('happy', 150, 150, 1.05)}`,
  under: `<rect width="300" height="220" fill="#2a2260"/>${crib}<rect x="40" y="160" width="220" height="40" fill="#120e30"/><circle cx="132" cy="182" r="8" fill="#fff"/><circle cx="158" cy="182" r="8" fill="#fff"/><circle cx="133" cy="183" r="3.5" fill="#2e2350"/><circle cx="159" cy="183" r="3.5" fill="#2e2350"/>`,
  scared: `<rect width="300" height="220" fill="#2a2260"/>${STAR(50, 40, 5, '#fff7')}${STAR(240, 30, 4, '#fff7')}${mumble('scared', 150, 130)}`,
  owl: `<rect width="300" height="220" fill="#2a2260"/><g transform="translate(70 120)"><ellipse rx="40" ry="50" fill="#9b7fb8"/><ellipse cy="14" rx="24" ry="30" fill="#e9dcf5"/><circle cx="-14" cy="-16" r="13" fill="#fff8ec"/><circle cx="14" cy="-16" r="13" fill="#fff8ec"/><circle cx="-13" cy="-15" r="5" fill="#3a2f5c"/><circle cx="13" cy="-15" r="5" fill="#3a2f5c"/><path d="M-5 -2 L0 8 L5 -2 Z" fill="#f2b45a"/></g>${mumble('scared', 205, 140, 0.8)}`,
  bright: `<rect width="300" height="220" fill="#fff4c9"/><g stroke="#ffcf6e" stroke-width="5" stroke-linecap="round"><path d="M70 30 l-14 -14 M70 110 l-18 0 M90 18 l0 -14 M118 30 l14 -14"/></g>${lamp(90, 80, 1.1, '<circle r="70" fill="#ffe28a" opacity=".6"/>')}${mumble('frizzy', 205, 150, 0.8)}`,
  dim: `<rect width="300" height="220" fill="#17123a"/>${lamp(80, 80, 0.7, '<circle r="18" fill="#ffe28a" opacity=".25"/>')}<g opacity=".55">${mumble('dim', 195, 140, 0.85)}</g>`,
  right: `<rect width="300" height="220" fill="#2a2260"/><circle cx="150" cy="96" r="64" fill="#ffe7b0" opacity=".35"/><circle cx="150" cy="96" r="34" fill="#ffe7b0" opacity=".5"/>${STAR(150, 96, 16, '#fff6d6')}${mumble('happy', 150, 160, 0.75)}`,
  sleep: `<rect width="300" height="220" fill="#2a2260"/><circle cx="150" cy="140" r="70" fill="#ffe7b0" opacity=".18"/>${mumble('sleep', 150, 130)}`,
  night: `<rect width="300" height="220" fill="#2a2260"/><circle cx="230" cy="52" r="26" fill="#ffe7a8"/><circle cx="243" cy="44" r="24" fill="#2a2260"/>${STAR(60, 50, 5)}${STAR(120, 30, 4)}${STAR(180, 70, 3)}<g fill="#1a1545"><rect x="10" y="150" width="60" height="70"/><path d="M6 150 L40 122 L74 150 Z"/><rect x="80" y="130" width="70" height="90"/><rect x="160" y="160" width="56" height="60"/><path d="M156 160 L188 134 L220 160 Z"/><rect x="226" y="140" width="64" height="80"/></g><g fill="#ffd88a"><rect x="28" y="170" width="12" height="14" rx="2"/><rect x="100" y="150" width="12" height="14" rx="2"/><rect x="120" y="180" width="12" height="14" rx="2"/><rect x="180" y="176" width="12" height="14" rx="2"/><rect x="246" y="160" width="12" height="14" rx="2"/></g>`,
};

const PAGES = [
  { kind: 'cover', art: 'cover', title: 'Mumble and the Very Big Dark', by: 'written &amp; drawn by Pip (age 1¾ dreams)' },
  { art: 'under', text: 'Under the crib in the Midnight Nursery lived a monster named Mumble.' },
  { art: 'scared', text: 'Mumble was not scary. Mumble was <em>scared</em>. Mostly of the dark.' },
  { art: 'owl', text: '“But you <em>live</em> in the dark!” said Nana Noctua.<br>“I know,” said Mumble. “It’s very inconvenient.”' },
  { art: 'bright', text: 'So I built Mumble a nightlight. It was too bright. His fur went all frizzy.' },
  { art: 'dim', text: 'I built another one. Too dim. He couldn’t even find his own feet.' },
  { art: 'right', text: 'The third one was just right: the size of a star, and the colour of warm milk.' },
  { art: 'sleep', text: 'Now Mumble sleeps with a star in his paws. He’s only a little bit afraid. That’s allowed.' },
  { art: 'night', text: 'Goodnight, Mumble. Goodnight, crib. Goodnight, everything.' },
  { kind: 'back' },
];
const INNER = PAGES.length - 2; // numbered story pages

function pageHTML(p, i) {
  if (!p) return '<div class="page page--blank"></div>';
  if (p.kind === 'cover') {
    return `<div class="page page--cover"><svg viewBox="0 0 300 220" aria-hidden="true">${ART[p.art]}</svg><h3>${p.title}</h3><p>${p.by}</p></div>`;
  }
  if (p.kind === 'back') {
    return '<div class="page page--back"><p class="page__end">The End ♡</p><button class="chip book__again" type="button">↺ read it again</button><p class="page__press">Midnight Nursery Press · 1999</p></div>';
  }
  return `<div class="page"><svg class="page__art" viewBox="0 0 300 220" aria-hidden="true">${ART[p.art]}</svg><p class="page__text">${p.text}</p><span class="page__num">${i}</span></div>`;
}

export function initStorybook() {
  const book = document.getElementById('book3d');
  if (!book) return;
  const inner = document.getElementById('bookInner');
  const prev = document.getElementById('bookPrev');
  const next = document.getElementById('bookNext');
  const count = document.getElementById('bookCount');
  const wide = window.matchMedia('(min-width: 760px)');

  let mode = '';
  let sheets = [];
  let turned = 0; // how many sheets have been turned

  // Which page the reader is looking at (for keeping their place across layouts).
  const currentPage = () => (mode === 'spread' ? Math.min(PAGES.length - 1, turned * 2) : turned);

  function build(keepPage = 0) {
    mode = wide.matches ? 'spread' : 'single';
    book.dataset.mode = mode;
    const pairs = mode === 'spread'
      ? Array.from({ length: PAGES.length / 2 }, (_, s) => [s * 2, s * 2 + 1]) // front = right page, back = next left page
      : PAGES.map((_, i) => [i, null]);
    inner.innerHTML = pairs.map(([f, b], s) => `
      <div class="sheet" data-s="${s}">
        <div class="sheet__face sheet__face--front">${pageHTML(PAGES[f], f)}</div>
        <div class="sheet__face sheet__face--back">${b === null ? pageHTML(null) : pageHTML(PAGES[b], b)}</div>
      </div>`).join('');
    sheets = [...inner.querySelectorAll('.sheet')];
    turned = mode === 'spread' ? Math.ceil(keepPage / 2) : keepPage;
    update(false);
  }

  function maxTurn() { return mode === 'spread' ? sheets.length : sheets.length - 1; }

  function label() {
    const page = currentPage();
    if (mode === 'spread') {
      if (turned === 0) return 'cover';
      if (turned === sheets.length) return 'the end';
      return `pages ${turned * 2 - 1}–${Math.min(turned * 2, INNER)} of ${INNER}`;
    }
    if (page === 0) return 'cover';
    if (page === PAGES.length - 1) return 'the end';
    return `page ${page} of ${INNER}`;
  }

  function update(animate = true, flipping = -1) {
    sheets.forEach((sheet, i) => {
      const isTurned = i < turned;
      sheet.classList.toggle('is-turned', isTurned);
      sheet.style.zIndex = i === flipping ? 50 : isTurned ? i + 1 : sheets.length - i;
      // Hide faces that can't be seen, so screen readers only meet the open pages.
      sheet.setAttribute('aria-hidden', String(mode === 'spread' ? !(i === turned || i === turned - 1) : i !== turned));
    });
    book.dataset.state = turned === 0 ? 'closed' : turned >= sheets.length ? 'end' : 'open';
    prev.disabled = turned === 0;
    next.disabled = turned >= maxTurn();
    count.textContent = label();
    if (currentPage() === PAGES.length - 1) remember({ bookDone: true });
    if (animate) pageTurn();
  }

  function go(delta) {
    const target = Math.max(0, Math.min(maxTurn(), turned + delta));
    if (target === turned) return;
    const flipping = delta > 0 ? turned : target;
    turned = target;
    update(true, flipping);
  }

  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  book.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });

  // Swipe, or tap the right/left half of the book.
  let downX = null;
  book.addEventListener('pointerdown', (e) => { downX = e.clientX; });
  book.addEventListener('pointerup', (e) => {
    if (downX === null || e.target.closest('button')) { downX = null; return; }
    const dx = e.clientX - downX;
    downX = null;
    if (Math.abs(dx) > 40) { go(dx < 0 ? 1 : -1); return; }
    const r = book.getBoundingClientRect();
    go(e.clientX > r.left + r.width / 2 || mode === 'single' ? 1 : -1);
  });

  inner.addEventListener('click', (e) => {
    if (!e.target.closest('.book__again')) return;
    e.stopPropagation();
    turned = 0;
    update(true);
  });

  wide.addEventListener('change', () => build(currentPage()));
  build(0);
}