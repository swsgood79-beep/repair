import type { ItemDef } from '../types';
import { blank } from './util';

/**
 * 전기밥솥: 취사 레버를 누르면 감온 자석이 레버를 붙잡고, 밥이 다 되면
 * 자석이 힘을 잃어 딸깍 보온으로 넘어간다. 지켜봐야 드러나는 고장이 많다.
 */
export const ricecooker: ItemDef = {
  id: 'ricecooker',
  name: '전기밥솥',
  minDay: 10,
  fee: [26000, 36000],
  power: { on: '플러그 꽂기', off: '플러그 뽑기' },
  sw: ['보온', '취사'],
  coverLabel: '밑판',
  cover: [150, 250, 340, 100],
  comps: [
    { id: 'plug', name: '플러그', short: '플러그', shape: 'plug', x: 24, y: 300, w: 44, h: 34, layer: 0, acts: [], hand: 'power' },
    { id: 'cord', name: '전원 코드', short: '코드', shape: 'cord', x: 70, y: 306, w: 70, h: 22, layer: 0, ohm: 0.3, part: 2000, acts: ['replace'], feel: 'soft' },
    { id: 'pan', name: '내솥', short: '내솥', shape: 'pan', x: 210, y: 60, w: 220, h: 120, layer: 0, part: 8000, acts: ['replace'], feel: 'smooth' },
    { id: 'lever', name: '취사 레버', short: '레버', shape: 'switch', x: 300, y: 200, w: 40, h: 40, layer: 0, acts: [], hand: 'switch' },
    { id: 'lampCook', name: '취사등', short: '취사등', shape: 'neon', x: 252, y: 206, w: 26, h: 26, layer: 0, acts: [] },
    { id: 'lampWarm', name: '보온등', short: '보온등', shape: 'neon', x: 362, y: 206, w: 26, h: 26, layer: 0, acts: [] },
    { id: 'tfuse', name: '온도 퓨즈', short: '온도퓨즈', shape: 'fuse', x: 170, y: 268, w: 64, h: 20, layer: 1, ohm: 0, part: 1500, acts: ['replace'] },
    { id: 'magnet', name: '감온 자석', short: '감온자석', shape: 'thermo', x: 286, y: 262, w: 70, h: 44, layer: 1, part: 3500, acts: ['clean', 'replace'], feel: 'firm' },
    { id: 'element', name: '열판', short: '열판', shape: 'element', x: 180, y: 316, w: 270, h: 26, layer: 1, ohm: 50, part: 7000, acts: ['replace'] },
    { id: 'warmer', name: '보온 히터', short: '보온히터', shape: 'element', x: 384, y: 268, w: 90, h: 22, layer: 1, ohm: 600, part: 3000, acts: ['replace'] },
  ],
  tps: [
    { id: 't1', label: '입력', x: 160, y: 300, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't2', label: '열판 단자', x: 470, y: 330, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't3', label: '보온 단자', x: 480, y: 270, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
  ],
  wires: [
    { pts: [[140, 317], [160, 300], [170, 278]], layer: 1 },
    { pts: [[234, 278], [286, 284]], layer: 1 },
    { pts: [[356, 284], [470, 330], [450, 329]], layer: 1 },
    { pts: [[356, 284], [384, 279]], layer: 1 },
    { pts: [[474, 279], [480, 270]], layer: 1 },
  ],
  flow: [['plug', 'cord', 't1', 'tfuse', 'lever', 'magnet', 't2', 'element', 'pan'], ['lampCook', 'lampWarm'], ['t3', 'warmer']],
  faults: [
    {
      id: 'element_open', comp: 'element', name: '열판 끊김', fix: 'replace', minDay: 10,
      complaint: '취사 불은 들어오는데 밥이 안 돼요.',
      mark: 'snapped', fine: true, seen: '열선 한 곳이 끊어졌다', ohm: { v: Infinity },
      lesson: '취사등은 켜지는데 차갑다. 열판 단자엔 220V, 열판 저항 ∞.',
    },
    {
      id: 'tfuse_open', comp: 'tfuse', name: '온도 퓨즈 끊김', fix: 'replace', minDay: 10,
      complaint: '불이 하나도 안 들어와요.',
      mark: 'burnt', seen: '슬리브가 누렇게 변색', ohm: { v: Infinity },
      lesson: '입력 220V인데 등이 모두 꺼져 있다. 온도 퓨즈 ∞.',
    },
    {
      id: 'warmer_open', comp: 'warmer', name: '보온 히터 끊김', fix: 'replace', minDay: 10,
      complaint: '밥은 되는데 금방 식어요.',
      mark: 'snapped', fine: true, seen: '보온선이 끊어졌다', ohm: { v: Infinity },
      lesson: '보온등은 켜지는데 미지근해지지 않는다. 보온 단자 220V, 히터 ∞.',
    },
    {
      id: 'sensor_dirty', comp: 'magnet', name: '감온부 이물질', fix: 'clean', minDay: 11,
      complaint: '취사를 눌러도 레버가 바로 올라와요.',
      mark: 'dirty', seen: '자석 면에 밥풀이 눌어붙었다',
      lesson: '레버가 걸리지 않는다. 자석과 내솥 사이 밥풀 때문. 닦는다.',
    },
    {
      id: 'magnet_weak', comp: 'magnet', name: '감온 자석 약해짐', fix: 'replace', minDay: 11, latent: true,
      complaint: '밥이 늘 설익어요.',
      feel: 'loose',
      lesson: '처음엔 멀쩡하다. 지켜보면 너무 일찍 보온으로 넘어간다. 레버 잡는 힘이 약하다.',
    },
    {
      id: 'pan_bent', comp: 'pan', name: '내솥 바닥 찌그러짐', fix: 'replace', minDay: 12, latent: true,
      complaint: '밥이 가운데만 눌고 가장자리는 설익어요.',
      mark: 'bent', seen: '바닥이 움푹 찌그러졌다', feel: 'catch',
      lesson: '열판에 바닥이 고르게 안 닿는다. 지켜보면 밥이 얼룩지게 된다.',
    },
    {
      id: 'cord_loose', comp: 'cord', name: '코드 속 단선', fix: 'replace', minDay: 10,
      complaint: '코드를 움직이면 꺼졌다 켜졌다 해요.',
      mark: 'frayed', fine: true, seen: '피복 속 구리선이 꺾였다', ohm: { v: Infinity, flicker: true },
      lesson: '입력부터 0V. 코드를 흔들면 살아난다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const v1 = c.power && cordOK ? 220 : 0;
    const vf = f.has('tfuse_open') ? 0 : v1;
    const held = c.sw === 1 && !f.has('sensor_dirty');
    const heatOK = !f.has('element_open');
    // 지켜보면 밥이 다 되어 보온으로 넘어간다 (열판이 데워야 넘어간다)
    const done = held && c.warm && heatOK && vf > 0;
    const cooking = vf > 0 && held && !done;
    const keeping = vf > 0 && !cooking;
    const warmerOK = !f.has('warmer_open');
    s.tp.t1 = { v: v1 };
    s.tp.t2 = { v: cooking ? vf : 0 };
    s.tp.t3 = { v: keeping ? vf : 0 };
    if (!c.power) s.obs = '플러그가 뽑혀 있다';
    else if (!vf) s.obs = '등이 하나도 안 켜진다';
    else if (c.sw === 1 && f.has('sensor_dirty')) s.obs = '취사 레버가 걸리지 않고 툭 올라온다';
    else if (cooking) s.obs = heatOK ? '취사등이 켜지고 보글보글 끓는다' : '취사등은 켜지는데 솥이 차갑다';
    else if (done) s.obs = f.has('magnet_weak') ? '딸깍! 금방 보온으로 넘어갔다 · 쌀이 설익었다'
      : f.has('pan_bent') ? '딸깍! 보온 · 가운데는 눌고 가장자리는 설익었다' : '딸깍! 보온으로 넘어갔다 · 밥이 잘 됐다';
    else s.obs = warmerOK ? '보온등이 켜지고 솥이 따뜻하다' : '보온등은 켜지는데 솥이 식어 있다';
    if (done && !warmerOK) s.obs += ' · 금방 식는다';
    const plate = cooking && heatOK ? 2 : keeping && warmerOK ? 1 : 0;
    s.heat.pan = plate; s.heat.element = cooking && heatOK ? 2 : 0; s.heat.warmer = keeping && warmerOK ? 1 : 0;
    if (cooking && heatOK) s.ear.pan = 'boil';
    if (done) s.ear.magnet = 'click';
    s.fx.glow = { lampCook: cooking ? 1 : 0, lampWarm: keeping ? 1 : 0, element: cooking && heatOK ? 1 : 0, warmer: keeping && warmerOK ? 0.5 : 0 };
    s.fx.noise = cooking && heatOK ? 0.12 : 0;
    return s;
  },
};
