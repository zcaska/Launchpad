const ALLOWED_ORIGINS = new Set([
  'https://zcaska.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function isAllowedRoute(method, segments) {
  const path = segments.join('/');
  if (method === 'GET' && (path === 'open/v1/user/profile' || path === 'open/v1/project')) return true;
  if (method === 'GET' && /^open\/v1\/project\/[^/]+\/data$/.test(path)) return true;
  if (method === 'POST' && path === 'open/v1/task') return true;
  if (method === 'POST' && /^open\/v1\/task\/[^/]+$/.test(path)) return true;
  if (method === 'POST' && /^open\/v1\/project\/[^/]+\/task\/[^/]+\/complete$/.test(path)) return true;
  if (method === 'DELETE' && /^open\/v1\/project\/[^/]+\/task\/[^/]+$/.test(path)) return true;
  return false;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: 'Origin is not allowed.' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const token = req.headers.authorization;
  if (typeof token !== 'string' || !/^Bearer\s+\S+$/i.test(token)) {
    return res.status(401).json({ error: 'A TickTick bearer token is required.' });
  }

  const rawPath = req.query.path;
  const pathValue = Array.isArray(rawPath) ? rawPath.join('/') : typeof rawPath === 'string' ? rawPath : '';
  const segments = pathValue.split('/').filter(Boolean);
  if (!isAllowedRoute(req.method, segments)) {
    return res.status(404).json({ error: 'TickTick API route is not supported.' });
  }

  const query = new URL(req.url, 'https://proxy.invalid').searchParams;
  query.delete('path');
  const queryString = query.toString();
  const target = `https://api.ticktick.com/${segments.map(encodeURIComponent).join('/')}${queryString ? `?${queryString}` : ''}`;

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        Authorization: token,
        ...(req.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(req.method === 'POST' ? { body: JSON.stringify(req.body ?? {}) } : {}),
    });
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const body = Buffer.from(await upstream.arrayBuffer());
    return res.status(upstream.status).send(body);
  } catch (error) {
    console.error('TickTick upstream request failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(502).json({ error: 'Could not reach TickTick. Try again shortly.' });
  }
};
