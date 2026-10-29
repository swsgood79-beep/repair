import { ITEMS } from '../src/items';
import { activeJob, faultOf, handBack, newGame, repair, setOpen, startDay, endDay, buyTool, payDebt, expand, SHOP_LEVELS } from '../src/game';

// 정답을 아는 정책 + 진단에 의뢰당 시간 T분을 쓰고, 확률 w로 엉뚱한 부품 하나를 교체하는 "사람 같은" 정책
for (const [T, w] of [[20, 0], [35, 0.3], [50, 0.6], [80, 0.6]] as const) {
  const totals: number[] = [];
  const wins: number[] = [];
  for (let seed = 1; seed <= 60; seed++) {
    const state = newGame(seed);
    let rng = seed * 99991;
    const r = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let day = 1; day <= 14 && !state.ending; day++) {
      if (day === 2) buyTool(state, 'loupe');
      for (const job of [...state.jobs]) {
        state.active = job.id;
        const def = ITEMS.find(i => i.id === job.itemId)!;
        if (state.minute + T + 40 > 600) break;
        state.minute += T;
        if (r() < w) { const c = def.comps.find(c => c.part)!; setOpen(state, c.layer); repair(state, c.id, 'replace'); }
        let g = 0;
        while (activeJob(state)?.faults.length && g++ < 8) {
          const f = faultOf(def, activeJob(state)!.faults[0]);
          setOpen(state, def.comps.find(c => c.id === f.comp)!.front ? 0 : def.chassis ? 2 : 1);
          repair(state, f.comp, f.fix);
        }
        handBack(state);
      }
      endDay(state);
      // 가게 확장을 먼저, 남는 돈으로 빚을 갚는다
      const next = SHOP_LEVELS[state.level ?? 1];
      if (next && state.money - next.price > 40000) expand(state);
      payDebt(state, Math.max(0, state.money - 40000));
      if (state.ending === 'kept') wins.push(day);
      if (!state.ending) startDay(state);
    }
    totals.push(800000 - state.debt + state.money);
  }
  totals.sort((a, b) => a - b);
  console.log(`진단 ${T}분, 헛교체 ${w}: 14일 순수익 중앙값 ${totals[30]} (하위 10% ${totals[6]}, 상위 10% ${totals[54]}) · 본점+빚 완료 ${wins.length}/60판${wins.length ? `, 평균 ${(wins.reduce((a, b) => a + b, 0) / wins.length).toFixed(1)}일째` : ''}`);
}
