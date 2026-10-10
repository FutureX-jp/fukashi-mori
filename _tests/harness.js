// 森をヘッドレスで開く共通部分。node harness を require して使う
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const THREE = fs.readFileSync(path.join(__dirname, 'node_modules/three/build/three.min.js'), 'utf8');

// ---- まねた中継（Supabase Realtime の代わり）。公式の supabase-js が話す形（vsn 2.0.0）に合わせる ----
// 文字のわく: [join_ref, ref, topic, event, payload]／ひとこと・居場所（broadcast）は2進のわく: 送り=種類3、受け=種類4
const RELAY = { socks: new Set(), frames: [], refuse: false, log: [] };
function relayAttach(ws, who) {
  const me = { ws, who, topics: new Set() };
  if (RELAY.refuseConnect) { ws.close({ code: 1011, reason: 'refused' }); return; }
  RELAY.socks.add(me);
  ws.onClose(() => RELAY.socks.delete(me));
  ws.onMessage(msg => {
    if (typeof msg === 'string') {
      let a; try { a = JSON.parse(msg); } catch (e) { return; }
      const [jr, ref, topic, ev, pl] = a; RELAY.log.push(who + ' ' + ev + ' ' + topic);
      if (ev === 'phx_join' && RELAY.refuse) { ws.send(JSON.stringify([jr, ref, topic, 'phx_reply', { status: 'error', response: { reason: 'refused (test)' } }])); }
      else if (ev === 'phx_join') { me.topics.add(topic); RELAY.join = pl; ws.send(JSON.stringify([jr, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: [] } }])); }
      else if (ev === 'heartbeat') ws.send(JSON.stringify([null, ref, 'phoenix', 'phx_reply', { status: 'ok', response: {} }]));
      else if (ev === 'phx_leave') { me.topics.delete(topic); ws.send(JSON.stringify([jr, ref, topic, 'phx_reply', { status: 'ok', response: {} }])); }
      return;
    }
    const b = Buffer.from(msg); if (b[0] !== 3) return;
    const jl = b[1], rl = b[2], tl = b[3], el = b[4], ml = b[5], enc = b[6]; let o = 7 + jl + rl;
    const topic = b.subarray(o, o + tl); o += tl; const ev = b.subarray(o, o + el); o += el; const meta = b.subarray(o, o + ml); o += ml; const pay = b.subarray(o);
    const t = topic.toString(); let body = null; try { body = JSON.parse(pay.toString()); } catch (e) { }
    RELAY.frames.push({ who, t: Date.now(), ev: ev.toString(), body });
    const out = Buffer.concat([Buffer.from([4, tl, el, ml, enc]), topic, ev, meta, pay]);
    RELAY.socks.forEach(s => { if (s !== me && s.topics.has(t)) s.ws.send(out); });
  });
}
const NAMES = { gonzo: 'ゴンゾウ', mitsu: 'ミツ', haru: 'ハル', rin: 'リン', popo: 'ポポ', jiro: 'ジロ' };
function world(over) {
  const ids = Object.keys(NAMES), st = ['耕した', '芽', '育ち中', '収穫できる', '荒地', '収穫済み'];
  const plots = [];
  for (let no = 1; no <= 18; no++) {
    const own = no <= 9 ? ids[(no - 1) % 6] : (no === 10 ? 'haru' : 'yakuba');
    plots.push({ no, state: own !== 'yakuba' ? st[no % st.length] : '荒地', water: own !== 'yakuba' && no % 2 === 0, user: no === 3 ? 'rin' : own, owner: own });
  }
  const people = ids.map((id, i) => ({ id, name: NAMES[id], role: '住人', place: ['畑', '広場', '池', '家', '役場', '森'][i], say: '', hunger: 20 + i * 5, home: 1, age: 30, fans: i, jail: 0 }));
  people.push({ id: 'kei', name: 'ケイ', role: '警察官', say: '' });
  return Object.assign({ day: 3, wday: 3, slot: 10, weather: '晴れ', people, plots, shops: [], residents: people.map(p => Object.assign({ alive: true, diary: [] }, p)), town: { food: 40, coin: 100 }, hall: [], loans: [], cases: [] }, over || {});
}

async function openMori(file, opt) {
  opt = opt || {};
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: opt.viewport || { width: 393, height: 852 }, deviceScaleFactor: opt.dpr || 2, hasTouch: true, isMobile: true, locale: 'ja-JP', timezoneId: 'Asia/Tokyo' });
  const page = await ctx.newPage();
  const errors = [], state = { world: world(opt.world), posts: [] };
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  const html = fs.readFileSync(file, 'utf8');
  await page.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith('http://mori.test/supabase.js')) { if (opt.noLib || !fs.existsSync(path.join(path.dirname(file), 'supabase.js'))) return route.fulfill({ status: 404, body: '' }); return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(path.dirname(file), 'supabase.js'), 'utf8') }); }
    if (u.startsWith('http://mori.test/')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/three\.min\.js/.test(u)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: THREE });
    if (/mori\.futurex-works\.jp\/api\/(forest|world)/.test(u)) {
      if (opt.offline) return route.abort();
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(state.world) });
    }
    if (/mori\.futurex-works\.jp\/api\//.test(u)) {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      state.posts.push({ u, body: route.request().postData() });
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true }) });
    }
    return route.abort();
  });
  await page.routeWebSocket(/realtime\/v1\/websocket/, ws => relayAttach(ws, opt.who || 'A'));
  if (opt.save) await page.addInitScript(s => { try { for (const k in s) localStorage.setItem(k, s[k]); } catch (e) { } }, opt.save);
  await page.goto('http://mori.test/index.html' + (opt.hash || ''));
  await page.waitForFunction(() => window.__mori && window.__mori.three && window.__mori.three().R, null, { timeout: 60000 });
  await page.evaluate(() => { const m = window.__mori; m.skip(); m.S.intro = 1; m.S.j17s = 1; m.S.q16s = 1; m.S.n195 = 1; m.S.netAsk = 1; m.toastClear(); });
  if (!opt.offline) await page.waitForFunction(() => window.__mori.V15.ok, null, { timeout: 30000 }).catch(() => { });
  return { browser, page, errors, state };
}
module.exports = { openMori, world, RELAY };
