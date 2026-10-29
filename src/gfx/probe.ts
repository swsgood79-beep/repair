/**
 * 개발용 글자 겹침 검사: 글자 캔버스에 쓰는 모든 글자의 자리를 기록한다.
 * 주소에 ?probe를 붙이면 켜지고, window.__texts에 이번 프레임 글자 상자가 남는다.
 */
export interface TextBox { s: string; x: number; y: number; w: number; h: number }
type R = { x: number; y: number; w: number; h: number };

export function installProbe(t: CanvasRenderingContext2D, logicalW: number) {
  let boxes: TextBox[] = [];
  let clip: R | null = null;
  const stack: (R | null)[] = [];
  let lastRect: R | null = null;
  const toLogical = (x: number, y: number) => {
    const m = t.getTransform(), k = t.canvas.width / logicalW;
    return [(m.a * x + m.c * y + m.e) / k, (m.b * x + m.d * y + m.f) / k] as const;
  };
  const scaleOf = () => { const m = t.getTransform(); return m.a / (t.canvas.width / logicalW); };
  const inter = (a: R, b: R): R | null => {
    const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
    return x2 > x && y2 > y ? { x, y, w: x2 - x, h: y2 - y } : null;
  };
  const orig = { fillText: t.fillText.bind(t), save: t.save.bind(t), restore: t.restore.bind(t), rect: t.rect.bind(t), clip: t.clip.bind(t), clearRect: t.clearRect.bind(t) };
  t.save = () => { stack.push(clip); orig.save(); };
  t.restore = () => { clip = stack.pop() ?? null; orig.restore(); };
  t.rect = (x: number, y: number, w: number, h: number) => { const [lx, ly] = toLogical(x, y); const k = scaleOf(); lastRect = { x: lx, y: ly, w: w * k, h: h * k }; orig.rect(x, y, w, h); };
  t.clip = ((...a: any[]) => { if (lastRect) clip = clip ? inter(clip, lastRect) ?? { x: 0, y: 0, w: 0, h: 0 } : lastRect; (orig.clip as any)(...a); }) as any;
  t.clearRect = (x: number, y: number, w: number, h: number) => {
    const [lx, ly] = toLogical(x, y); const k = scaleOf();
    const r = { x: lx, y: ly, w: w * k, h: h * k };
    boxes = boxes.filter(b => !inter(b, r));
    orig.clearRect(x, y, w, h);
  };
  t.fillText = (s: string, x: number, y: number, mw?: number) => {
    const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(t.font)?.[1] ?? '10');
    const w = t.measureText(s).width;
    const ax = t.textAlign === 'center' ? x - w / 2 : t.textAlign === 'right' ? x - w : x;
    const [lx, ly] = toLogical(ax, y);
    const k = scaleOf();
    let r: R | null = { x: lx, y: ly + size * k * 0.12, w: w * k, h: size * k * 0.95 };
    if (clip) r = inter(r, clip);
    if (r && s.trim()) boxes.push({ s, ...r });
    orig.fillText(s, x, y, mw as any);
  };
  return {
    begin() { boxes = []; clip = null; stack.length = 0; },
    end() { (window as any).__texts = boxes; },
  };
}

/** 겹치는 글자 쌍 (같은 글자를 1~2픽셀 비켜 쓴 그림자는 뺀다) */
export function overlaps(boxes: TextBox[], min = 3) {
  const out: [TextBox, TextBox, number][] = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.s === b.s && Math.abs(a.x - b.x) < 3 && Math.abs(a.y - b.y) < 3) continue;
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (w > 1 && h > 1 && w * h >= min) out.push([a, b, Math.round(w * h)]);
  }
  return out;
}
