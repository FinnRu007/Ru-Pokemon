// Laedt die Pokemon-Sprites aus Platin (Vorder- und Rueckansicht, normal und schillernd)
// aus dem Projekt PokeAPI/sprites nach client/sprites/. Der Ordner ist gitignored: Die Bilder gehoeren
// Nintendo und werden nicht mit dem Code verteilt. Fehlen sie, zeichnet der Client die eigene Pixelgrafik.
// Aufruf: npm run sprites   (bereits vorhandene Dateien werden uebersprungen)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'client', 'sprites');
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const MAX_ID = 493;
const KINDS = {
  front: 'versions/generation-iv/platinum',
  back: 'versions/generation-iv/platinum/back',
  'front-shiny': 'versions/generation-iv/platinum/shiny',
  'back-shiny': 'versions/generation-iv/platinum/back/shiny'
};

// Hinter einem Proxy (HTTPS_PROXY) kann fetch von Node nicht direkt raus, dann hilft curl.
const useCurl = !!(process.env.HTTPS_PROXY || process.env.https_proxy);
async function download(url) {
  if (useCurl) {
    try { return execFileSync('curl', ['-sSfL', '--retry', '2', url], { maxBuffer: 1 << 22 }); } catch { return null; }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch { /* erneut versuchen */ }
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  return null;
}

const jobs = [];
for (const [kind, dir] of Object.entries(KINDS)) {
  fs.mkdirSync(path.join(OUT, kind), { recursive: true });
  for (let id = 1; id <= MAX_ID; id++) jobs.push({ kind, id, url: `${BASE}/${dir}/${id}.png`, file: path.join(OUT, kind, `${id}.png`) });
}

let done = 0, loaded = 0, failed = 0;
async function worker() {
  while (jobs.length) {
    const job = jobs.shift();
    if (!fs.existsSync(job.file)) {
      const data = await download(job.url);
      if (data && data.length) { fs.writeFileSync(job.file, data); loaded++; } else failed++;
    }
    if (++done % 250 === 0) process.stdout.write(`\r${done} / ${MAX_ID * Object.keys(KINDS).length} Bilder`);
  }
}
console.log('Lade Pokemon-Sprites aus github.com/PokeAPI/sprites ...');
await Promise.all(Array.from({ length: useCurl ? 8 : 24 }, worker));

// Verzeichnis, welche Bilder vorhanden sind (der Client fragt nur diese Datei ab)
const index = { source: 'https://github.com/PokeAPI/sprites', kinds: {} };
for (const kind of Object.keys(KINDS)) {
  index.kinds[kind] = fs.readdirSync(path.join(OUT, kind)).filter((f) => f.endsWith('.png')).map((f) => +f.slice(0, -4)).sort((a, b) => a - b);
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
console.log(`\nFertig: ${loaded} neu geladen, ${failed} nicht gefunden. Ordner: client/sprites/`);
for (const [k, ids] of Object.entries(index.kinds)) console.log(`  ${k}: ${ids.length}`);
