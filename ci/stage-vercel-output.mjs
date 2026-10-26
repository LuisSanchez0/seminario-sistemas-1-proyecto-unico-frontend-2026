import fs from 'node:fs';
import path from 'node:path';
// Package the already-tested Angular build in Vercel Build Output API v3 format: Vercel serves it, never rebuilds it.
const source = 'dist/luminabeauty-app/browser';
const output = '.vercel/output';
const api = new URL(process.env.PUBLIC_API_URL || '');
if (api.protocol !== 'https:' || !api.pathname.endsWith('/api')) throw new Error('Production PUBLIC_API_URL must be https://<backend-domain>/api');
// No mixed content: the compiled bundle must call the HTTPS API and nothing else.
const scripts = fs.readdirSync(source).filter(file => file.endsWith('.js')).map(file => fs.readFileSync(path.join(source, file), 'utf8'));
if (!scripts.some(code => code.includes(JSON.stringify(api.href.replace(/\/$/, ''))))) throw new Error('Bundle was not compiled with PUBLIC_API_URL');
for (const insecure of ['http://localhost:8080/api', `http://${api.host}`]) {
  if (scripts.some(code => code.includes(insecure))) throw new Error(`Bundle references insecure API ${insecure}`);
}
const hashedAsset = '^/(?:main|polyfills|styles|chunk)-[A-Z0-9]{8}\\.(?:js|css)$';
// Paths with a static-file extension never fall back to index.html, so a stale chunk 404s instead of returning HTML.
const spaRoute = '^/(?!.*\\.(?:js|mjs|css|map|json|txt|xml|ico|png|jpe?g|gif|svg|webp|avif|woff2?)$).*$';
const config = {
  version: 3,
  routes: [
    { src: hashedAsset, headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
    { src: '^/release\\.json$', headers: { 'cache-control': 'no-store' }, continue: true },
    { handle: 'filesystem' },
    // Angular SPA deep links (/auth/restore, /admin/..., /my-orders/...) load the app shell.
    { src: spaRoute, dest: '/index.html', headers: { 'cache-control': 'no-cache' } },
  ],
};
fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(source, path.join(output, 'static'), { recursive: true });
fs.writeFileSync(path.join(output, 'config.json'), JSON.stringify(config, null, 2));
console.log(`Staged ${source} for a prebuilt Vercel deployment targeting ${api.href}`);
