// Prueft beim Start, ob die Originalgrafik (npm run sprites) zum Code passt, und baut sie sonst nach.
// Nur wenn sie schon einmal geladen wurde: Wer ohne Originalgrafik spielt, bekommt nichts heruntergeladen.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './config.js';
import { SPRITES_BUILD } from '../scripts/spritesBuild.js';

export function ensureSprites() {
  const file = path.join(ROOT, 'client', 'sprites', 'index.json');
  let build = null;
  try { build = JSON.parse(fs.readFileSync(file, 'utf8')).build ?? 0; } catch { return; }
  if (build === SPRITES_BUILD || process.env.SKIP_SPRITES === '1') return;
  console.log('Originalgrafik ist aelter als der Code, sie wird jetzt aktualisiert (einmalig, dauert etwas) ...');
  const r = spawnSync(process.execPath, ['--no-warnings', path.join(ROOT, 'scripts', 'fetch-sprites.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) console.log('Aktualisierung der Originalgrafik fehlgeschlagen, das Spiel startet mit dem alten Stand.');
}
