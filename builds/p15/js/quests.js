// Things to do: the first-voyage goals, the request board in every harbor, and messages in bottles (coins, notes, treasure maps).
// Other modules report what happens with progress(type, kind, n): 'catch', 'sell', 'wood', 'salvage', 'sink', 'build', 'board'.
import {FISH, GOALS, REQUESTS, BOTTLES} from './config.js';
import {WORLD, ISLANDS, HARBORS, landDist, rng, hash, waveAt} from './world.js';
import {G, save, ship} from './state.js';
import {scene} from './scene.js';
import {mesh} from './models.js';
import {toast} from './ui.js';

const T = window.THREE;
const named = ISLANDS.filter(i => i.name && !i.frame && !i.port);
const pick = (R, a) => a[Math.floor(R()*a.length)];

// ---- first voyages: one goal at a time ----
export function goal(){
  if (G.S.tier >= 1 && (G.S.goal || 0) < GOALS.length) G.S.goal = GOALS.length; // past the start already: no starter goals
  return GOALS[G.S.goal || 0] || null;
}
function goalStep(type, kind, n){
  const g = goal(); if (!g || g.t !== type || (g.kind && g.kind !== kind)) return;
  G.S.goalN = (G.S.goalN || 0) + n;
  if (G.S.goalN >= g.n){ G.S.gold += g.gold; G.S.goal = (G.S.goal || 0) + 1; G.S.goalN = 0;
    const next = goal(); toast(`Goal done! +${g.gold} gold${next ? `. Next: ${next.text}` : '. You have the hang of it: the request boards always have work.'}`, 4.5); }
}

// ---- requests ----
// type: catch (kind, n) · deliver (kind, n, to harbor) · salvage (n) · wood (n) · visit (to island) · sink (kind, n)
let seed = 1;
function makeOffer(){
  const S = G.S, R = rng((S.reqSeed = (S.reqSeed || 7) + 1)*7919 + seed++), who = pick(R, REQUESTS.who);
  const types = ['catch', 'catch', 'deliver', 'salvage', 'wood', 'visit', ...(S.tier >= 1 ? ['sink', 'deliver'] : [])], t = pick(R, types);
  const fish = S.tier >= 1 && R() < .4 ? 'swordfish' : R() < .55 ? 'sardine' : 'tuna', fn = n => n > 1 ? FISH[fish].label.toLowerCase() + (fish === 'tuna' || fish === 'swordfish' ? '' : 's') : FISH[fish].label.toLowerCase();
  if (t === 'catch'){ const n = fish === 'sardine' ? 3 + Math.floor(R()*4) : 1 + Math.floor(R()*3);
    return {t, kind:fish, n, got:0, gold:Math.round(n*FISH[fish].price*1.5 + 6), text:`Catch ${n} ${fn(n)}`, who}; }
  const reach = S.tier >= 1 ? Infinity : 6500, close = o => Math.hypot(o.x - S.x, o.y - S.y) < reach; // the rowboat gets jobs near home
  if (t === 'deliver'){ const hs = HARBORS.filter(h => (!G.dock || h !== G.dock.h) && close(h.dock)), h = hs.length ? pick(R, hs) : HARBORS[0], n = fish === 'sardine' ? 3 + Math.floor(R()*3) : 1 + Math.floor(R()*2);
    return {t, kind:fish, n, to:h.is.name, gold:Math.round(n*FISH[fish].price*2 + 12), text:`Bring ${n} ${fn(n)} to ${h.is.name}`, who}; }
  if (t === 'salvage'){ const n = 2 + Math.floor(R()*3); return {t, n, got:0, gold:n*5 + 6, text:`Salvage ${n} timbers from wrecks`, who}; }
  if (t === 'wood'){ const n = 3 + Math.floor(R()*3); return {t, n, got:0, gold:n*4 + 4, text:`Cut ${n} cypress wood`, who}; }
  if (t === 'visit'){ const near = named.filter(close), is = pick(R, near.length ? near : named), far = Math.hypot(is.x - G.S.x, is.y - G.S.y);
    return {t, to:is.name, n:1, got:0, gold:Math.round(14 + far/350), text:`Sail to ${is.name} with a letter`, who}; }
  return {t:'sink', kind:'skiff', n:1, got:0, gold:45, text:'Sink a pirate skiff', who};
}
export function board(){ const S = G.S; S.board = S.board || []; while (S.board.length < REQUESTS.offers) S.board.push(makeOffer()); return S.board; }
export const active = () => G.S.reqs || [];
export function accept(i){
  const S = G.S; if (active().length >= REQUESTS.max) return false;
  const r = board()[i]; S.reqs = [...active(), r]; S.board.splice(i, 1, makeOffer());
  toast(`New job: ${r.text}`, 2.5); progress('board', null, 1); save(); return true;
}
export function decline(i){ board().splice(i, 1, makeOffer()); }
export function drop(i){ G.S.reqs = active().filter((_, k) => k !== i); }
function finish(r){ G.S.gold += r.gold; G.S.reqs = active().filter(q => q !== r); toast(`Job done: ${r.text}. +${r.gold} gold`, 3.5); save(); }
// Deliveries are handed over in the harbor.
export const canDeliver = (r, h) => r.t === 'deliver' && h && h.is.name === r.to && (G.S.cargo[r.kind] || 0) >= r.n;
export function deliver(i, h){ const r = active()[i]; if (!canDeliver(r, h)) return; G.S.cargo[r.kind] -= r.n; finish(r); }

export function progress(type, kind, n = 1){
  goalStep(type, kind, n);
  for (const r of [...active()]){
    if (r.t !== type || r.t === 'deliver' || (r.kind && r.kind !== kind)) continue;
    r.got += n; if (r.got >= r.n) finish(r);
  }
}
// The line under the top bar: the current goal, or the first job you have taken.
export function pillText(){
  const g = goal(); if (g) return `${g.text}${g.n > 1 ? ` (${G.S.goalN || 0}/${g.n})` : ''}`;
  const r = active()[0]; if (!r) return '';
  return r.t === 'deliver' ? `${r.text} (${Math.min(r.n, G.S.cargo[r.kind] || 0)}/${r.n} aboard)` : `${r.text}${r.n > 1 ? ` (${r.got}/${r.n})` : ''}`;
}

// ---- bottles ----
function bottleModel(){
  const g = new T.Group(), glass = {transparent:true, opacity:.8};
  const body = mesh(new T.CylinderGeometry(3.2, 3.2, 12, 8), '#8fcdb0', glass); g.add(body);
  const neck = mesh(new T.CylinderGeometry(1.3, 2.4, 5, 8), '#8fcdb0', glass); neck.position.y = 8.5; g.add(neck);
  const cork = mesh(new T.CylinderGeometry(1.5, 1.4, 2.6, 6), '#b58a55'); cork.position.y = 12; g.add(cork);
  const note = mesh(new T.CylinderGeometry(1.8, 1.8, 8, 6), '#efe4c8'); g.add(note);
  g.rotation.z = 1.35; return g;
}
const B = {obj:bottleModel(), on:false, x:0, y:0, life:0};
B.obj.visible = false; scene.add(B.obj);
export const bottle = B;
function spawnBottle(){
  const S = G.S;
  for (let k=0;k<12;k++){ const a = S.a + (Math.random() - .5)*1.6, d = BOTTLES.dist[0] + Math.random()*(BOTTLES.dist[1] - BOTTLES.dist[0]);
    const x = S.x + Math.cos(a)*d, y = S.y + Math.sin(a)*d;
    if (x < 100 || y < 100 || x > WORLD - 100 || y > WORLD - 100 || landDist(x, y) < 80) continue;
    Object.assign(B, {on:true, x, y, life:BOTTLES.life}); B.obj.visible = true; return; }
}
function openBottle(){
  const S = G.S, roll = Math.random();
  if (roll < BOTTLES.coins){ const c = 6 + Math.floor(Math.random()*13); S.gold += c; toast(`A message in a bottle, with ${c} gold coins rolled inside!`, 3.5); }
  else if (roll < BOTTLES.coins + BOTTLES.map && !S.treasure){
    for (let k=0;k<40;k++){ const a = Math.random()*6.28, d = 1500 + Math.random()*2200, x = S.x + Math.cos(a)*d, y = S.y + Math.sin(a)*d;
      if (x < 200 || y < 200 || x > WORLD - 200 || y > WORLD - 200 || landDist(x, y) < 150) continue;
      S.treasure = {x, y, gold:40 + Math.floor(Math.random()*50)}; toast('A treasure map in a bottle! The spot is marked with an X on your chart.', 5); break; }
    if (!S.treasure){ S.gold += 10; toast('A soggy map you can\'t read, and 10 gold coins.', 3.5); }
  } else toast(`A note in a bottle: "${BOTTLES.notes[Math.floor(Math.random()*BOTTLES.notes.length)]}"`, 6);
  save();
}

// ---- treasure: a little chest floating where the map's X is ----
function chestModel(){
  const g = new T.Group();
  const box = mesh(new T.BoxGeometry(14, 9, 10), '#8a5a30'); box.position.y = 2; g.add(box);
  const lid = mesh(new T.CylinderGeometry(5, 5, 14, 8, 1, false, 0, Math.PI), '#9b6b3a'); lid.rotation.z = Math.PI/2; lid.position.y = 6.5; g.add(lid);
  const band = mesh(new T.BoxGeometry(2.2, 12, 10.6), '#dcb453'); band.position.y = 4; g.add(band);
  return g;
}
const chest = chestModel(); chest.visible = false; scene.add(chest);

let checkT = 0;
export function updateQuests(dt){
  const S = G.S;
  // bottles drift by now and then while you sail
  if (!B.on){ if (!G.sheetOpen && !G.dock && G.v > 30){ S.bottleT = (S.bottleT ?? BOTTLES.first) - dt; if (S.bottleT <= 0){ spawnBottle(); S.bottleT = BOTTLES.every[0] + Math.random()*(BOTTLES.every[1] - BOTTLES.every[0]); } } }
  else {
    B.life -= dt; B.obj.position.set(B.x, waveAt(B.x, B.y, G.t) + 1.5, B.y); B.obj.rotation.y += dt*.4;
    if (Math.hypot(B.x - S.x, B.y - S.y) < 55 + ship().beam/2){ B.on = false; B.obj.visible = false; openBottle(); }
    else if (B.life <= 0){ B.on = false; B.obj.visible = false; }
  }
  // treasure
  const tr = S.treasure, near = tr && Math.hypot(tr.x - S.x, tr.y - S.y);
  chest.visible = !!tr && near < 1400;
  if (chest.visible){ chest.position.set(tr.x, waveAt(tr.x, tr.y, G.t) + 1, tr.y); chest.rotation.y += dt*.5;
    if (near < 70){ S.gold += tr.gold; toast(`You found the treasure: ${tr.gold} gold!`, 4); S.treasure = null; chest.visible = false; save(); } }
  // visits
  checkT += dt; if (checkT < .5) return; checkT = 0;
  for (const r of [...active()]) if (r.t === 'visit'){ const is = ISLANDS.find(i => i.name === r.to); if (is && Math.hypot(is.x - S.x, is.y - S.y) < is.r + 450) finish(r); }
}
// Test / builder tool: a bottle right now.
document.addEventListener('bottle', () => { const S = G.S; Object.assign(B, {on:true, x:S.x + Math.cos(S.a)*200, y:S.y + Math.sin(S.a)*200, life:BOTTLES.life}); B.obj.visible = true; });
