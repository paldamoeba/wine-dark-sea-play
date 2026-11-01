// Sea life: a whale that surfaces now and then (sail close for Poseidon's blessing) and dolphins that leap past on their own course.
import {WILDLIFE} from './config.js?v=a77b89b';
import {WORLD, landDist, waveAt, zoneAt} from './world.js?v=a77b89b';
import {G, save} from './state.js?v=a77b89b';
import {scene} from './scene.js?v=a77b89b';
import {whaleModel, dolphinModel, krakenModel} from './models.js?v=a77b89b';
import {toast} from './ui.js?v=a77b89b';
import {combatState} from './combat.js?v=a77b89b';
import {sfx} from './audio.js?v=a77b89b';

const T = window.THREE;
const rand = ([a, b]) => a + Math.random()*(b - a);
const openSea = (x, y, gap) => x > 200 && y > 200 && x < WORLD - 200 && y < WORLD - 200 && landDist(x, y) > gap;

// ---- the whale ----
// state: 'gone' (waiting), 'rise' (coming up), 'swim' (at the surface, spouting), 'dive' (tail up, going down)
export const WHALE = {up:false};
const W = {obj:whaleModel(), state:'gone', wait:rand(WILDLIFE.whaleFirst), x:0, y:0, a:0, t:0, blessed:false, puff:0};
W.obj.visible = false; scene.add(W.obj);
function spawnWhale(){
  const S = G.S;
  for (let k=0;k<20;k++){
    const a = S.a + (Math.random() - .5)*2.2, d = 300 + Math.random()*140, x = S.x + Math.cos(a)*d, y = S.y + Math.sin(a)*d;
    if (!openSea(x, y, 650)) continue; // whales keep well away from land
    Object.assign(W, {state:'rise', x, y, a:Math.random()*6.28, t:0, blessed:false, puff:1});
    W.obj.visible = true; sfx('whale', W); // no message: the blessing icon lights up in the corner (ui.js)
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
  W.t += dt; WHALE.up = W.state !== 'gone' && W.state !== 'dive' && !W.blessed;
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
  }
}
// Builder tool / test: make the whale come up now.
document.addEventListener('whale', () => { W.state = 'gone'; W.wait = 0; });

// ---- dolphins: a small pod crosses the sea on its own course, leaping as it goes, then swims off ----
// Like the whale, they don't follow you: they appear ahead, pass by and are gone.
const pod = [0, 1, 2].map(() => { const d = dolphinModel(); d.visible = false; scene.add(d); return d; });
const P = {on:false, wait:rand(WILDLIFE.dolphinEvery), t:0, x:0, y:0, a:0};
const POD_SPEED = 95, POD_TIME = 16;
function updateDolphins(dt){
  const S = G.S;
  if (!P.on){
    if (G.sheetOpen || G.dock || combatState.threat || combatState.target) return;
    P.wait -= dt;
    if (P.wait <= 0){
      // start off to one side ahead of the boat and swim across in front of it
      const side = Math.random() < .5 ? 1 : -1, ahead = S.a + side*(.5 + Math.random()*.5), d = 280 + Math.random()*80;
      const x = S.x + Math.cos(ahead)*d, y = S.y + Math.sin(ahead)*d, a = S.a - side*(1.6 + (Math.random() - .5)*.6);
      if (openSea(x, y, 160) && openSea(x + Math.cos(a)*POD_SPEED*POD_TIME, y + Math.sin(a)*POD_SPEED*POD_TIME, 60)){ Object.assign(P, {on:true, t:0, x, y, a}); }
      else P.wait = 8;
    }
    return;
  }
  P.t += dt; P.a += Math.sin(P.t*.4)*.05*dt;
  P.x += Math.cos(P.a)*POD_SPEED*dt; P.y += Math.sin(P.a)*POD_SPEED*dt;
  pod.forEach((d, i) => {
    // a loose line, each one leaping in turn
    const back = i*38 + Math.sin(P.t*.7 + i)*8, out = (i - 1)*26;
    const x = P.x - Math.cos(P.a)*back - Math.sin(P.a)*out, y = P.y - Math.sin(P.a)*back + Math.cos(P.a)*out;
    const ph = (P.t*.9 + i*.33) % 1, jump = ph < .45 ? Math.sin(ph/.45*Math.PI) : -Math.sin((ph - .45)/.55*Math.PI)*.4;
    d.visible = jump > -.15 && P.t < POD_TIME - 1;
    const was = d.userData.up; d.userData.up = jump > 0; if (d.visible && was !== undefined && was !== d.userData.up) sfx('splash', {x, y}, .35);
    d.position.set(x, waveAt(x, y, G.t) + jump*26 - 3, y);
    d.rotation.set(0, -P.a, ph < .45 ? Math.cos(ph/.45*Math.PI)*.8 : -.5);
  });
  if (P.t > POD_TIME || !openSea(P.x, P.y, 40)){ P.on = false; pod.forEach(d => d.visible = false); P.wait = rand(WILDLIFE.dolphinEvery); }
}

document.addEventListener('dolphins', () => { P.wait = 0; });

// ---- the kraken: out in the Open Sea, now and then, tentacles rise from the water ahead. Sail close and it slips away ----
const K = {obj:krakenModel(), state:'gone', wait:rand(WILDLIFE.krakenFirst), x:0, y:0, t:0, rise:0};
K.obj.visible = false; K.obj.scale.setScalar(2.3); scene.add(K.obj); // huge: its tentacles stand far apart, across a stretch of sea wider than a harbor
function updateKraken(dt){
  const S = G.S;
  if (K.state === 'gone'){
    if (G.sheetOpen || G.dock || combatState.threat || zoneAt(S.x, S.y) !== 2) return; // only far out in the Open Sea
    if ((K.wait -= dt) > 0) return;
    for (let k=0;k<20;k++){ const a = S.a + (Math.random() - .5)*1.2, d = 600 + Math.random()*80, x = S.x + Math.cos(a)*d, y = S.y + Math.sin(a)*d;
      if (!openSea(x, y, 600)) continue;
      Object.assign(K, {state:'rise', x, y, t:0}); K.obj.visible = true; K.obj.rotation.y = -Math.atan2(S.y - y, S.x - x); // it faces you
      toast('Something stirs...', 3.5); sfx('kraken', K); return; }
    K.wait = 10; return;
  }
  K.t += dt; const d = Math.hypot(S.x - K.x, S.y - K.y);
  if (K.state === 'rise'){ K.rise = Math.min(1, K.t/2.5); if (K.rise >= 1){ K.state = 'show'; K.t = 0; } }
  else if (K.state === 'show' && (d < WILDLIFE.krakenNear || K.t > WILDLIFE.krakenStay)){ K.state = 'dive'; K.t = 0; sfx('bigsplash', K); sfx('kraken', K, .6);
    if (d < WILDLIFE.krakenNear){ S.kraken = (S.kraken || 0) + 1; S.gold += WILDLIFE.krakenGold; save();
      toast(`The kraken! +${WILDLIFE.krakenGold}`, 3); } }
  else if (K.state === 'dive'){ K.rise = Math.max(0, 1 - K.t/2); if (K.rise <= 0){ K.state = 'gone'; K.obj.visible = false; K.wait = rand(WILDLIFE.krakenEvery); } }
  K.obj.position.set(K.x, waveAt(K.x, K.y, G.t), K.y);
  // each tentacle rises (and sinks) a moment after the last, and sways on its own
  K.obj.userData.tents.forEach(tn => { const r = Math.min(1, Math.max(0, K.rise*1.6 - tn.delay*.6)), e = r*r*(3 - 2*r);
    tn.piv.position.y = -4 - (1 - e)*230; tn.piv.rotation.z = Math.sin(G.t*1.3 + tn.ph)*.25 - .1; tn.piv.rotation.x = Math.sin(G.t*.9 + tn.ph*2)*.15;
    tn.ring.material.opacity = .7*e*(.75 + .25*Math.sin(G.t*3 + tn.ph)); tn.ring.scale.setScalar(1 + .12*Math.sin(G.t*2 + tn.ph)); });
  K.obj.userData.shadow.material.opacity = Math.min(1, K.rise*1.4); K.obj.userData.shadow.scale.set(520 + Math.sin(G.t*.6)*20, 440 + Math.cos(G.t*.5)*20, 1);
}
document.addEventListener('kraken', () => { K.wait = 0; });
export const kraken = K;

export function updateWildlife(dt){ updateWhale(dt); updateDolphins(dt); updateKraken(dt); }
export const whale = W;
