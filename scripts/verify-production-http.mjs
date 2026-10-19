import assert from 'node:assert/strict';
import { request } from 'node:http';
import { once } from 'node:events';
import { createProductionServer } from './serve-production.mjs';
import { checkProduction, effectiveHeaders, robotsAllows, pages } from './lib/production.mjs';

const get = (route, method = 'GET', host = '127.0.0.1:5215') => new Promise((resolve, reject) => {
  const req = request({ host: '127.0.0.1', port: 5215, path: route, method, headers: { Host: host }, agent: false, timeout: 5000 }, response => {
    const chunks = []; response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) })); response.on('error', reject);
  });
  req.on('timeout', () => req.destroy(new Error('Loopback timeout'))); req.on('error', reject); req.end();
});
let server, stage = 'startup', checks = 0;
try {
  const checked = await checkProduction();
  server = await createProductionServer(); server.listen(5215, '127.0.0.1'); await once(server, 'listening');
  for (const [file, body] of checked.records) {
    if (file.startsWith('_')) continue;
    stage = `GET /${file}`; const response = await get(`/${file}`);
    assert.equal(response.status, 200); assert.deepEqual(response.body, body);
    for (const [name, value] of Object.entries(effectiveHeaders(checked.headers, `/${file}`))) assert.equal(response.headers[name], value);
    if (pages.some(page => page.file === file)) { assert.equal(response.headers['x-robots-tag'], undefined); assert.match(response.body.toString(), /<meta name="robots" content="index,follow">/); }
    assert.equal(robotsAllows(checked.robots, `/${file}`), file !== '404.html'); checks += 1;
    stage = `HEAD /${file}`; const head = await get(`/${file}`, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body.length, 0); assert.equal(Number(head.headers['content-length']), body.length); checks += 1;
  }
  for (const [from, to] of [['/', '/index.html'], ['/en/', '/en/index.html']]) for (const method of ['GET', 'HEAD']) {
    stage = `${method} alias ${from}`; const response = await get(from, method); assert.equal(response.status, 302); assert.equal(response.headers.location, to); assert.equal(response.body.length, 0); assert.equal(response.headers['content-security-policy'], undefined); checks += 1;
  }
  for (const route of ['/missing', '/en/missing', '/en', '/index', '/package.json', '/.git/config', '/release/production-manifest.json', '/_headers', '/_redirects', '/%2e%2e/package.json', '/index.html?fake-input=1']) {
    stage = `404 ${route}`; const response = await get(route); assert.equal(response.status, 404); assert.deepEqual(response.body, checked.records.get('404.html')); assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow'); assert.match(response.body.toString(), /noindex,nofollow/); checks += 1;
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) { stage = `method ${method}`; const response = await get('/index.html', method); assert.equal(response.status, 405); assert.equal(response.headers.allow, 'GET, HEAD'); checks += 1; }
  for (const host of ['example.invalid', 'localhost:5215', '127.0.0.1:80']) { stage = `host ${host}`; assert.equal((await get('/index.html', 'GET', host)).status, 403); checks += 1; }
  console.log(JSON.stringify({ status: 'PASS', scope: '5215 loopback static model only; no browser or live-host claim', checks, deploymentAssets: checked.records.size, servedAssets: checked.records.size - 2, productionBrowserNetworkStorage: 'NOT_RUN_PRIMARY_ISOLATED_RUNNER_REQUIRED' }));
} catch (error) { console.error(error.code === 'EADDRINUSE' ? 'FAIL: port 5215 occupied; existing process preserved' : `FAIL production HTTP (${stage}; ${error.code ?? error.message})`); process.exitCode = 1; }
finally { if (server?.listening) await new Promise(resolve => server.close(resolve)); }
