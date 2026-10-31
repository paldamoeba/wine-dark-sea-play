// Big stone and bronze models: the Colossus of Rhodes and the island fortresses. Pure builders (no game state),
// so the arena, the forts and the art page all use the same models.
import {mat, statue, person} from './ships.js?v=1ea44ec';

const T = window.THREE;
const M = (geo, m, shadow = true) => { const o = new T.Mesh(geo, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
// a smooth limb through several joints: one tube, its radius from r(t) (t = 0 at the first joint, 1 at the last), so arms and
// legs flow without seams at the elbow and knee
function flow(pts, r, m, seg = 40, rad = 24){
  const curve = new T.CatmullRomCurve3(pts), fr = curve.computeFrenetFrames(seg, false), pos = [], idx = [];
  for (let i=0;i<=seg;i++){ const t = i/seg, c = curve.getPointAt(t), rr = r(t), N = fr.normals[i], B = fr.binormals[i];
    for (let j=0;j<=rad;j++){ const a = j/rad*Math.PI*2; pos.push(c.x + (N.x*Math.cos(a) + B.x*Math.sin(a))*rr, c.y + (N.y*Math.cos(a) + B.y*Math.sin(a))*rr, c.z + (N.z*Math.cos(a) + B.z*Math.sin(a))*rr); } }
  for (let i=0;i<seg;i++) for (let j=0;j<rad;j++){ const a = i*(rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return M(g, m);
}
// smooth polished bronze for the Colossus (instead of the banded look of boats and houses)
const bronzeMat = (c, o) => new T.MeshPhongMaterial({color:c, specular:'#6a4f2a', shininess:38, ...o});
// a tapered round limb from point a to point b
function limb(a, b, r1, r2, m, seg = 28){
  const v = b.clone().sub(a), len = v.length(), o = M(new T.CylinderGeometry(r2, r1, len, seg), m);
  o.position.copy(a).addScaledVector(v, .5); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()); return o;
}
const ball = (p, r, m, sx = 1, sy = 1, sz = 1) => { const o = M(new T.SphereGeometry(r, 36, 24), m); o.position.copy(p); o.scale.set(sx, sy, sz); return o; };
const V = (x, y, z) => new T.Vector3(x, y, z);

// ---- the Colossus of Rhodes ----
// A bronze sun god, eight heads tall, one foot on each side of the harbor gate: a torch held high in one hand, a bow in the
// other, a quiver on his back and a crown of sun rays. Built facing +x with his feet `stance` apart along z, soles at y = 0.
// Returns the group; group.userData.flame is the torch fire and group.userData.mats the materials (to fade him).
// What a god holds and wears. The Colossus (Helios) has a torch, a bow, a quiver and a crown of sun rays.
export const GODS_LOOK = {
  helios:  {up:'torch', low:'bow', crown:'rays', quiver:true},
  poseidon:{up:'trident', low:'none', crown:'none', beard:true},
  athena:  {up:'spear', low:'shield', crown:'helmet'},
  zeus:    {up:'bolt', low:'none', crown:'wreath', beard:true},
  apollo:  {up:'none', low:'lyre', crown:'wreath'},
  artemis: {up:'none', low:'bow', crown:'none', quiver:true},
};
export function buildColossus(height = 480, stance = 260, fade = false, look = GODS_LOOK.helios){
  const g = new T.Group(), u = height/8, F = stance/2, L = look;
  const o = fade ? {transparent:true, opacity:1} : {};
  const skin = bronzeMat('#b58848', o), dark = bronzeMat('#8f6534', o), cloth = bronzeMat('#7d5a33', o), fire = mat('#f2b247', o), wood = bronzeMat('#6e4a2a', o);
  g.userData.mats = [skin, dark, cloth, fire, wood];
  // legs: foot, ankle, knee, hip on each side
  for (const s of [-1, 1]){
    const foot = V(.15*u, .2*u, s*F), ankle = V(0, .45*u, s*F*.97), knee = V(.12*u, 2.25*u, s*(F*.6 + .45*u)), hip = V(0, 4.05*u, s*.55*u);
    const f = ball(V(.3*u, .18*u, s*F), .32*u, skin, 2, .62, 1); g.add(f); g.add(ball(ankle, .19*u, skin)); // a rounded foot, and the ankle closing the leg
    // one smooth tube from ankle to hip: slim ankle, a round calf, the knee, a strong thigh
    g.add(flow([ankle, V(.06*u, 1.35*u, s*(F*.8 + .22*u)), knee, V(.06*u, 3.2*u, s*(F*.3 + .5*u)), hip], t => (t < .5 ? .19 + .13*Math.sin(t/.5*Math.PI)*.9 + .1*t : .28 + .22*Math.pow((t - .5)/.5, .7))*u, skin));
  }
  // hips and the cloth around them
  g.add(ball(V(0, 4.15*u, 0), .78*u, skin, .8, .7, 1.05));
  const wrap = M(new T.CylinderGeometry(.82*u, .95*u, .8*u, 36), cloth); wrap.position.set(0, 4.25*u, 0); wrap.scale.z = 1.12; g.add(wrap);
  const flap = M(new T.BoxGeometry(.12*u, 1.1*u, .55*u), cloth); flap.position.set(.75*u, 3.75*u, 0); flap.rotation.z = .12; g.add(flap);
  // a strong torso: narrow waist up to broad shoulders, chest and belly muscles
  const torso = M(new T.LatheGeometry(new T.SplineCurve([[.72, 0], [.68, .4], [.78, .95], [.98, 1.5], [1.08, 1.95], [.96, 2.25], [.5, 2.45], [.01, 2.5]].map(([r, y]) => new T.Vector2(r*u, y*u))).getPoints(40), 40), skin);
  torso.position.set(0, 4.55*u, 0); torso.scale.x = .62; g.add(torso); // a smooth torso: narrow waist, broad chest, round shoulders
  for (const s of [-1, 1]) g.add(ball(V(.36*u, 6.2*u, s*.4*u), .44*u, skin, .32, .62, 1)); // chest muscles, kept flat so they read as shape, not bumps
  // the quiver strap across the chest, the quiver and arrows on his back
  if (L.quiver){ g.add(flow([V(.52*u, 6.95*u, -.75*u), V(.66*u, 6*u, 0), V(.52*u, 5*u, .7*u), V(0, 4.8*u, .82*u)], () => .05*u, wood, 24, 10)); // the strap across the chest
  const quiver = M(new T.CylinderGeometry(.22*u, .18*u, 1.6*u, 24), wood); quiver.position.set(-.55*u, 6.1*u, .35*u); quiver.rotation.x = -.5; g.add(quiver);
  for (let i=0;i<4;i++){ const ar = M(new T.CylinderGeometry(.03*u, .03*u, .6*u, 4), dark); ar.position.set(-.55*u + (i - 1.5)*.06*u, 7*u, .85*u); ar.rotation.x = -.5; g.add(ar); } }
  // neck, head, curls and the crown of sun rays
  g.add(limb(V(0, 6.8*u, 0), V(0, 7.15*u, 0), .3*u, .28*u, skin));
  g.add(ball(V(.05*u, 7.5*u, 0), .46*u, skin, .95, 1.08, .9));
  g.add(ball(V(-.16*u, 7.72*u, 0), .44*u, dark, .85, .62, .98)); // hair, swept back
  const nose = ball(V(0, 0, 0), .1*u, skin, 1, 1.5, .9); nose.position.set(.48*u, 7.45*u, 0); nose.rotation.z = -.3; g.add(nose); // a strong nose and brow
  const brow = ball(V(0, 0, 0), .07*u, skin, .8, .6, 3.4); brow.position.set(.44*u, 7.62*u, 0); g.add(brow);
  if (L.crown === 'rays'){ const ray = new T.ConeGeometry(.1*u, .75*u, 16);
    for (let i=0;i<11;i++){ const a = -Math.PI*.6 + i/10*Math.PI*1.2, r = M(ray, fire);
      r.position.set(-.05*u, 7.55*u + Math.cos(a)*.65*u, Math.sin(a)*.65*u); r.rotation.x = a; g.add(r); } }
  if (L.crown === 'helmet'){ const hm = M(new T.SphereGeometry(.52*u, 12, 6, 0, Math.PI*2, 0, Math.PI/1.8), dark); hm.position.set(0, 7.6*u, 0); g.add(hm);
    const crest = M(new T.BoxGeometry(1.1*u, .5*u, .1*u), cloth); crest.position.set(-.1*u, 8.15*u, 0); g.add(crest); }
  if (L.crown === 'wreath'){ const w = M(new T.TorusGeometry(.42*u, .07*u, 5, 14), mat('#7c8a3a', o)); w.rotation.x = Math.PI/2; w.position.set(0, 7.7*u, 0); g.add(w); }
  if (L.beard){ const b = ball(V(.3*u, 7.1*u, 0), .3*u, dark, .8, 1, 1.1); g.add(b); }
  // torch arm (right, +z): up and out, the torch cup and its flame above his head
  const shR = V(0, 6.6*u, 1.08*u), elR = V(.2*u, 7.55*u, 1.65*u), haR = V(.3*u, 8.6*u, 1.45*u);
  g.add(ball(shR, .36*u, skin, 1, .95, 1)); g.add(flow([shR, elR, haR], t => (.3 - .1*t + .05*Math.sin(Math.min(1, t*2)*Math.PI))*u, skin)); g.add(ball(haR, .2*u, skin, 1, 1.15, .9));
  if (L.up === 'torch'){ const cup = M(new T.CylinderGeometry(.32*u, .12*u, .55*u, 28), dark); cup.position.set(.3*u, 8.95*u, 1.45*u); g.add(cup);
    const flame = M(new T.ConeGeometry(.34*u, 1.1*u, 20), fire, false); flame.position.set(.3*u, 9.7*u, 1.45*u); g.add(flame); g.userData.flame = flame; }
  if (L.up === 'trident' || L.up === 'spear'){ // a long shaft held upright, three prongs or a bronze point on top
    const sh = M(new T.CylinderGeometry(.06*u, .06*u, 5.4*u, 5), L.up === 'spear' ? wood : dark); sh.position.set(.3*u, 7.6*u, 1.45*u); g.add(sh);
    if (L.up === 'spear'){ const tip = M(new T.ConeGeometry(.16*u, .6*u, 5), fire); tip.position.set(.3*u, 10.6*u, 1.45*u); g.add(tip); }
    else { const bar = M(new T.BoxGeometry(.1*u, .1*u, .9*u), dark); bar.position.set(.3*u, 10.2*u, 1.45*u); g.add(bar);
      for (const z of [-.42, 0, .42]){ const pr = M(new T.ConeGeometry(.08*u, .7*u, 4), dark); pr.position.set(.3*u, 10.6*u, (1.45 + z)*u); g.add(pr); } } }
  if (L.up === 'bolt') [[0, 9.1, 0, .5], [.12, 9.75, .1, -.5], [0, 10.4, 0, .5]].forEach(([x, y, z, r]) => { const b = M(new T.BoxGeometry(.14*u, .8*u, .18*u), fire); b.position.set((.3 + x)*u, y*u, (1.45 + z)*u); b.rotation.x = r; g.add(b); });
  // bow arm (left, -z): down along his side, holding a tall bow
  const shL = V(0, 6.6*u, -1.08*u), elL = V(.15*u, 5.35*u, -1.45*u), haL = V(.55*u, 4.5*u, -1.4*u);
  g.add(ball(shL, .36*u, skin, 1, .95, 1)); g.add(flow([shL, elL, haL], t => (.3 - .1*t + .05*Math.sin(Math.min(1, t*2)*Math.PI))*u, skin)); g.add(ball(haL, .2*u, skin, 1, 1.15, .9));
  if (L.low === 'bow'){ const bow = M(new T.TorusGeometry(1.6*u, .07*u, 10, 40, Math.PI*.9), wood); bow.position.set(.4*u, 4.5*u, -1.5*u); bow.rotation.set(0, Math.PI/2, Math.PI/2 + Math.PI*.05); g.add(bow);
    const str = M(new T.CylinderGeometry(.015*u, .015*u, 3.1*u, 3), mat('#e9dcc0', o)); str.position.set(.4*u, 4.5*u, -1.5*u); g.add(str); }
  if (L.low === 'shield'){ const sd = M(new T.CylinderGeometry(1.05*u, 1.05*u, .12*u, 16), dark); sd.rotation.z = Math.PI/2; sd.position.set(.75*u, 4.9*u, -1.5*u); g.add(sd);
    const boss = M(new T.SphereGeometry(.3*u, 8, 6), fire); boss.position.set(.82*u, 4.9*u, -1.5*u); boss.scale.x = .4; g.add(boss); }
  if (L.low === 'lyre'){ const ly = M(new T.TorusGeometry(.5*u, .07*u, 5, 12, Math.PI), fire); ly.position.set(.7*u, 4.9*u, -1.4*u); ly.rotation.set(Math.PI, Math.PI/2, 0); g.add(ly);
    const yoke = M(new T.BoxGeometry(.08*u, .08*u, 1.1*u), wood); yoke.position.set(.7*u, 5.4*u, -1.4*u); g.add(yoke); }
  return g;
}

// ---- fortresses ----
// A stepped island fortress: a rock base, a curtain wall with round bastions, a second terrace with arched windows and
// hanging banners, a keep with a columned porch, catapults on the bastions and a stair down to a little dock.
// Built facing +x (the sea side). About 230 across. `owner` sets stone, roofs and banners.
export const FORT_GUNS = [[95, 95], [95, -95], [-95, 95], [-95, -95]]; // the four bastions, where the catapults sit (local x, z)
export function buildFortress(owner, color){
  const g = new T.Group();
  const pirate = owner === 'pirate', stone = mat(pirate ? '#a08f78' : owner === 'sparta' ? '#d6c49e' : '#e4dac4'), shade = mat(pirate ? '#7a6b58' : '#b9a986');
  const rock = mat(pirate ? '#6f6559' : '#8c8478'), dark = mat('#3a3029'), roof = mat(pirate ? '#4a3a2e' : '#b8603a'), wood = mat('#6e4a2a'), cloth = mat(color || '#c64a3c');
  const box = (w, h, d, m, x, y, z) => { const o = M(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const cyl = (r1, r2, h, m, x, y, z, n = 12) => { const o = M(new T.CylinderGeometry(r1, r2, h, n), m); o.position.set(x, y, z); g.add(o); return o; };
  // rock base
  const base = cyl(150, 165, 34, rock, 0, -4, 0, 9); base.rotation.y = .2;
  // curtain wall with merlons
  const crenel = (len, x, z, along, y, m = stone) => { const n = Math.floor(len/11); for (let k=0;k<n;k++){ const t = (k - (n - 1)/2)*11;
    box(along ? 6 : 5, 6, along ? 5 : 6, m, x + (along ? t : 0), y, z + (along ? 0 : t)); } };
  for (const [x, z, w, d] of [[95, 0, 10, 190], [-95, 0, 10, 190], [0, 95, 190, 10], [0, -95, 190, 10]]){
    box(w, 40, d, stone, x, 20 + 8, z); crenel(Math.max(w, d) - 20, x, z, w > d, 51); }
  box(180, 4, 180, shade, 0, 44, 0); // the courtyard floor up on the walls
  // gate on the sea side
  box(4, 18, 24, dark, 100, 22, 0);
  // round bastions on the corners, catapults on top; two of them have red tile roofs over a lookout
  FORT_GUNS.forEach(([x, z], i) => {
    cyl(25, 29, 64, stone, x, 30, z); cyl(28, 28, 4, shade, x, 63, z);
    for (let k=0;k<10;k++){ const a = k/10*Math.PI*2; box(6, 6, 6, stone, x + Math.cos(a)*25, 68, z + Math.sin(a)*25); }
    for (let k=0;k<3;k++){ const a = Math.atan2(z, x) + (k - 1)*.6; box(2, 7, 4, dark, x + Math.cos(a)*29.2, 40, z + Math.sin(a)*29.2).rotation.y = -a; } // arrow slits
    if (i >= 2){ cyl(14, 14, 16, stone, x, 73, z); const cn = M(new T.ConeGeometry(18, 18, 10), roof); cn.position.set(x, 90, z); g.add(cn); }
    else { // a catapult: a wooden frame and a throwing arm
      const c = new T.Group(); c.position.set(x, 66, z); c.rotation.y = -Math.atan2(z, x) + Math.PI/2; g.add(c);
      for (const s of [-1, 1]){ const side = M(new T.BoxGeometry(16, 3, 2), wood); side.position.set(0, 2, s*5); c.add(side);
        const post = M(new T.BoxGeometry(2, 10, 2), wood); post.position.set(2, 6, s*5); c.add(post); }
      const arm = M(new T.BoxGeometry(2, 20, 2), wood); arm.position.set(0, 10, 0); arm.rotation.z = -.6; c.add(arm);
      const pot = M(new T.SphereGeometry(3, 6, 5), dark); pot.position.set(-5.5, 18, 0); c.add(pot); g.userData.arms = (g.userData.arms || []).concat(arm); }
  });
  // second terrace: arched windows and banners facing the sea
  box(120, 44, 120, stone, -8, 68, 0); box(126, 4, 126, shade, -8, 91, 0);
  crenel(110, -8 + 61, 0, false, 96); crenel(110, -8 - 61, 0, false, 96); crenel(110, -8, 61, true, 96); crenel(110, -8, -61, true, 96);
  for (let k=-2;k<=2;k++){ box(2, 14, 8, dark, 53, 70, k*22); }
  for (const z of [-33, 33]){ const b = box(1.5, 34, 16, cloth, 54, 68, z); b.castShadow = false; box(1.5, 3, 18, mat('#e9d9b4'), 54.5, 84, z); }
  // the keep: a tall tower with a columned porch, a dome on top and the flag
  box(54, 56, 54, stone, -20, 120, 0); box(58, 4, 58, shade, -20, 149, 0);
  crenel(50, -20 + 27, 0, false, 154); crenel(50, -20 - 27, 0, false, 154); crenel(50, -20, 27, true, 154); crenel(50, -20, -27, true, 154);
  for (let k=-1.5;k<=1.5;k++) cyl(2.6, 2.6, 26, mat('#f2ead6'), 14, 106, k*11, 8);
  box(16, 3, 50, stone, 14, 120, 0); const ped = M(new T.CylinderGeometry(.01, 10, 50, 3), stone); ped.rotation.x = Math.PI/2; ped.rotation.y = Math.PI/2; ped.scale.set(1.2, 1, .5); ped.position.set(14, 126, 0); g.add(ped);
  box(2, 16, 12, dark, 7.5, 100, 0);
  const dome = M(new T.SphereGeometry(13, 12, 8, 0, Math.PI*2, 0, Math.PI/2), pirate ? rock : mat('#3f6c94')); dome.position.set(-20, 151, 0); g.add(dome);
  cyl(1, 1, 40, wood, -20, 180, 0, 5);
  const flag = box(1, 16, 26, cloth, -20, 192, 13); flag.castShadow = false; g.userData.flag = flag;
  // braziers on the walls
  for (const [x, z] of [[100, 30], [100, -30], [53, 50], [53, -50]]){ cyl(3, 2, 5, dark, x, 54 + (x < 90 ? 42 : 0), z, 6); const f = M(new T.ConeGeometry(2.6, 6, 6), mat('#f2b247'), false); f.position.set(x, 60 + (x < 90 ? 42 : 0), z); g.add(f); }
  // the city's god watches the sea from the terrace
  const st = statue(owner === 'athens' ? 'athena' : owner === 'sparta' ? 'zeus' : 'poseidon', pirate ? 'bronze' : 'painted'); st.position.set(44, 93, 0); st.scale.setScalar(.58); g.add(st);
  // stair down to a little dock on the sea side
  for (let k=0;k<6;k++) box(12, 4, 30, shade, 108 + k*7, 40 - k*7, 0);
  box(40, 3, 26, wood, 160, 3, 0);
  for (const z of [-11, 11]) for (const x of [145, 175]) cyl(1.6, 1.6, 12, wood, x, 0, z, 5);
  return g;
}

// ---- a statue of a god on a plinth (for harbors, fortresses and the art page) ----
export function buildStatue(god = 'poseidon', stone = 'marble'){
  const g = new T.Group(), marble = mat(stone === 'bronze' ? '#9c7038' : '#eee6d6'), plinth = mat('#cfc3a8');
  const pl = M(new T.BoxGeometry(18, 10, 18), plinth); pl.position.y = 5; g.add(pl);
  const top = M(new T.BoxGeometry(20, 2, 20), mat('#e4dac4')); top.position.y = 11; g.add(top);
  const s = buildColossus(44, 8, false, GODS_LOOK[god] || GODS_LOOK.poseidon);
  const keep = new Set([s.userData.mats[3]]); s.traverse(o => { if (o.isMesh && !keep.has(o.material)) o.material = marble; });
  s.position.y = 12; g.add(s); return g;
}

// ---- Spartacus, the champion of the games: a cartoony gladiator statue ----
// Huge chest and shoulders, a narrow waist, short sturdy legs, big hands; a crested helmet, a short sword raised high and a
// round shield. marble = all white stone; otherwise polished bronze. About 120 tall with its pedestal. Faces +x.
export function buildGladiator(stone = 'marble'){
  const g = new T.Group(), white = stone === 'marble';
  const skin = white ? new T.MeshPhongMaterial({color:'#efe9de', specular:'#2a2824', shininess:12}) : bronzeMat('#b58848', {});
  const metal = white ? skin : bronzeMat('#d6a64e', {}), dark = white ? new T.MeshPhongMaterial({color:'#ddd5c6', shininess:10}) : bronzeMat('#7d5a33', {});
  const stoneM = mat('#e2dbcb'), capM = mat('#ece6d8');
  [[56, 6, 3, '#d3cab6'], [46, 18, 15, '#e2dbcb'], [52, 4, 26, '#ece6d8']].forEach(([w, h, y, c]) => { const b = M(new T.BoxGeometry(w, h, w), mat(c)); b.position.y = y; g.add(b); });
  const S = 28; // top of the pedestal
  // legs: short and thick, set wide; sandals
  for (const s of [-1, 1]){ const hip = V(0, S + 26, s*7), knee = V(3, S + 13, s*10), ank = V(0, S + 3, s*11);
    g.add(flow([hip, knee, ank], t => 4.6 - 1.6*t + .9*Math.sin(Math.min(1, t*1.6)*Math.PI), skin, 30, 20));
    g.add(ball(V(2.4, S + 1.6, s*11), 3.4, dark, 1.6, .55, 1)); }
  // a kilt with a thick belt
  const kilt = M(new T.CylinderGeometry(9.5, 12, 9, 36), dark); kilt.position.y = S + 25; g.add(kilt);
  const belt = M(new T.TorusGeometry(9.6, 1.4, 12, 40), metal); belt.rotation.x = Math.PI/2; belt.position.y = S + 29.5; g.add(belt);
  // the torso: a big upside-down pear, broad chest and shoulders
  const torso = M(new T.LatheGeometry(new T.SplineCurve([[8.5, 0], [8.8, 4], [11.5, 11], [14.5, 17], [15, 20], [12, 23.5], [6, 25.5], [.01, 26]].map(([r, y]) => new T.Vector2(r, y))).getPoints(40), 44), skin);
  torso.scale.x = .62; torso.position.y = S + 29; g.add(torso);
  for (const s of [-1, 1]) g.add(ball(V(7.4, S + 45, s*5.6), 5.4, skin, .38, .62, 1)); // chest
  // head: a small head under a big crested helmet with a visor
  g.add(ball(V(1, S + 59, 0), 5.2, skin, 1, 1.05, .95));
  const helm = M(new T.SphereGeometry(6.2, 36, 18, 0, Math.PI*2, 0, Math.PI/1.7), metal); helm.position.set(0, S + 60, 0); g.add(helm);
  const brim = M(new T.TorusGeometry(6.4, .9, 10, 40), metal); brim.rotation.x = Math.PI/2; brim.position.set(0, S + 58.6, 0); brim.scale.set(1.08, 1, 1); g.add(brim);
  const crest = M(new T.CylinderGeometry(8, 8, 2.2, 36, 1, false, Math.PI/2, Math.PI), white ? skin : bronzeMat('#9e2a22', {})); crest.rotation.x = Math.PI/2; crest.position.set(-1, S + 63, 0); crest.scale.set(1, 1, 1); g.add(crest);
  // arms: big shoulders, thick arms, the sword arm up, the shield arm forward
  const shR = V(0, S + 49, 13.5), shL = V(0, S + 49, -13.5);
  for (const sh of [shR, shL]) g.add(ball(sh, 5.6, skin, 1, .95, 1));
  const handR = V(4, S + 72, 17); g.add(flow([shR, V(-1, S + 59, 19), handR], t => 4.4 - 1.4*t + .8*Math.sin(Math.min(1, t*2)*Math.PI), skin)); g.add(ball(handR, 3.4, skin));
  const blade = M(new T.BoxGeometry(1.2, 22, 3.4), metal); blade.position.set(4.6, S + 84, 17); g.add(blade);
  const tip = M(new T.ConeGeometry(2.4, 4, 4), metal); tip.scale.z = .35; tip.position.set(4.6, S + 97, 17); g.add(tip);
  const guard = M(new T.BoxGeometry(2, 1.6, 8), dark); guard.position.set(4.4, S + 74.5, 17); g.add(guard);
  const handL = V(11, S + 38, -15); g.add(flow([shL, V(4, S + 40, -20), handL], t => 4.4 - 1.4*t + .8*Math.sin(Math.min(1, t*2)*Math.PI), skin)); g.add(ball(handL, 3.4, skin));
  const shield = M(new T.LatheGeometry([[0, 2.6], [7, 2.2], [12, 1.1], [14, .5], [14.2, -.4], [12.6, -.6], [0, -.2]].map(([x, y]) => new T.Vector2(x, y)), 48), metal);
  shield.rotation.z = -Math.PI/2; shield.position.set(14, S + 38, -15); g.add(shield);
  const boss = ball(V(16.6, S + 38, -15), 3, white ? skin : bronzeMat('#9e2a22', {}), .45, 1, 1); g.add(boss);
  return g;
}

// A bandit camp (P51: no wall): two log cabins with plank roofs, a patched tent, a campfire with stones and a cooking pot,
// barrels and crates, a black flag on a pole, and four bandits with bows down on the beach facing the sea (+x).
// g.userData.archers holds them (combat.js shoots arrows from them and makes them lean in to shoot).
export function buildCamp(){
  const g = new T.Group(), log = mat('#7a5230'), dark = mat('#4d3320'), roof = mat('#5e4027'), cloth = mat('#a6845e');
  const put = (o, x, y, z) => { o.position.set(x, y, z); g.add(o); return o; };
  // log cabins: stacked log walls, a sloped plank roof, a dark doorway
  for (const [x, z, ry] of [[-45, -30, .3], [-40, 34, -.4]]){ const c = new T.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
    for (let k=0;k<5;k++){ for (const [w, d, ox, oz] of [[30, 3, 0, -11], [30, 3, 0, 11], [3, 22, -14, 0], [3, 22, 14, 0]]){ const l = M(new T.CylinderGeometry(1.6, 1.6, Math.max(w, d), 6), k % 2 ? log : dark); l.rotation.set(w > d ? 0 : Math.PI/2, 0, w > d ? Math.PI/2 : 0); l.position.set(ox, 2 + k*3.2, oz); c.add(l); } }
    for (const sg of [1, -1]){ const r = M(new T.BoxGeometry(34, 1.4, 15), roof); r.position.set(0, 21, sg*6.5); r.rotation.x = sg*.55; c.add(r); }
    const door = M(new T.BoxGeometry(1, 10, 7), mat('#2a1d14'), false); door.position.set(15, 5, 0); c.add(door); }
  // a patched tent
  const t = M(new T.ConeGeometry(17, 26, 7), cloth); put(t, -8, 13, -52); t.rotation.y = .4;
  // the campfire: a ring of stones, crossed logs, flames and a pot on a tripod
  for (let k=0;k<9;k++){ const a = k/9*Math.PI*2; put(M(new T.DodecahedronGeometry(3, 0), mat('#8c8478')), 6 + Math.cos(a)*10, 1.5, 4 + Math.sin(a)*10); }
  for (const r of [.5, -.6]){ const l = M(new T.CylinderGeometry(1.2, 1.2, 14, 6), dark); l.rotation.set(Math.PI/2, r, 0); put(l, 6, 2, 4); }
  const f1 = M(new T.ConeGeometry(5.5, 13, 7), mat('#f2b247'), false); put(f1, 6, 7, 4); const f2 = M(new T.ConeGeometry(3.2, 9, 6), mat('#e0614d'), false); put(f2, 6, 6, 4);
  g.userData.flames = [f1, f2];
  for (const a of [0, 2.1, 4.2]){ const p = M(new T.CylinderGeometry(.6, .6, 24, 4), dark); p.position.set(6 + Math.cos(a)*7, 11, 4 + Math.sin(a)*7); p.lookAt(6, 30, 4); g.add(p); }
  put(M(new T.SphereGeometry(4.5, 10, 8, 0, 6.29, Math.PI/2.4, Math.PI/1.7), mat('#2b2622')), 6, 17, 4);
  // barrels, crates and the flag
  for (const [x, z] of [[-18, 16], [-22, 10], [24, -34]]) put(M(new T.CylinderGeometry(5, 5, 11, 10), dark), x, 5.5, z);
  for (const [x, z] of [[-14, -14], [28, 30]]) put(M(new T.BoxGeometry(10, 9, 10), log), x, 4.5, z);
  put(M(new T.CylinderGeometry(.8, .8, 46, 5), dark), -20, 23, 0);
  put(M(new T.BoxGeometry(1, 12, 19), mat('#1f1a1a')), -20, 40, 9.5);
  put(M(new T.SphereGeometry(2.5, 10, 8), mat('#e9dcc0'), false), -19.3, 40.5, 9.5).scale.set(.3, 1, 1);
  // bandits with bows on the beach, facing the sea
  g.userData.archers = [];
  g.children.forEach(o => { o.position.x -= 30; }); // the camp sits back from the water; the bandits stand at the shoreline
  [[14, -30], [20, -9], [19, 12], [13, 32]].forEach(([x, z], i) => { const p = person(['rTunic', '#2c1f1f', 'rTunic', '#5a2a22'][i], 'archer', 'pirate'); p.scale.setScalar(1.6); p.rotation.y = 0; put(p, x, 0, z); g.userData.archers.push(p); });
  return g;
}
