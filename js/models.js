// Low-poly 3D models, built from simple shapes. The art pass (roadmap step 7) replaces these.
import {hash} from './world.js?v=957c092';

const T = window.THREE;
import {mat} from './ships.js?v=957c092';
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
// A gull that glides like the birds in a Ghibli film: one smooth white body, long slim wings bent like an M, grey tips.
export function gull(){ const g = new T.Group();
  g.add(latheBody([[-8, 0], [-6.5, .9], [-3.5, 1.9], [0, 2.4], [3, 2.3], [5, 1.9], [6.6, 1.7], [7.8, 1.2], [8.4, 0]], '#f2f2ee', '#ffffff', .95, .95, 20, .3));
  const head = soft(new T.SphereGeometry(1.75, 20, 14), '#f8f8f4'); head.position.set(6.4, 1.1, 0); g.add(head);
  const beak = soft(new T.ConeGeometry(.5, 2.4, 12), '#e0a030'); beak.rotation.z = -Math.PI/2 - .12; beak.position.set(8.8, .8, 0); g.add(beak);
  const tail = fin(smooth([[0, -1.6], [-3.6, -2.2], [-4.4, 0], [-3.6, 2.2], [0, 1.6]], 10), .3, '#e4e4de'); tail.rotation.x = Math.PI/2; tail.position.x = -7; g.add(tail);
  const inner = smooth([[0, -2.6], [7, -2.4], [11, -1.2], [11, 1.4], [6, 2.2], [0, 2.2]], 14), outer = smooth([[0, -1.2], [6, -.6], [11, 1.2], [12.5, 3.2], [9, 2.4], [4, 1.6], [0, 1.4]], 16);
  // wing pieces are drawn flat (span along x, chord along y) and laid along +z; the left wing is the same, mirrored
  const lay = m => { m.geometry.rotateX(Math.PI/2); m.geometry.rotateY(-Math.PI/2); return m; };
  const wings = [1, -1].map(sd => { const p = new T.Group(); p.position.set(.5, 1, sd*1.2); p.scale.z = sd; g.add(p);
    const a = new T.Group(); a.rotation.x = -.28; p.add(a); a.add(lay(fin(inner, .35, '#ecebe6')));   // the inner wing rises
    const b = new T.Group(); b.position.z = 10.6; b.rotation.x = .42; a.add(b); b.add(lay(fin(outer, .3, '#ecebe6'))); // the outer wing bends down
    const tip = lay(fin(smooth([[7, -.2], [11, 1.2], [12.5, 3.2], [9.6, 2.5], [7.5, 1.8]], 10), .36, '#4a4f55')); tip.position.y = .14; b.add(tip);
    return {p, s:sd}; });
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
