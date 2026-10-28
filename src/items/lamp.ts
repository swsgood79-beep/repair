import type { ItemDef } from '../types';
import { blank, volts } from './util';

export const lamp: ItemDef = {
  id: 'lamp',
  name: '탁상 스탠드',
  minDay: 1,
  fee: [9000, 13000],
  blurb: '쇠갓을 씌운 60W 백열 스탠드. 구조가 단순해 첫 손님으로 제격이다.',
  power: { on: '플러그 꽂기', off: '플러그 뽑기', state: ['꽂힘', '뽑힘'] },
  sw: { label: '스위치', options: ['끔', '켬'] },
  coverLabel: '베이스 밑판 · 나사 3개',
  cover: [132, 262, 376, 86],
  body: [132, 262, 376, 86],
  comps: [
    { id: 'plug', name: '플러그', shape: 'plug', x: 24, y: 300, w: 44, h: 34, layer: 0, acts: [], look: '둥근 핀 두 개. 휘거나 그을린 데는 없다.' },
    { id: 'cord', name: '전원 코드', shape: 'cord', x: 70, y: 306, w: 62, h: 22, layer: 0, ohm: '0.3Ω', part: 2000, acts: ['replace'], look: '천으로 감싼 낡은 코드. 겉은 멀쩡해 보인다.', note: '정상 0.3Ω' },
    { id: 'joint', name: '베이스 납땜 연결부', shape: 'joint', x: 196, y: 286, w: 52, h: 34, layer: 1, acts: ['solder'], look: '납땜이 둥글게 잘 붙어 있다.' },
    { id: 'switch', name: '똑딱 스위치', shape: 'switch', x: 430, y: 270, w: 60, h: 28, layer: 0, ohm: '켬 0Ω · 끔 ∞', part: 3000, acts: ['clean', 'replace'], look: '검은 베이클라이트 스위치.', feel: '딸깍 하고 또렷하게 넘어간다.', note: '켬 0Ω' },
    { id: 'socket', name: '전구 소켓', shape: 'socket', x: 290, y: 150, w: 60, h: 40, layer: 0, part: 2500, acts: ['clean', 'replace'], look: '전구를 빼고 들여다보니 놋쇠 접점이 반짝인다.' },
    { id: 'bulb', name: '백열전구 60W', shape: 'bulb', x: 292, y: 72, w: 56, h: 76, layer: 0, ohm: '약 60Ω (차가울 때)', part: 1500, acts: ['replace'], look: '필라멘트가 온전하다.', note: '정상 약 60Ω' },
  ],
  tps: [
    { id: 't1', label: '베이스 입력 단자', x: 170, y: 330, layer: 1, kind: 'ac', note: '220V' },
    { id: 't2', label: '스위치 출력', x: 420, y: 330, layer: 1, kind: 'ac', note: '켜면 220V' },
    { id: 't3', label: '소켓 단자', x: 366, y: 190, layer: 0, kind: 'ac', note: '켜면 220V' },
  ],
  wires: [
    { pts: [[68, 317], [72, 317]], layer: 0 },
    { pts: [[132, 317], [170, 330], [196, 305]], layer: 1 },
    { pts: [[248, 305], [300, 330], [420, 330], [440, 300]], layer: 1 },
    { pts: [[460, 298], [460, 312], [330, 312], [320, 262]], layer: 1 },
    { pts: [[320, 262], [320, 190]], layer: 0 },
    { pts: [[336, 190], [366, 190]], layer: 0 },
  ],
  faults: [
    {
      id: 'bulb_open', comp: 'bulb', name: '전구 필라멘트 단선', fix: 'replace', minDay: 1,
      complaint: '어제까지 잘 켜지다가 오늘 아침부터 안 켜져요.',
      look: '필라멘트 한 가닥이 끊어져 대롱거린다.', ohm: '∞ (끊김)',
      lesson: '저항이 무한대다. 소켓 단자에는 220V가 정상으로 온다.',
    },
    {
      id: 'cord_loose', comp: 'cord', name: '코드 속 단선', fix: 'replace', minDay: 1,
      complaint: '코드를 이리저리 만지면 가끔 켜졌다 꺼졌다 해요.',
      ohm: '∞ · 코드를 구부리면 0.3Ω으로 튄다', loupe: '플러그 근처 피복 속 구리선이 꺾여 끊어진 듯하다.',
      lesson: '평소엔 베이스 입력부터 0V. 코드를 흔들면 켜졌다 꺼졌다 한다.',
    },
    {
      id: 'switch_dirty', comp: 'switch', name: '스위치 접점 산화', fix: 'clean', minDay: 2,
      complaint: '켜면 불이 약하고 지지직 깜박여요.',
      ohm: '켬 18Ω (값이 오락가락) · 끔 ∞', look: '스위치 틈으로 검은 그을음이 보인다.', feel: '딸깍 하는 느낌이 물렁하다.',
      lesson: '스위치 출력 전압이 낮고 바늘이 떨린다. 접점을 세척하면 살아난다.',
    },
    {
      id: 'socket_rust', comp: 'socket', name: '소켓 접점 부식', fix: 'clean', minDay: 2,
      complaint: '전구를 새로 사서 끼웠는데도 안 켜져요.',
      look: '전구를 빼 보니 소켓 바닥 접점이 푸르스름하게 녹슬었다.',
      lesson: '소켓 단자까지 220V가 오는데 전구에 닿지 않는다. 전구 저항은 정상이다.',
    },
    {
      id: 'joint_cold', comp: 'joint', name: '냉납 (흔들면 끊김)', fix: 'solder', minDay: 3, latent: true,
      complaint: '스탠드를 옮기거나 툭 치면 꺼져요. 가만두면 또 켜지고요.',
      loupe: '납땜 둘레에 머리카락 같은 금이 둥글게 나 있다.',
      lesson: '가만두면 정상이라 놓치기 쉽다. 연결부를 흔들 때만 끊긴다. 돋보기로 금이 보인다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const v1 = c.power && cordOK ? 220 : 0;
    const jointOK = !(f.has('joint_cold') && c.wiggle === 'joint');
    const vj = jointOK ? v1 : 0;
    const dirty = f.has('switch_dirty');
    const v2 = c.sw === 1 ? (dirty && c.wiggle !== 'switch' ? vj * 0.55 : vj) : 0;
    const lit = v2 > 0 && !f.has('socket_rust') && !f.has('bulb_open');
    const bright = lit ? v2 / 220 : 0;
    s.tp.t1 = volts(v1);
    s.tp.t2 = volts(v2, dirty && v2 > 0 && c.wiggle !== 'switch');
    s.tp.t3 = volts(v2, dirty && v2 > 0 && c.wiggle !== 'switch');
    if (!c.power) s.obs.push('플러그가 뽑혀 있다.');
    else if (c.sw !== 1) s.obs.push('스위치가 꺼져 있다.');
    else if (!lit) s.obs.push('전구가 켜지지 않는다.');
    else if (bright < 0.9) s.obs.push('전구가 희미하게 지지직 깜박인다.');
    else s.obs.push('전구가 환하게 켜진다.');
    if (lit) s.heat.bulb = 2;
    if (dirty && v2 > 0) {
      s.ear.switch = '스위치 속에서 지지직 튀는 소리가 난다.';
      if (c.warm) s.heat.switch = 1;
    }
    s.fx.glow = { bulb: bright };
    s.fx.buzz = dirty && v2 > 0 ? 0.2 : 0;
    return s;
  },
};
