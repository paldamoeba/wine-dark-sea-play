// The player's boat: sailing, storms, fishing, wood, salvage, and regrowth of the world.
import {FISH, TUNING, SHORE_FISH, WILDLIFE} from './config.js';
import {SPECS} from './ships.js';
import {WORLD, ISLANDS, SPOTS, WRECKS, START, PIER, PIER_LEN, zoneAt, stormDepth, pushOut, shoreDist, landDist} from './world.js';
import {G, ship, holdUsed, save} from './state.js';
import {steering} from './input.js';
import {toast, showZone} from './ui.js';
import {refreshTrees, spawnWake} from './entities.js';
import {startFish, stopFish} from './fishing.js';

export function sink(){
  const S = G.S, name = ship().name.toLowerCase();
  S.cargo = {sardine:0, tuna:0, swordfish:0, wood:0}; S.bless = 0; S.hull = ship().hull; S.x = START.x; S.y = START.y; S.a = START.a;
  G.v = 0; G.dest = null; G.flash = 0; G.cam = {x:S.x, y:S.y};
  toast(`Your ${name} broke apart. You washed up at Kallisto without your cargo.`, 4.5); save();
}

function move(dt, sh){
  const S = G.S, [ix, iy] = steering(S), mag = Math.hypot(ix, iy);
  let target = 0;
  if (!G.sheetOpen && mag > .06){
    const want = Math.atan2(iy, ix), diff = ((want - S.a + Math.PI*3) % (Math.PI*2)) - Math.PI;
    S.a += Math.max(-1, Math.min(1, diff)) * sh.turn * dt;
    // a sharp turn slows the boat almost to a stop; it picks up speed again once it points the right way
    const ahead = Math.max(0, Math.cos(diff));
    target = sh.speed * G.settings.dev.speed * mag * Math.max(.06, ahead*ahead) * (S.bless > 0 ? WILDLIFE.blessSpeed : 1);
  }
  G.v += (target - G.v) * Math.min(1, dt*(.8 + sh.turn*.3)); // big ships are slower to get going
  let px = Math.cos(S.a)*G.v*dt, py = Math.sin(S.a)*G.v*dt;
  if (zoneAt(S.x, S.y) === 2){ px += Math.sin(G.t*1.7)*TUNING.stormDrift*dt; py += Math.cos(G.t*1.3)*TUNING.stormDrift*dt; }
  S.x += px; S.y += py;
  if (pushOut(S, sh.beam*.9)) G.v *= .6;
  S.x = Math.max(60, Math.min(WORLD-60, S.x)); S.y = Math.max(60, Math.min(WORLD-60, S.y));
}

function gather(dt, sh){
  const S = G.S, slow = G.v < TUNING.slowSpeed;
  let cur = null;
  if (slow && !G.sheetOpen){
    const sp = SPOTS.find(s => s.stock > 0 && Math.hypot(s.x-S.x, s.y-S.y) < TUNING.fishRange);
    const wr = !sp && WRECKS.find(w => w.stock > 0 && Math.hypot(w.x-S.x, w.y-S.y) < TUNING.wreckRange);
    const is = !sp && !wr && ISLANDS.find(i => i.stock > 0 && shoreDist(i, S.x, S.y) < sh.beam + TUNING.treeRange);
    const k = S.bless > 0 ? WILDLIFE.blessWork : 1;
    if (sp) cur = {type:'fish', ref:sp, time:sh.fishTime};
    else if (wr) cur = {type:'wreck', ref:wr, time:sh.woodTime*.8*k};
    else if (is) cur = {type:'wood', ref:is, time:sh.woodTime*k};
    else if (landDist(S.x, S.y) < SHORE_FISH.range) cur = {type:'shore', ref:SHORE, time:sh.fishTime*SHORE_FISH.timeK*k};
  }
  if (!cur || cur.type !== 'fish') stopFish();
  if (!cur){ G.act = null; return; }
  if (holdUsed() >= sh.hold){ G.act = {full:true}; stopFish(); return; }
  if (cur.type === 'fish'){ if (!G.fish || G.fish.ref !== cur.ref) startFish(cur.ref); G.act = null; return; }
  if (!G.act || G.act.ref !== cur.ref) G.act = {...cur, p:0};
  const act = G.act;
  act.p += dt / act.time;
  if (act.p < 1) return;
  act.p = 0;
  const r = act.ref;
  if (act.type === 'shore'){ S.cargo[SHORE_FISH.kind]++; toast(`+1 ${FISH[SHORE_FISH.kind].label}`); }
  else if (act.type === 'wood'){ S.cargo.wood++; r.stock--; refreshTrees(r); toast('+1 Wood'); }
  else {
    S.cargo.wood++; r.stock--;
    if (Math.random() < TUNING.wreckGoldChance){
      const c = TUNING.wreckGoldMin + Math.floor(Math.random()*(TUNING.wreckGoldMax - TUNING.wreckGoldMin + 1));
      S.gold += c; toast(`+1 Wood, and ${c} gold coins in the wreck`);
    } else toast('+1 Salvaged wood');
    if (!r.stock) toast('The wreck slips under the waves', 2.4);
  }
}

const SHORE = {}; // shore fishing never runs out
function regrow(dt){
  for (const s of SPOTS) if (s.stock < TUNING.spotStock){ s.regen += dt; if (s.regen > TUNING.spotRegen){ s.stock++; s.regen = 0; } }
  for (const i of ISLANDS) if (i.trees && i.stock < i.trees){ i.regen += dt; if (i.regen > TUNING.treeRegen){ i.stock++; i.regen = 0; refreshTrees(i); } }
  for (const w of WRECKS) if (!w.stock){ w.regen += dt; if (w.regen > TUNING.wreckRespawn){ w.stock = TUNING.wreckStock; w.regen = 0; } }
}

// ---- docking: dockhands pull the ship in alongside the pier, and push it off again when you set sail ----
// G.dock.mode: 'in' (being pulled in), 'moored' (harbor open), 'out' (pushing off).
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
const turnTo = (a, b, k) => a + (((b - a + Math.PI*3) % (Math.PI*2)) - Math.PI)*k;
// Either side of the pier: the side the ship is on. The ship keeps facing the way it came (bow out or bow in).
function berth(sh){
  const S = G.S, nx = -PIER.dy, ny = PIER.dx, along = Math.max(sh.len/2 - 10, Math.min(PIER_LEN*.55, PIER_LEN + 40 - sh.len/2));
  const px = PIER.x + PIER.dx*along, py = PIER.y + PIER.dy*along;
  const side = (S.x - px)*nx + (S.y - py)*ny >= 0 ? 1 : -1, off = 13 + sh.beam/2 + (SPECS[sh.model].oarCount > 1 ? 40 : 0); // oars stay clear of the pier
  const pa = Math.atan2(PIER.dy, PIER.dx), a = Math.cos(S.a - pa) >= 0 ? pa : pa + Math.PI;
  return {x:px + nx*side*off, y:py + ny*side*off, a, side, along};
}
// How far the ship is from the pier (anywhere along it, plus a little past the end).
function pierDist(x, y){
  const L = PIER_LEN + 30, t = Math.max(0, Math.min(L, (x - PIER.x)*PIER.dx + (y - PIER.y)*PIER.dy));
  return Math.hypot(x - PIER.x - PIER.dx*t, y - PIER.y - PIER.dy*t);
}
document.addEventListener('dock', () => {
  const S = G.S, b = berth(ship());
  G.dest = null; G.joy = null; stopFish(); G.act = null;
  G.dock = {mode:'in', t:0, dur:2.8, x0:S.x, y0:S.y, a0:S.a, ...b};
});
document.addEventListener('undock', () => {
  const d = G.dock; if (!d) return;
  // push away from the pier and drift forward the way the bow points
  const fx = Math.cos(d.a), fy = Math.sin(d.a), nx = -PIER.dy*d.side, ny = PIER.dx*d.side;
  Object.assign(d, {mode:'out', t:0, dur:2, x0:d.x, y0:d.y, a0:d.a, x1:d.x + nx*45 + fx*60, y1:d.y + ny*45 + fy*60});
});
function docking(dt){
  const S = G.S, d = G.dock, px = S.x, py = S.y;
  if (d.mode === 'moored'){ S.x = d.x; S.y = d.y; S.a = d.a; G.v = 0; return; }
  d.t += dt/d.dur; const k = ease(Math.min(1, d.t));
  if (d.mode === 'in'){ S.x = d.x0 + (d.x - d.x0)*k; S.y = d.y0 + (d.y - d.y0)*k; S.a = turnTo(d.a0, d.a, Math.min(1, k*1.4)); }
  else { S.x = d.x0 + (d.x1 - d.x0)*k; S.y = d.y0 + (d.y1 - d.y0)*k; }
  G.v = Math.hypot(S.x - px, S.y - py)/Math.max(dt, 1e-3);
  if (d.t >= 1){
    if (d.mode === 'in'){ d.mode = 'moored'; document.dispatchEvent(new Event('docked')); }
    else { G.dock = null; G.v = ship().speed*.25; }
  }
}

// Returns true when the boat is near the harbor and slow enough to dock.
export function updatePlayer(dt){
  const S = G.S, sh = ship();
  G.t += dt;
  if (!G.sheetOpen) S.playSeconds = (S.playSeconds || 0) + dt;
  if (S.bless > 0) S.bless = Math.max(0, S.bless - dt);
  if (G.dock){ docking(dt); const k = Math.min(1, dt*3.5); G.cam.x += (S.x - G.cam.x)*k; G.cam.y += (S.y - G.cam.y)*k; spawnWake(); return false; }
  move(dt, sh);
  const z = zoneAt(S.x, S.y), depth = z === 2 ? stormDepth(S.x, S.y) : 0;
  if (z !== G.curZone){ if (G.curZone !== -1) showZone(z); G.curZone = z; }
  G.stormK += ((z === 2 ? Math.min(1, .45 + depth/400) : 0) - G.stormK) * Math.min(1, dt*.8);
  if (z === 2 && S.tier < 2){
    S.hull -= sh.storm * (1 + depth/500) * dt;
    if (Math.random() < dt*.22) G.flash = 1;
    if (S.hull <= 0){ sink(); return false; }
  }
  G.flash = Math.max(0, G.flash - dt*2.5);
  gather(dt, sh);
  regrow(dt);
  spawnWake();
  const k = Math.min(1, dt*3.5); G.cam.x += (S.x - G.cam.x)*k; G.cam.y += (S.y - G.cam.y)*k;
  return pierDist(S.x, S.y) < TUNING.dockRange && G.v < TUNING.slowSpeed*2 && !G.sheetOpen;
}
