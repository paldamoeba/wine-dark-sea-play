// Portraits: real pictures of the 3D models for the menus. One small hidden renderer draws a model once and keeps the
// picture, so the shipyard shows the same ships you sail, in their own paint, instead of drawings.
import {buildShip, SPECS} from './ships.js';

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
  cam.lookAt(c); R.render(scene, cam);
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
