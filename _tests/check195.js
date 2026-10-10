// v0.19.5 の検査: 畑・役場を売らない／魚10種／吹き出し。 node check195.js <index.html> [shots dir]
const { openMori } = require('./harness');
const fs = require('fs');
const file = process.argv[2], shots = process.argv[3];
const res = [];
const ok = (name, cond, info) => { res.push([!!cond, name, info]); };

(async () => {
  const { browser, page, errors } = await openMori(file);
  const sheet = () => page.evaluate(() => document.querySelector('#sheet').hidden ? '' : document.querySelector('#sheet').innerText.replace(/\s+/g, ' '));
  const h2 = () => page.evaluate(() => { const e = document.querySelector('#sheet h2'); return document.querySelector('#sheet').hidden || !e ? '' : e.innerText.trim(); });
  const has = (name) => page.evaluate(n => typeof window.__mori[n] !== 'undefined', name);

  // ---------- A. 畑と役場は売り物ではない ----------
  await page.evaluate(() => { const m = window.__mori; m.S.coin = 99999; });
  const lot0 = await page.evaluate(() => window.__mori.S.lot);
  await page.evaluate(() => window.__mori.openLot(82));
  ok('A1 畑82をひらくと「みんなの畑」', (await h2()) === 'みんなの畑' && !/引っ越す/.test(await sheet()), await sheet());
  await page.evaluate(() => window.__mori.openLot(85));
  let t = await sheet();
  ok('A2 畑85をひらくと「役場の畑」で引っ越しボタンが無い', (await h2()) === '役場の畑' && !/引っ越す/.test(t), t.slice(0, 80));
  ok('A2b 売れ残りの区画は「役場が売っている（30フカ）」', /畑11 荒地 役場が売っている（30フカ）/.test(t), t.slice(0, 200));
  ok('A2c 住人の区画は名前が出る（yakuba の生の字は出ない）', /畑10 .*ハルの畑/.test(t) && !/yakuba/.test(t), t.slice(0, 200));
  await page.evaluate(() => window.__mori.openLot(82)); t = await sheet();
  ok('A2d 借りている区画は貸し主も出る', /畑3 .*リンの畑（ハルから借りている）/.test(t), t.slice(0, 260));
  await page.evaluate(() => window.__mori.openLot(52)); t = await sheet();
  ok('A3 役場52は「森の役場」で売っていない', (await h2()) === '森の役場' && /売っていない/.test(t) && /役場に入る/.test(t), t);
  const mv = await page.evaluate(() => { const m = window.__mori; return [m.moveLot(82), m.moveLot(85), m.moveLot(52), m.S.lot]; });
  ok('A4 畑・役場へは引っ越せない（家は元のまま）', mv[0] === false && mv[1] === false && mv[2] === false && mv[3] === lot0, JSON.stringify(mv));

  // 実際のタッチ: 2つの畑の間の道に立ち、南の畑の地面をタッチ → 歩いて着く → 板
  const tap = await page.evaluate(() => {
    const m = window.__mori, a = m.lots[82], b = m.lots[85];
    m.open('log'); document.querySelector('#x').click();
    m.me.x = (a.cx + b.cx) / 2; m.me.z = (a.cz + b.cz) / 2; m.me.path = []; m.CAM.yaw = 0; m.tick(.5); m.draw();
    const s = m.screenOf(b.cx + 1, 0, b.cz - 3); const p = m.pick(s[0], s[1]);
    m.tapAt(s[0], s[1]); m.sim(20);
    return { pick: p, at: [m.me.x.toFixed(1), m.me.z.toFixed(1)] };
  });
  await page.waitForTimeout(200);
  t = await sheet();
  ok('A5 畑の地面をタッチ → 畑の板（空き地の板ではない）', tap.pick && tap.pick.type === 'plot' && tap.pick.id === 85 && (await h2()) === '役場の畑' && !/空き地|引っ越す/.test(t), JSON.stringify(tap) + ' / ' + t.slice(0, 50));
  if (shots) await page.screenshot({ path: shots + '/1_畑をタッチ.png' });

  // 地図
  const map = await page.evaluate(() => {
    const m = window.__mori, land = document.querySelector('#land'), o = {};
    document.querySelector('#x') && document.querySelector('#x').click();
    m.openLand(); m.renderLand(85);
    o.det85 = document.querySelector('#ldet').innerText; o.btn85 = !!land.querySelector('[data-l=move],[data-l=buy]');
    o.tile = [82, 85, 52].map(id => land.querySelector('[data-p="' + id + '"]').innerText);
    m.renderLand(1); o.det1 = document.querySelector('#ldet').innerText; o.btn1 = !!land.querySelector('[data-l=move],[data-l=buy]');
    const out = m.lots.filter(l => !m.lotInZone(l.id))[0];
    m.renderLand(out.id); o.detOut = document.querySelector('#ldet').innerText; o.btnOut = !!land.querySelector('[data-l=move],[data-l=buy]');
    const lot = m.S.lot;
    o.buyAI = m.buyLot(1); o.buyOut = m.buyLot(out.id); o.mvOut = m.moveLot(out.id); o.lotSame = m.S.lot === lot;
    // ふつうの空き地は今までどおり買える
    const free = m.lots.filter(l => m.lotInZone(l.id) && !m.resOf(l.id) && !m.isMine(l.id) && !m.SKIPLOT[l.id] && [30, 80].indexOf(l.id) < 0)[0];
    o.free = free ? free.id : null;
    if (free) { m.renderLand(free.id); o.detFree = document.querySelector('#ldet').innerText; o.btnFree = !!land.querySelector('[data-l=move]:not([disabled])'); }
    const c = m.landCount(); o.cnt = c.S[1] + c.M[1] + c.L[1];
    o.cntTrue = m.lots.filter(l => m.lotInZone(l.id) && !m.resOf(l.id) && !m.isMine(l.id) && !m.SKIPLOT[l.id]).length;
    m.renderLand(85);
    return o;
  });
  ok('A6 地図: 畑を選ぶと「売っていない」でボタンが無い', /売っていない/.test(map.det85) && !map.btn85, map.det85);
  ok('A6b 地図のマスに 畑・畑・役 と出る', map.tile.join(',') === '畑,畑,役', map.tile.join(','));
  ok('A7 地図: AIの住人の家は買えない', /売っていない/.test(map.det1) && !map.btn1 && map.buyAI === '', map.det1 + ' buy=' + JSON.stringify(map.buyAI));
  ok('A8 地図: 立入禁止の先は買えない・引っ越せない', /まだ森/.test(map.detOut) && !map.btnOut && map.buyOut === '' && map.mvOut === false && map.lotSame, map.detOut);
  ok('A9 ふつうの空き地は今までどおり引っ越せる', map.free !== null && /空き地/.test(map.detFree) && map.btnFree, map.detFree);
  ok('A11 「空き」の数が、本当に買える土地の数と同じ', map.cnt === map.cntTrue, map.cnt + ' vs ' + map.cntTrue);
  if (shots) { await page.waitForTimeout(300); await page.screenshot({ path: shots + '/2_地図で畑.png' }); }
  const moved = await page.evaluate(id => { const m = window.__mori; document.querySelector('#land [data-l=close]').click(); const r = m.moveLot(id); return [r, m.S.lot]; }, map.free);
  ok('A9b 空き地へ実際に引っ越せる', moved[0] === true && moved[1] === map.free, JSON.stringify(moved));

  // 看板に近づくと「畑を見る」
  const sign = await page.evaluate(() => {
    const m = window.__mori, o = {}; if (!m.SPOT.farm82) return { none: 1 }; if (!document.querySelector('#sheet').hidden) document.querySelector('#x').click();
    const sp = m.SPOT.farm82; m.me.x = sp.ax; m.me.z = sp.az; m.me.path = []; m.tick(.5);
    const b = document.querySelector('#act'); o.txt = b.hidden ? '' : b.textContent; b.click(); return o;
  });
  ok('A10 看板のそばで「畑を見る」→ 畑の板', sign.txt === '畑を見る' && (await h2()) === 'みんなの畑', JSON.stringify(sign) + ' h2=' + (await h2()));

  // ---------- B. リュックから売れるのはそのまま ----------
  const bag = await page.evaluate(() => {
    const m = window.__mori, o = {}; m.S.bag = []; m.bagAdd({ k: '魚', name: '池の常連', cm: 50, price: 5, fk: 'a' }); const c0 = m.S.coin; m.bagOpen();
    const b = document.querySelector('#sheet [data-a^="bag:sell"]'); o.btn = b ? b.innerText : ''; if (b) b.click(); o.gain = m.S.coin - c0; o.left = m.S.bag.length; return o;
  });
  ok('B1 リュックの「売る」は残っていて、押すと売れる', /売る ＋5/.test(bag.btn) && bag.gain === 5 && bag.left === 0, JSON.stringify(bag));

  // ---------- C. 魚10種 ----------
  const fish = await page.evaluate(() => {
    const m = window.__mori, o = {}, D = m.FISHDEF;
    o.n = D.length; o.keys = D.map(d => d.k).join(''); o.names = D.map(d => d.n);
    o.spawn = D.map(d => m.fish().filter(f => f.D.k === d.k).length + '/' + d.cnt).join(' ');
    o.str = m.RODS_STR ? D.every(d => typeof m.RODS_STR[d.k] === 'number') : null;
    if (!m.rodPick) return o;
    const dist = (n) => { const c = {}; for (let i = 0; i < n; i++) { const d = m.rodPick((i + .5) / n); c[d.k] = (c[d.k] || 0) + 1; } return c; };
    m.V15.slot = 10; m.V15.weather = '晴れ'; o.fine = dist(20000);
    m.V15.weather = '雨'; o.rain = dist(20000);
    m.V15.weather = '晴れ'; m.V15.slot = 5; o.dawn = dist(20000);
    m.V15.slot = 10;
    // 池のそばで動かす → 条件つきの魚は消える／雨にすると出る
    const pond = m.fish()[0]; m.me.x = pond.hx; m.me.z = pond.hz; m.tick(.3);
    const cond = () => m.fish().filter(f => f.D.when).map(f => f.D.k + ':' + f.st + ':' + (f.sp.visible ? 'v' : 'h')).join(' ');
    o.condFine = cond(); m.V15.weather = '嵐'; m.tick(.3); o.condStorm = cond(); m.V15.weather = '晴れ'; m.V15.slot = 4; m.tick(.3); o.condDawn = cond(); m.V15.slot = 10; m.tick(.3);
    m.me.x = 0; m.me.z = 6;
    return o;
  });
  ok('C1 魚が10種類（a〜j）', fish.n === 10 && fish.keys === 'abcdefghij', fish.n + ' ' + (fish.names || []).join('・'));
  ok('C2 どの魚も池に決めた数だけいる', fish.spawn && fish.spawn.split(' ').every(s => { const p = s.split('/'); return p[0] === p[1]; }), fish.spawn);
  ok('C2b 全部の魚に「引きの強さ」がある', fish.str === true, String(fish.str));
  const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
  ok('C3 竿: 晴れの昼は 雨宿り・朝帰り が釣れず、ほかの8種は全部釣れる', fish.fine && !fish.fine.h && !fish.fine.i && 'abcdefgj'.split('').every(k => fish.fine[k] > 0) && sum(fish.fine) === 20000, JSON.stringify(fish.fine));
  ok('C3b 竿: 雨の日は 雨宿り が釣れる（朝帰りは釣れない）', fish.rain && fish.rain.h > 0 && !fish.rain.i, JSON.stringify(fish.rain));
  ok('C3c 竿: 朝5時は 朝帰り が釣れる（雨宿りは釣れない）', fish.dawn && fish.dawn.i > 0 && !fish.dawn.h, JSON.stringify(fish.dawn));
  if (fish.fine) { const f = fish.fine, r = (k, w) => Math.abs(f[k] / 20000 - w / 99.1) < .004; ok('C3d 竿の割合が決めた重みどおり', r('a', 40) && r('b', 20) && r('c', 12) && r('d', 6.5) && r('e', 1.6) && r('f', 10) && r('g', 6) && r('j', 3), 'a=' + (f.a / 200).toFixed(1) + '% e=' + (f.e / 200).toFixed(1) + '% f=' + (f.f / 200).toFixed(1) + '% j=' + (f.j / 200).toFixed(1) + '%'); }
  ok('C4 銛: 晴れの昼は条件つきの魚が池にいない', fish.condFine && fish.condFine.split(' ').every(s => /:away:h$/.test(s)), fish.condFine);
  ok('C4b 銛: 嵐になると 雨宿り だけ出てくる', fish.condStorm && fish.condStorm.split(' ').every(s => s[0] === 'h' ? /:swim:/.test(s) : /:away:h$/.test(s)), fish.condStorm);
  ok('C4c 銛: 朝4時は 朝帰り だけ出てくる', fish.condDawn && fish.condDawn.split(' ').every(s => s[0] === 'i' ? /:swim:/.test(s) : /:away:h$/.test(s)), fish.condDawn);

  const book = await page.evaluate(() => {
    const m = window.__mori, o = {}; m.S.book = {}; m.S.bookAll = 0; m.S.bookAll2 = 0; m.toastClear();
    m.open('rec'); o.empty = document.querySelector('#sheet').innerText.replace(/\s+/g, ' '); o.rows = document.querySelectorAll('#sheet .zk button').length;
    document.querySelector('#sheet [data-a="zk:h"]').click(); o.empty += ' ' + document.querySelector('#sheet .zkd').innerText.replace(/\s+/g, ' '); document.querySelector('#sheet [data-a="zk:i"]').click(); o.empty += ' ' + document.querySelector('#sheet .zkd').innerText.replace(/\s+/g, ' ');
    if (!m.bookAdd) return o;
    let c = m.S.coin; 'abcde'.split('').forEach(k => m.bookAdd(k, 40)); o.five = m.S.coin - c; o.all1 = m.S.bookAll; o.all2a = m.S.bookAll2 || 0;
    c = m.S.coin; 'fghij'.split('').forEach(k => m.bookAdd(k, 40)); o.ten = m.S.coin - c; o.all2 = m.S.bookAll2;
    c = m.S.coin; m.bookAdd('a', 41); o.again = m.S.coin - c;
    m.open('rec'); o.full = document.querySelector('#sheet').innerText.replace(/\s+/g, ' ');
    const sh = document.querySelector('#sheet'); o.fit = sh.scrollHeight <= sh.clientHeight + 1; o.h = sh.scrollHeight + '/' + sh.clientHeight;
    // 前の版で5種そろえて75フカをもらった人: もう1回はもらえない
    m.S.book = { a: { n: 1, max: 1 }, b: { n: 1, max: 1 }, c: { n: 1, max: 1 }, d: { n: 1, max: 1 }, e: { n: 1, max: 1 } }; m.S.bookAll = 1; m.S.bookAll2 = 0; c = m.S.coin; m.bookAdd('f', 30); o.old = m.S.coin - c;
    m.toastClear(); return o;
  });
  ok('C5 図鑑: 0/10 で10ます、条件つきの魚に手がかりが出る', /図鑑 0\/10/.test(book.empty) && book.rows === 10 && /雨か嵐の時だけ出る/.test(book.empty) && /朝の4〜9時だけ出る/.test(book.empty), book.rows + '行 ' + (book.empty || '').slice(0, 40));
  ok('C6 図鑑: はじめの5種で 5×5＋75＝100フカ（10種ぶんはまだ）', book.five === 100 && book.all1 === 1 && book.all2a === 0, JSON.stringify([book.five, book.all1, book.all2a]));
  ok('C6b 図鑑: 残り5種で 5×5＋150＝175フカ、同じ魚をもう1回獲っても増えない', book.ten === 175 && book.all2 === 1 && book.again === 0, JSON.stringify([book.ten, book.all2, book.again]));
  ok('C6c 前の版で75フカをもらった人は、二重にもらえない（新しい魚の5フカだけ）', book.old === 5, String(book.old));
  ok('C6d 図鑑10行がスクロールなしで板に収まる', book.fit === true, book.h);
  if (shots) { await page.evaluate(() => { const m = window.__mori; m.S.book = { a: { n: 3, max: 51 }, f: { n: 2, max: 30 }, g: { n: 1, max: 55 } }; m.open('rec'); }); await page.waitForTimeout(200); await page.screenshot({ path: shots + '/3_図鑑.png' }); }

  const land = await page.evaluate(() => {
    const m = window.__mori, o = {}; document.querySelector('#x') && document.querySelector('#x').click(); m.S.bag = []; m.toastClear();
    // 銛で獲った新しい魚が、水面でリュックに入る
    m.DV.catch.push({ k: 'g', price: 20, head: true, cm: 55 }, { k: 'j', price: 60, head: false, cm: 120 }); m.dive.bank();
    o.bag = m.S.bag.map(b => b.name + ':' + b.price).join(' ');
    return o;
  });
  ok('C8 銛で獲った新しい魚がリュックに入る（急所は値段1.2倍）', land.bag === '見栄っぱり:24 ご隠居:60', land.bag);

  // 竿で最後まで釣る（新しい魚を選ばせる）
  const rod = await page.evaluate(() => {
    const m = window.__mori, o = {}; m.S.bag = []; m.toastClear(); const R0 = Math.random;
    const sp = m.SPOT.rod0; m.me.x = sp.ax; m.me.z = sp.az; m.me.path = []; m.tick(.2);
    m.rod.start(0); let guard = 0;
    while (m.FS.on && m.FS.st !== 'bite' && guard++ < 2000) m.tick(.05);
    o.st = m.FS.st;
    Math.random = () => .955; // 重みの並びで「ご隠居」あたりに落ちる所
    m.rod.tap(); Math.random = R0; o.fish = m.FS.fish && m.FS.fish.k; o.cm = m.FS.cm;
    guard = 0; while (m.FS.on && guard++ < 4000) { if (m.FS.run) m.rod.up(); else m.rod.down(); m.tick(1 / 30); }
    o.bag = m.S.bag.map(b => b.name + ':' + b.price + ':' + b.cm).join(' '); o.on = m.FS.on; return o;
  });
  ok('C7 竿: 新しい魚がかかって、引いて、リュックに入る', rod.st === 'bite' && 'fghij'.indexOf(rod.fish) >= 0 && rod.bag.length > 0 && !rod.on, JSON.stringify(rod));


  // ---------- Z. 魚図鑑（絵つき） ----------
  const zk = await page.evaluate(async () => {
    const m = window.__mori, o = {}; document.querySelector('#x') && document.querySelector('#x').click();
    m.S.book = { a: { n: 12, max: 58 }, c: { n: 2, max: 61 }, g: { n: 1, max: 55 } }; m.ZK.sel = '';
    m.bagOpen(); const zb = document.querySelector('#sheet [data-a="zukan"]'); o.bagBtn = zb ? zb.innerText : ''; zb && zb.click();
    o.h2 = document.querySelector('#sheet h2').innerText; o.tiles = document.querySelectorAll('#sheet .zk button').length;
    const imgs = [...document.querySelectorAll('#sheet .zk img')]; o.imgs = imgs.length; o.sil = imgs.filter(i => i.classList.contains('no')).length; o.data = imgs.every(i => /^data:image\/png;base64,/.test(i.src) && i.src.length > 5000);
    // 絵の中身: 魚の形が描けている（透明でも真っ黒でもない）
    const px = await Promise.all(Object.keys(m.ZK.img).map(k => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let on = 0, sum = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { on++; sum += d[i] + d[i + 1] + d[i + 2]; } res([k, +(on / (d.length / 4)).toFixed(2), Math.round(sum / Math.max(1, on) / 3), d[3]]); }; im.src = m.ZK.img[k]; })));
    o.px = px.map(p => p.join(':')).join(' '); o.pxOk = px.length === 10 && px.every(p => p[1] > .08 && p[1] < .75 && p[2] > 40 && p[3] === 0);
    o.detail = document.querySelector('#sheet .zkd').innerText.replace(/\s+/g, ' ');
    document.querySelector('#sheet [data-a="zk:j"]').click(); o.unk = document.querySelector('#sheet').innerText.replace(/\s+/g, ' '); o.unkAria = document.querySelector('#sheet [data-a="zk:j"]').getAttribute('aria-label');
    document.querySelector('#sheet [data-a="zk:g"]').click(); o.g = document.querySelector('#sheet .zkd').innerText.replace(/\s+/g, ' '); o.on = document.querySelector('#sheet .zk button.on').getAttribute('data-a');
    const sh = document.querySelector('#sheet'); o.fit = sh.scrollHeight <= sh.clientHeight + 1;
    document.querySelector('#sheet [data-a="bag"]').click(); o.back = document.querySelector('#sheet h2').innerText;
    m.open('rec'); o.rec = document.querySelector('#sheet h2').innerText + '/' + document.querySelectorAll('#sheet .zk button').length; document.querySelector('#sheet [data-a="rec:best"]').click(); o.best = document.querySelector('#sheet').innerText.replace(/\s+/g, ' ');
    document.querySelector('#x').click(); return o;
  });
  ok('Z1 リュックの「魚図鑑」から開ける・10ます・絵10枚（獲った3は色つき、まだの7は影）', zk.bagBtn === '魚図鑑' && zk.h2 === '魚図鑑' && zk.tiles === 10 && zk.imgs === 10 && zk.sil === 7 && zk.data, JSON.stringify([zk.bagBtn, zk.h2, zk.tiles, zk.imgs, zk.sil, zk.data]));
  ok('Z2 10種とも魚の形が描けている（面積・明るさ・角は透明）', zk.pxOk, zk.px);
  ok('Z3 獲った魚: 名前・値段・最大・匹数・深さ・ひとことが出る', /池の常連/.test(zk.detail) && /売ると 5フカ/.test(zk.detail) && /最大 58cm/.test(zk.detail) && /12匹/.test(zk.detail) && /底の深さ 0.9〜3.2m/.test(zk.detail) && /来ない日は/.test(zk.detail), zk.detail);
  ok('Z4 まだの魚: 名前もひとことも出さない（？？？・深さの手がかりだけ）', /？？？/.test(zk.unk) && !/ご隠居|昔は番人/.test(zk.unk) && zk.unkAria === 'まだ獲っていない魚' && /底の深さ 6.2〜8.4mのあたり/.test(zk.unk), zk.unk.slice(0, 120));
  ok('Z5 ますを押すとその魚に切り替わる・板に収まる・リュックに戻れる', /見栄っぱり/.test(zk.g) && zk.on === 'zk:g' && zk.fit && zk.back === 'リュック', JSON.stringify([zk.on, zk.fit, zk.back]));
  ok('Z6 池の看板の「池の記録」も同じ図鑑になり、「自己ベスト」は今までどおり', zk.rec === '池の記録/10' && /真珠貝/.test(zk.best) && /最大：58cm/.test(zk.best), zk.rec + ' ' + zk.best.slice(0, 80));

  // ---------- D. 吹き出し ----------
  const bub = await page.evaluate(() => {
    const m = window.__mori, o = {}; if (!m.bubLines) return { none: 1 };
    const real = ['ねむい〜。でもぉ、食べ物のためなら頑張っちゃおうかな〜。', '村の平和を守るため、見回りを続けるであります。', 'まあ、順調っす。種まきは済んだ。リンは何を？', '畑は資産。効率よく利用するですな。', 'あと一息で夢の店だよ！'];
    o.real = real.map(s => { const L = s.length > 11 ? m.bubLines(s) : [s]; return { n: s.length, lines: L, same: L.join('') === s, head: L.every(x => '、。！？!?…〜ー）」』,.'.indexOf(x.charAt(0)) < 0) }; });
    const long = 'きょうは朝から畑に水をやって、それから池で釣りをして、帰りに役場へ寄った。夕方はハルの家でごはんを食べた。あしたは雨らしいから、畑は休みにして家で寝るつもりだよ。';
    const L = m.bubLines(long); o.long = { n: long.length, lines: L, last: L.join('').slice(-1) };
    return o;
  });
  ok('D1 本物の住人のセリフ5本（最長28字）が、1字も欠けずに出る', bub.real && bub.real.every(r => r.same && r.lines.length <= 4), JSON.stringify((bub.real || []).map(r => r.n + '字→' + r.lines.length + '行')));
  ok('D1b 行の頭に句読点が来ない', bub.real && bub.real.every(r => r.head), JSON.stringify((bub.real || []).map(r => r.lines)));
  ok('D2 48字を超える長い文は4行までで、文の終わりで切る', bub.long && bub.long.lines.length <= 4 && /[。！？…]/.test(bub.long.last), JSON.stringify(bub.long));

  // 画面で見る: 住人の頭の上に28字のセリフ
  if (shots) {
    await page.evaluate(() => {
      const m = window.__mori; document.querySelector('#x') && document.querySelector('#x').click(); m.toastClear();
      const o = m.AIBY.popo; o.sleep = false; o.x = 2; o.z = 9; o.path = []; m.me.x = 2; m.me.z = 14; m.me.path = []; m.CAM.yaw = 0;
      const w = JSON.parse(JSON.stringify({ day: m.V15.day, slot: 10, weather: '晴れ', plots: m.V15.plots, shops: [] }));
      w.people = m.V15.people.map(p => Object.assign({}, p, p.id === 'popo' ? { place: o.place, say: 'ねむい〜。でもぉ、食べ物のためなら頑張っちゃおうかな〜。' } : {}));
      m.aiApply(w); o.x = 2; o.z = 9; o.path = []; m.tick(.4); m.draw();
    });
    await page.waitForTimeout(300); await page.screenshot({ path: shots + '/4_セリフ28字.png' });
  }

  // ---------- E. 全体 ----------
  const build = await page.evaluate(() => window.__mori.log.doc('t').build);
  ok('E1 版の印が 1010-1200', build === '1010-1200', build);
  ok('E2 画面のエラーが0件', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  let ng = 0; res.forEach(r => { if (!r[0]) ng++; console.log((r[0] ? 'OK ' : 'NG ') + r[1] + (r[0] ? '' : '\n     → ' + String(r[2]).slice(0, 420))); });
  console.log('\n' + res.length + '本中' + (res.length - ng) + '本OK' + (ng ? '　NG ' + ng + '本' : ''));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
