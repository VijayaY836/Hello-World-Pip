// Work and Play open on a grid of cards. Each card opens one "room" (the router does the opening).
// This adds the little "← back" / "next →" bar to every room, and shows on each card what
// Pip remembers you've done there (✓ built a dream, best score, 3/5 doodles found…).

import { icon } from './icons.js';
import { memory, best, onMemory } from './memory.js';

const HUBS = {
  work: { back: '#/work', label: 'back to the workshop', rooms: ['workshop', 'work', 'lab', 'book', 'routes'] },
  play: { back: '#/play', label: 'back to all games', rooms: ['nightroom', 'play', 'pip3d-sec', 'guestbook'] },
};

const DONE = {
  built: (m) => (m.built ? '✓ you built a dream' : ''),
  composed: (m) => (m.composed ? '✓ you wrote a lullaby' : ''),
  bookDone: (m) => (m.bookDone ? '✓ read it all' : ''),
  routesDone: (m) => (m.routesDone ? '✓ route flown' : ''),
  dreams: (m) => (m.dreams >= 5 ? '✓ all 5 doodles found' : m.dreams > 0 ? `✦ ${m.dreams}/5 found` : ''),
  played: (m) => (best() > 0 ? `★ best shift: ${best()}` : m.played ? '✓ played' : ''),
  wished: (m) => (m.wished ? '✓ you left a wish' : ''),
};

export function initHubs() {
  for (const hub of Object.values(HUBS)) {
    hub.rooms.forEach((id, i) => {
      const room = document.getElementById(id);
      if (!room || room.querySelector('.room-nav')) return;
      const next = document.getElementById(hub.rooms[(i + 1) % hub.rooms.length]);
      const nav = document.createElement('nav');
      nav.className = 'room-nav';
      nav.setAttribute('aria-label', 'Room navigation');
      nav.innerHTML = `<a class="chip room-nav__back" href="${hub.back}">${icon('left')} ${hub.label}</a>`
        + `<a class="chip room-nav__next" href="#${next.id}">next: ${next.dataset.roomName.toLowerCase()} ${icon('right')}</a>`;
      room.prepend(nav);
    });
  }

  const badges = [...document.querySelectorAll('.hub-card__done[data-done]')];
  function paint() {
    const m = memory();
    for (const b of badges) {
      const text = DONE[b.dataset.done]?.(m) || '';
      b.textContent = text;
      b.hidden = !text;
    }
  }
  paint();
  onMemory(paint);
  addEventListener('pip:room', paint);
}