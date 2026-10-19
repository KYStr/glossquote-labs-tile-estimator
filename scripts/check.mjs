import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectRoot, publicRoot, validateStatic } from './lib/static.mjs';

try {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node 24 required');
  const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
  if (manifest.private !== true || manifest.type !== 'module' || manifest.engines?.node !== '>=24' || ['dependencies', 'devDependencies', 'optionalDependencies'].some(key => Object.keys(manifest[key] ?? {}).length)) throw new Error('Package contract failed');
  const files = await validateStatic(publicRoot);
  for (const file of files.filter(file => file.endsWith('.mjs'))) {
    if (spawnSync(process.execPath, ['--check', path.join(publicRoot, file)], { stdio: 'pipe' }).status !== 0) throw new Error('Module syntax failed');
  }
  console.log(`PASS preview source: ${files.length} allowlisted assets; zero external dependencies`);
} catch {
  console.error('FAIL preview source contract');
  process.exitCode = 1;
}
