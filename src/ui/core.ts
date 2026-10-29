import type { Action, GameState, Mark, Shape, Sound, Feel, ToolId } from '../types';
import type { DayReport, ReturnOutcome } from '../game';
import { C, Painter } from '../gfx/painter';
import { darken, lighten } from '../gfx/art';
import { sfx } from '../audio';

/** 화면 위 눌리는 영역. 나중에 등록한 것이 위에 있다. */
export interface Region {
  id: string;
  x: number; y: number; w: number; h: number;
  click?: () => void;
  down?: (x: number, y: number) => void;
  up?: () => void;
  drag?: (x: number, y: number) => void;
  disabled?: boolean;
}

export type Popup =
  | { kind: 'closeup'; x: number; y: number; shape: Shape; mark: Mark | 'ok'; text: string; t0: number }
  | { kind: 'sound'; x: number; y: number; sound: Sound; t0: number }
  | { kind: 'touch'; x: number; y: number; heat: number; feel?: Feel; t0: number }
  | { kind: 'beep'; x: number; y: number; level: number; torn?: boolean; t0: number };

export interface MeterState {
  mode: 'V' | 'Ω' | 'beat' | 'amp' | 'inject';
  value: number;
  b?: number;
  expect: number;
  unit: string;
  label: string;
  shaky?: boolean;
  cap?: 'kick' | 'weak' | 'none' | 'short';
  flicker?: boolean;
  t0: number;
}

export type Overlay =
  | null
  | { kind: 'shelf' }
  | { kind: 'shop' }
  | { kind: 'book'; page: number; sel?: string }
  | { kind: 'day'; report: DayReport }
  | { kind: 'close' }
  | { kind: 'giveup' }
  | { kind: 'menu' }
  | { kind: 'ask' }
  | { kind: 'accuse'; comp: string; t0?: number; action?: Action; fixed?: number; text?: string; added?: number; ev?: string; verdict?: 'sharp' | 'lucky' };

export type Counter =
  | { kind: 'arrivals'; ids: string[]; i: number }
  | { kind: 'return'; outcome: ReturnOutcome };

export const ui = {
  scene: 'title' as 'title' | 'counter' | 'bench' | 'ending',
  overlay: null as Overlay,
  counter: null as Counter | null,
  tool: 'hand' as ToolId,
  hover: '' as string,
  pressed: '' as string,
  popups: [] as Popup[],
  meter: null as MeterState | null,
  needle: 0,
  toast: null as null | { text: string; bad: boolean; t0: number },
  now: 0,
  mouse: [0, 0] as [number, number],
};

export const holder = { state: null as unknown as GameState };

/** 확대한 작업대를 손가락으로 끌어 옮기기. 작업대가 매 프레임 채운다 */
export const pan = {
  on: false,
  area: { x: 0, y: 0, w: 0, h: 0 },
  move: (_dx: number, _dy: number) => {},
};

let regions: Region[] = [];
export function resetRegions() { regions = []; }
export function region(r: Region) { regions.push(r); return r; }
export function hit(x: number, y: number) {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  }
  return null;
}
export function regionById(id: string) { return regions.find(r => r.id === id) ?? null; }

export function toast(text: string, bad = false) {
  if (!text) return;
  ui.toast = { text, bad, t0: ui.now };
  if (bad) sfx('bad', 0.6);
}

/** 도트 버튼 */
export function button(p: Painter, id: string, x: number, y: number, w: number, h: number, label: string, onClick: () => void, opts: { kind?: 'primary' | 'quiet' | 'danger' | 'on'; disabled?: boolean; size?: number; sub?: string; icon?: (x: number, y: number) => void } = {}) {
  const hover = ui.hover === id && !opts.disabled;
  const down = ui.pressed === id && !opts.disabled;
  const base = opts.disabled ? '#3d4743' : opts.kind === 'primary' || opts.kind === 'on' ? C.gold : opts.kind === 'danger' ? C.red : opts.kind === 'quiet' ? '#2f463c' : C.paper;
  const fill = hover ? lighten(base, 0.12) : base;
  const ink = opts.disabled ? '#7d8a84' : opts.kind === 'quiet' ? C.cream : opts.kind === 'danger' ? C.white : C.ink;
  // 눌리면 2픽셀 내려가고 아래 두께가 사라진다
  const dy = down ? 2 : 0;
  p.round(x + 1, y + 3, w, h - 1, 'rgba(0,0,0,0.4)', 2);
  p.round(x, y + dy, w, h - dy, '#120c08', 2);
  p.rect(x + 1, y + h - 4, w - 2, 3, darken(base, 0.38));
  p.rect(x + 1, y + 1 + dy, w - 2, h - 5 - (down ? 0 : 0) + (down ? 1 : 0), fill);
  p.rect(x + 2, y + 1 + dy, w - 4, 1, lighten(fill, 0.35));
  p.rect(x + 1, y + 2 + dy, 1, h - 7, lighten(fill, 0.18));
  p.rect(x + w - 2, y + 2 + dy, 1, h - 7, darken(fill, 0.12));
  if (opts.kind === 'on' || (opts.kind === 'primary' && !opts.disabled)) { p.rect(x + 3, y + 3 + dy, 2, 1, '#fff6d8'); }
  p.clearText(x, y, w, h + 3);
  const faceH = h - 4;
  const dyT = dy - 1;
  const size = opts.size ?? 11;
  let tx = x + w / 2;
  if (opts.icon) { opts.icon(x + 4, y + (faceH - 24) / 2 + dy); tx = x + 28 + (w - 28) / 2; }
  if (opts.sub) {
    p.text(label, tx, y + faceH / 2 - size + 2 + dyT, size, ink, 'center', 700);
    p.text(opts.sub, tx, y + faceH / 2 + 3 + dyT, size - 2, ink, 'center', 500);
  } else p.text(label, tx, y + (faceH - size * 1.3) / 2 + 1 + dyT, size, ink, 'center', 700);
  region({ id, x, y, w, h, disabled: opts.disabled, click: opts.disabled ? undefined : () => { sfx('click', 0.5); onClick(); } });
}

export function dim(p: Painter) {
  p.rect(0, 0, 640, 360, 'rgba(8,12,10,0.66)');
  p.clearText(0, 0, 640, 360);
  region({ id: 'dim', x: 0, y: 0, w: 640, h: 360 });
}
