// v0.20 同じワールドの検査: 2つの画面（A=主・B=ゆい）を開き、まねた中継を通して互いが見えるか。 node net20.js <index.html> [shots]
const { openMori, RELAY } = require('./harness');
const file = process.argv[2], shots = process.argv[3];
const res = []; const ok = (n, c, i) => res.push([!!c, n, i]);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const A = await openMori(file, { who: 'A' });
  const pa = A.page;
  const until = async (page, fn, arg, ms) => { try { await page.waitForFunction(fn, arg, { timeout: ms || 8000 }); return true; } catch (e) { return false; } };
  const sheet = page => page.evaluate(() => document.querySelector('#sheet').hidden ? '' : document.querySelector('#sheet').innerText.replace(/\s+/g, ' '));
  const run = (page, sec) => page.evaluate(s => window.__mori.tick(s), sec || .5);

  // ---------- 1. まだ聞いていない間は、1通も送らない ----------
  await run(pa, 1); await sleep(600);
  let r = await pa.evaluate(() => { const m = window.__mori; return { net: m.S.net, st: m.NET.st, lib: typeof window.supabase, chip: document.querySelector('#netb').textContent, hidden: document.querySelector('#netb').hidden }; });
  ok('N1 まだ聞いていない: つながない・部品も読まない・1通も送らない', r.net === undefined && r.st === 'off' && r.lib === 'undefined' && RELAY.log.length === 0 && RELAY.frames.length === 0, JSON.stringify(r) + ' relay=' + RELAY.log.length);
  ok('N1b 左上に「👥 ほかの旅人と遊ぶ」の札が出ている', r.chip === '👥 ほかの旅人と遊ぶ' && r.hidden === false, JSON.stringify(r));

  // 初めての時は1回だけこちらから聞く
  r = await pa.evaluate(async () => { const m = window.__mori; m.S.netAsk = undefined; m.NET.old = true; m.toastClear(); const t0 = performance.now(); return t0; });
  await sleep(Math.max(0, 9500 - r)); await run(pa, .3);
  let t = await sheet(pa);
  ok('N2 初めての時に1回だけ聞く板が出る（見える物・見えない物・通り道が書いてある）', /ほかの旅人と同じ森に入る/.test(t) && /相手に見える/.test(t) && /居場所/.test(t) && /見えない/.test(t) && /Supabase/.test(t) && /同じ森に入る/.test(t) && /ひとりで遊ぶ/.test(t), t.slice(0, 120));
  if (shots) { await sleep(250); await pa.screenshot({ path: shots + '/7_同じ森に入るか.png' }); }
  await pa.evaluate(() => document.querySelector('#x').click()); await run(pa, 1); await sleep(400);
  r = await pa.evaluate(() => { const m = window.__mori; return { net: m.S.net, ask: m.S.netAsk, st: m.NET.st, sheet: !document.querySelector('#sheet').hidden }; });
  ok('N3 「とじる」は同意にしない（未定のまま・つながない・もう勝手には出ない）', r.net === undefined && r.ask === 1 && r.st === 'off' && !r.sheet && RELAY.log.length === 0, JSON.stringify(r));

  // ---------- 2. 入る ----------
  await pa.evaluate(() => { document.querySelector('#netb').click(); document.querySelector('#sheet [data-a="net:yes"]').click(); });
  let joined = await until(pa, () => window.__mori.NET.st === 'on', null, 10000);
  r = await pa.evaluate(() => ({ st: window.__mori.NET.st, err: window.__mori.NET.err, net: window.__mori.S.net }));
  ok('N4 「同じ森に入る」→ 公式の部品でつながる', joined && r.net === 1, JSON.stringify(r) + ' ' + RELAY.log.slice(0, 4).join(' / '));
  ok('N4b 部屋の名前は realtime:mori-live-v1・自分の分は返ってこない設定', RELAY.log.some(l => /phx_join realtime:mori-live-v1/.test(l)) && RELAY.join && RELAY.join.config && RELAY.join.config.broadcast && RELAY.join.config.broadcast.self === false, JSON.stringify(RELAY.join && RELAY.join.config));
  await run(pa, .5); await sleep(300);
  t = await sheet(pa);
  ok('N5 ひとりの時は「自分だけ」と出る', /自分だけ/.test(t) && (await pa.evaluate(() => document.querySelector('#netb').textContent)) === '👥 旅人 0人', t.slice(0, 80));
  const f0 = RELAY.frames.filter(f => f.who === 'A'); const p0 = f0[0] && f0[0].body;
  ok('N6 送る中身は 番号・名前・帽子・場所・向き・見えるか の7つだけ', p0 && Object.keys(p0).sort().join(',') === 'a,h,i,n,v,x,z', JSON.stringify(p0));
  ok('N6b 名前が未設定なら「旅人」、番号は住民票や端末の番号と別の10けた', p0 && p0.n === '旅人' && /^[a-z0-9]{10}$/.test(p0.i), JSON.stringify(p0));

  // ---------- 3. B（ゆい）が入ってくる ----------
  const B = await openMori(file, { who: 'B' });
  const pb = B.page;
  await pb.evaluate(() => { const m = window.__mori; m.S.net = 1; m.S.pname = 'ゆい'; m.S.hat = 'p'; m.me.x = 3; m.me.z = 9; m.me.path = []; });
  await pa.evaluate(() => { const m = window.__mori; document.querySelector('#x') && document.querySelector('#x').click(); m.me.x = 0; m.me.z = 13; m.me.path = []; m.CAM.yaw = 0; });
  await until(pb, () => window.__mori.NET.st === 'on', null, 10000);
  const sawB = await until(pa, () => window.__mori.NET.n === 1, null, 8000), sawA = await until(pb, () => window.__mori.NET.n === 1, null, 8000);
  ok('N7 2台が互いを見つける（A→B・B→A）', sawB && sawA, 'A sees ' + sawB + ' / B sees ' + sawA);
  await run(pa, .6); await sleep(300); await run(pa, .3);
  r = await pa.evaluate(() => { const m = window.__mori, p = Object.values(m.NET.peers)[0]; if (!p) return {}; return { name: p.name, hat: p.hat, x: +p.x.toFixed(1), z: +p.z.toFixed(1), vis: p.sp.visible, tag: p.tag.visible, hit: m.hitsAll().indexOf(p.hit) >= 0, chip: document.querySelector('#netb').textContent, toast: JSON.stringify(m.toastNow()) }; });
  ok('N8 Aの森に ゆい が名前・紫の帽子・その場所で出る', r.name === 'ゆい' && r.hat === 'p' && r.x === 3 && r.z === 9 && r.vis && r.tag && r.hit && r.chip === '👥 旅人 1人', JSON.stringify(r));
  ok('N8b 来た時にお知らせが出る', /ゆいが森にいる/.test(r.toast), r.toast);

  // 歩く
  await pb.evaluate(() => { const m = window.__mori; m.me.x = 6; m.me.z = 11; m.tick(.3); }); await sleep(700); await pb.evaluate(() => window.__mori.tick(.3)); await sleep(400);
  r = await pa.evaluate(() => { const m = window.__mori, p = Object.values(m.NET.peers)[0]; const x0 = p.x, z0 = p.z, tx = p.tx, tz = p.tz; m.tick(.1); const mid = [p.x, p.z]; m.tick(2); return { tx, tz, x0: +x0.toFixed(2), mid: mid.map(v => +v.toFixed(2)), end: [+p.x.toFixed(2), +p.z.toFixed(2)] }; });
  ok('N9 ゆい が歩くと、Aの画面でも歩いて追いつく（飛ばない）', r.tx === 6 && r.tz === 11 && Math.abs(r.end[0] - 6) < .1 && Math.abs(r.end[1] - 11) < .1 && (r.mid[0] > 3 && r.mid[0] < 5.9), JSON.stringify(r));

  // ひとこと
  await pb.evaluate(() => { const m = window.__mori; m.toastClear(); m.netSay('やあ！いま池にいるよ'); });
  const got = await until(pa, () => window.__mori.NET.log.some(l => l[1] === 'やあ！いま池にいるよ'), null, 5000);
  r = await pa.evaluate(() => { const m = window.__mori, p = Object.values(m.NET.peers)[0]; return { log: m.NET.log.slice(-1)[0], bub: m.says().some(s => s.o === p), toast: JSON.stringify(m.toastNow()) }; });
  ok('N10 ゆい のひとことが A に届いて、頭の上に吹き出しが出る', got && r.log && r.log[0] === 'ゆい' && r.bub && /ゆい「やあ！いま池にいるよ」/.test(r.toast), JSON.stringify(r));
  if (shots) { await pa.evaluate(() => { const m = window.__mori; m.toastClear(); m.me.x = 6; m.me.z = 16; m.me.path = []; m.CAM.yaw = 0; m.tick(.4); m.draw(); }); await sleep(300); await pa.screenshot({ path: shots + '/8_ゆいが見える.png' }); }

  // ふるい（送る側）
  await sleep(1300);
  r = await pb.evaluate(() => { const m = window.__mori; m.netSay('電話は090-1234-5678だよ ばか'); return m.NET.log.slice(-1)[0]; });
  await until(pa, () => window.__mori.NET.log.length >= 2, null, 5000);
  const lastA = await pa.evaluate(() => window.__mori.NET.log.slice(-1)[0]);
  const sent = RELAY.frames.filter(f => f.who === 'B' && f.ev === 'c').slice(-1)[0];
  ok('N11 電話番号と禁止ワードは、送る前に ＊ になる（中継を通る中身も伏せ字）', sent && !/090|5678|ばか/.test(sent.body.t) && /＊/.test(sent.body.t) && lastA[1] === sent.body.t, JSON.stringify(sent && sent.body) + ' / A=' + JSON.stringify(lastA));
  // ふるい（受ける側）: 改造した相手が生のまま送ってきても伏せる
  r = await pa.evaluate(() => { const m = window.__mori, id = Object.keys(m.NET.peers)[0], out = []; const p = m.NET.peers[id];
    ['LINEのID yui_0123 だよ', 'https://example.com/aaa みて', '@yui_chan フォローして', '<b>太字</b>', 'でんわ ０９０ー１２３４ー５６７８'].forEach(s => { p.saidAt = 0; m.netSaid({ i: id, t: s }); out.push(m.NET.log.slice(-1)[0][1]); }); return out; });
  ok('N12 受ける側でも同じふるい: SNSのID・リンク・@・タグ・全角の電話番号が伏せ字', r.length === 5 && !/yui_0123/.test(r[0]) && !/example/.test(r[1]) && !/yui_chan/.test(r[2]) && !/[<>]/.test(r[3]) && !/１２３４/.test(r[4]), JSON.stringify(r));
  r = await pa.evaluate(() => { const m = window.__mori; return [m.netClean('こんにちは、きょうは3匹釣れた！'), m.netClean('あと10分で行くね'), m.netClean('2026年10月10日'), m.netName('ばかやろう'), m.netName('  ゆい  '), m.netName('<b>')]; });
  ok('N12b ふつうの文は変えない（数字・日付もそのまま）／名前は分身と同じ決まり', r[0] === 'こんにちは、きょうは3匹釣れた！' && r[1] === 'あと10分で行くね' && r[2] === '2026年10月10日' && r[3] === '旅人' && r[4] === 'ゆい' && r[5] === '旅人', JSON.stringify(r));

  // 板
  await pa.evaluate(() => window.__mori.netOpen()); t = await sheet(pa);
  ok('N13 板に いまいる旅人・やり取り・スタンプ6個・ひとこと欄・名前・字を見ない・ひとりで遊ぶ がある', /いま森にいる旅人 1人/.test(t) && /ゆい/.test(t) && /字を見ない/.test(t) && /ひとりで遊ぶ/.test(t) && (await pa.evaluate(() => document.querySelectorAll('#sheet [data-a^="net:st:"]').length)) === 6 && (await pa.evaluate(() => !!document.querySelector('#netin') && !!document.querySelector('#netname'))), t.slice(0, 100));
  if (shots) { await sleep(250); await pa.screenshot({ path: shots + '/9_ほかの旅人の板.png' }); }
  const fit = await pa.evaluate(() => { const s = document.querySelector('#sheet'), st = document.querySelector('#stage'); return [s.getBoundingClientRect().top >= st.getBoundingClientRect().top, s.scrollHeight, s.clientHeight]; });
  ok('N13b 板が画面からはみ出さない', fit[0], JSON.stringify(fit));

  // 字を見ない
  await pa.evaluate(() => document.querySelector('#sheet [data-a^="net:mute:"]').click());
  const n0 = await pa.evaluate(() => window.__mori.NET.log.length);
  await sleep(1300); await pb.evaluate(() => window.__mori.netSay('きこえる？')); await sleep(900);
  r = await pa.evaluate(() => { const m = window.__mori; return { n: m.NET.log.length, btn: document.querySelector('#sheet [data-a^="net:mute:"]').innerText, vis: Object.values(m.NET.peers)[0].sp.visible }; });
  ok('N14 「字を見ない」にすると ゆい のひとことだけ届かなくなる（姿は見える）', r.n === n0 && r.btn === '字を見る' && r.vis, JSON.stringify(r) + ' n0=' + n0);
  await pa.evaluate(() => { document.querySelector('#sheet [data-a^="net:mute:"]').click(); document.querySelector('#x').click(); });

  // 名前を変える
  await pb.evaluate(() => { const m = window.__mori; m.netOpen(); document.querySelector('#netname').value = 'ゆいぴ'; document.querySelector('#sheet [data-a="net:name"]').click(); });
  const renamed = await until(pa, () => { const p = Object.values(window.__mori.NET.peers)[0]; return p && p.name === 'ゆいぴ'; }, null, 5000);
  r = await pb.evaluate(() => { const m = window.__mori; document.querySelector('#netname').value = 'ばか'; document.querySelector('#sheet [data-a="net:name"]').click(); return [m.S.pname, document.querySelector('#msg').innerText]; });
  ok('N15 名前を変えると相手の画面でも変わる／使えない名前は通らない', renamed && r[0] === 'ゆいぴ' && /使えない/.test(r[1]), JSON.stringify(r));
  await pb.evaluate(() => document.querySelector('#x').click());

  // 役場の中に入ったら消える
  await pb.evaluate(() => { const m = window.__mori; m.yakEnter(); m.tick(.3); }); await sleep(600); await pb.evaluate(() => window.__mori.tick(.3)); await sleep(500); await run(pa, .3);
  r = await pa.evaluate(() => { const m = window.__mori, p = Object.values(m.NET.peers)[0]; return { n: m.NET.n, vis: p.sp.visible, tag: p.tag.visible, hit: m.hitsAll().indexOf(p.hit) >= 0 }; });
  ok('N16 ゆい が役場に入ると、Aの森から姿が消える（いる人数には数える）', r.n === 1 && !r.vis && !r.tag && !r.hit, JSON.stringify(r));
  await pb.evaluate(() => { const m = window.__mori; m.exitRoom(); m.tick(.3); }); await sleep(600); await pb.evaluate(() => window.__mori.tick(.3)); await sleep(500); await run(pa, .3);
  r = await pa.evaluate(() => Object.values(window.__mori.NET.peers)[0].sp.visible);
  ok('N16b 外に出ると、また見える', r === true, String(r));

  // 回数: 止まっている間は4秒に1通まで
  await sleep(500); const c0 = RELAY.frames.length; await sleep(3200); for (let i = 0; i < 4; i++) { await run(pa, .2); await run(pb, .2); }
  const idle = RELAY.frames.length - c0;
  ok('N17 2人とも止まっている3秒間に送るのは合わせて2通まで', idle <= 2, idle + '通');
  const c1 = RELAY.frames.filter(f => f.who === 'B' && f.ev === 'p').length; const t1 = Date.now();
  for (let i = 0; i < 30; i++) { await pb.evaluate(i => { const m = window.__mori; m.me.x = 6 + i * .3; m.tick(.05); }, i); await sleep(100); }
  const dtS = (Date.now() - t1) / 1000, movN = RELAY.frames.filter(f => f.who === 'B' && f.ev === 'p').length - c1;
  ok('N17b 歩いている間は1秒4通まで（2人の時）', movN / dtS <= 4.6 && movN / dtS >= 2, (movN / dtS).toFixed(1) + '通/秒（' + movN + '通・' + dtS.toFixed(1) + '秒）');

  // 出ていく
  await pa.evaluate(() => window.__mori.toastClear());
  await pb.evaluate(() => { const m = window.__mori; m.netOpen(); document.querySelector('#sheet [data-a="net:no"]').click(); });
  const gone = await until(pa, () => window.__mori.NET.n === 0, null, 5000);
  r = await pa.evaluate(() => ({ toast: JSON.stringify(window.__mori.toastNow()), chip: document.querySelector('#netb').textContent, hits: window.__mori.hitsAll().filter(h => String(h.id).indexOf('net_') === 0).length }));
  const rb = await pb.evaluate(() => ({ net: window.__mori.S.net, st: window.__mori.NET.st, n: window.__mori.NET.n, chip: document.querySelector('#netb').textContent }));
  ok('N18 ゆい が「ひとりで遊ぶ」→ Aの森からすぐ消えてお知らせが出る', gone && /ゆいぴが森を出た/.test(r.toast) && r.chip === '👥 旅人 0人' && r.hits === 0, JSON.stringify(r));
  ok('N18b ゆい の側は切れて、札が「ひとりで遊び中」', rb.net === 0 && rb.st === 'off' && rb.n === 0 && rb.chip === '👥 ひとりで遊び中', JSON.stringify(rb));
  const cB = RELAY.frames.filter(f => f.who === 'B').length; await pb.evaluate(() => { const m = window.__mori; m.me.x = 0; m.tick(1); }); await sleep(800);
  ok('N18c 切ったあとは1通も送らない', RELAY.frames.filter(f => f.who === 'B').length === cB, String(RELAY.frames.filter(f => f.who === 'B').length - cB));

  // 急にいなくなった時（電波が切れた・閉じた）は12秒で消える
  await pb.evaluate(() => { const m = window.__mori; m.S.net = 1; m.tick(.2); }); await until(pa, () => window.__mori.NET.n === 1, null, 8000);
  r = await pa.evaluate(() => { const m = window.__mori, p = Object.values(m.NET.peers)[0]; if (!p) return -1; p.at = performance.now() - 13000; m.tick(.1); return m.NET.n; });
  ok('N19 12秒たよりが無い旅人は消える', r === 0, String(r));

  ok('N20 2画面ともエラー0件', A.errors.length === 0 && B.errors.length === 0, A.errors.concat(B.errors).join(' | ').slice(0, 300));
  await B.browser.close();

  // ---------- 4. つながらない時 ----------
  RELAY.refuse = true;
  await pa.evaluate(() => { const m = window.__mori; m.netStop(); m.NET.said = 0; }); await run(pa, .2);
  const ng = await until(pa, () => window.__mori.NET.st === 'ng', null, 20000);
  r = await pa.evaluate(() => { const m = window.__mori; m.me.x = 0; m.me.z = 12; m.tick(1); m.openLot(82); return { st: m.NET.st, err: m.NET.err, chip: document.querySelector('#netb').textContent, h2: document.querySelector('#sheet h2').innerText, logged: m.log.L.list.some(e => e.kind === 'net') }; });
  ok('N21 中継に断られても森は今までどおり動く・札は「つながらない」・理由が記録に残る', ng && r.chip === '👥 つながらない' && r.h2 === 'みんなの畑' && r.logged, JSON.stringify(r));
  await A.browser.close();
  RELAY.refuse = false;

  // そもそも中継に届かない時（電波・ブロック）
  RELAY.refuseConnect = true;
  const D = await openMori(file, { who: 'D' });
  await D.page.evaluate(() => { const m = window.__mori; m.S.net = 1; m.tick(.3); });
  const ng3 = await until(D.page, () => window.__mori.NET.st === 'ng', null, 25000);
  r = await D.page.evaluate(() => { const m = window.__mori; m.tick(.5); m.openLot(82); return { st: m.NET.st, err: m.NET.err, chip: document.querySelector('#netb').textContent, h2: document.querySelector('#sheet h2').innerText }; });
  ok('N21b 中継に届かない時も森は動く・札は「つながらない」', ng3 && r.chip === '👥 つながらない' && r.h2 === 'みんなの畑' && D.errors.length === 0, JSON.stringify(r) + ' ' + D.errors.join('|').slice(0, 200));
  await D.browser.close(); RELAY.refuseConnect = false;

  // 部品が読めない開き方（Claudeの中など）
  const C = await openMori(file, { who: 'C', noLib: true });
  await C.page.evaluate(() => { const m = window.__mori; m.S.net = 1; m.tick(.3); });
  const ng2 = await until(C.page, () => window.__mori.NET.st === 'ng', null, 8000);
  r = await C.page.evaluate(() => ({ err: window.__mori.NET.err, chip: document.querySelector('#netb').textContent }));
  ok('N22 中継の部品が読めない開き方でも落ちない（札は「つながらない」）', ng2 && /読めない/.test(r.err) && C.errors.length === 0, JSON.stringify(r) + ' ' + C.errors.join('|'));
  await C.browser.close();

  let bad = 0; res.forEach(x => { if (!x[0]) bad++; console.log((x[0] ? 'OK ' : 'NG ') + x[1] + (x[0] ? '' : '\n     → ' + String(x[2]).slice(0, 460))); });
  console.log('\n' + res.length + '本中' + (res.length - bad) + '本OK' + (bad ? '　NG ' + bad + '本' : ''));
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
