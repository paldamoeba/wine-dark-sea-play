// Clouds: soft white puffs drifting between the camera and the sea. A few on fair days, many in mist (instead of one white
// fog over everything), grey in storms. They wrap around the camera so there are always some nearby.
import {G} from './state.js';
import {scene, camera} from './scene.js';

const T = window.THREE;
const N = 22, R = 1100;
// P50: each puff is a soft round sprite (a blurred white disc that always faces the camera), not a faceted ball,
// so there are no hard edges or stacked see-through facets
const puffTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new T.CanvasTexture(c); return t; })();
const clouds = Array.from({length:N}, (_, i) => {
  const m = new T.SpriteMaterial({map:puffTex, color:'#ffffff', transparent:true, opacity:0, depthWrite:false, fog:false});
  const g = new T.Group(), n = 4 + (i % 3);
  for (let k=0;k<n;k++){ const b = new T.Sprite(m); const r = 70 + Math.random()*70; b.scale.set(r*1.6, r, 1);
    b.position.set((k - n/2)*55 + Math.random()*20, Math.random()*18, (Math.random() - .5)*60); g.add(b); }
  g.rotation.y = Math.random()*6.28; g.userData = {m, x:(Math.random() - .5)*2*R, z:(Math.random() - .5)*2*R, y:.4 + Math.random()*.2, rank:Math.random()};
  scene.add(g); return g;
});
const WANT = {fair:.3, calm:.18, windy:.45, storm:.7, mist:1};
const WHITE = new T.Color('#ffffff'), GREY = new T.Color('#8c97a0');
export const CLOUDS = clouds;
const V = new T.Vector3();
export function updateClouds(dt, kind){
  const want = WANT[kind] ?? .3, wind = kind === 'windy' || kind === 'storm' ? 40 : 14, cx = G.cam.x, cz = G.cam.y;
  for (const c of clouds){ const u = c.userData;
    u.x += wind*dt; u.z += wind*.4*dt;
    // wrap around the camera
    if (u.x - cx > R) u.x -= 2*R; if (u.x - cx < -R) u.x += 2*R; if (u.z - cz > R) u.z -= 2*R; if (u.z - cz < -R) u.z += 2*R;
    // at a fraction of the camera's height, slide toward the camera so the cloud sits over the sea you're looking at
    c.position.set(u.x + (camera.position.x - cx)*u.y, camera.position.y*u.y, u.z + (camera.position.z - cz)*u.y); c.scale.setScalar(camera.position.y/950); // always partway between the camera and the sea
    // P60: clouds only drift along the edges of the screen. Measured where the cloud actually shows on screen (it sits between
    // the camera and the sea, so a cloud far out on the sea can still hang right in front of the view and wash it all out white).
    V.copy(c.position).project(camera); const sd = Math.hypot(V.x, V.y*1.3);
    const clear = V.z > 1 ? 0 : Math.min(1, Math.max(0, (sd - .55)/.45));
    const target = u.rank < want ? (kind === 'mist' ? .3 : .32)*clear : 0;
    u.m.opacity += (target - u.m.opacity)*Math.min(1, dt*.4);
    u.m.color.copy(WHITE).lerp(GREY, G.stormK || 0).multiplyScalar(1 - .72*(G.night || 0)); // dark at night, so they don't glow
    c.visible = u.m.opacity > .01;
  }
}
