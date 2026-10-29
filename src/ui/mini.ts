import type { Action, Comp } from '../types';
import { C, Painter } from '../gfx/painter';
import { drawPart } from '../gfx/parts';
import { setLoop, sfx, type Sfx } from '../audio';
import { button, region, ui } from './core';
import { coverPlate, pcb, screwHead, thermometer, tool, TIP } from '../gfx/props';
import { benchMat, woodStrip } from './backdrops';

/** 지금 고치는 물건 (덮개 색 등) */
let theme = '';
export function setMiniItem(id: string) { theme = id; }

/**
 * 수리 손맛: 실제 작업 순서를 단계별 미니게임으로 진행한다.
 * 실패하면 그 단계를 다시 하고, 모든 단계를 마치면 onDone이 불린다.
 */
type StepKind = 'unscrew' | 'screwIn' | 'twistOut' | 'twistIn' | 'desolder' | 'pull' | 'insert' | 'solder' | 'strip' | 'spray' | 'scrub' | 'drops' | 'route' | 'beat' | 'bend' | 'tap' | 'belt' | 'trim';
interface Step { kind: StepKind; label: string; leg?: number; n?: number }

interface Mini {
  title: string;
  comp: Comp;
  steps: Step[];
  i: number;
  d: Record<string, any>;
  msg: string; msgBad: boolean; msgT: number;
  redo: number;
  onDone: (redo: number) => void;
  onCancel?: () => void;
  doneT?: number;
}

let mini: Mini | null = null;
export const miniActive = () => !!mini;

const A = { x: 4, y: 22, w: 632, h: 270 };
const CX = 320, CY = 182;

/* ---------- 계획 ---------- */
export function startScrews(comp: Comp, n: number, title: string, onDone: () => void, tighten = false, onCancel?: () => void) {
  begin({
    title, comp, onDone: () => onDone(), onCancel,
    steps: [tighten ? { kind: 'screwIn', label: `덮개를 맞추고 나사 ${n}개를 시계 방향으로 조이자`, n } : { kind: 'unscrew', label: `나사 ${n}개를 반시계 방향으로 돌려 풀자`, n }],
  });
}

const SOLDERED_SAFE = new Set(['cord', 'bulb', 'fuse', 'outtube', 'roller', 'barrel', 'susp', 'bearing', 'belt', 'mic', 'neon', 'pan', 'idler', 'cart', 'vert', 'lcd', 'ribbon', 'relay', 'pedal', 'magnet']);
export function startRepairMini(comp: Comp, action: Action, onDone: (redo: number) => void, onCancel: () => void) {
  const steps: Step[] = [];
  const legs = (verb: 'desolder' | 'solder', what: string) => [0, 1].forEach(leg => steps.push({ kind: verb, leg, label: `${what} (${leg + 1}/2)` }));
  if (action === 'clean') steps.push({ kind: 'spray', label: '접점 세정제를 뿌리자 (누르고 있기)' }, { kind: 'scrub', label: '솔로 때를 문질러 모두 지우자' });
  else if (action === 'oil') steps.push({ kind: 'drops', label: '돌아가는 축의 기름 구멍에 맞춰 세 방울' });
  else if (action === 'solder') legs('solder', '금 간 납땜을 다시 하자');
  else if (action === 'adjust') {
    if (comp.id === 'dial') steps.push({ kind: 'route', label: '점선을 따라 풀리에 실을 차례로 걸자' });
    else if (comp.id === 'escape') steps.push({ kind: 'beat', label: '앵커를 굽혀 똑·딱 간격을 같게 맞추자' });
    else if (comp.id === 'train') steps.push({ kind: 'bend', label: '휜 톱니를 펜치로 끌어 기준선에 맞추자' });
    else if (comp.id === 'thermo') steps.push({ kind: 'bend', label: '붙은 접점을 펜치로 떼어 간격을 기준선에 맞추자' });
    else if (comp.id === 'pitch') steps.push({ kind: 'trim', label: '스트로보 점이 멈출 때까지 속도 나사를 돌리자' });
    else if (comp.id === 'vhold') steps.push({ kind: 'trim', label: '흐르는 화면이 멈출 때까지 수직 동기를 돌리자' });
    else if (comp.id === 'hook') steps.push({ kind: 'trim', label: '가마 끝이 바늘 뒤를 스칠 때까지 가마를 돌려 맞추자' });
    else steps.push({ kind: 'tap', label: '망치로 고정 핀을 톡톡 박자' });
  } else if (comp.shape === 'bulb') steps.push({ kind: 'twistOut', label: '헌 전구를 반시계로 돌려 빼자', n: 2 }, { kind: 'insert', label: '새 전구를 소켓에 끼우자' }, { kind: 'twistIn', label: '시계 방향으로 돌려 조이자', n: 2 });
  else if (comp.id === 'cord') steps.push({ kind: 'strip', label: '스트리퍼로 피복을 표시선까지 벗기자' }, { kind: 'twistIn', label: '단자에 감고 나사를 시계 방향으로 조이자', n: 1 });
  else if (comp.id === 'belt') steps.push({ kind: 'pull', label: '헌 벨트를 위로 끌어 빼자' }, { kind: 'belt', label: '새 벨트를 모터 풀리 → 플라이휠 순서로 걸자' });
  else if (SOLDERED_SAFE.has(comp.id)) steps.push({ kind: 'pull', label: '헌 부품을 위로 끌어 빼자' }, { kind: 'insert', label: '새 부품을 자리에 맞춰 끼우자' });
  else { legs('desolder', '다리 납을 녹여 흡입기로 빼자'); steps.push({ kind: 'pull', label: '헌 부품을 위로 뽑자' }, { kind: 'insert', label: '새 부품 다리를 구멍에 맞춰 꽂자' }); legs('solder', '다리를 납땜하자'); }
  const name = { replace: '교체', clean: '세척', solder: '납땜', oil: '주유', adjust: '조정' }[action];
  begin({ title: `${comp.name} ${name}`, comp, steps, onDone, onCancel });
}

function begin(m: Omit<Mini, 'i' | 'd' | 'msg' | 'msgBad' | 'msgT' | 'redo'>) {
  mini = { ...m, i: 0, d: {}, msg: '', msgBad: false, msgT: 0, redo: 0 };
  initStep();
}

function say(text: string, bad = false, sound?: Sfx) {
  if (!mini) return;
  mini.msg = text; mini.msgBad = bad; mini.msgT = ui.now;
  if (bad) mini.redo++;
  if (sound) sfx(sound); else if (bad) sfx('bad', 0.5);
}

/** 이번 프레임의 계속 나는 소리 크기 */
const loop = { sizzle: 0, spray: 0 };

function next() {
  if (!mini) return;
  sfx('good', 0.5);
  mini.i++;
  if (mini.i >= mini.steps.length) { mini.doneT = ui.now; return; }
  initStep();
}

function initStep() {
  const m = mini!;
  const s = m.steps[m.i];
  const d: Record<string, any> = (m.d = {});
  switch (s.kind) {
    case 'unscrew': case 'screwIn': {
      const n = s.n ?? 4;
      d.screws = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2 + (n === 2 ? Math.PI / 2 : Math.PI / n);
        return { x: CX + Math.cos(a) * 120, y: CY + Math.sin(a) * 52, p: 0, rot: i, out: false };
      });
      break;
    }
    case 'twistOut': case 'twistIn': d.p = 0; d.rot = 0; break;
    case 'desolder': case 'solder': d.heat = 0; d.phase = 'heat'; d.blob = 0; break;
    case 'pull': d.dy = 0; break;
    case 'insert': {
      const specs = specsOf(m.comp);
      d.need = specs[0];
      d.cands = specs.map((spec, i) => ({ spec, pos: [CX + 195, CY - 48 + i * 46] as [number, number], home: [CX + 195, CY - 48 + i * 46] as [number, number] }));
      d.cands.sort(() => Math.random() - 0.5);
      d.cands.forEach((c: any, i: number) => { c.home = [CX + 195, CY - 48 + i * 46]; c.pos = [...c.home]; });
      break;
    }
    case 'strip': d.x = CX + 150; break;
    case 'spray': d.amount = 0; break;
    case 'scrub': d.dots = Array.from({ length: 22 }, (_, i) => ({ x: CX - 70 + ((i * 37) % 140), y: CY - 40 + ((i * 53) % 80), on: true })); break;
    case 'drops': d.hits = 0; d.falling = null; d.puddles = []; break;
    case 'route': d.order = [0, 1, 2, 3]; d.at = 0; d.pulleys = [[CX - 150, CY + 40], [CX - 60, CY - 50], [CX + 80, CY - 50], [CX + 160, CY + 40]]; break;
    case 'beat': d.v = 0.15; d.target = 0.55 + Math.random() * 0.2; break;
    case 'bend': d.angle = 28; break;
    case 'tap': d.taps = 0; d.swing = 0; break;
    case 'belt': d.at = 0; break;
    case 'trim': d.a = 0; d.target = 2.2 + Math.random() * 2.5; d.hold = 0; break;
  }
}

/* ---------- 그리기 ---------- */
export function drawMini(p: Painter, t: number) {
  const m = mini;
  if (!m) return;
  // 다른 화면 조작을 막는다
  region({ id: 'mini-block', x: 0, y: 0, w: 640, h: 360 });
  p.rect(0, 0, 640, 360, 'rgba(6,10,8,0.7)');
  p.clearText(0, 0, 640, 360);
  p.round(A.x - 1, A.y - 1, A.w + 2, A.h + 2, C.ink, 2);
  p.g.save(); p.g.beginPath(); p.g.rect(A.x, A.y, A.w, A.h); p.g.clip();
  benchMat(p, A.x, A.y, A.w, A.h);
  const lamp = p.g.createRadialGradient(CX, CY, 20, CX, CY, 340);
  lamp.addColorStop(0, 'rgba(255,220,150,0.22)'); lamp.addColorStop(0.6, 'rgba(255,220,150,0.05)'); lamp.addColorStop(1, 'rgba(0,0,0,0.35)');
  p.g.fillStyle = lamp; p.g.fillRect(A.x, A.y, A.w, A.h);
  p.g.restore();
  // 제목과 단계 표시
  p.g.save(); p.g.beginPath(); p.g.rect(A.x, A.y, A.w, 25); p.g.clip(); woodStrip(p, A.y - 2, 28); p.g.restore();
  p.rect(A.x, A.y + 25, A.w, 1, '#140d08');
  p.text(m.title, A.x + 11, A.y + 6, 12, '#140d08', 'left', 700);
  p.text(m.title, A.x + 10, A.y + 5, 12, C.gold, 'left', 700);
  m.steps.forEach((_, i) => {
    const sx = A.x + A.w - 90 + i * 12, sy = A.y + 12;
    p.disc(sx, sy, 5, '#140d08');
    p.disc(sx, sy, 4, i < m.i ? C.ok : i === m.i ? C.gold : '#5a4330');
    p.rect(sx - 2, sy - 2, 2, 1, 'rgba(255,255,255,0.5)');
  });
  if (m.doneT) {
    const age = t - m.doneT;
    if (!m.d.chimed) { m.d.chimed = true; sfx('chime'); setLoop('sizzle', 0); setLoop('spray', 0); }
    p.text('작업 끝!', CX, CY - 20, 26, C.ok, 'center', 400, 'sign');
    for (let i = 0; i < 12; i++) { const a = i * 0.52 + age * 2; p.rect(CX + Math.cos(a) * (40 + age * 80), CY + Math.sin(a) * (24 + age * 50), 3, 3, i % 2 ? C.glow : C.ok); }
    if (age > 0.8) { const done = m.onDone, redo = m.redo; mini = null; done(redo); }
    return;
  }
  const s = m.steps[m.i];
  const fresh = m.msg && t - m.msgT < 2.2;
  p.panel(A.x + 10, A.y + 30, A.w - 20, 22, fresh ? (m.msgBad ? '#f3c9b9' : '#d6efc8') : C.paper);
  p.text(`${m.i + 1}/${m.steps.length}  ${s.label}`, A.x + 18, A.y + 34, 11, C.ink, 'left', 700);
  if (fresh) p.text(m.msg, A.x + A.w - 18, A.y + 34, 12, m.msgBad ? '#7a1a0a' : '#1f5a1f', 'right', 700);
  if (m.onCancel) button(p, 'mini-x', A.x + A.w - 64, A.y + A.h - 30, 56, 22, '그만두기', () => { const c = m.onCancel!; mini = null; c(); }, { kind: 'quiet', size: 10 });
  loop.sizzle = 0; loop.spray = 0;
  STEP_DRAW[s.kind](p, t, m, s);
  setLoop('sizzle', loop.sizzle); setLoop('spray', loop.spray);
}

type Drawer = (p: Painter, t: number, m: Mini, s: Step) => void;

const angleOf = (x: number, y: number, cx: number, cy: number) => Math.atan2(y - cy, x - cx);
const wrap = (a: number) => (a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a);

/** 돌리기 동작: 중심 둘레를 끌어 각도를 쌓는다. dir -1은 반시계(풀기) */
function rotary(id: string, cx: number, cy: number, r: number, dir: number, turns: number, get: () => number, set: (v: number) => void, onFull: () => void) {
  let last: number | null = null;
  region({
    id, x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    down: (x, y) => { last = angleOf(x, y, cx, cy); },
    drag: (x, y) => {
      if (last === null) return;
      const a = angleOf(x, y, cx, cy);
      const delta = wrap(a - last);
      last = a;
      if (Math.abs(delta) > 1.1) { set(Math.max(0, get() - 0.06)); say('미끄덩! 천천히 돌려요', true, 'slip'); last = null; return; }
      const gain = (delta * dir) / (Math.PI * 2 * turns);
      if (gain > 0) { set(Math.min(1, get() + gain)); if (Math.random() < 0.3) sfx('ratchet', 0.8); }
      if (get() >= 1) { last = null; onFull(); }
    },
    up: () => { last = null; },
  });
}

function arrowRing(p: Painter, cx: number, cy: number, r: number, dir: number, t: number) {
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 1.6 + (dir < 0 ? -t * 2 : t * 2);
    p.rect(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r - 1, 2, 2, `rgba(255,220,140,${0.25 + (i / 18) * 0.6})`);
  }
  const a = (dir < 0 ? -t * 2 : t * 2) + (dir < 0 ? 0 : Math.PI * 1.6);
  p.disc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, C.gold);
}

function driverAt(p: Painter, x: number, y: number) { tool(p, 'driver', x, y, TIP.driver, 2); }
function ironAt(p: Painter, x: number, y: number, hot: boolean) {
  tool(p, hot ? 'ironHot' : 'iron', x, y, TIP.iron, 2);
  if (hot) { const k = (ui.now * 3) % 1; p.rect(x + 2 - k * 3, y - 6 - k * 14, 2, 2, `rgba(220,220,220,${0.5 - k * 0.5})`); }
}
function pliersAt(p: Painter, x: number, y: number) { tool(p, 'pliers', x, y, TIP.pliers, 2); }
function brushAt(p: Painter, x: number, y: number) { tool(p, 'brush', x, y, TIP.brush, 2); }

/* ---------- 단계별 미니게임 ---------- */
const STEP_DRAW: Record<StepKind, Drawer> = {
  unscrew(p, t, m) { screws(p, t, m, -1); },
  screwIn(p, t, m) { screws(p, t, m, 1); },
  twistOut(p, t, m, s) { twist(p, t, m, s, -1); },
  twistIn(p, t, m, s) { twist(p, t, m, s, 1); },
  desolder(p, t, m, s) { board(p, t, m, s, true); },
  solder(p, t, m, s) { board(p, t, m, s, false); },
  pull(p, _t, m) {
    const d = m.d;
    socketBase(p, m);
    const r = { x: CX - 50, y: CY - 74 - d.dy, w: 100, h: 90 };
    drawPart(p, m.comp, r, {}, ctx0, 0);
    p.label('↑ 위로 끌어올리기', CX, CY + 40, 11, C.gold);
    let y0 = 0;
    region({ id: 'mini-focus', ...r, down: (_x, y) => { y0 = y + d.dy; }, drag: (_x, y) => { d.dy = Math.max(0, y0 - y); if (Math.random() < 0.08) sfx('creak', 0.4); if (d.dy > 90) { say('빠졌다!', false, 'snap'); next(); } }, up: () => { if (d.dy <= 90) d.dy = 0; } });
  },
  insert(p, t, m) {
    const d = m.d;
    socketBase(p, m);
    const slot = { x: CX - 50, y: CY - 70, w: 100, h: 90 };
    const pulse = Math.sin(t * 6) > 0;
    p.rect(slot.x, slot.y, slot.w, 1, pulse ? C.gold : '#8a6a1f'); p.rect(slot.x, slot.y + slot.h, slot.w, 1, pulse ? C.gold : '#8a6a1f');
    p.rect(slot.x, slot.y, 1, slot.h, pulse ? C.gold : '#8a6a1f'); p.rect(slot.x + slot.w, slot.y, 1, slot.h, pulse ? C.gold : '#8a6a1f');
    // 헌 부품에 적혀 있던 규격
    p.panel(CX - 160, CY - 60, 90, 44, C.paper);
    p.text('헌 부품 표시', CX - 115, CY - 56, 9, '#5b5644', 'center', 700);
    p.text(d.need, CX - 115, CY - 42, 13, C.ink, 'center', 700);
    p.box(CX + 140, CY - 74, 112, 146, '#5b4330', '#2b1a0e'); p.label('부품 서랍', CX + 196, CY + 74, 10, C.cream);
    for (const c of d.cands) {
      const [px, py] = c.pos;
      const r = { x: px - 26, y: py - 20, w: 52, h: 34 };
      drawPart(p, m.comp, r, {}, ctx0, 0);
      p.label(c.spec, px, py + 13, 9, C.gold);
      let off = [0, 0];
      region({
        id: c.spec === d.need ? 'mini-focus' : 'mini-cand-' + c.spec, ...r,
        down: (x, y) => { off = [x - c.pos[0], y - c.pos[1]]; },
        drag: (x, y) => { c.pos = [x - off[0], y - off[1]]; },
        up: () => {
          const [qx, qy] = c.pos;
          const near = Math.abs(qx - CX) < 40 && Math.abs(qy - (CY - 25)) < 40;
          if (near && c.spec !== d.need) { say(`규격이 다르다! (${c.spec} ≠ ${d.need})`, true); c.pos = [...c.home]; return; }
          if (near && Math.abs(qx - CX) < 18 && Math.abs(qy - (CY - 25)) < 18) { c.pos = [CX, CY - 25]; say('딱 맞게 들어갔다', false, 'snap'); next(); return; }
          if (near) say('구멍이 안 맞는다. 조금 더 정확히', true);
          else c.pos = [...c.home];
        },
      });
    }
    void t;
  },
  strip(p, _t, m) {
    const d = m.d;
    const y = CY;
    p.rect(CX - 220, y - 6, 440, 12, '#6e5d48'); p.rect(CX - 220, y - 6, 440, 2, '#8f7c62');
    const target = CX + 60;
    p.rect(target, y - 22, 2, 44, C.red); p.label('여기까지', target, y - 36, 10, '#ff9a86');
    const cut = d.x;
    p.rect(cut, y - 3, CX + 220 - cut, 6, '#d98a4d');
    for (let i = cut; i < CX + 220; i += 6) p.rect(i, y - 3, 1, 6, '#b8662e');
    // 스트리퍼
    tool(p, 'stripper', cut, y, TIP.stripper);
    let start = 0;
    region({
      id: 'mini-focus', x: cut - 20, y: y - 40, w: 40, h: 80,
      down: (x) => { start = x - d.x; },
      drag: (x) => { d.x = Math.max(CX - 200, Math.min(CX + 200, x - start)); },
      up: () => {
        if (Math.abs(d.x - target) < 8) { say('딱 알맞게 벗겼다', false, 'scrape'); next(); }
        else if (d.x < target - 8) { say('너무 많이 벗겼다! 잘라 내고 다시', true, 'scrape'); d.x = CX + 150; }
        else say('피복이 아직 남았다. 더 왼쪽으로', true);
      },
    });
  },
  spray(p, t, m) {
    const d = m.d;
    drawPart(p, m.comp, { x: CX - 70, y: CY - 50, w: 140, h: 100 }, {}, ctx0, 0);
    const can = { x: CX + 150, y: CY - 60, w: 40, h: 90 };
    tool(p, 'spray', can.x + 6 + 21, can.y - 8 + 7 + (d.holding ? 2 : 0), TIP.spray);
    p.text('세정제', can.x + 21, can.y + 30, 8, '#c0392b', 'center', 700);
    if (d.holding) {
      d.amount = Math.min(1, d.amount + 0.02);
      loop.spray = 1;
      for (let i = 0; i < 14; i++) p.rect(can.x - 10 - ((t * 200 + i * 23) % 140), can.y - 4 + Math.sin(i * 1.3 + t * 9) * 16, 2, 2, 'rgba(220,240,245,0.7)');
      if (d.amount >= 1) { d.holding = false; say('골고루 뿌렸다'); next(); }
    }
    p.rect(CX - 60, CY + 64, 120, 6, '#3a4a40'); p.rect(CX - 60, CY + 64, 120 * d.amount, 6, '#9fd8e0');
    p.label('캔을 누르고 있기', can.x + 20, can.y + can.h + 4, 10, C.gold);
    region({ id: 'mini-focus', ...can, down: () => { d.holding = true; }, up: () => { d.holding = false; } });
  },
  scrub(p, _t, m) {
    const d = m.d;
    drawPart(p, m.comp, { x: CX - 90, y: CY - 60, w: 180, h: 120 }, {}, ctx0, 0);
    for (const dot of d.dots) if (dot.on) { p.rect(dot.x, dot.y, 5, 4, '#5a4220'); p.rect(dot.x + 1, dot.y, 2, 1, '#7a5a2e'); }
    const left = d.dots.filter((x: any) => x.on).length;
    p.label(`남은 때 ${left}`, CX, CY + 70, 11, C.gold);
    const [mx, my] = ui.mouse;
    brushAt(p, mx, my);
    region({
      id: 'mini-focus', x: CX - 100, y: CY - 70, w: 200, h: 140,
      drag: (x, y) => {
        for (const dot of d.dots) if (dot.on && Math.abs(dot.x - x) < 12 && Math.abs(dot.y - y) < 10) { dot.on = false; sfx('brush'); }
        if (d.dots.every((x2: any) => !x2.on)) { say('반짝반짝해졌다'); next(); }
      },
      down: () => {},
    });
  },
  drops(p, t, m) {
    const d = m.d;
    const holeX = CX + Math.sin(t * 1.7) * 110;
    p.box(CX - 160, CY + 20, 320, 30, '#8d9297', '#3c4044');
    for (let i = 0; i < 16; i++) p.rect(CX - 156 + ((i * 20 + t * 60) % 312), CY + 22, 2, 26, '#7a8085');
    p.disc(holeX, CY + 22, 6, '#1a1a1a'); p.ring(holeX, CY + 22, 8, C.gold);
    for (const px of d.puddles) p.rect(px - 6, CY + 52, 12, 3, '#d9a443');
    const [mx] = ui.mouse;
    const dx = Math.max(CX - 160, Math.min(CX + 160, mx));
    tool(p, 'oiler', dx, CY - 52, TIP.oiler, 2);
    if (d.falling) {
      const age = t - d.falling.t0;
      const y = CY - 50 + age * 160;
      p.disc(d.falling.x, y, 3, '#e8b84a');
      if (y >= CY + 20) {
        const hit = Math.abs(d.falling.x - holeX) < 11;
        if (hit) { d.hits++; say(`쏙! ${d.hits}/3`, false, 'drop'); if (d.hits >= 3) next(); }
        else { d.puddles.push(d.falling.x); say('빗나갔다. 구멍을 노려요', true); }
        d.falling = null;
      }
    }
    p.label(`들어간 기름 ${d.hits}/3 · 누르면 똑`, CX, CY + 64, 11, C.gold);
    region({ id: 'mini-focus', x: CX - 180, y: CY - 100, w: 360, h: 180, down: () => { if (!d.falling) { d.falling = { x: dx, t0: ui.now }; sfx('tick'); } } });
  },
  route(p, t, m) {
    const d = m.d;
    const pts: number[][] = d.pulleys;
    for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; for (let k = 0; k < 20; k += 2) p.rect(ax + (bx - ax) * k / 20, ay + (by - ay) * k / 20, 2, 2, i < d.at - 1 ? C.cream : 'rgba(255,220,140,0.4)'); }
    for (let i = 0; i < d.at - 1; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], C.cream, 2);
    pts.forEach(([x, y], i) => {
      const done = i < d.at, nextOne = i === d.at;
      p.disc(x, y, 16, done ? C.ok : '#8d9297'); p.ring(x, y, 16, nextOne && Math.sin(t * 8) > 0 ? C.gold : '#3c4044', 2); p.disc(x, y, 4, '#3c4044');
      p.label(String(i + 1), x, y - 30, 11, nextOne ? C.gold : C.cream);
      region({ id: nextOne ? 'mini-focus' : 'mini-pulley' + i, x: x - 18, y: y - 18, w: 36, h: 36, down: () => {
        if (i === d.at) { d.at++; sfx('pluck'); if (d.at >= pts.length) { say('실을 다 걸었다. 팽팽!'); next(); } }
        else if (i > d.at) { say('순서가 틀렸다. 실이 엉켰다!', true); d.at = 0; }
      } });
    });
  },
  beat(p, t, m) {
    const d = m.d;
    const off = d.v - d.target;
    const tick = 0.5 + off * 0.4, tock = 1 - tick;
    p.label('똑', CX - 120, CY - 70, 14, C.cream); p.label('딱', CX + 120, CY - 70, 14, C.cream);
    p.rect(CX - 150, CY - 40, 60, 10, '#3a4a40'); p.rect(CX - 150, CY - 40, 60 * tick * 1.6, 10, Math.abs(off) < 0.04 ? C.ok : C.warn);
    p.rect(CX + 90, CY - 40, 60, 10, '#3a4a40'); p.rect(CX + 90, CY - 40, 60 * tock * 1.6, 10, Math.abs(off) < 0.04 ? C.ok : C.warn);
    const a = Math.sin(t * Math.PI) * 0.35 + off * 0.8;
    p.line(CX, CY - 60, CX + Math.sin(a) * 90, CY - 60 + Math.cos(a) * 90, C.brass, 2); p.disc(CX + Math.sin(a) * 90, CY - 60 + Math.cos(a) * 90, 12, '#d9b65e');
    const sx = CX - 130, sw = 260, sy = CY + 60;
    p.rect(sx, sy, sw, 4, '#3a4a40'); p.rect(sx + sw / 2 - 1, sy - 8, 2, 20, 'rgba(127,191,106,0.5)');
    p.box(sx + d.v * sw - 6, sy - 10, 12, 24, C.gold);
    p.label('앵커 굽히기 손잡이를 끌어 똑·딱을 같게', CX, sy + 20, 10, C.gold);
    region({ id: 'mini-focus', x: sx - 10, y: sy - 20, w: sw + 20, h: 40, down: (x) => { d.v = Math.max(0, Math.min(1, (x - sx) / sw)); }, drag: (x) => { d.v = Math.max(0, Math.min(1, (x - sx) / sw)); }, up: () => { if (Math.abs(d.v - d.target) < 0.04) { say('똑딱똑딱, 고르다!'); next(); } else say('아직 절뚝인다', true); } });
  },
  bend(p, _t, m) {
    const d = m.d;
    const gx = CX, gy = CY + 14, r = 62;
    const strip = m.comp.id === 'thermo';
    if (strip) { p.box(gx - 90, gy - 10, 100, 20, '#3d3b37', '#1b1a18'); p.disc(gx, gy, 10, '#e0e0e0'); }
    else { p.disc(gx, gy, r, C.brass); p.ring(gx, gy, r, '#6d5214', 2); p.disc(gx, gy, 14, C.cream); }
    for (let i = 0; i < (strip ? 1 : 20); i++) {
      const a = (i / 20) * Math.PI * 2 - Math.PI / 2;
      const bent = i === 0 ? (d.angle * Math.PI) / 180 : 0;
      p.line(gx + Math.cos(a) * r, gy + Math.sin(a) * r, gx + Math.cos(a + bent) * (r + 14), gy + Math.sin(a + bent) * (r + 14), i === 0 ? C.red : '#b08a37', 5);
    }
    p.line(gx, gy - r - 30, gx, gy - r - 2, 'rgba(127,191,106,0.7)', 1);
    const tipX = gx + Math.cos(-Math.PI / 2 + (d.angle * Math.PI) / 180) * (r + 14), tipY = gy + Math.sin(-Math.PI / 2 + (d.angle * Math.PI) / 180) * (r + 14);
    pliersAt(p, tipX, tipY);
    p.label(`휜 각도 ${Math.round(d.angle)}°`, CX + 150, CY, 12, Math.abs(d.angle) < 4 ? C.ok : C.gold);
    region({
      id: 'mini-focus', x: tipX - 30, y: tipY - 40, w: 60, h: 60,
      drag: (x, y) => { d.angle = Math.max(-30, Math.min(40, (Math.atan2(y - gy, x - gx) + Math.PI / 2) * 180 / Math.PI)); },
      down: () => {},
      up: () => { if (Math.abs(d.angle) < 4) { say('톱니가 반듯해졌다'); next(); } else say('기준선(초록)에 맞춰요', true); },
    });
  },
  tap(p, t, m) {
    const d = m.d;
    p.box(CX - 80, CY + 10, 160, 50, '#efe6cc', C.brass);
    const pinH = 30 - d.taps * 7;
    p.rect(CX - 3, CY + 10 - pinH, 6, pinH + 4, '#c9c9c9');
    const swing = Math.max(0, d.swing - t);
    const ang = swing > 0 ? -0.9 * (swing / 0.15) : -0.9;
    const hx = CX + 30, hy = CY - 50;
    void hx; void hy; void ang;
    tool(p, 'hammer', CX + 1, CY + 10 - pinH - (swing > 0 ? 0 : 16), TIP.hammer, 2);
    p.label(`톡톡 ${d.taps}/4`, CX, CY + 70, 12, C.gold);
    region({ id: 'mini-focus', x: CX - 90, y: CY - 90, w: 180, h: 160, down: () => { d.taps++; d.swing = ui.now + 0.15; sfx('hammer'); if (d.taps >= 4) { say('핀이 꽉 박혔다'); next(); } } });
  },
  trim(p, t, m) {
    const d = m.d;
    const gx = CX - 70, gy = CY + 20, r = 46;
    const err = d.a - d.target;
    const near = Math.abs(err) < 0.18;
    // 조정 나사
    p.disc(gx, gy, r + 8, '#2f5b3c'); p.ring(gx, gy, r + 8, '#1b3523', 2);
    p.disc(gx, gy, r, '#e6e0cc'); p.ring(gx, gy, r, '#6d5214', 2);
    p.line(gx - Math.cos(d.a) * (r - 6), gy - Math.sin(d.a) * (r - 6), gx + Math.cos(d.a) * (r - 6), gy + Math.sin(d.a) * (r - 6), '#3a2a10', 5);
    arrowRing(p, gx, gy, r + 18, 1, t);
    // 결과 보기: 어긋난 만큼 흐르고, 맞으면 멈춘다
    const bx = CX + 60, by = CY - 50, bw = 170, bh = 120;
    p.box(bx, by, bw, bh, '#1e2422', C.ink);
    const drift = err * 60;
    const kind = m.comp.id;
    p.g.save(); p.g.beginPath(); p.g.rect(bx + 2, by + 2, bw - 4, bh - 4); p.g.clip();
    if (kind === 'vhold') {
      const o = ((t * drift) % bh + bh) % bh;
      for (const k of [o - bh, o]) { p.rect(bx, by + k, bw, bh, '#9aa6a0'); p.disc(bx + bw / 2, by + k + 50, 22, '#e8eee9'); p.rect(bx + bw / 2 - 14, by + k + 70, 28, 40, '#2a302d'); p.rect(bx, by + k + bh - 8, bw, 8, '#0b0e0d'); }
    } else if (kind === 'hook') {
      const ny = by + 20 + (Math.sin(t * 6) * 0.5 + 0.5) * 50;
      p.rect(bx + bw / 2 - 1, by, 2, ny - by, '#e0e0e0');
      const ha = t * 6 + err;
      p.ring(bx + bw / 2, by + 90, 26, '#8d9297', 3);
      p.disc(bx + bw / 2 + Math.cos(ha) * 26, by + 90 + Math.sin(ha) * 26, 4, near ? C.ok : C.red);
      p.label(near ? '실이 걸린다!' : '헛돈다', bx + bw / 2, by + 6, 10, near ? C.ok : C.cream);
    } else {
      p.disc(bx + bw / 2, by + bh / 2, 52, '#8d9297');
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2 + t * drift * 0.05; p.rect(bx + bw / 2 + Math.cos(a) * 46 - 2, by + bh / 2 + Math.sin(a) * 46 - 2, 4, 4, i % 2 ? '#e0e0e0' : '#3c4044'); }
      p.disc(bx + bw / 2, by + bh / 2, 30, '#141414');
    }
    p.g.restore();
    p.label(near ? '멈췄다! 손을 떼자' : err < 0 ? '시계 방향으로 더' : '너무 돌렸다, 반대로', bx + bw / 2, by + bh + 8, 11, near ? C.ok : C.gold);
    let last: number | null = null;
    region({
      id: 'mini-focus', x: gx - r - 20, y: gy - r - 20, w: (r + 20) * 2, h: (r + 20) * 2,
      down: (x, y) => { last = angleOf(x, y, gx, gy); },
      drag: (x, y) => {
        if (last === null) return;
        const a = angleOf(x, y, gx, gy);
        const delta = wrap(a - last);
        last = a;
        if (Math.abs(delta) > 1.1) return;
        d.a = Math.max(-1, Math.min(7, d.a + delta * 0.5));
        if (Math.random() < 0.15) sfx('ratchet', 0.4);
      },
      up: () => { last = null; if (Math.abs(d.a - d.target) < 0.18) { say('딱 맞았다!'); next(); } else say('아직 어긋났다', true); },
    });
  },
  belt(p, t, m) {
    const d = m.d;
    const a = [CX - 120, CY + 30], b = [CX + 110, CY - 10];
    p.disc(a[0], a[1], 14, '#8d9297'); p.ring(a[0], a[1], 14, '#3c4044', 2); p.label('모터 풀리', a[0], a[1] + 20, 10, C.cream);
    p.disc(b[0], b[1], 40, '#8d9297'); p.ring(b[0], b[1], 40, '#3c4044', 2); p.label('플라이휠', b[0], b[1] + 46, 10, C.cream);
    if (d.at >= 1) p.ring(a[0], a[1], 15, '#151515', 3);
    if (d.at >= 2) { p.line(a[0], a[1] - 15, b[0], b[1] - 40, '#151515', 3); p.line(a[0], a[1] + 15, b[0], b[1] + 40, '#151515', 3); p.ring(b[0], b[1], 41, '#151515', 3); }
    const targets = [a, b];
    targets.forEach(([x, y], i) => region({ id: i === d.at ? 'mini-focus' : 'mini-belt' + i, x: x - 42, y: y - 42, w: 84, h: 84, down: () => {
      if (i === d.at) { d.at++; sfx('rubber'); if (d.at >= 2) { say('벨트를 팽팽하게 걸었다'); next(); } } else say('모터 풀리부터 거세요', true);
    } }));
    if (d.at < 2) { const [x, y] = targets[d.at]; if (Math.sin(t * 8) > 0) p.ring(x, y, d.at ? 44 : 18, C.gold, 2); }
  },
};

const ctx0 = { power: false, sw: 0, knobA: 0.3, knobB: 0.5, wiggle: null, warm: false, nudge: false, moved: false };

function socketBase(p: Painter, m: Mini) {
  p.round(CX - 106, CY + 24, 220, 40, 'rgba(0,0,0,0.35)', 2);
  pcb(p, CX - 110, CY + 20, 220, 40);
  for (let i = 0; i < 9; i++) { p.disc(CX - 96 + i * 24, CY + 40, 3, '#c9a24a'); p.rect(CX - 96 + i * 24, CY + 40, 1, 1, '#1a1a1a'); }
  void m;
}

function twist(p: Painter, t: number, m: Mini, s: Step, dir: number) {
  const d = m.d;
  const lift = dir < 0 ? d.p * 18 : (1 - d.p) * 18;
  p.box(CX - 34, CY + 10, 68, 50, C.brass, '#6d5214');
  for (let i = 0; i < 4; i++) p.rect(CX - 32, CY + 16 + i * 10, 64, 2, '#8a6a1f');
  const r = { x: CX - 42, y: CY - 80 - lift, w: 84, h: 96 };
  p.g.save(); p.g.translate(CX, CY - 32 - lift); p.g.rotate(d.rot); p.g.translate(-CX, -(CY - 32 - lift));
  drawPart(p, m.comp, r, {}, ctx0, 0);
  p.g.restore();
  p.rect(CX - 60, CY + 70, 120, 5, '#3a4a40'); p.rect(CX - 60, CY + 70, 120 * d.p, 5, C.gold);
  arrowRing(p, CX, CY - 30, 80, dir, t);
  p.label(dir < 0 ? '↺ 반시계로 돌려 빼기' : '↻ 시계 방향으로 돌려 조이기', CX, CY + 80, 11, C.gold);
  rotary('mini-focus', CX, CY - 30, 100, dir, s.n ?? 2, () => d.p, v => { d.rot += (v - d.p) * dir * 10; d.p = v; }, () => { say(dir < 0 ? '쏙 빠졌다' : '꽉 조였다'); next(); });
}

/** 덮개 나사: dir -1 풀기, +1 조이기 */
function screws(p: Painter, t: number, m: Mini, dir: number) {
  const d = m.d;
    p.round(CX - 166, CY - 78, 340, 168, 'rgba(0,0,0,0.35)', 3);
    coverPlate(p, CX - 170, CY - 84, 340, 168, theme, false);
    // 나사 접시 (자석 받침)
    p.disc(CX + 252, CY - 7, 35, 'rgba(0,0,0,0.35)');
    p.disc(CX + 250, CY - 10, 35, '#2a2d30'); p.disc(CX + 250, CY - 10, 34, '#8d9297'); p.disc(CX + 250, CY - 10, 28, '#6d777c'); p.disc(CX + 248, CY - 12, 26, '#a9b0b4');
    p.label('나사 접시', CX + 250, CY + 28, 9, C.cream);
    let outN = 0;
    d.screws.forEach((sc: any, i: number) => {
      // 나사 구멍
      p.disc(sc.x, sc.y, 14, 'rgba(0,0,0,0.35)'); p.ring(sc.x, sc.y, 14, 'rgba(255,255,255,0.12)');
      if (sc.out && dir > 0) { screwHead(p, sc.x, sc.y, 12, 0.7); p.label('✓', sc.x, sc.y - 28, 10, C.ok); return; }
      if (sc.out) { outN++; const tx = CX + 236 + (outN % 3) * 13, ty = CY - 18 + Math.floor(outN / 3) * 12; screwHead(p, tx, ty, 5, outN); return; }
      const lift = (dir < 0 ? sc.p : 1 - sc.p) * 8;
      screwHead(p, sc.x, sc.y, 12, sc.rot, lift);
      if (sc.p > 0) { p.rect(sc.x - 14, sc.y + 16, 28, 4, '#3a4a40'); p.rect(sc.x - 14, sc.y + 16, 28 * sc.p, 4, C.gold); }
      arrowRing(p, sc.x, sc.y, 30, dir, t);
      rotary(i === d.screws.findIndex((s2: any) => !s2.out) ? 'mini-focus' : 'mini-screw' + i, sc.x, sc.y, 34, dir, dir < 0 ? 1.5 : 1, () => sc.p, v => { sc.rot += (v - sc.p) * 9 * dir; sc.p = v; }, () => {
        sc.out = true; sfx(dir < 0 ? 'screwOut' : 'snap');
        if (d.screws.every((s2: any) => s2.out)) { say(dir < 0 ? '나사를 다 풀었다' : '꽉 조였다'); next(); }
      });
    });
    const [mx, my] = ui.mouse;
    driverAt(p, mx, my);
}

/** 기판 위 다리 두 개: 납 빼기 / 납땜 */
function board(p: Painter, t: number, m: Mini, s: Step, desolder: boolean) {
  const d = m.d;
  p.round(CX - 166, CY - 4, 340, 84, 'rgba(0,0,0,0.35)', 3);
  pcb(p, CX - 170, CY - 10, 340, 84);
  const legX = [CX - 50, CX + 50];
  const bodyR = { x: CX - 70, y: CY - 92, w: 140, h: 72 };
  drawPart(p, m.comp, bodyR, {}, ctx0, 0);
  legX.forEach((lx, i) => {
    p.rect(lx - 1, CY - 20, 3, 46, '#c9c9c9');
    const done = desolder ? i < (s.leg ?? 0) : i < (s.leg ?? 0);
    const cur = i === s.leg;
    p.disc(lx, CY + 30, 13, '#c9a24a');
    if (!desolder && done) { p.disc(lx, CY + 28, 10, '#dfe3e6'); p.rect(lx - 3, CY + 22, 4, 2, C.white); }
    if (desolder && !done && !cur) { p.disc(lx, CY + 28, 10, '#b9bec2'); }
    if (cur) {
      const heat = d.heat;
      if (desolder && d.phase !== 'clean') p.disc(lx, CY + 28, 10, heat > 0.6 ? '#eef2f4' : '#b9bec2');
      if (heat > 0.05) p.disc(lx, CY + 30, 16, `rgba(255,${Math.round(160 - heat * 80)},40,${Math.min(0.55, heat * 0.5)})`);
      if (!desolder && d.blob > 0) {
        const cold = d.cold;
        p.disc(lx, CY + 30 - d.blob * 4, 6 + d.blob * 8, cold ? '#9a9fa3' : '#dfe3e6');
        if (!cold) p.rect(lx - 4, CY + 22 - d.blob * 4, 4, 2, C.white);
      }
    }
  });
  const lx = legX[s.leg ?? 0];
  // 온도 막대
  const gx = CX + 190, gy = CY - 84;
  thermometer(p, gx, gy, 112, d.heat, 0.46, 0.83);
  p.label('온도', gx + 8, gy + 140, 9, C.cream);
  if (d.phase === 'heat') {
    if (d.holding) {
      d.heat = Math.min(1.25, d.heat + 0.012);
      loop.sizzle = 0.3 + d.heat * 0.6;
      if (Math.random() < 0.3) p.rect(lx - 6 + Math.random() * 12, CY + 10 - Math.random() * 20, 2, 3, 'rgba(230,230,230,0.6)');
      if (d.heat >= 1.2) { d.holding = false; d.heat = 0; say('너무 오래 댔다! 패드가 탄다. 다시', true, 'zap'); }
    } else d.heat = Math.max(0, d.heat - 0.004);
    ironAt(p, d.holding ? lx + 6 : ui.mouse[0], d.holding ? CY + 26 : ui.mouse[1], d.holding);
    p.label('인두를 패드에 대고 누르고 있다가, 초록 온도에서 떼기', CX, CY + 78, 10, C.gold);
    region({
      id: 'mini-focus', x: lx - 20, y: CY + 10, w: 40, h: 40,
      down: () => { d.holding = true; },
      up: () => {
        if (!d.holding) return;
        d.holding = false;
        if (d.heat < 0.55) { say('덜 달궜다. 조금 더 오래', true); return; }
        d.phase = desolder ? 'pump' : 'feed'; d.hotUntil = ui.now + (desolder ? 1.8 : 2.4); sfx('tick');
      },
    });
  } else if (d.phase === 'pump') {
    const left = d.hotUntil - t;
    d.heat = Math.max(0, d.heat - 0.008);
    const pump = { x: CX + 92, y: CY - 92, w: 34, h: 62 };
    p.box(pump.x, pump.y, pump.w, pump.h, '#c9c9c9', '#5b6064'); p.rect(pump.x + 13, pump.y - 16, 8, 16, C.red);
    p.label('흡입기 누르기!', pump.x + 17, pump.y + pump.h + 4, 10, C.gold);
    if (left <= 0) { d.phase = 'heat'; say('납이 다시 굳었다. 다시 달구자', true); }
    region({ id: 'mini-focus', ...pump, down: () => { say('쭉! 납이 빠졌다', false, 'pump'); next(); } });
  } else if (d.phase === 'feed') {
    const left = d.hotUntil - t;
    d.heat = Math.max(0, 0.5 + left * 0.15);
    const spool = { x: CX + 100, y: CY - 92, w: 50, h: 50 };
    p.disc(spool.x + 25, spool.y + 25, 22, '#c9c9c9'); p.disc(spool.x + 25, spool.y + 25, 8, '#5b6064');
    p.line(spool.x + 10, spool.y + 40, lx + 10, CY + 24, '#dfe3e6', 2);
    p.label('실납을 누르고 있다가, 봉긋할 때 떼기', CX, CY + 78, 10, C.gold);
    p.rect(CX - 40, CY + 94, 80, 6, '#3a4a40'); p.rect(CX - 40 + 80 * 0.55, CY + 94, 80 * 0.3, 6, 'rgba(127,191,106,0.6)'); p.rect(CX - 40, CY + 94, 80 * Math.min(1, d.blob), 6, d.blob > 0.85 ? C.red : C.gold);
    if (d.holding) {
      d.blob = Math.min(1.1, d.blob + 0.011);
      loop.sizzle = 1;
      if (d.blob > 1) { d.holding = false; d.blob = 0; d.phase = 'heat'; d.heat = 0; say('납이 넘쳐 옆과 붙었다! 닦고 다시', true); }
    }
    if (left <= 0 && d.phase === 'feed') { d.cold = true; d.holding = false; say('식어 버렸다… 냉납! 다시', true); d.blob = 0; d.cold = false; d.phase = 'heat'; d.heat = 0; }
    ironAt(p, lx + 6, CY + 26, true);
    region({
      id: 'mini-focus', ...spool,
      down: () => { d.holding = true; },
      up: () => {
        if (!d.holding) return;
        d.holding = false;
        if (d.blob < 0.55) say('납이 모자라다. 조금 더', true);
        else if (d.blob <= 0.85) { say('반짝이는 원뿔! 잘 붙었다'); next(); }
      },
    });
  }
}

/** 부품 규격: 첫 번째가 맞는 것, 나머지는 서랍 속 비슷한 부품 */
function specsOf(c: Comp): string[] {
  const table: Record<string, string[]> = {
    bulb: ['60W', '100W', '25W'], fuse: ['1A', '5A', '0.3A'], tfuse: ['115℃', '150℃', '90℃'], cap: ['1.5µF', '4µF', '0.47µF'],
    fcap: ['40µF 350V', '40µF 16V', '4µF 350V'], outtube: ['6AR5', '6V6', '12AX7'], speaker: ['3Ω', '8Ω', '16Ω'], pot: ['500kΩ', '5kΩ', '50kΩ'],
    switch: ['250V 3A', '12V 1A', '250V 15A'], roller: ['Ø10', 'Ø8', 'Ø12'], barrel: ['8일 태엽', '1일 태엽', '30시간'], susp: ['0.1mm', '0.3mm', '0.05mm'],
    bearing: ['Ø6', 'Ø8', 'Ø4'], belt: ['Ø60', 'Ø45', 'Ø80'], cord: ['0.75㎟', '0.3㎟', '1.5㎟'],
    element: ['600W', '1200W', '300W'], thermo: ['바이메탈', '서미스터', '리드 스위치'], neon: ['네온 220V', '발광다이오드 12V', '꼬마전구 6V'],
    ringer: ['1kΩ 코일', '10Ω 코일', '100kΩ 코일'], bell: ['1kΩ 코일', '10Ω 코일', '100kΩ 코일'], mic: ['카본', '다이내믹', '크리스털'], hook: ['3접점', '2접점', '5접점'],
    pan: ['1.8L 내솥', '1.0L 내솥', '3.6L 내솥'], magnet: ['103℃ 자석', '70℃ 자석', '150℃ 자석'], warmer: ['보온 40W', '보온 400W', '보온 4W'],
    spL: ['8Ω 20W', '4Ω 5W', '16Ω 2W'], spR: ['8Ω 20W', '4Ω 5W', '16Ω 2W'], trL: ['2SC1061', '2SC945', '2SA733'], trR: ['2SC1061', '2SC945', '2SA733'], relay: ['직류 24V', '직류 5V', '교류 220V'],
    xfmr: ['220V→24V', '220V→6V', '220V→110V'], idler: ['Ø22 고무', 'Ø18 고무', 'Ø30 고무'], cart: ['세라믹 바늘', '자석식 바늘', '쇠바늘'],
    flyback: ['흑백용 고압', '컬러용 고압', '전원 트랜스'], vert: ['6BM8', '6V6', '12AX7'], chip: ['계산 칩', '시계 칩', '음성 칩'],
    lcd: ['8자리 표시창', '6자리 표시창', '12자리 표시창'], ribbon: ['14핀 띠', '10핀 띠', '20핀 띠'],
  };
  if (c.id === 'motor') return c.ohm === 12 ? ['직류 6V', '직류 12V', '직류 3V'] : ['교류 220V', '교류 110V', '직류 12V'];
  return table[c.id] ?? ['정품', '유사품 갑', '유사품 을'];
}
