// Local-only, dependency-free development server. Not for production hosting.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT ?? 8000);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('invalid PORT');
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) {res.writeHead(405);res.end('Method Not Allowed');return;}
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const file = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path));
    if (file !== root && !file.startsWith(root + sep)) {res.writeHead(403);res.end('Forbidden');return;}
    if (file.includes(`${sep}.git${sep}`) || file.endsWith(`${sep}.git`)) {res.writeHead(403);res.end('Forbidden');return;}
    const metadata = await stat(file);
    if (!metadata.isFile()) {res.writeHead(404);res.end('Not Found');return;}
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[extname(file)] ?? 'application/octet-stream', 'Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {res.writeHead(404);res.end('Not Found');}
});
server.listen(port, '127.0.0.1', () => console.log(`POLKA FRONTIER PoC: http://127.0.0.1:${port}`));
