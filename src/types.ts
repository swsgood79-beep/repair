/** 수리 동작. 교체는 그 부품의 모든 고장을 없애지만 돈이 든다. */
export type Action = 'replace' | 'clean' | 'solder' | 'oil' | 'adjust';

export type ToolId = 'look' | 'loupe' | 'volt' | 'ohm' | 'ear' | 'wiggle' | 'touch' | 'inject' | 'mark' | 'repair';

export type Shape =
  | 'plug' | 'cord' | 'switch' | 'fuse' | 'xfmr' | 'cap' | 'tube' | 'pot' | 'speaker'
  | 'bulb' | 'socket' | 'joint' | 'motor' | 'belt' | 'bearing' | 'blade' | 'gear'
  | 'spring' | 'pendulum' | 'escape' | 'head' | 'battery' | 'roller' | 'board' | 'dial' | 'hands' | 'barrel';

/** 0: 겉에서 보임, 1: 덮개를 열면 보임, 2: 섀시를 빼야 보임 */
export type Layer = 0 | 1 | 2;

export interface Comp {
  id: string;
  name: string;
  shape: Shape;
  x: number; y: number; w: number; h: number;
  layer: Layer;
  /** 전원을 끄고 저항계로 쟀을 때 정상값 */
  ohm?: string;
  /** 정상일 때 눈으로 본 모습 */
  look?: string;
  /** 정상일 때 손으로 만지거나 돌려 본 느낌 */
  feel?: string;
  /** 교체 부품 값 (원). 없으면 교체 불가 */
  part?: number;
  acts: Action[];
  /** 할아버지 수첩의 연필 메모 */
  note?: string;
  /** 작업대에 표시할 짧은 이름 */
  short?: string;
  labelAbove?: boolean;
  /** 앞면 부품: 덮개를 닫았을 때만 손이 닿는다 */
  front?: boolean;
}

export interface TestPoint {
  id: string;
  label: string;
  x: number; y: number;
  layer: Layer;
  /** dc/ac/sig: 테스터, beat: 귀, amp: 눈 */
  kind: 'dc' | 'ac' | 'sig' | 'beat' | 'amp';
  note?: string;
}

export interface Wire { pts: [number, number][]; layer: Layer; kind?: 'p' | 's' | 'm' }

export interface Fault {
  id: string;
  comp: string;
  name: string;
  fix: Action;
  minDay: number;
  /** 같은 그룹 고장은 동시에 생기지 않는다 */
  group?: string;
  /** 손님이 하는 말 */
  complaint: string;
  look?: string;
  loupe?: string;
  ohm?: string;
  feel?: string;
  /** 카운터에서 잠깐 켜 봐서는 드러나지 않는 고장 */
  latent?: boolean;
  /** 원인 고장이 결과 고장을 함께 일으킴 */
  also?: { id: string; chance: number; complaint: string };
  /** 연쇄 결과로만 생기는 고장 */
  consequence?: boolean;
  /** 고장 도감 설명 */
  lesson: string;
}

export interface Ctx {
  power: boolean;
  sw: number;
  knobA: number;
  knobB: number;
  wiggle: string | null;
  warm: boolean;
  nudge: boolean;
  /** 이번 조작에서 볼륨을 돌렸는가 */
  moved: boolean;
}

export interface Reading { value: string; shaky?: boolean }

export interface FX {
  glow?: Record<string, number>;
  spin?: number;
  wobble?: boolean;
  hum?: number;
  noise?: number;
  tone?: number;
  crackle?: number;
  tick?: number;
  swing?: number;
  buzz?: number;
  whirr?: number;
  pointer?: number;
}

export interface Sim {
  tp: Record<string, Reading>;
  obs: string[];
  heat: Record<string, number>;
  /** 귀를 대었을 때 들리는 소리 */
  ear: Record<string, string>;
  /** 이 상태에서 새로 생기는 고장 (퓨즈 끊어짐 등) */
  blow: { id: string; text: string }[];
  fx: FX;
}

export interface Control { label: string; options?: string[] }

export interface ItemDef {
  id: string;
  name: string;
  minDay: number;
  fee: [number, number];
  blurb: string;
  power: { on: string; off: string; state: [string, string] };
  sw?: Control & { options: string[] };
  knobA?: Control;
  knobB?: Control;
  nudge?: string;
  coverLabel: string;
  chassisLabel?: string;
  /** 덮개, 섀시가 가리는 영역 */
  cover: [number, number, number, number];
  chassis?: [number, number, number, number];
  body: [number, number, number, number];
  comps: Comp[];
  tps: TestPoint[];
  wires: Wire[];
  faults: Fault[];
  sim(f: Set<string>, c: Ctx): Sim;
  /** 고장에 따라 다른 부품에서 느껴지는 감촉 (예: 베어링이 마르면 날개가 뻑뻑) */
  feel?(f: Set<string>, comp: string): string | undefined;
  /** 신호 주입기를 대었을 때 스피커 반응 */
  inject?(f: Set<string>, c: Ctx, tp: string): string;
}

export interface LogEntry { t: number; text: string; kind: 'obs' | 'measure' | 'repair' | 'event' | 'note' }

export interface Job {
  id: string;
  itemId: string;
  customer: string;
  complaint: string;
  faults: string[];
  original: string[];
  fee: number;
  dueDay: number;
  arrived: number;
  open: number;
  ctx: Ctx;
  log: LogEntry[];
  tags: Record<string, 'sus' | 'ok'>;
  spent: number;
  minutes: number;
  comeback?: boolean;
  /** 이 의뢰에서 실제로 확인한 고장 (도감 기록용) */
  solved: string[];
}

export interface Customer { name: string; tag: string; hello: string; thanks: string; angry: string }

export interface DaySummary { day: number; income: number; parts: number; expenses: number; returned: number; lost: number }

export interface GameState {
  version: 1;
  seed: number;
  day: number;
  minute: number;
  money: number;
  debt: number;
  trust: number;
  jobs: Job[];
  active: string | null;
  tools: string[];
  casebook: string[];
  arrivals: string[];
  summary: DaySummary;
  history: DaySummary[];
  /** 다음 날 다시 찾아올 재수리 의뢰 */
  pending: Job[];
  ending: null | 'kept' | 'lost';
  endless: boolean;
  tutorial: boolean;
  nextId: number;
  sound: boolean;
}
