// Portraits: real pictures of the 3D models for the menus. One small hidden renderer draws a model once and keeps the
// picture, so the shipyard shows the same ships you sail, in their own paint, instead of drawings.
import {buildShip, SPECS, mat} from './ships.js?v=d4d0ac7';

const T = window.THREE;
const W = 480, H = 300;
let R = null, scene, cam;
const cache = new Map();

function setup(){
  R = new T.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
  R.setSize(W, H, false); R.setPixelRatio(1); R.setClearColor(0x000000, 0);
  scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xeaf3f5, 0x8c927c, .85));
  const sun = new T.DirectionalLight(0xffeccc, .7); sun.position.set(-120, 260, 200); scene.add(sun);
  const fill = new T.DirectionalLight(0xcfe3ff, .3); fill.position.set(200, 120, -180); scene.add(fill);
  cam = new T.PerspectiveCamera(26, W/H, 1, 5000);
}

// Fit the camera to the object: a three-quarter view from the front and above, like the shipyard art page.
function shoot(obj, yaw = -1.08, pitch = .4){
  scene.add(obj);
  const box = new T.Box3().setFromObject(obj), c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
  const r = Math.max(size.x, size.y*1.25, size.z)*.5;
  const d = r/Math.tan(cam.fov*Math.PI/360)*.9 + r*.5;
  cam.position.set(c.x + Math.cos(yaw)*Math.cos(pitch)*d, c.y + Math.sin(pitch)*d, c.z + Math.sin(yaw)*Math.cos(pitch)*d);
  cam.lookAt(c); R.render(scene, cam); R.render(scene, cam); // twice: the first draw can come out before the shading is ready
  const url = R.domElement.toDataURL('image/png');
  scene.remove(obj); return url;
}

// A picture of any ship model with its look. Cached by model and look.
export function shipPortrait(model, look = {}){
  const key = model + JSON.stringify(look);
  if (cache.has(key)) return cache.get(key);
  let url = '';
  try {
    if (!R) setup();
    const obj = buildShip(model, look, true);
    url = shoot(obj);
  } catch (e) { url = ''; }
  cache.set(key, url); return url;
}
// Any other model (a fort, a statue) for the art page and later menus.
export function portrait(key, make, yaw, pitch){
  if (cache.has(key)) return cache.get(key);
  let url = ''; try { if (!R) setup(); url = shoot(make(), yaw, pitch); } catch (e) { url = ''; }
  cache.set(key, url); return url;
}
export const hasModel = m => !!SPECS[m];

// ---- tutorial pictures: real renders of the game's boat on the sea, seen like in the game ----
// The picture is 280 x 140 "screen units". Things are placed by screen position so the drawn hints (finger, arrows) line up.
import {cypress} from './models.js?v=d4d0ac7';
const TW = 560, TH = 280, K = .75, PITCH = 1.0; // world units per screen unit, camera tilt
export function tutShot(kind, boats, isle){
  const key = 'tut' + kind; if (cache.has(key)) return cache.get(key);
  let url = '';
  try {
    if (!R) setup();
    const sc = new T.Scene();
    sc.add(new T.HemisphereLight(0xeaf3f5, 0x8c927c, .85));
    const sun = new T.DirectionalLight(0xffeccc, .7); sun.position.set(-120, 260, 160); sc.add(sun);
    const at = (sx, sy) => ({x:(sx - 140)*K, z:(sy - 70)*K/Math.sin(PITCH)});
    // the sea is the clear color, so every picture has the same blue
    if (isle){ const p = at(isle[0], isle[1]), r = isle[2]*K;
      const sh = new T.Mesh(new T.CircleGeometry(r*1.6, 40), mat('#2c8088')); sh.rotation.x = -Math.PI/2; sh.position.set(p.x, .5, p.z); sh.scale.y = 1; sc.add(sh);
      const sand = new T.Mesh(new T.CylinderGeometry(r, r*1.08, 4, 32), mat('#d8c48c')); sand.position.set(p.x, 1, p.z); sc.add(sand);
      const grass = new T.Mesh(new T.CylinderGeometry(r*.72, r*.8, 7, 32), mat('#6d7d38')); grass.position.set(p.x, 3, p.z); sc.add(grass);
      for (const [dx, dz] of [[-.25, -.1], [.15, -.25], [.2, .15]]){ const c = cypress(); c.scale.setScalar(.8); c.position.set(p.x + dx*r, 6, p.z + dz*r); sc.add(c); } }
    const foam = new T.MeshBasicMaterial({color:'#f4fbff', transparent:true, opacity:.55, depthWrite:false});
    for (const [model, sx, sy, rot] of boats){ const b = buildShip(model, {}, true), p = at(sx, sy), L = SPECS[model].L;
      b.position.set(p.x, 0, p.z); b.rotation.y = -rot*Math.PI/180; sc.add(b);
      // the wake: two foam trails spreading out behind the stern
      for (const sg of [1, -1]){ const w = new T.Mesh(new T.PlaneGeometry(L*1.3, 2.4), foam); w.rotation.x = -Math.PI/2; w.rotation.z = sg*.2;
        w.position.set(-L*.5 - L*.6, .6, sg*L*.14); b.add(w); } }
    const cam = new T.OrthographicCamera(-140*K, 140*K, 70*K, -70*K, 1, 3000);
    cam.position.set(0, Math.sin(PITCH)*800, Math.cos(PITCH)*800); cam.lookAt(0, 0, 0);
    R.setSize(TW, TH, false); R.setClearColor(0x2f86a0, 1); R.render(sc, cam); R.render(sc, cam);
    url = R.domElement.toDataURL('image/png');
    R.setSize(W, H, false); R.setClearColor(0x000000, 0);
  } catch (e) { url = ''; }
  cache.set(key, url); return url;
}
