import type { ItemDef } from '../types';
import { blank } from './util';

/**
 * 전자계산기: 전지 → 전원 키 → 계산 칩 → 띠 케이블 → 표시창.
 * 소리가 없는 디지털 물건이라 표시창 모양과 측정값으로 추리한다.
 */
export const calc: ItemDef = {
  id: 'calc',
  name: '전자계산기',
  minDay: 14,
  fee: [28000, 40000],
  power: { on: '전지 넣기', off: '전지 빼기' },
  sw: ['OFF', 'ON'],
  nudge: '계산 시험',
  coverLabel: '뒷판',
  cover: [190, 40, 260, 300],
  comps: [
    { id: 'batt', name: '전지함', short: '전지', shape: 'battery', x: 60, y: 140, w: 100, h: 44, layer: 0, ohm: 0, acts: ['clean'], hand: 'power' },
    { id: 'onkey', name: '전원 키', short: 'ON 키', shape: 'switch', x: 470, y: 90, w: 40, h: 40, layer: 0, acts: [], hand: 'switch' },
    { id: 'lcd', name: '표시창', short: '표시창', shape: 'lcd', x: 210, y: 56, w: 220, h: 70, layer: 0, part: 5000, acts: ['replace'], front: true },
    { id: 'keypad', name: '키패드', short: '키패드', shape: 'keypad', x: 210, y: 140, w: 220, h: 180, layer: 0, acts: ['clean'], feel: 'crisp', front: true },
    { id: 'chip', name: '계산 칩', short: '칩', shape: 'chip', x: 270, y: 180, w: 90, h: 60, layer: 1, part: 9000, acts: ['replace'] },
    { id: 'ribbon', name: '띠 케이블', short: '띠케이블', shape: 'ribbon', x: 230, y: 120, w: 170, h: 26, layer: 1, part: 2000, acts: ['replace'] },
    { id: 'board', name: '기판', short: '기판', shape: 'board', x: 220, y: 260, w: 200, h: 50, layer: 1, acts: ['solder'] },
  ],
  tps: [
    { id: 't1', label: '전원', x: 210, y: 210, layer: 1, kind: 'volt', unit: 'V', expect: 3 },
    { id: 't2', label: '칩 클럭', x: 390, y: 200, layer: 1, kind: 'sig', unit: 'V', expect: 0.5 },
    { id: 't3', label: '표시 구동', x: 420, y: 140, layer: 1, kind: 'sig', unit: 'V', expect: 3 },
  ],
  wires: [
    { pts: [[160, 162], [210, 210], [270, 210]], layer: 1 },
    { pts: [[360, 210], [390, 200]], layer: 1, kind: 's' },
    { pts: [[315, 180], [315, 146]], layer: 1, kind: 's' },
    { pts: [[400, 133], [420, 140]], layer: 1, kind: 's' },
    { pts: [[490, 130], [430, 230], [360, 230]], layer: 1 },
  ],
  flow: [['batt', 't1', 'onkey', 'chip', 't2', 'board', 't3', 'ribbon', 'lcd'], ['keypad']],
  faults: [
    {
      id: 'term_rust', comp: 'batt', name: '전지 단자 녹', fix: 'clean', minDay: 14,
      complaint: '새 전지를 넣어도 안 켜져요.',
      mark: 'rust', seen: '단자에 푸른 녹이 슬었다', ohm: { v: Infinity, flicker: true },
      lesson: '전지를 넣어도 전원 0V. 단자 저항이 오락가락. 녹을 닦는다.',
    },
    {
      id: 'chip_dead', comp: 'chip', name: '계산 칩 고장', fix: 'replace', minDay: 14,
      complaint: '켜지긴 하는 것 같은데 화면이 비어 있어요.',
      mark: 'burnt', fine: true, seen: '칩 가운데가 누렇게 탔다',
      lesson: '전원 3V는 오는데 칩 클럭이 0. 칩이 일을 안 한다.',
    },
    {
      id: 'ribbon_open', comp: 'ribbon', name: '띠 케이블 들뜸', fix: 'replace', minDay: 14,
      complaint: '숫자 획이 군데군데 빠져 보여요.',
      mark: 'torn', fine: true, seen: '띠 케이블 줄 몇 개가 끊어졌다',
      lesson: '표시 구동은 3V로 정상인데 획이 빠진다. 신호가 표시창까지 다 못 간다.',
    },
    {
      id: 'key_dirty', comp: 'keypad', name: '키 고무 접점 오염', fix: 'clean', minDay: 14,
      complaint: '몇몇 숫자 키가 안 눌려요.',
      mark: 'dirty', fine: true, seen: '고무 접점에 때가 꼈다', feel: 'mushy',
      lesson: '12+34=를 눌렀는데 16이 나온다. 3 키가 안 먹는다. 키 접점을 닦는다.',
    },
    {
      id: 'lcd_faded', comp: 'lcd', name: '표시창 수명', fix: 'replace', minDay: 15,
      complaint: '숫자가 흐릿하게 번져요.',
      mark: 'faded', seen: '표시창 안이 누렇게 바랬다',
      lesson: '구동은 정상인데 숫자가 희미하다. 표시창 자체를 바꾼다.',
    },
    {
      id: 'board_cold', comp: 'board', name: '기판 냉납', fix: 'solder', minDay: 15, latent: true,
      complaint: '두드리면 화면이 꺼졌다 켜졌다 해요.',
      mark: 'crack', fine: true, seen: '납땜에 둥근 금',
      lesson: '평소엔 멀쩡하다. 기판을 흔들면 표시가 꺼진다.',
    },
  ],
  sim(f, c) {
    const s = blank();
    const v = c.power && !f.has('term_rust') ? 3 : 0;
    const on = v > 0 && c.sw === 1;
    const clk = on && !f.has('chip_dead') ? 0.5 : 0;
    const drive = clk && !(f.has('board_cold') && c.wiggle === 'board') ? 3 : 0;
    s.tp.t1 = { v };
    s.tp.t2 = { v: clk };
    s.tp.t3 = { v: drive };
    const result = f.has('key_dirty') ? '16' : '46';
    const text = c.nudge ? result : '0';
    if (!c.power) s.obs = '전지가 빠져 있다';
    else if (!v) s.obs = '전지를 넣었는데 아무 반응이 없다';
    else if (c.sw === 0) s.obs = '꺼져 있다 · ON 키를 눌러 보자';
    else if (!clk) s.obs = '켰는데 화면이 텅 비었다';
    else if (!drive) s.obs = '화면이 툭 꺼졌다';
    else {
      const parts = [c.nudge ? `12+34= → ${result}` : '0이 떠 있다'];
      if (c.nudge && f.has('key_dirty')) parts.push('3 키가 안 먹었다');
      if (f.has('ribbon_open')) parts.push('숫자 획이 군데군데 빠졌다');
      if (f.has('lcd_faded')) parts.push('숫자가 희미하게 번졌다');
      s.obs = parts.join(' · ');
    }
    s.fx.lcd = drive ? { text, miss: f.has('ribbon_open'), dim: f.has('lcd_faded') } : { text: '' };
    if (on) s.ear.keypad = 'click';
    return s;
  },
};
