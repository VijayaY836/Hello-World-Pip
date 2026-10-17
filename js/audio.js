// Every sound on Pip's site is synthesized live with the Web Audio API.
// Sound starts OFF; nothing plays until the visitor turns it on.

const STORE_KEY = 'pip-sound';
let ctx = null;
let master = null;
let enabled = false;
const listeners = new Set();

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const sound = {
  get on() { return enabled; },
  set(on) {
    enabled = Boolean(on);
    if (enabled) ensureContext();
    if (master) master.gain.setTargetAtTime(enabled ? 0.7 : 0, ctx.currentTime, 0.03);
    try { localStorage.setItem(STORE_KEY, enabled ? '1' : '0'); } catch { /* storage unavailable */ }
    listeners.forEach((fn) => fn(enabled));
  },
  toggle() { this.set(!enabled); },
  onChange(fn) { listeners.add(fn); },
  /** Was sound on during a previous visit? (still needs a click to start, per browser rules) */
  remembered() {
    try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; }
  },
};

const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5 };

/** One enveloped oscillator. `t` is seconds from now. */
function tone({ freq, t = 0, dur = 0.4, type = 'sine', vol = 0.2, attack = 0.008, vibrato = 0, bend = 0 }) {
  const start = ctx.currentTime + t;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (bend) osc.frequency.exponentialRampToValueAtTime(freq * bend, start + dur);
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.value = vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(start);
    lfo.stop(start + dur + 0.05);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function ready() {
  return enabled && ensureContext();
}

/** Tiny UI click. */
export function plink(pitch = 1) {
  if (!ready()) return;
  tone({ freq: 1320 * pitch, dur: 0.12, vol: 0.08 });
  tone({ freq: 2640 * pitch, dur: 0.06, vol: 0.03 });
}

/** Baby giggle: quick bouncy rising blips. */
export function giggle() {
  if (!ready()) return;
  const base = 620 + Math.random() * 120;
  [0, 0.09, 0.18, 0.27].forEach((t, i) => tone({ freq: base * (1 + i * 0.12), t, dur: 0.09, type: 'triangle', vol: 0.12, bend: 1.25 }));
}

/** A… a… ACHOO! */
export function sneeze() {
  if (!ready()) return;
  tone({ freq: 500, dur: 0.3, type: 'triangle', vol: 0.08, bend: 1.3 });
  tone({ freq: 560, t: 0.35, dur: 0.3, type: 'triangle', vol: 0.09, bend: 1.35 });
  const len = 0.35;
  const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = 'bandpass';
  filter.frequency.value = 2400;
  gain.gain.value = 0.25;
  src.buffer = buf;
  src.connect(filter).connect(gain).connect(master);
  src.start(ctx.currentTime + 0.75);
  tone({ freq: 900, t: 0.75, dur: 0.35, vol: 0.06, bend: 0.5 });
}

/** Sparkly arpeggio for discoveries. */
export function chime() {
  if (!ready()) return;
  [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => {
    tone({ freq: f, t: i * 0.11, dur: 1.2, vol: 0.12 });
    tone({ freq: f * 2.01, t: i * 0.11, dur: 0.5, vol: 0.03 });
  });
}

// Brahms, "Wiegenlied" Op. 49 No. 4 (1868, public domain) — first phrase, in beats.
const LULLABY = [
  ['E4', 0.5], ['E4', 0.5], ['G4', 2], ['E4', 0.5], ['E4', 0.5], ['G4', 2],
  ['E4', 0.5], ['G4', 0.5], ['C5', 1], ['B4', 1.5], ['A4', 0.5], ['A4', 1], ['G4', 1.5],
  ['D4', 0.5], ['E4', 0.5], ['F4', 1], ['D4', 1.5], ['D4', 0.5], ['E4', 0.5], ['F4', 2],
  ['D4', 0.5], ['F4', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 1], ['B4', 1], ['C5', 2.5],
];

/** Music box version. Returns the duration in seconds (also when muted, for animations). */
export function musicBox() {
  const beat = 0.4;
  const total = LULLABY.reduce((s, [, b]) => s + b, 0) * beat;
  if (!ready()) return total;
  let t = 0.05;
  for (const [n, b] of LULLABY) {
    const f = NOTE[n] * 2; // music boxes sing high
    tone({ freq: f, t, dur: 1.3, vol: 0.13, attack: 0.004 });
    tone({ freq: f * 3.01, t, dur: 0.35, vol: 0.025, attack: 0.002 });
    tone({ freq: f * 5.4, t, dur: 0.12, vol: 0.012, attack: 0.002 });
    t += b * beat;
  }
  return total;
}

/** Pip's first wobbly, off-key hum (story scene 4). */
export function hum() {
  if (!ready()) return;
  const beat = 0.42;
  let t = 0.05;
  for (const [n, b] of LULLABY.slice(0, 13)) {
    const wobble = 1 + (Math.random() - 0.5) * 0.045; // a little off-key, on purpose
    tone({ freq: NOTE[n] * wobble, t, dur: b * beat + 0.12, type: 'triangle', vol: 0.11, attack: 0.06, vibrato: 7 });
    tone({ freq: NOTE[n] * wobble * 2, t, dur: b * beat, vol: 0.02, attack: 0.08 });
    t += b * beat;
  }
}

/** Catching a dream: pitch climbs with your combo. */
export function catchNote(combo = 0) {
  if (!ready()) return;
  const scale = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.C6];
  const f = scale[combo % scale.length] * (combo >= scale.length ? 1.5 : 1);
  tone({ freq: f, dur: 0.25, vol: 0.1 });
  tone({ freq: f * 2.01, dur: 0.12, vol: 0.03 });
}

/** Grumpy alarm clock. */
export function bzzt() {
  if (!ready()) return;
  for (let i = 0; i < 4; i++) tone({ freq: 210, t: i * 0.07, dur: 0.06, type: 'square', vol: 0.05 });
}

/** One note in the Lullaby Lab, in one of three voices. */
export function voiceNote(freq, voice = 'box') {
  if (!ready()) return;
  if (voice === 'hum') {
    tone({ freq, dur: 0.7, type: 'triangle', vol: 0.1, attack: 0.05, vibrato: 5 });
    tone({ freq: freq * 2, dur: 0.5, vol: 0.02, attack: 0.06 });
  } else if (voice === 'chime') {
    tone({ freq: freq * 2, dur: 2.2, vol: 0.09, attack: 0.003 });
    tone({ freq: freq * 2 * 2.76, dur: 0.9, vol: 0.02, attack: 0.002 });
    tone({ freq: freq * 2 * 5.4, dur: 0.3, vol: 0.008, attack: 0.002 });
  } else {
    tone({ freq: freq * 2, dur: 1.2, vol: 0.11, attack: 0.004 });
    tone({ freq: freq * 2 * 3.01, dur: 0.3, vol: 0.022, attack: 0.002 });
    tone({ freq: freq * 2 * 5.4, dur: 0.1, vol: 0.01, attack: 0.002 });
  }
}

/** Soft paper swish for the storybook. */
export function pageTurn() {
  if (!ready()) return;
  const len = 0.32;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const p = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * p) ** 2;
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(900, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + len);
  gain.gain.value = 0.16;
  src.buffer = buf;
  src.connect(filter).connect(gain).connect(master);
  src.start();
}