// P71: the wind quietly leads the way. It swings round to blow toward the next thing worth finding at your level: your pinned ship's plans first,
// otherwise the nearest camp, fortress or named pirate holding plans that you can take on. Near it, or with nothing to find, the wind goes back to wandering.
import {G} from './state.js?v=af48879';
import {W} from './weather.js?v=af48879';
import {enemies, planReward, planSources} from './combat.js?v=af48879';
import {PLANS} from './config.js?v=af48879';
import {siteLevel, myLevel} from './levels.js?v=af48879';

const wrap = d => d - Math.PI*2*Math.floor((d + Math.PI)/(Math.PI*2));
let next = 0, target = null;
export function guideTarget(){
  const S = G.S, L = myLevel(), near = list => list.map(f => ({f, d:Math.hypot(f.x - S.x, f.y - S.y)})).sort((a, b) => a.d - b.d)[0]?.f || null;
  const fit = f => siteLevel(f) <= L + 1;
  if (G.boss) return G.boss; // the last goal: the wind blows toward the pirate king
  if (S.pin && PLANS[S.pin]){ const p = planSources(S.pin), ok = p.filter(fit); if (ok.length) return near(ok); }
  const any = enemies.filter(e => (e.fort || e.named) && !e.dead && planReward(e) && fit(e));
  if (any.length) return near(any);
  return (G.goalMarks || [])[0] || null;
}
export function updateGuide(dt){
  if ((next -= dt) <= 0){ next = 3; target = guideTarget(); G.guide = target; }
  if (!target) return; const S = G.S, d = Math.hypot(target.x - S.x, target.y - S.y); if (d < 900) return;
  W.windA += wrap(Math.atan2(target.y - S.y, target.x - S.x) - W.windA)*Math.min(1, dt*.07);
}
