// Low-poly 3D models, built from simple shapes. The art pass (roadmap step 7) replaces these.
import {hash} from './world.js?v=9b0ba4f';

const T = window.THREE;
import {mat} from './ships.js?v=9b0ba4f';
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
export function cypress(tint = CYPRESS_TINTS[0]){ const g = new T.Group();
  const tr = mesh(new T.CylinderGeometry(1.6, 2.2, 8, 5), '#6b4a2b'); tr.position.y = 4; g.add(tr);
  const c = mesh(new T.ConeGeometry(7, 40, 12), tint[0], {flatShading:false}); c.position.y = 26; g.add(c);
  const c2 = mesh(new T.ConeGeometry(5.5, 22, 12), tint[1], {flatShading:false}); c2.position.y = 40; g.add(c2);
  const stump = mesh(new T.CylinderGeometry(2.4, 2.8, 4, 6), '#8a6a3c'); stump.position.y = 2; stump.visible = false; g.add(stump);
  g.userData = {live:[tr, c, c2], stump}; return g; }
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
export function gull(){ const g = new T.Group();
  g.add(mesh(new T.BoxGeometry(7, 2.2, 2.4), '#f6f6f2', {}, false));
  const head = mesh(new T.BoxGeometry(2, 2, 2), '#f6f6f2', {}, false); head.position.x = 4; g.add(head);
  const beak = mesh(new T.ConeGeometry(.6, 2, 4), '#e0a030', {}, false); beak.rotation.z = -Math.PI/2; beak.position.x = 5.8; g.add(beak);
  const wings = [1, -1].map(s => { const p = new T.Group(); const w = mesh(new T.BoxGeometry(4, .5, 10), '#ecebe6', {}, false); w.position.z = s*5; p.add(w);
    const tip = mesh(new T.BoxGeometry(3, .6, 3), '#3a3a3a', {}, false); tip.position.z = s*10; p.add(tip); g.add(p); return {p, s}; });
  g.userData.wings = wings; return g; }
export function wreckModel(){
  const g = new T.Group();
  const hull = makeHull(80, 26, 14, '#4f3a28', '#6d5640'); hull.rotation.set(.45, 0, .22); hull.position.y = -6; g.add(hull);
  const mast = mesh(new T.CylinderGeometry(1.4, 1.8, 46, 6), '#4a3624'); mast.position.set(4, 14, -6); mast.rotation.set(.7, 0, -.15); g.add(mast);
  const rag = mesh(new T.BoxGeometry(.8, 14, 18), '#cfc6ae'); rag.position.set(4, 26, -20); rag.rotation.set(.7, 0, -.15); g.add(rag);
  const bob = [];
  [[30,10],[-26,-18],[18,-30]].forEach(([x,z], k) => { const a = mesh(amphoraGeo, '#b8693a', {flatShading:false}); a.position.set(x, 0, z); a.rotation.z = 1.4; a.rotation.y = k; g.add(a); bob.push(a); });
  [[-34,16],[40,-8],[-10,34]].forEach(([x,z], k) => { const p = mesh(new T.BoxGeometry(18, 2, 5), '#7a5a3a'); p.position.set(x, 0, z); p.rotation.y = k*1.3; g.add(p); bob.push(p); });
  g.userData.bob = bob;
  return g;
}
