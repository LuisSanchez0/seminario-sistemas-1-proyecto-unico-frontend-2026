// Before shipping a bundle bound to PUBLIC_API_URL, prove that API is live over trusted HTTPS and allows this frontend.
// A temporary Quick Tunnel URL may already have rotated; deploying a dead URL would break the whole site.
const api = new URL(process.env.PUBLIC_API_URL);
const origin = new URL(process.env.FRONTEND_URL).origin;
if (api.protocol !== 'https:' || !api.pathname.endsWith('/api')) throw new Error('PUBLIC_API_URL must be https://<host>/api');
const call = (path, init = {}) => fetch(`${api.href.replace(/\/$/, '')}${path}`, { signal: AbortSignal.timeout(15000), cache: 'no-store', ...init });
let health;
for (let attempt = 0; attempt < 6; attempt++) {
  try { const response = await call('/health'); if (response.ok) { health = await response.json(); break; } } catch { /* retry */ }
  await new Promise(resolve => setTimeout(resolve, 5000));
}
if (health?.ok !== true) throw new Error(`API not healthy at ${api.href}/health`);
const preflight = await call('/auth/password/request', { method: 'OPTIONS', headers: {
  Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
if (preflight.headers.get('access-control-allow-origin') !== origin) throw new Error(`API CORS does not allow ${origin}`);
console.log(`API ${api.href} healthy (revision ${health.version}) and allows ${origin}`);
