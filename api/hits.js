// Vercel serverless function: the site-wide visitor counter.
//   GET /api/hits        -> { ok, count }   (just read)
//   GET /api/hits?hit=1  -> { ok, count }   (count this visit, then read)
// Storage: Upstash Redis (free) connected to the Vercel project. Vercel's integration
// provides KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN).
// If storage isn't connected yet, it answers { ok: false } and the page shows a local count instead.

const KEY = 'pip:visits';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    res.status(200).json({ ok: false, reason: 'storage-not-connected' });
    return;
  }
  const hit = req.query && req.query.hit === '1';
  try {
    const r = await fetch(`${url}/${hit ? 'incr' : 'get'}/${KEY}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    res.status(200).json({ ok: true, count: Number(data.result) || 0 });
  } catch {
    res.status(200).json({ ok: false, reason: 'storage-unreachable' });
  }
};