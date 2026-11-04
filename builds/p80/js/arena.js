// The Arena of Rhodes: a square basin of straight breakwaters built out from the south-east coast of Rhodes (P80, from the
// Blender picture; it was a stone ring before). The marble Colossus stands astride the gate in the front breakwater, facing
// the open sea, and you sail in between his legs. Inside, start the games: rounds of pirate champions, a prize for each round
// won. The crowd on the walkways cheers.
import {ISLANDS, landDist} from './world.js';
import {G, save} from './state.js';
import {scene} from './scene.js';
import {mat, torch, TORCH_ROOTS} from './ships.js';
import {mergeStatic} from './merge.js';
import {award, TROPHIES} from './trophies.js';
import {figure} from './town.js';
import {buildGladiator, marbleColossus, COLOSSUS_BOWL} from './monuments.js';
import {spawnArena, clearArena, enemies} from './combat.js';
import {toast} from './ui.js';
import {sfx} from './audio.js';

const T = window.THREE;
const R = 780, H = 700, GW = 150, SEG = 64, BW = 34, DECK_Y = 7.2, FORT_R = 96; // R only picks the spot; H half the basin's side, GW half the gate (his stance), piece length, walkway width and top, fort radius
const ROUNDS = [['dinghy', 'dinghy', 'dinghy'], ['skiff', 'skiff'], ['skiff', 'skiff', 'dinghy', 'dinghy'], ['galley', 'skiff'], ['galley', 'galley'], ['galley', 'galley', 'skiff', 'skiff']];
const PRIZE = 80, FINAL = ROUNDS.length, TOTAL = FINAL + 1;
// P77: every time you win all the fights the next games are harder and pay more: Bronze, Silver, Gold, then Glory without end. Spartacus' champion ship closes each one.
const CUPS = ['Bronze', 'Silver', 'Gold'], CUP_KEY = ['bronze', 'silver', 'gold'];
const gamesWon = () => (G.S.arena || {}).games || 0;
const gamesName = n => CUPS[n] || `Glory ${n - 2}`;
const hardness = n => ({k:1 + .75*n, kd:1 + .42*n, pay:1 + .6*n});

// ---- where: walk out from Rhodes to the south-east until most of the ring is in the sea, with its back on the coast ----
const rhodes = ISLANDS.find(i => i.name === 'Rhodes');
export const ARENA = (() => {
  if (!rhodes) return null;
  const dx = Math.SQRT1_2, dy = Math.SQRT1_2;
  for (let t = 0; t < rhodes.r + 4000; t += 20){
    const x = rhodes.x + dx*t, y = rhodes.y + dy*t;
    if (landDist(x, y) > R*.8) return {x, y, gate:Math.atan2(dy, dx), R:H};
  }
  return null;
})();

// ---- the build (P80): straight breakwaters of boulders with red walkways, like the Blender picture, not a ring ----
// A square basin: the front breakwater faces the open sea with the gate in its middle, where the marble Colossus stands
// with one foot on each white plinth; two side breakwaters run back to Rhodes, and a back one closes it wherever there's sea.
// A round fort with a lighthouse stands on the west front corner. The crowd watches from the walkways.
const crowd = [], stone = mat('#ddd2b8'), ledge = mat('#c9bd9f'), rock = mat('#8f8a80'), core = mat('#a49c8c'), deck = mat('#b9583d'), white = mat('#eee6d6');
const pieces = [], posts = []; // standing breakwater pieces (for walls and the chart), round things ships bump into (plinths, the fort)
let arenaG = null, colossus = null, merged = false;
const torches = [], BANNERS = ['#b8322a', '#2f5f96', '#c98a24'].map(c => mat(c));
const rnd = (i, k) => Math.abs(Math.sin(i*12.9898 + k*78.233)*43758.5453) % 1;
const ux = ARENA ? Math.cos(ARENA.gate) : 1, uy = ARENA ? Math.sin(ARENA.gate) : 0;
const at = (u, v) => [ux*u - uy*v, uy*u + ux*v]; // basin frame (u out through the gate, v across it) to offsets from the centre
if (ARENA){
  const g = new T.Group(); g.position.set(ARENA.x, 0, ARENA.y); scene.add(g); arenaG = g; g.userData.torches = torches; TORCH_ROOTS.add(g);
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
      const f = (k + .5)/n, [x, z] = at(u0 + (u1 - u0)*f, v0 + (v1 - v0)*f); if (landDist(ARENA.x + x, ARENA.y + z) < -30) continue;
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
    if (landDist(ARENA.x + x, ARENA.y + z) < 30) continue;
    const hh = k % 4 === 0 ? 8 : 24 + (k*37 % 40);
    const c = new T.Mesh(col, marble); c.scale.y = hh + 10; c.position.set(x, hh/2 - 5, z); c.castShadow = true; g.add(c);
    if (hh > 40){ const cap = new T.Mesh(new T.BoxGeometry(16, 4, 16), marble); cap.position.set(x, hh - 3, z); g.add(cap); }
    if (k % 5 === 2){ const fallen = new T.Mesh(col, marble); fallen.scale.y = 44; fallen.rotation.z = Math.PI/2; fallen.rotation.y = a; fallen.position.set(x + Math.cos(a + 1.6)*30, 2, z + Math.sin(a + 1.6)*30); g.add(fallen); }
  }
  { const a = ARENA.gate + Math.PI*.75, r = H - 140, x = Math.cos(a)*r, z = Math.sin(a)*r; // an old arch standing in the water
    if (landDist(ARENA.x + x, ARENA.y + z) > 40){ const arch = new T.Group(); arch.position.set(x, 0, z); arch.rotation.y = -a; g.add(arch);
      for (const s2 of [-1, 1]){ const c = new T.Mesh(col, marble); c.scale.y = 70; c.position.set(0, 30, s2*26); c.castShadow = true; arch.add(c); }
      const lin = new T.Mesh(new T.BoxGeometry(16, 10, 70), marble); lin.position.y = 68; lin.castShadow = true; arch.add(lin);
      const ped = new T.Mesh(new T.CylinderGeometry(.01, 14, 70, 3), marble); ped.rotation.x = Math.PI/2; ped.rotation.y = Math.PI/2; ped.scale.set(1, 1, .5); ped.position.y = 80; arch.add(ped); } }
  // Spartacus, the champion of the games, in white marble in the middle
  { const sp = buildGladiator('marble'); sp.scale.setScalar(1.3); sp.rotation.y = Math.atan2(-Math.sin(ARENA.gate), Math.cos(ARENA.gate)); g.add(sp); }
}
// petals thrown from the walls when a round is won
const PETALS = 260, petalPos = new Float32Array(PETALS*3), petalCol = new Float32Array(PETALS*3); let petals = null, petalT = 0;
function throwPetals(k = 1){ if (!ARENA) return; if (!petals){ const geo = new T.BufferGeometry(), C = ['#ffd24d', '#e8413a', '#fff4dc', '#ff8fa8'].map(c => new T.Color(c)); for (let i = 0; i < PETALS; i++){ const c = C[i % 4]; petalCol.set([c.r, c.g, c.b], i*3); } geo.setAttribute('position', new T.BufferAttribute(petalPos, 3)); geo.setAttribute('color', new T.BufferAttribute(petalCol, 3));
    petals = new T.Points(geo, new T.PointsMaterial({size:7, vertexColors:true, transparent:true, depthWrite:false})); petals.frustumCulled = false; scene.add(petals); }
  const S = G.S; for (let i = 0; i < PETALS; i++){ const a = Math.random()*6.28, r = Math.sqrt(Math.random())*520; petalPos[i*3] = S.x + Math.cos(a)*r; petalPos[i*3 + 1] = 90 + Math.random()*210; petalPos[i*3 + 2] = S.y + Math.sin(a)*r; } petalT = 6*k; petals.visible = true; petals.material.opacity = 1; }
function updatePetals(dt){ if (!(petalT > 0)) return; petalT -= dt; for (let i = 0; i < PETALS; i++){ const y = petalPos[i*3 + 1] - dt*(26 + i % 17); petalPos[i*3 + 1] = Math.max(1, y); petalPos[i*3] += Math.sin(G.t*1.6 + i)*dt*14; petalPos[i*3 + 2] += Math.cos(G.t*1.3 + i*2)*dt*14; } petals.geometry.attributes.position.needsUpdate = true; petals.material.opacity = Math.min(1, petalT); if (petalT <= 0) petals.visible = false; }

// ---- breakwaters, plinths and the fort: ships can't pass them except through the gate ----
function wallPush(p, rad){
  const gap = rad + BW/2 + 14;
  for (const w of pieces){ const dx = p.x - w.x, dy = p.y - w.y; if (Math.abs(dx) > w.L + gap || Math.abs(dy) > w.L + gap) continue;
    const along = dx*w.tx + dy*w.ty, across = -dx*w.ty + dy*w.tx; if (Math.abs(along) > w.L/2 + 2 || Math.abs(across) >= gap) continue;
    const to = (across < 0 ? -gap : gap) - across; p.x -= w.ty*to; p.y += w.tx*to; }
  for (const o of posts){ const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1, r = o.r + rad; if (d < r){ p.x = o.x + dx/d*r; p.y = o.y + dy/d*r; } }
}
const local = p => { const dx = p.x - ARENA.x, dy = p.y - ARENA.y; return [dx*ux + dy*uy, -dx*uy + dy*ux]; };
export const inArena = (p, m = 0) => { if (!ARENA) return false; const [u, v] = local(p); return Math.abs(u) < H - m && Math.abs(v) < H - m; };

// ---- the games ----
const A = {round:0, on:false, foes:[]};
const btn = document.getElementById('arenaBtn');
// Champions sail out from both sides of the ring, wherever there's open water.
function spawnSpot(i, n){
  const a = ARENA.gate + (i % 2 ? 1 : -1)*(Math.PI/2 + Math.floor(i/2)*.35);
  let r = H*.6; while (r > 80 && landDist(ARENA.x + Math.cos(a)*r, ARENA.y + Math.sin(a)*r) < 110) r -= 40;
  return {x:ARENA.x + Math.cos(a)*r, y:ARENA.y + Math.sin(a)*r};
}
function startRound(){
  const n = gamesWon(), H = hardness(n);
  if (A.round >= FINAL){ // the champion: Spartacus' white and purple warship, and his guards in the harder games
    const p = spawnSpot(0, 1), guards = Math.min(4, n*2);
    A.foes = [spawnArena('galley', p.x, p.y, {x:ARENA.x, y:ARENA.y}, {k:H.k, kd:H.kd, hull:680, dmg:2.8, fighters:8, name:'Spartacus, champion of Rhodes', model:'trireme', look:{paint:'white', sail:'purple', flag:'none'}})];
    for (let i = 0; i < guards; i++){ const q = spawnSpot(i + 1, guards + 1); A.foes.push(spawnArena('skiff', q.x, q.y, {x:ARENA.x, y:ARENA.y}, {k:H.k, kd:H.kd})); }
  } else { const list = ROUNDS[A.round]; A.foes = list.map((k, i) => { const p = spawnSpot(i, list.length); return spawnArena(k, p.x, p.y, {x:ARENA.x, y:ARENA.y}, {k:H.k, kd:H.kd}); }); }
  A.on = true; sfx('horn'); sfx('crowd');
}
function endGames(msg){ clearArena(); A.on = false; A.foes = []; A.round = 0; if (msg){ toast(msg, 3.5); sfx('crowd'); } }
btn && btn.addEventListener('click', () => { if (!A.on) startRound(); });

export function updateArena(dt){
  if (!ARENA) return;
  const S = G.S, near = Math.hypot(S.x - ARENA.x, S.y - ARENA.y) < H*1.42 + 900;
  if (near){ wallPush(S, 14); for (const e of enemies) if (!e.dead && Math.abs(e.x - ARENA.x) < H*1.42 + 200 && Math.abs(e.y - ARENA.y) < H*1.42 + 200) wallPush(e, e.spec.beam*.5); }
  // the Colossus fades while you sail between and behind his legs, so he never hides your ship
  const [gx, gy] = at(H, 0), under = Math.hypot(S.x - ARENA.x - gx, S.y - ARENA.y - gy) < 330, ko = under ? .3 : 1;
  for (const m of colossus ? colossus.userData.mats : []){ m.opacity += (ko - m.opacity)*Math.min(1, dt*3); m.depthWrite = m.opacity > .9; }
  const inside = inArena(S, 30);
  if (near && !merged && arenaG){ merged = true; mergeStatic(arenaG); }
  A.joy = Math.max(0, (A.joy || 0) - dt); updatePetals(dt);
  if (near) for (const f of crowd){ const up = A.joy > 0 ? 14 : A.on ? 6 : inside ? 1.5 : 0; f.position.y = f.userData.h - 1.5 + (up ? Math.abs(Math.sin(G.t*(A.joy > 0 ? 8 : 6) + f.userData.ph))*up : 0); }
  if (A.on){
    if (G.sinking){ endGames('Defeated in the arena'); return; }
    if (!inArena(S, -60)){ endGames('You fled. The crowd boos.'); return; }
    if (A.foes.every(e => e.dead)){
      const n = gamesWon(), H = hardness(n), last = A.round >= FINAL, prize = Math.round((last ? 500 : PRIZE*(A.round + 1))*H.pay);
      S.gold += prize; S.arenaBest = Math.max(S.arenaBest || 0, (n*TOTAL) + A.round + 1); A.on = false; A.joy = last ? 9 : 5; throwPetals(last ? 1.4 : 1); sfx('crowd');
      if (last){ S.arena = {...(S.arena || {}), games:n + 1}; A.round = 0; clearArena(); const key = CUP_KEY[n]; if (key && award(key)){ toast(`Trophy: ${TROPHIES[key].name}!`, 5); sfx('fanfare'); } else toast(`${gamesName(n)} games won! +${prize}`, 4); }
      else { A.round++; toast(`Round won! +${prize}`, 3); }
      save();
    }
  }
  if (btn){ btn.hidden = !inside || A.on || G.sheetOpen || G.sinking; if (!btn.hidden) btn.textContent = A.round ? (A.round >= FINAL ? 'Face the champion' : `Round ${A.round + 1} of ${TOTAL}`) : `Start the ${gamesName(gamesWon())} games`; }
  // a short line under the chart while the games are on, in place of the fortress line
  document.body.classList.toggle('arenaon', A.on);
  const bar = document.getElementById('arenaBar'); if (bar){ bar.hidden = !A.on; if (A.on){ const left = A.foes.filter(e => !e.dead).length, key = gamesWon() + '|' + A.round + '|' + left + '|' + A.foes.length; if (bar.dataset.k !== key){ bar.dataset.k = key; bar.innerHTML = `<b class="mt">${A.round >= FINAL ? 'Spartacus' : gamesName(gamesWon()) + ' games'}</b><span class="arnd">${A.round >= FINAL ? 'Final' : `${A.round + 1} of ${TOTAL}`}</span><span class="apips">${A.foes.map(e => `<i class="${e.dead ? 'off' : ''}"></i>`).join('')}</span>`; } } }
}
// Test / builder: jump to the arena gate.
document.addEventListener('toarena', () => { if (!ARENA) return; const S = G.S; G.dock = null; S.x = ARENA.x + Math.cos(ARENA.gate)*(H + (window.__TEST && __TEST.get("adist") ? +__TEST.get("adist") : 300)); S.y = ARENA.y + Math.sin(ARENA.gate)*(H + (window.__TEST && __TEST.get("adist") ? +__TEST.get("adist") : 300)); S.a = ARENA.gate + Math.PI; G.cam = {x:S.x, y:S.y}; });
