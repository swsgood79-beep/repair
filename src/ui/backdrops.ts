/**
 * 배경 그림: 제목 화면의 골목, 가게 안, 카운터, 머리띠.
 * 움직이지 않는 부분은 한 번 그려 캐시하고, 불빛·시계 같은 움직임만 매 프레임 그린다.
 */
import { C, Painter } from '../gfx/painter';
import { blit, darken, ditherV, lighten, mix, outlined, sprite } from '../gfx/art';
import { drawItemIcon } from '../gfx/parts';

const cached = (p: Painter, key: string, draw: (pp: Painter) => void, w = 640, h = 360) => blit(p, outlined(p, key, w, h, draw, null), 0, 0);

/** 벽돌 벽 */
function bricks(p: Painter, x: number, y: number, w: number, h: number, base: string) {
  p.rect(x, y, w, h, darken(base, 0.25));
  for (let row = 0; row * 6 < h; row++) {
    const off = row % 2 ? 6 : 0;
    for (let bx = -off; bx < w; bx += 12) {
      const k = (row * 13 + bx * 7) % 11;
      const c = k < 3 ? darken(base, 0.08) : k > 8 ? lighten(base, 0.06) : base;
      const x0 = Math.max(x, x + bx), x1 = Math.min(x + w, x + bx + 11);
      if (x1 > x0) p.rect(x0, y + row * 6, x1 - x0, Math.min(5, h - row * 6), c);
    }
  }
}

/** 나무 판자 (세로) */
function planks(p: Painter, x: number, y: number, w: number, h: number, base: string, pw = 16) {
  for (let i = 0; i * pw < w; i++) {
    const c = i % 3 === 0 ? darken(base, 0.06) : i % 3 === 1 ? base : lighten(base, 0.04);
    const ww = Math.min(pw, w - i * pw);
    p.rect(x + i * pw, y, ww, h, c);
    p.rect(x + i * pw, y, 1, h, darken(base, 0.3));
    for (let g = 0; g < h / 14; g++) { const k = (i * 37 + g * 11) % 9; p.rect(x + i * pw + 3 + k % 8, y + g * 14 + k, 1, 6, darken(base, 0.14)); }
  }
}

/** 불빛 원: 겹친 반투명 원 */
function glow(p: Painter, x: number, y: number, r: number, color: string, a: number) {
  const g = p.g;
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color.replace('A', String(a)));
  grad.addColorStop(1, color.replace('A', '0'));
  g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2);
}

/* ---------- 제목: 해 질 녘 골목 ---------- */
export function titleBackdrop(p: Painter, t: number, closed = false) {
  cached(p, 'bg:title', q => {
    ditherV(q, 0, 0, 640, 250, '#141a33', '#d9805a', 9);
    for (let i = 0; i < 46; i++) { const k = (i * 7919) % 100003; q.rect(k % 640, (k / 640 | 0) % 110, 1, 1, i % 5 ? '#c9d6e8' : '#fff4c4'); }
    q.disc(540, 52, 14, '#f4ecc8'); q.disc(546, 48, 12, mix('#141a33', '#d9805a', 0.2));
    // 먼 건물 그림자
    const far = '#2a2a44';
    for (const [x, w, h] of [[0, 70, 120], [64, 50, 150], [110, 60, 100], [470, 60, 140], [528, 46, 170], [570, 70, 120]] as const) {
      q.rect(x, 250 - h, w, h, far); q.rect(x, 250 - h, w, 2, lighten(far, 0.1));
      for (let wy = 250 - h + 10; wy < 240; wy += 16) for (let wx = x + 6; wx < x + w - 8; wx += 12) if (((wx * 7 + wy * 3) % 5) < 2) q.rect(wx, wy, 5, 6, '#f2c96a');
    }
    // 전깃줄
    for (let i = 0; i < 640; i++) { q.rect(i, 70 + Math.round(Math.pow((i - 320) / 320, 2) * 26), 1, 1, '#14141f'); q.rect(i, 84 + Math.round(Math.pow((i - 300) / 340, 2) * 20), 1, 1, '#14141f'); }
    // 땅
    q.rect(0, 296, 640, 64, '#3b3a40');
    for (let y = 300; y < 360; y += 8) for (let x = (y / 8) % 2 ? 0 : 10; x < 640; x += 20) q.rect(x, y, 19, 7, y % 16 ? '#43424a' : '#3f3e46');
    q.rect(0, 292, 640, 6, '#6d6a6e'); q.rect(0, 292, 640, 1, '#8a878a');
    // 가게 건물
    bricks(q, 150, 60, 340, 236, '#8a5a42');
    q.rect(146, 56, 348, 6, '#4a3226'); q.rect(146, 56, 348, 1, '#7a5a44');
    // 간판 자리
    q.rect(170, 74, 300, 64, '#1c120b'); q.rect(172, 76, 296, 60, '#2c7a73'); q.rect(174, 78, 292, 2, '#4fa69c'); q.rect(174, 132, 292, 2, '#1f5953');
    // 차양
    for (let x = 160; x < 480; x += 20) {
      const c = (x / 20) % 2 ? '#e8e0c4' : '#c0392b';
      q.rect(x, 152, 20, 22, c); q.rect(x, 152, 20, 2, lighten(c, 0.2));
      q.disc(x + 10, 174, 10, c);
    }
    q.rect(156, 148, 328, 5, '#5a3a28');
    // 진열창
    q.rect(176, 192, 160, 100, '#1c120b'); q.rect(180, 196, 152, 92, '#f5d790');
    q.rect(180, 196, 152, 92, 'rgba(255,190,90,0.35)');
    q.rect(180, 262, 152, 26, '#6b4529'); q.rect(180, 262, 152, 2, '#8a5a36');
    q.rect(255, 196, 3, 92, '#1c120b');
    // 문
    q.rect(356, 188, 110, 108, '#1c120b'); q.rect(360, 192, 50, 104, '#6b4529'); q.rect(412, 192, 50, 104, '#5e3c23');
    q.rect(366, 200, 38, 40, '#f5d790'); q.rect(418, 200, 38, 40, '#f5d790');
    q.rect(366, 200, 38, 40, 'rgba(255,190,90,0.3)'); q.rect(418, 200, 38, 40, 'rgba(255,190,90,0.3)');
    q.rect(404, 250, 3, 12, C.brass); q.rect(415, 250, 3, 12, C.brass);
    // 화분
    q.rect(478, 270, 18, 22, '#a0522d'); q.rect(476, 268, 22, 4, '#b8663a');
    for (let i = 0; i < 7; i++) q.disc(480 + (i * 5) % 16, 258 - (i * 7) % 16, 5, i % 2 ? '#4f8a50' : '#3d7040');
    // 가로등 기둥
    q.rect(86, 120, 6, 176, '#2a2a30'); q.rect(84, 288, 10, 6, '#2a2a30'); q.rect(78, 112, 22, 8, '#2a2a30'); q.rect(80, 120, 18, 4, '#f6e2a0');
  });
  // 움직이는 불빛
  glow(p, 89, 126, 90, 'rgba(255,210,130,A)', 0.28 + Math.sin(t * 3) * 0.02);
  glow(p, 256, 240, 120, 'rgba(255,200,110,A)', 0.18);
  // 진열창 속 물건
  drawItemIcon(p, 'radio', 190, 228, 1); drawItemIcon(p, 'clock', 222, 222, 1); drawItemIcon(p, 'tv', 268, 228, 1); drawItemIcon(p, 'fan', 300, 230, 1);
  // 간판 전구
  for (let i = 0; i < 25; i++) {
    const on = ((i + Math.floor(t * 4)) % 5) !== 0;
    for (const yy of [72, 138]) { p.rect(172 + i * 12, yy, 3, 3, on ? '#ffe7a0' : '#7a6a3a'); if (on) p.rect(171 + i * 12, yy - 1, 5, 5, 'rgba(255,230,150,0.25)'); }
  }
  // 문 위 '영업중' 팻말
  if (closed) { drawCat(p, 520, 276, t); return; }
  const sw = Math.sin(t * 1.6) * 1.5;
  p.line(398, 188, 390 + sw, 172, '#2a2a2a'); p.line(424, 188, 432 + sw, 172, '#2a2a2a');
  p.round(386 + sw, 172, 50, 16, '#1c120b', 1); p.rect(387 + sw, 173, 48, 14, '#e8e0c4');
  p.text('영업중', 411 + sw, 174, 9, '#c0392b', 'center', 700);
  // 고양이
  drawCat(p, 520, 276, t);
}

function drawCat(p: Painter, x: number, y: number, t: number) {
  const blink = t % 4 < 0.15;
  const img = sprite('cat:' + (blink ? 1 : 0), 22, 18, q => {
    const f = '#2b2522', l = '#4a403a';
    q.oval(12, 12, 8, 5, f); q.oval(6, 7, 5, 5, f);
    q.r(2, 1, 2, 3, f); q.r(8, 1, 2, 3, f); q.p(3, 2, '#c97a7a'); q.p(9, 2, '#c97a7a');
    q.r(13, 9, 5, 1, l);
    if (blink) { q.r(4, 7, 2, 1, '#e8c860'); q.r(8, 7, 2, 1, '#e8c860'); } else { q.r(4, 6, 2, 2, '#e8c860'); q.r(8, 6, 2, 2, '#e8c860'); q.p(5, 6, '#111'); q.p(9, 6, '#111'); }
  });
  blit(p, img, x, y, 1);
  const a = Math.sin(t * 2) * 0.6;
  for (let i = 0; i < 8; i++) p.rect(x + 20 + i, y + 12 - Math.round(Math.sin(a + i * 0.4) * i * 0.6), 2, 2, '#2b2522');
}

/* ---------- 가게 안 ---------- */
export function shopBackdrop(p: Painter, t: number, lv: number, unlocked: string[], day: number) {
  cached(p, 'bg:shop' + lv, q => {
    // 벽지: 녹색 마름모 무늬
    const wall = lv >= 4 ? '#5b7462' : '#56695a';
    q.rect(0, 20, 640, 230, wall);
    for (let y = 26; y < 200; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < 640; x += 14) { q.rect(x + 6, y, 2, 2, lighten(wall, 0.1)); q.rect(x + 5, y + 1, 1, 1, darken(wall, 0.08)); }
    // 굽도리 나무판
    planks(q, 0, 196, 640, 54, '#6b4529', 20);
    q.rect(0, 194, 640, 4, '#3d2717'); q.rect(0, 193, 640, 1, '#8a5a36');
    // 창문 (바깥 골목)
    q.rect(426, 26, 188, 128, '#2b1a0e');
    ditherV(q, 432, 32, 176, 116, '#7fb0c8', '#f2d6a0', 5);
    for (const [x, w, h] of [[432, 40, 60], [470, 30, 80], [500, 50, 50], [548, 30, 70], [576, 32, 56]] as const) {
      q.rect(x, 148 - h, w, h, '#8a7a6a'); q.rect(x, 148 - h, w, 2, '#a0907e');
      for (let wy = 148 - h + 6; wy < 140; wy += 10) for (let wx = x + 4; wx < x + w - 4; wx += 8) q.rect(wx, wy, 4, 5, '#5a6a78');
    }
    q.rect(518, 26, 4, 128, '#2b1a0e'); q.rect(426, 88, 188, 4, '#2b1a0e');
    q.rect(434, 34, 2, 52, 'rgba(255,255,255,0.45)'); q.rect(524, 34, 2, 52, 'rgba(255,255,255,0.45)');
    q.rect(420, 152, 200, 6, '#6b4529'); q.rect(420, 152, 200, 1, '#946a46');
    // 선반
    const shelves = lv >= 2 ? [44, 98, 152] : [60, 120];
    for (const sy of shelves) {
      q.rect(26, sy + 34, 340, 6, '#946a46'); q.rect(26, sy + 34, 340, 1, '#b8885a'); q.rect(26, sy + 40, 340, 2, '#3d2717');
      for (const bx of [40, 340]) { q.rect(bx, sy + 42, 4, 8, '#3d2717'); q.rect(bx - 2, sy + 42, 8, 2, '#3d2717'); }
      q.rect(26, sy + 42, 340, 3, 'rgba(0,0,0,0.18)');
    }
    // 修理 세로 간판
    q.rect(380, 168, 44, 64, '#2b1a0e'); q.rect(382, 170, 40, 60, '#e8e0c4'); q.rect(382, 170, 40, 2, '#fff8e0');
    // 달력
    q.rect(560, 166, 46, 56, '#2b1a0e'); q.rect(562, 168, 42, 52, '#f4efe2'); q.rect(562, 168, 42, 12, '#c0392b');
    for (let r = 0; r < 4; r++) for (let c2 = 0; c2 < 6; c2++) q.rect(565 + c2 * 6, 198 + r * 5, 3, 2, '#b8b0a0');
    if (lv >= 3) { q.rect(374, 36, 46, 70, '#2b1a0e'); q.rect(376, 38, 42, 66, '#e8e0c4'); }
    if (lv >= 4) { q.rect(442, 158, 0, 0, '#000'); }
  });
  // 진열된 물건 (그림자 + 외곽선)
  const shelves = lv >= 2 ? [44, 98, 152] : [60, 120];
  shelves.forEach((sy, k) => {
    for (let i = 0; i < 7; i++) {
      const id = unlocked[(i + k * 3) % unlocked.length];
      p.rect(42 + i * 46, sy + 32, 32, 2, 'rgba(0,0,0,0.25)');
      drawItemIcon(p, id, 40 + i * 46, sy + 2, 1);
      if ((i + k) % 3 === 0) { p.rect(48 + i * 46, sy + 36, 12, 6, '#f4efe2'); p.rect(48 + i * 46, sy + 36, 1, 6, C.red); }
    }
  });
  p.text('修', 402, 174, 18, '#2b1a0e', 'center', 400, 'sign');
  p.text('理', 402, 200, 18, '#2b1a0e', 'center', 400, 'sign');
  p.text(String(day), 583, 182, 18, '#2b1a0e', 'center', 400, 'sign');
  if (lv >= 3) { p.text('2층', 397, 44, 12, '#2b1a0e', 'center', 400, 'sign'); p.text('공방', 397, 62, 12, '#2b1a0e', 'center', 400, 'sign'); p.text('↑', 397, 82, 12, '#2b1a0e', 'center', 700); }
  if (lv >= 4) { p.panel(444, 112, 152, 30, '#1a1a1a', C.gold); p.text('본점', 520, 117, 16, Math.sin(t * 4) > -0.6 ? '#ff7a8a' : '#7a3a4a', 'center', 400, 'sign'); }
  else p.text('한결전파사', 520, 46, 12, 'rgba(60,40,20,0.3)', 'center', 400, 'sign');
  // 벽시계 (움직이는 바늘)
  const cx = 470, cy = 196;
  p.disc(cx, cy, 17, '#2b1a0e'); p.disc(cx, cy, 15, '#6b4529'); p.disc(cx, cy, 12, '#f4efe2');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.rect(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, 1, 1, '#2b1a0e'); }
  const am = t * 0.5, ah = t * 0.04;
  p.line(cx, cy, cx + Math.cos(am - 1.57) * 9, cy + Math.sin(am - 1.57) * 9, '#2b1a0e');
  p.line(cx, cy, cx + Math.cos(ah) * 6, cy + Math.sin(ah) * 6, '#2b1a0e', 2);
  // 매달린 전등과 불빛
  p.rect(250, 20, 1, 34, '#1a1a1a');
  p.round(232, 52, 38, 12, '#2c4a44', 2); p.rect(236, 52, 30, 2, '#3f6a62');
  p.rect(244, 64, 14, 4, '#fff1b8');
  glow(p, 251, 70, 210, 'rgba(255,214,140,A)', 0.22 + Math.sin(t * 7) * 0.005);
}

/** 카운터 상판과 앞판 (손님 앞에 그린다) */
export function counterFront(p: Painter) {
  cached(p, 'bg:counter', q => {
    q.rect(0, 262, 640, 98, '#5b3d27');
    planks(q, 0, 266, 640, 94, '#5b3d27', 40);
    q.rect(0, 262, 640, 6, '#2b1a0e');
    q.rect(0, 248, 640, 14, '#8a5a36'); q.rect(0, 248, 640, 2, '#b8885a'); q.rect(0, 258, 640, 4, '#6b4529');
    for (let i = 0; i < 30; i++) { const k = (i * 97) % 640; q.rect(k, 252 + (i % 3) * 2, 18, 1, '#7a4e2e'); }
    // 금전등록기
    q.rect(560, 214, 70, 36, '#2b1a0e'); q.rect(562, 216, 66, 32, '#b8a070'); q.rect(562, 216, 66, 2, '#d8c090');
    q.rect(568, 200, 40, 16, '#2b1a0e'); q.rect(570, 202, 36, 12, '#1c2418');
    for (let r = 0; r < 2; r++) for (let c2 = 0; c2 < 5; c2++) q.rect(567 + c2 * 12, 224 + r * 10, 9, 6, '#efe6cc');
  }, 640, 360);
}

/* ---------- 머리띠 ---------- */
export function hudBar(p: Painter) {
  cached(p, 'bg:hud', q => {
    q.rect(0, 0, 640, 20, '#4a2f1f');
    for (let i = 0; i < 40; i++) { const k = (i * 131) % 640; q.rect(k, 3 + (i % 4) * 4, 14 + (i % 3) * 6, 1, '#40281a'); }
    q.rect(0, 0, 640, 1, '#7a5238'); q.rect(0, 19, 640, 1, '#1c120b'); q.rect(0, 18, 640, 1, '#2e1d12');
  }, 640, 20);
}

/** 놋쇠 명판 (머리띠 값 칸) */
export function plate(p: Painter, x: number, y: number, w: number, h: number) {
  p.round(x, y, w, h, '#1c120b', 1);
  p.rect(x + 1, y + 1, w - 2, h - 2, '#2a1a10');
  p.rect(x + 1, y + h - 2, w - 2, 1, '#5a3a24');
}

/** 머리띠 작은 그림 (9×9) */
export function hudIcon(p: Painter, kind: 'day' | 'time' | 'coin' | 'debt' | 'heart', x: number, y: number, on = true) {
  const img = sprite('hud:' + kind + (on ? 1 : 0), 9, 9, q => {
    switch (kind) {
      case 'day': q.r(0, 1, 9, 8, '#f4efe2'); q.r(0, 1, 9, 3, '#c0392b'); q.r(2, 0, 1, 2, '#555'); q.r(6, 0, 1, 2, '#555'); q.r(2, 5, 5, 1, '#888'); q.r(2, 7, 3, 1, '#888'); break;
      case 'time': q.oval(4, 4, 4, 4, '#f4efe2'); q.r(4, 1, 1, 4, '#2b1a0e'); q.r(4, 4, 3, 1, '#2b1a0e'); break;
      case 'coin': q.oval(4, 4, 4, 4, '#e2b45e'); q.oval(4, 4, 2, 2, '#c79a45'); q.p(2, 2, '#fff1b8'); break;
      case 'debt': q.r(1, 0, 7, 9, '#efe6c8'); q.r(2, 2, 5, 1, '#c0392b'); q.r(2, 4, 5, 1, '#8a8478'); q.r(2, 6, 3, 1, '#8a8478'); break;
      case 'heart': { const c = on ? '#e85a5a' : '#5a3a30'; q.r(1, 1, 3, 3, c); q.r(5, 1, 3, 3, c); q.r(0, 2, 9, 3, c); q.r(1, 5, 7, 1, c); q.r(2, 6, 5, 1, c); q.r(3, 7, 3, 1, c); q.p(4, 8, c); if (on) q.p(2, 2, '#ffb0a0'); break; }
    }
  });
  blit(p, img, x - 1, y - 1);
}

/** 작업대 아래 나무 띠 */
export function woodStrip(p: Painter, y: number, h: number) {
  blit(p, outlined(p, 'bg:strip' + y + 'x' + h, 640, h, q => {
    planks(q, 0, 0, 640, h, '#4a3324', 40);
    q.rect(0, 0, 640, 2, '#7a5238'); q.rect(0, 2, 640, 1, '#2b1a0e');
  }, null), 0, y);
}

/** 작업 매트 (초록 고무판, 눈금) */
export function benchMat(p: Painter, x: number, y: number, w: number, h: number) {
  blit(p, outlined(p, `bg:mat${w}x${h}`, w, h, q => {
    q.rect(0, 0, w, h, '#22453a');
    for (let i = 0; i < w; i += 10) q.rect(i, 0, 1, h, i % 50 ? '#28503f' : '#316050');
    for (let j = 0; j < h; j += 10) q.rect(0, j, w, 1, j % 50 ? '#28503f' : '#316050');
    for (let i = 0; i < w; i += 5) q.rect(i, 0, 1, i % 50 ? (i % 10 ? 2 : 4) : 7, '#c9d8b8');
    for (let j = 0; j < h; j += 5) q.rect(0, j, j % 50 ? (j % 10 ? 2 : 4) : 7, 1, '#c9d8b8');
    for (let k = 0; k < 6; k++) q.rect(w * 0.15 + k * 61 % (w * 0.7), h * 0.2 + (k * 37) % (h * 0.6), 9, 1, 'rgba(255,255,255,0.05)');
  }, null), x, y);
}
