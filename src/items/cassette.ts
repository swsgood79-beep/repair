import type { ItemDef } from '../types';
import { blank } from './util';

export const cassette: ItemDef = {
  id: 'cassette',
  name: '휴대용 카세트',
  minDay: 5,
  fee: [18000, 26000],
  power: { on: '건전지 넣기', off: '건전지 빼기' },
  sw: ['정지', '재생'],
  knobB: '볼륨',
  nudge: '모터 톡',
  coverLabel: '하판',
  cover: [100, 176, 462, 108],
  comps: [
    { id: 'keys', name: '조작 키', short: '조작 키', shape: 'keys', x: 118, y: 72, w: 176, h: 28, layer: 0, acts: [], feel: 'crisp', hand: 'switch' },
    { id: 'head', name: '재생 헤드', short: '헤드', shape: 'head', x: 296, y: 120, w: 64, h: 30, layer: 0, acts: ['clean'] },
    { id: 'roller', name: '핀치 롤러', short: '롤러', shape: 'roller', x: 382, y: 116, w: 36, h: 36, layer: 0, part: 1500, acts: ['clean', 'replace'], feel: 'soft' },
    { id: 'speaker', name: '스피커', short: '스피커', shape: 'speaker', x: 458, y: 72, w: 84, h: 84, layer: 0, acts: [], hand: 'volume' },
    { id: 'battery', name: '건전지함', short: '건전지', shape: 'battery', x: 112, y: 292, w: 150, h: 42, layer: 0, acts: ['clean'], hand: 'power' },
    { id: 'amp', name: '앰프 기판', short: '앰프', shape: 'board', x: 128, y: 186, w: 116, h: 62, layer: 1, acts: [] },
    { id: 'motor', name: '직류 모터', short: '모터', shape: 'motor', x: 300, y: 196, w: 58, h: 58, layer: 1, ohm: 12, part: 4000, acts: ['replace'], hand: 'nudge' },
    { id: 'belt', name: '고무 벨트', short: '벨트', shape: 'belt', x: 372, y: 190, w: 116, h: 74, layer: 1, part: 800, acts: ['replace'], feel: 'tight' },
  ],
  tps: [
    { id: 't1', label: '전원 입력', x: 262, y: 200, layer: 1, kind: 'volt', unit: 'V', expect: 6 },
    { id: 't2', label: '모터 단자', x: 330, y: 270, layer: 1, kind: 'volt', unit: 'V', expect: 6 },
    { id: 't3', label: '헤드 출력', x: 290, y: 186, layer: 1, kind: 'sig', unit: 'mV', expect: 2 },
    { id: 't4', label: '앰프 출력', x: 258, y: 238, layer: 1, kind: 'sig', unit: 'V', expect: 0.5 },
  ],
  wires: [
    { pts: [[186, 292], [186, 280], [262, 200], [244, 200]], layer: 1 },
    { pts: [[262, 200], [262, 270], [330, 270], [330, 254]], layer: 1 },
    { pts: [[328, 150], [290, 186], [244, 210]], layer: 1, kind: 's' },
    { pts: [[244, 238], [258, 238], [458, 150]], layer: 1, kind: 's' },
  ],
  flow: [['battery', 't1', 'keys', 't2', 'motor', 'belt', 'roller'], ['head', 't3', 'amp', 't4', 'speaker']],
  faults: [
    {
      id: 'contacts', comp: 'battery', name: '건전지 단자 부식', fix: 'clean', minDay: 5,
      complaint: '새 건전지를 넣어도 안 켜져요.',
      mark: 'powder', seen: '단자에 하얀 가루',
      lesson: '전원 입력 0V. 건전지함을 흔들면 잠깐 산다.',
    },
    {
      id: 'belt_loose', comp: 'belt', name: '벨트 늘어짐', fix: 'replace', minDay: 5, group: 'belt',
      complaint: '소리가 늘어지고 울렁거려요.',
      mark: 'glazed', seen: '번들거리고 헐겁다', feel: 'slack',
      lesson: '모터 6V 정상, 속도가 느리고 출렁인다.',
    },
    {
      id: 'belt_broken', comp: 'belt', name: '벨트 끊어짐', fix: 'replace', minDay: 5, group: 'belt',
      complaint: '윙 소리만 나고 테이프가 안 돌아요.',
      mark: 'snapped', seen: '벨트가 끊어졌다', feel: 'free',
      lesson: '모터는 헛돌고 릴은 멈춰 있다.',
    },
    {
      id: 'head_dirty', comp: 'head', name: '헤드 오염', fix: 'clean', minDay: 5,
      complaint: '소리가 먹먹해요.',
      mark: 'dirty', fine: true, seen: '갈색 산화막이 꼈다',
      lesson: '속도는 정상인데 헤드 출력이 낮다.',
    },
    {
      id: 'roller_hard', comp: 'roller', name: '핀치 롤러 경화', fix: 'replace', minDay: 6, latent: true,
      complaint: '가끔 테이프를 씹어요.',
      mark: 'glazed', seen: '반들반들 윤이 난다', feel: 'hard',
      lesson: '처음엔 괜찮다가 오래 돌리면 테이프를 감는다. 세척으론 안 된다.',
    },
    {
      id: 'motor_brush', comp: 'motor', name: '모터 브러시 마모', fix: 'replace', minDay: 6,
      complaint: '가만있다가 툭 치면 돌아요.',
      ohm: { v: 12, flicker: true },
      lesson: '모터 단자 6V인데 멈춰 있다. 톡 치면 돈다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const contactOK = !f.has('contacts') || c.wiggle === 'battery';
    const v1 = c.power && contactOK ? 6 : 0;
    const v2 = c.sw === 1 ? v1 : 0;
    const motorRun = v2 > 0 && (!f.has('motor_brush') || c.nudge);
    const tape = motorRun && !f.has('belt_broken');
    const loose = f.has('belt_loose');
    const eaten = tape && f.has('roller_hard') && c.warm;
    const playing = tape && !eaten;
    const dirty = f.has('head_dirty');
    s.tp.t1 = { v: v1 }; s.tp.t2 = { v: v2 };
    s.tp.t3 = { v: playing ? (dirty ? 0.6 : 2) : 0, shaky: playing && loose };
    s.tp.t4 = { v: playing ? (dirty ? 0.15 : 0.5) : 0, shaky: playing && loose };
    s.obs = !c.power ? '건전지가 빠져 있다' : c.sw !== 1 ? '정지 상태' : !v2 ? '아무 반응이 없다' : !motorRun ? '모터가 조용하다'
      : !tape ? '윙— 모터만 헛돈다' : eaten ? '테이프가 롤러에 감겼다!' : loose ? '노래가 늘어지고 울렁인다' : dirty ? '먹먹한 노래' : '노래가 또렷하다';
    if (motorRun) s.ear.motor = tape ? 'spin' : 'whirr';
    if (playing) s.ear.speaker = dirty ? 'muffled' : 'music';
    if (playing && loose) s.ear.belt = 'slip';
    if (motorRun) s.heat.motor = c.warm ? 1 : 0;
    s.fx.spin = playing ? (loose ? 0.6 : 1) : 0;
    s.fx.wobble = loose;
    s.fx.whirr = motorRun ? 0.25 : 0;
    s.fx.tone = playing ? c.knobB * (dirty ? 0.4 : 0.8) : 0;
    s.fx.jam = eaten;
    return s;
  },
};
