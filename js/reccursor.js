// Recording mode (open the site with ?rec): the page draws Pip's pixel cursor itself and hides the system one,
// so screen recorders (which sometimes swap website cursors for the plain arrow) always show the pixel cursor.
// Without ?rec this file never even loads.

const HOT = { arrow: [1, 1], hand: [10, 1], grab: [16, 14], grabbing: [16, 18] };
const CLICKABLE = 'a[href], button:not(:disabled), summary, label, select, [role="button"], [role="radio"], [role="tab"], input[type="radio"], input[type="checkbox"], input[type="range"]';

export function initRecCursor() {
  document.documentElement.classList.add('rec-cursor');
  const img = document.createElement('img');
  img.className = 'rec-cursor__img';
  img.alt = '';
  img.width = img.height = 32;
  document.body.appendChild(img);
  Object.keys(HOT).forEach((k) => { new Image().src = `assets/cursors/${k}.svg`; }); // preload all four
  let kind = '', x = -100, y = -100, raf = 0;

  function pick(target) {
    if (!(target instanceof Element)) return 'arrow';
    if (target.closest('.dm__viewport.is-dragging, .win.is-dragging')) return 'grabbing';
    if (target.closest(CLICKABLE)) return 'hand';
    if (target.closest('.dm__viewport, .win.is-floating .win__bar')) return 'grab';
    return 'arrow';
  }
  function paint() {
    raf = 0;
    const [hx, hy] = HOT[kind] || HOT.arrow;
    img.style.transform = `translate(${x - hx}px, ${y - hy}px)`;
  }
  function move(e) {
    x = e.clientX; y = e.clientY;
    const k = pick(e.target);
    if (k !== kind) { kind = k; img.src = `assets/cursors/${k}.svg`; }
    // where the site hides the cursor on purpose (the lantern room, a game in play), hide this one too
    const hidden = e.target instanceof Element && e.target.closest('.room:not(.is-lit), .game.is-playing:not(.sheep)');
    img.style.opacity = hidden ? '0' : '1';
    if (!raf) raf = requestAnimationFrame(paint);
  }
  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerdown', move, { passive: true });
  addEventListener('pointerup', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { img.style.opacity = '0'; });
}