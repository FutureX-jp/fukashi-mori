# 森の検査（v0.19.5〜v0.20 で足した分）

2026-10-10 にクラウドのセッション（PCにつながっていない）で作った検査。PC側の検査一式（func15.js など）とは別物なので、PCのソースに取り込む時に一緒に持っていく。
このフォルダは名前が `_` で始まるので、github.io には公開されない（リポジトリには入る）。

## 動かし方

```
npm install three@0.128.0          # 3Dの部品（cdnjs の代わりに差し込む）
node check195.js ../index.html     # 畑・役場を売らない／魚10種／魚図鑑／吹き出し　45本
node net20.js    ../index.html     # 同じワールド（2画面）　33本
node misc.js     ../index.html     # #v14・PC幅・小さいスマホ　3本
npm install ws https-proxy-agent && node real20.js ../index.html   # 本物の Supabase（検査用の別の部屋）で2画面　6本
```

- `harness.js` の先頭の playwright の場所（`/opt/npm-tools/node_modules/playwright`）は環境に合わせて直す
- 森のサーバー（/api/forest・/api/world）は `harness.js` の `world()` がまねる
- 同じワールドの中継（Supabase Realtime）は、net20.js では `harness.js` の `RELAY` がまねる（画面側は公式の supabase-js をそのまま動かす）。
  real20.js は本物の Supabase につなぐ。部屋は毎回 `mori-test-<乱数>` で、本番の部屋 `mori-live-v1` には入らない（遊んでいる人の森に検査の旅人が出ないように）
- まねた中継は本物の癖を1つ真似てある: 「送った直後に部屋を出ると、その1通は相手に届かない」。最初のまねは受け付けていたので、本物でだけ出る不具合を見逃した（v0.20 の netStop）。
  まねを足す時は、本物ができない事も真似ること
- real20.js の橋（Node から本物へ張って、画面の中の部品と中身そのままでつなぐ）は、この作業場のブラウザが WebSocket を直接張れなかったための物。ふつうのPCなら harness の `real` の分岐を外して直接つなげばいい
- 逆テスト: v0.19.4（e50dd31）の index.html に check195.js を当てると、畑・魚・吹き出しの検査が NG になる（直す前は通らないことを確かめてある）
