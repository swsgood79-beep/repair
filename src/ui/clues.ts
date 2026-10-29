import type { Comp, ItemDef, Job } from '../types';
import { josa } from '../items/util';
import { BAD_FEEL, BAD_SOUND, FEEL_WORD, HEAT_WORD, MARK_WORD, SOUND_WORD, ohmBad, ohmText, tpState } from './words';

export type Verdict = 'lead' | 'zone' | 'pass' | 'info';
export type ClueIcon = 'look' | 'tester' | 'ear' | 'hand' | 'shake' | 'amp';

export interface Clue {
  key: string;
  target: string;
  isTp: boolean;
  icon: ClueIcon;
  /** 무엇을 봤나 */
  title: string;
  /** 무슨 뜻인가 */
  means: string;
  verdict: Verdict;
  t: number;
}

/** 조사 기록을 단서 카드로 바꾼다. 해석까지 붙여서 */
export function cluesOf(def: ItemDef, job: Job): Clue[] {
  const out: Clue[] = [];
  for (const [id, f] of Object.entries(job.found)) {
    const comp = def.comps.find(c => c.id === id);
    const tp = def.tps.find(t => t.id === id);
    const t = f.t ?? 0;
    if (tp && f.tp) {
      const st = tpState(tp, f.tp);
      if (tp.kind === 'beat') out.push({ key: id + ':tp', target: id, isTp: true, icon: 'ear', t, title: st === 3 ? '박자 없음' : st === 2 ? '똑…딱 박자가 절뚝' : '똑딱 박자 고름', means: st === 2 ? '탈진기 쪽이 어긋났다' : st === 3 ? '시계가 멈춰 있다' : '박자는 정상', verdict: st === 1 ? 'info' : 'zone' });
      else if (tp.kind === 'amp' && tp.unit !== '°') out.push({ key: id + ':tp', target: id, isTp: true, icon: 'amp', t, title: f.tp.v === 0 ? `${tp.label} 0 · 멈춤` : `${tp.label} ${f.tp.v}${tp.unit}`, means: f.tp.v === 0 ? '돌지 않는다' : st === 2 ? '느리다 → 힘을 전하는 쪽 어딘가' : '속도 정상', verdict: st === 2 ? 'zone' : 'info' });
      else if (tp.kind === 'amp') out.push({ key: id + ':tp', target: id, isTp: true, icon: 'amp', t, title: `진폭 ${f.tp.v}°`, means: f.tp.v === 0 ? '진자가 멈춰 있다' : f.tp.v < 7 ? '흔들림이 좁다 → 어딘가 뻑뻑' : '흔들림 정상', verdict: f.tp.v && f.tp.v < 7 ? 'zone' : 'info' });
      else {
        const val = `${tp.label} ${f.tp.v}${tp.unit}`;
        out.push({
          key: id + ':tp', target: id, isTp: true, icon: 'tester', t,
          title: st === 1 ? `${val} 정상` : st === 2 ? `${val} ${f.tp.shaky ? '떨림' : '낮음'}` : `${tp.label} 0${tp.unit}!`,
          means: st === 1 ? '여기까지는 잘 온다 → 앞쪽 통과' : st === 2 ? '앞쪽 어딘가가 약하다' : '앞쪽 어딘가에서 끊겼다',
          verdict: st === 1 ? 'pass' : 'zone',
        });
      }
    }
    if (!comp) continue;
    const name = comp.short;
    for (const kind of ['look', 'loupe'] as const) {
      const m = f[kind];
      if (!m) continue;
      out.push({ key: `${id}:${kind}`, target: id, isTp: false, icon: 'look', t, title: m === 'ok' ? `${name}: 겉은 멀쩡` : `${name}: ${MARK_WORD[m]}!`, means: m === 'ok' ? (kind === 'look' ? '돋보기로는 다를 수도' : '흠은 없다') : '눈에 보이는 흠', verdict: m === 'ok' ? 'info' : 'lead' });
    }
    if (f.ohm) {
      const bad = ohmBad(f.ohm, comp.ohm);
      out.push({ key: id + ':ohm', target: id, isTp: false, icon: 'tester', t, title: `${name} 저항 ${ohmText(f.ohm)}`, means: bad ? (f.ohm.v === Infinity && !f.ohm.cap ? '속이 끊겼다' : '정상값과 다르다') : '부품 자체는 멀쩡', verdict: bad ? 'lead' : 'pass' });
    }
    if (f.ear) {
      const local = ['squeal', 'crackle', 'buzz', 'catch', 'slip'].includes(f.ear);
      const bad = BAD_SOUND.has(f.ear) || f.ear === 'loudhum';
      out.push({ key: id + ':ear', target: id, isTp: false, icon: 'ear', t, title: `${name}: ${SOUND_WORD[f.ear]}`, means: local ? '이상한 소리가 바로 여기서 난다' : bad ? '증상이 들린다. 원인은 이 근처일 수도' : '소리는 이상 없다', verdict: local ? 'lead' : bad ? 'zone' : 'info' });
    }
    if (f.feel || f.heat !== undefined) {
      const bad = !!f.feel && BAD_FEEL.has(f.feel);
      const words = [f.heat !== undefined ? HEAT_WORD[f.heat] : '', f.feel ? FEEL_WORD[f.feel] : ''].filter(Boolean).join(', ');
      out.push({ key: id + ':hand', target: id, isTp: false, icon: 'hand', t, title: `${name}: ${words}`, means: bad ? '손맛이 이상하다' : f.heat === 2 ? '뜨겁다. 무리하고 있다?' : '손맛은 정상', verdict: bad ? 'lead' : f.heat === 2 ? 'zone' : 'info' });
    }
    if (f.shake !== undefined) out.push({ key: id + ':shake', target: id, isTp: false, icon: 'shake', t, title: f.shake ? `${josa(name, '을', '를')} 흔들자 증상이 변했다!` : `${name}: 흔들어도 그대로`, means: f.shake ? '접촉 불량이 여기 있다' : '흔들림과는 상관없다', verdict: f.shake ? 'lead' : 'info' });
  }
  return out.sort((a, b) => a.t - b.t);
}

export type Status = 'lead' | 'zone' | 'pass' | 'none';

/** 용의자(고칠 수 있는 부품)의 상태: 단서와 흐름 순서로 판정 */
export function statusOf(def: ItemDef, job: Job, clues: Clue[]): Record<string, Status> {
  const st: Record<string, Status> = {};
  for (const c of def.comps) st[c.id] = 'none';
  // 흐름 순서: 정상 측정점 앞은 통과, 끊긴 측정점 앞 구간은 의심
  def.flow.forEach((row, ri) => {
    let lastGood = ri === 0 ? -1 : -2;
    row.forEach((id, i) => {
      const tp = def.tps.find(x => x.id === id);
      if (!tp || tp.kind === 'beat' || tp.kind === 'amp') return;
      const s = tpState(tp, job.found[id]?.tp);
      if (s === 1) { for (let k = 0; k < i; k++) if (st[row[k]] === 'none' || st[row[k]] === 'zone') st[row[k]] = 'pass'; lastGood = i; }
      else if (s >= 2 && lastGood >= -1) {
        for (let k = lastGood + 1; k < i; k++) if (st[row[k]] === 'none') st[row[k]] = 'zone';
        lastGood = -3;
      }
    });
  });
  for (const c of clues) {
    if (c.isTp) continue;
    if (c.verdict === 'lead') st[c.target] = 'lead';
    else if (c.verdict === 'pass' && st[c.target] !== 'lead') st[c.target] = 'pass';
    else if (c.verdict === 'zone' && st[c.target] === 'none') st[c.target] = 'zone';
  }
  // 시계: 박자·진폭 단서는 무브먼트 쪽을 의심 구간으로
  for (const c of clues) if (c.isTp && c.verdict === 'zone' && (c.icon === 'ear' || c.icon === 'amp')) {
    for (const id of c.icon === 'ear' ? ['escape'] : ['train']) if (st[id] === 'none') st[id] = 'zone';
  }
  return st;
}

export function suspects(def: ItemDef): Comp[] {
  return def.comps.filter(c => c.acts.length || c.part);
}
