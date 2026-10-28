import type { Comp, Ctx, FX, ItemDef, Job, Sim, ToolId } from './types';

const n = (v: number) => Math.round(v * 10) / 10;

/* ---------- 부품 모양 ---------- */
function shape(c: Comp, fx: FX, ctx: Ctx): string {
  const { x, y, w, h } = c;
  const cx = x + w / 2, cy = y + h / 2;
  const glow = fx.glow?.[c.id] ?? 0;
  switch (c.shape) {
    case 'plug':
      return `<rect x="${x}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="5" class="bakelite"/>` +
        `<rect x="${x + w - 14}" y="${y + 10}" width="14" height="4" class="pin"/><rect x="${x + w - 14}" y="${y + h - 14}" width="14" height="4" class="pin"/>`;
    case 'cord': {
      let d = `M${x} ${cy}`;
      for (let i = 1; i <= 4; i++) d += ` Q${n(x + (i - 0.5) * w / 4)} ${cy + (i % 2 ? -h / 2 : h / 2)} ${n(x + i * w / 4)} ${cy}`;
      return `<path d="${d}" class="cord"/>`;
    }
    case 'switch': {
      const keys = Math.max(2, Math.round(w / 32));
      let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="bakelite"/>`;
      for (let i = 0; i < keys; i++) {
        const kx = x + 4 + i * (w - 8) / keys, down = i === ctx.sw;
        s += `<rect x="${n(kx + 1)}" y="${y + (down ? 7 : 4)}" width="${n((w - 8) / keys - 2)}" height="${h - (down ? 11 : 8)}" rx="2" class="${down ? 'key down' : 'key'}"/>`;
      }
      return s;
    }
    case 'fuse':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" class="glass"/>` +
        `<rect x="${x}" y="${y}" width="10" height="${h}" class="cap-end"/><rect x="${x + w - 10}" y="${y}" width="10" height="${h}" class="cap-end"/>` +
        `<line x1="${x + 10}" y1="${cy}" x2="${x + w - 10}" y2="${cy}" class="filament"/>`;
    case 'xfmr': {
      let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" class="iron"/>`;
      for (let i = 1; i < 6; i++) s += `<line x1="${x + 3}" y1="${n(y + i * h / 6)}" x2="${x + w - 3}" y2="${n(y + i * h / 6)}" class="lam"/>`;
      return s + `<rect x="${n(x + w * 0.28)}" y="${y + 6}" width="${n(w * 0.44)}" height="${h - 12}" rx="3" class="coil"/>`;
    }
    case 'cap':
      return `<rect x="${x}" y="${y + 6}" width="${w}" height="${h - 6}" rx="4" class="can"/>` +
        `<ellipse cx="${cx}" cy="${y + 6}" rx="${w / 2}" ry="6" class="can-top"/>` +
        `<rect x="${x + 4}" y="${y + 14}" width="6" height="${h - 22}" class="stripe"/>`;
    case 'tube':
      return `<path d="M${x} ${y + h} V${y + 14} Q${x} ${y} ${cx} ${y} Q${x + w} ${y} ${x + w} ${y + 14} V${y + h} Z" class="glass"/>` +
        `<rect x="${x + 7}" y="${y + 22}" width="${w - 14}" height="${h - 34}" class="plate"/>` +
        `<rect x="${x + 7}" y="${y + 22}" width="${w - 14}" height="${h - 34}" class="heater" style="opacity:${n(glow)}"/>` +
        `<ellipse cx="${cx}" cy="${y + 8}" rx="${w / 2 - 6}" ry="4" class="getter"/>` +
        `<rect x="${x - 2}" y="${y + h - 6}" width="${w + 4}" height="8" rx="2" class="bakelite"/>`;
    case 'pot':
      return `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) / 2 - 2}" class="can"/>` +
        `<circle cx="${cx}" cy="${cy}" r="6" class="pin"/>` +
        [0, 1, 2].map(i => `<rect x="${x + 8 + i * (w - 20) / 2}" y="${y + h - 4}" width="4" height="8" class="pin"/>`).join('');
    case 'speaker': {
      const r = Math.min(w, h) / 2;
      const shake = (fx.tone ?? 0) > 0.05 || (fx.noise ?? 0) > 0.05 || (fx.hum ?? 0) > 0.3 ? ' vibrate' : '';
      return `<g class="cone${shake}" style="transform-origin:${cx}px ${cy}px"><circle cx="${cx}" cy="${cy}" r="${r - 2}" class="paper-cone"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${n(r * 0.66)}" class="cone-ring"/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.24)}" class="dust"/></g>`;
    }
    case 'bulb':
      return `<circle cx="${cx}" cy="${cy}" r="${w * 0.95}" class="bulb-halo" style="opacity:${n(glow * 0.85)}"/>` +
        `<path d="M${cx - 12} ${y + h} V${y + h - 18} Q${x - 4} ${y + h * 0.5} ${cx} ${y} Q${x + w + 4} ${y + h * 0.5} ${cx + 12} ${y + h - 18} V${y + h} Z" class="bulb-glass" style="--g:${n(glow)}"/>` +
        `<path d="M${cx - 8} ${cy + 6} l4 -10 l4 10 l4 -10 l4 10" class="filament ${glow > 0 ? 'lit' : ''}"/>`;
    case 'socket':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="brass"/>` +
        [1, 2, 3].map(i => `<line x1="${x + 4}" y1="${y + i * h / 4}" x2="${x + w - 4}" y2="${y + i * h / 4}" class="thread"/>`).join('');
    case 'joint':
      return `<rect x="${x}" y="${y + h / 2 - 5}" width="${w}" height="10" class="lug"/>` +
        [0.2, 0.5, 0.8].map(t => `<circle cx="${x + w * t}" cy="${cy}" r="6" class="solder"/>`).join('');
    case 'board': {
      let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" class="pcb"/>`;
      const cols = Math.floor(w / 26);
      for (let i = 0; i < cols; i++) s += `<circle cx="${x + 14 + i * 26}" cy="${y + h * 0.35}" r="4" class="solder"/><rect x="${x + 8 + i * 26}" y="${y + h * 0.55}" width="12" height="${n(h * 0.28)}" rx="2" class="chip"/>`;
      return s;
    }
    case 'motor': {
      const spin = fx.spin || fx.whirr ? ' spin' : '';
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" class="iron"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.34}" class="coil"/>` +
        `<g class="rotor${spin}" style="transform-origin:${cx}px ${cy}px;--dur:${n(0.2 / Math.max(0.2, fx.spin || 0.6))}s"><line x1="${cx - 8}" y1="${cy}" x2="${cx + 8}" y2="${cy}" class="shaft"/><circle cx="${cx}" cy="${cy}" r="4" class="pin"/></g>`;
    }
    case 'belt': {
      const r1 = 10, r2 = Math.min(26, h / 2 - 4);
      const ax = x + 14, ay = y + h - 16, bx = x + w - r2 - 6, by = y + r2 + 6;
      const spin = (fx.spin ?? 0) > 0 ? ' spin' : '';
      return `<path d="M${ax} ${ay - r1} L${bx} ${by - r2} A${r2} ${r2} 0 1 1 ${bx} ${by + r2} L${ax} ${ay + r1} A${r1} ${r1} 0 1 1 ${ax} ${ay - r1}" class="belt"/>` +
        `<g class="${spin.trim()}" style="transform-origin:${bx}px ${by}px;--dur:${n(1.2 / Math.max(0.3, fx.spin ?? 1))}s"><circle cx="${bx}" cy="${by}" r="${r2 - 3}" class="flywheel"/><line x1="${bx - r2 + 6}" y1="${by}" x2="${bx + r2 - 6}" y2="${by}" class="shaft"/></g>` +
        `<circle cx="${ax}" cy="${ay}" r="${r1 - 3}" class="pin"/>`;
    }
    case 'bearing':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="brass"/><circle cx="${cx}" cy="${cy}" r="6" class="shaft-end"/>`;
    case 'blade': {
      const r = w / 2 - 4, dur = (fx.spin ?? 0) > 0 ? n(0.9 / (fx.spin ?? 1)) : 0;
      let blades = '';
      for (let i = 0; i < 4; i++) blades += `<path d="M${cx} ${cy} Q${cx + r * 0.25} ${cy - r * 0.9} ${cx + r * 0.62} ${cy - r * 0.55} Q${cx + r * 0.3} ${cy - r * 0.2} ${cx} ${cy}" class="fan-blade" transform="rotate(${i * 90} ${cx} ${cy})"/>`;
      let guard = '';
      for (let i = 0; i < 12; i++) guard += `<line x1="${cx}" y1="${cy}" x2="${n(cx + r * Math.cos(i * Math.PI / 6))}" y2="${n(cy + r * Math.sin(i * Math.PI / 6))}" class="guard-wire"/>`;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" class="guard-back"/>` +
        `<g class="${dur ? 'spin' : ''}${fx.wobble ? ' wobble' : ''}" style="transform-origin:${cx}px ${cy}px;--dur:${dur}s">${blades}</g>` +
        `<circle cx="${cx}" cy="${cy}" r="16" class="hub"/>${guard}<circle cx="${cx}" cy="${cy}" r="${r}" class="guard-ring"/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.55)}" class="guard-ring thin"/>`;
    }
    case 'gear': {
      const run = (fx.swing ?? 0) > 0;
      const gear = (gx: number, gy: number, r: number, dir: number, dur: number) => {
        let teeth = '';
        const k = Math.max(8, Math.round(r));
        for (let i = 0; i < k; i++) {
          const a = (i / k) * Math.PI * 2;
          teeth += `<rect x="${n(gx - 2)}" y="${n(gy - r - 3)}" width="4" height="5" class="tooth" transform="rotate(${n(a * 180 / Math.PI)} ${gx} ${gy})"/>`;
        }
        return `<g class="${run ? 'spin' : ''}" style="transform-origin:${gx}px ${gy}px;--dur:${dur}s;animation-direction:${dir > 0 ? 'normal' : 'reverse'}">${teeth}<circle cx="${gx}" cy="${gy}" r="${r}" class="gear"/><circle cx="${gx}" cy="${gy}" r="${n(r * 0.3)}" class="pin"/></g>`;
      };
      return gear(cx, y + 22, 18, 1, 24) + gear(cx - 4, cy + 10, 14, -1, 12) + gear(cx + 6, y + h - 16, 11, 1, 6);
    }
    case 'barrel':
      return `<circle cx="${cx}" cy="${cy}" r="${w / 2}" class="brass"/><path d="M${cx} ${cy} m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0" class="spiral"/>`;
    case 'escape':
      return `<path d="M${x} ${y + 6} Q${cx} ${y + h + 4} ${x + w} ${y + 6} M${cx} ${y + h - 6} V${y + h + 6}" class="anchor"/><circle cx="${cx}" cy="${y + 6}" r="5" class="pin"/>`;
    case 'spring':
      return `<path d="M${x + w / 2} ${y} l-5 5 l10 5 l-10 5 l10 5 l-10 5 l5 5" class="spiral"/>`;
    case 'pendulum': {
      const amp = n(6 * (fx.swing ?? 0));
      return `<g class="${amp ? 'swing' : ''}" style="transform-origin:${cx}px ${y}px;--amp:${amp}deg;--dur:${fx.tick === 2 ? 1.15 : 1}s">` +
        `<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + h - 26}" class="rod"/><circle cx="${cx}" cy="${y + h - 22}" r="22" class="bob"/><circle cx="${cx - 7}" cy="${y + h - 29}" r="6" class="shine"/></g>`;
    }
    case 'head':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="chrome"/><line x1="${cx}" y1="${y + 4}" x2="${cx}" y2="${y + h - 4}" class="gap"/>`;
    case 'roller':
      return `<circle cx="${cx}" cy="${cy}" r="${w / 2}" class="rubber"/><circle cx="${cx}" cy="${cy}" r="4" class="pin"/>`;
    case 'battery':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="tray"/>` +
        [0, 1, 2, 3].map(i => `<rect x="${x + 6 + i * (w - 12) / 4}" y="${y + 6}" width="${n((w - 12) / 4 - 4)}" height="${h - 12}" rx="5" class="cell"/>`).join('');
    case 'dial': {
      let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="dial-glass" style="--g:${n(fx.glow?.dial ?? 0)}"/>`;
      const marks = ['55', '60', '70', '80', '100', '120', '140', '160'];
      marks.forEach((m, i) => { s += `<text x="${n(x + 18 + i * (w - 36) / 7)}" y="${y + h - 9}" class="dial-num">${m}</text>`; });
      const px = n(x + 14 + (fx.pointer ?? ctx.knobA) * (w - 28));
      return s + `<line x1="${px}" y1="${y + 4}" x2="${px}" y2="${y + h - 4}" class="pointer"/>`;
    }
    case 'hands': {
      const t = (fx.swing ?? 0) > 0 ? ' spin' : '';
      return `<circle cx="${cx}" cy="${cy}" r="5" class="pin"/><g class="${t.trim()}" style="transform-origin:${cx}px ${cy}px;--dur:60s"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 44}" class="hand"/></g><line x1="${cx}" y1="${cy}" x2="${cx + 26}" y2="${cy + 10}" class="hand short"/>`;
    }
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="iron"/>`;
}

/* ---------- 몸체 장식 ---------- */
function decor(def: ItemDef, fx: FX): string {
  switch (def.id) {
    case 'lamp':
      return `<path d="M232 50 L408 50 L452 150 L188 150 Z" class="shade"/><rect x="314" y="190" width="12" height="74" class="brass"/>` +
        `<rect x="132" y="262" width="376" height="86" rx="10" class="enamel"/><circle cx="320" cy="110" r="3" class="pin"/>`;
    case 'fan':
      return `<rect x="160" y="270" width="14" height="40" class="iron"/><rect x="60" y="300" width="230" height="44" rx="14" class="enamel"/>` +
        `<rect x="292" y="70" width="276" height="178" rx="40" class="enamel"/><rect x="372" y="282" width="152" height="52" rx="10" class="enamel dark"/>`;
    case 'radio': {
      let s = `<rect x="40" y="30" width="560" height="320" rx="14" class="wood"/><rect x="52" y="42" width="536" height="296" rx="8" class="wood-inner"/>` +
        `<rect x="64" y="100" width="136" height="150" rx="6" class="grille"/>`;
      for (let i = 0; i < 9; i++) s += `<line x1="70" y1="${110 + i * 16}" x2="194" y2="${110 + i * 16}" class="grille-line"/>`;
      return s;
    }
    case 'cassette': {
      const spin = (fx.spin ?? 0) > 0 ? 'spin' : '';
      const reel = (rx: number) => `<g class="${spin}" style="transform-origin:${rx}px 136px;--dur:${n(2 / Math.max(0.3, fx.spin ?? 1))}s"><circle cx="${rx}" cy="136" r="18" class="reel"/>${[0, 60, 120].map(a => `<rect x="${rx - 2}" y="120" width="4" height="10" class="pin" transform="rotate(${a} ${rx} 136)"/>`).join('')}</g>`;
      return `<rect x="84" y="60" width="486" height="282" rx="18" class="plastic"/><rect x="104" y="106" width="166" height="62" rx="6" class="window"/>` +
        reel(140) + reel(234);
    }
    case 'clock': {
      return `<path d="M212 40 Q320 -6 428 40 V368 H212 Z" class="wood"/><rect x="226" y="40" width="188" height="318" rx="4" class="wood-inner"/>` +
        `<rect x="262" y="214" width="116" height="140" rx="6" class="glass-door"/>`;
    }
  }
  return '';
}

function cover(def: ItemDef, job: Job): string {
  let s = '';
  if (job.open < 1) {
    const [x, y, w, h] = def.cover;
    if (def.id === 'clock') {
      s += `<circle cx="${x + w / 2}" cy="${y + h / 2 - 2}" r="${Math.min(w, h) / 2 - 4}" class="clock-face"/>`;
      for (let i = 1; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2, r = Math.min(w, h) / 2 - 22;
        s += `<text x="${n(x + w / 2 + r * Math.cos(a))}" y="${n(y + h / 2 + 2 + r * Math.sin(a))}" class="numeral" text-anchor="middle">${['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ'][i]}</text>`;
      }
    } else {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="cover"/>` +
        [[x + 10, y + 10], [x + w - 10, y + 10], [x + 10, y + h - 10], [x + w - 10, y + h - 10]].map(([sx, sy]) => `<circle cx="${sx}" cy="${sy}" r="4" class="screw"/>`).join('') +
        `<text x="${x + w / 2}" y="${y + h / 2 + 4}" class="cover-label" text-anchor="middle">${def.coverLabel}</text>`;
    }
  }
  if (def.chassis && job.open < 2) {
    const [x, y, w, h] = def.chassis;
    if (job.open >= 1) s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="chassis"/><text x="${x + w / 2}" y="${y + h / 2 + 4}" class="cover-label" text-anchor="middle">${def.chassisLabel}</text>`;
  }
  return s;
}

export interface DrawOpts { tool: ToolId | null; selected: string | null; showNotes: boolean }

export function drawBench(def: ItemDef, job: Job, sim: Sim, opts: DrawOpts): string {
  const fx = sim.fx;
  const visible = (layer: number) => layer <= job.open;
  const compSvg = (c: Comp) => {
    const tag = job.tags[c.id];
    const sel = opts.selected === c.id ? ' selected' : '';
    const label = `<text x="${c.x + c.w / 2}" y="${c.labelAbove ? c.y - 6 : c.y + c.h + 13}" class="comp-label" text-anchor="middle">${c.short ?? c.name}</text>`;
    const note = opts.showNotes && c.note ? `<text x="${c.x + c.w / 2}" y="${c.y - 8}" class="pencil" text-anchor="middle">수첩: ${c.note}</text>` : '';
    const pin = tag ? `<g class="tag ${tag}"><circle cx="${c.x + c.w - 2}" cy="${c.y + 2}" r="9"/><text x="${c.x + c.w - 2}" y="${c.y + 6}" text-anchor="middle">${tag === 'sus' ? '?' : '✓'}</text></g>` : '';
    return `<g class="comp${sel}" data-comp="${c.id}" tabindex="0" role="button" aria-label="${c.name}"><title>${c.name}</title>` +
      `<rect x="${c.x - 4}" y="${c.y - 4}" width="${c.w + 8}" height="${c.h + 8}" rx="6" class="hit"/>${shape(c, fx, job.ctx)}${label}${pin}${note}</g>`;
  };
  const inner = def.comps.filter(c => c.layer > 0 && visible(c.layer));
  const outer = def.comps.filter(c => c.layer === 0 && !(c.front && job.open > 0));
  const wires = def.wires.filter(w => visible(w.layer) && (w.layer > 0 ? true : true))
    .map(w => `<polyline points="${w.pts.map(p => p.join(',')).join(' ')}" class="wire ${w.kind ?? 'p'}"/>`).join('');
  const tps = def.tps.filter(t => visible(t.layer)).map(t => {
    const note = opts.showNotes && t.note ? `<text x="${t.x}" y="${t.y - 14}" class="pencil" text-anchor="${t.x > 470 ? 'end' : t.x < 170 ? 'start' : 'middle'}">${t.label} · 수첩: ${t.note}</text>` : '';
    const sel = opts.selected === t.id ? ' selected' : '';
    return `<g class="tp${sel}" data-tp="${t.id}" tabindex="0" role="button" aria-label="${t.label}"><title>${t.label}</title><circle cx="${t.x}" cy="${t.y}" r="13" class="hit"/>` +
      `<circle cx="${t.x}" cy="${t.y}" r="6.5" class="tp-dot ${t.kind}"/>${note}</g>`;
  }).join('');
  const innerSvg = inner.map(compSvg).join('');
  return `<svg viewBox="0 0 640 380" class="bench-svg tool-${opts.tool ?? 'none'}" role="img" aria-label="${def.name} 작업대">` +
    `<defs><pattern id="mat" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" class="mat-grid"/></pattern>` +
    `<radialGradient id="halo"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.95"/><stop offset="1" stop-color="#ffcf6e" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="640" height="380" class="mat"/><rect width="640" height="380" fill="url(#mat)"/>` +
    decor(def, fx) + (job.open ? `<g class="inner">${wires}${innerSvg}</g>` : '') + cover(def, job) +
    (job.open ? '' : wires) + outer.map(compSvg).join('') + tps + `</svg>`;
}
