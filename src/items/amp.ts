import type { ItemDef } from '../types';
import { blank } from './util';

/**
 * 스테레오 앰프: 왼쪽과 오른쪽을 비교하는 물건.
 * 한쪽만 이상하면 그쪽 길만, 양쪽 다 이상하면 함께 쓰는 길을 의심한다.
 */
export const amp: ItemDef = {
  id: 'amp',
  name: '스테레오 앰프',
  minDay: 10,
  fee: [32000, 44000],
  power: { on: '플러그 꽂기', off: '플러그 뽑기' },
  sw: ['끔', '켬'],
  knobB: '볼륨',
  coverLabel: '윗덮개',
  cover: [130, 40, 380, 170],
  comps: [
    { id: 'plug', name: '플러그', short: '플러그', shape: 'plug', x: 24, y: 300, w: 44, h: 34, layer: 0, acts: [], hand: 'power' },
    { id: 'cord', name: '전원 코드', short: '코드', shape: 'cord', x: 70, y: 306, w: 60, h: 22, layer: 0, ohm: 0.3, part: 2000, acts: ['replace'], feel: 'soft' },
    { id: 'spL', name: '왼쪽 스피커', short: '왼쪽 스피커', shape: 'speaker', x: 12, y: 60, w: 100, h: 100, layer: 0, part: 9000, acts: ['replace'] },
    { id: 'spR', name: '오른쪽 스피커', short: '오른쪽 스피커', shape: 'speaker', x: 528, y: 60, w: 100, h: 100, layer: 0, part: 9000, acts: ['replace'] },
    { id: 'power', name: '전원 스위치', short: '전원', shape: 'switch', x: 150, y: 240, w: 34, h: 44, layer: 0, acts: [], hand: 'switch' },
    { id: 'vu', name: '레벨 미터', short: '미터', shape: 'vu', x: 220, y: 230, w: 150, h: 60, layer: 0, acts: [] },
    { id: 'vol', name: '볼륨', short: '볼륨', shape: 'pot', x: 410, y: 234, w: 56, h: 56, layer: 0, acts: ['clean'], hand: 'volume', feel: 'smooth' },
    { id: 'fuse', name: '퓨즈', short: '퓨즈', shape: 'fuse', x: 146, y: 60, w: 60, h: 20, layer: 1, ohm: 0, part: 500, acts: ['replace'] },
    { id: 'xfmr', name: '전원 트랜스', short: '트랜스', shape: 'xfmr', x: 146, y: 100, w: 70, h: 64, layer: 1, part: 15000, acts: ['replace'] },
    { id: 'fcap', name: '평활 콘덴서', short: '평활콘덴서', shape: 'cap', x: 232, y: 70, w: 34, h: 70, layer: 1, ohm: 'cap', part: 4000, acts: ['replace'] },
    { id: 'trL', name: '왼쪽 출력 트랜지스터', short: '왼쪽 증폭기', shape: 'tr', x: 296, y: 64, w: 40, h: 50, layer: 1, ohm: 600, part: 5000, acts: ['replace'] },
    { id: 'trR', name: '오른쪽 출력 트랜지스터', short: '오른쪽 증폭기', shape: 'tr', x: 440, y: 64, w: 40, h: 50, layer: 1, ohm: 600, part: 5000, acts: ['replace'] },
    { id: 'board', name: '출력 기판', short: '기판', shape: 'board', x: 296, y: 132, w: 184, h: 40, layer: 1, acts: ['solder'] },
    { id: 'relay', name: '보호 릴레이', short: '릴레이', shape: 'relay', x: 360, y: 68, w: 54, h: 40, layer: 1, part: 3000, acts: ['clean', 'replace'] },
  ],
  tps: [
    { id: 't1', label: '전원부 직류', x: 274, y: 160, layer: 1, kind: 'volt', unit: 'V', expect: 35 },
    { id: 'tL', label: '왼쪽 출력', x: 316, y: 186, layer: 1, kind: 'sig', unit: 'V', expect: 2 },
    { id: 'tR', label: '오른쪽 출력', x: 460, y: 186, layer: 1, kind: 'sig', unit: 'V', expect: 2 },
  ],
  wires: [
    { pts: [[130, 317], [140, 300], [146, 70]], layer: 1 },
    { pts: [[206, 70], [216, 100]], layer: 1 },
    { pts: [[216, 132], [249, 140], [274, 160]], layer: 1 },
    { pts: [[274, 160], [316, 114]], layer: 1 },
    { pts: [[274, 160], [460, 114]], layer: 1 },
    { pts: [[336, 89], [360, 88]], layer: 1, kind: 's' },
    { pts: [[440, 89], [414, 88]], layer: 1, kind: 's' },
    { pts: [[387, 68], [387, 30], [62, 30], [62, 60]], layer: 0, kind: 's' },
    { pts: [[387, 30], [578, 30], [578, 60]], layer: 0, kind: 's' },
  ],
  flow: [['plug', 'cord', 'power', 'fuse', 'xfmr', 'fcap', 't1', 'vol'], ['trL', 'tL', 'board', 'trR', 'tR', 'vu'], ['relay', 'spL', 'spR']],
  faults: [
    {
      id: 'fuse_blown', comp: 'fuse', name: '퓨즈 끊김', fix: 'replace', minDay: 10,
      complaint: '스위치를 켜도 불도 안 들어와요.',
      mark: 'soot', seen: '유리관 안이 까맣다', ohm: { v: Infinity },
      lesson: '스위치를 켜도 미터 불이 꺼져 있다. 퓨즈 ∞.',
    },
    {
      id: 'trL_dead', comp: 'trL', name: '왼쪽 출력 트랜지스터 고장', fix: 'replace', minDay: 10,
      complaint: '왼쪽 스피커에서만 소리가 안 나요.',
      mark: 'burnt', fine: true, seen: '방열판 주변이 누렇게 탔다', ohm: { v: 0.5 },
      lesson: '왼쪽 출력 0V, 오른쪽은 2V. 왼쪽 트랜지스터 저항이 0.5Ω로 붙었다.',
    },
    {
      id: 'spR_torn', comp: 'spR', name: '오른쪽 스피커 콘 찢어짐', fix: 'replace', minDay: 10,
      complaint: '오른쪽에서 찢어지는 소리가 나요.',
      mark: 'torn', seen: '종이 콘이 찢어졌다',
      lesson: '오른쪽 출력은 2V로 정상인데 소리가 지직. 신호가 아니라 스피커 문제.',
    },
    {
      id: 'relay_dirty', comp: 'relay', name: '릴레이 접점 오염', fix: 'clean', minDay: 11,
      complaint: '미터 바늘은 움직이는데 소리가 안 나요.',
      mark: 'soot', fine: true, seen: '접점이 까맣게 그을렸다', ohm: { v: Infinity, flicker: true },
      lesson: '양쪽 출력 2V, 바늘도 움직이는데 둘 다 조용. 두 채널이 함께 지나는 릴레이.',
    },
    {
      id: 'fcap_dry', comp: 'fcap', name: '평활 콘덴서 말라붙음', fix: 'replace', minDay: 11,
      complaint: '양쪽에서 웅— 소리가 커요.',
      mark: 'bulge', seen: '머리가 부풀었다', ohm: { v: Infinity, cap: 'weak' },
      lesson: '전원부 직류가 28V로 낮고 떨린다. 양쪽 다 웅— 하면 함께 쓰는 전원부.',
    },
    {
      id: 'pot_dirty', comp: 'vol', name: '볼륨 오염', fix: 'clean', minDay: 10,
      complaint: '볼륨을 돌리면 지지직거려요.',
      mark: 'dirty', fine: true, seen: '저항 막에 먼지가 꼈다', feel: 'stiff',
      lesson: '볼륨을 돌릴 때만 양쪽에서 지지직. 볼륨을 닦는다.',
    },
    {
      id: 'board_cold', comp: 'board', name: '출력 기판 냉납', fix: 'solder', minDay: 12, latent: true,
      complaint: '가끔 오른쪽이 툭 끊겨요.',
      mark: 'crack', fine: true, seen: '오른쪽 납땜에 둥근 금',
      lesson: '평소엔 멀쩡하다. 기판을 흔들면 오른쪽만 끊긴다.',
    },
    {
      id: 'cord_loose', comp: 'cord', name: '코드 속 단선', fix: 'replace', minDay: 10,
      complaint: '코드를 움직이면 꺼졌다 켜졌다 해요.',
      mark: 'frayed', fine: true, seen: '피복 속 구리선이 꺾였다', ohm: { v: Infinity, flicker: true },
      lesson: '전원부부터 0V. 코드를 흔들면 살아난다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const on = c.power && cordOK && c.sw === 1;
    const lit = on && !f.has('fuse_blown');
    const dry = f.has('fcap_dry');
    const bplus = lit ? (dry ? 28 : 35) : 0;
    const outL = bplus && !f.has('trL_dead') ? 2 : 0;
    const outR = bplus && !(f.has('board_cold') && c.wiggle === 'board') ? 2 : 0;
    const relayOK = !f.has('relay_dirty') || c.wiggle === 'relay';
    const vol = c.knobB;
    const loud = vol > 0.05;
    const L = !!outL && relayOK && loud, R = !!outR && relayOK && loud;
    const crackle = f.has('pot_dirty') && c.moved && lit;
    s.tp.t1 = { v: bplus, shaky: dry && lit };
    s.tp.tL = { v: outL }; s.tp.tR = { v: outR };
    if (!c.power) s.obs = '플러그가 뽑혀 있다';
    else if (!cordOK) s.obs = '아무 반응이 없다';
    else if (c.sw === 0) s.obs = '전원 스위치가 꺼져 있다';
    else if (!lit) s.obs = '스위치를 켜도 미터 불이 안 들어온다';
    else if (!loud) s.obs = '미터 불은 켜졌는데 볼륨이 0이다';
    else if (!relayOK) s.obs = '미터 바늘은 춤추는데 양쪽 다 조용하다';
    else {
      const parts = [L && R ? '♪ 양쪽에서 음악' : L ? '♪ 왼쪽에서만 음악 · 오른쪽 조용' : R ? '♪ 오른쪽에서만 음악 · 왼쪽 조용' : '조용하다'];
      if (dry) parts.push('웅— 소리가 크다');
      if (R && f.has('spR_torn')) parts.push('오른쪽이 찢어지는 소리');
      if (crackle) parts.push('볼륨을 돌리면 지지직');
      s.obs = parts.join(' · ');
    }
    const sideSound = (on2: boolean, torn: boolean) => !on2 ? 'quiet' as const : torn ? 'buzz' as const : crackle ? 'muffled' as const : dry ? 'loudhum' as const : 'music' as const;
    s.ear.spL = sideSound(L, false);
    s.ear.spR = sideSound(R, f.has('spR_torn'));
    if (lit) { s.ear.xfmr = dry ? 'loudhum' : 'hum'; s.ear.relay = relayOK ? 'click' : 'quiet'; }
    if (crackle) s.ear.vol = 'crackle';
    s.heat.trL = outL ? 1 : 0; s.heat.trR = outR ? 1 : 0; s.heat.xfmr = lit ? 1 : 0;
    s.fx.glow = { vu: lit ? 1 : 0 };
    s.fx.vu = [outL && loud ? vol : 0, outR && loud ? vol : 0];
    s.fx.tone = L || R ? vol * (L && R ? 1 : 0.6) : 0;
    s.fx.hum = dry && (L || R) ? 0.6 : 0;
    s.fx.buzz = R && f.has('spR_torn') ? 0.6 : 0;
    s.fx.crackle = crackle && (L || R) ? 0.8 : 0;
    return s;
  },
};
