// Loopback model of this tool's closed static assets and control files.
// This is not a Cloudflare runtime or a browser acceptance test.
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectRoot, contentTypes } from './lib/static.mjs';
import { checkProduction, effectiveHeaders } from './lib/production.mjs';

export async function createProductionServer(root = projectRoot) {
  const checked = await checkProduction(root);
  const redirects = new Map(checked.records.get('_redirects').toString('utf8').trim().split('\n').map(line => { const [from, to, code] = line.split(' '); return [from, { to, code: Number(code) }]; }));
  return createServer({ maxHeaderSize: 8192, requestTimeout: 5000, headersTimeout: 5000 }, (request, response) => {
    const pathname = request.url;
    const headers = effectiveHeaders(checked.headers, pathname ?? '/missing');
    const plain = (status, text) => { response.writeHead(status, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }); response.end(request.method === 'HEAD' ? undefined : text); };
    if (request.headers.host !== '127.0.0.1:5215') return plain(403, 'Forbidden');
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); return plain(405, 'Method not allowed'); }
    const redirect = redirects.get(pathname);
    if (redirect) { response.writeHead(redirect.code, { Location: redirect.to, 'Content-Length': 0 }); return response.end(); }
    const file = pathname?.startsWith('/') ? pathname.slice(1) : '';
    const found = checked.records.has(file) && !file.startsWith('_');
    const body = checked.records.get(found ? file : '404.html');
    const type = found ? (contentTypes[path.extname(file)] ?? (file.endsWith('.xml') ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8')) : 'text/html; charset=utf-8';
    response.writeHead(found ? 200 : 404, { ...headers, 'Content-Type': type, 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const server = await createProductionServer();
    server.on('error', () => { console.error('Production model unavailable; existing processes preserved'); process.exitCode = 1; });
    server.listen(5215, '127.0.0.1', () => console.log('Production HTTP model at http://127.0.0.1:5215/index.html'));
  } catch (error) { console.error(`Production model rejected: ${error.message}`); process.exitCode = 1; }
}
