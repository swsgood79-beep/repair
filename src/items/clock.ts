import type { ItemDef } from '../types';
import { blank } from './util';

export const clock: ItemDef = {
  id: 'clock',
  name: '괘종시계',
  minDay: 7,
  fee: [38000, 52000],
  power: { on: '태엽 감기', off: '태엽 풀기' },
  nudge: '진자 밀기',
  coverLabel: '문자판',
  cover: [224, 30, 192, 184],
  comps: [
    { id: 'hands', name: '바늘', short: '바늘', shape: 'hands', x: 298, y: 100, w: 44, h: 44, layer: 0, acts: ['adjust'], feel: 'firm', front: true },
    { id: 'barrel', name: '태엽통', short: '태엽통', shape: 'barrel', x: 234, y: 46, w: 54, h: 54, layer: 1, part: 9000, acts: ['replace'], feel: 'tight' },
    { id: 'train', name: '톱니바퀴', short: '톱니', shape: 'gear', x: 350, y: 44, w: 60, h: 96, layer: 1, acts: ['clean', 'adjust'], feel: 'smooth' },
    { id: 'escape', name: '탈진기', short: '탈진기', shape: 'escape', x: 290, y: 140, w: 62, h: 34, layer: 1, acts: ['adjust'] },
    { id: 'susp', name: '현수 스프링', short: '스프링', shape: 'spring', x: 312, y: 180, w: 18, h: 30, layer: 1, part: 2000, acts: ['replace'] },
    { id: 'pendulum', name: '진자', short: '진자', shape: 'pendulum', x: 288, y: 218, w: 64, h: 128, layer: 0, acts: [], hand: 'nudge' },
  ],
  tps: [
    { id: 'beat', label: '박자', x: 404, y: 300, layer: 0, kind: 'beat', unit: 's', expect: 0.5 },
    { id: 'amp', label: '진폭', x: 392, y: 344, layer: 0, kind: 'amp', unit: '°', expect: 8 },
  ],
  wires: [
    { pts: [[288, 74], [350, 74]], layer: 1, kind: 'm' },
    { pts: [[380, 140], [340, 150]], layer: 1, kind: 'm' },
    { pts: [[321, 174], [321, 180]], layer: 1, kind: 'm' },
  ],
  flow: [['barrel', 'train', 'escape', 'susp', 'pendulum'], ['beat', 'amp', 'hands']],
  faults: [
    {
      id: 'spring_broken', comp: 'barrel', name: '태엽 끊어짐', fix: 'replace', minDay: 7,
      complaint: '태엽이 안 감기고 헛돌아요.',
      feel: 'free',
      lesson: '감아도 헛돈다. 힘이 없다.',
    },
    {
      id: 'oil_gummy', comp: 'train', name: '굳은 기름', fix: 'clean', minDay: 7, latent: true,
      complaint: '좀 가다가 서요.',
      mark: 'gummy', fine: true, seen: '축마다 굳은 기름', feel: 'sticky',
      lesson: '진폭 4°로 작고, 지켜보면 선다. 세척.',
    },
    {
      id: 'out_of_beat', comp: 'escape', name: '박자 어긋남', fix: 'adjust', minDay: 7, latent: true,
      complaint: '똑딱이 절뚝거리고 서요.',
      lesson: '똑·딱 간격이 다르다. 앵커를 굽혀 맞춘다.',
    },
    {
      id: 'susp_broken', comp: 'susp', name: '현수 스프링 꺾임', fix: 'replace', minDay: 8,
      complaint: '진자를 밀어도 금방 멈춰요.',
      mark: 'kink', seen: '스프링이 꺾였다',
      lesson: '진자가 비뚤게 흔들리다 바로 멈춘다.',
    },
    {
      id: 'tooth_bent', comp: 'train', name: '톱니 휨', fix: 'adjust', minDay: 8, latent: true,
      complaint: '늘 15분쯤에 멈춰 있어요.',
      mark: 'bent', fine: true, seen: '톱니 하나가 휘었다', feel: 'catch',
      lesson: '같은 자리에서 선다. 돌리면 한 곳에서 걸린다.',
    },
    {
      id: 'hands_loose', comp: 'hands', name: '바늘 헐거움', fix: 'adjust', minDay: 7, latent: true,
      complaint: '똑딱은 하는데 시간이 안 가요.',
      mark: 'pin', fine: true, seen: '고정 핀이 빠졌다', feel: 'loose',
      lesson: '무브먼트는 도는데 바늘이 미끄러진다. 지켜봐야 안다.',
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
    let obs = !c.power ? '태엽이 풀려 있다' : f.has('spring_broken') ? '태엽이 헛돈다' : !c.nudge ? '진자가 멈춰 있다' : !hangs ? '비뚤게 흔들리다 멈춘다' : '';
    if (running && c.warm && (offBeat || gummy || f.has('tooth_bent'))) {
      running = false;
      obs = f.has('tooth_bent') ? '15분 근처에서 멈췄다' : gummy ? '진폭이 줄더니 멈췄다' : '절뚝이다 멈췄다';
    } else if (running) {
      obs = offBeat ? '똑…딱 절뚝인다' : gummy ? '흔들림이 좁다' : '똑딱똑딱';
      if (c.warm) obs = f.has('hands_loose') ? '10분이 지났는데 바늘이 그대로' : '10분, 바늘도 잘 간다';
    }
    s.obs = obs;
    s.tp.beat = running ? { v: offBeat ? 0.58 : 0.5, b: offBeat ? 0.42 : 0.5 } : { v: 0, b: 0 };
    s.tp.amp = { v: running ? amp : 0 };
    if (running) {
      s.ear.escape = offBeat ? 'limp' : 'tick';
      s.ear.train = f.has('tooth_bent') ? 'catch' : gummy ? 'drag' : 'tick';
      s.ear.pendulum = offBeat ? 'limp' : 'tick';
    }
    s.fx.swing = running ? amp / 8 : 0;
    s.fx.tick = running ? (offBeat ? 2 : 1) : 0;
    s.fx.hands = running && !(c.warm && f.has('hands_loose'));
    return s;
  },
};
