// The harbor of Rhodes (P79): two stone breakwaters with red walkways curve out from Rhodes town around a round basin.
// The marble Colossus (made in Blender, models/colossus.glb) stands astride the harbor mouth, one foot on the end of each
// breakwater, and you sail in between his legs. A round fort with a lighthouse guards the west breakwater, like St Nicholas
// at Rhodes. Just for looks: Rhodes town has no dock. The breakwaters and the fort stop ships; only the mouth is open.
import {ISLANDS, landDist} from './world.js?v=4ae49e1';
import {G} from './state.js?v=4ae49e1';
import {scene} from './scene.js?v=4ae49e1';
import {mat, torch, TORCH_ROOTS} from './ships.js?v=4ae49e1';
import {mergeStatic} from './merge.js?v=4ae49e1';
import {enemies} from './combat.js?v=4ae49e1';
import {marbleColossus, COLOSSUS_BOWL} from './monuments.js?v=4ae49e1';

const T = window.THREE;
const RB = 430, GAP = .36, N = 64, BW = 34, FORT_R = 96; // basin radius, half the mouth (radians), breakwater pieces, walkway width, fort radius
const rhodes = ISLANDS.find(i => i.name === 'Rhodes');
export const HARBOR = (() => { const P = rhodes && rhodes.town && rhodes.town.pier; if (!P) return null;
  return {x:P.x + P.dx*300, y:P.y + P.dy*300, mouth:Math.atan2(P.dy, P.dx)}; })(); // the back of the ring falls on land: two arms reach out from the shore
const angDiff = (a, b) => { const d = a - b; return d - Math.PI*2*Math.floor((d + Math.PI)/(Math.PI*2)); };
const inMouth = a => Math.abs(angDiff(a, HARBOR.mouth)) < GAP - .02;
const pieceAt = a => ((Math.floor(a/(Math.PI*2)*N) % N) + N) % N;
const rnd = (i, k) => Math.abs(Math.sin(i*12.9898 + k*78.233)*43758.5453) % 1;

let hg = null, colossus = null, fort = null, merged = false;
const solid = new Array(N).fill(false), torches = [];

if (HARBOR){
  const g = new T.Group(); g.position.set(HARBOR.x, 0, HARBOR.y); scene.add(g); hg = g; g.userData.torches = torches; TORCH_ROOTS.add(g);
  const stone = mat('#ddd2b8'), ledge = mat('#c9bd9f'), rock = mat('#8f8a80'), core = mat('#a49c8c'), deck = mat('#b9583d'), white = mat('#eee6d6');
  const rockGeo = new T.DodecahedronGeometry(1, 0), at = (a, r = RB) => [Math.cos(a)*r, Math.sin(a)*r];
  const add = (o, parent = g) => { o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => { const o = add(new T.Mesh(new T.BoxGeometry(w, h, d), m), parent); o.position.set(x, y, z); return o; };
  const drum = (r, h, m, x, y, z, seg = 28) => { const o = add(new T.Mesh(new T.CylinderGeometry(r, r*1.03, h, seg), m)); o.position.set(x, y + h/2, z); return o; };
  const boulder = (x, y, z, s, k, parent = g) => { const o = add(new T.Mesh(rockGeo, rock), parent); o.position.set(x, y, z); o.scale.set(s*(1 + rnd(k, 1)*.5), s*(.55 + rnd(k, 2)*.3), s*(1 + rnd(k, 3)*.4)); o.rotation.y = rnd(k, 4)*6; return o; };
  // the fort stands on the west breakwater, a little back from the mouth
  const west = [1, -1].sort((p, q) => Math.cos(HARBOR.mouth + p*(GAP + .45)) - Math.cos(HARBOR.mouth + q*(GAP + .45)))[0];
  const fa = HARBOR.mouth + west*(GAP + .45), [fx, fz] = at(fa); fort = {x:HARBOR.x + fx, y:HARBOR.y + fz};
  // breakwaters: a mound of boulders with a red walkway on top, with a lamp every few steps
  const seg = Math.PI*2*RB/N + 2;
  for (let i=0;i<N;i++){
    const a = (i + .5)/N*Math.PI*2; if (Math.abs(angDiff(a, HARBOR.mouth)) < GAP) continue;
    const [x, z] = at(a); if (landDist(HARBOR.x + x, HARBOR.y + z) < -30) continue;
    solid[i] = true; if (Math.hypot(x - fx, z - fz) < FORT_R - 10) continue;
    const p = new T.Group(); p.position.set(x, 0, z); p.rotation.y = -a + Math.PI/2; g.add(p);
    box(seg, 16, BW + 12, core, 0, -3, 0, p);
    box(seg + 1, 2.4, BW, deck, 0, 6, 0, p);
    for (let k=0;k<6;k++){ const sd = k % 2 ? 1 : -1; boulder((rnd(i, k) - .5)*seg, -1 + rnd(i, k + 9)*3, sd*(BW/2 + 7 + rnd(i, k + 5)*8), 9 + rnd(i, k + 7)*7, i*13 + k, p); }
    if (i % 5 === 2){ const t = torch(); t.position.set(0, 7, BW/2 - 3); t.scale.setScalar(1.2); p.add(t); torches.push(t); }
  }
  // a white plinth at the end of each breakwater, for his feet
  const plinths = [-1, 1].map(s => { const a = HARBOR.mouth + s*GAP, [x, z] = at(a);
    const pl = box(80, 34, 80, white, x, 5, z); pl.rotation.y = -a; box(88, 4, 88, ledge, x, 23, z).rotation.y = -a;
    for (let k=0;k<5;k++) boulder(x + (rnd(s + 3, k) - .5)*110, -2, z + (rnd(s + 7, k) - .5)*110, 12 + rnd(s, k)*8, 90 + s*7 + k);
    return new T.Vector3(x, 25, z); });
  // the round fort: three stepped drums with battlements, a lighthouse turret with its fire on top, boulders all round
  drum(FORT_R, 46, stone, fx, -10, fz, 36); drum(FORT_R + 4, 4, ledge, fx, 34, fz, 36);
  for (let k=0;k<30;k++){ const a = k/30*Math.PI*2; box(9, 9, 9, stone, fx + Math.cos(a)*(FORT_R - 3), 42, fz + Math.sin(a)*(FORT_R - 3)).rotation.y = -a; }
  drum(64, 36, stone, fx, 36, fz, 30); drum(67, 3, ledge, fx, 70, fz, 30);
  for (let k=0;k<20;k++){ const a = k/20*Math.PI*2; box(8, 8, 8, stone, fx + Math.cos(a)*61, 76, fz + Math.sin(a)*61).rotation.y = -a; }
  drum(28, 58, stone, fx - 12, 72, fz + 6, 18); drum(31, 3, ledge, fx - 12, 128, fz + 6, 18);
  for (let k=0;k<10;k++){ const a = k/10*Math.PI*2; box(6, 7, 6, stone, fx - 12 + Math.cos(a)*27, 133, fz + 6 + Math.sin(a)*27); }
  const lx = fx + 26, lz = fz - 22; drum(14, 36, stone, lx, 72, lz, 14); drum(16, 2.5, ledge, lx, 108, lz, 14);
  const roof = add(new T.Mesh(new T.ConeGeometry(17, 18, 14), ledge)); roof.position.set(lx, 126, lz);
  { const t = torch(); t.position.set(lx, 98, lz); t.scale.setScalar(1.8); g.add(t); torches.push(t); }
  for (let k=0;k<22;k++){ const a = k/22*Math.PI*2 + rnd(k, 1)*.2, r = FORT_R + 4 + rnd(k, 2)*14; boulder(fx + Math.cos(a)*r, -3, fz + Math.sin(a)*r, 12 + rnd(k, 3)*10, 200 + k); }
  // the Colossus: loaded from the Blender model, painted with the game's marble, red cloth and gilded bowl
  const mid = plinths[0].clone().add(plinths[1]).multiplyScalar(.5), stance = plinths[0].distanceTo(plinths[1]);
  colossus = marbleColossus(stance, (c, k) => {
    // the fire in his bowl: a torch flame without its pole, sized in game units (the model is scaled by k)
    const fire = torch(), s = 4/k; fire.children.forEach(o => { if (o !== fire.userData.flame) o.visible = false; });
    fire.scale.setScalar(s); fire.position.set(COLOSSUS_BOWL[0], COLOSSUS_BOWL[1] - .25 - 13.4*s, COLOSSUS_BOWL[2]); c.add(fire); torches.push(fire);
  });
  colossus.position.copy(mid); colossus.rotation.y = Math.atan2(Math.cos(HARBOR.mouth), Math.sin(HARBOR.mouth)); // he faces out to sea
  colossus.userData.noMerge = true; g.add(colossus);
}

// ---- breakwaters and the fort: ships can't pass them except through the mouth ----
function push(p, rad){
  const dx = p.x - HARBOR.x, dy = p.y - HARBOR.y, d = Math.hypot(dx, dy) || 1, gap = rad + BW/2 + 14, a = Math.atan2(dy, dx);
  if (Math.abs(d - RB) <= gap && !inMouth(a) && solid[pieceAt(a)]){ const to = d < RB ? RB - gap : RB + gap; p.x = HARBOR.x + dx/d*to; p.y = HARBOR.y + dy/d*to; }
  const fx = p.x - fort.x, fy = p.y - fort.y, fd = Math.hypot(fx, fy) || 1, fr = FORT_R + 16 + rad;
  if (fd < fr){ p.x = fort.x + fx/fd*fr; p.y = fort.y + fy/fd*fr; }
}

export function updateHarbor(dt){
  if (!HARBOR) return;
  const S = G.S, d = Math.hypot(S.x - HARBOR.x, S.y - HARBOR.y), near = d < RB + 900;
  if (near){ push(S, 14); for (const e of enemies) if (!e.dead && Math.abs(e.x - HARBOR.x) < RB + 200 && Math.abs(e.y - HARBOR.y) < RB + 200) push(e, e.spec.beam*.5); }
  if (near && !merged && hg){ merged = true; mergeStatic(hg); }
  // he fades while you sail between and behind his legs, so he never hides your ship
  const mx = HARBOR.x + Math.cos(HARBOR.mouth)*RB, my = HARBOR.y + Math.sin(HARBOR.mouth)*RB, under = Math.hypot(S.x - mx, S.y - my) < 330;
  const k = under ? .3 : 1; for (const m of colossus ? colossus.userData.mats : []){ m.opacity += (k - m.opacity)*Math.min(1, dt*3); m.depthWrite = m.opacity > .9; }
}
