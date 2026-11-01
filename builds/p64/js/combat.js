// Ships at sea (raiders, merchants, navy patrols), arrows, the volley and raid buttons, and loot from sunk ships.
// Crews shoot by themselves when in range. Pirates and navy ships never enter the Shallows, so home water is always safe.
// The witness rule: shooting a merchant or navy ship is a crime only if a navy ship sees it. Witnesses chase you until they lose you. No wanted level.
import {COMBAT, ENEMIES, WITNESS, ISLES, RAM, FORTS, FREEPORT, TUNING, BOSS, FIRE_ARROWS, CAMPS, PIRATE_PLANS, SHIPS, ABILITIES, CAPTAIN, PLANS, FORT_LV, SHIP_LV} from './config.js';
import {WORLD, RAIDERS, TRAFFIC, ISLANDS, CITIES, HOME, HARBORS, TOWN_PIERS, PIER_LEN, rival, zoneAt, waveAt, pushOut, landDist} from './world.js';
import {G, ship, holdUsed, save, gain, lvl, putAboard, rank, isExplored} from './state.js';
import {scene, screenToSea, setLair} from './scene.js';
import {wreckModel} from './models.js';
import {buildShip, animateShip, mesh, SPECS, CEL, inkify} from './ships.js';
import {makeFire, updateFire, burn} from './fire.js';
import {blessing, fighters, hasSail} from './crew.js';
import {progress, goal} from './quests.js';
import {arrowK, ramDmg} from './upgrades.js';
import {toast} from './ui.js';
import {sink, rowNow, ROW} from './player.js';
import {sinkPose, startSink, updateSinking} from './sinking.js';
import {buildFortress, buildCamp, FORT_GUNS} from './monuments.js';
import {sfx} from './audio.js';

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
    mode:'patrol', pa:Math.random()*6.28, dead:false, sinkY:0, respawn:0, obj:null, leg:1, wait:0, angry:false, attacked:false, foe:null, lost:0, calm:0,
    lane:(Math.random()*2 - 1)*120, spd:.88 + Math.random()*.24, orbit:Math.random() < .5 ? 1 : -1, ring:170 + Math.random()*130, tacT:0};
  if (r.route && r.kind === 'merchant'){ const k = Math.random(), [p, q] = r.route; e.x = p.x + (q.x - p.x)*k; e.y = p.y + (q.y - p.y)*k; pushOut(e, 100); }
  if (side(e) === 'navy' && !e.guard) e.isle.patrol = e;
  return e;
}
export const enemies = [...RAIDERS, ...TRAFFIC].map(makeEnemy);

// ---- forts: a stepped stone fortress on the shore of every city island (not the capitals), and two pirate forts ----
// Each one has archers on the walls, catapults on two bastions that throw stones far out to sea, and guard ships.
// You can only take an island once its fort has fallen and its guards are sunk (see "taking islands" below).
const fortName = o => o === 'pirate' ? 'Pirate fortress' : `${o === 'athens' ? 'Athenian' : 'Spartan'} fortress`;
const fortSpec = (owner, lv = 2) => ({name:fortName(owner), side:'fort', city:owner === 'pirate' ? null : owner, hull:FORT_LV[lv].hull, fighters:FORT_LV[lv].fighters, lv, gold:FORT_LV[lv].gold,
  dmg:FORT_LV[lv].dmg, sight:FORTS.range, wood:FORTS.wood*lv/2, bronze:FORTS.bronze*lv/2, len:200, beam:200, speed:0, turn:0});
function fortSite(is, inset = 60){ // inset: how far up from the waterline it stands
  const base = Math.atan2(HOME.y - is.y, HOME.x - is.x);
  for (const off of [0, .4, -.4, .8, -.8, 1.2, -1.2, 1.6, -1.6, 2.1, -2.1, 2.6, -2.6, Math.PI]){ const a = base + off, dx = Math.cos(a), dy = Math.sin(a);
    let t = is.r + 120; while (t > 0 && landDist(is.x + dx*t, is.y + dy*t) > 0) t -= 6; // walk in to the shore
    const x = is.x + dx*(t - inset), y = is.y + dy*(t - inset);
    if (landDist(is.x + dx*(t + 320), is.y + dy*(t + 320)) < 160) continue; // needs open water in front
    if (HARBORS.some(h => Math.hypot(h.dock.x - x, h.dock.y - y) < 520) || TOWN_PIERS.some(p => Math.hypot(p.x - x, p.y - y) < 600)) continue; // keep clear of the town's pier
    return {x, y, a, sea:{x:is.x + dx*(t + 250), y:is.y + dy*(t + 250)}}; }
  return null;
}
// P64: a fortress's level comes from how far out it stands (the nearest third level 1, the farthest level 3); Thasos is level 3, Kos level 2
const FORT_ISLES = ISLANDS.filter(is => !FORTS.pirates.includes(is.name) && is.city && !is.capital).sort((a, b) => Math.hypot(a.x - HOME.x, a.y - HOME.y) - Math.hypot(b.x - HOME.x, b.y - HOME.y));
const fortLv = is => is.name === 'Thasos' ? 3 : is.name === 'Kos' ? 2 : 1 + Math.min(2, Math.floor(FORT_ISLES.indexOf(is)/Math.max(1, FORT_ISLES.length/3)));
for (const is of ISLANDS){
  const owner = FORTS.pirates.includes(is.name) ? 'pirate' : is.city && !is.capital ? is.city : null; if (!owner) continue;
  const site = fortSite(is); if (!site) continue;
  const lv = fortLv(is), spec = fortSpec(owner, lv);
  const f = {kind:'fort', fort:true, owner, tier:lv, isle:is, spec, city:spec.city, x:site.x, y:site.y, a:site.a, sea:site.sea, home:{x:site.x, y:site.y}, v:0, hull:spec.hull, cool:2, stoneT:[2, 4.5],
    mode:'patrol', dead:false, sinkY:0, respawn:0, obj:null, angry:false, attacked:false, lost:0, calm:0, quiet:0, guards:[]};
  enemies.push(f); is.fort = f;
  for (let g=0; g<FORT_LV[lv].guards; g++){ const p = {x:site.sea.x + Math.cos(site.a + (g ? 1.3 : -1.3))*260, y:site.sea.y + Math.sin(site.a + (g ? 1.3 : -1.3))*260}; pushOut(p, 180);
    const rr = 230 + g*150, route = [0, 1, 2, 3, 4].map(k => { const a = site.a + (g ? -1 : 1)*k*Math.PI*2/5 + g*.6, q = {x:site.sea.x + Math.cos(a)*rr, y:site.sea.y + Math.sin(a)*rr}; pushOut(q, 180); return q; });
    const kind = owner === 'pirate' ? (FORT_LV[lv].big ? 'pirateQ' : 'skiff') : owner + (FORT_LV[lv].big ? 'Q' : ''); // level 3: quinqueremes
    const e = makeEnemy({kind, home:p, guard:true, isle:is, route}); enemies.push(e); f.guards.push(e); }
}
// ---- bandit camps (P49): a palisade on the wild islands near Kallisto, with a few archers and one mothership guarding it ----
// Bandits fight in the Shallows too (everything else leaves you alone there). A burnt camp stays burnt; some hold ship plans.
const campSpec = c => ({name:`${c.isle} bandit camp`, side:'fort', city:null, hull:c.hull, fighters:c.fighters, dmg:c.dmg, sight:c.sight, gold:c.gold, wood:c.wood, bronze:c.bronze, len:160, beam:160, speed:0, turn:0});
for (const c of CAMPS){
  const is = ISLANDS.find(i => i.name === c.isle); if (!is || is.fort) continue;
  const site = fortSite(is, 22); if (!site) continue; // the bandits stand right at the waterline
  const spec = campSpec(c);
  const f = {kind:'fort', fort:true, owner:'bandit', camp:c, bandit:true, isle:is, spec, city:null, x:site.x, y:site.y, a:site.a, sea:site.sea, home:{x:site.x, y:site.y}, v:0, hull:spec.hull, cool:2, stoneT:[],
    mode:'patrol', dead:false, sinkY:0, respawn:0, obj:null, angry:false, attacked:false, lost:0, calm:0, quiet:0, guards:[]};
  enemies.push(f); is.fort = f; is.camp = f;
  const route = [0, 1, 2, 3].map(k => { const a = site.a + k*Math.PI/2, q = {x:site.sea.x + Math.cos(a)*200, y:site.sea.y + Math.sin(a)*200}; pushOut(q, 120); return q; });
  const m = makeEnemy({kind:c.mother, home:{...route[0]}, guard:true, isle:is, route});
  Object.assign(m, {bandit:true, mother:true, hull:c.motherHull, spec:{...ENEMIES[c.mother], name:'Bandit mothership', hull:c.motherHull, dmg:c.motherDmg || ENEMIES[c.mother].dmg, leash:900}}); enemies.push(m); f.guards.push(m);
}
// Burnt camps stay down (their mothership too), from the save.
const campDone = is => (G.S.camps || []).includes(is.name);
function burnCamp(f){ f.dead = true; f.respawn = 1e9; f.sinkT = 99; for (const g of f.guards) if (g.dead) g.respawn = 1e9; }
for (const e of enemies) if (e.camp && campDone(e.isle)){ burnCamp(e); e.guards.forEach(g => { g.dead = true; g.respawn = 1e9; }); }
// The camp's goal marker and the plans it holds, for the chart and the shipyard.
export const camps = () => enemies.filter(e => e.camp);

function buildFort(e){
  if (e.camp){ const g = buildCamp(); g.rotation.y = -e.a; g.scale.setScalar([.85, 1, 1.2][(e.camp.lv || 1) - 1]); /* bigger camps for higher levels */ if (CEL.on) inkify(g); return g; }
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
// P64: ship levels. Ships further out (and the guards of stronger fortresses) are a level or two higher: bigger sails,
// a bigger ram (wood, bronze, gold) on navy ships, fuller crews, tougher hulls and harder hits, and richer loot.
const lvAt = p => { const d = Math.hypot(p.x - HOME.x, p.y - HOME.y); return d < SHIP_LV.near ? 0 : d < SHIP_LV.far ? 1 : 2; };
function levelLook(e){
  if (e.fort || e.ally || e.boss || e.arena || e.mother || side(e) === 'merchant') return {};
  if (e.lvl == null) e.lvl = e.guard && e.isle && e.isle.fort && e.isle.fort.tier ? e.isle.fort.tier - 1 : lvAt(e.home || e);
  const L = e.lvl, base = ENEMIES[e.kind];
  if (base && e.spec._lv !== L){ const f = Math.min(1, e.hull/(e.spec.hull || 1));
    e.spec = {...e.spec, _lv:L, hull:Math.round(base.hull*SHIP_LV.hull[L]), dmg:base.dmg*SHIP_LV.dmg[L], gold:base.gold.map(g => Math.round(g*SHIP_LV.gold[L]))}; e.hull = e.spec.hull*f; }
  const s = SPECS[e.model || e.spec.model]; if (!s) return {};
  const full = (s.oarRows && s.oarCount > 1 ? 2*s.oarCount : 0) + (s.crew || []).reduce((a, c) => a + c[1], 0);
  const out = {sailLv:Math.min(s.sailMax || 0, SHIP_LV.sail[L]), men:Math.max(1, Math.round(full*SHIP_LV.crew[L]))};
  if (s.ram && !s.raider) out.ram = SHIP_LV.ram[L]; // the pirates keep their boar's head
  return out;
}
function buildEnemy(e){ if (e.obj) scene.remove(e.obj);
  if (e.fort){ e.obj = buildFort(e); e.obj.position.set(e.x, 2, e.y); e.fire = makeFire(140, 120, 90); e.obj.add(e.fire); scene.add(e.obj); return; }
  e.obj = buildShip(e.model || e.spec.model, {...lookOf(e), ...levelLook(e)}, G.settings.dev.crew);
  e.fire = makeFire(e.spec.len, e.spec.beam, SPECS[e.spec.model].H*.9); e.obj.add(e.fire); scene.add(e.obj); }
export function rebuildEnemies(){ enemies.forEach(buildEnemy); }
enemies.forEach(buildEnemy);
document.addEventListener('crew', rebuildEnemies);
document.addEventListener('spawnraider', () => spawnNear('skiff'));

// Pirates grow with you: once you sail a bigger ship, some raider boats come back as skiffs and some skiffs as galleys.
// (Danger also grows by area: the Shallows are safe, galleys and fortresses wait far out from the start.)
function growPirate(e){
  if (side(e) !== 'pirate' || e.guard || e.arena) return;
  e.kind0 = e.kind0 || e.kind; const t = rank(), r = Math.random();
  const k = e.kind0 === 'dinghy' && t >= 1 && r < .5 ? 'skiff' : e.kind0 === 'skiff' && t >= 2 && r < .35 ? 'galley' : e.kind0;
  if (k !== e.kind){ e.kind = k; e.spec = ENEMIES[k]; buildEnemy(e); }
}
function respawn(e){
  growPirate(e);
  const wantK = e.isle && e.isle.city ? e.isle.city + (/Q$/.test(e.kind) ? 'Q' : '') : null; // a quinquereme guard stays a quinquereme for the new owner
  if (e.guard && e.isle.fort && e.isle.fort.owner !== 'pirate' && e.isle.city && e.kind !== wantK){ e.kind = wantK; e.spec = ENEMIES[e.kind]; e.city = e.isle.city; buildEnemy(e); }
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

// ---- your fleet at sea (P52) ----
// A ship of yours with a captain, out on a trip (fleet.js), really sails: a loop through the waters around Kallisto. It fights
// any raider it meets, and comes to help when you're fighting near it. Your crew never shoots it. It never sinks: badly hurt,
// its captain limps home for repairs (the trip ends early). It shows green on the little map.
const ALLIES = new Map();
function allyRoute(){ const R = 2600 + Math.random()*2600, a0 = Math.random()*6.28;
  return [0, 1, 2, 3, 4].map(k => { const a = a0 + k*1.2566, p = {x:HOME.x + Math.cos(a)*R, y:HOME.y + Math.sin(a)*R}; pushOut(p, 220); return p; }); }
function makeAlly(t, c){
  const sh = SHIPS[t], route = allyRoute(), S = G.S;
  const spec = {name:`${c.n}'s ${sh.name.toLowerCase()}`, side:'ally', model:sh.model, hull:sh.hull, speed:sh.speed*.75, turn:sh.turn, fighters:Math.max(1, Math.round(sh.fighters*.6)), dmg:1.8,
    sight:650, leash:1e9, len:sh.len, beam:sh.beam, gold:[0, 0], wood:0, look:{...((S.looks || {})[t] || {}), flag:S.crewName ? S.look.flag : 'none', men:Math.max(sh.men[0], Math.round(sh.men[1]*.4))}};
  const e = {kind:'ally', ally:true, tier:t, captain:c, spec, x:HOME.x + (route[0].x - HOME.x)*.35, y:HOME.y + (route[0].y - HOME.y)*.35, a:Math.random()*6.28, v:0, hull:(S.hulls || {})[t] ?? sh.hull, cool:1,
    mode:'patrol', pa:0, dead:false, sinkY:0, respawn:1e9, obj:null, leg:0, wait:0, angry:false, attacked:false, foe:null, lost:0, calm:0, route, home:route[0],
    lane:0, spd:1, orbit:Math.random() < .5 ? 1 : -1, ring:220, tacT:0, spotT:0};
  pushOut(e, 220); buildEnemy(e); enemies.push(e); return e;
}
function dropAlly(t){ const e = ALLIES.get(t); if (!e) return; scene.remove(e.obj); const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1); ALLIES.delete(t);
  G.S.hulls = {...(G.S.hulls || {}), [t]:Math.max(1, Math.round(e.hull))}; }
// keep the ships at sea in step with the captains' trips
function syncAllies(){
  const S = G.S, caps = S.captains || {};
  for (const [k, c] of Object.entries(caps)){ const t = +k, out = c.out && t !== S.tier && (S.owned || []).includes(t);
    if (out && !ALLIES.has(t)) ALLIES.set(t, makeAlly(t, c)); else if (!out && ALLIES.has(t)) dropAlly(t); }
  for (const t of [...ALLIES.keys()]) if (!caps[t]) dropAlly(t);
}
function allyHome(e){ const c = e.captain; c.out = false; c.t = CAPTAIN.restSeconds*3; dropAlly(e.tier); if (dist(e, G.S) < 2500) toast(`${c.n} limps home`, 3.5); }
function ally(e, dt){
  // your fight first (if it's near), then any raider it sees
  const yours = combatState.target, tgt = yours && !yours.fort && !yours.dead && dist(e, yours) < 1800 ? yours
    : enemies.find(o => !o.dead && side(o) === 'pirate' && dist(o, e) < e.spec.sight) || null;
  if (tgt){ if (e.mode !== 'chase' && tgt === yours && !e.helpTip){ e.helpTip = true; toast(`${e.captain.n} comes to help you!`, 2.5); } e.mode = 'chase'; fight(e, tgt, dt); return; }
  e.mode = 'patrol'; e.helpTip = false; sail(e, dt, e.spec.speed*.6, 3);
}

// ---- Polycrates, the pirate king: the end of chapter one ----
// He waits off his pirate fortress (BOSS.lair) with two skiffs, once the last goal comes up. He chases you when you come
// close, throws flaming volleys now and then, and calls two more skiffs at half hull. He never heals.
export const boss = {e:null};
function bossShip(kind, at, extra = {}){
  const spec = {...ENEMIES[kind], leash:BOSS.leash, sight:BOSS.sight, ...(extra.spec || {})};
  const e = {kind, city:null, spec, x:at.x, y:at.y, home:{x:at.x, y:at.y}, a:Math.random()*6.28, v:0, hull:spec.hull, cool:2, mode:'patrol', pa:Math.random()*6.28, dead:false, sinkY:0, respawn:1e9,
    obj:null, leg:1, wait:0, angry:false, attacked:false, foe:null, lost:0, calm:0, lane:0, spd:1, orbit:Math.random() < .5 ? 1 : -1, ring:200 + Math.random()*120, tacT:0, temp:true, ...extra, spec};
  pushOut(e, 160); buildEnemy(e); enemies.push(e); return e;
}
// ---- the pirate king's lair (P56): out in front of his fortress, the sea turns wine dark, full of the ships he burned ----
// This is where the game's name comes from. The wrecks smoulder and burn for as long as he rules.
const LAIR = (() => { const f = enemies.find(o => o.fort && o.owner === 'pirate' && o.isle.name === BOSS.lair); if (!f) return null;
  const c = {x:f.sea.x + Math.cos(f.a)*800, y:f.sea.y + Math.sin(f.a)*800, r:1500}; pushOut(c, 400); return c; })();
const LAIR_WRECKS = [];
if (LAIR){ setLair(LAIR.x, LAIR.y, LAIR.r);
  for (let i=0;i<11;i++){ const a = i*2.4 + .3, d = 300 + (i*173 % 900), p = {x:LAIR.x + Math.cos(a)*d, y:LAIR.y + Math.sin(a)*d}; if (landDist(p.x, p.y) < 120) continue;
    const w = wreckModel(['small', 'medium', 'large'][i % 3]); w.rotation.y = a*1.7; const fire = makeFire(70, 30, 10); w.add(fire); scene.add(w); LAIR_WRECKS.push({...p, w, fire, ph:i}); } }
function updateLair(){
  if (!LAIR) return; const near = Math.hypot(LAIR.x - G.S.x, LAIR.y - G.S.y) < LAIR.r + 2500;
  for (const k of LAIR_WRECKS){ k.w.visible = near; if (!near) continue; k.w.position.set(k.x, waveAt(k.x, k.y, G.t) - 3, k.y);
    updateFire(k.fire, G.S.chapter ? .25 : .55 + .2*Math.sin(G.t*.7 + k.ph), G.t); } // after you beat him the fires die down
  if (G.S.chapter) setLair(LAIR.x, LAIR.y, LAIR.r*.6); // and the water slowly clears
}
function spawnBoss(){
  const at = LAIR ? {x:LAIR.x, y:LAIR.y} : {x:G.S.x + 1500, y:G.S.y}; // in the middle of the wine-dark water
  const e = bossShip('galley', at, {boss:true, look:{paint:'king', sail:'purple'}, fireT:BOSS.fireEvery, called:false,
    spec:{name:BOSS.name, model:BOSS.model, hull:BOSS.hull, speed:BOSS.speed, turn:BOSS.turn, fighters:BOSS.fighters, dmg:BOSS.dmg, gold:BOSS.gold, wood:BOSS.wood, bronze:BOSS.bronze, len:BOSS.len, beam:BOSS.beam}});
  e.obj.scale.setScalar(BOSS.scale); boss.e = e; if (G.S.bossHull > 0) e.hull = Math.min(e.hull, G.S.bossHull); // he keeps his wounds if you leave and come back
  for (let i=0;i<BOSS.escorts;i++) bossShip('skiff', {x:at.x + Math.cos(i*3.1 + 1)*260, y:at.y + Math.sin(i*3.1 + 1)*260});
}
function bossDown(e){
  boss.e = null; progress('boss'); G.S.chapter = Math.max(G.S.chapter || 0, 1); save();
  toast('Polycrates\' flagship breaks apart! The pirate king is beaten.', 5); sfx('fanfare');
  setTimeout(() => document.dispatchEvent(new Event('chapterdone')), 4500);
}
function bossThink(e, dt){
  const d = dist(e, G.S);
  // a flaming volley every so often while he is fighting you
  if (e.mode === 'chase' && d < COMBAT.range*1.1 && (e.fireT -= dt) <= 0){ e.fireT = BOSS.fireEvery; salvo(e, null, BOSS.fireArrows, BOSS.dmg, 60, true); sfx('horn', e); toast('Fire arrows!', 2.5); }
  if (!e.called && e.hull < e.spec.hull*.5){ e.called = true; for (let i=0;i<2;i++) startFight(bossShip('skiff', {x:e.x + Math.cos(e.a + 1.6 + i*3.1)*320, y:e.y + Math.sin(e.a + 1.6 + i*3.1)*320})); toast('Two skiffs join him!', 3.5); sfx('horn', e); }
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
  if (e.dismastT > 0) speed *= ABILITIES.chain.slow; // its sail is down: it can barely move
  const want = avoidLand(e, Math.atan2(ty - e.y, tx - e.x)), diff = angDiff(want, e.a), turn = Math.max(-1, Math.min(1, diff)) * e.spec.turn;
  e.a += turn * dt; e.heel = (e.heel || 0) + (Math.max(-.2, Math.min(.2, -turn*e.v/e.spec.speed*.12)) - (e.heel || 0))*Math.min(1, dt*3);
  e.v += (speed*Math.max(.25, Math.cos(diff)) - e.v) * Math.min(1, dt*.6); // other ships are heavy too
  // The Shallows are off limits: at the edge, slide along it instead of stopping.
  let moved = false;
  for (const turn of [0, .5, -.5, 1, -1, 1.6, -1.6]){
    const h = e.a + turn, nx = e.x + Math.cos(h)*e.v*dt, ny = e.y + Math.sin(h)*e.v*dt;
    if (side(e) === 'merchant' || e.bandit || e.ally || zoneAt(nx, ny) !== 0){ e.x = nx; e.y = ny; if (turn) e.a += Math.sign(turn)*Math.min(Math.abs(turn), e.spec.turn*1.2*dt); moved = true; break; }
  }
  if (!moved) e.v *= .9;
  if (e.shx || e.shy){ const k = Math.exp(-dt*1.6); e.x += e.shx*dt; e.y += e.shy*dt; e.a += (e.spin || 0)*dt; e.shx *= k; e.shy *= k; e.spin = (e.spin || 0)*k; pushOut(e, e.spec.beam*.6);
    if (Math.abs(e.shx) + Math.abs(e.shy) < 2){ e.shx = e.shy = 0; e.spin = 0; } }
  // Keep raiders from piling onto the same spot.
  for (const o of enemies){ if (o === e || o.dead || o.fort) continue; const dx = e.x - o.x, dy = e.y - o.y; if (Math.abs(dx) > 400 || Math.abs(dy) > 400) continue;
    const d = Math.hypot(dx, dy) || 1, min = (e.spec.beam + o.spec.beam)*1.6;
    if (d < min){ e.x += dx/d*(min - d)*.5; e.y += dy/d*(min - d)*.5; }
    else if (d < min*2.6){ const k = (min*2.6 - d)/(min*1.6)*45*dt; e.x += dx/d*k; e.y += dy/d*k; } }
  if (pushOut(e, e.spec.beam)) e.v *= .6;
  e.x = Math.max(60, Math.min(WORLD-60, e.x)); e.y = Math.max(60, Math.min(WORLD-60, e.y));
}

// The Shallows are safe, except from bandits near their camps
const playerSafe = (e) => (zoneAt(G.S.x, G.S.y) === 0 && !(e && e.bandit)) || G.sheetOpen || !!G.dock || !G.settings.dev.raiders;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Fighting: close in from the side, then keep moving. Every few seconds a ship picks a new move:
//  circle  - sail round the target at its own distance, broadside on, either way round
//  pass    - a fast run past the target's side and out the other end, then come about
//  wide    - pull back to a longer range (always, once badly hurt)
// so a fight is ships weaving around each other rather than two ships parked side by side.
function fight(e, tgt, dt){
  const o = tgt || G.S, d = dist(e, o);
  e.spotT += dt; const sp = e.spec.speed*(e.spotT < COMBAT.windup ? .5 : 1); // a slow start after spotting you, so there's time to react
  e.tacT -= dt;
  if (e.tacT <= 0){
    const r = Math.random();
    e.tac = r < .45 ? 'circle' : r < .8 ? 'pass' : 'wide';
    if (Math.random() < .35) e.orbit = -e.orbit;
    e.ring = 170 + Math.random()*130; e.tacT = 4 + Math.random()*5;
    if (e.tac === 'pass'){ const a = Math.atan2(o.y - e.y, o.x - e.x) + e.orbit*.45; e.passTo = {x:o.x + Math.cos(a)*380, y:o.y + Math.sin(a)*380}; }
  }
  if (e.hull < e.spec.hull*.3) e.tac = 'wide';
  if (d > 520){ const a = Math.atan2(e.y - o.y, e.x - o.x) + e.orbit*.5; steer(e, o.x + Math.cos(a)*e.ring, o.y + Math.sin(a)*e.ring, sp, dt); } // closing in, aimed beside the target
  else if (e.tac === 'pass'){ steer(e, e.passTo.x, e.passTo.y, sp, dt); if (dist(e, e.passTo) < 100) e.tacT = 0; }
  else { const R = e.tac === 'wide' ? e.ring + 160 : e.ring, s = Math.atan2(e.y - o.y, e.x - o.x) + e.orbit*.75;
    steer(e, o.x + Math.cos(s)*R, o.y + Math.sin(s)*R, sp*.9, dt); }
  e.cool -= dt;
  if (d < COMBAT.range && e.cool <= 0 && broadside(e, o)){ e.cool = COMBAT.enemyShotEvery*(.75 + Math.random()*.5); salvo(e, tgt, e.spec.fighters, e.spec.dmg, 140); }
}
function startFight(e){ if (e.mode !== 'chase'){ e.mode = 'chase'; e.cool = COMBAT.firstShot; e.spotT = 0; } }
// Follow a route of points; wait a moment at each end (merchants unloading).
// Each ship keeps its own lane a little to one side of the route line, so ships on one route don't sail nose to tail.
function sail(e, dt, speed, pause){
  const n = e.route.length, p = e.route[e.leg % n], q = e.route[(e.leg + n - 1) % n];
  const dx = p.x - q.x, dy = p.y - q.y, l = Math.hypot(dx, dy) || 1;
  let tx = p.x - dy/l*e.lane, ty = p.y + dx/l*e.lane;
  if (landDist(tx, ty) < 140){ tx = p.x; ty = p.y; }
  if (e.wait > 0){ e.wait -= dt; steer(e, tx, ty, 0, dt); return; }
  steer(e, tx, ty, speed*e.spd, dt);
  if (Math.hypot(e.x - tx, e.y - ty) < 110){ e.leg++; e.wait = pause*(.5 + Math.random()); }
}

function pirate(e, dt){
  const S = G.S, d = dist(e, S), fromHome = dist(e, e.home), safe = playerSafe(e);
  if (e.foe && (e.foe.dead || dist(e, e.foe) > 800)) e.foe = null;
  if (e.mode === 'chase' && !e.foe && (safe || fromHome > e.spec.leash || d > e.spec.sight*1.6)) e.mode = 'return';
  else if (e.mode !== 'chase' && !safe && d < e.spec.sight && fromHome < e.spec.leash*.8){
    startFight(e);
    if (!S.raidHint && !e.bandit){ S.raidHint = true; toast('Raiders!', 5); }
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
    e.pa += dt*.12*e.orbit; steer(e, e.home.x + Math.cos(e.pa)*(e.ring + 100), e.home.y + Math.sin(e.pa)*(e.ring + 100), e.spec.speed*.4*e.spd, dt);
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
  const S = G.S, d = dist(e, S), safe = playerSafe(e);
  if (e.angry){
    e.lost = d > e.spec.sight*1.6 || safe ? e.lost + dt : 0;
    if (e.lost > WITNESS.forget){ e.angry = false; e.lost = 0; if (d < 2000) toast('You lost them', 3); }
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
    const a = Math.atan2(e.y - g.y, e.x - g.x) + .25*e.orbit, R = g.r + 380 + e.ring; // circle the island offshore, with room to fight
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
  if (!hostile(e) || playerSafe(e) || G.sinking) return;
  const d = dist(e, G.S);
  if (d < FORTS.stoneRange && !e.camp) e.stoneT.forEach((t, i) => { e.stoneT[i] = t - dt; if (e.stoneT[i] <= 0){ e.stoneT[i] = FORTS.stoneEvery*(.85 + Math.random()*.3); throwStone(e, i); } });
  if (d > e.spec.sight || e.cool > 0) return;
  e.cool = FORTS.every*(.8 + Math.random()*.4); salvo(e, null, e.spec.fighters, e.spec.dmg, 110);
  if (e.camp){ /* the caution card already explains it: less text on screen */ }
  else if (!G.S.fortTip){ G.S.fortTip = true; toast('Catapults! Avoid the red rings', 5); }
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
  st.m.visible = st.r.visible = true; sfx('catapult', f);
}
function updateStones(dt){
  for (const st of STONES){
    if (st.splash > 0){ st.splash -= dt; const k = 1 - st.splash/.9; st.sp.scale.set(20 + k*40, 10 + Math.sin(k*Math.PI)*60, 20 + k*40); st.sp.position.set(st.tx, waveAt(st.tx, st.ty, G.t), st.ty); st.sp.material.opacity = .85*(1 - k); if (st.splash <= 0) st.sp.visible = false; }
    if (!st.live) continue;
    st.t += dt/FORTS.stoneFlight; const k = Math.min(1, st.t);
    st.m.position.set(st.x0 + (st.tx - st.x0)*k, 70*(1 - k) + Math.sin(k*Math.PI)*300, st.y0 + (st.ty - st.y0)*k); st.m.rotation.x += dt*4; st.m.rotation.z += dt*3;
    st.r.position.set(st.tx, waveAt(st.tx, st.ty, G.t) + 1.5, st.ty); st.r.scale.setScalar(FORTS.stoneHit*(1.15 - k*.15)); st.r.material.opacity = .25 + k*.6;
    if (k < 1) continue;
    st.live = false; st.m.visible = st.r.visible = false; st.splash = .9; st.sp.visible = true; sfx('bigsplash', {x:st.tx, y:st.ty});
    const S = G.S;
    if (!G.sheetOpen && !G.sinking && Math.hypot(S.x - st.tx, S.y - st.ty) < FORTS.stoneHit){
      S.hull -= FORTS.stoneDmg; G.hurt = 1; sfx('hurt'); G.kick = Math.min(.25, (G.kick || 0) + .15); G.shake = 1;
      if (!S.stoneTip){ S.stoneTip = true; toast('Hit by a stone!', 4); }
      if (S.hull <= 0){ sink(); enemies.forEach(e => { if (e.mode === 'chase') e.mode = 'return'; e.angry = false; e.attacked = false; }); crimeT = 0; }
    }
  }
}
function think(e, dt){
  const s = side(e); if (s === 'own') return;
  if (s === 'ally') return ally(e, dt);
  if (s === 'fort') fortThink(e, dt); else if (s === 'merchant') merchant(e, dt); else if (s === 'navy') navy(e, dt); else pirate(e, dt);
}

// ---- the witness rule ----
let crimeT = 0, crimeVictim = null, crimeCity = null;
export const hostile = e => side(e) === 'pirate' || (side(e) === 'fort' && (!e.city || e.angry || (G.hunted || {})[e.city])) || (side(e) === 'navy' && e.angry) || (side(e) === 'merchant' && e.attacked);
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
  if (seen) sfx('horn');
  if (seen) toast('They saw that! Navy ships chase you', 3);
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
const ARROWS = Array.from({length:160}, () => { const m = mesh(arrowGeo, '#f1ece0'); m.visible = false; m.castShadow = false; m.userData.mat0 = m.material; scene.add(m); return {m, live:false}; });
const fireArrowMat = new T.MeshBasicMaterial({color:'#ff9a3c'}); // flaming arrows glow orange
const chainMat = new T.MeshBasicMaterial({color:'#2c3036'}); // chain shot: dark iron
const tmpW = new T.Vector3();
let arrowI = 0;
// Every arrow does the same damage whoever shoots it. Bigger ships win by having more archers and thicker hulls.
const lenOf = e => e ? e.spec.len : ship().len;
// Archers shoot over the sides: a target dead ahead or dead astern is out of reach until you turn side-on.
export function broadside(from, to){ const src = from || G.S, a = from ? from.a : G.S.a, tg = to || G.S;
  return Math.abs(Math.sin(Math.atan2(tg.y - src.y, tg.x - src.x) - a)) > COMBAT.sideArc; }
// Every archer aboard shoots their own arrow, a moment apart.
function salvo(from, to, n, dmg, gap, fire = !from && fireT > 0){ for (let i=0;i<n;i++) setTimeout(() => { if (!(from && from.dead) && !(to && to.dead) && !(!to && G.sinking)) shoot(from, to, dmg, fire); }, i*gap*(.7 + Math.random()*.6)); }
// from = an enemy (or null for the player); to = an enemy (or null for the player).
function shoot(from, to, dmg, fire = false, chain = false){
  const a = ARROWS[arrowI++ % ARROWS.length], src = from || G.S, sa = from ? from.a : G.S.a, al = (Math.random() - .5)*lenOf(from)*.6;
  // a bandit camp shoots from one of its archers on the beach, who leans back as the arrow flies
  const bow = from && from.camp && from.obj && from.obj.userData.archers ? from.obj.userData.archers[Math.floor(Math.random()*from.obj.userData.archers.length)] : null;
  if (bow){ bow.getWorldPosition(tmpW); bow.userData.kick = 1; }
  Object.assign(a, {live:true, from, to, dmg, t:0, x0:bow ? tmpW.x : src.x + Math.cos(sa)*al, y0:bow ? tmpW.z : src.y + Math.sin(sa)*al, hit:Math.random() < COMBAT.hitChance + (from ? 0 : blessing().hit || 0),
    ox:(Math.random()-.5)*70, oy:(Math.random()-.5)*70, fire, chain});
  if (chain) a.hit = true; // the chain always finds the rigging
  a.m.material = chain ? chainMat : fire ? fireArrowMat : a.m.userData.mat0; a.m.scale.setScalar(chain ? 2.4 : 1); a.m.visible = true; sfx(chain ? 'volley' : 'bow', src);
}
function updateArrows(dt){
  for (const a of ARROWS){ if (!a.live) continue;
    const tgt = a.to || G.S, tx = tgt.x + (a.hit ? 0 : a.ox), ty = tgt.y + (a.hit ? 0 : a.oy);
    const dist = Math.hypot(tx - a.x0, ty - a.y0), dur = Math.max(.35, dist/COMBAT.arrowSpeed);
    a.t += dt/dur;
    if (a.t >= 1){ a.live = false; a.m.visible = false; if (a.hit) land(a); else { splash(tx, ty, 1); sfx('plop', {x:tx, y:ty}); } continue; }
    const k = a.t, h = 18 + Math.sin(k*Math.PI)*dist*.28, x = a.x0 + (tx - a.x0)*k, y = a.y0 + (ty - a.y0)*k;
    const k2 = Math.min(1, k + .02), h2 = 18 + Math.sin(k2*Math.PI)*dist*.28;
    a.m.position.set(x, h, y);
    a.m.lookAt(a.x0 + (tx - a.x0)*k2, h2, a.y0 + (ty - a.y0)*k2); a.m.rotateY(Math.PI/2);
  }
}
function land(a){
  const tg = a.to || G.S; spark(tg.x, tg.y); sfx(a.to ? 'thud' : 'hurt', tg);
  if (a.to && a.chain){ dismast(a.to); return; }
  if (a.to){ const e = a.to; if (e.dead) return; e.hull -= a.dmg; e.hitT = .25; e.quiet = 0; if (a.fire) e.burnT = FIRE_ARROWS.burnSeconds; e.kick = Math.min(.12, (e.kick || 0) + .5*a.dmg/e.spec.len);
    if (!a.from && side(e) !== 'pirate' && !(e.fort && !e.city)) crime(e); // you shot a merchant, a navy ship or a city's fort
    if (a.from && side(e) === 'pirate' && (side(a.from) === 'navy' || side(a.from) === 'ally')){ e.foe = a.from; startFight(e); } // pirates fight back
    if (e.ally){ if (e.hull < e.spec.hull*.2) allyHome(e); return; } // your ships never sink: badly hurt, they limp home
    if (a.from && side(e) === 'merchant' && side(a.from) === 'pirate') e.scare = a.from;
    if (e.hull <= 0) sinkEnemy(e, !a.from); return; }
  if (G.sheetOpen || G.sinking) return;
  G.S.hull -= a.dmg; G.hurt = 1; if (a.fire) G.burnT = BOSS.burnSeconds;
  // a hit rocks the boat away from the shooter and shakes the view; harder on small boats
  const src = a.from, push = Math.min(10, a.dmg*90/ship().len);
  if (src){ const d = Math.hypot(G.S.x - src.x, G.S.y - src.y) || 1; G.S.x += (G.S.x - src.x)/d*push; G.S.y += (G.S.y - src.y)/d*push; }
  G.kick = Math.min(.25, (G.kick || 0) + push*.012); G.shake = Math.min(1, (G.shake || 0) + .35);
  if (G.S.hull <= 0){ sink(); enemies.forEach(e => { if (e.mode === 'chase') e.mode = 'return'; e.angry = false; e.attacked = false; }); crimeT = 0; }
}

// Ship plans (blueprints): you need them before the shipyard can build that ship.
// Ship plans come in pieces (P54): each camp or fortress gives its piece once (S.pieceFrom). With every piece, take them to the
// Kallisto shipyard to be studied (menus.js / shipyard.js). Pieces for plans you already hold are skipped.
// What a camp or fortress still holds for you: the ship whose plan piece you'd win there, or 0
export function planReward(f){
  if (!f || !f.fort) return 0; const S = G.S;
  const t = f.camp ? f.camp.plans || 0 : f.owner === 'pirate' ? PIRATE_PLANS : f.city ? 7 : 0; if (!t) return 0;
  const from = (f.camp ? 'camp:' : 'fort:') + f.isle.name, held = (S.plans || []).includes(t) || (S.owned || []).includes(t) || ((S.pieces || {})[t] || 0) >= PLANS[t].pieces;
  return held || (S.pieceFrom || []).includes(from) ? 0 : t;
}
// A golden scroll of plans floating over every camp and fortress that still holds a piece, so you can spot it from afar
const scrollMat = new T.MeshBasicMaterial({color:'#f3d27a'}), scrollEnd = new T.MeshBasicMaterial({color:'#b5552c'});
function scrollModel(){ const g = new T.Group(), roll = new T.Mesh(new T.CylinderGeometry(7, 7, 34, 14), scrollMat); roll.rotation.z = Math.PI/2; g.add(roll);
  for (const s of [-1, 1]){ const k = new T.Mesh(new T.CylinderGeometry(8.5, 8.5, 3, 14), scrollEnd); k.rotation.z = Math.PI/2; k.position.x = s*17; g.add(k); }
  const sheet = new T.Mesh(new T.PlaneGeometry(30, 18), new T.MeshBasicMaterial({color:'#fbeec8', side:T.DoubleSide})); sheet.position.set(0, -14, 0); g.add(sheet);
  const band = new T.Mesh(new T.PlaneGeometry(22, 2), new T.MeshBasicMaterial({color:'#3f6c94', side:T.DoubleSide})); band.position.set(0, -12, .2); g.add(band);
  return g; }
// P58: clues instead of floating scrolls. For every plan piece still out there: where it is, told from a nearby island.
const DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
function dirFrom(from, to){ const a = Math.atan2(to.y - from.y, to.x - from.x); return DIRS[((Math.round(a/(Math.PI/4)) % 8) + 8) % 8]; }
function clueFor(is){ // "Tinos, north-west of Kallisto": told from the nearest island you know (or Kallisto)
  const known = ISLANDS.filter(o => o !== is && o.name && !o.frame && isExplored(o.x, o.y));
  const ref = known.sort((a, b) => Math.hypot(a.x - is.x, a.y - is.y) - Math.hypot(b.x - is.x, b.y - is.y))[0] || ISLANDS[0];
  return `${is.name}, ${dirFrom(ref, is)} of ${ref.name}`; }
export function planClues(){
  const S = G.S, out = [];
  for (const t of [1, 2, 3, 7]){ const need = PLANS[t].pieces, have = (S.pieces || {})[t] || 0;
    if ((S.plans || []).includes(t) || (S.owned || []).includes(t) || have >= need) continue;
    const spots = enemies.filter(e => e.fort && planReward(e) === t);
    const clues = []; for (const e of spots){ if (e.camp) clues.push(`Bandit camp on ${clueFor(e.isle)}`); }
    for (const e of spots.filter(e => e.owner === 'pirate')) clues.push(`Pirate fortress on ${clueFor(e.isle)}`);
    if (t === 7 && spots.some(e => e.city)) clues.push('Fortresses of Athens and Sparta, far out at sea');
    out.push({t, have, need, clues}); }
  return out;
}
function updateScrolls(){ return; // (P58: no floating scrolls; clues are in the bag)
  for (const e of enemies){ if (!e.fort) continue; const t = !e.dead && planReward(e), d = t && dist(e, G.S);
    if (t && !e.scroll){ e.scroll = scrollModel(); scene.add(e.scroll); }
    if (!e.scroll) continue; e.scroll.visible = !!t && d < 4000; if (!e.scroll.visible) continue;
    e.scroll.position.set(e.x, (e.camp ? 95 : 220) + Math.sin(G.t*1.6)*6, e.y); e.scroll.rotation.y = G.t*.8; e.scroll.scale.setScalar(1 + Math.min(1.5, d/1500)); } // bigger far away
}
function givePiece(t, from){
  const S = G.S, need = PLANS[t].pieces, have = (S.pieces || {})[t] || 0;
  if ((S.plans || []).includes(t) || (S.owned || []).includes(t) || have >= need || (S.pieceFrom || []).includes(from)) return;
  S.pieces = {...(S.pieces || {}), [t]:have + 1}; S.pieceFrom = [...(S.pieceFrom || []), from]; progress('piece', t);
  const done = have + 1 >= need, name = SHIPS[t].name.toLowerCase();
  setTimeout(() => { toast(done ? `${SHIPS[t].name} plans complete!` : `Plans: ${have + 1} of ${need}`, 3); sfx('fanfare'); }, 2500); save();
}

// ---- loot ----
const LOOT = [];
function sinkEnemy(e, byPlayer){
  if (e.ally){ allyHome(e); return; }
  if (byPlayer) progress('sink', e.kind);
  if (byPlayer && e.fort && e.owner === 'pirate'){ progress('fort'); givePiece(PIRATE_PLANS, 'fort:' + e.isle.name); }
  if (byPlayer && e.fort && e.city) givePiece(7, 'fort:' + e.isle.name); // P62: city fortresses hold the quinquereme's plans
  if (e.camp){ const S = G.S; S.camps = [...new Set([...(S.camps || []), e.isle.name])]; if (byPlayer) progress('camp', e.isle.name); if (e.camp.plans) givePiece(e.camp.plans, 'camp:' + e.isle.name); }
  if (e.boss) bossDown(e);
  const w = G.S.war; // a war contract from a fortress
  if (byPlayer && w && w.got < w.n && e.city === w.foe && (w.t === 'fort' ? e.fort : side(e) === 'navy')){ w.got++;
    setTimeout(() => toast(w.got >= w.n ? 'Contract done!' : `Contract: ${w.got} of ${w.n}`, 2.5), 1800); }
  // the other city pays a bounty for each enemy warship you sink
  if (byPlayer && side(e) === 'navy'){ const pay = rival(e.city); G.S.gold += ISLES.bounty; setTimeout(() => toast(`Bounty +${ISLES.bounty}`.replace('an Spartan', 'a Spartan'), 3.5), 3600); }
  e.dead = true; e.respawn = e.camp || (e.mother && campDone(e.isle)) ? 1e9 : e.fort ? FORTS.rebuild : COMBAT.respawn; e.mode = 'patrol'; e.sinkT = 0; e.sinkSide = Math.random() < .5 ? 1 : -1;
  if (e.camp) e.guards.forEach(g => { if (g.dead) g.respawn = 1e9; });
  if (!e.fort) startSink(e.x, e.y, e.spec.len);
  const [g0, g1] = e.spec.gold, gold = g0 + Math.floor(Math.random()*(g1 - g0 + 1));
  const crate = new T.Group();
  const box = mesh(new T.BoxGeometry(12, 9, 12), '#9b6b3a'); box.position.y = 2; crate.add(box);
  const band = mesh(new T.BoxGeometry(12.6, 2, 12.6), '#5a3518'); band.position.y = 3; crate.add(band);
  const coins = mesh(new T.CylinderGeometry(4.5, 5, 3, 8), '#e3ad48'); coins.position.y = 7.5; crate.add(coins);
  scene.add(crate);
  const at = e.fort ? e.sea : e; // a fort's treasury floats out in front of it
  sfx('crash', e);
  if (e.fort) crate.scale.setScalar(1.8);
  // a merchant's cargo spills out with it: a few of its trade goods
  const goods = side(e) === 'merchant' ? {k:['wine', 'oil', 'pottery', 'obsidian'][Math.floor(Math.random()*4)], n:2 + Math.floor(Math.random()*4)} : null;
  LOOT.push({x:at.x, y:at.y, gold, wood:e.spec.wood, bronze:e.spec.bronze || 0, goods, life:COMBAT.lootLife*(e.fort ? 2 : 1), obj:crate});
  if (e.camp){ toast('Camp burned!', 4.5); e.angry = false; return; }
  if (e.fort){ toast('The fortress falls!', 5.5); e.angry = false; return; }
}
function updateLoot(dt){
  const S = G.S;
  for (let i=LOOT.length-1;i>=0;i--){ const l = LOOT[i]; l.life -= dt;
    l.obj.position.set(l.x, waveAt(l.x, l.y, G.t) - Math.max(0, 5 - l.life)*3, l.y); l.obj.rotation.y += dt*.6;
    if (Math.hypot(S.x - l.x, S.y - l.y) < COMBAT.lootRange && !G.sheetOpen){
      // the wreck's timber patches your hull first, but only up to a field repair: a full repair needs a dry dock.
      // What's left over (and any bronze) goes aboard, as much as there's room for.
      const ph = TUNING.plankHull, cap = ship().hull*COMBAT.patchTo, need = Math.ceil(Math.max(0, cap - S.hull)/ph), patch = Math.min(need, l.wood), wood = putAboard('wood', l.wood - patch), bronze = putAboard('bronze', l.bronze);
      S.hull = Math.max(S.hull, Math.min(cap, S.hull + patch*ph)); S.gold += l.gold; l.life = 0;
      if (l.goods){ const ln = putAboard('linen', 2 + Math.floor(Math.random()*3)); if (ln) gain('linen', ln); } // merchants carry sailcloth
      if (l.goods){ const n = putAboard(l.goods.k, l.goods.n); if (n) setTimeout(() => toast(`+${n} ${l.goods.k === 'oil' ? 'olive oil' : l.goods.k}`, 2.6), 3000); }
      gain('coin', l.gold); if (wood) gain('wood', wood); if (bronze) gain('bronze', bronze); if (l.goods) gain(l.goods.k, l.goods.n);
      save();
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
  for (const e of enemies){ if (e.dead || e.fort || e.ally) continue; // your own ships just slide past
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
    const mass = Math.max(.6, Math.min(1.8, Math.sqrt(mP/mE)));
    if (hit.i >= 3 && into > .6 && fast > RAM.minSpeed && !e.ramT && zoneAt(S.x, S.y) !== 0){ e.ramT = RAM.cooldown; shove(e, nx, ny, G.v*.9*mass); ramHit(e, Math.min(G.rowT > 0 ? 1.7 : 1, fast)*into*mass); G.v *= .45 + .35*(1 - kP); e.v *= .25; }
    else if (!e.bumpT && G.v > 20){ e.bumpT = .8; sfx('bump', e); shove(e, nx, ny, G.v*.4*mass); G.kick = Math.min(.25, (G.kick || 0) + .06); G.shake = Math.min(1, (G.shake || 0) + .25); G.v *= .6; e.v *= .6; }
  }
}
// A hit pushes the other ship sideways and swings it round a little; the push fades over a second or two (see steer()).
function shove(e, nx, ny, v){ e.shx = (e.shx || 0) + nx*v; e.shy = (e.shy || 0) + ny*v; e.spin = (Math.random() < .5 ? -1 : 1)*Math.min(.9, v/150); e.heel = Math.max(-.3, Math.min(.3, (e.heel || 0) + (Math.random() - .5)*.4)); }
// A head-on hit. With a ram it hurts them a lot and you a little; without one, both ships take the same small knock.
function ramHit(e, k){
  const S = G.S, r = ramDmg(), dmg = Math.max(1, Math.round((r || RAM.bump)*k)), self = r ? Math.round(1 + dmg*.04) : dmg;
  e.hull -= dmg; e.hitT = .3; e.kick = .18; sfx('ram', e);
  S.hull -= self; G.hurt = 1; G.kick = Math.min(.25, (G.kick || 0) + .15); G.shake = 1;
  G.pops = [...(G.pops || []), {t:G.t, txt:`-${dmg}`, x:e.x, y:e.y, c:'#f2a093'}];
  if (side(e) !== 'pirate') crime(e); else startFight(e);
  if (!S.ramTip){ S.ramTip = true; toast(r ? 'Rammed!' : 'Bump! Buy a ram at Kallisto', 2.5); }
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
  if (f && f.owner !== 'pirate'){ f.owner = c; f.spec = fortSpec(c, f.tier); f.city = c; f.dead = false; f.sinkT = 0; f.hull = f.spec.hull*.5; f.angry = false; f.quiet = 0; buildEnemy(f);
    for (const gd of f.guards) gd.respawn = Math.min(gd.respawn, ISLES.guardBack*2); }
  enemies.forEach(o => { if (o.goal === is) o.goal = null; });
  if (byPlayer){ G.S.gold += ISLES.reward; sfx('fanfare'); toast(`${is.name} taken! +${ISLES.reward}`, 5); }
  else if (dist(is, G.S) < 4000) toast(`${cityName(c)} has taken ${is.name}.`, 3.5);
  save();
}
// ---- free ports: take a pirate fortress (knock it down, sink its guards, hold the bay) and it becomes yours ----
// It stops shooting, flies your colors, and its dock opens a market with cheaper goods, cheap timber and purple dye.
export function freePort(f, quiet){
  f.owner = 'you'; f.city = null; f.spec = {...fortSpec('pirate', f.tier), name:`${f.isle.name} free port`, side:'own'}; f.dead = false; f.sinkT = 0; f.hull = f.spec.hull; f.angry = false;
  for (const gd of f.guards){ gd.dead = true; gd.respawn = 1e9; gd.obj.visible = false; }
  buildEnemy(f);
  if (!HARBORS.some(h => h.fort === f)){ const dx = Math.cos(f.a), dy = Math.sin(f.a), pier = {x:f.x + dx*120, y:f.y + dy*120, dx, dy};
    HARBORS.push({is:f.isle, pier, dock:{x:pier.x + dx*(PIER_LEN + 30), y:pier.y + dy*(PIER_LEN + 30)}, prices:{sardine:FREEPORT.fish, tuna:FREEPORT.fish, swordfish:FREEPORT.fish}, free:true, fort:f}); }
  const S = G.S; S.freePorts = [...new Set([...(S.freePorts || []), f.isle.name])];
  if (!quiet){ S.gold += ISLES.reward; sfx('fanfare'); toast(`${f.isle.name}: your free port!`, 6); save(); }
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
  combatState.prey = tgt || G.dock || G.sheetOpen || zoneAt(G.S.x, G.S.y) === 0 ? null : nearestShip(COMBAT.range*.9, e => !hostile(e) && side(e) !== 'own' && side(e) !== 'ally');
  pCool -= dt; volleyT = Math.max(0, volleyT - dt);
  combatState.side = !tgt || broadside(null, tgt);
  if (tgt && !G.sheetOpen && !G.sinking && pCool <= 0 && combatState.side){ pCool = COMBAT.shotEvery*(.85 + Math.random()*.3); salvo(null, tgt, fighters(), COMBAT.arrowDmg*(blessing().dmg || 1)*arrowK(), 120);
    if (tgt.spec.hull > ship().hull*1.5 && tgt.spec.fighters > fighters() && !G.S.bigTip){ G.S.bigTip = true; toast('Too strong. Run!', 5); } }
}
// ---- aimed shots (P51): arrow shower, chain shot and catapult are lobbed at a spot on the sea and land a moment later ----
// Each projectile flies in a high arc from your ship to its own landing point, then hurts whatever ship is there when it lands.
const LOBS = [], lobGeo = {ball:new T.SphereGeometry(5, 12, 10), fire:new T.SphereGeometry(9, 14, 12)};
const lobMat = {ball:new T.MeshBasicMaterial({color:'#2c3036'}), fire:new T.MeshBasicMaterial({color:'#ffb347'})};
function lob(kind, x, y, dur, peak, hit){
  const S = G.S, m = kind === 'arrow' ? new T.Mesh(arrowGeo, fireT > 0 ? fireArrowMat : ARROWS[0].m.userData.mat0) : new T.Mesh(lobGeo[kind], lobMat[kind]);
  m.castShadow = false; scene.add(m); LOBS.push({m, x0:S.x, y0:S.y, x, y, t:0, dur, peak, hit, kind});
}
function updateLobs(dt){
  for (let i=LOBS.length-1;i>=0;i--){ const l = LOBS[i]; l.t += dt/l.dur; const k = Math.min(1, l.t);
    const x = l.x0 + (l.x - l.x0)*k, y = l.y0 + (l.y - l.y0)*k, h = 20 + Math.sin(k*Math.PI)*l.peak;
    l.m.position.set(x, h, y);
    if (l.kind === 'arrow'){ const k2 = Math.min(1, k + .02); l.m.lookAt(l.x0 + (l.x - l.x0)*k2, 20 + Math.sin(k2*Math.PI)*l.peak, l.y0 + (l.y - l.y0)*k2); l.m.rotateY(Math.PI/2); }
    else if (l.kind === 'fire'){ l.m.scale.setScalar(1 + .15*Math.sin(G.t*30)); if (Math.random() < .5) puff(x, y, false, 1); }
    if (k < 1) continue;
    scene.remove(l.m); LOBS.splice(i, 1); l.hit(l.x, l.y);
  }
}
// the hostile ships (and forts) a shot landing at (x, y) with radius r hits
// P61: a ship is long and thin, so test against its whole length (a capsule along its heading), not a small circle at its middle
function hitShip(e, x, y, r){ if (e.fort) return Math.hypot(e.x - x, e.y - y) < r + 110;
  const ca = Math.cos(e.a), sa = Math.sin(e.a), dx = x - e.x, dy = y - e.y, along = Math.max(-e.spec.len/2, Math.min(e.spec.len/2, dx*ca + dy*sa));
  return Math.hypot(dx - ca*along, dy - sa*along) < r + e.spec.beam*.6; }
const struck = (x, y, r) => enemies.filter(e => !e.dead && hostile(e) && hitShip(e, x, y, r));
// where a tap (no drag) aims: the target as it is now
// P61: a tap leads the target: it aims where the ship will be when the shot lands (a drag is your own aim)
const tapAim = (flight = 1.7) => { const e = combatState.target; if (!e) return null; const v = e.v || 0, tt = flight*.9;
  return {x:e.x + Math.cos(e.a)*v*tt + (e.shx || 0)*.3, y:e.y + Math.sin(e.a)*v*tt + (e.shy || 0)*.3}; };
function clampAim(p, range){ const S = G.S, d = Math.hypot(p.x - S.x, p.y - S.y); return d <= range ? p : {x:S.x + (p.x - S.x)/d*range, y:S.y + (p.y - S.y)/d*range}; }
export const abilityInfo = k => ABILITIES[k];
// Arrow shower: every archer shoots high; the arrows rain down over the circle.
function shower(at){
  if (volleyT > 0 || G.sinking || !at) return false; const A = ABILITIES.shower, p = clampAim(at, A.range);
  volleyT = COMBAT.volleyCooldown*(blessing().volley || 1);
  const n = fighters()*COMBAT.volleyArrows, dmg = COMBAT.arrowDmg*(blessing().dmg || 1)*arrowK(), fire = fireT > 0;
  for (let i=0;i<n;i++){ const a = Math.random()*6.28, r = Math.sqrt(Math.random())*A.r;
    setTimeout(() => lob('arrow', p.x + Math.cos(a)*r, p.y + Math.sin(a)*r, A.flight*(.92 + Math.random()*.16), 230, (x, y) => {
      const hit = struck(x, y, 10); if (!hit.length){ splash(x, y); sfx('plop', {x, y}); return; }
      for (const e of hit){ e.hull -= dmg; e.hitT = .25; if (fire) e.burnT = FIRE_ARROWS.burnSeconds; spark(e.x, e.y); sfx('thud', e); if (side(e) !== 'pirate' && !e.bandit) crime(e); else startFight(e); if (e.hull <= 0) sinkEnemy(e, true); } }), i*45); }
  G.kick = Math.min(.25, (G.kick || 0) + .1); G.shake = Math.min(1, (G.shake || 0) + .4); sfx('volley'); return true;
}
function volley(){ shower(tapAim(ABILITIES.shower.flight)); } // a tap with a second finger or the old shortcut: at the target as it is now
// Chain shot: two iron balls on a chain; a ship where they land loses its sail.
function chainAt(at){
  if (!lvl('chain') || chainCd > 0 || G.sinking || !at) return false; const A = ABILITIES.chain, p = clampAim(at, A.range);
  chainCd = A.cd; sfx('volley');
  for (const o of [-1, 1]) lob('ball', p.x + o*10, p.y, A.flight, 150, (x, y) => { const hit = struck(x, y, A.r).filter(e => !e.fort); if (!hit.length){ splash(x, y); sfx('plop', {x, y}); } hit.forEach(dismast); });
  return true;
}
// Catapult (bireme and bigger): a ball of fire thrown very high; big damage where it lands, and it sets ships alight.
function catapultAt(at){
  if (!lvl('catapult') || cataCd > 0 || G.sinking || !at) return false; const A = ABILITIES.catapult, p = clampAim(at, A.range);
  cataCd = A.cd; sfx('horn'); G.shake = Math.min(1, (G.shake || 0) + .5);
  lob('fire', p.x, p.y, A.flight, 420, (x, y) => { const hit = struck(x, y, A.r); puff(x, y, false, 8); sfx('crash', {x, y});
    for (const e of hit){ e.hull -= A.dmg(lvl('catapult')); e.burnT = FIRE_ARROWS.burnSeconds*1.5; e.hitT = .3; e.kick = .2; if (side(e) !== 'pirate' && !e.bandit) crime(e); else startFight(e); if (e.hull <= 0) sinkEnemy(e, true); } });
  return true;
}
// called by the ability bar (input on the buttons): kind, and the spot on the sea (or null for a tap)
$('rowBtn').addEventListener('click', () => rowNow());
$('stopBtn').addEventListener('click', () => { G.cruise = false; G.dest = null; G.rowT = 0; sfx('dock'); }); // lower the sail: the ship glides to a stop
// The bar's buttons: press, drag onto the sea to aim (a ring shows where it lands), let go to shoot. A tap shoots at the target as it is now.
document.querySelectorAll('.ab[data-ab]').forEach(btn => {
  btn.addEventListener('pointerdown', e => { if (btn.disabled) return; e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch(_){}
    G.aimDrag = {k:btn.dataset.ab, id:e.pointerId, sx:e.clientX, sy:e.clientY, moved:false}; });
  btn.addEventListener('pointermove', e => { const d = G.aimDrag; if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 18) d.moved = true;
    const A = ABILITIES[d.k]; if (!d.moved || !A.range) return;
    const p = screenToSea(e.clientX, e.clientY); if (p) G.aim = {k:d.k, ...clampAim(p, A.range), r:A.r, range:A.range}; });
  const end = e => { const d = G.aimDrag; if (!d || d.id !== e.pointerId) return; const at = G.aim; G.aimDrag = null; G.aim = null;
    if (e.type !== 'pointercancel') useAbility(d.k, d.moved ? at : null); };
  btn.addEventListener('pointerup', end); btn.addEventListener('pointercancel', end);
});
export function useAbility(kind, at){
  at = at || tapAim((ABILITIES[kind] || {}).flight);
  if (kind === 'shower') return shower(at);
  if (kind === 'chain') return chainAt(at);
  if (kind === 'catapult') return catapultAt(at);
  if (kind === 'fire') return fireUp();
}
// ---- abilities (P50): fire arrows for a few seconds, and chain shot that brings down a ship's sail ----
let fireT = 0, fireCd = 0, chainCd = 0, cataCd = 0;
function fireUp(){ if (!lvl('fire') || fireCd > 0 || fireT > 0 || !combatState.target || G.sinking) return;
  fireT = ABILITIES.fire.secs; fireCd = ABILITIES.fire.cd; sfx('horn'); toast('Fire arrows!', 1.2); pCool = 0; }
function dismast(e){ if (e.dead || e.fort) return; const first = !(e.dismastT > 0);
  e.dismastT = ABILITIES.chain.secs(lvl('chain')); e.v *= .4; sfx('crash', e); spark(e.x, e.y);
  (e.obj.userData.sails || []).forEach(s => s.visible = false);
  if (first) toast('Dismasted!', 2.2); }
function updateAbilities(dt){
  fireT = Math.max(0, fireT - dt); fireCd = Math.max(0, fireCd - dt); chainCd = Math.max(0, chainCd - dt); cataCd = Math.max(0, cataCd - dt); updateLobs(dt);
  for (const e of enemies) if (e.dismastT > 0 && (e.dismastT -= dt) <= 0) (e.obj.userData.sails || []).forEach(s => s.visible = true);
}

document.addEventListener('volley', volley); // a tap with a second finger, or a double tap on your own ship (input.js)
// (P54: capturing ships was removed. New ships only come from plans studied and built at Kallisto; ships captured before stay yours.)

// Raid: attack the nearest merchant or navy ship on purpose. Your crew opens fire, and any navy ship watching will come for you.
$('raidBtn').addEventListener('click', () => {
  const e = combatState.prey; if (!e) return;
  crime(e); pCool = 0; sfx('horn');
  if (!G.S.raidTip){ G.S.raidTip = true; toast('Navy ships that see it will chase you', 5); }
});
addEventListener('keydown', e => { if (e.code === 'Space' && !G.fish && !G.sheetOpen && !G.mapOpen){ e.preventDefault(); volley(); } });

// Called every frame.
export function updateCombat(dt){
  updateAbilities(dt); syncAllies(); updateScrolls(); updateLair();
  for (const e of enemies){
    if (e.fort){ // forts don't float: they crumble when they fall and rise again when rebuilt
      if (e.dead){ e.sinkT += dt; e.respawn -= dt; e.obj.position.y = 2 - Math.min(70, e.sinkT*10); if (e.respawn <= 0){ respawn(e); e.obj.position.y = 2; } }
      else { think(e, dt); const d = dist(e, G.S); if (d < 150){ G.S.x = e.x + (G.S.x - e.x)/d*150; G.S.y = e.y + (G.S.y - e.y)/d*150; } } // the walls are solid
      e.hitT = Math.max(0, (e.hitT || 0) - dt);
      if (e.camp && !e.dead && e.obj.userData.archers && dist(e, G.S) < 1400){ const u = e.obj.userData, th = Math.atan2(G.S.y - e.y, G.S.x - e.x);
        for (const p of u.archers){ p.userData.kick = Math.max(0, (p.userData.kick || 0) - dt*2.5); p.rotation.y = hostile(e) ? e.a - th : 0; p.rotation.z = .35*p.userData.kick; }
        u.flames.forEach((f, i) => f.scale.set(1, .85 + .25*Math.sin(G.t*9 + i*2), 1)); }
      updateFire(e.fire, dist(e, G.S) < 1600 && (!e.dead || e.sinkT < 8) ? Math.max(burn(e.hull, e.spec.hull), e.burnT > 0 && !e.dead ? .6 : 0) : 0, G.t);
      continue;
    }
    let roll = 0, pitch = 0;
    if (e.dead){ e.sinkT = (e.sinkT || 0) + dt; const p = sinkPose(e.sinkT, e.sinkSide || 1, e.spec.len); e.sinkY = p.depth; roll = p.roll; pitch = p.pitch;
      e.obj.visible = !p.done; e.respawn -= dt; if (e.respawn <= 0) respawn(e); if ((e.arena || e.temp) && p.done){ scene.remove(e.obj); enemies.splice(enemies.indexOf(e), 1); continue; } }
    else think(e, dt);
    e.hitT = Math.max(0, (e.hitT || 0) - dt);
    e.kick = Math.max(0, (e.kick || 0) - dt*.4); roll += Math.sin((e.kick || 0)*60)*e.kick + (e.dead ? 0 : e.heel || 0);
    placeOnWaves(e.obj, e.x, e.y, e.a, e.spec.len, G.t, e.sinkY, roll, pitch);
    e.obj.userData.firing = e.mode === 'chase' || e.mode === 'hunt';
    animateShip(e.obj, G.t, e.v);
    updateFire(e.fire, dist(e, G.S) < 1600 && e.sinkY < 60 ? Math.max(burn(e.hull, e.spec.hull), e.burnT > 0 && !e.dead ? .6 : 0) : 0, G.t);
  }
  // ships hit by fire arrows burn for a few seconds; so does your ship after a flaming volley
  for (const e of enemies){ if (!(e.burnT > 0) || e.dead) continue; e.burnT -= dt; e.hull -= FIRE_ARROWS.dps(lvl('fire'))*dt; if (e.hull <= 0) sinkEnemy(e, true); }
  if (G.burnT > 0 && !G.sinking){ G.burnT -= dt; G.S.hull -= BOSS.burnDps*dt; G.hurt = Math.max(G.hurt || 0, .4); if (G.S.hull <= 0){ G.burnT = 0; sink(); enemies.forEach(o => { if (o.mode === 'chase') o.mode = 'return'; o.angry = false; o.attacked = false; }); crimeT = 0; } }
  const gl = goal(); if (gl && gl.t === 'boss' && !boss.e) spawnBoss();
  if (boss.e && !boss.e.dead){ bossThink(boss.e, dt); G.S.bossHull = Math.ceil(boss.e.hull); }
  G.boss = boss.e && !boss.e.dead ? {x:boss.e.x, y:boss.e.y} : null;
  // where the current chapter goal is, for the chart and the little map: the pirate fortresses, then the pirate king
  G.goalMarks = gl && gl.t === 'camp' ? enemies.filter(o => o.camp && o.isle.name === gl.kind && !o.dead).map(o => ({x:o.x, y:o.y, label:`${o.isle.name} bandit camp`})) : gl && gl.t === 'fort' ? enemies.filter(o => o.fort && o.owner === 'pirate' && !o.dead).map(o => ({x:o.x, y:o.y, label:'Pirate fortress'})) : G.boss ? [{...G.boss, label:'The pirate king'}] : [];
  const bb = $('bossBar'), showB = !!G.boss && dist(boss.e, G.S) < 1600 && !G.sheetOpen; bb.hidden = !showB; if (showB) $('bossHull').style.width = Math.max(0, boss.e.hull/boss.e.spec.hull*100) + '%';
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
  // the ability bar shows only in a fight
  // the ability bar shows only in a fight (and while you're aiming one)
  const fight = (!!combatState.target || !!G.aim) && !G.sheetOpen && !G.sinking, canRow = hasSail() && !G.dock && !G.sheetOpen && !G.sinking, cd = (el, left, all) => el.style.setProperty('--cd', (left > 0 ? left/all*360 : 0) + 'deg');
  $('abilities').hidden = !fight && !canRow;
  const sb = $('stopBtn'); sb.hidden = !(canRow && G.cruise); // the anchor: shown while the ship sails on by itself
  const rb = $('rowBtn'); rb.hidden = !canRow; if (canRow){ rb.disabled = G.rowCd > 0 && !(G.rowT > 0); rb.classList.toggle('on', G.rowT > 0); cd(rb, G.rowT > 0 ? 0 : G.rowCd, ROW.cd); }
  for (const id of ['volleyBtn', 'fireBtn', 'chainBtn', 'cataBtn']) if (!fight) $(id).hidden = true; else if (id === 'volleyBtn') $(id).hidden = false;
  if (fight){ const vb = $('volleyBtn'), fb = $('fireBtn'), cb = $('chainBtn'), kb = $('cataBtn');
    vb.disabled = volleyT > 0; cd(vb, volleyT, COMBAT.volleyCooldown*(blessing().volley || 1));
    fb.hidden = !lvl('fire'); fb.disabled = fireCd > 0 && fireT <= 0; fb.classList.toggle('on', fireT > 0); cd(fb, fireT > 0 ? 0 : fireCd, ABILITIES.fire.cd);
    cb.hidden = !lvl('chain'); cb.disabled = chainCd > 0; cd(cb, chainCd, ABILITIES.chain.cd);
    kb.hidden = !lvl('catapult') || rank() < 2; kb.disabled = cataCd > 0; cd(kb, cataCd, ABILITIES.catapult.cd); }
  const cf = nearCouncil(), cb = $('councilBtn'); if (!G.sheetOpen) G.council = cf; cb.hidden = !cf || !!combatState.target;
  if (cf) cb.textContent = `${adj(cf.city)} war council`;
  const prey = combatState.prey, raid = $('raidBtn');
  raid.hidden = !prey;
  if (prey) raid.textContent = side(prey) === 'fort' ? `Attack the ${adj(prey.city)} fort` : side(prey) === 'navy' ? `Attack the ${adj(prey.city)} ship` : `Raid the ${prey.city ? adj(prey.city) + ' ' : ''}merchant`;
}
