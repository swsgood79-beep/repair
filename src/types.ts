/** 수리 동작. 교체는 그 부품의 모든 고장을 없애지만 돈이 든다. */
export type Action = 'replace' | 'clean' | 'solder' | 'oil' | 'adjust';

export type ToolId = 'hand' | 'driver' | 'look' | 'loupe' | 'tester' | 'volt' | 'ohm' | 'ear' | 'touch' | 'wiggle' | 'inject' | 'mark' | 'repair';

export type Shape =
  | 'plug' | 'cord' | 'switch' | 'keys' | 'fuse' | 'xfmr' | 'cap' | 'tube' | 'pot' | 'speaker'
  | 'bulb' | 'socket' | 'joint' | 'motor' | 'belt' | 'bearing' | 'blade' | 'gear'
  | 'spring' | 'pendulum' | 'escape' | 'head' | 'battery' | 'roller' | 'board' | 'dial' | 'hands' | 'barrel'
  | 'sole' | 'element' | 'thermo' | 'neon' | 'handset' | 'bell' | 'rotary' | 'mic'
  | 'pan' | 'relay' | 'tr' | 'vu' | 'platter' | 'tonearm' | 'cart' | 'trim' | 'pedal' | 'needlebar' | 'bobbin' | 'crt' | 'lcd' | 'keypad' | 'chip' | 'ribbon';

/** 눈·돋보기로 보았을 때 확대 그림에 그려지는 흠 */
export type Mark =
  | 'filament' | 'rust' | 'soot' | 'bulge' | 'leak' | 'crack' | 'dryoil' | 'burnt' | 'slack' | 'snapped'
  | 'torn' | 'glazed' | 'powder' | 'kink' | 'bent' | 'pin' | 'dirty' | 'faded' | 'frayed' | 'offtrack' | 'gummy';

export type Sound = 'hum' | 'loudhum' | 'squeal' | 'crackle' | 'buzz' | 'whirr' | 'spin' | 'music' | 'muffled' | 'static' | 'tick' | 'limp' | 'catch' | 'drag' | 'slip' | 'quiet' | 'dialtone' | 'ring' | 'click' | 'boil' | 'wow' | 'whine';

export type Feel = 'smooth' | 'stiff' | 'sticky' | 'catch' | 'free' | 'loose' | 'soft' | 'hard' | 'firm' | 'slack' | 'mushy' | 'crisp' | 'tight';

/** 0: 겉에서 보임, 1: 덮개를 열면 보임, 2: 섀시를 빼야 보임 */
export type Layer = 0 | 1 | 2;

/** 손으로 눌렀을 때 하는 일 */
export type HandUse = 'power' | 'switch' | 'nudge' | 'tune' | 'volume';

export interface Comp {
  id: string;
  name: string;
  /** 작업대 이름표 */
  short: string;
  shape: Shape;
  x: number; y: number; w: number; h: number;
  layer: Layer;
  /** 저항계 정상값(Ω). 'cap'은 콘덴서 충전 반응 */
  ohm?: number | 'cap';
  feel?: Feel;
  part?: number;
  acts: Action[];
  hand?: HandUse;
  /** 앞면 부품: 덮개를 닫았을 때만 손이 닿는다 */
  front?: boolean;
}

export interface TestPoint {
  id: string;
  label: string;
  x: number; y: number;
  layer: Layer;
  /** volt·sig: 테스터, beat: 청진기, amp: 눈 */
  kind: 'volt' | 'sig' | 'beat' | 'amp';
  unit: 'V' | 'mV' | 's' | '°' | 'rpm';
  /** 할아버지 수첩의 정상값 */
  expect: number;
}

export interface Wire { pts: [number, number][]; layer: Layer; kind?: 'p' | 's' | 'm' }

/** 저항계 결과. Infinity는 끊김 */
export interface Ohm { v: number; flicker?: boolean; cap?: 'kick' | 'weak' | 'none' | 'short' }

export interface Fault {
  id: string;
  comp: string;
  name: string;
  fix: Action;
  minDay: number;
  group?: string;
  /** 손님 말 (짧게) */
  complaint: string;
  /** 확대 그림에 나타나는 흠 */
  mark?: Mark;
  /** 돋보기로만 보이는 흠인가 */
  fine?: boolean;
  /** 흠 설명 한 줄 */
  seen?: string;
  ohm?: Ohm;
  feel?: Feel;
  latent?: boolean;
  also?: { id: string; chance: number; complaint: string };
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
  moved: boolean;
}

export interface Reading { v: number; b?: number; shaky?: boolean }

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
  hands?: boolean;
  jam?: boolean;
  /** 전화 신호음 · 벨 */
  dial?: number;
  ring?: number;
  /** 앰프 좌우 레벨 미터 */
  vu?: [number, number];
  /** TV 화면 */
  screen?: 'off' | 'black' | 'line' | 'snow' | 'roll' | 'ok';
  /** 계산기 표시창 */
  lcd?: { text: string; miss?: boolean; dim?: boolean };
  /** 턴테이블 음 울렁임 */
  wow?: number;
}

export interface Sim {
  tp: Record<string, Reading>;
  /** 지금 상태 한 줄 */
  obs: string;
  heat: Record<string, number>;
  ear: Record<string, Sound>;
  blow: { id: string; text: string }[];
  fx: FX;
}

export interface ItemDef {
  id: string;
  name: string;
  minDay: number;
  fee: [number, number];
  power: { on: string; off: string };
  sw?: string[];
  knobA?: string;
  knobB?: string;
  nudge?: string;
  coverLabel: string;
  chassisLabel?: string;
  cover: [number, number, number, number];
  chassis?: [number, number, number, number];
  comps: Comp[];
  tps: TestPoint[];
  wires: Wire[];
  /** 추리판: 흐름 순서대로 부품과 측정점 (행 단위) */
  flow: string[][];
  faults: Fault[];
  sim(f: Set<string>, c: Ctx): Sim;
  ohm?(f: Set<string>, comp: string, c: Ctx): Ohm | null;
  feel?(f: Set<string>, comp: string): Feel | undefined;
  inject?(f: Set<string>, c: Ctx, tp: string): { level: number; torn?: boolean; why?: string };
}

/** 부품과 측정점에 남는 조사 기록 (작업대 위 배지) */
export interface Finding {
  look?: Mark | 'ok';
  loupe?: Mark | 'ok';
  ohm?: Ohm;
  heat?: number;
  feel?: Feel;
  ear?: Sound;
  tp?: Reading;
  inject?: number;
  /** 흔들었을 때 증상이 바뀌었는가 */
  shake?: boolean;
  /** 발견 순서 */
  t?: number;
}

export interface Job {
  id: string;
  itemId: string;
  customer: number;
  complaint: string;
  faults: string[];
  fee: number;
  dueDay: number;
  open: number;
  ctx: Ctx;
  found: Record<string, Finding>;
  tags: Record<string, 'sus' | 'ok'>;
  spent: number;
  comeback?: boolean;
  solved: string[];
  /** 단서 발견 순서 번호 */
  seq?: number;
  /** 틀린 정답 시도 수 (수리비가 깎인다) */
  wrong?: number;
  /** 받은 힌트 단계 */
  hints?: number;
}

export interface Customer { name: string; hair: string; skin: string; shirt: string; style: number; acc?: string; hello: string; thanks: string; angry: string }

export interface DaySummary { day: number; income: number; parts: number; expenses: number; returned: number; lost: number }

export interface GameState {
  version: 2;
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
  pending: Job[];
  ending: null | 'kept' | 'lost';
  endless: boolean;
  /** 튜토리얼 단계 (-1이면 끝) */
  tutorial: number;
  nextId: number;
  sound: boolean;
  /** 배경음악 (없으면 켬) */
  music?: boolean;
  /** 가게 단계 (1~4) */
  level?: number;
  /** 물건별로 고칠 수 있게 된 날 */
  unlocked?: Record<string, number>;
}
