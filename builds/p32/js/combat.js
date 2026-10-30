// Ships at sea (raiders, merchants, navy patrols), arrows, the volley and raid buttons, and loot from sunk ships.
// Crews shoot by themselves when in range. Pirates and navy ships never enter the Shallows, so home water is always safe.
// The witness rule: shooting a merchant or navy ship is a crime only if a navy ship sees it. Witnesses chase you until they lose you. No wanted level.
import {COMBAT, ENEMIES, WITNESS, ISLES, RAM, FORTS, FREEPORT} from './config.js';
import {WORLD, RAIDERS, TRAFFIC, ISLANDS, CITIES, HOME, HARBORS, PIER_LEN, rival, zoneAt, waveAt, pushOut, landDist} from './world.js';
import {G, ship, holdUsed, save, gain} from './state.js';
import {scene} from './scene.js';
import {buildShip, animateShip, mesh, SPECS, CEL, inkify} from './ships.js';
import {makeFire, updateFire, burn} from './fire.js';
import {blessing, fighters} from './crew.js';
import {progress} from './quests.js';
import {arrowK, ramDmg} from './upgrades.js';
import {toast} from './ui.js';
import {sink} from './player.js';
import {sinkPose, startSink, updateSinking} from './sinking.js';
import {buildFortress, FORT_GUNS} from './monuments.js';

const T = window.THREE;
const $ = id => document.getElementById(id);

// Sit a ship on the waves: height, pitch and roll from the water under it.
export function placeOnWaves(obj, x, y, a, len, t, sinkY = 0, roll0 = 0, pitch0 = 0){
  const fx = Math.cos(a)*len*.4, fz = Math.sin(a)*len*.4;
  const pitch = (waveAt(x+fx, y+fz, t) - waveAt(x-fx, y-fz, t)) / (len*.8);
  const roll = (waveAt(x-fz*.5, y+fx*.5, t) - waveAt(x+fz*.5, y-fx*.5, t)) / (len*.4);
  obj.position.set(x, waveAt(x, y, t) + len*.05 - sinkY, y);
  obj.rotation.order = 'YXZ'; obj.rotation.y = -a; obj.rotation.z = Math.atan(pitch) + pitch0; obj.rotation.x = Math.atan(roll)*.8 + roll0;
}

// ---- ships ----
// Every ship at sea is in `enemies`, whatever its side. Merchants start part way along their route.
function makeEnemy(r0){
  const r = r0.kind === 'navy' ? {...r0, kind:r0.isle.city} : r0; // a navy patrol belongs to whoever holds its island
  const e = {...r, city:r.kind === 'merchant' ? r.isle.city : ENEMIES[r.kind].city || null, spec:ENEMIES[r.kind], x:r.home.x, y:r.home.y, a:Math.random()*6.28, v:0, hull:ENEMIES[r.kind].hull, cool:Math.random()*2,
    mode:'patrol', pa:Math.random()*6.28, dead:false, sinkY:0, respawn:0, obj:null, leg:1, wait:0, angry:false, attacked:false, foe:null, lost:0, calm:0};
  if (r.route && r.kind === 'merchant'){ const k = Math.random(), [p, q] = r.route; e.x = p.x + (q.x - p.x)*k; e.y = p.y + (q.y - p.y)*k; pushOut(e, 100); }
  if (side(e) === 'navy' && !e.guard) e.isle.patrol = e;
  return e;
}
export const enemies = [...RAIDERS, ...TRAFFIC].map(makeEnemy);

// ---- forts: a stepped stone fortress on the shore of every city island (not the capitals), and two pirate forts ----
// Each one has archers on the walls, catapults on two bastions that throw stones far out to sea, and guard ships.
// You can only take an island once its fort has fallen and its guards are sunk (see "taking islands" below).
const fortName = o => o === 'pirate' ? 'Pirate fortress' : `${o === 'athens' ? 'Athenian' : 'Spartan'} fortress`;
const fortSpec = owner => ({name:fortName(owner), side:'fort', city:owner === 'pirate' ? null : owner, hull:FORTS.hull[owner === 'pirate' ? 'pirate' : 'city'], fighters:FORTS.fighters,
  dmg:FORTS.dmg, sight:FORTS.range, gold:FORTS.gold, wood:FORTS.wood, len:200, beam:200, speed:0, turn:0});
function fortSite(is){
  const base = Math.atan2(HOME.y - is.y, HOME.x - is.x);
  for (const off of [0, .4, -.4, .8, -.8, 1.2, -1.2, 1.6, -1.6, 2.1, -2.1, 2.6, -2.6, Math.PI]){ const a = base + off, dx = Math.cos(a), dy = Math.sin(a);
    let t = is.r + 120; while (t > 0 && landDist(is.x + dx*t, is.y + dy*t) > 0) t -= 6; // walk in to the shore
    const x = is.x + dx*(t - 60), y = is.y + dy*(t - 60);
    if (landDist(is.x + dx*(t + 320), is.y + dy*(t + 320)) < 160) continue; // needs open water in front
    if (HARBORS.some(h => Math.hypot(h.dock.x - x, h.dock.y - y) < 520)) continue; // keep clear of the town's pier
    return {x, y, a, sea:{x:is.x + dx*(t + 250), y:is.y + dy*(t + 250)}}; }
  return null;
}
for (const is of ISLANDS){
  const owner = FORTS.pirates.includes(is.name) ? 'pirate' : is.city && !is.capital ? is.city : null; if (!owner) continue;
  const site = fortSite(is); if (!site) continue;
  const spec = fortSpec(owner);
  const f = {kind:'fort', fort:true, owner, isle:is, spec, city:spec.city, x:site.x, y:site.y, a:site.a, sea:site.sea, home:{x:site.x, y:site.y}, v:0, hull:spec.hull, cool:2, stoneT:[2, 4.5],
    mode:'patrol', dead:false, sinkY:0, respawn:0, obj:null, angry:false, attacked:false, lost:0, calm:0, quiet:0, guards:[]};
  enemies.push(f); is.fort = f;
  for (let g=0; g<FORTS.guards; g++){ const p = {x:site.sea.x + Math.cos(site.a + (g ? 1.3 : -1.3))*260, y:site.sea.y + Math.sin(site.a + (g ? 1.3 : -1.3))*260}; pushOut(p, 180);
    const route = [0, 1, 2, 3].map(k => { const q = {x:site.sea.x + Math.cos(site.a + k*Math.PI/2 + g*Math.PI/4)*300, y:site.sea.y + Math.sin(site.a + k*Math.PI/2 + g*Math.PI/4)*300}; pushOut(q, 180); return q; });
    const e = makeEnemy({kind:owner === 'pirate' ? 'skiff' : owner, home:p, guard:true, isle:is, route}); enemies.push(e); f.guards.push(e); }
}
function buildFort(e){
  const g = buildFortress(e.owner, e.owner === 'pirate' ? '#231d1d' : e.owner === 'you' ? '#d48a2a' : CITIES[e.owner].color);
  g.rotation.y = -e.a; if (CEL.on) inkify(g); return g;
}
function side(e){ return e.spec.side; }
const cityName = c => CITIES[c] ? CITIES[c].name : '';
const adj = c => c === 'athens' ? 'Athenian' : 'Spartan';
// Every ship gets its own look: merchants in many paints and sails (some on a smaller round trader), pirates in dark
// colors, navies in their city's colors. Picked once per ship so it keeps its look.
const pick = (list, e, salt) => list[Math.abs(Math.floor(Math.sin((e.home.x + salt)*12.9898 + e.home.y*78.233)*43758.5453)) % list.length];
function lookOf(e){
  if (e.look) return e.look;
  const sd = side(e);
  if (sd === 'merchant'){ e.model = pick(['merchant', 'merchant', 'trader'], e, 1);
    return e.look = {flag:e.city || 'hermes', paint:pick(['white', 'oak', 'gold', 'green', 'aegean', 'white'], e, 2), sail:pick(['plain', 'ochre', 'sea', 'purple', 'bwr', 'plain'], e, 3)}; }
  if (sd === 'pirate') return e.look = {...(e.spec.look || {}), paint:pick(['raider', 'raider', 'black', 'oak'], e, 4), sail:pick(['blood', 'blood', 'purple', 'plain'], e, 5)};
  return e.spec.look || {};
}
function buildEnemy(e){ if (e.obj) scene.remove(e.obj);
  if (e.fort){ e.obj = buildFort(e); e.obj.position.set(e.x, 2, e.y); e.fire = makeFire(140, 120, 90); e.obj.add(e.fire); scene.add(e.obj); return; }
  e.obj = buildShip(e.model || e.spec.model, lookOf(e), G.settings.dev.crew);
  e.fire = makeFire(e.spec.len, e.spec.beam, SPECS[e.spec.model].H*.9); e.obj.add(e.fire); scene.add(e.obj); }
export function rebuildEnemies(){ enemies.forEach(buildEnemy); }
enemies.forEach(buildEnemy);
document.addEventListener('crew', rebuildEnemies);
document.addEventListener('spawnraider', () => spawnNear('skiff'));

// Pirates grow with you: once you sail a bigger ship, some raider boats come back as skiffs and some skiffs as galleys.
// (Danger also grows by area: the Shallows are safe, galleys and fortresses wait far out from the start.)
function growPirate(e){
  if (side(e) !== 'pirate' || e.guard || e.arena) return;
  e.kind0 = e.kind0 || e.kind; const t = G.S.tier, r = Math.random();
  const k = e.kind0 === 'dinghy' && t >= 1 && r < .5 ? 'skiff' : e.kind0 === 'skiff' && t >= 2 && r < .35 ? 'galley' : e.kind0;
  if (k !== e.kind){ e.kind = k; e.spec = ENEMIES[k]; buildEnemy(e); }
}
function respawn(e){
  growPirate(e);
  if (e.guard && e.isle.fort && e.isle.fort.owner !== 'pirate' && e.isle.city && e.kind !== e.isle.city){ e.kind = e.isle.city; e.spec = ENEMIES[e.kind]; e.city = e.kind; buildEnemy(e); }
  if (side(e) === 'navy' && !e.guard && e.isle.city && e.kind !== e.isle.city){ e.kind = e.isle.city; e.spec = ENEMIES[e.kind]; e.city = e.kind; buildEnemy(e); }
  Object.assign(e, {x:e.home.x, y:e.home.y, hull:e.spec.hull, dead:false, sinkY:0, sinkT:0, kick:0, mode:'patrol', v:0, leg:1, wait:0, angry:false, attacked:false, foe:null, prey:null, scare:null}); e.obj.visible = true; }

// Arena champions (arena.js): pirates who fight to the end inside the walls. They never respawn.
export function spawnArena(kind, x, y, home){
  const spec = {...ENEMIES[kind], leash:4000, sight:1400};
  const e = {kind, city:null, spec, x, y, home, a:Math.atan2(home.y - y, home.x - x), v:0, hull:spec.hull, cool:1, mode:'patrol', pa:0, dead:false, sinkY:0, respawn:1e9, obj:null, leg:1, wait:0,
    angry:false, attacked:false, foe:null, lost:0, calm:0, arena:true};
  buildEnemy(e); enemies.push(e); startFight(e); return e;
}
export function clearArena(){ for (let i=enemies.length-1;i>=0;i--) if (enemies[i].arena){ scene.remove(enemies[i].obj); enemies.splice(i, 1); } }

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
  const want = avoidLand(e, Math.atan2(ty - e.y, tx - e.x)), diff = angDiff(want, e.a), turn = Math.max(-1, Math.min(1, diff)) * e.spec.turn;
  e.a += turn * dt; e.heel = (e.heel || 0) + (Math.max(-.2, Math.min(.2, -turn*e.v/e.spec.speed*.12)) - (e.heel || 0))*Math.min(1, dt*3);
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
  if (d < COMBAT.range && e.cool <= 0 && broadside(e, o)){ e.cool = COMBAT.enemyShotEvery*(.75 + Math.random()*.5); salvo(e, tgt, e.spec.fighters, e.spec.dmg, 140); }
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
  } else if (e.mode === 'hunt'){
    // going after a merchant; gives up if it gets away or leads too far from home
    const m = e.prey;
    if (!m || m.dead || fromHome > e.spec.leash || dist(e, m) > e.spec.sight*1.8){ e.prey = null; e.mode = 'return'; }
    else fight(e, m, dt);
  } else if (e.mode === 'return'){
    steer(e, e.home.x, e.home.y, e.spec.speed*.7, dt);
    if (fromHome < 120) e.mode = 'patrol';
  } else {
    const m = enemies.find(o => !o.dead && side(o) === 'merchant' && dist(o, e) < e.spec.sight && zoneAt(o.x, o.y) !== 0);
    if (m && fromHome < e.spec.leash*.7){ e.prey = m; e.mode = 'hunt'; e.cool = COMBAT.firstShot; e.spotT = 0; return; }
    e.pa += dt*.12; steer(e, e.home.x + Math.cos(e.pa)*260, e.home.y + Math.sin(e.pa)*260, e.spec.speed*.4, dt);
  }
}

function merchant(e, dt){
  const S = G.S, d = dist(e, S);
  if (e.scare && (e.scare.dead || dist(e, e.scare) > 900)) e.scare = null;
  if (e.scare && !e.attacked){ e.mode = 'flee'; const o = e.scare; steer(e, e.x + (e.x - o.x)*10, e.y + (e.y - o.y)*10, e.spec.speed*1.3, dt); return; } // running from pirates
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
    if (e.lost > WITNESS.forget){ e.angry = false; e.lost = 0; if (d < 2000) toast(`The ${adj(e.city)} ship lost you and turned back.`, 3); }
  }
  let tgt = e.angry && !safe ? 'player' : null;
  if (!tgt){ let bd = e.spec.sight; for (const o of enemies){ if (o.dead || !(side(o) === 'pirate' || (side(o) === 'navy' && o.city !== e.city))) continue; const od = dist(e, o); if (od < bd && zoneAt(o.x, o.y) !== 0){ bd = od; tgt = o; } } }
  if (tgt){ startFight(e); fight(e, tgt === 'player' ? null : tgt, dt); return; }
  // every few minutes a warship sails out to attack the nearest enemy island, then comes home
  e.raidT = (e.raidT ?? ISLES.raidEvery[0]*Math.random()*1.5) - dt;
  if (!e.goal && e.raidT <= 0 && e.hull > e.spec.hull*.6){
    let best = null, bd = Infinity;
    for (const is of ISLANDS){ if (!is.patrol || is.capital || !is.city || is.city === e.city) continue; const d = dist(is, e); if (d < bd){ bd = d; best = is; } }
    e.goal = best; e.stay = 0; if (!best) e.raidT = 30;
  }
  const g = e.goal;
  if (g){
    if (g.city === e.city || e.hull < e.spec.hull*.4 || e.stay > ISLES.raidStay){ e.goal = null; e.raidT = ISLES.raidEvery[0] + Math.random()*(ISLES.raidEvery[1] - ISLES.raidEvery[0]); return; }
    const a = Math.atan2(e.y - g.y, e.x - g.x) + .25, R = g.r + 520; // circle the island offshore, with room to fight
    steer(e, g.x + Math.cos(a)*R, g.y + Math.sin(a)*R, e.spec.speed*.8, dt); e.mode = 'raid';
    if (dist(e, g) < R + 250) e.stay += dt;
    return;
  }
  e.mode = 'patrol'; sail(e, dt, e.spec.speed*.45, 0);
}

// A fort can't move. Archers on its walls shoot salvos at you in range; its catapults throw stones much farther.
// Left alone for a while, its masons patch the walls.
function fortThink(e, dt){
  e.cool -= dt; e.quiet = (e.quiet || 0) + dt;
  if (e.quiet > FORTS.healAfter && e.hull < e.spec.hull) e.hull = Math.min(e.spec.hull, e.hull + FORTS.heal*dt);
  if (!hostile(e) || playerSafe() || G.sinking) return;
  const d = dist(e, G.S);
  if (d < FORTS.stoneRange) e.stoneT.forEach((t, i) => { e.stoneT[i] = t - dt; if (e.stoneT[i] <= 0){ e.stoneT[i] = FORTS.stoneEvery*(.85 + Math.random()*.3); throwStone(e, i); } });
  if (d > e.spec.sight || e.cool > 0) return;
  e.cool = FORTS.every*(.8 + Math.random()*.4); salvo(e, null, e.spec.fighters, e.spec.dmg, 110);
  if (!G.S.fortTip){ G.S.fortTip = true; toast(`The ${e.spec.name.toLowerCase()} is shooting! Its catapults throw stones: steer out of the red rings.`, 5); }
}

// ---- catapult stones: thrown high at where you're heading. A red ring on the water shows where each one will land ----
const stoneGeo = new T.DodecahedronGeometry(7, 0), ringGeo = new T.RingGeometry(.86, 1, 32); ringGeo.rotateX(-Math.PI/2);
const splashGeo = new T.CylinderGeometry(.7, 1, 1, 12, 1, true);
const STONES = Array.from({length:12}, () => {
  const m = mesh(stoneGeo, '#5b544c'); m.visible = false; scene.add(m);
  const r = new T.Mesh(ringGeo, new T.MeshBasicMaterial({color:'#e0442f', transparent:true, opacity:.8, depthWrite:false})); r.visible = false; scene.add(r);
  const sp = new T.Mesh(splashGeo, new T.MeshBasicMaterial({color:'#f4fbff', transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide})); sp.visible = false; scene.add(sp);
  return {m, r, sp, live:false, splash:0}; });
let stoneI = 0;
function throwStone(f, i){
  const [lx, lz] = FORT_GUNS[i], ca = Math.cos(f.a), sa = Math.sin(f.a), S = G.S, lead = G.v*FORTS.stoneFlight*.8;
  const st = STONES[stoneI++ % STONES.length], sp = 40 + Math.random()*30, ang = Math.random()*6.28;
  Object.assign(st, {live:true, t:0, x0:f.x + lx*ca - lz*sa, y0:f.y + lx*sa + lz*ca, tx:S.x + Math.cos(S.a)*lead + Math.cos(ang)*sp, ty:S.y + Math.sin(S.a)*lead + Math.sin(ang)*sp});
  st.m.visible = st.r.visible = true;
}
function updateStones(dt){
  for (const st of STONES){
    if (st.splash > 0){ st.splash -= dt; const k = 1 - st.splash/.9; st.sp.scale.set(20 + k*40, 10 + Math.sin(k*Math.PI)*60, 20 + k*40); st.sp.position.set(st.tx, waveAt(st.tx, st.ty, G.t), st.ty); st.sp.material.opacity = .85*(1 - k); if (st.splash <= 0) st.sp.visible = false; }
    if (!st.live) continue;
    st.t += dt/FORTS.stoneFlight; const k = Math.min(1, st.t);
    st.m.position.set(st.x0 + (st.tx - st.x0)*k, 70*(1 - k) + Math.sin(k*Math.PI)*300, st.y0 + (st.ty - st.y0)*k); st.m.rotation.x += dt*4; st.m.rotation.z += dt*3;
    st.r.position.set(st.tx, waveAt(st.tx, st.ty, G.t) + 1.5, st.ty); st.r.scale.setScalar(FORTS.stoneHit*(1.15 - k*.15)); st.r.material.opacity = .25 + k*.6;
    if (k < 1) continue;
    st.live = false; st.m.visible = st.r.visible = false; st.splash = .9; st.sp.visible = true;
    const S = G.S;
    if (!G.sheetOpen && !G.sinking && Math.hypot(S.x - st.tx, S.y - st.ty) < FORTS.stoneHit){
      S.hull -= FORTS.stoneDmg; G.hurt = 1; G.kick = Math.min(.25, (G.kick || 0) + .15); G.shake = 1;
      if (!S.stoneTip){ S.stoneTip = true; toast('Hit by a catapult stone! Keep moving and turn away from the red rings.', 4); }
      if (S.hull <= 0){ sink(); enemies.forEach(e => { if (e.mode === 'chase') e.mode = 'return'; e.angry = false; e.attacked = false; }); crimeT = 0; }
    }
  }
}
function think(e, dt){
  const s = side(e); if (s === 'own') return;
  if (s === 'fort') fortThink(e, dt); else if (s === 'merchant') merchant(e, dt); else if (s === 'navy') navy(e, dt); else pirate(e, dt);
}

// ---- the witness rule ----
let crimeT = 0, crimeVictim = null, crimeCity = null;
const hostile = e => side(e) === 'pirate' || (side(e) === 'fort' && (!e.city || e.angry || (G.hunted || {})[e.city])) || (side(e) === 'navy' && e.angry) || (side(e) === 'merchant' && e.attacked);
function crime(victim){
  if (side(victim) === 'merchant'){ victim.attacked = true; victim.calm = WITNESS.calm; } else victim.angry = true;
  crimeT = WITNESS.crimeSeconds; crimeVictim = victim; crimeCity = victim.city;
}
function witnesses(dt){
  if (crimeT <= 0) return;
  crimeT -= dt; let seen = 0;
  for (const e of enemies){
    if (e.dead || side(e) !== 'navy' || e.angry || e.city !== crimeCity) continue; // only that city's ships care
    if (dist(e, G.S) < e.spec.sight || (crimeVictim && !crimeVictim.dead && dist(e, crimeVictim) < e.spec.sight)){ e.angry = true; e.lost = 0; seen++; }
  }
  if (seen) toast(seen > 1 ? `${seen} ${adj(crimeCity)} ships saw that! They will chase you until they lose sight of you.` : `An ${adj(crimeCity)} ship saw that! It will chase you until it loses sight of you.`.replace('An Spartan', 'A Spartan'), 4);
}

// ---- hit effects: little water splashes for misses, wood chips flying for hits ----
const fxGeo = new T.IcosahedronGeometry(1, 1), chipGeo = new T.BoxGeometry(2.4, 1, 1.2);
const FX = Array.from({length:60}, (_, i) => { const chip = i % 2 === 0, m = new T.Mesh(chip ? chipGeo : fxGeo, new T.MeshBasicMaterial({color:chip ? '#8a5d3e' : '#f4fbff', transparent:true, depthWrite:false}));
  m.visible = false; scene.add(m); return {m, chip, life:0}; });
let fxI = 0;
function puff(x, y, chip, n){ for (let k=0;k<n;k++){ let f; for (let j=0;j<FX.length;j++){ const c = FX[(fxI + j) % FX.length]; if (c.chip === chip){ f = c; fxI = (fxI + j + 1) % FX.length; break; } }
  const a = Math.random()*6.28, sp = 20 + Math.random()*30; Object.assign(f, {life:.7, x, y, h:6, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, vh:30 + Math.random()*40}); f.m.visible = true; } }
function splash(x, y){ puff(x, y, false, 5); }
function spark(x, y){ puff(x, y, true, 4); }
function updateFx(dt){ for (const f of FX){ if (f.life <= 0) continue; f.life -= dt; if (f.life <= 0){ f.m.visible = false; continue; }
  f.vh -= 140*dt; f.x += f.vx*dt; f.y += f.vy*dt; f.h = Math.max(0, f.h + f.vh*dt);
  f.m.position.set(f.x, waveAt(f.x, f.y, G.t) + f.h, f.y); f.m.rotation.x += dt*9; f.m.scale.setScalar(f.chip ? 1.4 : 2 + (1 - f.life)*2); f.m.material.opacity = Math.min(1, f.life*2); } }

// ---- arrows ----
const arrowGeo = new T.CylinderGeometry(.9, .9, 20, 4); arrowGeo.rotateZ(Math.PI/2);
const ARROWS = Array.from({length:160}, () => { const m = mesh(arrowGeo, '#f1ece0'); m.visible = false; m.castShadow = false; scene.add(m); return {m, live:false}; });
let arrowI = 0;
// Every arrow does the same damage whoever shoots it. Bigger ships win by having more archers and thicker hulls.
const lenOf = e => e ? e.spec.len : ship().len;
// Archers shoot over the sides: a target dead ahead or dead astern is out of reach until you turn side-on.
export function broadside(from, to){ const src = from || G.S, a = from ? from.a : G.S.a, tg = to || G.S;
  return Math.abs(Math.sin(Math.atan2(tg.y - src.y, tg.x - src.x) - a)) > COMBAT.sideArc; }
// Every archer aboard shoots their own arrow, a moment apart.
function salvo(from, to, n, dmg, gap){ for (let i=0;i<n;i++) setTimeout(() => { if (!(from && from.dead) && !(to && to.dead) && !(!to && G.sinking)) shoot(from, to, dmg); }, i*gap*(.7 + Math.random()*.6)); }
// from = an enemy (or null for the player); to = an enemy (or null for the player).
function shoot(from, to, dmg){
  const a = ARROWS[arrowI++ % ARROWS.length], src = from || G.S, sa = from ? from.a : G.S.a, al = (Math.random() - .5)*lenOf(from)*.6;
  Object.assign(a, {live:true, from, to, dmg, t:0, x0:src.x + Math.cos(sa)*al, y0:src.y + Math.sin(sa)*al, hit:Math.random() < COMBAT.hitChance + (from ? 0 : blessing().hit || 0),
    ox:(Math.random()-.5)*70, oy:(Math.random()-.5)*70});
  a.m.visible = true;
}
function updateArrows(dt){
  for (const a of ARROWS){ if (!a.live) continue;
    const tgt = a.to || G.S, tx = tgt.x + (a.hit ? 0 : a.ox), ty = tgt.y + (a.hit ? 0 : a.oy);
    const dist = Math.hypot(tx - a.x0, ty - a.y0), dur = Math.max(.35, dist/COMBAT.arrowSpeed);
    a.t += dt/dur;
    if (a.t >= 1){ a.live = false; a.m.visible = false; if (a.hit) land(a); else splash(tx, ty, 1); continue; }
    const k = a.t, h = 18 + Math.sin(k*Math.PI)*dist*.28, x = a.x0 + (tx - a.x0)*k, y = a.y0 + (ty - a.y0)*k;
    const k2 = Math.min(1, k + .02), h2 = 18 + Math.sin(k2*Math.PI)*dist*.28;
    a.m.position.set(x, h, y);
    a.m.lookAt(a.x0 + (tx - a.x0)*k2, h2, a.y0 + (ty - a.y0)*k2); a.m.rotateY(Math.PI/2);
  }
}
function land(a){
  const tg = a.to || G.S; spark(tg.x, tg.y);
  if (a.to){ const e = a.to; if (e.dead) return; e.hull -= a.dmg; e.hitT = .25; e.quiet = 0; e.kick = Math.min(.12, (e.kick || 0) + .5*a.dmg/e.spec.len);
    if (!a.from && side(e) !== 'pirate' && !(e.fort && !e.city)) crime(e); // you shot a merchant, a navy ship or a city's fort
    if (a.from && side(e) === 'pirate' && side(a.from) === 'navy'){ e.foe = a.from; startFight(e); } // pirates fight back
    if (a.from && side(e) === 'merchant' && side(a.from) === 'pirate') e.scare = a.from;
    if (e.hull <= 0) sinkEnemy(e, !a.from); return; }
  if (G.sheetOpen || G.sinking) return;
  G.S.hull -= a.dmg; G.hurt = 1;
  // a hit rocks the boat away from the shooter and shakes the view; harder on small boats
  const src = a.from, push = Math.min(10, a.dmg*90/ship().len);
  if (src){ const d = Math.hypot(G.S.x - src.x, G.S.y - src.y) || 1; G.S.x += (G.S.x - src.x)/d*push; G.S.y += (G.S.y - src.y)/d*push; }
  G.kick = Math.min(.25, (G.kick || 0) + push*.012); G.shake = Math.min(1, (G.shake || 0) + .35);
  if (G.S.hull <= 0){ sink(); enemies.forEach(e => { if (e.mode === 'chase') e.mode = 'return'; e.angry = false; e.attacked = false; }); crimeT = 0; }
}

// ---- loot ----
const LOOT = [];
function sinkEnemy(e, byPlayer){
  if (byPlayer) progress('sink', e.kind);
  const w = G.S.war; // a war contract from a fortress
  if (byPlayer && w && w.got < w.n && e.city === w.foe && (w.t === 'fort' ? e.fort : side(e) === 'navy')){ w.got++;
    setTimeout(() => toast(w.got >= w.n ? `War contract done! Hand it in at any ${adj(w.city)} fortress for ${w.gold} drachmae.` : `War contract: ${w.got} of ${w.n}`, 3.5), 1800); }
  // the other city pays a bounty for each enemy warship you sink
  if (byPlayer && side(e) === 'navy'){ const pay = rival(e.city); G.S.gold += ISLES.bounty; setTimeout(() => toast(`${cityName(pay)} pays you ${ISLES.bounty} drachmae for sinking an ${adj(e.city)} ship.`.replace('an Spartan', 'a Spartan'), 3.5), 3600); }
  e.dead = true; e.respawn = e.fort ? FORTS.rebuild : COMBAT.respawn; e.mode = 'patrol'; e.sinkT = 0; e.sinkSide = Math.random() < .5 ? 1 : -1;
  if (!e.fort) startSink(e.x, e.y, e.spec.len);
  const [g0, g1] = e.spec.gold, gold = g0 + Math.floor(Math.random()*(g1 - g0 + 1));
  const crate = new T.Group();
  const box = mesh(new T.BoxGeometry(12, 9, 12), '#9b6b3a'); box.position.y = 2; crate.add(box);
  const band = mesh(new T.BoxGeometry(12.6, 2, 12.6), '#5a3518'); band.position.y = 3; crate.add(band);
  const coins = mesh(new T.CylinderGeometry(4.5, 5, 3, 8), '#e3ad48'); coins.position.y = 7.5; crate.add(coins);
  scene.add(crate);
  const at = e.fort ? e.sea : e; // a fort's treasury floats out in front of it
  if (e.fort) crate.scale.setScalar(1.8);
  // a merchant's cargo spills out with it: a few of its trade goods
  const goods = side(e) === 'merchant' ? {k:['wine', 'oil', 'pottery', 'obsidian'][Math.floor(Math.random()*4)], n:2 + Math.floor(Math.random()*4)} : null;
  LOOT.push({x:at.x, y:at.y, gold, wood:e.spec.wood, goods, life:COMBAT.lootLife*(e.fort ? 2 : 1), obj:crate});
  if (e.fort){ toast(e.city ? `The ${e.spec.name.toLowerCase()} falls! Grab its treasury, sink the guard ships, then hold the bay to take ${e.isle.name}.` : `The ${e.spec.name.toLowerCase()} falls! Its treasury floats out in front of the walls.`, 5.5); e.angry = false; return; }
  if (dist(e, G.S) < 1500) toast(`The ${e.spec.name.toLowerCase()} is sinking. Sail over its cargo to collect it.`, 3.5);
}
function updateLoot(dt){
  const S = G.S;
  for (let i=LOOT.length-1;i>=0;i--){ const l = LOOT[i]; l.life -= dt;
    l.obj.position.set(l.x, waveAt(l.x, l.y, G.t) - Math.max(0, 5 - l.life)*3, l.y); l.obj.rotation.y += dt*.6;
    if (Math.hypot(S.x - l.x, S.y - l.y) < COMBAT.lootRange && !G.sheetOpen){
      // the wreck's timber patches your hull first (each plank mends 6 hull), but only up to a field repair: a full repair needs a dry dock.
      // What's left over goes in the hold.
      const cap = ship().hull*COMBAT.patchTo, need = Math.ceil(Math.max(0, cap - S.hull)/6), patch = Math.min(need, l.wood), left = l.wood - patch;
      const room = Math.max(0, ship().hold - holdUsed()), wood = Math.min(room, left);
      S.hull = Math.max(S.hull, Math.min(cap, S.hull + patch*6)); S.gold += l.gold; S.cargo.wood += wood; l.life = 0;
      if (l.goods){ const n = Math.min(l.goods.n, Math.max(0, ship().hold - holdUsed())); S.cargo[l.goods.k] = (S.cargo[l.goods.k] || 0) + n; if (n) setTimeout(() => toast(`+${n} ${l.goods.k === 'oil' ? 'olive oil' : l.goods.k} from the merchant's cargo`, 2.6), 3000); }
      gain('coin', l.gold); if (wood) gain('wood', wood); if (l.goods) gain(l.goods.k, l.goods.n);
      if (patch || wood < left) toast(`+${l.gold} drachmae${patch ? `, hull patched with ${patch} planks` : need === 0 && S.hull < ship().hull ? ', the rest needs a dry dock' : ''}${wood ? `, +${wood} wood` : ''}${wood < left ? ' (hold full)' : ''}`, 3); save();
    }
    if (l.life <= 0){ scene.remove(l.obj); LOOT.splice(i, 1); }
  }
}

// ---- collisions: ships bump and push apart. Your bow into a ship at speed is a ram hit ----
// Each ship is five circles along its length, stern to bow, a little wider than its beam.
const circles = (x, y, a, len) => [-.4, -.2, 0, .2, .4].map(k => [x + Math.cos(a)*len*k, y + Math.sin(a)*len*k]);
function collide(){
  if (G.dock || G.sinking) return;
  const S = G.S, sh = ship(), pr = sh.beam*.55, mP = sh.len*sh.beam;
  for (const e of enemies){ if (e.dead || e.fort) continue;
    e.ramT = Math.max(0, (e.ramT || 0) - 1/60); e.bumpT = Math.max(0, (e.bumpT || 0) - 1/60);
    const reach = (sh.len + e.spec.len)/2 + 20; if (Math.abs(e.x - S.x) > reach || Math.abs(e.y - S.y) > reach) continue;
    const mine = circles(S.x, S.y, S.a, sh.len), theirs = circles(e.x, e.y, e.a, e.spec.len), er = e.spec.beam*.55;
    let hit = null;
    mine.forEach(([ax, ay], i) => theirs.forEach(([bx, by]) => { const d = Math.hypot(bx - ax, by - ay); if (d < pr + er && (!hit || d < hit.d)) hit = {d, ax, ay, bx, by, i}; }));
    if (!hit) continue;
    // push apart; the bigger ship moves less
    const d = hit.d || 1, nx = (hit.bx - hit.ax)/d, ny = (hit.by - hit.ay)/d, over = pr + er - d, mE = e.spec.len*e.spec.beam, kP = mE/(mP + mE);
    S.x -= nx*over*kP; S.y -= ny*over*kP; e.x += nx*over*(1 - kP); e.y += ny*over*(1 - kP); pushOut(S, sh.beam*.6); pushOut(e, e.spec.beam*.6);
    const into = Math.cos(S.a)*nx + Math.sin(S.a)*ny, fast = G.v/sh.speed;
    if (hit.i >= 3 && into > .6 && fast > RAM.minSpeed && !e.ramT && zoneAt(S.x, S.y) !== 0){ e.ramT = RAM.cooldown; ramHit(e, Math.min(1, fast)*into); G.v *= .35; e.v *= .4; }
    else if (!e.bumpT && G.v > 20){ e.bumpT = .8; G.kick = Math.min(.25, (G.kick || 0) + .06); G.shake = Math.min(1, (G.shake || 0) + .25); G.v *= .6; e.v *= .7; }
  }
}
// A head-on hit. With a ram it hurts them a lot and you a little; without one, both ships take the same small knock.
function ramHit(e, k){
  const S = G.S, r = ramDmg(), dmg = Math.max(1, Math.round((r || RAM.bump)*k)), self = r ? Math.round(1 + dmg*.04) : dmg;
  e.hull -= dmg; e.hitT = .3; e.kick = .18;
  S.hull -= self; G.hurt = 1; G.kick = Math.min(.25, (G.kick || 0) + .15); G.shake = 1;
  G.pops = [...(G.pops || []), {t:G.t, txt:`-${dmg}`, x:e.x, y:e.y, c:'#f2a093'}];
  if (side(e) !== 'pirate') crime(e); else startFight(e);
  if (!S.ramTip){ S.ramTip = true; toast(r ? 'Rammed! Hit ships head-on at speed to use your ram.' : 'Bump! A ram from the Kallisto shipwright makes head-on hits hurt.', 4); }
  if (e.hull <= 0) sinkEnemy(e, true);
  if (S.hull <= 0){ sink(); enemies.forEach(o => { if (o.mode === 'chase') o.mode = 'return'; o.angry = false; o.attacked = false; }); crimeT = 0; }
}

// ---- taking islands ----
// An island changes hands only after a siege: knock down its fortress, sink its guard ships, then hold the bay in front of it
// with no enemy ships around. Then it raises the other city's flag and that city pays you. The fortress is rebuilt for its
// new owner. Enemy fleets can take an island on their own only while its fortress lies in ruins.
export const capture = {is:null, p:0, msg:'', to:null};
function flip(is, c, byPlayer){
  is.city = c; is.take = is.aiTake = 0;
  if (is.patrol) is.patrol.respawn = Math.min(is.patrol.respawn, ISLES.guardBack);
  const f = is.fort;
  if (f && f.owner !== 'pirate'){ f.owner = c; f.spec = fortSpec(c); f.city = c; f.dead = false; f.sinkT = 0; f.hull = f.spec.hull*.5; f.angry = false; f.quiet = 0; buildEnemy(f);
    for (const gd of f.guards) gd.respawn = Math.min(gd.respawn, ISLES.guardBack*2); }
  enemies.forEach(o => { if (o.goal === is) o.goal = null; });
  if (byPlayer){ G.S.gold += ISLES.reward; toast(`${is.name} raises the flag of ${cityName(c)}! ${cityName(c)} pays you ${ISLES.reward} drachmae and rebuilds the fortress.`, 5); }
  else if (dist(is, G.S) < 4000) toast(`${cityName(c)} has taken ${is.name}.`, 3.5);
  save();
}
// ---- free ports: take a pirate fortress (knock it down, sink its guards, hold the bay) and it becomes yours ----
// It stops shooting, flies your colors, and its dock opens a market with cheaper goods, cheap timber and purple dye.
export function freePort(f, quiet){
  f.owner = 'you'; f.city = null; f.spec = {...fortSpec('pirate'), name:`${f.isle.name} free port`, side:'own'}; f.dead = false; f.sinkT = 0; f.hull = f.spec.hull; f.angry = false;
  for (const gd of f.guards){ gd.dead = true; gd.respawn = 1e9; gd.obj.visible = false; }
  buildEnemy(f);
  if (!HARBORS.some(h => h.fort === f)){ const dx = Math.cos(f.a), dy = Math.sin(f.a), pier = {x:f.x + dx*120, y:f.y + dy*120, dx, dy};
    HARBORS.push({is:f.isle, pier, dock:{x:pier.x + dx*(PIER_LEN + 30), y:pier.y + dy*(PIER_LEN + 30)}, prices:{sardine:FREEPORT.fish, tuna:FREEPORT.fish, swordfish:FREEPORT.fish}, free:true, fort:f}); }
  const S = G.S; S.freePorts = [...new Set([...(S.freePorts || []), f.isle.name])];
  if (!quiet){ S.gold += ISLES.reward; toast(`${f.isle.name} is yours! The pirates are gone and its fortress is now your free port. Dock there for cheap goods and purple dye.`, 6); save(); }
}
for (const e of enemies) if (e.fort && e.owner === 'pirate' && (G.S.freePorts || []).includes(e.isle.name)) freePort(e, true);
function updateFreePorts(dt){
  for (const f of enemies){
    if (!f.fort || f.owner !== 'pirate' || !f.dead) continue;
    const is = f.isle, near = dist(is, G.S) - is.r < ISLES.takeRange && !G.dock && !G.sheetOpen, left = f.guards.filter(g => !g.dead).length;
    if (left){ is.take = 0; if (near) Object.assign(capture, {is, p:0, to:null, msg:`Sink the pirate guard ships · ${left} left`}); continue; }
    const contested = enemies.some(o => !o.dead && !o.fort && hostile(o) && dist(o, G.S) < 650);
    is.take = near && !contested ? (is.take || 0) + dt : near ? is.take || 0 : 0;
    if (near) Object.assign(capture, {is, p:is.take/ISLES.takeSeconds, to:null, msg:contested ? 'Drive off the pirates to take the fortress' : `Taking ${is.name} as your free port`});
    if (is.take >= ISLES.takeSeconds){ is.take = 0; freePort(f); }
  }
}
// The war council: a friendly city fortress you're close to.
function nearCouncil(){
  if (G.sheetOpen || G.dock || G.sinking) return null;
  return enemies.find(f => f.fort && f.city && !f.dead && !hostile(f) && !(G.hunted || {})[f.city] && dist(f, G.S) < 520) || null;
}
const defenders = is => [is.patrol, ...(is.fort ? is.fort.guards : [])].filter(e => e && !e.dead && e.city === is.city);
function updateIslands(dt){
  capture.is = null;
  for (const is of ISLANDS){
    if (is.capital || !is.city || (!is.fort && !is.patrol)) continue;
    const f = is.fort, to = rival(is.city), near = dist(is, G.S) - is.r < ISLES.takeRange && !G.dock && !G.sheetOpen;
    if (f && !f.dead){ is.take = is.aiTake = 0; continue; }
    const left = defenders(is).length;
    if (left){ is.take = is.aiTake = 0; if (near && f) Object.assign(capture, {is, p:0, to, msg:`Sink ${is.name}'s guard ships · ${left} left`}); continue; }
    const contested = enemies.some(o => !o.dead && !o.fort && hostile(o) && dist(o, G.S) < 650);
    is.take = near && !contested ? (is.take || 0) + dt : near ? is.take || 0 : Math.max(0, (is.take || 0) - dt);
    if (near) Object.assign(capture, {is, p:is.take/ISLES.takeSeconds, to, msg:contested ? `Drive off the enemy ships to take ${is.name}` : `Taking ${is.name} for ${cityName(to)}`});
    if (is.take >= ISLES.takeSeconds){ flip(is, to, true); continue; }
    const enemyNear = enemies.some(o => !o.dead && side(o) === 'navy' && o.city === to && dist(o, is) - is.r < ISLES.aiRange);
    is.aiTake = enemyNear ? (is.aiTake || 0) + dt : 0;
    if (is.aiTake >= ISLES.aiSeconds) flip(is, to, false);
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
  combatState.prey = tgt || G.dock || G.sheetOpen || zoneAt(G.S.x, G.S.y) === 0 ? null : nearestShip(COMBAT.range*.9, e => !hostile(e) && side(e) !== 'own');
  pCool -= dt; volleyT = Math.max(0, volleyT - dt);
  combatState.side = !tgt || broadside(null, tgt);
  if (tgt && !G.sheetOpen && !G.sinking && pCool <= 0 && combatState.side){ pCool = COMBAT.shotEvery*(.85 + Math.random()*.3); salvo(null, tgt, fighters(), COMBAT.arrowDmg*(blessing().dmg || 1)*arrowK(), 120);
    if (tgt.spec.hull > ship().hull*1.5 && tgt.spec.fighters > fighters() && !G.S.bigTip){ G.S.bigTip = true; toast(`That ${tgt.spec.name.toLowerCase()} has more archers and a far thicker hull than your boat. Better to run!`, 5); } }
}
function volley(){
  const tgt = combatState.target; if (!tgt || volleyT > 0 || G.sinking) return;
  if (!broadside(null, tgt)){ toast('Turn side-on first: your archers shoot over the sides.', 2.5); return; }
  volleyT = COMBAT.volleyCooldown*(blessing().volley || 1);
  salvo(null, tgt, fighters()*COMBAT.volleyArrows, COMBAT.arrowDmg*(blessing().dmg || 1)*arrowK(), 70);
  // everyone leans over the rail at once: the boat heels away from the target and the view jolts
  G.kick = Math.min(.25, (G.kick || 0) + .1); G.shake = Math.min(1, (G.shake || 0) + .5);
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
    if (e.fort){ // forts don't float: they crumble when they fall and rise again when rebuilt
      if (e.dead){ e.sinkT += dt; e.respawn -= dt; e.obj.position.y = 2 - Math.min(70, e.sinkT*10); if (e.respawn <= 0){ respawn(e); e.obj.position.y = 2; } }
      else { think(e, dt); const d = dist(e, G.S); if (d < 150){ G.S.x = e.x + (G.S.x - e.x)/d*150; G.S.y = e.y + (G.S.y - e.y)/d*150; } } // the walls are solid
      e.hitT = Math.max(0, (e.hitT || 0) - dt);
      updateFire(e.fire, dist(e, G.S) < 1600 && (!e.dead || e.sinkT < 8) ? burn(e.hull, e.spec.hull) : 0, G.t);
      continue;
    }
    let roll = 0, pitch = 0;
    if (e.dead){ e.sinkT = (e.sinkT || 0) + dt; const p = sinkPose(e.sinkT, e.sinkSide || 1, e.spec.len); e.sinkY = p.depth; roll = p.roll; pitch = p.pitch;
      e.obj.visible = !p.done; e.respawn -= dt; if (e.respawn <= 0) respawn(e); if (e.arena && p.done){ scene.remove(e.obj); enemies.splice(enemies.indexOf(e), 1); continue; } }
    else think(e, dt);
    e.hitT = Math.max(0, (e.hitT || 0) - dt);
    e.kick = Math.max(0, (e.kick || 0) - dt*.4); roll += Math.sin((e.kick || 0)*60)*e.kick + (e.dead ? 0 : e.heel || 0);
    placeOnWaves(e.obj, e.x, e.y, e.a, e.spec.len, G.t, e.sinkY, roll, pitch);
    e.obj.userData.firing = e.mode === 'chase' || e.mode === 'hunt';
    animateShip(e.obj, G.t, e.v);
    updateFire(e.fire, dist(e, G.S) < 1600 && e.sinkY < 60 ? burn(e.hull, e.spec.hull) : 0, G.t);
  }
  playerCrew(dt);
  collide();
  witnesses(dt);
  updateIslands(dt);
  updateFreePorts(dt);
  updateArrows(dt);
  updateStones(dt);
  updateFx(dt);
  updateLoot(dt);
  updateSinking(dt, G.t);
  G.hurt = Math.max(0, (G.hurt || 0) - dt*2);
  G.hunted = {athens:false, sparta:false}; for (const e of enemies) if (e.angry && !e.dead) G.hunted[e.city] = true;
  combatState.threat = enemies.some(e => !e.dead && hostile(e) && e.mode === 'chase' && dist(e, G.S) < e.spec.sight*1.6);
  const show = !!combatState.target && !G.sheetOpen && !G.sinking, btn = $('volleyBtn');
  btn.hidden = !show;
  if (show){ btn.disabled = volleyT > 0; btn.classList.toggle('turn', !combatState.side); btn.style.setProperty('--cd', (volleyT/(COMBAT.volleyCooldown*(blessing().volley || 1))*360) + 'deg'); }
  const cf = nearCouncil(), cb = $('councilBtn'); if (!G.sheetOpen) G.council = cf; cb.hidden = !cf || !!combatState.target;
  if (cf) cb.textContent = `${adj(cf.city)} war council`;
  const prey = combatState.prey, raid = $('raidBtn');
  raid.hidden = !prey;
  if (prey) raid.textContent = side(prey) === 'fort' ? `Attack the ${adj(prey.city)} fort` : side(prey) === 'navy' ? `Attack the ${adj(prey.city)} ship` : `Raid the ${prey.city ? adj(prey.city) + ' ' : ''}merchant`;
}
