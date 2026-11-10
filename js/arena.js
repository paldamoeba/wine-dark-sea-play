// The Arena of Rhodes: a square basin of straight breakwaters built out from the south-east coast of Rhodes (P80, from the
// Blender picture; it was a stone ring before). The marble Colossus stands astride the gate in the front breakwater, facing
// the open sea, and you sail in between his legs. Inside, start the games: rounds of pirate champions, a prize for each round
// won. The crowd on the walkways cheers.
import {ISLANDS, landDist} from './world.js?v=b709147';
import {G, save, ship} from './state.js?v=b709147';
import {scene} from './scene.js?v=b709147';
import {TORCH_ROOTS} from './ships.js?v=b709147';
import {mergeStatic} from './merge.js?v=b709147';
import {award, TROPHIES} from './trophies.js?v=b709147';
import {spawnArena, clearArena, enemies, lobStone} from './combat.js?v=b709147';
import {ENEMIES} from './config.js?v=b709147';
import {toast} from './ui.js?v=b709147';
import {sfx} from './audio.js?v=b709147';
import {buildArena, frame, H, BW} from './arenabuild.js?v=b709147';

const T = window.THREE;
const R = 780; // only picks the spot
const ROUNDS = [['dinghy', 'dinghy', 'dinghy'], ['skiff', 'skiff'], ['skiff', 'skiff', 'dinghy', 'dinghy'], ['galley', 'skiff'], ['galley', 'galley'], ['galley', 'galley', 'skiff', 'skiff']];
// P81: each round has a name, said when it starts
const ROUND_NAMES = ['The raider boats', 'Twin skiffs', 'The swarm', 'Galley and skiff', 'Two galleys', 'The war fleet'];
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
let arenaG = null, colossus = null, merged = false, pieces = [], posts = [], crowd = [], torches = [];
const {ux, uy, at} = frame(ARENA ? ARENA.gate : 0);
if (ARENA){ const b = buildArena(ARENA, landDist); ({pieces, posts, crowd, torches, colossus} = b); arenaG = b.g; scene.add(arenaG); arenaG.userData.torches = torches; TORCH_ROOTS.add(arenaG); ARENA.walls = pieces; }
// petals thrown from the walls when a round is won
const PETALS = 260, petalPos = new Float32Array(PETALS*3), petalCol = new Float32Array(PETALS*3); let petals = null, petalT = 0;
function throwPetals(k = 1){ if (!ARENA) return; if (!petals){ const geo = new T.BufferGeometry(), C = ['#ffd24d', '#e8413a', '#fff4dc', '#ff8fa8'].map(c => new T.Color(c)); for (let i = 0; i < PETALS; i++){ const c = C[i % 4]; petalCol.set([c.r, c.g, c.b], i*3); } geo.setAttribute('position', new T.BufferAttribute(petalPos, 3)); geo.setAttribute('color', new T.BufferAttribute(petalCol, 3));
    petals = new T.Points(geo, new T.PointsMaterial({size:7, vertexColors:true, transparent:true, depthWrite:false})); petals.frustumCulled = false; scene.add(petals); }
  const S = G.S; for (let i = 0; i < PETALS; i++){ const a = Math.random()*6.28, r = Math.sqrt(Math.random())*520; petalPos[i*3] = S.x + Math.cos(a)*r; petalPos[i*3 + 1] = 90 + Math.random()*210; petalPos[i*3 + 2] = S.y + Math.sin(a)*r; } petalT = 6*k; petals.visible = true; petals.material.opacity = 1; }
function updatePetals(dt){ if (!(petalT > 0)) return; petalT -= dt; for (let i = 0; i < PETALS; i++){ const y = petalPos[i*3 + 1] - dt*(26 + i % 17); petalPos[i*3 + 1] = Math.max(1, y); petalPos[i*3] += Math.sin(G.t*1.6 + i)*dt*14; petalPos[i*3 + 2] += Math.cos(G.t*1.3 + i*2)*dt*14; } petals.geometry.attributes.position.needsUpdate = true; petals.material.opacity = Math.min(1, petalT); if (petalT <= 0) petals.visible = false; }

// ---- breakwaters, plinths and the fort: ships can't pass them except through the gate ----
function wallPush(p, rad){
  const gap = rad + BW/2 + 14; let hit = false;
  for (const w of pieces){ const dx = p.x - w.x, dy = p.y - w.y; if (Math.abs(dx) > w.L + gap || Math.abs(dy) > w.L + gap) continue;
    const along = dx*w.tx + dy*w.ty, across = -dx*w.ty + dy*w.tx; if (Math.abs(along) > w.L/2 + 2 || Math.abs(across) >= gap) continue;
    const to = (across < 0 ? -gap : gap) - across; p.x -= w.ty*to; p.y += w.tx*to; hit = true; }
  for (const o of posts){ const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1, r = o.r + rad; if (d < r){ p.x = o.x + dx/d*r; p.y = o.y + dy/d*r; hit = true; } }
  return hit;
}
if (ARENA) G.arenaZone = {x:ARENA.x, y:ARENA.y, r:ARENA.R*2.2}; // P107: no-go waters stop short of the arena (combat.js)
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
    A.foes = [spawnArena('galley', p.x, p.y, {x:ARENA.x, y:ARENA.y}, {k:H.k, kd:H.kd, hull:680, dmg:2.8, fighters:8, name:'Spartacus, champion of Rhodes', model:'trireme', look:{paint:'white', sail:'purple', flag:'none'},
      // P81: below half he charges like the pirate king: a red path, then straight at you. Steer him into a breakwater and he's stunned.
      charger:{rushAt:.5, rushEvery:10, rushWarn:2, rushTime:2.2, rushK:2.6, rushDmg:Math.round(28*H.kd), speed:ENEMIES.galley.speed}})];
    toast('Spartacus sails out!', 3);
    for (let i = 0; i < guards; i++){ const q = spawnSpot(i + 1, guards + 1); A.foes.push(spawnArena('skiff', q.x, q.y, {x:ARENA.x, y:ARENA.y}, {k:H.k, kd:H.kd})); }
  } else { const list = ROUNDS[A.round]; toast(`Round ${A.round + 1}: ${ROUND_NAMES[A.round]}`, 2.6); A.foes = list.map((k, i) => { const p = spawnSpot(i, list.length); return spawnArena(k, p.x, p.y, {x:ARENA.x, y:ARENA.y}, {k:H.k, kd:H.kd}); }); }
  A.on = true; A.stoneT = 5; sfx('horn'); sfx('crowd');
  if (n >= 1 && !A.stoneTip){ A.stoneTip = true; setTimeout(() => toast('The fort\'s catapult joins the games! Watch for red rings', 4), 2800); }
}
function endGames(msg){ clearArena(); A.on = false; A.foes = []; A.round = 0; if (msg){ toast(msg, 3.5); sfx('crowd'); } }
btn && btn.addEventListener('click', () => { if (!A.on) startRound(); });

export function updateArena(dt){
  if (!ARENA) return;
  const S = G.S, near = Math.hypot(S.x - ARENA.x, S.y - ARENA.y) < H*1.42 + 900;
  if (near){ wallPush(S, 14); for (const e of enemies) if (!e.dead && Math.abs(e.x - ARENA.x) < H*1.42 + 200 && Math.abs(e.y - ARENA.y) < H*1.42 + 200) e.wallHit = wallPush(e, e.spec.beam*.5); }
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
    // P81: from the Silver games on, the fort's catapult throws stones at you
    const n0 = gamesWon(); if (n0 >= 1 && ARENA.fort && (A.stoneT -= dt) <= 0){ A.stoneT = n0 >= 2 ? 6 : 8.5; lobStone(ARENA.fort.x, ARENA.fort.y, n0 >= 2); }
    if (A.foes.every(e => e.dead)){
      const n = gamesWon(), H = hardness(n), last = A.round >= FINAL, prize = Math.round((last ? 500 : PRIZE*(A.round + 1))*H.pay);
      S.gold += prize; S.arenaBest = Math.max(S.arenaBest || 0, (n*TOTAL) + A.round + 1); A.on = false; A.joy = last ? 9 : 5; throwPetals(last ? 1.4 : 1); sfx('crowd');
      if (last){ S.arena = {...(S.arena || {}), games:n + 1}; A.round = 0; clearArena(); const key = CUP_KEY[n] || (n === CUPS.length ? 'glory' : null); if (key && award(key)){ toast(`Trophy: ${TROPHIES[key].name}!`, 5); sfx('fanfare'); } else toast(`${gamesName(n)} games won! +${prize}`, 4); }
      else { A.round++; const mx = ship().hull, fix = Math.round(Math.min(mx - S.hull, mx*.2)); S.hull += fix; toast(fix > 0 ? `Round won! +${prize}. The crowd's carpenters fix ${fix} hull` : `Round won! +${prize}`, 3.5); }
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
