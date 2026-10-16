// Stand des Server-Codes: Pruefsumme ueber Groesse und Aenderungszeit aller Dateien in server/ und shared/.
// Damit erkennt ein neu gestarteter Server (und das Startskript), dass noch ein alter Server mit veraltetem
// Code laeuft, z. B. nach einem Update, und ersetzt ihn.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function codeVersion() {
  const h = crypto.createHash('sha1');
  const walk = (dir) => {
    let list;
    try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of list.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|json)$/.test(e.name)) { const st = fs.statSync(p); h.update(`${path.relative(ROOT, p)}:${st.size}:${Math.floor(st.mtimeMs)}\n`); }
    }
  };
  walk(path.join(ROOT, 'server'));
  walk(path.join(ROOT, 'shared'));
  return h.digest('hex').slice(0, 12);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(codeVersion());
