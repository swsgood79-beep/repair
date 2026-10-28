import type { ItemDef } from '../types';
import { blank, volts } from './util';

const SPEED = [0, 0.55, 0.78, 1];

export const fan: ItemDef = {
  id: 'fan',
  name: '선풍기',
  minDay: 1,
  fee: [15000, 21000],
  blurb: '철망 날개의 3단 선풍기. 모터·콘덴서·베어링이 한 몸으로 엮여 있다.',
  power: { on: '플러그 꽂기', off: '플러그 뽑기', state: ['꽂힘', '뽑힘'] },
  sw: { label: '속도', options: ['끔', '1단', '2단', '3단'] },
  nudge: '날개 손으로 밀기',
  coverLabel: '모터 뒷덮개 · 나사 4개',
  cover: [292, 70, 276, 178],
  body: [292, 70, 276, 178],
  comps: [
    { id: 'blade', name: '날개', shape: 'blade', x: 64, y: 58, w: 216, h: 216, layer: 0, acts: [], look: '날개 네 장. 금 간 데는 없다.', feel: '손으로 돌리면 가볍게 오래 돈다.' },
    { id: 'bearing', name: '축 베어링', shape: 'bearing', x: 304, y: 124, w: 30, h: 44, layer: 1, part: 2500, acts: ['oil', 'replace'], look: '축 주변이 깨끗하고 기름기가 돈다.', feel: '축이 부드럽게 돈다.' },
    { id: 'motor', name: '모터 코일', shape: 'motor', x: 344, y: 92, w: 112, h: 104, layer: 1, ohm: '약 120Ω', part: 9000, acts: ['replace'], look: '에나멜 코일이 고르게 감겨 있다.', note: '정상 약 120Ω' },
    { id: 'tfuse', name: '온도 퓨즈 115℃', shape: 'fuse', x: 470, y: 94, w: 72, h: 22, layer: 1, ohm: '0Ω', part: 1500, acts: ['replace'], look: '흰 슬리브에 싸인 작은 퓨즈.', note: '정상 0Ω' },
    { id: 'cap', name: '기동 콘덴서 1.5µF', shape: 'cap', x: 474, y: 140, w: 62, h: 40, layer: 1, ohm: '바늘이 툭 튀었다가 서서히 돌아온다', part: 2500, acts: ['replace'], look: '검은 원통. 겉은 깨끗하다.', note: '바늘이 튀었다 돌아오면 정상' },
    { id: 'switch', name: '속도 스위치', shape: 'switch', x: 384, y: 290, w: 128, h: 36, layer: 0, ohm: '1단 0Ω · 2단 0Ω · 3단 0Ω', part: 3000, acts: ['clean', 'replace'], look: '피아노 건반식 버튼 네 개.', feel: '버튼이 걸림 없이 눌린다.' },
    { id: 'cord', name: '전원 코드', shape: 'cord', x: 150, y: 318, w: 84, h: 20, layer: 0, ohm: '0.3Ω', part: 2000, acts: ['replace'], look: '고무 피복 코드. 겉은 멀쩡하다.' },
    { id: 'plug', name: '플러그', shape: 'plug', x: 100, y: 312, w: 44, h: 32, layer: 0, acts: [], look: '핀이 반듯하다.' },
  ],
  tps: [
    { id: 't1', label: '단자대 입력', x: 360, y: 226, layer: 1, kind: 'ac', note: '220V' },
    { id: 't2', label: '선택 속도 출력', x: 420, y: 226, layer: 1, kind: 'ac', note: '켜면 220V' },
    { id: 't3', label: '온도퓨즈 뒤', x: 552, y: 105, layer: 1, kind: 'ac', note: '220V' },
    { id: 't4', label: '콘덴서 단자', x: 552, y: 160, layer: 1, kind: 'ac', note: '220V' },
  ],
  wires: [
    { pts: [[144, 328], [150, 328]], layer: 0 },
    { pts: [[234, 328], [384, 308]], layer: 0 },
    { pts: [[400, 290], [360, 226], [420, 226], [470, 105]], layer: 1 },
    { pts: [[542, 105], [552, 105], [552, 160], [536, 160]], layer: 1 },
    { pts: [[474, 160], [456, 150]], layer: 1 },
    { pts: [[334, 146], [344, 146]], layer: 1, kind: 'm' },
  ],
  faults: [
    {
      id: 'cap_dead', comp: 'cap', name: '기동 콘덴서 노화', fix: 'replace', minDay: 1,
      complaint: '켜면 웅— 소리만 나고 날개가 안 돌아요.',
      ohm: '바늘이 거의 움직이지 않는다', look: '원통 끝이 살짝 부풀어 올랐다.',
      lesson: '모터에 전압이 와서 웅 소리는 나지만 스스로 못 돈다. 손으로 밀면 돈다.',
    },
    {
      id: 'bearing_dry', comp: 'bearing', name: '베어링 기름 마름', fix: 'oil', minDay: 1,
      complaint: '날개가 힘없이 돌고 끼익 소리가 나요.',
      feel: '축이 뻑뻑하다. 손을 떼면 금세 멈춘다.', look: '축 주변 기름이 말라 갈색으로 굳었다.',
      also: { id: 'tfuse_open', chance: 0.5, complaint: '느릿느릿 돌다가 점점 더 느려지더니 아예 멈췄어요. 탄내도 났고요.' },
      lesson: '느리고 쇳소리가 난다. 오래 돌리면 모터가 달아올라 온도 퓨즈까지 끊는다.',
    },
    {
      id: 'tfuse_open', comp: 'tfuse', name: '온도 퓨즈 단선', fix: 'replace', minDay: 2,
      complaint: '켜도 아무 반응이 없어요.',
      ohm: '∞ (끊김)', look: '퓨즈 슬리브가 누렇게 변색됐다.',
      lesson: '퓨즈 뒤부터 0V. 모터를 달군 원인을 고치지 않으면 새 퓨즈도 다시 끊어진다.',
    },
    {
      id: 'switch_pos', comp: 'switch', name: '2단 접점 소손', fix: 'replace', minDay: 2,
      complaint: '1단, 3단은 되는데 2단만 안 돌아요.',
      ohm: '1단 0Ω · 2단 ∞ · 3단 0Ω', look: '스위치 틈새 한 칸이 검게 그을렸다.',
      lesson: '그 단에서만 스위치 출력이 0V. 접점이 타서 세척으로는 안 된다.',
    },
    {
      id: 'winding_open', comp: 'motor', name: '모터 코일 단선', fix: 'replace', minDay: 3,
      complaint: '켜도 아무 소리도 안 나요. 완전히 죽었어요.',
      ohm: '∞ (코일 단선)', loupe: '코일 인출선 한 가닥이 끊어져 있다.',
      lesson: '콘덴서 단자까지 220V가 오는데 웅 소리조차 없다. 코일 저항이 무한대.',
    },
    {
      id: 'cord_loose', comp: 'cord', name: '코드 속 단선', fix: 'replace', minDay: 2,
      complaint: '돌다가 툭 꺼지고, 코드를 건드리면 다시 돌아요.',
      ohm: '∞ · 코드를 구부리면 0.3Ω으로 튄다', loupe: '플러그 쪽 피복이 꺾인 자리에 금이 가 있다.',
      lesson: '단자대 입력부터 0V. 코드를 흔들면 살아났다 죽었다 한다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const v1 = c.power && cordOK ? 220 : 0;
    const v2 = c.sw > 0 && !(f.has('switch_pos') && c.sw === 2) ? v1 : 0;
    let fuse = !f.has('tfuse_open');
    let v3 = fuse ? v2 : 0;
    const coil = !f.has('winding_open');
    let energized = v3 > 0 && coil;
    const capOK = !f.has('cap_dead');
    const dry = f.has('bearing_dry');
    let spinning = energized && (capOK || c.nudge);
    if (energized && dry && spinning && c.warm && fuse) {
      s.blow.push({ id: 'tfuse_open', text: '한참 돌던 날개가 점점 느려지더니 뚝 멈췄다. 모터 쪽에서 탄내가 난다.' });
      fuse = false; v3 = 0; energized = false; spinning = false;
    }
    if (energized && !spinning && c.warm && fuse) {
      s.blow.push({ id: 'tfuse_open', text: '웅 소리만 내던 모터가 뜨겁게 달더니 소리가 뚝 끊겼다.' });
      fuse = false; v3 = 0; energized = false;
    }
    const speed = spinning ? SPEED[c.sw] * (dry ? 0.42 : 1) : 0;
    s.tp.t1 = volts(v1);
    s.tp.t2 = volts(v2);
    s.tp.t3 = volts(v3);
    s.tp.t4 = volts(v3);
    if (!c.power) s.obs.push('플러그가 뽑혀 있다.');
    else if (c.sw === 0) s.obs.push('속도 스위치가 꺼져 있다.');
    else if (!energized) s.obs.push('아무 소리도, 움직임도 없다.');
    else if (!spinning) s.obs.push('모터에서 웅— 소리만 나고 날개가 돌지 않는다.');
    else {
      if (!capOK) s.obs.push('손으로 밀어 주자 그제야 날개가 돌기 시작한다.');
      s.obs.push(dry ? '날개가 힘없이 느리게 돈다. 끼익— 쇳소리가 난다.' : `날개가 ${['', '살랑살랑', '시원하게', '세차게'][c.sw]} 돈다.`);
    }
    if (energized) s.ear.motor = spinning ? '고른 웅웅 소리.' : '웅— 하는 굵은 소리가 크다.';
    if (spinning && dry) s.ear.bearing = '끼익— 마른 쇳소리가 바로 여기서 난다.';
    if (energized && !spinning) s.heat.motor = c.warm ? 2 : 1;
    if (spinning) s.heat.motor = c.warm ? (dry ? 2 : 1) : 0;
    if (spinning && dry && c.warm) s.heat.bearing = 2;
    s.fx.spin = speed;
    s.fx.hum = energized && !spinning ? 0.7 : 0;
    s.fx.whirr = speed;
    s.fx.buzz = spinning && dry ? 0.35 : 0;
    return s;
  },
  feel(f, comp) {
    if (comp === 'blade' && f.has('bearing_dry')) return '손으로 돌리면 뻑뻑하고, 손을 떼면 금방 멈춘다.';
    return undefined;
  },
};
