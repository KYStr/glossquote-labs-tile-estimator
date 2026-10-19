import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm, unlink, link, symlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assets, projectRoot, publicRoot, inventory, validateHtml, validateModule, validateStatic } from '../scripts/lib/static.mjs';

test('static: preview pages, accessibility references, selector parity and local module closure', async () => {
  assert.deepEqual(await validateStatic(publicRoot), [...assets].sort());
  const pages = await Promise.all(['index.html', 'en/index.html'].map(file => readFile(path.join(publicRoot, file), 'utf8')));
  const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]).sort();
  assert.deepEqual(ids(pages[0]), ids(pages[1]));
  const app = await readFile(path.join(publicRoot, 'js/app.mjs'), 'utf8');
  for (const [, id] of app.matchAll(/\bget\('([^']+)'\)/g)) assert.ok(ids(pages[0]).includes(id), id);
  assert.ok(app.indexOf("form.addEventListener('submit'") < app.indexOf('const fields'));
  assert.match(app, /event\.preventDefault\(\);\s*if \(!ready/);
  assert.ok(app.indexOf('ready = true') > app.indexOf("window.addEventListener('pageshow'"));
  assert.ok(!app.includes('setTimeout'));
});
test('static: reject external/inline resources, indexing metadata and enabled initial controls', async () => {
  const original = await readFile(path.join(publicRoot, 'index.html'), 'utf8');
  const variants = [
    original.replace('/js/app.mjs', 'https://glossquote.com/index.html'),
    original.replace('/styles/app.css', '//example.invalid/style.css'),
    original.replace('noindex,nofollow', 'index,follow'),
    original.replace('id="calculate" class="primary" type="submit" disabled', 'id="calculate" class="primary" type="submit"'),
    original.replace('<fieldset disabled>', '<fieldset>'),
    original.replace('readonly rows=', 'rows='),
    original.replace('</head>', '<script>alert(1)</script></head>'),
    original.replace('</head>', '<link rel="canonical" href="https://example.invalid/"></head>'),
    original.replace('id="boxPiecesRaw"', 'id="tileLengthCmRaw"'),
    original.replace('aria-describedby="report-help"', 'aria-describedby="missing"'),
    original.replace('type="text"', 'name="fake-secret" type="text"'),
  ];
  for (const html of variants) assert.throws(() => validateHtml(html, 'zh-Hant'));
});
test('static: reject storage/network/file/unsafe DOM capabilities and nonlocal imports', () => {
  for (const source of ['fetch("/api")', 'localStorage.setItem("x", "y")', 'node.innerHTML = value', 'navigator.clipboard.writeText(value)', 'new Blob([])', 'document.cookie', 'import "external-package";', 'import { x } from "../../unapproved.mjs";', 'import { x } from "external-package";', 'eval(value)', 'new Function(value)', 'window.confirm(value)']) assert.throws(() => validateModule(source, 'js/app.mjs'));
});
test('toolchain: real disposable copies fail closed on unknown/missing/linked assets and stale output', async t => {
  const fixture = await mkdtemp(path.join(projectRoot, 'test/.static-check-'));
  const checkedRoot = await realpath(fixture);
  assert.equal(path.dirname(checkedRoot).toLowerCase(), path.join(projectRoot, 'test').toLowerCase());
  assert.match(path.basename(checkedRoot), /^\.static-check-/);
  t.after(async () => {
    if (path.dirname(await realpath(fixture)).toLowerCase() !== path.join(projectRoot, 'test').toLowerCase()) throw new Error('Refusing unsafe fixture cleanup');
    await rm(fixture, { recursive: true });
  });
  const copy = async (from, to) => { await mkdir(path.dirname(to), { recursive: true }); await copyFile(from, to); };
  for (const file of assets) await copy(path.join(publicRoot, file), path.join(fixture, 'public', file));
  for (const file of ['package.json', 'scripts/check.mjs', 'scripts/build.mjs', 'scripts/lib/static.mjs']) await copy(path.join(projectRoot, file), path.join(fixture, file));
  const run = script => spawnSync(process.execPath, [`scripts/${script}.mjs`], { cwd: fixture, encoding: 'utf8' });
  assert.equal(run('check').status, 0); assert.equal(run('build').status, 0);
  const unknown = path.join(fixture, 'public/fake-secret.txt');
  await writeFile(unknown, 'FAKE_PRIVATE_CANARY');
  for (const script of ['check', 'build']) { const output = run(script); assert.equal(output.status, 1); assert.ok(!`${output.stdout}${output.stderr}`.includes('FAKE_PRIVATE_CANARY')); }
  await unlink(unknown);
  const missing = path.join(fixture, 'public/en/index.html'); await unlink(missing); await assert.rejects(validateStatic(path.join(fixture, 'public')));
  await copy(path.join(publicRoot, 'en/index.html'), missing);
  const hardlink = path.join(fixture, 'linked.html'); await link(missing, hardlink); await assert.rejects(inventory(path.join(fixture, 'public'))); await unlink(hardlink);
  await mkdir(path.join(fixture, 'target')); await symlink(path.join(fixture, 'target'), path.join(fixture, 'public/linked-directory'), 'junction');
  await assert.rejects(inventory(path.join(fixture, 'public'))); await unlink(path.join(fixture, 'public/linked-directory'));
  await writeFile(path.join(fixture, 'dist/stale.txt'), 'fake stale output'); assert.equal(run('build').status, 1);
  await unlink(path.join(fixture, 'dist/stale.txt'));
  assert.equal(run('build').status, 0); assert.deepEqual(await validateStatic(path.join(fixture, 'dist')), [...assets].sort());
  for (const file of assets) assert.deepEqual(await readFile(path.join(fixture, 'dist', file)), await readFile(path.join(publicRoot, file)));
});
