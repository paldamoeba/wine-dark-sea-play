// Sea life: a whale that surfaces now and then (sail close for Poseidon's blessing) and dolphins that jump beside the boat.
import {WILDLIFE} from './config.js?v=f3aa387';
import {WORLD, landDist, waveAt} from './world.js?v=f3aa387';
import {G, save} from './state.js?v=f3aa387';
import {scene} from './scene.js?v=f3aa387';
import {mesh} from './models.js?v=f3aa387';
import {toast} from './ui.js?v=f3aa387';
import {combatState} from './combat.js?v=f3aa387';

const T = window.THREE;
const rand = ([a, b]) => a + Math.random()*(b - a);
const openSea = (x, y, gap) => x > 200 && y > 200 && x < WORLD - 200 && y < WORLD - 200 && landDist(x, y) > gap;

// ---- models: soft rounded shapes, nose along +x ----
function whaleModel(){
  const g = new T.Group(), body = new T.Group(); g.add(body);
  const b = mesh(new T.SphereGeometry(1, 14, 10), '#4d6d86'); b.scale.set(62, 17, 20); body.add(b);
  const belly = mesh(new T.SphereGeometry(1, 12, 8), '#c9d3d6'); belly.scale.set(50, 9, 15); belly.position.set(6, -8, 0); body.add(belly);
  const head = mesh(new T.SphereGeometry(1, 12, 8), '#4d6d86'); head.scale.set(26, 15, 18); head.position.set(40, 1, 0); body.add(head);
  for (const s of [-1, 1]){ const fin = mesh(new T.SphereGeometry(1, 8, 6), '#3d5a72'); fin.scale.set(13, 2.5, 6); fin.position.set(18, -8, s*20); fin.rotation.y = s*.5; body.add(fin);
    const eye = mesh(new T.SphereGeometry(1.6, 6, 4), '#1d2633'); eye.position.set(46, 3, s*15.5); body.add(eye); }
  const tail = new T.Group(); tail.position.set(-58, 2, 0); body.add(tail);
  const stock = mesh(new T.SphereGeometry(1, 10, 6), '#4d6d86'); stock.scale.set(20, 8, 9); stock.position.x = -8; tail.add(stock);
  for (const s of [-1, 1]){ const fluke = mesh(new T.SphereGeometry(1, 10, 6), '#3d5a72'); fluke.scale.set(10, 2.2, 18); fluke.position.set(-24, 0, s*14); fluke.rotation.y = s*.45; tail.add(fluke); }
  // the spout: a few white puffs that rise and fade
  const spout = []; for (let k=0;k<7;k++){ const p = mesh(new T.SphereGeometry(5, 6, 4), '#f4fbff', {transparent:true, opacity:.8}, false); p.material = p.material.clone(); p.visible = false; g.add(p); spout.push(p); }
  g.userData = {body, tail, spout};
  return g;
}
function dolphinModel(){
  const g = new T.Group();
  const b = mesh(new T.SphereGeometry(1, 10, 8), '#7f94a6'); b.scale.set(14, 4.5, 4.5); g.add(b);
  const belly = mesh(new T.SphereGeometry(1, 8, 6), '#e3e8ea'); belly.scale.set(11, 2.6, 3.6); belly.position.y = -2; g.add(belly);
  const nose = mesh(new T.SphereGeometry(1, 6, 4), '#7f94a6'); nose.scale.set(5, 1.6, 1.6); nose.position.x = 15; g.add(nose);
  const fin = mesh(new T.ConeGeometry(2.6, 7, 4), '#6b8194'); fin.position.set(-1, 5, 0); fin.rotation.z = .5; g.add(fin);
  const tail = mesh(new T.SphereGeometry(1, 6, 4), '#6b8194'); tail.scale.set(2.5, 1, 6); tail.position.x = -15; g.add(tail);
  return g;
}

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
    W.obj.visible = true; toast('A whale is surfacing! Sail close to it.', 3.5);
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
    W.puff -= dt; if (W.puff <= 0){ W.puff = 5; ud.spoutT = 0; }
    if (W.t > 24){ W.state = 'dive'; W.t = 0; }
  } else if (W.state === 'dive'){
    const k = Math.min(1, W.t/3.5); pitch = -.5*Math.sin(k*Math.PI*.9); y = -k*80;
    if (k >= 1){ W.state = 'gone'; W.obj.visible = false; W.wait = rand(WILDLIFE.whaleEvery); }
  }
  W.obj.position.set(W.x, waveAt(W.x, W.y, G.t) + y + 3, W.y);
  W.obj.rotation.set(0, -W.a, 0); ud.body.rotation.z = pitch;
  ud.tail.rotation.z = Math.sin(G.t*1.6)*.18 + (W.state === 'dive' ? .5 : 0);
  // spout
  if (ud.spoutT !== undefined){ ud.spoutT += dt;
    ud.spout.forEach((p, i) => { const k = ud.spoutT*1.4 - i*.06; p.visible = k > 0 && k < 1;
      if (p.visible){ p.position.set(38 + Math.sin(i*2.1)*k*8, 18 + k*55, Math.cos(i*1.7)*k*8); p.scale.setScalar(.6 + k*1.6); p.material.opacity = .8*(1 - k); } }); }
  // the blessing
  if (!W.blessed && W.state !== 'dive' && Math.hypot(S.x - W.x, S.y - W.y) < WILDLIFE.whaleNear){
    W.blessed = true; S.bless = WILDLIFE.blessSeconds; save();
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
    d.position.set(x, waveAt(x, y, G.t) + jump*26 - 3, y);
    d.rotation.set(0, -S.a, ph < .45 ? Math.cos(ph/.45*Math.PI)*.8 : -.5);
  });
  if (P.t > 14 || !openSea(S.x, S.y, 90) || combatState.threat || combatState.target){ P.on = false; pod.forEach(d => d.visible = false); P.wait = rand(WILDLIFE.dolphinEvery); }
}

document.addEventListener('dolphins', () => { P.wait = 0; });

export function updateWildlife(dt){ updateWhale(dt); updateDolphins(dt); }
export const whale = W;
