/**
 * 도트 그림 도구: 색 섞기, 외곽선 입힌 스프라이트 캐시, 사람 초상.
 * 작은 캔버스에 1배로 그린 뒤 외곽선을 두르고 확대해 붙이면 손으로 찍은 도트처럼 보인다.
 */
import type { Painter } from './painter';

/* ---------- 색 ---------- */
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** 두 색을 k(0~1)만큼 섞는다 */
export function mix(a: string, b: string, k: number) {
  if (!a.startsWith('#') || !b.startsWith('#')) return a;
  const x = rgb(a), y = rgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * k));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
export const lighten = (c: string, k: number) => mix(c, '#ffffff', k);
export const darken = (c: string, k: number) => mix(c, '#000000', k);

/* ---------- 스프라이트 캐시 ---------- */
type Ctx2 = CanvasRenderingContext2D;
const cache = new Map<string, HTMLCanvasElement>();

/** 작은 그리개: 1배 캔버스에 사각형·타원을 찍는다 */
export class Pix {
  constructor(readonly g: Ctx2) {}
  r(x: number, y: number, w: number, h: number, c: string) { this.g.fillStyle = c; this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  p(x: number, y: number, c: string) { this.r(x, y, 1, 1, c); }
  /** 픽셀 타원 */
  oval(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = Math.ceil(-ry); y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      this.r(cx - w, cy + y, w * 2 + 1, 1, c);
    }
  }
}

/**
 * key로 캐시된 스프라이트. draw는 w×h 1배 캔버스에 그린다.
 * outline이 있으면 바깥 테두리를 1픽셀 두른다.
 */
export function sprite(key: string, w: number, h: number, draw: (q: Pix) => void, outline: string | null = '#1a1210') {
  let c = cache.get(key);
  if (c) return c;
  const pad = outline ? 1 : 0;
  const base = document.createElement('canvas');
  base.width = w; base.height = h;
  draw(new Pix(base.getContext('2d')!));
  c = document.createElement('canvas');
  c.width = w + pad * 2; c.height = h + pad * 2;
  const g = c.getContext('2d')!;
  if (outline) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(base, pad + dx, pad + dy);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = outline; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
  }
  g.drawImage(base, pad, pad);
  if (cache.size > 600) cache.clear();
  cache.set(key, c);
  return c;
}

/** 스프라이트를 s배로 붙인다 (x, y는 외곽선 포함 왼쪽 위) */
export function blit(p: Painter, img: HTMLCanvasElement, x: number, y: number, s = 1, flip = false) {
  const g = p.g;
  g.save();
  g.imageSmoothingEnabled = false;
  if (flip) { g.translate(Math.round(x) + img.width * s, Math.round(y)); g.scale(-1, 1); g.drawImage(img, 0, 0, img.width * s, img.height * s); }
  else g.drawImage(img, Math.round(x), Math.round(y), img.width * s, img.height * s);
  g.restore();
}

/**
 * 기존 Painter 그리기 함수를 작은 캔버스로 돌려 외곽선 스프라이트로 만든다.
 * (아이콘처럼 p.rect로 그리는 것들을 그대로 재사용)
 */
export function outlined(p: Painter, key: string, w: number, h: number, draw: (pp: Painter) => void, outline: string | null = '#1a1210') {
  return sprite(key, w, h, q => {
    const fake = Object.create(p) as Painter;
    Object.defineProperty(fake, 'g', { value: q.g });
    Object.defineProperty(fake, 't', { value: { clearRect() {}, fillText() {}, save() {}, restore() {}, set font(_v: string) {}, set fillStyle(_v: string) {}, set textAlign(_v: string) {}, set textBaseline(_v: string) {}, measureText: () => ({ width: 0 }), beginPath() {}, rect() {}, clip() {} } });
    draw(fake);
  }, outline);
}

/* ---------- 사람 ---------- */
export interface Look { hair: string; skin: string; shirt: string; style: number; acc?: string }
export type Mood = 'calm' | 'happy' | 'angry' | 'worried';

const PW = 40, PH = 54;

function drawPerson(q: Pix, k: Look, mood: Mood, blink: boolean) {
  const skin = k.skin, skinD = darken(skin, 0.18), skinL = lighten(skin, 0.18);
  const hair = k.hair, hairD = darken(hair, 0.3), hairL = lighten(hair, 0.22);
  const sh = k.shirt, shD = darken(sh, 0.25), shL = lighten(sh, 0.18);
  const accs = (k.acc ?? '').split(' ');
  const has = (a: string) => accs.includes(a);
  const ink = '#2a1c16';
  // 어깨와 몸통
  q.oval(20, 48, 18, 12, sh);
  q.r(2, 46, 36, 8, sh);
  q.oval(30, 49, 8, 10, shD); q.r(30, 46, 8, 8, shD);
  q.r(6, 40, 8, 2, shL); q.r(4, 42, 3, 3, shL);
  // 목
  q.r(16, 29, 8, 9, skinD); q.r(16, 29, 3, 8, skin);
  // 옷깃
  if (has('apron')) {
    q.r(11, 41, 18, 13, '#f2ece0'); q.r(11, 41, 18, 1, '#d8d0c0'); q.r(12, 36, 2, 6, '#f2ece0'); q.r(26, 36, 2, 6, '#f2ece0'); q.r(18, 46, 4, 3, '#d8d0c0');
  } else if (has('cardigan')) {
    q.r(15, 36, 10, 3, '#efe6cc'); q.r(18, 38, 4, 16, '#efe6cc'); for (let y = 42; y < 54; y += 4) q.p(19, y, darken(sh, 0.45));
  } else if (has('suit')) {
    q.r(16, 36, 8, 18, '#f2ece0'); q.r(19, 38, 2, 12, '#8a2a2a'); q.r(18, 37, 4, 2, '#a83a3a'); q.r(11, 37, 6, 17, darken(sh, 0.1)); q.r(23, 37, 6, 17, darken(sh, 0.35));
  } else if (has('uniform')) {
    q.r(14, 36, 12, 4, shL); q.p(20, 44, '#e2b45e'); q.p(20, 49, '#e2b45e'); q.r(6, 44, 6, 3, '#e2b45e');
  } else {
    q.r(14, 36, 5, 4, lighten(sh, 0.5)); q.r(21, 36, 5, 4, lighten(sh, 0.5)); q.r(19, 38, 2, 16, shD);
  }
  // 귀
  q.r(8, 20, 3, 6, skinD); q.r(29, 20, 3, 6, skinD);
  // 얼굴
  q.oval(20, 19, 10, 12, skin);
  q.r(27, 12, 3, 14, skinD); q.oval(23, 27, 5, 3, skinD); q.oval(19, 27, 4, 2, skin);
  q.r(13, 14, 3, 2, skinL);
  // 머리카락
  const st = k.style;
  if (st === 0) {
    // 짧은 옆머리, 넓은 이마 (어르신)
    q.oval(20, 11, 10, 5, hair); q.r(10, 10, 3, 11, hair); q.r(27, 10, 3, 11, hairD); q.r(13, 9, 14, 2, hair);
    q.r(14, 8, 8, 1, hairL); q.r(17, 13, 6, 1, skin);
  } else if (st === 1) {
    // 뽀글 파마
    for (const [x, y] of [[11, 10], [15, 6], [20, 5], [25, 6], [29, 10], [9, 15], [31, 15], [10, 20], [30, 20]]) { q.oval(x, y, 4, 4, hair); if (x < 20) q.r(x - 2, y - 2, 2, 1, hairL); q.p(x + 2, y + 2, hairD); }
    q.r(12, 10, 16, 3, hair);
  } else if (st === 2) {
    // 긴 머리, 앞머리
    q.oval(20, 11, 11, 7, hair); q.r(8, 10, 5, 30, hair); q.r(27, 10, 5, 30, hairD); q.r(8, 36, 5, 4, hairD);
    q.r(12, 12, 6, 4, hair); q.r(18, 12, 4, 3, hair); q.r(22, 12, 5, 4, hairD);
    q.r(13, 6, 9, 1, hairL); q.r(10, 14, 1, 16, hairL);
  } else {
    // 짧은 스포츠머리
    q.oval(20, 10, 10, 5, hair); q.r(10, 9, 2, 8, hair); q.r(28, 9, 2, 8, hairD); q.r(12, 11, 16, 2, hair);
    q.r(14, 6, 6, 1, hairL);
  }
  if (has('cap')) { q.oval(20, 8, 11, 4, '#b34a3b'); q.r(9, 9, 22, 3, '#b34a3b'); q.r(22, 10, 12, 2, darken('#b34a3b', 0.3)); q.r(15, 5, 4, 1, lighten('#b34a3b', 0.3)); }
  if (has('bun')) { q.oval(20, 4, 5, 4, hair); q.p(18, 2, hairL); }
  // 눈썹과 눈
  const eyeY = 20;
  const brow = (x: number, tilt: number) => { q.r(x - 2, 15 + (tilt > 0 ? 1 : 0), 2, 1, hairD); q.r(x, 15 + (tilt < 0 ? 1 : 0), 2, 1, hairD); };
  if (mood === 'angry') { brow(15, -1); brow(25, 1); q.r(13, 16, 1, 1, hairD); q.r(26, 16, 1, 1, hairD); }
  else if (mood === 'worried') { brow(15, 1); brow(25, -1); }
  else { q.r(13, 15, 4, 1, hairD); q.r(23, 15, 4, 1, hairD); }
  if (blink) { q.r(13, eyeY + 1, 4, 1, ink); q.r(23, eyeY + 1, 4, 1, ink); }
  else if (mood === 'happy') { q.r(13, eyeY, 1, 1, ink); q.r(14, eyeY - 1, 2, 1, ink); q.r(16, eyeY, 1, 1, ink); q.r(23, eyeY, 1, 1, ink); q.r(24, eyeY - 1, 2, 1, ink); q.r(26, eyeY, 1, 1, ink); }
  else {
    q.r(13, eyeY - 1, 4, 3, '#f7f3e6'); q.r(23, eyeY - 1, 4, 3, '#f7f3e6');
    q.r(14, eyeY - 1, 2, 3, ink); q.r(24, eyeY - 1, 2, 3, ink);
    q.p(14, eyeY - 1, '#ffffff'); q.p(24, eyeY - 1, '#ffffff');
  }
  if (has('glasses')) {
    q.r(11, eyeY - 3, 7, 1, '#2a2a2a'); q.r(11, eyeY + 2, 7, 1, '#2a2a2a'); q.r(11, eyeY - 3, 1, 6, '#2a2a2a'); q.r(17, eyeY - 3, 1, 6, '#2a2a2a');
    q.r(22, eyeY - 3, 7, 1, '#2a2a2a'); q.r(22, eyeY + 2, 7, 1, '#2a2a2a'); q.r(22, eyeY - 3, 1, 6, '#2a2a2a'); q.r(28, eyeY - 3, 1, 6, '#2a2a2a');
    q.r(18, eyeY - 2, 4, 1, '#2a2a2a'); q.p(12, eyeY - 2, 'rgba(255,255,255,0.7)'); q.p(23, eyeY - 2, 'rgba(255,255,255,0.7)');
  }
  // 코
  q.r(20, 22, 2, 3, skinD); q.p(19, 24, skinD);
  // 볼
  if (mood === 'happy') { q.r(11, 24, 3, 1, mix(skin, '#e86a6a', 0.3)); q.r(26, 24, 3, 1, mix(skin, '#e86a6a', 0.3)); }
  // 수염
  if (has('mustache')) { q.r(16, 25, 8, 2, hair); q.p(15, 26, hair); q.p(24, 26, hair); q.r(17, 25, 3, 1, hairL); }
  if (has('stubble')) for (let i = 0; i < 10; i++) q.p(14 + ((i * 5) % 12), 28 + ((i * 3) % 3), darken(skin, 0.12));
  // 입
  const mY = has('mustache') ? 28 : 27;
  const lip = '#8a3e2e';
  if (mood === 'happy') { q.r(16, mY - 1, 8, 1, lip); q.r(17, mY, 6, 2, '#5a1e14'); q.r(18, mY, 4, 1, '#f7f3e6'); }
  else if (mood === 'angry') { q.r(17, mY, 6, 1, lip); q.p(16, mY + 1, lip); q.p(23, mY + 1, lip); }
  else if (mood === 'worried') { q.r(18, mY, 4, 1, lip); q.p(17, mY + 1, lip); q.p(22, mY + 1, lip); }
  else { q.r(17, mY, 6, 1, lip); q.p(16, mY - 1, lip); q.p(23, mY - 1, lip); }
}

/** 손님 초상. x, y는 왼쪽 위, s는 배율. 숨쉬기와 눈 깜빡임이 들어간다 */
export function drawPortrait(p: Painter, k: Look & { name?: string }, x: number, y: number, mood: Mood, t: number, s = 3) {
  const seed = (k.name ?? k.shirt).length;
  const blink = (t + seed * 0.37) % 3.6 < 0.13;
  const key = `person:${k.hair}${k.skin}${k.shirt}${k.style}${k.acc ?? ''}:${mood}:${blink ? 1 : 0}`;
  const img = sprite(key, PW, PH, q => drawPerson(q, k, mood, blink));
  const bob = mood === 'angry' ? Math.round(Math.sin(t * 30)) * Math.max(1, s / 2) : Math.round(Math.sin(t * 2.2 + seed)) * Math.max(1, Math.round(s / 3));
  blit(p, img, x, y + bob, s);
  return { w: img.width * s, h: img.height * s };
}

/* ---------- 바닥·벽 무늬 ---------- */
/** 2색 체크 디더 그라데이션 (위 a → 아래 b) */
export function ditherV(p: Painter, x: number, y: number, w: number, h: number, a: string, b: string, steps = 6) {
  const band = h / steps;
  for (let i = 0; i < steps; i++) {
    const c1 = mix(a, b, i / steps), c2 = mix(a, b, (i + 1) / steps);
    const y0 = y + i * band;
    p.rect(x, y0, w, band + 1, c1);
    // 경계 디더
    for (let yy = 0; yy < 2; yy++) for (let xx = (yy % 2); xx < w; xx += 2) p.rect(x + xx, y0 + band - 2 + yy, 1, 1, c2);
  }
}
