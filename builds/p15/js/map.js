// The full chart: opens from the minimap. Drag to look around, pinch or scroll to zoom, tap to set a course.
// Turned 45 degrees like the camera, so "up" on the chart is "up" on the screen.
import {WORLD, ISLANDS, SPOTS, WRECKS, HARBORS, EXP_N, STADION, CITIES, zoneAt, landDist, pushOut} from './world.js';
import {G, ship, isExplored, reveal, save} from './state.js';

const $ = id => document.getElementById(id);
const el = $('mapView'), cv = $('mapCv'), c = cv.getContext('2d');
const INK = '#4a3b28', PARCH = '#efe2bf', FOG = '#d8c79c', COURSE = '#b8402f', OCHRE = '#d48a2a';
const R45 = Math.PI/4, COS = Math.SQRT1_2;

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

// ---- the sea zones as an ink-wash picture, built once ----
let base = null;
function buildBase(){
  const s = 512, k = s/WORLD, cnv = document.createElement('canvas'); cnv.width = cnv.height = s;
  const g = cnv.getContext('2d'), img = g.createImageData(s, s), zones = new Uint8Array(s*s);
  for (let y=0;y<s;y++) for (let x=0;x<s;x++) zones[y*s+x] = zoneAt((x+.5)/k, (y+.5)/k);
  const tint = [[196,219,196], [164,196,196], [138,152,158]];
  for (let y=0;y<s;y++) for (let x=0;x<s;x++){
    const i = y*s+x, z = zones[i], edge = (x && zones[i-1] !== z) || (y && zones[i-s] !== z);
    const n = (Math.sin(x*12.9898 + y*78.233)*43758.5453 % 1) * 10; // paper grain
    const col = edge ? [92, 76, 54] : tint[z].map(v => v + n);
    img.data.set([...col, 255], i*4);
  }
  g.putImageData(img, 0, 0);
  base = cnv;
}

// ---- view ----
const view = {cx:0, cy:0, z:.2};
let W = 0, H = 0, DPR = 1;
const minZ = () => Math.min(W, H) / (WORLD*1.3);
const maxZ = () => .7;
function size(){ DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W*DPR; cv.height = H*DPR; }
const clampView = () => { view.z = Math.max(minZ(), Math.min(maxZ(), view.z)); view.cx = Math.max(0, Math.min(WORLD, view.cx)); view.cy = Math.max(0, Math.min(WORLD, view.cy)); };
function toScreen(x, y){ const dx = (x - view.cx)*view.z, dy = (y - view.cy)*view.z; return [W/2 + dx*COS - dy*COS, H/2 + dx*COS + dy*COS]; }
function toWorld(sx, sy){ const dx = sx - W/2, dy = sy - H/2; return [view.cx + (dx*COS + dy*COS)/view.z, view.cy + (-dx*COS + dy*COS)/view.z]; }

// ---- drawing ----
export function islandPath(g, is, tier, k = 1){
  g.beginPath(); is.tiers[tier].forEach(([x, y], i) => i ? g.lineTo((is.x + x)*k, (is.y + y)*k) : g.moveTo((is.x + x)*k, (is.y + y)*k)); g.closePath();
}
function fishGlyph(x, y){ c.beginPath(); c.ellipse(x, y, 6, 3.2, 0, 0, Math.PI*2); c.moveTo(x-5, y); c.lineTo(x-10, y-4); c.lineTo(x-10, y+4); c.closePath(); c.fill(); }
function wreckGlyph(x, y){ c.beginPath(); c.moveTo(x-5, y-5); c.lineTo(x+5, y+5); c.moveTo(x+5, y-5); c.lineTo(x-5, y+5); c.stroke(); c.beginPath(); c.arc(x, y, 8, Math.PI*.15, Math.PI*.85); c.stroke(); }
function draw(){
  if (!base) buildBase();
  c.setTransform(DPR,0,0,DPR,0,0);
  c.fillStyle = PARCH; c.fillRect(0, 0, W, H);
  c.save();
  c.translate(W/2, H/2); c.scale(view.z, view.z); c.rotate(R45); c.translate(-view.cx, -view.cy);
  c.imageSmoothingEnabled = true;
  c.drawImage(base, 0, 0, WORLD, WORLD);
  // islands
  // a soft wash of each city's color over the sea it rules
  for (const is of ISLANDS){ if (!is.city) continue; const R = is.r + 1700, g = c.createRadialGradient(is.x, is.y, is.r*.5, is.x, is.y, R);
    g.addColorStop(0, CITIES[is.city].color + '55'); g.addColorStop(1, CITIES[is.city].color + '00'); c.fillStyle = g; c.beginPath(); c.arc(is.x, is.y, R, 0, Math.PI*2); c.fill(); }
  for (const is of ISLANDS){
    c.strokeStyle = INK; c.lineWidth = 2/view.z;
    islandPath(c, is, 0); c.fillStyle = '#e8d49c'; c.fill(); c.stroke();
    if (is.tiers[1]){ islandPath(c, is, 1); c.fillStyle = '#93a35c'; c.fill(); }
    if (is.tiers[2]){ islandPath(c, is, 2); c.fillStyle = '#a6a28c'; c.fill(); }
  }
  c.drawImage(fogLayer(FOG), 0, 0, WORLD, WORLD);
  c.strokeStyle = INK; c.lineWidth = 3/view.z; c.strokeRect(0, 0, WORLD, WORLD);
  c.restore();

  // upright marks and names, only where you have sailed
  c.textAlign = 'center';
  const marks = G.settings.dev.markers;
  for (const s of SPOTS){ if (!marks || !s.stock || !isExplored(s.x, s.y)) continue; const [x, y] = toScreen(s.x, s.y); c.fillStyle = '#2f6f86'; fishGlyph(x, y); }
  c.strokeStyle = INK; c.lineWidth = 2;
  for (const w of WRECKS){ if (!marks || !w.stock || !isExplored(w.x, w.y)) continue; const [x, y] = toScreen(w.x, w.y); wreckGlyph(x, y); }
  // the treasure map's X, and a dashed ring around islands your jobs send you to
  if (G.S.treasure){ const [x, y] = toScreen(G.S.treasure.x, G.S.treasure.y); c.save(); c.strokeStyle = '#b8402f'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 9, y - 9); c.lineTo(x + 9, y + 9); c.moveTo(x + 9, y - 9); c.lineTo(x - 9, y + 9); c.stroke(); c.restore(); }
  for (const r of G.S.reqs || []){ const is = (r.t === 'visit' || r.t === 'deliver') && ISLANDS.find(i => i.name === r.to); if (!is) continue;
    const [x, y] = toScreen(is.x, is.y); c.save(); c.setLineDash([6, 6]); c.strokeStyle = '#b8402f'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, Math.max(16, is.r*view.z + 12), 0, Math.PI*2); c.stroke(); c.restore(); }
  for (const is of ISLANDS){
    if (!is.name || !isExplored(is.x, is.y)) continue;
    const [x, y] = toScreen(is.x, is.y), off = Math.min(is.r*view.z*.7 + 14, 60);
    c.font = `400 ${is.port ? 17 : 14}px Marcellus, Georgia, serif`; c.fillStyle = is.city ? CITIES[is.city].ink : INK; c.fillText(is.name, x, y + off);
    if (is.city){ c.font = '800 9px Nunito, system-ui, sans-serif'; c.fillText(CITIES[is.city].name.toUpperCase(), x, y + off + 11); }
  }
  for (const h of HARBORS){ if (!h.is.port && !isExplored(h.dock.x, h.dock.y)) continue;
    const [px, py] = toScreen(h.dock.x, h.dock.y); c.fillStyle = h.is.city ? CITIES[h.is.city].color : OCHRE; c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.arc(px, py, 6, 0, Math.PI*2); c.fill(); c.stroke(); }

  // course
  const S = G.S;
  if (G.dest){
    const [sx, sy] = toScreen(S.x, S.y), [dx, dy] = toScreen(G.dest.x, G.dest.y);
    c.strokeStyle = COURSE; c.lineWidth = 2; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(sx, sy); c.lineTo(dx, dy); c.stroke(); c.setLineDash([]);
    c.lineWidth = 3; c.beginPath(); c.moveTo(dx-7, dy-7); c.lineTo(dx+7, dy+7); c.moveTo(dx+7, dy-7); c.lineTo(dx-7, dy+7); c.stroke();
  }
  // you
  const [bx, by] = toScreen(S.x, S.y), ang = S.a + R45;
  c.save(); c.translate(bx, by); c.rotate(ang);
  c.fillStyle = OCHRE; c.strokeStyle = INK; c.lineWidth = 2;
  c.beginPath(); c.moveTo(13, 0); c.lineTo(-8, -8); c.lineTo(-4, 0); c.lineTo(-8, 8); c.closePath(); c.fill(); c.stroke();
  c.restore();
  $('mapClear').hidden = !G.dest;
}

// ---- open / close ----
export function openMap(){
  if (G.sheetOpen) return;
  G.mapOpen = true; G.joy = null; el.hidden = false; size();
  view.cx = G.S.x; view.cy = G.S.y; view.z = Math.min(W, H)/6500; clampView();
  draw();
}
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
    view.cx -= (dx*COS + dy*COS)/view.z; view.cy -= (-dx*COS + dy*COS)/view.z; clampView(); draw();
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
