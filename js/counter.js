// Side quest · Hit counter odometer.
// Counts real visitors site-wide through /api/hits (a Vercel function).
// Where that isn't available (local preview, or storage not connected yet),
// it honestly shows how many times *you* have visited instead.

const DIGITS = 6;

function store(kind) {
  try { return kind === 'session' ? window.sessionStorage : window.localStorage; } catch { return null; }
}

async function fetchGlobal(countThisVisit) {
  const host = location.hostname;
  if (location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host === '') return null;
  try {
    const r = await fetch(`/api/hits${countThisVisit ? '?hit=1' : ''}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const data = await r.json();
    return data.ok ? data.count : null;
  } catch {
    return null;
  }
}

function render(el, n) {
  const text = String(Math.min(n, 10 ** DIGITS - 1)).padStart(DIGITS, '0');
  if (!el.children.length) {
    el.innerHTML = Array.from({ length: DIGITS }, () =>
      `<span class="odo__digit"><span class="odo__strip">${'0123456789'.split('').map((d) => `<i>${d}</i>`).join('')}</span></span>`).join('');
  }
  [...el.querySelectorAll('.odo__strip')].forEach((strip, i) => {
    strip.style.setProperty('--d', text[i]);
    strip.style.transitionDelay = `${(DIGITS - i) * 0.12}s`; // roll right-to-left, like a real odometer
  });
  el.setAttribute('aria-label', String(n));
}

export async function initCounter() {
  const el = document.getElementById('odo');
  const caption = document.getElementById('odoCaption');
  const label = document.getElementById('odoLabel');
  if (!el) return;
  render(el, 0);

  const session = store('session');
  const local = store('local');
  const firstThisSession = !session?.getItem('pip-counted');
  session?.setItem('pip-counted', '1');

  const global = await fetchGlobal(firstThisSession);
  let n;
  if (global !== null) {
    n = global;
    label.textContent = '★ you are visitor ★';
    caption.textContent = 'dreamers have visited the Midnight Nursery';
  } else {
    n = Number(local?.getItem('pip-visits') || 0) + (firstThisSession ? 1 : 0);
    local?.setItem('pip-visits', String(n));
    label.textContent = '★ your visits ★';
    caption.textContent = n === 1 ? 'visit from you so far (pip remembers!)' : 'visits from you so far (pip remembers!)';
  }
  requestAnimationFrame(() => requestAnimationFrame(() => render(el, n)));
}