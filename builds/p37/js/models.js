// Low-poly 3D models, built from simple shapes. The art pass (roadmap step 7) replaces these.
import {hash} from './world.js';

const T = window.THREE;
import {mat} from './ships.js';
export const M = (c, o={}) => mat(c, o); // one shared material style for the whole world
// smooth = rounded shading for round things (trees, pots) instead of flat facets
export function mesh(geo, color, o={}, shadow=true){ const m = new T.Mesh(geo, M(color, o)); m.castShadow = shadow; m.receiveShadow = true; return m; }
export function jitter(geo, amt, seed){
  const p = geo.attributes.position;
  for (let i=0;i<p.count;i++){ const x = p.getX(i), z = p.getZ(i); if (!x && !z) continue;
    const k = 1 + (hash(Math.round(Math.atan2(z,x)*100), seed + Math.round(p.getY(i))) - .5)*amt; p.setX(i, x*k); p.setZ(i, z*k); }
  geo.computeVertexNormals(); return geo;
}

// ---- island pieces ----
// Tree colors: cypress greens, and round trees in spring and autumn colors (blossom pink, orange, gold, lilac, lime).
export const CYPRESS_TINTS = [['#3f5524', '#4b6429'], ['#35603a', '#447546'], ['#56682a', '#667a33'], ['#2f4d3a', '#3d6048']];
export const ROUND_TINTS = [['#e9a3bd', '#f3c2d3'], ['#e39a3a', '#efb85a'], ['#d8c24a', '#e8d870'], ['#a88cc9', '#c2abdd'], ['#86ad4a', '#a2c45e'], ['#5f8f3a', '#77a748'], ['#d66a4a', '#e78a62']];
// A Mediterranean cypress: a tall slim flame of leaves, widest low down, with soft tufts all over it and a darker inside.
// Snowy cypresses (tint[1] white) have snow lying on the tops of the tufts. One shared shape per tint and variant.
const cypGeos = {};
function cypressGeo(tint, v){ const key = tint.join() + v; if (cypGeos[key]) return cypGeos[key];
  const prof = new T.SplineCurve([[0, 0], [4.6, 1.5], [6.6, 6], [7.2, 12], [6.8, 20], [5.6, 30], [3.9, 40], [2, 48], [0, 54]].map(([r, y]) => new T.Vector2(r, y))).getPoints(40);
  const geo = new T.LatheGeometry(prof, 22), p = geo.attributes.position, col = new Float32Array(p.count*3);
  const snow = tint[1] === '#f4f8fa', D = new T.Color(tint[0]).multiplyScalar(.72), L = new T.Color(snow ? tint[0] : tint[1]), S = new T.Color('#f4f8fa'), c = new T.Color();
  const tuft = (a, y) => Math.sin(a*4 + y*.4 + v)*Math.sin(y*.46 - a*2 + v*2) + .35*Math.sin(a*7 - y*.8 + v*3); // leafy lumps
  for (let i=0;i<p.count;i++){ const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), r = Math.hypot(x, z);
    const k = 1 + tuft(a, y)*.14*Math.min(1, y/6), lean = Math.sin(y*.08 + v)*.6;
    p.setX(i, x*k + lean); p.setZ(i, z*k); }
  geo.computeVertexNormals();
  const n = geo.attributes.normal;
  for (let i=0;i<p.count;i++){ const y = p.getY(i), x = p.getX(i), z = p.getZ(i), t = tuft(Math.atan2(x, z), y);
    c.copy(D).lerp(L, Math.min(1, Math.max(0, .45 + t*.35 + y/110))); // the tufts catch the light, the hollows stay dark
    if (snow && n.getY(i) > .12 && t > -.3) c.lerp(S, Math.min(1, (n.getY(i) - .12)*3.5)); // snow on the tops of the tufts
    col.set([c.r, c.g, c.b], i*3); }
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  return cypGeos[key] = geo; }
const trunkGeo = new T.CylinderGeometry(1.3, 2, 7, 8);
let cypN = 0;
export function cypress(tint = CYPRESS_TINTS[0]){ const g = new T.Group();
  const tr = mesh(trunkGeo, '#6b4a2b', {flatShading:false}); tr.position.y = 3.5; g.add(tr);
  const c = mesh(cypressGeo(tint, cypN++ % 3), '#ffffff', {vertexColors:true, flatShading:false}); c.position.y = 4.5; c.rotation.y = cypN*1.7; g.add(c);
  const stump = mesh(new T.CylinderGeometry(2.4, 2.8, 4, 8), '#8a6a3c'); stump.position.y = 2; stump.visible = false; g.add(stump);
  g.userData = {live:[tr, c], stump}; return g; }
// A round, fluffy tree (olive, almond, fig): a short trunk and a cluster of balls.
const ballGeo = new T.IcosahedronGeometry(1, 3);
export function roundTree(tint = ROUND_TINTS[0], seed = 0){ const g = new T.Group();
  const tr = mesh(new T.CylinderGeometry(1.6, 2.4, 14, 5), '#6b4a2b'); tr.position.y = 7; g.add(tr);
  const live = [tr];
  [[0, 22, 0, 10], [6, 18, 3, 7], [-5, 19, -3, 7.5], [1, 28, -2, 6.5]].forEach(([x, y, z, r], i) => { const b = mesh(ballGeo, tint[i % 2], {flatShading:false}); b.position.set(x, y, z); b.scale.setScalar(r*(.9 + ((seed*7 + i*3) % 5)*.05)); g.add(b); live.push(b); });
  const stump = mesh(new T.CylinderGeometry(2.4, 2.8, 4, 6), '#8a6a3c'); stump.position.y = 2; stump.visible = false; g.add(stump);
  g.userData = {live, stump}; return g; }
// Houses: kind 0 white with a flat roof, 1 with a blue dome, 2 cream with a red tile roof, 3 two floors with a terrace.
// Doors and shutters in blue or green; a little window either side of the door.
export function house(kind = 0){ if (kind === true) kind = 1; if (kind === false) kind = 0; const g = new T.Group();
  const wall = kind === 2 ? '#efe2c4' : '#f4f1e8', trim = kind === 2 ? '#3f7a52' : '#2c5fa8';
  const b = mesh(new T.BoxGeometry(22, 16, 20), wall); b.position.y = 8; g.add(b);
  const door = mesh(new T.BoxGeometry(.6, 8, 5), trim, {}, false); door.position.set(11.2, 4, 0); g.add(door);
  for (const z of [-6.5, 6.5]){ const w = mesh(new T.BoxGeometry(.6, 3.6, 3.2), trim, {}, false); w.position.set(11.2, 10, z); g.add(w); }
  if (kind === 1){ const d = mesh(new T.SphereGeometry(8, 10, 5, 0, Math.PI*2, 0, Math.PI/2), '#2c5fa8'); d.position.y = 16; g.add(d); }
  if (kind === 2){ const r = mesh(new T.CylinderGeometry(.01, 15.5, 7, 4, 1), '#c4643a'); r.rotation.y = Math.PI/4; r.scale.set(1, 1, .9); r.position.y = 19.5; g.add(r); }
  if (kind === 3){ const up = mesh(new T.BoxGeometry(12, 10, 14), wall); up.position.set(-4, 21, 0); g.add(up);
    const rail = mesh(new T.BoxGeometry(9, 2, 20), '#e4dccb'); rail.position.set(6.5, 17, 0); g.add(rail);
    const w2 = mesh(new T.BoxGeometry(.6, 4, 3.4), trim, {}, false); w2.position.set(2.2, 22, 0); g.add(w2); }
  return g; }
export function temple(){ const g = new T.Group();
  const base = mesh(new T.BoxGeometry(44, 4, 30), '#e9e2cf'); base.position.y = 2; g.add(base);
  for (let i=0;i<4;i++) for (const z of [-11, 11]){ const c = mesh(new T.CylinderGeometry(1.8, 2, 22, 7), '#f4f1e8'); c.position.set(-16 + i*10.7, 15, z); g.add(c); }
  const roof = mesh(new T.CylinderGeometry(0, 26, 10, 4, 1), '#d9cfb6'); roof.rotation.y = Math.PI/4; roof.scale.set(1, 1, .72); roof.position.y = 31; g.add(roof);
  const lint = mesh(new T.BoxGeometry(44, 3, 28), '#e9e2cf'); lint.position.y = 27; g.add(lint);
  return g; }

// ---- little farms around the towns: a vineyard, an olive grove, a wheat field or a vegetable garden inside a low stone wall ----
// Each farm is one merged mesh (colors per vertex), so a town full of them stays cheap to draw.
const FARM_KINDS = ['vines', 'olives', 'wheat', 'garden'];
const farmGeos = {};
const blobGeo = new T.IcosahedronGeometry(1, 2), boxGeo = new T.BoxGeometry(1, 1, 1), stemGeo = new T.CylinderGeometry(.5, .7, 1, 8);
function mergeParts(parts){
  const gs = parts.map(([geo, c, m]) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m); return [g, new T.Color(c)]; });
  const n = gs.reduce((a, [g]) => a + g.attributes.position.count, 0), pos = new Float32Array(n*3), nor = new Float32Array(n*3), col = new Float32Array(n*3);
  let o = 0; for (const [g, c] of gs){ const k = g.attributes.position.count; pos.set(g.attributes.position.array, o*3); nor.set(g.attributes.normal.array, o*3);
    for (let i=0;i<k;i++) col.set([c.r, c.g, c.b], (o + i)*3); o += k; }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('color', new T.BufferAttribute(col, 3)); return out; }
const at = (x, y, z, sx, sy, sz, ry = 0) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(sx, sy, sz));
function farmGeo(kind){ if (farmGeos[kind]) return farmGeos[kind];
  const P = [], L = 46, W = 34;
  P.push([boxGeo, {vines:'#9a7650', olives:'#b0925e', wheat:'#b8913f', garden:'#8a6544'}[kind], at(0, .6, 0, L, 1.2, W)]);
  for (const sg of [1, -1]){ P.push([boxGeo, '#d8ccb0', at(0, 1.6, sg*(W/2 + .8), L + 3.2, 3, 1.6)]); P.push([boxGeo, '#d1c4a6', at(sg*(L/2 + .8), 1.6, sg > 0 ? -5 : 0, 1.6, 3, sg > 0 ? W - 10 : W)]); } // a gap in one wall, the gate
  if (kind === 'vines') for (let r=0;r<5;r++){ const z = -12 + r*6;
    P.push([blobGeo, r % 2 ? '#5f8a35' : '#557f30', at(0, 3.4, z, 19, 2.4, 1.7)]);
    for (let k=0;k<5;k++) P.push([blobGeo, '#6b3a74', at(-14 + k*7 + (r % 2)*3, 2.6, z + (k % 2 ? 1.4 : -1.4), .9, 1.2, .9)]); }
  if (kind === 'olives') for (let i=0;i<3;i++) for (let j=0;j<2;j++){ const x = -14 + i*14 + j*3, z = -7 + j*14;
    P.push([stemGeo, '#7a5a3a', at(x, 4, z, 1.2, 6, 1.2)]); P.push([blobGeo, (i + j) % 2 ? '#8fa060' : '#9cab6c', at(x, 9.5, z, 5.4, 4.2, 5.4)]); }
  if (kind === 'wheat') for (let r=0;r<6;r++) P.push([boxGeo, r % 2 ? '#d8b350' : '#cca646', at(0, 2.2, -12.5 + r*5, 42, 2.2 + (r % 3)*.3, 3.6)]);
  if (kind === 'garden') for (let r=0;r<4;r++) for (let k=0;k<7;k++){ const melon = r === 3 && k % 2 === 0;
    P.push([blobGeo, melon ? '#e09a3a' : r % 2 ? '#7fb04a' : '#6aa040', at(-18 + k*6, 2.4, -10.5 + r*7, melon ? 2 : 1.8, melon ? 1.6 : 1.5, melon ? 2 : 1.8)]); }
  return farmGeos[kind] = mergeParts(P); }
export function farm(kind = 'vines'){ if (typeof kind === 'number') kind = FARM_KINDS[kind % FARM_KINDS.length];
  const m = mesh(farmGeo(kind), '#ffffff', {vertexColors:true, flatShading:false}); m.userData.kind = kind; return m; }

// ---- boats (wreck hulls; the player's ships come from ships.js) ----
function hullShape(L, B, scale=1){ const s = new T.Shape(), l = L*scale, b = B*scale;
  s.moveTo(l/2, 0); s.quadraticCurveTo(l*.1, b/2, -l*.42, b*.38); s.lineTo(-l*.46, 0); s.lineTo(-l*.42, -b*.38); s.quadraticCurveTo(l*.1, -b/2, l/2, 0); return s; }
function extrude(shape, depth){ const g = new T.ExtrudeGeometry(shape, {depth, bevelEnabled:false, curveSegments:5}); g.rotateX(-Math.PI/2); return g; }
export function makeHull(L, B, H, dark, light){
  const g = new T.Group();
  const hull = mesh(extrude(hullShape(L, B), H), dark); hull.position.y = -H*.55; g.add(hull);
  const deck = mesh(extrude(hullShape(L, B, .9), 1), light); deck.position.y = H*.45; g.add(deck);
  const rim = hullShape(L, B); rim.holes.push(hullShape(L*.86, B*.8)); const r = mesh(extrude(rim, 3.5), dark); r.position.y = H*.45; g.add(r);
  for (const s of [1, -1]){ // painted eyes on the bow, like real Greek ships
    const e = mesh(new T.CircleGeometry(2.4, 10), '#f4f1e8', {side:T.DoubleSide}, false); e.position.set(L*.3, H*.15, s*(B*.21+.6)); e.rotation.y = s > 0 ? .5 : Math.PI - .5; g.add(e);
    const pu = mesh(new T.CircleGeometry(1.2, 8), '#1a1a1a', {side:T.DoubleSide}, false); pu.position.copy(e.position); pu.position.z += s*.15; pu.position.x += .4; pu.rotation.y = e.rotation.y; g.add(pu);
  }
  return g;
}
// ---- wreck props ----
export const amphoraGeo = new T.LatheGeometry([[0,0],[3,1],[5,4],[5.5,8],[4,12],[2,14],[2,17],[3.2,18]].map(([x,y]) => new T.Vector2(x,y)), 14);
// ---- sea life: smooth bodies turned on a lathe (nose along +x), dark on top and pale underneath, with soft fins ----
// prof = [[x, radius], ...] from tail to nose. ys/zs squash the body up-down and side to side (applied as mesh scale so the
// shading stays smooth). top/belly = colors, blended along the sides.
const smooth = (pts, n = 16) => new T.SplineCurve(pts.map(([x, y]) => new T.Vector2(x, y))).getPoints(n).map(v => [v.x, v.y]);
// Animals get smooth, slightly glossy shading instead of the banded look of boats and houses, so they read as soft and wet.
const softs = {};
const softMat = (color, vc = false) => softs[color + vc] || (softs[color + vc] = new T.MeshPhongMaterial({color:vc ? '#ffffff' : color, vertexColors:vc, shininess:18, specular:new T.Color('#2a3036')}));
const soft = (geo, color) => { const m = new T.Mesh(geo, softMat(color)); m.castShadow = m.receiveShadow = true; return m; };
function latheBody(prof, top, belly, ys = 1, zs = 1, seg = 24, line = -.15){
  prof = smooth(prof, 48); // a smooth outline from tail to nose, so the body has no corners along its length
  const geo = new T.LatheGeometry(prof.map(([x, r]) => new T.Vector2(Math.max(r, .001), x)), seg); geo.rotateZ(-Math.PI/2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count*3), A = new T.Color(top), B = new T.Color(belly), c = new T.Color();
  const rAt = x => { for (let i=1;i<prof.length;i++) if (x <= prof[i][0]){ const [x0, r0] = prof[i-1], [x1, r1] = prof[i]; return r0 + (r1 - r0)*(x - x0)/((x1 - x0) || 1); } return 0; };
  for (let i=0;i<pos.count;i++){ const r = rAt(pos.getX(i)) || 1, k = Math.min(1, Math.max(0, (line - pos.getY(i)/r)/.5)); c.copy(A).lerp(B, k*k*(3 - 2*k)); col.set([c.r, c.g, c.b], i*3); }
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  const m = new T.Mesh(geo, softMat('#ffffff', true)); m.scale.set(1, ys, zs); m.castShadow = m.receiveShadow = true; return m;
}
// a soft flat fin from an outline (points in its own x/y), thickness d, rounded edges
function fin(pts, d, color){
  const sh = new T.Shape(pts.map(([x, y]) => new T.Vector2(x, y)));
  const geo = new T.ExtrudeGeometry(sh, {depth:d, bevelEnabled:true, bevelThickness:d*.45, bevelSize:d*.45, bevelSegments:3, curveSegments:10}); geo.translate(0, 0, -d/2);
  return soft(geo, color);
}
// A gull, kept simple and smooth like the birds in a Ghibli film: a white body, and long wings each made in one piece,
// bent up then gently down like an M, with grey tips.
function wingGeo(){
  const out = smooth([[0, -2.3], [6, -2.1], [11, -1], [14.6, 1], [16.4, 3.2], [12.6, 2.4], [7.5, 2], [3, 2.2], [0, 2.2]], 36);
  const geo = new T.ExtrudeGeometry(new T.Shape(out.map(([x, y]) => new T.Vector2(x, y))), {depth:.22, bevelEnabled:true, bevelThickness:.14, bevelSize:.14, bevelSegments:2, curveSegments:4});
  geo.translate(0, 0, -.11); geo.rotateX(Math.PI/2); geo.rotateY(-Math.PI/2);
  const p = geo.attributes.position, col = new Float32Array(p.count*3), W = new T.Color('#f1f0ec'), G = new T.Color('#5a5f66'), c = new T.Color();
  for (let i=0;i<p.count;i++){ const z = p.getZ(i); p.setY(i, p.getY(i) + 1.9*Math.sin(Math.min(z/6.5, 1)*Math.PI/2) - Math.pow(Math.max(0, z - 6.5), 1.3)*.13);
    const k = Math.min(1, Math.max(0, (z - 11.8)/1.4)); c.copy(W).lerp(G, k); col.set([c.r, c.g, c.b], i*3); }
  geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.computeVertexNormals(); return geo; }
let wingG = null;
export function gull(){ const g = new T.Group();
  g.add(latheBody([[-8, 0], [-6.5, .9], [-3.5, 1.9], [0, 2.3], [3, 2.1], [5, 1.7], [6.4, 1.75], [7.6, 1.5], [8.5, .9], [8.9, 0]], '#f0f0ec', '#ffffff', .95, .95, 20, .3));
  const beak = soft(new T.ConeGeometry(.45, 2.2, 12), '#e0a030'); beak.rotation.z = -Math.PI/2 - .1; beak.position.set(9.6, .1, 0); g.add(beak);
  const tail = fin(smooth([[0, -1.5], [-3.4, -2], [-4, 0], [-3.4, 2], [0, 1.5]], 10), .25, '#e8e8e2'); tail.rotation.x = Math.PI/2; tail.position.x = -7; g.add(tail);
  wingG = wingG || wingGeo();
  const wings = [1, -1].map(sd => { const p = new T.Group(); p.position.set(.6, .9, sd*1.1); p.scale.z = sd; g.add(p);
    const w = new T.Mesh(wingG, softMat('#ffffff', true)); w.castShadow = w.receiveShadow = true; p.add(w); return {p, s:sd}; });
  g.userData.wings = wings; return g; }
// The whale: one long smooth body, dark blue-grey on top and pale underneath, long flippers and wide flukes.
export function whaleModel(){
  const g = new T.Group(), body = new T.Group(); g.add(body);
  body.add(latheBody([[-56, 0], [-54, 3.5], [-44, 7], [-28, 12], [-8, 16.5], [12, 18], [30, 17.5], [44, 15.5], [54, 11.5], [60, 6], [62, 0]], '#4d6d86', '#d3dcdf', .82, 1.08, 30, -.1));
  for (const sd of [-1, 1]){ const f = fin(smooth([[0, -2.5], [12, -4], [24, -6], [26, -3], [14, 1.5], [0, 2.5]], 18), 1.6, '#3f5d74'); f.geometry.rotateX(Math.PI/2); f.geometry.rotateY(-Math.PI/2 - .5); // a long flipper pointing out and back
    const piv = new T.Group(); piv.position.set(22, -8, sd*15); piv.scale.z = sd; piv.rotation.x = sd*.5; piv.add(f); body.add(piv);
    const eye = soft(new T.SphereGeometry(1.4, 10, 8), '#1d2633'); eye.position.set(46, -1, sd*14.8); body.add(eye); }
  const hump = fin(smooth([[4, 0], [-2, 3.2], [-7, 4], [-10, 0]], 12), 2.2, '#456580'); hump.position.set(-24, 10.5, 0); body.add(hump); // a low fin on the back, near the tail
  const tail = new T.Group(); tail.position.set(-52, 1, 0); body.add(tail);
  const fl = fin(smooth([[4, 0], [-4, -6], [-14, -18], [-18, -24], [-11, -16], [-7, -6], [-9, 0], [-7, 6], [-11, 16], [-18, 24], [-14, 18], [-4, 6], [4, 0]], 30), 1.6, '#3f5d74');
  fl.rotation.x = Math.PI/2; tail.add(fl);
  const spout = []; for (let k=0;k<7;k++){ const p = mesh(new T.SphereGeometry(5, 10, 8), '#f4fbff', {transparent:true, opacity:.8, flatShading:false}, false); p.material = p.material.clone(); p.visible = false; g.add(p); spout.push(p); }
  g.userData = {body, tail, spout};
  return g;
}
// A dolphin: a slim smooth body with a short beak, a curved fin on its back, flippers and flukes.
export function dolphinModel(){
  const g = new T.Group();
  g.add(latheBody([[-17, 0], [-15, 1.2], [-10, 2.6], [-3, 4.3], [3, 4.8], [8, 4.2], [11.5, 3.2], [13.5, 2.1], [14.5, 1.3], [17.5, .95], [18.6, 0]], '#7f94a6', '#eef2f3', .9, .85, 24, -.05));
  const df = fin(smooth([[-3, 0], [1, 2.4], [-1.5, 6.2], [-4.2, 7.4], [-4.6, 5], [-6.5, 0]], 18), .7, '#6b8194'); df.position.set(1, 3.4, 0); g.add(df);
  for (const sd of [-1, 1]){ const pf = fin(smooth([[0, 0], [-2.5, -1.5], [-6, -2.2], [-3.5, .8], [0, 1.2]], 12), .5, '#6b8194'); pf.rotation.x = Math.PI/2 + sd*.5; pf.position.set(8, -2.4, sd*3.2); g.add(pf); }
  const fl = fin(smooth([[2, 0], [-2, -2.5], [-5, -6.5], [-3.6, -2.6], [-3.4, 0], [-3.6, 2.6], [-5, 6.5], [-2, 2.5], [2, 0]], 22), .55, '#6b8194');
  fl.rotation.x = Math.PI/2; fl.position.set(-16, .2, 0); g.add(fl);
  return g;
}
// A fish: a smooth, slim body, dark on the back and silver underneath, a forked tail and a fin on top. The swordfish has its sword.
export function fishModel(kind = 'tuna'){
  const g = new T.Group(), sw = kind === 'swordfish', top = kind === 'sardine' ? '#5f8fa8' : sw ? '#3f5f86' : '#33507a';
  g.add(latheBody([[-4.6, 0], [-4, .4], [-2.2, 1.5], [0, 2.1], [2.2, 1.9], [3.8, 1.2], [4.6, 0]], top, '#e6eef2', 1, .55, 24, .05));
  const tail = fin(smooth([[.6, 0], [-1.4, -1.4], [-3, -2.6], [-2.2, -.4], [-2.2, .4], [-3, 2.6], [-1.4, 1.4], [.6, 0]], 16), .2, top); tail.position.x = -4.2; g.add(tail);
  const df = fin(smooth([[1.2, 0], [-.4, 1.8], [-1.6, 2], [-2, 0]], 10), .18, top); df.position.set(.6, 1.8, 0); g.add(df);
  if (sw){ const bill = soft(new T.ConeGeometry(.35, 6, 10), '#2f3f55'); bill.rotation.z = -Math.PI/2; bill.position.x = 7.4; g.add(bill); }
  g.scale.setScalar(1.2); return g;
}

// An iceberg: chunks of ice with sharp facets, a wide flat-topped slab, a tall cracked peak and a smaller chunk at its side.
// The tops are snowy white, the cliffs pale blue, deeper blue near the water, and a turquoise skirt shows under the sea.
const icePos = (x, y, z, s) => Math.sin(x*1.7 + s)*Math.sin(z*1.9 - s) + .6*Math.sin(y*2.3 + x*1.1 + s*2) + .4*Math.sin(z*3.1 + y*1.7 - s);
function iceChunk(r, h, R, top = .75){
  const geo = new T.IcosahedronGeometry(1, 1), p = geo.attributes.position, s = R()*10, sx = .85 + R()*.3, sz = .85 + R()*.3;
  for (let i=0;i<p.count;i++){ let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + icePos(x, y, z, s)*.2;
    x *= k*r*sx; z *= k*r*sz; y = y*k; y = y < -.2 ? -.35 : Math.min(y, top + icePos(z, x, y, s)*.06) ; // a flat bottom and a rough plateau on top
    p.setXYZ(i, x, (y + .35)*h - 8, z); }
  geo.computeVertexNormals(); // the faces stay sharp: every triangle has its own corners, so the ice looks cut
  const n = geo.attributes.normal, col = new Float32Array(p.count*3), W = new T.Color('#f2f8fa'), C = new T.Color('#a9d6e6'), B = new T.Color('#5fa9c8'), c = new T.Color();
  for (let i=0;i<p.count;i++){ const ny = n.getY(i), y = p.getY(i);
    c.copy(C).lerp(W, Math.min(1, Math.max(0, (ny - .55)*3))); if (y < 8) c.lerp(B, Math.min(1, (8 - y)/14)*(1 - Math.max(0, ny))); col.set([c.r, c.g, c.b], i*3); }
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  return mesh(geo, '#ffffff', {vertexColors:true}); }
export function icebergModel(r, R = Math.random){
  const g = new T.Group();
  const skirt = mesh(new T.CylinderGeometry(r*1.12, r*1.3, 8, 18), '#7fd0e0', {transparent:true, opacity:.55, depthWrite:false, flatShading:false}, false); skirt.position.y = -5; g.add(skirt);
  const slab = iceChunk(r, r*.42, R); slab.rotation.y = R()*6; g.add(slab);
  const peak = iceChunk(r*.48, r*1.25, R, .9); peak.position.set((R() - .5)*r*.5, 0, (R() - .5)*r*.5); peak.rotation.y = R()*6; g.add(peak);
  const a = R()*6.28, side = iceChunk(r*.42, r*.5, R); side.position.set(Math.cos(a)*r*.85, 0, Math.sin(a)*r*.85); g.add(side);
  return g;
}
// A shipwreck in three sizes: 'small' (a fishing boat, a snapped mast), 'medium' (a merchant ship with its amphorae
// floating around), 'large' (a warship: long hull, its bronze ram in the air, two broken masts, lots of floating timber).
export function wreckModel(size = 'medium'){
  const g = new T.Group(), bob = [];
  const L = {small:46, medium:80, large:130}[size], B = {small:18, medium:26, large:30}[size], H = {small:10, medium:14, large:18}[size], k = L/80;
  const hull = makeHull(L, B, H, '#4f3a28', '#6d5640'); hull.rotation.set(.45, 0, .22); hull.position.y = -6*k; g.add(hull);
  const masts = size === 'large' ? [[-18, 1], [26, .7]] : [[4, size === 'small' ? .45 : 1]];
  for (const [x, h] of masts){ const mast = mesh(new T.CylinderGeometry(1.4*k, 1.8*k, 46*k*h, 6), '#4a3624'); mast.position.set(x, 14*k*h, -6*k); mast.rotation.set(.7, 0, -.15); g.add(mast);
    if (h > .6){ const rag = mesh(new T.BoxGeometry(.8, 14*k, 18*k), '#cfc6ae'); rag.position.set(x, 26*k*h, -20*k*h); rag.rotation.set(.7, 0, -.15); g.add(rag); } }
  if (size === 'large'){ const ram = mesh(new T.ConeGeometry(4, 22, 4), '#8a6a3c'); ram.rotation.set(0, 0, -1.1); ram.position.set(L*.52, 8, 4); g.add(ram); }
  const R = (i => () => (i = (i*9301 + 49297) % 233280)/233280)(L);
  const nA = {small:1, medium:4, large:3}[size], nP = {small:2, medium:3, large:7}[size];
  for (let i=0;i<nA;i++){ const a = mesh(amphoraGeo, '#b8693a', {flatShading:false}), r = L*.45 + R()*20, an = R()*6.28; a.position.set(Math.cos(an)*r, 0, Math.sin(an)*r); a.rotation.z = 1.4; a.rotation.y = i; g.add(a); bob.push(a); }
  for (let i=0;i<nP;i++){ const p = mesh(new T.BoxGeometry(14 + R()*10, 2, 5), '#7a5a3a'), r = L*.4 + R()*30, an = R()*6.28; p.position.set(Math.cos(an)*r, 0, Math.sin(an)*r); p.rotation.y = R()*3; g.add(p); bob.push(p); }
  g.userData.bob = bob;
  return g;
}
