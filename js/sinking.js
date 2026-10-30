// Sinking ships: the hull lists over, the bow lifts, and it slides under. Foam rings and floating planks are left behind.
import {waveAt} from './world.js?v=fdeb845';
import {scene} from './scene.js?v=fdeb845';
import {mesh} from './models.js?v=fdeb845';

const T = window.THREE;

// t = seconds since the ship went down, side = which way it rolls (1 or -1), len = ship length.
// Returns how far under the water it is and how much it leans.
export function sinkPose(t, side, len){
  const lean = Math.min(1, t/1.8), k = Math.max(0, t - 1.2);
  return {depth:k*k*2.2 + k*4, roll:side*lean*.6, pitch:Math.min(1, t/3.2)*.38, done:k*k*2.2 + k*4 > len*.45 + 40};
}

// ---- what's left on the water ----
const ringGeo = new T.RingGeometry(.8, 1, 24); ringGeo.rotateX(-Math.PI/2);
const RINGS = Array.from({length:12}, () => { const m = mesh(ringGeo, '#f4fbff', {transparent:true, opacity:0, depthWrite:false}); m.castShadow = false; m.visible = false; scene.add(m); return {m, life:0}; });
const plankGeo = new T.BoxGeometry(14, 2, 4);
const PLANKS = Array.from({length:16}, () => { const m = mesh(plankGeo, '#8a5d3e', {transparent:true}); m.castShadow = false; m.visible = false; scene.add(m); return {m, life:0}; });
let ri = 0, pi = 0;
const LIFE = 22; // seconds planks float before they drift off

// Foam rings for the first few seconds, and a few planks.
export function startSink(x, y, len){
  const n = len > 100 ? 5 : len > 55 ? 4 : 3;
  for (let i=0;i<n;i++){
    const p = PLANKS[pi++ % PLANKS.length], a = Math.random()*6.28, d = Math.random()*len*.35;
    Object.assign(p, {life:LIFE, x:x + Math.cos(a)*d, y:y + Math.sin(a)*d, vx:Math.cos(a)*(6 + Math.random()*8), vy:Math.sin(a)*(6 + Math.random()*8), spin:(Math.random() - .5)*.6, s:.7 + len/140});
    p.m.rotation.set(0, Math.random()*6.28, 0); p.m.scale.setScalar(p.s); p.m.visible = true; p.m.material.opacity = 1;
  }
  for (let i=0;i<3;i++) setTimeout(() => ring(x, y, len), 900 + i*900);
}
function ring(x, y, len){ const r = RINGS[ri++ % RINGS.length]; Object.assign(r, {life:1, x, y, R:len*.5}); r.m.visible = true; }

export function updateSinking(dt, t){
  for (const r of RINGS){ if (!r.m.visible) continue; r.life -= dt*.4; if (r.life <= 0){ r.m.visible = false; continue; }
    const k = 1 - r.life; r.m.scale.setScalar(r.R*(.4 + k*1.6)); r.m.material.opacity = .7*r.life; r.m.position.set(r.x, waveAt(r.x, r.y, t) + .8, r.y); }
  for (const p of PLANKS){ if (!p.m.visible) continue; p.life -= dt; if (p.life <= 0){ p.m.visible = false; continue; }
    const slow = Math.exp(-dt*.5); p.vx *= slow; p.vy *= slow; p.x += p.vx*dt; p.y += p.vy*dt; p.m.rotation.y += p.spin*dt;
    p.m.position.set(p.x, waveAt(p.x, p.y, t) + .6 - Math.max(0, 3 - p.life)*2, p.y); p.m.material.opacity = Math.min(1, p.life/3); }
}
