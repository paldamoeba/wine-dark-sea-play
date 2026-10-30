// Puts the world into the 3D scene and animates it: islands, fishing spots, wrecks, gulls, wake, the player's boat.
import {SHIPS} from './config.js';
import {ISLANDS, SPOTS, WRECKS, PIER_LEN, hash, rng, waveAt} from './world.js';
import {G, ship} from './state.js';
import {scene} from './scene.js';
import {mesh, jitter, cypress, house, temple, gull, wreckModel} from './models.js';
import {buildShip, animateShip, statue} from './ships.js';

const T = window.THREE;

// ---- islands ----
ISLANDS.forEach((is, i) => {
  const R = rng(i*977+13), g = new T.Group(); g.position.set(is.x, 0, is.y);
  const base = mesh(jitter(new T.CylinderGeometry(is.r*.95, is.r*1.12, 30, 12, 1), .22, i), '#e6d29c'); base.position.y = -9; g.add(base);
  const ht = is.port ? 12 : 14 + is.r*.24; is.ht = ht;
  const hill = mesh(jitter(new T.CylinderGeometry(is.r*(is.port ? .6 : .36), is.r*.76, ht, 10, 1), .3, i+50), is.trees || is.port ? '#76883c' : '#8a8a74');
  hill.position.y = 5 + ht/2; g.add(hill);
  for (let k=0;k<3;k++){ const a = R()*6.28, s = 7 + R()*10; const rock = mesh(new T.DodecahedronGeometry(s, 0), '#9a9483');
    rock.position.set(Math.cos(a)*is.r*1.02, 1, Math.sin(a)*is.r*1.02); rock.rotation.set(R()*3, R()*3, 0); g.add(rock); }
  is.treeObjs = [];
  for (let k=0;k<is.trees;k++){ const a = k/is.trees*6.28 + R(), d = is.r*(.08 + R()*.22); const c = cypress();
    c.position.set(Math.cos(a)*d, 5 + ht, Math.sin(a)*d); c.scale.setScalar(.85 + R()*.35); g.add(c); is.treeObjs.push(c); }
  if (!is.trees && !is.port){ const c = cypress(); c.position.set(0, 5+ht, 0); c.scale.setScalar(.7); g.add(c); }
  if (is.port){
    [[-50,-30,1],[-20,-60,0],[15,-35,1],[-55,15,0],[-15,25,1],[40,-70,0],[20,40,0]].forEach(([x,z,d]) => { const h = house(d); h.position.set(x, 5+ht, z); h.rotation.y = (R()-.5)*.4; g.add(h); });
    const tp = temple(); tp.position.set(-10, 5+ht, -110); tp.scale.setScalar(.8); g.add(tp);
    const pos = statue('poseidon', 'painted'); pos.position.set(70, 5+ht, -40); pos.scale.setScalar(.55); g.add(pos); // watches over the harbor
    const pier = mesh(new T.BoxGeometry(PIER_LEN, 3, 18), '#9b6b3a'); pier.position.set(is.r*.85 + PIER_LEN/2, 6, 0); g.add(pier);
    for (let k=0;k<=5;k++) for (const z of [-8, 8]){ const post = mesh(new T.CylinderGeometry(1.4, 1.4, 16, 5), '#6e4a26'); post.position.set(is.r*.85 + k*PIER_LEN/5, 1, z); g.add(post); }
  }
  scene.add(g);
});
export function refreshTrees(is){ is.treeObjs.forEach((c, k) => { const alive = k < is.stock; c.userData.live.forEach(m => m.visible = alive); c.userData.stump.visible = !alive; }); }
export function refreshAllTrees(){ ISLANDS.forEach(i => i.trees && refreshTrees(i)); }

// ---- fishing spots ----
const ringGeo = new T.RingGeometry(10, 13.5, 20); ringGeo.rotateX(-Math.PI/2);
const fishGeo = new T.ConeGeometry(1.8, 8, 5); fishGeo.rotateZ(-Math.PI/2);
SPOTS.forEach((s, i) => {
  const g = new T.Group(); g.position.set(s.x, 0, s.y);
  s.rings = [0,1].map(() => { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({color:0xf4fbff, transparent:true, opacity:.5, depthWrite:false})); g.add(m); return m; });
  s.fish = [0,1,2].map(k => { const f = mesh(fishGeo, s.kind === 'tuna' ? '#8fb0c4' : '#d9e6ee', {metalness:.3, roughness:.4}); f.userData.ph = hash(i,k); f.userData.ang = hash(k,i)*6.28; g.add(f); return f; });
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

// ---- player boat ----
let boat = null;
export function swapBoat(){ if (boat) scene.remove(boat); boat = buildShip(SHIPS[G.S.tier].model, G.S.look, G.settings.dev.crew); scene.add(boat); }

export function animateEntities(dt){
  const S = G.S, t = G.t, sh = SHIPS[S.tier];
  const wh = waveAt(S.x, S.y, t);
  const fx = Math.cos(S.a)*sh.len*.4, fz = Math.sin(S.a)*sh.len*.4;
  const pitch = (waveAt(S.x+fx, S.y+fz, t) - waveAt(S.x-fx, S.y-fz, t)) / (sh.len*.8);
  const roll = (waveAt(S.x-fz*.5, S.y+fx*.5, t) - waveAt(S.x+fz*.5, S.y-fx*.5, t)) / (sh.len*.4);
  boat.position.set(S.x, wh + sh.len*.05, S.y);
  boat.rotation.order = 'YXZ'; boat.rotation.y = -S.a; boat.rotation.z = Math.atan(pitch); boat.rotation.x = Math.atan(roll)*.8;
  animateShip(boat, t, G.v);

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
