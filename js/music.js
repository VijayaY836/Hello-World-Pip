// Pip's background music: two gentle tunes, generated live with Web Audio.
//  · night: "moonlight lullaby", slow warm pad chords with a sparkly music-box melody and a soft echo
//  · day:   "sunny nap", brighter chords, a plucky marimba-ish tune and the odd tiny bird chirp
// It only plays while sound is on, crossfades when day/night changes, ducks under the site's other
// music (the Lullaby Lab, Dream Workshop lullabies, the music box) and pauses in a background tab.

import { sound, audioOut } from './audio.js';

const VOLUME = 0.76;          // the music bus, under the master volume: quiet on purpose
const DUCKED = 0.035;         // while other music plays
const LOOKAHEAD = 1.2;        // seconds of notes scheduled ahead
const TICK = 250;             // ms between scheduler runs

const f = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI note → Hz

const PIECES = {
  night: {
    beat: 0.86,               // ~70 bpm
    chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]],   // Am  F  C  G
    scale: [69, 72, 74, 76, 79, 81, 84],                                 // A pentatonic-ish, up high
    padType: 'sine', padCut: 900, padVol: 0.045,
    melodyChance: 0.55, eighths: false, voice: 'box', bird: 0,
  },
  day: {
    beat: 0.62,               // ~97 bpm
    chords: [[55, 59, 62], [54, 57, 62], [52, 55, 59], [60, 64, 67]],   // G  D  Em  C
    scale: [67, 69, 71, 74, 76, 79, 81],                                 // G pentatonic
    padType: 'triangle', padCut: 1500, padVol: 0.032,
    melodyChance: 0.5, eighths: true, voice: 'pluck', bird: 0.22,
  },
};

export function initMusic() {
  let out = null, bus = null, echo = null;
  const layers = {};          // per piece: { gain, filter, step, next, last }
  let timer = 0, theme = currentTheme(), ducks = 0;

  function currentTheme() { return document.documentElement.dataset.theme === 'day' ? 'day' : 'night'; }

  function setup() {
    out = audioOut();
    if (!out) return false;
    if (bus) return true;
    const { ctx, master } = out;
    bus = ctx.createGain(); bus.gain.value = 0; bus.connect(master);
    // a soft echo for dreaminess
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.38;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2200;
    echo = ctx.createGain(); echo.gain.value = 0.35;
    echo.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(bus);
    for (const [name, p] of Object.entries(PIECES)) {
      const gain = ctx.createGain(); gain.gain.value = name === theme ? 1 : 0; gain.connect(bus);
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = p.padCut; filter.Q.value = 0.3; filter.connect(gain);
      layers[name] = { gain, filter, step: 0, next: 0, last: 3 };
    }
    return true;
  }

  // ---------- instruments ----------
  function env(ctx, dest, start, attack, hold, release, vol) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + attack);
    g.gain.setValueAtTime(vol, start + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
    g.connect(dest);
    return g;
  }
  function osc(ctx, type, freq, start, stop, dest, detune = 0) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune;
    o.connect(dest); o.start(start); o.stop(stop);
  }
  function pad(L, p, chord, start, dur) {
    const { ctx } = out;
    for (const n of chord) {
      const g = env(ctx, L.filter, start, 1.4, Math.max(0.1, dur - 1.4), 1.8, p.padVol);
      osc(ctx, p.padType, f(n), start, start + dur + 2, g, -5);
      osc(ctx, 'sine', f(n), start, start + dur + 2, g, 6);
    }
    // a soft low root underneath
    const gb = env(ctx, L.gain, start, 0.8, Math.max(0.1, dur - 0.8), 1.5, p.padVol * 0.9);
    osc(ctx, 'sine', f(chord[0] - 12), start, start + dur + 2, gb);
  }
  function note(L, p, n, start) {
    const { ctx } = out;
    if (p.voice === 'box') { // music box: a bright sine with a glassy overtone
      const g = env(ctx, L.gain, start, 0.004, 0.02, 1.6, 0.05); osc(ctx, 'sine', f(n), start, start + 1.8, g);
      const g2 = env(ctx, L.gain, start, 0.002, 0.01, 0.4, 0.012); osc(ctx, 'sine', f(n) * 3.01, start, start + 0.5, g2);
      g.connect(echo);
    } else {                 // pluck: a soft marimba-ish blip
      const g = env(ctx, L.gain, start, 0.006, 0.01, 0.5, 0.045); osc(ctx, 'triangle', f(n), start, start + 0.6, g);
      const g2 = env(ctx, L.gain, start, 0.004, 0.01, 0.18, 0.012); osc(ctx, 'sine', f(n) * 4, start, start + 0.25, g2);
      g.connect(echo);
    }
  }
  function bird(L, start) {
    const { ctx } = out;
    for (const [dt, a, b] of [[0, 2300, 3300], [0.13, 2500, 3600]]) {
      const g = env(ctx, L.gain, start + dt, 0.01, 0.02, 0.06, 0.012);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(a, start + dt); o.frequency.exponentialRampToValueAtTime(b, start + dt + 0.08);
      o.connect(g); o.start(start + dt); o.stop(start + dt + 0.12);
    }
  }

  // ---------- the scheduler (only the piece you can hear plays notes) ----------
  function schedule() {
    if (!out) return;
    const now = out.ctx.currentTime;
    const name = theme, p = PIECES[name], L = layers[name];
    if (L.next < now) L.next = now + 0.1;
    while (L.next < now + LOOKAHEAD) {
      const t = L.next, beatInBar = L.step % 4;
      const chord = p.chords[Math.floor(L.step / 4) % p.chords.length];
      if (beatInBar === 0) {
        pad(L, p, chord, t, p.beat * 4);
        if (p.bird && Math.random() < p.bird) bird(L, t + p.beat * (1 + Math.random() * 2));
      }
      const hits = p.eighths ? [0, 0.5] : [0];
      for (const off of hits) {
        if (Math.random() > p.melodyChance * (off ? 0.6 : 1)) continue;
        // a gentle random walk on the scale, pulled toward the chord's notes
        let i = Math.max(0, Math.min(p.scale.length - 1, L.last + Math.floor(Math.random() * 3) - 1));
        const pc = chord.map((n) => n % 12);
        if (beatInBar === 0 && !pc.includes(p.scale[i] % 12)) { // land on a chord note at the start of each bar
          const fits = p.scale.map((n, k) => (pc.includes(n % 12) ? k : -1)).filter((k) => k >= 0);
          if (fits.length) i = fits.reduce((a, b) => (Math.abs(b - i) < Math.abs(a - i) ? b : a));
        }
        L.last = i;
        note(L, p, p.scale[i], t + off * p.beat);
      }
      L.step++;
      L.next += p.beat;
    }
  }

  // ---------- start, stop, crossfade, duck ----------
  function level() { return ducks > 0 ? DUCKED : VOLUME; }
  function start() {
    if (!sound.on || document.hidden || timer) return;
    if (!setup()) return;
    const now = out.ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(level(), now, 1.2); // fade in
    layers[theme].next = now + 0.2;
    schedule();
    timer = setInterval(schedule, TICK);
  }
  function stop(fast) {
    clearInterval(timer); timer = 0;
    if (bus && out) bus.gain.setTargetAtTime(0, out.ctx.currentTime, fast ? 0.05 : 0.4);
  }
  function crossfade() {
    const next = currentTheme();
    if (next === theme) return;
    theme = next;
    if (!bus) return;
    const now = out.ctx.currentTime;
    for (const [name, L] of Object.entries(layers)) L.gain.gain.setTargetAtTime(name === theme ? 1 : 0, now, 0.9);
    layers[theme].next = now + 0.3; layers[theme].step = 0;
  }

  sound.onChange((on) => (on ? start() : stop(true)));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop(false) : start()));
  new MutationObserver(crossfade).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  // Other music on the site asks the background music to step aside while it plays.
  const busy = new Set();
  addEventListener('pip:duck', (e) => {
    const { who, on } = e.detail;
    if (on) busy.add(who); else busy.delete(who);
    ducks = busy.size;
    if (bus && out && timer) bus.gain.setTargetAtTime(level(), out.ctx.currentTime, ducks ? 0.15 : 1.2);
  });
  if (sound.on) start();
}

/** Other modules: `duck('lab', true)` when your music starts, `duck('lab', false)` when it stops. */
export function duck(who, on) { dispatchEvent(new CustomEvent('pip:duck', { detail: { who, on: Boolean(on) } })); }