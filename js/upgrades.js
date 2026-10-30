// The upgrade board: 10 levels each of planking, oars, crew quarters and arrowheads, and a 30-level ram (wood, bronze, gold).
import {UPGRADES, UPGRADE_MAX, SHIP_K, RAM} from './config.js?v=5b5d761';
import {G, lvl, ship, pay} from './state.js?v=5b5d761';
import {SPECS, sailSizes} from './ships.js?v=5b5d761';

export const ramMax = () => UPGRADE_MAX*RAM.mats.length;
// The upgrades this ship can take: crew quarters from the fishing boat on. Sails: 5 levels per sail the ship can carry
// (the rowboat gets one small sail, the fishing boat and bireme two, the trireme three).
export const upKeys = () => Object.keys(UPGRADES).filter(k => !(UPGRADES[k].crew && G.S.tier < 1) && !(k === 'sail' && !SPECS[ship().model].sailMax));
export const maxOf = k => k === 'ram' ? ramMax() : k === 'sail' ? SPECS[ship().model].sailMax : UPGRADE_MAX;
export const sailCount = (l = lvl('sail')) => sailSizes(SPECS[ship().model], l).filter(Boolean).length;
// The ram's material and its level within that material (1-10). Level 0 = no ram.
export function ramMat(l = lvl('ram')){ if (!l) return null; const m = Math.min(RAM.mats.length - 1, Math.floor((l - 1)/UPGRADE_MAX)); return {...RAM.mats[m], i:m, sub:l - m*UPGRADE_MAX}; }
// Damage of a full-speed head-on hit with your ram (0 without one).
export function ramDmg(l = lvl('ram')){ const m = ramMat(l); return m ? Math.round((RAM.base + RAM.per*m.sub)*m.k) : 0; }
export const arrowK = () => 1 + UPGRADES.arrows.each*lvl('arrows');
export const extraSeats = () => Math.floor(lvl('seats')/2);

// The cost of the next level, or null at the top.
export function costOf(k){
  const l = lvl(k), u = UPGRADES[k]; if (l >= maxOf(k)) return null;
  const n = l + 1, sk = u.ship ? SHIP_K[G.S.tier] : 1;
  const step = k === 'ram' ? ramMat(n).sub : n, mk = k === 'ram' ? ramMat(n).cost : 1, c = {};
  for (const m in u.cost) c[m] = Math.round(u.cost[m]*step*sk*mk);
  // the bronze ram is paid in bronze instead of wood (5 wood = 1 bronze); the golden ram in drachmae alone
  const rp = k === 'ram' && ramMat(n).pay; if (rp === 'bronze'){ c.bronze = Math.round(c.wood/5/mk*1.5); delete c.wood; } else if (rp === 'gold'){ c.gold += c.wood; delete c.wood; }
  return c;
}
// What the upgrade does now and after the next level, in plain words.
export function effectText(k, l = lvl(k)){
  const u = UPGRADES[k];
  if (k === 'ram'){ const m = ramMat(l); return m ? `${m.name} ram, level ${m.sub}: ${ramDmg(l)} damage` : 'No ram'; }
  if (k === 'seats') return `+${Math.floor(l/2)} seat${Math.floor(l/2) === 1 ? '' : 's'}`;
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
