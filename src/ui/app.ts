import { Painter, W, H } from '../gfx/painter';
import { load, newGame, save } from '../game';
import { setSound, updateSound } from '../audio';
import { holder, hit, resetRegions, ui, type Region } from './core';
import { drawAccuse, drawBench } from './bench';
import { drawCounter, drawEnding, drawHud, drawOverlay, drawTitle } from './scenes';
import { drawTutorial } from './tutorial';
import { activeJob, simulate } from '../game';

let painter: Painter;
let active: Region | null = null;
let lastSave = 0;

export function start(root: HTMLElement) {
  const wrap = document.createElement('div');
  wrap.className = 'screen';
  const pix = document.createElement('canvas');
  const txt = document.createElement('canvas');
  pix.className = 'pix'; txt.className = 'txt';
  txt.setAttribute('role', 'img');
  txt.setAttribute('aria-label', '한결전파사 게임 화면');
  wrap.append(pix, txt);
  root.append(wrap);
  painter = new Painter(pix, txt);

  const saved = load();
  holder.state = saved ?? newGame();
  ui.scene = 'title';

  const fit = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const s = Math.min(vw / W, vh / H);
    painter.resize(Math.floor(W * s), Math.floor(H * s));
  };
  fit();
  window.addEventListener('resize', fit);

  const toLocal = (e: PointerEvent): [number, number] => {
    const r = txt.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  txt.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (holder.state.sound) setSound(true);
    const [x, y] = toLocal(e);
    ui.mouse = [x, y];
    const r = hit(x, y);
    active = r;
    ui.pressed = r?.id ?? '';
    if (r && !r.disabled) r.down?.(x, y);
    txt.setPointerCapture(e.pointerId);
  });
  txt.addEventListener('pointermove', e => {
    const [x, y] = toLocal(e);
    ui.mouse = [x, y];
    const r = hit(x, y);
    ui.hover = r?.id ?? '';
    txt.style.cursor = r && !r.disabled && (r.click || r.down) ? 'pointer' : 'default';
    if (active?.drag) active.drag(x, y);
  });
  const release = (e: PointerEvent) => {
    const [x, y] = toLocal(e);
    const r = hit(x, y);
    const a = active;
    active = null;
    ui.pressed = '';
    if (!a) return;
    a.up?.();
    if (r && r.id === a.id && !a.disabled) a.click?.();
    if (e.pointerType !== 'mouse') ui.hover = '';
  };
  txt.addEventListener('pointerup', release);
  txt.addEventListener('pointercancel', release);
  txt.addEventListener('contextmenu', e => e.preventDefault());

  const loop = (ms: number) => {
    const t = ms / 1000;
    ui.now = t;
    frame(t);
    if (t - lastSave > 5) { lastSave = t; save(holder.state); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function frame(t: number) {
  const p = painter;
  p.begin();
  resetRegions();
  let fx = {};
  if (ui.scene === 'title') drawTitle(p, t);
  else if (ui.scene === 'counter') drawCounter(p, t);
  else if (ui.scene === 'ending') drawEnding(p, t);
  else {
    p.rect(0, 0, W, H, '#16201c');
    drawBench(p, t);
    drawAccuse(p, t);
    drawTutorial(p, t);
    drawHud(p);
    const job = activeJob(holder.state);
    if (job) fx = simulate(job).fx;
  }
  if (ui.scene === 'counter') drawHud(p);
  drawOverlay(p, t);
  updateSound(holder.state.sound && ui.scene === 'bench' ? fx : {});
}
