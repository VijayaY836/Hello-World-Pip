// Pip's starry eyes follow the cursor (or your finger), wander when you're idle,
// and blink now and then. In day mode Pip is asleep, so the eyes stay shut.

const IDLE_MS = 3500;

export function initEyes(pip) {
  const eyes = [...pip.querySelectorAll('.pip__eye')].map((el) => ({
    el,
    glint: el.querySelector('.pip__glint'),
    x: 0, y: 0,
  }));
  if (!eyes.length) return;

  let target = null;
  let lastInput = 0;
  let visible = true;
  let wanderAt = 0;

  const onPointer = (e) => {
    target = { x: e.clientX, y: e.clientY };
    lastInput = performance.now();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) measure(); }).observe(pip);

  // Measure where things are only when the layout can change (scroll, resize, page switch),
  // never every frame: reading positions each frame forces the browser to redo layout.
  let pipRect = null;
  function measure() {
    pipRect = pip.getBoundingClientRect();
    for (const eye of eyes) {
      const r = eye.el.getBoundingClientRect();
      eye.cx = r.left + r.width / 2; eye.cy = r.top + r.height / 2; eye.w = r.width; eye.h = r.height;
    }
  }
  let dirty = true;
  const markDirty = () => { dirty = true; };
  addEventListener('scroll', markDirty, { passive: true });
  addEventListener('resize', markDirty);
  addEventListener('pip:view', markDirty);
  addEventListener('pip:moved', markDirty); // the dream map scrolled sideways
  setInterval(markDirty, 1500); // Pip gently bobs, so refresh now and then

  function wander(now) {
    if (now < wanderAt) return;
    const r = pipRect;
    target = {
      x: r.left + r.width * (0.1 + Math.random() * 0.8),
      y: r.top + r.height * (0.15 + Math.random() * 0.5),
    };
    wanderAt = now + 1400 + Math.random() * 1800;
  }

  // Glints move only when there's somewhere new to look (pointer moves, or an idle glance);
  // CSS transitions do the smooth easing, so there's no animation loop running all the time.
  let queued = false;
  function aim() {
    queued = false;
    if (!visible || document.documentElement.dataset.theme === 'day' || !target) return;
    if (dirty || !pipRect) { measure(); dirty = false; }
    for (const eye of eyes) {
      const dx = target.x - eye.cx, dy = target.y - eye.cy;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 220); // closer cursor → smaller movement
      eye.glint.style.setProperty('--gx', `${((dx / dist) * eye.w * 0.27 * reach).toFixed(1)}px`);
      eye.glint.style.setProperty('--gy', `${((dy / dist) * eye.h * 0.25 * reach).toFixed(1)}px`);
    }
  }
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(aim); } };
  addEventListener('pointermove', request, { passive: true });
  addEventListener('pointerdown', request, { passive: true });
  (function glance() {
    setTimeout(() => {
      if (visible && performance.now() - lastInput > IDLE_MS) {
        if (dirty || !pipRect) { measure(); dirty = false; }
        wanderAt = 0; wander(performance.now()); request();
      }
      glance();
    }, 1400 + Math.random() * 1800);
  })();

  // Blink every few seconds (only while awake).
  (function scheduleBlink() {
    setTimeout(() => {
      if (document.documentElement.dataset.theme !== 'day') {
        pip.classList.add('is-blinking');
        setTimeout(() => pip.classList.remove('is-blinking'), 150);
      }
      scheduleBlink();
    }, 2500 + Math.random() * 3500);
  })();
}