// Serve only the generated catalog and its verified package, never workspace files.
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../dist/repository');
const catalogBytes = fs.readFileSync(path.join(root, 'repo.json'));
const catalog = JSON.parse(catalogBytes);
const manifest = catalog.packages[0].manifest;
if (!/^[a-z0-9._-]+\.ipk$/.test(manifest.ipkUrl)) throw new Error('Invalid package filename');
const ipk = fs.readFileSync(path.join(root, manifest.ipkUrl));
if (crypto.createHash('sha256').update(ipk).digest('hex') !== manifest.ipkHash.sha256) {
  throw new Error('Package checksum mismatch. Run npm run repo:build.');
}
const files = new Map([
  ['/repo.json', { bytes: catalogBytes, type: 'application/json; charset=utf-8' }],
  ['/' + manifest.ipkUrl, { bytes: ipk, type: 'application/octet-stream' }]
]);
const port = Number(process.env.LG_RING_REPO_PORT || 4174);
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  const item = files.get(req.url.split('?')[0]);
  if (!item) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': item.type, 'Content-Length': item.bytes.length });
  res.end(req.method === 'HEAD' ? undefined : item.bytes);
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '0.0.0.0', () => {
  console.log('Homebrew Channel → Settings → Add repository:');
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) console.log(`http://${address.address}:${port}/repo.json`);
    }
  }
  console.log('Keep this process running during installation. Stop with Ctrl+C.');
});
