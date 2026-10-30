// The world: which map, islands (real outlines), zones, fishing spots, wrecks, raiders, land collision, and the wave math.
// Pure data and math, no 3D here.
import {TUNING, SETTINGS_KEY, WRECK_SIZES} from './config.js';
import {MAPDATA} from './mapdata.js';

export function hash(a, b){ const s = Math.sin(a*127.1 + b*311.7)*43758.5453; return s - Math.floor(s); }
export function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };

// ---- which map ----
// Builder tools pick the map and its scale. They are read straight from the saved settings because changing them reloads the game.
// With builder tools off (every player) it's always map D at normal scale.
// Saves from before map D became the default move to D once.
const DEV = (() => { try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  if (s && !s.mapD){ s.mapD = true; if (s.dev && s.dev.map === 'B') s.dev.map = 'D'; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
  return s.builder ? s.dev || {} : {}; } catch(e){ return {}; } })();
const id = DEV.map === 'old' || MAPDATA[DEV.map] ? DEV.map : 'D';
// The distance slider is relative to SPREAD_BASE: 1× on the slider = islands twice as far apart as the map data.
const SPREAD_BASE = 2;
export const MAP = {id, spread: id === 'old' ? 1 : SPREAD_BASE*(DEV.spread || 1), isle: id === 'old' ? 1 : DEV.isle || 1};
MAP.key = `${MAP.id}:${MAP.spread}:${MAP.isle}`;
export const MAP_NAMES = {B:'B · Open Aegean', D:'D · Island Aegean', old:'Prototype map (old)'};
export const UNIT = 1500; // world units per map degree (about 111 km) at 1× distance

export const ZONES = [
  {name:'The Shallows', sub:'Calm water around Kallisto'},
  {name:'Coastal Waters', sub:'Tuna, old wrecks, and raiders. Flee to the Shallows if it goes badly.'},
  {name:'Open Sea', sub:'Big waves slowly wear down small hulls, and raider galleys hunt here.'},
];

// Each island: x, y = center; r = farthest shore point; tiers = outlines [beach, grass, hilltop] around the center as [[x, y], ...].
let WORLD_, HOME_, ZC, ZR, WOB, islands, pier;
if (MAP.id === 'old'){
  // The hand-made map from prototypes 1 to 8: round islands.
  const SPREAD = 1.6, H = {x:1500, y:2900}, OH = {x:900, y:1800}, P = (x, y) => ({x: H.x + (x-OH.x)*SPREAD, y: H.y + (y-OH.y)*SPREAD});
  const circle = (r, s, n = 18) => Array.from({length:n}, (_, k) => { const a = k/n*Math.PI*2, w = 1 + (hash(s, k) - .5)*.16; return [Math.cos(a)*r*w, Math.sin(a)*r*w]; });
  islands = [
    {o:[900,1800], r:150, port:true, name:'Kallisto'},
    {o:[1320,1460], r:85, trees:3, name:'Elaia'},   {o:[1240,2230], r:105, trees:4, name:'Myrtia'}, {o:[560,1330], r:70, trees:2, name:'Thymari'},
    {o:[480,2380], r:90, trees:3, name:'Agrios'},   {o:[1950,1720], r:130, trees:5, name:'Kypari'}, {o:[1720,2520], r:80, trees:3, name:'Petra'},
    {o:[1980,1180], r:100, trees:4, name:'Lykos'},  {o:[2850,1850], r:170, name:'Thyella'}, {o:[2650,700], r:120, name:'Nyx'}, {o:[2500,2900], r:140, name:'Skotia'},
  ].map((i, n) => { const r = i.r*1.2; return {...P(...i.o), name:i.name, port:!!i.port, trees:i.trees || 0,
    tiers: i.port ? [circle(r, n), circle(r*.8, n)] : [circle(r, n), circle(r*.72, n), circle(r*.34, n, 10)]}; });
  WORLD_ = 5800; HOME_ = H; ZC = H; ZR = [1120, 2400]; WOB = SPREAD;
  pier = {x: islands[0].x + islands[0].tiers[0][0][0]*.96, y: islands[0].y, dx:1, dy:0};
} else {
  const M = MAPDATA[MAP.id], kp = UNIT*MAP.spread;
  islands = M.feats.map(f => {
    const ks = f.frame ? kp : f.home ? UNIT : UNIT*MAP.isle;
    const tiers = f.t.map(t => { const out = []; for (let i=0;i<t.length;i+=2) out.push([t[i]*ks, t[i+1]*ks]); return out; });
    const is = {x:f.c[0]*kp, y:f.c[1]*kp, name:f.home ? 'Kallisto' : f.n, port:!!f.home, frame:!!f.frame, wild:!!f.wild, tiers, trees:0};
    if (f.pier) pier = {x:is.x + f.pier[0]*ks, y:is.y + f.pier[1]*ks, dx:f.pier[2], dy:f.pier[3]};
    return is;
  });
  WORLD_ = Math.round(Math.max(...M.size)*kp);
  ZC = {x:M.zone.c[0]*kp, y:M.zone.c[1]*kp}; ZR = M.zone.r.map(r => r*kp); WOB = kp/1000;
  HOME_ = islands.find(i => i.port);
}
const area = pts => { let a = 0; for (let i=0;i<pts.length;i++){ const [x0, y0] = pts[i], [x1, y1] = pts[(i+1) % pts.length]; a += x0*y1 - x1*y0; } return Math.abs(a)/2; };
for (const is of islands){
  is.r = Math.max(...is.tiers[0].map(([x, y]) => Math.hypot(x, y)));
  is.area = area(is.tiers[0]);
  if (MAP.id !== 'old' && !is.frame && !is.port) is.trees = Math.max(is.wild ? 4 : 2, Math.min(6, Math.round(Math.sqrt(is.area)/110)));
  is.stock = is.trees; is.regen = 0;
}
// Kallisto first, so the save's tree counts line up the same way on every map.
islands.sort((a, b) => b.port - a.port);

export const WORLD = WORLD_;
export const HOME = {x:HOME_.x, y:HOME_.y};
export const ISLANDS = islands;
export const home = ISLANDS[0];
export const PIER_LEN = 110;
export const PIER = pier; // where the pier leaves the shore, and the direction it points
export const DOCK = {x: PIER.x + PIER.dx*(PIER_LEN + 30), y: PIER.y + PIER.dy*(PIER_LEN + 30)};
export const START = {x: DOCK.x + PIER.dx*80, y: DOCK.y + PIER.dy*80, a: Math.atan2(PIER.dy, PIER.dx)}; // where a new game (or a sunk ship) begins
// Explored map: a 64 x 64 grid over the world, revealed as you sail.
export const EXP_N = 64, EXP_CELL = WORLD/EXP_N;
export const STADION = 100; // world units per stadion, the Greek distance unit shown on the chart

// ---- zones: rings around the middle of the Cyclades, with a wobble so they don't look like circles ----
const wob = (a, s) => (Math.sin(a*3+s)*60 + Math.sin(a*5+s*2)*35 + Math.sin(a*2+s*.5)*45) * WOB;
export function bounds(x, y){ const dx = x-ZC.x, dy = y-ZC.y, a = Math.atan2(dy,dx); return {d:Math.hypot(dx,dy), b0:ZR[0]+wob(a,1), b1:ZR[1]+wob(a,4)}; }
export function zoneAt(x, y){ const b = bounds(x,y); return b.d < b.b0 ? 0 : b.d < b.b1 ? 1 : 2; }
export function stormDepth(x, y){ const b = bounds(x,y); return Math.max(0, b.d - b.b1); }

// ---- land: a distance grid. landDist(x, y) = how far to the nearest shore; negative on land ----
const CELL = Math.max(20, WORLD/1100), GN = Math.ceil(WORLD/CELL) + 1;
const SDF = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = GN;
  const g = cv.getContext('2d'); g.scale(1/CELL, 1/CELL); g.fillStyle = '#000';
  for (const is of ISLANDS){ g.beginPath(); is.tiers[0].forEach(([x, y], k) => k ? g.lineTo(is.x + x, is.y + y) : g.moveTo(is.x + x, is.y + y)); g.closePath(); g.fill(); }
  const px = g.getImageData(0, 0, GN, GN).data, N = GN*GN, land = new Uint8Array(N);
  for (let i=0;i<N;i++) land[i] = px[i*4+3] > 127 ? 1 : 0;
  // two-pass chamfer distance, once from land into the water and once from water into the land
  const pass = (src, want) => {
    const d = new Float32Array(N); for (let i=0;i<N;i++) d[i] = src[i] === want ? 0 : 1e9;
    const D = 1.4142;
    for (let y=0;y<GN;y++) for (let x=0;x<GN;x++){ const i = y*GN+x; let v = d[i]; if (!v) continue;
      if (x) v = Math.min(v, d[i-1] + 1); if (y){ v = Math.min(v, d[i-GN] + 1); if (x) v = Math.min(v, d[i-GN-1] + D); if (x < GN-1) v = Math.min(v, d[i-GN+1] + D); } d[i] = v; }
    for (let y=GN-1;y>=0;y--) for (let x=GN-1;x>=0;x--){ const i = y*GN+x; let v = d[i]; if (!v) continue;
      if (x < GN-1) v = Math.min(v, d[i+1] + 1); if (y < GN-1){ v = Math.min(v, d[i+GN] + 1); if (x < GN-1) v = Math.min(v, d[i+GN+1] + D); if (x) v = Math.min(v, d[i+GN-1] + D); } d[i] = v; }
    return d;
  };
  const toLand = pass(land, 1), toWater = pass(land, 0), out = new Float32Array(N);
  for (let i=0;i<N;i++) out[i] = (land[i] ? -(toWater[i] - .5) : toLand[i] - .5)*CELL;
  return out;
})();
export function landDist(x, y){
  const fx = x/CELL, fy = y/CELL;
  if (fx < 0 || fy < 0 || fx >= GN-1 || fy >= GN-1) return 999;
  const x0 = fx|0, y0 = fy|0, tx = fx - x0, ty = fy - y0, i = y0*GN + x0;
  return (SDF[i]*(1-tx) + SDF[i+1]*tx)*(1-ty) + (SDF[i+GN]*(1-tx) + SDF[i+GN+1]*tx)*ty;
}
// Push a ship at {x, y} out of the land until it is `min` from the shore. Returns true if it touched land.
export function pushOut(p, min){
  const d = landDist(p.x, p.y); if (d >= min) return false;
  const e = CELL*.5, gx = landDist(p.x + e, p.y) - landDist(p.x - e, p.y), gy = landDist(p.x, p.y + e) - landDist(p.x, p.y - e), L = Math.hypot(gx, gy) || 1;
  p.x += gx/L*(min - d); p.y += gy/L*(min - d); return true;
}
// Distance from (x, y) to one island's shore, for chopping wood.
export function shoreDist(is, x, y){
  if (Math.hypot(x - is.x, y - is.y) > is.r + 400) return Infinity;
  const p = is.tiers[0], lx = x - is.x, ly = y - is.y; let best = Infinity;
  for (let i=0;i<p.length;i++){ const [ax, ay] = p[i], [bx, by] = p[(i+1) % p.length], dx = bx-ax, dy = by-ay;
    const t = Math.max(0, Math.min(1, ((lx-ax)*dx + (ly-ay)*dy)/(dx*dx + dy*dy || 1))); best = Math.min(best, Math.hypot(lx - ax - dx*t, ly - ay - dy*t)); }
  return best;
}
export function inPoly(p, x, y){ let c = false; for (let i=0, j=p.length-1; i<p.length; j=i++){ const [xi, yi] = p[i], [xj, yj] = p[j];
  if ((yi > y) !== (yj > y) && x < (xj - xi)*(y - yi)/(yj - yi) + xi) c = !c; } return c; }

// ---- fishing spots, wrecks, raiders ----
// Scattered over open water with a fixed seed, so the same map always has them in the same places.
function scatter(seed, n, minGap, ok){
  const R = rng(seed), out = [];
  for (let k=0; k<20000 && out.length<n; k++){
    const x = R()*WORLD, y = R()*WORLD;
    if (ok(x, y) && out.every(p => Math.hypot(p.x - x, p.y - y) > minGap)) out.push({x, y});
  }
  return out;
}
const S = MAP.spread/2, farFromDock = (x, y) => Math.hypot(x - DOCK.x, y - DOCK.y) > 420;
let spots, wrecks, raiders;
if (MAP.id === 'old'){
  const SPREAD = 1.6, P = (x, y) => ({x: HOME.x + (x-900)*SPREAD, y: HOME.y + (y-1800)*SPREAD});
  spots = [[1150,1650],[700,1600],[1050,2050],[700,2100],[1250,1900],[600,1850],[1600,1500],[1650,2000],[1500,2400],[2150,1500],[1800,1300],[900,2600],[1100,1050],[400,1700]].map(p => P(...p));
  wrecks = [[1150,1350],[650,2150],[1550,1850],[1400,2550],[1750,1100],[300,1600]].map(p => P(...p));
  raiders = [['skiff', .4, 1700], ['skiff', 1.6, 1750], ['skiff', 2.3, 1650], ['skiff', -.5, 1800], ['skiff', -1.7, 1700], ['galley', 0, 2950], ['galley', .9, 2900], ['galley', -.9, 2900]]
    .map(([kind, a, d]) => { const p = {x: HOME.x + Math.cos(a)*d, y: HOME.y + Math.sin(a)*d}; pushOut(p, 160); return {kind, home:p}; });
} else {
  // fishing spots far apart (about 1.2 km of sea between them), mostly near home
  spots = scatter(11, 40, 700*S, (x, y) => landDist(x, y) > 110 && zoneAt(x, y) < 2 && farFromDock(x, y));
  wrecks = scatter(23, 16, 1100*S, (x, y) => landDist(x, y) > 140 && zoneAt(x, y) === 1);
  // three sizes of pirate: small boats just past the Shallows, skiffs further out, galleys in the Open Sea
  raiders = [...scatter(31, 10, 1100*S, (x, y) => landDist(x, y) > 180 && zoneAt(x, y) === 1 && bounds(x, y).d > ZR[0] + 250 && bounds(x, y).d < ZR[0] + 1400).map(p => ({kind:'dinghy', home:p})),
             ...scatter(37, 12, 1300*S, (x, y) => landDist(x, y) > 220 && zoneAt(x, y) === 1 && bounds(x, y).d > ZR[0] + 1200).map(p => ({kind:'skiff', home:p})),
             ...scatter(41, 9, 1800*S, (x, y) => landDist(x, y) > 260 && zoneAt(x, y) === 2).map(p => ({kind:'galley', home:p}))];
}
export const SPOTS = spots.map(p => ({...p, kind: zoneAt(p.x, p.y) === 0 ? 'tuna' : 'swordfish', stock:TUNING.spotStock, regen:0}));
// each wreck has a size (small, medium, large), picked from its spot so it stays the same every visit
const wreckSize = i => { let r = hash(i, 13); for (const [k, w] of Object.entries(WRECK_SIZES)){ if ((r -= w.share) <= 0) return k; } return 'small'; };
export const WRECKS = wrecks.map((p, i) => { const size = wreckSize(i); return {...p, size, stock:WRECK_SIZES[size].stock, regen:0, rot:hash(i,9)*6.28}; });
export const RAIDERS = raiders;
// Sardine schools along the shores (see SHORE_FISH): on for part of each cycle, off for the rest.
export const SHOALS = scatter(61, MAP.id === 'old' ? 30 : 160, 420, (x, y) => { const d = landDist(x, y); return d > 45 && d < 150 && Math.hypot(x - DOCK.x, y - DOCK.y) > 260; })
  .map((p, i) => ({...p, ph:hash(i, 3), per:1}));
export const shoalOn = (s, t, per, on) => ((t/(per*(.8 + s.ph*.5)) + s.ph) % 1) < on;

// ---- Athens and Sparta ----
// Two cities at war. Sparta holds the south and west (the Peloponnese, Kythera, Milos, Crete, Karpathos, Rhodes), Athens the rest.
// Kallisto stays neutral. Islands can change hands (is.city); the capitals never do.
export const CITIES = {
  athens: {name:'Athens', color:'#6f9bd6', ink:'#2f5f8a'},
  sparta: {name:'Sparta', color:'#e0a03a', ink:'#9a5a12'},
};
export const rival = c => c === 'athens' ? 'sparta' : 'athens';
const SPARTAN = ['Peloponnese', 'Kythera', 'Milos', 'Crete', 'Karpathos', 'Rhodes'], CAPITALS = ['Peloponnese', 'Attica'];
// Pirate strongholds: islands no city holds, with a pirate fort (combat.js)
const PIRATE_ISLES = ['Thasos', 'Kos'];
for (const is of ISLANDS) if (PIRATE_ISLES.includes(is.name)) is.pirate = true;
const named = ISLANDS.filter(i => i.name && !i.frame && !i.wild && !i.pirate); // wild islets near Kallisto belong to nobody
for (const is of named){ is.city = is.port ? null : SPARTAN.includes(is.name) ? 'sparta' : 'athens'; is.capital = CAPITALS.includes(is.name); is.home0 = is.city; }
if (MAP.id === 'old') named.forEach((is, i) => { if (!is.port) is.city = is.home0 = i % 3 ? 'athens' : 'sparta'; });
// Which city rules the sea at (x, y): the owner of the nearest island.
export function seaOwner(x, y){ let best = null, bd = Infinity;
  for (const is of named){ if (!is.city) continue; const d = Math.hypot(is.x - x, is.y - y) - is.r; if (d < bd){ bd = d; best = is; } } return best ? best.city : null; }

// ---- harbors: Kallisto, plus two for each city. Each market pays more for some fish. ----
// A harbor's pier faces Kallisto, starting where the shore is. It belongs to whoever holds the island.
const HARBOR_AT = {Naxos:{tuna:1.3}, Chios:{sardine:1.5}, Milos:{swordfish:1.3}, Crete:{tuna:1.15, sardine:1.2}};
function makePier(is){
  const base = Math.atan2(HOME.y - is.y, HOME.x - is.x);
  for (const off of [0, .35, -.35, .7, -.7, 1.05, -1.05, 1.4, -1.4]){
    const a = base + off, dx = Math.cos(a), dy = Math.sin(a);
    let t = is.r + 60; while (t > 0 && landDist(is.x + dx*t, is.y + dy*t) > 0) t -= 6; // walk in from the sea to the shore
    const p = {x:is.x + dx*(t - 12), y:is.y + dy*(t - 12), dx, dy};
    if (landDist(p.x + dx*(PIER_LEN + 60), p.y + dy*(PIER_LEN + 60)) > 70 && landDist(p.x + dx*PIER_LEN*.5 - dy*40, p.y + dy*PIER_LEN*.5 + dx*40) > 10) return p;
  }
  return null;
}
const dockOf = p => ({x:p.x + p.dx*(PIER_LEN + 30), y:p.y + p.dy*(PIER_LEN + 30)});
export const HARBORS = [{is:home, pier:PIER, dock:DOCK, prices:{}}];
for (const is of (MAP.id === 'old' ? named.filter(i => !i.port).slice(0, 2) : named.filter(i => HARBOR_AT[i.name]))){
  const pier = makePier(is); if (!pier) continue;
  const h = {is, pier, dock:dockOf(pier), prices:HARBOR_AT[is.name] || {}}; is.harbor = h; HARBORS.push(h);
}
home.harbor = HARBORS[0];
// The other big city islands get a town too (streets, houses, temple, a pier), just for looks: you can't dock there.
export const TOWN_PIERS = [];
// The town's pier goes on the side with the most flat grass behind it (room for the main street), away from hills.
function townPier(is){
  const [, grass, hill] = is.tiers; if (!grass) return null; let best = null, bl = 120;
  for (let k=0;k<16;k++){ const a = k/16*Math.PI*2, dx = Math.cos(a), dy = Math.sin(a);
    let t = is.r + 60; while (t > 0 && landDist(is.x + dx*t, is.y + dy*t) > 0) t -= 6;
    const p = {x:is.x + dx*(t - 12), y:is.y + dy*(t - 12), dx, dy};
    if (landDist(p.x + dx*(PIER_LEN + 60), p.y + dy*(PIER_LEN + 60)) <= 70) continue; // the pier needs open water
    let l = 0; for (; l < 320; l += 10){ const x = p.x - is.x - dx*(l + 40), z = p.y - is.y - dy*(l + 40); if (!inPoly(grass, x, z) || (hill && inPoly(hill, x, z))) break; }
    if (l > bl){ bl = l; best = p; } }
  return best;
}
for (const is of named){ if (is.harbor || !is.city || is.r < 500) continue; const pier = townPier(is); if (pier){ is.town = {pier}; TOWN_PIERS.push(pier); } }
// No woodcutting in towns: harbor islands keep their trees for the townsfolk. Wood comes from the other islands.
for (const h of HARBORS){ h.is.trees = h.is.stock = 0; }

// ---- ships at sea: merchants on trade routes, a navy guard around each island ----
// A merchant shuttles between two harbors (a few of them call at Kallisto).
function offshore(is, toward, gap){
  if (is.harbor){ const h = is.harbor; return {x:h.dock.x + h.pier.dx*90, y:h.dock.y + h.pier.dy*90}; } // merchants call at the pier
  const a = Math.atan2(toward.y - is.y, toward.x - is.x), p = {x:is.x + Math.cos(a)*(is.r + gap), y:is.y + Math.sin(a)*(is.r + gap)};
  pushOut(p, 120); return p;
}
export const patrolRoute = is => { const r = is.r + 480, a0 = hash(is.x, is.y)*6.28;
  return Array.from({length:6}, (_, j) => { const a = a0 + j/6*Math.PI*2, p = {x:is.x + Math.cos(a)*r, y:is.y + Math.sin(a)*r}; pushOut(p, 160); return p; }); };
const R2 = rng(53), traffic = [];
{
  const nMerch = MAP.id === 'old' ? 3 : 12, perCity = MAP.id === 'old' ? 1 : 6, pairs = new Set();
  for (let k=0; k<200 && traffic.length<nMerch; k++){
    const ports = HARBORS.map(h => h.is), a = k < 10 && k % 2 === 0 ? ports[(k/2) % ports.length] : named[Math.floor(R2()*named.length)]; // half the routes start at a harbor
    const near = named.filter(b => b !== a).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
    const b = near[Math.floor(R2()*Math.min(3, near.length))], key = [a.name, b.name].sort().join('-');
    if (!b || pairs.has(key)) continue; pairs.add(key);
    const route = [offshore(a, b, 150), offshore(b, a, 150)];
    if (Math.hypot(route[0].x - route[1].x, route[0].y - route[1].y) < 1200) continue; // too short to be a voyage
    traffic.push({kind:'merchant', route, isle:a.port ? b : a});
  }
  // each city guards its islands nearest the enemy; those patrols meet at the border
  for (const c of Object.keys(CITIES)){
    const mine = named.filter(i => i.city === c && zoneAt(i.x, i.y) > 0), theirs = named.filter(i => i.city === rival(c));
    const gapTo = is => Math.min(...theirs.map(o => Math.hypot(o.x - is.x, o.y - is.y)));
    mine.filter(i => !i.capital).sort((p, q) => gapTo(p) - gapTo(q)).slice(0, perCity).forEach(is => { const t = {kind:'navy', isle:is, route:patrolRoute(is)}; is.patrol = t; traffic.push(t); });
  }
}
export const TRAFFIC = traffic.map(t => ({...t, home:t.route[0]}));

// ---- waves ----
// The weather (weather.js) makes every wave bigger or smaller.
export const WEATHER_WAVES = {k:1};
export function seaInfo(x, z){
  const b = bounds(x, z), k0 = sstep(b.b0-160, b.b0+160, b.d), k1 = sstep(b.b1-220, b.b1+220, b.d);
  const deep = Math.max(0, b.d - b.b1);
  return {k0, k1, amp: (1.6 + k0*2.6 + k1*(7 + Math.min(10, deep/90)))*WEATHER_WAVES.k};
}
export function waveH(x, z, amp, t){ return amp * (Math.sin(x*.011 + t*1.3) + Math.sin(z*.013 - t*1.1)*.8 + Math.sin((x+z)*.021 + t*2)*.4) / 2.2; }
export function waveAt(x, z, t){ return waveH(x, z, seaInfo(x, z).amp, t); }
