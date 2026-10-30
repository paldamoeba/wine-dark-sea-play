// The Arena of Rhodes: a ring of stone walls in the sea off the south-east of Rhodes, like a colosseum on the water.
// The gate faces south-east (toward the camera) and the Colossus stands astride it, facing out to sea. You sail in between
// his legs. Inside, start the games: rounds of pirate champions, a prize for each round won. The crowd on the walls cheers.
// The Colossus turns see-through while you're inside so he never blocks the fight.
import {ISLANDS, landDist} from './world.js';
import {G, save} from './state.js';
import {scene} from './scene.js';
import {mat} from './ships.js';
import {figure} from './town.js';
import {spawnArena, clearArena, enemies} from './combat.js';
import {toast} from './ui.js';

const T = window.THREE;
const R = 340, WALL_H = 46, WALL_T = 22, N = 40, GATE = .3; // radius, wall height and thickness, wall pieces, half the gate's opening (radians)
const ROUNDS = [['dinghy', 'dinghy'], ['skiff', 'skiff'], ['skiff', 'galley'], ['galley', 'galley'], ['galley', 'galley', 'skiff']];
const PRIZE = 80;

// ---- where: walk out from Rhodes to the south-east until there's room for the whole ring ----
const rhodes = ISLANDS.find(i => i.name === 'Rhodes');
export const ARENA = (() => {
  if (!rhodes) return null;
  const dx = Math.SQRT1_2, dy = Math.SQRT1_2;
  for (let t = rhodes.r; t < rhodes.r + 3000; t += 20){
    const x = rhodes.x + dx*t, y = rhodes.y + dy*t;
    if (landDist(x, y) > R + 90) return {x, y, gate:Math.atan2(dy, dx)};
  }
  return null;
})();
const angDiff = (a, b) => { const d = a - b; return d - Math.PI*2*Math.floor((d + Math.PI)/(Math.PI*2)); };
const inGate = a => Math.abs(angDiff(a, ARENA.gate)) < GATE - .04;

// ---- the build ----
const crowd = [], stone = mat('#ddd2b8'), dark = mat('#8f846c'), ledge = mat('#c9bd9f');
let colossus = null; const bronze = [];
if (ARENA){
  const g = new T.Group(); g.position.set(ARENA.x, 0, ARENA.y); scene.add(g);
  const seg = Math.PI*2*R/N + 2;
  for (let i=0;i<N;i++){
    const a = (i + .5)/N*Math.PI*2; if (Math.abs(angDiff(a, ARENA.gate)) < GATE) continue;
    const p = new T.Group(); p.position.set(Math.cos(a)*R, 0, Math.sin(a)*R); p.rotation.y = -a + Math.PI/2; g.add(p);
    const w = new T.Mesh(new T.BoxGeometry(seg, WALL_H, WALL_T), stone); w.position.y = WALL_H/2 - 6; w.castShadow = w.receiveShadow = true; p.add(w);
    const top = new T.Mesh(new T.BoxGeometry(seg + 1, 4, WALL_T + 6), ledge); top.position.y = WALL_H - 4; p.add(top);
    for (const sg of [1, -1]) for (const k of [-.25, .25]){ // arches on both faces
      const arch = new T.Mesh(new T.BoxGeometry(seg*.3, WALL_H*.45, 1), dark); arch.position.set(k*seg, WALL_H*.3, sg*(WALL_T/2 + .3)); p.add(arch); }
    if (i % 2 === 0) for (let k=0;k<2;k++){ const f = figure(['#cf9035', '#3f6c94', '#ece2cb', '#c64a3c', '#71873f'][(i + k) % 5]); f.scale.setScalar(1); f.visible = true;
      f.position.set((k - .5)*seg*.5, WALL_H - 2, 0); f.userData.ph = Math.random()*6; p.add(f); crowd.push(f); }
  }
  // two gate towers, the Colossus's feet stand on them
  const feet = [-1, 1].map(sg => { const a = ARENA.gate + sg*GATE, x = Math.cos(a)*R, z = Math.sin(a)*R;
    const tw = new T.Mesh(new T.CylinderGeometry(24, 28, WALL_H + 22, 10), stone); tw.position.set(x, (WALL_H + 22)/2 - 6, z); tw.castShadow = true; g.add(tw);
    return new T.Vector3(x, WALL_H + 16, z); });
  colossus = buildColossus(feet); g.add(colossus);
}

// A bronze giant: one foot on each tower, a crown of sun rays, a torch held high. Built facing out through the gate.
function buildColossus([f1, f2]){
  const c = new T.Group(), m1 = mat('#b5894a', {transparent:true, opacity:1}), m2 = mat('#9c7038', {transparent:true, opacity:1}), fire = mat('#f2b247', {transparent:true, opacity:1});
  bronze.push(m1, m2, fire);
  const M = (geo, m) => { const o = new T.Mesh(geo, m); o.castShadow = true; return o; };
  const hip = f1.clone().add(f2).multiplyScalar(.5); hip.y += 150;
  const out = new T.Vector3(Math.cos(ARENA.gate), 0, Math.sin(ARENA.gate)); // the way he faces
  for (const f of [f1, f2]){ // legs: foot up to the hip
    const v = hip.clone().sub(f), len = v.length(), leg = M(new T.CylinderGeometry(9, 12, len, 8), m2);
    leg.position.copy(f).addScaledVector(v, .5); leg.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()); c.add(leg);
    const foot = M(new T.BoxGeometry(30, 10, 18), m2); foot.position.copy(f); foot.position.y += 3; foot.lookAt(f.x + out.x, f.y + 3, f.z + out.z); c.add(foot); }
  const body = new T.Group(); body.position.copy(hip); body.lookAt(hip.x + out.x, hip.y, hip.z + out.z); c.add(body);
  const kilt = M(new T.CylinderGeometry(22, 30, 34, 10), m1); kilt.position.y = 6; body.add(kilt);
  const torso = M(new T.CylinderGeometry(30, 22, 70, 10), m1); torso.position.y = 58; body.add(torso);
  const head = M(new T.SphereGeometry(17, 12, 10), m1); head.position.y = 112; body.add(head);
  for (let i=0;i<9;i++){ const a = -Math.PI*.55 + i/8*Math.PI*1.1, ray = M(new T.ConeGeometry(3.5, 20, 4), m2);
    ray.position.set(Math.sin(a)*15, 112 + Math.cos(a)*15 + 4, -3); ray.rotation.z = -a; body.add(ray); }
  const arm = M(new T.CylinderGeometry(7, 9, 80, 8), m1); arm.position.set(32, 120, 0); arm.rotation.z = -.2; body.add(arm);
  const torch = M(new T.CylinderGeometry(4, 3, 26, 6), m2); torch.position.set(40, 168, 0); body.add(torch);
  const flame = M(new T.ConeGeometry(9, 26, 7), fire); flame.position.set(40, 192, 0); body.add(flame); c.userData.flame = flame;
  const cape = M(new T.BoxGeometry(46, 60, 4), m2); cape.position.set(0, 60, -20); cape.rotation.x = .12; body.add(cape);
  return c;
}

// ---- walls: ships can't pass them except through the gate ----
function wallPush(p, rad){
  const dx = p.x - ARENA.x, dy = p.y - ARENA.y, d = Math.hypot(dx, dy) || 1, gap = rad + WALL_T/2 + 4;
  if (Math.abs(d - R) > gap || inGate(Math.atan2(dy, dx))) return false;
  const to = d < R ? R - gap : R + gap; p.x = ARENA.x + dx/d*to; p.y = ARENA.y + dy/d*to; return true;
}
export const inArena = (p, m = 0) => ARENA && Math.hypot(p.x - ARENA.x, p.y - ARENA.y) < R - m;

// ---- the games ----
const A = {round:0, on:false, foes:[]};
const btn = document.getElementById('arenaBtn');
function startRound(){
  const S = G.S, list = ROUNDS[Math.min(A.round, ROUNDS.length - 1)], far = ARENA.gate + Math.PI; // they come in from the far side
  A.foes = list.map((k, i) => spawnArena(k, ARENA.x + Math.cos(far + (i - (list.length - 1)/2)*.5)*(R*.62), ARENA.y + Math.sin(far + (i - (list.length - 1)/2)*.5)*(R*.62), {x:ARENA.x, y:ARENA.y}));
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
  const k = inside ? .22 : 1; for (const m of bronze){ m.opacity += (k - m.opacity)*Math.min(1, dt*3); m.depthWrite = m.opacity > .9; }
  if (colossus) colossus.userData.flame.scale.set(1 + Math.sin(G.t*9)*.08, 1 + Math.sin(G.t*13)*.15, 1);
  for (const f of crowd){ f.position.y = WALL_H - 2 + (A.on ? Math.abs(Math.sin(G.t*6 + f.userData.ph))*5 : 0); }
  if (A.on){
    if (G.sinking){ endGames('Defeated in the arena. Your boat is fished out and towed home.'); return; }
    if (!inArena(S, -60)){ endGames('You fled the arena. The crowd boos.'); return; }
    if (A.foes.every(e => e.dead)){
      const prize = PRIZE*(A.round + 1); S.gold += prize; A.round++; S.arenaBest = Math.max(S.arenaBest || 0, A.round); A.on = false; save();
      toast(`Round ${A.round} won! +${prize} gold. The crowd throws flowers.`, 4);
    }
  }
  if (btn){ btn.hidden = !inside || A.on || G.sheetOpen || G.sinking; if (!btn.hidden) btn.textContent = A.round ? `Next round · ${A.round + 1}` : 'Start the games'; }
}
// Test / builder: jump to the arena gate.
document.addEventListener('toarena', () => { if (!ARENA) return; const S = G.S; S.x = ARENA.x + Math.cos(ARENA.gate)*(R + 260); S.y = ARENA.y + Math.sin(ARENA.gate)*(R + 260); S.a = ARENA.gate + Math.PI; G.cam = {x:S.x, y:S.y}; });
