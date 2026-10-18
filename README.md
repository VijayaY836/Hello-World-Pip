# Pip · Junior Dream Engineer

> “I build the dreams you fall asleep inside.”

The homepage of **Pip**, the skull baby who works the night shift at the Midnight Nursery.
Built for **Baby's First Website** (haX.baby, 17–19 Oct 2026), **Track 1: The Skull Baby**.

## The story: “The Dream Nobody Dreamed”

Long ago, a little ghost named Wisp couldn't fall asleep because nobody sang to them, so the dream meant for that night was never dreamed. It drifted past the moon, bonked into a chimney, and woke up as Pip: a moonlight face, two stars caught in the eyes, always sleepy, and *very* against silence. Nana Noctua found Pip in the nursery's lost-and-found, Pip hummed a wobbly first lullaby, built Wisp a real dream, and became the Junior Dream Engineer.

## Pages

Home is **the Dream Cartographer**: a living, explorable map of Pip's dreamland, with Pip in the middle. Drag, swipe, use the arrow keys or the ‹ › buttons to explore; the compass brings you back to Pip. Three big banners are the main pages (`#/story`, `#/work`, `#/play`). Seven more places are hidden as twinkling stars: hover, focus or tap one to reveal its name (it turns pink once found), and the counter in the corner tracks how many you've found. Tap the counter and Pip points you to the next one. Pick any place and a trail of stardust appears; Pip flies along it, the map follows, and the page opens. Places you've visited get a ✓, and what you've found is remembered. Back/forward buttons, direct links and shared `#lullaby=` links all work.

The map is a single painting of Pip's mushroom pond (2375 × 822), shown at or below its real size so it stays sharp, in three tiles. On a wide screen most of it fits across; on a phone you swipe. At night the land is tinted and lit with a glowing moon, flickering windows, a shimmering waterfall, fireflies and a little mail plane; by day it's back to pastel.

| Page | What's there |
|---|---|
| Home | The Dream Cartographer map: Pip (live eyes, nose boop, day/night) in the middle of his dreamland, 10 places to fly to, then `pip.nfo` |
| Story | The 6-scene origin story |
| Work | Workbench, Lullaby Lab, Storybook, Dream Delivery Routes |
| Play | Lights-Out Nursery, Catch the Dreams, the Dream Wall guestbook |

## What's on the page

| Requirement | Where |
|---|---|
| What Pip is | Hero + `pip.nfo` window |
| What Pip does (3 projects) | Pip's Workbench: Lullaby Lab, Nightlight Collection, Growth Chart |
| Pip's story | 6 scroll-driven scenes on a sticky stage |
| Immersion | Pip's eyes follow your cursor/finger, blink, and wander when idle |
| Day / night toggle | Night: Pip is awake. Day: Pip is asleep (eyelids close, zzz) |
| Mobile | Phone-first layout and re-staged story scenes for portrait screens |
| Easter egg | Read the footer hint 👀 (plus a bonus: boop Pip's nose) |
| **Tier 2 · Flashlight cursor** | Lights-Out Nursery: your cursor/finger is Pip's lantern (canvas mask). Find 5 hidden dream doodles to switch the lights on |
| **Tier 2 · Lullaby Lab** | Playable 8×8 star-grid sequencer (pentatonic, so it always sounds gentle): 3 voices, 3 speeds, presets, "dream one up", shareable `#lullaby=` links |
| **Tier 2 · Storybook** | "Mumble and the Very Big Dark", an original 10-page picture book with 3D page turns; buttons, ← → keys, swipe or tap |
| **Tier 2 · Dream Delivery Routes** | Scroll-synced SVG map: the flight path draws itself (stroke-dashoffset) while Pip flies along it; 5 rooftop stops light up as dreams drop down the chimneys, with a live delivery log |
| **Tier 2 · Mini-game** | Catch the Dreams: 30-second canvas game, combos, alarm clocks to dodge, best score + all-time "dreams delivered" |

### Tier 3

| Feature | How |
|---|---|
| 📌 Live dream guestbook | See "Live guestbook" below: a real backend (Vercel function + Upstash Redis) |
| 🧠 Pip remembers you | Returning visitors get a personal greeting (name, days away, unfinished story, doodles left, best score, late-night visits). `pip_remembers_you.txt` on Home shows visit count, first-met date, a discovery checklist, a resume link and a name Pip can call you. Stored only in the visitor's browser, with a two-tap "forget me" |
| 💬 Pip chats back | **whisper to pip** (the "talk to pip" button on every page): a rule-based chat in Pip's voice with ~35 topics. Tappable default questions to start, follow-up suggestions after every answer, free typing too. Pip uses what it remembers (name, visits, best score), and some answers act: sing a lullaby, open a page, switch day/night or chaos mode. No AI service: instant, free, works offline |
| ⚡ Lighthouse 90+ | Mobile, served compressed like on Vercel: Performance 95–97, Accessibility 100, Best Practices 96, SEO 100. Pages set themselves up on first visit, fonts don't block the first paint, the sky paints a still frame first and starts twinkling once the page settles, eye-tracking only updates when the pointer moves, thumbnails for small images, long cache headers (`vercel.json`) |
| 🧸 3D Pip | Play page: Pip modelled in code with Three.js from simple shapes (moon-skull head, glowing star-eyes that follow your pointer, starry nightcap with pom-pom and bow, heart onesie, cloud, orbiting stars). Drag to spin (with inertia), tap to squish, wave, spin, arrow keys, and a pixelated "1998 low-poly" render mode. Eyes close in day mode. Loaded only when the section comes into view; 2D fallback without WebGL |

### Side quests

| Quest | How |
|---|---|
| ✨ Sparkle cursor trail | Canvas glitter that follows the pointer (theme-aware, rainbow in chaos mode, off for reduced-motion) |
| 📌 Live guestbook | The Dream Wall on the Play page: visitors pin wishes for Pip (`api/guestbook.js`, same Upstash Redis). Links and rude words are blocked, 140-character limit, 20-second cooldown per visitor, and everything is rendered as plain text |
| 🔢 Hit counter odometer | Rolling odometer in the footer, backed by `api/hits.js` (Vercel function + Upstash Redis); falls back to an honest "your visits" count |
| 🔊 Click sounds + mute | Buttons rattle, links wind-chime; mute switch always in the top bar |
| 🌀 Responsive Chaos Mode | Toggle in the top bar: the chaos reshapes to the screen (shape-based personalities, stickers scale with screen area, re-tilts on resize, live W×H badge, DVD-style bouncing Pip) |

The Lullaby Lab also has a **sleep timer** (off / 30s / 1 / 5 / 10 min) with a gentle fade-out.

All sound is synthesized live with the Web Audio API, starts **off**, and has a mute switch that's always visible in the top bar.

## Run it

No build step, no dependencies. It's a plain static site.

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

ES modules need a server, so opening `index.html` straight from disk won't load the JavaScript. Deploy the folder as-is to Vercel, Netlify or GitHub Pages.

## Structure

```
index.html
css/style.css
js/main.js     wires everything together
js/router.js   home / story / work / play pages
js/audio.js    Web Audio synth: plinks, giggles, music box, hum, chime
js/eyes.js     cursor-following eyes, blinking, idle wandering
js/theme.js    day/night toggle
js/story.js    scroll-driven scenes, generated town skyline, dream-orb path
js/toys.js     the three showcase projects
js/eggs.js     secrets
js/lab.js      Lullaby Lab sequencer
js/storybook.js  flip-page bedtime storybook
js/routes.js   Dream Delivery Routes map
js/nightroom.js  Lights-Out Nursery (flashlight cursor)
js/game.js     Catch the Dreams mini-game
js/fx.js       speech bubble, toast, star sparks
js/sparkles.js sparkle cursor trail
js/clicks.js   click sounds
js/counter.js  hit counter odometer
js/chaos.js    Responsive Chaos Mode
js/guestbook.js  the Dream Wall guestbook
js/memory.js   Pip remembers you
js/chat.js     "whisper to pip": Pip chats back
js/pip3d.js    3D Pip (Three.js)
js/sky.js      the living sky: twinkling stars, sparkles, shooting stars, dream-motes
js/dreammap.js the home map: places, stardust trails, panning, Pip's flights
js/vendor/     three.module.min.js + its MIT licence
api/hits.js    Vercel function for the site-wide hit counter
api/guestbook.js  Vercel function for the guestbook
assets/        WebP images from the official pack (cut out, optimized) + small thumbnails
vercel.json    cache headers
```

## Credits

- **Pip, music box and lantern art:** official haX.baby Track 1 asset pack. Backgrounds removed; the eye glints were painted out and are redrawn live in CSS so they can move. The story uses the pack's portrait of Pip with the lantern and music box, with its "Pip" lettering painted out.
- **Nana Noctua illustration:** added by Vij for this site.
- **Dreamland map art:** an AI-generated painting chosen by Vij, shown at its original resolution (cut into tiles, nothing upscaled).
- **Wisp, Mumble, the town, the storybook illustrations, the basket and the grumpy mitten:** hand-drawn SVG for this site. The bedtime story is original.
- **Lullaby melody:** Johannes Brahms, “Wiegenlied” Op. 49 No. 4 (1868, public domain). Every sound is synthesized in the browser.
- **Fonts:** Fredoka via Google Fonts; Mali by Cadson Demak (SIL Open Font License), bundled in `assets/fonts/` with its licence.
- **3D:** [Three.js](https://threejs.org) r160 (MIT licence), bundled in `js/vendor/`, loaded only for the 3D Pip section. No other libraries or frameworks. Built with AI assistance (Claude).

## Deploying

Before each deploy, run `python3 stamp.py`. It gives every CSS/JS file a version stamp (in `index.html`, plus an import map for the modules), so a browser never mixes an old cached file with a new page. `vercel.json` also tells browsers to re-check CSS/JS on every visit (a quick 304 when nothing changed).