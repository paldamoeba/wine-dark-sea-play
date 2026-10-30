// Big stone and bronze models: the Colossus of Rhodes and the island fortresses. Pure builders (no game state),
// so the arena, the forts and the art page all use the same models.
import {mat} from './ships.js?v=77dd129';

const T = window.THREE;
const M = (geo, m, shadow = true) => { const o = new T.Mesh(geo, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
// a tapered round limb from point a to point b
function limb(a, b, r1, r2, m, seg = 8){
  const v = b.clone().sub(a), len = v.length(), o = M(new T.CylinderGeometry(r2, r1, len, seg), m);
  o.position.copy(a).addScaledVector(v, .5); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()); return o;
}
const ball = (p, r, m, sx = 1, sy = 1, sz = 1) => { const o = M(new T.SphereGeometry(r, 12, 9), m); o.position.copy(p); o.scale.set(sx, sy, sz); return o; };
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
  const skin = mat('#b98a4a', o), dark = mat('#94683a', o), cloth = mat('#7d5a33', o), fire = mat('#f2b247', o), wood = mat('#6e4a2a', o);
  g.userData.mats = [skin, dark, cloth, fire, wood];
  // legs: foot, ankle, knee, hip on each side
  for (const s of [-1, 1]){
    const foot = V(.15*u, .2*u, s*F), ankle = V(0, .45*u, s*F*.97), knee = V(.12*u, 2.25*u, s*(F*.6 + .45*u)), hip = V(0, 4.05*u, s*.55*u);
    const f = M(new T.BoxGeometry(1.2*u, .4*u, .5*u), dark); f.position.copy(foot); g.add(f);
    g.add(limb(ankle, knee, .2*u, .34*u, skin)); g.add(ball(knee, .3*u, skin));
    g.add(limb(knee, hip, .3*u, .5*u, skin)); g.add(ball(V(.05*u, 1.7*u, s*(F*.7 + .3*u)), .3*u, skin, 1, 1.4, 1)); // calf
  }
  // hips and the cloth around them
  g.add(ball(V(0, 4.15*u, 0), .78*u, skin, .8, .7, 1.05));
  const wrap = M(new T.CylinderGeometry(.82*u, .92*u, .75*u, 10), cloth); wrap.position.set(0, 4.25*u, 0); wrap.scale.z = 1.12; g.add(wrap);
  const flap = M(new T.BoxGeometry(.12*u, 1.1*u, .55*u), cloth); flap.position.set(.75*u, 3.75*u, 0); flap.rotation.z = .12; g.add(flap);
  // a strong torso: narrow waist up to broad shoulders, chest and belly muscles
  const torso = M(new T.CylinderGeometry(1.05*u, .7*u, 2.3*u, 10), skin); torso.position.set(0, 5.75*u, 0); torso.scale.x = .62; g.add(torso);
  for (const s of [-1, 1]){ g.add(ball(V(.4*u, 6.3*u, s*.42*u), .42*u, skin, .55, .7, 1)); g.add(ball(V(.38*u, 5.2*u, s*.2*u), .25*u, skin, .5, .55, .7)); }
  // the quiver strap across the chest, the quiver and arrows on his back
  if (L.quiver){ const strap = M(new T.BoxGeometry(.1*u, 3*u, .2*u), wood); strap.position.set(.45*u, 5.8*u, 0); strap.rotation.x = .75; g.add(strap);
  const quiver = M(new T.CylinderGeometry(.22*u, .18*u, 1.6*u, 8), wood); quiver.position.set(-.55*u, 6.1*u, .35*u); quiver.rotation.x = -.5; g.add(quiver);
  for (let i=0;i<4;i++){ const ar = M(new T.CylinderGeometry(.03*u, .03*u, .6*u, 4), dark); ar.position.set(-.55*u + (i - 1.5)*.06*u, 7*u, .85*u); ar.rotation.x = -.5; g.add(ar); } }
  // neck, head, curls and the crown of sun rays
  g.add(limb(V(0, 6.8*u, 0), V(0, 7.15*u, 0), .3*u, .28*u, skin));
  g.add(ball(V(.05*u, 7.5*u, 0), .46*u, skin, .95, 1.08, .9));
  g.add(ball(V(-.16*u, 7.72*u, 0), .44*u, dark, .85, .62, .98)); // hair, swept back
  const nose = M(new T.BoxGeometry(.16*u, .22*u, .12*u), skin); nose.position.set(.48*u, 7.45*u, 0); nose.rotation.z = -.3; g.add(nose); // a strong nose and brow
  const brow = M(new T.BoxGeometry(.1*u, .08*u, .5*u), dark); brow.position.set(.44*u, 7.62*u, 0); g.add(brow);
  if (L.crown === 'rays'){ const ray = new T.ConeGeometry(.1*u, .75*u, 4);
    for (let i=0;i<11;i++){ const a = -Math.PI*.6 + i/10*Math.PI*1.2, r = M(ray, fire);
      r.position.set(-.05*u, 7.55*u + Math.cos(a)*.65*u, Math.sin(a)*.65*u); r.rotation.x = a; g.add(r); } }
  if (L.crown === 'helmet'){ const hm = M(new T.SphereGeometry(.52*u, 12, 6, 0, Math.PI*2, 0, Math.PI/1.8), dark); hm.position.set(0, 7.6*u, 0); g.add(hm);
    const crest = M(new T.BoxGeometry(1.1*u, .5*u, .1*u), cloth); crest.position.set(-.1*u, 8.15*u, 0); g.add(crest); }
  if (L.crown === 'wreath'){ const w = M(new T.TorusGeometry(.42*u, .07*u, 5, 14), mat('#7c8a3a', o)); w.rotation.x = Math.PI/2; w.position.set(0, 7.7*u, 0); g.add(w); }
  if (L.beard){ const b = ball(V(.3*u, 7.1*u, 0), .3*u, dark, .8, 1, 1.1); g.add(b); }
  // torch arm (right, +z): up and out, the torch cup and its flame above his head
  const shR = V(0, 6.6*u, 1.08*u), elR = V(.2*u, 7.55*u, 1.65*u), haR = V(.3*u, 8.6*u, 1.45*u);
  g.add(ball(shR, .38*u, skin)); g.add(limb(shR, elR, .3*u, .24*u, skin)); g.add(limb(elR, haR, .24*u, .18*u, skin)); g.add(ball(haR, .2*u, skin));
  if (L.up === 'torch'){ const cup = M(new T.CylinderGeometry(.32*u, .12*u, .55*u, 8), dark); cup.position.set(.3*u, 8.95*u, 1.45*u); g.add(cup);
    const flame = M(new T.ConeGeometry(.34*u, 1.1*u, 7), fire, false); flame.position.set(.3*u, 9.7*u, 1.45*u); g.add(flame); g.userData.flame = flame; }
  if (L.up === 'trident' || L.up === 'spear'){ // a long shaft held upright, three prongs or a bronze point on top
    const sh = M(new T.CylinderGeometry(.06*u, .06*u, 5.4*u, 5), L.up === 'spear' ? wood : dark); sh.position.set(.3*u, 7.6*u, 1.45*u); g.add(sh);
    if (L.up === 'spear'){ const tip = M(new T.ConeGeometry(.16*u, .6*u, 5), fire); tip.position.set(.3*u, 10.6*u, 1.45*u); g.add(tip); }
    else { const bar = M(new T.BoxGeometry(.1*u, .1*u, .9*u), dark); bar.position.set(.3*u, 10.2*u, 1.45*u); g.add(bar);
      for (const z of [-.42, 0, .42]){ const pr = M(new T.ConeGeometry(.08*u, .7*u, 4), dark); pr.position.set(.3*u, 10.6*u, (1.45 + z)*u); g.add(pr); } } }
  if (L.up === 'bolt') [[0, 9.1, 0, .5], [.12, 9.75, .1, -.5], [0, 10.4, 0, .5]].forEach(([x, y, z, r]) => { const b = M(new T.BoxGeometry(.14*u, .8*u, .18*u), fire); b.position.set((.3 + x)*u, y*u, (1.45 + z)*u); b.rotation.x = r; g.add(b); });
  // bow arm (left, -z): down along his side, holding a tall bow
  const shL = V(0, 6.6*u, -1.08*u), elL = V(.15*u, 5.35*u, -1.45*u), haL = V(.55*u, 4.5*u, -1.4*u);
  g.add(ball(shL, .38*u, skin)); g.add(limb(shL, elL, .3*u, .24*u, skin)); g.add(limb(elL, haL, .24*u, .18*u, skin)); g.add(ball(haL, .2*u, skin));
  if (L.low === 'bow'){ const bow = M(new T.TorusGeometry(1.6*u, .07*u, 5, 16, Math.PI*.9), wood); bow.position.set(.4*u, 4.5*u, -1.5*u); bow.rotation.set(0, Math.PI/2, Math.PI/2 + Math.PI*.05); g.add(bow);
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
  const st = buildStatue(owner === 'athens' ? 'athena' : owner === 'sparta' ? 'zeus' : 'poseidon', pirate ? 'bronze' : 'marble'); st.position.set(44, 93, 0); st.scale.setScalar(.8); g.add(st);
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
