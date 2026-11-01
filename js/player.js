// The player's boat: sailing, big waves, fishing, wood, salvage, and regrowth of the world.
import {FISH, TUNING, SHORE_FISH, WILDLIFE, COMBAT, WRECK_SIZES} from './config.js?v=b8d289e';
import {SPECS} from './ships.js?v=b8d289e';
import {WORLD, ISLANDS, SPOTS, WRECKS, SHOALS, shoalOn, START, HARBORS, TOWN_PIERS, PIER_LEN, zoneAt, stormDepth, pushOut, shoreDist, landDist} from './world.js?v=b8d289e';
import {G, ship, holdUsed, save, gain, lvl, putAboard, room} from './state.js?v=b8d289e';
import {W} from './weather.js?v=b8d289e';
import {steering} from './input.js?v=b8d289e';
import {toast, showZone} from './ui.js?v=b8d289e';
import {refreshTrees, spawnWake, ICEBERGS} from './entities.js?v=b8d289e';
import {startFish, stopFish} from './fishing.js?v=b8d289e';
import {blessing, rowBoost, fishBoost} from './crew.js?v=b8d289e';
import {progress} from './quests.js?v=b8d289e';
import {startSink} from './sinking.js?v=b8d289e';
import {sfx} from './audio.js?v=b8d289e';

// Hull gone: the boat goes down first (see sinking.js), then you wash up at Kallisto.
export function sink(){
  if (G.sinking) return;
  G.sinking = {t:0, side:Math.random() < .5 ? 1 : -1}; sfx('sink'); G.dest = null; G.joy = null; stopFish(); G.act = null;
  startSink(G.S.x, G.S.y, ship().len);
}
const SINK_SECONDS = 4.5;
function washUp(){
  const S = G.S, name = ship().name.toLowerCase(); G.sinking = null;
  for (const k in S.cargo) S.cargo[k] = 0; S.bless = 0; S.hull = Math.round(ship().hull*COMBAT.washUpHull); S.x = START.x; S.y = START.y; S.a = START.a;
  G.v = 0; G.dest = null; G.flash = 0; G.cam = {x:S.x, y:S.y}; ringArmed = false; moorAt(HARBORS[0]); // towed in to the Kallisto pier
  toast(`Your ${name} broke apart. You were towed home to Kallisto without your cargo, the hull badly patched. Repair it at the shipyard.`, 4.5); save();
}

// The wind: a ship with a sail goes up to 20% faster with the wind behind it and a little slower sailing into it.
// G.windFill (0 to 1) is how full the sail is, for the sail's shape and the tip.
function windBoost(){
  const S = G.S, sails = SPECS[ship().model].mast || lvl('sail') > 0;
  if (!sails){ G.windFill = 0; return 1; }
  const along = Math.cos(S.a - W.windA), k = W.windK; G.windFill = Math.max(0, along)*k;
  if (!S.windTip && G.windFill > .45 && G.v > 40){ S.windTip = true; toast('The wind fills your sail! With the wind at your back you sail faster.', 4.5); }
  return 1 + k*(along > 0 ? .2*along : .08*along);
}
function move(dt, sh){
  const S = G.S, [ix, iy] = steering(S), mag = Math.hypot(ix, iy);
  let target = 0, turn = 0; const heavy = sh.heavy || 2;
  if (!G.sheetOpen && mag > .06){
    const want = Math.atan2(iy, ix), diff = ((want - S.a + Math.PI*3) % (Math.PI*2)) - Math.PI;
    turn = Math.max(-1, Math.min(1, diff*1.4)) * sh.turn;
    // a sharp turn slows the boat down; it picks up speed again once it points the right way
    const ahead = Math.max(0, Math.cos(diff));
    target = sh.speed * G.settings.dev.speed * mag * (.25 + .75*ahead*ahead) * (S.bless > 0 ? WILDLIFE.blessSpeed : 1) * rowBoost() * windBoost();
  }
  // weight: a heavy ship takes a while to swing round and to get going, and glides on a long way when you stop rowing
  G.turnRate = (G.turnRate || 0) + (turn - (G.turnRate || 0)) * Math.min(1, dt*3.2/Math.sqrt(heavy)); S.a += G.turnRate * dt;
  G.v += (target - G.v) * Math.min(1, dt*(target > G.v ? 1.6/heavy : 1.2/Math.sqrt(heavy)));
  let px = Math.cos(S.a)*G.v*dt, py = Math.sin(S.a)*G.v*dt;
  if (zoneAt(S.x, S.y) === 2){ px += Math.sin(G.t*1.7)*TUNING.stormDrift*dt; py += Math.cos(G.t*1.3)*TUNING.stormDrift*dt; }
  S.x += px; S.y += py;
  if (pushOut(S, sh.beam*.9)) G.v *= .6;
  if (!G.dock && pierPush(S, sh.beam*.55)) G.v *= .6;
  for (const b of ICEBERGS){ const dx = S.x - b.x, dy = S.y - b.y, d = Math.hypot(dx, dy) || 1, m = b.r + sh.beam*.6; if (d < m){ S.x = b.x + dx/d*m; S.y = b.y + dy/d*m; G.v *= .6; } } // icebergs are solid
  S.x = Math.max(60, Math.min(WORLD-60, S.x)); S.y = Math.max(60, Math.min(WORLD-60, S.y));
}

function gather(dt, sh){
  const S = G.S, slow = G.v < TUNING.slowSpeed;
  let cur = null;
  if (!slow) G.still = 0;
  if (slow && !G.sheetOpen){
    const sp = SPOTS.find(s => s.stock > 0 && Math.hypot(s.x-S.x, s.y-S.y) < TUNING.fishRange);
    const wr = !sp && WRECKS.find(w => w.stock > 0 && Math.hypot(w.x-S.x, w.y-S.y) < TUNING.wreckRange*Math.max(1, WRECK_SIZES[w.size].scale));
    const is = !sp && !wr && ISLANDS.find(i => i.stock > 0 && shoreDist(i, S.x, S.y) < sh.beam + TUNING.treeRange);
    const k = S.bless > 0 ? WILDLIFE.blessWork : 1;
    if (sp) cur = {type:'fish', ref:sp, time:sh.fishTime};
    else if (wr) cur = {type:'wreck', ref:wr, time:sh.woodTime*.8*k};
    else if (is) cur = {type:'wood', ref:is, time:sh.woodTime*k};
    else {
      // only on a school that is out right now, and only once the boat has settled
      const sch = SHOALS.find(s => Math.hypot(s.x - S.x, s.y - S.y) < SHORE_FISH.range && shoalOn(s, G.t, SHORE_FISH.period[1], SHORE_FISH.on));
      G.still = (G.still || 0) + dt;
      if (sch && G.still > SHORE_FISH.settle) cur = {type:'shore', ref:sch, time:sh.fishTime*SHORE_FISH.timeK*k/fishBoost()/(1 + .4*G.stormK)}; // fish bite faster in a storm
    }
  }
  if (!cur || cur.type !== 'fish') stopFish();
  if (!cur){ G.act = null; return; }
  // each kind has its own limit: fish in the hold, wood on deck
  if (holdUsed() >= sh.hold && (cur.type === 'fish' || cur.type === 'shore')){ G.act = {full:true}; stopFish(); return; }
  if (!room('wood') && (cur.type === 'wood' || cur.type === 'wreck')){ if (!G.act || !G.act.full) fullTip('wood'); G.act = {full:true}; return; }
  if (cur.type === 'fish'){ if (!G.fish || G.fish.ref !== cur.ref) startFish(cur.ref); G.act = null; return; }
  if (!G.act || G.act.ref !== cur.ref) G.act = {...cur, p:0};
  const act = G.act;
  act.p += dt / act.time;
  if (act.p < 1) return;
  act.p = 0;
  const r = act.ref;
  if (act.type === 'shore'){ S.cargo[SHORE_FISH.kind]++; progress('catch', SHORE_FISH.kind); gain(SHORE_FISH.kind); } // a little fish pops up from the boat instead of a message
  else if (act.type === 'wood'){ const n = putAboard('wood', TUNING.woodPerCut); sfx('chop'); r.stock--; refreshTrees(r); gain('wood', n); progress('wood', null, n); }
  else {
    // bigger wrecks give more timber per pull, more coins, and merchant wrecks sometimes an amphora of wine or oil
    const ws = WRECK_SIZES[r.size] || WRECK_SIZES.small, wood = ws.wood;
    const wn = putAboard('wood', wood); r.stock--; progress('salvage', null, wn); gain('wood', wn);
    if (ws.bronze && Math.random() < ws.bronze[0]){ const b = putAboard('bronze', ws.bronze[1] + Math.floor(Math.random()*(ws.bronze[2] - ws.bronze[1] + 1))); if (b) gain('bronze', b); } // warships carried bronze fittings
    const [gc, g0, g1] = ws.gold;
    if (Math.random() < gc){ const c = g0 + Math.floor(Math.random()*(g1 - g0 + 1)); S.gold += c; gain('coin', c); }
    if (ws.goods && Math.random() < ws.goods){ const k = Math.random() < .5 ? 'wine' : 'oil'; if (putAboard(k)) gain(k); }
    if (!r.stock) toast('The wreck slips under the waves', 2.4);
  }
}

// The first time a kind fills up, say where to take it.
function fullTip(k){ const S = G.S; S.fullTips = S.fullTips || {}; if (S.fullTips[k]) return; S.fullTips[k] = true;
  toast(`No more room for ${k}. Dock at any harbor and it goes to the Kallisto warehouse.`, 4.5); }

function moveSpot(s){
  const S = G.S;
  for (let k=0;k<30;k++){ const a = Math.random()*6.28, d = 700 + Math.random()*1900, x = S.x + Math.cos(a)*d, y = S.y + Math.sin(a)*d;
    if (x < 300 || y < 300 || x > WORLD - 300 || y > WORLD - 300 || landDist(x, y) < 110 || zoneAt(x, y) > 1 || SPOTS.some(o => o !== s && Math.hypot(o.x - x, o.y - y) < 600)) continue;
    Object.assign(s, {x, y, kind:zoneAt(x, y) === 0 ? 'tuna' : 'swordfish', stock:TUNING.spotStock, regen:0, life:180 + Math.random()*240});
    if (s.g){ s.g.position.x = x; s.g.position.z = y; s.fish.forEach(f => f.userData.kind = s.kind); } return; }
  s.life = 60;
}

function regrow(dt){
  // P51: fishing spots wander. A fished-out spot comes back somewhere new near you; an untouched one moves on after a few minutes.
  for (const s of SPOTS){
    s.life = (s.life ?? 150 + Math.random()*200) - dt;
    const far = Math.hypot(s.x - G.S.x, s.y - G.S.y) > 900;
    if ((!s.stock && (s.regen += dt) > TUNING.spotRegen*3) || (s.life <= 0 && far)){ moveSpot(s); continue; }
    if (s.stock && s.stock < TUNING.spotStock){ s.regen += dt; if (s.regen > TUNING.spotRegen){ s.stock++; s.regen = 0; } }
  }
  for (const i of ISLANDS) if (i.trees && i.stock < i.trees){ i.regen += dt; if (i.regen > TUNING.treeRegen){ i.stock++; i.regen = 0; refreshTrees(i); } }
  for (const w of WRECKS) if (!w.stock){ w.regen += dt; if (w.regen > TUNING.wreckRespawn){ w.stock = WRECK_SIZES[w.size].stock; w.regen = 0; } }
}

// ---- docking: dockhands pull the ship in alongside the pier, and push it off again when you set sail ----
// G.dock.mode: 'in' (being pulled in), 'moored' (harbor open), 'out' (pushing off).
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
// the short way round, even when angles have wound up past a full turn (JS % keeps the sign, so wrap it properly)
const wrap = d => d - Math.PI*2*Math.floor((d + Math.PI)/(Math.PI*2));
const turnTo = (a, b, k) => a + wrap(b - a)*k;
// Either side of the pier: the side the ship is on. The ship keeps facing the way it came (bow out or bow in).
function berth(sh, P){
  const S = G.S, nx = -P.dy, ny = P.dx, along = Math.max(sh.len/2 - 10, Math.min(PIER_LEN*.55, PIER_LEN + 40 - sh.len/2));
  const px = P.x + P.dx*along, py = P.y + P.dy*along;
  const side = (S.x - px)*nx + (S.y - py)*ny >= 0 ? 1 : -1, off = 13 + sh.beam/2 + (SPECS[sh.model].oarCount > 1 ? 40 : 0); // oars stay clear of the pier
  const pa = Math.atan2(P.dy, P.dx), a0 = Math.cos(S.a - pa) >= 0 ? pa : pa + Math.PI, a = S.a + wrap(a0 - S.a); // line up with the pier the short way
  return {x:px + nx*side*off, y:py + ny*side*off, a, side, along};
}
// Piers are solid: the ship slides along them instead of sailing through.
function pierPush(S, rad){ let hit = false;
  for (const P of [...HARBORS.map(h => h.pier), ...TOWN_PIERS]){ const nx = -P.dy, ny = P.dx, rx = S.x - P.x, ry = S.y - P.y, t = rx*P.dx + ry*P.dy, s = rx*nx + ry*ny, w = 9 + rad;
    if (t < -5 || t > PIER_LEN + 6 || Math.abs(s) > w) continue;
    const side = s < 0 ? -1 : 1; S.x += nx*(side*w - s); S.y += ny*(side*w - s); hit = true; }
  return hit;
}
// How far the ship is from a pier (anywhere along it, plus a little past the end).
function pierDist(P, x, y){
  const L = PIER_LEN + 30, t = Math.max(0, Math.min(L, (x - P.x)*P.dx + (y - P.y)*P.dy));
  return Math.hypot(x - P.x - P.dx*t, y - P.y - P.dy*t);
}
// e.detail = the harbor
document.addEventListener('dock', e => {
  const S = G.S, h = e.detail || HARBORS[0], b = berth(ship(), h.pier);
  G.dest = null; G.joy = null; stopFish(); G.act = null;
  G.dock = {mode:'in', t:0, dur:2.8, x0:S.x, y0:S.y, a0:S.a, h, ...b}; sfx('bell'); setTimeout(() => sfx('dock'), 2200);
});
document.addEventListener('undock', () => {
  const d = G.dock; if (!d) return;
  // leave in a straight line, no turning: bow out to sea = straight ahead; bow toward the shore = back straight out astern
  const P = d.h.pier, out = Math.cos(d.a)*P.dx + Math.sin(d.a)*P.dy >= 0 ? 1 : -1, L = 150 + ship().len*.6;
  d.back = out < 0;
  Object.assign(d, {mode:'out', t:0, dur:2.6, x0:d.x, y0:d.y, a0:d.a, x1:d.x + Math.cos(d.a)*L*out, y1:d.y + Math.sin(d.a)*L*out});
});
function docking(dt){
  const S = G.S, d = G.dock, px = S.x, py = S.y; G.turnRate = 0;
  if (d.mode === 'moored'){ S.x = d.x; S.y = d.y; S.a = d.a; G.v = 0; return; }
  d.t += dt/d.dur; const k = ease(Math.min(1, d.t));
  if (d.mode === 'in'){ S.x = d.x0 + (d.x - d.x0)*k; S.y = d.y0 + (d.y - d.y0)*k; S.a = turnTo(d.a0, d.a, Math.min(1, k*1.4)); }
  else { S.x = d.x0 + (d.x1 - d.x0)*k; S.y = d.y0 + (d.y1 - d.y0)*k; S.a = d.a0; }
  G.v = Math.hypot(S.x - px, S.y - py)/Math.max(dt, 1e-3);
  if (d.t >= 1){
    if (d.mode === 'in'){ d.mode = 'moored'; document.dispatchEvent(new Event('docked')); }
    else { G.dock = null; G.v = d.back ? 0 : ship().speed*.25; }
  }
}

// P50: every harbor has a glowing ring in the water just past the end of its pier. Sail into it and the dockhands bring you in.
// It only works again once you've sailed out of it (so leaving the harbor doesn't pull you straight back in).
export const RING_R = 70;
export const harborRing = h => ({x:h.pier.x + h.pier.dx*(PIER_LEN + 75), y:h.pier.y + h.pier.dy*(PIER_LEN + 75)});
let ringArmed = false, started = false;
// Tied up at harbor h right away (no sailing in): when the game starts near a harbor, and after you're towed home.
function moorAt(h){ const b = berth(ship(), h.pier); Object.assign(G.S, {x:b.x, y:b.y, a:b.a}); G.v = 0; G.dest = null; G.joy = null;
  G.dock = {mode:'moored', t:1, dur:1, x0:b.x, y0:b.y, a0:b.a, h, ...b}; G.cam = {x:b.x, y:b.y}; }
function harborRings(){
  const S = G.S; let near = Infinity, hit = null;
  for (const h of HARBORS){ const r = harborRing(h), d = Math.hypot(S.x - r.x, S.y - r.y); if (d < near){ near = d; hit = h; } }
  if (near > RING_R + 50){ ringArmed = true; return; }
  if (near > RING_R || !ringArmed || G.sheetOpen) return;
  ringArmed = false;
  const banned = hit.is.city && (G.hunted || {})[hit.is.city];
  if (banned){ toast(`${hit.is.city === 'athens' ? 'Athens' : 'Sparta'} won't let you dock while they hunt you`, 3); return; }
  document.dispatchEvent(new CustomEvent('dock', {detail:hit}));
}

// Returns null (harbors are entered through their rings now, see harborRings()).
export function updatePlayer(dt){
  const S = G.S, sh = ship();
  // coming back to the game at a harbor (inside or by its ring): start tied up at the pier, not out on the water
  if (!started){ started = true; const h = HARBORS.find(h => { const r = harborRing(h); return Math.hypot(S.x - r.x, S.y - r.y) < RING_R + 120; }); if (h) moorAt(h); }
  G.t += dt;
  if (!G.sheetOpen) S.playSeconds = (S.playSeconds || 0) + dt;
  if (S.bless > 0) S.bless = Math.max(0, S.bless - dt);
  if (G.sinking){ G.sinking.t += dt; G.v *= Math.exp(-dt*2); if (G.sinking.t > SINK_SECONDS) washUp(); return null; }
  if (G.dock){ G.nearPier = null; docking(dt); const k = Math.min(1, dt*3.5); G.cam.x += (S.x - G.cam.x)*k; G.cam.y += (S.y - G.cam.y)*k; spawnWake(); return null; }
  move(dt, sh);
  const z = zoneAt(S.x, S.y), depth = z === 2 ? stormDepth(S.x, S.y) : 0;
  if (z !== G.curZone){ if (G.curZone !== -1) showZone(z); G.curZone = z; }
  // big waves in the Open Sea, and storms anywhere outside the Shallows, wear down small hulls
  const storm = G.stormK > .5 ? G.stormK : 0, waves = z === 2 ? 1 + depth/1500 + storm : z === 1 ? storm*.5 : 0;
  if (waves > 0 && sh.storm > 0){
    S.hull -= sh.storm * waves * (blessing().wave || 1) * dt;
    if (z === 1 && !S.stormTip){ S.stormTip = true; toast('The storm is wearing down your hull. The Shallows around Kallisto stay calm.', 5); }
    if (z === 2 && !S.waveTip){ S.waveTip = true; toast('Big waves! They slowly wear down a small hull. Head back to calmer water to stay afloat.', 5); }
    if (S.hull <= 0){ sink(); return null; }
  }
  G.flash = Math.max(0, G.flash - dt*2.5);
  gather(dt, sh);
  regrow(dt);
  spawnWake();
  const k = Math.min(1, dt*3.5); G.cam.x += (S.x - G.cam.x)*k; G.cam.y += (S.y - G.cam.y)*k;
  // dockhands come out on the pier as you sail up, before you ask to dock
  G.nearPier = HARBORS.find(h => pierDist(h.pier, S.x, S.y) < TUNING.dockRange*3) || null;
  harborRings();
  return null;
}
