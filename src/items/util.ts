import type { Sim } from '../types';

export function blank(): Sim {
  return { tp: {}, obs: [], heat: {}, ear: {}, blow: [], fx: {} };
}

export function volts(v: number, shaky = false) {
  return { value: v <= 0 ? '0V' : `${Math.round(v)}V${shaky ? ' (바늘이 떨린다)' : ''}`, shaky };
}

/** 오래된 가구 같은 나무 몸체 */
export function woodBox(x: number, y: number, w: number, h: number, r = 6) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="wood"/>` +
    `<rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" rx="${Math.max(2, r - 3)}" class="wood-inner"/>`;
}

/** 받침 유무에 따라 조사를 고른다 (이/가, 을/를 등) */
export function josa(word: string, withBatchim: string, without: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return word + without;
  return word + (code % 28 ? withBatchim : without);
}
