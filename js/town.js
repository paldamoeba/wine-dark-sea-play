// Townspeople: little hopping figures (no arms or legs) who wander the harbor towns.
// They pop up one after another when you sail close, and pop away again before the town leaves the screen.
import {rng} from './world.js?v=34a2ac7';
import {G} from './state.js?v=34a2ac7';
import {mat, beanGeo, cuteHead} from './ships.js?v=34a2ac7';

const T = window.THREE;
const COLORS = ['#cf9035', '#3f6c94', '#ece2cb', '#c64a3c', '#71873f', '#5c3470'];
const HOP_TIME = .42, HOP_H = 6, SHOW_D = 430, HIDE_D = 520;

export function figure(color){
  const g = new T.Group(), inner = new T.Group(); g.add(inner);
  const body = new T.Mesh(beanGeo(6.8), mat(color)); body.castShadow = true; body.scale.set(.85, 1, .85); inner.add(body);
  cuteHead(inner, 8.9);
  g.userData.inner = inner; g.scale.setScalar(.001); g.visible = false; return g;
}
// A springy pop: overshoots a little, then settles.
const easeOutBack = t => { const c = 1.9; return 1 + (c + 1)*Math.pow(t - 1, 3) + c*Math.pow(t - 1, 2); };

const towns = [];
// Called by entities.js once the island groups exist. area = where people may walk: within R of (cx, cz), where ok(x, z), away from houses.
export function addTown(is, group, top, houses, count, area){
  const R = rng(Math.round(is.x*7 + is.y)), people = [];
  const free = (x, z) => Math.hypot(x - area.cx, z - area.cz) < area.R && area.ok(x, z) && houses.every(([hx, hz]) => Math.hypot(hx - x, hz - z) > 17);
  const spot = () => { for (let k=0;k<40;k++){ const a = R()*6.28, d = area.R*Math.sqrt(R()), x = area.cx + Math.cos(a)*d, z = area.cz + Math.sin(a)*d; if (free(x, z)) return [x, z]; } return [area.cx, area.cz]; };
  for (let i=0;i<count;i++){
    const f = figure(COLORS[i % COLORS.length]), [x, z] = spot();
    f.position.set(x, top, z); group.add(f);
    people.push({f, x, z, goal:spot(), hop:null, rest:R()*2, k:0, delay:i*.07});
  }
  towns.push({is, people, shown:false, t:0, spot, free});
}

export function updateTowns(dt){
  const z = G.settings.dev.zoom;
  for (const town of towns){
    const d = Math.hypot(G.cam.x - town.is.x, G.cam.y - town.is.y), pad = Math.min(town.is.r*.5, 200);
    if (!town.shown && d < SHOW_D*z + pad){ town.shown = true; town.t = 0; }
    else if (town.shown && d > HIDE_D*z + pad){ town.shown = false; town.t = 0; }
    town.t += dt;
    for (const p of town.people){
      // pop in or out, one after another
      const local = town.t - p.delay*(town.shown ? 1 : .5);
      if (town.shown){ p.k = local <= 0 ? 0 : local >= .45 ? 1 : easeOutBack(local/.45); }
      else if (p.k > 0){ p.k = local <= 0 ? p.k : Math.max(0, p.k - dt*5); }
      p.f.visible = p.k > .01; if (!p.f.visible) continue;
      p.f.scale.setScalar(Math.max(.001, p.k));
      hop(p, town, dt);
    }
  }
}

function hop(p, town, dt){
  const inner = p.f.userData.inner;
  if (!p.hop){
    p.rest -= dt;
    if (p.rest > 0) return;
    let [gx, gz] = p.goal; if (Math.hypot(gx - p.x, gz - p.z) < 8){ p.goal = town.spot(); [gx, gz] = p.goal; }
    const a = Math.atan2(gz - p.z, gx - p.x), step = 9 + Math.random()*6;
    const nx = p.x + Math.cos(a)*step, nz = p.z + Math.sin(a)*step;
    if (!town.free(nx, nz)){ p.goal = town.spot(); p.rest = .2; return; }
    p.hop = {x0:p.x, z0:p.z, x1:nx, z1:nz, t:0}; p.f.rotation.y = -a + Math.PI/2;
  }
  const h = p.hop; h.t += dt/HOP_TIME;
  const t = Math.min(1, h.t);
  p.x = h.x0 + (h.x1 - h.x0)*t; p.z = h.z0 + (h.z1 - h.z0)*t;
  p.f.position.x = p.x; p.f.position.z = p.z;
  inner.position.y = Math.sin(t*Math.PI)*HOP_H;
  const s = t < .15 ? 1 - (.15 - t)*1.6 : t > .85 ? 1 - (t - .85)*1.6 : 1.08; // crouch, stretch in the air, crouch
  inner.scale.set(1/Math.sqrt(s), s, 1/Math.sqrt(s));
  if (h.t >= 1){ p.hop = null; inner.position.y = 0; inner.scale.set(1, 1, 1); p.rest = Math.random() < .3 ? .8 + Math.random()*2 : .08 + Math.random()*.25; }
}
