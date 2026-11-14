// Puts the world into the 3D scene and animates it: islands, fishing spots, wrecks, gulls, wake, the player's boat.
import {mergeStatic} from './merge.js?v=0500111';
import {SHIPS, IRON} from './config.js?v=0500111';
import {ISLANDS, SPOTS, WRECKS, HARBORS, CITIES, PIER_LEN, PIER, DOCK, WORLD as WORLD_N, home, hash, rng, waveAt, seaPose, inPoly, landDist, islandHeights, siteClear} from './world.js?v=0500111';
import {G, ship, lvl} from './state.js?v=0500111';
import {men} from './crew.js?v=0500111';
import {scene} from './scene.js?v=0500111';
import {slab, mineModel, mesh, cypress, roundTree, CYPRESS_TINTS, ROUND_TINTS, house, temple, gull, wreckModel, icebergModel, fishModel, farm, amphoraGeo} from './models.js?v=0500111';
import {buildShip, animateShip, statue, SPECS} from './ships.js?v=0500111';
import {figure} from './town.js?v=0500111';
import {buildTown, buildPort, depthIn, spotIn} from './townbuild.js?v=0500111';
import {makeFire, updateFire, burn} from './fire.js?v=0500111';
import {addGrass} from './grass.js?v=0500111';
import {sinkPose} from './sinking.js?v=0500111';
import {moored} from './fleet.js?v=0500111';
import {sailCount} from './upgrades.js?v=0500111';
import {hasSail} from './crew.js?v=0500111';
import {placeOnWaves} from './combat.js?v=0500111';

const T = window.THREE;
// ---- pop in: trees and houses spring up with a little bounce as they come into view, and tuck away again far behind ----
const ISLE_GROUPS = [];
// one island per frame, nearest first
export function mergeNearIslands(reach = 3600, all = false){ let best = null, bd = reach; for (let i = ISLE_GROUPS.length - 1; i >= 0; i--){ const g = ISLE_GROUPS[i], d = Math.hypot(g.position.x - G.cam.x, g.position.z - G.cam.y) - (g.userData.isR || 0); /* P116: from its shore, not its middle: a big island's town is built before you can see it */ if (all){ if (d < reach){ if (g.userData.lazy){ g.userData.lazy(); delete g.userData.lazy; } mergeStatic(g); ISLE_GROUPS.splice(i, 1); } } else if (d < bd){ bd = d; best = i; } } if (best != null){ const g = ISLE_GROUPS[best]; if (g.userData.lazy){ g.userData.lazy(); delete g.userData.lazy; } mergeStatic(g); ISLE_GROUPS.splice(best, 1); } }
const POP_R = 1300, popEase = t => { const c = 1.9; return 1 + (c + 1)*Math.pow(t - 1, 3) + c*Math.pow(t - 1, 2); };
// P116: pops are kept per island, and an island whose every pop is tucked away and which lies well beyond the pop distance is
// skipped whole (there are thousands of houses and trees now; most frames only one or two islands are looked at). A tucked-away
// thing is hidden, not just shrunk to nothing: it used to stay in the drawing list at a thousandth of its size.
// It also keeps its own proportions now (a tall house pops up tall).
const POP_SETS = new Map();
function popIn(o){ o.userData.keep = true; Object.assign(o.userData, {sv:o.scale.clone(), y0:o.position.y, on:false, pop:0}); o.scale.setScalar(.001); o.visible = false;
  const g = o.parent; let set = POP_SETS.get(g); if (!set) POP_SETS.set(g, set = {g, list:[], on:0}); set.list.push(o); }
const popV = new T.Vector3();
function updatePops(dt){
  const z = Math.max(1, G.settings.dev.zoom || 1), r = POP_R*z, cx = G.cam.x, cy = G.cam.y;
  for (const set of POP_SETS.values()){ const g = set.g;
    if (!set.on && Math.hypot(g.position.x - cx, g.position.z - cy) > r + (g.userData.isR || 0) + 200) continue;
    for (const o of set.list){ const u = o.userData;
      if (!u.wp){ o.updateWorldMatrix(true, false); u.wp = o.getWorldPosition(popV).clone(); }
      const d = Math.hypot(u.wp.x - cx, u.wp.z - cy);
      if (!u.on){ if (d < r){ u.on = true; set.on++; o.visible = true; u.pop = -Math.random()*.35; } else continue; } // a small random delay so they don't all pop at once
      else if (d > r + 500){ u.on = false; set.on--; o.visible = false; o.scale.setScalar(.001); continue; }
      if (u.pop >= .5) continue;
      u.pop += dt; const k = Math.max(0, u.pop)/.5, e = Math.max(.001, popEase(Math.min(1, k)));
      o.scale.set(u.sv.x*e, u.sv.y*e, u.sv.z*e); o.position.y = u.y0 + Math.sin(Math.min(1, k)*Math.PI)*6*u.sv.y;
      if (k >= 1){ o.scale.copy(u.sv); o.position.y = u.y0; u.pop = .5; } } }
}

// ---- islands ----
// P118 (the visual pass): wet sand. A band of darker, damp sand runs along the water's edge of every beach and fades into the dry
// sand further up. It is a thin strip laid on the beach (colors set at its corners, no texture), glued into the island like the rest.
function wetSand(pts, dry, wet){ const n = pts.length, D = new T.Color(dry), Wc = new T.Color(wet), rows = [[5, Wc], [12, Wc], [30, D]], pos = [], col = [], idx = [];
  for (let i = 0; i < n; i++){ const [x, z] = pts[i], [ax, az] = pts[(i + n - 1) % n], [bx, bz] = pts[(i + 1) % n]; let tx = bx - ax, tz = bz - az; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    let nx = -tz, nz = tx; if (!inPoly(pts, x + nx*3, z + nz*3)){ nx = -nx; nz = -nz; }
    for (const [d, c] of rows){ let k = d; while (k > 5 && !inPoly(pts, x + nx*k, z + nz*k)) k -= 5; pos.push(x + nx*k, 4.35, z + nz*k); col.push(c.r, c.g, c.b); } }
  for (let i = 0; i < n; i++){ const a = i*3, b = ((i + 1) % n)*3; for (let r = 0; r < 2; r++) idx.push(a + r, b + r, a + r + 1, b + r, b + r + 1, a + r + 1); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const nrm = geo.attributes.normal; let up = 0; for (let i = 0; i < nrm.count; i++) up += nrm.getY(i); if (up < 0){ for (let i = 0; i < idx.length; i += 3){ const t = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = t; } geo.setIndex(idx); } for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  const m = mesh(geo, '#ffffff', {vertexColors:true}, false); return m; }
// Each island is stacked flat layers of its real outline: sand, grass, and a rocky hilltop on the bigger ones.
// The edges are bevelled so every layer has a soft rounded rim.
const HOME_X = home.x, HOME_Y = home.y;
const flags = []; // city harbor flags, recolored when an island changes hands
ISLANDS.forEach((is, i) => {
  const R = rng(i*977+13), g = new T.Group(); g.position.set(is.x, 0, is.y); g.userData.isR = is.r;
  const [beach, grass, hill] = is.tiers, size = Math.sqrt(is.area);
  // the far north is cold: snow on the islands, pale stone beaches, snowy cypresses
  const cold = is.y < WORLD_N*.3; is.cold = cold;
  const {top, hillTop} = islandHeights(is);
  is.ht = hill ? hillTop : top;
  g.add(slab(beach, -14, 4, cold ? '#d8dfe3' : '#e6d29c'));
  g.add(wetSand(beach, cold ? '#d8dfe3' : '#e6d29c', cold ? '#b3bfc7' : '#c9ad74'));
  if (grass) g.add(slab(grass, 4, top, cold ? '#f2f6f8' : is.trees || is.port || is.harbor || is.frame ? '#76883c' : '#8a8a74'));
  // P107 (Nicholas: the rock looks weird): the hilltop had straight walls like a cut block; now its sides slope and a few
  // boulders sit on and around it, so it reads as a rocky hill
  if (hill){ g.add(slab(hill, top, hillTop, cold ? '#c7d2d9' : '#8f8a76', 11));
    for (let k=0;k<Math.min(7, 2 + size/250);k++){ const p = spotIn(R, hill, 14); if (!p || !siteClear(is, p[0], p[1])) continue; const s = 6 + R()*9, rock = mesh(new T.DodecahedronGeometry(s, 0), cold ? '#b9c3c9' : ['#9a9483', '#8a8473', '#a59f8c'][k % 3]);
      rock.position.set(p[0], hillTop + s*.3, p[1]); rock.rotation.set(R()*3, R()*3, 0); rock.scale.y = .7; g.add(rock); }
    for (let k=0;k<Math.min(8, 3 + size/220);k++){ const [hx, hz] = hill[Math.floor(R()*hill.length)], s = 5 + R()*7; if (!siteClear(is, hx, hz)) continue; const rock = mesh(new T.DodecahedronGeometry(s, 0), cold ? '#b9c3c9' : '#948e7c');
      rock.position.set(hx*1.03, top + s*.4, hz*1.03); rock.rotation.set(R()*3, R()*3, 0); g.add(rock); } }
  // a few rocks along the shore
  for (let k=0;k<Math.min(8, 3 + size/300);k++){ const [x, z] = beach[Math.floor(R()*beach.length)], s = 7 + R()*10, rock = mesh(new T.DodecahedronGeometry(s, 0), '#9a9483');
    rock.position.set(x*1.02, 1, z*1.02); rock.rotation.set(R()*3, R()*3, 0); g.add(rock); }
  // P65: an iron mine stands on the shore of a few islands: stop beside it to dig
  if (IRON.mines.includes(is.name)){ for (let k=0;k<40;k++){ const a = R()*6.28, c = Math.cos(a), s = Math.sin(a); let r = 0; while (r < is.r*2 && landDist(is.x + c*r, is.y + s*r) < 0) r += 6;
      if (r >= is.r*2 || landDist(is.x + c*(r + 200), is.y + s*(r + 200)) < 120 || !siteClear(is, c*r, s*r) || !siteClear(is, c*(r - 60), s*(r - 60))) continue;
      const m = mineModel(); m.position.set(c*(r - 44), 2, s*(r - 44)); m.rotation.y = -a; g.add(m);
      is.mine = {x:is.x + c*(r + 30), y:is.y + s*(r + 30), stock:IRON.stock, regen:0}; break; } }
  // trees: on the grass, or on the hilltop if they land there
  is.treeObjs = [];
  const ground = grass || beach, treeAt = ([x, z]) => !hill || !inPoly(hill, x, z) ? top : depthIn(hill, x, z) >= 11 ? hillTop : (top + hillTop)/2; // P107: half way up the sloped edge
  // every island gets its own mix of tree colors: some cypresses, some round trees in blossom or autumn colors
  const tree = () => cold ? cypress(['#2f4d3a', '#f4f8fa']) : R() < .5 ? cypress(CYPRESS_TINTS[Math.floor(R()*CYPRESS_TINTS.length)]) : roundTree(ROUND_TINTS[Math.floor(R()*ROUND_TINTS.length)], Math.floor(R()*9));
  for (let k=0;k<is.trees;k++){ const p = spotIn(R, ground, 10, 0, 0, size*.45) || spotIn(R, ground, 4) || [0, 0], c = tree();
    c.position.set(p[0], treeAt(p), p[1]); c.scale.setScalar(.85 + R()*.35); g.add(c); is.treeObjs.push(c); popIn(c); }
  if (!is.trees && !is.port && !is.harbor && !is.frame){ const c = tree(); c.position.set(0, treeAt([0, 0]), 0); c.scale.setScalar(.7); g.add(c); popIn(c); }
  // the mainland gets scattered trees too, just for looks
  if (is.frame) for (let k=0;k<Math.min(60, is.area/90000);k++){ const p = spotIn(R, ground, 20); if (!p) break; const c = tree(); c.position.set(p[0], treeAt(p), p[1]); g.add(c); popIn(c); }
  // P116: an island's town, its trees' final places and its grass are worked out when you first come near it (or at once if the
  // voyage starts close by), not all at the start: the load is shorter by the twenty towns you can't see yet
  const finish = () => {
  if (is.harbor || is.town){ const free = buildTown(is, g, (is.harbor || is.town).pier, {top, hillTop, R, ground, hill, popIn, flags});
    // trees that landed in the streets or on houses move elsewhere on the island
    for (const c of is.treeObjs){ if (free(c.position.x, c.position.z)) continue;
      for (let k=0;k<40;k++){ const p = spotIn(R, ground, 10); if (p && free(...p)){ c.position.set(p[0], treeAt(p), p[1]); c.userData.y0 = c.position.y; c.userData.wp = null; break; } } }
    is.free = free; }
  // P68: trees that landed where the fortress or its stair stands move elsewhere
  if (is.site){ for (const c of is.treeObjs){ if (siteClear(is, c.position.x, c.position.z)) continue;
      for (let k=0;k<60;k++){ const p = spotIn(R, ground, 8); if (p && siteClear(is, p[0], p[1]) && (!is.free || is.free(...p))){ c.position.set(p[0], treeAt(p), p[1]); c.userData.y0 = c.position.y; c.userData.wp = null; break; } } }
    const free0 = is.free; is.free = (x, z) => siteClear(is, x, z) && (!free0 || free0(x, z)); }
  // grass on the green islands (High graphics)
  if (grass && !cold && (is.trees || is.port || is.harbor || is.frame)) addGrass(g, grass, hill, top, rng(i*131 + 7), is.free, '#f2f7e4');
  // P74: the houses, walls and rocks that never move are glued together when you first come near (see updatePops)
    if (is.portx) buildPort(is, g, is.portx, rng(i*389 + 5)); };
  const S0 = G.S || {}, nearStart = is.port || Math.hypot((S0.x ?? HOME_X) - is.x, (S0.y ?? HOME_Y) - is.y) < is.r + 4200;
  if (nearStart || !(is.harbor || is.town || is.portx)) finish(); else g.userData.lazy = finish;
  for (const o of [...is.treeObjs]) o.userData.keep = true; g.userData.mergeLater = true; ISLE_GROUPS.push(g);
  scene.add(g);
});

export function refreshTrees(is){ is.treeObjs.forEach((c, k) => { const alive = k < is.stock; c.userData.live.forEach(m => m.visible = alive); c.userData.stump.visible = !alive; }); }
export function refreshAllTrees(){ ISLANDS.forEach(i => i.trees && refreshTrees(i)); }

// ---- fishing spots ----
const ringGeo = new T.RingGeometry(10, 13.5, 20); ringGeo.rotateX(-Math.PI/2);
// P132 (loading time): every fishing spot used to build its three fish from scratch. One fish of each kind is built and the rest are copies that share its shape.
const fishProto = {}, fishOf = kind => (fishProto[kind] || (fishProto[kind] = fishModel(kind))).clone();
SPOTS.forEach((s, i) => {
  const g = new T.Group(); g.position.set(s.x, 0, s.y);
  s.rings = [0,1].map(() => { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({color:0xf4fbff, transparent:true, opacity:.5, depthWrite:false})); g.add(m); return m; });
  s.fish = [0,1,2].map(k => { const f = fishOf(s.kind); f.userData.ph = hash(i,k); f.userData.ang = hash(k,i)*6.28; g.add(f); return f; });
  s.g = g; scene.add(g);
});

// ---- icebergs in the cold north: white and pale blue, bobbing slowly; ships can't sail through them ----
export const ICEBERGS = [];
{ const R = rng(4242);
  for (let k=0, tries=0; k<26 && tries<600; tries++){ const x = R()*WORLD_N, y = R()*WORLD_N*.27;
    if (Math.hypot(x - WORLD_N*.83, y - WORLD_N*.15) < 3200 || landDist(x, y) < 180 || ICEBERGS.some(b => Math.hypot(b.x - x, b.y - y) < 260)) continue;
    // a big flat-topped slab of ice with a taller peak, a pale-blue skirt under the water line
    const r = 45 + R()*55, g = icebergModel(r, R);
    g.position.set(x, 0, y); scene.add(g); ICEBERGS.push({x, y, r:r*1.05, g, ph:R()*6}); k++; } }

// ---- wrecks + gulls ----
WRECKS.forEach((w, i) => {
  const g = wreckModel(w.size); g.position.set(w.x, w.stock ? 0 : -60, w.y); g.rotation.y = w.rot;
  w.bob = g.userData.bob;
  w.gulls = [0,1,2,3].map(k => { const gl = gull(); Object.assign(gl.userData, {R:34 + k*12, h:70 + k*9, sp:(.5 + hash(i,k)*.4) * (k%2 ? 1 : -1), a:k*1.7}); scene.add(gl); return gl; });
  w.g = g; scene.add(g);
});

// ---- wake ----
const wakeGeo = new T.CircleGeometry(1, 8); wakeGeo.rotateX(-Math.PI/2);
const WAKE = Array.from({length:40}, () => { const m = new T.Mesh(wakeGeo, new T.MeshBasicMaterial({color:0xf4fbff, transparent:true, opacity:0, depthWrite:false})); m.visible = false; scene.add(m); return {m, life:0}; });
let wakeI = 0, wakeLast = {x:0, y:0};
export function spawnWake(){ return; // wakes.js draws the wakes now
  const S = G.S, sh = ship();
  if (G.v < 25 || Math.hypot(wakeLast.x-S.x, wakeLast.y-S.y) < 10) return;
  const w = WAKE[wakeI++ % WAKE.length]; w.life = 1; w.m.visible = true;
  w.m.position.set(S.x - Math.cos(S.a)*sh.len*.45, 1, S.y - Math.sin(S.a)*sh.len*.45); wakeLast = {x:S.x, y:S.y};
}

// ---- builder tool: every ship moored in a row south of the pier, to judge sizes and crew ----
let fleet = [];
export function showFleet(on){
  fleet.forEach(f => scene.remove(f)); fleet = [];
  if (!on) return;
  // in a line across the harbor mouth, past the end of the pier
  const nx = -PIER.dy, ny = PIER.dx; let k = -300;
  for (const key of Object.keys(SPECS)){ const s = SPECS[key], f = buildShip(key, {}, G.settings.dev.crew);
    k += s.B + 30; const x = DOCK.x + PIER.dx*180 + nx*k, y = DOCK.y + PIER.dy*180 + ny*k;
    f.position.set(x, s.L*.05 + 1, y); f.rotation.y = -Math.atan2(PIER.dy, PIER.dx); scene.add(f); fleet.push(f); k += s.B + 30; }
}
document.addEventListener('fleet', () => showFleet(G.settings.dev.fleet));

// ---- your own ships moored in a row beside the Kallisto pier (fleet.js), each in its own paint and upgrades ----
let homeFleet = [], homeKey = '';
export function showHomeFleet(){
  const list = moored(), key = list.map(t => t + JSON.stringify((G.S.looks || {})[t] || {}) + JSON.stringify((G.S.ups || {})[t] || {})).join('|') + G.S.tier;
  if (key === homeKey) return; homeKey = key;
  homeFleet.forEach(f => scene.remove(f)); homeFleet = [];
  // side by side off the pier, on whichever side has open water
  let nx = -PIER.dy, ny = PIER.dx, k = 60; const tip = PIER_LEN*.8, wet = sg => landDist(PIER.x + PIER.dx*tip - nx*sg*160, PIER.y + PIER.dy*tip - ny*sg*160);
  if (wet(-1) > wet(1)){ nx = -nx; ny = -ny; }
  for (const t of list){ const sh = SHIPS[t], s = SPECS[sh.model], up = (G.S.ups || {})[t] || {};
    const f = buildShip(sh.model, {...((G.S.looks || {})[t] || {}), flag:G.S.crewName ? G.S.look.flag : 'none', ram:t === G.S.tier ? lvl('ram') : 0, plate:up.hull || 0, sailLv:up.sail || 0, men:men(t)}, G.settings.dev.crew); mergeStatic(f);
    k += s.B/2 + (s.oarCount > 1 ? 34 : 10); const along = PIER_LEN*.8;
    f.userData.at = {x:PIER.x + PIER.dx*along - nx*k, y:PIER.y + PIER.dy*along - ny*k, a:Math.atan2(PIER.dy, PIER.dx), len:s.L};
    k += s.B/2 + (s.oarCount > 1 ? 34 : 10); scene.add(f); homeFleet.push(f); }
}
document.addEventListener('fleetmoved', showHomeFleet);
document.addEventListener('crew', () => showFleet(G.settings.dev.fleet));

// ---- dockhands and mooring lines, for the docking animation ----
const ropeGeo = new T.CylinderGeometry(.7, .7, 1, 4); ropeGeo.translate(0, .5, 0);
const UP = new T.Vector3(0, 1, 0), tmpV = new T.Vector3();
const hands = ['#3f6c94', '#c64a3c'].map(c => { const f = figure(c), rope = mesh(ropeGeo, '#d9c49a'); rope.castShadow = false; rope.visible = false; scene.add(f, rope); return {f, rope, k:0}; });
let lastPier = PIER;
// P50: the harbor rings: a soft golden circle on the water past each pier that pulses gently. Sailing into one docks you (player.js).
const RING_R = 70;
const ringMat = new T.MeshBasicMaterial({color:'#ffd77a', transparent:true, opacity:.6, depthWrite:false, fog:false});
const fillMat = new T.MeshBasicMaterial({color:'#ffe9b0', transparent:true, opacity:.08, depthWrite:false, fog:false});
const RINGS = HARBORS.map(h => { const g = new T.Group(), x = h.pier.x + h.pier.dx*(PIER_LEN + 75), y = h.pier.y + h.pier.dy*(PIER_LEN + 75);
  const ring = new T.Mesh(new T.RingGeometry(RING_R - 3.5, RING_R, 64), ringMat), fill = new T.Mesh(new T.CircleGeometry(RING_R - 7, 48), fillMat);
  const halo = new T.Mesh(new T.RingGeometry(RING_R - 12, RING_R + 10, 64), new T.MeshBasicMaterial({color:'#ffe08a', transparent:true, opacity:.18, depthWrite:false, fog:false}));
  for (const m of [ring, fill, halo]){ m.rotation.x = -Math.PI/2; m.renderOrder = 2; g.add(m); }
  g.position.set(x, 3, y); g.userData = {x, y, halo}; scene.add(g); return g; });
function animateRings(t){
  const pulse = .5 + .5*Math.sin(t*2.4);
  ringMat.opacity = .45 + .35*pulse; fillMat.opacity = .05 + .06*pulse;
  for (const g of RINGS){ const u = g.userData, near = Math.hypot(u.x - G.S.x, u.y - G.S.y) < 2600;
    g.visible = false; continue; // P55: no rings (the Enter harbor button is back)
    g.position.y = waveAt(u.x, u.y, t) + 2.5; u.halo.scale.setScalar(1 + .08*pulse); u.halo.material.opacity = .2*(1 - pulse*.5); }
}
function animateDock(dt, t){
  animateRings(t);
  // waiting: you're sailing up to a harbor (and it will let you in), so they stand ready on the pier and wave
  const w = !G.dock && G.nearPier && !(G.nearPier.is.city && (G.hunted || {})[G.nearPier.is.city]) ? G.nearPier : null;
  const d = G.dock, sh = ship(), on = (!!d && d.mode !== 'out') || !!w, PIER = d ? (lastPier = d.h.pier) : w ? (lastPier = w.pier) : lastPier;
  const S0 = G.S, wSide = w ? ((S0.x - PIER.x)*-PIER.dy + (S0.y - PIER.y)*PIER.dx >= 0 ? 1 : -1) : 1;
  for (const f of flags) if (f.c !== f.is.city && f.is.city){ f.c = f.is.city; f.flag.material.color.set(CITIES[f.c].color); } // the island changed hands
  hands.forEach((h, i) => {
    h.k = on ? Math.min(1, h.k + dt*2.5) : Math.max(0, h.k - dt*3);
    h.f.visible = h.k > .01; h.rope.visible = !!d && on && h.k > .5;
    if (!h.f.visible) return;
    h.f.scale.setScalar(Math.max(.001, on ? 1 + 2.9*Math.pow(h.k - 1, 3) + 1.9*Math.pow(h.k - 1, 2) : h.k)); // springy pop in
    const side = d ? d.side : wSide, along = Math.max(6, Math.min(PIER_LEN - 4, (d ? d.along : PIER_LEN*.5) + (i ? -1 : 1)*sh.len*.3));
    const x = PIER.x + PIER.dx*along - PIER.dy*side*6, y = PIER.y + PIER.dy*along + PIER.dx*side*6;
    const pulling = d && d.mode === 'in';
    h.f.position.set(x, 7.5, y); h.f.rotation.y = -Math.atan2(PIER.dy, PIER.dx);
    const inner = h.f.userData.inner; inner.rotation.x = -side*(pulling ? .32 + Math.sin(t*9 + i*2)*.12 : .08); inner.position.y = pulling ? Math.abs(Math.sin(t*9 + i*2))*1.5 : w ? Math.abs(Math.sin(t*4 + i*1.3))*2 : 0;
    if (w) inner.rotation.z = Math.sin(t*5 + i*1.7)*.18; else inner.rotation.z = 0; // a little hop and sway while they wait
    if (!h.rope.visible) return;
    // line from the dockhand's hands to the bow or stern of the ship
    // each dockhand ties on to the end of the ship nearest to them, so the lines never cross (bow in or bow out)
    const S = G.S, out = Math.cos((d ? d.a : S.a) - Math.atan2(PIER.dy, PIER.dx)) >= 0 ? 1 : -1, end = (i ? -1 : 1)*out;
    const cx = S.x + Math.cos(S.a)*sh.len*.35*end, cy = S.y + Math.sin(S.a)*sh.len*.35*end;
    h.rope.position.set(x, 13, y); tmpV.set(cx - x, waveAt(cx, cy, t) + sh.len*.05 + 6 - 13, cy - y);
    const len = tmpV.length(); h.rope.scale.set(1, len, 1); h.rope.quaternion.setFromUnitVectors(UP, tmpV.normalize());
  });
}

// ---- player boat ----
let boat = null;
// P51: fishing rods over both sides with a line and a red and white float, shown while you fish (the fishing game or near the shore)
function makeRods(sh){
  const s = SPECS[sh.model], g = new T.Group(), deck = s.H*.2 + 3, rods = [];
  for (const sg of [1, -1]){ const rod = mesh(new T.CylinderGeometry(.35, .6, 26, 5), '#8a5a30'); rod.castShadow = false;
    const base = new T.Vector3(sg*3, deck, sg*sh.beam*.42), tip = new T.Vector3(6, deck + 15, sg*(sh.beam*.5 + 20));
    rod.position.copy(base).add(tip).multiplyScalar(.5); rod.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tip.clone().sub(base).normalize()); g.add(rod);
    const bob = new T.Group(), top = mesh(new T.SphereGeometry(1.5, 10, 8), '#e2563f'), bot = mesh(new T.SphereGeometry(1.5, 10, 8, 0, 6.29, Math.PI/2, Math.PI/2), '#fff6e2');
    bob.add(top, bot); g.add(bob);
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)); const line = new T.Line(lg, new T.LineBasicMaterial({color:'#f4efe2'})); g.add(line);
    rods.push({tip, bob, line, sg, x:tip.x + 6, z:tip.z + sg*6}); }
  g.visible = false; g.userData.rods = rods; return g;
}
function animateRods(t){
  const r = boat && boat.userData.rodset; if (!r) return;
  const on = !!G.fish || !!(G.act && G.act.type === 'shore'); r.visible = on && !G.dock; if (!r.visible) return;
  const sea = waveAt(G.S.x, G.S.y, t) - boat.position.y; // the water line, in the boat's own height
  for (const q of r.userData.rods){ const bite = G.fish && G.fish.flash > 0 ? 2.5 : 0, y = sea + Math.sin(t*2.2 + q.sg)*.8 - bite;
    q.bob.position.set(q.x, y + .6, q.z);
    const p = q.line.geometry.attributes.position; p.setXYZ(0, q.tip.x, q.tip.y, q.tip.z); p.setXYZ(1, q.x, y + 1.6, q.z); p.needsUpdate = true; }
}
const TILT = 70;
export function swapBoat(){ if (boat) scene.remove(boat); const sh = SHIPS[G.S.tier]; boat = buildShip(sh.model, {...G.S.look, ...(G.S.crewName ? {} : {flag:'none'}), ram:lvl('ram'), plate:lvl('hull'), sailLv:lvl('sail'), men:men()}, G.settings.dev.crew); mergeStatic(boat); // no flag until you found a crew
  boat.userData.fire = makeFire(sh.len, sh.beam, SPECS[sh.model].H*.9); boat.add(boat.userData.fire);
  boat.userData.rodset = makeRods(sh); boat.add(boat.userData.rodset); scene.add(boat); }

export function animateEntities(dt){
  mergeNearIslands();
  updatePops(dt);
  for (const b of ICEBERGS){ if (Math.abs(b.x - G.cam.x) > 1800 || Math.abs(b.y - G.cam.y) > 1800) continue; b.g.position.y = Math.sin(G.t*.6 + b.ph)*1.5; b.g.rotation.y = Math.sin(G.t*.1 + b.ph)*.2; }
  const S = G.S, t = G.t, sh = SHIPS[S.tier];
  const sea = seaPose(S.x, S.y, S.a, sh.len, t, boat.userData.sea || (boat.userData.sea = {})), wh = sea.h; // P89: big ships carry their weight on the waves
  // hits and volleys rock the boat; sinking lists it over and pulls it under
  G.kick = Math.max(0, (G.kick || 0) - dt*.5);
  // leaning out of a fast turn, like a real boat heeling over: more turn and more speed, more lean
  // P65: a ship under sail leans much further: all that weight up in the sails. TILT is the % of 40 degrees at a full-speed hard turn (P84: Nicholas chose 70%).
  const sailN = hasSail() ? Math.max(1, sailCount()) : 0, hk = sailN ? TILT/100*.7*(1 + .12*(sailN - 1)) : .22, hmax = Math.max(.22, hk);
  const hardTurn = Math.max(-1, Math.min(1, (G.turnRate || 0)/(sh.turn || 1))), hardSpeed = Math.min(1, G.v/(sh.speed || 1));
  const heelTo = sailN ? -hardTurn*hardSpeed*hk : Math.max(-.22, Math.min(.22, -(G.turnRate || 0)*G.v/sh.speed*.12));
  G.heel = (G.heel || 0) + (Math.max(-hmax, Math.min(hmax, heelTo)) - (G.heel || 0))*Math.min(1, dt*2.4);
  const sp = G.sinking ? sinkPose(G.sinking.t, G.sinking.side, sh.len) : {depth:0, roll:0, pitch:0, done:false};
  boat.visible = !sp.done;
  boat.position.set(S.x, wh + sh.len*.05 - sp.depth, S.y);
  boat.rotation.order = 'YXZ'; boat.rotation.y = -S.a; boat.rotation.z = sea.pitch + sp.pitch; boat.rotation.x = sea.roll + sp.roll + Math.sin(G.kick*50)*G.kick + G.heel;
  boat.userData.firing = !!G.firing;
  boat.userData.windFill = Math.min(1, (G.windFill || 0) + .4*(G.stormRide || 0)); boat.userData.stow = !G.rowing && !G.dock; boat.userData.burst = G.rowT > 0; animateShip(boat, t, G.v);
  updateFire(boat.userData.fire, Math.max(burn(S.hull, ship().hull), G.burnT > 0 ? .6 : 0), t); // also while burning from a flaming volley
  for (const f of fleet) animateShip(f, t, 0);
  showHomeFleet();
  for (const f of homeFleet){ const p = f.userData.at; placeOnWaves(f, p.x, p.y, p.a, p.len, t); animateShip(f, t, 0); }
  animateDock(dt, t); animateRods(t);

  for (const s of SPOTS){
    s.g.visible = s.stock > 0; if (!s.stock) continue;
    s.g.position.y = waveAt(s.x, s.y, t) + .6;
    s.rings.forEach((r, k) => { const p = (t*.45 + k*.5 + hash(s.x, s.y)) % 1; r.scale.setScalar(1 + p*2.6); r.material.opacity = .55*(1-p); });
    s.fish.forEach((f, k) => { const u = ((t*.4 + f.userData.ph) % 1) / .22; f.visible = k < s.stock && u < 1;
      if (f.visible){ const a = f.userData.ang; f.position.set(Math.cos(a)*(u-.5)*22, Math.sin(u*Math.PI)*12 - 1, Math.sin(a)*(u-.5)*22); f.rotation.set(0, -a, Math.cos(u*Math.PI)*1.1); } });
  }
  for (const w of WRECKS){
    const target = w.stock ? 0 : -60; w.g.position.y += (target - w.g.position.y)*Math.min(1, dt*.8);
    w.g.visible = w.g.position.y > -55;
    w.bob.forEach((b, k) => { b.position.y = Math.sin(t*1.6 + k)*1.6; });
    w.gulls.forEach((gl, k) => { const u = gl.userData; u.a += u.sp*dt; gl.visible = w.stock > 0;
      gl.position.set(w.x + Math.cos(u.a)*u.R, u.h + Math.sin(t*1.3 + k)*4, w.y + Math.sin(u.a)*u.R);
      gl.rotation.y = -u.a - Math.sign(u.sp)*Math.PI/2; gl.rotation.x = -Math.sign(u.sp)*.35;
      u.flap(Math.sin(t*2.4 + k*2)*.45 + .1); }); // gliding, with slow soft wingbeats
  }
  for (const w of WAKE){ if (!w.m.visible) continue; w.life -= dt*.55; if (w.life <= 0){ w.m.visible = false; continue; }
    w.m.scale.setScalar(4 + (1-w.life)*14); w.m.material.opacity = w.life*.45; w.m.position.y = waveAt(w.m.position.x, w.m.position.z, t) + .8; }
}
