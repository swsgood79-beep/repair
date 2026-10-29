import type { Action, Comp, Ctx, Fault, Finding, GameState, ItemDef, Job, Ohm, Sim, ToolId } from './types';
import { CUSTOMERS, ITEMS, item } from './items';

export const DAY_MINUTES = 600; // 09:00 ~ 19:00
export const DEADLINE = 14;
export const START_DEBT = 600000;
export const DAILY_COST = 20000;
export const SHELF_LIMIT = 6;

/** 가게 키우기: 단계가 오를수록 고칠 수 있는 물건이 늘어난다 */
export const SHOP_LEVELS = [
  { level: 1, name: '골목 수리점', price: 0, items: ['lamp', 'fan', 'radio', 'cassette', 'clock', 'iron', 'phone'], desc: '할아버지가 남긴 한 칸짜리 가게' },
  { level: 2, name: '작업대 넓히기', price: 150000, items: ['ricecooker', 'amp'], desc: '살림 가전과 오디오를 올릴 넓은 작업대' },
  { level: 3, name: '2층 공방', price: 300000, items: ['turntable', 'sewing'], desc: '기계 손질을 하는 조용한 2층 공방' },
  { level: 4, name: '한결전파사 본점', price: 450000, items: ['tv', 'calc'], desc: '간판을 새로 달고 TV와 전자기기까지 다루는 본점' },
];
/** 처음부터 고칠 수 있는 물건 */
const STARTERS = () => Object.fromEntries(SHOP_LEVELS[0].items.map(id => [id, 1]));
export const levelOf = (state: GameState) => state.level ?? 1;
export function shelfLimit(state: GameState) { return SHELF_LIMIT + levelOf(state) - 1; }

export function expand(state: GameState): Result {
  const next = SHOP_LEVELS[levelOf(state)];
  if (!next) return fail('이미 본점입니다');
  if (state.money < next.price) return fail(`${won(next.price)}이 필요합니다`);
  state.money -= next.price;
  state.summary.parts += next.price;
  state.level = next.level;
  state.unlocked ??= {};
  for (const id of next.items) state.unlocked[id] ??= state.day;
  checkWin(state);
  return { ok: true, text: `${next.name} 완성! ${next.items.map(id => item(id).name).join(', ')} 수리 시작` };
}

/** 빚을 다 갚고 본점까지 키우면 성공 */
function checkWin(state: GameState) {
  if (state.debt <= 0 && levelOf(state) >= SHOP_LEVELS.length && !state.endless) state.ending = 'kept';
}
const SAVE_KEY = 'nopo-repair:v2';

export const TOOL_SHOP = [
  { id: 'loupe', name: '돋보기', price: 15000, day: 1, desc: '가는 금, 바랜 막, 굳은 기름을 본다' },
];

export const TOOL_TIME: Record<ToolId, number> = { tester: 2, hand: 0, driver: 5, look: 1, loupe: 2, volt: 2, ohm: 2, ear: 1, wiggle: 1, touch: 1, inject: 2, mark: 0, repair: 0 };
export const ACTION_TIME: Record<Action, number> = { replace: 8, clean: 6, solder: 7, oil: 6, adjust: 10 };
export const ACTION_NAME: Record<Action, string> = { replace: '교체', clean: '세척', solder: '납땜', oil: '주유', adjust: '조정' };

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
    version: 2, seed: seed | 0, day: 1, minute: 0, money: 30000, debt: START_DEBT, trust: 3,
    jobs: [], active: null, tools: [], casebook: [], arrivals: [],
    summary: { day: 1, income: 0, parts: 0, expenses: 0, returned: 0, lost: 0 },
    history: [], pending: [], ending: null, endless: false, tutorial: 0, nextId: 1, sound: true, music: true, level: 1, unlocked: STARTERS(),
  };
  const first = makeJob(state, 'lamp', ['bulb_open'], 1);
  const second = makeJob(state, 'fan', ['cap_dead'], 0);
  first.dueDay = 2; second.dueDay = 2;
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
    if (data?.version !== 2 || !Array.isArray(data.jobs)) return null;
    for (const job of [...data.jobs, ...data.pending]) item(job.itemId);
    data.level ??= 1;
    data.unlocked ??= STARTERS();
    for (const id of SHOP_LEVELS[0].items) data.unlocked[id] ??= 1;
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
export function customerOf(job: Job) { return CUSTOMERS[job.customer % CUSTOMERS.length]; }

/* ---------- 의뢰 생성 ---------- */
function freshCtx(): Ctx { return { power: false, sw: 0, knobA: 0.15, knobB: 0.5, wiggle: null, warm: false, nudge: false, moved: false }; }

function makeJob(state: GameState, itemId: string, faults: string[], customer = Math.floor(rand(state) * CUSTOMERS.length)): Job {
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
    id: `j${state.nextId++}`, itemId, customer, complaint: lines.join(' '),
    faults: all, fee, dueDay: state.day + (faults.length > 1 || def.minDay >= 3 ? 2 : 1),
    open: 0, ctx: freshCtx(), found: {}, tags: {}, spent: 0, solved: [],
  };
}

function randomJob(state: GameState): Job {
  const unlocked = state.unlocked ?? STARTERS();
  const items = ITEMS.filter(i => unlocked[i.id] !== undefined);
  const fresh = items.filter(i => unlocked[i.id] >= state.day - 2 && unlocked[i.id] > 1);
  const def = fresh.length && rand(state) < 0.5 ? pick(state, fresh) : pick(state, items);
  // 새로 연 물건은 쉬운 고장부터, 날이 갈수록 어려운 고장도 나온다
  const since = state.day - (unlocked[def.id] ?? 1);
  const pool = def.faults.filter(f => f.minDay <= Math.max(state.day, def.minDay) && f.minDay <= def.minDay + since + (def.minDay <= 2 ? 99 : 0));
  const r = rand(state);
  const n = state.day <= 2 ? 1 : state.day <= 5 ? (r < 0.35 ? 2 : 1) : (r < 0.2 ? 3 : r < 0.65 ? 2 : 1);
  const chosen: Fault[] = [];
  let guard = 0;
  while (chosen.length < Math.min(n, pool.length) && guard++ < 40) {
    const f = pick(state, pool);
    if (chosen.includes(f) || (f.group && chosen.some(c => c.group === f.group))) continue;
    if (chosen.some(c => c.also?.id === f.id) || f.also && chosen.some(c => c.id === f.also!.id)) continue;
    chosen.push(f);
  }
  return makeJob(state, def.id, chosen.map(f => f.id));
}

/* ---------- 시뮬레이션 ---------- */
export function simulate(job: Job, ctx: Partial<Ctx> = {}): Sim {
  return item(job.itemId).sim(new Set(job.faults), { ...job.ctx, ...ctx });
}

export type GameEvent = { text: string; bad?: boolean };
/** 이번 조작에서 일어난 사건 (퓨즈 끊어짐 등). 화면이 읽어 가며 비운다. */
export const events: GameEvent[] = [];

/** 지금 상태에서 생기는 연쇄 고장을 반영한다. */
export function settle(job: Job) {
  for (let i = 0; i < 3; i++) {
    const sim = simulate(job);
    if (!sim.blow.length) return;
    for (const b of sim.blow) if (!job.faults.includes(b.id)) { job.faults.push(b.id); events.push({ text: b.text, bad: true }); }
  }
}

export function timeLeft(state: GameState) { return DAY_MINUTES - state.minute; }
export type Result = { ok: boolean; text: string; fixed?: number };
const fail = (text: string): Result => ({ ok: false, text });

function canSpend(state: GameState, minutes: number): Result | null {
  if (state.ending) return fail('영업이 끝났습니다');
  if (timeLeft(state) < minutes) return fail('오늘은 시간이 모자랍니다. 마감하세요');
  return null;
}

export function visible(job: Job, layer: number) { return layer <= job.open; }
export function reachable(job: Job, comp: Comp) { return visible(job, comp.layer) && !(comp.front && job.open > 0); }

export function ohmOf(job: Job, comp: Comp): Ohm | null {
  const def = item(job.itemId);
  const custom = def.ohm?.(new Set(job.faults), comp.id, job.ctx);
  if (custom) return custom;
  const over = job.faults.map(id => faultOf(def, id)).find(x => x.comp === comp.id && x.ohm);
  if (over?.ohm) return over.ohm;
  if (comp.ohm === undefined) return null;
  return comp.ohm === 'cap' ? { v: Infinity, cap: 'kick' } : { v: comp.ohm };
}

function found(job: Job, id: string): Finding {
  const f = (job.found[id] ??= {});
  f.t = job.seq = (job.seq ?? 0) + 1;
  return f;
}

/** 공구를 부품이나 측정점에 쓴다. 결과는 job.found에 남는다. */
export function useTool(state: GameState, tool: ToolId, target: { comp?: string; tp?: string }): Result {
  const job = activeJob(state);
  if (!job) return fail('선반에서 물건을 고르세요');
  const def = item(job.itemId);
  const comp = target.comp ? compOf(def, target.comp) : undefined;
  const tp = target.tp ? def.tps.find(t => t.id === target.tp) : undefined;
  if (comp?.front && job.open > 0) return fail('덮개를 닫아야 손이 닿습니다');
  if (comp && !reachable(job, comp)) return fail(comp.layer === 2 ? '섀시를 빼야 보입니다' : '덮개를 열어야 보입니다');
  if (tp && !visible(job, tp.layer)) return fail('덮개를 열어야 닿습니다');
  if (tool === 'mark' && comp) {
    const now = job.tags[comp.id];
    if (!now) job.tags[comp.id] = 'sus'; else if (now === 'sus') job.tags[comp.id] = 'ok'; else delete job.tags[comp.id];
    return { ok: true, text: '' };
  }
  if ((tool === 'loupe' || tool === 'inject') && !state.tools.includes(tool)) return fail('공구상에서 살 수 있습니다');
  const cost = TOOL_TIME[tool];
  const blocked = canSpend(state, cost);
  if (blocked) return blocked;
  const onComp = comp ? job.faults.map(id => faultOf(def, id)).filter(f => f.comp === comp.id) : [];
  const sim = simulate(job);
  const isClock = def.id === 'clock';
  let text = '';
  switch (tool) {
    case 'look':
    case 'loupe': {
      if (tp?.kind === 'amp') { found(job, tp.id).tp = sim.tp[tp.id]; text = `진폭 ${sim.tp[tp.id].v}°`; break; }
      if (!comp) return fail('부품을 누르세요');
      const hit = onComp.find(f => f.mark && (tool === 'loupe' || !f.fine));
      found(job, comp.id)[tool] = hit?.mark ?? 'ok';
      text = hit?.seen ?? (tool === 'loupe' ? '확대해도 흠이 없다' : '겉보기엔 멀쩡하다');
      break;
    }
    case 'volt': {
      if (!tp || tp.kind === 'beat' || tp.kind === 'amp') return fail(isClock ? '시계엔 전기가 없습니다' : '놋쇠 측정점에 대세요');
      found(job, tp.id).tp = { ...sim.tp[tp.id] };
      text = `${tp.label} ${sim.tp[tp.id].v}${tp.unit}`;
      break;
    }
    case 'ohm': {
      if (!comp) return fail('부품에 대세요');
      if (isClock) return fail('시계엔 전기가 없습니다');
      if (job.ctx.power) return fail('전원을 빼고 재세요');
      const r = ohmOf(job, comp);
      if (!r) return fail('잴 단자가 없습니다');
      found(job, comp.id).ohm = r;
      text = `${comp.short} ${r.v === Infinity ? '∞' : r.v + 'Ω'}`;
      break;
    }
    case 'ear': {
      if (tp?.kind === 'beat') { found(job, tp.id).tp = sim.tp[tp.id]; text = '박자를 들었다'; break; }
      if (!comp) return fail('부품을 누르세요');
      found(job, comp.id).ear = sim.ear[comp.id] ?? 'quiet';
      break;
    }
    case 'touch': {
      if (!comp) return fail('부품을 누르세요');
      if (comp.shape === 'blade' && (sim.fx.spin ?? 0) > 0) return fail('도는 날개는 위험!');
      const f = found(job, comp.id);
      f.heat = sim.heat[comp.id] ?? 0;
      f.feel = def.feel?.(new Set(job.faults), comp.id) ?? onComp.find(x => x.feel)?.feel ?? comp.feel;
      break;
    }
    case 'wiggle': {
      if (!comp) return fail('부품을 누르세요');
      if (!job.ctx.power) return fail('켠 채로 흔들어야 압니다');
      const moved = simulate(job, { wiggle: comp.id });
      found(job, comp.id).shake = moved.obs !== sim.obs || def.tps.some(t2 => moved.tp[t2.id]?.v !== sim.tp[t2.id]?.v);
      text = moved.obs;
      break;
    }
    case 'inject': {
      if (!def.inject) return fail('쓸 데가 없습니다');
      if (!tp) return fail('측정점에 대세요');
      const r = def.inject(new Set(job.faults), job.ctx, tp.id);
      if (r.why) return fail(r.why);
      found(job, tp.id).inject = r.level;
      break;
    }
    default:
      return fail('');
  }
  state.minute += cost;
  return { ok: true, text };
}

/** 흔들기: 누르고 있는 동안만 흔든다 */
export function startWiggle(state: GameState, compId: string): Result {
  const job = activeJob(state);
  if (!job) return fail('');
  const comp = compOf(item(job.itemId), compId);
  if (!comp || !reachable(job, comp)) return fail('손이 닿지 않습니다');
  if (!job.ctx.power) return fail('켠 채로 흔들어야 압니다');
  const blocked = canSpend(state, 1);
  if (blocked) return blocked;
  state.minute += 1;
  job.ctx.wiggle = compId;
  return { ok: true, text: '' };
}
export function stopWiggle(state: GameState) { const job = activeJob(state); if (job) job.ctx.wiggle = null; }

/** 손으로 부품을 조작 */
export function handUse(state: GameState, compId: string): Result {
  const job = activeJob(state);
  if (!job) return fail('');
  const def = item(job.itemId);
  const comp = compOf(def, compId);
  if (!comp?.hand) return fail('');
  if (!reachable(job, comp)) return fail('손이 닿지 않습니다');
  switch (comp.hand) {
    case 'power': return setCtx(state, { power: !job.ctx.power });
    case 'switch': return setCtx(state, { sw: (job.ctx.sw + 1) % (def.sw?.length ?? 2) });
    case 'nudge': return nudge(state);
    default: return fail('');
  }
}

export function repairMinutes(def: ItemDef, action: Action) { return def.id === 'clock' && action === 'adjust' ? 15 : ACTION_TIME[action]; }

/** 수리를 시작할 수 있는지 미리 확인한다 (손맛 조작 전에) */
export function repairCheck(state: GameState, compId: string, action: Action): Result | null {
  const job = activeJob(state);
  if (!job) return fail('');
  const def = item(job.itemId);
  const comp = compOf(def, compId);
  if (!comp || !(comp.acts.includes(action) || action === 'replace' && comp.part)) return fail('그 작업은 못 합니다');
  if (!reachable(job, comp)) return fail('손이 닿지 않습니다');
  if (job.ctx.power && def.id !== 'clock') return fail('감전 위험! 전원부터 빼세요');
  const blocked = canSpend(state, repairMinutes(def, action));
  if (blocked) return blocked;
  const price = action === 'replace' ? comp.part ?? 0 : 0;
  if (price > state.money) return fail(`부품값 ${won(price)}이 모자랍니다`);
  return null;
}

export function repair(state: GameState, compId: string, action: Action): Result {
  const blocked = repairCheck(state, compId, action);
  if (blocked) return blocked;
  const job = activeJob(state)!;
  const def = item(job.itemId);
  const comp = compOf(def, compId)!;
  const minutes = repairMinutes(def, action);
  const price = action === 'replace' ? comp.part ?? 0 : 0;
  state.money -= price;
  state.summary.parts += price;
  job.spent += price;
  state.minute += minutes;
  const fixed = job.faults.filter(id => { const f = faultOf(def, id); return f.comp === comp.id && (action === 'replace' || f.fix === action); });
  job.faults = job.faults.filter(id => !fixed.includes(id));
  for (const id of fixed) if (!job.solved.includes(id)) job.solved.push(id);
  delete job.found[comp.id];
  job.ctx.warm = false;
  job.ctx.nudge = false;
  if (!fixed.length) job.wrong = (job.wrong ?? 0) + 1;
  return { ok: true, text: `${comp.short} ${ACTION_NAME[action]}${price ? ' −' + won(price) : ''}`, fixed: fixed.length };
}

export function setOpen(state: GameState, level: number): Result {
  const job = activeJob(state);
  if (!job) return fail('');
  const def = item(job.itemId);
  const max = def.chassis ? 2 : 1;
  if (level < 0 || level > max || level === job.open) return fail('');
  const minutes = Math.abs(level - job.open) * (level > job.open ? 5 : 3);
  const blocked = canSpend(state, minutes);
  if (blocked) return blocked;
  state.minute += minutes;
  job.open = level;
  return { ok: true, text: '' };
}

/** 전원·스위치·노브처럼 시간이 들지 않는 조작 */
export function setCtx(state: GameState, change: Partial<Ctx>): Result {
  const job = activeJob(state);
  if (!job || state.ending) return fail('');
  const turnedOff = change.power === false || change.sw === 0;
  Object.assign(job.ctx, change);
  job.ctx.moved = change.knobB !== undefined;
  if (turnedOff) { job.ctx.warm = false; job.ctx.nudge = false; }
  settle(job);
  return { ok: true, text: '' };
}

export function nudge(state: GameState): Result {
  const job = activeJob(state);
  if (!job) return fail('');
  const blocked = canSpend(state, 1);
  if (blocked) return blocked;
  state.minute += 1;
  job.ctx.nudge = true;
  settle(job);
  return { ok: true, text: '' };
}

export function watch(state: GameState): Result {
  const job = activeJob(state);
  if (!job) return fail('');
  if (!job.ctx.power) return fail(`먼저 ${item(job.itemId).power.on}`);
  const blocked = canSpend(state, 10);
  if (blocked) return blocked;
  state.minute += 10;
  job.ctx.warm = true;
  settle(job);
  return { ok: true, text: '' };
}

/* ---------- 손님 응대 ---------- */
export type ReturnOutcome = { kind: 'paid' | 'refused' | 'gaveup'; job: Job; fee: number; comeback: boolean; learned: string[] };

export function handBack(state: GameState, giveUp = false): ReturnOutcome | Result {
  const job = activeJob(state);
  if (!job) return fail('');
  const def = item(job.itemId);
  const blocked = canSpend(state, job.open * 3 + 3);
  if (blocked) return blocked;
  state.minute += job.open * 3 + 3;
  job.open = 0;
  Object.assign(job.ctx, freshCtx());
  if (giveUp) {
    state.trust = Math.max(0, state.trust - 1);
    removeJob(state, job);
    state.summary.lost++;
    return { kind: 'gaveup', job, fee: 0, comeback: false, learned: [] };
  }
  if (job.faults.some(id => !faultOf(def, id).latent)) return { kind: 'refused', job, fee: 0, comeback: false, learned: [] };
  const comeback = job.faults.length > 0;
  job.fee = payFor(job);
  state.money += job.fee;
  state.summary.income += job.fee;
  state.summary.returned++;
  if (!job.comeback && job.spent <= job.fee * 0.35) state.trust = Math.min(10, state.trust + 1);
  const learned = job.solved.filter(id => !state.casebook.includes(`${def.id}/${id}`));
  for (const id of learned) state.casebook.push(`${def.id}/${id}`);
  if (comeback) {
    state.pending.push({
      ...structuredClone(job), id: `j${state.nextId++}`, fee: 0, comeback: true, dueDay: state.day + 2,
      complaint: '또 그래요! ' + faultOf(def, job.faults[0]).complaint,
      found: {}, tags: {}, spent: 0, solved: [], ctx: freshCtx(), open: 0,
    });
  }
  removeJob(state, job);
  return { kind: 'paid', job, fee: job.fee, comeback, learned: learned.map(id => faultOf(def, id).name) };
}

function removeJob(state: GameState, job: Job) {
  state.jobs = state.jobs.filter(j => j.id !== job.id);
  if (state.active === job.id) state.active = state.jobs[0]?.id ?? null;
}

/* ---------- 하루 ---------- */
export function payDebt(state: GameState, amount: number): Result {
  const pay = Math.min(amount, state.debt, state.money);
  if (pay <= 0) return fail('갚을 돈이 없습니다');
  state.money -= pay;
  state.debt -= pay;
  checkWin(state);
  return { ok: true, text: state.debt ? `${won(pay)} 갚음` : '빚을 다 갚았다!' };
}

export function buyTool(state: GameState, id: string): Result {
  const row = TOOL_SHOP.find(t => t.id === id);
  if (!row || state.tools.includes(id)) return fail('');
  if (state.day < row.day) return fail(`${row.day}일차부터 들어옵니다`);
  if (state.money < row.price) return fail('돈이 모자랍니다');
  state.money -= row.price;
  state.summary.parts += row.price;
  state.tools.push(id);
  return { ok: true, text: `${row.name} 구입!` };
}

export type DayReport = { summary: GameState['summary']; collected: Job[] };

export function endDay(state: GameState): DayReport {
  const collected: Job[] = [];
  for (const job of [...state.jobs]) {
    if (job.dueDay <= state.day) {
      collected.push(job);
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
  else if (state.day >= DEADLINE && state.debt > 0 && !state.endless) state.ending = 'lost';
  return { summary, collected };
}

export function startDay(state: GameState): string[] {
  state.day++;
  state.minute = 0;
  state.summary = { day: state.day, income: 0, parts: 0, expenses: 0, returned: 0, lost: 0 };
  for (const job of state.jobs) Object.assign(job.ctx, { power: false, sw: 0, warm: false, nudge: false, wiggle: null });
  const arrivals: Job[] = [];
  const back = state.pending.filter(j => j.dueDay - 1 <= state.day);
  state.pending = state.pending.filter(j => j.dueDay - 1 > state.day);
  for (const job of back) { state.trust = Math.max(0, state.trust - 2); arrivals.push(job); }
  const count = 2 + Math.floor((levelOf(state) - 1) / 2) + (state.trust >= 6 ? 1 : 0) + (state.trust >= 9 ? 1 : 0);
  for (let i = 0; i < count && state.jobs.length + arrivals.length < shelfLimit(state); i++) arrivals.push(randomJob(state));
  state.jobs.push(...arrivals);
  state.arrivals = arrivals.map(j => j.id);
  if (!activeJob(state)) state.active = state.jobs[0]?.id ?? null;
  return state.arrivals;
}

export function continueEndless(state: GameState) { state.endless = true; state.ending = null; }

export function casebookEntries() {
  return ITEMS.flatMap(def => def.faults.map(f => ({ key: `${def.id}/${f.id}`, item: def, fault: f })));
}

/** 틀린 정답 시도마다 10%씩 깎인 수리비 (최소 절반) */
export function payFor(job: Job) {
  return Math.round(job.fee * Math.max(0.5, 1 - 0.1 * (job.wrong ?? 0)) / 100) * 100;
}

const ACTION_HINT: Record<Action, string> = { replace: '새 것으로 바꿔야 한다', clean: '닦으면 산다', solder: '납땜을 다시 하면 된다', oil: '기름이 필요하다', adjust: '맞춰 주면 된다' };

/** 할아버지 쪽지: 단계마다 더 구체적인 힌트. 5분이 든다 */
export function hint(state: GameState): Result & { comp?: string; level?: number } {
  const job = activeJob(state);
  if (!job) return fail('');
  const def = item(job.itemId);
  const target = job.faults.map(id => faultOf(def, id)).sort((a, b) => Number(!!a.latent) - Number(!!b.latent))[0];
  if (!target) return { ok: true, text: '다 고친 것 같구나. 켜 보고 돌려주거라.' };
  const blocked = canSpend(state, 5);
  if (blocked) return blocked;
  state.minute += 5;
  const level = job.hints = Math.min(3, (job.hints ?? 0) + 1);
  const comp = compOf(def, target.comp)!;
  if (level === 1) {
    const how = target.latent ? '켜 두고 10분 지켜보거나, 켠 채로 손으로 흔들어 봐라'
      : target.mark && !target.fine ? '눈으로 하나씩 살펴봐라. 흠이 보일 게다'
      : target.ohm ? '전기가 어디까지 오는지 테스터로 따라가 봐라'
      : target.feel ? '손으로 만져 보고 돌려 봐라'
      : '켜 놓고 청진기를 대 봐라';
    return { ok: true, text: how, level };
  }
  if (level === 2) return { ok: true, text: `${comp.short} 근처가 수상하구나`, comp: comp.id, level };
  return { ok: true, text: `범인은 ${comp.short}. ${ACTION_HINT[target.fix]}`, comp: comp.id, level };
}
