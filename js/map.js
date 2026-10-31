// The full chart: opens from the minimap. Drag to look around, pinch or scroll to zoom, tap to set a course.
// Turned 45 degrees like the camera, so "up" on the chart is "up" on the screen.
import {WORLD, ISLANDS, SPOTS, WRECKS, HARBORS, EXP_N, STADION, CITIES, zoneAt, landDist, pushOut} from './world.js?v=341cce2';
import {ARENA} from './arena.js?v=341cce2';
import {enemies} from './combat.js?v=341cce2';
import {G, ship, isExplored, reveal, save} from './state.js?v=341cce2';

const $ = id => document.getElementById(id);
const el = $('mapView'), cv = $('mapCv'), c = cv.getContext('2d');
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
  paper = c.createPattern(cnv, 'repeat');
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
// small ink pictures for the marks on the chart
function fishGlyph(x, y){ c.beginPath(); c.ellipse(x, y, 6, 3.2, 0, 0, Math.PI*2); c.moveTo(x-5, y); c.lineTo(x-10, y-4); c.lineTo(x-10, y+4); c.closePath(); c.fill(); }
function wreckGlyph(x, y){ c.save(); c.translate(x, y); c.lineCap = 'round';
  c.beginPath(); c.moveTo(-8, 1); c.quadraticCurveTo(0, 7, 8, 1); c.stroke(); // a broken hull
  c.beginPath(); c.moveTo(-1, 3); c.lineTo(4, -8); c.moveTo(4, -8); c.lineTo(-1, -6); c.stroke(); c.restore(); } // and its snapped mast
function anchorGlyph(x, y, fill){ c.save(); c.translate(x, y);
  c.fillStyle = fill; c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 8.5, 0, Math.PI*2); c.fill(); c.stroke();
  c.strokeStyle = '#fff8e6'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.arc(0, -3.6, 1.5, 0, Math.PI*2); c.moveTo(0, -2); c.lineTo(0, 4.5); c.moveTo(-3, -.5); c.lineTo(3, -.5);
  c.moveTo(-4.4, 1.6); c.quadraticCurveTo(-3.5, 5, 0, 5); c.quadraticCurveTo(3.5, 5, 4.4, 1.6); c.stroke(); c.restore(); }
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
function draw(){
  if (!base) buildBase(); if (!paper) buildPaper();
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

  // upright marks and names, only where you have sailed
  placed = [[W - 110, 0, W, 64], [0, H - 120, W, H]]; // keep names off the header and footer
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const marks = G.settings.dev.markers;
  for (const s of SPOTS){ if (!marks || !s.stock || !isExplored(s.x, s.y)) continue; const [x, y] = toScreen(s.x, s.y); c.fillStyle = '#3d7d93'; fishGlyph(x, y); }
  c.strokeStyle = INK; c.lineWidth = 1.8;
  for (const w of WRECKS){ if (!marks || !w.stock || !isExplored(w.x, w.y)) continue; const [x, y] = toScreen(w.x, w.y); wreckGlyph(x, y); }
  // the treasure map's X, and a dashed ring around islands your jobs send you to
  if (G.S.treasure){ const [x, y] = toScreen(G.S.treasure.x, G.S.treasure.y); c.save(); c.strokeStyle = COURSE; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 9, y - 9); c.lineTo(x + 9, y + 9); c.moveTo(x + 9, y - 9); c.lineTo(x - 9, y + 9); c.stroke(); c.restore(); }
  for (const r of G.S.reqs || []){ const is = (r.t === 'visit' || r.t === 'deliver') && ISLANDS.find(i => i.name === r.to); if (!is) continue;
    const [x, y] = toScreen(is.x, is.y); c.save(); c.setLineDash([6, 6]); c.strokeStyle = COURSE; c.lineWidth = 2; c.beginPath(); c.arc(x, y, Math.max(16, is.r*view.z + 12), 0, Math.PI*2); c.stroke(); c.restore(); }
  // the Arena of Rhodes: a stone ring with the gate marked
  if (ARENA && isExplored(ARENA.x, ARENA.y)){ const [ax, ay] = toScreen(ARENA.x, ARENA.y), r = Math.max(5, ARENA.R*view.z);
    c.strokeStyle = '#cbbd9a'; c.lineWidth = Math.max(2, 22*view.z); c.beginPath(); c.arc(ax, ay, r, ARENA.gate + ARENA.half, ARENA.gate - ARENA.half + Math.PI*2); c.stroke();
    label('Arena of Rhodes', ax, ay + r + 16, '400 14px Marcellus, Georgia, serif', INK); }
  // forts: a little tower in the owner's color (a dark one for pirates), crossed out while it lies in ruins
  for (const e of enemies){ if (!e.fort || !isExplored(e.x, e.y)) continue; const [fx, fy] = toScreen(e.x, e.y);
    towerGlyph(fx, fy, e.owner === 'you' ? OCHRE : e.city ? CITIES[e.city].color : '#3a2e2a', e.dead); }
  for (const h of HARBORS){ if (!h.is.port && !isExplored(h.dock.x, h.dock.y)) continue;
    const [hx, hy] = toScreen(h.dock.x, h.dock.y); anchorGlyph(hx, hy, h.is.city ? CITIES[h.is.city].color : OCHRE); }
  // the chapter goal: a red ring with a name (pirate fortresses, the pirate king)
  for (const m of G.goalMarks || []){ const [x, y] = toScreen(m.x, m.y); c.save(); c.strokeStyle = COURSE; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 14, 0, Math.PI*2); c.stroke();
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
  c.fillStyle = 'rgba(212,138,42,.18)'; c.strokeStyle = 'rgba(160,95,20,.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 19, 0, Math.PI*2); c.fill(); c.stroke();
  c.rotate(ang); c.fillStyle = OCHRE; c.strokeStyle = INK; c.lineWidth = 2; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(13, 0); c.lineTo(-8, -8); c.lineTo(-4, 0); c.lineTo(-8, 8); c.closePath(); c.fill(); c.stroke();
  c.restore();
  compass(W - 44, H - 196, 28);
  // the paper itself, over everything, and a darker edge like an old sheet
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = paper; c.fillRect(0, 0, W, H);
  const vg = c.createRadialGradient(W/2, H/2, Math.min(W, H)*.35, W/2, H/2, Math.max(W, H)*.75); vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(150,110,60,.35)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H); c.restore();
  $('mapClear').hidden = !G.dest;
}

// ---- open / close ----
export function openMap(){
  if (G.sheetOpen) return;
  G.mapOpen = true; G.joy = null; el.hidden = false; size();
  view.cx = G.S.x; view.cy = G.S.y; view.z = Math.min(W, H)/6500; clampView();
  draw();
}
// Test hook: the whole map at once.
export function chartAll(){ openMap(); view.cx = WORLD/2; view.cy = WORLD/2; view.z = Math.min(W, H)/WORLD; draw(); }
export function closeMap(){ G.mapOpen = false; el.hidden = true; }

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
    view.cx -= dx/view.z; view.cy -= dy/view.z; clampView(); draw();
  } else if (gesture.type === 'pinch' && pts.size === 2){
    const [a, b] = [...pts.values()]; view.z = gesture.z * Math.hypot(a.x-b.x, a.y-b.y) / gesture.d; clampView(); draw();
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
cv.addEventListener('wheel', e => { e.preventDefault(); view.z *= Math.exp(-e.deltaY*.0015); clampView(); draw(); }, {passive:false});

$('mapBtn').addEventListener('click', openMap);
$('mapClose').addEventListener('click', closeMap);
$('mapCenter').addEventListener('click', () => { view.cx = G.S.x; view.cy = G.S.y; draw(); });
$('mapClear').addEventListener('click', () => { G.dest = null; draw(); });
addEventListener('keydown', e => {
  if (e.key === 'Escape' && G.mapOpen) closeMap();
  else if ((e.key === 'm' || e.key === 'M') && !G.sheetOpen) G.mapOpen ? closeMap() : openMap();
});
addEventListener('resize', () => { if (G.mapOpen){ size(); clampView(); draw(); } });
