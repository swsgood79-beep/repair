/**
 * 작업 소품 그림: 공구(드라이버·인두·펜치…), 나사 머리, 기판, 덮개 판, 재질(나무·플라스틱·금속).
 * 공구는 외곽선 스프라이트로 캐시해 미니게임과 작업대에서 함께 쓴다.
 */
import { C, Painter } from './painter';
import { blit, darken, lighten, sprite, type Pix } from './art';

/* ---------- 물건 몸체 재질 ---------- */
export type Material = 'wood' | 'plastic' | 'metal' | 'enamel';
export const BODY: Record<string, { color: string; mat: Material }> = {
  lamp: { color: '#4f8a80', mat: 'plastic' }, fan: { color: '#4f8a80', mat: 'plastic' }, radio: { color: '#6b4529', mat: 'wood' },
  cassette: { color: '#b9b2a3', mat: 'plastic' }, clock: { color: '#6b4529', mat: 'wood' }, iron: { color: '#b8392b', mat: 'plastic' },
  phone: { color: '#2a2a2a', mat: 'enamel' }, ricecooker: { color: '#e2dccb', mat: 'plastic' }, amp: { color: '#b9b5a8', mat: 'metal' },
  turntable: { color: '#6b4529', mat: 'wood' }, sewing: { color: '#262626', mat: 'enamel' }, tv: { color: '#6b4529', mat: 'wood' },
  calc: { color: '#3a3a36', mat: 'plastic' },
};

/** 재질을 입힌 몸체 상자 (화면 좌표) */
export function body(p: Painter, x: number, y: number, w: number, h: number, color: string, mat: Material, edge = '#140d08') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w < 4 || h < 4) { p.rect(x, y, w, h, color); return; }
  p.round(x, y, w, h, edge, 2);
  p.rect(x + 1, y + 1, w - 2, h - 2, color);
  if (mat === 'wood') {
    // 나뭇결: 물결치는 가로줄과 옹이
    const dark = darken(color, 0.16), lite = lighten(color, 0.08);
    for (let yy = 3; yy < h - 3; yy += 3) {
      const k = (yy * 37 + x) % 17;
      for (let xx = 2; xx < w - 2; xx += 6) { const wob = Math.round(Math.sin((xx + k * 9) * 0.05 + yy * 0.3)); p.rect(x + xx, y + yy + wob, 5, 1, (xx + yy) % 4 ? dark : lite); }
    }
    if (w > 40 && h > 30) { const kx = x + w * 0.7, ky = y + h * 0.35; p.disc(kx, ky, 3, darken(color, 0.3)); p.ring(kx, ky, 5, darken(color, 0.2)); }
  } else if (mat === 'metal') {
    for (let yy = 2; yy < h - 2; yy += 2) p.rect(x + 2, y + yy, w - 4, 1, (yy / 2) % 3 ? lighten(color, 0.05) : darken(color, 0.06));
  } else {
    // 플라스틱·법랑: 비스듬한 광택
    const sheen = mat === 'enamel' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.16)';
    for (let i = 0; i < Math.min(w, h) * 0.5; i++) p.rect(x + 4 + i + w * 0.08, y + 3 + i, Math.max(2, w * 0.12), 1, sheen);
    p.rect(x + 2, y + h - 4, w - 4, 2, darken(color, 0.12));
  }
  // 테두리 입체
  p.rect(x + 2, y + 1, w - 4, 1, lighten(color, 0.3)); p.rect(x + 1, y + 2, 1, h - 4, lighten(color, 0.15));
  p.rect(x + 2, y + h - 2, w - 4, 1, darken(color, 0.35)); p.rect(x + w - 2, y + 2, 1, h - 4, darken(color, 0.25));
}

/** 스피커 그릴 천 (짠 무늬) */
export function grille(p: Painter, x: number, y: number, w: number, h: number, color: string) {
  x = Math.round(x); y = Math.round(y);
  p.rect(x, y, w, h, darken(color, 0.3));
  p.rect(x + 1, y + 1, w - 2, h - 2, color);
  for (let yy = 1; yy < h - 1; yy++) for (let xx = 1 + (yy % 2); xx < w - 1; xx += 2) p.rect(x + xx, y + yy, 1, 1, darken(color, 0.14));
  p.rect(x + 1, y + 1, w - 2, 1, darken(color, 0.4));
}

/** 십자 나사 머리. lift는 풀려 올라온 정도(그림자 거리) */
export function screwHead(p: Painter, x: number, y: number, r: number, rot = 0.6, lift = 0) {
  if (lift > 0) { p.disc(x + 2, y + 2 + lift / 2, r + 1, 'rgba(0,0,0,0.4)'); for (let i = 0; i < lift; i += 2) p.rect(x - r * 0.4, y + i * 0.6, r * 0.8, 1, i % 4 ? '#8d9297' : '#5d686d'); }
  y -= lift;
  p.disc(x, y, r + 1, '#2a2d30');
  p.disc(x, y, r, '#a9b1b6');
  p.disc(x - r * 0.15, y - r * 0.15, r * 0.75, '#c9d0d4');
  p.disc(x - r * 0.35, y - r * 0.4, Math.max(1, r * 0.22), '#eef2f4');
  const k = r * 0.62;
  for (const a of [rot, rot + Math.PI / 2]) {
    p.line(x - Math.cos(a) * k, y - Math.sin(a) * k, x + Math.cos(a) * k, y + Math.sin(a) * k, '#3a3e41', Math.max(1, Math.round(r / 5)));
  }
  p.rect(x - 1, y - 1, 2, 2, '#2a2d30');
}

/** 덮개 판: 물건 색 + 통풍 구멍 + 모서리 나사 */
export function coverPlate(p: Painter, x: number, y: number, w: number, h: number, itemId: string, screws = true) {
  const b = BODY[itemId] ?? { color: '#5a4636', mat: 'metal' as Material };
  const col = b.mat === 'wood' ? darken(b.color, 0.12) : b.color;
  body(p, x, y, w, h, col, b.mat === 'wood' ? 'wood' : b.mat);
  // 통풍 구멍
  if (screws && w > 60 && h > 30) {
    const n = Math.floor((w * 0.5) / 7);
    const vx = x + w / 2 - (n * 7) / 2, vy = y + h * 0.18;
    for (let i = 0; i < n; i++) { p.round(vx + i * 7, vy, 4, Math.min(16, h * 0.22), darken(col, 0.55), 1); p.rect(vx + i * 7, vy + Math.min(16, h * 0.22) - 1, 4, 1, lighten(col, 0.2)); }
  }
  if (screws) {
    const r = Math.max(2, Math.min(4, Math.round(Math.min(w, h) / 22)));
    for (const [sx, sy] of [[x + 6, y + 6], [x + w - 7, y + 6], [x + 6, y + h - 7], [x + w - 7, y + h - 7]]) screwHead(p, sx, sy, r, 0.7);
  }
}

/** 초록 기판: 동박 선, 패드, 실크 글씨 자리 */
export function pcb(p: Painter, x: number, y: number, w: number, h: number) {
  x = Math.round(x); y = Math.round(y);
  p.round(x, y, w, h, '#0f2a18', 2);
  p.rect(x + 1, y + 1, w - 2, h - 2, '#2f6a44');
  for (let i = 0; i < 9; i++) {
    const yy = y + 6 + ((i * 13) % Math.max(1, h - 12));
    const x0 = x + 6 + ((i * 41) % Math.max(1, w / 2)), x1 = Math.min(x + w - 6, x0 + 40 + (i * 17) % 60);
    p.rect(x0, yy, x1 - x0, 2, '#3f8a58');
    p.rect(x1 - 2, yy, 2, Math.min(14, y + h - 6 - yy), '#3f8a58');
  }
  for (let i = 0; i < 18; i++) { const px = x + 8 + ((i * 53) % Math.max(1, w - 16)), py = y + 6 + ((i * 29) % Math.max(1, h - 12)); p.disc(px, py, 2, '#c9a24a'); p.rect(px, py, 1, 1, '#1a1a1a'); }
  for (let i = 0; i < 4; i++) p.rect(x + 10 + i * 30, y + h - 8, 14, 2, 'rgba(240,240,220,0.45)');
  p.rect(x + 2, y + 1, w - 4, 1, '#4f8a64');
}

/** 세로 온도계 */
export function thermometer(p: Painter, x: number, y: number, h: number, level: number, okFrom: number, okTo: number) {
  p.round(x - 2, y - 2, 20, h + 26, '#140d08', 2);
  p.rect(x - 1, y - 1, 18, h + 24, '#e8e2cf');
  for (let i = 0; i <= 10; i++) p.rect(x + 12, y + 2 + (i * (h - 4)) / 10, i % 5 ? 3 : 5, 1, '#5b5644');
  p.rect(x + 4, y + 2 + (h - 4) * (1 - okTo), 6, (h - 4) * (okTo - okFrom), 'rgba(127,191,106,0.5)');
  p.round(x + 5, y + 2, 4, h, '#5b5644', 1);
  p.rect(x + 6, y + 3, 2, h - 2, '#f4f2ea');
  const lv = Math.max(0, Math.min(1.2, level)) / 1.2;
  const col = level > 1 ? '#d9573f' : level > okFrom * 1.2 ? '#7fbf6a' : '#e8b84a';
  p.rect(x + 6, y + 3 + (h - 2) * (1 - lv), 2, (h - 2) * lv, col);
  p.disc(x + 7, y + h + 10, 7, '#5b5644'); p.disc(x + 7, y + h + 10, 6, col); p.rect(x + 4, y + h + 7, 2, 2, 'rgba(255,255,255,0.6)');
}

/* ---------- 공구 스프라이트 ---------- */
type ToolName = 'driver' | 'iron' | 'ironHot' | 'pliers' | 'brush' | 'stripper' | 'spray' | 'oiler' | 'hammer' | 'sucker';

function drawTool(q: Pix, n: ToolName) {
  const steel = '#b9c1c6', steelD = '#6d777c', steelL = '#eef2f4';
  switch (n) {
    case 'driver': {
      // 끝이 (4, 46), 손잡이가 위
      q.r(3, 26, 3, 20, steel); q.r(3, 26, 1, 20, steelL); q.r(5, 26, 1, 20, steelD); q.r(3, 44, 3, 2, steelD);
      q.r(0, 4, 9, 23, '#c0392b'); q.r(1, 4, 2, 22, '#e86a50'); q.r(7, 5, 1, 21, '#7a1e14');
      for (let y = 8; y < 24; y += 3) q.r(0, y, 9, 1, '#9a2a1e');
      q.r(1, 1, 7, 4, '#2a2a2a'); q.r(2, 1, 3, 1, '#555');
      break;
    }
    case 'iron': case 'ironHot': {
      // 끝이 (2, 48) 쪽, 비스듬
      for (let i = 0; i < 18; i++) { q.r(2 + i * 0.35, 48 - i, 2, 1, n === 'ironHot' && i < 5 ? (i < 2 ? '#ffe08a' : '#ff9a3a') : i < 8 ? '#c9ccd0' : steel); }
      q.r(7, 22, 6, 10, '#9aa2a8'); q.r(7, 22, 2, 10, steelL);
      q.r(6, 2, 8, 21, '#7a5537'); q.r(7, 2, 2, 20, '#a8784e'); q.r(13, 3, 1, 19, '#4a3220');
      for (let y = 6; y < 20; y += 4) q.r(6, y, 8, 1, '#5e3e26');
      q.r(8, 0, 4, 2, '#2a2a2a');
      break;
    }
    case 'pliers': {
      // 입이 위 (8,0), 손잡이 아래
      q.r(6, 0, 2, 12, steel); q.r(9, 0, 2, 12, steelD); q.r(6, 0, 1, 12, steelL);
      q.oval(8, 13, 3, 3, steelD); q.p(8, 13, steelL);
      for (let i = 0; i < 26; i++) { q.r(5 - i * 0.15, 16 + i, 3, 1, '#c0392b'); q.r(10 + i * 0.15, 16 + i, 3, 1, '#a8301f'); }
      q.r(4, 16, 1, 20, '#e86a50');
      break;
    }
    case 'brush': {
      for (let i = 0; i < 9; i++) q.r(1 + i * 2, 30, 1, 6, i % 2 ? '#e8e0c4' : '#cfc3a0');
      q.r(0, 24, 18, 7, '#b9c1c6'); q.r(0, 24, 18, 1, '#eef2f4'); q.r(0, 30, 18, 1, '#6d777c');
      q.r(6, 0, 6, 24, '#946a46'); q.r(7, 0, 2, 24, '#c09068'); q.oval(9, 2, 3, 2, '#946a46');
      break;
    }
    case 'stripper': {
      q.r(0, 0, 10, 26, '#c0392b'); q.r(1, 0, 2, 26, '#e86a50'); q.r(12, 0, 10, 26, '#a8301f');
      q.r(8, 22, 6, 8, steel); q.r(9, 26, 4, 2, '#2a2a2a'); q.r(8, 30, 6, 8, steel);
      q.r(0, 34, 10, 26, '#c0392b'); q.r(12, 34, 10, 26, '#a8301f');
      break;
    }
    case 'spray': {
      q.r(2, 14, 24, 54, '#2c7a73'); q.r(3, 14, 5, 54, '#4fa69c'); q.r(22, 15, 3, 52, '#1f5953');
      q.r(4, 30, 20, 20, '#efe6c8'); q.r(6, 34, 16, 2, '#c0392b'); q.r(6, 39, 12, 1, '#5b5644'); q.r(6, 42, 14, 1, '#5b5644');
      q.oval(14, 13, 12, 3, '#9aa2a8'); q.r(9, 4, 10, 8, '#d0d4d8'); q.r(9, 4, 3, 8, '#eef2f4'); q.r(18, 6, 6, 3, '#2a2a2a');
      q.r(2, 66, 24, 2, '#1f5953');
      break;
    }
    case 'oiler': {
      q.oval(12, 30, 11, 9, '#d9a443'); q.oval(9, 27, 4, 3, '#f0c870'); q.r(1, 34, 22, 6, '#b8862e');
      for (let i = 0; i < 20; i++) q.r(12, 20 - i, 2, 1, '#c9ccd0');
      q.r(11, 0, 4, 2, '#555'); q.r(20, 24, 4, 10, '#8a6a1f');
      break;
    }
    case 'hammer': {
      q.r(0, 0, 28, 12, '#6d777c'); q.r(0, 0, 28, 3, '#c9d0d4'); q.r(0, 10, 28, 2, '#4a5257'); q.r(0, 0, 3, 12, '#4a5257');
      q.r(10, 12, 7, 34, '#946a46'); q.r(11, 12, 2, 34, '#c09068'); q.r(10, 40, 7, 6, '#5e3e26');
      break;
    }
    case 'sucker': {
      q.r(2, 0, 4, 10, '#e8e0c4'); q.r(0, 8, 8, 40, '#d0d4d8'); q.r(1, 8, 2, 40, '#eef2f4'); q.r(6, 8, 2, 40, '#8d9297');
      q.r(0, 20, 8, 3, '#2c7a73'); q.r(2, 48, 4, 8, '#ffffff'); q.r(3, 56, 2, 4, '#c9c9c9');
      break;
    }
  }
}

const SIZE: Record<ToolName, [number, number]> = { driver: [9, 47], iron: [15, 49], ironHot: [15, 49], pliers: [16, 43], brush: [18, 36], stripper: [22, 60], spray: [28, 68], oiler: [24, 40], hammer: [28, 46], sucker: [8, 60] };
/** 공구를 그린다. ax, ay는 공구 끝(작업점)이 놓일 화면 좌표, tipX/tipY는 스프라이트 안 끝 위치 */
export function tool(p: Painter, n: ToolName, ax: number, ay: number, tip: [number, number], s = 1) {
  const [w, h] = SIZE[n];
  const img = sprite('prop:' + n, w, h, q => drawTool(q, n));
  blit(p, img, ax - (tip[0] + 1) * s, ay - (tip[1] + 1) * s, s);
}
export const TIP: Record<ToolName, [number, number]> = { driver: [4, 46], iron: [2, 48], ironHot: [2, 48], pliers: [8, 0], brush: [9, 35], stripper: [11, 30], spray: [21, 7], oiler: [12, 0], hammer: [14, 6], sucker: [4, 59] };

void C;
