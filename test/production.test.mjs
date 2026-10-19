import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, link, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { assets, projectRoot } from '../scripts/lib/static.mjs';
import { assertConfig, buildProduction, checkProduction, effectiveHeaders, expectedConfig, makeProduction, origin, pages, parseHeaders, parseRobots, pinnedPreview, productionAssets, productionInventory, robotsAllows, validateSemantics, visibleFAQ } from '../scripts/lib/production.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(projectRoot, 'test/.production-check-'));
  assert.equal(path.dirname(await realpath(root)).toLowerCase(), path.join(projectRoot, 'test').toLowerCase());
  t.after(async () => { assert.equal(path.dirname(await realpath(root)).toLowerCase(), path.join(projectRoot, 'test').toLowerCase()); await rm(root, { recursive: true }); });
  for (const file of [...assets.map(file => `public/${file}`), 'config/preview-integrity.json', 'wrangler.jsonc', 'package.json', 'scripts/lib/static.mjs', 'scripts/lib/production.mjs', 'scripts/build-production.mjs', 'scripts/check-production.mjs']) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await copyFile(path.join(projectRoot, file), path.join(root, file));
  }
  return root;
}

test('M2: exact user-approved static-only configuration, no extra authority', async () => {
  const config = JSON.parse(await readFile(path.join(projectRoot, 'wrangler.jsonc'), 'utf8')); assertConfig(config);
  assert.deepEqual(Object.keys(config).sort(), ['name', 'compatibility_date', 'workers_dev', 'preview_urls', 'send_metrics', 'routes', 'observability', 'assets'].sort());
  for (const mutate of [c => { c.main = 'worker.mjs'; }, c => { c.observability.logs.invocation_logs = true; }, c => { c.assets.run_worker_first = true; }, c => { c.assets.html_handling = 'auto-trailing-slash'; }, c => { c.routes[0].pattern = '040141.xyz'; }, c => { c.build = { command: 'anything' }; }]) { const changed = structuredClone(config); mutate(changed); assert.throws(() => assertConfig(changed)); }
});
test('M2: every M1 public byte remains pinned', async () => { const pinned = await pinnedPreview(); assert.equal(pinned.size, 10); assert.deepEqual([...pinned.keys()].sort(), [...assets].sort()); });
test('M2: production changes only HTML head metadata; runtime assets and page bodies are exact', async () => {
  const preview = await pinnedPreview(); const production = makeProduction(preview); assert.equal(production.records.size, 15);
  for (const file of assets) if (!file.endsWith('.html')) assert.deepEqual(production.records.get(file), preview.get(file));
  for (const page of pages) {
    const before = preview.get(page.file).toString(), after = production.records.get(page.file).toString();
    assert.equal(after.slice(after.indexOf('</head>')), before.slice(before.indexOf('</head>')));
    assert.ok(after.includes(`<link rel="canonical" href="https://tiles.glossquote.com/${page.file}">`));
    for (const [lang, file] of [['zh-Hant', 'index.html'], ['en', 'en/index.html'], ['x-default', 'index.html']]) assert.ok(after.includes(`hreflang="${lang}" href="https://tiles.glossquote.com/${file}"`));
    assert.ok(before.includes('content="noindex,nofollow"')); assert.ok(after.includes('content="index,follow"'));
  }
});
test('M2: visible bilingual FAQ exactly matches JSON-LD, with only precise CSP hashes', async () => {
  const production = makeProduction(await pinnedPreview());
  const hashes = [];
  for (const page of pages) {
    const html = production.records.get(page.file).toString(); const body = /<script type="application\/ld\+json">([^]*?)<\/script>/.exec(html)[1];
    const graph = JSON.parse(body); assert.equal(graph[0]['@type'], 'WebApplication'); assert.equal(graph[0].url, `${origin}/${page.file}`); assert.equal(graph[0].inLanguage, page.language);
    assert.deepEqual(graph[1].mainEntity.map(q => ({ question: q.name, answer: q.acceptedAnswer.text })), visibleFAQ(html));
    assert.equal(graph[1].mainEntity.length, 4); hashes.push(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
    assert.equal(html.match(/<script /g).length, 2);
  }
  assert.deepEqual(production.policy.match(/'sha256-[A-Za-z0-9+/=]+'/g), hashes); assert.doesNotMatch(production.policy, /unsafe-inline|unsafe-eval/);
});
test('M2: overlapping header rules remove noindex for only the two indexed HTML files', async () => {
  const p = makeProduction(await pinnedPreview()); const rules = parseHeaders(p.records.get('_headers').toString());
  for (const pathname of ['/index.html', '/en/index.html']) { const merged = effectiveHeaders(rules, pathname); assert.equal(merged['x-robots-tag'], undefined); assert.equal(merged['content-security-policy'], p.policy); }
  for (const pathname of ['/404.html', '/missing', '/en/missing', '/js/app.mjs']) assert.equal(effectiveHeaders(rules, pathname)['x-robots-tag'], 'noindex, nofollow');
  const bad = new Map(p.records); bad.set('_headers', Buffer.from(p.records.get('_headers').toString().replaceAll('! X-Robots-Tag', 'X-Robots-Tag: index, follow'))); assert.throws(() => validateSemantics(bad, p.policy));
  assert.equal(effectiveHeaders(parseHeaders('/*\n  X-Test: one\n/index.html\n  X-Test: two\n'), '/index.html')['x-test'], 'one, two');
});
test('M2: robots uses longest match, anchors and allow-on-tie; all required resources are crawlable', async () => {
  const p = makeProduction(await pinnedPreview()); const rules = parseRobots(p.records.get('robots.txt').toString());
  for (const file of [...assets, 'robots.txt', 'sitemap.xml']) assert.equal(robotsAllows(rules, `/${file}`), true, file);
  for (const pathname of ['/missing', '/404.html', '/package.json', '/index.html/secret', '/en/index.html/secret']) assert.equal(robotsAllows(rules, pathname), false, pathname);
  assert.equal(robotsAllows(parseRobots('User-agent: *\nDisallow: /\nAllow: /js/\nDisallow: /js/core/\n'), '/js/core/schema.mjs'), false);
  assert.equal(robotsAllows(parseRobots('User-agent: *\nDisallow: /js/\nAllow: /js/\n'), '/js/app.mjs'), true);
  const bad = new Map(p.records); bad.set('robots.txt', Buffer.from(p.records.get('robots.txt').toString() + 'Disallow: /js/core/\n')); assert.throws(() => validateSemantics(bad, p.policy));
});
test('M2: sitemap contains exactly two canonical URLs; aliases are explicit same-origin 302 rules', async () => {
  const p = makeProduction(await pinnedPreview());
  assert.deepEqual([...p.records.get('sitemap.xml').toString().matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]), ['https://tiles.glossquote.com/index.html', 'https://tiles.glossquote.com/en/index.html']);
  assert.equal(p.records.get('_redirects').toString(), '/ /index.html 302\n/en/ /en/index.html 302\n');
  const bad = new Map(p.records); bad.set('sitemap.xml', Buffer.from(p.records.get('sitemap.xml').toString().replace('</urlset>', '<url><loc>https://example.invalid/</loc></url></urlset>'))); assert.throws(() => validateSemantics(bad, p.policy));
});
test('M2: changed JSON-LD bytes or CSP permissions cannot pass semantic checks', async () => {
  const p = makeProduction(await pinnedPreview()); const bad = new Map(p.records); bad.set('index.html', Buffer.from(p.records.get('index.html').toString().replace('UtilitiesApplication', 'DifferentApplication'))); assert.throws(() => validateSemantics(bad, p.policy));
  assert.throws(() => validateSemantics(p.records, p.policy + " 'sha256-YWJjZA=='"));
});
test('M2: 404 is a bilingual noindex static document with no application script or form', async () => {
  const p = makeProduction(await pinnedPreview()); const html = p.records.get('404.html').toString(); assert.match(html, /noindex,nofollow/); assert.match(html, /Page not found/); assert.match(html, /找不到頁面/); assert.doesNotMatch(html, /<script|<form|rel="canonical"/);
});
test('M2: deterministic build emits a closed set and an outside-assets manifest', async t => {
  const root = await fixture(t); const before = await readFile(path.join(root, 'public/index.html')); const first = await buildProduction(root); const second = await buildProduction(root); assert.deepEqual(first, second);
  assert.deepEqual(await productionInventory(path.join(root, 'dist-production')), productionAssets); assert.equal(first.files.length, 15); assert.equal(first.files.filter(f => f.role === 'cloudflare-control').length, 2);
  await assert.rejects(lstat(path.join(root, 'dist-production/production-manifest.json'))); assert.deepEqual(await readFile(path.join(root, 'public/index.html')), before); await checkProduction(root);
});
test('M2: preview pin rejects even a harmless extra byte, without editing source to build', async t => {
  const root = await fixture(t); await writeFile(path.join(root, 'public/js/app.mjs'), (await readFile(path.join(root, 'public/js/app.mjs'))).toString() + ' '); await assert.rejects(buildProduction(root), /M1 public bytes changed/);
});
test('M2: check rejects stale output bytes and a tampered outside manifest', async t => {
  const root = await fixture(t); await buildProduction(root); await writeFile(path.join(root, 'dist-production/styles/app.css'), 'fake changed css'); await assert.rejects(checkProduction(root), /Stale or modified/);
  await buildProduction(root); const file = path.join(root, 'release/production-manifest.json'); const manifest = JSON.parse(await readFile(file)); manifest.files[0].bytes += 1; await writeFile(file, JSON.stringify(manifest)); await assert.rejects(checkProduction(root), /manifest mismatch/);
});
test('M2: unknown/stale files, hardlinks and junctions are rejected; CLI exits nonzero', async t => {
  const root = await fixture(t); await buildProduction(root); const output = path.join(root, 'dist-production');
  const unknown = path.join(output, 'fake-private.txt'); await writeFile(unknown, 'FAKE_PRIVATE_CANARY'); await assert.rejects(buildProduction(root));
  const failed = spawnSync(process.execPath, ['scripts/check-production.mjs'], { cwd: root, encoding: 'utf8' }); assert.equal(failed.status, 1); assert.ok(!`${failed.stdout}${failed.stderr}`.includes('FAKE_PRIVATE_CANARY')); await unlink(unknown);
  const target = path.join(output, 'index.html'); const alias = path.join(root, 'hardlink.html'); await link(target, alias); await assert.rejects(productionInventory(output)); await unlink(alias);
  await mkdir(path.join(root, 'target')); await symlink(path.join(root, 'target'), path.join(output, 'linked-directory'), 'junction'); await assert.rejects(productionInventory(output)); await unlink(path.join(output, 'linked-directory'));
  await buildProduction(root); await unlink(path.join(output, 'en/index.html')); await assert.rejects(checkProduction(root));
});
