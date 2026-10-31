// Your fleet: every ship you build stays yours, moored at Kallisto with its own upgrades, hull and paint.
// Switch ships at the Kallisto shipwright. Your crew comes with you (sailors beyond the seats wait on the pier).
import {SHIPS, CAPTAIN, UPGRADES} from './config.js?v=7eda492';
import {G, ship, holdUsed} from './state.js?v=7eda492';

export const owned = () => G.S.owned || (G.S.owned = Array.from({length:G.S.tier + 1}, (_, i) => i));
export const has = t => owned().includes(t);
// Why you can't switch to ship t right now, or '' if you can.
export function cantSwitch(t){ const c = captainOf(t); return t === G.S.tier ? 'You are on it' : c && c.out ? `${c.n} has it out at sea, back in ${clock(c.t)}` : holdUsed() > SHIPS[t].hold ? `Too much in the hold for its ${SHIPS[t].hold} spaces` : ''; }
function stow(){ const S = G.S; S.hulls = {...(S.hulls || {}), [S.tier]:S.hull}; S.looks = {...(S.looks || {}), [S.tier]:{...S.look}}; }
function board(t){ const S = G.S, flag = S.look.flag; S.tier = t; S.look = {...((S.looks || {})[t] || {}), flag}; S.hull = (S.hulls || {})[t] ?? ship().hull; }
export function switchTo(t){ if (cantSwitch(t)) return false; stow(); board(t); return true; }
// A newly built ship joins the fleet and you go aboard it.
export function launch(t){ owned(); stow(); G.S.owned = [...new Set([...G.S.owned, t])].sort(); board(t); G.S.hull = ship().hull; }

// ---- captains: your other ships earn while you sail ----
export const captainOf = t => (G.S.captains || {})[t] || null;
export const clock = s => `${Math.floor(s/60)}:${String(Math.ceil(s % 60) % 60).padStart(2, '0')}`;
// Gold one trip brings back: bigger holds and more upgrades earn more.
export function tripPay(t){
  const ups = Object.keys(UPGRADES).filter(k => UPGRADES[k].ship).reduce((n, k) => n + (((G.S.ups || {})[t] || {})[k] || 0), 0);
  return Math.round(SHIPS[t].hold*CAPTAIN.perHold*(1 + CAPTAIN.perLevel*ups));
}
// Every captain you hire costs more than the last, so a big fleet is a late-game reward, not a free income.
export const captainCost = () => Math.round(CAPTAIN.cost*CAPTAIN.grow**Object.keys(G.S.captains || {}).length/10)*10;
export function hireCaptain(t){
  const S = G.S, cost = captainCost(); if (t === S.tier || captainOf(t) || S.gold < cost) return false;
  const used = new Set(Object.values(S.captains || {}).map(c => c.n)), n = CAPTAIN.names.find(x => !used.has(x)) || 'Captain Nikon';
  S.gold -= cost; S.captains = {...(S.captains || {}), [t]:{n, out:true, t:CAPTAIN.tripSeconds}}; return n;
}
// Called every frame. A ship you are sailing yourself waits for you; its captain rests.
export function updateFleet(dt){
  const S = G.S; if (!S.captains) return;
  for (const [t, c] of Object.entries(S.captains)){
    if (+t === S.tier){ c.out = false; c.t = CAPTAIN.restSeconds; continue; }
    c.t -= dt; if (c.t > 0) continue;
    if (c.out){ S.purse = (S.purse || 0) + tripPay(+t); c.out = false; c.t = CAPTAIN.restSeconds; document.dispatchEvent(new Event('fleetmoved')); }
    else { c.out = true; c.t = CAPTAIN.tripSeconds; document.dispatchEvent(new Event('fleetmoved')); }
  }
}
// Ships moored at Kallisto right now (not the one you sail, not out on a trip).
export const moored = () => owned().filter(t => t !== G.S.tier && !(captainOf(t) && captainOf(t).out));
