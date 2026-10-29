/**
 * 퍼즐 검증: 모든 고장이
 *  1) 정상품과 구별되는 관찰을 남기고
 *  2) 같은 물건의 다른 고장과 구별되며
 *  3) 정해진 수리로 실제로 고쳐지는지
 * 그리고 무작위 의뢰 수백 건을 정답 수리로 끝까지 풀 수 있는지 확인한다.
 */
import { ITEMS } from '../src/items';
import type { Ctx, ItemDef } from '../src/types';
import { ANSWERS, natureOf, activeJob, faultOf, handBack, newGame, repair, setCtx, setOpen, simulate, startDay, endDay, useTool, watch, nudge } from '../src/game';

let failures = 0;
const fail = (msg: string) => { failures++; console.error('FAIL', msg); };

function contexts(def: ItemDef): Ctx[] {
  const out: Ctx[] = [];
  const sws = def.sw ? def.sw.map((_, i) => i) : [0];
  const knobsA = def.knobA ? [0.1, 0.27, 0.47, 0.66] : [0.15];
  const knobsB = def.knobB ? [0.3, 0.5, 0.9] : [0.5];
  for (const power of [true, false]) for (const sw of sws) for (const knobA of knobsA) for (const knobB of knobsB)
    for (const warm of [false, true]) for (const nudge of [false, true]) for (const wiggle of [null, ...def.comps.map(c => c.id)])
      out.push({ power, sw, knobA, knobB, warm, nudge, wiggle, moved: true });
  return out;
}

function signature(def: ItemDef, faults: string[]) {
  const f = new Set(faults);
  const parts: string[] = [];
  for (const c of contexts(def)) {
    const s = def.sim(f, c);
    parts.push(JSON.stringify([s.obs, s.tp, s.heat, s.ear, s.blow.map(b => b.id)]));
    if (def.inject) for (const tp of def.tps) parts.push(JSON.stringify(def.inject(f, c, tp.id)));
  }
  for (const comp of def.comps) {
    const on = faults.map(id => def.faults.find(x => x.id === id)!).filter(x => x.comp === comp.id);
    parts.push(comp.id, on.map(x => [x.mark, x.fine, JSON.stringify(x.ohm), x.feel].join('|')).join(','), def.feel?.(f, comp.id) ?? '');
  }
  return parts.join('\n');
}

for (const def of ITEMS) {
  const healthy = signature(def, []);
  const sigs = new Map<string, string>();
  for (const fault of def.faults) {
    if (!def.comps.some(c => c.id === fault.comp)) fail(`${def.id}/${fault.id}: 부품 ${fault.comp} 없음`);
    const comp = def.comps.find(c => c.id === fault.comp)!;
    if (!comp.acts.includes(fault.fix) && !(fault.fix === 'replace' && comp.part)) fail(`${def.id}/${fault.id}: 수리 동작 ${fault.fix} 불가`);
    if (fault.fix === 'replace' && !comp.part) fail(`${def.id}/${fault.id}: 교체 부품값 없음`);
    const sig = signature(def, [fault.id]);
    if (sig === healthy) fail(`${def.id}/${fault.id}: 정상품과 구별되지 않음`);
    const twin = sigs.get(sig);
    if (twin) fail(`${def.id}/${fault.id}: ${twin}와 구별되지 않음`);
    sigs.set(sig, fault.id);
    if (!fault.latent) {
      const base: Ctx = { power: true, sw: def.sw ? def.sw.length - 1 : 0, knobA: 0.27, knobB: 0.7, wiggle: null, warm: false, nudge: true, moved: false };
      const variants = def.sw ? def.sw.map((_, i) => ({ ...base, sw: i })) : [base];
      const seen = variants.some(c => JSON.stringify(def.sim(new Set([fault.id]), { ...c, nudge: false }).obs) !== JSON.stringify(def.sim(new Set(), { ...c, nudge: false }).obs)
        || JSON.stringify(def.sim(new Set([fault.id]), c).obs) !== JSON.stringify(def.sim(new Set(), c).obs)
        || JSON.stringify(def.sim(new Set([fault.id]), { ...c, moved: true }).obs) !== JSON.stringify(def.sim(new Set(), { ...c, moved: true }).obs));
      if (!seen) fail(`${def.id}/${fault.id}: 잠복 표시가 없는데 평소 사용에서 증상이 안 보임`);
    }
  }
  console.log(`OK ${def.name}: 고장 ${def.faults.length}종 모두 구별 가능`);
}

// 무작위 캠페인: 정답 수리만 하는 정책으로 여러 날을 진행
let solvedJobs = 0;
for (let seed = 1; seed <= 40; seed++) {
  const state = newGame(seed);
  state.money = 500000;
  state.tools = ['loupe', 'inject'];
  state.level = 4;
  state.unlocked = Object.fromEntries(ITEMS.map(i => [i.id, 1]));
  for (let day = 1; day <= 10; day++) {
    for (const job of [...state.jobs]) {
      state.active = job.id;
      const def = ITEMS.find(i => i.id === job.itemId)!;
      setOpen(state, def.chassis ? 2 : 1);
      setCtx(state, { power: true, sw: def.sw ? def.sw.length - 1 : 0 });
      useTool(state, 'look', { comp: def.comps[0].id });
      setCtx(state, { power: false, sw: 0 });
      let guard = 0;
      while (activeJob(state)?.faults.length && guard++ < 10) {
        const id = activeJob(state)!.faults[0];
        const f = faultOf(def, id);
        setOpen(state, def.comps.find(c => c.id === f.comp)!.front ? 0 : def.chassis ? 2 : 1);
        const r = repair(state, f.comp, f.fix);
        if (!r.ok) { state.minute = 0; repair(state, f.comp, f.fix); }
        setCtx(state, { power: true, sw: def.sw ? def.sw.length - 1 : 0 });
        nudge(state);
        watch(state);
        setCtx(state, { power: false, sw: 0 });
      }
      if (activeJob(state)?.faults.length) fail(`seed ${seed} day ${day}: ${job.itemId} ${job.faults} 정답 수리로 안 풀림`);
      state.minute = Math.min(state.minute, 500);
      const out = handBack(state);
      if ('kind' in out && out.kind === 'paid') solvedJobs++;
      else fail(`seed ${seed}: 반환 실패 ${JSON.stringify(out)}`);
    }
    endDay(state);
    startDay(state);
    for (const j of state.jobs) if (simulate(j).blow.length && !j.ctx.power) fail('전원 꺼진 상태에서 연쇄 고장');
  }
}
console.log(`OK 무작위 의뢰 ${solvedJobs}건을 정답 수리로 해결`);

// 핵심 함정: 단락 콘덴서를 두고 퓨즈만 갈면 다시 끊어진다
{
  const state = newGame(7);
  state.day = 6;
  state.money = 100000;
  const job = activeJob(state)!;
  job.itemId = 'radio';
  job.faults = ['cap_short', 'fuse_blown'];
  setOpen(state, 1);
  repair(state, 'fuse', 'replace');
  setCtx(state, { power: true, sw: 1 });
  if (!job.faults.includes('fuse_blown')) fail('단락 콘덴서가 새 퓨즈를 끊지 않음');
  setCtx(state, { power: false, sw: 0 });
  const r = useTool(state, 'ohm', { comp: 'fcap' });
  if (!r.text.includes('0.5Ω')) fail('단락 콘덴서 저항값이 드러나지 않음');
  repair(state, 'fcap', 'replace');
  repair(state, 'fuse', 'replace');
  setCtx(state, { power: true, sw: 1 });
  if (job.faults.length) fail('원인과 결과를 모두 고쳤는데 고장이 남음');
  console.log('OK 연쇄 고장: 원인을 두고 결과만 고치면 재발');
}

// 잠복 고장을 남기고 돌려주면 다음 날 무상 재수리로 돌아온다
{
  const state = newGame(9);
  const job = activeJob(state)!;
  job.itemId = 'lamp';
  job.faults = ['joint_cold'];
  const out = handBack(state);
  if (!('kind' in out) || out.kind !== 'paid' || !out.comeback) fail('잠복 고장 반환 처리 오류');
  endDay(state);
  const trust = state.trust;
  startDay(state);
  if (!state.jobs.some(j => j.comeback && j.faults.includes('joint_cold'))) fail('재수리 의뢰가 돌아오지 않음');
  if (state.trust !== trust - 2) fail('재방문 신뢰 하락 없음');
  console.log('OK 잠복 고장: 대금은 받지만 다음 날 재방문과 신뢰 하락');
}

// 손님 대답: 모든 고장이 대답 표에 있는 성격으로 분류되고, 물건마다 대답이 한 가지로 몰리지 않는다
for (const def of ITEMS) {
  const kinds = new Set<string>();
  for (const f of def.faults) for (const [q, a] of Object.entries(natureOf(f))) { if (!ANSWERS[a]) fail(`${def.id}/${f.id}: 대답 ${q}=${a} 없음`); kinds.add(a); }
  if (kinds.size < 4) fail(`${def.id}: 손님 대답이 너무 단조로움`);
}
console.log('OK 손님 대답: 모든 고장에 성격이 붙는다');

if (failures) throw new Error(`${failures}건 실패`);
console.log('모든 검증 통과');
