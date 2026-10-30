// Renderer, camera, lights, water and weather.
import {QUALITY} from './config.js';
import {seaInfo, waveH, sstep, landDist, WEATHER_WAVES} from './world.js';
import {G} from './state.js';
import {mat} from './ships.js';

const T = window.THREE;
export const canvas = document.getElementById('cv');
export const renderer = new T.WebGLRenderer({canvas, antialias:true});
renderer.shadowMap.type = T.PCFSoftShadowMap;
export const scene = new T.Scene();
const SKY = new T.Color('#a9c9cf'), STORMSKY = new T.Color('#46525c'), MIST = new T.Color('#f1ede2');
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
  WN = seg; waterSize = WS * zoomBucket(viewZoom());
  wgeo = new T.PlaneGeometry(waterSize, waterSize, WN, WN); wgeo.rotateX(-Math.PI/2);
  wbase = wgeo.attributes.position.array.slice();
  wgeo.setAttribute('color', new T.BufferAttribute(new Float32Array(wgeo.attributes.position.count*3), 3));
  water = new T.Mesh(wgeo, waterMat);
  water.receiveShadow = true; scene.add(water);
}
// Two looks for the sea. Classic: deep teal. Bright (a setting, on by default): clear blue with white foam lines that drift
// and wobble, like a cartoon sea. The foam is drawn in the water's shader from a cell pattern on the world position.
const LOOKS = {classic:['#2b8e8f', '#175c7c', '#1b4a63', '#5cc2b2'], bright:['#35a6d8', '#1d72cc', '#1a5fb4', '#7fd3e2']};
const CSH = new T.Color(), CSEA = new T.Color(), CST = new T.Color(), CLAG = new T.Color(), tmpC = new T.Color();
const waterMat = mat('#ffffff', {vertexColors:true}).clone(); waterMat.gradientMap = mat('#ffffff').gradientMap;
const foamU = {uTime:{value:0}, uFoam:{value:0}, uSun:{value:new T.Vector3(0, 1, 0)}, uGlint:{value:1}, uStorm:{value:0}, uSky:{value:new T.Color()}, uWave:{value:1}};
waterMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, foamU);
  sh.vertexShader = 'varying vec3 vWorld;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorld = (modelMatrix*vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = `varying vec3 vWorld; uniform float uTime, uFoam, uGlint, uStorm, uWave; uniform vec3 uSun, uSky;
    vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p)*43758.5453); }
    float cells(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(float(x), float(y)), o = h2(i + g);
        o = .5 + .42*sin(uTime*.35 + 6.2831*o); float d = length(g + o - f); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return d2 - d1; }
    ` + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      vec2 q = vWorld.xz/125.; q += .32*vec2(sin(q.y*1.3 + uTime*.4), cos(q.x*1.1 - uTime*.3)); q += .1*vec2(sin(q.y*4.7 - uTime*.6), cos(q.x*4.3 + uTime*.5));
      float e = cells(q), line = 1. - smoothstep(.02, .055, e);
      float dist = length(vWorld.xz - cameraPosition.xz), fade = smoothstep(2300., 500., dist);
      // in storms and mist the foam dims to a teal line, so the sea gets darker and calmer to look at
      vec3 foamC = mix(vec3(.92, .98, 1.), vec3(.32, .62, .68), uStorm);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, foamC, line*uFoam*.85*fade*(1. - .45*uStorm));
      // big waves: a white line along each crest, so a rough sea shows separate rolling waves instead of a flat pool
      float cy = vWorld.y, crest = smoothstep(6.0, 6.5, cy)*(1. - smoothstep(6.7, 7.6, cy));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, foamC, crest*.5*smoothstep(2600., 700., dist));
      // rolling swells: long broken crest lines drifting across the sea, more of them when the wind is up
      vec2 sw = vWorld.xz; float along = dot(sw, vec2(.8, .6)), across = dot(sw, vec2(-.6, .8));
      float band = sin(along*.016 - uTime*.9 + sin(across*.004)*2.5 + sin(across*.021 + uTime*.3)*.9);
      float seg = smoothstep(.15, .6, sin(across*.011 + floor(along*.016/6.2831)*1.7) + .3*sin(across*.031));
      float swell = smoothstep(.962, .992, band)*seg*clamp(uWave - .45, 0., 1.)*fade;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, foamC, swell*.7*uFoam);
      // a little of the sky reflects off the water further away
      vec3 Vv = normalize(cameraPosition - vWorld); float fres = pow(1. - max(Vv.y, 0.), 3.);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uSky, fres*.35);
      // sunlight glinting off the little waves: a soft sheen toward the sun and bright twinkles inside it
      vec2 w = vWorld.xz;
      vec3 nrm = normalize(vec3(sin(w.x*.045 + uTime*1.7)*.16 + sin((w.x + w.y)*.11 - uTime*2.3)*.08, 1., cos(w.y*.05 - uTime*1.4)*.16 + sin((w.x - w.y)*.09 + uTime*2.1)*.08));
      vec3 V = normalize(cameraPosition - vWorld), Rf = reflect(-uSun, nrm);
      float sp = max(dot(Rf, V), 0.), sheen = pow(sp, 24.)*.1, twinkle = pow(sp, 260.)*.75;
      gl_FragColor.rgb += vec3(1., .96, .86)*(sheen + twinkle)*uGlint;`);
};
export function setSeaLook(bright){ const L = LOOKS[bright ? 'bright' : 'classic']; CSH.set(L[0]); CSEA.set(L[1]); CST.set(L[2]); CLAG.set(L[3]); foamU.uFoam.value = bright ? 1 : 0; SKY.set(bright ? '#b8def0' : '#a9c9cf'); }
setSeaLook(!G.settings || G.settings.bright !== false);
// Colors and wave sizes only depend on where a point is, so they're worked out again only when the water tile moves
// (or the look changes); every frame just moves the points up and down. This keeps phones and tablets fast.
let wKey = '', wAmp = null;
export function updateWater(){
  foamU.uTime.value = G.t;
  const step = waterSize/WN, ox = Math.round(G.cam.x/step)*step, oz = Math.round(G.cam.y/step)*step;
  water.position.set(ox, 0, oz);
  const p = wgeo.attributes.position.array, c = wgeo.attributes.color.array, n = p.length/3, key = ox + ',' + oz + ',' + CSEA.getHex() + ',' + n;
  if (key !== wKey){ wKey = key; if (!wAmp || wAmp.length !== n) wAmp = new Float32Array(n);
    for (let i=0, v=0;i<p.length;i+=3, v++){
      const x = wbase[i] + ox, z = wbase[i+2] + oz, s = seaInfo(x, z);
      wAmp[v] = s.amp/(WEATHER_WAVES.k || 1);
      tmpC.copy(CSH).lerp(CSEA, s.k0).lerp(CST, s.k1);
      const ld = landDist(x, z); if (ld < 170) tmpC.lerp(CLAG, sstep(170, 0, ld)*.85); // light lagoon water near every shore: the crew fishes here
      c[i] = tmpC.r; c[i+1] = tmpC.g; c[i+2] = tmpC.b;
    }
    wgeo.attributes.color.needsUpdate = true; }
  const k = WEATHER_WAVES.k;
  for (let i=0, v=0;i<p.length;i+=3, v++) p[i+1] = waveH(wbase[i] + ox, wbase[i+2] + oz, wAmp[v]*k, G.t);
  wgeo.attributes.position.needsUpdate = true; wgeo.computeVertexNormals();
}

// Builder zoom: grows the water tile, fog and shadow area to match how far out the camera is.
const zoomBucket = z => Math.ceil(Math.max(1, z)*2)/2; // rebuild the water only in half steps
let lastZoom = 1, depthK = 1;
// The camera pulls back in deeper water: more sea to see out there. Builder zoom multiplies on top.
const DEPTH_ZOOM = [1, 1.3, 1.5];
const viewZoom = () => G.settings.dev.zoom*depthK;
export function applyZoom(){
  const z = viewZoom(), s = 520*Math.max(1, z);
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
let camK = 1; // 1 at sea, closer while tied up at the pier
export function updateCamera(){
  camK += ((G.dock && G.dock.mode !== 'out' ? .5 : 1) - camK) * .04;
  const dk = DEPTH_ZOOM[Math.max(0, G.curZone)] || 1;
  if (Math.abs(dk - depthK) > .002){ depthK += (dk - depthK)*.012; if (zoomBucket(viewZoom()) !== zoomBucket(lastZoom)) applyZoom(); }
  const dist = (view.H > view.W ? 740 : 600) * viewZoom() * camK;
  V.set(1, 1.6, 1).normalize().multiplyScalar(dist);
  // a short jolt when you're hit or fire a volley
  G.shake = Math.max(0, (G.shake || 0) - 1/60*2.2); const j = G.shake*G.shake*dist*.012, jx = Math.sin(G.t*71)*j, jz = Math.cos(G.t*57)*j;
  camera.position.set(G.cam.x + V.x + jx, V.y, G.cam.y + V.z + jz); camera.lookAt(G.cam.x + jx, 0, G.cam.y + jz);
  sun.position.set(G.cam.x - 420, 900, G.cam.y + 160); sun.target.position.set(G.cam.x, 0, G.cam.y);
}
export function updateWeather(){
  const k = G.stormK;
  const m = G.mistK || 0; // mist: a soft warm-white fog that closes in, with the sun glowing through it
  scene.fog.color.copy(SKY).lerp(MIST, m*.5).lerp(STORMSKY, k); scene.background.copy(scene.fog.color);
  const z = viewZoom();
  scene.fog.near = (1000 - k*550 - m*420)*z; scene.fog.far = (2300 - k*1000 - m*750)*z;
  sun.intensity = .64 - k*.42 + m*.08 + G.flash*.8; hemi.intensity = .62 - k*.22 + m*.1 + G.flash*.6;
  foamU.uSun.value.copy(sun.position).sub(sun.target.position).normalize(); foamU.uGlint.value = 1 - k*.8 - m*.5; foamU.uStorm.value = Math.min(1, k + m*.4); foamU.uWave.value = WEATHER_WAVES.k; foamU.uSky.value.copy(scene.fog.color);
}

// World point -> screen pixels (for labels drawn on the 2D overlay).
export function project(x, y, z){ V.set(x, y, z).project(camera); return [(V.x+1)/2*view.W, (1-V.y)/2*view.H, V.z]; }

const ray = new T.Raycaster(), seaPlane = new T.Plane(new T.Vector3(0,1,0), 0), hit = new T.Vector3();
// Screen pixels -> point on the sea, or null.
export function screenToSea(sx, sy){
  ray.setFromCamera({x: sx/view.W*2-1, y: -(sy/view.H*2-1)}, camera);
  return ray.ray.intersectPlane(seaPlane, hit) ? {x:hit.x, y:hit.z} : null;
}

// ---- the "tiny world" look (a setting): tilt-shift blur at the top and bottom of the screen, a little more color and warmth,
// and a soft vignette, so the sea looks like a miniature model, like Tiny Glade. The middle band, where your ship is, stays sharp.
let rt = null;
const post = new T.ShaderMaterial({uniforms:{tex:{value:null}, res:{value:new T.Vector2(1, 1)}, focus:{value:.5}}, depthTest:false, depthWrite:false,
  vertexShader:'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader:`uniform sampler2D tex; uniform vec2 res; uniform float focus; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - focus), r = smoothstep(.26, .5, d)*15.0; // only the outer edges blur
      // a soft round blur: 24 samples spread in a sunflower spiral, turned a little per pixel so no grid shows
      vec4 c = texture2D(tex, vUv); float tot = 1., spin = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453)*6.2831;
      if (r > .4) for (int i = 1; i <= 16; i++){ float k = float(i), a = k*2.39996 + spin, rr = sqrt(k/16.)*r; c += texture2D(tex, vUv + vec2(cos(a), sin(a))*rr/res); tot += 1.; } // the sharp middle skips the blur
      vec3 col = c.rgb/tot; float l = dot(col, vec3(.299, .587, .114));
      col = mix(vec3(l), col, 1.15)*vec3(1.035, 1.0, .955);
      col *= mix(.84, 1., smoothstep(.98, .45, length((vUv - .5)*vec2(1.1, 1.))));
      gl_FragColor = vec4(col, 1.);
    }`});
const quad = new T.Mesh(new T.PlaneGeometry(2, 2), post); quad.frustumCulled = false;
const postScene = new T.Scene(); postScene.add(quad);
const postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
export function renderFrame(on){
  if (!on){ renderer.render(scene, camera); return; }
  const w = Math.round(view.W*view.DPR), h = Math.round(view.H*view.DPR);
  if (!rt || rt.width !== w || rt.height !== h){ if (rt) rt.dispose();
    rt = renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget ? new T.WebGLMultisampleRenderTarget(w, h) : new T.WebGLRenderTarget(w, h); }
  renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
  post.uniforms.tex.value = rt.texture; post.uniforms.res.value.set(w, h); renderer.render(postScene, postCam);
}
