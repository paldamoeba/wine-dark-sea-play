// Everything that changes while playing, plus saving and loading.
import {SHIPS, TUNING, SAVE_VERSION, SAVE_KEY, OLD_SAVE_KEYS, SETTINGS_KEY, UPGRADES, FISH, GOODS, WAREHOUSE, REVEAL} from './config.js?v=7839b26';
import {START, HOME, MAP, ISLANDS, SPOTS, WRECKS, EXP_N, EXP_CELL} from './world.js?v=7839b26';
import {sfx} from './audio.js?v=7839b26';

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
  // P65: the chart's grid became twice as fine. An old save's chart (64 x 64) is doubled up to fit.
  const old = EXP_N === 128 && str.length <= 1024;
  for (let k=0;k<str.length;k++){ const n = parseInt(str[k], 16) || 0; for (let b=0;b<4;b++){ const v = (n>>b) & 1, i = k*4 + b;
    if (!old){ if (i < G.explored.length) G.explored[i] = v; continue; }
    if (!v) continue; const r = Math.floor(i/64), c = i % 64; for (const dr of [0, 1]) for (const dc of [0, 1]) G.explored[(r*2 + dr)*EXP_N + c*2 + dc] = 1; } }
  G.exploredRev++; return true;
}
export function revealAll(){ G.explored.fill(1); G.exploredRev++; }
function startingChart(){ G.explored.fill(0); reveal(HOME.x, HOME.y, REVEAL.start); }

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
// P70: the name you gave a ship (its kind until it has one)
export const shipName = (t = G.S.tier) => (G.S.names || {})[t] || SHIPS[t].name;
// Something picked up: a little icon and "+n" springs up from the boat, then drops back into it (drawn by overlay.js).
// kind = 'fish' | 'tuna' | 'swordfish' | 'wood' | 'coin' | a trade good.
export function gain(kind, n = 1, x, y){ sfx(kind === 'coin' || kind === 'bronze' || kind === 'iron' ? 'coin' : kind === 'sardine' ? 'fish' : kind === 'tuna' || kind === 'swordfish' ? '' : 'wood'); const slot = (G.pops || []).filter(p => p.ic && G.t - p.t < .6).length; G.pops = [...(G.pops || []), {t:G.t + slot*.15, slot, ic:kind, txt:`+${n}`, x, y}]; }
// Building materials in the warehouse: wood (S.ware), bronze, iron and linen. A cost is {wood, bronze, iron, linen, gold}.
const HAVE = {wood:'ware', bronze:'bronze', iron:'iron', linen:'linen', gold:'gold'};
export const have = k => G.S[HAVE[k]] || 0;
export const canPay = c => !!c && Object.keys(HAVE).every(k => have(k) >= (c[k] || 0));
export function pay(c){ if (!canPay(c)) return false; for (const k in HAVE) G.S[HAVE[k]] = have(k) - (c[k] || 0); return true; }
// The warehouse's room for wood, bronze, iron and linen (gold has no limit)
export const wareCap = k => k === 'gold' ? Infinity : (WAREHOUSE[G.S.wareLv || 0] || WAREHOUSE[0]).cap[k];
export const wareRoom = k => Math.max(0, wareCap(k) - have(k));
export function addMat(k, n){ G.S[HAVE[k]] = Math.min(have(k) + n, Math.max(have(k), wareCap(k))); }
// What the ship carries. Each kind has its own limit: fish (the hold), wood, bronze and trade goods (SHIPS[t].cap).
export const LOADS = ['fish', 'wood', 'bronze', 'iron', 'linen', 'goods'];
export const loadOf = k => FISH[k] ? 'fish' : GOODS[k] ? 'goods' : k;
export function used(cat, cargo = G.S.cargo){ const keys = cat === 'fish' ? Object.keys(FISH) : cat === 'goods' ? Object.keys(GOODS) : [cat]; return keys.reduce((a, k) => a + (cargo[k] || 0), 0); }
// P93 (Nicholas: a full load of wood from a camp paid for just one upgrade, so explorers kept sailing home): every ship carries
// 75% more wood, bronze, iron, linen and goods than the numbers in config SHIPS (the fish hold is unchanged)
export const CARRY = 1.75;
export const capOf = (cat, t = G.S.tier) => cat === 'fish' ? SHIPS[t].hold : Math.round(SHIPS[t].cap[cat]*CARRY/2)*2;
export const room = cat => Math.max(0, capOf(cat) - used(cat));
export const holdUsed = () => used('fish');
// Put n of something aboard, as much as fits. Returns how many went aboard.
export function putAboard(k, n = 1){ const m = Math.min(n, room(loadOf(k))); G.S.cargo[k] = (G.S.cargo[k] || 0) + m; return m; }
// At any harbor the wood and bronze aboard go to the warehouse (it's shipped home to Kallisto).
export function unload(){ const S = G.S, m = k => { const n = Math.min(S.cargo[k] || 0, wareRoom(k)); S.cargo[k] = (S.cargo[k] || 0) - n; addMat(k, n); return n; }; // what doesn't fit stays aboard
  return [m('wood'), m('bronze'), m('linen'), m('iron')]; }
// P65: fun numbers for the voyage log in Settings
// P73: what belongs to the ship goes on her own record too (records.js)
const SHIP_STATS = new Set(['sunk', 'pirates', 'navy', 'merchants', 'forts', 'camps', 'sunkMe', 'fish', 'wood', 'iron', 'treasure', 'bottles', 'whales', 'kraken', 'dist', 'earned', 'time', 'omens']);
const shipRecord = () => { const r = G.S.shipStats || (G.S.shipStats = {}); return r[G.S.tier] || (r[G.S.tier] = {}); };
export function stat(k, n = 1){ const s = G.S.stats || (G.S.stats = {}); s[k] = (s[k] || 0) + n; if (SHIP_STATS.has(k)){ const r = shipRecord(); r[k] = (r[k] || 0) + n; } }
export function shipTime(dt){ const r = shipRecord(); r.time = (r.time || 0) + dt; }
export function shipDeed(name){ const r = shipRecord(); r.deeds = [...new Set([...(r.deeds || []), name])]; }

export function newSave(){
  return {version:SAVE_VERSION, econ:2, tier:0, gold:0, ware:0, bronze:0, iron:0, linen:0, cargo:{sardine:0, tuna:0, swordfish:0, wood:0, bronze:0, iron:0, linen:0, wine:0, oil:0, pottery:0, obsidian:0, dye:0},
    x:START.x, y:START.y, a:START.a, map:MAP.key, hull:SHIPS[0].hull, hint:true, playSeconds:0, world:null, explored:null, look:{}, p49:true, ram15:true, p65:true, plans:[0], camps:[], stats:{}, shipStats:{}, colors:{paint:[], sail:[]}};
}

function read(key){ try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null; } }
// P78: a voyage is the one thing a player must never lose. Each slot also keeps a copy from a few minutes ago; if the main save can't be read, the copy is used.
const BAK = '-backup'; let lastBak = 0;
const readSave = key => { const main = migrate(read(key)); return main || migrate(read(key + BAK)); };
// ---- save slots (P65): three voyages side by side. Slot 1 keeps the old save's name, so nobody loses their game. ----
export const SLOTS = [1, 2, 3];
const ACTIVE_KEY = SAVE_KEY + '-active';
const slotKey = n => n === 1 ? SAVE_KEY : `${SAVE_KEY}-slot${n}`;
export function activeSlot(){ try { const n = +localStorage.getItem(ACTIVE_KEY); return SLOTS.includes(n) ? n : 1; } catch(e){ return 1; } }
export function setActiveSlot(n){ try { localStorage.setItem(ACTIVE_KEY, String(n)); } catch(e){} }
// what's in a slot, for the main menu (null if it's empty)
export function readSlot(n){ if (n === 1) for (const k of [SAVE_KEY, ...OLD_SAVE_KEYS]){ const o = readSave(k); if (o) return o; } return n === 1 ? null : readSave(slotKey(n)); }
export function wipeSlot(n){ try { localStorage.removeItem(slotKey(n)); localStorage.removeItem(slotKey(n) + BAK); if (n === 1) OLD_SAVE_KEYS.forEach(k => localStorage.removeItem(k)); } catch(e){} }
function write(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch(e){ return false; } }

// Bring an older save up to the current shape.
function migrate(o){
  if (!o || typeof o !== 'object' || !o.cargo) return null;
  for (const k of ['x', 'y', 'a', 'hull', 'gold']) if (k in o && !Number.isFinite(o[k])) delete o[k]; // anything broken falls back to a fresh value
  if (!o.version) o.version = 2;               // prototype 2 saves had no version
  if (o.version < 3){ o.playSeconds = 0; o.world = null; o.version = 3; }
  // P73: ships keep their own records. A voyage with just one ship so far: all its numbers are hers. With more, nobody knows which ship did what, so they start clean.
  if (!o.shipStats){ const own = o.owned || Array.from({length:(o.tier || 0) + 1}, (_, i) => i), s = o.stats || {}; o.shipStats = {};
    if (own.length === 1){ const {days, quests, colors, repairs, ...mine} = s; o.shipStats[own[0]] = {...mine, time:o.playSeconds || 0}; } else o.oldLog = true; }
  const base = newSave();
  if (o.crew) o.crew.forEach(c => { if (c.job === 'fisher') c.job = 'rower'; }); // fishers became rowers: everyone fishes now
  // prototype 39: wood counts 5 times bigger and lives in the warehouse, never the hold
  if (!o.econ){ o.ware = ((o.ware || 0) + ((o.cargo && o.cargo.wood) || 0))*5; o.cargo.wood = 0; o.econ = 2; }
  // prototype 49: two bandit camp goals were added (before the fishing boat and before the bireme), ships need blueprints,
  // and the hired sailors became each ship's own crew (old crew quarters levels count as Crew levels; hires are refunded)
  // P65: hull and sail colors are found now; whatever this save already used stays unlocked
  if (!o.p65){ o.p65 = true; const looks = [o.look || {}, ...Object.values(o.looks || {})]; o.colors = {paint:[...new Set(looks.map(l => l.paint).filter(Boolean))], sail:[...new Set(looks.map(l => l.sail).filter(Boolean))]}; }
  if (!o.ram15){ o.ram15 = true; o.ram = Math.ceil((o.ram || 0)/2); } // P64: the ram went from 30 levels to 15
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
  G.slot = activeSlot();
  const s = readSlot(G.slot);
  G.fresh = !s; // nothing saved here yet: a brand new voyage
  G.S = s || newSave();
  // A different map (or map scale) than last time: keep drachmae and ship, start again at the Kallisto pier.
  // P92: only the scale changed (same map): the chart you uncovered stays, since it is drawn over the whole map
  if (G.S.map !== MAP.key){ const sameMap = String(G.S.map || '').split(':')[0] === MAP.id;
    Object.assign(G.S, {map:MAP.key, x:START.x, y:START.y, a:START.a, world:null}, sameMap ? {} : {explored:null}); }
  applyWorld(G.S.world);
  if (!G.S.explored || !decodeExplored(G.S.explored)) startingChart();
  reveal(G.S.x, G.S.y, REVEAL.sail);
  G.cam = {x:G.S.x, y:G.S.y};
}

export function save(){
  if (!G.S || G.noSave) return; // (nothing is saved while the main menu is up: an empty slot stays empty until you start it)
  G.S.lastSeen = Math.floor(Date.now()/1000);
  G.S.world = {
    trees: ISLANDS.map(i => i.stock),
    spots: SPOTS.map(s => s.stock),
    wrecks: WRECKS.map(w => [w.stock, Math.round(w.regen)]),
    owners: ISLANDS.map(i => i.city || null),
  };
  G.S.explored = encodeExplored();
  // never save broken numbers: they would stop the game every time it loads
  for (const k of ['x', 'y', 'a', 'hull', 'gold']) if (!Number.isFinite(G.S[k])) G.S[k] = k === 'x' ? START.x : k === 'y' ? START.y : k === 'a' ? START.a : k === 'hull' ? 1 : 0;
  const key = slotKey(G.slot || 1), now = Date.now();
  if (now - lastBak > 180000){ lastBak = now; try { const cur = localStorage.getItem(key); if (cur && read(key)) localStorage.setItem(key + BAK, cur); } catch(e){} }
  if (!write(key, G.S)){ try { localStorage.removeItem(key + BAK); } catch(e){} if (!write(key, G.S)) G.saveFailed = true; else G.saveFailed = false; } else G.saveFailed = false;
}

export function resetSave(){
  G.S = newSave(); G.S.hint = false;
  resetWorld();
  startingChart();
  G.v = 0; G.dest = null; G.act = null; G.cam = {x:G.S.x, y:G.S.y};
  save();
}

export const APP = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); // the phone app
export const RELEASE = !!window.__RELEASE; // the store build: no builder tools at all
// P87 (Nicholas: the app goes to friends, no builder tools there): every app and the public play link are the normal game.
// Only Nicholas's Live app (it loads the play link and adds WDS-Live to its browser name, see tools/build-app.sh live) keeps the Builder tab.
export const LIVE = /WDS-Live/.test(navigator.userAgent);
export const PUBLIC = !LIVE && (APP || RELEASE || /github\.io$/.test(location.hostname));
export function loadSettings(){
  const saved = read(SETTINGS_KEY) || {};
  const {dev, ...rest} = saved;
  // P56: the public play link (GitHub) is always the normal game; the claude.ai page starts with the builder tools on
  // (you can still switch them off there, and it remembers)
  if (!rest.q67){ rest.q67 = true; rest.detected = null; } // P67: new sharper graphics: check once more how smooth they run
  if (PUBLIC){ rest.builder = false; rest.showBuilder = false; rest.daynight = 'cycle'; } else if (!rest.builderP56){ rest.builder = true; rest.showBuilder = true; rest.builderP56 = true; }
  if (!rest.camP48){ rest.angle = 'low'; rest.camP48 = true; } // P48: the low camera became the default, once for everyone
  G.settings = {quality:'auto', detected:null, showFps:false, builder:false, angle:'low', ...rest, // a new player starts with builder tools off
    // Builder tools: only for making the game, removed before release.
    tools: {zoom:1, speed:1, teleport:false, markers:true, crew:true, raiders:true, fleet:false, map:'D', spread:1.5, isle:1.6, ...(dev || {})}};
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
