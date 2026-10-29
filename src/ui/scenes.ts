import { ITEMS, item } from '../items';
import { C, Painter } from '../gfx/painter';
import { drawCustomer, drawItemIcon, drawToolIcon } from '../gfx/parts';
import {
  DAILY_COST, DEADLINE, SHOP_LEVELS, START_DEBT, TOOL_SHOP, expand, levelOf, activeJob, buyTool, casebookEntries, clearSave, clockText, continueEndless,
  customerOf, endDay, handBack, newGame, payDebt, save, startDay, timeLeft, won, ANSWERS, QUESTIONS, askCustomer,
} from '../game';
import { setAudioPrefs, sfx } from '../audio';
import { button, dim, holder, region, toast, ui, type Overlay } from './core';
import type { DayReport } from '../game';
import { drawCloseup } from '../gfx/parts';
import { blit, outlined } from '../gfx/art';
import { counterFront, hudBar, hudIcon, plate, shopBackdrop, titleBackdrop } from './backdrops';

/* ---------- 가게 안 배경 ---------- */
function shopRoom(p: Painter, t: number) {
  const st = holder.state;
  shopBackdrop(p, t, levelOf(st), Object.keys(st.unlocked ?? { lamp: 1 }), st.day);
}

/** 가게 건물: 단계마다 커진다 */
export function drawBuilding(p: Painter, x: number, y: number, lv: number, t: number, s = 1) {
  blit(p, outlined(p, 'bld:' + lv, 132, 82, pp => buildingRaw(pp, 0, 0, lv, 0.3)), x - s, y - s, s);
  if (lv >= 4 && Math.sin(t * 4) > -0.6) p.rect(x + 8 * s, y + 7 * s, 114 * s, 4 * s, 'rgba(255,122,138,0.6)');
}
function buildingRaw(p: Painter, x: number, y: number, lv: number, t: number, s = 1) {
  const R = (a: number, b: number, w: number, h: number, c: string) => p.rect(x + a * s, y + b * s, w * s, h * s, c);
  const w = [0, 70, 100, 100, 130][lv];
  const floors = lv >= 3 ? 2 : 1;
  const h = floors * 40;
  R(0, 80 - h, w, h, '#8a5a42'); R(0, 80 - h, w, 2, '#a87458');
  for (let yy = 80 - h + 4; yy < 80; yy += 4) for (let xx = (yy % 8) ? 0 : 3; xx < w; xx += 6) R(xx, yy, Math.min(5, w - xx), 1, '#7a4c36');
  R(4, 80 - h + 4, w - 8, 10, lv >= 4 ? '#1a1a1a' : '#2c7a73');
  if (lv >= 4) R(8, 80 - h + 7, w - 16, 4, Math.sin(t * 4) > -0.6 ? '#ff7a8a' : '#7a3a4a'); else R(8, 80 - h + 8, w - 16, 2, C.cream);
  if (floors === 2) { R(6, 80 - h + 18, w / 2 - 10, 14, '#c9e2e0'); R(w / 2 + 4, 80 - h + 18, w / 2 - 10, 14, '#c9e2e0'); }
  R(6, 52, w * 0.45, 22, '#c9e2e0'); R(6, 52, w * 0.45, 22, `rgba(255,210,122,${0.4 + Math.sin(t * 2) * 0.1})`);
  R(w * 0.55, 50, w * 0.38, 30, '#6b4529');
  if (lv >= 2) for (let i = 0; i < w; i += 8) R(i, 44, 8, 6, i % 16 ? '#e8e0c4' : '#c0392b');
}

function counterTop(p: Painter) { counterFront(p); }

/* ---------- 제목 ---------- */
export function drawTitle(p: Painter, t: number) {
  titleBackdrop(p, t);
  p.text('한결전파사', 322, 86, 36, '#123d38', 'center', 400, 'sign');
  p.text('한결전파사', 320, 84, 36, C.cream, 'center', 400, 'sign');
  p.text('라디오 · 텔레비전 · 시계 · 가전 수리', 320, 124, 10, '#cfe7e1', 'center', 700);
  const has = holder.state.history.length > 0 || holder.state.minute > 0 || holder.state.day > 1;
  p.panel(140, 310, 360, 42, C.paper);
  p.text(`할아버지의 골목 수리점. ${DEADLINE}일 안에 빚 ${won(START_DEBT)}을 갚고 본점까지 키우자.`, 320, 315, 10, C.ink, 'center', 700);
  p.text('가게가 커질수록 밥솥·앰프·전축·재봉틀·TV·계산기까지 고칠 수 있다', 320, 332, 9, '#5b5644', 'center');
  if (has) {
    button(p, 'continue', 214, 266, 100, 30, '이어하기', () => { ui.scene = holder.state.ending ? 'ending' : 'bench'; }, { kind: 'primary', size: 12 });
    button(p, 'new', 326, 266, 100, 30, '새로 시작', () => startNew(), { size: 12 });
  } else button(p, 'start', 250, 264, 140, 34, '가게 문 열기', () => startNew(), { kind: 'primary', size: 13 });
}

function startNew() {
  clearSave();
  holder.state = newGame();
  ui.tool = 'hand';
  ui.counter = { kind: 'arrivals', ids: holder.state.arrivals, i: 0 };
  ui.scene = 'counter';
  save(holder.state);
}

/* ---------- 카운터: 손님 맞이와 돌려주기 ---------- */
let lastBell = '';
/** 카운터에서 방금 들은 대답 */
const askSaid = { job: '', text: '' };
export function drawCounter(p: Painter, t: number) {
  const cnt = ui.counter;
  shopRoom(p, t);
  if (!cnt) { ui.scene = 'bench'; return; }
  const state = holder.state;
  if (cnt.kind === 'arrivals') {
    const job = state.jobs.find(j => j.id === cnt.ids[cnt.i]) ?? state.pending.find(j => j.id === cnt.ids[cnt.i]);
    if (!job) { ui.counter = null; ui.scene = 'bench'; return; }
    const cu = customerOf(job);
    const bellKey = `${job.id}`;
    if (lastBell !== bellKey) { lastBell = bellKey; sfx('doorbell'); }
    drawCustomer(p, { ...cu }, 110, 86, job.comeback ? 'angry' : 'worried', t);
    counterTop(p);
    drawItemIcon(p, job.itemId, 228, 196, 2);
    p.panel(300, 168, 320, 76, C.paper);
    for (let i = 0; i < 7; i++) p.rect(300 - i * 2, 192 + i, i * 2 + 2, 1, i === 6 ? C.ink : C.paper), p.rect(298 - i * 2, 192 + i, 1, 1, C.ink);
    p.text(cu.name, 312, 174, 11, '#5b5644', 'left', 700);
    p.text(`${cnt.i + 1} / ${cnt.ids.length}`, 610, 174, 9, '#5b5644', 'right');
    const said = askSaid.job === job.id ? askSaid.text : job.complaint;
    p.wrap(`“${said}”`, 312, 190, 296, 13, '#24406b', 19, 700);
    // 물어보기: 대답은 단서 수첩에 남는다
    p.text('물어보기', 300, 254, 9, C.cream, 'left', 700);
    QUESTIONS.forEach((q, i) => {
      const done = !!job.asked?.[q.id];
      button(p, 'ask:' + q.id, 346 + i * 92, 249, 88, 20, q.ask, () => {
        const r = askCustomer(state, job.id, q.id, false);
        askSaid.job = job.id; askSaid.text = r.text; sfx('paper'); save(state);
      }, { kind: done ? 'on' : undefined, size: 9 });
    });
    p.text(`${state.day}일차 아침`, 20, 270, 16, C.cream, 'left', 400, 'sign');
    p.text(item(job.itemId).name, 20, 294, 12, C.gold, 'left', 700);
    p.text(job.comeback ? '무상 재수리 · 신뢰 −2' : `수리비 ${won(job.fee)}`, 20, 312, 11, job.comeback ? '#ffb4a0' : C.cream, 'left', 700);
    p.text(`${job.dueDay - state.day <= 0 ? '오늘' : job.dueDay - state.day + '일 뒤'}까지`, 20, 328, 11, C.cream, 'left', 500);
    button(p, 'take', 480, 300, 140, 40, cnt.i + 1 < cnt.ids.length ? '맡아 두기 →' : '작업대로 →', () => {
      sfx('pop');
      if (cnt.i + 1 < cnt.ids.length) cnt.i++; else { ui.counter = null; ui.scene = 'bench'; save(state); }
    }, { kind: 'primary', size: 13 });
    return;
  }
  const o = cnt.outcome;
  const cu = customerOf(o.job);
  const mood = o.kind === 'paid' ? 'happy' : o.kind === 'refused' ? 'angry' : 'worried';
  drawCustomer(p, { ...cu }, 110, 86, mood, t);
  counterTop(p);
  drawItemIcon(p, o.job.itemId, 228, 196, 2);
  p.panel(300, 168, 320, 60, mood === 'angry' ? '#f3d2c4' : C.paper);
  for (let i = 0; i < 7; i++) p.rect(300 - i * 2, 186 + i, i * 2 + 2, 1, mood === 'angry' ? '#f3d2c4' : C.paper), p.rect(298 - i * 2, 186 + i, 1, 1, C.ink);
  p.text(cu.name, 312, 174, 11, '#5b5644', 'left', 700);
  const line = o.kind === 'paid' ? cu.thanks : o.kind === 'refused' ? cu.angry : '할 수 없죠. 다른 데 가 볼게요.';
  p.text(`“${line}”`, 312, 194, 15, mood === 'angry' ? '#7a1a0a' : '#24406b', 'left', 700);
  if (o.kind === 'paid') {
    const rise = Math.min(1, (t % 100) * 2);
    for (let i = 0; i < 5; i++) drawToolIcon(p, 'coin', 230 + i * 18, 190 - ((t * 40 + i * 13) % 40) * rise);
    p.text(`+ ${won(o.fee)}`, 20, 270, 22, C.gold, 'left', 400, 'sign');
    if (o.learned.length) p.text(`도감 기록: ${o.learned.join(', ')}`, 20, 300, 11, C.cream, 'left', 700);
    if (o.comeback) p.text('…카운터에선 멀쩡했는데, 어쩐지 찜찜하다', 20, 318, 11, '#ffb4a0', 'left', 700);
  } else if (o.kind === 'refused') {
    p.text('퇴짜! 켜 보자마자 그대로였다', 20, 270, 18, '#ffb4a0', 'left', 400, 'sign');
    p.text('물건은 다시 선반으로. 더 살펴보자.', 20, 298, 11, C.cream, 'left', 700);
  } else {
    p.text('돌려보냈다', 20, 270, 18, C.cream, 'left', 400, 'sign');
    p.text('수리비 없음 · 신뢰 −1', 20, 298, 11, '#ffb4a0', 'left', 700);
  }
  button(p, 'ok', 480, 300, 140, 40, '확인', () => {
    ui.counter = null; ui.scene = 'bench';
    if (o.kind === 'refused') holder.state.active = o.job.id;
    save(holder.state);
  }, { kind: 'primary', size: 13 });
}

/* ---------- 결말 ---------- */
export function drawEnding(p: Painter, t: number) {
  const s = holder.state;
  const kept = s.ending === 'kept';
  titleBackdrop(p, t, !kept);
  p.text('한결전파사', 320, 84, 36, C.cream, 'center', 400, 'sign');
  if (!kept) {
    // 내려진 셔터와 꺼진 불
    p.rect(176, 186, 292, 106, '#6d6f72');
    for (let y = 188; y < 292; y += 5) { p.rect(176, y, 292, 1, '#4d4f52'); p.rect(176, y + 1, 292, 1, '#8a8c8f'); }
    p.rect(0, 0, 640, 360, 'rgba(10,14,30,0.45)');
  } else for (let i = 0; i < 14; i++) { const a = t * 0.6 + i; p.rect(320 + Math.cos(a) * (120 + i * 9), 150 + Math.sin(a * 1.3) * 70, 3, 3, i % 2 ? C.glow : '#ff9a7a'); }
  p.panel(150, 186, 340, 110, C.paper);
  p.text(kept ? '한결전파사 본점 완성!' : '셔터를 내렸다', 320, 196, 24, kept ? '#8a5a12' : C.ink, 'center', 400, 'sign');
  const total = s.history.reduce((n, d) => n + d.returned, 0);
  p.text(kept ? '빚을 다 갚고 본점 간판을 올렸다. “그 녀석 손이 여기 그대로구나.”' : s.money < 0 ? '금고가 바닥났다.' : `빚 ${won(s.debt)}이 남았다.`, 320, 234, 11, C.ink, 'center', 700);
  p.text(`${s.day}일 동안 ${total}점 수리 · 도감 ${s.casebook.length}칸`, 320, 254, 10, '#5b5644', 'center', 700);
  if (kept && !s.endless) button(p, 'endless', 200, 308, 116, 30, '계속 영업', () => { continueEndless(s); startDay(s); ui.counter = { kind: 'arrivals', ids: s.arrivals, i: 0 }; ui.scene = 'counter'; save(s); }, { size: 12 });
  button(p, 'again', kept && !s.endless ? 324 : 262, 308, 116, 30, '처음부터', () => startNew(), { kind: 'primary', size: 12 });
}

/* ---------- 머리띠 ---------- */
export function drawHud(p: Painter) {
  const s = holder.state;
  hudBar(p);
  p.text('한결전파사', 9, 3, 13, '#1c120b', 'left', 400, 'sign');
  p.text('한결전파사', 8, 2, 13, C.gold, 'left', 400, 'sign');
  let x = 90;
  const item_ = (icon: 'day' | 'time' | 'coin' | 'debt', value: string, color = C.cream) => {
    const w = p.measure(value, 10, 700) + 22;
    plate(p, x, 3, w, 14);
    hudIcon(p, icon, x + 4, 5);
    p.text(value, x + 16, 4, 10, color, 'left', 700);
    x += w + 5;
  };
  item_('day', `${s.day}일차${s.endless ? '' : ' / ' + DEADLINE}`);
  item_('time', clockText(s.minute), timeLeft(s) < 60 ? '#ff9a7a' : C.cream);
  item_('coin', won(s.money), C.gold);
  item_('debt', `빚 ${won(s.debt)}`, s.debt > 0 && DEADLINE - s.day <= 3 && !s.endless ? '#ff9a7a' : C.cream);
  const hearts = Math.ceil(s.trust / 2);
  for (let i = 0; i < 5; i++) hudIcon(p, 'heart', x + 2 + i * 10, 6, i < hearts);
  const bx = 524;
  const small = (id: string, label: string, onClick: () => void, idx: number) => {
    button(p, id, bx + idx * 29, 1, 27, 18, label, () => onClick(), { kind: 'quiet', size: 9 });
  };
  small('hud-shop', '가게', () => { ui.overlay = { kind: 'shop' }; }, 0);
  small('hud-book', '도감', () => { ui.overlay = { kind: 'book', page: 0 }; }, 1);
  small('hud-sound', (s.music ?? true) ? '♪' : '♪×', () => { s.music = !(s.music ?? true); setAudioPrefs(s.music, s.sound); save(s); }, 2);
  small('hud-menu', '≡', () => { ui.overlay = { kind: 'menu' }; }, 3);
}

/* ---------- 창들 ---------- */
export function drawOverlay(p: Painter, t: number) {
  const ov = ui.overlay;
  if (!ov || ov.kind === 'accuse') return;
  const s = holder.state;
  dim(p);
  const close = () => { ui.overlay = null; };
  if (ov.kind === 'ask') {
    const job = activeJob(s);
    if (!job) { ui.overlay = null; return; }
    const cu = customerOf(job);
    p.panel(120, 60, 400, 230, C.paper);
    p.text('☎ 손님에게 전화로 묻기', 136, 70, 14, C.ink, 'left', 400, 'sign');
    p.text('한 번에 3분. 대답은 부품을 콕 집지 않는다. 측정과 엮어서 생각하자', 136, 92, 9, '#5b5644', 'left', 500);
    p.box(136, 110, 60, 66, '#c9bf98');
    p.g.save(); p.g.beginPath(); p.g.rect(137, 111, 58, 64); p.g.clip(); drawCustomer(p, { ...cu }, 136, 110, 'calm', t, 1.4); p.g.restore();
    p.text(cu.name, 166, 180, 9, '#5b5644', 'center', 700);
    QUESTIONS.forEach((q, i) => {
      const a = job.asked?.[q.id];
      const y = 110 + i * 46;
      button(p, 'ph:' + q.id, 208, y, 120, 26, q.ask, () => {
        const r = askCustomer(s, job.id, q.id, true);
        if (!r.ok) toast(r.text, true); else { sfx('paper'); save(s); }
      }, { kind: a ? 'on' : undefined, size: 10, sub: a ? '물어봄' : '3분' });
      if (a) {
        p.wrap(`“${ANSWERS[a].say}”`, 336, y, 170, 10, '#24406b', 13, 700);
        p.text(`→ ${ANSWERS[a].means}`, 336, y + 28, 8, '#8a6a1f', 'left', 700);
      }
    });
    button(p, 'ask-x', 420, 256, 84, 24, '닫기', close, { size: 11 });
    return;
  }
  if (ov.kind === 'shelf') {
    p.panel(60, 40, 520, 280, '#3a2a1c', '#1c140e');
    p.text('선반 · 맡은 물건', 76, 48, 14, C.gold, 'left', 400, 'sign');
    s.jobs.forEach((j, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 76 + col * 166, y = 78 + row * 110;
      const on = j.id === s.active, hov = ui.hover === 'job:' + j.id;
      p.box(x, y, 156, 100, on ? C.gold : hov ? '#efe2b8' : C.paper, '#1c140e');
      drawItemIcon(p, j.itemId, x + 8, y + 10, 2);
      const due = j.dueDay - s.day;
      p.text(item(j.itemId).name, x + 80, y + 10, 11, C.ink, 'left', 700);
      p.text(customerOf(j).name, x + 80, y + 26, 9, '#5b5644');
      p.text(due <= 0 ? '오늘 마감!' : `${due}일 뒤`, x + 80, y + 42, 10, due <= 0 ? C.red : C.ink, 'left', 700);
      p.text(j.comeback ? '무상' : won(j.fee), x + 80, y + 58, 10, C.ink, 'left', 700);
      p.text(j.open ? '분해 중' : Object.keys(j.found).length ? '살펴보는 중' : '새 물건', x + 8, y + 82, 9, '#5b5644', 'left', 700);
      region({ id: 'job:' + j.id, x, y, w: 156, h: 100, click: () => { s.active = j.id; ui.meter = null; ui.popups = []; close(); sfx('pop'); } });
    });
    if (!s.jobs.length) p.text('선반이 비었다', 320, 160, 14, C.cream, 'center', 700);
    button(p, 'ov-closeday', 330, 288, 116, 24, '오늘 영업 마감', () => { ui.overlay = { kind: 'close' }; }, { kind: 'quiet', size: 11 });
    button(p, 'ov-x', 452, 288, 112, 24, '닫기', close, { size: 11 });
  } else if (ov.kind === 'close') {
    const due = s.jobs.filter(j => j.dueDay <= s.day);
    p.panel(150, 100, 340, 150, C.paper);
    p.text('셔터를 내릴까?', 320, 112, 18, C.ink, 'center', 400, 'sign');
    p.text(`가겟세·재료비 ${won(DAILY_COST)}이 나간다`, 320, 144, 11, C.ink, 'center', 700);
    if (due.length) p.text(`오늘 마감인 물건 ${due.length}점은 못 고친 채 손님이 가져간다 (신뢰 −)`, 320, 164, 10, C.red, 'center', 700);
    button(p, 'c-no', 180, 206, 130, 30, '더 일한다', close, { size: 12 });
    button(p, 'c-yes', 330, 206, 130, 30, '마감', () => { const report = endDay(s); ui.overlay = { kind: 'day', report }; save(s); sfx('shutter'); }, { kind: 'primary', size: 12 });
  } else if (ov.kind === 'giveup') {
    p.panel(150, 110, 340, 130, C.paper);
    p.text('수리를 포기할까?', 320, 122, 18, C.ink, 'center', 400, 'sign');
    p.text('수리비 없음 · 신뢰 −1 · 쓴 부품값은 날린다', 320, 156, 11, C.ink, 'center', 700);
    button(p, 'g-no', 180, 196, 130, 30, '계속 고친다', close, { size: 12 });
    button(p, 'g-yes', 330, 196, 130, 30, '돌려보낸다', () => {
      const r = handBack(s, true);
      ui.overlay = null;
      if ('kind' in r) { ui.counter = { kind: 'return', outcome: r }; ui.scene = 'counter'; }
    }, { kind: 'danger', size: 12 });
  } else if (ov.kind === 'day') {
    const r = ov.report.summary;
    p.panel(150, 40, 340, 280, C.paper);
    p.text(`${r.day}일차 장부`, 320, 50, 20, C.ink, 'center', 400, 'sign');
    const rows: [string, number, string][] = [['수리비', r.income, '#1f5a1f'], ['부품·공구', -r.parts, C.red], ['가겟세', -r.expenses, C.red]];
    rows.forEach(([label, v, color], i) => {
      const y = 92 + i * 26;
      p.text(label, 180, y, 12, C.ink, 'left', 700);
      p.text(`${v >= 0 ? '+' : '−'} ${won(Math.abs(v))}`, 460, y, 13, color, 'right', 700);
      const bar = Math.min(150, Math.abs(v) / 400);
      p.rect(250, y + 16, bar, 3, color);
    });
    p.rect(180, 172, 280, 2, C.ink);
    const net = r.income - r.parts - r.expenses;
    p.text('오늘', 180, 180, 13, C.ink, 'left', 700);
    p.text(`${net >= 0 ? '+' : '−'} ${won(Math.abs(net))}`, 460, 178, 16, net >= 0 ? '#1f5a1f' : C.red, 'right', 700);
    p.text(`돌려준 물건 ${r.returned}점${r.lost ? ` · 못 고친 물건 ${r.lost}점` : ''}`, 320, 206, 10, '#5b5644', 'center', 700);
    if (ov.report.collected.length) p.text(`마감을 넘겨 그냥 가져감: ${ov.report.collected.map(j => item(j.itemId).name).join(', ')}`, 320, 222, 10, C.red, 'center', 700);
    debtBar(p, 180, 242, 280);
    button(p, 'd-shop', 170, 282, 140, 28, '빚 · 가게 키우기', () => { lastReport = ov.report; ui.overlay = { kind: 'shop' }; }, { size: 11 });
    button(p, 'd-next', 330, 282, 140, 28, s.ending ? '결과 보기' : '다음 날 아침 →', () => nextDay(), { kind: 'primary', size: 12 });
  } else if (ov.kind === 'shop') {
    p.panel(20, 26, 600, 310, C.paper);
    p.text('장부 · 가게 키우기', 320, 32, 18, C.ink, 'center', 400, 'sign');
    // 왼쪽: 가게 키우기
    const lv = levelOf(s);
    const next = SHOP_LEVELS[lv];
    p.box(32, 58, 280, 228, '#e9e0c0', '#8a7a5a');
    p.text(`지금: ${SHOP_LEVELS[lv - 1].name}`, 42, 64, 12, C.ink, 'left', 700);
    for (let i = 0; i < SHOP_LEVELS.length; i++) p.disc(250 + i * 14, 70, 4, i < lv ? C.ok : '#bdb391');
    p.rect(40, 84, 264, 92, '#22302a');
    drawBuilding(p, 60, 92, lv, t, 1);
    if (next) drawBuilding(p, 180, 92, next.level, t, 1);
    if (next) p.text('→', 165, 140, 14, C.gold, 'center', 700);
    if (next) {
      p.text(`다음: ${next.name}`, 42, 182, 12, C.ink, 'left', 700);
      p.text(next.desc, 42, 198, 9, '#5b5644');
      p.text('새로 고칠 수 있는 물건', 42, 214, 9, '#5b5644', 'left', 700);
      next.items.forEach((id, k) => { p.box(42 + k * 92, 228, 86, 28, '#d9cea8', '#8a7a5a'); drawItemIcon(p, id, 46 + k * 92, 228, 0.9); p.text(item(id).name, 82 + k * 92, 236, 9, C.ink, 'left', 700); });
      button(p, 'expand', 42, 262, 260, 20, `${won(next.price)} 들여 확장하기`, () => {
        const r = expand(s); toast(r.text, !r.ok);
        if (r.ok) { sfx('lockOpen'); save(s); if (s.ending) { ui.overlay = null; ui.scene = 'ending'; } }
      }, { kind: 'primary', size: 11, disabled: s.money < next.price });
    } else p.text('본점 완성! 모든 물건을 고칠 수 있다', 42, 190, 12, '#1f5a1f', 'left', 700);
    // 오른쪽: 목표, 빚, 공구
    const X = 324;
    p.text('목표', X, 60, 12, C.ink, 'left', 700);
    const goal = (y: number, done: boolean, text: string) => { p.box(X, y, 12, 12, done ? C.ok : '#fff', C.ink); if (done) p.text('✓', X + 6, y - 1, 10, C.white, 'center', 700); p.text(text, X + 18, y - 1, 10, done ? '#1f5a1f' : C.ink, 'left', 700); };
    goal(78, s.debt <= 0, `빚 갚기 (${DEADLINE}일차까지, 못 갚으면 가게를 잃는다)`);
    goal(96, lv >= SHOP_LEVELS.length, `가게를 본점까지 키우기 (${lv}/${SHOP_LEVELS.length})`);
    p.text('빚 문서', X, 120, 11, C.ink, 'left', 700);
    debtBar(p, X, 136, 282);
    button(p, 'pay5', X, 162, 92, 22, '5만원 갚기', () => { const r = payDebt(s, 50000); toast(r.text, !r.ok); if (r.ok) sfx('coin'); save(s); if (s.ending) { ui.overlay = null; ui.scene = 'ending'; } }, { disabled: s.money < 1 || !s.debt, size: 10 });
    button(p, 'payall', X + 96, 162, 100, 22, '있는 만큼 갚기', () => { const r = payDebt(s, Infinity); toast(r.text, !r.ok); if (r.ok) sfx('coin'); save(s); if (s.ending) { ui.overlay = null; ui.scene = 'ending'; } }, { disabled: s.money < 1 || !s.debt, size: 10 });
    p.text(`금고 ${won(s.money)}`, 606, 166, 11, C.ink, 'right', 700);
    p.text(`매일 마감 때 ${won(DAILY_COST)}이 나간다. 부품값도 남겨 두자.`, X, 190, 9, '#5b5644');
    p.text('공구상 김씨네', X, 210, 11, C.ink, 'left', 700);
    TOOL_SHOP.forEach((tool, i) => {
      const y = 226 + i * 44;
      p.box(X, y, 282, 40, '#e9e0c0', '#8a7a5a');
      p.box(X + 4, y + 4, 32, 32, '#3a2a1c');
      drawToolIcon(p, tool.id, X + 8, y + 8);
      p.text(`${tool.name}  ${won(tool.price)}`, X + 42, y + 5, 11, C.ink, 'left', 700);
      p.text(tool.desc, X + 42, y + 22, 8, '#5b5644');
      const owned = s.tools.includes(tool.id), early = s.day < tool.day;
      button(p, 'buy-' + tool.id, X + 216, y + 8, 60, 24, owned ? '보유' : early ? `${tool.day}일차` : '사기', () => { const r = buyTool(s, tool.id); toast(r.text, !r.ok); if (r.ok) sfx('register'); save(s); }, { disabled: owned || early, kind: owned ? 'quiet' : 'primary', size: 10 });
    });
    button(p, 'shop-x', 260, 306, 120, 24, '닫기', () => { ui.overlay = ov2day(); }, { size: 11 });
    if (ui.toast && t - ui.toast.t0 < 2.4) p.text(ui.toast.text, 320, 290, 10, ui.toast.bad ? C.red : '#1f5a1f', 'center', 700);
  } else if (ov.kind === 'book') {
    drawBook(p, ov);
  } else if (ov.kind === 'menu') {
    p.panel(200, 80, 240, 200, C.paper);
    p.text('메뉴', 320, 90, 18, C.ink, 'center', 400, 'sign');
    button(p, 'm-music', 230, 120, 180, 26, `배경음악  ${(s.music ?? true) ? '켬' : '끔'}`, () => { s.music = !(s.music ?? true); setAudioPrefs(s.music, s.sound); save(s); }, { size: 11, kind: (s.music ?? true) ? 'on' : undefined });
    button(p, 'm-sfx', 230, 152, 180, 26, `효과음  ${s.sound ? '켬' : '끔'}`, () => { s.sound = !s.sound; setAudioPrefs(s.music ?? true, s.sound); save(s); sfx('click'); }, { size: 11, kind: s.sound ? 'on' : undefined });
    button(p, 'm-title', 230, 184, 180, 26, '처음 화면으로', () => { ui.overlay = null; ui.scene = 'title'; save(s); }, { size: 11 });
    button(p, 'm-tut', 230, 216, 180, 26, holder.state.tutorial >= 0 ? '안내 끄기' : '안내 다시 보기', () => { holder.state.tutorial = holder.state.tutorial >= 0 ? -1 : 0; ui.overlay = null; }, { size: 11 });
    button(p, 'm-x', 230, 248, 180, 24, '닫기', close, { kind: 'primary', size: 11 });
  }
}

/** 장부를 하루 장부에서 열었으면 닫을 때 하루 장부로 돌아간다 */
let lastReport: DayReport | null = null;
function ov2day(): Overlay { return lastReport ? { kind: 'day', report: lastReport } : null; }

function nextDay() {
  const s = holder.state;
  ui.overlay = null;
  lastReport = null;
  if (s.ending) { ui.scene = 'ending'; save(s); return; }
  startDay(s);
  sfx('morning');
  ui.meter = null; ui.popups = [];
  ui.counter = { kind: 'arrivals', ids: s.arrivals, i: 0 };
  ui.scene = 'counter';
  save(s);
}


function debtBar(p: Painter, x: number, y: number, w: number) {
  const s = holder.state;
  const paid = 1 - s.debt / START_DEBT;
  p.box(x, y, w, 14, '#3a4440');
  p.rect(x + 1, y + 1, (w - 2) * paid, 12, C.ok);
  for (let i = 1; i < 8; i++) p.rect(x + (w * i) / 8, y + 1, 1, 12, 'rgba(0,0,0,0.25)');
  p.text(`갚음 ${won(START_DEBT - s.debt)} / ${won(START_DEBT)}`, x + w / 2, y + 16, 9, C.ink, 'center', 700);
}

function drawBook(p: Painter, ov: { kind: 'book'; page: number; sel?: string }) {
  const s = holder.state;
  p.panel(30, 24, 580, 316, C.paper);
  const all = casebookEntries();
  const found = all.filter(e => s.casebook.includes(e.key)).length;
  p.text('고장 도감', 50, 32, 20, C.ink, 'left', 400, 'sign');
  p.text(`${found} / ${all.length}`, 590, 38, 12, C.ink, 'right', 700);
  const pages = Math.ceil(ITEMS.length / 5);
  const page = Math.min(ov.page, pages - 1);
  const items = ITEMS.slice(page * 5, page * 5 + 5).map(d => d.id);
  if (pages > 1) {
    button(p, 'bk-prev', 400, 30, 28, 20, '◀', () => { ov.page = (page + pages - 1) % pages; ov.sel = undefined; }, { size: 10 });
    p.text(`${page + 1}/${pages}`, 446, 34, 10, C.ink, 'center', 700);
    button(p, 'bk-next', 464, 30, 28, 20, '▶', () => { ov.page = (page + 1) % pages; ov.sel = undefined; }, { size: 10 });
  }
  items.forEach((id, col) => {
    const x = 44 + col * 112;
    drawItemIcon(p, id, x, 60, 1);
    p.text(item(id).name, x + 36, 68, 10, C.ink, 'left', 700);
    all.filter(e => e.item.id === id).forEach((e, row) => {
      const y = 96 + row * 28;
      const known = s.casebook.includes(e.key);
      const sel = ov.sel === e.key, hov = ui.hover === 'bk:' + e.key;
      p.box(x, y, 104, 24, sel ? C.gold : hov ? '#efe2b8' : known ? '#e9e0c0' : '#bdb391', '#8a7a5a');
      if (known) {
        const comp = e.item.comps.find(c => c.id === e.fault.comp)!;
        drawCloseup(p, comp.shape, e.fault.mark ?? 'ok', x + 12, y + 12, 8);
        p.text(e.fault.name, x + 24, y + 6, 9, C.ink, 'left', 700);
      } else p.text('？？？', x + 52, y + 6, 10, '#7a7050', 'center', 700);
      region({ id: 'bk:' + e.key, x, y, w: 104, h: 24, click: () => { ov.sel = known ? e.key : undefined; } });
    });
  });
  const sel = all.find(e => e.key === ov.sel);
  p.box(44, 312, 444, 22, '#e9e0c0', '#8a7a5a');
  p.text(sel ? `${sel.fault.name}: ${sel.fault.lesson}` : '고친 고장을 누르면 증상과 단서가 나온다', 52, 316, 10, C.ink, 'left', 700);
  button(p, 'bk-x', 496, 312, 100, 22, '닫기', () => { ui.overlay = null; }, { size: 11 });
}

void activeJob;
