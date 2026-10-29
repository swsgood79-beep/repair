import type { ItemDef } from '../types';
import { blank } from './util';

/**
 * 재봉틀: 발판 → 모터 → 벨트 → 메인축 → 바늘대와 가마.
 * 바늘이 움직이는 모양과 땀이 생기는지를 보며 힘이 어디서 새는지 찾는다.
 */
export const sewing: ItemDef = {
  id: 'sewing',
  name: '재봉틀',
  minDay: 12,
  fee: [34000, 46000],
  power: { on: '플러그 꽂기', off: '플러그 뽑기' },
  sw: ['뗌', '밟음'],
  coverLabel: '바늘판·옆덮개',
  cover: [180, 170, 300, 110],
  comps: [
    { id: 'plug', name: '플러그', short: '플러그', shape: 'plug', x: 24, y: 300, w: 44, h: 34, layer: 0, acts: [], hand: 'power' },
    { id: 'cord', name: '전원 코드', short: '코드', shape: 'cord', x: 70, y: 306, w: 60, h: 22, layer: 0, ohm: 0.3, part: 2000, acts: ['replace'], feel: 'soft' },
    { id: 'pedal', name: '발판', short: '발판', shape: 'pedal', x: 30, y: 200, w: 90, h: 60, layer: 0, ohm: 30, part: 6000, acts: ['clean', 'replace'], hand: 'switch' },
    { id: 'bulb', name: '작업등', short: '작업등', shape: 'bulb', x: 400, y: 100, w: 40, h: 54, layer: 0, ohm: 500, part: 1500, acts: ['replace'] },
    { id: 'needle', name: '바늘대', short: '바늘', shape: 'needlebar', x: 440, y: 120, w: 40, h: 110, layer: 0, acts: [] },
    { id: 'motor', name: '모터', short: '모터', shape: 'motor', x: 510, y: 70, w: 64, h: 60, layer: 0, ohm: 80, part: 14000, acts: ['replace'], feel: 'smooth' },
    { id: 'belt', name: '벨트', short: '벨트', shape: 'belt', x: 500, y: 20, w: 100, h: 60, layer: 0, part: 2500, acts: ['replace'], feel: 'tight' },
    { id: 'shaft', name: '메인축', short: '메인축', shape: 'gear', x: 210, y: 180, w: 60, h: 90, layer: 1, acts: ['oil'], feel: 'smooth' },
    { id: 'hook', name: '가마(북집)', short: '가마', shape: 'bobbin', x: 380, y: 200, w: 64, h: 64, layer: 1, acts: ['adjust'], feel: 'smooth' },
  ],
  tps: [
    { id: 't1', label: '입력', x: 150, y: 300, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
    { id: 't2', label: '모터 단자', x: 300, y: 250, layer: 1, kind: 'volt', unit: 'V', expect: 220 },
  ],
  wires: [
    { pts: [[130, 317], [150, 300], [120, 250]], layer: 0 },
    { pts: [[150, 300], [300, 250], [520, 130]], layer: 1 },
    { pts: [[270, 225], [380, 232]], layer: 1, kind: 'm' },
  ],
  flow: [['plug', 'cord', 't1', 'pedal', 't2', 'motor', 'belt', 'shaft', 'needle', 'hook'], ['bulb']],
  faults: [
    {
      id: 'pedal_dirty', comp: 'pedal', name: '발판 탄소판 오염', fix: 'clean', minDay: 12,
      complaint: '밟으면 모터가 툭툭 끊기며 돌아요.',
      mark: 'soot', seen: '탄소판에 검은 가루가 뭉쳤다', ohm: { v: 30, flicker: true },
      lesson: '모터 단자 전압이 낮고 떨린다. 발판 저항이 오락가락. 탄소판을 닦는다.',
    },
    {
      id: 'motor_brush', comp: 'motor', name: '모터 브러시 닳음', fix: 'replace', minDay: 12,
      complaint: '등은 켜지는데 밟아도 안 돌아요.',
      ohm: { v: Infinity },
      lesson: '모터 단자엔 220V가 오는데 조용하다. 모터 저항 ∞.',
    },
    {
      id: 'belt_slack', comp: 'belt', name: '벨트 늘어남', fix: 'replace', minDay: 12,
      complaint: '모터 소리는 나는데 바늘이 힘이 없어요.',
      mark: 'slack', seen: '벨트가 축 늘어졌다', feel: 'slack',
      lesson: '모터는 윙 도는데 바늘이 겨우 움직인다. 벨트에서 사각사각 미끄러진다.',
    },
    {
      id: 'shaft_dry', comp: 'shaft', name: '메인축 기름 마름', fix: 'oil', minDay: 13,
      complaint: '바늘이 무겁고 끼익 소리가 나요.',
      mark: 'dryoil', fine: true, seen: '축에 기름이 말라 갈색 때', feel: 'stiff',
      lesson: '바늘이 무겁게 움직이고 축에서 끼익. 기름 몇 방울.',
    },
    {
      id: 'hook_timing', comp: 'hook', name: '가마 타이밍 어긋남', fix: 'adjust', minDay: 13,
      complaint: '바늘은 움직이는데 박음질이 안 돼요.',
      lesson: '바늘은 잘 오르내리는데 땀이 안 생긴다. 가마가 실을 못 걸어 틱틱. 위치를 맞춘다.',
    },
    {
      id: 'bulb_open', comp: 'bulb', name: '작업등 전구 끊김', fix: 'replace', minDay: 12,
      complaint: '바늘 위 불이 안 들어와요.',
      mark: 'filament', seen: '필라멘트가 끊어졌다', ohm: { v: Infinity },
      lesson: '박음질은 되는데 작업등만 꺼져 있다.',
    },
    {
      id: 'cord_loose', comp: 'cord', name: '코드 속 단선', fix: 'replace', minDay: 12,
      complaint: '코드를 움직이면 섰다 돌았다 해요.',
      mark: 'frayed', fine: true, seen: '피복 속 구리선이 꺾였다', ohm: { v: Infinity, flicker: true },
      lesson: '입력부터 0V. 코드를 흔들면 살아난다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const v1 = c.power && cordOK ? 220 : 0;
    const press = c.sw === 1;
    const dirty = f.has('pedal_dirty') && c.wiggle !== 'pedal';
    const v2 = v1 && press ? (dirty ? 130 : 220) : 0;
    const run = v2 > 0 && !f.has('motor_brush');
    const motorSp = run ? (dirty ? 0.5 : 1) : 0;
    const k = (f.has('belt_slack') ? 0.3 : 1) * (f.has('shaft_dry') ? 0.5 : 1);
    const needle = motorSp * k;
    const stitch = needle > 0 && !f.has('hook_timing');
    const lamp = v1 > 0 && !f.has('bulb_open');
    s.tp.t1 = { v: v1 };
    s.tp.t2 = { v: v2, shaky: dirty && v2 > 0 };
    if (!c.power) s.obs = '플러그가 뽑혀 있다';
    else if (!v1) s.obs = '작업등도 안 켜지고 반응이 없다';
    else if (!press) s.obs = lamp ? '작업등이 켜졌다 · 발판을 밟아 보자' : '작업등이 꺼져 있다 · 발판을 밟아 보자';
    else if (!run) s.obs = '밟아도 모터가 조용하다';
    else {
      const how = dirty ? '모터가 툭툭 끊기며 돈다' : f.has('belt_slack') ? '모터는 윙, 바늘은 겨우 움직인다'
        : f.has('shaft_dry') ? '바늘이 무겁게 끼익거린다' : '드르륵 바늘이 힘차다';
      s.obs = `${how} · ${stitch ? '땀이 고르다' : '땀이 안 생긴다'}`;
      if (!lamp) s.obs += ' · 작업등 꺼짐';
    }
    if (run) {
      s.ear.motor = dirty ? 'drag' : 'whirr';
      s.ear.belt = f.has('belt_slack') ? 'slip' : 'spin';
      s.heat.motor = 1;
      if (dirty) s.ear.pedal = 'crackle';
    }
    if (needle > 0) {
      s.ear.shaft = f.has('shaft_dry') ? 'squeal' : 'spin';
      s.ear.hook = f.has('hook_timing') ? 'catch' : 'tick';
      s.ear.needle = 'tick';
    }
    if (lamp) s.heat.bulb = 2;
    s.fx.glow = { bulb: lamp ? 1 : 0 };
    s.fx.spin = needle;
    s.fx.whirr = motorSp * 0.7;
    s.fx.tick = stitch ? 1 : 0;
    return s;
  },
};
