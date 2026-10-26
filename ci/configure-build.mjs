import fs from 'node:fs';
const value = process.env.PUBLIC_API_URL || '/api';
if (value !== '/api') {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/api')) {
    throw new Error('PUBLIC_API_URL must be an HTTP(S) API URL ending in /api, without credentials/query/hash');
  }
}
// Preserve existing public payment configuration. Never import backend secrets into the build.
const source = fs.readFileSync('src/environments/environment.ts', 'utf8');
if (!/baseUrl:\s*['"][^'"]*['"]/.test(source)) throw new Error('Environment baseUrl not found');
fs.writeFileSync('src/environments/environment.production.ts', source.replace(/baseUrl:\s*['"][^'"]*['"]/, `baseUrl: ${JSON.stringify(value)}`));
