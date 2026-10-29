import type { ItemDef } from '../types';
import { blank } from './util';

/**
 * 턴테이블 전축: 모터 → 아이들러 고무 → 판 → 바늘 → 앰프 → 스피커.
 * 속도는 눈(스트로보)으로, 소리는 귀로. 기계와 전기가 섞인 물건.
 */
export const turntable: ItemDef = {
  id: 'turntable',
  name: '턴테이블 전축',
  minDay: 12,
  fee: [36000, 48000],
  power: { on: '플러그 꽂기', off: '플러그 뽑기' },
  sw: ['정지', '33', '45'],
  knobB: '볼륨',
  nudge: '바늘 내리기',
  coverLabel: '판 받침',
  cover: [120, 40, 290, 280],
  comps: [
    { id: 'plug', name: '플러그', short: '플러그', shape: 'plug', x: 24, y: 300, w: 44, h: 34, layer: 0, acts: [], hand: 'power' },
    { id: 'cord', name: '전원 코드', short: '코드', shape: 'cord', x: 70, y: 306, w: 60, h: 22, layer: 0, ohm: 0.3, part: 2000, acts: ['replace'], feel: 'soft' },
    { id: 'platter', name: '턴테이블 판', short: '판', shape: 'platter', x: 140, y: 56, w: 250, h: 250, layer: 0, acts: [], front: true },
    { id: 'arm', name: '톤암', short: '톤암', shape: 'tonearm', x: 420, y: 60, w: 70, h: 210, layer: 0, acts: [], hand: 'nudge' },
    { id: 'cart', name: '바늘', short: '바늘', shape: 'cart', x: 360, y: 226, w: 40, h: 34, layer: 0, part: 6000, acts: ['replace'], front: true },
    { id: 'keys', name: '속도 버튼', short: '속도', shape: 'keys', x: 470, y: 300, w: 90, h: 30, layer: 0, acts: [], hand: 'switch' },
    { id: 'speaker', name: '스피커', short: '스피커', shape: 'speaker', x: 520, y: 70, w: 100, h: 100, layer: 0, part: 9000, acts: ['replace'] },
    { id: 'motor', name: '모터', short: '모터', shape: 'motor', x: 150, y: 220, w: 60, h: 60, layer: 1, ohm: 300, part: 12000, acts: ['oil', 'replace'], feel: 'smooth' },
    { id: 'idler', name: '아이들러 고무', short: '아이들러', shape: 'roller', x: 220, y: 180, w: 40, h: 40, layer: 1, part: 4000, acts: ['replace'], feel: 'soft' },
    { id: 'pitch', name: '속도 조정 나사', short: '속도나사', shape: 'trim', x: 340, y: 90, w: 34, h: 34, layer: 1, acts: ['adjust'], feel: 'firm' },
    { id: 'gnd', name: '톤암 접지선', short: '접지선', shape: 'joint', x: 330, y: 160, w: 90, h: 20, layer: 1, ohm: 0, acts: ['solder'] },
    { id: 'board', name: '앰프 기판', short: '앰프', shape: 'board', x: 150, y: 70, w: 150, h: 60, layer: 1, acts: ['solder'] },
  ],
  tps: [
    { id: 'rpm', label: '회전수', x: 400, y: 300, layer: 0, kind: 'amp', unit: '회전', expect: 33 },
    { id: 't1', label: '바늘 신호', x: 420, y: 200, layer: 1, kind: 'sig', unit: 'mV', expect: 5 },
    { id: 't2', label: '앰프 출력', x: 310, y: 140, layer: 1, kind: 'sig', unit: 'V', expect: 2 },
  ],
  wires: [
    { pts: [[130, 317], [140, 300], [150, 250]], layer: 1 },
    { pts: [[210, 250], [230, 210]], layer: 1, kind: 'm' },
    { pts: [[420, 170], [420, 200], [310, 140], [300, 100]], layer: 1, kind: 's' },
    { pts: [[300, 70], [570, 40], [570, 70]], layer: 1, kind: 's' },
  ],
  flow: [['plug', 'cord', 'keys', 'motor', 'idler', 'pitch', 'platter', 'rpm'], ['arm', 'cart', 't1', 'gnd', 'board', 't2', 'speaker']],
  faults: [
    {
      id: 'idler_glazed', comp: 'idler', name: '아이들러 고무 경화', fix: 'replace', minDay: 12,
      complaint: '노래가 늘어지고 울렁거려요.',
      mark: 'glazed', seen: '고무가 번들번들 딱딱하다', feel: 'hard',
      lesson: '판이 느리고 울렁인다. 고무가 굳어 미끄러진다. 만지면 돌처럼 딱딱.',
    },
    {
      id: 'motor_dry', comp: 'motor', name: '모터 축 기름 마름', fix: 'oil', minDay: 12,
      complaint: '끼익 소리가 나고 판이 늦게 돌아요.',
      mark: 'dryoil', fine: true, seen: '축에 기름이 말랐다', feel: 'stiff',
      lesson: '모터에서 끼익. 손으로 돌리면 뻑뻑하다. 기름 몇 방울.',
    },
    {
      id: 'pitch_off', comp: 'pitch', name: '속도 어긋남', fix: 'adjust', minDay: 12,
      complaint: '노래가 조금 느리고 낮게 들려요.',
      lesson: '소리는 고른데 회전수가 낮다. 속도 나사를 돌려 맞춘다.',
    },
    {
      id: 'needle_worn', comp: 'cart', name: '바늘 닳음', fix: 'replace', minDay: 12,
      complaint: '소리가 지글지글 일그러져요.',
      mark: 'bent', fine: true, seen: '바늘 끝이 뭉툭하게 닳았다',
      lesson: '속도는 맞는데 소리가 일그러진다. 바늘 신호가 약하고 바늘에서 지직.',
    },
    {
      id: 'gnd_open', comp: 'gnd', name: '접지선 떨어짐', fix: 'solder', minDay: 13,
      complaint: '음악에 웅— 소리가 섞여요.',
      mark: 'snapped', fine: true, seen: '접지선 끝이 납에서 떨어졌다', ohm: { v: Infinity },
      lesson: '음악 위에 웅—. 톤암 접지선 저항 ∞. 다시 납땜.',
    },
    {
      id: 'board_cold', comp: 'board', name: '앰프 기판 냉납', fix: 'solder', minDay: 13, latent: true,
      complaint: '듣다 보면 소리가 툭 끊겨요.',
      mark: 'crack', fine: true, seen: '납땜에 둥근 금',
      lesson: '평소엔 멀쩡하다. 기판을 흔들면 소리가 끊긴다.',
    },
    {
      id: 'cord_loose', comp: 'cord', name: '코드 속 단선', fix: 'replace', minDay: 12,
      complaint: '코드를 움직이면 섰다 돌았다 해요.',
      mark: 'frayed', fine: true, seen: '피복 속 구리선이 꺾였다', ohm: { v: Infinity, flicker: true },
      lesson: '아예 안 돈다. 코드를 흔들면 살아난다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const v = c.power && cordOK;
    const spin = v && c.sw > 0;
    const base = c.sw === 2 ? 45 : 33;
    let k = 1;
    if (f.has('motor_dry')) k *= 0.85;
    if (f.has('idler_glazed')) k *= 0.8;
    if (f.has('pitch_off')) k *= 0.87;
    const rpm = spin ? Math.round(base * k * 10) / 10 : 0;
    const playing = spin && c.nudge;
    const sig = playing ? (f.has('needle_worn') ? 1 : 5) : 0;
    const boardOK = !(f.has('board_cold') && c.wiggle === 'board');
    const out = sig && boardOK ? 2 : 0;
    const loud = c.knobB > 0.05;
    const sound = out > 0 && loud;
    s.tp.rpm = { v: rpm };
    s.tp.t1 = { v: sig };
    s.tp.t2 = { v: out };
    if (!c.power) s.obs = '플러그가 뽑혀 있다';
    else if (!v) s.obs = '아무 반응이 없다';
    else if (!spin) s.obs = '판이 멈춰 있다 · 속도 버튼을 눌러 보자';
    else {
      const turn = f.has('motor_dry') ? '끼익 소리를 내며 판이 늦게 돈다' : f.has('idler_glazed') ? '판이 느리고 울렁울렁 돈다' : f.has('pitch_off') ? '판이 조금 느리게 돈다' : '판이 고르게 돈다';
      if (!playing) s.obs = `${turn} · 바늘을 내려 보자`;
      else if (!boardOK) s.obs = `${turn} · 소리가 툭 끊겼다`;
      else if (!loud) s.obs = `${turn} · 볼륨이 0이다`;
      else {
        const q: string[] = [];
        if (f.has('needle_worn')) q.push('지글지글 일그러진 소리');
        if (f.has('gnd_open')) q.push('웅— 험이 섞인다');
        if (f.has('idler_glazed')) q.push('음이 울렁울렁');
        else if (k < 1) q.push('음이 낮게 늘어진다');
        s.obs = `♪ ${q.length ? q.join(' · ') : '맑은 음악'}`;
      }
    }
    if (spin) {
      s.ear.motor = f.has('motor_dry') ? 'squeal' : 'whirr';
      s.ear.idler = f.has('idler_glazed') ? 'wow' : 'spin';
      s.ear.platter = 'spin';
      s.heat.motor = 1;
    }
    if (playing) s.ear.cart = f.has('needle_worn') ? 'crackle' : 'music';
    if (sound) s.ear.speaker = f.has('gnd_open') ? 'loudhum' : f.has('needle_worn') ? 'muffled' : 'music';
    s.fx.spin = spin ? k * (c.sw === 2 ? 1.35 : 1) : 0;
    s.fx.whirr = spin ? 0.25 : 0;
    s.fx.tone = sound ? c.knobB * 0.9 : 0;
    s.fx.wow = sound && f.has('idler_glazed') ? 1 : 0;
    s.fx.hum = sound && f.has('gnd_open') ? 0.6 : 0;
    s.fx.crackle = sound && f.has('needle_worn') ? 0.7 : 0;
    s.fx.noise = 0;
    return s;
  },
};
