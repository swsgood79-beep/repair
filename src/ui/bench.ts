import type { Action, Comp, ItemDef, Job, TestPoint, ToolId } from '../types';
import { item } from '../items';
import { STATIONS } from '../items/radio';
import { C, Painter } from '../gfx/painter';
import { drawCloseup, drawCustomer, drawPart, drawToolIcon } from '../gfx/parts';
import {
  ACTION_NAME, TOOL_TIME, activeJob, compOf, customerOf, events, handBack, handUse, ohmOf, reachable, repair, repairCheck,
  repairMinutes, setCtx, setOpen, simulate, startWiggle, stopWiggle, timeLeft, useTool, visible, watch, won,
} from '../game';
import { sfx } from '../audio';
import { button, holder, region, regionById, toast, ui } from './core';
import { BAD_SOUND, FEEL_WORD, HEAT_WORD, MARK_WORD, SOUND_WORD, findingState, ohmText, tpState, tpText } from './words';
import { tutorialStep, drawTutorial } from './tutorial';

/* ---------- 배치 ---------- */
export const STAGE = { x: 4, y: 52, w: 404, h: 212 };
const K = Math.min(STAGE.w / 640, STAGE.h / 380);
const OX = STAGE.x + (STAGE.w - 640 * K) / 2;
const OY = STAGE.y + (STAGE.h - 380 * K) / 2;
const FLOW = { x: 412, y: 22, w: 224, h: 152 };
const METER = { x: 412, y: 178, w: 224, h: 86 };

const mx = (v: number) => OX + v * K;
const my = (v: number) => OY + v * K;
export function compRect(c: Comp) { return { x: mx(c.x), y: my(c.y), w: c.w * K, h: c.h * K }; }

export const TOOLS: { id: ToolId; name: string; needs?: string }[] = [
  { id: 'hand', name: '손' }, { id: 'driver', name: '드라이버' }, { id: 'look', name: '눈' }, { id: 'loupe', name: '돋보기', needs: 'loupe' },
  { id: 'volt', name: '전압' }, { id: 'ohm', name: '저항' }, { id: 'ear', name: '귀' }, { id: 'touch', name: '만지기' },
  { id: 'wiggle', name: '흔들기' }, { id: 'inject', name: '주입기', needs: 'inject' }, { id: 'mark', name: '표시' }, { id: 'repair', name: '수리' },
];

const TOOL_HINT: Record<ToolId, string> = {
  hand: '플러그·스위치·날개를 손으로 조작', driver: '덮개를 눌러 연다', look: '부품의 겉모습', loupe: '눈으로 못 보는 흠',
  volt: '전원을 켜고 놋쇠 측정점에', ohm: '전원을 끄고 부품에', ear: '켠 채로 부품에 귀를', touch: '온도와 손맛',
  wiggle: '누르고 있는 동안 흔든다', inject: '신호 측정점에 삐—', mark: '의심 ? → 정상 ✓ → 지움', repair: '고칠 부품을 누른다',
};

/* ---------- 공구 적용 ---------- */
function applyTool(target: { comp?: string; tp?: string }) {
  const state = holder.state;
  const job = activeJob(state);
  if (!job) return;
  const def = item(job.itemId);
  const tool = ui.tool;
  const comp = target.comp ? compOf(def, target.comp) : undefined;
  const tp = target.tp ? def.tps.find(t => t.id === target.tp) : undefined;
  if (tool === 'hand') {
    if (!comp) return toast('측정점은 테스터로 재세요');
    if (!comp.hand) return toast(`${comp.short}: 손으로 할 게 없다`);
    if (comp.hand === 'tune' || comp.hand === 'volume') return toast('아래 노브를 돌리세요');
    const r = handUse(state, comp.id);
    if (!r.ok) toast(r.text, true); else sfx('click');
    return;
  }
  if (tool === 'driver') return toast('덮개를 누르거나 아래 [열기]를 쓰세요');
  if (tool === 'wiggle') return;
  if (tool === 'repair') {
    if (!comp) return toast('고칠 부품을 누르세요');
    const acts = actionsOf(comp);
    if (!acts.length) return toast(`${comp.short}: 이 가게에선 손 못 댐`, true);
    if (job.ctx.power && def.id !== 'clock') return toast('감전 위험! 전원부터 빼세요', true);
    ui.overlay = { kind: 'repair', comp: comp.id, progress: 0, target: 0.25 + Math.random() * 0.5, holding: false, hold0: 0, msg: '' };
    return;
  }
  const r = useTool(state, tool, target);
  if (!r.ok) { if (r.text) toast(r.text, true); return; }
  const f = job.found[comp?.id ?? tp!.id];
  const at = comp ? compRect(comp) : { x: mx(tp!.x) - 4, y: my(tp!.y) - 4, w: 8, h: 8 };
  const px = at.x + at.w / 2, py = at.y + at.h / 2;
  switch (tool) {
    case 'look': case 'loupe':
      if (tp?.kind === 'amp') { setMeter('amp', f.tp!.v, tp.expect, '°', tp.label); break; }
      ui.popups = ui.popups.filter(p => p.kind !== 'closeup');
      ui.popups.push({ kind: 'closeup', x: px, y: py, shape: comp!.shape, mark: f[tool]!, text: r.text, t0: ui.now });
      sfx(f[tool] === 'ok' ? 'pop' : 'bad', 0.5);
      break;
    case 'volt':
      setMeter('V', f.tp!.v, tp!.expect, tp!.unit, tp!.label, f.tp!.shaky);
      sfx('click');
      break;
    case 'ohm': {
      const o = f.ohm!;
      ui.meter = { mode: 'Ω', value: o.v, expect: typeof comp!.ohm === 'number' ? comp!.ohm : -1, unit: 'Ω', label: comp!.short, cap: o.cap, flicker: o.flicker, t0: ui.now };
      sfx('click');
      break;
    }
    case 'ear':
      if (tp?.kind === 'beat') { ui.meter = { mode: 'beat', value: f.tp!.v, b: f.tp!.b, expect: tp.expect, unit: '초', label: '박자', t0: ui.now }; break; }
      ui.popups.push({ kind: 'sound', x: px, y: at.y, sound: f.ear!, t0: ui.now });
      break;
    case 'touch':
      ui.popups.push({ kind: 'touch', x: px, y: at.y, heat: f.heat ?? 0, feel: f.feel, t0: ui.now });
      break;
    case 'inject': {
      const speaker = def.comps.find(c => c.shape === 'speaker');
      const sr = speaker ? compRect(speaker) : at;
      ui.popups.push({ kind: 'beep', x: sr.x + sr.w / 2, y: sr.y, level: f.inject ?? 0, t0: ui.now });
      setMeter('inject', f.inject ?? 0, 1, '', tp!.label);
      sfx('beep', (f.inject ?? 0) * 0.8 + 0.05);
      break;
    }
  }
  void ohmOf;
}

function setMeter(mode: 'V' | 'amp' | 'inject', value: number, expect: number, unit: string, label: string, shaky?: boolean) {
  ui.meter = { mode, value, expect, unit, label, shaky, t0: ui.now };
}

export function actionsOf(c: Comp): Action[] {
  const acts = [...c.acts];
  if (c.part && !acts.includes('replace')) acts.unshift('replace');
  return acts;
}

/* ---------- 그리기 ---------- */
export function drawBench(p: Painter, t: number) {
  const state = holder.state;
  const job = activeJob(state);
  for (const e of events.splice(0)) { toast(e.text, !!e.bad); sfx('zap'); }
  drawTicket(p, job, t);
  if (!job) {
    p.box(STAGE.x, STAGE.y, STAGE.w, STAGE.h, C.night);
    p.text('선반이 비었습니다', STAGE.x + STAGE.w / 2, STAGE.y + 90, 16, C.cream, 'center', 700);
    p.text('오늘 영업을 마감하세요', STAGE.x + STAGE.w / 2, STAGE.y + 116, 11, C.sage, 'center');
    button(p, 'close-day', STAGE.x + STAGE.w / 2 - 60, STAGE.y + 140, 120, 24, '영업 마감', () => { ui.overlay = { kind: 'close' }; }, { kind: 'primary' });
    drawToolbar(p, null);
    return;
  }
  const def = item(job.itemId);
  const sim = simulate(job);
  drawStage(p, def, job, sim, t);
  drawFlow(p, def, job);
  drawMeter(p, t);
  drawControls(p, def, job);
  drawToolbar(p, job);
  drawPopups(p, t);
  drawTutorial(p, t);
  return sim;
}

function drawTicket(p: Painter, job: Job | null, t: number) {
  p.panel(4, 22, 404, 28, C.paper);
  if (!job) { p.text('작업대', 14, 29, 12, C.ink, 'left', 700); return; }
  const def = item(job.itemId);
  const cu = customerOf(job);
  p.rect(6, 24, 26, 24, '#c9bf98');
  p.g.save(); p.g.beginPath(); p.g.rect(6, 24, 26, 24); p.g.clip();
  drawCustomerMini(p, cu, 7, 24, t);
  p.g.restore();
  const due = job.dueDay - holder.state.day;
  p.text(def.name, 38, 25, 11, C.ink, 'left', 700);
  p.text(job.comeback ? '무상 재수리' : won(job.fee), 402, 25, 11, job.comeback ? C.red : C.ink, 'right', 700);
  p.text(due <= 0 ? '오늘 찾으러 옴' : `${due}일 뒤`, 402, 37, 9, due <= 0 ? C.red : '#5b5644', 'right', 700);
  const quote = `“${job.complaint}”`;
  const fit = p.measure(quote, 10) > 290 ? quote.slice(0, 34) + '…”' : quote;
  p.text(fit, 38 + p.measure(def.name, 11, 700) + 8, 26, 10, '#24406b', 'left', 500);
  p.text(cu.name, 38, 38, 9, '#5b5644', 'left', 500);
}

function drawCustomerMini(p: Painter, cu: { hair: string; skin: string; shirt: string; style: number }, x: number, y: number, t: number) {
  const g = p.g;
  g.save(); g.translate(x, y); g.scale(1 / 3, 1 / 3);
  drawCustomer(p, cu, 0, 4, 'calm', t);
  g.restore();
}

function decor(p: Painter, def: ItemDef) {
  const R = (x: number, y: number, w: number, h: number, c: string) => p.rect(mx(x), my(y), w * K, h * K, c);
  const B = (x: number, y: number, w: number, h: number, c: string, e = C.ink) => p.box(mx(x), my(y), w * K, h * K, c, e);
  switch (def.id) {
    case 'lamp':
      for (let i = 0; i < 18; i++) R(232 - i * 2.4, 50 + i * 5.5, 176 + i * 4.8, 6, i < 2 ? '#2b524d' : '#3d6f69');
      R(314, 190, 12, 74, C.brass); B(132, 262, 376, 86, '#4f8a80'); R(136, 266, 368, 4, '#6aa69a');
      break;
    case 'fan':
      R(160, 270, 14, 40, C.steel2); B(60, 300, 230, 44, '#4f8a80'); B(292, 70, 276, 178, '#4f8a80'); R(298, 76, 264, 4, '#6aa69a'); B(372, 282, 152, 52, '#3b6b63');
      break;
    case 'radio':
      B(40, 30, 560, 320, '#6b4529', '#2b1a0e'); B(52, 42, 536, 296, '#5a3920', '#3f2714');
      B(64, 100, 136, 150, '#8a6f4c', '#3f2714');
      for (let i = 0; i < 9; i++) R(70, 110 + i * 16, 124, 3, '#6e5536');
      break;
    case 'cassette':
      B(84, 60, 486, 282, '#b9b2a3', '#4f4a42'); R(90, 66, 474, 4, '#d6d0c2'); B(104, 106, 166, 62, '#2c2a28', '#111');
      break;
    case 'clock':
      B(212, 30, 216, 338, '#6b4529', '#2b1a0e'); B(226, 40, 188, 318, '#5a3920', '#3f2714'); B(262, 214, 116, 140, 'rgba(200,230,230,0.08)', C.brass);
      break;
  }
}

function drawCover(p: Painter, def: ItemDef, job: Job) {
  const tool = ui.tool;
  if (job.open < 1) {
    const [x, y, w, h] = def.cover;
    const r = { x: mx(x), y: my(y), w: w * K, h: h * K };
    if (def.id === 'clock') {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      p.disc(cx, cy, r.h / 2 - 3, '#efe6cc'); p.ring(cx, cy, r.h / 2 - 3, C.brass, 2);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.rect(cx + Math.cos(a) * (r.h / 2 - 9) - 1, cy + Math.sin(a) * (r.h / 2 - 9) - 1, 3, 3, '#2b2a26'); }
    } else {
      p.box(r.x, r.y, r.w, r.h, '#47392d', '#1c140e');
      p.rect(r.x + 2, r.y + 2, r.w - 4, 1, '#5e4c3c');
      for (const [sx, sy] of [[r.x + 5, r.y + 5], [r.x + r.w - 7, r.y + 5], [r.x + 5, r.y + r.h - 7], [r.x + r.w - 7, r.y + r.h - 7]]) { p.disc(sx + 1, sy + 1, 2, '#b9b9b9'); p.rect(sx, sy + 1, 3, 1, '#555'); }
      p.label(def.coverLabel, r.x + r.w / 2, r.y + r.h / 2 - 6, 10, '#d8c6a4');
    }
    if (tool === 'driver') {
      const pulse = Math.sin(ui.now * 6) > 0;
      if (pulse) { p.rect(r.x, r.y, r.w, 1, C.gold); p.rect(r.x, r.y + r.h - 1, r.w, 1, C.gold); p.rect(r.x, r.y, 1, r.h, C.gold); p.rect(r.x + r.w - 1, r.y, 1, r.h, C.gold); }
      region({ id: 'cover', ...r, click: () => openCover(1) });
    }
  }
  if (def.chassis && job.open === 1) {
    const [x, y, w, h] = def.chassis;
    const r = { x: mx(x), y: my(y), w: w * K, h: h * K };
    p.box(r.x, r.y, r.w, r.h, '#6b6f72', '#2d3033');
    p.label(def.chassisLabel!, r.x + r.w / 2, r.y + r.h / 2 - 6, 9, C.cream);
    if (tool === 'driver') region({ id: 'chassis', ...r, click: () => openCover(2) });
  }
}

function openCover(level: number) {
  const r = setOpen(holder.state, level);
  if (!r.ok) toast(r.text, true); else sfx('pop');
}

function drawWires(p: Painter, def: ItemDef, job: Job, layerFilter: (l: number) => boolean) {
  for (const w of def.wires) {
    if (!visible(job, w.layer) || !layerFilter(w.layer)) continue;
    const color = w.kind === 's' ? '#e2c25c' : w.kind === 'm' ? '#9aa3a8' : '#b04a32';
    for (let i = 1; i < w.pts.length; i++) p.line(mx(w.pts[i - 1][0]), my(w.pts[i - 1][1]), mx(w.pts[i][0]), my(w.pts[i][1]), color, w.kind === 'm' ? 2 : 1);
  }
}

function drawStage(p: Painter, def: ItemDef, job: Job, sim: ReturnType<typeof simulate>, t: number) {
  const S = STAGE;
  p.box(S.x, S.y, S.w, S.h, '#20302a', C.ink);
  for (let x = S.x + 10; x < S.x + S.w; x += 16) p.rect(x, S.y + 1, 1, S.h - 2, '#253830');
  for (let y = S.y + 10; y < S.y + S.h; y += 16) p.rect(S.x + 1, y, S.w - 2, 1, '#253830');
  decor(p, def);
  const inner = def.comps.filter(c => c.layer > 0 && visible(job, c.layer));
  const outer = def.comps.filter(c => c.layer === 0 && !(c.front && job.open > 0));
  if (job.open > 0) { drawWires(p, def, job, () => true); for (const c of inner) drawComp(p, c, job, sim, t); }
  drawCover(p, def, job);
  if (job.open === 0) drawWires(p, def, job, l => l === 0);
  for (const c of outer) drawComp(p, c, job, sim, t);
  for (const tp of def.tps) if (visible(job, tp.layer)) drawTP(p, tp, job);
  // 지금 상태 띠
  const obs = sim.obs;
  p.rect(S.x + 1, S.y + S.h - 17, S.w - 2, 16, 'rgba(10,16,13,0.82)');
  p.rect(S.x + 1, S.y + S.h - 17, 3, 16, sim.fx.glow && Object.values(sim.fx.glow).some(v => v > 0) || sim.fx.spin || sim.fx.swing || sim.fx.tone ? C.ok : C.warn);
  p.text(`지금  ${obs}`, S.x + 9, S.y + S.h - 15, 10, C.cream, 'left', 700);
  p.text(TOOL_HINT[ui.tool], S.x + S.w - 6, S.y + S.h - 14, 9, C.sage, 'right', 500);
  const hov = ui.hover.startsWith('c:') ? compOf(def, ui.hover.slice(2)) : ui.hover.startsWith('t:') ? def.tps.find(x => x.id === ui.hover.slice(2)) : undefined;
  if (hov && !ui.popups.length) drawHoverInfo(p, def, job, hov);
}

function drawComp(p: Painter, c: Comp, job: Job, sim: ReturnType<typeof simulate>, t: number) {
  const r = compRect(c);
  const shake = job.ctx.wiggle === c.id;
  drawPart(p, c, r, sim.fx, job.ctx, t, shake);
  const id = 'c:' + c.id;
  const hovered = ui.hover === id;
  if (hovered) {
    p.rect(r.x - 2, r.y - 2, r.w + 4, 1, C.gold); p.rect(r.x - 2, r.y + r.h + 1, r.w + 4, 1, C.gold);
    p.rect(r.x - 2, r.y - 2, 1, r.h + 4, C.gold); p.rect(r.x + r.w + 1, r.y - 2, 1, r.h + 4, C.gold);
  }
  if (job.open > 0 || hovered || c.layer === 0) p.label(c.short, r.x + r.w / 2, r.y + r.h + 1, 8, hovered ? C.gold : C.cream);
  const tag = job.tags[c.id];
  const fs = findingState(job.found[c.id], c.ohm);
  let bx = r.x + r.w - 2;
  if (tag) { p.disc(bx, r.y + 1, 5, tag === 'sus' ? C.red : C.ok); p.ring(bx, r.y + 1, 5, C.ink); p.label(tag === 'sus' ? '?' : '✓', bx, r.y - 5, 8, C.white); bx -= 11; }
  if (fs) { p.disc(bx, r.y + 1, 3, fs === 2 ? C.warn : '#6fae9a'); p.ring(bx, r.y + 1, 3, C.ink); }
  const pad = Math.max(0, 14 - Math.min(r.w, r.h)) / 2;
  region({
    id, x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2,
    click: ui.tool === 'wiggle' ? undefined : () => { applyTool({ comp: c.id }); },
    down: ui.tool === 'wiggle' ? () => { const res = startWiggle(holder.state, c.id); if (!res.ok) toast(res.text, true); } : undefined,
    up: ui.tool === 'wiggle' ? () => stopWiggle(holder.state) : undefined,
  });
}

function drawTP(p: Painter, tp: TestPoint, job: Job) {
  const x = mx(tp.x), y = my(tp.y);
  const st = tpState(tp, job.found[tp.id]?.tp);
  const color = [tp.kind === 'beat' || tp.kind === 'amp' ? '#9fc3bd' : C.brass, C.ok, C.warn, C.red][st];
  const id = 't:' + tp.id;
  p.disc(x, y, 5, C.ink);
  p.disc(x, y, 4, color);
  p.rect(x - 1, y - 2, 2, 1, 'rgba(255,255,255,0.6)');
  if (ui.hover === id) p.ring(x, y, 7, C.gold);
  const r = job.found[tp.id]?.tp;
  if (r) p.label(tpText(tp, r), x, y + 6, 8, color);
  region({ id, x: x - 8, y: y - 8, w: 16, h: 16, click: () => applyTool({ tp: tp.id }) });
}

function drawHoverInfo(p: Painter, def: ItemDef, job: Job, target: Comp | TestPoint) {
  const isComp = 'shape' in target;
  const lines: [string, string][] = [];
  const f = job.found[target.id];
  if (isComp) {
    if (f?.look) lines.push(['눈', f.look === 'ok' ? '멀쩡' : MARK_WORD[f.look]]);
    if (f?.loupe) lines.push(['돋보기', f.loupe === 'ok' ? '흠 없음' : MARK_WORD[f.loupe]]);
    if (f?.ohm) lines.push(['저항', ohmText(f.ohm) + (typeof target.ohm === 'number' ? `  (정상 ${ohmText({ v: target.ohm })})` : '')]);
    if (f?.heat !== undefined) lines.push(['온도', HEAT_WORD[f.heat]]);
    if (f?.feel) lines.push(['손맛', FEEL_WORD[f.feel]]);
    if (f?.ear) lines.push(['소리', SOUND_WORD[f.ear]]);
  } else {
    lines.push(['정상', `${target.expect}${target.unit}`]);
    if (f?.tp) lines.push(['측정', tpText(target, f.tp)]);
    if (f?.inject !== undefined) lines.push(['주입', f.inject ? '삐— 들림' : '안 들림']);
  }
  const title = isComp ? target.name : target.label;
  const w = Math.max(90, p.measure(title, 10, 700) + 16, ...lines.map(([a, b]) => p.measure(a + '  ' + b, 9) + 20));
  const h = 18 + lines.length * 13;
  const x = Math.min(STAGE.x + STAGE.w - w - 4, Math.max(STAGE.x + 4, ui.mouse[0] + 10));
  const y = Math.min(STAGE.y + STAGE.h - h - 20, Math.max(STAGE.y + 4, ui.mouse[1] - h - 8));
  p.panel(x, y, w, h, C.paper);
  p.text(title, x + 7, y + 3, 10, C.ink, 'left', 700);
  lines.forEach(([a, b], i) => { p.text(a, x + 7, y + 17 + i * 13, 9, '#6b6450', 'left', 700); p.text(b, x + 50, y + 17 + i * 13, 9, C.ink, 'left', 500); });
  void def;
}

/* ---------- 추리판 ---------- */
function drawFlow(p: Painter, def: ItemDef, job: Job) {
  const F = FLOW;
  p.panel(F.x, F.y, F.w, F.h, '#1f2f28');
  p.text('추리판', F.x + 8, F.y + 4, 11, C.gold, 'left', 700);
  p.text('왼쪽에서 오른쪽으로 흐른다', F.x + F.w - 8, F.y + 6, 8, C.sage, 'right');
  // 줄 나누기: 한 줄에 최대 6칸
  type Node = { id: string; row: number; idx: number; line: number; col: number; per: number };
  const nodes: Node[] = [];
  let line = 0;
  def.flow.forEach((row, ri) => {
    const lines = Math.ceil(row.length / 6), per = Math.ceil(row.length / lines);
    row.forEach((id, i) => nodes.push({ id, row: ri, idx: i, line: line + Math.floor(i / per), col: i % per, per }));
    line += lines;
  });
  const tutorialRoom = holder.state.tutorial >= 0 && job.id === 'j1' ? 54 : 0;
  const lineH = Math.min(34, (F.h - 24 - tutorialRoom) / line);
  const pos = (n: Node) => ({ x: F.x + 12 + (F.w - 24) * (n.col + 0.5) / n.per, y: F.y + 26 + n.line * lineH + lineH / 2 - 5 });
  // 의심 구간: 정상 측정점(또는 전원) 뒤에서 처음 끊긴 측정점까지
  const suspect = new Set<string>();
  def.flow.forEach((row, ri) => {
    let lastGood = ri === 0 ? -1 : -2;
    row.forEach((id, i) => {
      const tp = def.tps.find(x => x.id === id);
      if (!tp) return;
      const st = tpState(tp, job.found[id]?.tp);
      if (st === 1) lastGood = i;
      else if (st >= 2 && lastGood >= -1) { for (let k = lastGood + 1; k <= i; k++) suspect.add(`${ri}:${k}`); lastGood = -3; }
    });
  });
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1], b = nodes[i];
    if (a.row !== b.row) continue;
    const pa = pos(a), pb = pos(b);
    const sus = suspect.has(`${b.row}:${b.idx}`);
    p.line(pa.x, pa.y, pb.x, pb.y, sus ? C.warn : a.line !== b.line ? '#3d5547' : C.moss, sus ? 2 : 1);
  }
  for (const n of nodes) {
    const { x, y } = pos(n);
    const id = n.id;
    const comp = compOf(def, id);
    const tp = def.tps.find(t2 => t2.id === id);
    const sus = suspect.has(`${n.row}:${n.idx}`);
    if (comp) {
      const fs = findingState(job.found[id], comp.ohm);
      const tag = job.tags[id];
      const can = reachable(job, comp);
      const edge = tag === 'sus' ? C.red : tag === 'ok' ? C.ok : sus ? C.warn : '#55705f';
      p.box(x - 11, y - 9, 22, 18, can ? '#2c4237' : '#1a2621', edge);
      p.g.save(); p.g.beginPath(); p.g.rect(x - 10, y - 8, 20, 16); p.g.clip();
      drawPart(p, comp, { x: x - 9, y: y - 7, w: 18, h: 14 }, {}, job.ctx, 0);
      p.g.restore();
      if (fs) p.disc(x + 10, y - 8, 3, fs === 2 ? C.warn : '#6fae9a');
      if (tag) p.label(tag === 'sus' ? '?' : '✓', x - 10, y - 14, 9, tag === 'sus' ? C.red : C.ok);
      p.text(comp.short, x, y + 10, 8, can ? C.cream : '#6b7d73', 'center', 700);
      const hid = 'fc:' + id;
      if (ui.hover === hid) p.ring(x, y, 14, C.gold);
      region({ id: hid, x: x - 14, y: y - 11, w: 28, h: 30, click: () => { if (!reachable(job, comp)) return toast(comp.layer === 2 ? '섀시를 빼야 닿습니다' : comp.front ? '덮개를 닫아야 닿습니다' : '덮개를 열어야 닿습니다', true); if (ui.tool === 'wiggle') return toast('흔들기는 작업대에서 누르고 계세요'); applyTool({ comp: id }); } });
    } else if (tp) {
      const r = job.found[id]?.tp;
      const st = tpState(tp, r);
      const color = [tp.kind === 'beat' || tp.kind === 'amp' ? '#9fc3bd' : C.brass, C.ok, C.warn, C.red][st];
      p.disc(x, y, 6, C.ink); p.disc(x, y, 5, color);
      if (r) p.text(tp.kind === 'beat' ? (st === 1 ? '고름' : st === 3 ? '없음' : '절뚝') : `${r.v}${tp.unit}`, x, y + 8, 8, color, 'center', 700);
      else p.text(tp.label, x, y + 8, 7, C.sage, 'center', 500);
      const hid = 'ft:' + id;
      if (ui.hover === hid) p.ring(x, y, 9, C.gold);
      region({ id: hid, x: x - 12, y: y - 10, w: 24, h: 28, click: () => { if (!visible(job, tp.layer)) return toast('덮개를 열어야 닿습니다', true); applyTool({ tp: id }); } });
    }
  }
}

/* ---------- 계기판 ---------- */
function needleTarget(t: number) {
  const m = ui.meter;
  if (!m) return 0;
  const dt = t - m.t0;
  let pos = 0;
  if (m.mode === 'Ω') {
    if (m.cap === 'kick') pos = dt < 0.12 ? dt / 0.12 * 0.95 : 0.95 * Math.exp(-(dt - 0.12) * 1.3);
    else if (m.cap === 'weak') pos = dt < 0.12 ? dt / 0.12 * 0.35 : 0.35 * Math.exp(-(dt - 0.12) * 4);
    else if (m.cap === 'short') pos = 0.97;
    else if (m.cap === 'none') pos = 0;
    else if (m.value === Infinity) pos = 0;
    else { const ref = Math.max(1, m.expect > 0 ? m.expect : 1); pos = 1 / (1 + m.value / ref); }
    if (m.flicker) pos = Math.sin(t * 17) > 0.2 ? pos : 0.02 + Math.random() * 0.05;
  } else if (m.mode === 'beat') pos = m.value ? 0.7 : 0;
  else pos = Math.min(1, (m.value / (m.expect || 1)) * 0.7);
  if (m.shaky) pos += Math.sin(t * 40) * 0.04;
  return Math.max(0, Math.min(1, pos));
}

function drawMeter(p: Painter, t: number) {
  const M = METER;
  p.panel(M.x, M.y, M.w, M.h, '#d9a443', '#3a2a10');
  p.rect(M.x + 1, M.y + M.h - 6, M.w - 2, 5, '#b9852f');
  const fx = M.x + 6, fy = M.y + 6, fw = 124, fh = 74;
  p.box(fx, fy, fw, fh, '#f2ead0', '#3a2a10');
  const cx = fx + fw / 2, cy = fy + fh - 8, rad = 54;
  const ang = (u: number) => Math.PI * (1.18 + 0.64 * u);
  for (let i = 0; i <= 20; i++) { const a = ang(i / 20); const r1 = i % 5 ? rad - 3 : rad - 6; p.line(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, '#3a2a10'); }
  const m = ui.meter;
  const band = !m ? null : m.mode === 'Ω' ? (m.cap ? null : m.expect < 0 ? null : m.expect >= 1 ? [0.42, 0.58] : [0.72, 1]) : m.mode === 'beat' ? null : [0.6, 0.8];
  if (band) for (let u = band[0]; u <= band[1]; u += 0.005) { const a = ang(u); for (let k = 0; k < 4; k++) p.rect(cx + Math.cos(a) * (rad + 2 + k * 0.6), cy + Math.sin(a) * (rad + 2 + k * 0.6), 1, 1, '#4a9a4a'); }
  const target = needleTarget(t);
  ui.needle += (target - ui.needle) * 0.25;
  const a = ang(ui.needle);
  p.line(cx, cy, cx + Math.cos(a) * (rad - 4), cy + Math.sin(a) * (rad - 4), C.red, 2);
  p.disc(cx, cy, 4, '#3a2a10');
  p.text(m?.mode === 'Ω' ? 'Ω  ∞ ← → 0' : m?.mode === 'beat' ? '박자' : m?.mode === 'amp' ? '진폭' : m?.mode === 'inject' ? '삐— 크기' : 'V', cx, fy + 3, 8, '#3a2a10', 'center', 700);
  // 오른쪽 숫자창
  const dx = M.x + 136, dy = M.y + 8;
  p.box(dx, dy, 80, 30, '#2a3a2a', '#101810');
  const digits = !m ? '----' : m.mode === 'Ω' ? (m.cap ? (m.cap === 'short' ? '0.5' : 'C') : m.value === Infinity ? 'oL' : fmt(m.value)) : m.mode === 'beat' ? (m.value ? m.value.toFixed(2) : '0') : m.mode === 'inject' ? (m.value ? fmt(m.value * 10) : '0') : fmt(m.value);
  p.seg(digits.padStart(4, ' ').slice(-5), dx + 6, dy + 6, 18, (m?.flicker && Math.sin(t * 17) < 0.2) ? '#2f4a2f' : '#9cf08a', '#2f4a2f');
  p.text(m?.unit ?? '', dx + 77, dy + 18, 9, '#9cf08a', 'right', 700);
  if (m) {
    p.text(m.label, dx, dy + 34, 10, '#2a1a05', 'left', 700);
    const judge = m.mode === 'beat' ? (m.value === 0 ? '멈춤' : Math.abs((m.b ?? 0) - m.value) > 0.05 ? `똑${m.value} 딱${m.b} 불균일` : '고른 박자') : m.mode === 'Ω' && m.cap ? capWord(m.cap) : band ? (target >= band[0] - 0.02 && target <= band[1] + 0.02 ? '정상 범위' : target < 0.05 ? (m.mode === 'Ω' ? '끊김 ∞' : '없음!') : target < band[0] ? '낮음' : '높음') : m.mode === 'Ω' ? '정상값 수첩 참고' : '';
    p.text(judge, dx, dy + 48, 9, judge.includes('정상') || judge.includes('고른') || judge.includes('돌아옴') ? '#1f5a1f' : '#8a1f10', 'left', 700);
    if (m.shaky) p.text('바늘 떨림', dx, dy + 60, 9, '#8a1f10', 'left', 700);
  } else { p.text('테스터를 대면', dx, dy + 36, 9, '#3a2a10', 'left', 700); p.text('바늘이 움직인다', dx, dy + 49, 9, '#3a2a10', 'left', 700); }
}
function capWord(c: string) { return c === 'kick' ? '튀었다 돌아옴(정상)' : c === 'weak' ? '조금만 튐' : c === 'none' ? '꿈쩍 안 함' : '붙어버림!'; }
function fmt(v: number) { return v >= 100 ? String(Math.round(v)) : v >= 10 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(2).replace(/0$/, ''); }

/* ---------- 조작 줄 ---------- */
function drawControls(p: Painter, def: ItemDef, job: Job) {
  const state = holder.state;
  let x = 4;
  const y = 266, h = 26;
  p.rect(4, y - 1, 404, h + 2, '#16201c');
  const powerOn = job.ctx.power;
  button(p, 'power', x, y, 72, h, powerOn ? def.power.off : def.power.on, () => { setCtx(state, { power: !powerOn }); sfx(powerOn ? 'click' : 'pop'); }, { kind: powerOn ? 'on' : undefined, size: 10 });
  x += 76;
  if (def.sw) {
    p.text(def.id === 'cassette' ? '키' : '스위치', x, y + 8, 9, C.sage, 'left', 700);
    x += def.id === 'cassette' ? 14 : 30;
    def.sw.forEach((label, i) => { button(p, 'sw' + i, x, y, 24, h, label, () => { setCtx(state, { sw: i }); }, { kind: job.ctx.sw === i ? 'on' : 'quiet', size: 9 }); x += 25; });
    x += 4;
  }
  for (const [key, label] of [['knobA', def.knobA], ['knobB', def.knobB]] as const) {
    if (!label) continue;
    const v = job.ctx[key];
    const tw = 56;
    p.text(label, x, y + 8, 9, C.sage, 'left', 700);
    const sx = x + 24;
    p.rect(sx, y + 12, tw, 3, '#3a4a40');
    if (key === 'knobA' && def.id === 'radio') for (const st of STATIONS) p.rect(sx + st.at * tw - 1, y + 9, 2, 2, '#55705f');
    p.box(sx + v * tw - 4, y + 5, 8, 16, C.paper);
    region({ id: key, x: sx - 4, y, w: tw + 8, h, down: (px) => setCtx(state, { [key]: Math.max(0, Math.min(1, (px - sx) / tw)) }), drag: (px) => setCtx(state, { [key]: Math.max(0, Math.min(1, (px - sx) / tw)) }) });
    x += tw + 30;
  }
  if (def.nudge) {
    button(p, 'nudge', x, y, 52, h, def.nudge, () => { const comp = def.comps.find(c => c.hand === 'nudge'); if (comp) { const r = handUse(state, comp.id); if (!r.ok) toast(r.text, true); } }, { kind: 'quiet', size: 9 });
    x += 56;
  }
  const max = def.chassis ? 2 : 1;
  const coverW = 408 - x;
  if (coverW > 40) {
    if (job.open < max) button(p, 'open', x, y, job.open > 0 ? coverW / 2 - 2 : coverW, h, job.open === 0 ? `${def.coverLabel} 열기` : '섀시 빼기', () => openCover(job.open + 1), { kind: 'quiet', size: 9, sub: '5분' });
    if (job.open > 0) button(p, 'close', job.open < max ? x + coverW / 2 : x, y, job.open < max ? coverW / 2 : coverW, h, '닫기', () => openCover(job.open - 1), { kind: 'quiet', size: 9, sub: '3분' });
  }
  button(p, 'watch', 412, y, 224, h, '켜 두고 10분 지켜보기', () => { const r = watch(state); if (!r.ok) toast(r.text, true); else toast('10분 지켜봤다'); }, { kind: 'quiet', size: 10, icon: (ix, iy) => drawToolIcon(p, 'clock', ix, iy) });
}

/* ---------- 공구함 ---------- */
function drawToolbar(p: Painter, job: Job | null) {
  const state = holder.state;
  p.rect(0, 294, 640, 66, '#3a2a1c');
  p.rect(0, 294, 640, 2, '#5b4330');
  TOOLS.forEach((tool, i) => {
    const x = 4 + i * 42, y = 298;
    const locked = tool.needs && !state.tools.includes(tool.needs);
    const on = ui.tool === tool.id;
    const hov = ui.hover === 'tool:' + tool.id;
    p.box(x, y, 40, 58, on ? C.gold : hov ? '#5b4a38' : '#4a3a2a', on ? '#fff3c4' : '#24180e');
    if (!locked) drawToolIcon(p, tool.id, x + 8, y + 5);
    else { p.disc(x + 20, y + 16, 7, '#24180e'); p.rect(x + 16, y + 16, 8, 7, '#8a7a60'); p.ring(x + 20, y + 14, 3, '#8a7a60'); }
    p.text(tool.name, x + 20, y + 31, 10, on ? C.ink : locked ? '#8a7a60' : C.cream, 'center', 700);
    const cost = TOOL_TIME[tool.id];
    p.text(locked ? '공구상' : cost ? `${cost}분` : '', x + 20, y + 44, 8, on ? '#4d3a14' : '#b9a27a', 'center', 500);
    region({ id: 'tool:' + tool.id, x, y, w: 40, h: 58, click: () => { if (locked) return toast('장부·공구상에서 살 수 있습니다', true); ui.tool = tool.id; sfx('click', 0.4); } });
  });
  const bx = 512;
  const due = job ? job.open * 3 + 3 : 0;
  button(p, 'handback', bx, 298, 124, 32, '돌려주기', () => {
    const r = handBack(state);
    if ('kind' in r) { ui.counter = { kind: 'return', outcome: r }; ui.scene = 'counter'; ui.popups = []; ui.meter = null; sfx(r.kind === 'paid' ? 'coin' : 'bad'); }
    else toast(r.text, true);
  }, { kind: 'primary', disabled: !job, size: 13, sub: job ? `조립·확인 ${due}분` : undefined });
  button(p, 'shelf', bx, 334, 60, 22, '선반', () => { ui.overlay = { kind: 'shelf' }; }, { kind: 'quiet', size: 10 });
  button(p, 'giveup', bx + 64, 334, 60, 22, '포기', () => { ui.overlay = { kind: 'giveup' }; }, { kind: 'quiet', size: 10, disabled: !job });
}

/* ---------- 말풍선들 ---------- */
function drawPopups(p: Painter, t: number) {
  ui.popups = ui.popups.filter(pp => t - pp.t0 < (pp.kind === 'closeup' ? 4 : 2.4));
  for (const pp of ui.popups) {
    const age = t - pp.t0;
    if (pp.kind === 'closeup') {
      const r = 34;
      const x = Math.max(STAGE.x + r + 6, Math.min(STAGE.x + STAGE.w - r - 6, pp.x + 46));
      const y = Math.max(STAGE.y + r + 6, Math.min(STAGE.y + STAGE.h - r - 30, pp.y - 30));
      p.line(pp.x, pp.y, x, y, C.cream);
      drawCloseup(p, pp.shape, pp.mark, x, y, r);
      const tw = p.measure(pp.text, 10, 700) + 12;
      p.panel(x - tw / 2, y + r + 5, tw, 16, pp.mark === 'ok' ? C.paper : '#f3d2c4');
      p.text(pp.text, x, y + r + 7, 10, pp.mark === 'ok' ? C.ink : '#7a1a0a', 'center', 700);
    } else if (pp.kind === 'sound') {
      const word = SOUND_WORD[pp.sound];
      const bad = BAD_SOUND.has(pp.sound);
      for (let i = 0; i < 3; i++) { const rr = 6 + ((age * 30 + i * 8) % 24); p.ring(pp.x, pp.y - 6, rr, `rgba(255,230,160,${Math.max(0, 0.6 - rr / 40)})`); }
      bubble(p, pp.x, pp.y - 22 - age * 6, word, bad);
    } else if (pp.kind === 'touch') {
      const words = [HEAT_WORD[pp.heat], pp.feel ? FEEL_WORD[pp.feel] : ''].filter(Boolean).join(' · ');
      if (pp.heat > 0) for (let i = 0; i < 3; i++) p.rect(pp.x - 8 + i * 7, pp.y - 8 - ((age * 20 + i * 5) % 14), 2, 5, pp.heat === 2 ? C.red : C.warn);
      bubble(p, pp.x, pp.y - 26, words, pp.heat === 2 || !!pp.feel && ['stiff', 'sticky', 'catch', 'free', 'loose', 'hard', 'slack', 'mushy'].includes(pp.feel));
    } else if (pp.kind === 'beep') {
      if (pp.level > 0) for (let i = 0; i < 3; i++) { const rr = 6 + ((age * 40 + i * 9) % 28) * pp.level; p.ring(pp.x, pp.y + 10, rr, 'rgba(160,240,140,0.6)'); }
      bubble(p, pp.x, pp.y - 14, pp.level === 0 ? '…조용' : pp.level < 0.5 ? '삐… (작다)' : pp.torn ? '삐— 지지직' : '삐—!', pp.level < 0.5 || !!pp.torn);
    }
  }
  if (ui.toast && t - ui.toast.t0 < 2.6) {
    const tw = p.measure(ui.toast.text, 11, 700) + 20;
    const x = STAGE.x + STAGE.w / 2 - tw / 2, y = STAGE.y + 6;
    p.panel(x, y, tw, 20, ui.toast.bad ? '#f3c9b9' : C.paper);
    p.text(ui.toast.text, x + tw / 2, y + 3, 11, ui.toast.bad ? '#7a1a0a' : C.ink, 'center', 700);
  }
}

function bubble(p: Painter, x: number, y: number, text: string, bad: boolean) {
  const tw = p.measure(text, 11, 700) + 14;
  const bx = Math.max(STAGE.x + 2, Math.min(STAGE.x + STAGE.w - tw - 2, x - tw / 2));
  const by = Math.max(STAGE.y + 2, y - 18);
  p.panel(bx, by, tw, 18, bad ? '#f3d2c4' : C.paper);
  p.rect(Math.max(bx + 4, Math.min(bx + tw - 8, x - 2)), by + 17, 5, 3, bad ? '#f3d2c4' : C.paper);
  p.text(text, bx + tw / 2, by + 2, 11, bad ? '#7a1a0a' : C.ink, 'center', 700);
}

/* ---------- 수리 손맛 ---------- */
export function drawRepair(p: Painter, t: number) {
  const ov = ui.overlay;
  if (ov?.kind !== 'repair') return;
  const state = holder.state;
  const job = activeJob(state)!;
  const def = item(job.itemId);
  const comp = compOf(def, ov.comp)!;
  const X = 64, Y = 78, Wd = 280, Hd = 160;
  p.rect(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 'rgba(8,12,10,0.55)');
  p.clearText(STAGE.x, STAGE.y, STAGE.w, STAGE.h);
  region({ id: 'rp-bg', x: 0, y: 0, w: 640, h: 360 });
  p.panel(X, Y, Wd, Hd, C.paper);
  p.text(`${comp.name} 수리`, X + 10, Y + 6, 12, C.ink, 'left', 700);
  button(p, 'rp-x', X + Wd - 26, Y + 4, 20, 18, '✕', () => { ui.overlay = null; }, { kind: 'quiet', size: 10 });
  if (!ov.action) {
    const acts = actionsOf(comp);
    p.text('어떻게 고칠까?  결과는 다시 켜 봐야 안다', X + 10, Y + 24, 9, '#6b6450');
    acts.forEach((a, i) => {
      const bw = (Wd - 20 - (acts.length - 1) * 6) / acts.length;
      const bx = X + 10 + i * (bw + 6);
      const price = a === 'replace' ? comp.part ?? 0 : 0;
      button(p, 'rp-' + a, bx, Y + 44, bw, 54, ACTION_NAME[a], () => {
        const blocked = repairCheck(state, comp.id, a);
        if (blocked) { toast(blocked.text, true); ui.overlay = null; return; }
        ov.action = a; ov.progress = 0; ov.msg = '';
      }, { size: 13, sub: `${repairMinutes(def, a)}분${price ? ' · ' + won(price) : ''}` });
    });
    p.wrap('교체: 확실하지만 돈이 든다.  세척·납땜·주유·조정: 싸지만 맞는 고장에만 듣는다.', X + 10, Y + 108, Wd - 20, 9, '#5b5644');
    return;
  }
  const a = ov.action;
  const finish = () => {
    const r = repair(state, comp.id, a);
    ui.overlay = null;
    ui.popups = [];
    if (r.ok) { toast(r.text); sfx('good'); } else toast(r.text, true);
  };
  const area = { x: X + 10, y: Y + 28, w: Wd - 20, h: 96 };
  p.box(area.x, area.y, area.w, area.h, '#2c3a33');
  const help: Record<Action, string> = { replace: '새 부품을 끌어다 자리에 놓으세요', clean: '부품을 문질러 닦으세요', solder: '인두를 누르고 있다가 초록에서 떼세요', oil: '축에 기름을 세 방울', adjust: '손잡이를 끌어 눈금을 가운데로' };
  p.text(help[a], X + 10, Y + Hd - 30, 10, C.ink, 'left', 700);
  if (ov.msg) p.text(ov.msg, X + Wd - 10, Y + Hd - 30, 10, C.red, 'right', 700);
  const bar = (v: number, zone?: [number, number]) => {
    p.box(X + 10, Y + Hd - 14, Wd - 20, 8, '#3a4440');
    if (zone) p.rect(X + 11 + zone[0] * (Wd - 22), Y + Hd - 13, (zone[1] - zone[0]) * (Wd - 22), 6, '#4a9a4a');
    p.rect(X + 11, Y + Hd - 13, Math.min(1, v) * (Wd - 22), 6, zone ? 'rgba(255,200,80,0.8)' : C.gold);
  };
  const sim = simulate(job);
  if (a === 'replace') {
    const slot = { x: area.x + area.w - 90, y: area.y + 14, w: 70, h: 64 };
    p.box(slot.x, slot.y, slot.w, slot.h, '#1d2a25', C.warn);
    p.text('자리', slot.x + slot.w / 2, slot.y + slot.h + 1, 8, C.cream, 'center');
    const drag = ov.drag ?? [area.x + 20, area.y + 16];
    p.box(area.x + 14, area.y + 10, 80, 72, '#5b4330');
    p.text('새 부품', area.x + 54, area.y + 84, 8, C.cream, 'center');
    drawPart(p, comp, { x: drag[0], y: drag[1], w: 60, h: 56 }, sim.fx, job.ctx, t);
    region({
      id: 'rp-new', x: drag[0], y: drag[1], w: 60, h: 56,
      down: (px, py) => { ov.last = [px - drag[0], py - drag[1]]; },
      drag: (px, py) => { ov.drag = [px - (ov.last?.[0] ?? 0), py - (ov.last?.[1] ?? 0)]; },
      up: () => { const d = ov.drag; if (d && d[0] + 30 > slot.x && d[0] + 30 < slot.x + slot.w && d[1] + 28 > slot.y && d[1] + 28 < slot.y + slot.h) finish(); else ov.drag = undefined; },
    });
  } else if (a === 'clean') {
    const r = { x: area.x + area.w / 2 - 50, y: area.y + 10, w: 100, h: 76 };
    drawPart(p, comp, r, sim.fx, job.ctx, t);
    const left = Math.round((1 - ov.progress) * 40);
    for (let i = 0; i < left; i++) p.rect(r.x + ((i * 37) % r.w), r.y + ((i * 23) % r.h), 3, 2, '#6b4a1e');
    if (ov.progress > 0.2) for (let i = 0; i < 4; i++) p.rect(r.x + ((i * 31 + Math.floor(t * 9) * 13) % r.w), r.y + ((i * 17 + Math.floor(t * 9) * 7) % r.h), 2, 2, C.white);
    bar(ov.progress);
    region({
      id: 'rp-scrub', ...area,
      down: (px, py) => { ov.last = [px, py]; },
      drag: (px, py) => { const l = ov.last ?? [px, py]; ov.progress += Math.hypot(px - l[0], py - l[1]) / 900; ov.last = [px, py]; if (ov.progress >= 1) finish(); },
    });
  } else if (a === 'solder') {
    const r = { x: area.x + 30, y: area.y + 20, w: 110, h: 56 };
    drawPart(p, comp, r, sim.fx, job.ctx, t);
    const heat = ov.holding ? Math.min(1.2, (t - ov.hold0) / 1.6) : ov.progress;
    const ix = area.x + 170, iy = area.y + 20;
    p.rect(ix, iy, 8, 40, '#7a4a2a'); for (let i = 0; i < 14; i++) p.rect(ix - i * 2, iy + 40 + i, 3, 2, C.steel);
    if (ov.holding && heat > 0.3) for (let i = 0; i < 3; i++) p.rect(ix - 30 + i * 4, iy + 40 - ((t * 30 + i * 7) % 20), 2, 4, 'rgba(230,230,230,0.6)');
    bar(heat, [0.55, 0.85]);
    region({
      id: 'rp-iron', ...area,
      down: () => { ov.holding = true; ov.hold0 = t; ov.msg = ''; },
      up: () => {
        const h2 = Math.min(1.2, (ui.now - ov.hold0) / 1.6);
        ov.holding = false; ov.progress = h2;
        if (h2 >= 0.55 && h2 <= 0.85) finish();
        else ov.msg = h2 < 0.55 ? '덜 녹았다. 다시' : '너무 달궜다. 다시';
      },
    });
  } else if (a === 'oil') {
    const r = { x: area.x + area.w / 2 - 40, y: area.y + 20, w: 80, h: 60 };
    drawPart(p, comp, r, sim.fx, job.ctx, t);
    const drops = Math.round(ov.progress * 3);
    for (let i = 0; i < drops; i++) p.disc(r.x + 20 + i * 20, r.y + r.h - 6, 3, '#d9a443');
    p.rect(area.x + area.w / 2 - 3, area.y + 2, 6, 14, '#c9c9c9');
    bar(ov.progress);
    region({ id: 'rp-oil', ...area, click: () => { ov.progress = Math.min(1, ov.progress + 1 / 3); sfx('pop', 0.4); if (ov.progress >= 0.99) finish(); } });
  } else if (a === 'adjust') {
    const r = { x: area.x + 20, y: area.y + 14, w: 90, h: 68 };
    drawPart(p, comp, r, sim.fx, job.ctx, t);
    const gx = area.x + 130, gw = 130, gy = area.y + 30;
    p.box(gx, gy, gw, 16, '#1d2a25', C.cream);
    p.rect(gx + gw / 2 - 1, gy - 6, 2, 28, C.ok);
    const off = ov.progress - ov.target;
    const needle = gx + gw / 2 + off * gw * 1.6;
    p.rect(Math.max(gx, Math.min(gx + gw - 3, needle)), gy + 2, 3, 12, Math.abs(off) < 0.05 ? C.ok : C.red);
    const kx = gx + ov.progress * gw;
    p.box(kx - 6, gy + 34, 12, 20, C.gold);
    p.text('손잡이', kx, gy + 56, 8, C.cream, 'center');
    region({
      id: 'rp-adjust', x: gx - 10, y: gy - 10, w: gw + 20, h: 80,
      down: (px) => { ov.progress = Math.max(0, Math.min(1, (px - gx) / gw)); },
      drag: (px) => { ov.progress = Math.max(0, Math.min(1, (px - gx) / gw)); },
      up: () => { if (Math.abs(ov.progress - ov.target) < 0.05) finish(); else ov.msg = '아직 어긋났다'; },
    });
  }
}

export function benchHoverCursor() {
  const r = regionById(ui.hover);
  return r ? 'pointer' : 'default';
}

export function currentTutorial() { return tutorialStep(); }
void timeLeft;
