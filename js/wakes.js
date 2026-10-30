// Wakes: every moving ship pushes the water aside. White foam dashes peel off both sides of the bow and spread out in a V,
// and a wider trail stays behind the stern. Drawn as one instanced mesh, so many ships cost little.
import {G, ship} from './state.js?v=957c092';
import {scene} from './scene.js?v=957c092';
import {waveAt} from './world.js?v=957c092';
import {enemies} from './combat.js?v=957c092';

const T = window.THREE;
const MAX = 900;
const geo = new T.CircleGeometry(.5, 10); geo.rotateX(-Math.PI/2);
const mesh = new T.InstancedMesh(geo, new T.MeshBasicMaterial({color:'#f4fbff', transparent:true, opacity:.6, depthWrite:false}), MAX);
mesh.frustumCulled = false; mesh.renderOrder = 1; scene.add(mesh);
const P = [], m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), pos = new T.Vector3(), scl = new T.Vector3();
let free = 0;
function add(x, y, vx, vy, a, w, l, life){ const p = {x, y, vx, vy, a, w, l, life, max:life}; if (P.length < MAX) P.push(p); else P[free++ % MAX] = p; }
const track = new WeakMap();
function emit(o, x, y, a, v, len, beam){
  if (v < 20) return;
  const t = track.get(o) || {x, y, d:0}; t.d += Math.hypot(x - t.x, y - t.y); t.x = x; t.y = y; track.set(o, t);
  const step = 3.5 + len*.015; if (t.d < step) return; t.d = 0;
  const ca = Math.cos(a), sa = Math.sin(a), k = Math.min(1, v/180), spread = v*.32;
  for (const s of [1, -1]){ // bow waves: born at the shoulders of the bow, pushed outward and back
    const bx = x + ca*len*.3 - sa*s*beam*.5, by = y + sa*len*.3 + ca*s*beam*.5;
    add(bx, by, -sa*s*spread - ca*v*.12, ca*s*spread - sa*v*.12, a + s*.45, 2.6 + beam*.1, 16 + len*.08, 1.5 + k*1.3); }
  add(x - ca*len*.5, y - sa*len*.5, -ca*v*.05, -sa*v*.05, a, beam*.6, 16 + len*.1, 1.3 + k); // the trail behind the stern
}
export function updateWakes(dt){
  const S = G.S, sh = ship(), cx = G.cam.x, cy = G.cam.y;
  if (!G.dock) emit(S, S.x, S.y, S.a, G.v, sh.len, sh.beam);
  for (const e of enemies){ if (e.dead || e.fort || Math.abs(e.x - cx) > 1500 || Math.abs(e.y - cy) > 1500) continue; emit(e, e.x, e.y, e.a, e.v, e.spec.len, e.spec.beam); }
  let n = 0;
  for (const p of P){ if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) continue;
    const k = p.life/p.max, damp = Math.exp(-dt*1.4); p.vx *= damp; p.vy *= damp; p.x += p.vx*dt; p.y += p.vy*dt;
    pos.set(p.x, waveAt(p.x, p.y, G.t) + .9, p.y); q.setFromAxisAngle(up, -p.a);
    scl.set(p.l*(1.3 - k*.3), 1, p.w*Math.min(1, k*1.6)*(1 + (1 - k)*.6)); // stretches and thins out as it fades
    m4.compose(pos, q, scl); mesh.setMatrixAt(n++, m4); }
  mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
}
