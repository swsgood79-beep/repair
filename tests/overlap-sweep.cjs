// 글자 겹침 검사: npm run dev 후 node tests/overlap-sweep.cjs <스크린샷 폴더/> (주소 ?probe 로 화면 글자 상자를 모은다)
const { chromium } = require('playwright');
const out = process.argv[2];
const ITEMS = { lamp: { sw: 1 }, fan: { sw: 2 }, radio: { sw: 1, knobA: 0.27, knobB: 0.6 }, cassette: { sw: 1, knobB: 0.6 }, clock: { nudge: true }, iron: { knobA: 0.5 }, phone: { sw: 1 },
  ricecooker: { sw: 1 }, amp: { sw: 1, knobB: 0.7 }, turntable: { sw: 1, nudge: true, knobB: 0.6 }, sewing: { sw: 1 }, tv: { sw: 1, knobB: 0.6 }, calc: { sw: 1, nudge: true } };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:4174/?probe'); await p.waitForTimeout(900);
  const box = await p.locator('canvas.txt').boundingBox();
  const P = (x, y) => [box.x + x * box.width / 640, box.y + y * box.height / 360];
  const at = async (x, y) => { await p.mouse.click(...P(x, y)); await p.waitForTimeout(200); };
  const report = [];
  const check = async (tag, shot) => {
    await p.mouse.move(...P(639, 359)); await p.waitForTimeout(250);
    const o = await p.evaluate(() => window.__overlaps().map(([a, b2, n]) => `${a.s} ↔ ${b2.s} (${n})`));
    if (o.length) { report.push(`[${tag}]\n  ` + [...new Set(o)].join('\n  ')); if (shot) await p.screenshot({ path: out + 'ov-' + tag.replace(/[^\w-]/g, '_') + '.png' }); }
  };
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  await check('title', true);
  await at(320, 275); await p.waitForTimeout(900); await check('counter', true);
  await at(390, 259); await check('counter-asked', true);
  await at(550, 320); await at(550, 320); await p.waitForTimeout(500); await check('bench-tutorial', true);
  const set = async (fn, arg) => { await p.evaluate(fn, arg); await p.reload(); await p.waitForTimeout(500); await at(268, 280); await p.waitForTimeout(400); };
  for (const [name, ctx] of Object.entries(ITEMS)) for (const open of [0, 1, 2]) for (const power of [false, true]) {
    if (open === 2 && name !== 'radio') continue;
    await set(([name, ctx, open, power]) => { const st = JSON.parse(localStorage.getItem('nopo-repair:v2')); const j = st.jobs[0]; j.itemId = name; j.faults = []; j.open = open; j.found = {}; j.ctx = { power, sw: 0, knobA: 0.15, knobB: 0.5, wiggle: null, warm: false, nudge: false, moved: false, ...(power ? ctx : {}) }; st.tutorial = -1; st.active = j.id; st.level = 4; st.minute = 5; localStorage.setItem('nopo-repair:v2', JSON.stringify(st)); }, [name, ctx, open, power]);
    await p.waitForTimeout(300);
    await check(`${name}-open${open}-${power ? 'on' : 'off'}`, true);
  }
  // 확대: 눈 도구로 여러 곳 살펴보기
  for (const name of ['radio', 'amp', 'tv', 'fan', 'turntable']) {
    await set(([name]) => { const st = JSON.parse(localStorage.getItem('nopo-repair:v2')); const j = st.jobs[0]; j.itemId = name; j.faults = []; j.open = 1; j.found = {}; j.ctx.power = false; st.tutorial = -1; st.active = j.id; st.minute = 5; localStorage.setItem('nopo-repair:v2', JSON.stringify(st)); }, [name]);
    await at(4 + 2 * 58 + 28, 320);
    for (const [x, y] of [[80, 120], [200, 110], [300, 160], [150, 200]]) { await at(x, y); await p.waitForTimeout(700); await check(`${name}-zoom-${x}-${y}`, true); }
  }
  // 창들
  await set(() => { const st = JSON.parse(localStorage.getItem('nopo-repair:v2')); st.tutorial = -1; st.minute = 5; localStorage.setItem('nopo-repair:v2', JSON.stringify(st)); }, []);
  await at(542, 9); await check('shop', true); await at(320, 315);
  await p.keyboard.press('Escape');
  await set(() => {}, []); await at(569, 9); for (let pg = 0; pg < 3; pg++) { await check('book' + pg, true); await at(478, 40); }
  await set(() => {}, []); await at(629, 9); await check('menu', true);
  await set(() => {}, []); await at(560, 196); await at(270, 125); await at(270, 171); await at(270, 217); await check('ask', true);
  const C = async id => { const ok = await p.evaluate(i => window.__click(i), id); await p.waitForTimeout(350); console.log('click', id, ok); return ok; };
  // 선반, 마감, 하루 정산
  await set(() => { const st = JSON.parse(localStorage.getItem('nopo-repair:v2')); st.tutorial = -1; st.minute = 5; localStorage.setItem('nopo-repair:v2', JSON.stringify(st)); }, []);
  console.log('ids', (await p.evaluate(() => window.__ids())).join(' '));
  await C('shelf'); await check('shelf', true); await p.keyboard.press('Escape');
  await C('ov-x');
  await C('close-day') || await C('ov-closeday');
  // 지목 창 (근거 카드)
  await set(() => { const st = JSON.parse(localStorage.getItem('nopo-repair:v2')); const j = st.jobs[0]; j.itemId = 'radio'; j.faults = ['cap_dry']; j.open = 1; j.asked = { onset: 'gradual', when: 'always', event: 'dust' }; j.found = { fcap: { ohm: { v: Infinity, cap: 'weak' }, t: 1 }, t1: { tp: { v: 180, shaky: true }, t: 2 }, fuse: { look: 'ok', t: 3 } }; j.ctx.power = false; st.tutorial = -1; st.active = j.id; st.minute = 5; st.money = 100000; localStorage.setItem('nopo-repair:v2', JSON.stringify(st)); }, []);
  await C('s:fcap'); await check('accuse', true);
  await C('acc:replace'); await p.waitForTimeout(400); await check('mini-desolder', true);
  await C('mini-x'); await C('acc-x');
  await C('cover'); await p.waitForTimeout(300); await check('mini-screws', true); await C('mini-x');
  // 돌려주기 → 카운터 결과
  await set(() => { const st = JSON.parse(localStorage.getItem('nopo-repair:v2')); const j = st.jobs[0]; j.faults = []; j.open = 0; st.tutorial = -1; st.minute = 5; localStorage.setItem('nopo-repair:v2', JSON.stringify(st)); }, []);
  await C('handback'); await p.waitForTimeout(500); await check('counter-paid', true);
  await C('ok');
  // 마감과 정산
  await set(() => { const st = JSON.parse(localStorage.getItem('nopo-repair:v2')); st.tutorial = -1; st.minute = 590; localStorage.setItem('nopo-repair:v2', JSON.stringify(st)); }, []);
  console.log('ids2', (await p.evaluate(() => window.__ids())).join(' '));
  await C('shelf'); await C('ov-closeday'); await check('close', true); await C('c-yes'); await p.waitForTimeout(600); await check('day-report', true); await C('d-shop'); await check('shop-from-day', true); await p.keyboard.press('Escape'); await C('ov-x'); { const ids = await p.evaluate(() => window.__ids()); const ok = ids.filter(i => /^(cl|ov|close|day)/.test(i)); console.log('candidates', ok.join(' ')); for (const id of ok.filter(i => !/x$|cancel|no/.test(i)).slice(-1)) await C(id); } 
  console.log('ids3', (await p.evaluate(() => window.__ids())).join(' '));
  console.log(report.join('\n') || '겹침 없음');
  console.log('errors', errs); await b.close();
})();
