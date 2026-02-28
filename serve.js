const https = require('https');
const fs = require('fs');
const path = require('path');

// TLS cert paths (adjust if necessary)
const options = {
  key: fs.readFileSync('C:\\Users\\Kamran Oliver\\localhost+4-key.pem'),
  cert: fs.readFileSync('C:\\Users\\Kamran Oliver\\localhost+4.pem')
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

const server = https.createServer(options, (req, res) => {
  try {
    // normalize request URL and strip query
    let pathname = decodeURIComponent((req.url || '').split('?')[0]);
    if (!pathname || pathname === '/') pathname = '/index.html';

    // prevent path traversal and join safely
    const fullPath = path.join(__dirname, pathname);
    const base = path.normalize(__dirname + path.sep);
    if (!fullPath.startsWith(base)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Forbidden');
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Forbidden');
    }

    const contentType = getContentType(fullPath);
    const data = fs.readFileSync(fullPath);
    res.writeHead(200, { 'Content-Type': contentType });
    console.log(`${req.method} ${req.url} -> 200 ${contentType}`);
    res.end(data);
  } catch (err) {
    const code = err && err.code ? err.code : '';
    if (code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      console.log(`${req.method} ${req.url} -> 404`);
    } else {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server Error');
    }
  }
});

console.log('Serving on port 443');
server.listen(443);
