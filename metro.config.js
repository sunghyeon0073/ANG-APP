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

  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => (req, res, next) => {
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
