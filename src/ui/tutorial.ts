import { activeJob, simulate } from '../game';
import { C, Painter } from '../gfx/painter';
import { holder, region, regionById, ui } from './core';

/** 첫 손님(스탠드) 안내. 조건을 만족하면 다음 단계로 넘어간다. */
const STEPS: { text: string; target: () => string; done: () => boolean }[] = [
  { text: '손님 말은 “안 켜진다”. 먼저 [손]으로 플러그를 눌러 꽂아 보자', target: () => ui.tool !== 'hand' ? 'tool:hand' : 'c:plug', done: () => !!job()?.ctx.power },
  { text: '스위치를 눌러 켜 보자', target: () => ui.tool !== 'hand' ? 'tool:hand' : 'c:switch', done: () => job()?.ctx.sw === 1 },
  { text: '전구가 안 켜진다! 전기가 어디까지 오나? [전압]을 골라 소켓 단자를 재 보자', target: () => ui.tool !== 'volt' ? 'tool:volt' : 't:t3', done: () => !!job()?.found.t3?.tp },
  { text: '소켓까지 220V가 왔다(초록). 그럼 전구 쪽이다. [눈]으로 전구를 보자', target: () => ui.tool !== 'look' ? 'tool:look' : 'c:bulb', done: () => !!job()?.found.bulb?.look },
  { text: '필라멘트가 끊겼다! 고치기 전에 플러그부터 뽑자', target: () => ui.tool !== 'hand' ? 'tool:hand' : 'c:plug', done: () => !job()?.ctx.power },
  { text: '[수리]를 골라 전구를 누르고, 새 전구로 교체하자', target: () => ui.overlay?.kind === 'repair' ? (ui.overlay.action ? 'rp-new' : 'rp-replace') : ui.tool !== 'repair' ? 'tool:repair' : 'c:bulb', done: () => !job()?.faults.length },
  { text: '고쳤는지는 켜 봐야 안다. 플러그를 꽂고 스위치를 켜 보자', target: () => !job()?.ctx.power ? 'power' : 'sw1', done: () => { const j = job(); return !!j && j.ctx.power && j.ctx.sw === 1 && simulate(j).obs.includes('환하게'); } },
  { text: '환하게 켜졌다! [돌려주기]로 손님에게 건네자', target: () => 'handback', done: () => holder.state.jobs.every(j => j.itemId !== 'lamp') },
];

const job = () => {
  const j = activeJob(holder.state);
  return j && j.itemId === 'lamp' && j.id === 'j1' ? j : null;
};

export function tutorialStep() {
  const s = holder.state;
  if (s.tutorial < 0 || s.tutorial >= STEPS.length) return null;
  while (s.tutorial < STEPS.length && STEPS[s.tutorial].done()) s.tutorial++;
  if (s.tutorial >= STEPS.length) { s.tutorial = -1; return null; }
  return STEPS[s.tutorial];
}

export function drawTutorial(p: Painter, t: number) {
  if (ui.scene !== 'bench' || !job()) return;
  const step = tutorialStep();
  if (!step) return;
  const x = 416, y = 120, w = 216, h = 52;
  p.panel(x, y, w, h, '#fff3c4', '#8a6a1f');
  p.text(`안내 ${holder.state.tutorial + 1}/${STEPS.length}`, x + 6, y + 3, 8, '#8a6a1f', 'left', 700);
  p.wrap(step.text, x + 6, y + 14, w - 12, 10, C.ink, 12.5, 700);
  const skip = { x: x + w - 46, y: y + 3, w: 40, h: 12 };
  p.text('건너뛰기', skip.x + 20, skip.y, 8, '#8a6a1f', 'center', 700);
  region({ id: 'tut-skip', ...skip, click: () => { holder.state.tutorial = -1; } });
  const r = regionById(step.target());
  if (!r) return;
  const bob = Math.round(Math.sin(t * 8) * 3);
  const ax = r.x + r.w / 2, ay = r.y - 6 + bob;
  for (let i = 0; i < 6; i++) p.rect(ax - 6 + i, ay - 12 + i, 12 - i * 2, 1, C.gold);
  p.rect(ax - 2, ay - 22, 4, 10, C.gold);
  p.rect(r.x - 2, r.y - 2, r.w + 4, 1, C.gold); p.rect(r.x - 2, r.y + r.h + 1, r.w + 4, 1, C.gold);
  p.rect(r.x - 2, r.y - 2, 1, r.h + 4, C.gold); p.rect(r.x + r.w + 1, r.y - 2, 1, r.h + 4, C.gold);
}
