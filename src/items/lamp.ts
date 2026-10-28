import type { ItemDef } from '../types';
import { blank } from './util';

export const lamp: ItemDef = {
  id: 'lamp',
  name: '탁상 스탠드',
  minDay: 1,
  fee: [9000, 13000],
  power: { on: '플러그 꽂기', off: '플러그 뽑기' },
  sw: ['끔', '켬'],
  coverLabel: '밑판',
  cover: [132, 262, 376, 86],
  comps: [
    { id: 'plug', name: '플러그', short: '플러그', shape: 'plug', x: 24, y: 300, w: 44, h: 34, layer: 0, acts: [], hand: 'power' },
    { id: 'cord', name: '전원 코드', short: '코드', shape: 'cord', x: 70, y: 306, w: 62, h: 22, layer: 0, ohm: 0.3, feel: 'soft', part: 2000, acts: ['replace'] },
    { id: 'joint', name: '납땜 연결부', short: '납땜', shape: 'joint', x: 196, y: 286, w: 52, h: 34, layer: 1, acts: ['solder'] },
    { id: 'switch', name: '똑딱 스위치', short: '스위치', shape: 'switch', x: 430, y: 270, w: 60, h: 28, layer: 0, feel: 'crisp', part: 3000, acts: ['clean', 'replace'], hand: 'switch' },
    { id: 'socket', name: '전구 소켓', short: '소켓', shape: 'socket', x: 290, y: 150, w: 60, h: 40, layer: 0, part: 2500, acts: ['clean', 'replace'] },
    { id: 'bulb', name: '백열전구', short: '전구', shape: 'bulb', x: 292, y: 72, w: 56, h: 76, layer: 0, ohm: 60, part: 1500, acts: ['replace'] },
  ],
  tps: [
    { id: 't1', label: '입력 단자', x: 170, y: 330, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't2', label: '스위치 뒤', x: 420, y: 330, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't3', label: '소켓 단자', x: 366, y: 190, layer: 0, kind: 'volt', unit: 'V', expect: 220 },
  ],
  wires: [
    { pts: [[68, 317], [72, 317]], layer: 0 },
    { pts: [[132, 317], [170, 330], [196, 305]], layer: 1 },
    { pts: [[248, 305], [300, 330], [420, 330], [440, 300]], layer: 1 },
    { pts: [[460, 298], [460, 312], [330, 312], [320, 262]], layer: 1 },
    { pts: [[320, 262], [320, 190]], layer: 0 },
    { pts: [[336, 190], [366, 190]], layer: 0 },
  ],
  flow: [['plug', 'cord', 't1', 'joint', 'switch', 't2', 't3', 'socket', 'bulb']],
  faults: [
    {
      id: 'bulb_open', comp: 'bulb', name: '전구 필라멘트 끊김', fix: 'replace', minDay: 1,
      complaint: '오늘 아침부터 안 켜져요.',
      mark: 'filament', seen: '필라멘트가 끊어졌다', ohm: { v: Infinity },
      lesson: '전구 저항 ∞. 소켓 단자까지는 220V가 온다.',
    },
    {
      id: 'cord_loose', comp: 'cord', name: '코드 속 단선', fix: 'replace', minDay: 1,
      complaint: '코드를 만지면 켜졌다 꺼졌다 해요.',
      mark: 'frayed', fine: true, seen: '피복 속 구리선이 꺾였다', ohm: { v: Infinity, flicker: true },
      lesson: '입력 단자부터 0V. 코드를 흔들면 살아났다 죽는다.',
    },
    {
      id: 'switch_dirty', comp: 'switch', name: '스위치 접점 산화', fix: 'clean', minDay: 2,
      complaint: '불이 약하고 지지직 깜박여요.',
      mark: 'soot', seen: '틈으로 검은 그을음', ohm: { v: 18, flicker: true }, feel: 'mushy',
      lesson: '스위치 뒤 전압이 낮고 바늘이 떨린다. 세척하면 산다.',
    },
    {
      id: 'socket_rust', comp: 'socket', name: '소켓 접점 부식', fix: 'clean', minDay: 2,
      complaint: '새 전구를 끼워도 안 켜져요.',
      mark: 'rust', seen: '바닥 접점에 푸른 녹',
      lesson: '소켓 단자 220V, 전구도 정상인데 안 켜진다.',
    },
    {
      id: 'joint_cold', comp: 'joint', name: '냉납', fix: 'solder', minDay: 3, latent: true,
      complaint: '툭 치면 꺼져요. 가만두면 켜지고요.',
      mark: 'crack', fine: true, seen: '납땜 둘레에 가는 금',
      lesson: '가만두면 정상. 흔들 때만 끊긴다. 돋보기로 금이 보인다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const v1 = c.power && cordOK ? 220 : 0;
    const jointOK = !(f.has('joint_cold') && c.wiggle === 'joint');
    const vj = jointOK ? v1 : 0;
    const dirty = f.has('switch_dirty') && c.wiggle !== 'switch';
    const v2 = c.sw === 1 ? (dirty ? vj * 0.55 : vj) : 0;
    const lit = v2 > 0 && !f.has('socket_rust') && !f.has('bulb_open');
    const bright = lit ? v2 / 220 : 0;
    s.tp.t1 = { v: v1 };
    s.tp.t2 = { v: v2, shaky: dirty && v2 > 0 };
    s.tp.t3 = { v: v2, shaky: dirty && v2 > 0 };
    s.obs = !c.power ? '플러그가 뽑혀 있다' : c.sw !== 1 ? '스위치가 꺼져 있다' : !lit ? '전구가 안 켜진다' : bright < 0.9 ? '희미하게 깜박인다' : '환하게 켜진다';
    if (lit) s.heat.bulb = 2;
    if (dirty && v2 > 0) { s.ear.switch = 'crackle'; if (c.warm) s.heat.switch = 1; }
    s.fx.glow = { bulb: bright };
    s.fx.buzz = dirty && v2 > 0 ? 0.2 : 0;
    return s;
  },
  ohm(f, comp, c) {
    if (comp === 'switch') {
      if (c.sw !== 1) return { v: Infinity };
      return f.has('switch_dirty') ? { v: 18, flicker: true } : { v: 0 };
    }
    return null;
  },
};
