// The Arena of Rhodes: a great ring of stone walls built out from the south-east coast of Rhodes, like a colosseum on the water.
// The landward side of the ring runs up onto the island; the gate faces the open sea, and the Colossus stands astride it,
// facing out. You sail in between his legs. Inside, start the games: rounds of pirate champions, a prize for each round won.
// The crowd on the walls cheers. The Colossus turns see-through while you're inside so he never blocks the fight.
import {ISLANDS, landDist} from './world.js?v=34a2ac7';
import {G, save} from './state.js?v=34a2ac7';
import {scene} from './scene.js?v=34a2ac7';
import {mat} from './ships.js?v=34a2ac7';
import {figure} from './town.js?v=34a2ac7';
import {buildColossus} from './monuments.js?v=34a2ac7';
import {spawnArena, clearArena, enemies} from './combat.js?v=34a2ac7';
import {toast} from './ui.js?v=34a2ac7';

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
    const w = new T.Mesh(new T.BoxGeometry(seg, WALL_H + 14, WALL_T), stone); w.position.y = WALL_H/2 - 13; w.castShadow = w.receiveShadow = true; p.add(w);
    const top = new T.Mesh(new T.BoxGeometry(seg + 1, 5, WALL_T + 8), ledge); top.position.y = WALL_H - 4; p.add(top);
    for (const sg of [1, -1]) for (const k of [-.25, .25]){ // two rows of arches on both faces, like a colosseum
      const arch = new T.Mesh(new T.BoxGeometry(seg*.28, WALL_H*.32, 1), dark); arch.position.set(k*seg, WALL_H*.22, sg*(WALL_T/2 + .3)); p.add(arch);
      const up = new T.Mesh(new T.BoxGeometry(seg*.22, WALL_H*.2, 1), dark); up.position.set(k*seg, WALL_H*.62, sg*(WALL_T/2 + .3)); p.add(up); }
    if (i % 6 === 0){ const flag = new T.Mesh(new T.BoxGeometry(1, 16, 24), mat(['#c64a3c', '#3f6c94', '#d48a2a'][i/6 % 3])); flag.position.set(0, WALL_H + 22, 0); p.add(flag);
      const pole = new T.Mesh(new T.CylinderGeometry(.8, .8, 34, 5), mat('#6e3d1e')); pole.position.set(0, WALL_H + 13, -12); p.add(pole); flag.position.z = 0; }
    for (let k=0;k<3;k++){ const f = figure(['#cf9035', '#3f6c94', '#ece2cb', '#c64a3c', '#71873f'][(i + k) % 5]); f.scale.setScalar(1.1); f.visible = true;
      f.position.set((k - 1)*seg*.3, WALL_H - 1.5, (k % 2 ? 4 : -4)); f.userData.ph = Math.random()*6; p.add(f); crowd.push(f); }
  }
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
  A.on = true; toast(`Round ${A.round + 1}! ${list.length} champions sail out. The crowd roars.`, 3);
}
function endGames(msg){ clearArena(); A.on = false; A.foes = []; A.round = 0; if (msg) toast(msg, 4); }
btn && btn.addEventListener('click', () => { if (!A.on) startRound(); });

export function updateArena(dt){
  if (!ARENA) return;
  const S = G.S, near = Math.hypot(S.x - ARENA.x, S.y - ARENA.y) < R + 900;
  if (near){ wallPush(S, 14); for (const e of enemies) if (!e.dead && Math.abs(e.x - ARENA.x) < R + 200 && Math.abs(e.y - ARENA.y) < R + 200) wallPush(e, e.spec.beam*.5); }
  const inside = inArena(S, 30);
  // the Colossus fades while you're inside, so the fight is never behind his legs
  const k = inside ? .2 : 1; for (const m of colossus ? colossus.userData.mats : []){ m.opacity += (k - m.opacity)*Math.min(1, dt*3); m.depthWrite = m.opacity > .9; }
  if (colossus) colossus.userData.flame.scale.set(1 + Math.sin(G.t*9)*.08, 1 + Math.sin(G.t*13)*.15, 1);
  if (near) for (const f of crowd){ f.position.y = WALL_H - 1.5 + (A.on ? Math.abs(Math.sin(G.t*6 + f.userData.ph))*6 : 0); }
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
