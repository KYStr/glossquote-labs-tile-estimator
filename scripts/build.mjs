import { copyFile, mkdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { publicRoot, distRoot, inventory, validateStatic } from './lib/static.mjs';

try {
  const files = await validateStatic(publicRoot);
  try { await lstat(distRoot); await inventory(distRoot, { complete: false }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(distRoot, { recursive: true });
  for (const file of files) {
    await mkdir(path.dirname(path.join(distRoot, file)), { recursive: true });
    await copyFile(path.join(publicRoot, file), path.join(distRoot, file));
  }
  await validateStatic(distRoot);
  console.log(`PASS preview build: ${files.length} static files in dist; noindex,nofollow`);
} catch {
  console.error('FAIL preview build contract');
  process.exitCode = 1;
}
