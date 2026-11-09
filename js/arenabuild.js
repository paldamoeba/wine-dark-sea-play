// P81: the Arena of Rhodes as a model, out of arena.js so the Showroom can build it too. buildArena(ARENA, landD) builds the
// basin around ARENA = {x, y, gate} (gate = the angle out through the gate) and leaves out pieces that would stand on land
// (landD(x, y) < 0 on land). It sets ARENA.fort and returns the group (placed at ARENA.x, 0, ARENA.y, not added to a scene)
// with what arena.js needs to run the games: the wall pieces and posts ships bump into, the crowd, the torches, the Colossus.
import {mat, torch} from './ships.js?v=a41a65b';
import {figure} from './town.js?v=a41a65b';
import {buildGladiator, marbleColossus, COLOSSUS_BOWL} from './monuments.js?v=a41a65b';

const T = window.THREE;
export const H = 700, GW = 150, SEG = 64, BW = 34, DECK_Y = 7.2, FORT_R = 96; // half the basin's side, half the gate (his stance), piece length, walkway width and top, fort radius
export const frame = gate => { const ux = Math.cos(gate), uy = Math.sin(gate); return {ux, uy, at:(u, v) => [ux*u - uy*v, uy*u + ux*v]}; }; // basin frame (u out through the gate, v across it) to offsets from the centre

export function buildArena(ARENA, landD = () => 1e9){
  const {ux, uy, at} = frame(ARENA.gate);
  const crowd = [], stone = mat('#ddd2b8'), ledge = mat('#c9bd9f'), rock = mat('#8f8a80'), core = mat('#a49c8c'), deck = mat('#b9583d'), white = mat('#eee6d6');
  const pieces = [], posts = []; // standing breakwater pieces (for walls and the chart), round things ships bump into (plinths, the fort)
  let arenaG = null, colossus = null;
  const torches = [], BANNERS = ['#b8322a', '#2f5f96', '#c98a24'].map(c => mat(c));
  const rnd = (i, k) => Math.abs(Math.sin(i*12.9898 + k*78.233)*43758.5453) % 1;
  {
  const g = new T.Group(); g.position.set(ARENA.x, 0, ARENA.y); arenaG = g; g.userData.torches = torches; g.userData.torches = torches;
  const rockGeo = new T.DodecahedronGeometry(1, 0);
  const add = (o, parent = g) => { o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => { const o = add(new T.Mesh(new T.BoxGeometry(w, h, d), m), parent); o.position.set(x, y, z); return o; };
  const drum = (r, h, m, x, y, z, seg = 28) => { const o = add(new T.Mesh(new T.CylinderGeometry(r, r*1.03, h, seg), m)); o.position.set(x, y + h/2, z); return o; };
  const boulder = (x, y, z, s, k, parent = g) => { const o = add(new T.Mesh(rockGeo, rock), parent); o.position.set(x, y, z); o.scale.set(s*(1 + rnd(k, 1)*.5), s*(.55 + rnd(k, 2)*.3), s*(1 + rnd(k, 3)*.4)); o.rotation.y = rnd(k, 4)*6; return o; };
  // the fort on the west front corner
  const west = [-1, 1].sort((p, q) => at(H, p*H)[0] - at(H, q*H)[0])[0], [fx, fz] = at(H, west*H); ARENA.fort = {x:ARENA.x + fx, y:ARENA.y + fz}; posts.push({x:ARENA.fort.x, y:ARENA.fort.y, r:FORT_R + 16});
  // the breakwaters, side by side as pieces about SEG long; pieces on the island are left out
  const SIDES = [[[H, -H], [H, -GW]], [[H, GW], [H, H]], [[H, H], [-H, H]], [[-H, H], [-H, -H]], [[-H, -H], [H, -H]]];
  let i = 0;
  for (const [[u0, v0], [u1, v1]] of SIDES){
    const len = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.round(len/SEG)), L = len/n, [tx, tz] = at((u1 - u0)/len, (v1 - v0)/len);
    for (let k = 0; k < n; k++, i++){
      const f = (k + .5)/n, [x, z] = at(u0 + (u1 - u0)*f, v0 + (v1 - v0)*f); if (landD(ARENA.x + x, ARENA.y + z) < -30) continue;
      pieces.push({x:ARENA.x + x, y:ARENA.y + z, tx, ty:tz, L}); if (Math.hypot(x - fx, z - fz) < FORT_R - 10) continue;
      const p = new T.Group(); p.position.set(x, 0, z); p.rotation.y = -Math.atan2(tz, tx); g.add(p);
      box(L + 2, 16, BW + 12, core, 0, -3, 0, p); box(L + 3, 2.4, BW, deck, 0, 6, 0, p);
      for (let b = 0; b < 6; b++){ const sd = b % 2 ? 1 : -1; boulder((rnd(i, b) - .5)*L, -1 + rnd(i, b + 9)*3, sd*(BW/2 + 7 + rnd(i, b + 5)*8), 9 + rnd(i, b + 7)*7, i*13 + b, p); }
      if (i % 4 === 2){ const t = torch(); t.position.set(0, 7, BW/2 - 3); t.scale.setScalar(1.2); p.add(t); torches.push(t); }
      if (i % 6 === 4){ // a banner of the games on a tall pole
        box(1.8, 46, 1.8, mat('#6e3d1e'), 0, 30, -BW/2 + 4, p); box(1, 22, 20, BANNERS[(i/6 | 0) % 3], 0, 41, -BW/2 + 14, p); }
      else if (i % 2 === 0) for (let c = 0; c < 3; c++){ const fg = figure(['#cf9035', '#3f6c94', '#ece2cb', '#c64a3c', '#71873f'][(i + c) % 5]); fg.scale.setScalar(1.1); fg.visible = true;
        fg.position.set((c - 1)*L*.3, DECK_Y, (c % 2 ? 5 : -5)); fg.userData.ph = Math.random()*6; fg.userData.h = DECK_Y + 1.5; fg.userData.noMerge = true; p.add(fg); crowd.push(fg); }
    }
  }
  ARENA.walls = pieces;
  // a white plinth at each side of the gate, for his feet
  const plinths = [-1, 1].map(s => { const [x, z] = at(H, s*GW);
    const pl = box(80, 34, 80, white, x, 5, z); pl.rotation.y = -ARENA.gate; box(88, 4, 88, ledge, x, 23, z).rotation.y = -ARENA.gate;
    for (let k = 0; k < 5; k++) boulder(x + (rnd(s + 3, k) - .5)*110, -2, z + (rnd(s + 7, k) - .5)*110, 12 + rnd(s, k)*8, 90 + s*7 + k);
    posts.push({x:ARENA.x + x, y:ARENA.y + z, r:62}); return new T.Vector3(x, 25, z); });
  // the round fort: three stepped drums with battlements, a lighthouse turret with its fire on top, boulders all round
  drum(FORT_R, 46, stone, fx, -10, fz, 36); drum(FORT_R + 4, 4, ledge, fx, 34, fz, 36);
  for (let k = 0; k < 30; k++){ const a = k/30*Math.PI*2; box(9, 9, 9, stone, fx + Math.cos(a)*(FORT_R - 3), 42, fz + Math.sin(a)*(FORT_R - 3)).rotation.y = -a; }
  drum(64, 36, stone, fx, 36, fz, 30); drum(67, 3, ledge, fx, 70, fz, 30);
  for (let k = 0; k < 20; k++){ const a = k/20*Math.PI*2; box(8, 8, 8, stone, fx + Math.cos(a)*61, 76, fz + Math.sin(a)*61).rotation.y = -a; }
  drum(28, 58, stone, fx - 12, 72, fz + 6, 18); drum(31, 3, ledge, fx - 12, 128, fz + 6, 18);
  for (let k = 0; k < 10; k++){ const a = k/10*Math.PI*2; box(6, 7, 6, stone, fx - 12 + Math.cos(a)*27, 133, fz + 6 + Math.sin(a)*27); }
  const lx = fx + 26, lz = fz - 22; drum(14, 36, stone, lx, 72, lz, 14); drum(16, 2.5, ledge, lx, 108, lz, 14);
  const roof = add(new T.Mesh(new T.ConeGeometry(17, 18, 14), ledge)); roof.position.set(lx, 126, lz);
  { const t = torch(); t.position.set(lx, 98, lz); t.scale.setScalar(1.8); g.add(t); torches.push(t); }
  for (let k = 0; k < 22; k++){ const a = k/22*Math.PI*2 + rnd(k, 1)*.2, r = FORT_R + 4 + rnd(k, 2)*14; boulder(fx + Math.cos(a)*r, -3, fz + Math.sin(a)*r, 12 + rnd(k, 3)*10, 200 + k); }
  // the Colossus astride the gate: the Blender model, painted with the game's marble, red cloth and gilded bowl
  const mid = plinths[0].clone().add(plinths[1]).multiplyScalar(.5);
  colossus = marbleColossus(GW*2, (c, k) => {
    // the fire in his bowl: a torch flame without its pole, sized in game units (the model is scaled by k)
    const fire = torch(), s = 4/k; fire.children.forEach(o => { if (o !== fire.userData.flame) o.visible = false; });
    fire.scale.setScalar(s); fire.position.set(COLOSSUS_BOWL[0], COLOSSUS_BOWL[1] - .25 - 13.4*s, COLOSSUS_BOWL[2]); c.add(fire); torches.push(fire);
  });
  colossus.position.copy(mid); colossus.rotation.y = Math.atan2(ux, uy); // he faces out to sea
  colossus.userData.noMerge = true; g.add(colossus);
  // ruins inside: standing columns of different heights, a fallen one and an old arch, close to the walls
  const marble = mat('#eee6d6'), col = new T.CylinderGeometry(6, 7, 1, 10);
  for (let k=0;k<14;k++){ const a = ARENA.gate + .6 + k/14*(Math.PI*2 - 1.2), r = H - 90 - (k % 3)*26, x = Math.cos(a)*r, z = Math.sin(a)*r;
    if (landD(ARENA.x + x, ARENA.y + z) < 30) continue;
    const hh = k % 4 === 0 ? 8 : 24 + (k*37 % 40);
    const c = new T.Mesh(col, marble); c.scale.y = hh + 10; c.position.set(x, hh/2 - 5, z); c.castShadow = true; g.add(c);
    if (hh > 40){ const cap = new T.Mesh(new T.BoxGeometry(16, 4, 16), marble); cap.position.set(x, hh - 3, z); g.add(cap); }
    if (k % 5 === 2){ const fallen = new T.Mesh(col, marble); fallen.scale.y = 44; fallen.rotation.z = Math.PI/2; fallen.rotation.y = a; fallen.position.set(x + Math.cos(a + 1.6)*30, 2, z + Math.sin(a + 1.6)*30); g.add(fallen); }
  }
  { const a = ARENA.gate + Math.PI*.75, r = H - 140, x = Math.cos(a)*r, z = Math.sin(a)*r; // an old arch standing in the water
    if (landD(ARENA.x + x, ARENA.y + z) > 40){ const arch = new T.Group(); arch.position.set(x, 0, z); arch.rotation.y = -a; g.add(arch);
      for (const s2 of [-1, 1]){ const c = new T.Mesh(col, marble); c.scale.y = 70; c.position.set(0, 30, s2*26); c.castShadow = true; arch.add(c); }
      const lin = new T.Mesh(new T.BoxGeometry(16, 10, 70), marble); lin.position.y = 68; lin.castShadow = true; arch.add(lin);
      const ped = new T.Mesh(new T.CylinderGeometry(.01, 14, 70, 3), marble); ped.rotation.x = Math.PI/2; ped.rotation.y = Math.PI/2; ped.scale.set(1, 1, .5); ped.position.y = 80; arch.add(ped); } }
  // Spartacus, the champion of the games, in white marble in the middle
  { const sp = buildGladiator('marble'); sp.scale.setScalar(1.3); sp.rotation.y = Math.atan2(-Math.sin(ARENA.gate), Math.cos(ARENA.gate)); g.add(sp); }
}
  return {g:arenaG, pieces, posts, crowd, torches, colossus};
}
