import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const patchFile = path.join(__dirname, 'cloudflare-next-on-pages-spawn-patch.cjs');

if (process.platform === 'win32') {
  const gitBashBin = 'C:\\Program Files\\Git\\bin';
  if (!process.env.PATH?.includes(gitBashBin)) {
    process.env.PATH = `${gitBashBin};${process.env.PATH ?? ''}`;
  }
}

const preload = `--require=${patchFile}`;
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS
  ? `${process.env.NODE_OPTIONS} ${preload}`
  : preload;

await import('../node_modules/@cloudflare/next-on-pages/bin/index.js');
