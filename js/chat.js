// Tier 3 · Pip chats back — "PipMessenger 98".
// A rule-based chat in Pip's voice: no AI service, no network, instant and free.
// Visitors tap suggested questions (chips) or type; each topic has a few answers,
// follow-up chips, and sometimes an action (open a page, play a lullaby, flip day/night…).

import { sound, musicBox, plink } from './audio.js';
import { memory, remember, best, greeting } from './memory.js';

const DEFAULT_CHIPS = [
  'who are you?', 'tell me your story', 'what do you make?', 'sing me a lullaby',
  'build me a dream', 'tell me a secret', "let's play!", 'goodnight, pip',
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const nameOr = (fallback = 'friend') => memory().name || fallback;
const isDay = () => document.documentElement.dataset.theme === 'day';
const RUDE = /\b(f+u+c+k+\w*|sh[i1]+t+\w*|b[i1]+t+c+h+\w*|stupid|idiot|dumb|ugly|hate you|shut up)\b/i;

// Each topic: test (regex or function), replies (strings or functions), chips, optional action/link.
const TOPICS = [
  {
    id: 'rude', test: RUDE,
    replies: ['oh… that’s not very kind. i only know kind words. can we try again? ♡', '*hides under cloud* …let’s say nice things instead, okay?'],
    chips: ['tell me a joke', 'who are you?'],
  },
  {
    id: 'setname', test: /\b(?:my name is|call me|i am called)\s+([a-z][\w'-]{0,23})/i,
    replies: [(m) => { remember({ name: m[1] }); return `${m[1]}! what a lovely name. i’ll remember it forever (well, until you press “forget me”) ♡`; }],
    chips: ['what do you remember?', 'tell me your story'],
  },
  {
    id: 'whoami', test: /what'?s my name|who am i|do you (know|remember) me|remember me/i,
    replies: [() => {
      const m = memory();
      if (!m.name) return 'hmm… i don’t know your name yet! tell me: “my name is …” ♡';
      return `of course! you’re ${m.name}. this is visit #${m.visits}. i never forget a friend ♡`;
    }],
    chips: ['what do you remember?', 'tell me a secret'],
  },
  {
    id: 'memory', test: /what do you remember|my progress|how am i doing|visits?\b/i,
    replies: [() => {
      const m = memory(); const b = best();
      const bits = [`you’ve visited ${m.visits} time${m.visits === 1 ? '' : 's'}`];
      bits.push(m.storyDone ? 'you read my whole story' : 'you haven’t finished my story yet');
      if (m.dreams) bits.push(`you found ${m.dreams} of my 5 wall doodles`);
      if (b) bits.push(`your best dream shift is ${b} ★`);
      if (m.eggs?.wisp) bits.push('and you found Wisp’s window!');
      return `let me think… ${bits.join(', ')}. (it’s all on my home page too, in “pip remembers you”)`;
    }],
    chips: ['tell me a secret', "let's play!"],
  },
  {
    id: 'greet', test: /^(hi+|hello+|hey+|hiya|yo|namaste|hola|heya|good (morning|afternoon|evening))\b/i,
    replies: [() => `hi ${nameOr('there')}! ♡ i’m pip. what would you like to know?`, () => `hello hello! *waves tiny hand* ${memory().name ? `hi ${memory().name}!` : ''}`],
    chips: ['who are you?', 'what do you make?', 'tell me your story'],
  },
  {
    id: 'who', test: /who are you|what are you|about you|your name|tell me about yourself|introduce/i,
    replies: [
      'i’m pip! a baby made out of a dream that nobody dreamed. my face is moonlight, and two little stars got stuck in my eyes on the way down. ✨',
      'i’m pip, junior dream engineer at the midnight nursery. i’m 1¾ dreams old, a bit sleepy, a bit clumsy, and very against silence.',
    ],
    chips: ['tell me your story', "what's your job?", 'are you scary?'],
  },
  {
    id: 'story', test: /story|born|origin|where (are|did) you (come )?from|how did you (start|begin)|childhood/i,
    replies: [
      'once, a little ghost named Wisp couldn’t sleep, so the dream meant for them floated away. that dream was me! i bonked into a chimney, landed in the lost-and-found, and Nana Noctua gave me a job. want to see the whole thing?',
    ],
    link: { href: '#/story', label: '📖 read my story' },
    chips: ['who is Wisp?', 'who is Nana Noctua?', "what's your job?"],
  },
  {
    id: 'job', test: /job|engineer|what do you do|profession|career|nursery/i,
    replies: [
      'i’m a junior dream engineer at the midnight nursery! i design dreams, lullabies, nightlights and bedtime stories so the neighbourhood’s little creatures can fall asleep.',
      'every night from 7pm to 7am i build dreams. the moths want lullabies, the ghosts want warm lights, and the owls want very quiet libraries.',
    ],
    chips: ['what do you make?', 'what does a dream feel like?'],
  },
  {
    id: 'workshop', test: /workshop|build (me )?a dream|make (me )?a dream|dream maker/i,
    replies: ['in my Dream Workshop you pick who the dream is for, a mood, a place and a sound, and i build it: a little scene, a bedtime story and its own lullaby! you can keep it on your dream shelf or send it to a friend ✦'],
    chips: ['sing me a lullaby', 'who is Mumble?'],
    link: { href: '#workshop', label: '✨ build a dream' },
  },
  {
    id: 'make', test: /what (do|did) you (make|build|create)|\bbuild|project|portfolio|creation|invent|your work|workbench/i,
    replies: [
      'i make lots of things! a music box lab where you can write lullabies, a nightlight collection, a storybook, and a map of my dream delivery route. they’re all on my workbench.',
    ],
    link: { href: '#/work', label: '🛠️ open my workbench' },
    chips: ['sing me a lullaby', 'who is Mumble?', 'where do you deliver dreams?'],
  },
  {
    id: 'sing', test: /sing|lullaby|song|music|hum|melody/i,
    replies: [() => {
      musicBox();
      return sound.on ? '♪ la la looo… la la loo… ♪ (that’s my music box. i added the giggles.)' : '♪ la la looo… ♪ …oh! your sound is off, so i sang very quietly. tap 🔇 at the top to hear me.';
    }],
    link: { href: '#lab', label: '🎼 write your own lullaby' },
    chips: ['another one!', 'goodnight, pip', 'what do you make?'],
  },
  {
    id: 'again', test: /^(another one|one more|again|encore|sing (it )?again)\b/i,
    replies: [() => { musicBox(); return sound.on ? '♪ okay, one more! ♪ *spins the key*' : '♪ …(still quiet, your sound is off) ♪'; }],
    chips: ['goodnight, pip', 'tell me a joke'],
  },
  {
    id: 'mumble', test: /mumble|monster|under the crib/i,
    replies: ['Mumble lives under the crib in the nursery. he’s not scary, he’s scared! mostly of the dark. i built him three nightlights until one was just right. i wrote a whole book about it.'],
    link: { href: '#book', label: '📕 read Mumble’s book' },
    chips: ['are you scared of the dark?', 'who is Wisp?'],
  },
  {
    id: 'wisp', test: /wisp|ghost/i,
    replies: ['Wisp is a little ghost who couldn’t fall asleep on the quietest night ever. the dream meant for them became… me! now i bring Wisp a lantern dream every night. they sleep so well now ♡'],
    chips: ['tell me a secret', 'who is Nana Noctua?'],
  },
  {
    id: 'owl', test: /nana|noctua|owl/i,
    replies: ['Nana Noctua is the wise old owl who runs the midnight nursery. she found me in the lost-and-found, tucked a nightcap on my head, and said “every lost thing has a job here.” she wears glasses. very distinguished.'],
    chips: ['tell me your story', 'who are the moths?'],
  },
  {
    id: 'moths', test: /moth/i,
    replies: ['the baby moths live next door. they were the first ones to fall asleep to my wobbly humming! now they’re my biggest fans. please don’t wake them.'],
    chips: ['sing me a lullaby', 'where do you deliver dreams?'],
  },
  {
    id: 'route', test: /deliver|route|map|fly|chimney/i,
    replies: ['every night i fly across the rooftops: Wisp’s house, the moth house, Nana’s oak, the nursery… and the last dream is always for you. i drew a map!'],
    link: { href: '#routes', label: '🗺️ see my route' },
    chips: ['what does a dream feel like?', "let's play!"],
  },
  {
    id: 'dreamfeel', test: /what does a dream|dreams? (made|feel)|what is a dream/i,
    replies: ['a dream feels like warm milk, a soft blanket, and a song you almost remember. i fold them very carefully so they don’t crumple on the way down the chimney.'],
    chips: ['where do you deliver dreams?', 'goodnight, pip'],
  },
  {
    id: '3d', test: /\b3d\b|three ?d|spin you|rotate you|in 3 ?d/i,
    replies: ['ooh, Nana knitted a 3D me! you can spin me around and squish me. there’s even a 1998 mode. 🕹️'],
    link: { href: '#pip3d-sec', label: '🧸 see 3D pip' },
    chips: ["let's play!", 'tell me a secret'],
  },
  {
    id: 'play', test: /\bplay|game|bored|\bfun\b|catch/i,
    replies: [() => `yay! i have a dream-catching game and a dark room full of hidden doodles. ${best() ? `your best shift is ${best()} ★. beat it?` : 'can you catch 20 dreams?'}`],
    link: { href: '#/play', label: '🎮 go play' },
    chips: ['tell me a secret', 'turn on chaos mode'],
  },
  {
    id: 'secret2', test: /another secret/i,
    replies: ['type “my name is …” and i’ll remember you. also: try chaos mode and then resize your window. things get… weird. 🌀'],
    chips: ['turn on chaos mode', 'goodnight, pip'],
  },  {
    id: 'secret', test: /secret|easter|hidden|egg|clue|hint/i,
    replies: [
      () => (memory().eggs?.wisp ? 'you already found Wisp’s window! hmm… have you tried booping my nose? a lot? 👃' : 'psst… one window in the town at the very bottom of my page is still dark. someone is still awake…'),
      'my nose is very ticklish. i wouldn’t boop it five times if i were you. (please do.)',
      'if you turn the lights off in my nursery, there are five doodles hiding on the walls.',
    ],
    chips: ['another secret?', 'tell me a joke'],
  },

  {
    id: 'scared', test: /scared|afraid|dark|nightmare|can'?t sleep|insomnia|bad dream|lonely|sad/i,
    replies: [() => `oh ${nameOr()}… *pats you with a tiny hand* that’s okay. even Mumble gets scared, and he lives in the dark! want me to sing you something? and if a worry feels too big, telling a grown-up you trust helps a lot. ♡`],
    chips: ['sing me a lullaby', 'tell me a joke'],
  },
  {
    id: 'scary', test: /skull|scary|bones?|skeleton|spooky|creepy/i,
    replies: ['i’m not scary! my face is just very round and very white, like the moon. and my eyes glow so i can find my way in the dark. 🌙'],
    chips: ['who are you?', 'how old are you?'],
  },
  {
    id: 'age', test: /how old|your age|birthday/i,
    replies: ['i’m 1¾ dreams old! that’s about… one long nap and a bit. my birthday is the quietest night of the year.'],
    chips: ['what do you like?', 'tell me your story'],
  },
  {
    id: 'like', test: /favou?rite|what do you like|do you like|hobby|hobbies/i,
    replies: ['i like giggles, warm socks, lullabies, and the sound of everyone breathing slowly when they’re asleep. i do NOT like silence. or the very grumpy mitten.'],
    chips: ['who is the grumpy mitten?', 'sing me a lullaby'],
  },
  {
    id: 'mitten', test: /mitten/i,
    replies: ['the grumpy mitten lives in the lost-and-found. it lost its other half and has been grumpy ever since. we’re working on it.'],
    chips: ['tell me your story', 'tell me a joke'],
  },
  {
    id: 'joke2', test: /another joke/i,
    replies: ['what’s a lullaby’s favourite exercise? rest-ling! 🎶 …okay that one was bad.', 'why was the music box so calm? it had good wind-down skills. 🎵'],
    chips: ['tell me a secret', 'goodnight, pip'],
  },  {
    id: 'joke', test: /joke|funny|laugh|make me smile/i,
    replies: [
      'why did the moon skip dinner? because it was already full! 🌕 hehe',
      'what do you call a sleeping dinosaur? a dino-snore! 🦖💤',
      'why don’t ghosts like the rain? it dampens their spirits! 👻 (Wisp told me that one.)',
      'how do you make a tissue dance? put a little boogie in it! …i’m a baby, okay?',
    ],
    chips: ['another joke!', 'goodnight, pip'],
  },

  {
    id: 'time', test: /what time|the time|clock|what day/i,
    replies: [() => {
      const d = new Date();
      const h = d.getHours();
      const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return h >= 19 || h < 7 ? `it’s ${t}! that means i’m on shift. dreams to build!` : `it’s ${t}. daytime… which is my bedtime. *yawn*`;
    }],
    chips: ['goodnight, pip', "what's your job?"],
  },
  {
    id: 'daynight', test: /day mode|night mode|sun|switch.*(day|night)|lights? (on|off)/i,
    action: () => document.getElementById('themeBtn')?.click(),
    replies: [() => (isDay() ? 'okay, sunrise! *yawn* …i’ll be asleep, but you can look around.' : 'night time! my favourite. ✨ my eyes are glowing again.')],
    chips: ['tell me a secret', 'who are you?'],
  },
  {
    id: 'chaos', test: /chaos|1999|retro|weird mode|calm/i,
    action: () => document.getElementById('chaosBtn')?.click(),
    replies: [() => (document.documentElement.classList.contains('chaos') ? '🌀 WELCOME TO 1999!!! (try resizing your window…)' : '🧘 phew. calm again.')],
    chips: ['turn it off', "let's play!"],
  },
  {
    id: 'chaosoff', test: /turn it off/i,
    action: () => { if (document.documentElement.classList.contains('chaos')) document.getElementById('chaosBtn')?.click(); },
    replies: ['okay okay, everything’s calm now. 🧘'],
    chips: ['tell me a joke', 'goodnight, pip'],
  },
  {
    id: 'creator', test: /who (made|built|created|coded) (you|this)|your (creator|maker)|hackathon|developer|vij/i,
    replies: ['my homepage was built by Vij for haX.baby’s Baby’s First Website hackathon! everything is plain HTML, CSS and JavaScript, and all my sounds are made right in your browser.'],
    chips: ['what do you make?', 'tell me a secret'],
  },
  {
    id: 'love', test: /love you|you'?re cute|so cute|adorable|best/i,
    replies: ['*blushes so hard my cheeks turn pink* ♡♡♡', 'hehe! you’re my favourite visitor today. (don’t tell the moths.)'],
    chips: ['sing me a lullaby', 'goodnight, pip'],
  },
  {
    id: 'thanks', test: /\b(thanks?|thank you|thx|ty)\b/i,
    replies: ['you’re welcome! ♡', 'anytime! that’s what dream engineers are for.'],
    chips: ['tell me a joke', 'goodnight, pip'],
  },
  {
    id: 'how', test: /how are you|how'?s it going|you ok/i,
    replies: [() => (isDay() ? 'sleeeepy. it’s daytime… *yawn* but i’m happy you’re here.' : 'i’m great! the night is young and the moths are already snoring.')],
    chips: ['what do you make?', 'tell me a joke'],
  },
  {
    id: 'bye', test: /good ?night|bye|see you|gotta go|sleep|bedtime|tired/i,
    replies: [() => `goodnight, ${nameOr()}! sweet dreams. i’ll build you a nice one tonight ✨🌙`, () => `sleep tight, ${nameOr()}. don’t let the grumpy mitten bite. ♡`],
    chips: ['sing me a lullaby', 'tell me your story'],
  },
  {
    id: 'help', test: /help|what can (i|you)|options|menu|commands/i,
    replies: ['you can ask me about my story, my work, Mumble, Wisp, Nana Noctua, secrets, jokes, or games. i can sing, switch day/night, or start chaos mode. and tell me your name so i remember you!'],
    chips: DEFAULT_CHIPS,
  },
];

const FALLBACK = [
  'hmm… i’m only 1¾ dreams old, so i don’t know that one yet! try one of these:',
  '*tilts head* i didn’t quite get that. want to ask me something else?',
  'ooh, good question! …i have no idea. 😅 ask me about these instead:',
];

function answer(text) {
  for (const t of TOPICS) {
    const m = text.match(t.test);
    if (!m) continue;
    t.action?.();
    const r = pick(t.replies);
    return { text: typeof r === 'function' ? r(m) : r, chips: t.chips, link: t.link };
  }
  return { text: pick(FALLBACK), chips: pick([DEFAULT_CHIPS.slice(0, 4), DEFAULT_CHIPS.slice(4)]) };
}

export function initChat() {
  const launcher = document.getElementById('chatLauncher');
  const panel = document.getElementById('chatPanel');
  if (!launcher || !panel) return;
  const log = document.getElementById('chatLog');
  const chips = document.getElementById('chatChips');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const badge = document.getElementById('chatBadge');
  const close = document.getElementById('chatClose');
  let started = false;
  let busy = false;

  function bubble(from, text, link) {
    const row = document.createElement('div');
    row.className = `chat__msg chat__msg--${from}`;
    const who = document.createElement('span');
    who.className = 'chat__who';
    who.textContent = from === 'pip' ? 'pip' : (memory().name || 'you');
    const p = document.createElement('p');
    p.textContent = text; // always plain text: nothing typed can become HTML
    row.append(who, p);
    if (link) {
      const a = document.createElement('a');
      a.className = 'chip chat__link';
      a.href = link.href;
      a.textContent = link.label;
      a.addEventListener('click', () => { if (matchMedia('(max-width: 720px)').matches) setOpen(false); });
      row.appendChild(a);
    }
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function setChips(list) {
    chips.replaceChildren(...list.map((label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = label;
      b.addEventListener('click', () => send(label));
      return b;
    }));
  }

  function pipSays(reply) {
    busy = true;
    const typing = document.createElement('div');
    typing.className = 'chat__msg chat__msg--pip chat__typing';
    typing.setAttribute('aria-label', 'pip is typing');
    typing.innerHTML = '<span class="chat__who">pip</span><p><i></i><i></i><i></i></p>';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    const wait = 450 + Math.min(1100, reply.text.length * 9);
    setTimeout(() => {
      typing.remove();
      bubble('pip', reply.text, reply.link);
      setChips(reply.chips || DEFAULT_CHIPS);
      log.scrollTop = log.scrollHeight; // chips change the log's height
      plink(1.3);
      busy = false;
    }, wait);
  }

  function send(raw) {
    const text = String(raw).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!text || busy) return;
    bubble('you', text);
    chips.replaceChildren();
    pipSays(answer(text));
  }

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('chat-open', open);
    if (open) {
      badge.hidden = true;
      if (!started) {
        started = true;
        pipSays({ text: `${greeting()} ask me anything, or tap a question below!`, chips: DEFAULT_CHIPS });
      }
      setTimeout(() => input.focus({ preventScroll: true }), 50);
    } else {
      launcher.focus({ preventScroll: true });
    }
  }

  launcher.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => setOpen(false));
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); input.value = ''; });
  window.addEventListener('pip:forgot', () => { started = false; log.replaceChildren(); chips.replaceChildren(); });
}