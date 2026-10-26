import fs from 'node:fs';
import path from 'node:path';
const directory = 'dist/luminabeauty-app/browser';
const index = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
if (!index.includes('<app-root')) throw new Error('Angular index missing');
const files = [...index.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)].map(match => match[1]);
if (!files.some(file => file.endsWith('.js'))) throw new Error('No JavaScript entrypoint');
for (const file of files) if (!fs.statSync(path.join(directory, file)).size) throw new Error(`Missing asset: ${file}`);
if (process.env.GIT_COMMIT) {
  if (!/^[a-f0-9]{40}$/.test(process.env.GIT_COMMIT)) throw new Error('Invalid revision');
  fs.writeFileSync(path.join(directory, 'release.json'), JSON.stringify({ version: process.env.GIT_COMMIT }));
}
console.log(`Verified ${directory}/index.html and ${files.length} referenced assets`);
