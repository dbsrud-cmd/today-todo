const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const files = {
  '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'],
  '/styles.css': ['styles.css', 'text/css'], '/task-store.js': ['task-store.js', 'text/javascript'],
  '/app.js': ['app.js', 'text/javascript'], '/recommendation.js': ['recommendation.js', 'text/javascript'],
  '/recommendation-ui.js': ['recommendation-ui.js', 'text/javascript']
};
function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    function json(status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }
    // 내 컴퓨터에서만 화면 파일을 제공합니다.
    const allowedHost = `127.0.0.1:${res.socket.localPort}`;
    if (req.headers.host !== allowedHost) return json(403, { error: '127.0.0.1 주소로 열어 주세요.' });
    const route = req.url.split('?')[0];
    if (req.method === 'GET' && files[route]) {
      try {
        const [file, type] = files[route];
        const content = await fs.readFile(path.join(__dirname, file));
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
        return res.end(content);
      } catch { return json(500, { error: '화면 파일을 읽을 수 없어요.' }); }
    }
    json(404, { error: '찾을 수 없는 주소입니다.' });
  });
}
if (require.main === module) {
  const server = createServer();
  server.on('error', () => { console.error('서버를 시작할 수 없어요. 3000번 포트를 확인해 주세요.'); process.exitCode = 1; });
  server.listen(3000, '127.0.0.1', () => console.log('앱 주소: http://127.0.0.1:3000 · 종료: Ctrl+C'));
}
module.exports = { createServer };
