// Ships at sea (raiders, merchants, navy patrols), arrows, the volley and raid buttons, and loot from sunk ships.
// Crews shoot by themselves when in range. Pirates and navy ships never enter the Shallows, so home water is always safe.
// The witness rule: shooting a merchant or navy ship is a crime only if a navy ship sees it. Witnesses chase you until they lose you. No wanted level.
import {COMBAT, ENEMIES, WITNESS} from './config.js';
import {WORLD, RAIDERS, TRAFFIC, zoneAt, waveAt, pushOut, landDist} from './world.js';
import {G, ship, holdUsed, save} from './state.js';
import {scene} from './scene.js';
import {buildShip, animateShip, mesh} from './ships.js';
import {toast} from './ui.js';
import {sink} from './player.js';

const T = window.THREE;
const $ = id => document.getElementById(id);

// Sit a ship on the waves: height, pitch and roll from the water under it.
export function placeOnWaves(obj, x, y, a, len, t, sinkY = 0){
  const fx = Math.cos(a)*len*.4, fz = Math.sin(a)*len*.4;
  const pitch = (waveAt(x+fx, y+fz, t) - waveAt(x-fx, y-fz, t)) / (len*.8);
  const roll = (waveAt(x-fz*.5, y+fx*.5, t) - waveAt(x+fz*.5, y-fx*.5, t)) / (len*.4);
  obj.position.set(x, waveAt(x, y, t) + len*.05 - sinkY, y);
  obj.rotation.order = 'YXZ'; obj.rotation.y = -a; obj.rotation.z = Math.atan(pitch) + sinkY*.004; obj.rotation.x = Math.atan(roll)*.8 + sinkY*.006;
}

// ---- ships ----
// Every ship at sea is in `enemies`, whatever its side. Merchants start part way along their route.
export const enemies = [...RAIDERS, ...TRAFFIC].map(r => {
  const e = {...r, spec:ENEMIES[r.kind], x:r.home.x, y:r.home.y, a:Math.random()*6.28, v:0, hull:ENEMIES[r.kind].hull, cool:Math.random()*2,
    mode:'patrol', pa:Math.random()*6.28, dead:false, sinkY:0, respawn:0, obj:null, leg:1, wait:0, angry:false, attacked:false, foe:null, lost:0, calm:0};
  if (r.route && r.kind === 'merchant'){ const k = Math.random(), [p, q] = r.route; e.x = p.x + (q.x - p.x)*k; e.y = p.y + (q.y - p.y)*k; pushOut(e, 100); }
  return e;
});
const side = e => e.spec.side;
function buildEnemy(e){ if (e.obj) scene.remove(e.obj); e.obj = buildShip(e.spec.model, e.spec.look || {}, G.settings.dev.crew); scene.add(e.obj); }
export function rebuildEnemies(){ enemies.forEach(buildEnemy); }
enemies.forEach(buildEnemy);
document.addEventListener('crew', rebuildEnemies);
document.addEventListener('spawnraider', () => spawnNear('skiff'));

function respawn(e){ Object.assign(e, {x:e.home.x, y:e.home.y, hull:e.spec.hull, dead:false, sinkY:0, mode:'patrol', v:0, leg:1, wait:0, angry:false, attacked:false, foe:null}); e.obj.visible = true; }

// Builder tool: drop a skiff right next to you.
export function spawnNear(kind = 'skiff'){
  const e = enemies.find(e => e.kind === kind && (e.dead || Math.hypot(e.x - G.S.x, e.y - G.S.y) > 1500)) || enemies.find(e => e.kind === kind);
  respawn(e); e.x = G.S.x + Math.cos(G.S.a + 1.2)*380; e.y = G.S.y + Math.sin(G.S.a + 1.2)*380; e.home = {x:e.x, y:e.y};
}

const angDiff = (want, a) => ((want - a + Math.PI*3) % (Math.PI*2)) - Math.PI;
// Look ahead for land and turn to the side with open water. The side sticks until the way is clear, so ships don't wobble.
function avoidLand(e, want){
  const L = Math.max(150, e.v*2.4) + e.spec.len*.5, b = e.spec.beam;
  const free = a => landDist(e.x + Math.cos(a)*L, e.y + Math.sin(a)*L) > b*1.6 && landDist(e.x + Math.cos(a)*L*.5, e.y + Math.sin(a)*L*.5) > b*1.2;
  if (free(want)){ e.avoid = 0; return want; }
  if (!e.avoid) e.avoid = landDist(e.x + Math.cos(want + .9)*L, e.y + Math.sin(want + .9)*L) >= landDist(e.x + Math.cos(want - .9)*L, e.y + Math.sin(want - .9)*L) ? 1 : -1;
  for (let k=1; k<=9; k++){ const a = want + e.avoid*k*.33; if (free(a)) return a; }
  return want + e.avoid*Math.PI*.6;
}
function steer(e, tx, ty, speed, dt){
  const want = avoidLand(e, Math.atan2(ty - e.y, tx - e.x)), diff = angDiff(want, e.a);
  e.a += Math.max(-1, Math.min(1, diff)) * e.spec.turn * dt;
  e.v += (speed*Math.max(.25, Math.cos(diff)) - e.v) * Math.min(1, dt*1.2);
  // The Shallows are off limits: at the edge, slide along it instead of stopping.
  let moved = false;
  for (const turn of [0, .5, -.5, 1, -1, 1.6, -1.6]){
    const h = e.a + turn, nx = e.x + Math.cos(h)*e.v*dt, ny = e.y + Math.sin(h)*e.v*dt;
    if (side(e) === 'merchant' || zoneAt(nx, ny) !== 0){ e.x = nx; e.y = ny; if (turn) e.a += Math.sign(turn)*Math.min(Math.abs(turn), e.spec.turn*1.2*dt); moved = true; break; }
  }
  if (!moved) e.v *= .9;
  // Keep raiders from piling onto the same spot.
  for (const o of enemies){ if (o === e || o.dead) continue; const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || 1, min = (e.spec.beam + o.spec.beam)*1.6;
    if (d < min){ e.x += dx/d*(min - d)*.5; e.y += dy/d*(min - d)*.5; } }
  if (pushOut(e, e.spec.beam)) e.v *= .6;
  e.x = Math.max(60, Math.min(WORLD-60, e.x)); e.y = Math.max(60, Math.min(WORLD-60, e.y));
}

const playerSafe = () => zoneAt(G.S.x, G.S.y) === 0 || G.sheetOpen || !!G.dock || !G.settings.dev.raiders;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Close in on a target (a ship, or the player when tgt is null), then circle it at bow-shot range and shoot.
function fight(e, tgt, dt){
  const o = tgt || G.S, d = dist(e, o);
  e.spotT += dt; const sp = e.spec.speed*(e.spotT < COMBAT.windup ? .5 : 1); // a slow start after spotting you, so there's time to react
  if (d > 230) steer(e, o.x, o.y, sp, dt);
  else { const s = Math.atan2(e.y - o.y, e.x - o.x) + .9; steer(e, o.x + Math.cos(s)*220, o.y + Math.sin(s)*220, sp*.75, dt); }
  e.cool -= dt;
  if (d < COMBAT.range && e.cool <= 0){ e.cool = COMBAT.enemyShotEvery/e.spec.fighters*(.7 + Math.random()*.6); shoot(e, tgt, e.spec.dmg); }
}
function startFight(e){ if (e.mode !== 'chase'){ e.mode = 'chase'; e.cool = COMBAT.firstShot; e.spotT = 0; } }
// Follow a route of points; wait a moment at each end (merchants unloading).
function sail(e, dt, speed, pause){
  const p = e.route[e.leg % e.route.length];
  if (e.wait > 0){ e.wait -= dt; steer(e, p.x, p.y, 0, dt); return; }
  steer(e, p.x, p.y, speed, dt);
  if (dist(e, p) < 110){ e.leg++; e.wait = pause; }
}

function pirate(e, dt){
  const S = G.S, d = dist(e, S), fromHome = dist(e, e.home), safe = playerSafe();
  if (e.foe && (e.foe.dead || dist(e, e.foe) > 800)) e.foe = null;
  if (e.mode === 'chase' && !e.foe && (safe || fromHome > e.spec.leash || d > e.spec.sight*1.6)) e.mode = 'return';
  else if (e.mode !== 'chase' && !safe && d < e.spec.sight && fromHome < e.spec.leash*.8){
    startFight(e);
    if (!S.raidHint){ S.raidHint = true; toast('Raiders! Your crew shoots back by itself. Flee to the Shallows if it goes badly.', 5); }
  }
  if (e.mode === 'chase'){
    // the player comes first; a navy ship that shot at them is next
    const onPlayer = !safe && d < e.spec.sight*1.6 && fromHome < e.spec.leash;
    fight(e, onPlayer || !e.foe ? null : e.foe, dt);
  } else if (e.mode === 'return'){
    steer(e, e.home.x, e.home.y, e.spec.speed*.7, dt);
    if (fromHome < 120) e.mode = 'patrol';
  } else {
    e.pa += dt*.12; steer(e, e.home.x + Math.cos(e.pa)*260, e.home.y + Math.sin(e.pa)*260, e.spec.speed*.4, dt);
  }
}

function merchant(e, dt){
  const S = G.S, d = dist(e, S);
  if (e.attacked){
    // run straight away from the player, a little faster than usual
    e.mode = 'flee'; steer(e, e.x + (e.x - S.x)*10, e.y + (e.y - S.y)*10, e.spec.speed*1.3, dt);
    if (d > 700) e.calm -= dt; else e.calm = WITNESS.calm;
    if (e.calm <= 0){ e.attacked = false; e.mode = 'patrol'; }
    return;
  }
  e.mode = 'patrol'; sail(e, dt, e.spec.speed, 6);
}

function navy(e, dt){
  const S = G.S, d = dist(e, S), safe = playerSafe();
  if (e.angry){
    e.lost = d > e.spec.sight*1.6 || safe ? e.lost + dt : 0;
    if (e.lost > WITNESS.forget){ e.angry = false; e.lost = 0; if (d < 2000) toast('The navy patrol lost you and turned back.', 3); }
  }
  let tgt = e.angry && !safe ? 'player' : null;
  if (!tgt){ let bd = e.spec.sight; for (const o of enemies){ if (o.dead || side(o) !== 'pirate') continue; const od = dist(e, o); if (od < bd && zoneAt(o.x, o.y) !== 0){ bd = od; tgt = o; } } }
  if (tgt){ startFight(e); fight(e, tgt === 'player' ? null : tgt, dt); }
  else { e.mode = 'patrol'; sail(e, dt, e.spec.speed*.45, 0); }
}

function think(e, dt){
  const s = side(e);
  if (s === 'merchant') merchant(e, dt); else if (s === 'navy') navy(e, dt); else pirate(e, dt);
}

// ---- the witness rule ----
let crimeT = 0, crimeVictim = null;
const hostile = e => side(e) === 'pirate' || (side(e) === 'navy' && e.angry) || (side(e) === 'merchant' && e.attacked);
function crime(victim){
  if (side(victim) === 'merchant'){ victim.attacked = true; victim.calm = WITNESS.calm; } else victim.angry = true;
  crimeT = WITNESS.crimeSeconds; crimeVictim = victim;
}
function witnesses(dt){
  if (crimeT <= 0) return;
  crimeT -= dt; let seen = 0;
  for (const e of enemies){
    if (e.dead || side(e) !== 'navy' || e.angry) continue;
    if (dist(e, G.S) < e.spec.sight || (crimeVictim && !crimeVictim.dead && dist(e, crimeVictim) < e.spec.sight)){ e.angry = true; e.lost = 0; seen++; }
  }
  if (seen) toast(seen > 1 ? `${seen} navy ships saw that! They will chase you until they lose sight of you.` : 'A navy ship saw that! It will chase you until it loses sight of you.', 4);
}

// ---- arrows ----
const arrowGeo = new T.CylinderGeometry(.9, .9, 20, 4); arrowGeo.rotateZ(Math.PI/2);
const ARROWS = Array.from({length:80}, () => { const m = mesh(arrowGeo, '#f1ece0'); m.visible = false; m.castShadow = false; scene.add(m); return {m, live:false}; });
let arrowI = 0;
// from = an enemy (or null for the player); to = an enemy (or null for the player).
function shoot(from, to, dmg){
  const a = ARROWS[arrowI++ % ARROWS.length], src = from || G.S;
  Object.assign(a, {live:true, from, to, dmg, t:0, x0:src.x + (Math.random()-.5)*20, y0:src.y + (Math.random()-.5)*20, hit:Math.random() < COMBAT.hitChance,
    ox:(Math.random()-.5)*70, oy:(Math.random()-.5)*70});
  a.m.visible = true;
}
function updateArrows(dt){
  for (const a of ARROWS){ if (!a.live) continue;
    const tgt = a.to || G.S, tx = tgt.x + (a.hit ? 0 : a.ox), ty = tgt.y + (a.hit ? 0 : a.oy);
    const dist = Math.hypot(tx - a.x0, ty - a.y0), dur = Math.max(.35, dist/COMBAT.arrowSpeed);
    a.t += dt/dur;
    if (a.t >= 1){ a.live = false; a.m.visible = false; if (a.hit) land(a); continue; }
    const k = a.t, h = 18 + Math.sin(k*Math.PI)*dist*.28, x = a.x0 + (tx - a.x0)*k, y = a.y0 + (ty - a.y0)*k;
    const k2 = Math.min(1, k + .02), h2 = 18 + Math.sin(k2*Math.PI)*dist*.28;
    a.m.position.set(x, h, y);
    a.m.lookAt(a.x0 + (tx - a.x0)*k2, h2, a.y0 + (ty - a.y0)*k2); a.m.rotateY(Math.PI/2);
  }
}
function land(a){
  if (a.to){ const e = a.to; if (e.dead) return; e.hull -= a.dmg; e.hitT = .25;
    if (!a.from && side(e) !== 'pirate') crime(e);                       // you shot a merchant or a navy ship
    if (a.from && side(e) === 'pirate' && side(a.from) === 'navy'){ e.foe = a.from; startFight(e); } // pirates fight back
    if (e.hull <= 0) sinkEnemy(e); return; }
  if (G.sheetOpen) return;
  G.S.hull -= a.dmg; G.hurt = 1;
  if (G.S.hull <= 0){ sink(); enemies.forEach(e => { if (e.mode === 'chase') e.mode = 'return'; e.angry = false; e.attacked = false; }); crimeT = 0; }
}

// ---- loot ----
const LOOT = [];
function sinkEnemy(e){
  e.dead = true; e.respawn = COMBAT.respawn; e.mode = 'patrol';
  const [g0, g1] = e.spec.gold, gold = g0 + Math.floor(Math.random()*(g1 - g0 + 1));
  const crate = new T.Group();
  const box = mesh(new T.BoxGeometry(12, 9, 12), '#9b6b3a'); box.position.y = 2; crate.add(box);
  const band = mesh(new T.BoxGeometry(12.6, 2, 12.6), '#5a3518'); band.position.y = 3; crate.add(band);
  const coins = mesh(new T.CylinderGeometry(4.5, 5, 3, 8), '#e3ad48'); coins.position.y = 7.5; crate.add(coins);
  scene.add(crate);
  LOOT.push({x:e.x, y:e.y, gold, wood:e.spec.wood, life:COMBAT.lootLife, obj:crate});
  if (dist(e, G.S) < 1500) toast(`The ${e.spec.name.toLowerCase()} is sinking. Sail over its cargo to collect it.`, 3.5);
}
function updateLoot(dt){
  const S = G.S;
  for (let i=LOOT.length-1;i>=0;i--){ const l = LOOT[i]; l.life -= dt;
    l.obj.position.set(l.x, waveAt(l.x, l.y, G.t) - Math.max(0, 5 - l.life)*3, l.y); l.obj.rotation.y += dt*.6;
    if (Math.hypot(S.x - l.x, S.y - l.y) < COMBAT.lootRange && !G.sheetOpen){
      const room = Math.max(0, ship().hold - holdUsed()), wood = Math.min(room, l.wood);
      S.gold += l.gold; S.cargo.wood += wood; l.life = 0;
      toast(`+${l.gold} gold${wood ? `, +${wood} wood` : ''}${wood < l.wood ? ' (hold full, some wood lost)' : ''}`, 2.6); save();
    }
    if (l.life <= 0){ scene.remove(l.obj); LOOT.splice(i, 1); }
  }
}

// ---- the player's crew ----
let pCool = 0, volleyT = 0;
export const combatState = {target:null, threat:false};
// Your crew only shoots at ships that are hostile. Peaceful ships need the Raid button first.
function nearestShip(range, ok){ let best = null, bd = range;
  for (const e of enemies){ if (e.dead || !ok(e)) continue; const d = dist(e, G.S); if (d < bd){ bd = d; best = e; } } return best; }
function playerCrew(dt){
  const sh = ship(), tgt = G.dock ? null : nearestShip(COMBAT.range, hostile);
  combatState.target = tgt; G.firing = !!tgt;
  combatState.prey = tgt || G.dock || G.sheetOpen ? null : nearestShip(COMBAT.range*.9, e => !hostile(e));
  pCool -= dt; volleyT = Math.max(0, volleyT - dt);
  if (tgt && !G.sheetOpen && pCool <= 0){ pCool = COMBAT.shotEvery/sh.fighters*(.8 + Math.random()*.4); shoot(null, tgt, COMBAT.arrowDmg); }
}
function volley(){
  const tgt = combatState.target; if (!tgt || volleyT > 0) return;
  volleyT = COMBAT.volleyCooldown;
  const n = ship().fighters*COMBAT.volleyArrows;
  for (let i=0;i<n;i++) setTimeout(() => !tgt.dead && shoot(null, tgt, COMBAT.arrowDmg), i*70);
  toast('Volley!', 1);
}
$('volleyBtn').addEventListener('click', volley);
// Raid: attack the nearest merchant or navy ship on purpose. Your crew opens fire, and any navy ship watching will come for you.
$('raidBtn').addEventListener('click', () => {
  const e = combatState.prey; if (!e) return;
  crime(e); pCool = 0;
  if (!G.S.raidTip){ G.S.raidTip = true; toast('Only navy ships that see it will come after you. Get out of sight and they give up.', 5); }
});
addEventListener('keydown', e => { if (e.code === 'Space' && !G.fish && !G.sheetOpen && !G.mapOpen){ e.preventDefault(); volley(); } });

// Called every frame.
export function updateCombat(dt){
  for (const e of enemies){
    if (e.dead){ e.sinkY += dt*14; e.obj.visible = e.sinkY < 80; e.respawn -= dt; if (e.respawn <= 0) respawn(e); }
    else think(e, dt);
    e.hitT = Math.max(0, (e.hitT || 0) - dt);
    placeOnWaves(e.obj, e.x, e.y, e.a, e.spec.len, G.t, e.sinkY);
    e.obj.userData.firing = e.mode === 'chase';
    animateShip(e.obj, G.t, e.v);
  }
  playerCrew(dt);
  witnesses(dt);
  updateArrows(dt);
  updateLoot(dt);
  G.hurt = Math.max(0, (G.hurt || 0) - dt*2);
  combatState.threat = enemies.some(e => !e.dead && hostile(e) && e.mode === 'chase' && dist(e, G.S) < e.spec.sight*1.6);
  const show = !!combatState.target && !G.sheetOpen, btn = $('volleyBtn');
  btn.hidden = !show;
  if (show){ btn.disabled = volleyT > 0; btn.style.setProperty('--cd', (volleyT/COMBAT.volleyCooldown*360) + 'deg'); }
  const prey = combatState.prey, raid = $('raidBtn');
  raid.hidden = !prey;
  if (prey) raid.textContent = side(prey) === 'navy' ? 'Attack the navy' : 'Raid the merchant';
}
