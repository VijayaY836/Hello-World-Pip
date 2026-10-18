// Tier 3 · Pip remembers you.
// Everything Pip remembers lives in this visitor's own browser (localStorage), nowhere else.
// Other modules call remember({...}) when something memorable happens; Pip uses it to
// greet returning visitors and fills in the "pip_remembers_you.txt" window on the home page.

const KEY = 'pip-memory';
const SESSION_KEY = 'pip-memory-session';
const DAY = 86400000;
// Progress the rest of the site already keeps; "forget me" clears these too.
const RELATED_KEYS = ['pip-best', 'pip-dreams-total', 'pip-lab', 'pip-visits', 'pip-guestbook-local'];
const PAGE_NAMES = { story: 'my story', work: 'my workbench', play: 'the games' };

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

function fresh() {
  return { first: 0, last: 0, prev: 0, visits: 0, name: '', lastPage: '', storyDone: false, dreams: 0, bookDone: false, routesDone: false, composed: false, wished: false, played: false, eggs: {}, visited: {}, found: {} };
}
function load() {
  try { return { ...fresh(), ...JSON.parse(store.get(KEY) || '{}') }; } catch { return fresh(); }
}

let mem = load();
const listeners = new Set();
const save = () => { store.set(KEY, JSON.stringify(mem)); listeners.forEach((fn) => fn(mem)); };

/** Record something memorable. Numbers only ever go up; eggs merge. */
export function remember(patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'eggs' || k === 'visited' || k === 'found') mem[k] = { ...(mem[k] || {}), ...v };
    else if (typeof v === 'number' && typeof mem[k] === 'number' && k !== 'last') mem[k] = Math.max(mem[k], v);
    else mem[k] = v;
  }
  save();
}
export const memory = () => mem;
export const best = () => Number(store.get('pip-best') || 0);
export function onMemory(fn) { listeners.add(fn); }

/** Counts a visit once per browser session. */
function startVisit() {
  let counted = false;
  try { counted = sessionStorage.getItem(SESSION_KEY) === '1'; sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* storage unavailable */ }
  if (!counted) {
    const now = Date.now();
    mem.prev = mem.last || 0;
    mem.visits += 1;
    mem.first = mem.first || now;
    mem.last = now;
    save();
  }
}

function agoText(t) {
  const days = Math.floor((Date.now() - t) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** What Pip says first, based on what Pip remembers. */
export function greeting() {
  const hi = mem.name ? `hi again, ${mem.name}!` : 'you’re back!';
  if (mem.visits <= 1) return "hi! i'm pip ♡ nice to meet you!";
  const away = mem.prev ? Date.now() - mem.prev : 0;
  const hour = new Date().getHours();
  const options = [];
  if (away > DAY) options.push(`${hi} it’s been ${Math.floor(away / DAY)} day${away > 2 * DAY ? 's' : ''}. i missed you ♡`);
  if (hour >= 23 || hour < 5) options.push(`${hi} shouldn’t you be asleep? …i’m glad you came though ♡`);
  if (!mem.storyDone) options.push(`${hi} you never finished my story… want to?`);
  if (mem.dreams > 0 && mem.dreams < 5) options.push(`${hi} back for the last ${5 - mem.dreams} doodle${5 - mem.dreams === 1 ? '' : 's'}?`);
  if (best() > 0) options.push(`${hi} your best shift was ${best()} ★. beat it?`);
  if (!mem.eggs.wisp && mem.visits >= 3) options.push(`${hi} psst… have you checked the dark window yet?`);
  options.push(`${hi} this is visit #${mem.visits} ♡`);
  return options[0];
}

export function initMemory() {
  startVisit();
  const list = document.getElementById('memoList');
  const hello = document.getElementById('memoHello');
  const resume = document.getElementById('memoResume');
  const forget = document.getElementById('memoForget');
  const nameForm = document.getElementById('memoNameForm');
  const nameInput = document.getElementById('memoName');
  if (!list) return;

  function row(done, text) {
    const li = document.createElement('li');
    li.className = done ? 'is-done' : '';
    const box = document.createElement('span');
    box.className = 'memo__box';
    box.setAttribute('aria-hidden', 'true');
    box.textContent = done ? '✓' : '';
    const label = document.createElement('span');
    label.textContent = text;
    li.append(box, label);
    li.setAttribute('aria-label', `${done ? 'done' : 'not yet'}: ${text}`);
    return li;
  }

  function render() {
    hello.textContent = mem.visits <= 1
      ? 'we just met! explore, and i’ll remember what you find.'
      : `visit #${mem.visits} · we first met ${agoText(mem.first)}`;
    const b = best();
    list.replaceChildren(
      row(mem.storyDone, 'read my whole story'),
      row(mem.dreams >= 5, `found my wall doodles (${mem.dreams}/5)`),
      row(b > 0 || mem.played, b > 0 ? `best dream shift: ${b} ★` : 'played catch the dreams'),
      row(mem.bookDone, 'read Mumble’s storybook'),
      row(mem.routesDone, 'flew my delivery route'),
      row(mem.composed, 'wrote a lullaby in the lab'),
      row(mem.wished, 'pinned a wish on the dream wall'),
      row(Boolean(mem.eggs.wisp), mem.eggs.wisp ? 'found the secret window' : '??? (a secret)'),
      row(Boolean(mem.eggs.sneeze), mem.eggs.sneeze ? 'made me sneeze' : '??? (another secret)'),
    );
    const page = mem.lastPage && mem.lastPage !== 'home' && PAGE_NAMES[mem.lastPage];
    resume.hidden = !(page && mem.visits > 1);
    if (page) { resume.href = `#/${mem.lastPage}`; resume.textContent = `↩ back to ${page}`; }
    if (document.activeElement !== nameInput) nameInput.value = mem.name || '';
  }

  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
    remember({ name });
    nameInput.blur();
    window.dispatchEvent(new CustomEvent('pip:named', { detail: name }));
  });

  // Two taps to forget, so nobody erases their memories by accident.
  let armed = 0;
  forget.addEventListener('click', () => {
    if (!armed) {
      forget.textContent = 'tap again to forget';
      armed = setTimeout(() => { armed = 0; forget.textContent = 'forget me'; }, 3000);
      return;
    }
    clearTimeout(armed); armed = 0;
    [KEY, ...RELATED_KEYS].forEach(store.del);
    mem = fresh();
    mem.visits = 1; mem.first = mem.last = Date.now();
    save();
    forget.textContent = 'forget me';
    window.dispatchEvent(new CustomEvent('pip:forgot'));
  });

  onMemory(render);
  render();
}