// Everything that changes while playing, plus saving and loading.
import {SHIPS, TUNING, SAVE_VERSION, SAVE_KEY, OLD_SAVE_KEYS, SETTINGS_KEY, UPGRADES, FISH, GOODS} from './config.js?v=356bdbb';
import {START, HOME, MAP, ISLANDS, SPOTS, WRECKS, EXP_N, EXP_CELL} from './world.js?v=356bdbb';
import {sfx} from './audio.js?v=356bdbb';

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
// The size class of the ship you sail (0 small boat .. 3 big warship); captured bandit ships have one too.
export const rank = (t = G.S.tier) => SHIPS[t].rank;
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
// What the ship carries. Each kind has its own limit: fish (the hold), wood, bronze and trade goods (SHIPS[t].cap).
export const LOADS = ['fish', 'wood', 'bronze', 'goods'];
export const loadOf = k => FISH[k] ? 'fish' : GOODS[k] ? 'goods' : k;
export function used(cat, cargo = G.S.cargo){ const keys = cat === 'fish' ? Object.keys(FISH) : cat === 'goods' ? Object.keys(GOODS) : [cat]; return keys.reduce((a, k) => a + (cargo[k] || 0), 0); }
export const capOf = (cat, t = G.S.tier) => cat === 'fish' ? SHIPS[t].hold : SHIPS[t].cap[cat];
export const room = cat => Math.max(0, capOf(cat) - used(cat));
export const holdUsed = () => used('fish');
// Put n of something aboard, as much as fits. Returns how many went aboard.
export function putAboard(k, n = 1){ const m = Math.min(n, room(loadOf(k))); G.S.cargo[k] = (G.S.cargo[k] || 0) + m; return m; }
// At any harbor the wood and bronze aboard go to the warehouse (it's shipped home to Kallisto).
export function unload(){ const S = G.S, w = S.cargo.wood || 0, b = S.cargo.bronze || 0; S.ware = (S.ware || 0) + w; S.bronze = (S.bronze || 0) + b; S.cargo.wood = 0; S.cargo.bronze = 0; return [w, b]; }

export function newSave(){
  return {version:SAVE_VERSION, econ:2, tier:0, gold:0, ware:0, bronze:0, linen:0, cargo:{sardine:0, tuna:0, swordfish:0, wood:0, wine:0, oil:0, pottery:0, obsidian:0, dye:0},
    x:START.x, y:START.y, a:START.a, map:MAP.key, hull:SHIPS[0].hull, hint:true, playSeconds:0, world:null, explored:null, look:{}, p49:true, plans:[0], camps:[]};
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
  // prototype 49: two bandit camp goals were added (before the fishing boat and before the bireme), ships need blueprints,
  // and the hired sailors became each ship's own crew (old crew quarters levels count as Crew levels; hires are refunded)
  if (!o.p49){ o.p49 = true; const g = o.goal || 0; o.goal = g < 7 ? g : g === 7 ? 8 : g + 2;
    const own = o.owned || Array.from({length:(o.tier || 0) + 1}, (_, i) => i); o.plans = [...new Set([0, ...own])];
    if (o.crew && o.crew.length){ o.gold = (o.gold || 0) + 30*o.crew.length; o.crewRefund = o.crew.length; } o.crew = []; }  return {...base, ...o, cargo:{...base.cargo, ...o.cargo}, look:{...(o.look || {})}};
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

export const PUBLIC = /github\.io$/.test(location.hostname); // the public play link
export function loadSettings(){
  const saved = read(SETTINGS_KEY) || {};
  const {dev, ...rest} = saved;
  // P56: the public play link (GitHub) is always the normal game; the claude.ai page starts with the builder tools on
  // (you can still switch them off there, and it remembers)
  if (PUBLIC){ rest.builder = false; rest.showBuilder = false; } else if (!rest.builderP56){ rest.builder = true; rest.showBuilder = true; rest.builderP56 = true; }
  if (!rest.camP48){ rest.angle = 'low'; rest.camP48 = true; } // P48: the low camera became the default, once for everyone
  G.settings = {quality:'auto', detected:null, showFps:false, builder:false, angle:'low', ...rest, // a new player starts with builder tools off
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
