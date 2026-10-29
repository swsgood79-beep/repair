import type { Action, Comp, ItemDef, Job, TestPoint, ToolId } from '../types';
import { item } from '../items';
import { STATIONS } from '../items/radio';
import { C, Painter } from '../gfx/painter';
import { darken, lighten } from '../gfx/art';
import { BODY, body, coverPlate, grille, screwHead, type Material } from '../gfx/props';
import { benchMat, woodStrip } from './backdrops';
import { drawCloseup, drawCustomer, drawPart, drawToolIcon } from '../gfx/parts';
import {
  ACTION_NAME, activeJob, compOf, faultOf, customerOf, events, handBack, handUse, hint, payFor, reachable, repair, repairCheck,
  repairMinutes, setCtx, setOpen, simulate, useTool, visible, watch, won,
} from '../game';
import { sfx } from '../audio';
import { button, holder, pan, region, regionById, toast, ui } from './core';
import { FEEL_WORD, HEAT_WORD, SOUND_WORD, BAD_SOUND, BAD_FEEL, ohmText, tpState, tpText } from './words';
import { cluesOf, statusOf, supports, suspects, type Clue, type Status } from './clues';
import { miniActive, setMiniItem, startRepairMini, startScrews } from './mini';

/* ---------- 배치 ---------- */
export const STAGE = { x: 4, y: 52, w: 404, h: 212 };
const K0 = Math.min(STAGE.w / 640, STAGE.h / 380);
/** 작업대 카메라: 부품을 살필 때 그쪽으로 다가간다 */
const cam = { z: 1, fx: 320, fy: 190, tz: 1, tfx: 320, tfy: 190 };
let K = K0, OX = 0, OY = 0;
function updateCamera() {
  cam.z += (cam.tz - cam.z) * 0.18; cam.fx += (cam.tfx - cam.fx) * 0.18; cam.fy += (cam.tfy - cam.fy) * 0.18;
  K = K0 * cam.z;
  // 화면 밖으로 물건이 빠지지 않게 초점을 묶는다
  const halfW = STAGE.w / 2 / K, halfH = STAGE.h / 2 / K;
  const fx = cam.z > 1.01 ? Math.max(halfW - 20, Math.min(660 - halfW, cam.fx)) : 320;
  const fy = cam.z > 1.01 ? Math.max(halfH - 10, Math.min(390 - halfH, cam.fy)) : 190;
  OX = STAGE.x + STAGE.w / 2 - fx * K;
  OY = STAGE.y + STAGE.h / 2 - fy * K;
}
export function zoomTo(x: number, y: number, z = 2.2) { cam.tz = z; cam.tfx = x; cam.tfy = y; }
/** 확대 상태에서 끌면 카메라를 옮긴다 (화면 밖으로는 못 나감) */
function panBy(dx: number, dy: number) {
  const k = K0 * cam.tz;
  const halfW = STAGE.w / 2 / k, halfH = STAGE.h / 2 / k;
  cam.tfx = Math.max(halfW - 20, Math.min(660 - halfW, cam.tfx - dx / k));
  cam.tfy = Math.max(halfH - 10, Math.min(390 - halfH, cam.tfy - dy / k));
  cam.fx = cam.tfx; cam.fy = cam.tfy;
}
export function zoomOut() { cam.tz = 1; cam.tfx = 320; cam.tfy = 190; }
const mx = (v: number) => OX + v * K;
const my = (v: number) => OY + v * K;
export function compRect(c: Comp) { return { x: mx(c.x), y: my(c.y), w: c.w * K, h: c.h * K }; }

export const TOOLS: { id: ToolId; name: string; hint: string }[] = [
  { id: 'hand', name: '손', hint: '켜고 끄기 · 만지기 · 흔들기' },
  { id: 'driver', name: '드라이버', hint: '덮개를 눌러 연다' },
  { id: 'look', name: '눈', hint: '부품의 흠을 찾는다' },
  { id: 'tester', name: '테스터', hint: '측정점=전압, 부품=저항(전원 끄고)' },
  { id: 'ear', name: '청진기', hint: '켠 채로 소리를 듣는다' },
];

/** 이번 화면에서만 쓰는 연출 상태 */
const fx = {
  seen: new Set<string>(),
  banners: [] as { clue: Clue; t0: number; stamped?: boolean }[],
  shake: {} as Record<string, number>,
  note: null as null | { text: string; t0: number; comp?: string },
  meterAt: null as null | { x: number; y: number; t0: number },
  lastJob: '',
};

const STAMP: Record<Status | 'info' | 'talk', [string, string]> = { lead: ['유력!', C.red], zone: ['의심', '#d98a2b'], pass: ['통과', '#3f8a3a'], none: ['', C.ink], info: ['메모', '#6b6450'], talk: ['증언', '#3a5a9a'] };

/* ---------- 공구 쓰기 ---------- */
function use(tool: ToolId, target: { comp?: string; tp?: string }) {
  const r = useTool(holder.state, tool, target);
  if (!r.ok && r.text) toast(r.text, true);
  return r;
}

function applyTool(target: { comp?: string; tp?: string }) {
  const state = holder.state;
  const job = activeJob(state);
  if (!job) return;
  const def = item(job.itemId);
  const comp = target.comp ? compOf(def, target.comp) : undefined;
  const tp = target.tp ? def.tps.find(t => t.id === target.tp) : undefined;
  if (ui.tool !== 'driver' && !(ui.tool === 'hand' && comp?.hand && comp.hand !== 'nudge')) {
    const fx0 = comp ? comp.x + comp.w / 2 : tp!.x, fy0 = comp ? comp.y + comp.h / 2 : tp!.y;
    const size = comp ? Math.max(comp.w, comp.h) : 40;
    zoomTo(fx0, fy0, Math.max(1.6, Math.min(3, 150 / size)));
  }
  // 말풍선 위치는 물건 좌표로 저장해 카메라가 움직여도 따라가게 한다
  const at = comp ? { x: comp.x, y: comp.y, w: comp.w, h: comp.h } : { x: tp!.x - 6, y: tp!.y - 6, w: 12, h: 12 };
  const px = at.x + at.w / 2, py = at.y + at.h / 2;
  switch (ui.tool) {
    case 'hand': {
      if (tp) return toast('측정점은 테스터로 재세요');
      if (!comp) return;
      if (comp.hand === 'tune' || comp.hand === 'volume') return toast('아래 노브를 돌리세요');
      if (comp.hand) { const r = handUse(state, comp.id); if (!r.ok) toast(r.text, true); else sfx(comp.hand === 'power' ? 'plugIn' : comp.hand === 'switch' ? 'toggle' : 'creak'); return; }
      const r = use('touch', { comp: comp.id });
      if (!r.ok) return;
      if (job.ctx.power) { use('wiggle', { comp: comp.id }); fx.shake[comp.id] = ui.now + 0.9; }
      const f = job.found[comp.id];
      ui.popups.push({ kind: 'touch', x: px, y: at.y, heat: f.heat ?? 0, feel: f.feel, t0: ui.now });
      return;
    }
    case 'driver': return toast('덮개를 누르거나 아래 [열기]를 쓰세요');
    case 'look': {
      if (tp && tp.kind !== 'amp') return toast('측정점은 테스터로 재세요');
      const r = use(state.tools.includes('loupe') && !tp ? 'loupe' : 'look', target);
      if (!r.ok || !comp) return;
      const f = job.found[comp.id];
      const mark = f.loupe ?? f.look ?? 'ok';
      ui.popups = ui.popups.filter(pp => pp.kind !== 'closeup');
      ui.popups.push({ kind: 'closeup', x: px, y: py, shape: comp.shape, mark, text: r.text, t0: ui.now });
      sfx(mark === 'ok' ? 'pop' : 'bad', 0.5);
      return;
    }
    case 'tester': {
      if (def.id === 'clock') return toast('태엽 시계엔 전기가 없다. 귀와 눈으로!');
      if (tp) {
        if (tp.kind === 'beat' || tp.kind === 'amp') return toast('여긴 귀나 눈으로');
        if (!job.ctx.power) return toast('전원을 켜고 재야 전압이 잡힌다', true);
        if (!use('volt', target).ok) return;
        const r = job.found[tp.id].tp!;
        ui.meter = { mode: 'V', value: r.v, expect: tp.expect, unit: tp.unit, label: tp.label, shaky: r.shaky, t0: ui.now };
      } else if (comp) {
        if (job.ctx.power) return toast('저항은 전원을 빼고 잰다 (손으로 플러그)', true);
        if (!use('ohm', target).ok) return;
        const o = job.found[comp.id].ohm!;
        ui.meter = { mode: 'Ω', value: o.v, expect: typeof comp.ohm === 'number' ? comp.ohm : -1, unit: 'Ω', label: comp.short, cap: o.cap, flicker: o.flicker, t0: ui.now };
      }
      fx.meterAt = { x: px, y: py, t0: ui.now };
      sfx('probe');
      return;
    }
    case 'ear': {
      if (tp) {
        if (tp.kind !== 'beat') return toast('측정점은 테스터로 재세요');
        use('ear', target);
        return;
      }
      if (!comp) return;
      if (!job.ctx.power) return toast('켜 놓아야 소리가 난다', true);
      if (!use('ear', target).ok) return;
      ui.popups.push({ kind: 'sound', x: px, y: at.y, sound: job.found[comp.id].ear!, t0: ui.now });
      return;
    }
  }
}

/* ---------- 그리기 ---------- */
export function drawBench(p: Painter, t: number) {
  const state = holder.state;
  const job = activeJob(state);
  for (const e of events.splice(0)) { toast(e.text + '  자물쇠가 하나 늘었다!', true); sfx('zap'); }
  drawTicket(p, job, t);
  if (!job) {
    p.box(STAGE.x, STAGE.y, STAGE.w, STAGE.h, C.night);
    p.text('선반이 비었습니다', STAGE.x + STAGE.w / 2, STAGE.y + 90, 16, C.cream, 'center', 700);
    button(p, 'close-day', STAGE.x + STAGE.w / 2 - 60, STAGE.y + 120, 120, 26, '영업 마감', () => { ui.overlay = { kind: 'close' }; }, { kind: 'primary' });
    drawToolbar(p, null);
    return;
  }
  if (fx.lastJob !== job.id) { fx.lastJob = job.id; fx.note = null; fx.meterAt = null; ui.meter = null; zoomOut(); cam.z = 1; }
  const def = item(job.itemId);
  const sim = simulate(job);
  const clues = cluesOf(def, job);
  for (const c of clues) {
    const key = `${job.id}/${c.key}/${c.title}`;
    if (!fx.seen.has(key)) { fx.seen.add(key); fx.banners.push({ clue: c, t0: 0 }); }
  }
  const status = statusOf(def, job, clues);
  drawStage(p, def, job, sim, status, t);
  drawSuspects(p, def, job, status);
  drawNotebook(p, clues);
  drawControls(p, def, job);
  drawToolbar(p, job);
  drawPopups(p, t);
  drawMeterPopup(p, t);
  drawBanner(p, t);
  drawNote(p, def, t);
}

function lockIcon(p: Painter, x: number, y: number, open: boolean, s = 1) {
  const r = (a: number, b: number, w: number, h: number, c: string) => p.rect(x + a * s, y + b * s, w * s, h * s, c);
  if (open) { r(2, 0, 6, 2, C.steel); r(2, 0, 2, 5, C.steel); r(8, 2, 2, 3, C.steel); }
  else { r(3, 0, 6, 2, C.steel); r(2, 1, 2, 5, C.steel); r(8, 1, 2, 5, C.steel); }
  r(0, 5, 12, 9, open ? C.ok : C.gold); r(0, 5, 12, 1, 'rgba(255,255,255,0.4)'); r(5, 8, 2, 3, C.ink);
}

function drawTicket(p: Painter, job: Job | null, t: number) {
  p.panel(4, 22, 404, 28, C.paper);
  if (!job) { p.text('작업대', 14, 29, 12, C.ink, 'left', 700); return; }
  const def = item(job.itemId);
  const cu = customerOf(job);
  p.rect(6, 24, 26, 24, '#c9bf98');
  const g = p.g;
  g.save(); g.beginPath(); g.rect(6, 24, 26, 24); g.clip(); drawCustomer(p, { ...cu }, -2, 20, 'calm', t, 1); g.restore();
  p.text(def.name, 38, 25, 11, C.ink, 'left', 700);
  p.text(cu.name, 38, 38, 9, '#5b5644', 'left', 500);
  const quote = `“${job.complaint}”`;
  const fit = p.measure(quote, 10) > 200 ? quote.slice(0, 22) + '…”' : quote;
  p.text(fit, 38 + p.measure(def.name, 11, 700) + 8, 26, 10, '#24406b', 'left', 500);
  // 자물쇠: 남은 고장 수
  const open = job.solved.length, shut = job.faults.length;
  let lx = 300;
  for (let i = 0; i < open + shut; i++) { lockIcon(p, lx, 31, i < open); lx += 15; }
  p.text(shut ? `자물쇠 ${shut}` : '모두 풀림!', lx + 2, 33, 9, shut ? '#5b5644' : '#3f8a3a', 'left', 700);
  p.text(job.comeback ? '무상' : won(payFor(job)), 402, 25, 10, job.wrong ? C.red : C.ink, 'right', 700);
}

function drawStage(p: Painter, def: ItemDef, job: Job, sim: ReturnType<typeof simulate>, status: Record<string, Status>, t: number) {
  const S = STAGE;
  updateCamera();
  p.round(S.x, S.y, S.w, S.h, C.ink, 2);
  p.g.save(); p.g.beginPath(); p.g.rect(S.x + 1, S.y + 1, S.w - 2, S.h - 2); p.g.clip();
  p.t.save(); p.t.beginPath(); p.t.rect(S.x + 1, S.y + 1, S.w - 2, S.h - 2); p.t.clip();
  benchMat(p, S.x + 1, S.y + 1, S.w - 2, S.h - 2);
  // 작업등 불빛
  for (let i = 5; i > 0; i--) p.disc(S.x + S.w / 2, S.y + S.h / 2, 40 + i * 22, `rgba(255,214,140,0.025)`);
  decor(p, def);
  const inner = def.comps.filter(c => c.layer > 0 && visible(job, c.layer));
  const outer = def.comps.filter(c => c.layer === 0 && !(c.front && job.open > 0));
  if (job.open > 0) { interior(p, def); drawWires(p, def, job, () => true); for (const c of inner) drawComp(p, c, job, sim, status, t); }
  drawCover(p, def, job, t);
  if (job.open === 0) drawWires(p, def, job, l => l === 0);
  for (const c of outer) drawComp(p, c, job, sim, status, t);
  for (const tp of def.tps) if (visible(job, tp.layer)) drawTP(p, tp, job, t);
  p.g.restore(); p.t.restore();
  pan.on = cam.tz > 1.01 && !ui.overlay && !miniActive();
  pan.area = S; pan.move = panBy;
  if (cam.tz > 1.01) {
    p.label('끌어서 이동', S.x + S.w - 112, S.y + 9, 9, 'rgba(240,226,192,0.8)');
    p.rect(S.x + 1, S.y + 1, S.w - 2, 1, C.gold); p.rect(S.x + 1, S.y + S.h - 2, S.w - 2, 1, C.gold);
    button(p, 'zoom-out', S.x + S.w - 70, S.y + 4, 64, 20, '전체 보기', () => zoomOut(), { kind: 'quiet', size: 10 });
  }
  // 지금 상태 띠
  const alive = Object.values(sim.fx.glow ?? {}).some(v => v > 0) || sim.fx.spin || sim.fx.swing || sim.fx.tone;
  p.rect(S.x + 1, S.y + S.h - 17, S.w - 2, 16, 'rgba(10,16,13,0.85)');
  p.rect(S.x + 1, S.y + S.h - 17, 3, 16, alive ? C.ok : C.warn);
  p.text(`지금  ${sim.obs}`, S.x + 9, S.y + S.h - 15, 10, C.cream, 'left', 700);
  p.text(TOOLS.find(x => x.id === ui.tool)?.hint ?? '', S.x + S.w - 6, S.y + S.h - 14, 9, C.sage, 'right', 500);
}

function decor(p: Painter, def: ItemDef) {
  const R = (x: number, y: number, w: number, h: number, c: string) => p.rect(mx(x), my(y), w * K, h * K, c);
  const M = (x: number, y: number, w: number, h: number, c: string, mat: Material) => body(p, mx(x), my(y), w * K, h * K, c, mat);
  const G = (x: number, y: number, w: number, h: number, c: string) => grille(p, mx(x), my(y), w * K, h * K, c);
  /** 바닥 그림자 */
  const S = (x: number, y: number, w: number, h: number) => p.round(mx(x) + 4, my(y) + 5, w * K, h * K, 'rgba(0,0,0,0.32)', 3);
  switch (def.id) {
    case 'lamp':
      S(132, 262, 376, 86);
      for (let i = 0; i < 18; i++) {
        const x0 = 232 - i * 2.4, w0 = 176 + i * 4.8;
        R(x0, 50 + i * 5.5, w0, 6, i < 2 ? '#2b524d' : '#3d6f69');
        if (i >= 2) { R(x0, 50 + i * 5.5, w0 * 0.18, 6, '#4f8a80'); R(x0 + w0 * 0.82, 50 + i * 5.5, w0 * 0.18, 6, '#2f5a54'); R(x0 + w0 * 0.24, 50 + i * 5.5, w0 * 0.05, 6, '#5aa096'); }
      }
      R(190, 146, 260, 3, '#5aa096');
      R(314, 190, 12, 74, C.brass); R(314, 190, 3, 74, '#e2c070'); R(323, 190, 3, 74, '#8a6a1f');
      M(132, 262, 376, 86, '#4f8a80', 'plastic');
      break;
    case 'fan':
      S(292, 70, 276, 178); S(60, 300, 230, 44);
      R(160, 270, 14, 40, C.steel2); R(160, 270, 4, 40, '#8b969b');
      M(60, 300, 230, 44, '#4f8a80', 'plastic'); M(292, 70, 276, 178, '#4f8a80', 'plastic'); M(372, 282, 152, 52, '#3b6b63', 'plastic');
      break;
    case 'radio':
      S(40, 30, 560, 320);
      M(40, 30, 560, 320, '#6b4529', 'wood'); M(52, 42, 536, 296, '#5a3920', 'wood');
      G(64, 100, 136, 150, '#9a8058');
      for (let i = 0; i < 3; i++) R(64, 140 + i * 40, 136, 3, '#5a3920');
      break;
    case 'cassette':
      S(84, 60, 486, 282);
      M(84, 60, 486, 282, '#b9b2a3', 'plastic'); M(104, 106, 166, 62, '#2c2a28', 'enamel');
      R(110, 112, 154, 4, 'rgba(255,255,255,0.12)');
      G(470, 70, 90, 60, '#8a8478');
      break;
    case 'iron':
      S(150, 70, 380, 170);
      M(150, 70, 380, 170, '#b8392b', 'plastic');
      M(200, 20, 280, 40, '#2a2a2a', 'enamel'); M(200, 20, 30, 70, '#2a2a2a', 'enamel'); M(450, 20, 30, 70, '#2a2a2a', 'enamel');
      break;
    case 'phone':
      S(150, 120, 340, 220);
      M(150, 120, 340, 220, '#1c1c1c', 'enamel'); M(170, 60, 300, 60, '#1c1c1c', 'enamel');
      break;
    case 'ricecooker':
      S(180, 40, 280, 250);
      M(180, 40, 280, 250, '#e8e2d0', 'plastic'); M(200, 30, 240, 30, '#d0c9b6', 'plastic');
      R(180, 150, 280, 4, '#c0392b'); R(180, 156, 280, 2, '#8a2a1e');
      M(236, 196, 168, 50, '#c9c1aa', 'plastic');
      break;
    case 'amp':
      S(130, 40, 380, 270); S(8, 50, 108, 120); S(524, 50, 108, 120);
      M(130, 40, 380, 270, '#c9c4b4', 'metal'); M(140, 220, 360, 80, '#d6d2c6', 'metal');
      M(8, 50, 108, 120, '#5a3920', 'wood'); M(524, 50, 108, 120, '#5a3920', 'wood');
      break;
    case 'turntable':
      S(100, 30, 420, 320); S(512, 60, 116, 120);
      M(100, 30, 420, 320, '#6b4529', 'wood'); M(456, 290, 120, 50, '#2a2a2a', 'metal');
      M(512, 60, 116, 120, '#5a3920', 'wood');
      break;
    case 'sewing':
      S(20, 290, 600, 30);
      M(20, 290, 600, 30, '#6b4529', 'wood');
      M(170, 160, 320, 130, '#2a2a2a', 'enamel'); M(170, 60, 70, 110, '#2a2a2a', 'enamel'); M(170, 40, 300, 60, '#2a2a2a', 'enamel'); M(430, 60, 60, 120, '#2a2a2a', 'enamel');
      R(180, 50, 280, 3, '#c9a65a'); R(180, 170, 300, 3, '#c9a65a');
      for (let i = 0; i < 6; i++) { R(250 + i * 30, 62, 10, 4, '#c9a65a'); R(255 + i * 30, 70, 4, 10, '#a8843a'); }
      break;
    case 'tv':
      S(80, 20, 520, 320);
      R(150, 338, 12, 30, '#2a2a2a'); R(480, 338, 12, 30, '#2a2a2a');
      M(80, 20, 520, 320, '#6b4529', 'wood'); M(500, 40, 90, 290, '#5a3920', 'wood');
      G(510, 128, 70, 40, '#9a8058');
      break;
    case 'calc':
      S(180, 30, 280, 320); S(40, 120, 140, 84);
      M(180, 30, 280, 320, '#3a3a36', 'plastic'); M(40, 120, 140, 84, '#2a2a28', 'plastic');
      R(196, 300, 60, 6, '#c9a24a');
      break;
    case 'clock':
      S(212, 30, 216, 338);
      M(212, 30, 216, 338, '#6b4529', 'wood'); M(226, 40, 188, 318, '#5a3920', 'wood');
      p.box(mx(262), my(214), 116 * K, 140 * K, 'rgba(200,230,230,0.08)', C.brass);
      for (let i = 0; i < 10; i++) R(270 + i * 2, 220 + i * 8, 2, 30, 'rgba(255,255,255,0.08)');
      break;
  }
}

/** 덮개를 연 뒤 보이는 안쪽 섀시 판 */
function interior(p: Painter, def: ItemDef) {
  if (def.id === 'clock') return;
  const [x, y, w, h] = def.cover;
  const b = BODY[def.id] ?? { color: '#5a4636', mat: 'metal' };
  const base = darken(b.color, b.color === '#2a2a2a' || b.color === '#1c1c1c' || b.color === '#262626' ? 0 : 0.45);
  const X = mx(x), Y = my(y), Wd = w * K, Hd = h * K;
  p.round(X, Y, Wd, Hd, '#0c0806', 2);
  p.rect(X + 1, Y + 1, Wd - 2, Hd - 2, base === '#2a2a2a' ? '#3a3a3a' : base);
  // 섀시 금속판 구멍과 안쪽 그림자
  for (let yy = Y + 8; yy < Y + Hd - 6; yy += 12) for (let xx = X + 8 + ((yy / 12) % 2) * 6; xx < X + Wd - 6; xx += 12) p.rect(xx, yy, 2, 2, darken(base, 0.35));
  p.rect(X + 1, Y + 1, Wd - 2, 3, 'rgba(0,0,0,0.35)'); p.rect(X + 1, Y + 1, 3, Hd - 2, 'rgba(0,0,0,0.25)');
}

function drawCover(p: Painter, def: ItemDef, job: Job, t: number) {
  if (job.open < 1) {
    const [x, y, w, h] = def.cover;
    const r = { x: mx(x), y: my(y), w: w * K, h: h * K };
    if (def.id === 'clock') {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      p.disc(cx, cy, r.h / 2 - 3, '#efe6cc'); p.ring(cx, cy, r.h / 2 - 3, C.brass, 2);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.rect(cx + Math.cos(a) * (r.h / 2 - 9) - 1, cy + Math.sin(a) * (r.h / 2 - 9) - 1, 3, 3, '#2b2a26'); }
    } else {
      coverPlate(p, r.x, r.y, r.w, r.h, def.id);
      const lw = p.measure(`${def.coverLabel} · 드라이버로 열기`, 9, 700) + 14;
      p.round(r.x + r.w / 2 - lw / 2, r.y + r.h / 2 - 8, lw, 16, 'rgba(12,8,6,0.75)', 2);
      p.label(`${def.coverLabel} · 드라이버로 열기`, r.x + r.w / 2, r.y + r.h / 2 - 6, 9, '#f0e2c0');
    }
    sparkle(p, r.x + r.w - 10, r.y + 8, t, 3);
    region({ id: 'cover', ...r, click: () => { if (ui.tool !== 'driver') { ui.tool = 'driver'; } openCover(1); } });
  }
  if (def.chassis && job.open === 1) {
    const [x, y, w, h] = def.chassis;
    const r = { x: mx(x), y: my(y), w: w * K, h: h * K };
    body(p, r.x, r.y, r.w, r.h, '#7a8085', 'metal');
    for (const [sx, sy] of [[r.x + 6, r.y + r.h / 2], [r.x + r.w - 7, r.y + r.h / 2]]) screwHead(p, sx, sy, 3, 0.7);
    const lw = p.measure(`${def.chassisLabel} · 드라이버로 빼기`, 9, 700) + 14;
    p.round(r.x + r.w / 2 - lw / 2, r.y + r.h / 2 - 8, lw, 16, 'rgba(12,8,6,0.75)', 2);
    p.label(`${def.chassisLabel} · 드라이버로 빼기`, r.x + r.w / 2, r.y + r.h / 2 - 6, 9, '#f0e2c0');
    sparkle(p, r.x + r.w - 10, r.y + 6, t, 5);
    region({ id: 'chassis', ...r, click: () => { if (ui.tool !== 'driver') ui.tool = 'driver'; openCover(2); } });
  }
}

const SCREWS: Record<string, number> = { lamp: 3, fan: 4, radio: 6, cassette: 5, clock: 2, iron: 3, phone: 4, ricecooker: 4, amp: 6, turntable: 4, sewing: 2, tv: 6, calc: 4 };
function openCover(level: number) {
  const state = holder.state;
  const job = activeJob(state);
  if (!job) return;
  const def = item(job.itemId);
  const apply = () => { const r = setOpen(state, level); if (!r.ok) toast(r.text, true); else sfx('pop'); };
  if (state.minute + 5 > 600) return toast('오늘은 시간이 모자랍니다', true);
  const closing = level < job.open;
  const which = closing ? job.open : level;
  const n = which === 2 ? 4 : SCREWS[def.id] ?? 4;
  const name = which === 2 ? def.chassisLabel! : def.coverLabel;
  setMiniItem(def.id);
  startScrews(def.comps[0], n, closing ? `${name} 다시 조이기` : `${name} 열기`, apply, closing, () => {});
}

function drawWires(p: Painter, def: ItemDef, job: Job, layerFilter: (l: number) => boolean) {
  for (const w of def.wires) {
    if (!visible(job, w.layer) || !layerFilter(w.layer)) continue;
    const color = w.kind === 's' ? '#e2c25c' : w.kind === 'm' ? '#9aa3a8' : '#c8553a';
    const seg = (i: number, c: string, wd: number, dy = 0) => p.line(mx(w.pts[i - 1][0]), my(w.pts[i - 1][1]) + dy, mx(w.pts[i][0]), my(w.pts[i][1]) + dy, c, wd);
    for (let i = 1; i < w.pts.length; i++) seg(i, 'rgba(0,0,0,0.35)', 2, 2);
    for (let i = 1; i < w.pts.length; i++) seg(i, darken(color, 0.45), w.kind === 'm' ? 3 : 2);
    for (let i = 1; i < w.pts.length; i++) seg(i, color, 1);
  }
}

/** 아직 안 살펴본 곳에서 반짝이는 별 */
function sparkle(p: Painter, x: number, y: number, t: number, seed: number) {
  const a = (Math.sin(t * 3 + seed * 1.7) + 1) / 2;
  if (a < 0.35) return;
  const c = `rgba(255,236,160,${a})`;
  p.rect(x - 1, y - 4, 2, 9, c); p.rect(x - 4, y - 1, 9, 2, c); p.rect(x, y, 1, 1, C.white);
}

function drawComp(p: Painter, c: Comp, job: Job, sim: ReturnType<typeof simulate>, status: Record<string, Status>, t: number) {
  const r = compRect(c);
  const shaking = (fx.shake[c.id] ?? 0) > ui.now;
  drawPart(p, c, r, sim.fx, shaking ? { ...job.ctx, wiggle: c.id } : job.ctx, t, shaking);
  const id = 'c:' + c.id;
  const hovered = ui.hover === id;
  const st = status[c.id];
  const frame = (color: string) => { p.rect(r.x - 2, r.y - 2, r.w + 4, 1, color); p.rect(r.x - 2, r.y + r.h + 1, r.w + 4, 1, color); p.rect(r.x - 2, r.y - 2, 1, r.h + 4, color); p.rect(r.x + r.w + 1, r.y - 2, 1, r.h + 4, color); };
  if (st === 'lead') frame(Math.sin(t * 6) > 0 ? C.red : '#7a2a1a');
  else if (st === 'zone') frame('#d98a2b');
  if (hovered) frame(C.gold);
  if (fx.note?.comp === c.id && ui.now - fx.note.t0 < 6) { const rr = Math.max(r.w, r.h) / 2 + 6 + Math.sin(t * 8) * 2; p.ring(r.x + r.w / 2, r.y + r.h / 2, rr, C.glow, 2); }
  p.label(c.short, r.x + r.w / 2, r.y + r.h + 1, 8, hovered ? C.gold : st === 'lead' ? '#ff9a86' : C.cream);
  if (st === 'pass') p.label('✓', r.x + r.w - 1, r.y - 6, 9, C.ok);
  if (!job.found[c.id] && (c.acts.length || c.part || c.hand)) sparkle(p, r.x + r.w - 2, r.y + 2, t, c.x % 7);
  const pad = Math.max(0, 14 - Math.min(r.w, r.h)) / 2;
  region({ id, x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2, click: () => applyTool({ comp: c.id }) });
}

function drawTP(p: Painter, tp: TestPoint, job: Job, t: number) {
  const x = mx(tp.x), y = my(tp.y);
  const r = job.found[tp.id]?.tp;
  const st = tpState(tp, r);
  const color = [tp.kind === 'beat' || tp.kind === 'amp' ? '#9fc3bd' : C.brass, C.ok, C.warn, C.red][st];
  const id = 't:' + tp.id;
  p.disc(x, y, 5, C.ink);
  p.disc(x, y, 4, color);
  p.rect(x - 1, y - 2, 2, 1, 'rgba(255,255,255,0.6)');
  if (ui.hover === id) { p.ring(x, y, 7, C.gold); p.label(tp.label, x, y - 18, 8, C.gold); }
  if (r) p.label(tpText(tp, r), x, y + 6, 8, color);
  else sparkle(p, x + 5, y - 5, t, tp.x % 5);
  region({ id, x: x - 8, y: y - 8, w: 16, h: 16, click: () => applyTool({ tp: tp.id }) });
}

/* ---------- 용의자 보드 ---------- */
function drawSuspects(p: Painter, def: ItemDef, job: Job, status: Record<string, Status>) {
  const X = 412, Y = 22, W = 224, H = 160;
  p.panel(X, Y, W, H, '#7a5a3a', '#2b1a0e');
  for (let i = 0; i < 30; i++) p.rect(X + 4 + ((i * 53) % (W - 8)), Y + 18 + ((i * 29) % (H - 22)), 2, 1, '#6b4c30');
  p.text('용의자 — 눌러서 범인 지목', X + 8, Y + 4, 10, C.cream, 'left', 700);
  const list = suspects(def);
  const cols = 2, cw = (W - 16) / cols, ch = Math.min(32, (H - 24) / Math.ceil(list.length / cols));
  list.forEach((c, i) => {
    const x = X + 6 + (i % cols) * (cw + 4), y = Y + 20 + Math.floor(i / cols) * ch;
    const st = status[c.id];
    const can = reachable(job, c);
    const id = 's:' + c.id;
    const hov = ui.hover === id;
    p.panel(x, y, cw - 4, ch - 3, hov ? '#fff6d8' : can ? '#efe6c8' : '#bdb391', '#3a2a10');
    p.disc(x + cw / 2 - 2, y + 1, 2, C.red); p.rect(x + cw / 2 - 3, y, 1, 1, '#ffb0a0');
    p.box(x + 3, y + 3, 24, ch - 9, '#2c3a33', '#1a2621');
    p.g.save(); p.g.beginPath(); p.g.rect(x + 4, y + 4, 22, ch - 11); p.g.clip();
    drawPart(p, c, { x: x + 4, y: y + 4, w: 22, h: ch - 11 }, {}, job.ctx, 0);
    p.g.restore();
    p.text(c.short, x + 31, y + 4, 9, can ? C.ink : '#6b6450', 'left', 700);
    if (!can) p.text(c.front ? '덮개 닫고' : '덮개 안', x + 31, y + 15, 8, '#6b6450', 'left', 500);
    const [word, color] = STAMP[st];
    if (word) {
      const sw = p.measure(word, 9, 700) + 8;
      p.box(x + cw - 8 - sw, y + ch - 17, sw, 12, 'rgba(255,255,255,0.2)', color);
      p.text(word, x + cw - 8 - sw / 2, y + ch - 16, 9, color, 'center', 700);
    }
    region({ id, x, y, w: cw - 4, h: ch - 3, click: () => {
      if (!can) return toast(c.layer === 2 ? '섀시를 빼야 손이 닿는다' : c.front ? '덮개를 닫아야 손이 닿는다' : '덮개를 열어야 손이 닿는다', true);
      ui.overlay = { kind: 'accuse', comp: c.id }; sfx('pop');
    } });
  });
}

/* ---------- 단서 수첩 ---------- */
const ICON_TOOL: Record<Clue['icon'], string> = { look: 'look', tester: 'volt', ear: 'ear', hand: 'touch', shake: 'wiggle', amp: 'look', talk: 'talk' };
function drawNotebook(p: Painter, clues: Clue[]) {
  const X = 412, Y = 186, W = 224, H = 106;
  p.panel(X, Y, W, H, C.paper, '#3a2a10');
  for (let y = Y + 18; y < Y + H; y += 17) p.rect(X + 2, y, W - 4, 1, '#cfc49e');
  p.text(`단서 수첩  ${clues.length}`, X + 8, Y + 3, 10, C.ink, 'left', 700);
  button(p, 'ask-phone', X + W - 92, Y + 2, 88, 16, '☎ 손님에게 묻기', () => { ui.overlay = { kind: 'ask' }; sfx('pop'); }, { kind: 'quiet', size: 8 });
  if (!clues.length) { p.text('살펴보고 재면 단서가 쌓인다', X + 8, Y + 26, 9, '#6b6450'); p.text('반짝이는 곳부터 조사하자', X + 8, Y + 42, 9, '#6b6450'); return; }
  const recent = clues.slice(-5).reverse();
  recent.forEach((c, i) => {
    const y = Y + 19 + i * 17;
    const color = c.verdict === 'lead' ? C.red : c.verdict === 'pass' ? '#3f8a3a' : c.verdict === 'zone' ? '#d98a2b' : c.verdict === 'talk' ? '#3a5a9a' : '#8a8064';
    p.rect(X + 4, y + 1, 3, 15, color);
    const g = p.g; g.save(); g.translate(X + 10, y + 1); g.scale(0.6, 0.6); drawToolIcon(p, ICON_TOOL[c.icon], 0, 0); g.restore();
    p.text(c.title, X + 28, y + 1, 9, C.ink, 'left', 700);
    p.text(c.means, X + 28, y + 9, 7, '#5b5644', 'left', 500);
    region({ id: 'cl:' + c.key, x: X + 2, y, w: W - 4, h: 17 });
  });
}

/* ---------- 조작 줄 ---------- */
function drawControls(p: Painter, def: ItemDef, job: Job) {
  const state = holder.state;
  let x = 4;
  const y = 266, h = 26;
  p.rect(4, y - 1, 404, h + 2, '#16201c');
  const powerOn = job.ctx.power;
  button(p, 'power', x, y, 72, h, powerOn ? def.power.off : def.power.on, () => { setCtx(state, { power: !powerOn }); sfx('plugIn'); }, { kind: powerOn ? 'on' : undefined, size: 10 });
  x += 76;
  if (def.sw) {
    p.text(def.id === 'cassette' ? '키' : '스위치', x, y + 8, 9, C.sage, 'left', 700);
    x += def.id === 'cassette' ? 14 : 30;
    def.sw.forEach((label, i) => { button(p, 'sw' + i, x, y, 24, h, label, () => { setCtx(state, { sw: i }); sfx('toggle'); }, { kind: job.ctx.sw === i ? 'on' : 'quiet', size: 9 }); x += 25; });
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
}

/* ---------- 공구함 ---------- */
function drawToolbar(p: Painter, job: Job | null) {
  const state = holder.state;
  woodStrip(p, 294, 66);
  TOOLS.forEach((tool, i) => {
    const x = 4 + i * 58, y = 298;
    const on = ui.tool === tool.id;
    const hov = ui.hover === 'tool:' + tool.id;
    const face = on ? C.gold : hov ? '#6b5440' : '#5a4330';
    p.round(x + 1, y + 2, 56, 58, 'rgba(0,0,0,0.4)', 2);
    p.round(x, y + (on ? 2 : 0), 56, 58 - (on ? 2 : 0), '#120c08', 2);
    p.rect(x + 1, y + 54, 54, 3, darken(face, 0.4));
    p.rect(x + 1, y + 1 + (on ? 2 : 0), 54, 53 - (on ? 0 : 0), face);
    p.rect(x + 2, y + 1 + (on ? 2 : 0), 52, 1, lighten(face, 0.3));
    p.disc(x + 28, y + 19 + (on ? 2 : 0), 15, on ? lighten(face, 0.25) : darken(face, 0.18));
    const icon = tool.id === 'tester' ? 'volt' : tool.id === 'look' && state.tools.includes('loupe') ? 'loupe' : tool.id;
    drawToolIcon(p, icon, x + 16, y + 7 + (on ? 2 : 0));
    p.text(tool.name, x + 28, y + 36 + (on ? 2 : 0), 11, on ? C.ink : C.cream, 'center', 700);
    region({ id: 'tool:' + tool.id, x, y, w: 56, h: 58, click: () => { ui.tool = tool.id; sfx('click', 0.4); } });
  });
  const hx = 298;
  const lv = job?.hints ?? 0;
  button(p, 'hint', hx, 298, 100, 28, '할아버지 쪽지', () => {
    const r = hint(state);
    if (!r.ok) return toast(r.text, true);
    fx.note = { text: r.text, t0: ui.now, comp: r.comp };
    sfx('paper');
  }, { kind: 'quiet', size: 10, disabled: !job, sub: `힌트 ${lv}/3 · 5분` });
  button(p, 'watch', hx, 330, 100, 26, '10분 지켜보기', () => { const r = watch(state); if (!r.ok) toast(r.text, true); else { toast('10분 동안 켜 두고 지켜봤다'); sfx('tick', 2); } }, { kind: 'quiet', size: 10, disabled: !job });
  const bx = 404;
  button(p, 'handback', bx, 298, 232, 30, '돌려주기', () => {
    if (job && job.open > 0) { toast('덮개를 닫고 나사부터 조여야 돌려줄 수 있다', true); return; }
    if (job && job.ctx.power) setCtx(state, { power: false, sw: 0 });
    const r = handBack(state);
    if ('kind' in r) { ui.counter = { kind: 'return', outcome: r }; ui.scene = 'counter'; ui.popups = []; ui.meter = null; sfx(r.kind === 'paid' ? 'register' : 'lockFail'); }
    else toast(r.text, true);
  }, { kind: 'primary', disabled: !job, size: 13, sub: job ? (job.open ? '먼저 덮개를 닫고 조이자' : job.faults.length ? '손님이 켜 보고 판단한다' : '자물쇠를 다 풀었다!') : undefined });
  button(p, 'shelf', bx, 332, 114, 24, '선반 · 다른 물건', () => { ui.overlay = { kind: 'shelf' }; }, { kind: 'quiet', size: 10 });
  button(p, 'giveup', bx + 118, 332, 114, 24, '포기하고 돌려보내기', () => { ui.overlay = { kind: 'giveup' }; }, { kind: 'quiet', size: 9, disabled: !job });
}

/* ---------- 연출 ---------- */
function drawPopups(p: Painter, t: number) {
  ui.popups = ui.popups.filter(pp => t - pp.t0 < (pp.kind === 'closeup' ? 3.5 : 2.4));
  for (const raw of ui.popups) {
    const pp = { ...raw, x: mx(raw.x), y: my(raw.y) };
    const age = t - pp.t0;
    if (pp.kind === 'closeup') {
      const r = 34;
      const x = Math.max(STAGE.x + r + 6, Math.min(STAGE.x + STAGE.w - r - 6, pp.x + 46));
      const y = Math.max(STAGE.y + r + 6, Math.min(STAGE.y + STAGE.h - r - 30, pp.y - 30));
      p.line(pp.x, pp.y, x, y, C.cream);
      drawCloseup(p, pp.shape, pp.mark, x, y, r);
      bubbleAt(p, x, y + r + 20, pp.text, pp.mark !== 'ok');
    } else if (pp.kind === 'sound') {
      for (let i = 0; i < 3; i++) { const rr = 6 + ((age * 30 + i * 8) % 24); p.ring(pp.x, pp.y - 6, rr, `rgba(255,230,160,${Math.max(0, 0.6 - rr / 40)})`); }
      bubbleAt(p, pp.x, pp.y - 8 - age * 6, SOUND_WORD[pp.sound], BAD_SOUND.has(pp.sound));
    } else if (pp.kind === 'touch') {
      const words = [HEAT_WORD[pp.heat], pp.feel ? FEEL_WORD[pp.feel] : ''].filter(Boolean).join(' · ');
      if (pp.heat > 0) for (let i = 0; i < 3; i++) p.rect(pp.x - 8 + i * 7, pp.y - 8 - ((age * 20 + i * 5) % 14), 2, 5, pp.heat === 2 ? C.red : C.warn);
      bubbleAt(p, pp.x, pp.y - 12, words, pp.heat === 2 || !!pp.feel && BAD_FEEL.has(pp.feel));
    }
  }
  if (ui.toast && t - ui.toast.t0 < 2.6) {
    const tw = p.measure(ui.toast.text, 11, 700) + 20;
    const x = STAGE.x + STAGE.w / 2 - tw / 2, y = STAGE.y + STAGE.h - 42;
    p.panel(x, y, tw, 20, ui.toast.bad ? '#f3c9b9' : C.paper);
    p.text(ui.toast.text, x + tw / 2, y + 3, 11, ui.toast.bad ? '#7a1a0a' : C.ink, 'center', 700);
  }
}

function bubbleAt(p: Painter, x: number, y: number, text: string, bad: boolean) {
  const tw = p.measure(text, 11, 700) + 14;
  const bx = Math.max(STAGE.x + 2, Math.min(STAGE.x + STAGE.w - tw - 2, x - tw / 2));
  const by = Math.max(STAGE.y + 2, y - 18);
  p.panel(bx, by, tw, 18, bad ? '#f3d2c4' : C.paper);
  p.text(text, bx + tw / 2, by + 2, 11, bad ? '#7a1a0a' : C.ink, 'center', 700);
}

/** 단서를 얻는 순간: 카드가 내려와 도장이 찍힌다 */
function drawBanner(p: Painter, t: number) {
  if (ui.overlay) return;
  while (fx.banners.length && fx.banners[0].t0 && t - fx.banners[0].t0 > 1.9) fx.banners.shift();
  const b = fx.banners[0];
  if (!b) return;
  if (!b.t0) { b.t0 = t; sfx('paper'); }
  if (!b.stamped && t - b.t0 > 0.35) { b.stamped = true; sfx(b.clue.verdict === 'lead' ? 'stamp' : 'tick', b.clue.verdict === 'lead' ? 1 : 2); }
  const age = t - b.t0;
  const drop = Math.min(1, age * 6);
  const w = 260, h = 46;
  const x = STAGE.x + (STAGE.w - w) / 2, y = STAGE.y + 6 - (1 - drop) * 40;
  p.panel(x, y, w, h, C.paper, '#3a2a10');
  p.text('단서 획득!', x + 8, y + 4, 9, '#8a6a1f', 'left', 700);
  p.text(b.clue.title, x + 8, y + 15, 11, C.ink, 'left', 700);
  p.text(b.clue.means, x + 8, y + 30, 9, '#5b5644', 'left', 500);
  const verdict = b.clue.verdict === 'info' ? 'info' : b.clue.verdict;
  const [word, color] = STAMP[verdict];
  if (age > 0.35) {
    const s = Math.max(1, 1.8 - (age - 0.35) * 5);
    const sw = (p.measure(word, 12, 700) + 12) * s;
    const sx = x + w - sw / 2 - 30, sy = y + h / 2;
    p.box(sx - sw / 2, sy - 9 * s, sw, 18 * s, 'rgba(255,255,255,0.15)', color);
    p.text(word, sx, sy - 7 * s, 12 * s, color, 'center', 700);
  }
}

/** 할아버지 쪽지 */
function drawNote(p: Painter, def: ItemDef, t: number) {
  const n = fx.note;
  if (!n || t - n.t0 > 6 || ui.overlay) return;
  const w = 250;
  const x = STAGE.x + (STAGE.w - w) / 2, y = STAGE.y + 60;
  p.panel(x, y, w, 44, '#fff3c4', '#8a6a1f');
  p.text('할아버지 쪽지', x + 8, y + 4, 9, '#8a6a1f', 'left', 700);
  p.wrap(n.text, x + 8, y + 17, w - 16, 11, C.ink, 13, 700);
  void def;
}

/* ---------- 계기판 (측정점 옆에 뜬다) ---------- */
function needleTarget(t: number) {
  const m = ui.meter;
  if (!m) return 0;
  const dt = t - m.t0;
  let pos = 0;
  if (m.mode === 'Ω') {
    if (m.cap === 'kick') pos = dt < 0.12 ? dt / 0.12 * 0.95 : 0.95 * Math.exp(-(dt - 0.12) * 1.3);
    else if (m.cap === 'weak') pos = dt < 0.12 ? dt / 0.12 * 0.35 : 0.35 * Math.exp(-(dt - 0.12) * 4);
    else if (m.cap === 'short') pos = 0.97;
    else if (m.cap === 'none' || m.value === Infinity) pos = 0;
    else { const ref = Math.max(1, m.expect > 0 ? m.expect : 1); pos = 1 / (1 + m.value / ref); }
    if (m.flicker) pos = Math.sin(t * 17) > 0.2 ? pos : 0.03;
  } else pos = Math.min(1, (m.value / (m.expect || 1)) * 0.7);
  if (m.shaky) pos += Math.sin(t * 40) * 0.04;
  return Math.max(0, Math.min(1, pos));
}

function drawMeterPopup(p: Painter, t: number) {
  const raw = fx.meterAt, m = ui.meter;
  if (!raw || !m || t - raw.t0 > 3.2) return;
  const at = { ...raw, x: mx(raw.x), y: my(raw.y) };
  const w = 128, h = 74;
  const x = Math.max(STAGE.x + 4, Math.min(STAGE.x + STAGE.w - w - 4, at.x + 14));
  const y = Math.max(STAGE.y + 4, Math.min(STAGE.y + STAGE.h - h - 20, at.y - h - 6));
  p.line(at.x, at.y, x + 10, y + h, C.red);
  p.panel(x, y, w, h, '#d9a443', '#3a2a10');
  p.box(x + 4, y + 4, 70, 46, '#f2ead0', '#3a2a10');
  const cx = x + 39, cy = y + 46, rad = 34;
  const ang = (u: number) => Math.PI * (1.18 + 0.64 * u);
  for (let i = 0; i <= 10; i++) { const a = ang(i / 10); p.line(cx + Math.cos(a) * (rad - 3), cy + Math.sin(a) * (rad - 3), cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, '#3a2a10'); }
  const band = m.mode === 'Ω' ? (m.cap ? (m.cap === 'kick' || m.cap === 'weak' || m.cap === 'none' || m.cap === 'short' ? null : null) : m.expect < 0 ? null : m.expect >= 1 ? [0.42, 0.58] : [0.72, 1]) : [0.6, 0.8];
  if (band) for (let u = band[0]; u <= band[1]; u += 0.01) { const a = ang(u); p.rect(cx + Math.cos(a) * (rad + 2), cy + Math.sin(a) * (rad + 2), 2, 2, '#4a9a4a'); }
  const target = needleTarget(t);
  ui.needle += (target - ui.needle) * 0.25;
  const a = ang(ui.needle);
  p.line(cx, cy, cx + Math.cos(a) * (rad - 3), cy + Math.sin(a) * (rad - 3), C.red, 2);
  p.disc(cx, cy, 3, '#3a2a10');
  const val = m.mode === 'Ω' ? (m.cap ? capWord(m.cap) : ohmText({ v: m.value, flicker: m.flicker })) : `${m.value}${m.unit}`;
  p.text(val, x + 100, y + 8, 11, '#2a1a05', 'center', 700);
  p.text(m.label, x + 100, y + 24, 8, '#3a2a10', 'center', 700);
  const ok = band ? target >= band[0] - 0.03 && target <= band[1] + 0.03 : m.cap === 'kick';
  const verdict = ok ? '정상 ✓' : m.mode === 'Ω' ? (m.value === Infinity && !m.cap ? '끊김 ✗' : m.expect < 0 && !m.cap ? '기록' : '이상 ✗') : m.value === 0 ? '없음 ✗' : '이상 ✗';
  p.box(x + 4, y + 54, w - 8, 16, ok ? '#cfe8c0' : verdict === '기록' ? '#e8e0c4' : '#f3c9b9', '#3a2a10');
  p.text(verdict, x + w / 2, y + 55, 11, ok ? '#1f5a1f' : '#7a1a0a', 'center', 700);
}
function capWord(c: string) { return c === 'kick' ? '튀었다 돌아옴' : c === 'weak' ? '조금만 튐' : c === 'none' ? '꿈쩍 안 함' : '붙어버림'; }

/* ---------- 범인 지목 · 자물쇠 ---------- */
export function actionsOf(c: Comp): Action[] {
  const acts = [...c.acts];
  if (c.part && !acts.includes('replace')) acts.unshift('replace');
  return acts;
}

export function drawAccuse(p: Painter, t: number) {
  const ov = ui.overlay;
  if (ov?.kind !== 'accuse') return;
  const state = holder.state;
  const job = activeJob(state);
  if (!job) { ui.overlay = null; return; }
  const def = item(job.itemId);
  const comp = compOf(def, ov.comp)!;
  p.rect(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 'rgba(8,12,10,0.6)');
  p.clearText(STAGE.x, STAGE.y, STAGE.w, STAGE.h);
  region({ id: 'acc-bg', x: 0, y: 0, w: 640, h: 360, click: () => { if (ov.t0 && t - ov.t0 > 1.3) ui.overlay = null; } });
  const X = 54, Y = 58, Wd = 304, Hd = 200;
  p.panel(X, Y, Wd, Hd, C.paper);
  if (!ov.t0) {
    p.text('범인 지목', X + 10, Y + 6, 9, '#8a6a1f', 'left', 700);
    p.text(`${comp.name}이(가) 범인일까?`.replace('이(가)', /[가-힣]$/.test(comp.name) && (comp.name.charCodeAt(comp.name.length - 1) - 0xac00) % 28 ? '이' : '가'), X + 10, Y + 18, 14, C.ink, 'left', 700);
    p.box(X + 10, Y + 42, 70, 64, '#2c3a33');
    drawPart(p, comp, { x: X + 14, y: Y + 46, w: 62, h: 56 }, {}, job.ctx, t);
    p.text('어떻게 고칠까?', X + 92, Y + 44, 10, '#5b5644', 'left', 700);
    const acts = actionsOf(comp);
    acts.forEach((a, i) => {
      const bw = (Wd - 102 - (acts.length - 1) * 4) / acts.length;
      const price = a === 'replace' ? comp.part ?? 0 : 0;
      button(p, 'acc:' + a, X + 92 + i * (bw + 4), Y + 58, bw, 46, ACTION_NAME[a], () => startAccuse(a), { kind: 'primary', size: 12, sub: `${repairMinutes(def, a)}분${price ? ' ' + won(price) : ''}` });
    });
    // 근거 고르기: 맞으면 명추리 보너스
    const cands = cluesOf(def, job).filter(c => c.verdict !== 'info').slice(-6).reverse().slice(0, 4);
    p.text('근거 카드 (고르고 맞히면 명추리 +10%)', X + 10, Y + 112, 9, '#5b5644', 'left', 700);
    if (!cands.length) p.text('모은 단서가 없다. 찍어서 맞혀도 보너스는 없다', X + 10, Y + 128, 9, '#8a8064', 'left', 500);
    cands.forEach((c, i) => {
      const cw = (Wd - 24) / 2, cx = X + 10 + (i % 2) * (cw + 4), cy = Y + 124 + Math.floor(i / 2) * 20;
      const on = ov.ev === c.key;
      const col = c.verdict === 'lead' ? C.red : c.verdict === 'pass' ? '#3f8a3a' : c.verdict === 'zone' ? '#d98a2b' : '#3a5a9a';
      p.round(cx, cy, cw, 17, on ? col : '#8a7a5a', 2);
      p.rect(cx + 1, cy + 1, cw - 2, 15, on ? lighten(col, 0.75) : (ui.hover === 'ev:' + c.key ? '#fff6d8' : '#efe6c8'));
      p.rect(cx + 1, cy + 1, 3, 15, col);
      const title = p.measure(c.title, 9, 700) > cw - 22 ? c.title.slice(0, 13) + '…' : c.title;
      p.text((on ? '✔ ' : '') + title, cx + 8, cy + 3, 9, C.ink, 'left', 700);
      region({ id: 'ev:' + c.key, x: cx, y: cy, w: cw, h: 17, click: () => { ov.ev = on ? undefined : c.key; sfx('paper'); } });
    });
    button(p, 'acc-x', X + Wd - 70, Y + Hd - 28, 60, 22, '취소', () => { ui.overlay = null; }, { kind: 'quiet', size: 10 });
    return;
  }
  // 자물쇠 연출
  const age = t - ov.t0;
  const cx = X + Wd / 2, cy = Y + 70;
  const shake = age < 0.6 ? Math.round(Math.sin(age * 60) * 3) : 0;
  const ok = (ov.fixed ?? 0) > 0;
  const open = age > 0.6 && ok;
  lockIcon(p, cx - 24 + shake, cy - 30 - (open ? Math.min(8, (age - 0.6) * 40) : 0), open, 4);
  if (age > 0.6) {
    if (ok) {
      for (let i = 0; i < 10; i++) { const a = i * 0.63 + age; const r = 30 + (age - 0.6) * 60; p.rect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, 3, 3, i % 2 ? C.glow : C.ok); }
      p.text('딸깍! 자물쇠가 풀렸다', cx, cy + 34, 15, '#1f5a1f', 'center', 700);
      p.text(job.faults.length ? `남은 자물쇠 ${job.faults.length}개` : '모든 자물쇠를 풀었다! 켜서 확인하고 돌려주자', cx, cy + 56, 10, C.ink, 'center', 700);
      if (ov.verdict === 'sharp') { const s2 = Math.max(1, 2 - (age - 0.6) * 4); p.text('명추리! 수리비 +10%', cx, cy - 64, 14 * s2, '#b8862e', 'center', 400, 'sign'); }
      else if (ov.verdict === 'lucky') p.text('맞혔지만 고른 근거는 빗나갔다', cx, cy - 58, 10, '#8a6a1f', 'center', 700);
      else p.text('근거 없이 찍어서 맞혔다', cx, cy - 58, 10, '#8a8064', 'center', 700);
    } else {
      p.line(cx - 20, cy - 26, cx + 20, cy + 14, C.red, 4); p.line(cx + 20, cy - 26, cx - 20, cy + 14, C.red, 4);
      p.text('철컥… 이게 아니다', cx, cy + 34, 15, '#7a1a0a', 'center', 700);
      p.text('수리비 −10%. 단서를 더 모아 보자', cx, cy + 56, 10, C.ink, 'center', 700);
    }
    p.text(ov.text ?? '', cx, cy + 74, 9, '#5b5644', 'center', 500);
    if (age > 1.3) button(p, 'acc-ok', cx - 40, Y + Hd - 30, 80, 24, '확인', () => { ui.overlay = null; }, { kind: 'primary', size: 11 });
  }
}

/** 고칠 방법을 고르면 손맛 미니게임을 거쳐 자물쇠 결과로 간다 */
function startAccuse(a: Action) {
  const ov = ui.overlay;
  if (ov?.kind !== 'accuse') return;
  const state = holder.state;
  const job = activeJob(state)!;
  if (job.ctx.power && job.itemId !== 'clock') { ui.overlay = null; toast(job.itemId === 'calc' ? '전원부터! 먼저 전지를 빼세요' : '감전 위험! 먼저 플러그를 뽑으세요', true); sfx('zap', 0.5); return; }
  const blocked = repairCheck(state, ov.comp, a);
  if (blocked) { toast(blocked.text, true); ui.overlay = null; return; }
  const comp = compOf(item(job.itemId), ov.comp)!;
  ui.overlay = null;
  setMiniItem(job.itemId);
  startRepairMini(comp, a, redo => {
    ui.overlay = { kind: 'accuse', comp: comp.id };
    state.minute = Math.min(600, state.minute + redo);
    commitAccuse(a);
  }, () => { ui.overlay = { kind: 'accuse', comp: comp.id }; });
}

function commitAccuse(a: Action) {
  const ov = ui.overlay;
  if (ov?.kind !== 'accuse') return;
  const state = holder.state;
  const blocked = repairCheck(state, ov.comp, a);
  if (blocked) { toast(blocked.text, true); ui.overlay = null; return; }
  const job = activeJob(state)!;
  const def = item(job.itemId);
  const before = job.faults.filter(id => faultOf(def, id).comp === ov.comp);
  const ev = ov.ev ? cluesOf(def, job).find(c => c.key === ov.ev) : undefined;
  const r = repair(state, ov.comp, a);
  ov.action = a; ov.fixed = r.fixed ?? 0; ov.text = r.text; ov.t0 = ui.now;
  ov.verdict = !ov.fixed || !ev ? undefined : supports(def, job, ev, ov.comp, before) ? 'sharp' : 'lucky';
  if (ov.verdict === 'sharp') job.insight = (job.insight ?? 0) + 1;
  ui.popups = [];
  sfx('click');
  setTimeout(() => sfx(ov.fixed ? 'lockOpen' : 'lockFail'), 600);
}

export function tutorialTarget(id: string) { return regionById(id); }
