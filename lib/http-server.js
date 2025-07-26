// Import modul core Node.js
import http from 'http';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

// Path root direktori yang dilayani server
const rootDir = process.cwd();

// Daftar MIME type berdasarkan ekstensi file
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

// Mendapatkan MIME type berdasarkan ekstensi file
const getMimeType = filePath =>
  mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

// Membuat ETag (untuk caching browser)
const generateETag = stats =>
  `"${stats.size}-${stats.mtimeMs}"`;

// Menentukan apakah browser mendukung kompresi
const getCompression = req => {
  const accept = req.headers['accept-encoding'] || '';
  if (accept.includes('br')) return 'br';
  if (accept.includes('gzip')) return 'gzip';
  return null;
};

// Jika perlu, kompres stream sebelum dikirim ke client
const compressStream = (stream, encoding) => {
  if (encoding === 'br') return stream.pipe(zlib.createBrotliCompress());
  if (encoding === 'gzip') return stream.pipe(zlib.createGzip());
  return stream;
};

// Fungsi utama: handler HTTP
async function httpServer(req, res) {
  try {
    console.log(req.url);
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const decodedPath = decodeURIComponent(parsedUrl.pathname);
    const requestedPath = path.join(rootDir, decodedPath);
    const safePath = path.resolve(requestedPath);

    // Cegah akses di luar rootDir
    if (!safePath.startsWith(rootDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 Forbidden');
    }

    let stat;
    try {
      stat = await fs.stat(safePath);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    // Jika folder, coba layani index.html atau tampilkan isi direktori
    if (stat.isDirectory()) {
      const indexPath = path.join(safePath, 'index.html');
      try {
        const indexStat = await fs.stat(indexPath);
        return streamFile(indexPath, req, res, indexStat);
      } catch {
        const files = await fs.readdir(safePath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(`<html><head><meta charset="UTF-8"><title>Index of ${decodedPath}</title></head><body>`);
        res.write(`<h1>Index of ${decodedPath}</h1><ul>`);
        if (decodedPath !== '/') {
          res.write(`<li><a href="${path.posix.join(decodedPath, '..')}">..</a></li>`);
        }
        for (const file of files) {
          if(file.endsWith(' ') || file.startsWith(' ')){
            continue;
          }
          const href = path.posix.join(decodedPath, file);
          res.write(`<li><a href="${href}">${file}</a></li>`);
        }
        res.end('</ul></body></html>');
        return;
      }
    }

    // Jika file, layani dengan stream dan dukungan caching + kompresi
    return streamFile(safePath, req, res, stat);

  } catch (err) {
    console.error('❌ Error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
}

// Fungsi untuk mengirim file statis (dengan ETag dan kompresi)
async function streamFile(filePath, req, res, stat) {
  const etag = generateETag(stat);

  // Cek apakah file belum berubah (menggunakan ETag)
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304);
    return res.end();
  }

  const contentType = getMimeType(filePath);
  const encoding = getCompression(req);

  const headers = {
    'Content-Type': contentType,
    'ETag': etag,
    'Cache-Control': 'public, max-age=3600',
  };

  if (encoding) {
    headers['Content-Encoding'] = encoding;
  } else {
    headers['Content-Length'] = stat.size;
  }

  res.writeHead(200, headers);

  const stream = createReadStream(filePath);
  compressStream(stream, encoding).pipe(res);
}

// Ekspor fungsi server agar bisa dipakai oleh file lain (opsional)
export { httpServer };
