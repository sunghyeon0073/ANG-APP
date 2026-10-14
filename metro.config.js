// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');
const https = require('https');

const config = getDefaultConfig(__dirname);

/**
 * 웹(브라우저) 개발용 /api 프록시.
 * 배포 서버의 nginx 가 Origin 헤더를 제거해 CORS 응답 헤더가 붙지 않으므로,
 * 브라우저 → Metro(localhost:8081)/api → 백엔드 로 우회한다. 네이티브 앱은 사용하지 않는다.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (apiUrl) {
  const target = new URL(apiUrl);
  const client = target.protocol === 'https:' ? https : http;

  /**
   * 웹소켓(/api/ws/...)도 같은 방식으로 넘긴다. 백엔드가 다른 Origin 의 핸드셰이크를 403 으로 거부하기 때문.
   * Metro 는 /hot 외의 upgrade 요청을 끊어버리므로, 기존 upgrade 리스너를 감싸 /api/ 만 가로챈다.
   */
  let upgradePatched = false;
  const patchUpgrade = (server) => {
    if (upgradePatched || !server) return;
    upgradePatched = true;
    const original = server.listeners('upgrade');
    server.removeAllListeners('upgrade');
    server.on('upgrade', (req, socket, head) => {
      if (!req.url || !req.url.startsWith('/api/')) {
        original.forEach((l) => l.call(server, req, socket, head));
        return;
      }
      const headers = { ...req.headers, host: target.host };
      delete headers.origin;
      const proxyReq = client.request({
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        method: req.method,
        path: req.url,
        headers,
      });
      proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
        const lines = [`HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}`];
        for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
          lines.push(`${proxyRes.rawHeaders[i]}: ${proxyRes.rawHeaders[i + 1]}`);
        }
        socket.write(lines.join('\r\n') + '\r\n\r\n');
        if (proxyHead && proxyHead.length) socket.write(proxyHead);
        if (head && head.length) proxySocket.write(head);
        proxySocket.pipe(socket).pipe(proxySocket);
        proxySocket.on('error', () => socket.destroy());
        socket.on('error', () => proxySocket.destroy());
      });
      // 업그레이드 대신 일반 응답(403 등)이 오면 상태 코드만 돌려주고 닫는다
      proxyReq.on('response', (proxyRes) => {
        socket.end(`HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n\r\n`);
      });
      proxyReq.on('error', () => socket.destroy());
      proxyReq.end();
    });
  };

  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => (req, res, next) => {
      patchUpgrade(req.socket && req.socket.server);
      if (!req.url || !req.url.startsWith('/api/')) return middleware(req, res, next);

      const headers = { ...req.headers, host: target.host };
      delete headers.origin;
      delete headers.referer;

      const proxyReq = client.request(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port,
          method: req.method,
          path: req.url,
          headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
        },
      );
      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `API 프록시 오류: ${err.message}` }));
      });
      req.pipe(proxyReq);
    },
  };
}

module.exports = config;
