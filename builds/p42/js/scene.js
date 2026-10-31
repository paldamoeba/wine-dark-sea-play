// Renderer, camera, lights, water and weather.
import {QUALITY} from './config.js';
import {seaInfo, sstep, landDist, WEATHER_WAVES, WORLD} from './world.js';
import {G} from './state.js';
import {TOD, updateDayNight} from './daynight.js';
import {showGrass} from './grass.js';

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
// The waves are moved on the graphics card: the big swells (the same ones the boats ride, see waveH in world.js) plus
// smaller waves on top that are only for looks. The light is worked out for every pixel, with little ripples bent into it,
// so the sea looks like rolling water, lighter on the crests and deeper in the troughs, not a flat sheet.
const WS = 2800;
let water = null, wgeo = null, wbase = null, WN = 0, waterSize = WS;
function buildWater(seg){
  if (water){ scene.remove(water); wgeo.dispose(); }
  WN = seg; waterSize = WS * zoomBucket(viewZoom());
  wgeo = new T.PlaneGeometry(waterSize, waterSize, WN, WN); wgeo.rotateX(-Math.PI/2);
  wbase = wgeo.attributes.position.array.slice();
  const n = wgeo.attributes.position.count;
  wgeo.setAttribute('color', new T.BufferAttribute(new Float32Array(n*3), 3));
  wgeo.setAttribute('aAmp', new T.BufferAttribute(new Float32Array(n), 1));
  wgeo.boundingSphere = new T.Sphere(new T.Vector3(), waterSize); // the waves move in the shader
  water = new T.Mesh(wgeo, waterMat);
  water.receiveShadow = true; water.frustumCulled = false; scene.add(water);
}
// Two looks for the sea. Classic: deep teal. Bright (a setting, on by default): clear blue with soft white foam, like a cartoon sea.
const LOOKS = {classic:['#2b8e8f', '#175c7c', '#1b4a63', '#5cc2b2'], bright:['#35a6d8', '#1d72cc', '#1a5fb4', '#7fd3e2']};
const CCOLD = new T.Color('#3d6f8f'), CSH = new T.Color(), CSEA = new T.Color(), CST = new T.Color(), CLAG = new T.Color(), tmpC = new T.Color();
const waterMat = new T.MeshPhongMaterial({color:'#ffffff', vertexColors:true, specular:'#000000', shininess:1});
const foamU = {uNight:{value:0}, uTime:{value:0}, uFoam:{value:0}, uSun:{value:new T.Vector3(0, 1, 0)}, uGlint:{value:1}, uStorm:{value:0}, uSky:{value:new T.Color()}, uWave:{value:1}};
// the same swells as waveH() in world.js, written for the graphics card, with their slope (for the light) and smaller waves on top
const WAVES_GLSL = `
  vec3 swell(vec2 p, float A, float t){ // height, slope along x, slope along z (keep in step with waterY() in world.js)
    float a = p.x*.011 + t*1.3, b = p.y*.013 - t*1.1, c = (p.x + p.y)*.021 + t*2.;
    vec3 big = vec3(sin(a) + sin(b)*.8 + sin(c)*.4, .011*cos(a) + .4*.021*cos(c), .8*.013*cos(b) + .4*.021*cos(c))/2.2*A;
    // smaller waves from other directions, there even in the calm shallows, so the sea always rolls a little
    float d = p.x*.034 - p.y*.021 + t*1.9, e = p.x*.018 + p.y*.039 - t*1.6, C = 1.8 + A*.15;
    vec3 chop = vec3(sin(d)*.22 + sin(e)*.18, .22*.034*cos(d) + .18*.018*cos(e), -.22*.021*cos(d) + .18*.039*cos(e))*C*2.;
    return big + chop;
  }`;
waterMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, foamU);
  sh.vertexShader = `attribute float aAmp; uniform float uTime, uWave; varying vec3 vWorld; varying float vH, vAmp;` + WAVES_GLSL + "\n" + sh.vertexShader
    .replace('#include <beginnormal_vertex>', `vec3 wp0 = (modelMatrix*vec4(position, 1.0)).xyz; float A = aAmp*uWave; vec3 sw = swell(wp0.xz, A, uTime);
      vec3 objectNormal = normalize(vec3(-sw.y, 1., -sw.z));`)
    .replace('#include <begin_vertex>', `vec3 transformed = position; transformed.y += sw.x; vH = sw.x; vAmp = max(A, .5);
      vWorld = (modelMatrix*vec4(transformed, 1.0)).xyz;`);
  sh.fragmentShader = `varying vec3 vWorld; varying float vH, vAmp; uniform float uTime, uFoam, uGlint, uStorm, uWave, uNight; uniform vec3 uSun, uSky;
    vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p)*43758.5453); }
    float cells(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(float(x), float(y)), o = h2(mod(i + g, 256.)); // wrapped so the hash never gets numbers too big for phone GPUs (that turned the far south black)
        o = .5 + .42*sin(uTime*.35 + 6.2831*o); float d = length(g + o - f); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return d2 - d1; }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); i = mod(i, 256.);
      return mix(mix(h2(i).x, h2(i + vec2(1., 0.)).x, f.x), mix(h2(i + vec2(0., 1.)).x, h2(i + vec2(1., 1.)).x, f.x), f.y); }
    // little ripples: a slope to bend the light, so the sea shimmers like real water
    vec2 ripple(vec2 w, float t){
      return vec2(sin(w.x*.06 + w.y*.02 + t*1.7)*.5 + sin((w.x - w.y)*.11 - t*2.3)*.3 + sin(w.x*.21 + t*3.1)*.15,
                  cos(w.y*.05 - w.x*.03 - t*1.4)*.5 + sin((w.x + w.y)*.09 + t*2.1)*.3 + cos(w.y*.19 - t*2.7)*.15); }
    ` + sh.fragmentShader
    .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      float dist = length(vWorld.xz - cameraPosition.xz), near = smoothstep(2400., 400., dist);
      vec2 rp = ripple(vWorld.xz, uTime)*(.14 + .1*uStorm)*near;
      normal = normalize(normal + (viewMatrix*vec4(-rp.x, 0., -rp.y, 0.)).xyz);`)
    .replace('#include <color_fragment>', `#include <color_fragment>
      // lighter, greener water on the crests and deeper blue in the troughs, plus wide soft patches, so it never looks flat
      float hk = clamp(vH/vAmp, -1., 1.);
      diffuseColor.rgb *= .8*mix(.8, 1.14, smoothstep(-1., 1., hk)); // (the light here is smooth, not banded, so a little darker to match the old look)
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(.92, 1.06, 1.04), smoothstep(.3, 1., hk)*.6);
      diffuseColor.rgb *= (.93 + .12*vnoise(vWorld.xz/520. + uTime*.01))*(1. + uNight*.3); // a touch brighter at night so you can still read the water`)
    .replace('#include <dithering_fragment>', `#include <dithering_fragment>
      vec3 foamC = mix(vec3(.94, .98, 1.), vec3(.32, .62, .68), uStorm);
      foamC = mix(foamC, vec3(.42, .55, .78), uNight*.7); // moonlit foam: softer and bluer
      float fade = smoothstep(2300., 500., dist);
      // a faint, soft net of light on the water (it was thin white lines before), broken up so it reads as shimmer
      vec2 q = vWorld.xz/150.; q += .32*vec2(sin(q.y*1.3 + uTime*.4), cos(q.x*1.1 - uTime*.3));
      float e = cells(q), glow = (1. - smoothstep(.0, .32, e))*smoothstep(.35, .75, vnoise(vWorld.xz/240. - uTime*.03));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, foamC, glow*uFoam*.12*fade*(1. - .5*uStorm)*(1. - .45*uNight));
      // white caps: soft foam on the highest crests, in patches, more in rough weather
      float cap = smoothstep(.55, .95, hk)*smoothstep(.45, .8, vnoise(vWorld.xz/70. + vec2(uTime*.2, 0.)))*clamp(uWave - .3, 0., 1.4);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, foamC, cap*.55*smoothstep(2600., 700., dist));
      // the sky reflects off the water further away, and off the slopes facing the camera
      vec3 Vv = normalize(cameraPosition - vWorld); vec3 nW = normalize(vec3(-rp.x, 1., -rp.y));
      float fres = pow(1. - max(dot(Vv, nW), 0.), 3.);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uSky, fres*.4);
      // sunlight glinting off the little waves: a soft sheen toward the sun and bright twinkles inside it
      vec2 w = vWorld.xz;
      vec3 nrm = normalize(vec3(sin(w.x*.045 + uTime*1.7)*.16 + sin((w.x + w.y)*.11 - uTime*2.3)*.08 - rp.x, 1., cos(w.y*.05 - uTime*1.4)*.16 + sin((w.x - w.y)*.09 + uTime*2.1)*.08 - rp.y));
      vec3 Rf = reflect(-uSun, nrm);
      float sp = max(dot(Rf, Vv), 0.), sheen = pow(sp, 24.)*.12, twinkle = pow(sp, 260.)*.45;
      gl_FragColor.rgb += mix(vec3(1., .96, .86), vec3(.78, .86, 1.), uNight)*(sheen + twinkle)*uGlint;`);
};
export function setSeaLook(bright){ const L = LOOKS[bright ? 'bright' : 'classic']; CSH.set(L[0]); CSEA.set(L[1]); CST.set(L[2]); CLAG.set(L[3]); foamU.uFoam.value = bright ? 1 : 0; SKY.set(bright ? '#b8def0' : '#a9c9cf'); }
setSeaLook(!G.settings || G.settings.bright !== false);
// Colors and wave sizes only depend on where a point is, so they're worked out again only when the water tile moves
// (or the look changes), and the tile only moves in steps of about 100. The waves themselves move on the graphics card.
let wKey = '';
export function updateWater(){
  foamU.uTime.value = G.t; foamU.uWave.value = WEATHER_WAVES.k;
  const step = waterSize/WN*Math.max(1, Math.round(100/(waterSize/WN))), ox = Math.round(G.cam.x/step)*step, oz = Math.round(G.cam.y/step)*step;
  water.position.set(ox, 0, oz);
  const p = wbase, c = wgeo.attributes.color.array, amp = wgeo.attributes.aAmp.array, key = ox + ',' + oz + ',' + CSEA.getHex() + ',' + wgeo.uuid; // a rebuilt water tile (zoom, graphics) always gets its colors again
  if (key === wKey) return; wKey = key;
  for (let i=0, v=0;i<p.length;i+=3, v++){
    const x = p[i] + ox, z = p[i+2] + oz, s = seaInfo(x, z);
    amp[v] = s.amp/(WEATHER_WAVES.k || 1);
    tmpC.copy(CSH).lerp(CSEA, s.k0).lerp(CST, s.k1);
    const ld = landDist(x, z); if (ld < 170) tmpC.lerp(CLAG, sstep(170, 0, ld)*.85); // light lagoon water near every shore: the crew fishes here
    tmpC.lerp(CCOLD, sstep(WORLD*.36, WORLD*.2, z)*.6); // colder, greyer water in the far north
    c[i] = tmpC.r; c[i+1] = tmpC.g; c[i+2] = tmpC.b;
  }
  wgeo.attributes.color.needsUpdate = true; wgeo.attributes.aAmp.needsUpdate = true;
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
  showGrass(quality !== QUALITY.low); // grass only on High graphics
  sun.castShadow = quality.shadows;
  scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  buildWater(quality.waterSeg);
  resize();
}

// ---- camera + weather ----
export const CAM_ANGLES = {high:{up:2.3, d:1.04, label:'High'}, mid:{up:1.6, d:1, label:'Medium'}, low:{up:.95, d:.94, label:'Low'}};
const V = new T.Vector3();
let camK = 1; // 1 at sea, closer while tied up at the pier
export function updateCamera(){
  camK += ((G.dock && G.dock.mode !== 'out' ? .5 : 1) - camK) * .04;
  const dk = DEPTH_ZOOM[Math.max(0, G.curZone)] || 1;
  if (Math.abs(dk - depthK) > .002){ depthK += (dk - depthK)*.012; if (zoomBucket(viewZoom()) !== zoomBucket(lastZoom)) applyZoom(); }
  const dist = (view.H > view.W ? 740 : 600) * viewZoom() * camK;
  // camera angle (a setting): high looks down more, low sees further toward the horizon
  const ang = CAM_ANGLES[G.settings.angle] || CAM_ANGLES.mid;
  V.set(1, ang.up, 1).normalize().multiplyScalar(dist*ang.d);
  // a short jolt when you're hit or fire a volley
  G.shake = Math.max(0, (G.shake || 0) - 1/60*2.2); const j = G.shake*G.shake*dist*.012, jx = Math.sin(G.t*71)*j, jz = Math.cos(G.t*57)*j;
  camera.position.set(G.cam.x + V.x + jx, V.y, G.cam.y + V.z + jz); camera.lookAt(G.cam.x + jx, 0, G.cam.y + jz);
  sun.position.set(G.cam.x + TOD.dir.x, TOD.dir.y, G.cam.y + TOD.dir.z); sun.target.position.set(G.cam.x, 0, G.cam.y);
}
// The light: time of day first (daynight.js), then the weather on top. Storms are darker still at night.
const NIGHTSTORM = new T.Color('#1d2533'), stormC = new T.Color();
export function updateWeather(dt = 1/60){
  updateDayNight(dt, SKY);
  const k = G.stormK, n = TOD.night;
  const m = (G.mistK || 0)*(1 - n*.6); // mist: a soft warm-white fog that closes in, with the sun glowing through it
  stormC.copy(STORMSKY).lerp(NIGHTSTORM, n);
  scene.fog.color.copy(TOD.sky).lerp(MIST, m*.5*(1 - n)).lerp(stormC, k); scene.background.copy(scene.fog.color);
  const z = viewZoom();
  scene.fog.near = (1000 - k*550 - m*420 - n*150)*z; scene.fog.far = (2300 - k*1000 - m*750 - n*250)*z;
  sun.color.copy(TOD.sun); hemi.color.copy(TOD.hemiS); hemi.groundColor.copy(TOD.hemiG); waterMat.color.copy(TOD.water);
  sun.intensity = Math.max(.05, TOD.sunI - k*.42*TOD.sunI/.64 + m*.08) + G.flash*.8; hemi.intensity = Math.max(.15, TOD.hemiI - k*.22 + m*.1) + G.flash*.6;
  foamU.uSun.value.copy(sun.position).sub(sun.target.position).normalize(); foamU.uGlint.value = TOD.glint*(1 - k*.8 - m*.5); foamU.uStorm.value = Math.min(1, k + m*.4); foamU.uSky.value.copy(scene.fog.color);
  foamU.uNight.value = n;
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
