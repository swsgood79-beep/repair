import type { ItemDef } from '../types';
import { blank, volts } from './util';

export const cassette: ItemDef = {
  id: 'cassette',
  name: '휴대용 카세트',
  minDay: 5,
  fee: [18000, 26000],
  blurb: '건전지 네 알로 도는 휴대용 플레이어. 전기와 고무, 기계가 한데 섞여 있다.',
  power: { on: '건전지 넣기', off: '건전지 빼기', state: ['넣음', '뺌'] },
  sw: { label: '조작 키', options: ['정지', '재생'] },
  knobB: { label: '볼륨' },
  nudge: '모터 톡 치기',
  coverLabel: '하판 · 나사 5개',
  cover: [100, 176, 462, 108],
  body: [84, 60, 486, 282],
  comps: [
    { id: 'keys', name: '조작 키', shape: 'switch', x: 118, y: 72, w: 176, h: 28, layer: 0, acts: [], look: '재생·정지·빨리감기 키. 걸림 없이 눌린다.' },
    { id: 'head', name: '재생 헤드', shape: 'head', x: 296, y: 120, w: 64, h: 30, layer: 0, acts: ['clean'], look: '헤드 면이 은색으로 반짝인다.' },
    { id: 'roller', name: '핀치 롤러', shape: 'roller', x: 382, y: 116, w: 36, h: 36, layer: 0, part: 1500, acts: ['clean', 'replace'], look: '검은 고무가 말랑하고 무광이다.', feel: '고무를 누르면 살짝 들어간다.' },
    { id: 'speaker', name: '내장 스피커', shape: 'speaker', x: 458, y: 72, w: 84, h: 84, layer: 0, acts: [], look: '작은 스피커. 이상 없어 보인다.' },
    { id: 'battery', name: '건전지함 1.5V×4', shape: 'battery', x: 112, y: 292, w: 150, h: 42, layer: 0, acts: ['clean'], look: '단자가 깨끗하다.' },
    { id: 'amp', name: '앰프 기판', shape: 'board', x: 128, y: 186, w: 116, h: 62, layer: 1, acts: [], look: '부품이 빼곡한 작은 기판. 탄 자국은 없다.' },
    { id: 'motor', name: 'DC 모터', shape: 'motor', x: 300, y: 196, w: 58, h: 58, layer: 1, ohm: '약 12Ω', part: 4000, acts: ['replace'], look: '은색 소형 모터.', note: '정상 12Ω' },
    { id: 'belt', name: '고무 벨트', shape: 'belt', x: 372, y: 190, w: 116, h: 74, layer: 1, part: 800, acts: ['replace'], look: '벨트가 팽팽하게 걸려 있다.', feel: '손가락으로 누르면 탱탱하게 버틴다.' },
  ],
  tps: [
    { id: 't1', label: '전원 입력 (기판 쪽)', x: 262, y: 200, layer: 1, kind: 'dc', note: '6V' },
    { id: 't2', label: '모터 단자', x: 330, y: 270, layer: 1, kind: 'dc', note: '재생 시 6V' },
    { id: 't3', label: '헤드 출력', x: 290, y: 186, layer: 1, kind: 'sig', note: '재생 중 2mV' },
    { id: 't4', label: '앰프 출력', x: 258, y: 238, layer: 1, kind: 'sig', note: '재생 중 0.5V' },
  ],
  wires: [
    { pts: [[186, 292], [186, 280], [262, 200], [244, 200]], layer: 1 },
    { pts: [[262, 200], [262, 270], [330, 270], [330, 254]], layer: 1 },
    { pts: [[328, 150], [290, 186], [244, 210]], layer: 1, kind: 's' },
    { pts: [[244, 238], [258, 238], [458, 150]], layer: 1, kind: 's' },
  ],
  faults: [
    {
      id: 'contacts', comp: 'battery', name: '건전지 단자 부식', fix: 'clean', minDay: 5,
      complaint: '건전지를 새로 넣어도 안 켜져요.',
      look: '단자에 하얀 가루가 피어 있다. 건전지 누액 자국이다.',
      lesson: '전원 입력(기판 쪽)이 0V. 건전지함을 흔들면 잠깐 살아나기도 한다.',
    },
    {
      id: 'belt_loose', comp: 'belt', name: '벨트 늘어짐', fix: 'replace', minDay: 5, group: 'belt',
      complaint: '소리가 늘어지고 울렁울렁해요.',
      look: '벨트 표면이 번들거리고 헐겁다.', feel: '누르면 힘없이 축 처진다.',
      lesson: '모터 전압은 정상인데 테이프 속도가 느리고 울렁인다.',
    },
    {
      id: 'belt_broken', comp: 'belt', name: '벨트 끊어짐', fix: 'replace', minDay: 5, group: 'belt',
      complaint: '재생을 누르면 윙 소리만 나고 테이프가 안 돌아요.',
      look: '벨트가 끊어져 바닥에 떨어져 있다.',
      lesson: '모터는 헛돌고 릴은 멈춰 있다.',
    },
    {
      id: 'head_dirty', comp: 'head', name: '헤드 오염', fix: 'clean', minDay: 5,
      complaint: '소리가 먹먹해요. 이불을 덮어놓은 것 같아요.',
      look: '헤드 면이 약간 누렇다.', loupe: '헤드 틈새에 갈색 산화막이 끼어 있다.',
      lesson: '속도는 정상인데 헤드 출력이 낮고 소리가 먹먹하다.',
    },
    {
      id: 'roller_hard', comp: 'roller', name: '핀치 롤러 경화', fix: 'replace', minDay: 6, latent: true,
      complaint: '가끔 테이프를 씹어 먹어요.',
      look: '고무가 반들반들 윤이 난다.', feel: '고무가 돌처럼 딱딱하다.',
      lesson: '처음엔 멀쩡하다가 오래 돌리면 테이프가 롤러에 감겨 들어간다. 세척으로는 안 된다.',
    },
    {
      id: 'motor_brush', comp: 'motor', name: '모터 브러시 마모', fix: 'replace', minDay: 6,
      complaint: '재생을 눌러도 가만히 있다가, 툭 치면 그제야 돌아요.',
      ohm: '∞와 12Ω 사이를 오락가락',
      lesson: '모터 단자에 6V가 오는데 멈춰 있다. 툭 치면 돈다.',
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
    const head = playing ? (dirty ? 0.6 : 2) : 0;
    const amp = playing ? (dirty ? 0.15 : 0.5) : 0;
    s.tp.t1 = volts(v1);
    s.tp.t2 = volts(v2);
    s.tp.t1.value = v1 ? '6.0V' : '0V';
    s.tp.t2.value = v2 ? '6.0V' : '0V';
    s.tp.t3 = { value: head ? `${head}mV 신호${loose ? ' (세기가 출렁인다)' : ''}` : '0mV' };
    s.tp.t4 = { value: amp ? `${amp}V 신호` : '0V' };
    if (!c.power) s.obs.push('건전지가 빠져 있다.');
    else if (c.sw !== 1) s.obs.push('정지 상태다.');
    else if (!v2) s.obs.push('재생 키를 눌러도 아무 반응이 없다.');
    else if (!motorRun) s.obs.push('재생 키는 눌렸는데 모터도 릴도 조용하다.');
    else if (!tape) s.obs.push('윙— 모터 도는 소리만 나고 릴은 멈춰 있다.');
    else if (eaten) s.obs.push('한참 돌던 테이프가 롤러에 감겨 들어가 엉켰다!');
    else {
      if (f.has('motor_brush')) s.obs.push('툭 쳐 주자 모터가 돌기 시작했다.');
      s.obs.push(loose ? '릴이 돌지만 노래가 느리게 늘어지고 울렁인다.' : '릴이 고르게 돌며 노래가 나온다.');
      if (dirty) s.obs.push('소리가 먹먹하고 고음이 거의 없다.');
      if (c.knobB < 0.05) s.obs.push('볼륨이 0이라 조용하다.');
    }
    if (motorRun) s.ear.motor = tape ? '윙— 일정한 모터 소리.' : '모터가 헛도는 높은 윙 소리.';
    if (playing) s.ear.speaker = dirty ? '먹먹한 노래 소리.' : '노래가 나온다.';
    if (playing && loose) s.ear.belt = '벨트가 미끄러지는 듯 사각거린다.';
    if (motorRun) s.heat.motor = c.warm ? 1 : 0;
    s.fx.spin = playing ? (loose ? 0.6 : 1) : 0;
    s.fx.wobble = loose;
    s.fx.whirr = motorRun ? 0.25 : 0;
    s.fx.tone = playing ? c.knobB * (dirty ? 0.4 : 0.8) : 0;
    return s;
  },
};
