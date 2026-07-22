/**
 * 本地开发服务器：静态文件 + 挂载 api/ 下的 serverless 处理器
 * 用法：npm run dev  [PORT=8123]
 * 与 Vercel 行为对齐：/api/<path> → api/<path>.js 的 module.exports(req, res)
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 8123);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.md': 'text/markdown; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** /api/agent/chat → api/agent/chat.js */
function resolveApi(pathname) {
  const rel = pathname.replace(/^\/+/, '');
  const file = path.join(ROOT, `${rel}.js`);
  if (!file.startsWith(path.join(ROOT, 'api'))) return null; // 只允许 api/ 内
  return fs.existsSync(file) ? file : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith('/api/')) {
    const file = resolveApi(pathname);
    if (!file) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: `未找到 API：${pathname}` }));
      return;
    }
    // 每次请求重新加载，改代码免重启
    delete require.cache[require.resolve(file)];
    const handler = require(file);
    Promise.resolve(handler(req, res)).catch((e) => {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
    });
    return;
  }

  // 静态文件
  let file = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    if (pathname.startsWith('/api/') || pathname.startsWith('/data/')) {
      res.setHeader('cache-control', 'no-store');
    }
    res.end(buf);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 HTX OTC 看板 dev-server 已启动`);
  console.log(`   看板  → http://localhost:${PORT}/`);
  console.log(`   API   → http://localhost:${PORT}/api/status`);
});
