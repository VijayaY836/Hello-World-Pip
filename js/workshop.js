// The Dream Workshop: pick four ingredients and Pip builds you a dream:
// a little animated scene, a short bedtime story, and its very own lullaby.
// Dreams can be kept on the dream shelf (this browser), shared as a link (#dream=…), or pinned to the Dream Wall.

import { sound, voiceNote, plink, chime } from './audio.js';
import { sparks, toast, say } from './fx.js';
import { remember } from './memory.js';
import { duck } from './music.js';

const WHO = [
  { icon: '🦉', name: 'a sleepy owl', short: 'owl' },
  { icon: '🧦', name: 'a lost sock', short: 'sock' },
  { icon: '🐉', name: 'a tiny dragon', short: 'dragon' },
  { icon: '🐋', name: 'a cloud whale', short: 'whale' },
  { icon: '🐻', name: 'a teddy bear', short: 'bear' },
  { icon: '😴', name: 'you', short: 'you', you: true },
];
const MOOD = [
  { icon: '🧣', name: 'cozy', tempo: 560, line: 'Everything was warm and slow, like a blanket fresh out of the dryer.' },
  { icon: '🙃', name: 'silly', tempo: 300, line: 'Everything was a little bit silly. Even the stars kept giggling.' },
  { icon: '🛡️', name: 'brave', tempo: 380, line: 'Something rumbled in the dark, so they puffed up and said hello. It was a very shy cloud.' },
  { icon: '🎈', name: 'floaty', tempo: 620, line: 'They got lighter and lighter until they floated, toes up, between the stars.' },
  { icon: '🔭', name: 'curious', tempo: 440, line: 'They peeked behind every door. Behind the last one was a tiny lamp, glowing just for them.' },
];
const PLACE = [
  { icon: '🌙', name: 'on the moon', id: 'moon', line: 'tiptoed across the moon, where the craters are soft like pillows', end: 'the moon tucked everyone in' },
  { icon: '🏰', name: 'in a cloud castle', id: 'castle', line: 'found a castle made of clouds, with a door that opens when you yawn', end: 'the castle turned its windows down low' },
  { icon: '🌊', name: 'under the sea', id: 'sea', line: 'floated down under the sea, where the fish wear tiny nightcaps', end: 'the waves rocked everyone to sleep' },
  { icon: '🍪', name: 'in a cookie forest', id: 'cookie', line: 'wandered into a forest where every tree is a warm cookie', end: 'the cookie trees smelled like bedtime' },
  { icon: '🚂', name: 'on the midnight train', id: 'train', line: 'caught the midnight train, the one that only stops at dreams', end: 'the train went chug… chug… shhh' },
];
const SOUND = [
  { icon: '🎶', name: 'music box', voice: 'box', line: 'A music box played somewhere far away.' },
  { icon: '🎵', name: 'pip’s humming', voice: 'hum', line: 'Pip hummed along, only a tiny bit off-key.' },
  { icon: '🔔', name: 'chimes', voice: 'chime', line: 'Wind chimes jingled whenever anyone smiled.' },
  { icon: '🎻', name: 'the whole band', voice: 'band', line: 'The music box, the chimes and Pip all played together. (Pip was a bit late.)' },
];
const GROUPS = [
  { key: 'who', label: 'who is it for?', list: WHO },
  { key: 'mood', label: 'what mood?', list: MOOD },
  { key: 'place', label: 'where?', list: PLACE },
  { key: 'sound', label: 'what sound?', list: SOUND },
];
// Lullaby notes: the same gentle pentatonic scale as the Lullaby Lab (high → low).
const NOTES = [659.25, 587.33, 523.25, 440, 392, 329.63, 293.66, 261.63];
const SHELF_KEY = 'pip-dreams';
const SHELF_MAX = 6;
const FX = { cozy: ['♡', '♡', '✦'], silly: ['✦', '★', '✿', '♪'], brave: ['★', '★', '✦'], floaty: ['○', '◦', '○'], curious: ['✧', '?', '✦'] };

const calm = matchMedia('(prefers-reduced-motion: reduce)');
const encode = (d) => `${d.who}${d.mood}${d.place}${d.sound}`;
function decode(code) {
  if (!/^\d{4}$/.test(code || '')) return null;
  const [who, mood, place, sound] = [...code].map(Number);
  if (who >= WHO.length || mood >= MOOD.length || place >= PLACE.length || sound >= SOUND.length) return null;
  return { who, mood, place, sound };
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function seeded(code) { // tiny deterministic random, so the same dream always gets the same lullaby
  let s = 0; for (const ch of code) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  s = s || 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Everything about a dream, worked out from its four choices. */
function describe(d) {
  const who = WHO[d.who], mood = MOOD[d.mood], place = PLACE[d.place], snd = SOUND[d.sound];
  const subject = who.you ? 'You' : cap(who.name);
  const they = who.you ? 'you' : 'they';
  const title = `a ${mood.name} dream for ${who.you ? 'you' : who.name} ${place.name}`;
  const story = `${subject} ${place.line}. ${mood.line.replace(/\bthey\b/g, they).replace(/\bThey\b/g, cap(they)).replace(/\bthem\b/g, who.you ? 'you' : 'them')} ${snd.line} And then ${place.end}, and nobody felt alone in that dream ever again.`;
  return { who, mood, place, snd, title, story };
}

/** A 12-note lullaby whose shape follows the mood. */
function compose(d) {
  const rnd = seeded(encode(d));
  const mood = MOOD[d.mood].name;
  let r = mood === 'floaty' ? 6 : mood === 'brave' ? 4 : 3 + Math.floor(rnd() * 3);
  const steps = [];
  for (let i = 0; i < 12; i++) {
    let move = Math.floor(rnd() * 3) - 1; // small steps: gentle
    if (mood === 'silly') move = Math.floor(rnd() * 7) - 3; // big silly jumps
    if (mood === 'floaty') move = rnd() < 0.7 ? -1 : 1; // drifting upward
    if (mood === 'curious' && i === 11) move = -2; // ends on a question
    r = Math.max(0, Math.min(6, r + move));
    const notes = [r];
    if (i % 4 === 0 && (mood === 'brave' || mood === 'cozy')) notes.push(7); // a soft low note on the strong beats
    if (rnd() < 0.12 && i % 4 !== 0) notes.length = 0; // a little rest
    steps.push(notes);
  }
  if (mood !== 'curious') steps[11] = [mood === 'floaty' ? 2 : 4, 7]; // settle home at the end
  return steps;
}

// ---------- the little painted sets for each place (static SVG; only HTML wrappers animate) ----------
const SETS = {
  moon: `<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMax slice"><circle cx="70" cy="58" r="22" fill="#9ec7ff" opacity=".85"/><ellipse cx="70" cy="58" rx="36" ry="7" fill="none" stroke="#ffd9f0" stroke-width="3" opacity=".7"/><path d="M0 182 Q200 138 400 182 V225 H0Z" fill="#d9d0f0"/><path d="M0 196 Q200 160 400 196 V225 H0Z" fill="#c4b8e6"/><ellipse cx="96" cy="190" rx="26" ry="6" fill="#b2a4da"/><ellipse cx="282" cy="184" rx="34" ry="7" fill="#b2a4da"/><ellipse cx="200" cy="208" rx="18" ry="4" fill="#a998d4"/><ellipse cx="350" cy="206" rx="14" ry="3.5" fill="#a998d4"/></svg>`,
  castle: `<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMax slice"><g fill="#f4ecff"><circle cx="40" cy="214" r="40"/><circle cx="110" cy="206" r="46"/><circle cx="200" cy="214" r="52"/><circle cx="290" cy="206" r="44"/><circle cx="370" cy="214" r="42"/></g><g fill="#cdbdf0"><rect x="150" y="106" width="100" height="82" rx="6"/><rect x="132" y="86" width="26" height="102" rx="4"/><rect x="242" y="86" width="26" height="102" rx="4"/><rect x="188" y="70" width="24" height="40" rx="4"/></g><g fill="#a993e0"><path d="M128 88 L145 56 L162 88Z"/><path d="M238 88 L255 56 L272 88Z"/><path d="M184 72 L200 40 L216 72Z"/></g><g fill="#ffd88a"><rect x="140" y="104" width="10" height="13" rx="5"/><rect x="250" y="104" width="10" height="13" rx="5"/><rect x="194" y="84" width="12" height="14" rx="6"/><rect x="170" y="126" width="12" height="15" rx="6"/><rect x="218" y="126" width="12" height="15" rx="6"/><path d="M188 188 V164 a12 12 0 0 1 24 0 V188Z"/></g><g fill="#fff"><circle cx="150" cy="196" r="22"/><circle cx="250" cy="196" r="22"/><circle cx="200" cy="200" r="20"/></g></svg>`,
  sea: `<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMax slice"><g fill="#bfe6ff" opacity=".18"><path d="M70 0 L110 0 L170 225 L90 225Z"/><path d="M230 0 L260 0 L300 225 L240 225Z"/></g><path d="M0 196 Q100 180 200 194 T400 190 V225 H0Z" fill="#f2d9b8"/><g fill="none" stroke="#6fd3a8" stroke-width="7" stroke-linecap="round"><path d="M40 200 Q30 170 44 150 T40 104"/><path d="M58 202 Q70 176 58 156 T64 124"/><path d="M340 196 Q328 170 342 146 T338 110"/><path d="M360 198 Q372 174 360 152"/></g><g fill="#ffb3c7"><path d="M150 202 q10 -16 20 0 Z"/><circle cx="268" cy="200" r="7"/></g><g fill="#ffd88a"><path d="M210 206 l4 -9 4 9 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6Z"/></g></svg>`,
  cookie: `<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMax slice"><path d="M0 190 Q200 168 400 190 V225 H0Z" fill="#f6c9a8"/><g><rect x="62" y="122" width="12" height="70" rx="4" fill="#a8704f"/><circle cx="68" cy="112" r="38" fill="#e7b07c"/><rect x="318" y="128" width="12" height="64" rx="4" fill="#a8704f"/><circle cx="324" cy="118" r="34" fill="#e7b07c"/><rect x="190" y="142" width="10" height="46" rx="4" fill="#a8704f"/><circle cx="195" cy="134" r="26" fill="#efbe8c"/></g><g fill="#6b3f2a"><circle cx="54" cy="100" r="5"/><circle cx="80" cy="96" r="4"/><circle cx="70" cy="124" r="5"/><circle cx="88" cy="118" r="3.5"/><circle cx="312" cy="106" r="5"/><circle cx="336" cy="110" r="4"/><circle cx="322" cy="132" r="4.5"/><circle cx="186" cy="128" r="3.5"/><circle cx="202" cy="138" r="4"/></g><g><path d="M120 196 v-12 a10 10 0 0 1 20 0 v12Z" fill="#fff"/><path d="M116 186 a14 9 0 0 1 28 0Z" fill="#ff9ec0"/><path d="M260 198 v-10 a8 8 0 0 1 16 0 v10Z" fill="#fff"/><path d="M257 190 a11 7 0 0 1 22 0Z" fill="#c7b2ff"/></g></svg>`,
  train: `<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMax slice"><path d="M0 170 Q60 130 130 160 T260 150 T400 160 V225 H0Z" fill="#3b2f7a"/><path d="M0 186 Q120 160 230 180 T400 176 V225 H0Z" fill="#2b2461"/><rect x="0" y="200" width="400" height="4" fill="#8a7bd0"/><g fill="#8a7bd0">${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 20 + 4}" y="204" width="10" height="5"/>`).join('')}</g></svg>`,
};
const TRAIN = `<svg viewBox="0 0 230 60"><g fill="#ff9ec0"><rect x="150" y="16" width="70" height="34" rx="8"/><rect x="196" y="4" width="16" height="16" rx="3"/></g><g fill="#c7b2ff"><rect x="76" y="20" width="68" height="30" rx="7"/><rect x="2" y="20" width="68" height="30" rx="7"/></g><g fill="#ffd88a"><rect x="160" y="22" width="16" height="12" rx="4"/><rect x="86" y="26" width="14" height="11" rx="4"/><rect x="112" y="26" width="14" height="11" rx="4"/><rect x="12" y="26" width="14" height="11" rx="4"/><rect x="38" y="26" width="14" height="11" rx="4"/></g><g fill="#2b2461"><circle cx="166" cy="52" r="7"/><circle cx="204" cy="52" r="7"/><circle cx="92" cy="52" r="6"/><circle cx="128" cy="52" r="6"/><circle cx="18" cy="52" r="6"/><circle cx="54" cy="52" r="6"/></g></svg>`;

export function initWorkshop() {
  const root = document.getElementById('workshop');
  if (!root) return;
  const form = document.getElementById('dwForm');
  const stage = document.getElementById('dwStage');
  const storyEl = document.getElementById('dwStory');
  const after = document.getElementById('dwAfter');
  const playBtn = document.getElementById('dwPlay');
  const keepBtn = document.getElementById('dwKeep');
  const shelfEl = document.getElementById('dwShelf');
  const fileEl = document.getElementById('dwFile');
  let current = null;

  // ---------- the order form ----------
  const pick = { who: 0, mood: 0, place: 0, sound: 0 };
  form.querySelector('.dw__groups').innerHTML = GROUPS.map((g) => `
    <fieldset class="dw__group"><legend>${g.label}</legend>
      ${g.list.map((o, i) => `<label class="dw__opt"><input type="radio" name="dw-${g.key}" value="${i}"${i === 0 ? ' checked' : ''} /><span><b aria-hidden="true">${o.icon}</b> ${o.name}</span></label>`).join('')}
    </fieldset>`).join('');
  form.addEventListener('change', (e) => {
    const m = e.target.name?.match(/^dw-(\w+)$/);
    if (!m) return;
    pick[m[1]] = Number(e.target.value);
    plink(0.9 + Number(e.target.value) * 0.06);
  });
  function setForm(d) {
    for (const g of GROUPS) {
      pick[g.key] = d[g.key];
      const r = form.querySelector(`input[name="dw-${g.key}"][value="${d[g.key]}"]`);
      if (r) r.checked = true;
    }
  }
  document.getElementById('dwSurprise').addEventListener('click', () => {
    setForm({ who: Math.floor(Math.random() * WHO.length), mood: Math.floor(Math.random() * MOOD.length), place: Math.floor(Math.random() * PLACE.length), sound: Math.floor(Math.random() * SOUND.length) });
    plink(1.3);
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); build({ ...pick }, true); });

  // ---------- building a dream ----------
  function scene(d) {
    const x = describe(d);
    const fx = FX[x.mood.name];
    return `<div class="dw__scene" data-place="${x.place.id}" data-mood="${x.mood.name}">
      <div class="dw__sky"></div>
      <div class="dw__set">${SETS[x.place.id]}</div>
      ${x.place.id === 'train' ? `<div class="dw__train">${TRAIN}</div>` : ''}
      <div class="dw__fx" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i};--x:${8 + i * 10.5}%;--d:${(i * 0.73) % 4}s">${fx[i % fx.length]}</i>`).join('')}</div>
      <div class="dw__hero"><span class="dw__who" aria-hidden="true">${x.who.icon}</span></div>
      <img class="dw__pip" src="assets/pip-sm.webp" width="180" height="240" alt="" />
      <p class="dw__title">✦ ${x.title} ✦</p>
    </div>`;
  }
  function build(d, fresh) {
    stopTune();
    current = d;
    const x = describe(d);
    stage.classList.remove('is-empty');
    stage.setAttribute('aria-label', `A dream scene: ${x.title}.`);
    fileEl.textContent = `dream_workshop ✦ ${x.who.short} ${x.place.id}`;
    if (fresh) { // on a phone the stage is below the form: bring it into view
      const r = stage.getBoundingClientRect();
      if (r.top < 60 || r.bottom > innerHeight) stage.scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', block: 'center' });
    }
    if (fresh && !calm.matches) {
      stage.classList.add('is-building');
      stage.innerHTML = `<div class="dw__making"><img src="assets/pip-sm.webp" width="180" height="240" alt="" /><p>pip is building your dream…</p></div>`;
      chime();
      const r = stage.getBoundingClientRect();
      sparks(r.left + r.width / 2, r.top + r.height / 2, { count: 14, spread: 160 });
      setTimeout(reveal, 1100);
    } else reveal();
    function reveal() {
      stage.classList.remove('is-building');
      stage.innerHTML = scene(d);
      storyEl.textContent = x.story;
      after.hidden = false;
      updateKeep();
      if (fresh) {
        remember({ built: true });
        say(`here’s ${x.title}! ♡`, 3000);
        if (sound.on) playTune();
      }
    }
  }

  // ---------- its lullaby ----------
  let tuneTimer = 0, playing = false;
  function stopTune() {
    clearTimeout(tuneTimer); playing = false; duck('workshop', false);
    playBtn.textContent = '▶ play its lullaby'; playBtn.setAttribute('aria-pressed', 'false');
    stage.querySelector('.dw__scene')?.classList.remove('is-singing');
  }
  function playTune() {
    if (!current) return;
    if (!sound.on) { toast('🔇 sound is off: tap the sound button up top to hear your dream’s lullaby'); return; }
    stopTune(); playing = true; duck('workshop', true);
    playBtn.textContent = '■ stop'; playBtn.setAttribute('aria-pressed', 'true');
    const steps = compose(current);
    const voice = SOUND[current.sound].voice;
    const tempo = MOOD[current.mood].tempo;
    const sc = stage.querySelector('.dw__scene');
    sc?.classList.add('is-singing');
    let i = 0;
    const total = steps.length * 2; // twice through
    (function tick() {
      if (!playing) return;
      if (i >= total) { stopTune(); return; }
      const notes = steps[i % steps.length];
      const v = voice === 'band' ? ['box', 'chime', 'hum'][i % 3] : voice;
      notes.forEach((n) => voiceNote(NOTES[n], v, i >= total - 4 ? 0.6 : 1));
      if (notes.length && sc) {
        const w = sc.querySelector('.dw__who');
        w?.classList.remove('is-bop'); void w?.offsetWidth; w?.classList.add('is-bop');
      }
      i++;
      tuneTimer = setTimeout(tick, tempo);
    })();
  }
  playBtn.addEventListener('click', () => (playing ? stopTune() : playTune()));
  sound.onChange(() => { if (!sound.on) stopTune(); });

  // ---------- the dream shelf (kept in this browser) ----------
  const readShelf = () => { try { return (JSON.parse(localStorage.getItem(SHELF_KEY)) || []).filter(decode); } catch { return []; } };
  const writeShelf = (list) => { try { localStorage.setItem(SHELF_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ } };
  function renderShelf() {
    const list = readShelf();
    shelfEl.innerHTML = list.length
      ? list.map((code) => {
        const d = decode(code), x = describe(d);
        return `<li class="dw__jar"><button type="button" class="dw__jar-btn" data-code="${code}" aria-label="Open ${x.title}"><span aria-hidden="true">${x.who.icon}</span><small aria-hidden="true">${x.place.icon}</small></button><button type="button" class="dw__jar-x" data-del="${code}" aria-label="Take ${x.title} off the shelf">×</button></li>`;
      }).join('')
      : '<li class="dw__shelf-empty">no dreams kept yet. build one and keep it here ✦</li>';
  }
  function updateKeep() {
    const kept = current && readShelf().includes(encode(current));
    keepBtn.disabled = Boolean(kept);
    keepBtn.textContent = kept ? '✓ on your shelf' : '⭐ keep on my shelf';
  }
  keepBtn.addEventListener('click', () => {
    if (!current) return;
    const code = encode(current);
    writeShelf([code, ...readShelf().filter((c) => c !== code)].slice(0, SHELF_MAX));
    renderShelf(); updateKeep(); plink(1.2);
    const r = keepBtn.getBoundingClientRect(); sparks(r.left + r.width / 2, r.top, { count: 10, spread: 80 });
  });
  shelfEl.addEventListener('click', (e) => {
    const open = e.target.closest('[data-code]');
    const del = e.target.closest('[data-del]');
    if (del) { writeShelf(readShelf().filter((c) => c !== del.dataset.del)); renderShelf(); updateKeep(); plink(0.8); return; }
    if (open) { const d = decode(open.dataset.code); setForm(d); build(d, false); plink(1.1); stage.scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', block: 'center' }); }
  });

  // ---------- sharing, and pinning to the Dream Wall ----------
  document.getElementById('dwShare').addEventListener('click', async () => {
    if (!current) return;
    const url = `${location.origin}${location.pathname}#dream=${encode(current)}`;
    try { await navigator.clipboard.writeText(url); toast('🔗 dream link copied! send it to someone sleepy.'); }
    catch { history.replaceState(null, '', `#dream=${encode(current)}`); toast('🔗 your dream link is in the address bar now.'); }
  });
  document.getElementById('dwPin').addEventListener('click', () => {
    if (!current) return;
    const wish = `pip built me ${describe(current).title} ✦`.slice(0, 140);
    location.hash = '#guestbook';
    setTimeout(() => {
      const box = document.getElementById('gbWish');
      if (!box) return;
      box.value = wish;
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.focus({ preventScroll: true });
    }, 700);
  });

  // ---------- a shared dream link opens that dream ----------
  function fromHash() {
    const d = decode((location.hash.match(/^#dream=(\d{4})/) || [])[1]);
    if (d) { setForm(d); build(d, false); fileEl.textContent += ' (a friend’s dream)'; }
  }
  addEventListener('hashchange', fromHash);
  renderShelf();
  fromHash();
}