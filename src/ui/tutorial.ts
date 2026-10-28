import { activeJob } from '../game';
import { C, Painter } from '../gfx/painter';
import { holder, region, regionById, ui } from './core';
import { miniActive } from './mini';

/** 첫 손님(스탠드) 안내. 조건을 만족하면 다음 단계로 넘어간다. */
const STEPS: { text: string; target: () => string; done: () => boolean }[] = [
  { text: '손님 말: “안 켜져요”. 직접 켜 보자. [손]으로 플러그를 눌러 꽂자', target: () => ui.tool !== 'hand' ? 'tool:hand' : 'c:plug', done: () => !!job()?.ctx.power },
  { text: '스위치도 눌러 켜자', target: () => ui.tool !== 'hand' ? 'tool:hand' : 'c:switch', done: () => job()?.ctx.sw === 1 },
  { text: '전구가 안 켜진다! 전기가 어디까지 오나? [테스터]로 소켓 단자(놋쇠 점)를 재자', target: () => ui.tool !== 'tester' ? 'tool:tester' : 't:t3', done: () => !!job()?.found.t3?.tp },
  { text: '소켓까지 전기는 온다! 그럼 범인은 그 뒤, 전구다. [눈]으로 전구를 보자', target: () => ui.tool !== 'look' ? 'tool:look' : 'c:bulb', done: () => !!job()?.found.bulb?.look },
  { text: '필라멘트가 끊겼다! 용의자 보드에서 전구를 눌러 [교체]하자. 직접 돌려 빼고 끼운다', target: () => ui.overlay?.kind === 'accuse' ? 'acc:replace' : 's:bulb', done: () => !job()?.faults.length },
  { text: '자물쇠가 풀렸다! 확인을 누르고, 다시 플러그를 꽂아 켜 보자', target: () => ui.overlay?.kind === 'accuse' ? 'acc-ok' : 'power', done: () => { const j = job(); return !!j && !ui.overlay && j.ctx.power && j.ctx.sw === 1; } },
  { text: '환하게 켜졌다! [돌려주기]로 손님에게 건네자', target: () => 'handback', done: () => holder.state.jobs.every(j => j.id !== 'j1') },
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
  if (miniActive()) { arrowTo(p, 'mini-focus', t); return; }
  const x = 414, y = 236, w = 220, h = 54;
  p.panel(x, y, w, h, '#fff3c4', '#8a6a1f');
  p.text(`안내 ${holder.state.tutorial + 1}/${STEPS.length}`, x + 6, y + 3, 8, '#8a6a1f', 'left', 700);
  p.wrap(step.text, x + 6, y + 14, w - 12, 10, C.ink, 12.5, 700);
  const skip = { x: x + w - 46, y: y + 3, w: 40, h: 12 };
  p.text('건너뛰기', skip.x + 20, skip.y, 8, '#8a6a1f', 'center', 700);
  region({ id: 'tut-skip', ...skip, click: () => { holder.state.tutorial = -1; } });
  arrowTo(p, step.target(), t);
}

function arrowTo(p: Painter, id: string, t: number) {
  const r = regionById(id);
  if (!r) return;
  const bob = Math.round(Math.sin(t * 8) * 3);
  const ax = r.x + r.w / 2, ay = r.y - 6 + bob;
  for (let i = 0; i < 6; i++) p.rect(ax - 6 + i, ay - 12 + i, 12 - i * 2, 1, C.gold);
  p.rect(ax - 2, ay - 22, 4, 10, C.gold);
  p.rect(r.x - 2, r.y - 2, r.w + 4, 1, C.gold); p.rect(r.x - 2, r.y + r.h + 1, r.w + 4, 1, C.gold);
  p.rect(r.x - 2, r.y - 2, 1, r.h + 4, C.gold); p.rect(r.x + r.w + 1, r.y - 2, 1, r.h + 4, C.gold);
}
