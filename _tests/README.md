# 森の検査（v0.19.5〜v0.20 で足した分）

2026-10-10 にクラウドのセッション（PCにつながっていない）で作った検査。PC側の検査一式（func15.js など）とは別物なので、PCのソースに取り込む時に一緒に持っていく。
このフォルダは名前が `_` で始まるので、github.io には公開されない（リポジトリには入る）。

## 動かし方

```
npm install three@0.128.0          # 3Dの部品（cdnjs の代わりに差し込む）
node check195.js ../index.html     # 畑・役場を売らない／魚10種／魚図鑑／吹き出し　45本
node net20.js    ../index.html     # 同じワールド（2画面）　33本
node misc.js     ../index.html     # #v14・PC幅・小さいスマホ　3本
```

- `harness.js` の先頭の playwright の場所（`/opt/npm-tools/node_modules/playwright`）は環境に合わせて直す
- 森のサーバー（/api/forest・/api/world）は `harness.js` の `world()` がまねる
- 同じワールドの中継（Supabase Realtime）は `harness.js` の `RELAY` がまねる。**本物の Supabase ではない**。
  画面側は公式の supabase-js（`../supabase.js`）をそのまま動かしているので、確かめられているのは「公式の部品とのやり取り」と「2画面の見え方」まで。
  本物の中継につながるか（公開の部屋に鍵だけで入れる設定か・無料枠の中か）は実機でしか分からない
- 逆テスト: v0.19.4（e50dd31）の index.html に check195.js を当てると、畑・魚・吹き出しの検査が NG になる（直す前は通らないことを確かめてある）
