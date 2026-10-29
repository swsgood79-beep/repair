import type { Ctx, ItemDef } from '../types';
import { blank } from './util';

export const STATIONS = [{ at: 0.27, name: '음악' }, { at: 0.66, name: '뉴스' }];
const STUCK = 0.47;

function tuning(f: Set<string>, c: Ctx) {
  const pos = f.has('dial_cord') ? STUCK : c.knobA;
  return { pos, station: STATIONS.find(st => Math.abs(st.at - pos) < 0.05) };
}

export const radio: ItemDef = {
  id: 'radio',
  name: '진공관 라디오',
  minDay: 3,
  fee: [32000, 44000],
  power: { on: '플러그 꽂기', off: '플러그 뽑기' },
  sw: ['끔', '켬'],
  knobA: '튜닝',
  knobB: '볼륨',
  coverLabel: '뒷판',
  chassisLabel: '섀시 밑판',
  cover: [58, 98, 524, 236],
  chassis: [206, 284, 368, 54],
  comps: [
    { id: 'dial', name: '다이얼 실', short: '다이얼', shape: 'dial', x: 200, y: 50, w: 380, h: 36, layer: 0, acts: ['adjust'], feel: 'smooth', hand: 'tune' },
    { id: 'speaker', name: '스피커', short: '스피커', shape: 'speaker', x: 70, y: 112, w: 124, h: 124, layer: 1, ohm: 3, part: 6000, acts: ['replace'] },
    { id: 'xfmr', name: '전원 트랜스', short: '트랜스', shape: 'xfmr', x: 214, y: 108, w: 82, h: 66, layer: 1, ohm: 15, acts: [] },
    { id: 'rect', name: '정류관', short: '정류관', shape: 'tube', x: 310, y: 100, w: 34, h: 72, layer: 1, acts: [] },
    { id: 'fcap', name: '평활 콘덴서', short: '평활C', shape: 'cap', x: 356, y: 110, w: 44, h: 62, layer: 1, ohm: 'cap', part: 3000, acts: ['replace'] },
    { id: 'rftube', name: '변환관', short: '변환관', shape: 'tube', x: 412, y: 100, w: 34, h: 72, layer: 1, acts: [] },
    { id: 'outtube', name: '출력관', short: '출력관', shape: 'tube', x: 458, y: 100, w: 34, h: 72, layer: 1, part: 7000, acts: ['replace'] },
    { id: 'fuse', name: '퓨즈', short: '퓨즈', shape: 'fuse', x: 506, y: 112, w: 64, h: 22, layer: 1, ohm: 0, part: 500, acts: ['replace'] },
    { id: 'otrans', name: '출력 트랜스', short: '출력T', shape: 'xfmr', x: 214, y: 216, w: 72, h: 44, layer: 1, ohm: 250, acts: [] },
    { id: 'pot', name: '볼륨 가변저항', short: '볼륨', shape: 'pot', x: 318, y: 218, w: 46, h: 42, layer: 1, ohm: 500000, part: 4000, acts: ['clean', 'replace'], hand: 'volume' },
    { id: 'board', name: '납땜 러그', short: '납땜 러그', shape: 'board', x: 216, y: 290, w: 352, h: 36, layer: 2, acts: ['solder'] },
  ],
  tps: [
    { id: 't1', label: '퓨즈 뒤', x: 586, y: 150, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't2', label: '트랜스 2차', x: 256, y: 198, layer: 1, kind: 'volt', unit: 'V', expect: 250 },
    { id: 't3', label: '정류 출력', x: 327, y: 198, layer: 1, kind: 'volt', unit: 'V', expect: 290 },
    { id: 't4', label: 'B+', x: 378, y: 198, layer: 1, kind: 'volt', unit: 'V', expect: 250 },
    { id: 't5', label: '검파', x: 429, y: 198, layer: 1, kind: 'sig', unit: 'V', expect: 0.8 },
    { id: 't6', label: '플레이트', x: 475, y: 198, layer: 1, kind: 'sig', unit: 'V', expect: 3 },
  ],
  wires: [
    { pts: [[570, 123], [586, 123], [586, 150]], layer: 1 },
    { pts: [[586, 150], [586, 94], [255, 94], [255, 108]], layer: 1 },
    { pts: [[256, 174], [256, 198], [378, 198]], layer: 1 },
    { pts: [[327, 172], [327, 198]], layer: 1 },
    { pts: [[378, 172], [378, 198]], layer: 1 },
    { pts: [[429, 172], [429, 198], [475, 198]], layer: 1, kind: 's' },
    { pts: [[475, 172], [475, 198], [520, 198], [520, 239], [364, 239]], layer: 1, kind: 's' },
    { pts: [[318, 239], [286, 239]], layer: 1, kind: 's' },
    { pts: [[214, 239], [194, 210]], layer: 1, kind: 's' },
    { pts: [[260, 308], [520, 308]], layer: 2 },
  ],
  flow: [['fuse', 't1', 'xfmr', 't2', 'rect', 't3', 'fcap', 't4'], ['dial', 'rftube', 't5', 'outtube', 't6', 'board'], ['pot', 'otrans', 'speaker']],
  faults: [
    {
      id: 'cap_short', comp: 'fcap', name: '평활 콘덴서 단락', fix: 'replace', minDay: 4, group: 'fcap',
      complaint: '켜자마자 퍽! 그 뒤로 안 켜져요.',
      mark: 'leak', seen: '밑동에 기름이 샜다', ohm: { v: 0.5, cap: 'short' },
      also: { id: 'fuse_blown', chance: 1, complaint: '켜자마자 퍽! 그 뒤로 안 켜져요.' },
      lesson: '퓨즈만 갈면 켜는 순간 또 끊긴다. 콘덴서 저항 0.5Ω.',
    },
    {
      id: 'fuse_blown', comp: 'fuse', name: '퓨즈 끊김', fix: 'replace', minDay: 3,
      complaint: '천둥 친 날부터 안 켜져요.',
      mark: 'soot', seen: '유리 안이 검게 그을렸다', ohm: { v: Infinity },
      lesson: '퓨즈 뒤부터 0V, 진공관 불도 꺼져 있다.',
    },
    {
      id: 'cap_dry', comp: 'fcap', name: '평활 콘덴서 마름', fix: 'replace', minDay: 3, group: 'fcap',
      complaint: '웅— 소리가 커서 방송이 안 들려요.',
      mark: 'bulge', seen: '윗면이 불룩하다', ohm: { v: Infinity, cap: 'weak' },
      lesson: 'B+가 낮고 바늘이 떨린다. 볼륨을 줄여도 웅 소리.',
    },
    {
      id: 'tube_weak', comp: 'outtube', name: '출력관 노화', fix: 'replace', minDay: 3,
      complaint: '소리가 너무 작아요.',
      mark: 'faded', fine: true, seen: '게터 은막이 하얗게 바랬다',
      lesson: '검파는 정상, 플레이트 신호만 약하다.',
    },
    {
      id: 'pot_dirty', comp: 'pot', name: '볼륨 접점 오염', fix: 'clean', minDay: 3,
      complaint: '볼륨 돌리면 드르륵, 중간에서 끊겨요.',
      mark: 'dirty', fine: true, seen: '저항막에 먼지와 때', ohm: { v: 500000, flicker: true },
      lesson: '돌릴 때 긁히고 중간에서 끊긴다. 세척으로 해결.',
    },
    {
      id: 'dial_cord', comp: 'dial', name: '다이얼 실 이탈', fix: 'adjust', minDay: 3,
      complaint: '다이얼을 돌려도 바늘이 안 움직여요.',
      mark: 'offtrack', seen: '실이 풀리에서 빠졌다', feel: 'free',
      lesson: '노브가 헛돌고 잡음만. 실을 다시 건다.',
    },
    {
      id: 'joint_cold', comp: 'board', name: '냉납 (열 간헐)', fix: 'solder', minDay: 5, latent: true,
      complaint: '10분쯤 지나면 소리가 뚝 끊겨요.',
      mark: 'crack', fine: true, seen: '러그 납땜에 둥근 금',
      lesson: '차가울 땐 되고 데워지면 끊긴다. 오래 켜 두거나 흔들어 재현.',
    },
    {
      id: 'speaker_torn', comp: 'speaker', name: '스피커 콘 찢어짐', fix: 'replace', minDay: 4,
      complaint: '크게 틀면 지지직 떨려요.',
      mark: 'torn', seen: '콘 가장자리가 찢어졌다',
      lesson: '큰 소리에서만 떨림. 플레이트 신호는 깨끗하다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const on = c.power && c.sw === 1;
    let fuse = !f.has('fuse_blown');
    if (on && fuse && f.has('cap_short')) { s.blow.push({ id: 'fuse_blown', text: '퍽! 켜는 순간 퓨즈가 번쩍' }); fuse = false; }
    const pri = on && fuse ? 220 : 0;
    const sec = pri ? 250 : 0;
    const rect = sec ? 290 : 0;
    const dry = f.has('cap_dry');
    const bplus = rect ? (dry ? 212 : 250) : 0;
    const { pos, station } = tuning(f, c);
    const det = bplus ? (station ? 0.8 : 0.05) : 0;
    const jointOK = !f.has('joint_cold') || (!c.warm && c.wiggle !== 'board');
    const weak = f.has('tube_weak');
    const plate = bplus && jointOK ? det * (weak ? 0.3 : 1) * 3.75 : 0;
    const dirty = f.has('pot_dirty');
    const dropout = dirty && c.knobB > 0.42 && c.knobB < 0.6;
    const out = dropout ? 0 : (plate / 3) * c.knobB;
    s.tp.t1 = { v: pri }; s.tp.t2 = { v: sec }; s.tp.t3 = { v: rect };
    s.tp.t4 = { v: bplus, shaky: dry && bplus > 0 }; s.tp.t5 = { v: det }; s.tp.t6 = { v: Math.round(plate * 10) / 10 };
    s.obs = !c.power ? '플러그가 뽑혀 있다' : c.sw !== 1 ? '전원 스위치가 꺼져 있다' : !fuse ? '불이 하나도 안 들어온다'
      : !jointOK ? '소리가 뚝 끊겼다' : dry ? '웅— 큰 험 소리' : c.knobB < 0.05 ? '볼륨 0' : dropout ? '이 위치에서 소리가 끊긴다'
      : station ? `${station.name} 방송${weak ? '이 작게' : ''} 들린다${f.has('speaker_torn') && out > 0.35 ? ' · 지지직 떨림' : ''}` : '치익— 잡음뿐';
    if (dirty && c.moved && bplus && jointOK) s.obs += ' · 돌릴 때 드르륵';
    if (sec) {
      s.heat.rect = 2; s.heat.rftube = 1; s.heat.outtube = weak ? 1 : 2; s.heat.xfmr = c.warm ? 1 : 0;
      s.ear.xfmr = dry ? 'loudhum' : 'hum';
      if (dry) s.ear.fcap = 'loudhum';
      if (out > 0) s.ear.speaker = f.has('speaker_torn') && out > 0.35 ? 'buzz' : station ? (weak ? 'muffled' : 'music') : 'static';
      if (dirty) s.ear.pot = 'crackle';
    }
    s.fx.glow = sec ? { rect: 1, rftube: 1, outtube: weak ? 0.35 : 1, dial: 1 } : {};
    s.fx.hum = bplus ? (dry ? 0.85 : 0.04) : 0;
    s.fx.noise = jointOK && bplus && !station && !dropout ? 0.4 * c.knobB : 0;
    s.fx.tone = station ? out : 0;
    s.fx.crackle = dirty && c.moved && bplus ? 0.8 : 0;
    s.fx.buzz = f.has('speaker_torn') && out > 0.35 ? 0.5 : 0;
    s.fx.pointer = pos;
    return s;
  },
  ohm(f, comp) {
    if (comp === 'pot' && f.has('pot_dirty')) return { v: 500000, flicker: true };
    return null;
  },
  inject(f, c, tp) {
    if (tp !== 't5' && tp !== 't6') return { level: 0, why: '신호 단(검파·플레이트)에 대세요' };
    if (!(c.power && c.sw === 1 && !f.has('fuse_blown'))) return { level: 0, why: '진공관에 전원이 없다' };
    if (f.has('joint_cold') && (c.warm || c.wiggle === 'board')) return { level: 0 };
    if (tp === 't5' && c.knobB < 0.05) return { level: 0, why: '볼륨이 0이다' };
    if (tp === 't5' && f.has('pot_dirty') && c.knobB > 0.42 && c.knobB < 0.6) return { level: 0 };
    return { level: tp === 't5' && f.has('tube_weak') ? 0.25 : 1, torn: f.has('speaker_torn') };
  },
};
