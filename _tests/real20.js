// 本物の Supabase Realtime を通して2画面がつながるか（検査用の別の部屋を使う。本番の部屋 mori-live-v1 には入らない）
const { openMori } = require('./harness');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const topic = 'mori-test-' + Math.random().toString(36).slice(2, 10), out = [];
  const A = await openMori(process.argv[2], { who: 'A', real: true }), B = await openMori(process.argv[2], { who: 'B', real: true });
  const wsLog = [];
  [A, B].forEach((X, i) => X.page.on('websocket', ws => { wsLog.push('AB'[i] + ' open ' + ws.url().replace(/apikey=[^&]+/, 'apikey=…').slice(0, 90)); ws.on('close', () => wsLog.push('AB'[i] + ' close')); ws.on('socketerror', e => wsLog.push('AB'[i] + ' error ' + e)); }));
  const until = async (page, fn, ms) => { try { await page.waitForFunction(fn, null, { timeout: ms || 15000 }); return true; } catch (e) { return false; } };
  const t0 = Date.now();
  await A.page.evaluate(t => { const m = window.__mori; m.NET.TOPIC = t; m.S.pname = 'けんさA'; m.S.net = 1; m.me.x = 0; m.me.z = 13; m.tick(.2); }, topic);
  const aOn = await until(A.page, () => window.__mori.NET.st === 'on' || window.__mori.NET.st === 'ng', 25000);
  let r = await A.page.evaluate(() => ({ st: window.__mori.NET.st, err: window.__mori.NET.err }));
  out.push(['R1 本物の中継に、鍵だけで公開の部屋へ入れる', aOn && r.st === 'on', JSON.stringify(r) + ' ' + (Date.now() - t0) + 'ms / ' + wsLog.join(' | ')]);
  await B.page.evaluate(t => { const m = window.__mori; m.NET.TOPIC = t; m.S.pname = 'けんさB'; m.S.hat = 'p'; m.S.net = 1; m.me.x = 3; m.me.z = 9; m.tick(.2); }, topic);
  await until(B.page, () => window.__mori.NET.st === 'on' || window.__mori.NET.st === 'ng', 25000);
  const t1 = Date.now(); let seen = false;
  for (let i = 0; i < 40 && !seen; i++) { await A.page.evaluate(() => window.__mori.tick(.1)); await B.page.evaluate(() => window.__mori.tick(.1)); await sleep(250); seen = await A.page.evaluate(() => window.__mori.NET.n === 1) && await B.page.evaluate(() => window.__mori.NET.n === 1); }
  r = await A.page.evaluate(() => { const p = Object.values(window.__mori.NET.peers)[0]; return p ? { name: p.name, hat: p.hat, x: p.tx, z: p.tz } : null; });
  out.push(['R2 本物の中継ごしに、2画面が互いを見つける（名前・帽子・場所）', seen && r && r.name === 'けんさB' && r.hat === 'p' && r.x === 3 && r.z === 9, JSON.stringify(r) + ' ' + (Date.now() - t1) + 'ms']);
  // 届くまでの時間
  const lat = [];
  for (let i = 0; i < 5; i++) { const x = 4 + i; const ts = Date.now(); await B.page.evaluate(x => { const m = window.__mori; m.me.x = x; m.NET.sendT = 0; m.tick(.05); }, x); let ok = false; for (let k = 0; k < 60 && !ok; k++) { await sleep(25); ok = await A.page.evaluate(x => { const p = Object.values(window.__mori.NET.peers)[0]; return !!p && p.tx === x; }, x); } lat.push(ok ? Date.now() - ts : -1); await sleep(300); }
  out.push(['R3 居場所が届くまで（5回）', lat.every(v => v >= 0 && v < 1500), lat.join('ms ') + 'ms']);
  await B.page.evaluate(() => window.__mori.netSay('やあ！テスト'));
  const said = await until(A.page, () => window.__mori.NET.log.some(l => l[1] === 'やあ！テスト'), 6000);
  out.push(['R4 ひとことが届く', said, JSON.stringify(await A.page.evaluate(() => window.__mori.NET.log))]);
  await B.page.evaluate(() => window.__mori.netStop());
  const gone = await until(A.page, () => window.__mori.NET.n === 0, 6000);
  out.push(['R5 抜けるとすぐ消える', gone, '']);
  out.push(['R6 エラー0件', A.errors.length === 0 && B.errors.length === 0, A.errors.concat(B.errors).join('|').slice(0, 300)]);
  await A.page.evaluate(() => window.__mori.netStop()); await sleep(500);
  await A.browser.close(); await B.browser.close();
  let ng = 0; out.forEach(o => { if (!o[1]) ng++; console.log((o[1] ? 'OK ' : 'NG ') + o[0] + '　' + String(o[2]).slice(0, 400)); }); console.log(out.length + '本中' + (out.length - ng) + '本OK　部屋=' + topic); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
