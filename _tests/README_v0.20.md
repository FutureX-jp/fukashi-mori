# 読んで v0.20（v0.19.5〜v0.20.1・2026-10-10）

PCにつながっていないクラウドのセッションで、github の index.html を直に直して出した版。あとからPCに取り込んだ（このフォルダ）。
公開した物: index.html（md5 c93c5bd563648e049705e30ce98538b3）・supabase.js（公式 supabase-js 2.117.3 の UMD・MIT・md5 db2653a991898cb982d887c3b07c1b20）・about/index.html（md5 23bf5edb1f63b736ef250e91f2861812）

## 作り方（v0.19.4 から）
`python patch20.py ..\森_v0.19_住人の2時間\index.html index.html`
patch19.py＋patch19_extra.py の出力（md5 9d592cfd…）に、34か所の行の入れ替え（patch20.json）を当てる。前と後の md5 を確かめ、合わなければ何も書かない。
土台を変えた時は当たらない（行がずれる）。その時は下の「変えた所」を見て手で入れる。印はどれもコードの中に `v0.19.5`・`v0.19.6`・`v0.20` と書いてある。

## 変えた所
| 版 | 何 | コードの目印 |
|---|---|---|
| v0.19.5 | 畑(82/85)・役場(52)・AI住人の家・立入禁止の先を売り物から外す | `lotLock`・`lotPublic`・`farmOpen`・`fieldOf`。`openLot`・`buyLot`・`moveLot`・`renderLand`・`landCount` がここを通る |
| v0.19.5 | 畑の看板に近づくと「畑を見る」 | `buildField` の末尾（hits に `farm82`/`farm85`） |
| v0.19.5 | 魚10種（f新入り g見栄っぱり h雨宿り i朝帰り jご隠居） | `FISHDEF`・`FWHEN`・`RODRW`・`fishOn`・`rodPick`・`RODS_STR`。`stepFish` の頭（st='away'）・`spearRay` |
| v0.19.5 | 図鑑のごほうび: はじめの5種＋75（`S.bookAll`）・10種＋150（`S.bookAll2`） | `bookAdd` |
| v0.19.5 | 吹き出しを12字×最大4行に折り返す（前は22字で「…」） | `bubLines`・`bubTex`・`bubSprite`。`aiApply` の slice(0,22)/(0,32) を外した |
| v0.19.6 | 絵つきの魚図鑑（立体をその場で絵にする） | `ZK`・`FNOTE`・`zkShot`・`zukanHtml`・`zukanOpen`・`zkPick`・`recOpen`。CSS `.zkd`・`.zk` |
| v0.20 | 同じワールド（ほかの旅人・ひとこと） | `NET`・`net*`（`netBoot`・`netSend`・`netGot`・`netStep`・`netSay`・`netSaid`・`netOpen`・`netAct`・`netClean`）。`step` の頭で `netFrame`。`#netb`。`supabase.js` |
| v0.20 | 板を左上の札より手前に | CSS `#sheet{z-index:5}` |
| v0.20.1 | 「出た」を送ってから0.35秒待って部屋を閉じる | `netLeave`・`netStop`・`NET.closeAt` |

## 同じワールドの決まり
- 中継: Supabase Realtime（Broadcast）・公開の部屋 `mori-live-v1`・鍵は不具合の記録と同じ publishable key。森のサーバー（住人の頭）は通らない
- 同意: `S.net` = 未定(undefined)／入る(1)／ひとり(0)。未定のままでは部品(supabase.js)も読まず、1通も送らない。「とじる」は同意にしない。初めての人には住民票と性格診断のあと、次に来た時に1回だけ聞く（`NET.old`）
- 送る物（'p'）: i 番号（`mori_nid`・10けた・住民票や端末の番号とは別）／n 名前（`S.pname`・無ければ「旅人」）／h 帽子／x z 場所／a 向き／v 見えるか。ひとこと（'c'）: i・t。出た（'x'）: i
- ふるい `netClean`: 送る側と受ける側の両方。リンク・SNSのID・@・7けた以上の数字の並びは ＊＊＊、禁止ワード（`NETNG`＝QNG の言葉の部分）は ＊。名前は `netName`（QNG に当たれば「旅人」）
- 回数: 無料枠 1秒100通（受け取る人1人で1通）。`f = min(4, 70/((n+1)n))` 回/秒。止まっている間は4秒に1回。同時に歩き回れるのは8人くらいまで
- 12秒たよりが無い旅人は消す（`NET.DEAD`）。つながらない時は30秒おきにつなぎ直す。理由は「記録」に1回だけ残す（kind 'net'）
- サーバー側へ載せ替える時: `netBoot`・`netSend`（`netPush`）・`netSay` を差し替える。受け取る側（`netGot`・`netSaid`・`netStep`）はそのまま

## 検査（このフォルダの tests\）
- `check195.js` 45本／`net20.js` 33本（2画面・まねた中継）／`misc.js` 3本／`real20.js` 6本（本物の Supabase・検査用の部屋 `mori-test-<乱数>`）。動かし方は tests\README.md
- 逆テスト: v0.19.4 の index.html に check195.js → 畑・魚・吹き出しが NG／`netStop` を待たずに閉じる形に戻すと net20.js の N18 が NG
- PC側の func19.js・webtest19.js は v0.20 では回していない（版の文字 v0.19→v0.20、図鑑の「/5」、吹き出しの32字を見ている検査は直しが要る）

## 誰が決めたか
- 主: リュックの「売る」はそのまま／最初から同じワールド（合言葉の部屋は作らない）／自由入力は入れる／魚を増やす・魚図鑑
- Claude（仮・チャッピーに見せる前に出した物）: 新しい魚5種の名前・値段・色・深さ・条件／図鑑の並べ方と「ひとこと」10本／ほかの旅人の札の色と 👤／スタンプ6個／同意の板の文面／畑の板の文面
