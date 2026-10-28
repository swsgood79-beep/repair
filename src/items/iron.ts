import type { ItemDef } from '../types';
import { blank } from './util';

export const iron: ItemDef = {
  id: 'iron',
  name: '전기다리미',
  minDay: 7,
  fee: [22000, 30000],
  power: { on: '플러그 꽂기', off: '플러그 뽑기' },
  knobA: '온도',
  coverLabel: '윗덮개',
  cover: [150, 70, 380, 160],
  comps: [
    { id: 'plug', name: '플러그', short: '플러그', shape: 'plug', x: 24, y: 300, w: 44, h: 34, layer: 0, acts: [], hand: 'power' },
    { id: 'cord', name: '전원 코드', short: '코드', shape: 'cord', x: 70, y: 306, w: 62, h: 22, layer: 0, ohm: 0.3, part: 2000, acts: ['replace'], feel: 'soft' },
    { id: 'neon', name: '표시등', short: '표시등', shape: 'neon', x: 470, y: 40, w: 34, h: 26, layer: 0, part: 800, acts: ['replace'] },
    { id: 'thermo', name: '바이메탈 온도조절기', short: '온도조절기', shape: 'thermo', x: 230, y: 92, w: 90, h: 56, layer: 1, ohm: 0, part: 3000, acts: ['clean', 'adjust'], feel: 'firm' },
    { id: 'tfuse', name: '온도 퓨즈', short: '온도퓨즈', shape: 'fuse', x: 380, y: 100, w: 70, h: 22, layer: 1, ohm: 0, part: 1500, acts: ['replace'] },
    { id: 'element', name: '열선', short: '열선', shape: 'element', x: 170, y: 176, w: 330, h: 40, layer: 1, ohm: 40, part: 6000, acts: ['replace'] },
    { id: 'sole', name: '바닥판', short: '바닥판', shape: 'sole', x: 120, y: 246, w: 420, h: 42, layer: 0, acts: ['clean'], feel: 'smooth' },
  ],
  tps: [
    { id: 't1', label: '입력', x: 180, y: 150, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't2', label: '조절기 뒤', x: 345, y: 160, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't3', label: '열선 단자', x: 480, y: 160, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
  ],
  wires: [
    { pts: [[132, 317], [150, 300], [150, 150], [180, 150], [230, 120]], layer: 1 },
    { pts: [[320, 120], [345, 160], [380, 111]], layer: 1 },
    { pts: [[450, 111], [480, 160], [500, 196]], layer: 1 },
    { pts: [[345, 160], [487, 66]], layer: 1 },
  ],
  flow: [['plug', 'cord', 't1', 'thermo', 't2', 'tfuse', 't3', 'element', 'sole'], ['neon']],
  faults: [
    {
      id: 'element_open', comp: 'element', name: '열선 끊김', fix: 'replace', minDay: 7,
      complaint: '불은 들어오는데 안 뜨거워요.',
      mark: 'snapped', fine: true, seen: '열선 한쪽이 끊어졌다', ohm: { v: Infinity },
      lesson: '표시등은 켜지는데 차갑다. 열선 저항 ∞.',
    },
    {
      id: 'thermo_dirty', comp: 'thermo', name: '조절기 접점 산화', fix: 'clean', minDay: 7,
      complaint: '불도 안 들어오고 안 뜨거워요.',
      mark: 'soot', seen: '접점이 까맣게 그을렸다', ohm: { v: Infinity, flicker: true },
      lesson: '입력은 220V인데 조절기 뒤 0V. 접점을 닦으면 산다.',
    },
    {
      id: 'thermo_stuck', comp: 'thermo', name: '조절기 접점 붙음', fix: 'adjust', minDay: 8, latent: true,
      complaint: '너무 뜨거워져서 옷을 태웠어요.',
      mark: 'burnt', fine: true, seen: '접점이 녹아 붙었다', feel: 'tight',
      also: { id: 'tfuse_open', chance: 0.4, complaint: '연기가 나더니 아예 안 켜져요.' },
      lesson: '온도 다이얼을 낮춰도 계속 달아오른다. 지켜보면 온도 퓨즈까지 끊는다.',
    },
    {
      id: 'tfuse_open', comp: 'tfuse', name: '온도 퓨즈 끊김', fix: 'replace', minDay: 7,
      complaint: '갑자기 아예 안 켜져요.',
      mark: 'burnt', seen: '슬리브가 누렇게 변색', ohm: { v: Infinity },
      lesson: '조절기 뒤 220V, 열선 단자 0V. 과열 원인을 함께 봐야 한다.',
    },
    {
      id: 'neon_dead', comp: 'neon', name: '표시등 수명', fix: 'replace', minDay: 7,
      complaint: '켜졌는지 불이 안 들어와요.',
      mark: 'faded', seen: '네온관이 까맣게 됐다',
      lesson: '데워지기는 하는데 표시등만 꺼져 있다.',
    },
    {
      id: 'sole_dirty', comp: 'sole', name: '바닥판 눌어붙음', fix: 'clean', minDay: 8, latent: true,
      complaint: '다릴 때 옷에 뭔가 묻어나요.',
      mark: 'burnt', seen: '바닥에 탄 찌꺼기', feel: 'sticky',
      lesson: '전기는 멀쩡하다. 바닥판을 닦아야 한다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const v1 = c.power && cordOK ? 220 : 0;
    const dial = c.knobA > 0.08;
    const closed = f.has('thermo_stuck') || (dial && (!f.has('thermo_dirty') || c.wiggle === 'thermo'));
    const v2 = closed ? v1 : 0;
    let fuse = !f.has('tfuse_open');
    if (v2 && c.warm && fuse && f.has('thermo_stuck')) { s.blow.push({ id: 'tfuse_open', text: '연기가 피어오르더니 뚝! 온도 퓨즈가 끊어졌다' }); fuse = false; }
    const v3 = fuse ? v2 : 0;
    const heating = v3 > 0 && !f.has('element_open');
    const lamp = v2 > 0 && !f.has('neon_dead');
    s.tp.t1 = { v: v1 }; s.tp.t2 = { v: v2 }; s.tp.t3 = { v: v3 };
    s.obs = !c.power ? '플러그가 뽑혀 있다' : !dial ? '온도 다이얼이 꺼짐에 있다' : !v1 ? '아무 반응이 없다'
      : heating ? (c.warm && f.has('thermo_stuck') ? '연기! 바닥이 지나치게 뜨겁다' : lamp ? '표시등이 켜지고 바닥이 데워진다' : '데워지는데 표시등이 꺼져 있다')
      : lamp ? '표시등은 켜지는데 차갑다' : '불도 안 켜지고 차갑다';
    if (heating && c.warm && f.has('sole_dirty')) s.obs += ' · 탄내가 난다';
    const plate = heating ? (c.warm ? 2 : 1) : 0;
    s.heat.sole = plate; s.heat.element = plate; s.heat.thermo = heating && c.warm ? 1 : 0;
    if (heating && c.warm) s.ear.thermo = f.has('thermo_stuck') ? 'quiet' : 'click';
    s.fx.glow = { neon: lamp ? 1 : 0, element: heating ? (c.warm ? 1 : 0.5) : 0 };
    return s;
  },
  feel(f, comp) {
    if (comp === 'thermo' && f.has('thermo_stuck')) return 'tight';
    return undefined;
  },
};
// 코드 단선은 스탠드·선풍기와 같은 고장을 쓴다
iron.faults.push({
  id: 'cord_loose', comp: 'cord', name: '코드 속 단선', fix: 'replace', minDay: 7,
  complaint: '코드를 움직이면 꺼졌다 켜졌다 해요.',
  mark: 'frayed', fine: true, seen: '피복 속 구리선이 꺾였다', ohm: { v: Infinity, flicker: true },
  lesson: '입력부터 0V. 코드를 흔들면 살아난다.',
});
