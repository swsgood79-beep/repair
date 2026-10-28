import type { Ctx, ItemDef } from '../types';
import { blank, josa, volts } from './util';

const STATIONS = [{ at: 0.27, name: '음악 방송' }, { at: 0.66, name: '뉴스' }];
const STUCK = 0.47;

function tuning(f: Set<string>, c: Ctx) {
  const pos = f.has('dial_cord') ? STUCK : c.knobA;
  const station = STATIONS.find(st => Math.abs(st.at - pos) < 0.05);
  return { pos, station };
}

export const radio: ItemDef = {
  id: 'radio',
  name: '진공관 라디오',
  minDay: 3,
  fee: [32000, 44000],
  blurb: '나무 상자에 진공관 다섯 알. 전원부와 신호부를 차례로 따라가야 한다.',
  power: { on: '플러그 꽂기', off: '플러그 뽑기', state: ['꽂힘', '뽑힘'] },
  sw: { label: '전원 스위치', options: ['끔', '켬'] },
  knobA: { label: '튜닝' },
  knobB: { label: '볼륨' },
  coverLabel: '뒷판 · 나사 6개',
  chassisLabel: '섀시 밑판 · 나사 4개',
  cover: [58, 98, 524, 236],
  chassis: [206, 284, 368, 54],
  body: [40, 30, 560, 320],
  comps: [
    { id: 'dial', name: '다이얼 (실 구동)', shape: 'dial', x: 200, y: 50, w: 380, h: 36, layer: 0, labelAbove: true, acts: ['adjust'], look: '바늘과 다이얼 실이 팽팽하다.', feel: '튜닝 노브를 돌리면 바늘이 부드럽게 따라온다.' },
    { id: 'speaker', name: '스피커 6.5인치', short: '스피커', shape: 'speaker', x: 70, y: 112, w: 124, h: 124, layer: 1, ohm: '약 3Ω', part: 6000, acts: ['replace'], look: '종이 콘이 온전하다.', note: '3Ω' },
    { id: 'xfmr', name: '전원 트랜스', short: '전원 트랜스', shape: 'xfmr', x: 214, y: 108, w: 82, h: 66, layer: 1, ohm: '1차 15Ω · 2차 90Ω', acts: [], look: '철심 트랜스. 탄 냄새는 없다.' },
    { id: 'rect', name: '정류관', short: '정류관', shape: 'tube', x: 310, y: 100, w: 34, h: 72, layer: 1, acts: [], look: '히터가 고르게 붉다.' },
    { id: 'fcap', name: '평활 콘덴서 40µF', short: '평활C', shape: 'cap', x: 356, y: 110, w: 44, h: 62, layer: 1, ohm: '바늘이 튀었다가 천천히 ∞로 돌아간다', part: 3000, acts: ['replace'], look: '알루미늄 캔. 겉이 반듯하다.', note: '튀었다 ∞로 가면 정상' },
    { id: 'rftube', name: '주파수 변환관', short: '변환관', shape: 'tube', x: 412, y: 100, w: 34, h: 72, layer: 1, acts: [], look: '게터 은막이 선명하다.' },
    { id: 'outtube', name: '출력관 6AR5', short: '출력관', shape: 'tube', x: 458, y: 100, w: 34, h: 72, layer: 1, part: 7000, acts: ['replace'], look: '게터(유리 위 은색 막)가 거울처럼 선명하다.' },
    { id: 'fuse', name: '퓨즈 1A', shape: 'fuse', x: 506, y: 112, w: 64, h: 22, layer: 1, ohm: '0Ω', part: 500, acts: ['replace'], look: '유리관 속 가는 선이 이어져 있다.', note: '정상 0Ω' },
    { id: 'otrans', name: '출력 트랜스', short: '출력 트랜스', shape: 'xfmr', x: 214, y: 216, w: 72, h: 44, layer: 1, ohm: '1차 250Ω · 2차 0.5Ω', acts: [], look: '작은 트랜스. 이상 없어 보인다.' },
    { id: 'pot', name: '볼륨 가변저항 500kΩ', short: '볼륨 VR', shape: 'pot', x: 318, y: 218, w: 46, h: 42, layer: 1, ohm: '0 → 500kΩ로 매끄럽게 변한다', part: 4000, acts: ['clean', 'replace'], look: '먼지가 조금 앉았다.', note: '매끄럽게 변하면 정상' },
    { id: 'board', name: '섀시 아래 납땜 러그', short: '납땜 러그', shape: 'board', x: 216, y: 290, w: 352, h: 36, layer: 2, acts: ['solder'], look: '납땜 러그가 줄지어 있다. 겉보기엔 멀쩡하다.' },
  ],
  tps: [
    { id: 't1', label: '퓨즈 뒤', x: 586, y: 150, layer: 1, kind: 'ac', note: '220V' },
    { id: 't2', label: '트랜스 2차', x: 256, y: 198, layer: 1, kind: 'ac', note: '250V' },
    { id: 't3', label: '정류 출력', x: 327, y: 198, layer: 1, kind: 'dc', note: '약 290V' },
    { id: 't4', label: 'B+ (평활 뒤)', x: 378, y: 198, layer: 1, kind: 'dc', note: '250V, 바늘 고정' },
    { id: 't5', label: '검파 출력', x: 429, y: 198, layer: 1, kind: 'sig', note: '방송 잡히면 0.8V' },
    { id: 't6', label: '출력관 플레이트', x: 475, y: 198, layer: 1, kind: 'sig', note: '방송 시 신호 3V' },
  ],
  wires: [
    { pts: [[570, 123], [586, 123], [586, 150]], layer: 1 },
    { pts: [[586, 150], [586, 94], [255, 94], [255, 108]], layer: 1 },
    { pts: [[256, 174], [256, 198], [378, 198]], layer: 1 },
    { pts: [[327, 172], [327, 198]], layer: 1 },
    { pts: [[378, 172], [378, 198]], layer: 1 },
    { pts: [[429, 172], [429, 198], [475, 198]], layer: 1, kind: 's' },
    { pts: [[475, 172], [475, 198], [520, 198], [520, 239], [364, 239]], layer: 1, kind: 's' },
    { pts: [[318, 239], [286, 239]], layer: 1, kind: 's' },
    { pts: [[214, 239], [194, 210]], layer: 1, kind: 's' },
    { pts: [[260, 308], [520, 308]], layer: 2 },
  ],
  faults: [
    {
      id: 'cap_short', comp: 'fcap', name: '평활 콘덴서 단락', fix: 'replace', minDay: 4, group: 'fcap',
      complaint: '켜자마자 퍽 소리가 나더니 그 뒤로 안 켜져요.',
      ohm: '0.5Ω (거의 붙어 있다)', look: '콘덴서 밑동에 기름 같은 것이 새어 나와 있다.',
      also: { id: 'fuse_blown', chance: 1, complaint: '켜자마자 퍽 소리가 나더니 그 뒤로 안 켜져요.' },
      lesson: '퓨즈를 갈아도 켜는 순간 다시 끊어진다. 새 퓨즈를 넣기 전에 콘덴서 저항부터 잴 것.',
    },
    {
      id: 'fuse_blown', comp: 'fuse', name: '퓨즈 단선', fix: 'replace', minDay: 3,
      complaint: '천둥 치던 날부터 아예 안 켜져요.',
      ohm: '∞ (끊김)', look: '유리관 속 선이 끊어졌고 안쪽이 검게 그을렸다.',
      lesson: '퓨즈 뒤부터 0V, 진공관 불도 안 들어온다. 그을음은 큰 전류가 흘렀다는 뜻.',
    },
    {
      id: 'cap_dry', comp: 'fcap', name: '평활 콘덴서 용량 감소', fix: 'replace', minDay: 3, group: 'fcap',
      complaint: '켜면 웅— 하는 소리가 커서 방송이 잘 안 들려요.',
      ohm: '바늘이 조금 튀다 만다', look: '알루미늄 캔 윗면이 불룩하게 부풀었다.',
      lesson: 'B+ 전압이 낮고 바늘이 떨린다. 볼륨을 줄여도 웅 소리가 그대로다.',
    },
    {
      id: 'tube_weak', comp: 'outtube', name: '출력관 노화', fix: 'replace', minDay: 3,
      complaint: '소리가 너무 작아요. 볼륨을 끝까지 올려야 겨우 들려요.',
      look: '히터 불빛이 옆 관보다 어둡다.', loupe: '게터 은막이 뿌옇게 하얗게 바랬다.',
      lesson: '검파 출력은 정상인데 플레이트 신호가 약하다. 게터가 하얗게 바래 있다.',
    },
    {
      id: 'pot_dirty', comp: 'pot', name: '볼륨 가변저항 오염', fix: 'clean', minDay: 3,
      complaint: '볼륨을 돌릴 때마다 드르륵 긁는 소리가 나고, 중간쯤에서 소리가 끊겨요.',
      ohm: '값이 군데군데 튀며 매끄럽지 않다',
      lesson: '돌릴 때 긁히고 중간 위치에서 끊긴다. 접점 세정으로 해결된다.',
    },
    {
      id: 'dial_cord', comp: 'dial', name: '다이얼 실 이탈', fix: 'adjust', minDay: 3,
      complaint: '다이얼을 돌려도 바늘이 안 움직여요. 방송을 못 맞춰요.',
      look: '다이얼 실이 풀리에서 빠져 늘어져 있다.', feel: '튜닝 노브가 헛돈다.',
      lesson: '노브가 헛돌고 바늘이 멈춘 자리의 잡음만 들린다. 실을 다시 걸고 장력을 맞춘다.',
    },
    {
      id: 'joint_cold', comp: 'board', name: '냉납 (열 간헐)', fix: 'solder', minDay: 5, latent: true,
      complaint: '처음엔 잘 나오다가 한 10분 지나면 소리가 뚝 끊겨요.',
      loupe: '출력관 소켓 러그 납땜 둘레에 둥근 금이 있다.',
      lesson: '차가울 땐 되다가 데워지면 끊긴다. 오래 켜 두거나 섀시 아래를 흔들어 재현한다.',
    },
    {
      id: 'speaker_torn', comp: 'speaker', name: '스피커 콘 찢어짐', fix: 'replace', minDay: 4,
      complaint: '소리를 키우면 지지직 떨리는 소리가 섞여요.',
      look: '종이 콘 가장자리가 3cm쯤 찢어졌다.',
      lesson: '큰 소리에서만 떨림 잡음. 플레이트 신호까지는 깨끗하다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const on = c.power && c.sw === 1;
    let fuse = !f.has('fuse_blown');
    if (on && fuse && f.has('cap_short')) {
      s.blow.push({ id: 'fuse_blown', text: '퍽! 켜는 순간 퓨즈가 번쩍하고 끊어졌다.' });
      fuse = false;
    }
    const pri = on && fuse ? 220 : 0;
    const sec = pri ? 250 : 0;
    const rect = sec ? 290 : 0;
    const dry = f.has('cap_dry');
    const bplus = rect ? (dry ? 212 : 250) : 0;
    const { pos, station } = tuning(f, c);
    const det = bplus ? (station ? 0.8 : 0.05) : 0;
    const jointOK = !f.has('joint_cold') || (!c.warm && c.wiggle !== 'board');
    const weak = f.has('tube_weak');
    const plate = bplus && jointOK ? det * (weak ? 0.3 : 1) * 3.75 : 0;
    const dirty = f.has('pot_dirty');
    const dropout = dirty && c.knobB > 0.42 && c.knobB < 0.6;
    const out = dropout ? 0 : (plate / 3) * c.knobB;
    const hum = bplus ? (dry ? 0.85 : 0.04) : 0;

    s.tp.t1 = volts(pri);
    s.tp.t2 = volts(sec);
    s.tp.t3 = volts(rect, rect > 0);
    s.tp.t4 = volts(bplus, dry && bplus > 0);
    s.tp.t5 = { value: det ? (station ? '0.8V 교류 신호' : '0.05V 잡음뿐') : '0V' };
    s.tp.t6 = { value: plate ? `${plate.toFixed(1)}V 교류 신호${weak && station ? ' (약함)' : ''}` : '0V' };

    if (!c.power) s.obs.push('플러그가 뽑혀 있다.');
    else if (c.sw !== 1) s.obs.push('전원 스위치가 꺼져 있다.');
    else if (!fuse) s.obs.push('다이얼 램프도 진공관도 불이 들어오지 않는다.');
    else {
      s.obs.push(weak ? '진공관 히터가 주황빛으로 달아오른다. 출력관 하나만 유난히 어둡다.' : '다이얼 램프가 켜지고 진공관 히터가 주황빛으로 달아오른다.');
      if (dry) s.obs.push('웅— 하는 굵은 험 소리가 계속 난다. 볼륨을 줄여도 그대로다.');
      if (f.has('dial_cord')) s.obs.push('튜닝 노브를 돌려도 바늘이 꿈쩍하지 않는다.');
      if (!jointOK) s.obs.push(c.wiggle === 'board' ? '섀시를 건드리자 소리가 뚝 끊겼다.' : '한참 켜 두었더니 소리가 뚝 끊겼다.');
      else if (c.knobB < 0.05) s.obs.push('볼륨이 0이라 조용하다.');
      else if (dropout) s.obs.push('이 볼륨 위치에서는 소리가 완전히 끊긴다.');
      else if (station) {
        s.obs.push(weak ? `${josa(station.name, "이", "가")} 들리지만 작고 멀게 들린다.` : `${josa(station.name, "이", "가")} 또렷하게 들린다.`);
        if (f.has('speaker_torn') && out > 0.35) s.obs.push('소리를 키우자 지지직 종이 떨리는 잡음이 섞인다.');
      } else s.obs.push('치익— 방송 사이의 잡음만 들린다.');
      if (dirty && c.moved) s.obs.push('볼륨을 돌리는 동안 드르륵 긁는 소리가 났다.');
    }
    if (sec) {
      s.heat.rect = 2; s.heat.rftube = 1; s.heat.outtube = weak ? 1 : 2; s.heat.xfmr = c.warm ? 1 : 0;
      s.ear.xfmr = dry ? '웅 소리가 트랜스 주변에서 크게 울린다.' : '아주 낮게 웅웅거린다 (정상).';
      if (dry) s.ear.fcap = '콘덴서 쪽에서 웅 하는 진동이 느껴진다.';
      if (out > 0 && f.has('speaker_torn')) s.ear.speaker = '콘 가장자리에서 종이가 떨리는 지지직 소리.';
      else if (out > 0) s.ear.speaker = station ? '방송 소리가 나온다.' : '잡음이 나온다.';
      if (dirty) s.ear.pot = '노브를 돌리면 이 안에서 드르륵 소리가 난다.';
    }
    s.fx.glow = sec ? { rect: 1, rftube: 1, outtube: weak ? 0.35 : 1, dial: 1 } : {};
    s.fx.hum = hum;
    s.fx.noise = jointOK && bplus && !station && !dropout ? 0.4 * c.knobB : 0;
    s.fx.tone = station ? out : 0;
    s.fx.crackle = dirty && c.moved && bplus ? 0.8 : 0;
    s.fx.buzz = f.has('speaker_torn') && out > 0.35 ? 0.5 : 0;
    s.fx.pointer = pos;
    return s;
  },
  inject(f, c, tp) {
    if (tp !== 't5' && tp !== 't6') return '신호 주입기는 신호 단(검파 출력, 출력관 플레이트)에 대야 한다.';
    const on = c.power && c.sw === 1 && !f.has('fuse_blown');
    if (!on) return '아무 소리도 없다. 진공관에 전원이 들어와 있어야 한다.';
    if (f.has('joint_cold') && (c.warm || c.wiggle === 'board')) return '아무 소리도 없다. 출력관 뒤쪽이 끊겨 있다.';
    if (c.knobB < 0.05 && tp === 't5') return '볼륨이 0이다. 볼륨을 올리고 다시 대 보자.';
    if (tp === 't5' && f.has('pot_dirty') && c.knobB > 0.42 && c.knobB < 0.6) return '이 볼륨 위치에서는 삐 소리가 끊긴다.';
    const weak = tp === 't5' && f.has('tube_weak');
    const torn = f.has('speaker_torn');
    return `스피커에서 삐— 소리가 ${weak ? '아주 작게' : '또렷하게'} 난다${torn ? '. 종이 떨리는 잡음이 섞인다' : ''}.`;
  },
};
