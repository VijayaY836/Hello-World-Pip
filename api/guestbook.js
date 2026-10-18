// Vercel serverless function: Pip's dream guestbook.
//   GET  /api/guestbook          -> { ok, entries: [{ n, w, s, t }] }   newest first
//   POST /api/guestbook {n,w,s}  -> { ok, entry } or { ok: false, reason }
// Storage: the same Upstash Redis as the hit counter (KV_REST_API_URL / KV_REST_API_TOKEN).
// Every answer is HTTP 200 with ok true/false, so the page never shows console errors.

const KEY = 'pip:guestbook';
const KEEP = 200;        // wishes kept in storage
const SEND = 40;         // wishes sent to the page
const COOLDOWN_S = 20;   // one wish per visitor every 20 seconds
const STICKERS = ['moon', 'star', 'zzz', 'bear', 'ghost', 'owl'];
const MAX_NAME = 24;
const MAX_WISH = 140;

// Pip only pins kind words: no links, no rude words.
const LINKS = /(https?:\/\/|www\.|\.(com|net|org|io|xyz|ru|in)\b)/i;
const RUDE = /\b(f+u+c+k+\w*|sh[i1]+t+\w*|b[i1]+t+c+h+\w*|a+s+s+h+o+l+e+\w*|d[i1]+c+k+\w*|c+u+n+t+\w*|wh[o0]+r+e+\w*|sl+u+t+\w*|bastard\w*|retard\w*|nigg\w*|fag\w*|kill\s*yourself|kys)\b/i;

function clean(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, ' ') // control & direction-trick characters
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(200).json({ ok: false, reason: 'storage-not-connected' });

  const redis = async (command) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  };

  try {
    if (req.method === 'GET') {
      const rows = (await redis(['LRANGE', KEY, '0', String(SEND - 1)])) || [];
      const entries = rows.map((row) => { try { return JSON.parse(row); } catch { return null; } }).filter(Boolean);
      return res.status(200).json({ ok: true, entries });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      body = body || {};
      const n = clean(body.n, MAX_NAME) || 'a sleepy visitor';
      const w = clean(body.w, MAX_WISH);
      const s = STICKERS.includes(body.s) ? body.s : 'star';
      if (w.length < 2) return res.status(200).json({ ok: false, reason: 'empty' });
      if (LINKS.test(n) || LINKS.test(w)) return res.status(200).json({ ok: false, reason: 'link' });
      if (RUDE.test(n) || RUDE.test(w)) return res.status(200).json({ ok: false, reason: 'unkind' });

      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const fresh = await redis(['SET', `pip:gb:cool:${ip}`, '1', 'NX', 'EX', String(COOLDOWN_S)]);
      if (fresh !== 'OK') return res.status(200).json({ ok: false, reason: 'slow' });

      const entry = { n, w, s, t: Date.now() };
      await redis(['LPUSH', KEY, JSON.stringify(entry)]);
      await redis(['LTRIM', KEY, '0', String(KEEP - 1)]);
      return res.status(200).json({ ok: true, entry });
    }

    return res.status(200).json({ ok: false, reason: 'method' });
  } catch {
    return res.status(200).json({ ok: false, reason: 'storage-unreachable' });
  }
};