import type { Action, Comp, Ctx, Fault, GameState, ItemDef, Job, LogEntry, Sim, ToolId } from './types';
import { CUSTOMERS, ITEMS, item } from './items';
import { josa } from './items/util';

export const DAY_MINUTES = 600; // 09:00 ~ 19:00
export const DEADLINE = 14;
export const START_DEBT = 800000;
export const DAILY_COST = 20000;
export const SHELF_LIMIT = 6;
const SAVE_KEY = 'nopo-repair:v1';

export const TOOL_SHOP = [
  { id: 'loupe', name: '돋보기', price: 15000, day: 1, desc: '머리카락 같은 금, 바랜 게터, 굳은 기름처럼 눈으로는 안 보이는 것을 본다.' },
  { id: 'inject', name: '신호 주입기', price: 30000, day: 3, desc: '신호 단에 삐 소리를 넣어, 그 뒤쪽 회로가 살아 있는지 스피커로 듣는다.' },
];

export const TOOL_TIME: Record<ToolId, number> = { look: 1, loupe: 2, volt: 2, ohm: 2, ear: 1, wiggle: 1, touch: 1, inject: 2, mark: 0, repair: 0 };
export const ACTION_TIME: Record<Action, number> = { replace: 8, clean: 6, solder: 7, oil: 6, adjust: 10 };
export const ACTION_NAME: Record<Action, string> = { replace: '교체', clean: '세척', solder: '재납땜', oil: '주유', adjust: '조정' };
const ACTION_LOG: Record<Action, string> = {
  replace: '새 부품으로 갈아 끼웠다.',
  clean: '접점 세정제를 뿌리고 깨끗이 닦았다.',
  solder: '인두로 납을 녹여 다시 땜했다.',
  oil: '묵은 기름을 닦고 시계 기름을 한 방울 넣었다.',
  adjust: '조심스럽게 위치와 장력을 맞췄다.',
};

/* ---------- 난수 ---------- */
function rand(state: GameState) {
  state.seed = (state.seed + 0x6d2b79f5) | 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(state: GameState, list: T[]) => list[Math.floor(rand(state) * list.length)];

/* ---------- 상태 ---------- */
export function newGame(seed = Date.now()): GameState {
  const state: GameState = {
    version: 1, seed: seed | 0, day: 1, minute: 0, money: 30000, debt: START_DEBT, trust: 3,
    jobs: [], active: null, tools: [], casebook: [], arrivals: [],
    summary: { day: 1, income: 0, parts: 0, expenses: 0, returned: 0, lost: 0 },
    history: [], pending: [], ending: null, endless: false, tutorial: true, nextId: 1, sound: false,
  };
  const first = makeJob(state, 'lamp', ['bulb_open'], CUSTOMERS[1]);
  const second = makeJob(state, 'fan', ['cap_dead'], CUSTOMERS[0]);
  second.dueDay = 2;
  state.jobs.push(first, second);
  state.arrivals = [first.id, second.id];
  state.active = first.id;
  return state;
}

export function save(state: GameState) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* 저장 불가 환경 */ }
}
export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    if (data?.version !== 1 || !Array.isArray(data.jobs)) return null;
    for (const job of data.jobs) item(job.itemId);
    return data;
  } catch { return null; }
}
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* 무시 */ } }

export const clockText = (minute: number) => {
  const total = 9 * 60 + Math.min(minute, DAY_MINUTES);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
export const won = (n: number) => `${n < 0 ? '-' : ''}${Math.abs(Math.round(n)).toLocaleString('ko-KR')}원`;

export function activeJob(state: GameState) { return state.jobs.find(j => j.id === state.active) ?? null; }
export function faultOf(def: ItemDef, id: string): Fault { return def.faults.find(f => f.id === id)!; }
export function compOf(def: ItemDef, id: string): Comp | undefined { return def.comps.find(c => c.id === id); }

/* ---------- 의뢰 생성 ---------- */
function freshCtx(): Ctx { return { power: false, sw: 0, knobA: 0.15, knobB: 0.5, wiggle: null, warm: false, nudge: false, moved: false }; }

function makeJob(state: GameState, itemId: string, faults: string[], customer = pick(state, CUSTOMERS)): Job {
  const def = item(itemId);
  const lines: string[] = [];
  const all = [...faults];
  for (const id of faults) {
    const f = faultOf(def, id);
    if (f.also && (f.also.chance >= 1 || rand(state) < f.also.chance)) {
      if (!all.includes(f.also.id)) all.push(f.also.id);
      lines.push(f.also.complaint);
    } else lines.push(f.complaint);
  }
  const base = def.fee[0] + rand(state) * (def.fee[1] - def.fee[0]);
  const fee = Math.round((base * (1 + 0.45 * (faults.length - 1)) * (0.88 + state.trust * 0.03)) / 500) * 500;
  return {
    id: `j${state.nextId++}`, itemId, customer: customer.name, complaint: lines.join(' '),
    faults: all, original: [...all], fee, dueDay: state.day + (faults.length > 1 || def.minDay >= 3 ? 2 : 1),
    arrived: state.day, open: 0, ctx: freshCtx(), log: [], tags: {}, spent: 0, minutes: 0, solved: [],
  };
}

function randomJob(state: GameState): Job {
  const items = ITEMS.filter(i => i.minDay <= state.day);
  const fresh = items.filter(i => i.minDay >= state.day - 2 && i.minDay > 1);
  const def = fresh.length && rand(state) < 0.45 ? pick(state, fresh) : pick(state, items);
  const pool = def.faults.filter(f => f.minDay <= state.day && !f.consequence);
  const r = rand(state);
  const n = state.day <= 2 ? 1 : state.day <= 5 ? (r < 0.35 ? 2 : 1) : (r < 0.2 ? 3 : r < 0.65 ? 2 : 1);
  const chosen: Fault[] = [];
  let guard = 0;
  while (chosen.length < Math.min(n, pool.length) && guard++ < 40) {
    const f = pick(state, pool);
    if (chosen.includes(f) || (f.group && chosen.some(c => c.group === f.group))) continue;
    if (chosen.some(c => c.also?.id === f.id)) continue;
    chosen.push(f);
  }
  return makeJob(state, def.id, chosen.map(f => f.id));
}

/* ---------- 시뮬레이션 ---------- */
export function simulate(job: Job, ctx: Partial<Ctx> = {}): Sim {
  return item(job.itemId).sim(new Set(job.faults), { ...job.ctx, ...ctx });
}

function log(job: Job, state: GameState, text: string, kind: LogEntry['kind']) {
  job.log.push({ t: state.minute, text, kind });
  if (job.log.length > 160) job.log.splice(0, job.log.length - 160);
}

function spend(state: GameState, job: Job, minutes: number) {
  state.minute += minutes;
  job.minutes += minutes;
}

/** 지금 상태에서 생기는 연쇄 고장(퓨즈 끊어짐 등)을 반영한다. */
export function settle(state: GameState, job: Job) {
  for (let i = 0; i < 3; i++) {
    const sim = simulate(job);
    if (!sim.blow.length) return;
    for (const b of sim.blow) {
      if (!job.faults.includes(b.id)) {
        job.faults.push(b.id);
        log(job, state, b.text, 'event');
      }
    }
  }
}

export function timeLeft(state: GameState) { return DAY_MINUTES - state.minute; }

export type Result = { ok: boolean; text: string };

/** 시간이 드는 조작 공통 확인 */
function canSpend(state: GameState, minutes: number): Result | null {
  if (state.ending) return { ok: false, text: '이미 끝난 영업입니다.' };
  if (timeLeft(state) < minutes) return { ok: false, text: '오늘은 시간이 모자랍니다. 영업을 마감하세요.' };
  return null;
}

export function visible(job: Job, layer: number) { return layer <= job.open; }
function reachable(job: Job, comp: Comp) { return visible(job, comp.layer) && !(comp.front && job.open > 0); }

const HEAT = ['차갑다', '미지근하다', '손대기 힘들 만큼 뜨겁다'];

export function useTool(state: GameState, tool: ToolId, target: { comp?: string; tp?: string }): Result {
  const job = activeJob(state);
  if (!job) return { ok: false, text: '작업할 물건을 선반에서 고르세요.' };
  const def = item(job.itemId);
  const comp = target.comp ? compOf(def, target.comp) : undefined;
  const tp = target.tp ? def.tps.find(t => t.id === target.tp) : undefined;
  if (comp && comp.front && job.open > 0) return { ok: false, text: '문자판을 다시 덮어야 바늘에 손이 닿습니다.' };
  if (comp && !reachable(job, comp)) return { ok: false, text: `${josa(comp.name, '은', '는')} ${comp.layer === 2 ? '섀시를 빼야' : '덮개를 열어야'} 보입니다.` };
  if (tp && !visible(job, tp.layer)) return { ok: false, text: '덮개를 열어야 측정 지점에 닿습니다.' };

  if (tool === 'mark' && comp) {
    const now = job.tags[comp.id];
    if (!now) job.tags[comp.id] = 'sus';
    else if (now === 'sus') job.tags[comp.id] = 'ok';
    else delete job.tags[comp.id];
    return { ok: true, text: '' };
  }
  if ((tool === 'loupe' || tool === 'inject') && !state.tools.includes(tool)) return { ok: false, text: '아직 없는 공구입니다. 공구상에서 살 수 있습니다.' };

  const cost = TOOL_TIME[tool];
  const blocked = canSpend(state, cost);
  if (blocked) return blocked;
  const faults = job.faults.map(id => faultOf(def, id));
  const onComp = comp ? faults.filter(f => f.comp === comp.id) : [];
  const sim = simulate(job);
  const isClock = def.id === 'clock';
  let text = '';

  switch (tool) {
    case 'look':
    case 'loupe': {
      if (tp?.kind === 'amp') { text = `${tp.label}: ${sim.tp[tp.id].value}`; break; }
      if (!comp) return { ok: false, text: '부품을 눌러 살펴보세요.' };
      const seen = onComp.map(f => (tool === 'loupe' ? f.loupe ?? f.look : f.look)).filter(Boolean);
      if (seen.length) text = seen.join(' ');
      else text = (comp.look ?? '겉보기엔 이상이 없다.') + (tool === 'loupe' ? ' 확대해 봐도 다른 흠은 없다.' : '');
      text = `${comp.name}: ${text}`;
      break;
    }
    case 'volt': {
      if (!tp || tp.kind === 'beat' || tp.kind === 'amp') return { ok: false, text: isClock ? '태엽 시계에는 전기가 없습니다. 귀와 눈으로 읽으세요.' : '테스터 리드를 측정 지점(놋쇠 단자)에 대세요.' };
      const r = sim.tp[tp.id];
      text = `${tp.label}: ${r.value}${tp.note ? ` (수첩 정상값 ${tp.note})` : ''}${job.ctx.power ? '' : ' · 전원이 빠져 있다'}`;
      break;
    }
    case 'ohm': {
      if (!comp) return { ok: false, text: '저항계는 부품 양 끝에 댑니다. 부품을 누르세요.' };
      if (isClock) return { ok: false, text: '태엽 시계에는 잴 전기 회로가 없습니다.' };
      if (job.ctx.power) return { ok: false, text: '전원이 들어간 채로 저항을 재면 테스터가 탑니다. 전원을 먼저 빼세요.' };
      const over = onComp.find(f => f.ohm);
      if (!over && !comp.ohm) return { ok: false, text: `${comp.name}에는 잴 만한 단자가 없습니다.` };
      text = `${comp.name} 저항: ${over?.ohm ?? comp.ohm}${comp.note ? ` (수첩: ${comp.note})` : ''}`;
      break;
    }
    case 'ear': {
      if (tp?.kind === 'beat') { text = `${tp.label}: ${sim.tp[tp.id].value}`; break; }
      if (!comp) return { ok: false, text: '귀를 댈 부품을 누르세요.' };
      text = `${comp.name}에 귀를 대 본다: ${sim.ear[comp.id] ?? '특별한 소리는 없다.'}`;
      break;
    }
    case 'wiggle': {
      if (!comp) return { ok: false, text: '흔들어 볼 부품을 누르세요.' };
      if (!job.ctx.power) return { ok: false, text: '전원을 넣은 상태에서 흔들어야 변화를 볼 수 있습니다.' };
      const moved = simulate(job, { wiggle: comp.id });
      const before = sim.obs.join(' ');
      const after = moved.obs.join(' ');
      text = after !== before ? `${josa(comp.name, '을', '를')} 흔드는 동안: ${after}` : `${josa(comp.name, '을', '를')} 흔들어도 변화가 없다.`;
      const changes = def.tps.filter(t => visible(job, t.layer) && moved.tp[t.id] && sim.tp[t.id] && moved.tp[t.id].value !== sim.tp[t.id].value);
      if (changes.length && after === before) text = `${josa(comp.name, '을', '를')} 흔들자 측정값이 출렁인다.`;
      break;
    }
    case 'touch': {
      if (!comp) return { ok: false, text: '만져 볼 부품을 누르세요.' };
      if (comp.shape === 'blade' && (sim.fx.spin ?? 0) > 0) return { ok: false, text: '돌아가는 날개에 손을 대면 다칩니다.' };
      const heat = sim.heat[comp.id] ?? 0;
      const feel = def.feel?.(new Set(job.faults), comp.id) ?? onComp.find(f => f.feel)?.feel ?? comp.feel;
      text = `${comp.name}: ${HEAT[heat]}.${feel ? ' ' + feel : ''}`;
      break;
    }
    case 'inject': {
      if (!def.inject) return { ok: false, text: '이 물건에는 신호 주입기를 쓸 데가 없습니다.' };
      if (!tp) return { ok: false, text: '신호 주입기는 측정 지점에 댑니다.' };
      text = `${tp.label}에 신호 주입: ${def.inject(new Set(job.faults), job.ctx, tp.id)}`;
      break;
    }
    default:
      return { ok: false, text: '' };
  }
  spend(state, job, cost);
  log(job, state, text, 'measure');
  return { ok: true, text };
}

export function repair(state: GameState, compId: string, action: Action): Result {
  const job = activeJob(state);
  if (!job) return { ok: false, text: '' };
  const def = item(job.itemId);
  const comp = compOf(def, compId);
  if (!comp || !comp.acts.includes(action)) return { ok: false, text: '그 작업은 할 수 없습니다.' };
  if (!reachable(job, comp)) return { ok: false, text: comp.front ? '덮개를 닫아야 앞면에 손이 닿습니다.' : '덮개를 열어야 손이 닿습니다.' };
  if (job.ctx.power && def.id !== 'clock') return { ok: false, text: '감전 위험! 전원을 빼고 작업하세요.' };
  const minutes = def.id === 'clock' && action === 'adjust' ? 15 : ACTION_TIME[action];
  const blocked = canSpend(state, minutes);
  if (blocked) return blocked;
  const price = action === 'replace' ? comp.part ?? 0 : 0;
  if (price > state.money) return { ok: false, text: `부품값 ${won(price)}이 모자랍니다.` };
  state.money -= price;
  state.summary.parts += price;
  job.spent += price;
  spend(state, job, minutes);
  const fixed = job.faults.filter(id => {
    const f = faultOf(def, id);
    return f.comp === comp.id && (action === 'replace' || f.fix === action);
  });
  job.faults = job.faults.filter(id => !fixed.includes(id));
  for (const id of fixed) if (!job.solved.includes(id)) job.solved.push(id);
  job.ctx.warm = false;
  job.ctx.nudge = false;
  const text = `${comp.name} ${ACTION_NAME[action]}: ${ACTION_LOG[action]}${price ? ` (${won(price)})` : ''}`;
  log(job, state, text, 'repair');
  return { ok: true, text };
}

export function setOpen(state: GameState, level: number): Result {
  const job = activeJob(state);
  if (!job) return { ok: false, text: '' };
  const def = item(job.itemId);
  const max = def.chassis ? 2 : 1;
  if (level < 0 || level > max || level === job.open) return { ok: false, text: '' };
  const minutes = Math.abs(level - job.open) * (level > job.open ? 5 : 3);
  const blocked = canSpend(state, minutes);
  if (blocked) return blocked;
  spend(state, job, minutes);
  const opening = level > job.open;
  job.open = level;
  const text = opening ? (level === 2 ? `${josa(def.chassisLabel!.split(' · ')[0], '을', '를')} 풀어 섀시 아래를 드러냈다.` : `${josa(def.coverLabel.split(' · ')[0], '을', '를')} 풀어 속을 열었다.`) : '덮개를 다시 덮고 나사를 조였다.';
  log(job, state, text, 'note');
  return { ok: true, text };
}

/** 전원·스위치·노브처럼 시간이 들지 않는 조작 */
export function setCtx(state: GameState, change: Partial<Ctx>): Result {
  const job = activeJob(state);
  if (!job || state.ending) return { ok: false, text: '' };
  const def = item(job.itemId);
  const before = simulate(job).obs.join(' ');
  const turnedOff = change.power === false || change.sw === 0;
  Object.assign(job.ctx, change, { wiggle: null });
  job.ctx.moved = change.knobB !== undefined;
  if (turnedOff) { job.ctx.warm = false; job.ctx.nudge = false; }
  settle(state, job);
  const after = simulate(job).obs.join(' ');
  job.ctx.moved = false;
  if (change.knobA !== undefined || change.knobB !== undefined) {
    if (def.id === 'radio' && after !== before) log(job, state, after, 'obs');
    return { ok: true, text: after };
  }
  if (after !== before || change.power !== undefined) log(job, state, after, 'obs');
  return { ok: true, text: after };
}

export function nudge(state: GameState): Result {
  const job = activeJob(state);
  if (!job) return { ok: false, text: '' };
  const blocked = canSpend(state, 1);
  if (blocked) return blocked;
  spend(state, job, 1);
  job.ctx.nudge = true;
  settle(state, job);
  const text = simulate(job).obs.join(' ');
  log(job, state, `${item(job.itemId).nudge}: ${text}`, 'obs');
  return { ok: true, text };
}

export function watch(state: GameState): Result {
  const job = activeJob(state);
  if (!job) return { ok: false, text: '' };
  if (!job.ctx.power) return { ok: false, text: `${item(job.itemId).power.on}부터 하세요.` };
  const blocked = canSpend(state, 10);
  if (blocked) return blocked;
  spend(state, job, 10);
  job.ctx.warm = true;
  settle(state, job);
  const text = '10분 동안 켜 두고 지켜봤다. ' + simulate(job).obs.join(' ');
  log(job, state, text, 'obs');
  return { ok: true, text };
}

/* ---------- 손님 응대 ---------- */
export type ReturnOutcome = { kind: 'paid' | 'refused' | 'gaveup'; text: string; customer: string; fee: number; comeback: boolean; learned: string[] };

export function handBack(state: GameState, giveUp = false): ReturnOutcome | Result {
  const job = activeJob(state);
  if (!job) return { ok: false, text: '' };
  const def = item(job.itemId);
  const customer = CUSTOMERS.find(c => c.name === job.customer) ?? CUSTOMERS[0];
  const closeCost = job.open * 3;
  const blocked = canSpend(state, closeCost + 3);
  if (blocked) return blocked;
  spend(state, job, closeCost + 3);
  job.open = 0;
  Object.assign(job.ctx, freshCtx());
  if (giveUp) {
    state.trust = Math.max(0, state.trust - 1);
    removeJob(state, job);
    state.summary.lost++;
    return { kind: 'gaveup', text: `${customer.name}: "어쩔 수 없지요. 다른 데 알아볼게요."`, customer: customer.name, fee: 0, comeback: false, learned: [] };
  }
  const visibleLeft = job.faults.filter(id => !faultOf(def, id).latent);
  if (visibleLeft.length) {
    log(job, state, `${josa(customer.name, '이', '가')} 켜 보더니 고개를 젓는다: "${customer.angry}"`, 'event');
    return { kind: 'refused', text: `${customer.name}: "${customer.angry}"`, customer: customer.name, fee: 0, comeback: false, learned: [] };
  }
  const comeback = job.faults.length > 0;
  state.money += job.fee;
  state.summary.income += job.fee;
  state.summary.returned++;
  if (!job.comeback && job.spent <= job.fee * 0.35) state.trust = Math.min(10, state.trust + 1);
  const learned = job.solved.filter(id => !state.casebook.includes(`${def.id}/${id}`));
  for (const id of learned) state.casebook.push(`${def.id}/${id}`);
  if (comeback) {
    const again: Job = {
      ...structuredClone(job), id: `j${state.nextId++}`, fee: 0, comeback: true, arrived: state.day + 1, dueDay: state.day + 2,
      complaint: '가져가서 써 보니 또 그래요. ' + job.faults.map(id => faultOf(def, id).complaint).join(' '),
      log: [], tags: {}, spent: 0, minutes: 0, solved: [], ctx: freshCtx(), open: 0,
    };
    state.pending.push(again);
  }
  removeJob(state, job);
  return { kind: 'paid', text: `${customer.name}: "${customer.thanks}"`, customer: customer.name, fee: job.fee, comeback, learned: learned.map(id => faultOf(def, id).name) };
}

function removeJob(state: GameState, job: Job) {
  state.jobs = state.jobs.filter(j => j.id !== job.id);
  if (state.active === job.id) state.active = state.jobs[0]?.id ?? null;
}

/* ---------- 하루 ---------- */
export function payDebt(state: GameState, amount: number): Result {
  const pay = Math.min(amount, state.debt, state.money);
  if (pay <= 0) return { ok: false, text: '갚을 돈이 없습니다.' };
  state.money -= pay;
  state.debt -= pay;
  return { ok: true, text: `${won(pay)}을 갚았습니다.${state.debt === 0 ? ' 빚을 모두 갚았습니다!' : ''}` };
}

export function buyTool(state: GameState, id: string): Result {
  const row = TOOL_SHOP.find(t => t.id === id);
  if (!row || state.tools.includes(id)) return { ok: false, text: '' };
  if (state.day < row.day) return { ok: false, text: `${row.day}일차부터 들어옵니다.` };
  if (state.money < row.price) return { ok: false, text: '돈이 모자랍니다.' };
  state.money -= row.price;
  state.summary.parts += row.price;
  state.tools.push(id);
  return { ok: true, text: `${josa(row.name, '을', '를')} 들였습니다.` };
}

export type DayReport = { summary: GameState['summary']; collected: string[] };

export function endDay(state: GameState): DayReport {
  const collected: string[] = [];
  for (const job of [...state.jobs]) {
    if (job.dueDay <= state.day) {
      collected.push(`${job.customer} (${item(job.itemId).name})`);
      state.trust = Math.max(0, state.trust - 1);
      state.summary.lost++;
      removeJob(state, job);
    }
  }
  state.money -= DAILY_COST;
  state.summary.expenses += DAILY_COST;
  const summary = { ...state.summary };
  state.history.push(summary);
  if (state.money < 0) state.ending = 'lost';
  else if (state.day >= DEADLINE && !state.endless) state.ending = state.debt <= 0 ? 'kept' : 'lost';
  return { summary, collected };
}

export function startDay(state: GameState): string[] {
  state.day++;
  state.minute = 0;
  state.summary = { day: state.day, income: 0, parts: 0, expenses: 0, returned: 0, lost: 0 };
  // 밤새 전원은 뽑아 둔다. 데워진 부품도 식는다.
  for (const job of state.jobs) Object.assign(job.ctx, { power: false, sw: 0, warm: false, nudge: false, wiggle: null });
  const arrivals: Job[] = [];
  const back = state.pending.filter(j => j.arrived <= state.day);
  state.pending = state.pending.filter(j => j.arrived > state.day);
  for (const job of back) { state.trust = Math.max(0, state.trust - 2); arrivals.push(job); }
  const count = 2 + (state.trust >= 6 ? 1 : 0) + (state.trust >= 9 ? 1 : 0);
  for (let i = 0; i < count && state.jobs.length + arrivals.length < SHELF_LIMIT; i++) arrivals.push(randomJob(state));
  state.jobs.push(...arrivals);
  state.arrivals = arrivals.map(j => j.id);
  if (!activeJob(state)) state.active = state.jobs[0]?.id ?? null;
  state.tutorial = false;
  return state.arrivals;
}

export function continueEndless(state: GameState) {
  state.endless = true;
  state.ending = null;
}

export function casebookEntries() {
  return ITEMS.flatMap(def => def.faults.map(f => ({ key: `${def.id}/${f.id}`, item: def, fault: f })));
}
