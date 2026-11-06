// The upgrade board: 10 levels each of planking, oars, crew quarters and arrowheads, and a 30-level ram (wood, bronze, gold).
import {UPGRADES, UPGRADE_MAX, SHIP_K, RAM, FIRE_ARROWS, SHIPS, ABILITIES, POWER, COMBAT} from './config.js?v=733c6b7';
import {blessing, fighters, catchAvg} from './crew.js?v=733c6b7';
import {G, lvl, ship, pay, rank} from './state.js?v=733c6b7';
import {SPECS, sailSizes, crewLayout} from './ships.js?v=733c6b7';

export const ramMax = () => RAM.lv*RAM.mats.length;
// The upgrades this ship can take: crew quarters from the fishing boat on. Sails: 5 levels per sail the ship can carry
// (the rowboat gets one small sail, the fishing boat and bireme two, the trireme three).
export const upKeys = () => Object.keys(UPGRADES).filter(k => !UPGRADES[k].power && !(k === 'sail' && !SPECS[ship().model].sailMax));
// P65: the powers have their own page in the shipyard
export const powerKeys = () => Object.keys(UPGRADES).filter(k => UPGRADES[k].power && !(UPGRADES[k].minTier && rank() < UPGRADES[k].minTier));
// How good a power is at level l: how often it can be used, how fast it flies, how tight it lands, how far it bends onto a ship.
// Arrow rain starts usable at level 0; chain shot and the catapult are bought first, so their first level is the plain one.
const pl = (k, l) => k === 'shower' ? l : Math.max(0, l - 1);
export const powerCd = (k, l = lvl(k)) => ABILITIES[k === 'shower' ? 'shower' : k].cd*(1 - POWER.cd*pl(k, l))*(blessing().cd || 1);
export const powerFlight = (k, l = lvl(k)) => ABILITIES[k].flight*(1 - POWER.flight*pl(k, l));
export const powerR = (k, l = lvl(k)) => k === 'shower' ? ABILITIES.shower.r*(1 - POWER.spread*l) : ABILITIES[k].r*(1 + POWER.blast*pl(k, l));
export const powerSeek = (k, l = lvl(k)) => POWER.seek0 + POWER.seek*pl(k, l);
export const showerK = (l = lvl('shower')) => 1 + POWER.dmg*l;
export const fireSecs = (l = lvl('fire')) => ABILITIES.fire.secs + .3*Math.max(0, l - 1);
export const maxOf = k => k === 'ram' ? ramMax() : k === 'sail' ? SPECS[ship().model].sailMax : k === 'seats' ? crewLevels() : UPGRADE_MAX;
export const sailCount = (l = lvl('sail')) => sailSizes(SPECS[ship().model], l).filter(Boolean).length;
// The ram's material and its level within that material (1-10). Level 0 = no ram.
export function ramMat(l = lvl('ram')){ if (!l) return null; const m = Math.min(RAM.mats.length - 1, Math.floor((l - 1)/RAM.lv)); return {...RAM.mats[m], i:m, sub:l - m*RAM.lv}; }
// Damage of a full-speed head-on hit with your ram (0 without one).
export function ramDmg(l = lvl('ram')){ const m = ramMat(l); return m ? Math.round((RAM.base + RAM.per*m.sub)*m.k) : 0; }
export const arrowK = (l = lvl('arrows')) => 1 + UPGRADES.arrows.each*l;
// P67: damage of one arrow, the same kind of number as the ram's
const arrowHit = (l = lvl('arrows'), k = 1) => (COMBAT.arrowDmg*(blessing().dmg || 1)*arrowK(l)*k).toFixed(1).replace(/\.0$/, '');
// Crew: each level hires one more hand on small ships, two (a bench) on big ones, up to the ship's most (SHIPS men).
// P62: hiring is a big step: at most 4 hires per ship, each brings a group of men. The first costs 500, each next one 2.5 times more.
export const crewLevels = (t = G.S.tier) => Math.min(4, SHIPS[t].men[1] - SHIPS[t].men[0]);
export const crewPer = (t = G.S.tier) => Math.ceil((SHIPS[t].men[1] - SHIPS[t].men[0])/crewLevels(t));
export const CREW_COST = [500, 1250, 3100, 7800];

// The cost of the next level, or null at the top.
export function costOf(k){
  const l = lvl(k), u = UPGRADES[k]; if (l >= maxOf(k)) return null;
  if (k === 'seats') return {gold:CREW_COST[l] || CREW_COST[3]};
  const n = l + 1, sk = u.ship ? SHIP_K[rank()] : 1;
  const step = k === 'ram' ? ramMat(n).sub*2 : n, mk = k === 'ram' ? ramMat(n).cost : 1, c = {};
  for (const m in u.cost) c[m] = Math.round(u.cost[m]*step*sk*mk);
  if (u.iron && rank() >= 2) c.iron = Math.round(u.iron*n*sk); // warships are held together with iron nails
  // the bronze ram is paid in bronze instead of wood (5 wood = 1 bronze); the golden ram in drachmae alone
  const rp = k === 'ram' && ramMat(n).pay; if (rp === 'bronze'){ c.bronze = Math.round(c.wood/5/mk*1.5); delete c.wood; } else if (rp === 'gold'){ c.gold += c.wood; delete c.wood; }
  return c;
}
// "6 men: 2 archers, 4 rowers" for a crew level
function crewText(l){ const t = G.S.tier, m = Math.min(SHIPS[t].men[1], SHIPS[t].men[0] + l*crewPer(t)), c = crewLayout(SPECS[SHIPS[t].model], m);
  const parts = [c.archers && `${c.archers} archer${c.archers > 1 ? 's' : ''}`, c.rowers && `${c.rowers} rower${c.rowers > 1 ? 's' : ''}`].filter(Boolean);
  const fish = catchAvg(m), ft = fish % 1 ? fish.toFixed(1) : fish; // what they bring in
  return `${m} ${m === 1 ? 'man' : 'men'}${parts.length ? ': ' + parts.join(', ') : ''}. ${ft} fish a catch`; }
// What the upgrade does now and after the next level, in plain words.
export function effectText(k, l = lvl(k)){
  const u = UPGRADES[k];
  if (k === 'ram'){ const m = ramMat(l); return m ? `${m.name} ram, level ${m.sub}: ${ramDmg(l)} damage a hit` : 'No ram'; }
  if (k === 'fire') return l ? `${FIRE_ARROWS.dps(l).toFixed(1)} fire damage a second, for ${fireSecs(l).toFixed(1)} s` : 'No fire arrows';
  if (k === 'catapult') return l ? `${ABILITIES.catapult.dmg(l)} damage` : 'No catapult';
  if (k === 'chain') return l ? `${ABILITIES.chain.secs(l).toFixed(1)} s without a sail` : 'No chain shot';
  if (k === 'arrows') return `${arrowHit(l)} damage an arrow, ${fighters()} archer${fighters() === 1 ? '' : 's'}`;
  if (k === 'hull') return `${Math.round(SHIPS[G.S.tier].hull*(1 + u.each*l))} hull`;
  if (k === 'shower') return `${fighters()*COMBAT.volleyArrows} arrows, ${arrowHit(lvl('arrows'), showerK(l))} damage each`;
  if (k === 'seats') return crewText(l);
  if (k === 'sail'){ const n = sailCount(l); return n ? `${n} sail${n > 1 ? 's' : ''}, +${Math.round(u.each*l*100)}% speed` : 'No sail'; }
  return `+${Math.round(u.each*l*100)}% ${u.unit}`;
}
// Spend warehouse materials and drachmae on the next level. Returns false if you can't afford it.
export function buy(k){
  const c = costOf(k), S = G.S, before = ship().hull; if (!pay(c)) return false;
  if (UPGRADES[k].ship){ S.ups = S.ups || {}; S.ups[S.tier] = {...(S.ups[S.tier] || {}), [k]:lvl(k) + 1}; } else S[k] = lvl(k) + 1;
  if (k === 'hull') S.hull += ship().hull - before; // the new planks come sound
  return true;
}
