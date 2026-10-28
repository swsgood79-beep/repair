import type { Comp, Ctx, FX, Mark, Shape } from '../types';
import { C, Painter } from './painter';

/** 부품을 화면 좌표 사각형 안에 도트로 그린다. t는 초 단위 시간 */
export function drawPart(p: Painter, c: Comp, r: { x: number; y: number; w: number; h: number }, fx: FX, ctx: Ctx, t: number, shake = false) {
  let { x, y } = r;
  const { w, h } = r;
  if (shake) { x += Math.round(Math.sin(t * 60) * 1.5); y += Math.round(Math.cos(t * 47) * 1); }
  const cx = x + w / 2, cy = y + h / 2;
  const glow = fx.glow?.[c.id] ?? 0;
  shape(p, c.shape, x, y, w, h, cx, cy, glow, fx, ctx, t, c.id);
}

function shape(p: Painter, s: Shape, x: number, y: number, w: number, h: number, cx: number, cy: number, glow: number, fx: FX, ctx: Ctx, t: number, id: string) {
  switch (s) {
    case 'plug':
      p.box(x, y + 3, w - 6, h - 6, '#2c241e');
      p.rect(x + 2, y + 5, w - 10, 2, '#4a3e33');
      p.rect(x + w - 7, y + 6, 7, 2, C.steel); p.rect(x + w - 7, y + h - 8, 7, 2, C.steel);
      if (ctx.power) p.rect(x + w - 2, y + 4, 3, h - 8, C.ok);
      break;
    case 'cord': {
      for (let i = 0; i <= w; i++) {
        const yy = cy + Math.sin((i / w) * Math.PI * 3) * (h / 3);
        p.rect(x + i, yy - 2, 1, 4, '#6e5d48');
        p.rect(x + i, yy - 2, 1, 1, '#8f7c62');
      }
      break;
    }
    case 'switch': {
      p.box(x, y, w, h, '#2a221c');
      const on = ctx.sw > 0;
      p.box(cx - 5, y + 3, 10, h - 6, '#3d332b');
      p.rect(cx - 3, on ? y + 4 : cy, 6, h / 2 - 4, on ? C.glow : C.paper2);
      break;
    }
    case 'keys': {
      p.box(x, y, w, h, '#2a221c');
      const n = Math.max(2, Math.round(w / 16));
      const kw = (w - 4) / n;
      for (let i = 0; i < n; i++) {
        const down = i === ctx.sw;
        p.box(x + 2 + i * kw + 1, y + (down ? 4 : 2), kw - 2, h - (down ? 6 : 5), down ? C.glow : C.paper, '#3a2f26');
      }
      break;
    }
    case 'fuse':
      p.box(x, y, w, h, 'rgba(200,230,235,0.35)', '#9fb5ba');
      p.rect(x, y, 5, h, C.steel); p.rect(x + w - 5, y, 5, h, C.steel);
      p.rect(x + 5, Math.round(cy), w - 10, 1, '#5a5a5a');
      break;
    case 'xfmr':
      p.box(x, y, w, h, '#4a4f53');
      for (let i = 1; i < 5; i++) p.rect(x + 2, y + (i * h) / 5, w - 4, 1, '#3a3e41');
      p.box(x + w * 0.3, y + 3, w * 0.4, h - 6, '#b8662e', '#6e3510');
      p.rect(x + w * 0.3 + 1, y + 4, w * 0.4 - 2, 1, '#d98a4d');
      break;
    case 'cap':
      p.box(x, y + 3, w, h - 3, '#9aa2a8', '#3f4448');
      p.rect(x + 1, y + 1, w - 2, 4, '#c3c9cd');
      p.rect(x + 3, y + 7, 3, h - 11, '#50565a');
      break;
    case 'tube': {
      p.box(x, y + 6, w, h - 10, 'rgba(210,235,240,0.25)', '#a9c0c4');
      p.rect(x + 3, y + 2, w - 6, 5, 'rgba(210,235,240,0.25)');
      p.rect(x + 3, y + 2, w - 6, 1, '#a9c0c4');
      p.rect(x + 4, y + 4, w - 8, 2, '#c9ccd2');
      p.box(x + 4, y + 12, w - 8, h - 22, '#4f4f4f', '#333');
      if (glow > 0) {
        const a = 0.35 + 0.65 * glow;
        p.rect(x + 5, y + 13, w - 10, h - 24, `rgba(255,${Math.round(120 + 40 * glow)},40,${a})`);
        p.rect(x + 2, y + 10, w - 4, h - 16, `rgba(255,150,60,${0.12 * glow})`);
      }
      p.box(x - 1, y + h - 5, w + 2, 5, '#2a221c');
      break;
    }
    case 'pot':
      p.disc(cx, cy - 2, Math.min(w, h) / 2 - 3, '#9aa2a8');
      p.ring(cx, cy - 2, Math.min(w, h) / 2 - 3, '#3f4448');
      p.disc(cx, cy - 2, 3, C.cream);
      for (let i = 0; i < 3; i++) p.rect(x + 5 + i * (w - 12) / 2, y + h - 4, 2, 4, C.steel);
      break;
    case 'speaker': {
      const r = Math.min(w, h) / 2 - 1;
      const v = (fx.tone ?? 0) > 0.05 || (fx.noise ?? 0) > 0.05 || (fx.hum ?? 0) > 0.3 ? Math.round(Math.sin(t * 50)) : 0;
      p.disc(cx, cy, r, '#3a3027');
      p.disc(cx, cy, r - 2 + v * 0.5, '#8e7a5c');
      p.ring(cx, cy, r * 0.62, '#6b5a42');
      p.disc(cx, cy, r * 0.24, '#3a3027');
      break;
    }
    case 'bulb': {
      if (glow > 0) {
        for (let i = 4; i > 0; i--) p.disc(cx, cy - 4, w * 0.35 + i * 6 * glow, `rgba(255,210,122,${0.07 * glow})`);
      }
      p.disc(cx, cy - 6, w / 2 - 2, glow > 0 ? `rgba(255,240,190,${0.5 + 0.5 * glow})` : 'rgba(235,240,230,0.45)');
      p.ring(cx, cy - 6, w / 2 - 2, '#d8d4c4');
      p.rect(cx - 7, y + h - 14, 14, 14, C.brass);
      for (let i = 0; i < 3; i++) p.rect(cx - 7, y + h - 12 + i * 4, 14, 1, '#8a6a1f');
      const fil = glow > 0 ? C.white : '#5a5a5a';
      p.line(cx - 6, cy - 2, cx - 3, cy - 9, fil); p.line(cx - 3, cy - 9, cx, cy - 2, fil); p.line(cx, cy - 2, cx + 3, cy - 9, fil); p.line(cx + 3, cy - 9, cx + 6, cy - 2, fil);
      break;
    }
    case 'socket':
      p.box(x, y, w, h, C.brass, '#6d5214');
      for (let i = 1; i < 4; i++) p.rect(x + 2, y + (i * h) / 4, w - 4, 1, '#8a6a1f');
      break;
    case 'joint':
      p.rect(x, cy - 3, w, 6, '#9b8f7a');
      for (const k of [0.2, 0.5, 0.8]) { p.disc(x + w * k, cy, 4, '#d0d4d8'); p.rect(x + w * k - 1, cy - 2, 2, 1, C.white); }
      break;
    case 'board': {
      p.box(x, y, w, h, '#2f5b3c', '#1b3523');
      const n = Math.floor(w / 18);
      for (let i = 0; i < n; i++) {
        p.disc(x + 9 + i * 18, y + h * 0.32, 3, '#d0d4d8');
        p.rect(x + 5 + i * 18, y + h * 0.55, 8, h * 0.3, '#1f1f1f');
      }
      break;
    }
    case 'motor': {
      p.box(x, y, w, h, '#4b4f53');
      p.disc(cx, cy, Math.min(w, h) * 0.34, '#b8662e');
      p.ring(cx, cy, Math.min(w, h) * 0.34, '#6e3510');
      const sp = (fx.spin ?? 0) || (fx.whirr ?? 0);
      const a = sp ? t * 30 * Math.max(0.3, sp) : 0;
      p.line(cx - Math.cos(a) * 6, cy - Math.sin(a) * 6, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, C.white, 2);
      p.disc(cx, cy, 2, C.steel);
      break;
    }
    case 'belt': {
      const r1 = 5, r2 = Math.min(14, h / 2 - 2);
      const ax = x + 8, ay = y + h - 9, bx = x + w - r2 - 3, by = y + r2 + 3;
      p.line(ax, ay - r1, bx, by - r2, '#151515', 2); p.line(ax, ay + r1, bx, by + r2, '#151515', 2);
      p.ring(ax, ay, r1, '#151515', 2);
      p.disc(bx, by, r2 - 2, '#8d9297'); p.ring(bx, by, r2 - 2, '#3c4044');
      const a = (fx.spin ?? 0) ? t * 8 * (fx.spin ?? 1) : 0;
      p.line(bx - Math.cos(a) * (r2 - 4), by - Math.sin(a) * (r2 - 4), bx + Math.cos(a) * (r2 - 4), by + Math.sin(a) * (r2 - 4), '#3c4044', 2);
      break;
    }
    case 'bearing':
      p.box(x, y, w, h, C.brass, '#6d5214');
      p.disc(cx, cy, Math.min(w, h) / 4, '#e5e5e5');
      break;
    case 'blade': {
      const r = w / 2 - 2;
      p.disc(cx, cy, r, 'rgba(0,0,0,0.18)');
      const a0 = (fx.spin ?? 0) > 0 ? t * 14 * (fx.spin ?? 0) : 0.3;
      const blur = (fx.spin ?? 0) > 0.5;
      for (let i = 0; i < 4; i++) {
        const a = a0 + (i * Math.PI) / 2;
        for (let k = 0; k < 10; k++) {
          const rr = r * (0.2 + k * 0.07);
          const spread = 0.25 + k * 0.03;
          for (let s2 = -spread; s2 <= spread; s2 += 0.06) {
            p.rect(cx + Math.cos(a + s2) * rr, cy + Math.sin(a + s2) * rr, 2, 2, blur ? 'rgba(170,214,207,0.35)' : '#9fcfc6');
          }
        }
      }
      p.disc(cx, cy, 8, '#e4e0d4');
      p.ring(cx, cy, r, '#d8d8cc', 2);
      p.ring(cx, cy, r * 0.55, 'rgba(216,216,204,0.5)');
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.line(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 'rgba(220,220,210,0.35)'); }
      break;
    }
    case 'gear': {
      const run = (fx.swing ?? 0) > 0;
      const gear = (gx: number, gy: number, r: number, dir: number, sp: number) => {
        const a0 = run ? t * sp * dir : 0;
        const k = Math.max(8, Math.round(r * 1.2));
        for (let i = 0; i < k; i++) { const a = a0 + (i / k) * Math.PI * 2; p.rect(gx + Math.cos(a) * (r + 1) - 1, gy + Math.sin(a) * (r + 1) - 1, 3, 3, '#b08a37'); }
        p.disc(gx, gy, r, C.brass); p.ring(gx, gy, r, '#6d5214'); p.disc(gx, gy, Math.max(1, r * 0.3), C.cream);
      };
      gear(cx, y + h * 0.22, w * 0.3, 1, 0.3); gear(cx - 2, cy + h * 0.08, w * 0.23, -1, 0.6); gear(cx + 3, y + h * 0.82, w * 0.18, 1, 1.2);
      break;
    }
    case 'barrel':
      p.disc(cx, cy, w / 2, C.brass); p.ring(cx, cy, w / 2, '#6d5214');
      for (let i = 1; i < 4; i++) p.ring(cx, cy, (w / 2) * (i / 4), '#8a6a1f');
      break;
    case 'escape':
      for (let i = 0; i <= 20; i++) { const u = i / 20; p.rect(x + u * w, y + 3 + Math.sin(u * Math.PI) * (h - 6), 3, 3, '#c9c9c9'); }
      p.rect(cx - 1, y + h - 6, 3, 8, '#c9c9c9');
      p.disc(cx, y + 3, 3, C.steel);
      break;
    case 'spring':
      for (let i = 0; i < 6; i++) p.line(cx + (i % 2 ? -3 : 3), y + (i * h) / 6, cx + (i % 2 ? 3 : -3), y + ((i + 1) * h) / 6, '#c9c9c9');
      break;
    case 'pendulum': {
      const amp = 0.12 * (fx.swing ?? 0);
      const a = amp ? Math.sin(t * Math.PI * (fx.tick === 2 ? 0.86 : 1)) * amp : 0;
      const len = h - 14;
      const bx = cx + Math.sin(a) * len, by = y + Math.cos(a) * len;
      p.line(cx, y, bx, by, C.brass, 2);
      p.disc(bx, by, 12, '#d9b65e'); p.ring(bx, by, 12, '#6d5214'); p.disc(bx - 4, by - 4, 3, 'rgba(255,255,255,0.5)');
      break;
    }
    case 'head':
      p.box(x, y, w, h, '#c9cfd3', '#5b6064');
      p.rect(cx, y + 2, 1, h - 4, '#333');
      p.rect(x + 2, y + 2, w - 4, 1, C.white);
      break;
    case 'roller':
      p.disc(cx, cy, w / 2, '#151515'); p.ring(cx, cy, w / 2, '#444'); p.disc(cx, cy, 2, C.steel);
      break;
    case 'battery':
      p.box(x, y, w, h, '#3d3b37', '#222');
      for (let i = 0; i < 4; i++) {
        const bw = (w - 8) / 4;
        p.box(x + 4 + i * bw + 1, y + 3, bw - 2, h - 6, ctx.power ? '#d84a2f' : '#55504a', '#5c1c0f');
        if (ctx.power) p.rect(x + 4 + i * bw + 2, y + 4, bw - 4, 2, '#f08a6a');
      }
      break;
    case 'dial': {
      p.box(x, y, w, h, glow > 0 ? '#f3e2a6' : '#d8cba2', C.brass);
      if (glow > 0) p.rect(x + 1, y + 1, w - 2, h - 2, 'rgba(255,220,130,0.35)');
      for (let i = 0; i < 9; i++) p.rect(x + 8 + (i * (w - 16)) / 8, y + h - 8, 1, 5, '#4a3a1c');
      const px = x + 6 + (fx.pointer ?? ctx.knobA) * (w - 12);
      p.rect(px - 1, y + 2, 2, h - 4, C.red);
      break;
    }
    case 'hands': {
      const run = fx.hands;
      const a1 = (run ? t * 0.6 : 0) - Math.PI / 2, a2 = 0.5;
      p.line(cx, cy, cx + Math.cos(a1) * w * 0.55, cy + Math.sin(a1) * w * 0.55, '#2b2a26', 2);
      p.line(cx, cy, cx + Math.cos(a2) * w * 0.35, cy + Math.sin(a2) * w * 0.35, '#2b2a26', 3);
      p.disc(cx, cy, 3, C.brass);
      break;
    }
    case 'sole': {
      const hot = fx.glow?.element ?? 0;
      for (let i = 0; i < h; i++) { const inset = Math.max(0, (i - h * 0.5) * 0.9); p.rect(x + inset * (i > h / 2 ? 1 : 0) + (i < 3 ? 6 - i * 2 : 0), y + i, w - inset * 2 - (i < 3 ? 12 - i * 4 : 0), 1, i < 2 ? '#e5e9ec' : '#b9c1c6'); }
      for (let i = 0; i < 9; i++) p.disc(x + w * 0.12 + i * w * 0.09, y + h * 0.5, 2, '#5d686d');
      if (hot > 0) p.rect(x + 4, y + 2, w - 8, h * 0.5, `rgba(255,140,60,${0.25 * hot})`);
      break;
    }
    case 'element': {
      const g = fx.glow?.element ?? 0;
      const col = g > 0.7 ? '#ff7a3a' : g > 0 ? '#c8643a' : '#8a6a5a';
      for (let i = 0; i < w; i += 2) p.rect(x + i, cy + Math.sin(i * 0.5) * (h * 0.35), 2, 2, col);
      p.rect(x, cy - 1, 4, 3, C.steel); p.rect(x + w - 4, cy - 1, 4, 3, C.steel);
      break;
    }
    case 'thermo': {
      p.box(x, y + h * 0.4, w, h * 0.6, '#3d3b37', '#1b1a18');
      p.rect(x + 6, y + h * 0.3, w * 0.6, 3, '#c79a45'); p.rect(x + 6, y + h * 0.3 + 3, w * 0.6, 2, '#9aa3a8');
      p.disc(x + w * 0.66 + 6, y + h * 0.33, 3, '#e0e0e0'); p.disc(x + w * 0.66 + 6, y + h * 0.33 + 6, 3, '#e0e0e0');
      p.disc(x + w - 14, y + h * 0.7, 9, '#2a2a2a'); p.rect(x + w - 15, y + h * 0.7 - 9, 2, 8, C.cream);
      break;
    }
    case 'neon': {
      const g = fx.glow?.neon ?? 0;
      if (g > 0) p.disc(cx, cy, w * 0.7, 'rgba(255,120,60,0.25)');
      p.disc(cx, cy, Math.min(w, h) / 2 - 1, g > 0 ? '#ff8a4a' : '#5a3a2a'); p.ring(cx, cy, Math.min(w, h) / 2 - 1, '#2a1a10');
      break;
    }
    case 'handset': {
      const lifted = ctx.sw === 1 ? -6 : 0;
      p.box(x + 10, y + h * 0.25 + lifted, w - 20, h * 0.4, '#1c1c1c', '#000');
      p.rect(x + 12, y + h * 0.25 + 1 + lifted, w - 24, 1, '#3a3a3a');
      break;
    }
    case 'mic':
      p.disc(cx, cy, Math.min(w, h) / 2 - 1, '#1c1c1c'); p.disc(cx, cy, Math.min(w, h) / 2 - 5, '#2a2a2a');
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; p.disc(cx + Math.cos(a) * (w * 0.2), cy + Math.sin(a) * (h * 0.2), 1, '#777'); }
      p.disc(cx, cy, 1, '#777');
      break;
    case 'bell': {
      const v = fx.ring ? Math.round(Math.sin(t * 60) * 1.5) : 0;
      p.disc(cx + v, cy, w / 2 - 2, C.brass); p.ring(cx + v, cy, w / 2 - 2, '#6d5214'); p.disc(cx + v - w * 0.12, cy - h * 0.12, w * 0.12, '#f0d27a');
      p.disc(cx, cy, 3, '#3a2a10');
      p.line(cx + w * 0.4, cy + h * 0.45, cx + w * 0.25 - v * 2, cy + h * 0.2, '#7a7a7a', 2);
      break;
    }
    case 'rotary': {
      const r = Math.min(w, h) / 2 - 2;
      p.disc(cx, cy, r, '#e8e2d0'); p.ring(cx, cy, r, '#2a2a2a');
      for (let i = 0; i < 10; i++) { const a = -Math.PI * 0.25 - (i / 10) * Math.PI * 1.55; p.disc(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, Math.max(2, r * 0.13), '#2a2a2a'); }
      p.disc(cx, cy, r * 0.35, '#c9c1a4');
      p.rect(cx + r * 0.55, cy + r * 0.3, 3, r * 0.5, C.steel);
      break;
    }
  }
  void id;
}

/* ---------- 확대 그림 ---------- */
/** 원 안에 부품을 크게 그리고 흠(mark)을 덧그린다 */
export function drawCloseup(p: Painter, shape: Shape, mark: Mark | 'ok', cx: number, cy: number, r: number) {
  p.clearText(cx - r - 3, cy - r - 3, r * 2 + 6, r * 2 + 6);
  p.disc(cx, cy, r + 3, C.ink);
  p.disc(cx, cy, r, '#2c3a33');
  const s = r * 1.3;
  const dummyCtx = { power: false, sw: 0, knobA: 0.3, knobB: 0.5, wiggle: null, warm: false, nudge: false, moved: false };
  const big: Record<string, [number, number]> = { blade: [1, 1], board: [1.2, 0.5], dial: [1.4, 0.35], cord: [1.2, 0.4], keys: [1.2, 0.45], switch: [0.8, 0.5], fuse: [1.1, 0.4], belt: [1.2, 0.8], battery: [1.2, 0.5], head: [1, 0.5], joint: [1.1, 0.6] };
  const [kw, kh] = big[shape] ?? [0.8, 0.95];
  const w = s * kw, h = s * kh;
  if (mark === 'snapped' && shape === 'belt') { /* 끊어진 벨트는 아래에서 따로 그린다 */ } else
    shape_(p, shape, cx - w / 2, cy - h / 2, w, h, dummyCtx);
  const m = (dx: number, dy: number) => [cx + dx * r, cy + dy * r] as const;
  switch (mark) {
    case 'filament': { p.rect(cx - 10, cy - 10, 20, 14, 'rgba(235,240,230,0.6)'); p.line(cx - 12, cy, cx - 6, cy - 10, '#5a5a5a', 2); p.line(cx + 4, cy - 2, cx + 12, cy - 10, '#5a5a5a', 2); p.line(cx - 5, cy - 9, cx - 2, cy - 4, C.red, 1); break; }
    case 'rust': for (let i = 0; i < 26; i++) p.rect(cx - 12 + ((i * 7) % 24), cy - 6 + ((i * 5) % 14), 3, 2, i % 3 ? '#5fa58a' : '#3e8a6c'); break;
    case 'soot': for (let i = 0; i < 30; i++) p.rect(cx - 14 + ((i * 11) % 28), cy - 6 + ((i * 7) % 12), 3, 3, i % 2 ? '#1a1a1a' : '#33302b'); break;
    case 'bulge': { const [bx, by] = m(0, -0.45); p.disc(bx, by, r * 0.38, '#c3c9cd'); p.ring(bx, by, r * 0.38, C.red, 2); break; }
    case 'leak': for (let i = 0; i < 5; i++) p.disc(cx - 10 + i * 6, cy + r * 0.55 + (i % 2) * 3, 4, '#7a5a1e'); break;
    case 'crack': { p.disc(cx, cy, r * 0.3, '#d0d4d8'); p.ring(cx, cy, r * 0.3, C.ink, 1); for (let i = 0; i < 10; i++) { const a = i * 0.6; p.rect(cx + Math.cos(a) * r * 0.36, cy + Math.sin(a) * r * 0.36, 2, 2, C.red); } break; }
    case 'dryoil': for (let i = 0; i < 14; i++) p.rect(cx - 8 + ((i * 5) % 16), cy - 8 + ((i * 3) % 16), 4, 3, i % 2 ? '#6b4a1e' : '#4a3210'); break;
    case 'burnt': { p.rect(cx - 12, cy - 6, 24, 12, '#c79a3a'); p.rect(cx - 6, cy - 4, 14, 8, '#7a4a1a'); break; }
    case 'slack': case 'glazed': for (let i = 0; i < 6; i++) p.rect(cx - 10 + i * 4, cy - 2 + (i % 2) * 3, 6, 1, 'rgba(255,255,255,0.7)'); break;
    case 'snapped': { p.line(cx - r * 0.7, cy + 4, cx - 4, cy - 2, '#151515', 3); p.line(cx + 4, cy + 6, cx + r * 0.7, cy - 4, '#151515', 3); p.rect(cx - 3, cy - 4, 2, 2, C.red); p.rect(cx + 2, cy + 3, 2, 2, C.red); break; }
    case 'torn': p.line(cx - r * 0.5, cy - r * 0.3, cx - r * 0.1, cy + r * 0.1, '#16110c', 3); p.line(cx - r * 0.1, cy + r * 0.1, cx - r * 0.3, cy + r * 0.45, '#16110c', 3); break;
    case 'powder': for (let i = 0; i < 40; i++) p.rect(cx - 16 + ((i * 13) % 32), cy - 8 + ((i * 7) % 16), 2, 2, i % 2 ? '#f4f2ea' : '#d6d2c2'); break;
    case 'kink': { p.rect(cx - 2, cy - r * 0.6, 3, r * 0.5, '#c9c9c9'); p.line(cx, cy - r * 0.1, cx + 10, cy + 6, '#c9c9c9', 3); p.rect(cx + 6, cy + 2, 3, 3, C.red); break; }
    case 'bent': { const [bx, by] = m(0.3, -0.3); p.rect(bx - 2, by - 6, 4, 8, C.red); p.rect(bx + 1, by - 9, 4, 4, '#b08a37'); break; }
    case 'pin': p.disc(cx, cy, 5, '#151515'); p.ring(cx, cy, 6, C.red); break;
    case 'dirty': for (let i = 0; i < 24; i++) p.rect(cx - 12 + ((i * 7) % 24), cy - 6 + ((i * 3) % 12), 3, 2, i % 2 ? '#7a5a2e' : '#5a4220'); break;
    case 'faded': p.rect(cx - 8, cy - r * 0.6, 16, 6, '#f4f4f0'); break;
    case 'frayed': { p.rect(cx - r * 0.6, cy - 3, r * 1.2, 6, '#6e5d48'); p.rect(cx - 3, cy - 4, 6, 8, '#2c3a33'); p.line(cx - 3, cy, cx + 1, cy - 3, '#d98a4d', 1); p.line(cx + 3, cy + 1, cx - 1, cy + 3, '#d98a4d', 1); break; }
    case 'offtrack': { p.line(cx - r * 0.6, cy + 2, cx - 4, cy + r * 0.5, '#e8e2cf', 1); p.line(cx - 4, cy + r * 0.5, cx + r * 0.5, cy + r * 0.4, '#e8e2cf', 1); p.ring(cx + r * 0.3, cy - 4, 6, C.steel, 2); break; }
    case 'gummy': for (let i = 0; i < 8; i++) p.disc(cx - 10 + ((i * 9) % 20), cy - 8 + ((i * 7) % 16), 3, '#7a4e18'); break;
    case 'ok': break;
  }
  p.ring(cx, cy, r, mark === 'ok' ? C.ok : C.red, 2);
}

function shape_(p: Painter, s: Shape, x: number, y: number, w: number, h: number, ctx: Ctx) {
  shape(p, s, x, y, w, h, x + w / 2, y + h / 2, 0, {}, ctx, 0, '');
}

/* ---------- 작은 물건 아이콘 (선반·카운터·도감) ---------- */
export function drawItemIcon(p: Painter, id: string, x: number, y: number, s = 1) {
  const r = (a: number, b: number, w: number, h: number, c: string) => p.rect(x + a * s, y + b * s, w * s, h * s, c);
  switch (id) {
    case 'lamp':
      r(9, 2, 16, 8, '#3d6f69'); r(7, 9, 20, 2, '#2b524d'); r(15, 11, 4, 3, C.glow); r(16, 14, 2, 10, C.brass); r(6, 24, 22, 6, '#4f8a80'); r(6, 29, 22, 1, '#22433e');
      break;
    case 'fan':
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) r(16 + a * 5 - 3, 11 + b * 5 - 3, 6, 6, '#9fcfc6');
      r(2, 0, 28, 1, '#d8d8cc'); r(2, 22, 28, 1, '#d8d8cc'); r(2, 0, 1, 23, '#d8d8cc'); r(29, 0, 1, 23, '#d8d8cc'); r(14, 9, 4, 4, '#e4e0d4'); r(14, 23, 4, 4, C.steel); r(8, 27, 16, 3, '#4f8a80');
      break;
    case 'radio':
      r(1, 4, 30, 24, '#6b4529'); r(3, 6, 26, 20, '#5a3920'); r(5, 9, 10, 14, '#8a6f4c'); for (let i = 0; i < 4; i++) r(5, 10 + i * 3, 10, 1, '#6e5536'); r(17, 9, 10, 5, '#e9dcb4'); r(21, 9, 1, 5, C.red); r(18, 18, 3, 3, '#2a1d14'); r(24, 18, 3, 3, '#2a1d14');
      break;
    case 'cassette':
      r(2, 6, 28, 20, '#b9b2a3'); r(2, 25, 28, 1, '#4f4a42'); r(5, 9, 15, 8, '#2c2a28'); r(7, 11, 4, 4, '#f2efe7'); r(14, 11, 4, 4, '#f2efe7'); r(22, 9, 6, 6, '#3a3027'); r(5, 20, 20, 3, '#e9e2d0');
      break;
    case 'iron':
      r(4, 20, 26, 6, '#c9cfd3'); r(6, 18, 22, 3, '#8d9297'); r(8, 8, 18, 10, '#c0392b'); r(10, 4, 14, 4, '#2a2a2a'); r(10, 4, 2, 6, '#2a2a2a'); r(22, 4, 2, 6, '#2a2a2a'); r(20, 10, 3, 3, '#ff8a4a');
      break;
    case 'phone':
      r(4, 12, 26, 16, '#1c1c1c'); r(6, 4, 22, 5, '#1c1c1c'); r(4, 6, 4, 6, '#1c1c1c'); r(26, 6, 4, 6, '#1c1c1c'); r(12, 15, 10, 10, '#e8e2d0'); r(16, 19, 2, 2, '#2a2a2a');
      break;
    case 'clock':
      r(9, 0, 14, 30, '#6b4529'); r(10, 1, 12, 28, '#5a3920'); r(11, 2, 10, 10, '#efe6cc'); r(15, 4, 1, 4, '#2b2a26'); r(15, 7, 3, 1, '#2b2a26'); r(12, 14, 8, 14, 'rgba(200,230,230,0.15)'); r(15, 14, 1, 9, C.brass); r(13, 22, 5, 5, '#d9b65e');
      break;
  }
}

/* ---------- 공구 아이콘 24×24 ---------- */
export function drawToolIcon(p: Painter, id: string, x: number, y: number) {
  const r = (a: number, b: number, w: number, h: number, c: string) => p.rect(x + a, y + b, w, h, c);
  switch (id) {
    case 'hand': r(7, 9, 10, 11, '#e6b98f'); for (let i = 0; i < 4; i++) r(7 + i * 2.5, 3 + (i === 0 || i === 3 ? 3 : 0), 2, 7, '#e6b98f'); r(3, 11, 4, 3, '#e6b98f'); r(7, 19, 10, 1, '#b5835f'); break;
    case 'driver': r(4, 16, 7, 5, C.red); r(5, 15, 5, 2, '#f08a6a'); r(10, 12, 3, 3, C.steel); for (let i = 0; i < 7; i++) r(12 + i, 12 - i, 2, 2, C.steel); break;
    case 'look': r(3, 9, 18, 7, C.white); p.disc(x + 12, y + 12, 3, '#2b4a6a'); r(11, 11, 1, 1, C.white); r(3, 8, 18, 1, C.ink); r(3, 16, 18, 1, C.ink); break;
    case 'loupe': p.ring(x + 10, y + 10, 6, C.brass, 2); p.disc(x + 10, y + 10, 4, 'rgba(180,220,230,0.5)'); for (let i = 0; i < 6; i++) r(14 + i, 14 + i, 3, 3, '#5a3920'); break;
    case 'volt': r(4, 2, 16, 20, '#e2b45e'); r(6, 4, 12, 7, '#cfe0c0'); r(8, 7, 7, 1, C.ink); r(9, 14, 6, 6, '#3a3027'); r(11, 15, 2, 4, C.red); r(1, 18, 3, 6, C.red); r(20, 18, 3, 6, C.ink); break;
    case 'ohm': r(4, 2, 16, 20, '#e2b45e'); r(6, 4, 12, 7, '#cfe0c0'); p.ring(x + 12, y + 16, 3, C.ink); r(9, 19, 2, 1, C.ink); r(13, 19, 2, 1, C.ink); r(1, 18, 3, 6, C.red); r(20, 18, 3, 6, C.ink); break;
    case 'ear': p.ring(x + 8, y + 8, 5, C.steel, 2); r(12, 11, 2, 8, C.steel); p.disc(x + 15, y + 19, 4, C.steel); p.disc(x + 15, y + 19, 2, C.ink); r(2, 6, 3, 3, C.ink); r(11, 6, 3, 3, C.ink); break;
    case 'touch': r(9, 3, 4, 12, '#e6b98f'); r(7, 12, 10, 9, '#e6b98f'); r(13, 9, 2, 6, '#e6b98f'); r(15, 10, 2, 5, '#e6b98f'); r(17, 4, 2, 5, C.red); r(19, 2, 2, 3, C.warn); break;
    case 'wiggle': r(8, 6, 8, 12, '#e6b98f'); r(3, 9, 2, 6, C.cream); r(19, 9, 2, 6, C.cream); r(1, 11, 2, 2, C.cream); r(21, 11, 2, 2, C.cream); break;
    case 'inject': r(3, 9, 12, 6, '#2c7a73'); r(15, 11, 7, 2, C.steel); r(5, 11, 3, 2, C.glow); r(1, 4, 2, 2, C.glow); r(4, 2, 2, 2, C.glow); break;
    case 'mark': for (let i = 0; i < 12; i++) r(5 + i, 18 - i, 3, 3, C.gold); r(4, 19, 3, 3, '#e6b98f'); r(17, 4, 4, 4, C.red); break;
    case 'repair': for (let i = 0; i < 10; i++) r(4 + i, 4 + i, 3, 3, C.steel); r(13, 13, 7, 7, C.red); r(3, 3, 5, 2, C.steel); r(3, 3, 2, 5, C.steel); for (let i = 0; i < 9; i++) r(17 - i, 4 + i, 2, 2, C.brass); break;
    case 'clock': p.disc(x + 12, y + 12, 9, C.cream); p.ring(x + 12, y + 12, 9, C.ink); r(12, 6, 1, 7, C.ink); r(12, 12, 5, 1, C.ink); break;
    case 'book': r(4, 3, 16, 18, '#3e6b5a'); r(6, 5, 12, 14, C.paper); r(8, 8, 8, 1, C.ink); r(8, 11, 8, 1, C.ink); r(8, 14, 5, 1, C.ink); break;
    case 'coin': p.disc(x + 12, y + 12, 8, C.gold); p.ring(x + 12, y + 12, 8, '#8a6a1f'); r(11, 8, 2, 8, '#8a6a1f'); break;
    case 'sound': r(3, 9, 5, 6, C.cream); for (let i = 0; i < 5; i++) r(8 + i, 9 - i, 1, 6 + i * 2, C.cream); r(17, 8, 1, 8, C.cream); r(20, 6, 1, 12, C.cream); break;
    case 'shelf': r(2, 4, 20, 2, C.wood3); r(2, 13, 20, 2, C.wood3); r(2, 22, 20, 2, C.wood3); r(4, 7, 5, 6, C.rust); r(12, 8, 6, 5, C.sage); r(6, 16, 8, 6, C.gold); break;
  }
}

/* ---------- 손님 ---------- */
export function drawCustomer(p: Painter, look: { hair: string; skin: string; shirt: string; style: number }, x: number, y: number, mood: 'calm' | 'happy' | 'angry' | 'worried', t: number) {
  const bob = mood === 'angry' ? Math.round(Math.sin(t * 30)) : Math.round(Math.sin(t * 2) * 0.6);
  const s = 3;
  const r = (a: number, b: number, w: number, h: number, c: string) => p.rect(x + a * s, y + b * s + bob, w * s, h * s, c);
  r(2, 17, 20, 14, look.shirt); r(2, 17, 20, 1, 'rgba(255,255,255,0.2)'); r(10, 17, 4, 3, look.skin);
  r(5, 3, 14, 15, look.skin);
  if (look.style === 0) { r(4, 1, 16, 4, look.hair); r(4, 2, 2, 7, look.hair); r(18, 2, 2, 7, look.hair); }
  else if (look.style === 1) { r(4, 1, 16, 5, look.hair); r(3, 3, 3, 12, look.hair); r(18, 3, 3, 12, look.hair); }
  else if (look.style === 2) { r(4, 0, 16, 5, look.hair); r(3, 2, 3, 16, look.hair); r(18, 2, 3, 16, look.hair); }
  else { r(5, 1, 14, 3, look.hair); }
  const eye = '#1d1a17';
  if (mood === 'angry') { r(7, 8, 3, 1, eye); r(14, 8, 3, 1, eye); r(7, 9, 2, 1, eye); r(15, 9, 2, 1, eye); r(9, 14, 6, 1, '#7a2a1a'); }
  else if (mood === 'happy') { r(7, 9, 3, 1, eye); r(14, 9, 3, 1, eye); r(9, 13, 6, 1, '#7a2a1a'); r(10, 14, 4, 1, '#7a2a1a'); r(6, 11, 2, 1, '#e89a8a'); r(16, 11, 2, 1, '#e89a8a'); }
  else if (mood === 'worried') { r(8, 9, 2, 2, eye); r(14, 9, 2, 2, eye); r(10, 14, 4, 1, '#7a2a1a'); r(7, 7, 3, 1, eye); r(14, 7, 3, 1, eye); }
  else { r(8, 9, 2, 2, eye); r(14, 9, 2, 2, eye); r(10, 14, 4, 1, '#7a2a1a'); }
  if (mood === 'angry') { const ex = x + 22 * s, ey = y - 2; p.rect(ex, ey + 4, 10, 3, C.red); p.rect(ex + 3, ey, 3, 11, C.red); }
  if (mood === 'happy') { const ex = x + 22 * s, ey = y - 4 + Math.round(Math.sin(t * 4) * 2); p.rect(ex, ey + 2, 4, 4, C.red); p.rect(ex + 5, ey + 2, 4, 4, C.red); p.rect(ex + 1, ey + 5, 7, 3, C.red); p.rect(ex + 3, ey + 8, 3, 2, C.red); }
}
