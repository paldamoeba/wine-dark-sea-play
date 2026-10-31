// Clouds: soft white puffs drifting between the camera and the sea. A few on fair days, many in mist (instead of one white
// fog over everything), grey in storms. They wrap around the camera so there are always some nearby.
import {G} from './state.js?v=8abf047';
import {scene, camera} from './scene.js?v=8abf047';

const T = window.THREE;
const N = 22, R = 1100;
const ball = new T.IcosahedronGeometry(1, 1);
const clouds = Array.from({length:N}, (_, i) => {
  const m = new T.MeshBasicMaterial({color:'#ffffff', transparent:true, opacity:0, depthWrite:false, fog:false});
  const g = new T.Group(), n = 4 + (i % 3);
  for (let k=0;k<n;k++){ const b = new T.Mesh(ball, m); const r = 40 + Math.random()*45; b.scale.set(r*1.4, r*.55, r);
    b.position.set((k - n/2)*55 + Math.random()*20, Math.random()*18, (Math.random() - .5)*60); g.add(b); }
  g.rotation.y = Math.random()*6.28; g.userData = {m, x:(Math.random() - .5)*2*R, z:(Math.random() - .5)*2*R, y:.4 + Math.random()*.2, rank:Math.random()};
  scene.add(g); return g;
});
const WANT = {fair:.3, calm:.18, windy:.45, storm:.7, mist:1};
const WHITE = new T.Color('#ffffff'), GREY = new T.Color('#8c97a0');
export const CLOUDS = clouds;
export function updateClouds(dt, kind){
  const want = WANT[kind] ?? .3, wind = kind === 'windy' || kind === 'storm' ? 40 : 14, cx = G.cam.x, cz = G.cam.y;
  for (const c of clouds){ const u = c.userData;
    u.x += wind*dt; u.z += wind*.4*dt;
    // wrap around the camera
    if (u.x - cx > R) u.x -= 2*R; if (u.x - cx < -R) u.x += 2*R; if (u.z - cz > R) u.z -= 2*R; if (u.z - cz < -R) u.z += 2*R;
    // at a fraction of the camera's height, slide toward the camera so the cloud sits over the sea you're looking at
    c.position.set(u.x + (camera.position.x - cx)*u.y, camera.position.y*u.y, u.z + (camera.position.z - cz)*u.y); c.scale.setScalar(camera.position.y/950); // always partway between the camera and the sea
    // clouds thin out right over your boat so they never hide it
    const clear = Math.min(1, Math.max(0, (Math.hypot(u.x - cx, u.z - cz) - 260)/320));
    const target = u.rank < want ? (kind === 'mist' ? .42 : .55)*clear : 0;
    u.m.opacity += (target - u.m.opacity)*Math.min(1, dt*.4);
    u.m.color.copy(WHITE).lerp(GREY, G.stormK || 0);
    c.visible = u.m.opacity > .01;
  }
}
