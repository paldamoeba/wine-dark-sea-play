// Your crew: founded once you own a second ship. You name it, pick a god's flag (each god gives a blessing), and hire sailors with jobs.
import {CREW, GOD_BLESSINGS, SHIPS} from './config.js';
import {G} from './state.js';

export const founded = () => !!G.S.crewName;
// The current god's blessing, or {} before the crew is founded or with no flag.
export const blessing = () => (founded() && GOD_BLESSINGS[G.S.look.flag]) || {};
export const hired = job => (G.S.crew || []).filter(c => c.job === job).length;
export const seats = () => CREW.seats[G.S.tier] || 0;
// Crew members who shoot in a fight: the ship's own fighters plus hired archers.
export const fighters = () => SHIPS[G.S.tier].fighters + hired('archer');
// Speed and work bonuses from rowers and fishers.
export const rowBoost = () => 1 + CREW.jobs.rower.boost*hired('rower');
export const fishBoost = () => 1 + CREW.jobs.fisher.boost*hired('fisher');

// Three sailors waiting on the Kallisto pier; a new set after each hire.
export function candidates(){
  const S = G.S, taken = new Set((S.crew || []).map(c => c.n)), out = [], jobs = Object.keys(CREW.jobs);
  let k = S.hireSeed || 1;
  while (out.length < 3 && k < (S.hireSeed || 1) + 60){
    const n = CREW.names[(k*7) % CREW.names.length];
    if (!taken.has(n) && !out.some(c => c.n === n)) out.push({n, job:jobs[(out.length + (S.hireSeed || 1)) % jobs.length]}); // one of each job on offer
    k++;
  }
  return out;
}
