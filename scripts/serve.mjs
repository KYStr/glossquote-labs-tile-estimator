import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicRoot, validateStatic, csp, contentTypes } from './lib/static.mjs';

export async function createPreviewServer() {
  const files = await validateStatic(publicRoot);
  const bodies = new Map(await Promise.all(files.map(async file => [file, await readFile(path.join(publicRoot, file))])));
  return createServer({ maxHeaderSize: 8192, requestTimeout: 5000, headersTimeout: 5000 }, (request, response) => {
    const headers = { 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };
    const end = (code, text) => { response.writeHead(code, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }); response.end(request.method === 'HEAD' ? undefined : text); };
    if (request.headers.host !== '127.0.0.1:4215') return end(403, 'Forbidden');
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); return end(405, 'Method not allowed'); }
    const route = request.url === '/' ? 'index.html' : request.url === '/en/' ? 'en/index.html' : request.url?.slice(1);
    if (!bodies.has(route) || request.url?.[0] !== '/') return end(404, 'Not found');
    const body = bodies.get(route);
    response.writeHead(200, { ...headers, 'Content-Type': contentTypes[path.extname(route)], 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const server = await createPreviewServer();
    server.on('error', () => { console.error('Preview unavailable; existing processes preserved'); process.exitCode = 1; });
    server.listen(4215, '127.0.0.1', () => console.log('Preview listening at http://127.0.0.1:4215 (source, noindex)'));
  } catch { console.error('Preview source rejected'); process.exitCode = 1; }
}
