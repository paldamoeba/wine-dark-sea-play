// P77: the pirate king's lair, alone in the empty far north-east of the Aegean. Wine-dark water, a ring of black sea stacks with fires on them,
// a dark fortress on a great rock, the burning wrecks of his victims, drifting embers and a red haze. It all clears once he is beaten.
import {G} from './state.js?v=ed3e210';
import {scene, setLair} from './scene.js?v=ed3e210';
import {WORLD, waveAt, rng} from './world.js?v=ed3e210';
import {mesh, mat} from './ships.js?v=ed3e210';
import {wreckModel} from './models.js?v=ed3e210';
import {buildFortress} from './monuments.js?v=ed3e210';
import {makeFire, updateFire} from './fire.js?v=ed3e210';
import {mergeStatic} from './merge.js?v=ed3e210';

const T = window.THREE;
// P89 (Nicholas): larger and more spaced out: everything sits LK times further from the middle than before
const LK = 1.5;
export const LAIR = {x:Math.round(WORLD*.83), y:Math.round(WORLD*.15), r:Math.round(1700*LK)};
setLair(LAIR.x, LAIR.y, LAIR.r);
// the great rock with his fortress stands to the north-east, the stacks form a broken ring, and the gate faces the way you come from
const AWAY = Math.atan2(WORLD*.5 - LAIR.y, WORLD*.5 - LAIR.x), R0 = rng(777);
export const LAIR_ROCKS = [{x:LAIR.x - Math.cos(AWAY)*620*LK, y:LAIR.y - Math.sin(AWAY)*620*LK, r:210, big:true}];
for (const sg of [-1, 1]){ const a = AWAY + sg*.16; LAIR_ROCKS.push({x:LAIR.x + Math.cos(a)*1250*LK, y:LAIR.y + Math.sin(a)*1250*LK, r:64, h:230, gate:true, fire:true}); }
for (let i = 0; i < 16; i++){ const a = AWAY + .42 + i/16*(Math.PI*2 - .84), d = (980 + R0()*520)*LK, s = 30 + R0()*42; LAIR_ROCKS.push({x:LAIR.x + Math.cos(a)*d, y:LAIR.y + Math.sin(a)*d, r:s, h:70 + s*2.6 + R0()*60, fire:i % 3 === 0}); }

function stack(r, h, R){ const seg = 7, geo = new T.CylinderGeometry(r*.32, r, h + 24, seg, 4), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++){ const y = p.getY(i), k = 1 + (R() - .5)*.42, top = y > h*.45; p.setXYZ(i, p.getX(i)*k, y + (top ? R()*h*.14 : 0), p.getZ(i)*k); }
  geo.translate(0, (h + 24)/2 - 24, 0); geo.computeVertexNormals(); return mesh(geo, R() < .5 ? '#29252e' : '#211e27', {flatShading:true}); }
function banner(h, w){ const g = new T.Group(); const pole = mesh(new T.CylinderGeometry(1.1, 1.5, h, 6), '#15110f'); pole.position.y = h/2; g.add(pole);
  const c = mesh(new T.BoxGeometry(.8, w*1.5, w), '#100c10'); c.position.set(0, h - w*.8, w/2); c.castShadow = false; g.add(c);
  const st = mesh(new T.BoxGeometry(1, w*.16, w), '#d9a441'); st.position.set(0, h - w*.45, w/2); st.castShadow = false; g.add(st); return g; }
let built = false; const fires = [], wrecks = []; let embers = null, emberP = null;
function build(){ built = true; const R = rng(2024), g = new T.Group(); scene.add(g);
  for (const k of LAIR_ROCKS){ const n = new T.Group(); n.position.set(k.x, 0, k.y); g.add(n);
    if (k.big){ const base = stack(k.r*1.15, 60, R); n.add(base); for (let i = 0; i < 9; i++){ const a = i*.7 + R(), s = stack(38 + R()*40, 35 + R()*50, R); s.position.set(Math.cos(a)*k.r*.86, 0, Math.sin(a)*k.r*.86); n.add(s); }
      const f = buildFortress('pirate', '#120d10'); f.traverse(o => { if (o.isMesh && o.material.color && !o.material.transparent){ const c = o.material.color.clone().multiplyScalar(.36); o.material = mat('#' + c.getHexString()); } }); f.scale.setScalar(.95); f.position.y = 56; f.rotation.y = -AWAY + Math.PI/2; n.add(f); n.userData.keep = false; }
    else { n.add(stack(k.r, k.h, R)); if (k.gate){ const b = banner(70, 34); b.position.y = k.h - 4; n.add(b); } else if (k.h > 170){ const b = banner(46, 20); b.position.y = k.h - 4; b.rotation.y = R()*6; n.add(b); }
      if (k.fire){ const f = makeFire(44, 22, 8); f.position.y = k.h; g.add(f); f.position.x = k.x; f.position.z = k.y; f.userData.noMergeFire = true; fires.push({f, ph:R()*6}); } } }
  // the mast of a broken ship stands out of the water here and there, hung with black
  for (let i = 0; i < 8; i++){ const a = i*.8 + 1, d = (450 + R()*700)*LK, m = banner(52 + R()*24, 16), n = new T.Group(); m.rotation.z = (R() - .5)*.5; n.add(m); n.position.set(LAIR.x + Math.cos(a)*d, -6, LAIR.y + Math.sin(a)*d); g.add(n); }
  for (const k of fires) k.f.userData.keep = true;
  mergeStatic(g);
  for (let i = 0; i < 11; i++){ const a = i*2.4 + .3, d = (280 + (i*173 % 760))*LK, w = wreckModel(['small', 'medium', 'large'][i % 3]); w.rotation.y = a*1.7; const fire = makeFire(70, 30, 10); w.add(fire); scene.add(w); wrecks.push({x:LAIR.x + Math.cos(a)*d, y:LAIR.y + Math.sin(a)*d, w, fire, ph:i}); }
  // embers on the wind
  const N = 140, geo = new T.BufferGeometry(); emberP = new Float32Array(N*3); for (let i = 0; i < N*3; i++) emberP[i] = (Math.random() - .5)*1200; geo.setAttribute('position', new T.BufferAttribute(emberP, 3));
  embers = new T.Points(geo, new T.PointsMaterial({color:'#ff8a3c', size:5, transparent:true, opacity:.85, blending:T.AdditiveBlending, depthWrite:false})); embers.frustumCulled = false; scene.add(embers); }
export function updateLair(dt){ const S = G.S, d = Math.hypot(LAIR.x - G.cam.x, LAIR.y - G.cam.y), near = d < LAIR.r + 3400, done = !!S.chapter;
  // how far inside you are: scene.js turns the sky and the light with this
  const k = done ? 0 : 1 - Math.min(1, Math.max(0, (d - LAIR.r*.55)/(LAIR.r*1.1)));
  G.lairK = (G.lairK || 0) + (k - (G.lairK || 0))*Math.min(1, dt*1.5);
  if (done) setLair(LAIR.x, LAIR.y, LAIR.r*.6);
  if (!near){ if (embers) embers.visible = false; return; } if (!built) build();
  for (const w of wrecks){ w.w.position.set(w.x, waveAt(w.x, w.y, G.t) - 3, w.y); updateFire(w.fire, done ? .25 : .55 + .2*Math.sin(G.t*.7 + w.ph), G.t); }
  for (const f of fires) updateFire(f.f, done ? .2 : .5 + .15*Math.sin(G.t*.6 + f.ph), G.t);
  embers.visible = G.lairK > .03 && !done; if (embers.visible){ embers.position.set(G.cam.x, 0, G.cam.y); embers.material.opacity = .85*G.lairK;
    for (let i = 0; i < emberP.length; i += 3){ emberP[i] += (6 + Math.sin(i + G.t))*dt*3; let y = emberP[i + 1] + dt*(26 + i % 19); if (y > 220) y = 0; emberP[i + 1] = y; if (emberP[i] > 600) emberP[i] -= 1200; } embers.geometry.attributes.position.needsUpdate = true; } }
