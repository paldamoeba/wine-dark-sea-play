// Sea life: a whale that surfaces now and then (sail close for Poseidon's blessing) and dolphins that jump beside the boat.
import {WILDLIFE} from './config.js?v=bdf91e0';
import {WORLD, landDist, waveAt} from './world.js?v=bdf91e0';
import {G, save} from './state.js?v=bdf91e0';
import {scene} from './scene.js?v=bdf91e0';
import {whaleModel, dolphinModel} from './models.js?v=bdf91e0';
import {toast} from './ui.js?v=bdf91e0';
import {combatState} from './combat.js?v=bdf91e0';
import {sfx} from './audio.js?v=bdf91e0';

const T = window.THREE;
const rand = ([a, b]) => a + Math.random()*(b - a);
const openSea = (x, y, gap) => x > 200 && y > 200 && x < WORLD - 200 && y < WORLD - 200 && landDist(x, y) > gap;

// ---- the whale ----
// state: 'gone' (waiting), 'rise' (coming up), 'swim' (at the surface, spouting), 'dive' (tail up, going down)
const W = {obj:whaleModel(), state:'gone', wait:rand(WILDLIFE.whaleFirst), x:0, y:0, a:0, t:0, blessed:false, puff:0};
W.obj.visible = false; scene.add(W.obj);
function spawnWhale(){
  const S = G.S;
  for (let k=0;k<20;k++){
    const a = S.a + (Math.random() - .5)*2.2, d = 300 + Math.random()*140, x = S.x + Math.cos(a)*d, y = S.y + Math.sin(a)*d;
    if (!openSea(x, y, 650)) continue; // whales keep well away from land
    Object.assign(W, {state:'rise', x, y, a:Math.random()*6.28, t:0, blessed:false, puff:1});
    W.obj.visible = true; toast('A whale is surfacing! Sail close to it.', 3.5); sfx('whale', W);
    return true;
  }
  return false;
}
function updateWhale(dt){
  const S = G.S;
  if (W.state === 'gone'){
    if (G.sheetOpen || G.dock || combatState.threat) return;
    W.wait -= dt;
    if (W.wait <= 0 && !(spawnWhale())) W.wait = 10;
    return;
  }
  W.t += dt;
  const ud = W.obj.userData, swim = W.state === 'swim' ? 28 : W.state === 'dive' ? 34 : 12;
  // swim slowly, turning gently, keeping away from land
  W.a += Math.sin(G.t*.13)*.08*dt;
  const nx = W.x + Math.cos(W.a)*swim*dt, ny = W.y + Math.sin(W.a)*swim*dt;
  if (openSea(nx, ny, 500)){ W.x = nx; W.y = ny; } else W.a += 1.2*dt;
  let y = 0, pitch = 0;
  if (W.state === 'rise'){ const k = Math.min(1, W.t/2.5); y = -40 + 40*k; pitch = (1 - k)*.25; if (k >= 1){ W.state = 'swim'; W.t = 0; } }
  else if (W.state === 'swim'){
    y = Math.sin(G.t*.8)*1.5; pitch = Math.sin(G.t*.6)*.03;
    W.puff -= dt; if (W.puff <= 0){ W.puff = 5; ud.spoutT = 0; sfx('spout', W); if (Math.random() < .35) setTimeout(() => sfx('whale', W), 1500); }
    if (W.t > 24){ W.state = 'dive'; W.t = 0; }
  } else if (W.state === 'dive'){
    const k = Math.min(1, W.t/3.5); pitch = -.5*Math.sin(k*Math.PI*.9); y = -k*80;
    if (k >= 1){ W.state = 'gone'; W.obj.visible = false; W.wait = rand(WILDLIFE.whaleEvery); }
  }
  W.obj.position.set(W.x, waveAt(W.x, W.y, G.t) + y - 8, W.y); // only the back shows above the water
  W.obj.rotation.set(0, -W.a, 0); ud.body.rotation.z = pitch;
  ud.tail.rotation.z = Math.sin(G.t*1.6)*.18 + (W.state === 'dive' ? .5 : 0);
  // spout
  if (ud.spoutT !== undefined){ ud.spoutT += dt;
    ud.spout.forEach((p, i) => { const k = ud.spoutT*1.4 - i*.06; p.visible = k > 0 && k < 1;
      if (p.visible){ p.position.set(38 + Math.sin(i*2.1)*k*8, 18 + k*55, Math.cos(i*1.7)*k*8); p.scale.setScalar(.6 + k*1.6); p.material.opacity = .8*(1 - k); } }); }
  // the blessing
  if (!W.blessed && W.state !== 'dive' && Math.hypot(S.x - W.x, S.y - W.y) < WILDLIFE.whaleNear){
    W.blessed = true; S.bless = WILDLIFE.blessSeconds; save(); sfx('blessing');
    toast(`Poseidon's blessing! Faster sailing and quicker work for ${Math.round(WILDLIFE.blessSeconds/60)} minutes.`, 4.5);
  }
}
// Builder tool / test: make the whale come up now.
document.addEventListener('whale', () => { W.state = 'gone'; W.wait = 0; });

// ---- dolphins: a small pod jumps alongside the boat for a while ----
const pod = [0, 1, 2].map(() => { const d = dolphinModel(); d.visible = false; scene.add(d); return d; });
const P = {on:false, wait:rand(WILDLIFE.dolphinEvery), t:0, side:1};
function updateDolphins(dt){
  const S = G.S;
  if (!P.on){
    if (G.sheetOpen || G.dock || G.v < 40 || combatState.threat || combatState.target) return;
    P.wait -= dt;
    if (P.wait <= 0){ P.side = Math.random() < .5 ? 1 : -1;
      if (openSea(S.x - Math.sin(S.a)*P.side*90, S.y + Math.cos(S.a)*P.side*90, 120)){ P.on = true; P.t = 0; } else P.wait = 8; }
    return;
  }
  P.t += dt;
  pod.forEach((d, i) => {
    // each one runs a little ahead of the boat on one side, leaping in turn
    const fwd = 50 + i*28 + Math.sin(P.t*.7 + i)*12, out = P.side*(80 + i*22);
    const x = S.x + Math.cos(S.a)*fwd - Math.sin(S.a)*out, y = S.y + Math.sin(S.a)*fwd + Math.cos(S.a)*out;
    const ph = (P.t*.9 + i*.33) % 1, jump = ph < .45 ? Math.sin(ph/.45*Math.PI) : -Math.sin((ph - .45)/.55*Math.PI)*.4;
    d.visible = jump > -.15 && P.t < 13;
    const was = d.userData.up; d.userData.up = jump > 0; if (d.visible && was !== undefined && was !== d.userData.up) sfx('splash', {x, y}, .35);
    d.position.set(x, waveAt(x, y, G.t) + jump*26 - 3, y);
    d.rotation.set(0, -S.a, ph < .45 ? Math.cos(ph/.45*Math.PI)*.8 : -.5);
  });
  if (P.t > 14 || !openSea(S.x, S.y, 90) || combatState.threat || combatState.target){ P.on = false; pod.forEach(d => d.visible = false); P.wait = rand(WILDLIFE.dolphinEvery); }
}

document.addEventListener('dolphins', () => { P.wait = 0; });

export function updateWildlife(dt){ updateWhale(dt); updateDolphins(dt); }
export const whale = W;
