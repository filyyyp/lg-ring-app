// Homebrew Channel accepts { packages: [...] } with an inline manifest.
// Relative ipkUrl is resolved against the repository JSON URL by the client.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const info = JSON.parse(fs.readFileSync(path.join(root, 'app/appinfo.json')));
const filename = `${info.id}_${info.version}_all.ipk`;
const ipk = fs.readFileSync(path.join(root, 'dist', filename));
const iconUri = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'app', info.icon)).toString('base64');
const manifest = {
  id: info.id, version: info.version, type: info.type, title: info.title,
  appDescription: info.appDescription, iconUri, rootRequired: false,
  ipkUrl: filename,
  ipkHash: { sha256: crypto.createHash('sha256').update(ipk).digest('hex') }
};
if (process.env.LG_RING_SOURCE_URL) {
  const source = new URL(process.env.LG_RING_SOURCE_URL);
  if (source.protocol !== 'https:') throw new Error('Source URL must use HTTPS');
  manifest.sourceUrl = source.href;
}
const catalog = { packages: [{
  id: info.id, title: 'LG Ring – Zvonček', iconUri,
  shortDescription: 'Zvonček pre Home Assistant: zvuk, voliteľná kamera a časovač. Root nie je potrebný. Bez rootu je potrebný aktívny Developer Mode.',
  manifest
}] };
const out = path.join(root, 'dist/repository');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, filename), ipk);
fs.writeFileSync(path.join(out, 'repo.json'), JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="sk"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LG Ring – webOSBrew repozitár</title>
<style>body{font:18px/1.6 system-ui,sans-serif;max-width:760px;margin:70px auto;padding:0 24px;background:#101715;color:#f0f3e9}a{color:#c4eb95}code{overflow-wrap:anywhere}h1{font-size:48px}li{margin:12px 0}</style>
<h1>LG Ring</h1><p>Zvonček pre LG webOS TV a Home Assistant.</p>
<ol><li>Na TV otvor Homebrew Channel → Settings → Add repository.</li>
<li>Vlož adresu: <code id="url">repo.json</code></li>
<li>Obnov zoznam a vyber LG Ring – Zvonček → Install → Launch.</li></ol>
<p><a href="repo.json">Katalóg repozitára</a> · <a href="${filename}">Stiahnuť inštalačný balík ${info.version}</a></p>
<p>Bez rootu potrebuješ aktívny Developer Mode. Prebudenie TV riadi Home Assistant.</p>
<script>document.getElementById('url').textContent=new URL('repo.json',location.href).href;</script></html>`);
console.log(`Repository generated: ${path.join(out, 'repo.json')}`);
