// Everything that changes while playing, plus saving and loading.
import {SHIPS, TUNING, SAVE_VERSION, SAVE_KEY, OLD_SAVE_KEYS, SETTINGS_KEY, UPGRADES} from './config.js?v=af6cebe';
import {START, HOME, MAP, ISLANDS, SPOTS, WRECKS, EXP_N, EXP_CELL} from './world.js?v=af6cebe';
import {sfx} from './audio.js?v=af6cebe';

// G = the live game. G.S is the part that gets saved.
export const G = {
  S: null, settings: null,
  v: 0, dest: null, act: null, joy: null,
  cam: {x:0, y:0}, t: 0, flash: 0, stormK: 0,
  portOpen: false, sheetOpen: false, mapOpen: false, curZone: -1,
  explored: new Uint8Array(EXP_N*EXP_N), exploredRev: 0,
};

// ---- explored chart ----
// Reveal every grid cell within r of (x, y). Bumps exploredRev when something new shows up.
export function reveal(x, y, r){
  const e = G.explored, c0 = Math.max(0, Math.floor((x-r)/EXP_CELL)), c1 = Math.min(EXP_N-1, Math.floor((x+r)/EXP_CELL));
  const r0 = Math.max(0, Math.floor((y-r)/EXP_CELL)), r1 = Math.min(EXP_N-1, Math.floor((y+r)/EXP_CELL));
  let changed = false;
  for (let row=r0; row<=r1; row++) for (let col=c0; col<=c1; col++){
    const i = row*EXP_N + col; if (e[i]) continue;
    if (Math.hypot((col+.5)*EXP_CELL - x, (row+.5)*EXP_CELL - y) <= r){ e[i] = 1; changed = true; }
  }
  if (changed) G.exploredRev++;
  return changed;
}
export const isExplored = (x, y) => { const col = Math.floor(x/EXP_CELL), row = Math.floor(y/EXP_CELL);
  return col >= 0 && row >= 0 && col < EXP_N && row < EXP_N && !!G.explored[row*EXP_N + col]; };
function encodeExplored(){ let out = ''; for (let i=0;i<G.explored.length;i+=4) out += (G.explored[i] | G.explored[i+1]<<1 | G.explored[i+2]<<2 | G.explored[i+3]<<3).toString(16); return out; }
function decodeExplored(str){
  G.explored.fill(0);
  if (typeof str !== 'string') return false;
  for (let k=0;k<str.length && k*4<G.explored.length;k++){ const n = parseInt(str[k], 16) || 0; for (let b=0;b<4;b++) G.explored[k*4+b] = (n>>b) & 1; }
  G.exploredRev++; return true;
}
export function revealAll(){ G.explored.fill(1); G.exploredRev++; }
function startingChart(){ G.explored.fill(0); reveal(HOME.x, HOME.y, 1500); }

// Upgrade level: ship parts are kept per ship (G.S.ups[tier]); arrows and the ram stay with you.
export const lvl = k => UPGRADES[k].ship ? ((G.S.ups || {})[G.S.tier] || {})[k] || 0 : G.S[k] || 0;
// Your ship with its upgrades: more hull from planking, more speed from oars and sail, quicker turns from the steering oars.
let shipC = {key:'', v:null};
export const ship = () => { const b = SHIPS[G.S.tier], key = `${G.S.tier}|${lvl('hull')}|${lvl('oars')}|${lvl('sail')}|${lvl('helm')}`;
  if (shipC.key !== key) shipC = {key, v:{...b, hull:Math.round(b.hull*(1 + UPGRADES.hull.each*lvl('hull'))),
    speed:Math.round(b.speed*(1 + UPGRADES.oars.each*lvl('oars') + UPGRADES.sail.each*lvl('sail'))), turn:b.turn*(1 + UPGRADES.helm.each*lvl('helm'))}};
  return shipC.v; };
// Something picked up: a little icon and "+n" springs up from the boat, then drops back into it (drawn by overlay.js).
// kind = 'fish' | 'tuna' | 'swordfish' | 'wood' | 'coin' | a trade good.
export function gain(kind, n = 1, x, y){ sfx(kind === 'coin' || kind === 'bronze' ? 'coin' : kind === 'sardine' ? 'fish' : kind === 'tuna' || kind === 'swordfish' ? '' : 'wood'); const slot = (G.pops || []).filter(p => p.ic && G.t - p.t < .6).length; G.pops = [...(G.pops || []), {t:G.t + slot*.15, slot, ic:kind, txt:`+${n}`, x, y}]; }
// Building materials in the warehouse: wood (S.ware), bronze and linen. A cost is {wood, bronze, linen, gold}.
const HAVE = {wood:'ware', bronze:'bronze', linen:'linen', gold:'gold'};
export const have = k => G.S[HAVE[k]] || 0;
export const canPay = c => !!c && Object.keys(HAVE).every(k => have(k) >= (c[k] || 0));
export function pay(c){ if (!canPay(c)) return false; for (const k in HAVE) G.S[HAVE[k]] = have(k) - (c[k] || 0); return true; }
export function addMat(k, n){ G.S[HAVE[k]] = have(k) + n; }
export const holdUsed = () => Object.values(G.S.cargo).reduce((a, b) => a + (b || 0), 0);

export function newSave(){
  return {version:SAVE_VERSION, econ:2, tier:0, gold:0, ware:0, bronze:0, linen:0, cargo:{sardine:0, tuna:0, swordfish:0, wood:0, wine:0, oil:0, pottery:0, obsidian:0, dye:0},
    x:START.x, y:START.y, a:START.a, map:MAP.key, hull:SHIPS[0].hull, hint:true, playSeconds:0, world:null, explored:null, look:{}};
}

function read(key){ try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null; } }
function write(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch(e){ return false; } }

// Bring an older save up to the current shape.
function migrate(o){
  if (!o || typeof o !== 'object' || !o.cargo) return null;
  if (!o.version) o.version = 2;               // prototype 2 saves had no version
  if (o.version < 3){ o.playSeconds = 0; o.world = null; o.version = 3; }
  const base = newSave();
  if (o.crew) o.crew.forEach(c => { if (c.job === 'fisher') c.job = 'rower'; }); // fishers became rowers: everyone fishes now
  // prototype 39: wood counts 5 times bigger and lives in the warehouse, never the hold
  if (!o.econ){ o.ware = ((o.ware || 0) + ((o.cargo && o.cargo.wood) || 0))*5; o.cargo.wood = 0; o.econ = 2; }
  return {...base, ...o, cargo:{...base.cargo, ...o.cargo}, look:{...(o.look || {})}};
}

function applyWorld(w){
  if (!w) return;
  (w.trees || []).forEach((s, i) => { if (ISLANDS[i] && ISLANDS[i].trees) ISLANDS[i].stock = Math.min(ISLANDS[i].trees, s); });
  (w.spots || []).forEach((s, i) => { if (SPOTS[i]) SPOTS[i].stock = s; });
  (w.wrecks || []).forEach(([s, r], i) => { if (WRECKS[i]){ WRECKS[i].stock = s; WRECKS[i].regen = r || 0; } });
  (w.owners || []).forEach((c, i) => { const is = ISLANDS[i]; if (is && is.home0 && !is.capital && (c === 'athens' || c === 'sparta')) is.city = c; });
}
function resetWorld(){
  ISLANDS.forEach(i => { i.stock = i.trees; i.regen = 0; if (i.home0) i.city = i.home0; });
  SPOTS.forEach(s => { s.stock = TUNING.spotStock; s.regen = 0; });
  WRECKS.forEach(w => { w.stock = TUNING.wreckStock; w.regen = 0; });
}

export function load(){
  let s = migrate(read(SAVE_KEY));
  if (!s) for (const k of OLD_SAVE_KEYS){ s = migrate(read(k)); if (s) break; }
  G.S = s || newSave();
  // A different map (or map scale) than last time: keep drachmae and ship, start again at the Kallisto pier.
  if (G.S.map !== MAP.key){ Object.assign(G.S, {map:MAP.key, x:START.x, y:START.y, a:START.a, world:null, explored:null}); }
  applyWorld(G.S.world);
  if (!G.S.explored || !decodeExplored(G.S.explored)) startingChart();
  reveal(G.S.x, G.S.y, 520);
  G.cam = {x:G.S.x, y:G.S.y};
}

export function save(){
  if (!G.S) return;
  G.S.world = {
    trees: ISLANDS.map(i => i.stock),
    spots: SPOTS.map(s => s.stock),
    wrecks: WRECKS.map(w => [w.stock, Math.round(w.regen)]),
    owners: ISLANDS.map(i => i.city || null),
  };
  G.S.explored = encodeExplored();
  write(SAVE_KEY, G.S);
}

export function resetSave(){
  G.S = newSave(); G.S.hint = false;
  resetWorld();
  startingChart();
  G.v = 0; G.dest = null; G.act = null; G.cam = {x:G.S.x, y:G.S.y};
  save();
}

export function loadSettings(){
  const saved = read(SETTINGS_KEY) || {};
  const {dev, ...rest} = saved;
  G.settings = {quality:'auto', detected:null, showFps:false, builder:false, ...rest, // a new player starts with builder tools off
    // Builder tools: only for making the game, removed before release.
    tools: {zoom:1, speed:1, teleport:false, markers:true, crew:true, raiders:true, fleet:false, map:'D', spread:1, isle:1, ...(dev || {})}};
  // The game reads G.settings.dev. With builder tools off it gets what a player would have; the builder values stay saved for later.
  Object.defineProperty(G.settings, 'dev', {enumerable:false, value:new Proxy({}, {
    get:(_, k) => (!G.settings.builder && k in PLAYER_DEV ? PLAYER_DEV : G.settings.tools)[k],
    set:(_, k, v) => { G.settings.tools[k] = v; return true; }})});
}
const PLAYER_DEV = {zoom:1, speed:1, teleport:false, markers:false, crew:true, raiders:true, fleet:false};
export function saveSettings(){ const {tools, ...rest} = G.settings; write(SETTINGS_KEY, {...rest, dev:tools}); }

// Save on a timer and whenever the app goes to the background.
export function startAutosave(){
  setInterval(save, TUNING.autosaveSeconds*1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  addEventListener('pagehide', save);
}
