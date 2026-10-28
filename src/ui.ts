import type { Action, GameState, Job, ToolId } from './types';
import { item } from './items';
import { drawBench } from './draw';
import {
  ACTION_NAME, ACTION_TIME, DAILY_COST, DEADLINE, START_DEBT, TOOL_SHOP, TOOL_TIME, activeJob, buyTool, casebookEntries, clearSave, clockText,
  compOf, continueEndless, endDay, handBack, load, newGame, nudge, payDebt, repair, save, setCtx, setOpen, simulate, startDay,
  timeLeft, useTool, watch, won, type DayReport, type ReturnOutcome,
} from './game';
import { setSound, updateSound } from './audio';
import { josa } from './items/util';

const TOOLS: { id: ToolId; name: string; hint: string; needs?: string }[] = [
  { id: 'look', name: '눈으로 보기', hint: '부품의 겉모습을 살핀다. 진폭 눈금도 읽는다.' },
  { id: 'loupe', name: '돋보기', hint: '눈으로 놓치는 금, 바랜 막, 굳은 기름을 본다.', needs: 'loupe' },
  { id: 'volt', name: '테스터 · 전압', hint: '전원을 넣고 놋쇠 측정 단자에 댄다.' },
  { id: 'ohm', name: '테스터 · 저항', hint: '전원을 빼고 부품 양 끝에 댄다.' },
  { id: 'ear', name: '귀 대기', hint: '켜 둔 채 부품에 귀를 댄다. 시계는 박자를 듣는다.' },
  { id: 'wiggle', name: '흔들기', hint: '켜 둔 채 부품을 살살 흔들어 간헐 고장을 찾는다.' },
  { id: 'touch', name: '손으로 만지기', hint: '온도와 뻑뻑함을 손끝으로 느낀다.' },
  { id: 'inject', name: '신호 주입기', hint: '신호 단에 삐 소리를 넣어 뒤쪽이 살아 있는지 듣는다.', needs: 'inject' },
  { id: 'mark', name: '연필 표시', hint: '부품에 의심(?) → 정상(✓) → 지움 순으로 표시한다. 시간이 들지 않는다.' },
  { id: 'repair', name: '수리하기', hint: '부품을 눌러 교체·세척·납땜·주유·조정 중 하나를 고른다.' },
];

const MEMO = [
  ['손님 말은 증상이지 답이 아니다', '"새 전구를 끼워도 안 켜진다"면 전구 말고 다른 데를 봐라. 먼저 플러그를 꽂고 직접 켜서 증상을 눈으로 확인해라.'],
  ['전기는 물처럼 흐른다', '입구부터 차례로 측정 단자를 재 봐라. 전압이 있다가 사라지는 두 단자 사이에 범인이 있다. 연필로 적힌 정상값과 비교해라.'],
  ['저항은 전원을 빼고', '부품 하나를 의심하면 플러그를 뽑고 저항을 재라. ∞는 끊긴 것, 0에 가까우면 붙어버린 것이다.'],
  ['간헐 고장은 흔들고 기다려라', '가만두면 멀쩡한 물건이 있다. 켠 채로 흔들어 보고, 10분쯤 켜 두고 지켜봐라. 손님 말에 "가끔"이 들어 있으면 꼭 해라.'],
  ['결과 말고 원인을 고쳐라', '퓨즈가 끊겼으면 왜 끊겼는지부터 찾아라. 새 퓨즈만 넣으면 또 탄다. 온도 퓨즈도 마찬가지다.'],
  ['부품을 아끼는 게 실력이다', '교체는 확실하지만 돈이 든다. 세척, 납땜, 주유로 살릴 수 있으면 그게 남는 장사다. 손님은 고쳐졌는지만 본다.'],
  ['돌려주기 전에 한 번 더', '손님은 카운터에서 잠깐 켜 보고 가져간다. 잠깐 켜서는 안 보이는 고장을 남기면 며칠 뒤 화가 나서 다시 온다.'],
  ['태엽 시계는 귀로 고친다', '똑·딱 간격, 진폭, 손끝에 걸리는 느낌. 테스터는 내려놓고 오래 지켜봐라.'],
];

type Modal =
  | { kind: 'arrivals' }
  | { kind: 'return'; outcome: ReturnOutcome }
  | { kind: 'confirm-giveup' }
  | { kind: 'confirm-close' }
  | { kind: 'day'; report: DayReport }
  | { kind: 'shop' }
  | { kind: 'ending' }
  | { kind: 'title' };

const ui = {
  tool: 'look' as ToolId,
  selected: null as string | null,
  repairTarget: null as string | null,
  flash: '' as string,
  flashBad: false,
  tab: 'log' as 'log' | 'book' | 'memo',
  modal: null as Modal | null,
  shelfOpen: false,
};

let state: GameState;
let root: HTMLElement;

export function boot(el: HTMLElement) {
  root = el;
  const saved = load();
  state = saved ?? newGame();
  ui.modal = saved ? null : { kind: 'title' };
  if (state.ending) ui.modal = { kind: 'ending' };
  if (state.tutorial) ui.tab = 'memo';
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', e => {
    const t = e.target as HTMLElement;
    if ((e.key === 'Enter' || e.key === ' ') && t.closest('[data-comp],[data-tp]')) { e.preventDefault(); onClick(e as unknown as MouseEvent); }
    if (e.key === 'Escape' && ui.modal && !['title', 'ending', 'day', 'arrivals'].includes(ui.modal.kind)) { ui.modal = null; render(); }
  });
  root.addEventListener('input', onInput);
  render();
}

function commit(text = '', bad = false) {
  ui.flash = text;
  ui.flashBad = bad;
  save(state);
  render();
}

function onInput(e: Event) {
  const t = e.target as HTMLInputElement;
  if (t.dataset.knob) {
    setCtx(state, { [t.dataset.knob]: Number(t.value) / 100 });
    save(state);
    renderBenchOnly();
  }
}

function onClick(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-comp],[data-tp]');
  if (!el) return;
  const job = activeJob(state);
  if (el.dataset.comp || el.dataset.tp) {
    if (!job || ui.modal) return;
    const comp = el.dataset.comp, tp = el.dataset.tp;
    ui.selected = comp ?? tp ?? null;
    if (ui.tool === 'repair') {
      if (!comp) return commit('수리는 부품을 눌러야 합니다.', true);
      const c = compOf(item(job.itemId), comp)!;
      if (!c.acts.length && !c.part) return commit(`${josa(c.name, '은', '는')} 이 가게에서 손댈 수 있는 부품이 아닙니다.`, true);
      ui.repairTarget = comp;
      return commit('');
    }
    const r = useTool(state, ui.tool, { comp, tp });
    return commit(r.text, !r.ok);
  }
  const act = el.dataset.act!;
  const arg = el.dataset.arg ?? '';
  if (!job && ['power', 'sw', 'nudge', 'watch', 'open', 'fix', 'handback', 'giveup', 'giveup-yes'].includes(act)) return;
  switch (act) {
    case 'tool': ui.tool = arg as ToolId; ui.repairTarget = null; return commit(TOOLS.find(t => t.id === arg)!.hint);
    case 'job': state.active = arg; ui.selected = null; ui.repairTarget = null; ui.shelfOpen = false; return commit('');
    case 'power': { const r = setCtx(state, { power: !job!.ctx.power }); return commit(r.text); }
    case 'sw': { const r = setCtx(state, { sw: Number(arg) }); return commit(r.text); }
    case 'nudge': { const r = nudge(state); return commit(r.text, !r.ok); }
    case 'watch': { const r = watch(state); return commit(r.text, !r.ok); }
    case 'open': { const r = setOpen(state, Number(arg)); return commit(r.text, !r.ok); }
    case 'fix': {
      const r = repair(state, ui.repairTarget!, arg as Action);
      if (r.ok) ui.repairTarget = null;
      return commit(r.text, !r.ok);
    }
    case 'cancel-fix': ui.repairTarget = null; return commit('');
    case 'handback': {
      const r = handBack(state);
      if ('kind' in r) { ui.modal = { kind: 'return', outcome: r }; ui.selected = null; return commit(''); }
      return commit(r.text, true);
    }
    case 'giveup': ui.modal = { kind: 'confirm-giveup' }; return render();
    case 'giveup-yes': {
      const r = handBack(state, true);
      ui.modal = 'kind' in r ? { kind: 'return', outcome: r } : null;
      return commit('kind' in r ? '' : r.text, !('kind' in r));
    }
    case 'close-day': ui.modal = { kind: 'confirm-close' }; return render();
    case 'close-yes': { const report = endDay(state); ui.modal = { kind: 'day', report }; return commit(''); }
    case 'next-day':
      if (state.ending) { ui.modal = { kind: 'ending' }; return commit(''); }
      startDay(state); ui.modal = { kind: 'arrivals' }; ui.tab = 'log'; return commit('');
    case 'shop': ui.modal = { kind: 'shop' }; return render();
    case 'buy': { const r = buyTool(state, arg); return commit(r.text, !r.ok); }
    case 'pay': { const r = payDebt(state, arg === 'all' ? Infinity : Number(arg)); return commit(r.text, !r.ok); }
    case 'modal-close': ui.modal = null; return commit('');
    case 'tab': ui.tab = arg as typeof ui.tab; return render();
    case 'sound': state.sound = !state.sound; setSound(state.sound); return commit('');
    case 'shelf': ui.shelfOpen = !ui.shelfOpen; return render();
    case 'new-game': clearSave(); state = newGame(); ui.modal = { kind: 'arrivals' }; ui.tab = 'memo'; ui.tool = 'look'; return commit('');
    case 'title': ui.modal = { kind: 'title' }; return render();
    case 'start': ui.modal = { kind: 'arrivals' }; return commit('');
    case 'endless': continueEndless(state); startDay(state); ui.modal = { kind: 'arrivals' }; return commit('');
  }
}

/* ---------- 그리기 ---------- */
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function header() {
  const left = DEADLINE - state.day;
  return `<header class="sign">
    <div class="sign-name"><span class="sign-small">라디오 · 선풍기 · 시계</span><h1>한결전파사</h1></div>
    <dl class="stats">
      <div><dt>날짜</dt><dd>${state.day}일차${state.endless ? '' : `<small> / ${DEADLINE}</small>`}</dd></div>
      <div><dt>시각</dt><dd class="${timeLeft(state) < 60 ? 'warn' : ''}">${clockText(state.minute)}</dd></div>
      <div><dt>금고</dt><dd>${won(state.money)}</dd></div>
      <div><dt>남은 빚</dt><dd class="${state.debt > 0 && left <= 3 ? 'warn' : ''}">${won(state.debt)}</dd></div>
      <div><dt>동네 신뢰</dt><dd class="trust" aria-label="신뢰 ${state.trust}/10">${'●'.repeat(state.trust)}<span>${'○'.repeat(10 - state.trust)}</span></dd></div>
    </dl>
    <div class="head-btns">
      <button data-act="shop" class="btn ghost">장부 · 공구상</button>
      <button data-act="sound" class="btn ghost" aria-pressed="${state.sound}">소리 ${state.sound ? '켬' : '끔'}</button>
      <button data-act="title" class="btn ghost">처음으로</button>
    </div>
  </header>`;
}

function shelf() {
  const tags = state.jobs.map(j => {
    const def = item(j.itemId);
    const due = j.dueDay - state.day;
    return `<button class="tag-card ${j.id === state.active ? 'on' : ''}" data-act="job" data-arg="${j.id}">
      <span class="tag-hole"></span>
      <strong>${def.name}</strong>
      <span>${esc(j.customer)}</span>
      <span class="tag-meta"><em class="${due <= 0 ? 'due' : ''}">${due <= 0 ? '오늘 마감' : `${due}일 뒤 마감`}</em>${j.comeback ? '<em class="due">무상 재수리</em>' : `<b>${won(j.fee)}</b>`}</span>
    </button>`;
  }).join('');
  return `<aside class="shelf ${ui.shelfOpen ? 'open' : ''}">
    <h2>맡은 물건 <small>${state.jobs.length}점</small></h2>
    <div class="tags">${tags || '<p class="empty">선반이 비었습니다. 영업을 마감하고 내일 손님을 받으세요.</p>'}</div>
    <button class="btn close-day" data-act="close-day">오늘 영업 마감</button>
  </aside>`;
}

function controls(job: Job) {
  const def = item(job.itemId);
  const c = job.ctx;
  const parts: string[] = [];
  parts.push(`<button class="btn power ${c.power ? 'on' : ''}" data-act="power">${c.power ? def.power.off : def.power.on}</button>`);
  if (def.sw) parts.push(`<div class="seg" role="group" aria-label="${def.sw.label}"><span>${def.sw.label}</span>${def.sw.options.map((o, i) => `<button class="${c.sw === i ? 'on' : ''}" data-act="sw" data-arg="${i}">${o}</button>`).join('')}</div>`);
  if (def.knobA) parts.push(`<label class="knob">${def.knobA.label}<input id="knobA" type="range" min="0" max="100" value="${Math.round(c.knobA * 100)}" data-knob="knobA"></label>`);
  if (def.knobB) parts.push(`<label class="knob">${def.knobB.label}<input id="knobB" type="range" min="0" max="100" value="${Math.round(c.knobB * 100)}" data-knob="knobB"></label>`);
  if (def.nudge) parts.push(`<button class="btn small" data-act="nudge">${def.nudge} <i>1분</i></button>`);
  parts.push(`<button class="btn small" data-act="watch">켜 두고 지켜보기 <i>10분</i></button>`);
  const max = def.chassis ? 2 : 1;
  if (job.open < max) parts.push(`<button class="btn small" data-act="open" data-arg="${job.open + 1}">${job.open === 0 ? def.coverLabel.split(' · ')[0] + ' 열기' : '섀시 빼기'} <i>5분</i></button>`);
  if (job.open > 0) parts.push(`<button class="btn small ghost" data-act="open" data-arg="${job.open - 1}">${job.open === 2 ? '섀시 넣기' : '덮개 닫기'} <i>3분</i></button>`);
  return `<div class="controls">${parts.join('')}</div>`;
}

function repairPanel(job: Job) {
  if (!ui.repairTarget) return '';
  const def = item(job.itemId);
  const c = compOf(def, ui.repairTarget)!;
  const acts: Action[] = [...c.acts];
  if (c.part && !acts.includes('replace')) acts.unshift('replace');
  const btns = acts.map(a => {
    const minutes = def.id === 'clock' && a === 'adjust' ? 15 : ACTION_TIME[a];
    return `<button class="btn" data-act="fix" data-arg="${a}">${ACTION_NAME[a]}<i>${minutes}분${a === 'replace' ? ' · ' + won(c.part ?? 0) : ''}</i></button>`;
  }).join('');
  return `<div class="repair-panel"><span><b>${c.name}</b>에 무엇을 할까요?</span>${btns}<button class="btn ghost" data-act="cancel-fix">취소</button></div>`;
}

function bench() {
  const job = activeJob(state);
  if (!job) return `<section class="bench"><div class="bench-empty"><p>작업대가 비어 있습니다.</p><p>선반에 맡은 물건이 없으면 영업을 마감하세요.</p></div></section>`;
  const def = item(job.itemId);
  const sim = simulate(job);
  updateSound(state.sound ? sim.fx : {});
  const showNotes = ['volt', 'ohm', 'ear', 'look', 'inject'].includes(ui.tool);
  const tools = TOOLS.map(t => {
    const missing = t.needs && !state.tools.includes(t.needs);
    return `<button class="tool ${ui.tool === t.id ? 'on' : ''} ${missing ? 'missing' : ''}" data-act="tool" data-arg="${t.id}" title="${t.hint}">
      ${t.name}<i>${missing ? '공구상' : t.id === 'repair' ? '' : TOOL_TIME[t.id] ? TOOL_TIME[t.id] + '분' : '무료'}</i></button>`;
  }).join('');
  const due = job.dueDay - state.day;
  return `<section class="bench">
    <div class="ticket">
      <div class="ticket-head"><span class="ticket-no">No.${job.id.slice(1).padStart(3, '0')}</span><b>${def.name}</b><span>${esc(job.customer)}</span>
        <span class="ticket-due ${due <= 0 ? 'due' : ''}">${due <= 0 ? '오늘 찾으러 옴' : `${due}일 뒤 찾으러 옴`}</span><span class="ticket-fee">${job.comeback ? '무상 재수리' : won(job.fee)}</span></div>
      <p class="complaint">“${esc(job.complaint)}”</p>
    </div>
    <div class="stage" id="stage">${drawBench(def, job, sim, { tool: ui.tool, selected: ui.selected, showNotes })}</div>
    ${controls(job)}
    <div class="status" aria-live="polite"><span class="status-label">지금 상태</span>${sim.obs.map(esc).join(' ')}</div>
    ${repairPanel(job)}
    <div class="toolbox" role="toolbar" aria-label="공구">${tools}</div>
    <div class="flash ${ui.flashBad ? 'bad' : ''}">${ui.flash ? esc(ui.flash) : '공구를 고른 뒤 부품이나 놋쇠 측정 단자를 누르세요.'}</div>
    <div class="handback">
      <button class="btn ghost" data-act="giveup">수리 포기</button>
      <button class="btn primary" data-act="handback">조립해서 손님에게 돌려주기 <i>${job.open * 3 + 3}분</i></button>
    </div>
  </section>`;
}

function notebook() {
  const job = activeJob(state);
  let body = '';
  if (ui.tab === 'log') {
    body = job && job.log.length
      ? `<ol class="log">${job.log.map(l => `<li class="${l.kind}"><time>${clockText(l.t)}</time>${esc(l.text)}</li>`).join('')}</ol>`
      : `<p class="pencil-note">아직 적은 게 없다. 켜 보고, 재 보고, 만져 본 것이 여기에 쌓인다.</p>`;
  } else if (ui.tab === 'book') {
    const all = casebookEntries();
    const found = all.filter(e => state.casebook.includes(e.key)).length;
    body = `<p class="book-count">고친 고장 ${found} / ${all.length}</p>` + ['lamp', 'fan', 'radio', 'cassette', 'clock'].map(id => {
      const rows = all.filter(e => e.item.id === id);
      return `<h4>${rows[0].item.name}</h4><ul class="book">${rows.map(e => state.casebook.includes(e.key)
        ? `<li><b>${e.fault.name}</b><span>${e.fault.lesson}</span></li>`
        : `<li class="unknown"><b>？？？</b><span>아직 만나지 못한 고장</span></li>`).join('')}</ul>`;
    }).join('');
  } else {
    body = `<p class="memo-intro">할아버지가 계산대 서랍에 남긴 수첩. 연필 글씨가 반쯤 번졌다.</p>` +
      MEMO.map(([t, d]) => `<section class="memo"><h4>${t}</h4><p>${d}</p></section>`).join('');
  }
  return `<aside class="notebook">
    <div class="tabs" role="tablist">
      ${[['log', '작업 기록'], ['book', '고장 도감'], ['memo', '할아버지 수첩']].map(([id, name]) => `<button role="tab" aria-selected="${ui.tab === id}" class="${ui.tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}">${name}</button>`).join('')}
    </div>
    <div class="page" id="page">${body}</div>
  </aside>`;
}

function modal() {
  const m = ui.modal;
  if (!m) return '';
  let inner = '';
  if (m.kind === 'title') {
    const has = state.history.length > 0 || state.minute > 0;
    inner = `<div class="title-card">
      <p class="eyebrow">개업 1968 · 2대째</p>
      <h2 class="title-sign">한결전파사</h2>
      <p>할아버지가 쉰 해 넘게 지킨 골목 수리점을 물려받았다. 서랍에는 낡은 테스터와 수첩, 그리고 <b>${won(START_DEBT)}의 빚 문서</b>가 들어 있었다.</p>
      <p>${DEADLINE}일 안에 빚을 갚지 못하면 가게는 남의 손에 넘어간다. 동네 사람들이 맡기는 물건을 직접 켜 보고, 재 보고, 만져 보며 어디가 고장인지 찾아내자.</p>
      <div class="modal-btns">
        ${has ? '<button class="btn primary" data-act="modal-close">이어서 하기</button>' : '<button class="btn primary" data-act="start">가게 문 열기</button>'}
        ${has ? '<button class="btn ghost" data-act="new-game">처음부터 새로</button>' : ''}
      </div></div>`;
  } else if (m.kind === 'arrivals') {
    const list = state.jobs.filter(j => state.arrivals.includes(j.id)).map(j => `<li><b>${esc(j.customer)}</b> · ${item(j.itemId).name}${j.comeback ? ' <em class="due">재방문</em>' : ''}<p>“${esc(j.complaint)}”</p><small>${j.comeback ? '무상 재수리' : won(j.fee)} · ${j.dueDay - state.day <= 0 ? '오늘' : j.dueDay - state.day + '일 뒤'} 마감</small></li>`).join('');
    inner = `<h2>${state.day}일차 아침</h2><p class="lede">문을 열자 손님들이 물건을 들고 들어온다.${state.day >= DEADLINE - 2 && !state.endless && state.debt > 0 ? ` 빚 마감까지 ${DEADLINE - state.day + 1}일 남았다.` : ''}</p>
      <ul class="arrivals">${list || '<li>오늘은 새 손님이 없다.</li>'}</ul>
      ${state.tutorial ? '<p class="pencil-note">처음이라면 오른쪽 <b>할아버지 수첩</b>부터 읽어 보자. 스탠드는 직접 켜 보는 것부터 시작한다.</p>' : ''}
      <div class="modal-btns"><button class="btn primary" data-act="modal-close">작업대로</button></div>`;
  } else if (m.kind === 'return') {
    const o = m.outcome;
    inner = o.kind === 'paid'
      ? `<h2>돌려주었다</h2><p class="quote">${esc(o.text)}</p><p class="money">+ ${won(o.fee)}</p>
         ${o.learned.length ? `<p class="learned">고장 도감에 기록: ${o.learned.map(esc).join(', ')}</p>` : ''}
         ${o.comeback ? '<p class="pencil-note">…카운터에서는 멀쩡했는데, 어딘가 찜찜하다.</p>' : ''}`
      : o.kind === 'refused'
        ? `<h2>퇴짜</h2><p class="quote">${esc(o.text)}</p><p class="pencil-note">손님이 켜 보자마자 증상이 그대로였다. 물건은 다시 선반으로.</p>`
        : `<h2>돌려보냈다</h2><p class="quote">${esc(o.text)}</p><p class="pencil-note">수리비는 받지 못했고 동네 신뢰가 조금 깎였다.</p>`;
    inner += `<div class="modal-btns"><button class="btn primary" data-act="modal-close">확인</button></div>`;
  } else if (m.kind === 'confirm-giveup') {
    inner = `<h2>수리를 포기할까요?</h2><p>수리비를 받지 못하고 동네 신뢰가 1 깎입니다. 이미 쓴 부품값은 돌아오지 않습니다.</p>
      <div class="modal-btns"><button class="btn ghost" data-act="modal-close">계속 고친다</button><button class="btn danger" data-act="giveup-yes">포기하고 돌려준다</button></div>`;
  } else if (m.kind === 'confirm-close') {
    const due = state.jobs.filter(j => j.dueDay <= state.day);
    inner = `<h2>영업을 마감할까요?</h2><p>가겟세와 재료비 ${won(DAILY_COST)}이 나갑니다.</p>
      ${due.length ? `<p class="warn-box">오늘 마감인 물건 ${due.length}점은 손님이 고치지 못한 채 찾아갑니다. 신뢰가 깎입니다.</p>` : ''}
      <div class="modal-btns"><button class="btn ghost" data-act="modal-close">더 일한다</button><button class="btn primary" data-act="close-yes">셔터 내리기</button></div>`;
  } else if (m.kind === 'day') {
    const s = m.report.summary;
    inner = `<h2>${s.day}일차 장부</h2>
      <table class="ledger"><tbody>
        <tr><th>수리비</th><td>+ ${won(s.income)}</td></tr>
        <tr><th>부품·공구</th><td>− ${won(s.parts)}</td></tr>
        <tr><th>가겟세·재료비</th><td>− ${won(s.expenses)}</td></tr>
        <tr class="sum"><th>오늘 남은 돈</th><td>${won(s.income - s.parts - s.expenses)}</td></tr>
      </tbody></table>
      <p>돌려준 물건 ${s.returned}점${s.lost ? ` · 못 고치고 보낸 물건 ${s.lost}점` : ''}</p>
      ${m.report.collected.length ? `<p class="warn-box">마감을 넘겨 손님이 그냥 찾아갔다: ${m.report.collected.map(esc).join(', ')}</p>` : ''}
      <p>금고 ${won(state.money)} · 남은 빚 ${won(state.debt)}</p>
      <div class="modal-btns"><button class="btn ghost" data-act="shop">빚 갚기 · 공구상</button><button class="btn primary" data-act="next-day">${state.ending ? '결과 보기' : '다음 날 아침'}</button></div>`;
  } else if (m.kind === 'shop') {
    const tools = TOOL_SHOP.map(t => {
      const owned = state.tools.includes(t.id), early = state.day < t.day;
      return `<li><div><b>${t.name}</b> <span>${won(t.price)}</span><p>${t.desc}</p></div>
        <button class="btn" data-act="buy" data-arg="${t.id}" ${owned || early ? 'disabled' : ''}>${owned ? '갖고 있음' : early ? `${t.day}일차 입고` : '사기'}</button></li>`;
    }).join('');
    inner = `<h2>장부 · 공구상</h2>
      <section class="debt"><h3>빚 문서</h3><p>남은 빚 <b>${won(state.debt)}</b> · ${state.endless ? '갚을 날은 지났다' : `${DEADLINE}일차 영업 마감까지`}</p>
        <div class="modal-btns left"><button class="btn" data-act="pay" data-arg="50000" ${state.money < 1 || !state.debt ? 'disabled' : ''}>5만원 갚기</button><button class="btn" data-act="pay" data-arg="all" ${state.money < 1 || !state.debt ? 'disabled' : ''}>있는 만큼 갚기</button></div>
        <p class="pencil-note">매일 마감 때 ${won(DAILY_COST)}이 나간다. 부품값도 남겨 두자.</p></section>
      <section><h3>공구상 김씨네</h3><ul class="shop-list">${tools}</ul></section>
      ${ui.flash ? `<p class="flash ${ui.flashBad ? 'bad' : ''}">${esc(ui.flash)}</p>` : ''}
      <div class="modal-btns"><button class="btn primary" data-act="modal-close">닫기</button></div>`;
  } else if (m.kind === 'ending') {
    const kept = state.ending === 'kept';
    const total = state.history.reduce((n, d) => n + d.returned, 0);
    inner = `<h2 class="title-sign">${kept ? '가게를 지켰다' : '셔터를 내렸다'}</h2>
      <p>${kept ? '빚 문서를 태우던 날, 이발소 할아버지가 간판을 올려다보며 웃었다. "그 녀석 손이 여기 그대로 있구나."' : state.money < 0 ? '금고가 바닥났다. 부품 상자를 팔아도 가겟세를 메울 수 없었다.' : `빚 ${won(state.debt)}이 남았다. 간판은 내려졌지만, 동네 사람들은 아직도 그 골목을 "전파사 골목"이라 부른다.`}</p>
      <p>${state.day}일 동안 ${total}점을 고쳐 돌려주었고, 고장 도감은 ${state.casebook.length}칸을 채웠다.</p>
      <div class="modal-btns">${kept && !state.endless ? '<button class="btn" data-act="endless">계속 영업하기</button>' : ''}<button class="btn primary" data-act="new-game">처음부터 다시</button></div>`;
  }
  return `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">${inner}</div></div>`;
}

function renderBenchOnly() {
  const job = activeJob(state);
  const stage = root.querySelector('#stage');
  const status = root.querySelector('.status');
  if (!job || !stage || !status) return render();
  const def = item(job.itemId);
  const sim = simulate(job);
  updateSound(state.sound ? sim.fx : {});
  stage.innerHTML = drawBench(def, job, sim, { tool: ui.tool, selected: ui.selected, showNotes: ['volt', 'ohm', 'ear', 'look', 'inject'].includes(ui.tool) });
  status.innerHTML = `<span class="status-label">지금 상태</span>${sim.obs.map(esc).join(' ')}`;
  const page = root.querySelector('#page');
  if (page && ui.tab === 'log') { page.innerHTML = notebookBody(job); page.scrollTop = page.scrollHeight; }
}

function notebookBody(job: Job) {
  return job.log.length ? `<ol class="log">${job.log.map(l => `<li class="${l.kind}"><time>${clockText(l.t)}</time>${esc(l.text)}</li>`).join('')}</ol>` : '';
}

export function render() {
  const focusId = (document.activeElement as HTMLElement | null)?.id;
  const shelfToggle = `<button class="btn shelf-toggle" data-act="shelf" aria-expanded="${ui.shelfOpen}">선반 · 맡은 물건 ${state.jobs.length}점 ${ui.shelfOpen ? '▲' : '▼'}</button>`;
  root.innerHTML = `${header()}<main class="shop">${shelfToggle}${shelf()}${bench()}${notebook()}</main>${modal()}`;
  const page = root.querySelector('#page');
  if (page && ui.tab === 'log') page.scrollTop = page.scrollHeight;
  if (focusId) (root.querySelector('#' + focusId) as HTMLElement | null)?.focus();
}
