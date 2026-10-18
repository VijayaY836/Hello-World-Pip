// Pip's Workbench: the three showcase projects.

import { sound, musicBox, plink } from './audio.js';
import { duck } from './music.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Project 1 · The Lullaby Lab: wind up the music box. */
function initLullaby() {
  const btn = document.getElementById('windBtn');
  const box = document.getElementById('musicBox');
  const note = document.getElementById('lullabyNote');
  const layer = document.querySelector('.card--lullaby .card__notes');
  let playing = false;

  function play() {
    if (playing) return;
    playing = true;
    const seconds = musicBox();
    duck('musicbox', true);
    box.classList.add('is-playing');
    btn.disabled = true;
    btn.textContent = 'playing… ♪';
    note.textContent = sound.on ? '♪ now playing: pip’s lullaby' : 'sound is off: tap 🔇 up top to hear it!';

    const glyphs = ['♪', '♫', '♬', '♩'];
    const spawn = setInterval(() => {
      if (reducedMotion.matches) return;
      const n = document.createElement('span');
      n.className = 'fly-note';
      n.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      n.style.left = `${35 + Math.random() * 30}%`;
      n.style.top = '35%';
      n.style.setProperty('--nx', `${(Math.random() - 0.5) * 120}px`);
      n.style.setProperty('--nr', `${(Math.random() - 0.5) * 60}deg`);
      n.addEventListener('animationend', () => n.remove(), { once: true });
      layer.appendChild(n);
    }, 380);

    setTimeout(() => {
      clearInterval(spawn);
      box.classList.remove('is-playing');
      btn.disabled = false;
      btn.textContent = 'wind it up again ♪';
      note.textContent = 'the moths say thank you.';
      playing = false;
      duck('musicbox', false);
    }, seconds * 1000 + 600);
  }

  btn.addEventListener('click', play);
  box.addEventListener('click', play);
}

/** Project 2 · Nightlight Collection: pick a glow (accessible radio group). */
function initNightlights() {
  const card = document.getElementById('lightsCard');
  const radios = [...card.querySelectorAll('[role="radio"]')];

  function select(btn, focus) {
    radios.forEach((r) => {
      const on = r === btn;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
    });
    card.dataset.glow = btn.dataset.glow;
    if (focus) btn.focus();
    plink(btn.dataset.glow === 'gold' ? 1 : btn.dataset.glow === 'pink' ? 1.12 : 0.9);
  }

  radios.forEach((r, i) => {
    r.tabIndex = i === 0 ? 0 : -1;
    r.addEventListener('click', () => select(r, false));
    r.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      select(radios[(i + step + radios.length) % radios.length], true);
    });
  });
}

/** Project 3 · Growth Chart: bars grow when the card scrolls into view. */
function initGrowthChart() {
  const chart = document.querySelector('.chart');
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) {
      chart.classList.add('is-grown');
      obs.disconnect();
    }
  }, { threshold: 0.4 }).observe(chart);
}

export function initToys() {
  initLullaby();
  initNightlights();
  initGrowthChart();
}