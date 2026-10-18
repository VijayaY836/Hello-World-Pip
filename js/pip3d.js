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

  // ---- head: Pip's soft skull shape (not a ball!) ----
  // One smooth sphere, reshaped in code: a wide dome on top, puffy cheeks, a jaw that tapers to
  // a soft chin, a flatter face, and two squircle-shaped eye hollows pressed into it.
  const head = new THREE.Group();
  head.position.y = 0.88;
  squish.add(head);

  const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
  const EYE = { a: 0.33, b: 0.31, p: 2.45, depth: 0.11, tilt: 0.14 }; // squircle half-width/height (in sphere directions), roundness, depth, tilt
  const eyeDirs = [-1, 1].map((side) => V(0.47 * side, -0.1, 0.86));
  const eyeFrames = eyeDirs.map((e, i) => {
    const side = i ? 1 : -1;
    const tx = new THREE.Vector3(0, 1, 0).cross(e).normalize().negate(); // points to Pip's right on the face
    const ty = e.clone().cross(tx).normalize().negate();                 // points up the face
    if (ty.y < 0) ty.negate();
    const c = Math.cos(EYE.tilt * side), s = Math.sin(EYE.tilt * side);  // outer corners a touch lower
    return { e, tx: tx.clone().multiplyScalar(c).addScaledVector(ty, s), ty: ty.clone().multiplyScalar(c).addScaledVector(tx, -s), side };
  });
  const cheekDirs = [-1, 1].map((side) => V(0.7 * side, -0.52, 0.55));
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  /** How far "inside" an eye squircle a sphere direction is: 0 = centre, 1 = the rim. */
  function eyeDist(n, f) {
    if (n.dot(f.e) < 0.6) return 9; // only the front of the face (no sockets on the back of the head!)
    const d = n.clone().sub(f.e);
    const u = d.dot(f.tx) / EYE.a, v = d.dot(f.ty) / EYE.b;
    const vv = v > 0 ? v * 1.08 : v * 0.94; // flatter top, fuller bottom
    return Math.pow(Math.pow(Math.abs(u), EYE.p) + Math.pow(Math.abs(vv), EYE.p), 1 / EYE.p);
  }
  /** Sphere direction -> point on Pip's head (shape + dents). */
  function shape(n) {
    const t = Math.max(0, -n.y);                       // 0 above the middle, 1 at the chin
    const jaw = 1 - 0.2 * t * t;                       // jaw tapers in
    const p = new THREE.Vector3(n.x * 1.12 * jaw, n.y * (n.y < 0 ? 0.93 : 1.0), n.z * 0.97 * (1 - 0.12 * t * t));
    if (n.z > 0) p.z *= 1 - 0.1 * n.z * n.z * n.z;      // flatter face
    for (const c of cheekDirs) p.addScaledVector(n, 0.055 * Math.exp(-n.distanceToSquared(c) / (2 * 0.17 * 0.17))); // puffy cheeks
    for (const f of eyeFrames) {
      const d = eyeDist(n, f);
      if (d < 1.25) p.addScaledVector(n, -EYE.depth * smooth(1.2, 0.7, d)); // soft-rimmed hollow
    }
    return p;
  }
  const headGeo = new THREE.SphereGeometry(1, 240, 180); // dense, so the socket edges are smooth
  const hpos = headGeo.attributes.position;
  // Each vertex stores how far it is from the nearest eye centre (0 centre, 1 rim) and where it is
  // vertically inside that socket; the GPU turns that into a crisp, smooth-edged dark socket per pixel.
  const eyeD = new Float32Array(hpos.count), eyeV = new Float32Array(hpos.count);
  const hn = new THREE.Vector3();
  for (let i = 0; i < hpos.count; i++) {
    hn.set(hpos.getX(i), hpos.getY(i), hpos.getZ(i)).normalize();
    const p = shape(hn);
    hpos.setXYZ(i, p.x, p.y, p.z);
    let best = 9, v = 0;
    for (const f of eyeFrames) {
      const d = eyeDist(hn, f);
      if (d < best) { best = d; v = hn.clone().sub(f.e).dot(f.ty) / EYE.b; }
    }
    eyeD[i] = best; eyeV[i] = v;
  }
  headGeo.setAttribute('eyeD', new THREE.BufferAttribute(eyeD, 1));
  headGeo.setAttribute('eyeV', new THREE.BufferAttribute(eyeV, 1));
  headGeo.computeVertexNormals();
  const skullMat = mat('#efe6de', { roughness: 0.62 });
  skullMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float eyeD; attribute float eyeV; varying float vEyeD; varying float vEyeV;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEyeD = eyeD; vEyeV = eyeV;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vEyeD; varying float vEyeV;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 sockDeep = vec3(0.105, 0.052, 0.045);
        vec3 sockWarm = vec3(0.33, 0.19, 0.15);
        vec3 sock = mix(sockDeep, sockWarm, smoothstep(0.1, -0.95, vEyeV) * 0.55);
        float inside = 1.0 - smoothstep(0.93, 0.985, vEyeD);
        diffuseColor.rgb = mix(diffuseColor.rgb, sock, inside);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, 1.0 - smoothstep(0.93, 0.985, vEyeD));');
  };
  mesh(headGeo, skullMat, [], head);

  /** A point on the face plus the surface direction there (for placing nose, smile, cheeks). */
  const surfaceAt = (x, y, out = 0) => { const d = V(x / 1.12, y, Math.sqrt(Math.max(0.05, 1 - (x / 1.12) ** 2 - y * y))); return { p: shape(d).addScaledVector(d, out), d }; };

  // glints live inside the hollows, low and toward the nose, like the art
  const glintMat = new THREE.MeshBasicMaterial({ color: '#fff3c2' });
  const haloMat = new THREE.MeshBasicMaterial({ color: '#ffc45c', transparent: true, opacity: 0.22, depthWrite: false });
  const lashMat = mat('#6b4a3f');
  const squircle = new THREE.Shape();
  for (let k = 0; k <= 64; k++) {
    const t = (k / 64) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
    const x = Math.sign(c) * Math.abs(c) ** (2 / EYE.p) * EYE.a * 1.02, y = Math.sign(sn) * Math.abs(sn) ** (2 / EYE.p) * EYE.b * (sn > 0 ? 0.93 : 1.06);
    k ? squircle.lineTo(x, y) : squircle.moveTo(x, y);
  }
  const eyes = eyeFrames.map((f) => {
    const g = new THREE.Group();
    g.position.copy(shape(f.e));                                   // bottom of the hollow
    const m = new THREE.Matrix4().makeBasis(f.tx, f.ty, f.e);
    g.quaternion.setFromRotationMatrix(m);
    head.add(g);
    const base = { x: -0.07 * f.side, y: -0.06 };                    // low and toward the nose
    const glint = mesh(new THREE.SphereGeometry(0.042, 16, 12), glintMat, [base.x, base.y, 0.035], g);
    const halo = mesh(new THREE.SphereGeometry(0.075, 16, 12), haloMat, [base.x, base.y, 0.03], g);
    const lid = new THREE.Group();     // day mode: Pip sleeps, squircle lids slide shut over the hollows
    lid.position.z = EYE.depth + 0.012;
    g.add(lid);
    mesh(new THREE.ShapeGeometry(squircle, 48), mat('#efe6de', { roughness: 0.62 }), [], lid);
    const lash = mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 24, Math.PI * 0.8), lashMat, [0, -0.03, 0.006], lid);
    lash.rotation.z = Math.PI + Math.PI * 0.1;
    lid.scale.y = 0.001;
    return { g, glint, halo, lid, base };
  });

  const FWD = new THREE.Vector3(0, 0, 1);
  const face = (obj, dir) => obj.quaternion.setFromUnitVectors(FWD, dir.clone().normalize()); // point +Z along the surface (local space)

  // the nose: an upside-down heart (point at the top, two soft lobes at the bottom), like the art
  const socketMat = mat('#3a2420', { roughness: 0.35 });
  const noseShape = new THREE.Shape();
  noseShape.moveTo(0, 0.12);
  noseShape.bezierCurveTo(0.025, 0.08, 0.085, 0.01, 0.08, -0.04);
  noseShape.bezierCurveTo(0.075, -0.085, 0.02, -0.085, 0, -0.045);
  noseShape.bezierCurveTo(-0.02, -0.085, -0.075, -0.085, -0.08, -0.04);
  noseShape.bezierCurveTo(-0.085, 0.01, -0.025, 0.08, 0, 0.12);
  const noseGeo = new THREE.ExtrudeGeometry(noseShape, { depth: 0.015, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 20 });
  noseGeo.center();
  const ns = surfaceAt(0, -0.31, 0.01);
  const nose = mesh(noseGeo, socketMat, [ns.p.x, ns.p.y, ns.p.z], head);
  face(nose, ns.d);
  nose.scale.setScalar(0.72);

  const sm = surfaceAt(0, -0.46, 0.006);
  const smile = mesh(new THREE.TorusGeometry(0.11, 0.019, 8, 28, Math.PI * 0.62), socketMat, [sm.p.x, sm.p.y, sm.p.z], head);
  face(smile, sm.d);
  smile.rotateZ(Math.PI + (Math.PI - Math.PI * 0.62) / 2);
  const cheekMat = mat('#ff9bb3', { transparent: true, opacity: 0.7, roughness: 1 });
  cheekDirs.forEach((c) => {
    const ch = mesh(new THREE.SphereGeometry(0.15, 20, 12), cheekMat, [], head);
    ch.position.copy(shape(c)).addScaledVector(c, -0.03);
    face(ch, c);
    ch.scale.set(1, 0.62, 0.3);
  });

  // ---- the floppy starry nightcap: a cone bent so it flops over to Pip's left ----
  const capTex = patternTexture(THREE, '#efe2c8', '#d4a548', 'star', 14);
  capTex.repeat.set(2, 1.5);
  const capMat = mat('#ffffff', { map: capTex, roughness: 0.95 });
  const H = 2.25, Y0 = 0.62, R = 0.56; // straight part, then an arc of radius R
  const capGeo = new THREE.ConeGeometry(0.99, H, 56, 40);
  capGeo.translate(0, H / 2, 0);
  const pos = capGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    if (y <= Y0) continue;
    const th = (y - Y0) / R;
    pos.setXY(i, -R + (R + x) * Math.cos(th), Y0 + (R + x) * Math.sin(th));
  }
  capGeo.computeVertexNormals();
  const cap = new THREE.Group();
  cap.position.set(0, 0.42, -0.06);
  cap.rotation.set(-0.2, 0, 0.26);
  head.add(cap);
  mesh(capGeo, capMat, [], cap);
  const thEnd = (H - Y0) / R;
  mesh(new THREE.SphereGeometry(0.24, 28, 20), mat('#f1e6d4', { roughness: 1 }), [-R + R * Math.cos(thEnd), Y0 + R * Math.sin(thEnd), 0], cap);
  const brim = mesh(new THREE.TorusGeometry(1.0, 0.17, 20, 64), mat('#f6eedf', { roughness: 1 }), [0, 0.02, 0], cap);
  brim.rotation.x = Math.PI / 2;
  brim.scale.set(1, 0.95, 0.85);

  // plump pink bow on the brim, front-left
  const bowMat = mat('#f5a3ba', { roughness: 0.55 });
  const bow = new THREE.Group();
  bow.position.set(-0.46, 0.66, 0.86);
  bow.rotation.set(0.05, -0.45, 0.26);
  bow.scale.setScalar(1.15);
  head.add(bow);
  [-1, 1].forEach((side) => {
    const loop = mesh(new THREE.SphereGeometry(0.15, 24, 16), bowMat, [0.17 * side, 0, 0], bow);
    loop.scale.set(1.25, 0.82, 0.5);
    loop.rotation.z = 0.35 * side;
    const tail = mesh(new THREE.SphereGeometry(0.07, 16, 12), bowMat, [0.1 * side, -0.14, 0.02], bow);
    tail.scale.set(0.8, 1.4, 0.5);
  });
  mesh(new THREE.SphereGeometry(0.075, 16, 12), bowMat, [0, 0, 0.03], bow);

  // ---- little body in a heart onesie with pink cuffs ----
  const onesieTex = patternTexture(THREE, '#f5e2c4', '#ee8fac', 'heart', 16);
  onesieTex.repeat.set(1.5, 1.5);
  const onesie = mat('#ffffff', { map: onesieTex });
  const body = mesh(new THREE.SphereGeometry(0.54, 40, 28), onesie, [0, -0.3, 0], squish);
  body.scale.set(1, 1.04, 0.9);
  const handMat = mat('#f2ebe5');
  const cuffMat = mat('#f2a7c0', { roughness: 0.8 });
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.4 * side, -0.02, 0.06);
    squish.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.13, 0.38, 8, 16), onesie, [0, -0.28, 0], pivot);
    const cuff = mesh(new THREE.TorusGeometry(0.12, 0.045, 10, 24), cuffMat, [0, -0.52, 0], pivot);
    cuff.rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(0.15, 20, 14), handMat, [0, -0.63, 0], pivot);
    return pivot;
  });
  arms[0].rotation.set(-0.7, 0, -0.55);  // left hand rests in the lap
  arms[1].rotation.set(-0.35, 0, 1.95);  // right hand up: hello!
  const soleMat = mat('#c7b2e8');
  [-1, 1].forEach((side) => {
    const leg = mesh(new THREE.CapsuleGeometry(0.15, 0.16, 8, 16), onesie, [0.26 * side, -0.66, 0.25], squish);
    leg.rotation.x = Math.PI / 2.3;
    const foot = mesh(new THREE.SphereGeometry(0.18, 24, 16), soleMat, [0.26 * side, -0.72, 0.47], squish);
    foot.scale.set(1, 0.9, 0.5);
  });

  // ---- the cloud seat ----
  const cloudMat = mat('#fff3f8', { roughness: 1, emissive: '#5a3c7a', emissiveIntensity: 0.1 });
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
        const amt = Math.sin(waveT * Math.PI);
        right.rotation.z = 1.95 + Math.sin(t * 14) * 0.4 * amt;
      } else right.rotation.z = 1.95 + (still ? 0 : Math.sin(t * 2.2) * 0.07); // a tiny idle wiggle

      // eyes: glints follow the pointer; in day mode Pip is asleep (lids close)
      const day = isDay();
      model.eyes.forEach((eye) => {
        const tx = eye.base.x + look.x * 0.07, ty = eye.base.y + look.y * 0.07;
        eye.glint.position.x += (tx - eye.glint.position.x) * 0.15;
        eye.glint.position.y += (ty - eye.glint.position.y) * 0.15;
        eye.halo.position.x = eye.glint.position.x; eye.halo.position.y = eye.glint.position.y;
        eye.halo.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
        const lidGoal = day ? 1 : 0.001;
        eye.lid.scale.y += (lidGoal - eye.lid.scale.y) * 0.12;
        eye.glint.visible = eye.halo.visible = eye.lid.scale.y < 0.6;
        eye.lid.visible = eye.lid.scale.y > 0.02; // a fully open lid is hidden (no stray line across the eye)
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