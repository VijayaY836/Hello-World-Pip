// Tiny hash router: one page per view (#/, #/story, #/work, #/play).
// Header and footer stay; only the middle swaps. Work and Play show a grid of cards; each card opens one "room". Old section links (#lab, #book…)
// and shared lullaby / dream links (#lullaby=…, #dream=…) still work: they open the right page and scroll there.

import { remember } from './memory.js';

const VIEWS = ['home', 'story', 'work', 'play', 'moondoor']; // moondoor is a secret: no menu link goes there
const TITLES = {
  home: 'Pip · Junior Dream Engineer',
  story: 'Pip · My Story',
  work: 'Pip · Things I Make',
  play: 'Pip · Games & Secrets',
  moondoor: 'Pip · Behind the Moon (shh)',
};
const FILE = { home: '', story: ' ✦ my story', work: ' ✦ my workbench', play: ' ✦ let’s play', moondoor: ' ✦ behind the moon' };
const ADDRESS = 'Pip’s Midnight Nursery';

function resolve(hash) {
  const h = hash.replace(/^#/, '');
  if (h === '' || h === '/') return { view: 'home' };
  const route = h.match(/^\/(\w+)/);
  if (route && VIEWS.includes(route[1])) return { view: route[1] };
  if (h.startsWith('lullaby=')) return { view: 'work', target: 'lab' };
  if (h.startsWith('dream=')) return { view: 'work', target: 'workshop' };
  // A plain #id: open whichever page contains it.
  const el = document.getElementById(h);
  const view = el?.closest('.view')?.dataset.view;
  return view ? { view, target: h } : { view: 'home' };
}

export function initRouter() {
  const views = Object.fromEntries([...document.querySelectorAll('.view')].map((v) => [v.dataset.view, v]));
  const navLinks = [...document.querySelectorAll('[data-route]')];
  const address = document.querySelector('.address__url');
  let current = null;
  let openRoom = null;

  function show({ view, target }, first = false) {
    const changed = view !== current;
    current = view;
    for (const [name, el] of Object.entries(views)) el.hidden = name !== view;
    document.documentElement.dataset.view = view;
    // Work and Play open on a grid of cards; a card (or any link to one of its sections) opens that one "room".
    const goalEl = target && document.getElementById(target);
    const room = goalEl?.closest('.pg-room') || null;
    const roomChanged = room !== openRoom;
    openRoom = room;
    for (const el of Object.values(views)) {
      if (room && room.closest('.view') === el) el.dataset.open = room.id; else delete el.dataset.open;
    }
    document.querySelectorAll('.pg-room.is-open').forEach((r) => { if (r !== room) r.classList.remove('is-open'); });
    if (room) room.classList.add('is-open');
    document.documentElement.dataset.room = room ? room.id : '';
    window.dispatchEvent(new CustomEvent('pip:view', { detail: view })); // lets a page set itself up on first visit
    if (view !== 'home') remember({ lastPage: view, visited: { [view]: true } }); // where to pick up next time
    document.title = room ? `Pip · ${room.dataset.roomName}` : TITLES[view];
    if (address) address.textContent = ADDRESS + FILE[view] + (room ? ` ✦ ${room.dataset.roomName.toLowerCase()}` : '');
    window.dispatchEvent(new CustomEvent('pip:room', { detail: room ? room.id : null }));
    navLinks.forEach((a) => (a.dataset.route === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));

    if ((changed || roomChanged) && !first) {
      const el = room || views[view];
      el.classList.remove('is-entering');
      void el.offsetWidth;
      el.classList.add('is-entering');
    }

    // Newly visible sections need to re-measure themselves.
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      const goal = target && document.getElementById(target);
      if (goal && goal !== room) goal.scrollIntoView({ behavior: 'instant', block: 'start' }); // a spot inside a room
      else if (changed || roomChanged) window.scrollTo({ top: 0, behavior: 'instant' });
      if ((changed || roomChanged) && !first) (room?.querySelector('.room-nav a') || document.getElementById('main'))?.focus({ preventScroll: true });
    });
  }

  window.addEventListener('hashchange', () => show(resolve(location.hash)));
  show(resolve(location.hash), true);
  return { get view() { return current; } };
}