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

const NIGHT_LINES = [
  "hi! i'm pip ♡",
  'psst… scroll down. i’ll tell you how i was born.',
  'it’s too quiet in here. (try the sound button!)',
  'my eyes are real stars. look!',
];
const isDay = () => document.documentElement.dataset.theme === 'day';
setDefaultLine(() => (isDay() ? 'zzz… night shift… zzz…' : NIGHT_LINES[0]));

// --- Sound toggle (always visible in the top bar) ---
const soundBtn = document.getElementById('soundBtn');
function renderSound(on) {
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', on ? 'Sound is on. Mute' : 'Sound is off. Turn sound on');
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
say(isDay() ? 'zzz… night shift… zzz…' : NIGHT_LINES[0], 0);

let lineIndex = 0;
setInterval(() => {
  if (isDay() || document.hidden || window.scrollY > window.innerHeight * 0.6) return;
  lineIndex = (lineIndex + 1) % NIGHT_LINES.length;
  say(NIGHT_LINES[lineIndex], 4200);
}, 9000);

// --- Story, projects, secrets ---
const story = initStory({
  onScene(n) {
    if (n === 4) hum(); // Pip's first wobbly hum: the first sound in the story
  },
});
initToys();
initEggs();
initLab();
initStorybook();
initRoutes();
initNightRoom();
initGame();

// --- Side quests ---
initSparkles();
initClickSounds();
initCounter();
initChaos();

console.log('%c☾ hi, curious one! pip says: someone in town is still awake…', 'color:#ff9fbd;font:16px/1.4 monospace');