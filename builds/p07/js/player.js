// The player's boat: sailing, storms, fishing, wood, salvage, and regrowth of the world.
import {FISH, TUNING} from './config.js';
import {WORLD, ISLANDS, SPOTS, WRECKS, DOCK, zoneAt, stormDepth} from './world.js';
import {G, ship, holdUsed, save} from './state.js';
import {steering} from './input.js';
import {toast, showZone} from './ui.js';
import {refreshTrees, spawnWake} from './entities.js';

export function sink(){
  const S = G.S, name = ship().name.toLowerCase();
  S.cargo = {sardine:0, tuna:0, wood:0}; S.hull = ship().hull; S.x = DOCK.x+70; S.y = DOCK.y+40;
  G.v = 0; G.dest = null; G.flash = 0; G.cam = {x:S.x, y:S.y};
  toast(`Your ${name} broke apart. You washed up at Kallisto without your cargo.`, 4.5); save();
}

function move(dt, sh){
  const S = G.S, [ix, iy] = steering(S), mag = Math.hypot(ix, iy);
  let target = 0;
  if (!G.sheetOpen && mag > .06){
    const want = Math.atan2(iy, ix), diff = ((want - S.a + Math.PI*3) % (Math.PI*2)) - Math.PI;
    S.a += Math.max(-1, Math.min(1, diff)) * 3 * dt;
    target = sh.speed * G.settings.dev.speed * mag * Math.max(.2, Math.cos(diff));
  }
  G.v += (target - G.v) * Math.min(1, dt*1.6);
  let px = Math.cos(S.a)*G.v*dt, py = Math.sin(S.a)*G.v*dt;
  if (zoneAt(S.x, S.y) === 2){ px += Math.sin(G.t*1.7)*TUNING.stormDrift*dt; py += Math.cos(G.t*1.3)*TUNING.stormDrift*dt; }
  S.x += px; S.y += py;
  for (const is of ISLANDS){
    const dx = S.x - is.x, dy = S.y - is.y, d = Math.hypot(dx, dy), min = is.r*1.02 + sh.beam;
    if (d < min){ S.x = is.x + dx/d*min; S.y = is.y + dy/d*min; G.v *= .6; }
  }
  S.x = Math.max(60, Math.min(WORLD-60, S.x)); S.y = Math.max(60, Math.min(WORLD-60, S.y));
}

function gather(dt, sh){
  const S = G.S, slow = G.v < TUNING.slowSpeed;
  let cur = null;
  if (slow && !G.sheetOpen){
    const sp = SPOTS.find(s => s.stock > 0 && Math.hypot(s.x-S.x, s.y-S.y) < TUNING.fishRange);
    const wr = !sp && WRECKS.find(w => w.stock > 0 && Math.hypot(w.x-S.x, w.y-S.y) < TUNING.wreckRange);
    const is = !sp && !wr && ISLANDS.find(i => i.stock > 0 && Math.hypot(i.x-S.x, i.y-S.y) < i.r + sh.beam + TUNING.treeRange);
    if (sp) cur = {type:'fish', ref:sp, time:sh.fishTime};
    else if (wr) cur = {type:'wreck', ref:wr, time:sh.woodTime*.8};
    else if (is) cur = {type:'wood', ref:is, time:sh.woodTime};
  }
  if (!cur){ G.act = null; return; }
  if (holdUsed() >= sh.hold){ G.act = {full:true}; return; }
  if (!G.act || G.act.ref !== cur.ref) G.act = {...cur, p:0};
  const act = G.act;
  act.p += dt / act.time;
  if (act.p < 1) return;
  act.p = 0;
  const r = act.ref;
  if (act.type === 'fish'){ S.cargo[r.kind]++; r.stock--; toast(`+1 ${FISH[r.kind].label}`); }
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

function regrow(dt){
  for (const s of SPOTS) if (s.stock < TUNING.spotStock){ s.regen += dt; if (s.regen > TUNING.spotRegen){ s.stock++; s.regen = 0; } }
  for (const i of ISLANDS) if (i.trees && i.stock < i.trees){ i.regen += dt; if (i.regen > TUNING.treeRegen){ i.stock++; i.regen = 0; refreshTrees(i); } }
  for (const w of WRECKS) if (!w.stock){ w.regen += dt; if (w.regen > TUNING.wreckRespawn){ w.stock = TUNING.wreckStock; w.regen = 0; } }
}

// Returns true when the boat is parked at the harbor.
export function updatePlayer(dt){
  const S = G.S, sh = ship();
  G.t += dt;
  if (!G.sheetOpen) S.playSeconds = (S.playSeconds || 0) + dt;
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
  return Math.hypot(DOCK.x - S.x, DOCK.y - S.y) < TUNING.dockRange && G.v < TUNING.slowSpeed && !G.sheetOpen;
}
