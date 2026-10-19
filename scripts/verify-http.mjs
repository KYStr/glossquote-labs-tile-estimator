// CLI-only loopback checks. This never opens or drives a browser.
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createPreviewServer } from './serve.mjs';
import { assets, publicRoot, csp, contentTypes } from './lib/static.mjs';

const get = (route, method = 'GET', host = '127.0.0.1:4215') => new Promise((resolve, reject) => {
  const req = request({ host: '127.0.0.1', port: 4215, path: route, method, headers: { Host: host }, agent: false, timeout: 5000 }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    response.on('error', reject);
  });
  req.on('timeout', () => req.destroy(new Error('Loopback timeout')));
  req.on('error', reject); req.end();
});
let server;
let stage = 'startup';
try {
  server = await createPreviewServer();
  server.listen(4215, '127.0.0.1');
  await once(server, 'listening');
  let checks = 0;
  for (const [route, file] of [['/', 'index.html'], ['/en/', 'en/index.html'], ...assets.map(file => [`/${file}`, file])]) {
    stage = `GET ${route}`;
    const response = await get(route);
    assert.equal(response.status, 200); assert.deepEqual(response.body, await readFile(path.join(publicRoot, file)));
    assert.equal(response.headers['content-type'], contentTypes[path.extname(file)]);
    assert.equal(response.headers['content-security-policy'], csp);
    assert.equal(response.headers['x-content-type-options'], 'nosniff'); assert.equal(response.headers['referrer-policy'], 'no-referrer');
    assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow'); assert.equal(response.headers['cache-control'], 'no-store');
    if (file.endsWith('.html')) assert.match(response.body.toString('utf8'), /<meta name="robots" content="noindex,nofollow">/);
    stage = `HEAD ${route}`;
    const head = await get(route, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body.length, 0); assert.equal(Number(head.headers['content-length']), response.body.length);
    checks += 2;
  }
  for (const route of ['/package.json', '/README.md', '/scripts/check.mjs', '/.git/config', '/../package.json', '/%2e%2e/package.json', '/en', '/index.html?fake-input=1', '//index.html', '/missing']) {
    stage = `rejected route ${route}`;
    const response = await get(route); assert.equal(response.status, 404); assert.equal(response.body.toString(), 'Not found'); checks += 1;
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'TRACE']) { stage = `rejected method ${method}`; const response = await get('/', method); assert.equal(response.status, 405); assert.equal(response.headers.allow, 'GET, HEAD'); checks += 1; }
  for (const host of ['example.invalid', 'localhost:4215', '127.0.0.1:80']) { stage = `rejected host ${host}`; const response = await get('/', 'GET', host); assert.equal(response.status, 403); checks += 1; }
  console.log(JSON.stringify({ status: 'PASS', scope: 'CLI loopback HTTP only', binding: '127.0.0.1:4215', checks, assets: assets.length, browserUI: 'NOT_RUN_USER_FOCUS_INCIDENT' }));
} catch (error) {
  console.error(error.code === 'EADDRINUSE' ? 'FAIL: port 4215 occupied; existing process preserved' : `FAIL: loopback HTTP contract (${stage}; ${error.code ?? 'assertion'})`);
  process.exitCode = 1;
} finally {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
}
