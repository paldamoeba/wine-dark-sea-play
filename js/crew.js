// Your crew. Each ship has its own crew (P49): it comes with a few men (SHIPS men[0]) and the Crew upgrade at the shipyard
// fills its benches up to men[1]. You see every one of them aboard: rowers on the oars, archers, a helmsman.
// Once you own a second ship you can also name your crew and fly a god's flag (each god gives a blessing).
import {GOD_BLESSINGS, SHIPS, OMENS} from './config.js?v=2c85ea6';
import {G} from './state.js?v=2c85ea6';
import {SPECS, crewLayout} from './ships.js?v=2c85ea6';
import {crewPer} from './upgrades.js?v=2c85ea6';

export const founded = () => !!G.S.crewName;
// The current god's blessing, or {} before the crew is founded or with no flag.
const NO_GOD = {}; let blessKey = '', blessV = NO_GOD;
// P78: a blessing found at sea (omens.js) adds to the one on your flag
export const blessing = () => { const f = (founded() && GOD_BLESSINGS[G.S.look.flag]) || NO_GOD, o = G.S.omen && OMENS[G.S.omen.g]; if (!o) return f; const key = G.S.omen.g + (G.S.look.flag || ''); if (key !== blessKey){ blessKey = key; blessV = {...f}; for (const k of ['dmg', 'ram', 'cd', 'volley', 'green', 'price']) if (o[k]) blessV[k] = (f[k] || 1)*o[k]; } return blessV; };
// How many men ship t carries (its Crew upgrade level is kept with the ship as "seats").
export function men(t = G.S.tier){ const [m0, m1] = SHIPS[t].men, l = (((G.S.ups || {})[t] || {}).seats) || 0; return Math.min(m1, m0 + l*crewPer(t)); }
export const layout = (t = G.S.tier) => crewLayout(SPECS[SHIPS[t].model], men(t));
// Who shoots in a fight: on warships the archers; on small boats everyone aboard has a bow.
export const fighters = () => layout().archers || men();
// Rowers make an oared ship fast: with only a few benches manned it crawls (60% speed), with all of them full it flies.
// On small boats each extra hand helps a little (5%).
// P56: ships with a sail cruise under sail (85% speed) and the oars rest; the Row! power (player.js) is a burst of rowing.
// Boats without a sail row all the time (each extra hand helps 5%).
export const hasSail = () => !!(SPECS[SHIPS[G.S.tier].model].mast || ((G.S.ups || {})[G.S.tier] || {}).sail);
export function rowBoost(){ return hasSail() ? .85 : 1 + .05*(men() - 1); }
// how strong a Row! burst is: 1.45x with a few rowers, up to 1.9x with every bench filled
export function rowBurst(){ const s = SPECS[SHIPS[G.S.tier].model], c = layout(); const full = s.oarRows && s.oarCount > 1 ? c.rowers/(2*s.oarCount) : Math.min(1, (men() - 1)/3); return 1.45 + .45*full; }
// P67: when you stop to fish, everyone aboard helps: more hands bring in more fish at each catch.
// 1 man 1 fish, 4 men 2 fish, 13 or more 5 fish. A fraction is a chance of one more (2 men: 1 fish, sometimes 2).
export const catchAvg = (m = men()) => Math.min(5, 1 + (m - 1)/3);
export function catchRoll(){ const a = catchAvg(), n = Math.floor(a); return n + (Math.random() < a - n ? 1 : 0); }
