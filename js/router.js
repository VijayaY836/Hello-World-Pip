// Tiny hash router: one page per view (#/, #/story, #/work, #/play).
// Header and footer stay; only the middle swaps. Old section links (#lab, #book…)
// and shared lullaby links (#lullaby=…) still work: they open the right page and scroll there.

const VIEWS = ['home', 'story', 'work', 'play'];
const TITLES = {
  home: 'Pip · Junior Dream Engineer',
  story: 'Pip · My Story',
  work: 'Pip · Things I Make',
  play: 'Pip · Games & Secrets',
};
const FILE = { home: '', story: 'story.html', work: 'work.html', play: 'play.html' };
const ADDRESS = 'http://www.midnightnursery.net/~pip/';

function resolve(hash) {
  const h = hash.replace(/^#/, '');
  if (h === '' || h === '/') return { view: 'home' };
  const route = h.match(/^\/(\w+)/);
  if (route && VIEWS.includes(route[1])) return { view: route[1] };
  if (h.startsWith('lullaby=')) return { view: 'work', target: 'lab' };
  // A plain #id: open whichever page contains it.
  const el = document.getElementById(h);
  const view = el?.closest('.view')?.dataset.view;
  return view ? { view, target: h } : { view: 'home' };
}

export function initRouter() {
  const views = Object.fromEntries([...document.querySelectorAll('.view')].map((v) => [v.dataset.view, v]));
  const navLinks = [...document.querySelectorAll('[data-route]')];
  const address = document.querySelector('.address__url');
  let current = null;

  function show({ view, target }, first = false) {
    const changed = view !== current;
    current = view;
    for (const [name, el] of Object.entries(views)) el.hidden = name !== view;
    document.documentElement.dataset.view = view;
    document.title = TITLES[view];
    if (address) address.textContent = ADDRESS + FILE[view];
    navLinks.forEach((a) => (a.dataset.route === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));

    if (changed && !first) {
      const el = views[view];
      el.classList.remove('is-entering');
      void el.offsetWidth;
      el.classList.add('is-entering');
    }

    // Newly visible sections need to re-measure themselves.
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      const goal = target && document.getElementById(target);
      if (goal) goal.scrollIntoView({ behavior: 'instant', block: 'start' });
      else if (changed) window.scrollTo({ top: 0, behavior: 'instant' });
      if (changed && !first) document.getElementById('main')?.focus({ preventScroll: true });
    });
  }

  window.addEventListener('hashchange', () => show(resolve(location.hash)));
  show(resolve(location.hash), true);
  return { get view() { return current; } };
}