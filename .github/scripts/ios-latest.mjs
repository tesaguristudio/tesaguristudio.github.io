// 更新のお知らせ: iOS の latest を App Store の公開中の版に合わせる。
// GitHub Actions（.github/workflows/ios-latest.yml）が毎日動かす。
// App Store の公開中の版（iTunes lookup API、無料・鍵いらず）が
// <フォルダ>/version.json の ios.latest より新しければ書きかえる。
// 下げることはしない。minimum はさわらない。
// アプリを足すときは APPS に { dir, id }（id = App Store の Apple ID）を足す。
import { readFileSync, writeFileSync } from 'node:fs';

const APPS = [
  { dir: 'piyodoko', id: '6820950352' },
];

function compare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

const valid = (v) => typeof v === 'string' && /^\d+(\.\d+)*$/.test(v);

let changed = 0;
for (const { dir, id } of APPS) {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=jp&t=${Date.now()}`);
  if (!res.ok) { console.log(`${dir}: lookup failed (${res.status})`); continue; }
  const store = (await res.json()).results?.[0]?.version;
  if (!valid(store)) { console.log(`${dir}: no store version`); continue; }
  const path = `${dir}/version.json`;
  const text = readFileSync(path, 'utf8');
  const latest = JSON.parse(text).ios?.latest;
  if (!valid(latest)) { console.log(`${dir}: no ios.latest`); continue; }
  if (compare(store, latest) <= 0) { console.log(`${dir}: store ${store}, latest ${latest}: no change`); continue; }
  const next = text.replace(/("ios"\s*:\s*\{\s*"latest"\s*:\s*")[^"]*(")/, `$1${store}$2`);
  if (JSON.parse(next).ios.latest !== store) throw new Error(`${dir}: could not rewrite ios.latest`);
  writeFileSync(path, next);
  console.log(`${dir}: ios.latest ${latest} -> ${store}`);
  changed++;
}
console.log(`changed: ${changed}`);
