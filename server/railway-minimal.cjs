/**
 * خادم اختبار بسيط جداً (بدون Express أو قاعدة بيانات).
 * استخدمه على Railway للتأكد أن المنصة تعمل:
 * في Railway → Settings → Deploy → Start Command: node server/railway-minimal.cjs
 * إن استجاب الرابط بـ "OK" فالمشكلة من التطبيق الرئيسي.
 */
const http = require('http');
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('OK');
});

server.listen(PORT, HOST, () => {
  console.log('[railway-minimal] Listening on', HOST + ':' + PORT);
});
