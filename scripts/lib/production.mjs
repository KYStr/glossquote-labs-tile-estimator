import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { assets, csp, pageContracts, projectRoot, validateStatic } from './static.mjs';

export const origin = 'https://tiles.glossquote.com';
export const sourceCandidate = 'ce30daabd509d3919d45dba29ce20f5802dedf9d55f375c9835535a63cd68f68';
export const productionAssets = Object.freeze([...assets, '404.html', '_headers', '_redirects', 'robots.txt', 'sitemap.xml'].sort());
export const pages = Object.freeze([{ language: 'zh-Hant', file: 'index.html' }, { language: 'en', file: 'en/index.html' }]);
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const expectedConfig = Object.freeze({
  name: 'glossquote-tile-estimator', compatibility_date: '2026-10-19', workers_dev: false, preview_urls: false, send_metrics: false,
  routes: [{ pattern: 'tiles.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  assets: { directory: './dist-production', run_worker_first: false, html_handling: 'none', not_found_handling: '404-page' },
});

export function assertConfig(value) {
  if (!isDeepStrictEqual(value, expectedConfig)) throw new Error('Unexpected static-only Wrangler configuration');
}
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));

export async function regularDirectory(root) {
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink() || path.resolve(await realpath(root)).toLowerCase() !== path.resolve(root).toLowerCase()) throw new Error('Unsafe production directory');
}

export async function productionInventory(root, complete = true) {
  await regularDirectory(root);
  const directories = new Set(productionAssets.flatMap(file => {
    const parts = file.split('/');
    return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
  }));
  const found = [];
  async function visit(relative = '') {
    for (const name of await readdir(path.join(root, relative))) {
      const file = relative ? `${relative}/${name}` : name;
      const stat = await lstat(path.join(root, file));
      if (stat.isSymbolicLink()) throw new Error('Linked production path');
      if (stat.isDirectory() && directories.has(file)) await visit(file);
      else if (stat.isFile() && stat.nlink === 1 && stat.size <= 262144 && productionAssets.includes(file)) found.push(file);
      else throw new Error('Unapproved production path');
    }
  }
  await visit(); found.sort();
  if (complete && !isDeepStrictEqual(found, productionAssets)) throw new Error('Incomplete production asset set');
  return found;
}

export async function pinnedPreview(root = projectRoot) {
  await validateStatic(path.join(root, 'public'));
  const pinned = await readJson(path.join(root, 'config/preview-integrity.json'));
  if (pinned.schemaVersion !== 1 || pinned.sourceCandidate !== sourceCandidate || !Array.isArray(pinned.files) || pinned.files.length !== assets.length) throw new Error('Unexpected preview pin');
  const records = new Map();
  for (const file of assets) {
    const expected = pinned.files.find(entry => entry.path === `public/${file}`);
    const bytes = await readFile(path.join(root, 'public', file));
    if (!expected || expected.bytes !== bytes.length || expected.sha256 !== hash(bytes)) throw new Error('M1 public bytes changed');
    records.set(file, bytes);
  }
  return records;
}

export function visibleFAQ(html) {
  const questions = [...html.matchAll(/<h4>([^<]+)<\/h4><p>([^<]+)<\/p>/g)].map(match => ({ question: match[1], answer: match[2] }));
  if (questions.length !== 4) throw new Error('Visible FAQ contract changed');
  return questions;
}

function structuredData(html, language, file) {
  const contract = pageContracts[language];
  return JSON.stringify([
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: contract.heading, url: `${origin}/${file}`, inLanguage: language, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web browser', isAccessibleForFree: true, description: contract.description },
    { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: language, mainEntity: visibleFAQ(html).map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) },
  ]).replaceAll('<', '\\u003c');
}
const inlineHash = text => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
const replaceOnce = (text, target, value) => {
  if (text.split(target).length !== 2) throw new Error('Unexpected preview template');
  return text.replace(target, value);
};

export function makeProduction(preview) {
  const records = new Map(preview);
  const data = new Map(pages.map(page => [page.file, structuredData(preview.get(page.file).toString('utf8'), page.language, page.file)]));
  // One shared HTTP policy permits only the two exact site-authored data blocks.
  const policy = csp.replace("script-src 'self'", `script-src 'self' ${pages.map(page => inlineHash(data.get(page.file))).join(' ')}`);
  const metaPolicy = policy.replace("; frame-ancestors 'none'", '');
  for (const page of pages) {
    let html = preview.get(page.file).toString('utf8');
    html = replaceOnce(html, '<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">');
    html = replaceOnce(html, csp.replace("; frame-ancestors 'none'", ''), metaPolicy);
    const metadata = [
      `  <link rel="canonical" href="${origin}/${page.file}">`,
      `  <link rel="alternate" hreflang="zh-Hant" href="${origin}/index.html">`,
      `  <link rel="alternate" hreflang="en" href="${origin}/en/index.html">`,
      `  <link rel="alternate" hreflang="x-default" href="${origin}/index.html">`,
      `  <script type="application/ld+json">${data.get(page.file)}</script>`,
    ].join('\n');
    html = replaceOnce(html, '</head>', `${metadata}\n</head>`);
    records.set(page.file, Buffer.from(html, 'utf8'));
  }
  records.set('404.html', Buffer.from(`<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${metaPolicy}"><title>找不到頁面 / Page not found | Gloss Tools</title><link rel="stylesheet" href="/styles/app.css"></head><body><main><h1>找不到頁面</h1><p lang="en">Page not found.</p><p><a href="/index.html">返回鋪材用量試算</a></p><p lang="en"><a href="/en/index.html">Open the Tile and Panel Usage Estimator</a></p></main></body></html>\n`, 'utf8'));
  records.set('_headers', Buffer.from(`/*\n  Content-Security-Policy: ${policy}\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  Cache-Control: no-store\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  X-Robots-Tag: noindex, nofollow\n/index.html\n  ! X-Robots-Tag\n/en/index.html\n  ! X-Robots-Tag\n`, 'utf8'));
  records.set('_redirects', Buffer.from('/ /index.html 302\n/en/ /en/index.html 302\n', 'utf8'));
  records.set('robots.txt', Buffer.from(`User-agent: *\nDisallow: /\nAllow: /$\nAllow: /en/$\nAllow: /index.html$\nAllow: /en/index.html$\nAllow: /js/\nAllow: /styles/\nAllow: /robots.txt$\nAllow: /sitemap.xml$\nSitemap: ${origin}/sitemap.xml\n`, 'utf8'));
  records.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${origin}/index.html</loc></url>\n  <url><loc>${origin}/en/index.html</loc></url>\n</urlset>\n`, 'utf8'));
  return { records, policy, data };
}

export function parseHeaders(text) {
  const rules = []; let rule;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      if (!/^\/(?:[A-Za-z0-9_./-]*\*?)$/.test(line)) throw new Error('Unsupported header pattern');
      rule = { pattern: line, set: [], unset: [] }; rules.push(rule);
    } else {
      if (!rule) throw new Error('Header has no rule');
      const value = line.trim();
      if (value.startsWith('! ')) rule.unset.push(value.slice(2).toLowerCase());
      else {
        const match = /^([A-Za-z0-9-]+): ([^\r\n]+)$/.exec(value);
        if (!match) throw new Error('Invalid header');
        rule.set.push([match[1].toLowerCase(), match[2]]);
      }
    }
  }
  return rules;
}
const pathMatches = (pattern, pathname) => pattern.endsWith('*') ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern;
export function effectiveHeaders(rules, pathname) {
  const headers = {};
  for (const rule of rules) if (pathMatches(rule.pattern, pathname)) {
    for (const name of rule.unset) delete headers[name];
    for (const [name, value] of rule.set) headers[name] = headers[name] ? `${headers[name]}, ${value}` : value;
  }
  return headers;
}

export function parseRobots(text) {
  const rules = []; let applies = false;
  for (const raw of text.split('\n')) {
    const line = raw.split('#')[0].trim(); if (!line) continue;
    const match = /^([^:]+):\s*(.*)$/.exec(line); if (!match) throw new Error('Invalid robots rule');
    const key = match[1].toLowerCase(), value = match[2];
    if (key === 'user-agent') applies = value === '*';
    else if (applies && ['allow', 'disallow'].includes(key) && value) rules.push({ allow: key === 'allow', pattern: value });
  }
  return rules;
}
export function robotsAllows(rules, pathname) {
  let selected = null;
  for (const rule of rules) {
    const anchored = rule.pattern.endsWith('$');
    const pattern = anchored ? rule.pattern.slice(0, -1) : rule.pattern;
    const escaped = pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    if (!new RegExp(`^${escaped}${anchored ? '$' : ''}`).test(pathname)) continue;
    const weight = Buffer.byteLength(pattern.replaceAll('*', ''), 'utf8');
    if (!selected || weight > selected.weight || (weight === selected.weight && rule.allow)) selected = { weight, allow: rule.allow };
  }
  return selected?.allow ?? true;
}

export function validateSemantics(records, policy) {
  const headers = parseHeaders(records.get('_headers').toString('utf8'));
  const robots = parseRobots(records.get('robots.txt').toString('utf8'));
  for (const file of [...assets, 'robots.txt', 'sitemap.xml']) {
    if (!robotsAllows(robots, `/${file}`)) throw new Error('Crawler cannot load a required asset');
  }
  for (const pathname of ['/404.html', '/package.json', '/scripts/check.mjs', '/.git/config', '/missing']) if (robotsAllows(robots, pathname)) throw new Error('Unexpected crawl permission');
  for (const page of pages) {
    const html = records.get(page.file).toString('utf8');
    const effective = effectiveHeaders(headers, `/${page.file}`);
    if (effective['x-robots-tag'] !== undefined || !html.includes('<meta name="robots" content="index,follow">') || effective['content-security-policy'] !== policy) throw new Error('Production page header conflict');
    const script = /<script type="application\/ld\+json">([^]*?)<\/script>/.exec(html)?.[1];
    if (!script || !policy.includes(inlineHash(script))) throw new Error('JSON-LD CSP mismatch');
    const parsed = JSON.parse(script);
    if (parsed.length !== 2 || parsed[0]['@type'] !== 'WebApplication' || parsed[1]['@type'] !== 'FAQPage' || !isDeepStrictEqual(parsed[1].mainEntity.map(item => ({ question: item.name, answer: item.acceptedAnswer.text })), visibleFAQ(html))) throw new Error('Structured data differs from visible FAQ');
    for (const [language, destination] of [['zh-Hant', 'index.html'], ['en', 'en/index.html'], ['x-default', 'index.html']]) if (!html.includes(`<link rel="alternate" hreflang="${language}" href="${origin}/${destination}">`)) throw new Error('Missing reciprocal language metadata');
    if (!html.includes(`<link rel="canonical" href="${origin}/${page.file}">`)) throw new Error('Non-self canonical');
  }
  for (const pathname of ['/404.html', '/missing', '/en/missing', '/_headers', '/_redirects']) if (effectiveHeaders(headers, pathname)['x-robots-tag'] !== 'noindex, nofollow') throw new Error('404 can be indexed');
  const sitemap = [...records.get('sitemap.xml').toString('utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  if (!isDeepStrictEqual(sitemap, pages.map(page => `${origin}/${page.file}`))) throw new Error('Sitemap must contain exactly both language entries');
  const hashes = policy.match(/'sha256-[A-Za-z0-9+/=]+'/g) ?? [];
  const expected = pages.map(page => inlineHash(/<script type="application\/ld\+json">([^]*?)<\/script>/.exec(records.get(page.file).toString('utf8'))[1]));
  if (!isDeepStrictEqual(hashes, expected) || /unsafe-inline|unsafe-eval/.test(policy)) throw new Error('Unexpected inline capability');
  return { headers, robots };
}

export async function buildProduction(root = projectRoot) {
  assertConfig(await readJson(path.join(root, 'wrangler.jsonc')));
  const expected = makeProduction(await pinnedPreview(root));
  validateSemantics(expected.records, expected.policy);
  const destination = path.join(root, 'dist-production');
  try { await lstat(destination); await productionInventory(destination, false); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(destination, { recursive: true });
  for (const [file, bytes] of expected.records) { await mkdir(path.dirname(path.join(destination, file)), { recursive: true }); await writeFile(path.join(destination, file), bytes); }
  await productionInventory(destination);
  const manifestRoot = path.join(root, 'release');
  await mkdir(manifestRoot, { recursive: true }); await regularDirectory(manifestRoot);
  const manifestFile = path.join(manifestRoot, 'production-manifest.json');
  try { const stat = await lstat(manifestFile); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('Unsafe manifest target'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const manifest = { schemaVersion: 1, sourceCandidate, assetDirectory: 'dist-production', files: productionAssets.map(file => ({ path: file, bytes: expected.records.get(file).length, sha256: hash(expected.records.get(file)), role: file.startsWith('_') ? 'cloudflare-control' : 'served-static' })) };
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  await checkProduction(root);
  return manifest;
}

export async function checkProduction(root = projectRoot) {
  assertConfig(await readJson(path.join(root, 'wrangler.jsonc')));
  const expected = makeProduction(await pinnedPreview(root));
  await productionInventory(path.join(root, 'dist-production'));
  const records = new Map();
  for (const file of productionAssets) {
    const bytes = await readFile(path.join(root, 'dist-production', file));
    if (!bytes.equals(expected.records.get(file))) throw new Error('Stale or modified production bytes');
    records.set(file, bytes);
  }
  const { headers, robots } = validateSemantics(records, expected.policy);
  const manifest = await readJson(path.join(root, 'release/production-manifest.json'));
  const expectedManifest = { schemaVersion: 1, sourceCandidate, assetDirectory: 'dist-production', files: productionAssets.map(file => ({ path: file, bytes: records.get(file).length, sha256: hash(records.get(file)), role: file.startsWith('_') ? 'cloudflare-control' : 'served-static' })) };
  if (!isDeepStrictEqual(manifest, expectedManifest)) throw new Error('Production manifest mismatch');
  return { records, headers, robots, policy: expected.policy, manifest };
}
