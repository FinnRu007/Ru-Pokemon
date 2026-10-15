import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  dataDir: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data'),
  // POKEAPI=1 laedt beim Start fehlende Daten live von pokeapi.co (mit Cache in shared/data/generated).
  pokeapi: process.env.POKEAPI === '1'
};
