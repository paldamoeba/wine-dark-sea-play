// The Kallisto shipwrights (P54): ship plans won in pieces are studied, then the ship is built. Both take real time, kept as
// clock times (seconds since 1970) so they keep going while the game is closed. One study and one build at a time.
// A video takes VIDEO_SKIP seconds off (a placeholder until real ads are chosen).
import {PLANS, VIDEO_SKIP, SHIPS} from './config.js?v=356bdbb';
import {G, save, pay} from './state.js?v=356bdbb';

export const clockNow = () => Date.now()/1000;
export const piecesOf = t => (G.S.pieces || {})[t] || 0;
export const studied = t => (G.S.plans || [0]).includes(t);
export const allPieces = t => piecesOf(t) >= PLANS[t].pieces;
// S.study / S.build = {t, until} or null
export const timeLeft = job => job ? Math.max(0, job.until - clockNow()) : 0;
export const mmss = s => `${Math.floor(s/60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const span = s => s >= 60 ? `${Math.round(s/60)} min` : `${Math.round(s)} s`;

export function startStudy(t){ const S = G.S; if (S.study || studied(t) || !allPieces(t)) return false; S.study = {t, until:clockNow() + PLANS[t].study}; save(); return true; }
export function startBuild(t){ const S = G.S; if (S.build || !studied(t) || (S.owned || []).includes(t) || !pay(SHIPS[t].cost)) return false; S.build = {t, until:clockNow() + PLANS[t].build}; save(); return true; }
export function watchedVideo(kind){ const j = G.S[kind]; if (!j) return; j.until -= VIDEO_SKIP; save(); }

// Called every frame: finishes a study or a build whose time is up. Returns what finished: [{what, t}]
export function checkYard(){
  const S = G.S, done = [];
  if (S.study && clockNow() >= S.study.until){ const t = S.study.t; S.study = null; S.plans = [...new Set([...(S.plans || [0]), t])]; done.push({what:'study', t}); }
  if (S.build && clockNow() >= S.build.until){ const t = S.build.t; S.build = null;
    S.owned = [...new Set([...(S.owned || [S.tier]), t])].sort(); S.hulls = {...(S.hulls || {}), [t]:SHIPS[t].hull}; done.push({what:'build', t}); }
  if (done.length) save();
  return done;
}
