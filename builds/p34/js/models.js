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
// A round, soft gull: a fat body, a round head, a little orange beak, wings with dark tips that flap.
export function gull(){ const g = new T.Group();
  const body = mesh(ballGeo, '#f6f6f2', {flatShading:false}, false); body.scale.set(4.2, 2, 2.2); g.add(body);
  const head = mesh(ballGeo, '#f6f6f2', {flatShading:false}, false); head.scale.setScalar(1.7); head.position.set(3.8, 1.1, 0); g.add(head);
  const beak = mesh(new T.ConeGeometry(.55, 2, 6), '#e0a030', {}, false); beak.rotation.z = -Math.PI/2; beak.position.set(6, .9, 0); g.add(beak);
  const tail = mesh(new T.ConeGeometry(1.4, 3, 4), '#ecebe6', {}, false); tail.rotation.z = Math.PI/2; tail.scale.z = .4; tail.position.x = -5; g.add(tail);
  const wings = [1, -1].map(s => { const p = new T.Group(); const w = mesh(ballGeo, '#ecebe6', {flatShading:false}, false); w.scale.set(2.4, .4, 5.4); w.position.z = s*5; p.add(w);
    const tip = mesh(ballGeo, '#3a3a3a', {flatShading:false}, false); tip.scale.set(1.5, .42, 2.2); tip.position.set(-.4, 0, s*10); p.add(tip); g.add(p); return {p, s}; });
  g.userData.wings = wings; return g; }
// ---- models: soft rounded shapes, nose along +x ----
export function whaleModel(){
  const g = new T.Group(), body = new T.Group(); g.add(body);
  const b = mesh(new T.SphereGeometry(1, 14, 10), '#4d6d86'); b.scale.set(62, 17, 20); body.add(b);
  const belly = mesh(new T.SphereGeometry(1, 12, 8), '#c9d3d6'); belly.scale.set(50, 9, 15); belly.position.set(6, -8, 0); body.add(belly);
  const head = mesh(new T.SphereGeometry(1, 12, 8), '#4d6d86'); head.scale.set(26, 15, 18); head.position.set(40, 1, 0); body.add(head);
  for (const s of [-1, 1]){ const fin = mesh(new T.SphereGeometry(1, 8, 6), '#3d5a72'); fin.scale.set(13, 2.5, 6); fin.position.set(18, -8, s*20); fin.rotation.y = s*.5; body.add(fin);
    const eye = mesh(new T.SphereGeometry(1.6, 6, 4), '#1d2633'); eye.position.set(46, 3, s*15.5); body.add(eye); }
  const tail = new T.Group(); tail.position.set(-58, 2, 0); body.add(tail);
  const stock = mesh(new T.SphereGeometry(1, 10, 6), '#4d6d86'); stock.scale.set(20, 8, 9); stock.position.x = -8; tail.add(stock);
  for (const s of [-1, 1]){ const fluke = mesh(new T.SphereGeometry(1, 10, 6), '#3d5a72'); fluke.scale.set(10, 2.2, 18); fluke.position.set(-24, 0, s*14); fluke.rotation.y = s*.45; tail.add(fluke); }
  // the spout: a few white puffs that rise and fade
  const spout = []; for (let k=0;k<7;k++){ const p = mesh(new T.SphereGeometry(5, 6, 4), '#f4fbff', {transparent:true, opacity:.8}, false); p.material = p.material.clone(); p.visible = false; g.add(p); spout.push(p); }
  g.userData = {body, tail, spout};
  return g;
}
export function dolphinModel(){
  const g = new T.Group();
  const b = mesh(new T.SphereGeometry(1, 10, 8), '#7f94a6'); b.scale.set(14, 4.5, 4.5); g.add(b);
  const belly = mesh(new T.SphereGeometry(1, 8, 6), '#e3e8ea'); belly.scale.set(11, 2.6, 3.6); belly.position.y = -2; g.add(belly);
  const nose = mesh(new T.SphereGeometry(1, 6, 4), '#7f94a6'); nose.scale.set(5, 1.6, 1.6); nose.position.x = 15; g.add(nose);
  const fin = mesh(new T.ConeGeometry(2.6, 7, 4), '#6b8194'); fin.position.set(-1, 5, 0); fin.rotation.z = .5; g.add(fin);
  const tail = mesh(new T.SphereGeometry(1, 6, 4), '#6b8194'); tail.scale.set(2.5, 1, 6); tail.position.x = -15; g.add(tail);
  return g;
}

// An iceberg: a big flat-topped slab of ice with a taller peak, a pale-blue skirt under the water line. R = a random source.
export function icebergModel(r, R = Math.random){
  const g = new T.Group(), sides = 6 + Math.floor(R()*3), ice = ['#f4f9fb', '#dbeef5'];
  const skirt = mesh(new T.CylinderGeometry(r*1.15, r*1.3, 10, sides), '#9fd3e6'); skirt.position.y = -4; g.add(skirt);
  const slab = mesh(new T.CylinderGeometry(r*.9, r*1.05, r*.35, sides), ice[0]); slab.position.y = r*.15; slab.rotation.y = R()*3; g.add(slab);
  const peak = mesh(new T.CylinderGeometry(r*.25, r*.55, r*.7, sides - 1), ice[1]); peak.position.set((R() - .5)*r*.4, r*.6, (R() - .5)*r*.4); peak.rotation.y = R()*3; g.add(peak);
  const tip = mesh(new T.ConeGeometry(r*.25, r*.35, sides - 1), ice[0]); tip.position.set(peak.position.x, r*1.12, peak.position.z); g.add(tip);
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
