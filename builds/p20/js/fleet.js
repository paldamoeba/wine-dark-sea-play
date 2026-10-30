// Your fleet: every ship you build stays yours, moored at Kallisto with its own upgrades, hull and paint.
// Switch ships at the Kallisto shipwright. Your crew comes with you (sailors beyond the seats wait on the pier).
import {SHIPS} from './config.js';
import {G, ship, holdUsed} from './state.js';

export const owned = () => G.S.owned || (G.S.owned = Array.from({length:G.S.tier + 1}, (_, i) => i));
export const has = t => owned().includes(t);
// Why you can't switch to ship t right now, or '' if you can.
export function cantSwitch(t){ return t === G.S.tier ? 'You are on it' : holdUsed() > SHIPS[t].hold ? `Too much in the hold for its ${SHIPS[t].hold} spaces` : ''; }
function stow(){ const S = G.S; S.hulls = {...(S.hulls || {}), [S.tier]:S.hull}; S.looks = {...(S.looks || {}), [S.tier]:{...S.look}}; }
function board(t){ const S = G.S, flag = S.look.flag; S.tier = t; S.look = {...((S.looks || {})[t] || {}), flag}; S.hull = (S.hulls || {})[t] ?? ship().hull; }
export function switchTo(t){ if (cantSwitch(t)) return false; stow(); board(t); return true; }
// A newly built ship joins the fleet and you go aboard it.
export function launch(t){ owned(); stow(); G.S.owned = [...new Set([...G.S.owned, t])].sort(); board(t); G.S.hull = ship().hull; }
