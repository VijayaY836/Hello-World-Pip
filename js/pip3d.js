// Tier 3 · 3D Pip (Three.js / WebGL).
// Pip is modelled entirely in code from simple shapes: no model file to download.
// Drag to spin, tap to squish, wave, spin, and a "1998 low-poly" render mode.
// Three.js loads only when this section scrolls near, so the rest of the site stays light.

import { giggle, plink, chime } from './audio.js';
import { sparks } from './fx.js';

const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Canvas texture: a fabric colour sprinkled with little shapes (stars for the cap, hearts for the onesie). */
function patternTexture(THREE, base, ink, shape, count = 26) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.fillStyle = ink;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const x = rand() * 256, y = rand() * 256, r = 13 + rand() * 9;
    g.save(); g.translate(x, y); g.rotate(rand() * Math.PI);
    g.beginPath();
    if (shape === 'star') {
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? r * 0.45 : r, a = (k / 10) * Math.PI * 2;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
    } else { // heart
      g.moveTo(0, r * 0.4);
      g.bezierCurveTo(-r, -r * 0.3, -r * 0.4, -r, 0, -r * 0.35);
      g.bezierCurveTo(r * 0.4, -r, r, -r * 0.3, 0, r * 0.4);
    }
    g.closePath(); g.fill(); g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPip(THREE) {
  const materials = [];
  const mat = (color, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...extra });
    materials.push(m);
    return m;
  };
  const mesh = (geo, material, [x = 0, y = 0, z = 0] = [], parent) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    parent?.add(m);
    return m;
  };

  const pip = new THREE.Group();      // whole character (rotates)
  const squish = new THREE.Group();   // for the squish bounce
  pip.add(squish);

  // ---- head: the round moon-skull ----
  const head = new THREE.Group();
  head.position.y = 0.9;
  squish.add(head);
  const skull = mesh(new THREE.SphereGeometry(1, 56, 40), mat('#eee4dc'), [], head);
  skull.scale.set(1.08, 1, 0.95);

  const socketMat = mat('#3d2722', { roughness: 0.45 });
  const glintMat = new THREE.MeshBasicMaterial({ color: '#ffe7a0' });
  const haloMat = new THREE.MeshBasicMaterial({ color: '#ffc45c', transparent: true, opacity: 0.35, depthWrite: false });
  const lidMat = mat('#efe4dc');
  const lashMat = mat('#6b4a3f');
  const eyes = [-1, 1].map((side) => {
    const g = new THREE.Group();
    g.position.set(0.36 * side, 0.04, 0.82);
    g.rotation.y = 0.38 * side;
    head.add(g);
    const socket = mesh(new THREE.SphereGeometry(0.27, 32, 20), socketMat, [], g);
    socket.scale.set(1, 1.12, 0.42);
    const glint = mesh(new THREE.SphereGeometry(0.055, 16, 12), glintMat, [0, 0, 0.12], g);
    const halo = mesh(new THREE.SphereGeometry(0.11, 16, 12), haloMat, [0, 0, 0.11], g);
    const lid = new THREE.Group();     // day mode: Pip sleeps, lids slide shut
    lid.position.z = 0.115;
    g.add(lid);
    const lidDisc = mesh(new THREE.CircleGeometry(0.28, 32), lidMat, [], lid);
    lidDisc.scale.y = 1.12;
    const lash = mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 20, Math.PI * 0.8), lashMat, [0, -0.02, 0.01], lid);
    lash.rotation.z = Math.PI + Math.PI * 0.1;
    lid.scale.y = 0.001;
    return { g, glint, halo, lid };
  });

  const nose = mesh(new THREE.ConeGeometry(0.065, 0.08, 3), socketMat, [0, -0.17, 0.92], head);
  nose.rotation.x = Math.PI; nose.rotation.z = Math.PI / 6;
  const smile = mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 28, Math.PI * 0.7), socketMat, [0, -0.3, 0.87], head);
  smile.rotation.z = Math.PI + (Math.PI - Math.PI * 0.7) / 2;
  smile.rotation.x = -0.32;
  const cheekMat = mat('#ff8fab', { transparent: true, opacity: 0.75, roughness: 1 });
  [-1, 1].forEach((side) => {
    const ch = mesh(new THREE.SphereGeometry(0.13, 20, 12), cheekMat, [0.58 * side, -0.24, 0.775], head);
    ch.scale.set(1, 0.7, 0.32);
    ch.rotation.y = 0.65 * side;
  });

  // ---- the starry nightcap, pom-pom and pink bow ----
  const capTex = patternTexture(THREE, '#efe2c8', '#d4a548', 'star', 14);
  capTex.repeat.set(2, 1.5);
  const capMat = mat('#ffffff', { map: capTex, roughness: 0.95 });
  const cap = new THREE.Group();
  cap.position.set(0, 0.58, -0.06);
  cap.rotation.set(-0.28, 0, 0.32);
  head.add(cap);
  mesh(new THREE.ConeGeometry(0.78, 1.25, 48), capMat, [0, 0.6, 0], cap);
  const brim = mesh(new THREE.TorusGeometry(0.8, 0.14, 16, 56), mat('#f6eedf', { roughness: 1 }), [0, 0, 0], cap);
  brim.rotation.x = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.2, 24, 16), mat('#efe3cf', { roughness: 1 }), [0, 1.24, 0], cap);
  const bowMat = mat('#f7a8bd', { roughness: 0.6 });
  const bow = new THREE.Group();
  bow.position.set(-0.42, 0.66, 0.62);
  bow.rotation.set(0.25, -0.45, 0.3);
  bow.scale.setScalar(1.35);
  head.add(bow);
  [-1, 1].forEach((side) => {
    const wing = mesh(new THREE.ConeGeometry(0.13, 0.26, 20), bowMat, [0.13 * side, 0, 0], bow);
    wing.rotation.z = (Math.PI / 2) * side;
    wing.scale.z = 0.55;
  });
  mesh(new THREE.SphereGeometry(0.075, 16, 12), bowMat, [], bow);

  // ---- body in a heart onesie ----
  const onesieTex = patternTexture(THREE, '#f5e2c4', '#ee8fac', 'heart', 16);
  onesieTex.repeat.set(1.5, 1.5);
  const onesie = mat('#ffffff', { map: onesieTex });
  const body = mesh(new THREE.SphereGeometry(0.62, 40, 28), onesie, [0, -0.2, 0], squish);
  body.scale.set(1, 1.02, 0.9);
  const handMat = mat('#f3ece6');
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.48 * side, 0.12, 0.05);
    pivot.rotation.z = side * 0.75;
    squish.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.14, 0.34, 8, 16), onesie, [0, -0.28, 0], pivot);
    mesh(new THREE.SphereGeometry(0.15, 20, 14), handMat, [0, -0.55, 0], pivot);
    return pivot;
  });
  const soleMat = mat('#c7b2e8');
  [-1, 1].forEach((side) => {
    const leg = mesh(new THREE.CapsuleGeometry(0.17, 0.2, 8, 16), onesie, [0.3 * side, -0.6, 0.28], squish);
    leg.rotation.x = Math.PI / 2.4;
    const foot = mesh(new THREE.SphereGeometry(0.2, 24, 16), soleMat, [0.3 * side, -0.68, 0.52], squish);
    foot.scale.set(1, 0.85, 0.55);
  });

  // ---- the cloud seat ----
  const cloudMat = mat('#fff6fb', { roughness: 1, emissive: '#3a2c66', emissiveIntensity: 0.12 });
  const cloud = new THREE.Group();
  cloud.position.y = -0.95;
  pip.add(cloud);
  [[0, 0, 0, 0.62], [0.72, -0.05, 0.1, 0.48], [-0.72, -0.05, 0.1, 0.48], [0.4, 0.05, 0.5, 0.42], [-0.4, 0.05, 0.5, 0.42],
    [1.15, -0.12, -0.1, 0.34], [-1.15, -0.12, -0.1, 0.34], [0, 0.02, -0.5, 0.48], [0.55, -0.02, -0.4, 0.4], [-0.55, -0.02, -0.4, 0.4]]
    .forEach(([x, y, z, r]) => { const puff = mesh(new THREE.SphereGeometry(r, 28, 20), cloudMat, [x, y, z], cloud); puff.scale.y = 0.72; });

  // ---- little stars that orbit Pip ----
  const starShape = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? 0.07 : 0.16, a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    const fn = k ? 'lineTo' : 'moveTo';
    starShape[fn](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
  starGeo.center();
  const starMat = mat('#ffd27a', { emissive: '#ffb84a', emissiveIntensity: 0.35, roughness: 0.5 });
  const stars = Array.from({ length: 7 }, (_, i) => {
    const s = mesh(starGeo, starMat);
    s.userData = { angle: (i / 7) * Math.PI * 2, radius: 1.9 + (i % 3) * 0.25, height: -0.4 + ((i * 37) % 10) / 7, speed: 0.25 + (i % 4) * 0.06 };
    return s;
  });

  return { pip, squish, head, eyes, arms, stars, materials };
}

export function initPip3D() {
  const box = document.getElementById('pip3d');
  if (!box) return;
  const canvas = document.getElementById('pip3dCanvas');
  const status = document.getElementById('pip3dStatus');
  const buttons = Object.fromEntries([...box.querySelectorAll('[data-act]')].map((b) => [b.dataset.act, b]));
  let started = false;

  new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting && !started) { started = true; obs.disconnect(); start(); }
  }, { rootMargin: '300px' }).observe(box);

  function fallback(reason) {
    box.classList.add('is-fallback');
    status.textContent = reason;
  }

  async function start() {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { fallback('your browser can’t draw 3D right now, so here’s 2D me instead ♡'); return; }
    status.textContent = 'building pip in 3D…';
    let THREE;
    try { THREE = await import('./vendor/three.module.min.js'); } catch { fallback('3D pip couldn’t load. here’s 2D me instead ♡'); return; }
    run(THREE);
  }

  function run(THREE) {
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { fallback('your browser can’t draw 3D right now, so here’s 2D me instead ♡'); return; }
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0.5, 8);
    camera.lookAt(0, 0.35, 0);
    // Bright, soft clay-studio lighting (three.js lights are physically based, so they need real intensities).
    scene.add(new THREE.HemisphereLight('#fff8ee', '#7a68b8', 1.5));
    scene.add(new THREE.AmbientLight('#ffffff', 0.15));
    const key = new THREE.DirectionalLight('#fff3e2', 1.9); key.position.set(3, 4, 6); scene.add(key);
    const fill = new THREE.DirectionalLight('#ffe3ee', 0.5); fill.position.set(-4, 1, 3); scene.add(fill);
    const rim = new THREE.DirectionalLight('#c9b6f2', 1.4); rim.position.set(-3, 3, -4); scene.add(rim);

    const model = buildPip(THREE);
    scene.add(model.pip);
    model.stars.forEach((s) => scene.add(s));
    status.textContent = 'drag to spin me · tap to squish!';
    box.classList.add('is-ready');

    // ---- sizing ----
    let pixelMode = false;
    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setPixelRatio(pixelMode ? 0.28 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.position.z = camera.aspect < 0.9 ? 9.6 : 8;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    // ---- input: drag to rotate, tap to squish, eyes follow the pointer ----
    let rotY = -0.25, rotX = 0.05, velY = 0, dragging = false, moved = 0, lastX = 0, lastY = 0, lastInput = 0;
    const look = { x: 0, y: 0 };
    let squishT = 1, waveT = 1, spinLeft = 0;

    canvas.addEventListener('pointerdown', (e) => {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; lastInput = performance.now();
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      look.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      look.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      velY = dx * 0.012;
      rotY += velY;
      rotX = Math.max(-0.45, Math.min(0.5, rotX + dy * 0.006));
      lastX = e.clientX; lastY = e.clientY; lastInput = performance.now();
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      if (moved < 8) doSquish(e.clientX, e.clientY); // a tap, not a drag
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', () => { dragging = false; });
    canvas.addEventListener('pointerleave', () => { look.x = look.y = 0; });

    function doSquish(x, y) {
      squishT = 0; giggle();
      if (x !== undefined) sparks(x, y, { count: 14, spread: 90 });
    }
    function doWave() { waveT = 0; plink(1.3); }
    function doSpin() { spinLeft += Math.PI * 2; chime(); }
    function togglePixel() {
      pixelMode = !pixelMode;
      model.materials.forEach((m) => { m.flatShading = pixelMode; m.needsUpdate = true; });
      canvas.classList.toggle('is-pixel', pixelMode);
      buttons.pixel.setAttribute('aria-pressed', String(pixelMode));
      buttons.pixel.textContent = pixelMode ? '✨ smooth mode' : '🕹️ 1998 mode';
      status.textContent = pixelMode ? 'welcome to 1998! (so many polygons… well, not many)' : 'drag to spin me · tap to squish!';
      plink(pixelMode ? 0.8 : 1.2);
      resize();
    }
    buttons.squish.addEventListener('click', () => { const r = canvas.getBoundingClientRect(); doSquish(r.left + r.width / 2, r.top + r.height * 0.4); });
    buttons.wave.addEventListener('click', doWave);
    buttons.spin.addEventListener('click', doSpin);
    buttons.pixel.addEventListener('click', togglePixel);
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { rotY -= 0.3; lastInput = performance.now(); }
      if (e.key === 'ArrowRight') { rotY += 0.3; lastInput = performance.now(); }
    });

    // ---- render loop (only while visible) ----
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    const clock = new THREE.Clock();
    const isDay = () => document.documentElement.dataset.theme === 'day';

    renderer.setAnimationLoop(() => {
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      if (!visible || document.hidden) return;
      const still = calm.matches;

      // rotation: drag inertia, queued spins, and a gentle idle sway
      if (!dragging) {
        velY *= 0.92;
        rotY += velY;
        if (performance.now() - lastInput > 2500 && !still) rotY += (Math.sin(t * 0.45) * 0.45 - 0.2 - rotY) * 0.01;
      }
      if (spinLeft > 0) { const step = Math.min(spinLeft, dt * 7); rotY += step; spinLeft -= step; }
      model.pip.rotation.y = rotY;
      model.pip.rotation.x = rotX * 0.6;
      model.pip.position.y = still ? 0 : Math.sin(t * 1.6) * 0.06;

      // squish: a springy bounce
      if (squishT < 1) {
        squishT = Math.min(1, squishT + dt * 1.6);
        const k = Math.sin(squishT * Math.PI * 4) * (1 - squishT) * 0.16;
        model.squish.scale.set(1 + k, 1 - k, 1 + k);
      } else model.squish.scale.set(1, 1, 1);

      // wave: the right arm swings up and waggles
      const right = model.arms[1];
      if (waveT < 1) {
        waveT = Math.min(1, waveT + dt * 0.6);
        const up = Math.sin(Math.min(1, waveT * 1.4) * Math.PI);
        right.rotation.z = 0.75 + up * 1.7 + Math.sin(t * 14) * 0.35 * up;
      } else right.rotation.z += (0.75 - right.rotation.z) * 0.1;

      // eyes: glints follow the pointer; in day mode Pip is asleep (lids close)
      const day = isDay();
      model.eyes.forEach((eye) => {
        const tx = look.x * 0.075, ty = look.y * 0.08;
        eye.glint.position.x += (tx - eye.glint.position.x) * 0.15;
        eye.glint.position.y += (ty - eye.glint.position.y) * 0.15;
        eye.halo.position.x = eye.glint.position.x; eye.halo.position.y = eye.glint.position.y;
        eye.halo.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
        const lidGoal = day ? 1 : 0.001;
        eye.lid.scale.y += (lidGoal - eye.lid.scale.y) * 0.12;
        eye.glint.visible = eye.halo.visible = eye.lid.scale.y < 0.6;
      });

      // orbiting stars
      model.stars.forEach((s) => {
        const d = s.userData;
        const a = d.angle + (still ? 0 : t * d.speed);
        s.position.set(Math.cos(a) * d.radius, d.height + Math.sin(t + d.angle) * 0.08, Math.sin(a) * d.radius);
        s.rotation.y = t * 1.5 + d.angle;
      });

      renderer.render(scene, camera);
    });
  }
}