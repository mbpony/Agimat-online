// Minimal Upstash Redis REST mock for testing cloud persistence.
// GET  /get/:key  -> {"result": <string|null>}
// POST /set/:key  body=<value> -> {"result":"OK"}   (body appended as value, per Upstash docs)
const http = require('http');
const store = new Map();
const PORT = process.env.MOCK_PORT || 8001;
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const m = req.url.match(/^\/(get|set)\/([^\/?]+)/);
    res.setHeader('content-type', 'application/json');
    if (!m) { res.statusCode = 404; return res.end(JSON.stringify({ error: 'not found' })); }
    const [, op, key] = m;
    const k = decodeURIComponent(key);
    if (op === 'get') {
      res.end(JSON.stringify({ result: store.has(k) ? store.get(k) : null }));
    } else {
      store.set(k, body);
      res.end(JSON.stringify({ result: 'OK' }));
    }
  });
}).listen(PORT, () => console.log('[mock-upstash] on', PORT));
