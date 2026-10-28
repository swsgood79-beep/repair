import type { FX } from './types';

/**
 * 모든 소리는 Web Audio로 합성한다 (음원 파일 없음).
 *  - 배경음악: 장면별 곡을 실시간으로 연주 (일렉트릭 피아노·베이스·오르골·브러시·LP 잡음)
 *  - 효과음: 공구·부품·가게 소리
 *  - 물건 소리: 험·잡음·방송·똑딱 (시뮬레이션 결과를 그대로 들려준다)
 */
let ac: AudioContext | null = null;
let master: GainNode, musicBus: GainNode, sfxBus: GainNode, applianceBus: GainNode;
let noise: AudioBuffer;
let musicOn = true, sfxOn = true;

function ctx() {
  if (ac) return ac;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ac = new AC();
  master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
  const warm = ac.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5200;
  musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(warm).connect(master);
  sfxBus = ac.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
  applianceBus = ac.createGain(); applianceBus.gain.value = 0.5; applianceBus.connect(master);
  noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  startAppliance();
  window.setInterval(schedule, 50);
  return ac;
}

/** 첫 터치 때 부른다 (브라우저는 사용자 조작 뒤에만 소리를 허락한다) */
export function unlockAudio() {
  const a = ctx();
  if (a && a.state !== 'running') void a.resume();
}
export function setAudioPrefs(music: boolean, effects: boolean) {
  musicOn = music; sfxOn = effects;
  if (!ac) return;
  musicBus.gain.setTargetAtTime(musicOn ? musicLevel : 0, ac.currentTime, 0.3);
  sfxBus.gain.setTargetAtTime(sfxOn ? 0.7 : 0, ac.currentTime, 0.05);
  applianceBus.gain.setTargetAtTime(sfxOn ? 0.5 : 0, ac.currentTime, 0.05);
}

/* ---------- 합성 도구 ---------- */
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number; attack?: number; at?: number; bus?: AudioNode; detune?: number } = {}) {
  const a = ac!; const t = opts.at ?? a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  if (opts.detune) o.detune.value = opts.detune;
  env(g, t, opts.gain ?? 0.2, opts.attack ?? 0.004, dur);
  o.connect(g).connect(opts.bus ?? sfxBus);
  o.start(t); o.stop(t + (opts.attack ?? 0.004) + dur + 0.05);
}

function hiss(dur: number, opts: { type?: BiquadFilterType; freq?: number; q?: number; gain?: number; to?: number; attack?: number; at?: number; bus?: AudioNode } = {}) {
  const a = ac!; const t = opts.at ?? a.currentTime;
  const s = a.createBufferSource(); s.buffer = noise; s.loop = true;
  const f = a.createBiquadFilter(); f.type = opts.type ?? 'bandpass'; f.frequency.setValueAtTime(opts.freq ?? 2000, t); f.Q.value = opts.q ?? 1;
  if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  const g = a.createGain();
  env(g, t, opts.gain ?? 0.2, opts.attack ?? 0.003, dur);
  s.connect(f).connect(g).connect(opts.bus ?? sfxBus);
  s.start(t, Math.random()); s.stop(t + (opts.attack ?? 0.003) + dur + 0.05);
}

/** 금속성 울림: 비조화 배음 */
function metal(freq: number, dur: number, gain = 0.12, at?: number) {
  for (const [k, g] of [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.12]] as const) tone(freq * k, dur / k ** 0.3, { gain: gain * g, at });
}

/* ---------- 효과음 ---------- */
export type Sfx =
  | 'click' | 'coin' | 'bad' | 'beep' | 'pop' | 'zap' | 'good'
  | 'ratchet' | 'screwOut' | 'slip' | 'pump' | 'snap' | 'creak' | 'drop' | 'pluck' | 'hammer' | 'rubber'
  | 'stamp' | 'chime' | 'paper' | 'lockOpen' | 'lockFail' | 'register' | 'doorbell' | 'shutter' | 'morning'
  | 'probe' | 'plugIn' | 'toggle' | 'brush' | 'tick' | 'scrape';

export function sfx(kind: Sfx, level = 1) {
  if (!ac || !sfxOn) return;
  const t = ac.currentTime;
  const L = level;
  switch (kind) {
    case 'click': hiss(0.03, { freq: 3200, q: 4, gain: 0.12 * L }); tone(1400, 0.03, { type: 'square', gain: 0.03 * L }); break;
    case 'tick': hiss(0.02, { freq: 4500, q: 6, gain: 0.08 * L }); break;
    case 'pop': tone(420, 0.08, { type: 'triangle', to: 900, gain: 0.12 * L }); break;
    case 'beep': tone(1000, 0.35 * Math.max(0.3, L), { gain: 0.12 * L }); break;
    case 'probe': tone(2200, 0.06, { type: 'square', gain: 0.04 * L }); hiss(0.02, { freq: 5000, gain: 0.06 * L }); break;
    case 'good': [0, 4, 7].forEach((n, i) => tone(mtof(76 + n), 0.25, { type: 'triangle', gain: 0.1 * L, at: t + i * 0.06 })); break;
    case 'bad': tone(180, 0.22, { type: 'sawtooth', to: 120, gain: 0.07 * L }); tone(186, 0.22, { type: 'sawtooth', to: 124, gain: 0.05 * L }); break;
    case 'zap': hiss(0.25, { freq: 3000, to: 300, q: 2, gain: 0.3 * L }); tone(90, 0.3, { type: 'square', gain: 0.08 * L }); break;
    case 'coin': tone(mtof(83), 0.08, { type: 'square', gain: 0.05 * L }); tone(mtof(88), 0.3, { type: 'square', gain: 0.05 * L, at: t + 0.08 }); break;
    case 'ratchet': hiss(0.015, { freq: 2600 + Math.random() * 800, q: 8, gain: 0.14 * L }); tone(800 + Math.random() * 200, 0.015, { type: 'square', gain: 0.02 * L }); break;
    case 'screwOut': metal(1800, 0.4, 0.07 * L); metal(2400, 0.3, 0.05 * L, t + 0.18); hiss(0.05, { freq: 3000, gain: 0.08 * L, at: t + 0.18 }); break;
    case 'slip': hiss(0.18, { freq: 6000, to: 2500, q: 3, gain: 0.18 * L }); tone(2900, 0.12, { type: 'sawtooth', gain: 0.02 * L, to: 2400 }); break;
    case 'scrape': hiss(0.12, { freq: 1800, q: 1.5, gain: 0.12 * L }); break;
    case 'pump': hiss(0.12, { freq: 800, to: 3000, q: 1, gain: 0.25 * L }); tone(110, 0.12, { type: 'triangle', gain: 0.2 * L, at: t + 0.1 }); hiss(0.03, { freq: 2000, q: 3, gain: 0.2 * L, at: t + 0.12 }); break;
    case 'snap': hiss(0.02, { freq: 3500, q: 5, gain: 0.25 * L }); hiss(0.02, { freq: 2500, q: 5, gain: 0.2 * L, at: t + 0.05 }); tone(300, 0.05, { type: 'triangle', gain: 0.1 * L, at: t + 0.05 }); break;
    case 'creak': tone(140, 0.35, { type: 'sawtooth', to: 220, gain: 0.03 * L }); hiss(0.3, { freq: 900, q: 8, gain: 0.06 * L }); break;
    case 'drop': tone(1400, 0.12, { to: 500, gain: 0.15 * L }); tone(900, 0.08, { to: 400, gain: 0.06 * L, at: t + 0.05 }); break;
    case 'pluck': { const f = 220 + Math.random() * 120; tone(f, 0.5, { type: 'triangle', gain: 0.12 * L }); tone(f * 2, 0.3, { gain: 0.05 * L }); break; }
    case 'hammer': metal(700, 0.3, 0.12 * L); hiss(0.04, { freq: 1500, q: 1, gain: 0.25 * L }); tone(90, 0.1, { type: 'triangle', gain: 0.2 * L }); break;
    case 'rubber': tone(160, 0.25, { type: 'triangle', to: 420, gain: 0.12 * L }); tone(420, 0.1, { type: 'triangle', to: 300, gain: 0.08 * L, at: t + 0.25 }); break;
    case 'stamp': tone(70, 0.18, { type: 'triangle', gain: 0.35 * L }); hiss(0.06, { freq: 600, q: 0.7, gain: 0.25 * L }); break;
    case 'chime': [0, 7, 12].forEach((n, i) => tone(mtof(79 + n), 0.5, { gain: 0.06 * L, at: t + i * 0.08 })); break;
    case 'paper': hiss(0.15, { freq: 4000, q: 0.8, gain: 0.08 * L, attack: 0.03 }); hiss(0.08, { freq: 6000, q: 1, gain: 0.05 * L, at: t + 0.12 }); break;
    case 'lockOpen':
      tone(120, 0.12, { type: 'triangle', gain: 0.25 * L }); hiss(0.05, { freq: 2200, q: 4, gain: 0.25 * L, at: t + 0.04 });
      [0, 4, 7, 12].forEach((n, i) => tone(mtof(72 + n), 0.6, { type: 'triangle', gain: 0.09 * L, at: t + 0.15 + i * 0.09 }));
      metal(2600, 0.8, 0.03 * L, t + 0.5);
      break;
    case 'lockFail': tone(90, 0.25, { type: 'square', gain: 0.1 * L }); hiss(0.08, { freq: 900, q: 3, gain: 0.3 * L }); tone(150, 0.4, { type: 'sawtooth', to: 70, gain: 0.06 * L, at: t + 0.1 }); break;
    case 'register': metal(2100, 0.6, 0.05 * L, t + 0.15); hiss(0.08, { freq: 1500, q: 2, gain: 0.2 * L }); tone(mtof(84), 0.12, { type: 'square', gain: 0.04 * L, at: t + 0.15 }); tone(mtof(91), 0.4, { type: 'square', gain: 0.04 * L, at: t + 0.27 }); break;
    case 'doorbell': for (let i = 0; i < 4; i++) metal(2300 + (i % 2) * 300, 0.5, 0.05 * L, t + i * 0.09); break;
    case 'shutter': for (let i = 0; i < 14; i++) hiss(0.05, { freq: 500 + (i % 3) * 200, q: 2, gain: 0.12 * L, at: t + i * 0.06 }); tone(60, 0.3, { type: 'triangle', gain: 0.25 * L, at: t + 0.85 }); break;
    case 'morning': [0, 5, 9].forEach((n, i) => { tone(mtof(88 + n), 0.07, { gain: 0.04 * L, at: t + i * 0.11 }); tone(mtof(91 + n), 0.05, { gain: 0.03 * L, at: t + 0.4 + i * 0.09 }); }); break;
    case 'plugIn': tone(80, 0.08, { type: 'triangle', gain: 0.25 * L }); hiss(0.03, { freq: 2500, q: 2, gain: 0.15 * L }); break;
    case 'toggle': hiss(0.02, { freq: 2800, q: 6, gain: 0.2 * L }); tone(600, 0.03, { type: 'square', gain: 0.04 * L }); break;
    case 'brush': hiss(0.06, { freq: 3500 + Math.random() * 1500, q: 0.8, gain: 0.07 * L }); break;
  }
}

/* ---------- 계속 나는 작업 소리 (인두 지글, 세정제 쉭) ---------- */
const loops: Record<string, { g: GainNode }> = {};
export function setLoop(name: 'sizzle' | 'spray', level: number) {
  if (!ac) return;
  let l = loops[name];
  if (!l) {
    if (level <= 0) return;
    const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = name === 'sizzle' ? 'highpass' : 'bandpass'; f.frequency.value = name === 'sizzle' ? 4500 : 5000; f.Q.value = 0.6;
    // 떨림은 앞 단계에서 걸고, 마지막 음량(g)이 0이면 완전히 조용하다
    const shape = ac.createGain(); shape.gain.value = name === 'sizzle' ? 0.6 : 1;
    const g = ac.createGain(); g.gain.value = 0;
    s.connect(f).connect(shape).connect(g).connect(sfxBus); s.start();
    if (name === 'sizzle') {
      // 지글지글: 진폭을 거칠게 흔든다 (0.2 ~ 1.0)
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.type = 'square'; lfo.frequency.value = 23; lg.gain.value = 0.4;
      lfo.connect(lg).connect(shape.gain); lfo.start();
    }
    l = loops[name] = { g };
  }
  l.g.gain.setTargetAtTime(sfxOn ? level * (name === 'sizzle' ? 0.12 : 0.18) : 0, ac.currentTime, 0.04);
}

/* ---------- 물건 소리 ---------- */
let appliance: Record<string, GainNode> = {};
let current: FX = {};
function startAppliance() {
  const a = ac!;
  const g = (name: string) => { const node = a.createGain(); node.gain.value = 0; node.connect(applianceBus); appliance[name] = node; return node; };
  const hum = a.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 60;
  const humLp = a.createBiquadFilter(); humLp.type = 'lowpass'; humLp.frequency.value = 260;
  hum.connect(humLp).connect(g('hum')); hum.start();
  const buzz = a.createOscillator(); buzz.type = 'square'; buzz.frequency.value = 118;
  const buzzBp = a.createBiquadFilter(); buzzBp.type = 'bandpass'; buzzBp.frequency.value = 900;
  buzz.connect(buzzBp).connect(g('buzz')); buzz.start();
  const src = a.createBufferSource(); src.buffer = noise; src.loop = true;
  const staticBp = a.createBiquadFilter(); staticBp.type = 'bandpass'; staticBp.frequency.value = 2400; staticBp.Q.value = 0.6;
  const whirrLp = a.createBiquadFilter(); whirrLp.type = 'lowpass'; whirrLp.frequency.value = 420;
  src.connect(staticBp).connect(g('noise')); src.connect(whirrLp).connect(g('whirr')); src.connect(g('crackle')); src.start();
  // 라디오·카세트에서 나오는 노래: 옛 가요풍 멜로디
  const tone2 = a.createOscillator(); tone2.type = 'triangle';
  tone2.connect(g('tone')); tone2.start();
  const notes = [69, 72, 74, 76, 74, 72, 69, 67, 69, 72, 76, 79, 76, 74, 72, 74];
  let i = 0;
  window.setInterval(() => { tone2.frequency.setTargetAtTime(mtof(notes[i++ % notes.length]) * (current.wobble ? 0.97 + Math.sin(i) * 0.015 : 1), a.currentTime, 0.02); }, 300);
  // 전화기: 신호음과 벨
  const dial = a.createOscillator(); dial.frequency.value = 425; dial.connect(g('dial')); dial.start();
  const bell = a.createOscillator(); bell.type = 'square'; bell.frequency.value = 950;
  const bellBp = a.createBiquadFilter(); bellBp.type = 'bandpass'; bellBp.frequency.value = 1900; bellBp.Q.value = 3;
  bell.connect(bellBp).connect(g('ring')); bell.start();
  let ringOn = false;
  window.setInterval(() => {
    const target = appliance.ring;
    if (!target) return;
    ringOn = !ringOn;
    const cycle = Math.floor(a.currentTime / 1.2) % 2 === 0;
    target.gain.setTargetAtTime(current.ring && cycle && ringOn ? 0.12 : 0, a.currentTime, 0.004);
  }, 25);
  let tock = false;
  const tickLoop = () => {
    if (current.tick && sfxOn) { tone(tock ? 2600 : 1900, 0.03, { type: 'square', gain: 0.05, bus: applianceBus }); tock = !tock; }
    window.setTimeout(tickLoop, current.tick === 2 ? (tock ? 580 : 420) : 500);
  };
  tickLoop();
  window.setInterval(() => {
    const target = appliance.crackle;
    if (!target || !current.crackle) return;
    target.gain.setValueAtTime(Math.random() * 0.5 * current.crackle, a.currentTime);
    target.gain.setTargetAtTime(0, a.currentTime + 0.02, 0.01);
  }, 60);
}

export function updateSound(fx: FX) {
  current = fx;
  if (!ac) return;
  const t = ac.currentTime;
  const set = (name: string, v: number) => appliance[name]?.gain.setTargetAtTime(v, t, 0.08);
  set('hum', (fx.hum ?? 0) * 0.5);
  set('buzz', (fx.buzz ?? 0) * 0.12);
  set('noise', (fx.noise ?? 0) * 0.25);
  set('whirr', (fx.whirr ?? 0) * 0.5);
  set('tone', (fx.tone ?? 0) * 0.18);
  set('dial', (fx.dial ?? 0) * 0.08);
  // 물건이 소리를 내면 배경음악을 살짝 줄인다
  const busy = (fx.tone ?? 0) + (fx.hum ?? 0) + (fx.noise ?? 0) + (fx.whirr ?? 0) + (fx.dial ?? 0) + (fx.ring ?? 0) > 0.1;
  const next = busy ? 0.45 : 1;
  if (next !== duck) { duck = next; if (musicOn) musicBus.gain.setTargetAtTime(musicLevel * duck, t, 0.4); }
}

/* ---------- 배경음악 ---------- */
export type Track = 'title' | 'counter' | 'bench' | 'mini' | 'kept' | 'lost';
type Chord = [number, 'maj7' | 'm7' | '7' | 'maj' | 'min' | 'm9'];
interface Song { bpm: number; chords: Chord[]; melody: number; brush: boolean; bassEighths: boolean; level: number; swing: number; box: boolean }
const Q: Record<Chord[1], number[]> = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], maj: [0, 4, 7, 12], min: [0, 3, 7, 12], m9: [0, 3, 7, 10, 14] };
const SONGS: Record<Track, Song> = {
  // 제목: 해 질 녘 골목, 느리고 아련하게
  title: { bpm: 66, chords: [[53, 'maj7'], [52, 'm7'], [50, 'm7'], [48, 'maj7'], [53, 'maj7'], [52, 'm7'], [50, 'm9'], [55, '7']], melody: 0.35, brush: false, bassEighths: false, level: 0.32, swing: 0, box: true },
  // 카운터: 정겨운 동네 가게
  counter: { bpm: 88, chords: [[48, 'maj'], [45, 'min'], [53, 'maj'], [55, '7'], [48, 'maj'], [52, 'min'], [50, 'm7'], [55, '7']], melody: 0.45, brush: true, bassEighths: false, level: 0.28, swing: 0.12, box: true },
  // 작업대: 잔잔한 집중
  bench: { bpm: 74, chords: [[45, 'm7'], [50, 'm7'], [55, '7'], [48, 'maj7'], [53, 'maj7'], [50, 'm7'], [52, 'm7'], [45, 'm9']], melody: 0.16, brush: true, bassEighths: false, level: 0.2, swing: 0.1, box: false },
  // 수리 미니게임: 손이 바빠지는 리듬
  mini: { bpm: 100, chords: [[50, 'm7'], [55, '7'], [52, 'm7'], [45, 'm7']], melody: 0.22, brush: true, bassEighths: true, level: 0.22, swing: 0.08, box: false },
  kept: { bpm: 92, chords: [[48, 'maj7'], [55, 'maj'], [45, 'm7'], [53, 'maj7'], [48, 'maj7'], [55, 'maj'], [53, 'maj7'], [55, '7']], melody: 0.55, brush: true, bassEighths: false, level: 0.3, swing: 0.1, box: true },
  lost: { bpm: 58, chords: [[45, 'min'], [53, 'maj7'], [48, 'maj'], [52, 'm7']], melody: 0.25, brush: false, bassEighths: false, level: 0.26, swing: 0, box: true },
};
const PENTA = [0, 2, 4, 7, 9];
let track: Track | null = null;
let musicLevel = 0;
let duck = 1;
let step = 0;
let nextTime = 0;
let lastMel = 72;

export function playMusic(next: Track | null) {
  if (next === track) return;
  track = next;
  if (!ac) return;
  const t = ac.currentTime;
  musicLevel = next ? SONGS[next].level : 0;
  // 곡이 바뀌면 살짝 줄였다가 새 곡으로
  musicBus.gain.setTargetAtTime(0, t, 0.15);
  step = 0;
  nextTime = t + 0.6;
  if (musicOn && next) musicBus.gain.setTargetAtTime(musicLevel * duck, t + 0.5, 0.6);
}

function epiano(midi: number, at: number, dur: number, vel: number) {
  const f = mtof(midi);
  tone(f, dur, { gain: 0.07 * vel, at, attack: 0.008, bus: musicBus });
  tone(f * 2, dur * 0.6, { gain: 0.02 * vel, at, attack: 0.004, bus: musicBus, detune: 6 });
  tone(f * 4.02, 0.12, { gain: 0.012 * vel, at, bus: musicBus });
}
function bass(midi: number, at: number, dur: number) {
  tone(mtof(midi), dur, { type: 'triangle', gain: 0.16, at, attack: 0.01, bus: musicBus });
}
function musicBox(midi: number, at: number) {
  const f = mtof(midi);
  tone(f, 0.9, { gain: 0.045, at, bus: musicBus });
  tone(f * 3.01, 0.25, { gain: 0.012, at, bus: musicBus });
}

/** 50ms마다 앞으로 0.25초치 음표를 예약한다 */
function schedule() {
  if (!ac || !track || !musicOn) return;
  const song = SONGS[track];
  const eighth = 60 / song.bpm / 2;
  while (nextTime < ac.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % song.chords.length;
    const pos = step % 8;
    const [root, q] = song.chords[bar];
    const at = nextTime + (pos % 2 ? song.swing * eighth : 0);
    const chord = Q[q].map(n => root + 12 + n);
    if (pos === 0) { chord.forEach((n, i) => epiano(n, at + i * 0.012, eighth * 6, 0.9)); bass(root - 12, at, eighth * 3.5); }
    if (pos === 4) { chord.slice(1).forEach((n, i) => epiano(n, at + i * 0.01, eighth * 3, 0.55)); bass(root - 12 + (Math.random() < 0.5 ? 7 : 0), at, eighth * 3); }
    if (song.bassEighths && pos % 2 === 0 && pos !== 0 && pos !== 4) bass(root - 12 + (pos === 6 ? 7 : 0), at, eighth * 0.8);
    if (song.brush && (pos === 2 || pos === 6)) hiss(eighth * 1.2, { freq: 7000, q: 0.5, gain: 0.03, attack: 0.02, at, bus: musicBus });
    if (song.brush && pos % 2 === 1) hiss(0.04, { freq: 9000, q: 1, gain: 0.012, at, bus: musicBus });
    if (Math.random() < song.melody * (pos % 2 ? 0.6 : 1)) {
      // 오음음계 안에서 걸어 다니는 멜로디
      const options = [];
      for (let o = 60; o <= 84; o += 12) for (const n of PENTA) options.push(o + n);
      const near = options.filter(n => Math.abs(n - lastMel) <= 4 && n !== lastMel);
      lastMel = near[Math.floor(Math.random() * near.length)] ?? 72;
      if (lastMel > 81) lastMel -= 12;
      if (lastMel < 64) lastMel += 12;
      if (song.box) musicBox(lastMel + 12, at); else epiano(lastMel, at, eighth * 2, 0.6);
    }
    // LP판 지직
    if (Math.random() < 0.35) hiss(0.006, { freq: 3000 + Math.random() * 3000, q: 2, gain: 0.02 + Math.random() * 0.03, at: at + Math.random() * eighth, bus: musicBus });
    nextTime += eighth;
    step++;
  }
}
