// Your crew. Each ship has its own crew (P49): it comes with a few men (SHIPS men[0]) and the Crew upgrade at the shipyard
// fills its benches up to men[1]. You see every one of them aboard: rowers on the oars, archers, a helmsman.
// Once you own a second ship you can also name your crew and fly a god's flag (each god gives a blessing).
import {GOD_BLESSINGS, SHIPS} from './config.js?v=5a6bfb2';
import {G} from './state.js?v=5a6bfb2';
import {SPECS, crewLayout} from './ships.js?v=5a6bfb2';
import {crewPer} from './upgrades.js?v=5a6bfb2';

export const founded = () => !!G.S.crewName;
// The current god's blessing, or {} before the crew is founded or with no flag.
export const blessing = () => (founded() && GOD_BLESSINGS[G.S.look.flag]) || {};
// How many men ship t carries (its Crew upgrade level is kept with the ship as "seats").
export function men(t = G.S.tier){ const [m0, m1] = SHIPS[t].men, l = (((G.S.ups || {})[t] || {}).seats) || 0; return Math.min(m1, m0 + l*crewPer(t)); }
export const layout = (t = G.S.tier) => crewLayout(SPECS[SHIPS[t].model], men(t));
// Who shoots in a fight: on warships the archers; on small boats everyone aboard has a bow.
export const fighters = () => layout().archers || men();
// Rowers make an oared ship fast: with only a few benches manned it crawls (60% speed), with all of them full it flies.
// On small boats each extra hand helps a little (5%).
export function rowBoost(){ const s = SPECS[SHIPS[G.S.tier].model], c = layout();
  return s.oarRows && s.oarCount > 1 ? .6 + .4*c.rowers/(2*s.oarCount) : 1 + .05*(men() - 1); }
// When you stop to fish, everyone aboard helps: each hand beyond the first makes catches 10% quicker.
export const fishBoost = () => 1 + .1*(men() - 1);
