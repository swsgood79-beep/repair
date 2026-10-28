import type { ItemDef } from '../types';
import { blank } from './util';

export const clock: ItemDef = {
  id: 'clock',
  name: '괘종시계',
  minDay: 7,
  fee: [38000, 52000],
  blurb: '전기가 없는 태엽 시계. 테스터 대신 귀와 손끝, 눈으로 읽어야 한다.',
  power: { on: '태엽 감기', off: '태엽 풀기', state: ['감김', '풀림'] },
  nudge: '진자 밀기',
  coverLabel: '문자판 · 떼어내기',
  cover: [224, 30, 192, 184],
  body: [212, 16, 216, 352],
  comps: [
    { id: 'hands', name: '문자판·바늘', short: '바늘', shape: 'hands', x: 298, y: 100, w: 44, h: 44, layer: 0, front: true, acts: ['adjust'], look: '바늘이 단단히 고정돼 있다.', feel: '분침을 밀면 뻑뻑하게 따라 돈다.' },
    { id: 'barrel', name: '태엽통', shape: 'barrel', x: 234, y: 46, w: 54, h: 54, layer: 1, part: 9000, acts: ['replace'], look: '태엽통이 반듯하다.', feel: '열쇠로 감으면 점점 단단해진다.' },
    { id: 'train', name: '윤열 (톱니바퀴들)', short: '윤열', shape: 'gear', x: 350, y: 44, w: 60, h: 96, layer: 1, acts: ['clean', 'adjust'], look: '놋쇠 톱니가 깨끗하다.', feel: '손으로 돌리면 걸림 없이 부드럽게 돈다.' },
    { id: 'escape', name: '탈진기 (앵커)', short: '탈진기', shape: 'escape', x: 290, y: 140, w: 62, h: 34, layer: 1, acts: ['adjust'], look: '앵커 양쪽 날이 톱니에 고르게 걸린다.' },
    { id: 'susp', name: '현수 스프링', shape: 'spring', x: 312, y: 180, w: 18, h: 30, layer: 1, part: 2000, acts: ['replace'], look: '얇은 스프링이 곧다.' },
    { id: 'pendulum', name: '진자', shape: 'pendulum', x: 288, y: 218, w: 64, h: 128, layer: 0, acts: [], look: '진자가 곧게 매달려 있다.' },
  ],
  tps: [
    { id: 'beat', label: '박자 (케이스에 귀 대기)', x: 404, y: 300, layer: 0, kind: 'beat', note: '똑·딱 0.50초씩 고르게' },
    { id: 'amp', label: '진폭 눈금', x: 392, y: 344, layer: 0, kind: 'amp', note: '좌우 8° 안팎' },
  ],
  wires: [
    { pts: [[288, 74], [350, 74]], layer: 1, kind: 'm' },
    { pts: [[380, 140], [340, 150]], layer: 1, kind: 'm' },
    { pts: [[321, 174], [321, 180]], layer: 1, kind: 'm' },
  ],
  faults: [
    {
      id: 'spring_broken', comp: 'barrel', name: '태엽 끊어짐', fix: 'replace', minDay: 7,
      complaint: '태엽을 감아도 감기질 않고 헛돌아요.',
      feel: '열쇠가 아무 저항 없이 헛돈다.',
      lesson: '감아도 헛돌고 힘이 없다. 태엽통째 바꾼다.',
    },
    {
      id: 'oil_gummy', comp: 'train', name: '굳은 기름', fix: 'clean', minDay: 7, latent: true,
      complaint: '밥을 주면 좀 가다가 하루도 못 가서 서요.',
      feel: '손으로 돌리면 끈적하게 뻑뻑하다.', loupe: '축 구멍마다 갈색으로 굳은 기름이 엉겨 있다.',
      lesson: '진폭이 4°로 작고 한참 지나면 선다. 분해 세척 후 새 기름.',
    },
    {
      id: 'out_of_beat', comp: 'escape', name: '박자 어긋남', fix: 'adjust', minDay: 7, latent: true,
      complaint: '똑딱 소리가 절뚝거리고 금방 서요.',
      lesson: '똑·딱 간격이 다르다. 앵커를 살짝 굽혀 박자를 맞춘다.',
    },
    {
      id: 'susp_broken', comp: 'susp', name: '현수 스프링 꺾임', fix: 'replace', minDay: 8,
      complaint: '진자를 밀어도 몇 번 흔들리다 멈춰요.',
      look: '현수 스프링이 꺾여 진자가 비스듬히 매달렸다.',
      lesson: '진자가 비뚤게 흔들리다 바로 멈춘다.',
    },
    {
      id: 'tooth_bent', comp: 'train', name: '톱니 휨', fix: 'adjust', minDay: 8, latent: true,
      complaint: '매번 비슷한 시각에 멈춰 있어요. 꼭 15분쯤에요.',
      feel: '돌리다 보면 한 지점에서 턱 걸린다.', loupe: '네 번째 톱니바퀴의 이 하나가 살짝 휘었다.',
      lesson: '늘 같은 자리에서 선다. 손으로 돌리면 한 곳에서 걸린다. 세척으로는 안 된다.',
    },
    {
      id: 'hands_loose', comp: 'hands', name: '바늘 헐거움', fix: 'adjust', minDay: 7, latent: true,
      complaint: '똑딱 소리는 나는데 시간이 안 가요.',
      feel: '분침이 손가락에 힘없이 밀린다.', loupe: '분침 고정 핀이 빠져 있다.',
      lesson: '무브먼트는 멀쩡히 도는데 바늘이 미끄러진다. 지켜봐야 드러난다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const wound = c.power && !f.has('spring_broken');
    const hangs = !f.has('susp_broken');
    let running = wound && c.nudge && hangs;
    const offBeat = f.has('out_of_beat');
    const gummy = f.has('oil_gummy');
    const amp = gummy ? 4 : offBeat ? 6 : 8;
    if (!c.power) s.obs.push('태엽이 풀려 있다.');
    else if (f.has('spring_broken')) s.obs.push('열쇠를 돌려도 헛돈다. 태엽이 감기지 않는다.');
    else if (!c.nudge) s.obs.push('태엽은 감겼다. 진자가 멈춰 있다.');
    else if (!hangs) s.obs.push('진자가 비스듬히 흔들리다 몇 번 만에 멈춘다.');
    if (running && c.warm && (offBeat || gummy || f.has('tooth_bent'))) {
      running = false;
      s.obs.push(f.has('tooth_bent') ? '한참 지켜보니 분침이 15분 근처에서 멈춰 섰다.' : gummy ? '진폭이 점점 줄더니 진자가 멈췄다.' : '절뚝이던 진자가 결국 멈춰 섰다.');
    } else if (running) {
      s.obs.push(offBeat ? '똑…딱, 똑…딱. 박자가 절뚝인다.' : '진자가 흔들리며 똑딱거린다.');
      if (gummy) s.obs.push('진자가 흔들리는 폭이 좁다.');
      if (c.warm) s.obs.push(f.has('hands_loose') ? '10분을 지켜봤는데 분침이 그대로다.' : '10분 지켜보니 분침도 10분 앞으로 갔다.');
    }
    s.tp.beat = { value: running ? (offBeat ? '똑 0.58초 · 딱 0.42초 (불균일)' : '똑 0.50초 · 딱 0.50초') : '소리 없음' };
    s.tp.amp = { value: running ? `좌우 ${amp}°` : '0° (멈춤)' };
    if (running) {
      s.ear.escape = offBeat ? '앵커의 딱 소리가 한쪽으로 쏠린다.' : '똑·딱이 고르다.';
      s.ear.train = f.has('tooth_bent') ? '주기적으로 틱 걸리는 소리가 섞인다.' : gummy ? '둔하게 끄는 듯한 소리.' : '가는 톱니 소리.';
      s.ear.barrel = '조용하다.';
    }
    s.fx.swing = running ? amp / 8 : 0;
    s.fx.tick = running ? (offBeat ? 2 : 1) : 0;
    return s;
  },
};
