import type { Sim } from '../types';

export function blank(): Sim {
  return { tp: {}, obs: '', heat: {}, ear: {}, blow: [], fx: {} };
}

/** 받침 유무에 따라 조사를 고른다 (이/가, 을/를 등) */
export function josa(word: string, withBatchim: string, without: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return word + without;
  return word + (code % 28 ? withBatchim : without);
}
