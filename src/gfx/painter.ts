/** 640×360 도트 캔버스와 고해상도 글자 캔버스를 겹쳐 그린다. */
export const W = 640;
export const H = 360;

export const C = {
  ink: '#16201c', night: '#1d2a25', dark: '#263830', green: '#3f5a4b', moss: '#5e7a5f', sage: '#93a07b',
  cream: '#efe6c8', paper: '#ddd3b0', paper2: '#cbc09a', gold: '#e2b45e', brass: '#c79a45', rust: '#b5623f',
  red: '#d9573f', ok: '#7fbf6a', warn: '#e8b84a', wood: '#7a5537', wood2: '#5b3d27', wood3: '#946a46',
  steel: '#8b969b', steel2: '#5d686d', white: '#f7f3e6', black: '#0d1210', glow: '#ffd27a', blue: '#6a9ab8',
};

export type Align = 'left' | 'center' | 'right';

export class Painter {
  readonly g: CanvasRenderingContext2D;
  readonly t: CanvasRenderingContext2D;
  scale = 1;
  constructor(readonly pix: HTMLCanvasElement, readonly txt: HTMLCanvasElement) {
    pix.width = W; pix.height = H;
    this.g = pix.getContext('2d')!;
    this.t = txt.getContext('2d')!;
    this.g.imageSmoothingEnabled = false;
  }

  resize(cssW: number, cssH: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.scale = cssW / W;
    for (const c of [this.pix, this.txt]) { c.style.width = `${cssW}px`; c.style.height = `${cssH}px`; }
    this.txt.width = Math.round(cssW * dpr);
    this.txt.height = Math.round(cssH * dpr);
    this.t.setTransform(this.txt.width / W, 0, 0, this.txt.height / H, 0, 0);
  }

  begin() {
    this.t.clearRect(0, 0, W, H);
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    this.g.fillStyle = color;
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  /** 이 영역 아래 이미 쓴 글자를 지운다 (위에 덮는 판넬용) */
  clearText(x: number, y: number, w: number, h: number) { this.t.clearRect(x, y, w, h); }

  box(x: number, y: number, w: number, h: number, fill: string, edge = C.ink) {
    this.rect(x, y, w, h, edge);
    this.rect(x + 1, y + 1, w - 2, h - 2, fill);
  }
  /** 도트 판넬: 그림자 + 테두리 + 밝은 윗선 */
  panel(x: number, y: number, w: number, h: number, fill: string, edge = C.ink) {
    this.rect(x + 2, y + 2, w, h, 'rgba(0,0,0,0.35)');
    this.box(x, y, w, h, fill, edge);
    this.rect(x + 1, y + 1, w - 2, 1, 'rgba(255,255,255,0.18)');
    this.clearText(x, y, w + 2, h + 2);
  }
  line(x0: number, y0: number, x1: number, y1: number, color: string, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    this.g.fillStyle = color;
    const o = Math.floor(w / 2);
    for (let i = 0; i < 2000; i++) {
      this.g.fillRect(x0 - o, y0 - o, w, w);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  disc(cx: number, cy: number, r: number, color: string) {
    this.g.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
      this.g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
  }
  ring(cx: number, cy: number, r: number, color: string, w = 1) {
    this.g.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    const steps = Math.max(16, Math.round(r * 7));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      this.g.fillRect(Math.round(cx + Math.cos(a) * r) - Math.floor(w / 2), Math.round(cy + Math.sin(a) * r) - Math.floor(w / 2), w, w);
    }
  }

  text(s: string, x: number, y: number, size = 10, color = C.cream, align: Align = 'left', weight = 500, font = 'body') {
    const t = this.t;
    t.font = `${weight} ${size}px ${font === 'sign' ? '"Black Han Sans", "Noto Sans KR", sans-serif' : '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'}`;
    t.textAlign = align;
    t.textBaseline = 'top';
    t.fillStyle = color;
    t.fillText(s, x, y);
  }
  /** 글자 테두리(외곽선) 있는 글씨: 그림 위에 얹을 때 */
  label(s: string, x: number, y: number, size = 9, color = C.cream, align: Align = 'center', weight = 700) {
    const t = this.t;
    t.font = `${weight} ${size}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;
    t.textAlign = align;
    t.textBaseline = 'top';
    t.lineJoin = 'round';
    t.lineWidth = Math.max(2, size / 3.5);
    t.strokeStyle = 'rgba(10,14,12,0.92)';
    t.strokeText(s, x, y);
    t.fillStyle = color;
    t.fillText(s, x, y);
  }
  measure(s: string, size = 10, weight = 500) {
    this.t.font = `${weight} ${size}px "Noto Sans KR", sans-serif`;
    return this.t.measureText(s).width;
  }
  /** 줄바꿈 글씨. 그린 높이를 돌려준다 */
  wrap(s: string, x: number, y: number, maxW: number, size = 10, color = C.ink, lineH = size * 1.45, weight = 500) {
    const lines: string[] = [];
    let cur = '';
    for (const word of s.split(' ')) {
      const next = cur ? cur + ' ' + word : word;
      if (this.measure(next, size, weight) > maxW && cur) { lines.push(cur); cur = word; } else cur = next;
    }
    if (cur) lines.push(cur);
    lines.forEach((l, i) => this.text(l, x, y + i * lineH, size, color, 'left', weight));
    return lines.length * lineH;
  }

  /** 7-세그먼트 숫자 (계기판) */
  seg(s: string, x: number, y: number, h: number, on: string, off: string) {
    const w = Math.round(h * 0.55), t = Math.max(1, Math.round(h / 9));
    const MAP: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcfgd', '-': 'g', ' ': '', 'L': 'fed', 'o': 'gcde', 'E': 'afged' };
    let cx = x;
    for (const ch of s) {
      if (ch === '.') { this.rect(cx - t - 1, y + h - t, t, t, on); continue; }
      const lit = MAP[ch] ?? '';
      const segs: Record<string, [number, number, number, number]> = {
        a: [t, 0, w - 2 * t, t], b: [w - t, t, t, h / 2 - t], c: [w - t, h / 2, t, h / 2 - t], d: [t, h - t, w - 2 * t, t],
        e: [0, h / 2, t, h / 2 - t], f: [0, t, t, h / 2 - t], g: [t, h / 2 - t / 2, w - 2 * t, t],
      };
      for (const k of 'abcdefg') { const [sx, sy, sw, sh] = segs[k]; this.rect(cx + sx, y + sy, sw, sh, lit.includes(k) ? on : off); }
      cx += w + t + 2;
    }
    return cx - x;
  }
}
