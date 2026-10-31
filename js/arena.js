// The Arena of Rhodes: a great ring of stone walls built out from the south-east coast of Rhodes, like a colosseum on the water.
// The landward side of the ring runs up onto the island; the gate faces the open sea, and the Colossus stands astride it,
// facing out. You sail in between his legs. Inside, start the games: rounds of pirate champions, a prize for each round won.
// The crowd on the walls cheers. The Colossus turns see-through while you're inside so he never blocks the fight.
import {ISLANDS, landDist} from './world.js?v=f11df90';
import {G, save} from './state.js?v=f11df90';
import {scene} from './scene.js?v=f11df90';
import {mat} from './ships.js?v=f11df90';
import {figure} from './town.js?v=f11df90';
import {buildColossus, buildGladiator} from './monuments.js?v=f11df90';
import {spawnArena, clearArena, enemies} from './combat.js?v=f11df90';
import {toast} from './ui.js?v=f11df90';
import {sfx} from './audio.js?v=f11df90';

const T = window.THREE;
const R = 780, WALL_H = 58, WALL_T = 26, N = 72, GATE = .17; // radius, wall height and thickness, wall pieces, half the gate's opening (radians)
const ROUNDS = [['dinghy', 'dinghy', 'dinghy'], ['skiff', 'skiff'], ['skiff', 'skiff', 'dinghy', 'dinghy'], ['galley', 'skiff'], ['galley', 'galley'], ['galley', 'galley', 'skiff', 'skiff']];
const PRIZE = 80;

// ---- where: walk out from Rhodes to the south-east until most of the ring is in the sea, with its back on the coast ----
const rhodes = ISLANDS.find(i => i.name === 'Rhodes');
export const ARENA = (() => {
  if (!rhodes) return null;
  const dx = Math.SQRT1_2, dy = Math.SQRT1_2;
  for (let t = 0; t < rhodes.r + 4000; t += 20){
    const x = rhodes.x + dx*t, y = rhodes.y + dy*t;
    if (landDist(x, y) > R*.8) return {x, y, gate:Math.atan2(dy, dx), R, half:GATE};
  }
  return null;
})();
const angDiff = (a, b) => { const d = a - b; return d - Math.PI*2*Math.floor((d + Math.PI)/(Math.PI*2)); };
const inGate = a => Math.abs(angDiff(a, ARENA.gate)) < GATE - .02;
const pieceAt = a => ((Math.floor(a/(Math.PI*2)*N) % N) + N) % N;

// ---- the build ----
const crowd = [], stone = mat('#ddd2b8'), dark = mat('#8f846c'), ledge = mat('#c9bd9f');
const solid = new Array(N).fill(false); // which wall pieces stand (pieces deep inland are left out: the island closes the ring there)
let colossus = null;
if (ARENA){
  const g = new T.Group(); g.position.set(ARENA.x, 0, ARENA.y); scene.add(g);
  const seg = Math.PI*2*R/N + 2;
  const tower = (a, h = WALL_H + 30, r = 30) => { const tw = new T.Mesh(new T.CylinderGeometry(r, r + 4, h, 12), stone); tw.position.set(Math.cos(a)*R, h/2 - 8, Math.sin(a)*R); tw.castShadow = tw.receiveShadow = true; g.add(tw);
    const top = new T.Mesh(new T.CylinderGeometry(r + 3, r + 3, 5, 12), ledge); top.position.set(Math.cos(a)*R, h - 8, Math.sin(a)*R); g.add(top); return tw; };
  for (let i=0;i<N;i++){
    const a = (i + .5)/N*Math.PI*2; if (Math.abs(angDiff(a, ARENA.gate)) < GATE) continue;
    const wx = ARENA.x + Math.cos(a)*R, wy = ARENA.y + Math.sin(a)*R; if (landDist(wx, wy) < -40) continue;
    solid[i] = true;
    const p = new T.Group(); p.position.set(Math.cos(a)*R, 0, Math.sin(a)*R); p.rotation.y = -a + Math.PI/2; g.add(p);
    // the wall rises and falls: some pieces taller, some crumbled, a square tower every few pieces
    const rnd = Math.abs(Math.sin(i*12.9898)*43758.5453) % 1, towerHere = i % 8 === 4, broken = !towerHere && rnd < .14;
    const h = towerHere ? WALL_H + 34 : Math.round(WALL_H*(.82 + .36*Math.abs(Math.sin(i*.9) + Math.sin(i*.37))/2));
    const B = (w, hh, d, m, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(w, hh, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
    if (broken){ B(seg*.55, h*.7 + 14, WALL_T, stone, -seg*.22, h*.35 - 13, 0); B(seg*.5, h*.45 + 14, WALL_T, stone, seg*.25, h*.22 - 13, 0); // a crumbled gap
      B(10, 8, 10, dark, seg*.1, h*.45 - 8, WALL_T*.7).rotation.y = rnd*3; }
    else {
      B(seg, h + 14, WALL_T, stone, 0, h/2 - 13, 0);
      B(seg + 1, 5, WALL_T + 8, ledge, 0, h - 4, 0); B(seg + 1, 3, WALL_T + 5, ledge, 0, h*.44, 0); // cornice and a middle ledge
      for (const sg of [1, -1]){ // two rows of arches between pilasters, like a colosseum
        for (const k of [-.25, .25]){ B(seg*.28, h*.3, 1, dark, k*seg, h*.2, sg*(WALL_T/2 + .3)); B(seg*.22, h*.22, 1, dark, k*seg, h*.66, sg*(WALL_T/2 + .3)); }
        for (const k of [-.5, 0, .5]) B(3.5, h*.9, 2.5, ledge, k*seg, h*.45 - 4, sg*(WALL_T/2 + 1)); }
      if (towerHere){ B(seg*.8, 6, WALL_T + 14, ledge, 0, h + 1, 0); // a square tower with merlons and a flag
        for (let k=0;k<4;k++) for (const sg of [1, -1]) B(6, 7, 6, stone, (k - 1.5)*seg*.22, h + 7, sg*(WALL_T/2 + 4));
        const flag = new T.Mesh(new T.BoxGeometry(1, 18, 28), mat(['#c64a3c', '#3f6c94', '#d48a2a'][(i/8 | 0) % 3])); flag.position.set(0, h + 34, 14); p.add(flag);
        const pole = new T.Mesh(new T.CylinderGeometry(.9, .9, 40, 5), mat('#6e3d1e')); pole.position.set(0, h + 24, 0); p.add(pole); }
      else for (let k=0;k<3;k++){ const f = figure(['#cf9035', '#3f6c94', '#ece2cb', '#c64a3c', '#71873f'][(i + k) % 5]); f.scale.setScalar(1.1); f.visible = true;
        f.position.set((k - 1)*seg*.3, h - 1.5, (k % 2 ? 4 : -4)); f.userData.ph = Math.random()*6; f.userData.h = h; p.add(f); crowd.push(f); }
    }
  }
  // ruins inside the ring: standing columns of different heights, a fallen one and an old arch, close to the walls
  const marble = mat('#eee6d6'), col = new T.CylinderGeometry(6, 7, 1, 10);
  for (let k=0;k<14;k++){ const a = ARENA.gate + .6 + k/14*(Math.PI*2 - 1.2), r = R - 70 - (k % 3)*26, x = Math.cos(a)*r, z = Math.sin(a)*r;
    if (landDist(ARENA.x + x, ARENA.y + z) < 30) continue;
    const hh = k % 4 === 0 ? 8 : 24 + (k*37 % 40);
    const c = new T.Mesh(col, marble); c.scale.y = hh + 10; c.position.set(x, hh/2 - 5, z); c.castShadow = true; g.add(c);
    if (hh > 40){ const cap = new T.Mesh(new T.BoxGeometry(16, 4, 16), marble); cap.position.set(x, hh - 3, z); g.add(cap); }
    if (k % 5 === 2){ const fallen = new T.Mesh(col, marble); fallen.scale.y = 44; fallen.rotation.z = Math.PI/2; fallen.rotation.y = a; fallen.position.set(x + Math.cos(a + 1.6)*30, 2, z + Math.sin(a + 1.6)*30); g.add(fallen); }
  }
  { const a = ARENA.gate + Math.PI*.75, r = R - 120, x = Math.cos(a)*r, z = Math.sin(a)*r; // an old arch standing in the water
    if (landDist(ARENA.x + x, ARENA.y + z) > 40){ const arch = new T.Group(); arch.position.set(x, 0, z); arch.rotation.y = -a; g.add(arch);
      for (const s2 of [-1, 1]){ const c = new T.Mesh(col, marble); c.scale.y = 70; c.position.set(0, 30, s2*26); c.castShadow = true; arch.add(c); }
      const lin = new T.Mesh(new T.BoxGeometry(16, 10, 70), marble); lin.position.y = 68; lin.castShadow = true; arch.add(lin);
      const ped = new T.Mesh(new T.CylinderGeometry(.01, 14, 70, 3), marble); ped.rotation.x = Math.PI/2; ped.rotation.y = Math.PI/2; ped.scale.set(1, 1, .5); ped.position.y = 80; arch.add(ped); } }
  // Spartacus, the champion of the games, in white marble in the middle of the ring
  { const sp = buildGladiator('marble'); sp.scale.setScalar(1.3); sp.rotation.y = Math.atan2(-Math.sin(ARENA.gate), Math.cos(ARENA.gate)); g.add(sp); }
  // end towers where the ring runs up onto Rhodes
  for (let i=0;i<N;i++) if (solid[i] && !solid[(i + 1) % N] && !inGate((i + 1)/N*Math.PI*2 + .001)) tower((i + 1)/N*Math.PI*2, WALL_H + 18, 24);
  for (let i=0;i<N;i++) if (solid[i] && !solid[(i + N - 1) % N] && !inGate(i/N*Math.PI*2 - .001)) tower(i/N*Math.PI*2, WALL_H + 18, 24);
  // two gate towers: the Colossus stands with one foot on each
  const tops = [-1, 1].map(sg => { const a = ARENA.gate + sg*GATE; tower(a, WALL_H + 34, 34); return new T.Vector3(Math.cos(a)*R, WALL_H + 26, Math.sin(a)*R); });
  const mid = tops[0].clone().add(tops[1]).multiplyScalar(.5), stance = tops[0].distanceTo(tops[1]);
  colossus = buildColossus(560, stance, true); colossus.position.copy(mid);
  colossus.rotation.y = Math.atan2(-Math.sin(ARENA.gate), Math.cos(ARENA.gate)); // face out of the gate
  g.add(colossus);
}

// ---- walls: ships can't pass them except through the gate ----
function wallPush(p, rad){
  const dx = p.x - ARENA.x, dy = p.y - ARENA.y, d = Math.hypot(dx, dy) || 1, gap = rad + WALL_T/2 + 4, a = Math.atan2(dy, dx);
  if (Math.abs(d - R) > gap || inGate(a) || !solid[pieceAt(a)]) return false;
  const to = d < R ? R - gap : R + gap; p.x = ARENA.x + dx/d*to; p.y = ARENA.y + dy/d*to; return true;
}
export const inArena = (p, m = 0) => ARENA && Math.hypot(p.x - ARENA.x, p.y - ARENA.y) < R - m;

// ---- the games ----
const A = {round:0, on:false, foes:[]};
const btn = document.getElementById('arenaBtn');
// Champions sail out from both sides of the ring, wherever there's open water.
function spawnSpot(i, n){
  const a = ARENA.gate + (i % 2 ? 1 : -1)*(Math.PI/2 + Math.floor(i/2)*.35);
  let r = R*.6; while (r > 80 && landDist(ARENA.x + Math.cos(a)*r, ARENA.y + Math.sin(a)*r) < 110) r -= 40;
  return {x:ARENA.x + Math.cos(a)*r, y:ARENA.y + Math.sin(a)*r};
}
function startRound(){
  const list = ROUNDS[Math.min(A.round, ROUNDS.length - 1)];
  A.foes = list.map((k, i) => { const p = spawnSpot(i, list.length); return spawnArena(k, p.x, p.y, {x:ARENA.x, y:ARENA.y}); });
  A.on = true; sfx('horn'); sfx('crowd'); toast(`Round ${A.round + 1}! ${list.length} champions sail out. The crowd roars.`, 3);
}
function endGames(msg){ clearArena(); A.on = false; A.foes = []; A.round = 0; if (msg){ toast(msg, 4); sfx('crowd'); } }
btn && btn.addEventListener('click', () => { if (!A.on) startRound(); });

export function updateArena(dt){
  if (!ARENA) return;
  const S = G.S, near = Math.hypot(S.x - ARENA.x, S.y - ARENA.y) < R + 900;
  if (near){ wallPush(S, 14); for (const e of enemies) if (!e.dead && Math.abs(e.x - ARENA.x) < R + 200 && Math.abs(e.y - ARENA.y) < R + 200) wallPush(e, e.spec.beam*.5); }
  const inside = inArena(S, 30);
  // the Colossus fades while you're inside, so the fight is never behind his legs
  const k = inside ? .2 : 1; for (const m of colossus ? colossus.userData.mats : []){ m.opacity += (k - m.opacity)*Math.min(1, dt*3); m.depthWrite = m.opacity > .9; }
  if (colossus) colossus.userData.flame.scale.set(1 + Math.sin(G.t*9)*.08, 1 + Math.sin(G.t*13)*.15, 1);
  if (near) for (const f of crowd){ f.position.y = (f.userData.h || WALL_H) - 1.5 + (A.on ? Math.abs(Math.sin(G.t*6 + f.userData.ph))*6 : 0); }
  if (A.on){
    if (G.sinking){ endGames('Defeated in the arena. Your boat is fished out and towed home.'); return; }
    if (!inArena(S, -60)){ endGames('You fled the arena. The crowd boos.'); return; }
    if (A.foes.every(e => e.dead)){
      const prize = PRIZE*(A.round + 1); S.gold += prize; A.round++; S.arenaBest = Math.max(S.arenaBest || 0, A.round); A.on = false; save();
      toast(`Round ${A.round} won! +${prize} drachmae. The crowd throws flowers.`, 4);
    }
  }
  if (btn){ btn.hidden = !inside || A.on || G.sheetOpen || G.sinking; if (!btn.hidden) btn.textContent = A.round ? `Next round · ${A.round + 1}` : 'Start the games'; }
}
// Test / builder: jump to the arena gate.
document.addEventListener('toarena', () => { if (!ARENA) return; const S = G.S; S.x = ARENA.x + Math.cos(ARENA.gate)*(R + (window.__TEST && __TEST.get("adist") ? +__TEST.get("adist") : 300)); S.y = ARENA.y + Math.sin(ARENA.gate)*(R + (window.__TEST && __TEST.get("adist") ? +__TEST.get("adist") : 300)); S.a = ARENA.gate + Math.PI; G.cam = {x:S.x, y:S.y}; });
