// P77: trophies. Each one lives in the save, and in the Google Play app it also unlocks the matching Play Games achievement (set PLAY_IDS once they exist in Play Console).
import {G, save, shipDeed} from './state.js?v=ae4eab7';
export const TROPHIES = {
  bronze:{name:'Bronze of Rhodes', how:'Win the Bronze games in the arena', c:['#e2a36a', '#9a5b28']},
  silver:{name:'Silver of Rhodes', how:'Win the Silver games in the arena', c:['#f1f4f6', '#8f9aa3']},
  gold:{name:'Champion of Rhodes', how:'Win the Gold games in the arena', c:['#ffe28a', '#c48a22']},
  king:{name:'Bane of the pirate king', how:'Defeat Polycrates', c:['#d7b0ff', '#6a3a8e']},
};
const PLAY_IDS = {}; // filled in from Play Console: {gold:'CgkI...'}
export const has = k => (G.S.trophies || []).includes(k);
export function award(k){ if (has(k)) return false; G.S.trophies = [...(G.S.trophies || []), k]; if (TROPHIES[k]) shipDeed(TROPHIES[k].name); save();
  try { const P = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.CapacitorGameConnect; if (P && PLAY_IDS[k]) P.unlockAchievement({achievementID:PLAY_IDS[k]}); } catch (e) {}
  return true; }
export const cupSVG = (c, on = true) => `<svg viewBox="0 0 48 48" aria-hidden="true" class="cup ${on ? 'on' : ''}"><defs><linearGradient id="cup${c[1].slice(1)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${on ? c[0] : '#cfc6b4'}"/><stop offset="1" stop-color="${on ? c[1] : '#9c9484'}"/></linearGradient></defs><path d="M14 7 H34 V19 C34 26 30 30 24 30 C18 30 14 26 14 19Z M14 10 H7 C7 18 9 23 15 24 M34 10 H41 C41 18 39 23 33 24" fill="none" stroke="url(#cup${c[1].slice(1)})" stroke-width="3"/><path d="M14 7 H34 V19 C34 26 30 30 24 30 C18 30 14 26 14 19Z M21 30 H27 L28 37 H20Z M15 37 H33 L35 42 H13Z" fill="url(#cup${c[1].slice(1)})"/></svg>`;
