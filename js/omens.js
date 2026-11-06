// P78: blessings found out in the world. Now and then a god's fire burns on the open sea, marked on the chart and the small map. Sail through it for a blessing that lasts a few minutes.
// The effects go through blessing() in crew.js, on top of the god on your flag. One at a time: a new one takes the place of the old.
import {OMENS, OMEN} from './config.js?v=733c6b7';
import {G, ship, stat, save} from './state.js?v=733c6b7';
import {scene} from './scene.js?v=733c6b7';
import {landDist, waveAt, WORLD} from './world.js?v=733c6b7';
import {sfx} from './audio.js?v=733c6b7';
import {toast} from './ui.js?v=733c6b7';
const T = window.THREE, KEYS = Object.keys(OMENS), rand = (a, b) => a + Math.random()*(b - a);
export const omen = {on:false, x:0, y:0, g:'ares', life:0, wait:rand(...OMEN.first)};
// the fire: a stone float with a bronze bowl, a flame and a tall beam of colored light you can spot from far off
const g = new T.Group(); g.visible = false; scene.add(g);
const std = (geo, c) => { const m = new T.Mesh(geo, new T.MeshLambertMaterial({color:c})); return m; };
const raft = std(new T.CylinderGeometry(26, 30, 7, 8), '#c9bda0'); raft.position.y = 2; g.add(raft);
const step = std(new T.CylinderGeometry(15, 19, 8, 8), '#dfd5bb'); step.position.y = 9; g.add(step);
const stem = std(new T.CylinderGeometry(3.5, 5, 16, 8), '#a9783a'); stem.position.y = 20; g.add(stem);
const bowl = std(new T.CylinderGeometry(12, 5, 7, 12), '#c8933f'); bowl.position.y = 31; g.add(bowl);
const mat = c => new T.MeshBasicMaterial({color:c, transparent:true, depthWrite:false});
const flame = new T.Mesh(new T.ConeGeometry(9, 34, 12), mat('#fff')); flame.position.y = 50; flame.renderOrder = 5; g.add(flame);
const core = new T.Mesh(new T.ConeGeometry(5, 20, 10), new T.MeshBasicMaterial({color:'#fffbe6', transparent:true, opacity:.95, depthWrite:false})); core.position.y = 44; core.renderOrder = 6; g.add(core);
const beam = new T.Mesh(new T.CylinderGeometry(12, 20, 420, 16, 1, true), new T.MeshBasicMaterial({color:'#fff', transparent:true, opacity:.2, depthWrite:false, side:T.DoubleSide, blending:T.AdditiveBlending})); beam.position.y = 240; beam.renderOrder = 4; g.add(beam);
const rings = [0, 1].map(() => { const geo = new T.RingGeometry(30, 36, 32); geo.rotateX(-Math.PI/2); const m = new T.Mesh(geo, mat('#fff')); m.position.y = 1.6; m.renderOrder = 2; g.add(m); return m; });
function show(k){ const c = OMENS[k].color; flame.material.color.set(c); beam.material.color.set(c); rings.forEach(r => r.material.color.set(c)); }
function place(){ const S = G.S; for (let i = 0; i < 40; i++){ const a = S.a + rand(-1.5, 1.5), d = rand(...OMEN.dist), x = S.x + Math.cos(a)*d, y = S.y + Math.sin(a)*d;
    if (x < 300 || y < 300 || x > WORLD - 300 || y > WORLD - 300 || landDist(x, y) < 240) continue;
    const list = KEYS.filter(k => k !== omen.g); Object.assign(omen, {on:true, x, y, g:list[Math.floor(Math.random()*list.length)], life:OMEN.life}); show(omen.g); g.visible = true; return true; }
  return false; }
export function updateOmens(dt){ const S = G.S;
  if (S.omen && !G.sheetOpen){ S.omen.t -= dt; if (S.omen.t <= 0) S.omen = null; else { const r = OMENS[S.omen.g].regen; if (r && !G.sinking) S.hull = Math.min(ship().hull, S.hull + ship().hull*r*dt); } }
  if (!omen.on){ if (G.sheetOpen || G.dock || G.sinking) return; omen.wait -= dt; if (omen.wait <= 0 && !place()) omen.wait = 10; return; }
  if (!G.sheetOpen) omen.life -= dt;
  const t = G.t, far = Math.hypot(omen.x - G.cam.x, omen.y - G.cam.y) > 4000;
  if (!far){ g.position.set(omen.x, waveAt(omen.x, omen.y, t), omen.y); const k = 1 + Math.sin(t*7)*.07 + Math.sin(t*11)*.04; flame.scale.set(1/k, k, 1/k); flame.material.opacity = .9; beam.material.opacity = .14 + .05*Math.sin(t*1.7);
    rings.forEach((r, i) => { const p = (t*.4 + i*.5) % 1; r.scale.setScalar(1 + p*1.8); r.material.opacity = .7*(1 - p); }); g.rotation.z = Math.sin(t*.8)*.02; }
  if (omen.life <= 0){ omen.on = false; g.visible = false; omen.wait = rand(...OMEN.every); return; }
  if (!G.sinking && Math.hypot(S.x - omen.x, S.y - omen.y) < OMEN.reach + ship().beam*.5){ const o = OMENS[omen.g]; S.omen = {g:omen.g, t:OMEN.seconds}; stat('omens'); sfx('blessing'); toast(`${o.name}: ${o.text}`, 3.5); G.pops = [...(G.pops || []), {t:G.t, txt:o.name, x:omen.x, y:omen.y, c:o.color}]; omen.on = false; g.visible = false; omen.wait = rand(...OMEN.every); save(); }
}
// Builder and tests: bring one up just ahead
document.addEventListener('omen', e => { const S = G.S; omen.wait = 0; place(); if (e.detail && OMENS[e.detail]){ omen.g = e.detail; show(e.detail); } omen.x = S.x + Math.cos(S.a)*300; omen.y = S.y + Math.sin(S.a)*300; });
