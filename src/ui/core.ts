import type { Action, GameState, Mark, Shape, Sound, Feel, ToolId } from '../types';
import type { DayReport, ReturnOutcome } from '../game';
import { C, Painter } from '../gfx/painter';
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
  | { kind: 'accuse'; comp: string; t0?: number; action?: Action; fixed?: number; text?: string; added?: number };

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
  const fill = opts.disabled ? '#3a4440' : opts.kind === 'primary' ? (hover ? '#f0c470' : C.gold) : opts.kind === 'danger' ? C.red : opts.kind === 'on' ? C.gold : opts.kind === 'quiet' ? (hover ? '#33493f' : C.dark) : (hover ? '#e9e0c0' : C.paper);
  const ink = opts.disabled ? '#7d8a84' : opts.kind === 'quiet' ? C.cream : opts.kind === 'danger' ? C.white : C.ink;
  const dy = down ? 1 : 0;
  if (!down) p.rect(x + 1, y + h, w, 2, 'rgba(0,0,0,0.45)');
  p.box(x, y + dy, w, h, fill);
  p.rect(x + 1, y + 1 + dy, w - 2, 1, 'rgba(255,255,255,0.3)');
  p.clearText(x, y, w, h + 2);
  const size = opts.size ?? 11;
  let tx = x + w / 2;
  if (opts.icon) { opts.icon(x + 4, y + (h - 24) / 2 + dy); tx = x + 28 + (w - 28) / 2; }
  if (opts.sub) {
    p.text(label, tx, y + h / 2 - size + 1 + dy, size, ink, 'center', 700);
    p.text(opts.sub, tx, y + h / 2 + 2 + dy, size - 2, ink, 'center', 500);
  } else p.text(label, tx, y + (h - size * 1.3) / 2 + dy, size, ink, 'center', 700);
  region({ id, x, y, w, h, disabled: opts.disabled, click: opts.disabled ? undefined : () => { sfx('click', 0.5); onClick(); } });
}

export function dim(p: Painter) {
  p.rect(0, 0, 640, 360, 'rgba(8,12,10,0.66)');
  p.clearText(0, 0, 640, 360);
  region({ id: 'dim', x: 0, y: 0, w: 640, h: 360 });
}
