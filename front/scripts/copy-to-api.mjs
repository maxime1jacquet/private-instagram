import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';

const source = fileURLToPath(new URL('../dist/front/browser/', import.meta.url));
const target = fileURLToPath(new URL('../../api/pb_public/', import.meta.url));
await access(source + '/index.html');
await mkdir(target, { recursive: true });
// pb_public is generated output; author assets under front/public.
for (const entry of await readdir(target)) {
  if (entry !== '.gitkeep') await rm(target + '/' + entry, { recursive: true, force: true });
}
await cp(source, target, { recursive: true });
console.log('Build Angular copié dans api/pb_public.');
