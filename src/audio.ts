import type { FX } from './types';

/** 작업대 소리: 험, 잡음, 방송 멜로디, 떨림, 똑딱. 모두 Web Audio로 합성한다. */
let ctx: AudioContext | null = null;
let gains: Record<string, GainNode> = {};
let melodyTimer = 0;
let tickTimer = 0;
let crackleTimer = 0;
let current: FX = {};

function noiseBuffer(ac: AudioContext) {
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function start() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const ac = ctx;
  const master = ac.createGain();
  master.gain.value = 0.35;
  master.connect(ac.destination);
  const g = (name: string) => { const node = ac.createGain(); node.gain.value = 0; node.connect(master); gains[name] = node; return node; };

  const hum = ac.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 60;
  const humLp = ac.createBiquadFilter(); humLp.type = 'lowpass'; humLp.frequency.value = 260;
  hum.connect(humLp).connect(g('hum')); hum.start();

  const buzz = ac.createOscillator(); buzz.type = 'square'; buzz.frequency.value = 118;
  const buzzBp = ac.createBiquadFilter(); buzzBp.type = 'bandpass'; buzzBp.frequency.value = 900;
  buzz.connect(buzzBp).connect(g('buzz')); buzz.start();

  const src = ac.createBufferSource(); src.buffer = noiseBuffer(ac); src.loop = true;
  const staticBp = ac.createBiquadFilter(); staticBp.type = 'bandpass'; staticBp.frequency.value = 2400; staticBp.Q.value = 0.6;
  const whirrLp = ac.createBiquadFilter(); whirrLp.type = 'lowpass'; whirrLp.frequency.value = 420;
  src.connect(staticBp).connect(g('noise'));
  src.connect(whirrLp).connect(g('whirr'));
  src.connect(g('crackle'));
  src.start();

  const tone = ac.createOscillator(); tone.type = 'triangle'; tone.frequency.value = 330;
  tone.connect(g('tone')); tone.start();
  const notes = [392, 440, 523, 440, 392, 330, 294, 330];
  let i = 0;
  melodyTimer = window.setInterval(() => { tone.frequency.setTargetAtTime(notes[i++ % notes.length] * ((current.wobble ? 0.97 : 1)), ac.currentTime, 0.02); }, 320);

  const click = (high: boolean) => {
    const o = ac.createOscillator(), e = ac.createGain();
    o.frequency.value = high ? 2600 : 1900; o.type = 'square';
    e.gain.setValueAtTime(0.22, ac.currentTime); e.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.04);
    o.connect(e).connect(master); o.start(); o.stop(ac.currentTime + 0.05);
  };
  let tock = false;
  const scheduleTick = () => {
    if (current.tick) { click(tock); tock = !tock; }
    const gap = current.tick === 2 ? (tock ? 580 : 420) : 500;
    tickTimer = window.setTimeout(scheduleTick, gap);
  };
  scheduleTick();
  crackleTimer = window.setInterval(() => {
    const target = gains.crackle;
    if (!target || !current.crackle) return;
    target.gain.setValueAtTime(Math.random() * 0.5 * current.crackle, ac.currentTime);
    target.gain.setTargetAtTime(0, ac.currentTime + 0.02, 0.01);
  }, 60);
}

export function setSound(on: boolean) {
  if (on && !ctx) start();
  if (ctx) void (on ? ctx.resume() : ctx.suspend());
}

export function updateSound(fx: FX) {
  current = fx;
  if (!ctx) return;
  const t = ctx.currentTime;
  const set = (name: string, v: number) => gains[name]?.gain.setTargetAtTime(v, t, 0.08);
  set('hum', (fx.hum ?? 0) * 0.5);
  set('buzz', (fx.buzz ?? 0) * 0.12);
  set('noise', (fx.noise ?? 0) * 0.25);
  set('whirr', (fx.whirr ?? 0) * 0.5);
  set('tone', (fx.tone ?? 0) * 0.18);
}

export function stopSound() {
  window.clearInterval(melodyTimer); window.clearTimeout(tickTimer); window.clearInterval(crackleTimer);
  void ctx?.close(); ctx = null; gains = {};
}

/** 짧은 효과음 */
export function sfx(kind: 'click' | 'coin' | 'bad' | 'beep' | 'pop' | 'zap' | 'good', level = 1) {
  if (!ctx) return;
  const ac = ctx;
  const o = ac.createOscillator(), e = ac.createGain();
  const now = ac.currentTime;
  const spec: Record<string, [OscillatorType, number, number, number]> = {
    click: ['square', 900, 600, 0.05], coin: ['triangle', 988, 1319, 0.25], bad: ['sawtooth', 220, 110, 0.3],
    beep: ['sine', 1000, 1000, 0.4], pop: ['square', 300, 900, 0.08], zap: ['sawtooth', 1600, 80, 0.25], good: ['triangle', 660, 990, 0.3],
  };
  const [type, f0, f1, dur] = spec[kind];
  o.type = type;
  o.frequency.setValueAtTime(f0, now);
  o.frequency.exponentialRampToValueAtTime(f1, now + dur);
  e.gain.setValueAtTime(0.18 * level, now);
  e.gain.exponentialRampToValueAtTime(0.001, now + dur);
  o.connect(e).connect(ac.destination);
  o.start(now); o.stop(now + dur + 0.02);
}
