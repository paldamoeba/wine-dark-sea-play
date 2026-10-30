// Puts the world into the 3D scene and animates it: islands, fishing spots, wrecks, gulls, wake, the player's boat.
import {SHIPS} from './config.js';
import {ISLANDS, SPOTS, WRECKS, HARBORS, CITIES, PIER_LEN, PIER, DOCK, home, hash, rng, waveAt, inPoly} from './world.js';
import {G, ship, lvl} from './state.js';
import {scene} from './scene.js';
import {mesh, cypress, house, temple, gull, wreckModel} from './models.js';
import {buildShip, animateShip, statue, SPECS} from './ships.js';
import {addTown, figure} from './town.js';
import {makeFire, updateFire, burn} from './fire.js';
import {sinkPose} from './sinking.js';

const T = window.THREE;

// ---- islands ----
// Each island is stacked flat layers of its real outline: sand, grass, and a rocky hilltop on the bigger ones.
// The edges are bevelled so every layer has a soft rounded rim.
function slab(pts, y0, y1, color){
  const b = Math.min(5, (y1 - y0)/3);
  const geo = new T.ExtrudeGeometry(new T.Shape(pts.map(([x, z]) => new T.Vector2(x, -z))), {depth:y1 - y0 - 2*b, bevelEnabled:true, bevelThickness:b, bevelSize:b, bevelOffset:-b, bevelSegments:3, curveSegments:1});
  geo.rotateX(-Math.PI/2); geo.translate(0, y0 + b, 0);
  return mesh(geo, color);
}
// How far inside an outline a point is (0 or less = outside).
function depthIn(pts, x, z){ if (!inPoly(pts, x, z)) return 0; let best = Infinity;
  for (let i=0;i<pts.length;i++){ const [ax, az] = pts[i], [bx, bz] = pts[(i+1) % pts.length], dx = bx-ax, dz = bz-az;
    const t = Math.max(0, Math.min(1, ((x-ax)*dx + (z-az)*dz)/(dx*dx + dz*dz || 1))); best = Math.min(best, Math.hypot(x - ax - dx*t, z - az - dz*t)); }
  return best; }
// A random spot at least `margin` inside the outline, near (cx, cz) if given.
function spotIn(R, pts, margin, cx = 0, cz = 0, rad = Infinity){
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const x0 = Math.max(Math.min(...xs), cx - rad), x1 = Math.min(Math.max(...xs), cx + rad), z0 = Math.max(Math.min(...zs), cz - rad), z1 = Math.min(Math.max(...zs), cz + rad);
  for (let k=0;k<200;k++){ const x = x0 + R()*(x1 - x0), z = z0 + R()*(z1 - z0); if (Math.hypot(x - cx, z - cz) <= rad && depthIn(pts, x, z) >= margin) return [x, z]; }
  return null;
}
const flags = []; // city harbor flags, recolored when an island changes hands
ISLANDS.forEach((is, i) => {
  const R = rng(i*977+13), g = new T.Group(); g.position.set(is.x, 0, is.y);
  const [beach, grass, hill] = is.tiers, size = Math.sqrt(is.area);
  const ht = is.port ? 12 : Math.min(26, 9 + size*.02), top = 4 + ht, hillTop = top + Math.min(46, 12 + size*.03);
  is.ht = hill ? hillTop : top;
  g.add(slab(beach, -14, 4, '#e6d29c'));
  if (grass) g.add(slab(grass, 4, top, is.trees || is.port || is.frame ? '#76883c' : '#8a8a74'));
  if (hill) g.add(slab(hill, top, hillTop, '#8a8a74'));
  // a few rocks along the shore
  for (let k=0;k<Math.min(8, 3 + size/300);k++){ const [x, z] = beach[Math.floor(R()*beach.length)], s = 7 + R()*10, rock = mesh(new T.DodecahedronGeometry(s, 0), '#9a9483');
    rock.position.set(x*1.02, 1, z*1.02); rock.rotation.set(R()*3, R()*3, 0); g.add(rock); }
  // trees: on the grass, or on the hilltop if they land there
  is.treeObjs = [];
  const ground = grass || beach, treeAt = ([x, z]) => hill && inPoly(hill, x, z) ? hillTop : top;
  for (let k=0;k<is.trees;k++){ const p = spotIn(R, ground, 10, 0, 0, size*.45) || spotIn(R, ground, 4) || [0, 0], c = cypress();
    c.position.set(p[0], treeAt(p), p[1]); c.scale.setScalar(.85 + R()*.35); g.add(c); is.treeObjs.push(c); }
  if (!is.trees && !is.port && !is.frame){ const c = cypress(); c.position.set(0, treeAt([0, 0]), 0); c.scale.setScalar(.7); g.add(c); }
  // the mainland gets scattered trees too, just for looks
  if (is.frame) for (let k=0;k<Math.min(60, is.area/90000);k++){ const p = spotIn(R, ground, 20); if (!p) break; const c = cypress(); c.position.set(p[0], treeAt(p), p[1]); g.add(c); }
  if (is.harbor) buildTown(is, g, top, R, ground, is.harbor.pier, hill);
  scene.add(g);
});

// A harbor town: the pier, houses, temple and townspeople. Kallisto also gets Poseidon's statue; city harbors fly their owner's flag.
function buildTown(is, g, top, R, groundAll, PIER, hill){
  const px = PIER.x - is.x, pz = PIER.y - is.y, ang = Math.atan2(PIER.dy, PIER.dx);
  // houses stay on the flat grass, off the hilltop
  const ground = groundAll, off = hill ? (x, z) => inPoly(hill, x, z) : () => false, flat = (p, m) => p && !off(p[0], p[1]) && depthIn(ground, p[0], p[1]) >= m;
  // the town sits on the widest ground near the pier
  let cx = px - PIER.dx*60, cz = pz - PIER.dy*60, best = 0;
  for (let k=0;k<300;k++){ const p = spotIn(R, ground, 1, px, pz, 260); if (!p) continue; const d = depthIn(ground, p[0], p[1]); if (d > best){ best = d; cx = p[0]; cz = p[1]; } }
  const houses = [];
  for (let k=0;k<90 && houses.length<(is.port ? 7 : 5);k++){ const p = spotIn(R, ground, 14, cx, cz, 120); if (flat(p, 14) && houses.every(([hx, hz]) => Math.hypot(hx - p[0], hz - p[1]) > 30)) houses.push(p); }
  houses.forEach(([x, z], k) => { const h = house(k % 2); h.position.set(x, top, z); h.rotation.y = -ang + (R()-.5)*.4; g.add(h); });
  const keep = [...houses];
  // the temple on the highest, widest ground a little away from the houses; the statue by the pier
  let tp = null; for (let k=0;k<80 && !tp;k++){ const p = spotIn(R, ground, 24, cx, cz, 230); if (flat(p, 24) && houses.every(([hx, hz]) => Math.hypot(hx - p[0], hz - p[1]) > 46)) tp = p; }
  if (tp){ const t = temple(); t.position.set(tp[0], top, tp[1]); t.scale.setScalar(.8); t.rotation.y = -ang; g.add(t); keep.push(tp, [tp[0] + 18, tp[1]], [tp[0] - 18, tp[1]]); }
  let sp = null; for (let k=0;k<60 && !sp;k++){ const p = spotIn(R, ground, 8, px - PIER.dx*30, pz - PIER.dy*30, 60); if (p && keep.every(([hx, hz]) => Math.hypot(hx - p[0], hz - p[1]) > 24)) sp = p; }
  if (!is.port && sp){ // a flagpole by the pier with the owner's colors
    const pole = mesh(new T.CylinderGeometry(1, 1.2, 46, 5), '#6e4a26'); pole.position.set(sp[0], top + 23, sp[1]); g.add(pole);
    const flag = new T.Mesh(new T.PlaneGeometry(22, 14), new T.MeshBasicMaterial({color:CITIES[is.city || 'athens'].color, side:T.DoubleSide}));
    flag.position.set(sp[0] + 11, top + 39, sp[1]); g.add(flag); flags.push({is, flag, c:is.city}); sp = null; }
  if (sp){ const st = statue('poseidon', 'painted'); st.position.set(sp[0], top, sp[1]); st.scale.setScalar(.55); st.rotation.y = -ang + Math.PI/2; g.add(st); keep.push(sp); }
  addTown(is, g, top, keep, is.port ? 9 : 6, {cx, cz, R:130, ok:(x, z) => depthIn(ground, x, z) > 8 && !off(x, z)});
  // the pier: starts a little inland and runs out over the water
  const pier = new T.Group(); pier.position.set(px, 0, pz); pier.rotation.y = -ang; g.add(pier);
  const deck = mesh(new T.BoxGeometry(PIER_LEN + 30, 3, 18), '#9b6b3a'); deck.position.set(PIER_LEN/2 - 15, 6, 0); pier.add(deck);
  for (let k=0;k<=5;k++) for (const z of [-8, 8]){ const post = mesh(new T.CylinderGeometry(1.4, 1.4, 16, 5), '#6e4a26'); post.position.set(k*PIER_LEN/5, 1, z); pier.add(post); }
}
export function refreshTrees(is){ is.treeObjs.forEach((c, k) => { const alive = k < is.stock; c.userData.live.forEach(m => m.visible = alive); c.userData.stump.visible = !alive; }); }
export function refreshAllTrees(){ ISLANDS.forEach(i => i.trees && refreshTrees(i)); }

// ---- fishing spots ----
const ringGeo = new T.RingGeometry(10, 13.5, 20); ringGeo.rotateX(-Math.PI/2);
const fishGeo = new T.ConeGeometry(1.8, 8, 5); fishGeo.rotateZ(-Math.PI/2);
SPOTS.forEach((s, i) => {
  const g = new T.Group(); g.position.set(s.x, 0, s.y);
  s.rings = [0,1].map(() => { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({color:0xf4fbff, transparent:true, opacity:.5, depthWrite:false})); g.add(m); return m; });
  s.fish = [0,1,2].map(k => { const f = mesh(fishGeo, s.kind === 'swordfish' ? '#5f86a8' : '#8fb0c4', {metalness:.3, roughness:.4}); f.userData.ph = hash(i,k); f.userData.ang = hash(k,i)*6.28; g.add(f); return f; });
  s.g = g; scene.add(g);
});

// ---- wrecks + gulls ----
WRECKS.forEach((w, i) => {
  const g = wreckModel(); g.position.set(w.x, w.stock ? 0 : -60, w.y); g.rotation.y = w.rot;
  w.bob = g.userData.bob;
  w.gulls = [0,1,2,3].map(k => { const gl = gull(); Object.assign(gl.userData, {R:34 + k*12, h:70 + k*9, sp:(.5 + hash(i,k)*.4) * (k%2 ? 1 : -1), a:k*1.7}); scene.add(gl); return gl; });
  w.g = g; scene.add(g);
});

// ---- wake ----
const wakeGeo = new T.CircleGeometry(1, 8); wakeGeo.rotateX(-Math.PI/2);
const WAKE = Array.from({length:40}, () => { const m = new T.Mesh(wakeGeo, new T.MeshBasicMaterial({color:0xf4fbff, transparent:true, opacity:0, depthWrite:false})); m.visible = false; scene.add(m); return {m, life:0}; });
let wakeI = 0, wakeLast = {x:0, y:0};
export function spawnWake(){
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
document.addEventListener('crew', () => showFleet(G.settings.dev.fleet));

// ---- dockhands and mooring lines, for the docking animation ----
const ropeGeo = new T.CylinderGeometry(.7, .7, 1, 4); ropeGeo.translate(0, .5, 0);
const UP = new T.Vector3(0, 1, 0), tmpV = new T.Vector3();
const hands = ['#3f6c94', '#c64a3c'].map(c => { const f = figure(c), rope = mesh(ropeGeo, '#d9c49a'); rope.castShadow = false; rope.visible = false; scene.add(f, rope); return {f, rope, k:0}; });
let lastPier = PIER;
function animateDock(dt, t){
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
export function swapBoat(){ if (boat) scene.remove(boat); const sh = SHIPS[G.S.tier]; boat = buildShip(sh.model, {...G.S.look, ...(G.S.crewName ? {} : {flag:'none'}), ram:lvl('ram'), plate:lvl('hull')}, G.settings.dev.crew); // no flag until you found a crew
  boat.userData.fire = makeFire(sh.len, sh.beam, SPECS[sh.model].H*.9); boat.add(boat.userData.fire); scene.add(boat); }

export function animateEntities(dt){
  const S = G.S, t = G.t, sh = SHIPS[S.tier];
  const wh = waveAt(S.x, S.y, t);
  const fx = Math.cos(S.a)*sh.len*.4, fz = Math.sin(S.a)*sh.len*.4;
  const pitch = (waveAt(S.x+fx, S.y+fz, t) - waveAt(S.x-fx, S.y-fz, t)) / (sh.len*.8);
  const roll = (waveAt(S.x-fz*.5, S.y+fx*.5, t) - waveAt(S.x+fz*.5, S.y-fx*.5, t)) / (sh.len*.4);
  // hits and volleys rock the boat; sinking lists it over and pulls it under
  G.kick = Math.max(0, (G.kick || 0) - dt*.5);
  // leaning out of a fast turn, like a real boat heeling over: more turn and more speed, more lean
  G.heel = (G.heel || 0) + (Math.max(-.22, Math.min(.22, -(G.turnRate || 0)*G.v/sh.speed*.12)) - (G.heel || 0))*Math.min(1, dt*3);
  const sp = G.sinking ? sinkPose(G.sinking.t, G.sinking.side, sh.len) : {depth:0, roll:0, pitch:0, done:false};
  boat.visible = !sp.done;
  boat.position.set(S.x, wh + sh.len*.05 - sp.depth, S.y);
  boat.rotation.order = 'YXZ'; boat.rotation.y = -S.a; boat.rotation.z = Math.atan(pitch) + sp.pitch; boat.rotation.x = Math.atan(roll)*.8 + sp.roll + Math.sin(G.kick*50)*G.kick + G.heel;
  boat.userData.firing = !!G.firing;
  animateShip(boat, t, G.v);
  updateFire(boat.userData.fire, burn(S.hull, ship().hull), t);
  for (const f of fleet) animateShip(f, t, 0);
  animateDock(dt, t);

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
      u.wings.forEach(({p, s}) => p.rotation.x = s*Math.sin(t*7 + k*2)*.5); });
  }
  for (const w of WAKE){ if (!w.m.visible) continue; w.life -= dt*.55; if (w.life <= 0){ w.m.visible = false; continue; }
    w.m.scale.setScalar(4 + (1-w.life)*14); w.m.material.opacity = w.life*.45; w.m.position.y = waveAt(w.m.position.x, w.m.position.z, t) + .8; }
}
