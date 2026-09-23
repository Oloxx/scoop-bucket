// Pone bucket/drop.json en la ultima release de Oloxx/drop.
//
// Solo se fia de un SHA256SUMS con firma minisign valida con la clave del
// proyecto: la misma que comprueba `drop update` y la que publica el README.
// Sin esa comprobacion, quien pudiera tocar la release (o responder por
// api.github.com) metia su binario en el `scoop install` de todo el mundo.
//
//   node scripts/update.mjs              # ultima release
//   node scripts/update.mjs v0.9.0       # una concreta
//
// Necesita `minisign` en el PATH. Escribe la version en .version para el
// mensaje del commit.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = 'Oloxx/drop';
const PUBLIC_KEY = 'RWQqNnfqvCrj+eavJ9njz2vCoHaC8YnLqjsvNBMndz3hBroQLpou7+Kp';
const MANIFEST = 'bucket/drop.json';

const headers = { 'User-Agent': 'drop-scoop-bucket', Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const wanted = process.argv[2];
const url = wanted
  ? `https://api.github.com/repos/${REPO}/releases/tags/${wanted}`
  : `https://api.github.com/repos/${REPO}/releases/latest`;
const res = await fetch(url, { headers });
if (!res.ok) throw new Error(`GitHub responde ${res.status} a ${url}`);
const release = await res.json();
const tag = release.tag_name;
const version = tag.replace(/^v/, '');

async function download(name, dest) {
  const asset = release.assets.find((a) => a.name === name);
  if (!asset) throw new Error(`La release ${tag} no trae ${name}`);
  const r = await fetch(asset.browser_download_url, { headers: { 'User-Agent': headers['User-Agent'] } });
  if (!r.ok) throw new Error(`HTTP ${r.status} al bajar ${name}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drop-bucket-'));
const sums = path.join(tmp, 'SHA256SUMS');
await download('SHA256SUMS', sums);
await download('SHA256SUMS.minisig', sums + '.minisig');
// Lanza (y el workflow falla) si la firma no es de la clave del proyecto.
// `MINISIGN` cambia el verificador (otro binario, o `node algo.mjs`); por
// defecto el `minisign` del PATH, que es lo que instala el workflow.
const [cmd, ...pre] = (process.env.MINISIGN || 'minisign').split(' ');
execFileSync(cmd, [...pre, '-V', '-m', sums, '-x', sums + '.minisig', '-P', PUBLIC_KEY], { stdio: 'inherit' });

const hashes = new Map();
for (const line of fs.readFileSync(sums, 'utf8').split('\n')) {
  const m = line.trim().match(/^([0-9a-f]{64})\s+\*?(\S+)$/i);
  if (m) hashes.set(m[2], m[1].toLowerCase());
}
const exe = `drop-${tag}-windows-x64.exe`;
const sha = hashes.get(exe);
if (!sha) throw new Error(`El SHA256SUMS firmado no menciona ${exe}`);

// `#/drop.exe` renombra la descarga: el `bin` es `drop` venga la version que venga.
const manifest = {
  version,
  description: 'Peer-to-peer file transfer, end-to-end encrypted, with a code you can say aloud',
  homepage: 'https://drop.oloxx.dev',
  license: 'Apache-2.0',
  notes: 'Actualiza con `scoop update drop`, no con `drop update`: el binario es de Scoop.',
  architecture: {
    '64bit': {
      url: `https://github.com/${REPO}/releases/download/${tag}/${exe}#/drop.exe`,
      hash: sha,
    },
  },
  bin: 'drop.exe',
  checkver: { github: `https://github.com/${REPO}` },
  autoupdate: {
    architecture: {
      '64bit': {
        url: `https://github.com/${REPO}/releases/download/v$version/drop-v$version-windows-x64.exe#/drop.exe`,
      },
    },
    hash: { url: `https://github.com/${REPO}/releases/download/v$version/SHA256SUMS` },
  },
};

const text = JSON.stringify(manifest, null, 4) + '\n';
const before = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, 'utf8') : '';
fs.writeFileSync(MANIFEST, text);
fs.writeFileSync('.version', version + '\n');
console.log(before === text ? `Sin cambios: drop ${version}` : `bucket/drop.json -> drop ${version}`);
