// Fire and smoke on badly damaged ships. Starts below FIRE_AT of the hull and grows as the hull drops.
import {smokeColumn} from './smoke.js?v=e5e6be6';
const T = window.THREE;
export const FIRE_AT = .4;

// a soft teardrop: round at the bottom, pointed at the top
const flameGeo = new T.LatheGeometry([0, .55, .9, 1, .85, .55, .25, 0].map((r, i) => new T.Vector2(r, i*.36)), 12);
const emberGeo = new T.SphereGeometry(.6, 5, 4);
const EMBER = new T.MeshBasicMaterial({color:'#ffb347', transparent:true});
const OUTER = new T.MeshBasicMaterial({color:'#ef6a2a', transparent:true, opacity:.8, depthWrite:false}), INNER = new T.MeshBasicMaterial({color:'#ffd35a', transparent:true});

// len, beam, deck = the ship's length, width and deck height. Flames sit along the deck.
export function makeFire(len, beam, deck){
  const g = new T.Group(), flames = [], smoke = [];
  const n = len > 100 ? 4 : len > 55 ? 3 : 2, s = Math.min(6, 2.2 + beam*.13);
  for (let i=0;i<n;i++){
    const f = new T.Group(), o = new T.Mesh(flameGeo, OUTER), c = new T.Mesh(flameGeo, INNER);
    o.renderOrder = 5; c.renderOrder = 6; c.scale.setScalar(.6); c.position.y = .15; f.add(o, c); // P72: always in front of the smoke
    f.position.set((i/(n - 1 || 1) - .5)*len*.6, deck, (i % 2 ? 1 : -1)*beam*.15);
    f.userData = {s, ph:i*1.7}; g.add(f); flames.push(f);
  }
  // one thick, swaying column of smoke per flame: dark at the bottom, turning soft grey as it rises and spreads
  const SIZES = [1, .62, 1.3, .8]; // one big column, smaller ones beside it
  for (let i=0;i<n;i++){ const k = SIZES[i % SIZES.length];
    const m = smokeColumn({h:(110 + len*.35)*(.7 + k*.3), r0:(2.5 + beam*.08)*k, r1:(13 + beam*.35)*k, sway:8 + k*4, base:'#3b393d', top:'#a9a6a8', alpha:.88, speed:1.1 + (1 - k)*.5, lean:1.3});
    m.userData.from = flames[i]; g.add(m); smoke.push(m);
  }
  const embers = []; for (let i=0;i<n*3;i++){ const e = new T.Mesh(emberGeo, EMBER); e.renderOrder = 5; e.userData = {ph:Math.random(), from:flames[i % n], dx:(Math.random() - .5)*20, dz:(Math.random() - .5)*20}; g.add(e); embers.push(e); }
  g.userData = {flames, smoke, embers}; g.visible = false;
  return g;
}

// k = 0 (no fire) to 1 (blazing). P67: a fire now starts small and grows: flames swell up over a couple of seconds, and each column
// of smoke begins at the deck and climbs into the sky over several seconds, instead of being there all at once.
const SMOKE_CLIMB = 8; // seconds for a new column to reach full height
export function updateFire(g, k, t){
  if (!g) return;
  const u = g.userData, dt = Math.max(0, Math.min(.1, t - (u.t ?? t))); u.t = t;
  u.k = (u.k || 0) + (k - (u.k || 0))*Math.min(1, dt*(k > (u.k || 0) ? .7 : .5)); // eases toward the real value
  if (k <= 0 && u.k < .012){ u.k = 0; g.visible = false; u.flames.forEach(f => { f.userData.grow = 0; }); u.smoke.forEach(m => { m.userData.rise = 0; }); return; }
  g.visible = true; const K = u.k, {flames, smoke, embers} = u;
  flames.forEach((f, i) => {
    const on = K > .015 + i/flames.length*.7, d = f.userData; d.grow = Math.max(0, Math.min(1, (d.grow || 0) + (on ? dt/2.2 : -dt/1.5))); f.visible = d.grow > 0; if (!f.visible) return;
    const fl = 1 + Math.sin(t*6 + d.ph)*.12 + Math.sin(t*9.5 + d.ph*2)*.06, /* P72: calmer, so it dances instead of blinking */ sz = d.s*(.6 + K*.7)*d.grow;
    f.scale.set(sz*(.85 - (fl - 1)*.5), sz*fl*1.9, sz*(.85 - (fl - 1)*.5));
    f.rotation.y = t*2 + d.ph;
  });
  smoke.forEach(m => {
    const f = m.userData.from, d = m.userData; d.rise = f.visible ? Math.min(1.25, (d.rise || 0) + dt/SMOKE_CLIMB) : d.rise || 0; if (!f.visible && K < .03) d.rise = 0;
    m.visible = d.rise > 0;
    m.position.set(f.position.x, f.position.y + 3, f.position.z);
    const sc = .55 + K*.55, un = m.material.uniforms; m.scale.set(sc, .6 + K*.4, sc); un.uAlpha.value = .88*Math.min(1, K*3.5)*(f.visible ? 1 : Math.min(1, K*6)); un.uRise.value = d.rise;
  });
  embers.forEach(e => {
    const d = e.userData, p = (t*.7 + d.ph) % 1, f = d.from;
    e.visible = f.visible && K > .3;
    e.position.set(f.position.x + d.dx*p, f.position.y + 4 + p*50, f.position.z + d.dz*p); e.scale.setScalar(1.2*(1 - p) + .2);
  });
}
// How much a ship is burning, from its hull points.
export const burn = (hull, max) => hull <= 0 ? 1 : Math.max(0, Math.min(1, (FIRE_AT - hull/max)/FIRE_AT*1.4 + .15*(hull/max < FIRE_AT)));
