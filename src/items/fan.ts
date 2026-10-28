import type { ItemDef } from '../types';
import { blank } from './util';

const SPEED = [0, 0.55, 0.78, 1];

export const fan: ItemDef = {
  id: 'fan',
  name: '선풍기',
  minDay: 1,
  fee: [15000, 21000],
  power: { on: '플러그 꽂기', off: '플러그 뽑기' },
  sw: ['끔', '1', '2', '3'],
  nudge: '날개 밀기',
  coverLabel: '모터 뒷덮개',
  cover: [292, 70, 276, 178],
  comps: [
    { id: 'blade', name: '날개', short: '날개', shape: 'blade', x: 64, y: 58, w: 216, h: 216, layer: 0, acts: [], feel: 'smooth', hand: 'nudge' },
    { id: 'bearing', name: '축 베어링', short: '베어링', shape: 'bearing', x: 304, y: 124, w: 30, h: 44, layer: 1, part: 2500, acts: ['oil', 'replace'], feel: 'smooth' },
    { id: 'motor', name: '모터 코일', short: '모터', shape: 'motor', x: 344, y: 92, w: 112, h: 104, layer: 1, ohm: 120, part: 9000, acts: ['replace'] },
    { id: 'tfuse', name: '온도 퓨즈', short: '온도퓨즈', shape: 'fuse', x: 470, y: 94, w: 72, h: 22, layer: 1, ohm: 0, part: 1500, acts: ['replace'] },
    { id: 'cap', name: '기동 콘덴서', short: '콘덴서', shape: 'cap', x: 474, y: 140, w: 62, h: 40, layer: 1, ohm: 'cap', part: 2500, acts: ['replace'] },
    { id: 'switch', name: '속도 스위치', short: '속도 스위치', shape: 'keys', x: 384, y: 290, w: 128, h: 36, layer: 0, part: 3000, acts: ['clean', 'replace'], feel: 'crisp', hand: 'switch' },
    { id: 'cord', name: '전원 코드', short: '코드', shape: 'cord', x: 150, y: 318, w: 84, h: 20, layer: 0, ohm: 0.3, part: 2000, acts: ['replace'], feel: 'soft' },
    { id: 'plug', name: '플러그', short: '플러그', shape: 'plug', x: 100, y: 312, w: 44, h: 32, layer: 0, acts: [], hand: 'power' },
  ],
  tps: [
    { id: 't1', label: '입력', x: 360, y: 226, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't2', label: '스위치 뒤', x: 420, y: 226, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't3', label: '퓨즈 뒤', x: 552, y: 105, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't4', label: '콘덴서', x: 552, y: 160, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
  ],
  wires: [
    { pts: [[144, 328], [150, 328]], layer: 0 },
    { pts: [[234, 328], [384, 308]], layer: 0 },
    { pts: [[400, 290], [360, 226], [420, 226], [470, 105]], layer: 1 },
    { pts: [[542, 105], [552, 105], [552, 160], [536, 160]], layer: 1 },
    { pts: [[474, 160], [456, 150]], layer: 1 },
    { pts: [[334, 146], [344, 146]], layer: 1, kind: 'm' },
  ],
  flow: [['plug', 'cord', 't1', 'switch', 't2', 'tfuse', 't3', 'motor'], ['t4', 'cap', 'bearing', 'blade']],
  faults: [
    {
      id: 'cap_dead', comp: 'cap', name: '기동 콘덴서 노화', fix: 'replace', minDay: 1,
      complaint: '웅— 소리만 나고 안 돌아요.',
      mark: 'bulge', seen: '끝이 살짝 부풀었다', ohm: { v: Infinity, cap: 'none' },
      lesson: '웅 소리는 나지만 못 돈다. 손으로 밀면 돈다. 켜 두면 퓨즈까지 탄다.',
    },
    {
      id: 'bearing_dry', comp: 'bearing', name: '베어링 기름 마름', fix: 'oil', minDay: 1,
      complaint: '힘없이 돌고 끼익 소리가 나요.',
      mark: 'dryoil', seen: '기름이 말라 굳었다', feel: 'stiff',
      also: { id: 'tfuse_open', chance: 0.5, complaint: '느려지더니 멈췄어요. 탄내도 났어요.' },
      lesson: '느리고 쇳소리. 오래 돌리면 모터가 달아 온도 퓨즈를 끊는다.',
    },
    {
      id: 'tfuse_open', comp: 'tfuse', name: '온도 퓨즈 끊김', fix: 'replace', minDay: 2,
      complaint: '켜도 아무 반응이 없어요.',
      mark: 'burnt', seen: '슬리브가 누렇게 변색', ohm: { v: Infinity },
      lesson: '퓨즈 뒤부터 0V. 원인을 두면 새 퓨즈도 다시 끊어진다.',
    },
    {
      id: 'switch_pos', comp: 'switch', name: '2단 접점 소손', fix: 'replace', minDay: 2,
      complaint: '2단만 안 돌아요.',
      mark: 'soot', seen: '한 칸이 검게 탔다',
      lesson: '2단에서만 스위치 뒤 0V. 탄 접점은 세척으로 안 된다.',
    },
    {
      id: 'winding_open', comp: 'motor', name: '모터 코일 끊김', fix: 'replace', minDay: 3,
      complaint: '완전히 죽었어요. 소리도 없어요.',
      mark: 'snapped', fine: true, seen: '코일 인출선이 끊겼다', ohm: { v: Infinity },
      lesson: '콘덴서까지 220V가 오는데 소리가 없다. 코일 ∞.',
    },
    {
      id: 'cord_loose', comp: 'cord', name: '코드 속 단선', fix: 'replace', minDay: 2,
      complaint: '돌다 꺼지고, 코드 건드리면 돌아요.',
      mark: 'frayed', fine: true, seen: '피복 속 구리선이 꺾였다', ohm: { v: Infinity, flicker: true },
      lesson: '입력부터 0V. 코드를 흔들면 살아난다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const v1 = c.power && cordOK ? 220 : 0;
    const v2 = c.sw > 0 && !(f.has('switch_pos') && c.sw === 2) ? v1 : 0;
    let fuse = !f.has('tfuse_open');
    let v3 = fuse ? v2 : 0;
    let energized = v3 > 0 && !f.has('winding_open');
    const capOK = !f.has('cap_dead');
    const dry = f.has('bearing_dry');
    let spinning = energized && (capOK || c.nudge);
    if (energized && c.warm && fuse && (dry && spinning || !spinning)) {
      s.blow.push({ id: 'tfuse_open', text: spinning ? '점점 느려지더니 뚝! 탄내가 난다' : '웅웅대던 모터가 달아오르더니 뚝!' });
      fuse = false; v3 = 0; energized = false; spinning = false;
    }
    const speed = spinning ? SPEED[c.sw] * (dry ? 0.42 : 1) : 0;
    s.tp.t1 = { v: v1 }; s.tp.t2 = { v: v2 }; s.tp.t3 = { v: v3 }; s.tp.t4 = { v: v3 };
    s.obs = !c.power ? '플러그가 뽑혀 있다' : c.sw === 0 ? '스위치가 꺼져 있다' : !energized ? '아무 반응이 없다'
      : !spinning ? '웅— 소리만, 날개는 멈춤' : dry ? '느리게 돈다, 끼익—' : !capOK ? '밀어 주니 돈다' : '시원하게 돈다';
    if (energized) s.ear.motor = spinning ? 'hum' : 'loudhum';
    if (spinning && dry) s.ear.bearing = 'squeal';
    if (spinning) s.ear.blade = 'whirr';
    if (energized && !spinning) s.heat.motor = c.warm ? 2 : 1;
    if (spinning) s.heat.motor = c.warm ? (dry ? 2 : 1) : 0;
    if (spinning && dry && c.warm) s.heat.bearing = 2;
    s.fx.spin = speed;
    s.fx.hum = energized && !spinning ? 0.7 : 0;
    s.fx.whirr = speed;
    s.fx.buzz = spinning && dry ? 0.35 : 0;
    return s;
  },
  ohm(f, comp, c) {
    if (comp !== 'switch') return null;
    if (c.sw === 0) return { v: Infinity };
    return f.has('switch_pos') && c.sw === 2 ? { v: Infinity } : { v: 0 };
  },
  feel(f, comp) {
    if (comp === 'blade' && f.has('bearing_dry')) return 'stiff';
    return undefined;
  },
};
