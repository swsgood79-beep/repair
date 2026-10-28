// dist/index.html과 번들을 하나의 HTML 조각으로 합쳐 아티팩트로 올릴 수 있게 한다.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));
const js = assets.filter(f => f.endsWith('.js')).map(f => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');
const css = assets.filter(f => f.endsWith('.css')).map(f => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');
const head = html.match(/<title>[\s\S]*?<\/title>/)[0];
const fonts = [...html.matchAll(/<link[^>]+fonts\.g[^>]+>/g)].map(m => m[0]).join('\n');
const out = `${head}\n<meta name="claude:viewport-fit-sides" content="cover">\n${fonts}\n<style>\n${css}\n</style>\n<div id="app"></div>\n<script type="module">\n${js.replace(/<\/script/g, '<\\/script')}\n</script>\n`;
writeFileSync(join(dist, 'artifact.html'), out);
console.log('dist/artifact.html', (out.length / 1024).toFixed(1) + 'KB');
