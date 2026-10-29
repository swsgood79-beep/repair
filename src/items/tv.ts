import type { ItemDef } from '../types';
import { blank } from './util';

/**
 * 흑백 TV: 화면 증상이 곧 단서다.
 * 까만 화면(고압), 가로줄(수직 출력), 흐르는 화면(수직 동기), 눈보라(튜너), 무음(음성부).
 */
export const tv: ItemDef = {
  id: 'tv',
  name: '흑백 TV',
  minDay: 14,
  fee: [45000, 60000],
  power: { on: '플러그 꽂기', off: '플러그 뽑기' },
  sw: ['끔', '켬'],
  knobB: '볼륨',
  coverLabel: '뒷판',
  cover: [90, 30, 400, 300],
  comps: [
    { id: 'plug', name: '플러그', short: '플러그', shape: 'plug', x: 24, y: 300, w: 44, h: 34, layer: 0, acts: [], hand: 'power' },
    { id: 'cord', name: '전원 코드', short: '코드', shape: 'cord', x: 70, y: 306, w: 60, h: 22, layer: 0, ohm: 0.3, part: 2000, acts: ['replace'], feel: 'soft' },
    { id: 'crt', name: '브라운관', short: '화면', shape: 'crt', x: 110, y: 50, w: 360, h: 260, layer: 0, acts: [], front: true },
    { id: 'power', name: '전원 손잡이', short: '전원', shape: 'switch', x: 520, y: 70, w: 40, h: 44, layer: 0, acts: [], hand: 'switch' },
    { id: 'speaker', name: '스피커', short: '스피커', shape: 'speaker', x: 510, y: 180, w: 80, h: 80, layer: 0, part: 7000, acts: ['replace'] },
    { id: 'fuse', name: '퓨즈', short: '퓨즈', shape: 'fuse', x: 110, y: 60, w: 60, h: 20, layer: 1, ohm: 0, part: 500, acts: ['replace'] },
    { id: 'flyback', name: '고압 트랜스', short: '고압트랜스', shape: 'xfmr', x: 200, y: 50, w: 80, h: 80, layer: 1, ohm: 2, part: 14000, acts: ['replace'] },
    { id: 'vert', name: '수직 출력관', short: '수직관', shape: 'tube', x: 310, y: 50, w: 34, h: 70, layer: 1, part: 6000, acts: ['replace'] },
    { id: 'vhold', name: '수직 동기 조정', short: '수직동기', shape: 'trim', x: 380, y: 70, w: 34, h: 34, layer: 1, acts: ['adjust'], feel: 'firm' },
    { id: 'tuner', name: '채널 튜너', short: '튜너', shape: 'rotary', x: 120, y: 160, w: 90, h: 90, layer: 1, acts: ['clean'], feel: 'smooth' },
    { id: 'board', name: '음성 기판', short: '음성기판', shape: 'board', x: 250, y: 190, w: 160, h: 50, layer: 1, acts: ['solder'] },
  ],
  tps: [
    { id: 't1', label: '전원부 +B', x: 180, y: 120, layer: 1, kind: 'volt', unit: 'V', expect: 110 },
    { id: 't2', label: '영상 신호', x: 220, y: 270, layer: 1, kind: 'sig', unit: 'V', expect: 1 },
    { id: 't3', label: '수직 구동', x: 360, y: 140, layer: 1, kind: 'sig', unit: 'V', expect: 30 },
    { id: 't4', label: '음성 출력', x: 420, y: 260, layer: 1, kind: 'sig', unit: 'V', expect: 0.5 },
  ],
  wires: [
    { pts: [[130, 317], [100, 300], [110, 70]], layer: 1 },
    { pts: [[170, 70], [180, 120], [200, 90]], layer: 1 },
    { pts: [[180, 120], [327, 120]], layer: 1 },
    { pts: [[165, 250], [220, 270], [250, 215]], layer: 1, kind: 's' },
    { pts: [[327, 120], [360, 140], [397, 104]], layer: 1, kind: 's' },
    { pts: [[410, 215], [420, 260], [510, 220]], layer: 1, kind: 's' },
  ],
  flow: [['plug', 'cord', 'power', 'fuse', 't1', 'flyback', 'crt'], ['tuner', 't2', 'vert', 't3', 'vhold'], ['board', 't4', 'speaker']],
  faults: [
    {
      id: 'fuse_blown', comp: 'fuse', name: '퓨즈 끊김', fix: 'replace', minDay: 14,
      complaint: '켜도 아무것도 안 나와요.',
      mark: 'soot', seen: '유리관 안이 까맣다', ohm: { v: Infinity },
      lesson: '화면도 소리도 없다. +B 0V, 퓨즈 ∞.',
    },
    {
      id: 'flyback_dead', comp: 'flyback', name: '고압 트랜스 끊김', fix: 'replace', minDay: 14,
      complaint: '소리는 나는데 화면이 까매요.',
      mark: 'crack', fine: true, seen: '몸통에 가는 금과 그을음', ohm: { v: Infinity },
      lesson: '소리는 나는데 화면이 까맣고 삐— 고음도 없다. 고압 트랜스 ∞.',
    },
    {
      id: 'vert_dead', comp: 'vert', name: '수직 출력관 수명', fix: 'replace', minDay: 14,
      complaint: '화면 가운데 가로줄 하나만 보여요.',
      mark: 'filament', seen: '관 속 히터가 꺼져 있다',
      lesson: '화면이 가로줄 한 줄로 찌그러졌다. 수직 구동 0V, 수직관 불이 꺼져 있다.',
    },
    {
      id: 'vhold_off', comp: 'vhold', name: '수직 동기 어긋남', fix: 'adjust', minDay: 15,
      complaint: '화면이 계속 위로 흘러가요.',
      lesson: '화면이 위로 흐른다. 수직 구동이 떨린다. 동기 조정을 돌려 멈춘다.',
    },
    {
      id: 'tuner_dirty', comp: 'tuner', name: '튜너 접점 오염', fix: 'clean', minDay: 14,
      complaint: '화면이 눈 내리는 것처럼 지글거려요.',
      mark: 'dirty', fine: true, seen: '채널 접점에 녹색 때', feel: 'sticky',
      lesson: '눈보라 화면에 치익— 잡음. 영상 신호가 약하다. 튜너 접점을 닦는다.',
    },
    {
      id: 'audio_cold', comp: 'board', name: '음성 기판 냉납', fix: 'solder', minDay: 15,
      complaint: '화면은 나오는데 소리가 안 나요.',
      mark: 'crack', fine: true, seen: '출력 납땜에 둥근 금',
      lesson: '화면은 또렷한데 소리만 없다. 음성 출력 0V. 기판을 흔들면 잠깐 소리가 난다.',
    },
    {
      id: 'cord_loose', comp: 'cord', name: '코드 속 단선', fix: 'replace', minDay: 14,
      complaint: '코드를 움직이면 꺼졌다 켜졌다 해요.',
      mark: 'frayed', fine: true, seen: '피복 속 구리선이 꺾였다', ohm: { v: Infinity, flicker: true },
      lesson: '+B부터 0V. 코드를 흔들면 살아난다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const on = c.power && cordOK && c.sw === 1;
    const bp = on && !f.has('fuse_blown') ? 110 : 0;
    const hv = bp > 0 && !f.has('flyback_dead');
    const video = bp ? (f.has('tuner_dirty') ? 0.2 : 1) : 0;
    const vert = bp && !f.has('vert_dead') ? 30 : 0;
    const roll = f.has('vhold_off');
    const audioOK = bp > 0 && (!f.has('audio_cold') || c.wiggle === 'board');
    const loud = c.knobB > 0.05;
    const sound = audioOK && loud;
    s.tp.t1 = { v: bp };
    s.tp.t2 = { v: video };
    s.tp.t3 = { v: vert, shaky: roll && vert > 0 };
    s.tp.t4 = { v: audioOK ? 0.5 : 0 };
    const screen = !bp ? 'off' : !hv ? 'black' : !vert ? 'line' : video < 0.5 ? 'snow' : roll ? 'roll' : 'ok';
    if (!c.power) s.obs = '플러그가 뽑혀 있다';
    else if (!cordOK) s.obs = '아무 반응이 없다';
    else if (c.sw === 0) s.obs = '전원 손잡이가 눌려 있다 (꺼짐)';
    else if (!bp) s.obs = '손잡이를 당겨도 화면도 소리도 없다';
    else {
      const pic = { black: '화면이 까맣다', line: '가운데 가로줄 한 줄만 밝다', snow: '화면이 눈보라처럼 지글거린다', roll: '화면이 위로 계속 흘러간다', ok: '화면이 또렷하다', off: '' }[screen];
      const snd = !loud ? '볼륨 0' : sound ? (video < 0.5 ? '치익— 잡음' : '말소리가 잘 들린다') : '소리가 안 난다';
      s.obs = `${pic} · ${snd}`;
    }
    if (bp) s.ear.flyback = hv ? 'whine' : 'quiet';
    if (vert) s.ear.vert = 'hum';
    if (sound) s.ear.speaker = video < 0.5 ? 'static' : 'music';
    s.heat.vert = vert ? 2 : 0; s.heat.flyback = hv ? 1 : 0;
    s.fx.glow = { vert: vert ? 1 : 0, crt: hv ? 1 : 0 };
    s.fx.screen = screen;
    s.fx.tone = sound && video >= 0.5 ? c.knobB * 0.5 : 0;
    s.fx.noise = sound && video < 0.5 ? c.knobB * 0.8 : 0;
    s.fx.buzz = hv ? 0.15 : 0;
    return s;
  },
};
