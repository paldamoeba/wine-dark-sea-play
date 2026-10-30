// Fire and smoke on badly damaged ships. Starts below FIRE_AT of the hull and grows as the hull drops.
const T = window.THREE;
export const FIRE_AT = .4;

// a soft teardrop: round at the bottom, pointed at the top
const flameGeo = new T.LatheGeometry([0, .55, .9, 1, .85, .55, .25, 0].map((r, i) => new T.Vector2(r, i*.36)), 8);
const smokeGeo = new T.SphereGeometry(1, 7, 5);
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
  for (let i=0;i<6;i++){
    const m = new T.Mesh(smokeGeo, new T.MeshBasicMaterial({color:'#3a383c', transparent:true, opacity:.6, depthWrite:false}));
    m.userData = {ph:i/6, from:flames[i % n]}; g.add(m); smoke.push(m);
  }
  g.userData = {flames, smoke}; g.visible = false;
  return g;
}

// k = 0 (no fire) to 1 (blazing).
export function updateFire(g, k, t){
  if (!g) return;
  g.visible = k > 0; if (!g.visible) return;
  const {flames, smoke} = g.userData;
  flames.forEach((f, i) => {
    const on = k > i/flames.length*.8; f.visible = on; if (!on) return;
    const u = f.userData, fl = 1 + Math.sin(t*13 + u.ph)*.18 + Math.sin(t*21 + u.ph*2)*.1, sz = u.s*(.6 + k*.7);
    f.scale.set(sz*(.85 - (fl - 1)*.5), sz*fl*1.9, sz*(.85 - (fl - 1)*.5));
    f.rotation.y = t*2 + u.ph;
  });
  smoke.forEach((m, i) => {
    const u = m.userData, p = (t*.35 + u.ph) % 1, f = u.from;
    m.visible = f.visible && k > .15;
    m.position.set(f.position.x + p*14 + Math.sin(i + t)*3, f.position.y + 10 + p*70, f.position.z + p*6);
    m.scale.setScalar((3.5 + p*11)*(.6 + k*.5)); m.material.opacity = .6*(1 - p)*Math.min(1, k*2);
  });
}
// How much a ship is burning, from its hull points.
export const burn = (hull, max) => hull <= 0 ? 1 : Math.max(0, Math.min(1, (FIRE_AT - hull/max)/FIRE_AT*1.4 + .15*(hull/max < FIRE_AT)));
