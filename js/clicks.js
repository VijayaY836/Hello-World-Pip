// Side quest · Click sounds (with the always-visible mute switch in the top bar).
// Buttons rattle like a baby rattle; links ring a soft wind chime.
// Things that already make their own sound are skipped, so nothing double-plays.

import { rattle, windChime } from './audio.js';

const HAS_OWN_SOUND = [
  '#soundBtn', '#themeBtn', '#chaosBtn', '#heroPip', '#windBtn', '#musicBox', '.swatches',
  '#labGrid', '.lab__tools', '.seg', '.lab__status', '.book-wrap', '#gameStart', '#roomLights',
  '#wispWindow', '.chaos-pip', '.chat',
].join(', ');

export function initClickSounds() {
  document.addEventListener('click', (e) => {
    const el = e.target instanceof Element && e.target.closest('a[href], button, [role="button"]');
    if (!el || el.closest(HAS_OWN_SOUND)) return;
    if (el.matches('a[href]')) windChime();
    else rattle();
  });
}