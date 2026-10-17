// Secrets for curious visitors.
//  1. Boop Pip's nose (5 boops = a sparkly sneeze).
//  2. The hidden Easter egg: one window in town is still dark. That's Wisp.

import { giggle, sneeze, chime } from './audio.js';
import { say, sparks, toast, centerOf } from './fx.js';

const BOOP_LINES = ['hehe!', 'boop!', 'that tickles!', 'again?!', 'a… a…'];

function initNoseBoop() {
  const pip = document.getElementById('heroPip');
  const nose = document.getElementById('pipNose');
  let boops = 0;
  let resetTimer = 0;

  nose.addEventListener('click', () => {
    if (document.documentElement.dataset.theme === 'day') {
      say('zzz… *mumble* …five more minutes…', 2600);
      return;
    }
    boops += 1;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { boops = 0; }, 4000);

    pip.classList.remove('is-booped');
    void pip.offsetWidth;
    pip.classList.add('is-booped');
    setTimeout(() => pip.classList.remove('is-booped'), 900);

    if (boops < 5) {
      giggle();
      say(BOOP_LINES[boops - 1]);
      return;
    }
    boops = 0;
    sneeze();
    say('a… a… ACHOO! ✨', 3000);
    const { x, y } = centerOf(nose);
    setTimeout(() => sparks(x, y, { count: 34, spread: 220 }), 750);
  });
}

/** Builds the little footer town and hides Wisp's dark window in the middle house. */
function buildFooterTown() {
  const wrap = document.getElementById('footTown');
  const secret = document.getElementById('wispWindow');
  const houses = [
    [70, 60], [90, 84], [64, 52], [110, 96], [76, 70], [96, 62],
    [120, 90], // ← middle house: Wisp lives here
    [80, 74], [104, 58], [68, 88], [92, 66], [74, 54], [100, 80],
  ];
  const middle = Math.floor(houses.length / 2);
  houses.forEach(([w, h], i) => {
    const house = document.createElement('div');
    house.className = 'fh';
    house.style.width = `${w}px`;
    house.style.height = `${h}px`;
    house.style.setProperty('--w', `${w}px`);
    const wins = i === middle ? [[0.2, 0.25], [0.65, 0.25], [0.2, 0.6]] : [[0.22, 0.3], [0.62, 0.3], [0.42, 0.66]].slice(0, 1 + (i % 3));
    wins.forEach(([lx, ty]) => {
      const win = document.createElement('i');
      win.style.left = `${lx * 100}%`;
      win.style.top = `${ty * 100}%`;
      house.appendChild(win);
    });
    if (i === middle) {
      secret.style.left = '65%';
      secret.style.top = '60%';
      house.appendChild(secret);
    }
    wrap.appendChild(house);
  });
}

function initWisp() {
  buildFooterTown();
  const secret = document.getElementById('wispWindow');
  const wisp = document.getElementById('footWisp');
  const town = wisp.parentElement;
  let found = false;
  let hideTimer = 0;

  secret.addEventListener('click', () => {
    const t = town.getBoundingClientRect();
    const w = secret.getBoundingClientRect();
    wisp.style.left = `${w.left - t.left + w.width / 2}px`;
    wisp.style.top = `${w.top - t.top}px`;
    wisp.classList.add('is-out');
    secret.classList.add('is-lit');
    secret.setAttribute('aria-label', "Wisp's window, now warm and glowing");
    chime();
    const { x, y } = centerOf(secret);
    sparks(x, y, { count: 26, spread: 160 });
    toast(found ? 'Wisp waves hello again ♡' : '★ secret found! Wisp got their dream after all. ★');
    found = true;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => wisp.classList.remove('is-out'), 5200);
  });
}

export function initEggs() {
  initNoseBoop();
  initWisp();
}
