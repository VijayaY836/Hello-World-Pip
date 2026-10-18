// Side quest + Tier 3 · Live dream guestbook ("The Dream Wall").
// Wishes are stored by /api/guestbook (Vercel function + Upstash Redis) and shown to everyone.
// If that isn't connected yet (or you're previewing locally), wishes are kept in your own
// browser instead, and the page says so.

import { chime } from './audio.js';
import { sparks, toast, centerOf } from './fx.js';
import { remember, memory } from './memory.js';

const STICKERS = { moon: '🌙', star: '⭐', zzz: '💤', bear: '🧸', ghost: '👻', owl: '🦉' };
const LOCAL_KEY = 'pip-guestbook-local';
const MAX_WISH = 140;
// Notes from the neighbourhood, pinned by Pip (characters from the site, not visitors).
const PINNED = [
  { n: 'Wisp', w: 'thank you for my dream, pip. i sleep every night now ♡', s: 'ghost', pinned: true },
  { n: 'Mumble', w: 'the star nightlight is perfect. i am only a little bit scared.', s: 'bear', pinned: true },
  { n: 'Nana Noctua', w: 'Sign politely, dears. Whooo else will?', s: 'owl', pinned: true },
];
const MESSAGES = {
  empty: 'write a little something first!',
  link: 'Pip can’t pin links. just words, please ♡',
  unkind: 'Pip only pins kind words. try saying it another way ♡',
  slow: 'Pip is still pinning the last wish. try again in a few seconds!',
  failed: 'the wall is a bit sleepy right now. please try again in a moment.',
};
const LINKS = /(https?:\/\/|www\.|\.(com|net|org|io|xyz|ru|in)\b)/i;

const isLocalPreview = () => ['localhost', '127.0.0.1', ''].includes(location.hostname) || location.protocol === 'file:';
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

function ago(t) {
  if (!t) return '';
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24); return d === 1 ? 'yesterday' : `${d} days ago`;
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function writeLocal(list) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 20))); } catch { /* storage unavailable */ }
}

export function initGuestbook() {
  const form = document.getElementById('gbForm');
  if (!form) return;
  const wall = document.getElementById('gbWall');
  const mode = document.getElementById('gbMode');
  const status = document.getElementById('gbStatus');
  const send = document.getElementById('gbSend');
  const wish = document.getElementById('gbWish');
  const count = document.getElementById('gbCount');
  let live = false;
  let entries = [];

  // Every note is built with textContent, so nothing a visitor types can become HTML.
  function note(e, fresh = false) {
    const li = document.createElement('li');
    li.className = `gb__note${e.pinned ? ' gb__note--pinned' : ''}${fresh ? ' is-new' : ''}`;
    li.style.setProperty('--tilt', `${((e.w.length * 7 + (e.t || 3)) % 7) - 3}deg`);
    const sticker = document.createElement('span');
    sticker.className = 'gb__sticker';
    sticker.setAttribute('aria-hidden', 'true');
    sticker.textContent = STICKERS[e.s] || '⭐';
    const text = document.createElement('p');
    text.className = 'gb__text';
    text.textContent = e.w;
    const meta = document.createElement('p');
    meta.className = 'gb__meta';
    const who = document.createElement('b');
    who.textContent = e.n;
    meta.append('— ', who, e.pinned ? ' · 📌 pinned by pip' : e.t ? ` · ${ago(e.t)}` : '');
    li.append(sticker, text, meta);
    return li;
  }

  function render(newest) {
    wall.replaceChildren(...entries.map((e) => note(e, e === newest)), ...PINNED.map((e) => note(e)));
  }

  async function load() {
    if (!isLocalPreview()) {
      try {
        const r = await fetch('/api/guestbook', { cache: 'no-store' });
        const data = r.ok ? await r.json() : null;
        if (data?.ok) {
          live = true;
          entries = data.entries;
          mode.textContent = entries.length ? `${entries.length} wish${entries.length === 1 ? '' : 'es'} on the wall` : 'be the very first to sign!';
          render();
          return;
        }
      } catch { /* fall through to local mode */ }
    }
    live = false;
    entries = readLocal();
    mode.textContent = '🔌 the shared wall isn’t switched on yet, so wishes are saved in your browser for now.';
    render();
  }

  wish.addEventListener('input', () => { count.textContent = `${wish.value.length} / ${MAX_WISH}`; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const entry = {
      n: clean(data.get('n'), 24) || 'a sleepy visitor',
      w: clean(data.get('w'), MAX_WISH),
      s: data.get('s') || 'moon',
    };
    if (entry.w.length < 2) { status.textContent = MESSAGES.empty; wish.focus(); return; }
    if (LINKS.test(entry.w) || LINKS.test(entry.n)) { status.textContent = MESSAGES.link; return; }

    send.disabled = true;
    send.textContent = 'pinning…';
    status.textContent = '';
    let saved = null;
    if (live) {
      try {
        const r = await fetch('/api/guestbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
        const res = r.ok ? await r.json() : { ok: false, reason: 'failed' };
        if (res.ok) saved = res.entry;
        else status.textContent = MESSAGES[res.reason] || MESSAGES.failed;
      } catch {
        status.textContent = MESSAGES.failed;
      }
    } else {
      saved = { ...entry, t: Date.now() };
      writeLocal([saved, ...readLocal()]);
    }
    send.disabled = false;
    send.textContent = '📌 pin my wish';
    if (!saved) return;

    entries = [saved, ...entries];
    render(saved);
    form.reset();
    count.textContent = `0 / ${MAX_WISH}`;
    status.textContent = live ? 'pinned! everyone can see your wish now ✨' : 'pinned! (saved in your browser) ✨';
    if (live) mode.textContent = `${entries.length} wish${entries.length === 1 ? '' : 'es'} on the wall`;
    chime();
    const first = wall.firstElementChild;
    if (first) { const c = centerOf(first); sparks(c.x, c.y, { count: 20, spread: 120 }); }
    toast('📌 Pip pinned your wish to the dream wall!');
    remember(saved.n && saved.n !== 'a sleepy visitor' && !memory().name ? { wished: true, name: saved.n } : { wished: true });
  });

  // Pip already knows your name? Fill it in.
  const nameField = document.getElementById('gbName');
  if (memory().name && !nameField.value) nameField.value = memory().name;
  window.addEventListener('pip:named', (e) => { if (!nameField.value) nameField.value = e.detail; });

  load();
}