// The full chart: opens from the minimap. Drag to look around, pinch or scroll to zoom, tap to set a course.
// Turned 45 degrees like the camera, so "up" on the chart is "up" on the screen.
import {omen} from './omens.js?v=788f7d6';
import {OMENS} from './config.js?v=788f7d6';
import {WORLD, MAP, ISLANDS, WRECKS, HARBORS, EXP_N, STADION, CITIES, PIER_LEN, zoneAt, landDist, pushOut, PORTS} from './world.js?v=788f7d6';
import {IC, matPrice, goodPrice, goodSell, canBuyGood, GOOD_IC} from './menus.js?v=788f7d6';
import {GOODS} from './config.js?v=788f7d6';
import {sfx} from './audio.js?v=788f7d6';
import {playVideo, toast} from './ui.js?v=788f7d6';
import {ARENA} from './arena.js?v=788f7d6';
import {enemies, planReward, planSources, combatState, noGoZones, wanted} from './combat.js?v=788f7d6';
import {siteLevel, standing, LEVEL_COLOR} from './levels.js?v=788f7d6';
import {TREASURE_ISLES, chestReady} from './quests.js?v=788f7d6';
import {G, ship, isExplored, reveal, save, saveSettings} from './state.js?v=788f7d6';

const $ = id => document.getElementById(id);
const el = $('mapView'), cv = $('mapCv'), main = cv.getContext('2d');
let c = main; // drawing goes here: the screen, or the saved sea-and-islands picture (P92)
const INK = '#4a3b28', PARCH = '#e9d8b0', FOG = '#e6d5ac', COURSE = '#b8402f', OCHRE = '#d48a2a';
const R45 = 0; /* the chart is not turned: north is up, like the camera */

// ---- fog layers: a tiny canvas per color, stretched over the world with smoothing for soft edges ----
const fogCache = {};
export function fogLayer(color){
  let f = fogCache[color];
  if (!f){ const cnv = document.createElement('canvas'); cnv.width = cnv.height = EXP_N; f = fogCache[color] = {cnv, rev:-1}; }
  if (f.rev !== G.exploredRev){
    const g = f.cnv.getContext('2d'), img = g.createImageData(EXP_N, EXP_N);
    const [r, gg, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i+2), 16));
    for (let i=0;i<EXP_N*EXP_N;i++) img.data.set([r, gg, b, G.explored[i] ? 0 : 255], i*4);
    g.putImageData(img, 0, 0); f.rev = G.exploredRev;
  }
  return f.cnv;
}

// ---- the sea as a soft watercolor wash, built once: pale aqua shallows, blue middle sea, deep blue open sea ----
let base = null, paper = null, waveMarks = null;
const hash = (x, y) => { const v = Math.sin(x*127.1 + y*311.7)*43758.5453; return v - Math.floor(v); };
// smooth noise; with a period P it wraps around, so a tile of it repeats without seams
function smoothNoise(x, y, P = 0){ const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx*fx*(3 - 2*fx), sy = fy*fy*(3 - 2*fy);
  const w = v => P ? ((v % P) + P) % P : v, h = (i, j) => hash(w(i), w(j));
  const a = h(xi, yi), b = h(xi + 1, yi), c2 = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a)*sx + (c2 - a)*sy + (a - b - c2 + d)*sx*sy; }
function buildBase(){
  const s = 512, k = s/WORLD, cnv = document.createElement('canvas'); cnv.width = cnv.height = s;
  const g = cnv.getContext('2d'), img = g.createImageData(s, s), tint = [[190,226,218], [140,193,208], [98,146,178]];
  let col = new Float32Array(s*s*3);
  for (let y=0;y<s;y++) for (let x=0;x<s;x++){ const t = tint[zoneAt((x + .5)/k, (y + .5)/k)], i = (y*s + x)*3;
    // watercolor: the paint pools a little unevenly
    const m = (smoothNoise(x/22, y/22) - .5)*14 + (smoothNoise(x/7, y/7) - .5)*5;
    col[i] = t[0] + m; col[i+1] = t[1] + m; col[i+2] = t[2] + m*.6; }
  // soften the edges between the zones (a few passes of a small blur), so depth changes like a wash, not a line
  for (let pass=0;pass<4;pass++){ const out = new Float32Array(col.length);
    for (let y=0;y<s;y++) for (let x=0;x<s;x++){ let r = 0, gg = 0, bb = 0, n = 0;
      for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++){ const xx = Math.min(s - 1, Math.max(0, x + dx)), yy = Math.min(s - 1, Math.max(0, y + dy)), j = (yy*s + xx)*3; r += col[j]; gg += col[j+1]; bb += col[j+2]; n++; }
      const i = (y*s + x)*3; out[i] = r/n; out[i+1] = gg/n; out[i+2] = bb/n; }
    col = out; }
  for (let i=0;i<s*s;i++) img.data.set([col[i*3], col[i*3+1], col[i*3+2], 255], i*4);
  g.putImageData(img, 0, 0); base = cnv;
  // little ink wave marks scattered over the open water
  waveMarks = []; const step = 1100;
  for (let y=step/2;y<WORLD;y+=step) for (let x=step/2;x<WORLD;x+=step){ const px = x + (hash(x, y) - .5)*step*.8, py = y + (hash(y, x) - .5)*step*.8;
    if (landDist(px, py) > 450) waveMarks.push([px, py, hash(px, py)]); }
}
// paper: fibers and blotches, laid over everything at the end so the chart looks printed on old paper
function buildPaper(){
  const s = 256, cnv = document.createElement('canvas'); cnv.width = cnv.height = s; const g = cnv.getContext('2d'), img = g.createImageData(s, s);
  for (let y=0;y<s;y++) for (let x=0;x<s;x++){ const n = smoothNoise(x/16, y/16, 16)*.6 + smoothNoise(x/8, y/8, 32)*.25 + hash(x, y)*.15, v = 255 - n*34;
    img.data.set([v, v*.97, v*.9, 255], (y*s + x)*4); }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(120,90,50,.08)'; g.lineWidth = 1; for (let i=0;i<70;i++){ const x = hash(i, 1)*s, y = hash(i, 2)*s, a = hash(i, 3)*6.28, l = 6 + hash(i, 4)*18; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a)*l, y + Math.sin(a)*l); g.stroke(); }
  paper = cnv;
  const pp = document.createElement('div'); pp.id = 'mapPaper'; pp.setAttribute('aria-hidden', 'true');
  pp.style.backgroundImage = `radial-gradient(farthest-corner, rgba(255,255,255,0) 45%, rgba(150,110,60,.35) 100%), url(${cnv.toDataURL()})`;
  cv.after(pp);
}

// ---- view ----
const view = {cx:0, cy:0, z:.2};
let W = 0, H = 0, DPR = 1;
const minZ = () => Math.min(W, H) / (WORLD*1.3);
const maxZ = () => .7;
function size(){ DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W*DPR; cv.height = H*DPR; }
const clampView = () => { view.z = Math.max(minZ(), Math.min(maxZ(), view.z)); view.cx = Math.max(0, Math.min(WORLD, view.cx)); view.cy = Math.max(0, Math.min(WORLD, view.cy)); };
function toScreen(x, y){ return [W/2 + (x - view.cx)*view.z, H/2 + (y - view.cy)*view.z]; }
function toWorld(sx, sy){ return [view.cx + (sx - W/2)/view.z, view.cy + (sy - H/2)/view.z]; }

// ---- drawing ----
export function islandPath(g, is, tier, k = 1){
  g.beginPath(); is.tiers[tier].forEach(([x, y], i) => i ? g.lineTo((is.x + x)*k, (is.y + y)*k) : g.moveTo((is.x + x)*k, (is.y + y)*k)); g.closePath();
}
// P65: the marks on the chart are the same glossy pictures as the rest of the game, on little cream badges a finger can find on a phone.
const icImgs = {};
function icImg(key, svg){ if (icImgs[key]) return icImgs[key]; const im = new Image(); im.onload = () => { if (G.mapOpen) draw(); };
  im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" ')); return icImgs[key] = im; }
const CAMP_SVG = '<svg viewBox="0 0 24 24"><path d="M12 3 L22 20 H2Z" fill="#b5793f" stroke="#2a1d17" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 8 L17 20 H7Z" fill="#3a2618"/><path d="M12 3 L10 1 M12 3 L14 1" stroke="#2a1d17" stroke-width="1.4" stroke-linecap="round"/><path d="M12 12.5 C13.6 15 14.4 16 14 18 C13.6 19.6 10.4 19.6 10 18 C9.6 16 11 15 12 12.5Z" fill="#f59a3a"/></svg>';
const X_SVG = '<svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19" stroke="#6e1d12" stroke-width="6.5" stroke-linecap="round"/><path d="M5 5 L19 19 M19 5 L5 19" stroke="#d6503f" stroke-width="3.8" stroke-linecap="round"/></svg>';
const icons = () => ({harbor:IC.dock, camp:CAMP_SVG, iron:IC.iron, wreck:IC.wreck, x:X_SVG, fish:IC.fish('#4f8fc0'), named:IC.swords});
// P71: the chart's filter: what it shows, and for a good or material, which harbors deal in it and at what price
// P82 (Nicholas): what the chart shows is a list of checkboxes, each with its picture and name. The dropdown is only for prices now.
const FILTER_GROUPS = [['', [['all', 'No prices']]],
  ['Where to buy', [['buy:iron', 'Iron'], ['buy:bronze', 'Bronze'], ['buy:wood', 'Wood'], ['buy:linen', 'Linen'], ...Object.entries(GOODS).map(([k, g]) => ['buy:' + k, g.label])]],
  ['Where to sell', Object.entries(GOODS).map(([k, g]) => ['sell:' + k, g.label])]];
const MATS4 = ['iron', 'bronze', 'wood', 'linen'];
function filterPrice(h, f){ const [how, k] = f.split(':'); if (how === 'sell') return goodSell(h, k); if (MATS4.includes(k)) return matPrice(h, k); return canBuyGood(h, k) ? goodPrice(h, k) : null; }
function priceTag(x, y, txt, best){ c.save(); c.font = '800 11px Nunito, system-ui, sans-serif'; const w = c.measureText(txt).width + 10; c.fillStyle = best ? '#3f9a4b' : '#fff8e6'; c.strokeStyle = 'rgba(40,24,10,.75)'; c.lineWidth = 1; c.beginPath(); c.roundRect ? c.roundRect(x - w/2, y - 8, w, 16, 8) : c.rect(x - w/2, y - 8, w, 16); c.fill(); c.stroke(); c.fillStyle = best ? '#fff' : '#3e2b1c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y + .5); c.restore(); }
function badge(x, y, r, key, ring, opt = {}){
  c.save(); c.shadowColor = 'rgba(50,32,12,.45)'; c.shadowBlur = 5; c.shadowOffsetY = 2;
  const g = c.createRadialGradient(x - r*.35, y - r*.4, 1, x, y, r); g.addColorStop(0, '#fffdf4'); g.addColorStop(1, '#f0e2c2'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill(); c.restore();
  c.strokeStyle = ring || INK; c.lineWidth = ring ? 3 : 1.5; c.beginPath(); c.arc(x, y, r - (ring ? 1 : 0), 0, Math.PI*2); c.stroke();
  if (ring){ c.strokeStyle = 'rgba(50,32,12,.75)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r + .3, 0, Math.PI*2); c.stroke(); }
  if (key){ const im = icImg(key, icons()[key]), s = r*(opt.k || 1.45); if (im.complete && im.naturalWidth){ c.globalAlpha = opt.dim ? .45 : 1; c.drawImage(im, x - s/2, y - s/2, s, s); c.globalAlpha = 1; } }
}
function crossOut(x, y, r){ c.save(); c.strokeStyle = COURSE; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - r*.7, y - r*.7); c.lineTo(x + r*.7, y + r*.7); c.stroke(); c.restore(); }
// P70: a target's level: green if you're ready, amber for a hard fight, red if it's too strong for you
function levelTag(x, y, lv){ const st = standing(lv), t = 'Lv ' + lv; c.save(); c.font = '800 10px Nunito, system-ui, sans-serif'; const w = c.measureText(t).width + 9; c.fillStyle = LEVEL_COLOR[st]; c.strokeStyle = 'rgba(40,24,10,.75)'; c.lineWidth = 1;
  c.beginPath(); c.roundRect ? c.roundRect(x - w/2, y - 7, w, 14, 7) : c.rect(x - w/2, y - 7, w, 14); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x, y + .5); c.restore(); }
// a pinned ship's plans: a gold ring and a rolled plan beside the mark
function pinMark(x, y){ c.save(); c.strokeStyle = '#e8b53d'; c.lineWidth = 3.5; c.shadowColor = 'rgba(232,181,61,.9)'; c.shadowBlur = 8; c.beginPath(); c.arc(x, y, 20, 0, Math.PI*2); c.stroke(); c.shadowBlur = 0;
  const px = x + 26, py = y - 4; c.fillStyle = '#fbeec8'; c.strokeStyle = '#5a381d'; c.lineWidth = 1.4; c.beginPath(); c.rect(px - 8, py - 6, 16, 12); c.fill(); c.stroke();
  c.fillStyle = '#c4473b'; for (const s of [-1, 1]){ c.beginPath(); c.arc(px + s*8, py, 3, 0, Math.PI*2); c.fill(); c.stroke(); } c.strokeStyle = '#3f6c94'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px - 4, py - 2); c.lineTo(px + 4, py - 2); c.moveTo(px - 4, py + 2); c.lineTo(px + 4, py + 2); c.stroke(); c.restore(); }
// small ink pictures for the marks on the chart
function fishGlyph(x, y){ c.beginPath(); c.ellipse(x, y, 6, 3.2, 0, 0, Math.PI*2); c.moveTo(x-5, y); c.lineTo(x-10, y-4); c.lineTo(x-10, y+4); c.closePath(); c.fill(); }
function wreckGlyph(x, y){ c.save(); c.translate(x, y); c.lineCap = 'round';
  c.beginPath(); c.moveTo(-8, 1); c.quadraticCurveTo(0, 7, 8, 1); c.stroke(); // a broken hull
  c.beginPath(); c.moveTo(-1, 3); c.lineTo(4, -8); c.moveTo(4, -8); c.lineTo(-1, -6); c.stroke(); c.restore(); } // and its snapped mast
function anchorGlyph(x, y, fill){ c.save(); c.translate(x, y);
  c.fillStyle = fill; c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 8.5, 0, Math.PI*2); c.fill(); c.stroke();
  c.strokeStyle = '#fff8e6'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.arc(0, -3.6, 1.5, 0, Math.PI*2); c.moveTo(0, -2); c.lineTo(0, 4.5); c.moveTo(-3, -.5); c.lineTo(3, -.5);
  c.moveTo(-4.4, 1.6); c.quadraticCurveTo(-3.5, 5, 0, 5); c.quadraticCurveTo(3.5, 5, 4.4, 1.6); c.stroke(); c.restore(); }
// ship plans to win here: a little rolled scroll with red ends
function scrollGlyph(x, y){ c.save(); c.translate(x, y); c.fillStyle = '#f3d27a'; c.strokeStyle = INK; c.lineWidth = 1.3; c.beginPath(); c.rect(-7, -3.5, 14, 7); c.fill(); c.stroke();
  c.fillStyle = '#b5552c'; c.fillRect(-9, -4.5, 3, 9); c.fillRect(6, -4.5, 3, 9); c.restore(); }
function towerGlyph(x, y, fill, ruined){ c.save(); c.translate(x, y); c.fillStyle = fill; c.strokeStyle = INK; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-6, 7); c.lineTo(-5, -4); c.lineTo(-7, -4); c.lineTo(-7, -9); c.lineTo(-4, -9); c.lineTo(-4, -7); c.lineTo(-1.5, -7); c.lineTo(-1.5, -9); c.lineTo(1.5, -9); c.lineTo(1.5, -7);
  c.lineTo(4, -7); c.lineTo(4, -9); c.lineTo(7, -9); c.lineTo(7, -4); c.lineTo(5, -4); c.lineTo(6, 7); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = INK; c.fillRect(-1.3, 2, 2.6, 5);
  if (ruined){ c.strokeStyle = COURSE; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-9, -10); c.lineTo(9, 8); c.stroke(); } c.restore(); }
// a compass rose in the corner; north points straight up
function compass(x, y, r){ c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(250,242,222,.85)'; c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, r, 0, Math.PI*2); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, 0, r*.78, 0, Math.PI*2); c.stroke();
  c.rotate(R45);
  for (let i=0;i<8;i++){ const a = i*Math.PI/4, L = i % 2 ? r*.5 : r*.92, w = i % 2 ? r*.1 : r*.16; c.save(); c.rotate(a);
    c.beginPath(); c.moveTo(0, -L); c.lineTo(w, 0); c.lineTo(0, 0); c.closePath(); c.fillStyle = i === 0 ? COURSE : INK; c.fill();
    c.beginPath(); c.moveTo(0, -L); c.lineTo(-w, 0); c.lineTo(0, 0); c.closePath(); c.fillStyle = i === 0 ? '#e38d72' : '#f3e6c8'; c.fill(); c.stroke(); c.restore(); }
  c.fillStyle = INK; c.font = `400 ${Math.round(r*.42)}px Marcellus, Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.rotate(-R45); c.fillText('N', 0, -r*1.2); c.restore(); }
// names with a paper-colored halo so they stay readable over lines and color; skipped when they'd overlap a name already written
let placed = [];
function label(text, x, y, font, color, sub){
  c.font = font; const w = c.measureText(text).width, h = parseInt(font.match(/(\d+)px/)[1]) + (sub ? 11 : 0), r = [x - w/2 - 3, y - h + 4, x + w/2 + 3, y + (sub ? 12 : 4)];
  if (placed.some(p => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1])) return false; placed.push(r);
  c.lineJoin = 'round'; c.strokeStyle = 'rgba(246,236,210,.92)'; c.lineWidth = 4; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y);
  if (sub){ c.font = '800 9px Nunito, system-ui, sans-serif'; c.lineWidth = 3; c.strokeText(sub, x, y + 11); c.fillText(sub, x, y + 11); }
  return true;
}
// P92 (Nicholas: the bigger map made the chart laggy): the sea, islands and fog are drawn once into a saved picture.
// While you drag or pinch, the chart just moves and scales that picture and draws the marks and names on top; the full
// picture is drawn again a moment after your fingers stop. Redraws wait for the next frame, so a burst of touch events costs one.
let stat = null, rafOn = false, want = 0, fullT = 0;
function requestDraw(fast){ want = Math.max(want, fast ? 1 : 2);
  if (!rafOn){ rafOn = true; requestAnimationFrame(() => { rafOn = false; const w = want; want = 0; if (G.mapOpen) draw(w === 1); }); }
  clearTimeout(fullT); if (fast) fullT = setTimeout(() => requestDraw(false), 180); }
function draw(fast){
  if (!base) buildBase(); if (!paper) buildPaper();
  // places your jobs, goals and treasure maps send you to show on the chart even before you've sailed there
  for (const r of G.S.reqs || []){ const is = r.to && ISLANDS.find(i => i.name === r.to); if (is && !isExplored(is.x, is.y)) reveal(is.x, is.y, is.r + 350); }
  for (const m of G.goalMarks || []) if (!isExplored(m.x, m.y)) reveal(m.x, m.y, 600);
  if (G.S.treasure && !isExplored(G.S.treasure.x, G.S.treasure.y)) reveal(G.S.treasure.x, G.S.treasure.y, 400);
  const pinned = G.S.pin ? planSources(G.S.pin) : []; for (const f of pinned) if (!isExplored(f.x, f.y)) reveal(f.x, f.y, f.isle.r + 450); // P70: a pinned ship's plans are on the chart
  const key = [view.cx, view.cy, view.z, W, H, DPR, G.exploredRev].join();
  if (!stat || stat.cv.width !== cv.width || stat.cv.height !== cv.height || (!fast && stat.key !== key)) drawStatic(key);
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PARCH; c.fillRect(0, 0, cv.width, cv.height);
  const k = view.z/stat.z; // the saved picture, moved and scaled to where the view is now
  c.setTransform(DPR*k, 0, 0, DPR*k, DPR*(W/2*(1 - k) + view.z*(stat.cx - view.cx)), DPR*(H/2*(1 - k) + view.z*(stat.cy - view.cy)));
  c.drawImage(stat.cv, 0, 0, W, H);
  c.setTransform(DPR,0,0,DPR,0,0);
  drawMarks(pinned);
}
function drawStatic(key){
  if (!stat){ const sc = document.createElement('canvas'); stat = {cv:sc, g:sc.getContext('2d')}; }
  if (stat.cv.width !== cv.width || stat.cv.height !== cv.height){ stat.cv.width = cv.width; stat.cv.height = cv.height; }
  Object.assign(stat, {key, cx:view.cx, cy:view.cy, z:view.z}); c = stat.g;
  try { drawSea(); } finally { c = main; }
}
function drawSea(){
  c.setTransform(DPR,0,0,DPR,0,0);
  c.fillStyle = PARCH; c.fillRect(0, 0, W, H);
  c.save();
  c.translate(W/2, H/2); c.scale(view.z, view.z); c.rotate(R45); c.translate(-view.cx, -view.cy);
  const px = 1/view.z; // one screen pixel, in world units
  // the edge of the known world: a soft shadow under the chart, then the sea
  c.fillStyle = 'rgba(90,60,25,.18)'; c.fillRect(6*px, 6*px, WORLD, WORLD);
  c.imageSmoothingEnabled = true; c.drawImage(base, 0, 0, WORLD, WORLD);
  // a soft wash of each city's color over the sea it rules
  for (const is of ISLANDS){ if (!is.city) continue; const R = is.r + 1700, g = c.createRadialGradient(is.x, is.y, is.r*.5, is.x, is.y, R);
    g.addColorStop(0, CITIES[is.city].color + '40'); g.addColorStop(1, CITIES[is.city].color + '00'); c.fillStyle = g; c.beginPath(); c.arc(is.x, is.y, R, 0, Math.PI*2); c.fill(); }
  // ink wave marks
  c.strokeStyle = 'rgba(52,92,112,.35)'; c.lineWidth = 1.3*px; c.lineCap = 'round';
  const wl = Math.max(70, 9*px);
  for (const [x, y, h] of waveMarks){ c.beginPath(); for (let k=0;k<2;k++){ const ox = x + (k - .5)*wl*1.1; c.moveTo(ox - wl*.55, y); c.quadraticCurveTo(ox, y - wl*.45, ox + wl*.55, y); } c.stroke(); }
  // islands: a light shallow-water halo with a thin ring around each shore, a drop shadow, sand, green, rocky tops, and an ink outline
  for (const is of ISLANDS){ islandPath(c, is, 0);
    c.strokeStyle = 'rgba(232,246,238,.5)'; c.lineWidth = 170; c.stroke(); // (world sizes: small when the whole chart shows, wider up close)
    if (view.z > .03){ c.lineWidth = 95; c.strokeStyle = 'rgba(70,120,138,.3)'; c.stroke(); c.lineWidth = 95 - 2.4*px; c.strokeStyle = 'rgba(214,236,228,1)'; c.stroke(); } }
  for (const is of ISLANDS){
    c.save(); c.translate(3*px, 4*px); islandPath(c, is, 0); c.fillStyle = 'rgba(80,60,30,.25)'; c.fill(); c.restore();
    islandPath(c, is, 0); c.fillStyle = '#efdcaa'; c.fill();
    if (is.tiers[1]){ islandPath(c, is, 1); c.fillStyle = '#a9bb6c'; c.fill(); c.strokeStyle = 'rgba(80,100,40,.5)'; c.lineWidth = 1*px; c.stroke(); }
    if (is.tiers[2]){ islandPath(c, is, 2); c.fillStyle = '#b4a888'; c.fill(); c.strokeStyle = 'rgba(90,70,40,.45)'; c.stroke(); }
    islandPath(c, is, 0); c.strokeStyle = INK; c.lineWidth = 1.7*px; c.stroke();
  }
  c.drawImage(fogLayer(FOG), 0, 0, WORLD, WORLD);
  // a double ink frame around the world
  c.strokeStyle = INK; c.lineWidth = 3*px; c.strokeRect(0, 0, WORLD, WORLD); c.lineWidth = 1*px; c.strokeRect(-9*px, -9*px, WORLD + 18*px, WORLD + 18*px);
  c.restore();
}
function drawMarks(pinned){

  // upright marks and names, only where you have sailed
  placed = [[W - 110, 0, W, 64], [0, H - 130, W, H]]; // keep names off the header and footer
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const marks = G.settings.dev.markers, F = G.mapFilter || 'all', priced = F.includes(':'), show = G.settings.mapShow || {}, on = k => !priced && show[k] !== false;
  const showWrecks = on('wrecks'), showIron = on('iron') || F === 'buy:iron';
  // P92 (Nicholas): no fish on the chart; there are so many close together that they only cluttered it
  c.strokeStyle = INK; c.lineWidth = 1.8;
  for (const w of WRECKS){ if (!showWrecks || !marks || !w.stock || !isExplored(w.x, w.y)) continue; const [x, y] = toScreen(w.x, w.y); badge(x, y, 15, 'wreck', null, {k:1.5}); }
  // iron mines
  for (const is of ISLANDS){ if (!showIron || !is.mine || !isExplored(is.mine.x, is.mine.y)) continue; const [x, y] = toScreen(is.mine.x, is.mine.y); badge(x, y, 13, 'iron', '#5d6773'); }
  // buried treasure on the small islands (P52): a little gold X where a chest is waiting
  for (const t of TREASURE_ISLES){ if (!on('treasure') || !isExplored(t.x, t.y) || !chestReady(t)) continue; const [x, y] = toScreen(t.x, t.y);
    c.save(); c.strokeStyle = '#d9a23a'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 5, y - 5); c.lineTo(x + 5, y + 5); c.moveTo(x + 5, y - 5); c.lineTo(x - 5, y + 5); c.stroke(); c.restore(); }
  // the treasure map's X, and a dashed ring around islands your jobs send you to
  if (G.S.treasure && on('treasure')){ const [x, y] = toScreen(G.S.treasure.x, G.S.treasure.y); badge(x, y, 17, 'x', '#d9a23a', {k:1.3}); }
  for (const r of G.S.reqs || []){ const is = (r.t === 'visit' || r.t === 'deliver') && ISLANDS.find(i => i.name === r.to); if (!is) continue;
    const [x, y] = toScreen(is.x, is.y); c.save(); c.setLineDash([6, 6]); c.strokeStyle = COURSE; c.lineWidth = 2; c.beginPath(); c.arc(x, y, Math.max(16, is.r*view.z + 12), 0, Math.PI*2); c.stroke(); c.restore(); }
  // P112: the harbor walls and quays of the ports
  { c.strokeStyle = '#cbbd9a'; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const pt of PORTS){ if (!isExplored(pt.pier.x, pt.pier.y)) continue; c.lineWidth = Math.max(1.5, pt.w*view.z); c.beginPath();
      for (const run of [pt.quay, ...pt.arms.map(q => q.pts)]) run.forEach((q, i) => { const [x, y] = toScreen(q.x, q.y); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.stroke(); } }
  // the Arena of Rhodes: its breakwaters, with the gate open in the front one
  if (ARENA && isExplored(ARENA.x, ARENA.y)){ const [ax, ay] = toScreen(ARENA.x, ARENA.y);
    c.strokeStyle = '#cbbd9a'; c.lineWidth = Math.max(2, 22*view.z); c.lineCap = 'butt'; c.beginPath();
    for (const w of ARENA.walls || []){ const [x0, y0] = toScreen(w.x - w.tx*w.L/2, w.y - w.ty*w.L/2), [x1, y1] = toScreen(w.x + w.tx*w.L/2, w.y + w.ty*w.L/2); c.moveTo(x0, y0); c.lineTo(x1, y1); }
    c.stroke(); label('Arena of Rhodes', ax, ay + Math.max(5, ARENA.R*1.45*view.z) + 16, '400 14px Marcellus, Georgia, serif', INK); }
  // P107: no-go waters: a dashed ring in the owner's color (gone while you hold that city's war contract)
  if (on('forts')){ c.save(); c.setLineDash([8, 6]); c.lineWidth = 2;
    for (const z of noGoZones()){ if (!isExplored(z.x, z.y) || (G.S.war && G.S.war.city === z.city)) continue; const [zx, zy] = toScreen(z.x, z.y), r = z.r*view.z; if (r < 6) continue;
      c.strokeStyle = CITIES[z.city].color; c.globalAlpha = .75; c.beginPath(); c.arc(zx, zy, r, 0, Math.PI*2); c.stroke(); c.globalAlpha = .08; c.fillStyle = CITIES[z.city].color; c.fill(); }
    c.restore(); }
  // forts: a little tower in the owner's color (a dark one for pirates), crossed out while it lies in ruins
  for (const e of enemies){ if (!e.named || e.dead || !on('named')) continue; const pinOn = G.S.pin && planReward(e) === G.S.pin; if (!pinOn && !isExplored(e.home.x, e.home.y)) continue; if (pinOn && !isExplored(e.home.x, e.home.y)) reveal(e.home.x, e.home.y, 500);
    const [nx, ny] = toScreen(e.home.x, e.home.y); badge(nx, ny, 15, 'named', '#7a2426', {k:1.3}); levelTag(nx, ny - 22, siteLevel(e)); label(e.named.name, nx, ny + 28, '700 12px Nunito, sans-serif', '#5a1e14'); }
  { const e = wanted(); if (e && on('named')){ const [nx, ny] = toScreen(e.x, e.y); badge(nx, ny, 13, 'named', '#b8862c', {k:1.15}); label('Wanted: ' + e.wanted.name, nx, ny + 26, '700 12px Nunito, sans-serif', '#5a1e14'); } } /* P123: the wanted ship, where it sails right now */
  for (const e of enemies){ if (!e.fort || !on(e.camp ? 'camps' : 'forts') || !isExplored(e.x, e.y)) continue; const [fx, fy] = toScreen(e.x, e.y);
    if (e.camp){ badge(fx, fy, 15, 'camp', '#b5552c', {dim:e.dead}); if (e.dead) crossOut(fx, fy, 15); else levelTag(fx, fy - 22, siteLevel(e)); continue; }
    const col = e.owner === 'you' ? OCHRE : e.city ? CITIES[e.city].color : '#3a2e2a'; badge(fx, fy, 15, null, col); c.save(); c.translate(fx, fy); c.scale(.92, .92); towerGlyph(0, 0, col, false); c.restore();
    if (e.dead) crossOut(fx, fy, 15); else levelTag(fx, fy - 22, siteLevel(e)); }
  if (on('goals')) for (const f of pinned){ const [x, y] = f.named ? toScreen(f.home.x, f.home.y) : toScreen(f.x, f.y); pinMark(x, y); }
  // a good or material picked in the filter: only the harbors that deal in it, each with its price; the best price is green
  const known = HARBORS.filter(h => h.is.port || isExplored(h.dock.x, h.dock.y)), deals = priced ? known.map(h => [h, filterPrice(h, F)]).filter(([, p]) => p != null) : [], bestP = deals.length ? (F.startsWith('sell') ? Math.max : Math.min)(...deals.map(([, p]) => p)) : 0;
  for (const h of known){ if (!priced && !on('harbors')) continue; const price = priced ? filterPrice(h, F) : 0; if (priced && price == null) continue;
    const [hx, hy] = toScreen(h.dock.x, h.dock.y), port = h.is.port; badge(hx, hy, port ? 19 : 16, 'harbor', h.is.city ? CITIES[h.is.city].color : OCHRE, {k:1.35}); if (priced) priceTag(hx, hy - 25, F === 'buy:wood' ? `${price} per 10` : `${price} dr`, price === bestP); }
  if (priced && !deals.length) label('No harbor you know deals in this yet. Keep exploring.', W/2, 92, '700 14px Nunito, sans-serif', '#5a1e14');
  // P78: a god's fire on the sea
  if (on('goals') && omen.on){ const [x, y] = toScreen(omen.x, omen.y), o = OMENS[omen.g], p = (performance.now()/900) % 1; c.save(); c.globalAlpha = 1 - p; c.strokeStyle = o.color; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 10 + p*16, 0, Math.PI*2); c.stroke(); c.globalAlpha = 1; c.fillStyle = o.color; c.strokeStyle = '#3e2b1c'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 8, 0, Math.PI*2); c.fill(); c.stroke(); c.restore(); label(o.name, x, y - 18, '700 13px Nunito, sans-serif', '#5a1e14'); }
  // the chapter goal: a red ring with a name (pirate fortresses, the pirate king)
  for (const m of on('goals') ? G.goalMarks || [] : []){ const [x, y] = toScreen(m.x, m.y); c.save(); c.strokeStyle = COURSE; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 14, 0, Math.PI*2); c.stroke();
    c.beginPath(); c.arc(x, y, 5, 0, Math.PI*2); c.fillStyle = COURSE; c.fill(); c.restore(); label(m.label, x, y - 20, '700 13px Nunito, sans-serif', '#5a1e14'); }
  // island names: harbors and city islands first, then the rest when there's room (small islands only when zoomed in)
  const named = ISLANDS.filter(is => is.name && isExplored(is.x, is.y)).sort((a, b) => (b.port || b.city ? 1 : 0) - (a.port || a.city ? 1 : 0) || b.r - a.r);
  for (const is of named){
    if (!is.port && !is.city && is.r*view.z < 9 && view.z < .05) continue;
    const [x, y] = toScreen(is.x, is.y), off = Math.min(is.r*view.z*.7 + 16, 60);
    label(is.name, x, y + off, `400 ${is.port ? 18 : is.city ? 16 : 14}px Marcellus, Georgia, serif`, is.city ? CITIES[is.city].ink : INK, is.city ? CITIES[is.city].name.toUpperCase() : null);
  }

  // course
  const S = G.S;
  if (G.dest){
    const [sx, sy] = toScreen(S.x, S.y), [dx, dy] = toScreen(G.dest.x, G.dest.y);
    c.strokeStyle = COURSE; c.lineWidth = 2.5; c.setLineDash([2, 7]); c.lineCap = 'round'; c.beginPath(); c.moveTo(sx, sy); c.lineTo(dx, dy); c.stroke(); c.setLineDash([]);
    c.lineWidth = 3.5; c.beginPath(); c.moveTo(dx-7, dy-7); c.lineTo(dx+7, dy+7); c.moveTo(dx+7, dy-7); c.lineTo(dx-7, dy+7); c.stroke();
  }
  // you: a gold arrow with a soft ring around it
  const [bx, by] = toScreen(S.x, S.y), ang = S.a + R45;
  c.save(); c.translate(bx, by);
  c.save(); c.shadowColor = 'rgba(50,32,12,.5)'; c.shadowBlur = 6; c.shadowOffsetY = 2; c.fillStyle = '#fffdf4'; c.beginPath(); c.arc(0, 0, 18, 0, Math.PI*2); c.fill(); c.restore();
  c.strokeStyle = OCHRE; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 16.5, 0, Math.PI*2); c.stroke();
  c.rotate(ang); c.fillStyle = OCHRE; c.strokeStyle = INK; c.lineWidth = 1.8; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(12, 0); c.lineTo(-8, -8); c.lineTo(-4, 0); c.lineTo(-8, 8); c.closePath(); c.fill(); c.stroke();
  c.restore();
  compass(W - 42, 112, 26);
  // (the paper and its darker edge lie over the chart as a layer of their own, #mapPaper: P92)
  $('mapClear').hidden = !G.dest;
}

// ---- open / close ----
export function openMap(){
  if (G.sheetOpen) return;
  G.mapOpen = true; G.joy = null; el.hidden = false; size(); G.mapFilter = 'all'; $('mapFilter').value = 'all'; document.querySelector('.legend').hidden = false; filterPanel(false);
  view.cx = G.S.x; view.cy = G.S.y; view.z = Math.min(W, H)/(6500*MAP.spread/3.4); // (P92: opens as wide as before in islands, on the bigger map)
  // P65: a new treasure map: open on it, far enough out to see it and your ship
  // P71: with a ship pinned, the chart opens wide enough to show where its plans are
  if (G.S.pin){ const p = planSources(G.S.pin).map(f => f.named ? f.home : f).sort((a, b) => Math.hypot(a.x - G.S.x, a.y - G.S.y) - Math.hypot(b.x - G.S.x, b.y - G.S.y)).slice(0, 3); if (p.length) frame(p); }
  if (G.S.mapNew && G.S.treasure){ const T = G.S.treasure, d = Math.hypot(T.x - G.S.x, T.y - G.S.y); view.cx = (T.x + G.S.x)/2; view.cy = (T.y + G.S.y)/2; view.z = Math.min(view.z, Math.min(W, H)*.62/Math.max(d, 1)); }
  G.S.mapNew = false; clampView();
  const homeNow = !!G.dock && G.dock.h === HARBORS[0]; $('mapHome').hidden = homeNow; $('homePop').hidden = true;
  draw();
}
// Test hook: the whole map at once.
export function chartAll(){ openMap(); view.cx = WORLD/2; view.cy = WORLD/2; view.z = Math.min(W, H)/WORLD; draw(); }
export function closeMap(){ G.mapOpen = false; el.hidden = true; }
// P67: while the chart is open the game keeps running: your ship moves on it, and a banner warns you if you're attacked.
let tickT = 0;
export function mapTick(dt){
  if (G.sheetOpen || G.sinking){ closeMap(); return; }
  $('mapWarn').hidden = !combatState.threat;
  if ((tickT -= dt) <= 0){ tickT = .25; if (!gesture || gesture.type === 'tap') requestDraw(false); } // (the ship moves on the chart; the sea is reused)
}

function setCourse(x, y){
  if (x < 0 || y < 0 || x > WORLD || y > WORLD) return;
  const p = {x, y}; for (let k=0;k<40 && pushOut(p, ship().beam + 40);k++); // a course onto land stops just off the shore
  x = p.x; y = p.y;
  if (G.settings.dev.teleport){ // builder tool
    Object.assign(G.S, {x, y}); G.cam = {x, y}; G.dest = null; G.v = 0; reveal(x, y, 520); save();
    closeMap(); document.dispatchEvent(new CustomEvent('teleport')); return;
  }
  G.dest = {x, y, far:true};
  const st = Math.max(1, Math.round(Math.hypot(x - G.S.x, y - G.S.y)/STADION));
  closeMap();
  return st;
}

// ---- gestures ----
const pts = new Map(); let gesture = null;
cv.addEventListener('pointerdown', e => {
  pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
  try { cv.setPointerCapture(e.pointerId); } catch(_){}
  if (pts.size === 1) gesture = {type:'tap', sx:e.clientX, sy:e.clientY};
  else if (pts.size === 2){ const [a, b] = [...pts.values()]; gesture = {type:'pinch', d:Math.hypot(a.x-b.x, a.y-b.y), z:view.z}; }
});
cv.addEventListener('pointermove', e => {
  if (!pts.has(e.pointerId)) return;
  const prev = pts.get(e.pointerId), cur = {x:e.clientX, y:e.clientY}; pts.set(e.pointerId, cur);
  if (!gesture) return;
  if (gesture.type === 'tap' && Math.hypot(cur.x - gesture.sx, cur.y - gesture.sy) > 8) gesture.type = 'pan';
  if (gesture.type === 'pan'){
    const dx = cur.x - prev.x, dy = cur.y - prev.y;
    view.cx -= dx/view.z; view.cy -= dy/view.z; clampView(); requestDraw(true);
  } else if (gesture.type === 'pinch' && pts.size === 2){
    const [a, b] = [...pts.values()]; view.z = gesture.z * Math.hypot(a.x-b.x, a.y-b.y) / gesture.d; clampView(); requestDraw(true);
  }
});
function up(e){
  if (!pts.has(e.pointerId)) return;
  pts.delete(e.pointerId);
  if (gesture && gesture.type === 'tap' && pts.size === 0){
    const [x, y] = toWorld(e.clientX, e.clientY), st = setCourse(x, y);
    if (st) document.dispatchEvent(new CustomEvent('course', {detail:st}));
  }
  if (pts.size === 0) gesture = null;
  else if (gesture && gesture.type === 'pinch') gesture = {type:'pan'};
}
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { e.preventDefault(); view.z *= Math.exp(-e.deltaY*.0015); clampView(); requestDraw(true); }, {passive:false});

$('mapBtn').addEventListener('click', openMap);
$('mapClose').addEventListener('click', closeMap);
$('mapWarn').addEventListener('click', closeMap);
// P66: one Sail home button. It opens a little popup: go instantly with a video, or sail there by yourself.
const homePop = $('homePop'), hidePop = () => { homePop.hidden = true; };
$('homeNow').innerHTML = `${IC.play}<span>Go instantly</span>`;
$('mapHome').addEventListener('click', () => { sfx('click'); const fight = !!combatState.threat; $('homeNow').disabled = fight; $('homeNote').hidden = !fight; homePop.hidden = false; });
$('homeSail').addEventListener('click', () => { hidePop(); const P = HARBORS[0].pier, x = P.x + P.dx*(PIER_LEN + 75), y = P.y + P.dy*(PIER_LEN + 75);
  if (G.dock) document.dispatchEvent(new Event('undock')); setCourse(x, y); toast('Sailing home', 2); });
$('homeNow').addEventListener('click', () => { if (combatState.threat) return; hidePop();
  playVideo(() => { closeMap(); document.dispatchEvent(new Event('fasthome')); }, 'This one takes you straight home.', 'Home!'); });
$('homeCancel').addEventListener('click', hidePop);
homePop.addEventListener('click', e => { if (e.target === homePop) hidePop(); });
// the legend, with the same pictures as the chart
const LAYERS = [['harbors', IC.dock, 'Harbors'], ['camps', CAMP_SVG, 'Camps'], ['forts', '<svg viewBox="0 0 20 20"><path d="M4 18l1-11H3V2h3v2h2.5V2h3v2H14V2h3v5h-2l1 11z" fill="#6f9bd6" stroke="#4a3b28" stroke-width="1.4" stroke-linejoin="round"/></svg>', 'Fortresses'], ['named', IC.swords, 'Pirates'],
  ['wrecks', IC.wreck, 'Wrecks'], ['iron', IC.iron, 'Iron'], ['treasure', X_SVG, 'Treasure'], ['goals', '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#e8b53d" stroke-width="3"/></svg>', 'Goals']];
// P72: each picture gets its own color names: the chart is hidden most of the time, and a picture borrowing colors from a hidden one loses them
$('mapView').querySelector('.legend').innerHTML = LAYERS.map(([k, ic, n]) => `<li><label><input type="checkbox" data-layer="${k}" ${(G.settings.mapShow || {})[k] === false ? '' : 'checked'}>${ic.replace(/id="(\w+)"/g, 'id="lg$1"').replace(/url\(#(\w+)\)/g, 'url(#lg$1)')}<span>${n}</span></label></li>`).join('');
$('mapView').querySelector('.legend').addEventListener('change', e => { const k = e.target.dataset.layer; if (!k) return; G.settings.mapShow = {...(G.settings.mapShow || {}), [k]:e.target.checked}; saveSettings(); filterDot(); draw(); });
$('mapFilter').innerHTML = FILTER_GROUPS.map(([g, list]) => { const o = list.map(([v, n]) => `<option value="${v}">${n}</option>`).join(''); return g ? `<optgroup label="${g}">${o}</optgroup>` : o; }).join('');
// P83 (Nicholas): the filters stay folded away behind one Filter button. A dot on it means something is hidden.
function filterDot(){ const show = G.settings.mapShow || {}; $('filterDot').hidden = !((G.mapFilter || 'all') !== 'all' || Object.values(show).some(v => v === false)); }
function filterPanel(open){ $('mapFilters').hidden = !open; $('mapFilterBtn').setAttribute('aria-expanded', open); $('mapFilterBtn').classList.toggle('on', open); filterDot(); }
$('mapFilterBtn').addEventListener('click', () => filterPanel($('mapFilters').hidden));
// frame what the filter found, with your ship, so you never have to hunt for it
function frame(pts){ if (!pts.length) return; const all = [...pts, {x:G.S.x, y:G.S.y}], xs = all.map(p => p.x), ys = all.map(p => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  view.cx = (x0 + x1)/2; view.cy = (y0 + y1)/2 + 700; view.z = Math.min(W*.72/Math.max(x1 - x0, 1500), H*.5/Math.max(y1 - y0, 1500)); clampView(); }
$('mapFilter').addEventListener('change', e => { const F = G.mapFilter = e.target.value; document.querySelector('.legend').hidden = F !== 'all';
  const known = HARBORS.filter(h => h.is.port || isExplored(h.dock.x, h.dock.y));
  if (F.includes(':')) frame(known.filter(h => filterPrice(h, F) != null).map(h => h.dock));
  else if (F === 'harbors') frame(known.map(h => h.dock));
  else if (F === 'forts' || F === 'ships') frame(enemies.filter(o => !o.dead && (F === 'ships' ? o.named : o.fort || o.named) && isExplored((o.home || o).x, (o.home || o).y)).map(o => o.named ? o.home : o));
  filterDot(); draw(); });
$('mapClear').addEventListener('click', () => { G.dest = null; draw(); });
addEventListener('keydown', e => {
  if (e.key === 'Escape' && G.mapOpen){ if (!$('homePop').hidden) $('homePop').hidden = true; else closeMap(); }
  else if ((e.key === 'm' || e.key === 'M') && !G.sheetOpen) G.mapOpen ? closeMap() : openMap();
});
addEventListener('resize', () => { if (G.mapOpen){ size(); clampView(); draw(); } });
