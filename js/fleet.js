// Your fleet: every ship you build stays yours, moored at Kallisto with its own upgrades, hull and paint.
// Switch ships at the Kallisto shipwright. Your crew comes with you (sailors beyond the seats wait on the pier).
import {SHIPS, CAPTAIN, UPGRADES} from './config.js?v=19e7728';
import {G, ship, used, capOf, LOADS} from './state.js?v=19e7728';

export const owned = () => G.S.owned || (G.S.owned = Array.from({length:G.S.tier + 1}, (_, i) => i));
export const has = t => owned().includes(t);
// Why you can't switch to ship t right now, or '' if you can.
export function cantSwitch(t){ const c = captainOf(t); return t === G.S.tier ? 'You are on it' : c && c.out ? `${c.n} has it out at sea, back in ${clock(c.t)}` : tooMuch(t); }
// a smaller ship may not have room for everything aboard
function tooMuch(t){ const k = LOADS.find(c => used(c) > capOf(c, t)); return k ? `Too much ${k} aboard for it (room for ${capOf(k, t)})` : ''; }
function stow(){ const S = G.S; S.hulls = {...(S.hulls || {}), [S.tier]:S.hull}; S.looks = {...(S.looks || {}), [S.tier]:{...S.look}}; }
function board(t){ const S = G.S, flag = S.look.flag; S.tier = t; S.look = {...((S.looks || {})[t] || {}), flag}; S.hull = (S.hulls || {})[t] ?? ship().hull; }
export function switchTo(t){ if (cantSwitch(t)) return false; stow(); board(t); return true; }
// A newly built ship joins the fleet and you go aboard it.
export function launch(t){ owned(); stow(); G.S.owned = [...new Set([...G.S.owned, t])].sort((a, b) => a - b); board(t); G.S.hull = ship().hull; }

// ---- captains: your other ships earn while you sail ----
export const captainOf = t => (G.S.captains || {})[t] || null;
export const clock = s => `${Math.floor(s/60)}:${String(Math.ceil(s % 60) % 60).padStart(2, '0')}`;
// Gold one trip brings back: bigger holds and more upgrades earn more.
export function tripPay(t){
  const ups = Object.keys(UPGRADES).filter(k => UPGRADES[k].ship).reduce((n, k) => n + (((G.S.ups || {})[t] || {})[k] || 0), 0);
  return Math.round(SHIPS[t].hold*CAPTAIN.perHold*(1 + CAPTAIN.perLevel*ups));
}
// Every captain you hire costs more than the last, so a big fleet is a late-game reward, not a free income.
export const captainCount = () => Object.keys(G.S.captains || {}).length + (G.S.idleCaps || []).length;
export const captainCost = () => Math.round(CAPTAIN.cost*CAPTAIN.grow**captainCount()/10)*10;
// P82 (Nicholas): you choose which ship each captain works. A captain moved off a ship waits at Kallisto until you give her another one.
export function allCaptains(){ const S = G.S; return [...Object.entries(S.captains || {}).map(([t, c]) => ({n:c.n, t:+t})), ...(S.idleCaps || []).map(n => ({n, t:-1}))]; }
export function assignCaptain(n, t){
  const S = G.S, from = Object.keys(S.captains || {}).find(k => S.captains[k].n === n);
  if (t >= 0 && (t === S.tier || !owned().includes(t) || (captainOf(t) && captainOf(t).n !== n))) return false;
  if (from !== undefined){ if (+from === t) return false; const c = {...S.captains}; delete c[from]; S.captains = c; } else S.idleCaps = (S.idleCaps || []).filter(x => x !== n);
  if (t < 0) S.idleCaps = [...(S.idleCaps || []), n]; else S.captains = {...(S.captains || {}), [t]:{n, out:true, t:CAPTAIN.tripSeconds}};
  return true;
}
export function hireCaptain(t){
  const S = G.S, cost = captainCost(); if (t === S.tier || captainOf(t) || S.gold < cost) return false;
  const used = new Set(allCaptains().map(c => c.n)), n = CAPTAIN.names.find(x => !used.has(x)) || 'Captain Nikon';
  S.gold -= cost; S.captains = {...(S.captains || {}), [t]:{n, out:true, t:CAPTAIN.tripSeconds}}; return n;
}
// P65: captains keep working after you close the game, for up to 2 hours. Returns what they brought back meanwhile (it waits in the purse).
export function offlineEarnings(){
  const S = G.S, away = Math.min(CAPTAIN.offline, Date.now()/1000 - (S.lastSeen || Infinity)); if (!S.captains || !(away > 60)) return 0;
  let sum = 0; for (const t of Object.keys(S.captains)) if (+t !== S.tier) sum += Math.floor(away/(CAPTAIN.tripSeconds + CAPTAIN.restSeconds)*tripPay(+t));
  if (sum) S.purse = (S.purse || 0) + sum; return sum;
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
