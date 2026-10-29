import type { Feel, Finding, Mark, Ohm, Sound, Reading, TestPoint } from '../types';

export const MARK_WORD: Record<Mark, string> = {
  filament: '필라멘트 끊김', rust: '녹', soot: '그을음', bulge: '부풂', leak: '기름 샘', crack: '금', dryoil: '기름 마름', burnt: '변색',
  slack: '헐거움', snapped: '끊어짐', torn: '찢어짐', glazed: '번들거림', powder: '흰 가루', kink: '꺾임', bent: '휨', pin: '핀 빠짐',
  dirty: '때', faded: '바램', frayed: '속선 꺾임', offtrack: '실 빠짐', gummy: '굳은 기름',
};
export const SOUND_WORD: Record<Sound, string> = {
  hum: '웅웅', loudhum: '웅—!! 큼', squeal: '끼익!', crackle: '지지직', buzz: '지직 떨림', whirr: '윙—', spin: '윙 고르게', music: '♪ 음악',
  muffled: '♪ 먹먹', static: '치익—', tick: '똑딱', limp: '똑…딱 절뚝', catch: '틱! 걸림', drag: '끄는 소리', slip: '사각사각', quiet: '조용',
  dialtone: '뚜— 신호음', ring: '따르르릉', click: '딸깍딸깍',
  boil: '보글보글', wow: '울렁울렁', whine: '삐— 가는 고음',
};
export const BAD_SOUND = new Set<Sound>(['loudhum', 'squeal', 'crackle', 'buzz', 'muffled', 'limp', 'catch', 'drag', 'slip', 'wow']);
export const FEEL_WORD: Record<Feel, string> = {
  smooth: '부드럽게 돈다', stiff: '뻑뻑!', sticky: '끈적!', catch: '턱 걸림!', free: '헛돈다!', loose: '헐겁다!', soft: '말랑',
  hard: '돌처럼 딱딱!', firm: '단단', slack: '축 처짐!', mushy: '물렁!', crisp: '딸깍', tight: '팽팽',
};
export const BAD_FEEL = new Set<Feel>(['stiff', 'sticky', 'catch', 'free', 'loose', 'hard', 'slack', 'mushy']);
export const HEAT_WORD = ['차갑다', '미지근', '뜨겁다!'];

export function ohmText(o: Ohm) {
  if (o.cap === 'kick') return '튀었다 돌아옴';
  if (o.cap === 'weak') return '조금 튀다 맒';
  if (o.cap === 'none') return '안 움직임';
  if (o.cap === 'short') return '0.5Ω 붙음';
  const v = o.v === Infinity ? '∞' : o.v >= 1000 ? `${Math.round(o.v / 1000)}kΩ` : `${o.v}Ω`;
  return o.flicker ? `${v} 오락가락` : v;
}

/** 저항 측정값이 정상값과 다른가 */
export function ohmBad(o: Ohm, expect: number | 'cap' | undefined) {
  if (o.flicker) return true;
  if (o.cap) return o.cap !== 'kick';
  if (expect === undefined || expect === 'cap') return false;
  if (o.v === Infinity) return true;
  return Math.abs(o.v - expect) > Math.max(1, expect * 0.3);
}

/** 측정점 값 상태: 0 측정 안 함, 1 정상, 2 낮음·떨림, 3 없음 */
export function tpState(tp: TestPoint, r: Reading | undefined) {
  if (!r) return 0;
  if (tp.kind === 'beat') return r.v === 0 ? 3 : Math.abs((r.b ?? 0) - r.v) > 0.05 ? 2 : 1;
  const ratio = r.v / tp.expect;
  if (ratio < 0.15) return 3;
  if (ratio < 0.9 || r.shaky) return 2;
  return 1;
}

export function tpText(tp: TestPoint, r: Reading) {
  if (tp.kind === 'beat') return r.v === 0 ? '소리 없음' : `${r.v.toFixed(2)} / ${(r.b ?? 0).toFixed(2)}초`;
  return `${r.v}${tp.unit}${r.shaky ? ' 떨림' : ''}`;
}

/** 부품 조사 결과 중 이상한 것이 있는가: 0 조사 안 함, 1 이상 없음, 2 이상 있음 */
export function findingState(f: Finding | undefined, expect: number | 'cap' | undefined) {
  if (!f) return 0;
  const bad = (f.look && f.look !== 'ok') || (f.loupe && f.loupe !== 'ok') || (f.ohm && ohmBad(f.ohm, expect))
    || (f.feel && BAD_FEEL.has(f.feel)) || (f.ear && BAD_SOUND.has(f.ear));
  return bad ? 2 : 1;
}
