// Pip's desktop: two little files on the map, like icons on an old computer desktop.
//   about_me.txt  → opens the "all about me" window
//   memories.exe  → opens the "pip remembers you" window (with a red "1" when you come back)
// The real windows from the section below the map pop out of their icon (Win95-style zoom), get a proper
// title bar with working _ □ × buttons, can be dragged around by the title bar, and go home again when closed.

import { plink } from './audio.js';
import { memory } from './memory.js';

const calm = matchMedia('(prefers-reduced-motion: reduce)');
const phone = matchMedia('(max-width: 720px)');

export function initDesk() {
  const section = document.getElementById('hello');
  const desk = document.getElementById('dmDesk');
  if (!section || !desk) return;

  // (the icons sit in the bottom-left corner of the map; that's all CSS)

  // ---------- the red "1": pip has memories of you to show ----------
  const badge = desk.querySelector('.dm__file-badge');
  if (badge && memory().visits > 1) badge.hidden = false;

  // ---------- windows ----------
  let z = 20;
  const open = new Set();

  function front(win) { win.style.zIndex = String(++z); }

  function clamp(win, x, y) {
    const maxX = section.clientWidth - win.offsetWidth - 12, maxY = section.clientHeight - win.offsetHeight - 12;
    return [Math.max(12, Math.min(maxX, x)), Math.max(12, Math.min(maxY, y))];
  }

  function show(btn, win) {
    if (open.has(win)) { front(win); win.focus({ preventScroll: true }); return; }
    const name = btn.querySelector('.dm__file-name').textContent;
    const title = win.querySelector('.win__bar > span:first-child');
    // leave a bookmark where the window lives, so it can go back there when it's closed
    const mark = document.createComment(' pip window ');
    win.before(mark);
    win._home = mark; win._btn = btn;
    // a real title bar: _ minimises back to the icon, □ makes it bigger, × closes
    const btns = win.querySelector('.win__btns');
    btns._old = btns.innerHTML;
    btns.removeAttribute('aria-hidden');
    btns.innerHTML = `<button class="win__b" type="button" data-act="min" aria-label="minimise ${name}" title="minimise">_</button>`
      + `<button class="win__b" type="button" data-act="max" aria-label="make ${name} bigger" aria-pressed="false" title="maximise">□</button>`
      + `<button class="win__b" type="button" data-act="close" aria-label="close ${name}" title="close">×</button>`;
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-labelledby', title.id);
    win.tabIndex = -1;
    win.classList.add('is-floating');
    section.appendChild(win);

    // where it opens: just above the icons (a little cascade if both are open); on phones, full width above them
    const s = section.getBoundingClientRect(), d = desk.getBoundingClientRect();
    if (phone.matches) {
      win.style.top = '10px';
      win.style.maxHeight = `${Math.round(d.top - s.top - 18)}px`;
    } else {
      const n = open.size;
      const [x, y] = clamp(win, d.left - s.left + n * 36, d.top - s.top - win.offsetHeight - 14 + n * 36);
      win.style.left = `${x}px`; win.style.top = `${y}px`;
    }
    // zoom out of the icon it came from
    const i = btn.querySelector('.dm__file-icon').getBoundingClientRect(), w = win.getBoundingClientRect();
    win.style.setProperty('--ox', `${i.left + i.width / 2 - w.left}px`);
    win.style.setProperty('--oy', `${i.top + i.height / 2 - w.top}px`);
    win.classList.remove('is-closing');
    if (!calm.matches) { win.classList.remove('is-opening'); void win.offsetWidth; win.classList.add('is-opening'); }

    open.add(win);
    front(win);
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
    if (btn === badge?.closest('.dm__file')) badge.hidden = true;
    plink(1.25);
    win.focus({ preventScroll: true });
  }

  function hide(win) {
    if (!open.has(win) || win.classList.contains('is-closing')) return;
    const btn = win._btn;
    const done = () => {
      win.classList.remove('is-floating', 'is-opening', 'is-closing', 'is-max');
      win.removeAttribute('role'); win.removeAttribute('aria-labelledby'); win.removeAttribute('tabindex');
      win.style.left = win.style.top = win.style.zIndex = win.style.maxHeight = '';
      const btns = win.querySelector('.win__btns');
      btns.innerHTML = btns._old; btns.setAttribute('aria-hidden', 'true');
      win._home.replaceWith(win); // back to its place under the map
      open.delete(win);
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('is-open');
      btn.focus({ preventScroll: true });
    };
    plink(0.8);
    if (calm.matches) return done();
    win.classList.add('is-closing'); // shrink back into the icon
    setTimeout(done, 220);
  }

  for (const btn of desk.querySelectorAll('.dm__file')) {
    const win = document.getElementById(btn.getAttribute('aria-controls'));
    if (!win) continue;
    btn.addEventListener('click', () => show(btn, win));

    win.addEventListener('click', (e) => {
      const act = e.target.closest('.win__b')?.dataset.act;
      if (!act || !open.has(win)) return;
      if (act === 'max') {
        const big = win.classList.toggle('is-max');
        e.target.closest('.win__b').setAttribute('aria-pressed', String(big));
        if (!big) { const [x, y] = clamp(win, win.offsetLeft, win.offsetTop); win.style.left = `${x}px`; win.style.top = `${y}px`; }
      } else hide(win);
    });
    win.addEventListener('pointerdown', () => { if (open.has(win)) front(win); });

    // drag by the title bar (on bigger screens)
    const bar = win.querySelector('.win__bar');
    let drag = null;
    bar.addEventListener('pointerdown', (e) => {
      if (!open.has(win) || phone.matches || win.classList.contains('is-max') || e.target.closest('button') || e.button > 0) return;
      drag = { x: e.clientX - win.offsetLeft, y: e.clientY - win.offsetTop };
      bar.setPointerCapture(e.pointerId);
      win.classList.add('is-dragging');
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const [x, y] = clamp(win, e.clientX - drag.x, e.clientY - drag.y);
      win.style.left = `${x}px`; win.style.top = `${y}px`;
    });
    const stop = () => { drag = null; win.classList.remove('is-dragging'); };
    bar.addEventListener('pointerup', stop);
    bar.addEventListener('pointercancel', stop);
  }

  // Esc closes the window on top (wherever the focus is)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open.size || e.defaultPrevented) return;
    const top = [...open].sort((a, b) => b.style.zIndex - a.style.zIndex)[0];
    hide(top);
  });

  // keep open windows on screen if the window is resized
  addEventListener('resize', () => {
    for (const win of open) {
      if (phone.matches || win.classList.contains('is-max')) continue;
      const [x, y] = clamp(win, win.offsetLeft, win.offsetTop);
      win.style.left = `${x}px`; win.style.top = `${y}px`;
    }
  });
}