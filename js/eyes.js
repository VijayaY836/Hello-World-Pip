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

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(pip);

  function wander(now) {
    if (now < wanderAt) return;
    const r = pip.getBoundingClientRect();
    target = {
      x: r.left + r.width * (0.1 + Math.random() * 0.8),
      y: r.top + r.height * (0.15 + Math.random() * 0.5),
    };
    wanderAt = now + 1400 + Math.random() * 1800;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.documentElement.dataset.theme === 'day') return;
    if (now - lastInput > IDLE_MS) wander(now);
    if (!target) return;

    for (const eye of eyes) {
      const r = eye.el.getBoundingClientRect();
      const dx = target.x - (r.left + r.width / 2);
      const dy = target.y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 220); // closer cursor → smaller movement
      const tx = (dx / dist) * r.width * 0.27 * reach;
      const ty = (dy / dist) * r.height * 0.25 * reach;
      eye.x += (tx - eye.x) * 0.16;
      eye.y += (ty - eye.y) * 0.16;
      eye.glint.style.setProperty('--gx', `${eye.x.toFixed(2)}px`);
      eye.glint.style.setProperty('--gy', `${eye.y.toFixed(2)}px`);
    }
  }
  requestAnimationFrame(frame);

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
