// P65: hull and sail colors are found, not given. Each ship you sink can carry one (rarer colors, lower odds), and some can be
// unlocked with a video instead. A ship's own colors are always yours once you own that ship.
import {COLORS, FREE_COLORS, SHIPS} from './config.js?v=5b0520c';
import {G, save, stat} from './state.js?v=5b0520c';
import {SPECS, PAINTS, SAILS} from './ships.js?v=5b0520c';

const held = kind => (G.S.colors || {})[kind] || [];
export function colorHeld(kind, v){
  if (FREE_COLORS[kind].includes(v) || held(kind).includes(v)) return true;
  return (G.S.owned || [G.S.tier]).some(t => SPECS[SHIPS[t].model].look[kind] === v);
}
export const colorInfo = (kind, v) => COLORS[kind][v] || {};
export const colorName = (kind, v) => (kind === 'paint' ? PAINTS : SAILS)[v].name;
export function unlockColor(kind, v){
  const c = G.S.colors || (G.S.colors = {paint:[], sail:[]}); if (colorHeld(kind, v)) return false;
  c[kind] = [...(c[kind] || []), v]; stat('colors'); save(); return true;
}
// A sunk ship: try each color you don't have yet, rarest first, and give at most one.
export function rollColor(){
  const all = [];
  for (const kind in COLORS) for (const v in COLORS[kind]) if (!colorHeld(kind, v)) all.push({kind, v, drop:COLORS[kind][v].drop});
  all.sort((a, b) => a.drop - b.drop);
  for (const c of all) if (Math.random() < c.drop) return {kind:c.kind, v:c.v};
  return null;
}
