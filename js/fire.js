// Fire and smoke on badly damaged ships. Starts below FIRE_AT of the hull and grows as the hull drops.
import {smokeColumn} from './smoke.js?v=ef9eba3';
const T = window.THREE;
export const FIRE_AT = .4;

// a soft teardrop: round at the bottom, pointed at the top
const flameGeo = new T.LatheGeometry([0, .55, .9, 1, .85, .55, .25, 0].map((r, i) => new T.Vector2(r, i*.36)), 12);
const emberGeo = new T.SphereGeometry(.6, 5, 4);
const EMBER = new T.MeshBasicMaterial({color:'#ffb347'});
const OUTER = new T.MeshBasicMaterial({color:'#ef6a2a', transparent:true, opacity:.8, depthWrite:false}), INNER = new T.MeshBasicMaterial({color:'#ffd35a'});

// len, beam, deck = the ship's length, width and deck height. Flames sit along the deck.
export function makeFire(len, beam, deck){
  const g = new T.Group(), flames = [], smoke = [];
  const n = len > 100 ? 4 : len > 55 ? 3 : 2, s = Math.min(6, 2.2 + beam*.13);
  for (let i=0;i<n;i++){
    const f = new T.Group(), o = new T.Mesh(flameGeo, OUTER), c = new T.Mesh(flameGeo, INNER);
    c.scale.setScalar(.6); c.position.y = .15; f.add(o, c);
    f.position.set((i/(n - 1 || 1) - .5)*len*.6, deck, (i % 2 ? 1 : -1)*beam*.15);
    f.userData = {s, ph:i*1.7}; g.add(f); flames.push(f);
  }
  // one thick, swaying column of smoke per flame: dark at the bottom, turning soft grey as it rises and spreads
  for (let i=0;i<n;i++){
    const m = smokeColumn({h:110 + len*.35, r0:2.5 + beam*.08, r1:13 + beam*.35, sway:11, base:'#3b393d', top:'#a9a6a8', alpha:.88, speed:1.25, lean:1.3});
    m.userData.from = flames[i]; g.add(m); smoke.push(m);
  }
  const embers = []; for (let i=0;i<n*3;i++){ const e = new T.Mesh(emberGeo, EMBER); e.userData = {ph:Math.random(), from:flames[i % n], dx:(Math.random() - .5)*20, dz:(Math.random() - .5)*20}; g.add(e); embers.push(e); }
  g.userData = {flames, smoke, embers}; g.visible = false;
  return g;
}

// k = 0 (no fire) to 1 (blazing).
export function updateFire(g, k, t){
  if (!g) return;
  g.visible = k > 0; if (!g.visible) return;
  const {flames, smoke, embers} = g.userData;
  flames.forEach((f, i) => {
    const on = k > i/flames.length*.8; f.visible = on; if (!on) return;
    const u = f.userData, fl = 1 + Math.sin(t*13 + u.ph)*.18 + Math.sin(t*21 + u.ph*2)*.1, sz = u.s*(.6 + k*.7);
    f.scale.set(sz*(.85 - (fl - 1)*.5), sz*fl*1.9, sz*(.85 - (fl - 1)*.5));
    f.rotation.y = t*2 + u.ph;
  });
  smoke.forEach(m => {
    const f = m.userData.from; m.visible = f.visible && k > .1;
    m.position.set(f.position.x, f.position.y + 3, f.position.z);
    const sc = .55 + k*.55; m.scale.set(sc, .6 + k*.4, sc); m.material.uniforms.uAlpha.value = .88*Math.min(1, (k - .1)*3);
  });
  embers.forEach(e => {
    const u = e.userData, p = (t*.7 + u.ph) % 1, f = u.from;
    e.visible = f.visible && k > .3;
    e.position.set(f.position.x + u.dx*p, f.position.y + 4 + p*50, f.position.z + u.dz*p); e.scale.setScalar(1.2*(1 - p) + .2);
  });
}
// How much a ship is burning, from its hull points.
export const burn = (hull, max) => hull <= 0 ? 1 : Math.max(0, Math.min(1, (FIRE_AT - hull/max)/FIRE_AT*1.4 + .15*(hull/max < FIRE_AT)));
