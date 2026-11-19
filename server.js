import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClip, OUTPUT_DIR } from './lib/clip.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/api/clips') {
      const body = await readJson(req);
      const safeName = `clip-${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`;
      const output = await createClip(body, path.join(OUTPUT_DIR, safeName));
      return sendJson(res, 201, { file: safeName, path: output, downloadUrl: `/clips/${encodeURIComponent(safeName)}` });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/clips/')) {
      const name = path.basename(decodeURIComponent(url.pathname.slice('/clips/'.length)));
      if (!/^clip-[\w-]+\.mp4$/.test(name)) return sendJson(res, 404, { error: 'Archivo no encontrado.' });
      const file = path.join(OUTPUT_DIR, name);
      await stat(file);
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Disposition': `attachment; filename="${name}"` });
      return (await import('node:fs')).createReadStream(file).pipe(res);
    }
    if (req.method === 'GET') return serveStatic(url.pathname, res);
    sendJson(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    sendJson(res, 400, { error: error.message || 'No se pudo crear el clip.' });
  }
});

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 16_384) { reject(new Error('La petición es demasiado grande.')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('El cuerpo debe ser JSON válido.')); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function serveStatic(requestPath, res) {
  const requested = requestPath === '/' ? '/index.html' : decodeURIComponent(requestPath);
  const file = path.resolve(PUBLIC, `.${requested}`);
  if (!file.startsWith(`${PUBLIC}${path.sep}`)) return sendJson(res, 404, { error: 'No encontrado.' });
  try {
    const content = await readFile(file);
    const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8';
    res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch { sendJson(res, 404, { error: 'No encontrado.' }); }
}

server.listen(PORT, '127.0.0.1', () => console.log(`Stream Shorts Studio listo en http://127.0.0.1:${PORT}`));
