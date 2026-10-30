// Renderer, camera, lights, water and weather.
import {QUALITY} from './config.js';
import {seaInfo, waveH, sstep, landDist} from './world.js';
import {G} from './state.js';
import {mat} from './ships.js';

const T = window.THREE;
export const canvas = document.getElementById('cv');
export const renderer = new T.WebGLRenderer({canvas, antialias:true});
renderer.shadowMap.type = T.PCFSoftShadowMap;
export const scene = new T.Scene();
const SKY = new T.Color('#a9c9cf'), STORMSKY = new T.Color('#46525c');
scene.background = SKY.clone();
scene.fog = new T.Fog(SKY.clone(), 1000, 2300);
export const camera = new T.PerspectiveCamera(38, 1, 10, 6000);
const hemi = new T.HemisphereLight(0xe6f0f2, 0x7d8670, .62); scene.add(hemi);
const sun = new T.DirectionalLight(0xffe6c4, .64);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {left:-520, right:520, top:520, bottom:-520, near:10, far:2200});
sun.shadow.bias = -.0015; scene.add(sun, sun.target);

export const view = {W:innerWidth, H:innerHeight, DPR:1};
let quality = QUALITY.high;

export function resize(){
  view.DPR = Math.min(quality.dpr, devicePixelRatio || 1); view.W = innerWidth; view.H = innerHeight;
  renderer.setPixelRatio(view.DPR); renderer.setSize(view.W, view.H, false);
  camera.aspect = view.W/view.H; camera.updateProjectionMatrix();
}

// ---- water: a wavy tile that follows the camera ----
const WS = 2800;
let water = null, wgeo = null, wbase = null, WN = 0, waterSize = WS;
function buildWater(seg){
  if (water){ scene.remove(water); wgeo.dispose(); }
  WN = seg; waterSize = WS * zoomBucket(G.settings.dev.zoom);
  wgeo = new T.PlaneGeometry(waterSize, waterSize, WN, WN); wgeo.rotateX(-Math.PI/2);
  wbase = wgeo.attributes.position.array.slice();
  wgeo.setAttribute('color', new T.BufferAttribute(new Float32Array(wgeo.attributes.position.count*3), 3));
  water = new T.Mesh(wgeo, mat('#ffffff', {vertexColors:true}));
  water.receiveShadow = true; scene.add(water);
}
const CSH = new T.Color('#2b8e8f'), CSEA = new T.Color('#175c7c'), CST = new T.Color('#1f3344'), CLAG = new T.Color('#5cc2b2'), tmpC = new T.Color();
export function updateWater(){
  const step = waterSize/WN, ox = Math.round(G.cam.x/step)*step, oz = Math.round(G.cam.y/step)*step;
  water.position.set(ox, 0, oz);
  const p = wgeo.attributes.position.array, c = wgeo.attributes.color.array;
  for (let i=0;i<p.length;i+=3){
    const x = wbase[i] + ox, z = wbase[i+2] + oz, s = seaInfo(x, z);
    p[i+1] = waveH(x, z, s.amp, G.t);
    tmpC.copy(CSH).lerp(CSEA, s.k0).lerp(CST, s.k1);
    const ld = landDist(x, z); if (ld < 110) tmpC.lerp(CLAG, sstep(110, 0, ld)*.85); // light lagoon water near every shore
    c[i] = tmpC.r; c[i+1] = tmpC.g; c[i+2] = tmpC.b;
  }
  wgeo.attributes.position.needsUpdate = true; wgeo.attributes.color.needsUpdate = true; wgeo.computeVertexNormals();
}

// Builder zoom: grows the water tile, fog and shadow area to match how far out the camera is.
const zoomBucket = z => Math.ceil(Math.max(1, z)*2)/2; // rebuild the water only in half steps
let lastZoom = 1;
export function applyZoom(){
  const z = G.settings.dev.zoom, s = 520*Math.max(1, z);
  Object.assign(sun.shadow.camera, {left:-s, right:s, top:s, bottom:-s, far:2200*Math.max(1, z)}); sun.shadow.camera.updateProjectionMatrix();
  camera.far = 6000*Math.max(1, z); camera.updateProjectionMatrix();
  if (zoomBucket(z) !== zoomBucket(lastZoom)) buildWater(quality.waterSeg);
  lastZoom = z;
}

export function applyQuality(name){
  quality = QUALITY[name] || QUALITY.high;
  renderer.shadowMap.enabled = quality.shadows;
  sun.castShadow = quality.shadows;
  scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  buildWater(quality.waterSeg);
  resize();
}

// ---- camera + weather ----
const V = new T.Vector3();
export function updateCamera(){
  const dist = (view.H > view.W ? 740 : 600) * G.settings.dev.zoom;
  V.set(1, 1.6, 1).normalize().multiplyScalar(dist);
  camera.position.set(G.cam.x + V.x, V.y, G.cam.y + V.z); camera.lookAt(G.cam.x, 0, G.cam.y);
  sun.position.set(G.cam.x - 420, 900, G.cam.y + 160); sun.target.position.set(G.cam.x, 0, G.cam.y);
}
export function updateWeather(){
  const k = G.stormK;
  scene.fog.color.copy(SKY).lerp(STORMSKY, k); scene.background.copy(scene.fog.color);
  const z = G.settings.dev.zoom;
  scene.fog.near = (1000 - k*550)*z; scene.fog.far = (2300 - k*1000)*z;
  sun.intensity = .64 - k*.42 + G.flash*.8; hemi.intensity = .62 - k*.22 + G.flash*.6;
}

// World point -> screen pixels (for labels drawn on the 2D overlay).
export function project(x, y, z){ V.set(x, y, z).project(camera); return [(V.x+1)/2*view.W, (1-V.y)/2*view.H, V.z]; }

const ray = new T.Raycaster(), seaPlane = new T.Plane(new T.Vector3(0,1,0), 0), hit = new T.Vector3();
// Screen pixels -> point on the sea, or null.
export function screenToSea(sx, sy){
  ray.setFromCamera({x: sx/view.W*2-1, y: -(sy/view.H*2-1)}, camera);
  return ray.ray.intersectPlane(seaPlane, hit) ? {x:hit.x, y:hit.z} : null;
}
