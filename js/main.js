// Pip's homepage: wires everything together.

import { sound, plink, hum } from './audio.js';
import { say, setDefaultLine } from './fx.js';
import { initEyes } from './eyes.js';
import { initTheme } from './theme.js';
import { initStory } from './story.js';
import { initToys } from './toys.js';
import { initEggs } from './eggs.js';
import { initNightRoom } from './nightroom.js';
import { initGame } from './game.js';
import { initLab } from './lab.js';
import { initStorybook } from './storybook.js';
import { initSparkles } from './sparkles.js';
import { initClickSounds } from './clicks.js';
import { initCounter } from './counter.js';
import { initChaos } from './chaos.js';
import { initRoutes } from './routes.js';
import { initRouter } from './router.js';
import { initGuestbook } from './guestbook.js';
import { initMemory, remember, greeting, memory } from './memory.js';
import { initChat } from './chat.js';
import { initPip3D } from './pip3d.js';
import { initSky } from './sky.js';
import { initDreamMap } from './dreammap.js';

// Memories first, so this visit is counted.
initMemory();

initSky(); // twinkling stars, sparkles, shooting stars and dream-motes

// The sky drifts a little as you scroll (parallax depth for the star layers).
(() => {
  const sky = document.querySelector('.sky');
  if (!sky || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { sky.style.setProperty('--scroll', String(Math.round(scrollY))); queued = false; });
  }, { passive: true });
})();

const NIGHT_LINES = [
  "hi! i'm pip ♡",
  'psst… pick a place on my map and i’ll fly you there!',
  'it’s too quiet in here. (try the sound button!)',
  'my eyes are real stars. look!',
];
const isDay = () => document.documentElement.dataset.theme === 'day';
setDefaultLine(() => (isDay() ? 'zzz… night shift… zzz…' : NIGHT_LINES[0]));

// --- Sound toggle (always visible in the top bar) ---
const soundBtn = document.getElementById('soundBtn');
function renderSound(on) {
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', on ? 'sound on: mute' : 'sound off: turn sound on');
  soundBtn.querySelector('.ctrl__icon').textContent = on ? '🔊' : '🔇';
  soundBtn.querySelector('.ctrl__label').textContent = on ? 'sound on' : 'sound off';
  document.documentElement.classList.toggle('sound-on', on);
}
sound.onChange(renderSound);
soundBtn.addEventListener('click', () => {
  sound.toggle();
  if (sound.on) {
    plink();
    say(isDay() ? 'zzz… (pip hums in their sleep)' : 'yay! now i can hear you ♪');
    if (story?.scene === 4) hum();
  }
});
renderSound(false);
if (sound.remembered()) soundBtn.title = 'You turned sound on last time. Tap to turn it on again.';

// --- Day / night ---
initTheme({
  button: document.getElementById('themeBtn'),
  onChange(theme) {
    plink(theme === 'day' ? 1.2 : 0.8);
    say(theme === 'day' ? '*yawn* the sun’s up… goodnight… 💤' : 'i’m awake! time to build dreams ✨', 2800);
  },
});

// --- Pip, the living hero ---
const heroPip = document.getElementById('heroPip');
initEyes(heroPip);
// Pip greets you with what Pip remembers.
say(isDay() ? (memory().name ? `zzz… oh, it's you, ${memory().name}… zzz` : 'zzz… night shift… zzz…') : greeting(), 7000);
window.addEventListener('pip:named', (e) => { if (e.detail) say(`${e.detail}! what a lovely name. i'll remember ♡`, 3500); });
window.addEventListener('pip:forgot', () => say('…who are you? hi, stranger! ♡ (i forgot everything)', 4000));

let lineIndex = 0;
setInterval(() => {
  if (isDay() || document.hidden || document.documentElement.dataset.view !== 'home' || window.scrollY > window.innerHeight * 0.6) return;
  lineIndex = (lineIndex + 1) % NIGHT_LINES.length;
  say(NIGHT_LINES[lineIndex], 4200);
}, 9000);

// --- Each page sets itself up the first time it's opened (keeps the first load light) ---
let story = null;
const PAGES = {
  story() {
    story = initStory({
      onScene(n) {
        if (n === 4) hum(); // Pip's first wobbly hum: the first sound in the story
        if (n === 6) remember({ storyDone: true });
      },
    });
  },
  work() { initToys(); initLab(); initStorybook(); initRoutes(); },
  play() { initNightRoom(); initGame(); initPip3D(); initGuestbook(); },
};
const ready = new Set();
window.addEventListener('pip:view', (e) => {
  const view = e.detail;
  if (PAGES[view] && !ready.has(view)) { ready.add(view); PAGES[view](); }
});

initDreamMap(); // the home page's living map
initEggs(); // the footer town (on every page)

// --- Side quests ---
initSparkles();
initClickSounds();
initCounter();
initChat();
initChaos();

// Pages last: showing the first page also sets it up.
initRouter();

console.log('%c☾ hi, curious one! pip says: someone in town is still awake…', 'color:#ff9fbd;font:16px/1.4 monospace');