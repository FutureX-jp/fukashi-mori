const { openMori, RELAY } = require('./harness');
(async () => {
  const out = [];
  // 前の森（#v14）: 新しい物が出しゃばらない・エラーなし
  let X = await openMori(process.argv[2], { hash: '#v14', who: 'V' });
  let r = await X.page.evaluate(() => { const m = window.__mori; m.tick(1); m.openLot(82); const h = document.querySelector('#sheet h2').innerText; document.querySelector('#x').click(); m.open('rec'); const z = document.querySelectorAll('#sheet .zk button').length; return { on: m.V15.on, netb: document.querySelector('#netb').hidden, st: m.NET.st, h, z }; });
  out.push(['v14: 旅人の札は出ない・つながない・エラー0', r.on === false && r.netb === true && r.st === 'off' && X.errors.length === 0 && RELAY.log.length === 0, JSON.stringify(r) + X.errors.join('|')]);
  await X.browser.close();
  // PCの幅
  X = await openMori(process.argv[2], { viewport: { width: 1280, height: 720 }, dpr: 1, who: 'W' });
  r = await X.page.evaluate(() => { const m = window.__mori; m.S.book = { a: { n: 1, max: 50 } }; m.zukanOpen(); const s = document.querySelector('#sheet'), st = document.querySelector('#stage').getBoundingClientRect(), b = [...s.querySelectorAll('button')].map(x => x.getBoundingClientRect()); const top = s.getBoundingClientRect().top >= st.top - 1; m.netOpen(); const s2 = document.querySelector('#sheet'); const yes = s2.querySelector('[data-a="net:yes"]').getBoundingClientRect(); s2.scrollTop = 9999; const no = s2.querySelector('[data-a="net:no"]').getBoundingClientRect(); return { top, scroll: s.scrollHeight + '/' + s.clientHeight, reach: no.bottom <= st.bottom + 1 && no.top >= st.top - 1 }; });
  out.push(['1280×720: 図鑑と同意の板が舞台に収まり、ボタンに手が届く・エラー0', r.top && r.reach && X.errors.length === 0, JSON.stringify(r) + X.errors.join('|')]);
  await X.page.screenshot({ path: 'shots/10_PC幅.png' });
  await X.browser.close();
  // 小さいスマホ（360×640）
  X = await openMori(process.argv[2], { viewport: { width: 360, height: 640 }, who: 'S' });
  r = await X.page.evaluate(() => { const m = window.__mori; m.S.book = { a: { n: 1, max: 50 } }; m.zukanOpen(); const s = document.querySelector('#sheet'), st = document.querySelector('#stage').getBoundingClientRect(); const top = s.getBoundingClientRect().top >= st.top - 1; s.scrollTop = 9999; const b = s.querySelector('[data-a="bag"]').getBoundingClientRect(); const reach1 = b.bottom <= st.bottom + 1; m.netOpen(); const s2 = document.querySelector('#sheet'); s2.scrollTop = 9999; const no = s2.querySelector('[data-a="net:no"]').getBoundingClientRect(); return { top, reach1, reach2: no.bottom <= st.bottom + 1 && no.top >= st.top - 1, h: s2.scrollHeight + '/' + s2.clientHeight }; });
  out.push(['360×640: 板が長くてもスクロールで全部のボタンに手が届く・エラー0', r.top && r.reach1 && r.reach2 && X.errors.length === 0, JSON.stringify(r) + X.errors.join('|')]);
  await X.page.screenshot({ path: 'shots/11_小さいスマホ.png' });
  await X.browser.close();
  let ng = 0; out.forEach(o => { if (!o[1]) ng++; console.log((o[1] ? 'OK ' : 'NG ') + o[0] + (o[1] ? '' : '\n   → ' + o[2])); }); console.log(out.length + '本中' + (out.length - ng) + '本OK'); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
