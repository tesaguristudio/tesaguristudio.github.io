// 更新のお知らせ: Android の latest を Google Play の公開中の版に合わせる。
// GitHub Actions（.github/workflows/android-latest.yml）が6時間ごとに動かす。
// Play のアプリのページ（無料・鍵いらず）に埋めこまれた公開中の版が
// <フォルダ>/version.json の android.latest より新しければ書きかえる。
// 審査中の版はページに出ないので、公開されてから上がる。
// 下げることはしない。minimum はさわらない。版が1つに決まらないときも何もしない。
// アプリを足すときは APPS に { dir, id }（id = パッケージ名）を足す。
import { readFileSync, writeFileSync } from 'node:fs';

const APPS = [
  { dir: 'piyodoko', id: 'com.takem.piyodoko' },
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

// 版の文字列のすぐあとに target SDK（[[[36]]）が続く形だけを拾う。
const VERSION = /\[\[\["(\d+(?:\.\d+)+)"\]\],\[\[\[\d+\]\]/g;

let changed = 0;
for (const { dir, id } of APPS) {
  const res = await fetch(`https://play.google.com/store/apps/details?id=${id}&hl=ja&gl=JP`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja' },
  });
  if (!res.ok) { console.log(`${dir}: page failed (${res.status})`); continue; }
  const found = [...new Set([...(await res.text()).matchAll(VERSION)].map((m) => m[1]))];
  if (found.length !== 1) { console.log(`${dir}: store version not clear (${found.join(', ') || 'none'})`); continue; }
  const store = found[0];
  const path = `${dir}/version.json`;
  const text = readFileSync(path, 'utf8');
  const latest = JSON.parse(text).android?.latest;
  if (!valid(latest)) { console.log(`${dir}: no android.latest`); continue; }
  if (compare(store, latest) <= 0) { console.log(`${dir}: store ${store}, latest ${latest}: no change`); continue; }
  const next = text.replace(/("android"\s*:\s*\{\s*"latest"\s*:\s*")[^"]*(")/, `$1${store}$2`);
  if (JSON.parse(next).android.latest !== store) throw new Error(`${dir}: could not rewrite android.latest`);
  writeFileSync(path, next);
  console.log(`${dir}: android.latest ${latest} -> ${store}`);
  changed++;
}
console.log(`changed: ${changed}`);
