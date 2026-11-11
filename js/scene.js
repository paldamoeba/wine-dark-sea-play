// Renderer, camera, lights, water and weather.
import {QUALITY, SHIPS} from './config.js?v=11d7486';
import {seaInfo, sstep, landDist, shoreK, WEATHER_WAVES, WORLD} from './world.js?v=11d7486';
import {G} from './state.js?v=11d7486';
import {TOD, updateDayNight} from './daynight.js?v=11d7486';
import {showGrass} from './grass.js?v=11d7486';
import {SEA_LOOKS, seaUniforms, waterMaterial, bedMaterial} from './water.js?v=11d7486';

const T = window.THREE;
export const canvas = document.getElementById('cv');
// P84: with the tiny world look on (the default), the sea is drawn into its own smoothed picture first, so the screen itself
// doesn't need smoothing too: that was a second full-size smoothed buffer filled every frame, for nothing.
export const renderer = new T.WebGLRenderer({canvas, antialias:G.settings.tiny === false});
renderer.shadowMap.type = T.PCFShadowMap; // PCF with a radius: soft edges (PCFSoft ignores the radius in this three.js)
export const scene = new T.Scene();
const SKY = new T.Color('#a9c9cf'), STORMSKY = new T.Color('#46525c'), MIST = new T.Color('#f1ede2');
scene.background = SKY.clone();
scene.fog = new T.Fog(SKY.clone(), 1000, 2300);
export const camera = new T.PerspectiveCamera(38, 1, 80, 6000); // near 80: the camera is always 300+ away, and a far near plane keeps depth precise (no flickering stripes)
const hemi = new T.HemisphereLight(0xe6f0f2, 0x7d8670, .62); scene.add(hemi);
const sun = new T.DirectionalLight(0xffe6c4, .64);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {left:-520, right:520, top:520, bottom:-520, near:10, far:2200});
// the bias and normal bias lift shadows off the surface that casts them: without enough, some phones draw stripes on flat ground and helmets
sun.shadow.bias = -.0006; sun.shadow.normalBias = 2.2; sun.shadow.radius = 3; scene.add(sun, sun.target);

export const view = {W:innerWidth, H:innerHeight, DPR:1};
let quality = QUALITY.high;

// P84 (Nicholas: the phone gets hot after 10 to 20 minutes): Battery saver, on by default on phones. Fewer pixels (main.js also caps the frame rate).
const COARSE = matchMedia('(pointer: coarse)').matches;
export const saverOn = () => G.settings.saver ?? COARSE;
export function resize(){
  view.W = innerWidth; view.H = innerHeight; view.DPR = Math.min(quality.dpr, devicePixelRatio || 1, Math.sqrt(quality.pix/(view.W*view.H)))*(saverOn() ? .8 : 1); // P67: sharp, up to a limit of pixels
  renderer.setPixelRatio(view.DPR); renderer.setSize(view.W, view.H, false);
  camera.aspect = view.W/view.H; camera.updateProjectionMatrix();
}

// ---- water: a wavy tile that follows the camera ----
// The waves are moved on the graphics card: the big swells (the same ones the boats ride, see waveH in world.js) plus
// smaller waves on top that are only for looks. The light is worked out for every pixel, with little ripples bent into it,
// so the sea looks like rolling water, lighter on the crests and deeper in the troughs, not a flat sheet.
const WS = 2800;
let water = null, wgeo = null, wbase = null, WN = 0, waterSize = WS, tileTex = null, tileData = null;
function buildWater(seg){
  if (water){ scene.remove(water); wgeo.dispose(); }
  WN = seg; waterSize = WS * zoomBucket(viewZoom());
  wgeo = new T.PlaneGeometry(waterSize, waterSize, WN, WN); wgeo.rotateX(-Math.PI/2);
  wbase = wgeo.attributes.position.array.slice();
  const n = wgeo.attributes.position.count;
  wgeo.setAttribute('color', new T.BufferAttribute(new Float32Array(n*3), 3));
  wgeo.setAttribute('aAmp', new T.BufferAttribute(new Float32Array(n), 1));
  wgeo.setAttribute('aShore', new T.BufferAttribute(new Float32Array(n), 1)); // 0 at the shore (flat water), 1 out at sea
  wgeo.setAttribute('aLand', new T.BufferAttribute(new Float32Array(n), 1)); // how far from land (0 at the shore, 1 at 340 or more), for shore foam and rings
  // P67: the colors and the distance to land also go in a small picture, read smoothly for every pixel. Read from the mesh points alone, the shore and shallows showed soft blocks, the more so the further out the camera.
  if (tileTex) tileTex.dispose();
  tileData = new Uint8Array(n*4); tileTex = new T.DataTexture(tileData, WN + 1, WN + 1, T.RGBAFormat, T.UnsignedByteType); tileTex.minFilter = tileTex.magFilter = T.LinearFilter; tileTex.wrapS = tileTex.wrapT = T.ClampToEdgeWrapping;
  foamU.uTile.value = tileTex; foamU.uTileN.value = WN + 1; foamU.uTileO.value.z = waterSize;
  wgeo.boundingSphere = new T.Sphere(new T.Vector3(), waterSize); // the waves move in the shader
  water = new T.Mesh(wgeo, waterMat);
  water.receiveShadow = true; water.frustumCulled = false; scene.add(water);
  // the sea floor: a darker copy of the water's colors a little way down. The water is slightly see-through, so sand under the
  // shallows, the island bases and the hulls below the waterline show through softly.
  if (bed){ scene.remove(bed); bed.geometry.dispose(); }
  const bg = new T.PlaneGeometry(waterSize, waterSize, WN, WN); bg.rotateX(-Math.PI/2); bg.setAttribute('color', wgeo.attributes.color);
  bed = new T.Mesh(bg, bedMat); bed.frustumCulled = false; scene.add(bed);
}
let bed = null;
const LOOKS = SEA_LOOKS;
const CCOLD = new T.Color('#3d6f8f'), CSH = new T.Color(), CSEA = new T.Color(), CST = new T.Color(), CLAG = new T.Color(), tmpC = new T.Color();
const foamU = seaUniforms(), waterMat = waterMaterial(foamU), bedMat = bedMaterial(foamU);
// P56: where the wine-dark water is (the pirate king's lair); r = 0 turns it off
export function setGust(a, k){ foamU.uGust.value.set(Math.cos(a), Math.sin(a), k); } // P70: the wind on the water
export function setLair(x, y, r){ foamU.uLair.value.set(x, y, r); }
function setSeaLook(){ const L = LOOKS.real; CSH.set(L[0]); CSEA.set(L[1]); CST.set(L[2]); CLAG.set(L[3]); SKY.set('#b3d5e6'); }
setSeaLook();
// Colors and wave sizes only depend on where a point is, so they're worked out again only when the water tile moves
// (or the look changes), and the tile only moves in steps of about 100. The waves themselves move on the graphics card.
let wKey = '';
export function updateWater(){
  foamU.uTime.value = G.t; foamU.uWave.value = WEATHER_WAVES.k; foamU.uZoom.value = Math.max(1, viewZoom());
  const step = waterSize/WN*Math.max(1, Math.round(100/(waterSize/WN))), ox = Math.round(G.cam.x/step)*step, oz = Math.round(G.cam.y/step)*step;
  water.position.set(ox, 0, oz); bed.position.set(ox, -80, oz); /* P65: well below the deepest trough: when the waves dipped under it, it showed as hard dark shapes in the water */
  const p = wbase, c = wgeo.attributes.color.array, amp = wgeo.attributes.aAmp.array, shore = wgeo.attributes.aShore.array, land = wgeo.attributes.aLand.array, key = ox + ',' + oz + ',' + CSEA.getHex() + ',' + wgeo.uuid; // a rebuilt water tile (zoom, graphics) always gets its colors again
  if (key === wKey) return; wKey = key;
  for (let i=0, v=0;i<p.length;i+=3, v++){
    const x = p[i] + ox, z = p[i+2] + oz, s = seaInfo(x, z);
    const ld = landDist(x, z), sk = shoreK(ld); shore[v] = sk; land[v] = Math.max(0, Math.min(1, ld/340));
    amp[v] = s.amp/(WEATHER_WAVES.k || 1)*sk; // the waves die down right at the shore, so they never wash over the sand in jagged steps
    tmpC.copy(CSH).lerp(CSEA, s.k0).lerp(CST, s.k1); if (ld < 170) tmpC.lerp(CLAG, sstep(170, 0, ld)*.85); // light lagoon water near every shore: the crew fishes here
    tmpC.lerp(CCOLD, sstep(WORLD*.36, WORLD*.2, z)*.6); // colder, greyer water in the far north
    c[i] = tmpC.r; c[i+1] = tmpC.g; c[i+2] = tmpC.b;
    const q = v*4; tileData[q] = Math.min(255, tmpC.r*255); tileData[q+1] = Math.min(255, tmpC.g*255); tileData[q+2] = Math.min(255, tmpC.b*255); tileData[q+3] = land[v]*255;
  }
  tileTex.needsUpdate = true; foamU.uTileO.value.x = ox; foamU.uTileO.value.y = oz;
  wgeo.attributes.color.needsUpdate = true; wgeo.attributes.aAmp.needsUpdate = true; wgeo.attributes.aShore.needsUpdate = true; wgeo.attributes.aLand.needsUpdate = true;
}

// Builder zoom: grows the water tile, fog and shadow area to match how far out the camera is.
const zoomBucket = z => Math.ceil(Math.max(1, z)*2)/2; // rebuild the water only in half steps
let lastZoom = 1, depthK = 1;
// The camera pulls back in deeper water: more sea to see out there. Builder zoom multiplies on top.
const DEPTH_ZOOM = [1, 1.3, 1.5];
// bigger ships get a camera further out, so a trireme isn't crammed into the screen (P49)
const SHIP_ZOOM = [1, 1.12, 1.3, 1.42, 1.6];
const viewZoom = () => (G.settings.builder ? G.settings.dev.zoom : (G.settings.pzoom || 1))*depthK; // players zoom a little (input.js PZOOM)
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
  showGrass(quality !== QUALITY.low); // grass on Medium and High
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
  const f60 = (G.dt || 1/60)*60; // P84: eases the same at any frame rate
  camK += ((G.dock && G.dock.mode !== 'out' ? .5 : 1) - camK) * (1 - (1 - .04)**f60);
  // P114: in a fortress's waters the camera pulls back by that fortress's share (combat.js sets G.fortCam each frame of the fight); it eases out and back like the zone zoom
  const fc = G.fortCam && G.t - G.fortCam.t < .6 && !G.dock ? G.fortCam.k : 1;
  const dk = Math.min(1.85, (DEPTH_ZOOM[Math.max(0, G.curZone)] || 1)*(SHIP_ZOOM[SHIPS[G.S.tier].rank] || 1))*fc;
  if (Math.abs(dk - depthK) > .002){ depthK += (dk - depthK)*(1 - (1 - .012)**f60); if (zoomBucket(viewZoom()) !== zoomBucket(lastZoom)) applyZoom(); }
  const dist = (view.H > view.W ? 740 : 600) * viewZoom() * camK;
  // camera angle (a setting): high looks down more, low sees further toward the horizon
  const ang = CAM_ANGLES[G.settings.angle] || CAM_ANGLES.low;
  V.set(0, ang.up, Math.SQRT2).normalize() /* north is up: the camera sits to the south, looking north */.multiplyScalar(dist*ang.d);
  // a short jolt when you're hit or fire a volley
  G.shake = Math.max(0, (G.shake || 0) - (G.dt || 1/60)*2.2); const j = G.shake*G.shake*dist*.012, jx = Math.sin(G.t*71)*j, jz = Math.cos(G.t*57)*j;
  camera.position.set(G.cam.x + V.x + jx, V.y, G.cam.y + V.z + jz); camera.lookAt(G.cam.x + jx, 0, G.cam.y + jz);
  sun.position.set(G.cam.x + TOD.dir.x, TOD.dir.y, G.cam.y + TOD.dir.z); sun.target.position.set(G.cam.x, 0, G.cam.y);
}
// The light: time of day first (daynight.js), then the weather on top. Storms are darker still at night.
// P118 (the visual pass: each part of the sea has its own mood): the Shallows are warm and turquoise, the Open Sea a deeper blue,
// the far north cold and steel grey. Only colors already worked out every frame are nudged, so it costs nothing. It eases over a
// few seconds as you cross from one to the next.
export const MOOD = {on:true, sh:0, deep:0, cold:0, shSea:new T.Color(1.03, 1.09, .97), deepSea:new T.Color(.84, .92, 1.05), coldSea:new T.Color(.86, .95, .97), coldSky:new T.Color('#c3d0da'), coldSun:new T.Color('#e4eeff'), warmSun:new T.Color('#fff1d6')};
const moodC = new T.Color(), ONE = new T.Color(1, 1, 1);
function updateMood(dt){ const z = G.curZone, e = Math.min(1, dt*.35), on = MOOD.on ? 1 : 0, cold = Math.max(0, Math.min(1, (WORLD*.36 - G.cam.y)/(WORLD*.1)))*(1 - (G.lairK || 0));
  MOOD.sh += ((z === 0 ? on : 0) - MOOD.sh)*e; MOOD.deep += ((z === 2 ? on : 0) - MOOD.deep)*e; MOOD.cold += (cold*on - MOOD.cold)*e; }
const LAIRSUN = new T.Color('#ff9a6a'), LAIRFOG = new T.Color('#3d1a28'), NIGHTSTORM = new T.Color('#1d2533'), stormC = new T.Color();
export function updateWeather(dt = 1/60){
  updateDayNight(dt, SKY);
  const k = G.stormK, n = TOD.night; updateMood(dt); const day = 1 - n;
  const m = (G.mistK || 0)*(1 - n*.6); // mist: a soft warm-white fog that closes in, with the sun glowing through it
  stormC.copy(STORMSKY).lerp(NIGHTSTORM, n);
  scene.fog.color.copy(TOD.sky).lerp(MOOD.coldSky, MOOD.cold*.5*day).lerp(MIST, m*.5*(1 - n)).lerp(stormC, k).lerp(LAIRFOG, (G.lairK || 0)*.86); scene.background.copy(scene.fog.color);
  const z = viewZoom();
  const lf = G.lairK || 0; // P107 (Nicholas: fog at the pirate king's for drama): the wine-red haze closes in around you there
  scene.fog.near = Math.max(120, 1000 - k*550 - m*420 - n*150 - lf*210)*z; scene.fog.far = Math.max(700, 2300 - k*1000 - m*750 - n*250 - lf*270)*z;
  sun.color.copy(TOD.sun); hemi.color.copy(TOD.hemiS); hemi.groundColor.copy(TOD.hemiG); waterMat.color.copy(TOD.water).multiply(moodC.copy(ONE).lerp(MOOD.shSea, MOOD.sh).lerp(MOOD.deepSea, MOOD.deep).lerp(MOOD.coldSea, MOOD.cold)); sun.color.lerp(MOOD.warmSun, MOOD.sh*.5*day).lerp(MOOD.coldSun, MOOD.cold*.6*day);
  sun.intensity = Math.max(.05, TOD.sunI - k*.42*TOD.sunI/.64 + m*.08) + G.flash*.8; hemi.intensity = Math.max(.15, TOD.hemiI - k*.22 + m*.1) + G.flash*.6; { const lk = G.lairK || 0; if (lk > .01){ sun.intensity *= 1 - .35*lk; sun.color.lerp(LAIRSUN, .7*lk); hemi.color.lerp(LAIRSUN, .35*lk); hemi.intensity *= 1 - .22*lk; scene.fog.near *= 1 - .3*lk; scene.fog.far *= 1 - .18*lk; } }
  foamU.uSun.value.copy(sun.position).sub(sun.target.position).normalize(); foamU.uGlint.value = TOD.glint*(1 - k*.8 - m*.5); foamU.uStorm.value = Math.min(1, k + m*.4); foamU.uSky.value.copy(scene.fog.color);
  foamU.uNight.value = n;
  post.uniforms.vig.value = Math.max(k*.6, (G.lairK || 0)*.7, n*.3); /* P118: the edges of the picture close in a little in a storm, at night and in the lair */
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
const post = new T.ShaderMaterial({uniforms:{tex:{value:null}, res:{value:new T.Vector2(1, 1)}, focus:{value:.5}, bloom:{value:0}, far:{value:0}, vig:{value:0}}, depthTest:false, depthWrite:false,
  vertexShader:'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader:`uniform sampler2D tex; uniform vec2 res; uniform float focus, bloom, far, vig; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - focus), r = smoothstep(.32 - .07*far, .52 - .05*far, d)*(7. + 5.*far)*res.y/1200.; // only the outer edges blur, gently. P67: the same size on any screen, and a little more as the camera pulls back, so the tiny-world look holds
      // a soft round blur: 12 samples spread in a sunflower spiral, turned a little per pixel so no grid shows
      vec4 c = texture2D(tex, vUv); float tot = 1., spin = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453)*6.2831;
      if (r > .02) for (int i = 1; i <= 11; i++){ float k = float(i), a = k*2.39996 + spin, rr = sqrt(k/11.)*r; c += texture2D(tex, vUv + vec2(cos(a), sin(a))*rr/res); tot += 1.; } // the sharp middle skips the blur
      vec3 col = c.rgb/tot;
      // bloom: a wide ring of samples, only the bright parts, added back as a warm glow
      if (bloom > .01){ vec3 b = vec3(0.); for (int i = 0; i < 16; i++){ float k = float(i), a = k*.7854 + (i >= 8 ? .39 : 0.), rr = (i >= 8 ? 15. : 7.)*res.y/900.; // two fixed rings: smooth, no grain
          vec3 sc = texture2D(tex, vUv + vec2(cos(a), sin(a))*rr/res).rgb; b += max(sc - .8, 0.)*(i >= 8 ? .6 : 1.); } // P51: only really bright things (flames, windows) glow, not white sails
        col += b/12.*bloom*vec3(1.25, 1.05, .8); }
      float l = dot(col, vec3(.299, .587, .114));
      col = mix(vec3(l), col, 1.15)*vec3(1.035, 1.0, .955);
      col *= mix(.84 - .2*vig, 1., smoothstep(.98 - .12*vig, .45 - .1*vig, length((vUv - .5)*vec2(1.1, 1.))));
      gl_FragColor = vec4(col, 1.);
    }`});
const quad = new T.Mesh(new T.PlaneGeometry(2, 2), post); quad.frustumCulled = false;
const postScene = new T.Scene(); postScene.add(quad);
const postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
// P74: anything past the far edge of the fog can't be seen, so it isn't drawn, and its thousands of little parts aren't worked out either. Nothing you can see changes.
scene.autoUpdate = false;
const hiddenNow = [], cullSph = new T.Sphere();
function cullInfo(c){ // how far this thing reaches, once
  let r = 0, far = false; const cen = new T.Vector3(), box = new T.Box3(), pts = [];
  c.updateMatrixWorld(true);
  c.traverse(o => { if (far || !(o.isMesh || o.isSprite || o.isLine || o.isPoints)) return; if (o.frustumCulled === false){ far = true; return; }
    const g = o.geometry; if (!g) return; if (!g.boundingSphere) g.computeBoundingSphere(); cullSph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); pts.push(cullSph.center.x, cullSph.center.y, cullSph.center.z, cullSph.radius); box.expandByPoint(cullSph.center); });
  box.isEmpty() ? cen.copy(c.position) : box.getCenter(cen);
  for (let i = 0; i < pts.length; i += 4) r = Math.max(r, Math.hypot(pts[i] - cen.x, pts[i + 1] - cen.y, pts[i + 2] - cen.z) + pts[i + 3]);
  return {never:far || !pts.length, dx:cen.x - c.position.x, dy:cen.y - c.position.y, dz:cen.z - c.position.z, r:r + 260, n:pts.length}; }
function cullBegin(){
  const lim = scene.fog.far*1.04, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  const kids = scene.children;
  for (let i = 0; i < kids.length; i++){ const c = kids[i]; if (!c.visible) continue;
    if (!c.isLight && !c.userData.noCull){ let u = c.userData.__cull; if (!u || (u.n === 0 && c.children.length)) u = c.userData.__cull = cullInfo(c);
      if (!u.never && Math.hypot(c.position.x + u.dx - cx, c.position.y + u.dy - cy, c.position.z + u.dz - cz) - u.r > lim){ c.visible = false; hiddenNow.push(c); continue; } }
    c.updateMatrixWorld(); } }
function cullEnd(){ for (const c of hiddenNow) c.visible = true; hiddenNow.length = 0; }
export function renderFrame(on){
  cullBegin(); drawFrame(on); cullEnd();
}
function drawFrame(on){
  if (!on){ renderer.render(scene, camera); return; }
  const w = Math.round(view.W*view.DPR), h = Math.round(view.H*view.DPR);
  if (!rt || rt.width !== w || rt.height !== h){ if (rt) rt.dispose();
    rt = renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget ? new T.WebGLMultisampleRenderTarget(w, h) : new T.WebGLRenderTarget(w, h); if (rt.samples) rt.samples = saverOn() ? 2 : 4; } // P84: Battery saver smooths edges with 2 samples, not 4
  renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
  post.uniforms.far.value = Math.max(0, Math.min(1, (viewZoom() - 1)/1.2)); post.uniforms.tex.value = rt.texture; post.uniforms.res.value.set(w, h); post.uniforms.bloom.value = TOD.night*.85; // P74: only at night, around flames and windows (the old faint daytime glow couldn't be seen and cost a lot)
  renderer.render(postScene, postCam);
}
