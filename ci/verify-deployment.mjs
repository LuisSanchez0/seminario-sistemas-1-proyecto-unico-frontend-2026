import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
// Node's fetch validates TLS certificates; only HTTPS URLs are accepted.
const httpsUrl = value => {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`HTTPS URL required: ${value}`);
  return url;
};
const base = httpsUrl(process.env.FRONTEND_URL.replace(/\/?$/, '/'));
const deployment = httpsUrl(process.env.DEPLOYMENT_URL);
if (!deployment.hostname.endsWith('.vercel.app')) throw new Error(`Unexpected Vercel deployment URL: ${deployment}`);
const directory = 'dist/luminabeauty-app/browser';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const local = file => digest(fs.readFileSync(path.join(directory, file)));
const get = route => fetch(new URL(route, base), { signal: AbortSignal.timeout(15000), cache: 'no-store', redirect: 'manual' });
// The production alias moves to the new deployment shortly after `vercel deploy --prod` returns.
let release;
for (let attempt = 0; attempt < 20 && release?.version !== process.env.GIT_COMMIT; attempt++) {
  if (attempt) await sleep(3000);
  try { const response = await get('release.json'); if (response.ok) release = await response.json(); } catch { /* retry */ }
}
if (release?.version !== process.env.GIT_COMMIT) throw new Error(`Production serves ${release?.version ?? 'nothing'}, expected ${process.env.GIT_COMMIT}`);
const files = fs.readdirSync(directory).filter(file => /\.(js|css)$/.test(file));
const apiLiteral = JSON.stringify(process.env.PUBLIC_API_URL);
let servesApiUrl = false;
for (const file of [...files, 'index.html']) {
  const response = await get(file);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  if (file.endsWith('.js') && !/javascript/.test(response.headers.get('content-type') || '')) throw new Error('Incorrect JavaScript content type');
  const body = Buffer.from(await response.arrayBuffer());
  if (digest(body) !== local(file)) throw new Error(`Stale or incorrect asset: ${file}`);
  servesApiUrl ||= file.endsWith('.js') && body.toString('utf8').includes(apiLiteral);
}
// The live frontend must call exactly the API URL the backend deployment just verified.
if (!servesApiUrl) throw new Error(`Deployed bundle does not embed ${process.env.PUBLIC_API_URL}`);
const main = files.find(file => file.startsWith('main-'));
if (!/immutable/.test((await get(main)).headers.get('cache-control') || '')) throw new Error('Hashed assets must be immutable');
// Direct loads of Angular routes must return the app shell, not a 404 or a login redirect.
const routes = ['auth/login', 'auth/restore', 'products', 'cart', 'my-orders', 'admin/dashboard', 'admin/reports/sales'];
for (const route of routes) {
  const response = await get(route);
  if (response.status !== 200 || !/text\/html/.test(response.headers.get('content-type') || '')) throw new Error(`/${route}: HTTP ${response.status}`);
  if (digest(Buffer.from(await response.arrayBuffer())) !== local('index.html')) throw new Error(`/${route} did not return the Angular index`);
}
if ((await get('chunk-MISSING0.js')).status !== 404) throw new Error('Missing assets must 404, not fall back to HTML');
console.log(`Verified ${base.origin} (deployment ${deployment.hostname}): release ${release.version}, ${files.length} JS/CSS assets, ${routes.length} deep links, API ${process.env.PUBLIC_API_URL}`);
