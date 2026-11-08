// The world: which map, islands (real outlines), zones, fishing spots, wrecks, raiders, land collision, and the wave math.
// Pure data and math, no 3D here.
import {TUNING, SETTINGS_KEY, WRECK_SIZES, NEUTRAL_R, FORTS, CAMPS} from './config.js?v=5a19ef6';
import {MAPDATA} from './mapdata.js?v=5a19ef6';

export function hash(a, b){ const s = Math.sin(a*127.1 + b*311.7)*43758.5453; return s - Math.floor(s); }
export function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };

// ---- which map ----
// Builder tools pick the map and its scale. They are read straight from the saved settings because changing them reloads the game.
// With builder tools off (every player) it's always map D at normal scale.
// Saves from before map D became the default move to D once.
const DEV = (() => { try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  if (s && !s.mapD){ s.mapD = true; if (s.dev && s.dev.map === 'B') s.dev.map = 'D'; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
  const pub = !/WDS-Live/.test(navigator.userAgent) && (/github\.io$/.test(location.hostname) || !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()));
  return s.builder && !pub ? s.dev || {} : {}; } catch(e){ return {}; } })(); // the public play link and the apps never use builder map sizes (P87: only the Live app does)
const id = 'D'; // P87 (Nicholas): only map D; maps B and the old prototype map are gone
// The distance slider is relative to SPREAD_BASE: 1× on the slider = islands twice as far apart as the map data.
const SPREAD_BASE = 3.4; // P52: a bigger map, islands a quarter further apart again (P44 was 2.7)
// P92 (Nicholas): islands 1.6x their size and 1.5x further apart for everyone (more room south of Kallisto, room for the camps)
export const MAP_DEFAULT = {spread:1.5, isle:1.6};
export const MAP = {id, spread:SPREAD_BASE*(DEV.spread || MAP_DEFAULT.spread), isle:DEV.isle || MAP_DEFAULT.isle};
MAP.key = `${MAP.id}:${MAP.spread}:${MAP.isle}`;
export const UNIT = 1500; // world units per map degree (about 111 km) at 1× distance

export const ZONES = [
  {name:'The Shallows', sub:'Calm water around Kallisto'},
  {name:'Coastal Waters', sub:'Tuna, old wrecks, and raiders.'},
  {name:'Open Sea', sub:'Big waves slowly wear down small hulls, and raider galleys hunt here.'},
];

// Each island: x, y = center; r = farthest shore point; tiers = outlines [beach, grass, hilltop] around the center as [[x, y], ...].
let WORLD_, HOME_, ZC, ZR, WOB, islands, pier;
{ // map D
  const M = MAPDATA[MAP.id], kp = UNIT*MAP.spread, GROW = {Syros:2.4, Milos:1.6, Ikaria:1.4, Tinos:1.4, Ios:1.3, Donousa:2.6, Amorgos:1.9, Sikinos:1.75}; // P69: bigger than their real size, for room around the camp and the fortress; P92 the camp islands too (Nicholas)
  islands = M.feats.map(f => {
    const ks = (f.frame ? kp : f.home ? UNIT : UNIT*MAP.isle)*(GROW[f.n] || 1);
    const tiers = f.t.map(t => { const out = []; for (let i=0;i<t.length;i+=2) out.push([t[i]*ks, t[i+1]*ks]); return out; });
    const is = {x:f.c[0]*kp, y:f.c[1]*kp, name:f.home ? 'Kallisto' : f.n, port:!!f.home, frame:!!f.frame, wild:!!f.wild, tiers, trees:0};
    if (f.pier) pier = {x:is.x + f.pier[0]*ks, y:is.y + f.pier[1]*ks, dx:f.pier[2], dy:f.pier[3]};
    return is;
  });
  WORLD_ = Math.round(Math.max(...M.size)*kp);
  ZC = {x:M.zone.c[0]*kp, y:M.zone.c[1]*kp}; ZR = M.zone.r.map(r => r*kp); WOB = kp/1000;
  HOME_ = islands.find(i => i.port);
  // P52: Kallisto moves north into the Cyclades, a third of the way to the middle of the map (between Mykonos, Ikaria and Naxos),
  // and the Shallows move with it: the small islands around it are where the game starts (treasure and bandit camps)
  if (MAP.id === 'D'){ const nx = 4.61*kp, ny = 5.5*kp, dx = nx - HOME_.x, dy = ny - HOME_.y; HOME_.x = nx; HOME_.y = ny; pier.x += dx; pier.y += dy; ZC = {x:nx, y:ny}; }
}
const area = pts => { let a = 0; for (let i=0;i<pts.length;i++){ const [x0, y0] = pts[i], [x1, y1] = pts[(i+1) % pts.length]; a += x0*y1 - x1*y0; } return Math.abs(a)/2; };
for (const is of islands){
  is.r = Math.max(...is.tiers[0].map(([x, y]) => Math.hypot(x, y)));
  is.area = area(is.tiers[0]);
  if (!is.frame && !is.port) is.trees = Math.max(is.wild ? 4 : 2, Math.min(6, Math.round(Math.sqrt(is.area)/110)));
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
export const EXP_N = 128, EXP_CELL = WORLD/EXP_N; // P65: twice as fine (rounder cleared circles)
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
// P90/P99: a ship's hull against the land: five points along it (bow to stern), each keeping its share of the beam from the beach
// line (less at the pointed ends); the ship slides along the shore by however much the worst point went in. o has x, y, a.
const HULL_PTS = [[.46, .3], [.25, .5], [0, .5], [-.25, .5], [-.46, .35]];
export function hullAground(o, len, beam, passes = 2){ let hit = false;
  for (let pass = 0; pass < passes; pass++){ const ca = Math.cos(o.a), sa = Math.sin(o.a);
    for (const [k, w] of HULL_PTS){ const p = {x:o.x + ca*len*k, y:o.y + sa*len*k}, x0 = p.x, y0 = p.y;
      if (pushOut(p, beam*w + 4)){ o.x += p.x - x0; o.y += p.y - y0; hit = true; } } }
  return hit;
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
{ // map D
  // fishing spots far apart (about 1.2 km of sea between them), mostly near home
  spots = scatter(11, 40, 700*S, (x, y) => landDist(x, y) > 110 && zoneAt(x, y) < 2 && farFromDock(x, y));
  wrecks = scatter(23, 16, 1100*S, (x, y) => landDist(x, y) > 140 && zoneAt(x, y) === 1);
  // three sizes of pirate: small boats just past the Shallows, skiffs further out, galleys in the Open Sea
  // P92 (Nicholas: no change seen in how many pirates there are): about 40% more of each
  raiders = [...scatter(31, 14, 1000*S, (x, y) => landDist(x, y) > 180 && zoneAt(x, y) === 1 && bounds(x, y).d > ZR[0] + 250 && bounds(x, y).d < ZR[0] + 1400).map(p => ({kind:'dinghy', home:p})),
             ...scatter(37, 17, 1150*S, (x, y) => landDist(x, y) > 220 && zoneAt(x, y) === 1 && bounds(x, y).d > ZR[0] + 1200).map(p => ({kind:'skiff', home:p})),
             ...scatter(41, 13, 1550*S, (x, y) => landDist(x, y) > 260 && zoneAt(x, y) === 2).map(p => ({kind:'galley', home:p})),
             // P65: the Shallows aren't a safe place: a few little raider boats sail here too, but none right off the Kallisto pier
             ...scatter(43, 8, 900*S, (x, y) => landDist(x, y) > 180 && zoneAt(x, y) === 0 && Math.hypot(x - HOME_.x, y - HOME_.y) > 1700).map(p => ({kind:'dinghy', home:p}))];
}
export const SPOTS = spots.map(p => ({...p, kind: zoneAt(p.x, p.y) === 0 ? 'tuna' : 'swordfish', stock:TUNING.spotStock, regen:0}));
// each wreck has a size (small, medium, large), picked from its spot so it stays the same every visit
const wreckSize = i => { let r = hash(i, 13); for (const [k, w] of Object.entries(WRECK_SIZES)){ if ((r -= w.share) <= 0) return k; } return 'small'; };
export const WRECKS = wrecks.map((p, i) => { const size = wreckSize(i); return {...p, size, stock:WRECK_SIZES[size].stock, regen:0, rot:hash(i,9)*6.28}; });
export const RAIDERS = raiders;
// Sardine schools along the shores (see SHORE_FISH): on for part of each cycle, off for the rest.
export const SHOALS = scatter(61, 160, 420, (x, y) => { const d = landDist(x, y); return d > 45 && d < 150 && Math.hypot(x - DOCK.x, y - DOCK.y) > 260; })
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
// The islands near Kallisto belong to nobody (P49): no fortresses or navies there, so the war stays out of the beginner waters.
for (const is of named) if (!is.capital && Math.hypot(is.x - HOME.x, is.y - HOME.y) < NEUTRAL_R){ is.city = is.home0 = null; is.neutral = true; }
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
for (const is of named.filter(i => HARBOR_AT[i.name])){
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
// P68: where a fortress or camp stands. Like a real kastro: wholly on land, on the high ground if the island has any, on a point that
// looks over the most open sea, well away from the town, with a stone stair down to its own little jetty. Small islands get a smaller one.
export function islandHeights(is){ const size = Math.sqrt(is.area), top = 4 + (is.port ? 12 : Math.min(26, 9 + size*.02)); return {top, hillTop:top + Math.min(46, 12 + size*.03)}; }
const FORT_FOOT = 168, CAMP_FOOT = 92;
// P92: a camp's model reaches 95 back from its middle (the cabins) and 25 toward the sea (the bandits), 72 and 52 to the sides,
// times its size (bigger camps for higher levels). Its back half must stand on grass, clear of the sand; the bandits on firm ground.
export const campK = is => [.85, 1, 1.2][((CAMPS.find(c => c.isle === is.name) || {}).lv || 1) - 1];
function campFits(x, y, a, k, inGrass, loose){ const c = Math.cos(a), n = Math.sin(a);
  for (let lx = -95; lx <= 25; lx += 12) for (let lz = -72; lz <= 52; lz += 12){ const px = x + (lx*c - lz*n)*k, py = y + (lx*n + lz*c)*k, back = lx < 0;
    if (landDist(px, py) > (back ? (loose ? -6 : -14) : -2) || (back && !loose && !inGrass(px, py))) return false; }
  return true; }
function findSite(is, camp, loose){
  const [, grass, hill] = is.tiers; if (!grass) return null;
  const {top, hillTop} = islandHeights(is), inHill = (x, y) => !!hill && inPoly(hill, x - is.x, y - is.y), inGrass = (x, y) => inPoly(grass, x - is.x, y - is.y);
  const groundAt = (x, y) => inHill(x, y) ? hillTop : inGrass(x, y) ? top : 4;
  const foot = camp ? CAMP_FOOT : FORT_FOOT, maxDepth = camp ? 190 : 300, wide = is.r > 500, busy = [...HARBORS.filter(h => h.is === is).map(h => h.pier), ...TOWN_PIERS.filter(p => Math.hypot(p.x - is.x, p.y - is.y) < is.r + 200)];
  const toHome = Math.atan2(HOME.y - is.y, HOME.x - is.x), RAYS = 32, step = Math.max(22, is.r/34);
  for (const s of camp ? [1, .85, .7, .58, .46] : [1, .92, .84, .76, .68, .6]){ const R = foot*s; let best = null;
    for (let gx = -is.r; gx <= is.r; gx += step) for (let gy = -is.r; gy <= is.r; gy += step){ const x = is.x + gx, y = is.y + gy, sd = landDist(x, y);
      if (sd > -R*(loose ? .45 : .82) || sd < -maxDepth || !inGrass(x, y) || !inPoly(is.tiers[0], gx, gy)) continue;
      if (busy.some(p => Math.hypot(p.x - x, p.y - y) < (wide ? 560 : 230) + R)) continue; // clear of the town and its pier
      const onHill = inHill(x, y); let ok = true;
      for (let k=0; k<14 && ok; k++){ const a = k/14*6.283, c = Math.cos(a), n = Math.sin(a);
        if (landDist(x + c*R, y + n*R) > (loose ? 18 : 2)) ok = false; // nothing hangs over the water (a crag covers any drop to the sand)
        else if (onHill ? !inHill(x + c*R*.4, y + n*R*.4) : inHill(x + c*R, y + n*R) || inHill(x + c*R*.55, y + n*R*.55)) ok = false; } // on the hill, or clear of its slopes
      if (!ok) continue;
      // the way down to the water: the shortest walk with open sea beyond; and how much open sea it looks over
      let view = 0, face = null;
      for (let k=0; k<RAYS; k++){ const a = k/RAYS*6.283, c = Math.cos(a), n = Math.sin(a); let t = 0;
        while (t < maxDepth + 120 && landDist(x + c*t, y + n*t) < 0) t += 10; if (landDist(x + c*t, y + n*t) < 0) continue;
        if (landDist(x + c*(t + 160), y + n*(t + 160)) < (loose ? 30 : 60) || landDist(x + c*(t + 320), y + n*(t + 320)) < (loose ? 70 : 140)) continue;
        view++; if (!face || t < face.t) face = {t, a, c, n}; }
      if (!face || busy.some(p => Math.hypot(p.x - x - face.c*face.t, p.y - y - face.n*face.t) < (wide ? 420 : 170))) continue;
      if (camp && !campFits(x, y, face.a, s*campK(is), inGrass, loose)) continue; // P92 (Nicholas): the whole camp stands on the island
      const score = view*4 + (onHill && !camp ? 44 : 0) + Math.cos(face.a - toHome)*10 - face.t*.04;
      if (!best || score > best.score) best = {score, x, y, onHill, face}; }
    if (best){ const {x, y, face:f} = best, ground = best.onHill ? hillTop : top, path = [], shore = {x:x + f.c*f.t, y:y + f.n*f.t};
      // the stair follows the ground down, easing over each drop
      const hs = []; for (let d = R*.62; d < f.t; d += 11) hs.push({d, h:groundAt(x + f.c*d, y + f.n*d)});
      hs.forEach((p, i) => { const nb = hs.slice(Math.max(0, i - 3), i + 4), av = nb.reduce((q, w) => q + w.h, 0)/nb.length; path.push({d:p.d, h:Math.max(p.h, av)}); });
      return {x, y, a:f.a, s, k:camp ? s*campK(is) : s, R, ground, onHill:best.onHill, depth:f.t, path, shore, sea:{x:shore.x + f.c*250, y:shore.y + f.n*250}}; } }
  return null;
}
export function siteFor(is, camp){ if (is.site === undefined) is.site = findSite(is, camp) || findSite(is, camp, true); return is.site; }
for (const is of named) if (is.pirate || (is.city && !is.capital)) siteFor(is, false);
for (const is of islands) if (PIRATE_ISLES.includes(is.name)) siteFor(is, false);
for (const c of CAMPS){ const is = islands.find(i => i.name === c.isle); if (is && is.site === undefined) siteFor(is, true); }
// Nothing else (trees, houses, grass) stands on a fortress or on its stair. x, z are relative to the island.
export function siteClear(is, x, z){ const t = is.site; if (!t) return true; const px = x + is.x - t.x, py = z + is.y - t.y; if (Math.hypot(px, py) < t.R + 14) return false;
  const c = Math.cos(t.a), n = Math.sin(t.a), al = px*c + py*n; return !(al > 0 && al < t.depth + 10 && Math.abs(-px*n + py*c) < 26); }
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
  // P84 (Nicholas): fewer merchants (12 to 9, and 4 small traders in the Shallows instead of 5): raiding them should be a sometimes thing
  const nMerch = 9, perCity = 6, pairs = new Set();
  for (let k=0; k<200 && traffic.length<nMerch; k++){
    const ports = HARBORS.map(h => h.is), a = k < 10 && k % 2 === 0 ? ports[(k/2) % ports.length] : named[Math.floor(R2()*named.length)]; // half the routes start at a harbor
    const near = named.filter(b => b !== a).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
    const b = near[Math.floor(R2()*Math.min(3, near.length))], key = [a.name, b.name].sort().join('-');
    if (!b || pairs.has(key)) continue; pairs.add(key);
    const route = [offshore(a, b, 150), offshore(b, a, 150)];
    if (Math.hypot(route[0].x - route[1].x, route[0].y - route[1].y) < 1200) continue; // too short to be a voyage
    traffic.push({kind:'merchant', route, isle:a.port ? b : a});
  }
  // P65: small traders in the Shallows, for a rowboat to raid: they never shoot back
  { const inS = named.filter(i => zoneAt(i.x, i.y) === 0), kal = ISLANDS.find(i => i.port);
    const near = (a, n) => inS.filter(b => b !== a).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y)).slice(0, n);
    const pairs2 = [...near(kal, 2).map(b => [kal, b]), ...inS.filter(a => a !== kal).slice(0, 2).map(a => [a, near(a, 1)[0]])];
    for (const [a, b] of pairs2) if (a && b) traffic.push({kind:'trader', route:[offshore(a, b, 150), offshore(b, a, 150)], isle:a.port ? b : a}); }
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
// The waves are bent by a slow, uneven warp so they never line up in a neat repeating grid (keep in step with swell() in scene.js).
const warpX = (x, z) => x + 70*Math.sin(z*.0021 + 1.3) + 30*Math.sin(z*.0057 + x*.0013), warpZ = (x, z) => z + 70*Math.sin(x*.0017 - .7) + 30*Math.sin(x*.0049 - z*.0011);
export function waveH(x0, z0, amp, t){ const x = warpX(x0, z0), z = warpZ(x0, z0); return amp * (Math.sin(x*.011 + t*1.3) + Math.sin(z*.013 - t*1.1)*.8 + Math.sin((x+z)*.021 + t*2)*.4) / 2.2; }
// P89 (Nicholas: the pirate king's flagship bobbed like a toy in rough water): weight on the waves. How a ship sits on the sea:
// height, pitch and roll from the water under it, softened for big ships (weight 0 for a rowboat, 1 for the flagship) and eased
// over time so a heavy hull swings slowly instead of snapping to every wave. mem keeps the last pose between frames.
export const shipWeight = len => Math.min(1, Math.max(0, (len - 50)/220));
export function seaPose(x, y, a, len, t, mem){
  const w = shipWeight(len), fx = Math.cos(a)*len*.4, fz = Math.sin(a)*len*.4;
  const hb = waveAt(x + fx, y + fz, t), hs = waveAt(x - fx, y - fz, t), hc = waveAt(x, y, t);
  const pitch = Math.atan((hb - hs)/(len*.8))*(1 - .7*w);
  const roll = Math.atan((waveAt(x - fz*.5, y + fx*.5, t) - waveAt(x + fz*.5, y - fx*.5, t))/(len*.4))*.8*(1 - .7*w);
  const h = (hc*.5 + (hb + hs)*.25)*(1 - .55*w); // a long hull rides the average of bow, middle and stern
  if (!mem) return {h, pitch, roll};
  const dt = Math.min(.1, Math.max(0, t - (mem.t ?? t))); mem.t = t;
  const k = mem.h === undefined ? 1 : 1 - Math.exp(-dt*(10 - 7.5*w)); // heavy ships follow the sea more slowly
  mem.h = mem.h === undefined ? h : mem.h + (h - mem.h)*k; mem.pitch = (mem.pitch ?? pitch) + (pitch - (mem.pitch ?? pitch))*k; mem.roll = (mem.roll ?? roll) + (roll - (mem.roll ?? roll))*k;
  return mem;
}

export function waveAt(x, z, t){ return waveH(x, z, seaInfo(x, z).amp, t); }
// The height of the water surface as drawn: the big swells plus the small chop on top (the same as swell() in scene.js).
// Things lying on the water (wake foam) use this so they never sink under a little wave.
export const shoreK = ld => Math.min(1, Math.max(0, (ld - 10)/150)); // calm water right by the shore (0) to full waves (1)
export function waterY(x, z, t){ const k = shoreK(landDist(x, z)), A = seaInfo(x, z).amp*k, C = (1.8 + A*.15)*2*k;
  const wx = warpX(x, z), wz = warpZ(x, z);
  return waveH(x, z, A, t) + (Math.sin(wx*.034 - wz*.021 + t*1.9)*.22 + Math.sin(wx*.018 + wz*.039 - t*1.6)*.18)*C; }
