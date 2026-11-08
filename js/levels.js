// P70: your level. No points to earn and nothing to grind: it is simply how strong the ship you sail is right now, from its size,
// its upgrades and your powers. Bandit camps and fortresses get a level from the same sum, so "level 8" means the same on both sides.
// The sum: hull you can lose x damage you deal in a second (and the same for all the ships and walls of a target).
import {SHIPS, COMBAT, ABILITIES, FIRE_ARROWS, UPGRADES, FORTS} from './config.js?v=8772133';
import {G} from './state.js?v=8772133';
import {SPECS, crewLayout} from './ships.js?v=8772133';
import {men} from './crew.js?v=8772133';
import {arrowK, showerK, ramDmg, fireSecs, powerCd} from './upgrades.js?v=8772133';

const up = (t, k) => ((G.S.ups || {})[t] || {})[k] || 0, s = k => G.S[k] || 0;
const P0 = 6.5, toLevel = p => Math.max(1, Math.round(1 + 6*Math.log(Math.max(p, P0)/P0)));
export function shipPower(t = G.S.tier){
  const sh = SHIPS[t], hull = sh.hull*(1 + UPGRADES.hull.each*up(t, 'hull')), m = men(t), archers = crewLayout(SPECS[sh.model], m).archers || m;
  const arrow = COMBAT.arrowDmg*arrowK(s('arrows'))*COMBAT.hitChance;
  let dps = archers*arrow/COMBAT.shotEvery + archers*COMBAT.volleyArrows*arrow*showerK(s('shower'))/powerCd('shower', s('shower'));
  dps += ramDmg(s('ram'))/14; // a good ramming run every 14 seconds or so
  if (s('fire') && sh.rank >= 2) dps += FIRE_ARROWS.dps(s('fire'))*fireSecs(s('fire'))/ABILITIES.fire.cd;
  if (s('catapult') && sh.rank >= 2) dps += ABILITIES.catapult.dmg(s('catapult'))/powerCd('catapult', s('catapult'));
  return Math.sqrt(hull*Math.max(.1, dps));
}
export const shipLevel = t => toLevel(shipPower(t));
export const myLevel = () => shipLevel(G.S.tier);
// What a camp or fortress adds up to: its walls and its guards are fought one after the other, so the walls count less than the sum of arrows suggests.
export function sitePower(f){
  const shooter = e => (e.spec.fighters || 0)*(e.spec.dmg || 0)/COMBAT.enemyShotEvery*COMBAT.hitChance;
  let hull = f.spec.hull, dps = shooter(f); if (f.fort && !f.camp) dps += FORTS.stoneDmg/FORTS.stoneEvery*.35; // the catapult's stones often miss a moving ship
  for (const g of f.guards){ hull += g.spec.hull; dps += shooter(g); }
  return Math.sqrt(hull*dps*(f.named ? NAMED_K : SITE_K));
}
const NAMED_K = .6; // a lone ship: nothing to pick apart
const SITE_K = .145; // you don't face all of it at once: guards come in ones and twos, and you pick your moment
export const siteLevel = f => toLevel(sitePower(f));
// How a target compares with you: 'ready', 'hard' (up to 2 levels above you) or 'strong'.
export const standing = need => { const d = need - myLevel(); return d <= 0 ? 'ready' : d <= 2 ? 'hard' : 'strong'; };
export const LEVEL_WORD = {ready:'You are ready', hard:'A hard fight', strong:'Too strong for you'};
export const LEVEL_COLOR = {ready:'#3f9a4b', hard:'#d48a2a', strong:'#c4473b'};
