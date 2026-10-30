// The upgrade board: 10 levels each of planking, oars, crew quarters and arrowheads, and a 30-level ram (wood, bronze, gold).
import {UPGRADES, UPGRADE_MAX, SHIP_K, RAM} from './config.js?v=8eb3922';
import {G, lvl, ship} from './state.js?v=8eb3922';
import {SPECS} from './ships.js?v=8eb3922';

export const ramMax = () => UPGRADE_MAX*RAM.mats.length;
// The upgrades this ship can take: crew quarters from the fishing boat on, a sail only on ships with a mast.
export const upKeys = () => Object.keys(UPGRADES).filter(k => !(UPGRADES[k].crew && G.S.tier < 1) && !(UPGRADES[k].mast && !SPECS[ship().model].mast));
export const maxOf = k => k === 'ram' ? ramMax() : UPGRADE_MAX;
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
  const step = k === 'ram' ? ramMat(n).sub : n, mk = k === 'ram' ? ramMat(n).cost : 1;
  return {wood:Math.round(u.cost.wood*step*sk*mk), gold:Math.round(u.cost.gold*step*sk*mk)};
}
// What the upgrade does now and after the next level, in plain words.
export function effectText(k, l = lvl(k)){
  const u = UPGRADES[k];
  if (k === 'ram'){ const m = ramMat(l); return m ? `${m.name} ram, level ${m.sub}: ${ramDmg(l)} damage` : 'No ram'; }
  if (k === 'seats') return `+${Math.floor(l/2)} seat${Math.floor(l/2) === 1 ? '' : 's'}`;
  return `+${Math.round(u.each*l*100)}% ${u.unit}`;
}
// Spend warehouse wood and drachmae on the next level. Returns false if you can't afford it.
export function buy(k){
  const c = costOf(k), S = G.S; if (!c || S.ware < c.wood || S.gold < c.gold) return false;
  const before = ship().hull;
  S.ware -= c.wood; S.gold -= c.gold;
  if (UPGRADES[k].ship){ S.ups = S.ups || {}; S.ups[S.tier] = {...(S.ups[S.tier] || {}), [k]:lvl(k) + 1}; } else S[k] = lvl(k) + 1;
  if (k === 'hull') S.hull += ship().hull - before; // the new planks come sound
  return true;
}
