// Tier 2 · The Lullaby Lab — an 8×8 star-grid step sequencer.
// Rows are a C-major pentatonic scale, so any pattern sounds gentle.
// Patterns are saved in the browser and can be shared as a link (#lullaby=…).

import { sound, voiceNote, plink } from './audio.js';
import { toast } from './fx.js';

const ROWS = [ // top (high) → bottom (low)
  ['E5', 659.25], ['D5', 587.33], ['C5', 523.25], ['A4', 440],
  ['G4', 392], ['E4', 329.63], ['D4', 293.66], ['C4', 261.63],
];
const STEPS = 8;
const STORE_KEY = 'pip-lab';
// Each step is a bitmask of rows (bit 0 = top row).
const PRESET = [0b10010000, 0b00100000, 0b00010000, 0b10001000, 0b00000100, 0b00010000, 0b01100000, 0b10000100];

const encode = (pattern) => pattern.map((m) => m.toString(16).padStart(2, '0')).join('');
function decode(hex) {
  if (!/^[0-9a-f]{16}$/i.test(hex || '')) return null;
  return Array.from({ length: STEPS }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
}

export function initLab() {
  const grid = document.getElementById('labGrid');
  if (!grid) return;
  const playBtn = document.getElementById('labPlay');
  const status = document.getElementById('labStatus');
  const box = document.getElementById('labBox');
  const floaty = document.getElementById('labFloaty');
  const file = document.getElementById('labFile');
  const lab = document.getElementById('lab');

  let pattern = [...PRESET];
  let name = 'pips_lullaby.mid';
  const fromHash = decode((location.hash.match(/^#lullaby=([0-9a-f]+)/i) || [])[1]);
  if (fromHash) { pattern = fromHash; name = 'a_friends_lullaby.mid'; }
  else {
    try { const saved = decode(localStorage.getItem(STORE_KEY)); if (saved) { pattern = saved; name = 'my_lullaby.mid'; } } catch { /* storage unavailable */ }
  }

  // ---------- build the grid ----------
  const cells = []; // cells[row][col]
  ROWS.forEach(([label], r) => {
    const row = document.createElement('div');
    row.className = 'lab__row';
    row.setAttribute('role', 'row');
    const tag = document.createElement('span');
    tag.className = 'lab__note';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = label;
    row.appendChild(tag);
    cells[r] = [];
    for (let c = 0; c < STEPS; c++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'lab__cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${label}, beat ${c + 1}`);
      cell.tabIndex = r === 0 && c === 0 ? 0 : -1;
      cell.dataset.r = r; cell.dataset.c = c;
      cell.innerHTML = '<span aria-hidden="true">★</span>';
      row.appendChild(cell);
      cells[r][c] = cell;
    }
    grid.appendChild(row);
  });

  function paint() {
    cells.forEach((row, r) => row.forEach((cell, c) => {
      cell.setAttribute('aria-pressed', String(Boolean(pattern[c] & (1 << r))));
    }));
    file.textContent = `lullaby_lab.exe · ${name}`;
  }

  function save(newName) {
    if (newName) name = newName;
    try { localStorage.setItem(STORE_KEY, encode(pattern)); } catch { /* storage unavailable */ }
    paint();
  }

  function toggle(r, c) {
    pattern[c] ^= 1 << r;
    if (pattern[c] & (1 << r)) voiceNote(ROWS[r][1], voice());
    save('my_lullaby.mid');
  }

  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.lab__cell');
    if (cell) toggle(Number(cell.dataset.r), Number(cell.dataset.c));
  });

  // Roving focus: arrow keys move around the grid, Space/Enter toggles (native button).
  grid.addEventListener('keydown', (e) => {
    const cell = e.target.closest('.lab__cell');
    if (!cell) return;
    const move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (!move) return;
    e.preventDefault();
    const r = (Number(cell.dataset.r) + move[0] + ROWS.length) % ROWS.length;
    const c = (Number(cell.dataset.c) + move[1] + STEPS) % STEPS;
    cell.tabIndex = -1;
    cells[r][c].tabIndex = 0;
    cells[r][c].focus();
  });

  // ---------- playback ----------
  const tempo = () => Number(lab.querySelector('input[name="labTempo"]:checked').value);
  const voice = () => lab.querySelector('input[name="labVoice"]:checked').value;
  let playing = false;
  let step = 0;
  let timer = 0;

  // Sleep timer: 0 = play forever. Otherwise stop after N seconds, fading out over the last few.
  const FADE_S = 4;
  const timerSeconds = () => Number(lab.querySelector('input[name="labTimer"]:checked').value);
  let endsAt = 0;          // performance.now() when playback should stop (0 = never)
  let clock = 0;           // interval that refreshes the countdown text
  let endedMessage = '';

  function remaining() { return endsAt ? Math.max(0, (endsAt - performance.now()) / 1000) : Infinity; }
  function armTimer() {
    const secs = timerSeconds();
    endsAt = playing && secs ? performance.now() + secs * 1000 : 0;
  }
  const fmt = (secs) => { const t = Math.ceil(secs); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

  function spawnNote() {
    const n = document.createElement('span');
    n.className = 'fly-note';
    n.textContent = ['♪', '♫', '♬'][Math.floor(Math.random() * 3)];
    n.style.left = `${30 + Math.random() * 40}%`;
    n.style.top = '30%';
    n.style.setProperty('--nx', `${(Math.random() - 0.5) * 90}px`);
    n.addEventListener('animationend', () => n.remove(), { once: true });
    floaty.appendChild(n);
  }

  function tick() {
    const left = remaining();
    if (left <= 0) { finish(); return; }
    const fade = Math.min(1, left / FADE_S); // gentle fade-out at the end of a timed lullaby
    cells.forEach((row) => row[(step + STEPS - 1) % STEPS].classList.remove('is-head'));
    let any = false;
    cells.forEach((row, r) => {
      const cell = row[step];
      cell.classList.add('is-head');
      if (pattern[step] & (1 << r)) {
        any = true;
        voiceNote(ROWS[r][1], voice(), fade);
        cell.classList.remove('is-ping'); void cell.offsetWidth; cell.classList.add('is-ping');
      }
    });
    if (any) spawnNote();
    step = (step + 1) % STEPS;
    timer = setTimeout(tick, tempo());
  }

  function finish() {
    endedMessage = '🌙 sleep timer finished. sweet dreams!';
    setPlaying(false);
  }

  function showStatus() {
    status.replaceChildren();
    if (!playing) { status.textContent = endedMessage; return; }
    const countdown = endsAt ? ` · 🌙 stops in ${fmt(remaining())}` : ' · ∞ playing until you stop it';
    if (sound.on) { status.textContent = `♪ now playing: ${name}${countdown}`; return; }
    status.append('🔇 sound is off, so the stars are singing very quietly. ');
    const on = document.createElement('button');
    on.type = 'button';
    on.className = 'chip';
    on.textContent = 'turn sound on';
    on.addEventListener('click', () => { sound.set(true); plink(); });
    status.append(on);
  }
  sound.onChange(showStatus);

  function setPlaying(on) {
    playing = on;
    clearTimeout(timer);
    clearInterval(clock);
    playBtn.setAttribute('aria-pressed', String(on));
    playBtn.textContent = on ? '■ stop' : '▶ play';
    box.classList.toggle('is-playing', on);
    if (on) {
      endedMessage = '';
      step = 0;
      armTimer();
      tick();
      // Refresh the countdown text once a second (only matters when a timer is set).
      clock = setInterval(() => { if (endsAt && sound.on) showStatus(); }, 1000);
    } else {
      endsAt = 0;
      cells.forEach((row) => row.forEach((cell) => cell.classList.remove('is-head')));
    }
    showStatus();
  }
  playBtn.addEventListener('click', () => { if (playing) endedMessage = ''; setPlaying(!playing); });
  // Keep singing in a background tab if it's audible (a sleep timer should survive a locked phone);
  // if sound is off there's nothing to hear, so stop.
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing && !sound.on) setPlaying(false); });

  // ---------- tools ----------
  document.getElementById('labPreset').addEventListener('click', () => { pattern = [...PRESET]; save('pips_lullaby.mid'); plink(); });
  document.getElementById('labClear').addEventListener('click', () => { pattern = Array(STEPS).fill(0); save('untitled.mid'); plink(0.8); });
  document.getElementById('labDream').addEventListener('click', () => {
    // A gentle random walk: small steps up and down, a few rests, a low note on the strong beats.
    let r = 3 + Math.floor(Math.random() * 3);
    pattern = Array.from({ length: STEPS }, (_, c) => {
      if (c > 0 && Math.random() < 0.15) return 0;
      r = Math.max(0, Math.min(6, r + Math.floor(Math.random() * 5) - 2));
      let mask = 1 << r;
      if ((c === 0 || c === 4) && r < 6) mask |= 1 << 7;
      return mask;
    });
    save('dreamed_up.mid');
    plink(1.2);
  });
  document.getElementById('labShare').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#lullaby=${encode(pattern)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('🔗 lullaby link copied! send it to someone sleepy.');
    } catch {
      history.replaceState(null, '', `#lullaby=${encode(pattern)}`);
      toast('🔗 your lullaby link is in the address bar now.');
    }
  });
  lab.addEventListener('change', (e) => {
    if (e.target.name === 'labVoice' || e.target.name === 'labTempo' || e.target.name === 'labTimer') plink();
    if (e.target.name === 'labTimer' && playing) { armTimer(); showStatus(); } // timer counts from when you pick it
  });

  paint();
  if (fromHash) requestAnimationFrame(() => lab.scrollIntoView());
}