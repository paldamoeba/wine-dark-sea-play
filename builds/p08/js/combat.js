// Raiders, arrows, the volley button, and loot from sunk ships.
// Crews shoot by themselves when in range. Raiders never enter the Shallows, so home water is always safe.
import {COMBAT, ENEMIES} from './config.js';
import {WORLD, ISLANDS, RAIDERS, zoneAt, waveAt} from './world.js';
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

// ---- raiders ----
export const enemies = RAIDERS.map(r => ({...r, spec:ENEMIES[r.kind], x:r.home.x, y:r.home.y, a:Math.random()*6.28, v:0,
  hull:ENEMIES[r.kind].hull, cool:Math.random()*2, mode:'patrol', pa:Math.random()*6.28, dead:false, sinkY:0, respawn:0, obj:null}));
function buildEnemy(e){ if (e.obj) scene.remove(e.obj); e.obj = buildShip(e.spec.model, {}, G.settings.dev.crew); scene.add(e.obj); }
export function rebuildEnemies(){ enemies.forEach(buildEnemy); }
enemies.forEach(buildEnemy);
document.addEventListener('crew', rebuildEnemies);
document.addEventListener('spawnraider', () => spawnNear('skiff'));

function respawn(e){ Object.assign(e, {x:e.home.x, y:e.home.y, hull:e.spec.hull, dead:false, sinkY:0, mode:'patrol', v:0}); e.obj.visible = true; }

// Builder tool: drop a skiff right next to you.
export function spawnNear(kind = 'skiff'){
  const e = enemies.find(e => e.kind === kind && (e.dead || Math.hypot(e.x - G.S.x, e.y - G.S.y) > 1500)) || enemies.find(e => e.kind === kind);
  respawn(e); e.x = G.S.x + Math.cos(G.S.a + 1.2)*380; e.y = G.S.y + Math.sin(G.S.a + 1.2)*380; e.home = {x:e.x, y:e.y};
}

const angDiff = (want, a) => ((want - a + Math.PI*3) % (Math.PI*2)) - Math.PI;
function steer(e, tx, ty, speed, dt){
  const want = Math.atan2(ty - e.y, tx - e.x), diff = angDiff(want, e.a);
  e.a += Math.max(-1, Math.min(1, diff)) * 1.8 * dt;
  e.v += (speed*Math.max(.25, Math.cos(diff)) - e.v) * Math.min(1, dt*1.2);
  // The Shallows are off limits: at the edge, slide along it instead of stopping.
  let moved = false;
  for (const turn of [0, .5, -.5, 1, -1, 1.6, -1.6]){
    const h = e.a + turn, nx = e.x + Math.cos(h)*e.v*dt, ny = e.y + Math.sin(h)*e.v*dt;
    if (zoneAt(nx, ny) !== 0){ e.x = nx; e.y = ny; if (turn) e.a += Math.sign(turn)*Math.min(Math.abs(turn), 2*dt); moved = true; break; }
  }
  if (!moved) e.v *= .9;
  // Keep raiders from piling onto the same spot.
  for (const o of enemies){ if (o === e || o.dead) continue; const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || 1, min = (e.spec.beam + o.spec.beam)*1.6;
    if (d < min){ e.x += dx/d*(min - d)*.5; e.y += dy/d*(min - d)*.5; } }
  for (const is of ISLANDS){ const dx = e.x - is.x, dy = e.y - is.y, d = Math.hypot(dx, dy), min = is.r*1.02 + e.spec.beam;
    if (d < min){ e.x = is.x + dx/d*min; e.y = is.y + dy/d*min; e.v *= .6; } }
  e.x = Math.max(60, Math.min(WORLD-60, e.x)); e.y = Math.max(60, Math.min(WORLD-60, e.y));
}

function think(e, dt){
  const S = G.S, d = Math.hypot(S.x - e.x, S.y - e.y), fromHome = Math.hypot(e.x - e.home.x, e.y - e.home.y);
  const safe = zoneAt(S.x, S.y) === 0 || G.sheetOpen || !G.settings.dev.raiders;
  if (e.mode === 'chase' && (safe || fromHome > e.spec.leash || d > e.spec.sight*1.6)) e.mode = 'return';
  else if (e.mode !== 'chase' && !safe && d < e.spec.sight && fromHome < e.spec.leash*.8){
    e.mode = 'chase';
    if (!S.raidHint){ S.raidHint = true; toast('Raiders! Your crew shoots back by itself. Flee to the Shallows if it goes badly.', 5); }
  }
  if (e.mode === 'chase'){
    // Close in, then circle the player at bow-shot range.
    if (d > 210) steer(e, S.x, S.y, e.spec.speed, dt);
    else { const side = Math.atan2(e.y - S.y, e.x - S.x) + .9; steer(e, S.x + Math.cos(side)*200, S.y + Math.sin(side)*200, e.spec.speed*.8, dt); }
    e.cool -= dt;
    if (d < COMBAT.range && e.cool <= 0){ e.cool = COMBAT.shotEvery/e.spec.fighters*(.7 + Math.random()*.6); shoot(e, null, e.spec.dmg); }
  } else if (e.mode === 'return'){
    steer(e, e.home.x, e.home.y, e.spec.speed*.7, dt);
    if (fromHome < 120) e.mode = 'patrol';
  } else {
    e.pa += dt*.12; steer(e, e.home.x + Math.cos(e.pa)*260, e.home.y + Math.sin(e.pa)*260, e.spec.speed*.4, dt);
  }
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
  if (a.to){ const e = a.to; if (e.dead) return; e.hull -= a.dmg; e.hitT = .25; if (e.hull <= 0) sinkEnemy(e); return; }
  if (G.sheetOpen) return;
  G.S.hull -= a.dmg; G.hurt = 1;
  if (G.S.hull <= 0){ sink(); enemies.forEach(e => { if (e.mode === 'chase') e.mode = 'return'; }); }
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
  toast(`The ${e.spec.name.toLowerCase()} is sinking. Sail over its cargo to collect it.`, 3.5);
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
function nearestEnemy(range){ let best = null, bd = range;
  for (const e of enemies){ if (e.dead) continue; const d = Math.hypot(e.x - G.S.x, e.y - G.S.y); if (d < bd){ bd = d; best = e; } } return best; }
function playerCrew(dt){
  const sh = ship(), tgt = nearestEnemy(COMBAT.range);
  combatState.target = tgt; G.firing = !!tgt;
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
  updateArrows(dt);
  updateLoot(dt);
  G.hurt = Math.max(0, (G.hurt || 0) - dt*2);
  combatState.threat = enemies.some(e => !e.dead && e.mode === 'chase');
  const show = !!combatState.target && !G.sheetOpen, btn = $('volleyBtn');
  btn.hidden = !show;
  if (show){ btn.disabled = volleyT > 0; btn.style.setProperty('--cd', (volleyT/COMBAT.volleyCooldown*360) + 'deg'); }
}
