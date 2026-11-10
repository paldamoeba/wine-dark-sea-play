// P77: trophies. Each one lives in the save, and in the Google Play app it also unlocks the matching Play Games achievement (set PLAY_IDS once they exist in Play Console).
// P81: twenty of them. Most are worked out from the voyage's numbers (S.stats) and checked every couple of seconds by trophyTick;
// the arena and the pirate king award theirs when they happen. store/achievements.md lists them for Play Console, with their icons.
import {G, save, shipDeed} from './state.js?v=910e0aa';
import {SHIPS, NAMED} from './config.js?v=910e0aa';
const st = k => (G.S.stats || {})[k] || 0;
const owns = model => (G.S.owned || [G.S.tier]).some(t => SHIPS[t] && SHIPS[t].model === model);
const beaten = name => Object.values(G.S.shipStats || {}).some(r => (r.deeds || []).includes(name));
// c = the cup's two colours; test() = earned (left out for the ones the game awards itself)
export const TROPHIES = {
  first:   {name:'First prize',          how:'Sink your first ship',              c:['#e9c58f', '#9a6a36'], test:() => st('sunk') >= 1},
  wall:    {name:'Wall breaker',         how:'Take a fortress',                    c:['#d9cdb4', '#7f7564'], test:() => st('forts') >= 1},
  camps:   {name:'Camp burner',          how:'Burn 5 bandit camps',                c:['#ffb066', '#b4461f'], test:() => st('camps') >= 5},
  bireme:  {name:'Shipwright',           how:'Build a bireme',                     c:['#b9e0f2', '#3f7fa8'], test:() => owns('bireme')},
  fish:    {name:'Full nets',            how:'Catch 500 fish',                     c:['#a8e3e0', '#2e8a85'], test:() => st('fish') >= 500},
  whale:   {name:'Friend of the whales', how:'Earn a whale blessing',              c:['#c7d8ff', '#4b63b0'], test:() => st('whales') >= 1},
  treasure:{name:'Treasure hunter',      how:'Dig up 10 treasures',                c:['#ffe9a3', '#b98a1c'], test:() => st('treasure') >= 10},
  gods:    {name:'Touched by the gods',  how:'Sail through 5 gods\' fires',        c:['#ffd0e6', '#b0477c'], test:() => st('omens') >= 5},
  pirates: {name:'Pirate hunter',        how:'Sink 50 pirates',                    c:['#f3a59a', '#9b2f24'], test:() => st('pirates') >= 50},
  trireme: {name:'Lord of the oars',     how:'Build a trireme',                    c:['#9fd1ff', '#24569a'], test:() => owns('trireme')},
  cities:  {name:'Taker of cities',      how:'Take 10 fortresses',                 c:['#e8dcc0', '#5f5440'], test:() => st('forts') >= 10},
  far:     {name:'Far sailor',           how:'Sail 20,000 stadia',                 c:['#c4f0c0', '#3d8a3a'], test:() => st('dist') >= 20000},
  rich:    {name:'Rich as Croesus',      how:'Earn 25,000 drachmae',               c:['#fff0a0', '#c79a12'], test:() => st('earned') >= 25000},
  bounty:  {name:'Bounty hunter',        how:'Beat all seven named pirates',       c:['#d6c2a8', '#4e3a26'], test:() => NAMED.every(p => beaten(p.name))},
  terror:  {name:'Terror of the Aegean', how:'Sink 250 ships',                     c:['#cfa0a0', '#5a1d1d'], test:() => st('sunk') >= 250},
  bronze:  {name:'Bronze of Rhodes',     how:'Win the Bronze games in the arena',  c:['#e2a36a', '#9a5b28']},
  silver:  {name:'Silver of Rhodes',     how:'Win the Silver games in the arena',  c:['#f1f4f6', '#8f9aa3']},
  gold:    {name:'Champion of Rhodes',   how:'Win the Gold games in the arena',    c:['#ffe28a', '#c48a22']},
  glory:   {name:'Glory of Rhodes',      how:'Win the first Glory games',          c:['#fff6d8', '#e0a020']},
  king:    {name:'Bane of the pirate king', how:'Defeat Polycrates',               c:['#d7b0ff', '#6a3a8e']},
};
const PLAY_IDS = {}; // filled in from Play Console: {gold:'CgkI...'}
export const has = k => (G.S.trophies || []).includes(k);
export const trophyCount = () => Object.keys(TROPHIES).filter(has).length;
function unlockPlay(k){ try { const P = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.CapacitorGameConnect; if (P && PLAY_IDS[k]) P.unlockAchievement({achievementID:PLAY_IDS[k]}); } catch (e) {} }
export function award(k){ if (has(k)) return false; G.S.trophies = [...(G.S.trophies || []), k]; if (TROPHIES[k]) shipDeed(TROPHIES[k].name); save(); unlockPlay(k); return true; }
// every 2 seconds: award what the numbers say is earned. The first check after loading a voyage is quiet (old saves catch up without a burst of messages).
let tick = 0, quiet = null;
export function trophyTick(dt, say){
  if ((tick -= dt) > 0 || !G.S) return; tick = 2;
  const first = quiet !== G.S; quiet = G.S;
  for (const [k, t] of Object.entries(TROPHIES)) if (t.test && !has(k) && t.test() && award(k) && !first && say) say(t);
  if (first) for (const k of G.S.trophies || []) unlockPlay(k); // in case they were won before Play Games was connected
}
export const cupSVG = (c, on = true) => `<svg viewBox="0 0 48 48" aria-hidden="true" class="cup ${on ? 'on' : ''}"><defs><linearGradient id="cup${c[1].slice(1)}${on ? '' : 'x'}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${on ? c[0] : '#cfc6b4'}"/><stop offset="1" stop-color="${on ? c[1] : '#9c9484'}"/></linearGradient></defs><path d="M14 7 H34 V19 C34 26 30 30 24 30 C18 30 14 26 14 19Z M14 10 H7 C7 18 9 23 15 24 M34 10 H41 C41 18 39 23 33 24" fill="none" stroke="url(#cup${c[1].slice(1)}${on ? '' : 'x'})" stroke-width="3"/><path d="M14 7 H34 V19 C34 26 30 30 24 30 C18 30 14 26 14 19Z M21 30 H27 L28 37 H20Z M15 37 H33 L35 42 H13Z" fill="url(#cup${c[1].slice(1)}${on ? '' : 'x'})"/></svg>`;
