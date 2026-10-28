import type { ItemDef } from '../types';
import { blank } from './util';

export const phone: ItemDef = {
  id: 'phone',
  name: '다이얼 전화기',
  minDay: 9,
  fee: [30000, 42000],
  power: { on: '전화선 꽂기', off: '전화선 빼기' },
  sw: ['놓음', '듦'],
  nudge: '벨 시험',
  coverLabel: '밑판',
  cover: [170, 220, 300, 120],
  comps: [
    { id: 'cord', name: '전화선', short: '전화선', shape: 'cord', x: 60, y: 300, w: 90, h: 22, layer: 0, ohm: 0.5, part: 1500, acts: ['replace'], feel: 'soft' },
    { id: 'mic', name: '카본 송화기', short: '송화기', shape: 'mic', x: 176, y: 70, w: 54, h: 50, layer: 0, part: 2000, acts: ['clean', 'replace'] },
    { id: 'handset', name: '수화기', short: '수화기', shape: 'handset', x: 236, y: 76, w: 170, h: 36, layer: 0, acts: [], hand: 'switch' },
    { id: 'hook', name: '후크 스위치', short: '후크', shape: 'switch', x: 420, y: 128, w: 54, h: 30, layer: 0, part: 2500, acts: ['clean', 'replace'], feel: 'crisp' },
    { id: 'rotary', name: '다이얼 접점', short: '다이얼', shape: 'rotary', x: 260, y: 140, w: 120, h: 76, layer: 0, acts: ['clean'], feel: 'smooth' },
    { id: 'bell', name: '벨 코일', short: '벨', shape: 'bell', x: 190, y: 240, w: 70, h: 70, layer: 1, ohm: 1000, part: 4000, acts: ['replace'] },
    { id: 'board', name: '회로판', short: '회로판', shape: 'board', x: 300, y: 250, w: 150, h: 60, layer: 1, acts: ['solder'] },
  ],
  tps: [
    { id: 't1', label: '선로 입력', x: 180, y: 320, layer: 1, kind: 'volt', unit: 'V', expect: 48 },
    { id: 't2', label: '후크 뒤(들고)', x: 470, y: 240, layer: 1, kind: 'volt', unit: 'V', expect: 8 },
    { id: 't3', label: '벨 단자(시험)', x: 280, y: 300, layer: 1, kind: 'volt', unit: 'V', expect: 75 },
    { id: 't4', label: '송화 신호', x: 450, y: 320, layer: 1, kind: 'sig', unit: 'V', expect: 0.3 },
  ],
  wires: [
    { pts: [[150, 311], [180, 320], [225, 310]], layer: 1 },
    { pts: [[180, 320], [300, 280]], layer: 1 },
    { pts: [[447, 158], [470, 240], [450, 280]], layer: 1 },
    { pts: [[450, 280], [450, 320]], layer: 1, kind: 's' },
  ],
  flow: [['cord', 't1', 'hook', 't2', 'board', 'rotary'], ['t3', 'bell'], ['mic', 't4', 'handset']],
  faults: [
    {
      id: 'hook_dirty', comp: 'hook', name: '후크 접점 오염', fix: 'clean', minDay: 9,
      complaint: '수화기를 들어도 뚜— 소리가 안 나요.',
      mark: 'dirty', seen: '접점에 녹색 때', ohm: { v: Infinity, flicker: true },
      lesson: '선로 48V는 오는데 들어도 후크 뒤 0V. 후크를 흔들면 살아난다.',
    },
    {
      id: 'dial_dirty', comp: 'rotary', name: '다이얼 접점 오염', fix: 'clean', minDay: 9,
      complaint: '번호를 돌리면 엉뚱한 데로 걸려요.',
      mark: 'dirty', fine: true, seen: '펄스 접점에 기름때', feel: 'sticky',
      lesson: '신호음은 정상인데 다이얼이 끈적하고 번호가 틀어진다.',
    },
    {
      id: 'bell_open', comp: 'bell', name: '벨 코일 끊김', fix: 'replace', minDay: 9,
      complaint: '전화가 와도 벨이 안 울려요.',
      mark: 'snapped', fine: true, seen: '코일 선이 끊어졌다', ohm: { v: Infinity },
      lesson: '벨 시험 때 벨 단자에 75V가 오는데 조용하다. 코일 ∞.',
    },
    {
      id: 'mic_packed', comp: 'mic', name: '카본 알갱이 뭉침', fix: 'clean', minDay: 10,
      complaint: '제 말이 저쪽에 안 들린대요.',
      mark: 'gummy', fine: true, seen: '카본 알갱이가 뭉쳐 굳었다',
      lesson: '신호음은 들리는데 송화 신호가 거의 0. 송화기를 털고 닦는다.',
    },
    {
      id: 'board_cold', comp: 'board', name: '회로판 냉납', fix: 'solder', minDay: 10, latent: true,
      complaint: '통화하다 가끔 뚝뚝 끊겨요.',
      mark: 'crack', fine: true, seen: '납땜에 둥근 금',
      lesson: '가만두면 멀쩡하다. 회로판을 흔들면 신호음이 끊긴다.',
    },
    {
      id: 'cord_loose', comp: 'cord', name: '전화선 단선', fix: 'replace', minDay: 9,
      complaint: '아예 먹통이에요. 선을 만지면 가끔 돼요.',
      mark: 'frayed', fine: true, seen: '선 속이 꺾였다', ohm: { v: Infinity, flicker: true },
      lesson: '선로 입력부터 0V. 선을 흔들면 살아난다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const cordOK = !f.has('cord_loose') || c.wiggle === 'cord';
    const line = c.power && cordOK ? 48 : 0;
    const off = c.sw === 1;
    const hookOK = !f.has('hook_dirty') || c.wiggle === 'hook';
    const loop = off && line > 0 && hookOK;
    const boardOK = !(f.has('board_cold') && c.wiggle === 'board');
    const tone = loop && boardOK;
    const ringing = !off && line > 0 && c.nudge;
    const bellOK = !f.has('bell_open');
    s.tp.t1 = { v: off && loop ? 8 : line };
    s.tp.t2 = { v: loop ? 8 : 0 };
    s.tp.t3 = { v: ringing ? 75 : 0 };
    s.tp.t4 = { v: tone ? (f.has('mic_packed') ? 0.02 : 0.3) : 0 };
    if (!c.power) s.obs = '전화선이 빠져 있다';
    else if (!line) s.obs = '아무 소리도 없다';
    else if (off) s.obs = !tone ? '수화기에서 아무 소리도 없다' : `뚜— 신호음${f.has('dial_dirty') ? ' · 번호가 엉뚱하게 걸린다' : ''}${f.has('mic_packed') ? ' · 말소리가 안 간다' : ''}`;
    else s.obs = ringing ? (bellOK ? '따르르릉! 벨이 울린다' : '벨 시험 중… 조용하다') : '수화기가 놓여 있다';
    if (tone) s.ear.handset = 'dialtone';
    if (ringing && bellOK) s.ear.bell = 'ring';
    if (tone && f.has('dial_dirty')) s.ear.rotary = 'crackle';
    else if (tone) s.ear.rotary = 'click';
    s.fx.dial = tone ? 1 : 0;
    s.fx.ring = ringing && bellOK ? 1 : 0;
    return s;
  },
};
