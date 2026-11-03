// Renderer, camera, lights, water and weather.
import {QUALITY, SHIPS} from './config.js?v=d678164';
import {seaInfo, sstep, landDist, shoreK, WEATHER_WAVES, WORLD} from './world.js?v=d678164';
import {G} from './state.js?v=d678164';
import {TOD, updateDayNight} from './daynight.js?v=d678164';
import {showGrass} from './grass.js?v=d678164';

const T = window.THREE;
export const canvas = document.getElementById('cv');
export const renderer = new T.WebGLRenderer({canvas, antialias:true});
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

export function resize(){
  view.W = innerWidth; view.H = innerHeight; view.DPR = Math.min(quality.dpr, devicePixelRatio || 1, Math.sqrt(quality.pix/(view.W*view.H))); // P67: sharp, up to a limit of pixels
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
const bedMat = new T.MeshBasicMaterial({vertexColors:true, color:'#8fa6b8', fog:true});
bedMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, foamU);
  sh.vertexShader = 'varying vec2 vBed;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vBed = (modelMatrix*vec4(position, 1.)).xz;');
  sh.fragmentShader = TILE_GLSL + '\nvarying vec2 vBed;\n' + sh.fragmentShader.replace('#include <color_fragment>', 'diffuseColor.rgb *= tileAt(vBed).rgb;'); };
// P65: two seas (a setting). 'real': water with reflections of the sky and sun on many small moving waves. 'toon': a Wind Waker style cartoon sea:
// flat bands of color, crisp white wave lines that change with how rough the water is, and star glints on the sun's path.
const LOOKS = {real:['#2d97bd', '#17679b', '#124e80', '#57c2bd'], toon:['#2fb4e0', '#1673d6', '#105fc4', '#6fe3e6']};
const CCOLD = new T.Color('#3d6f8f'), CSH = new T.Color(), CSEA = new T.Color(), CST = new T.Color(), CLAG = new T.Color(), tmpC = new T.Color();
const waterMat = new T.MeshPhongMaterial({color:'#ffffff', vertexColors:true, specular:'#000000', shininess:1, transparent:true, opacity:.8});
waterMat.defines = {};
const foamU = {uTile:{value:null}, uTileN:{value:1}, uTileO:{value:new T.Vector3()}, uZoom:{value:1}, uLair:{value:new T.Vector3(0, 0, 0)}, uNight:{value:0}, uTime:{value:0}, uSun:{value:new T.Vector3(0, 1, 0)}, uGlint:{value:1}, uStorm:{value:0}, uSky:{value:new T.Color()}, uWave:{value:1}};
// the same swells as waveH() in world.js, written for the graphics card, with their slope (for the light) and smaller waves on top
// a smooth read of the picture: four linear samples weighted so the result has no corners (a bicubic filter)
const TILE_GLSL = `uniform sampler2D uTile; uniform float uTileN; uniform vec3 uTileO;
  vec4 tileAt(vec2 xz){ vec2 p = ((xz - uTileO.xy)/uTileO.z + .5)*(uTileN - 1.), f = fract(p), i = p - f, f2 = f*f, f3 = f2*f;
    vec2 w0 = (1. - 3.*f + 3.*f2 - f3)/6., w1 = (4. - 6.*f2 + 3.*f3)/6., w2 = (1. + 3.*f + 3.*f2 - 3.*f3)/6., w3 = f3/6., g0 = w0 + w1, g1 = w2 + w3;
    vec2 a = (i - 1. + w1/g0 + .5)/uTileN, b = (i + 1. + w3/g1 + .5)/uTileN;
    return g0.y*(g0.x*texture2D(uTile, a) + g1.x*texture2D(uTile, vec2(b.x, a.y))) + g1.y*(g0.x*texture2D(uTile, vec2(a.x, b.y)) + g1.x*texture2D(uTile, b)); }`;
const WAVES_GLSL = `
  vec3 swell(vec2 p0, float A, float t, float shore){ // height, slope along x, slope along z (keep in step with waterY() in world.js)
    vec2 p = vec2(p0.x + 70.*sin(p0.y*.0021 + 1.3) + 30.*sin(p0.y*.0057 + p0.x*.0013), p0.y + 70.*sin(p0.x*.0017 - .7) + 30.*sin(p0.x*.0049 - p0.y*.0011)); // the same uneven warp
    float a = p.x*.011 + t*1.3, b = p.y*.013 - t*1.1, c = (p.x + p.y)*.021 + t*2.;
    vec3 big = vec3(sin(a) + sin(b)*.8 + sin(c)*.4, .011*cos(a) + .4*.021*cos(c), .8*.013*cos(b) + .4*.021*cos(c))/2.2*A;
    // smaller waves from other directions, there even in the calm shallows, so the sea always rolls a little
    float d = p.x*.034 - p.y*.021 + t*1.9, e = p.x*.018 + p.y*.039 - t*1.6, C = (1.8 + A*.15)*shore;
    vec3 chop = vec3(sin(d)*.22 + sin(e)*.18, .22*.034*cos(d) + .18*.018*cos(e), -.22*.021*cos(d) + .18*.039*cos(e))*C*2.;
    return big + chop;
  }`;
waterMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, foamU);
  sh.vertexShader = `attribute float aAmp, aShore, aLand; uniform float uTime, uWave; varying vec3 vWorld; varying vec2 vSl; varying float vH, vAmp, vLand, vSh;` + WAVES_GLSL + "\n" + sh.vertexShader
    .replace('#include <beginnormal_vertex>', `vec3 wp0 = (modelMatrix*vec4(position, 1.0)).xyz; float A = aAmp*uWave; vec3 sw = swell(wp0.xz, A, uTime, aShore);
      vec3 objectNormal = normalize(vec3(-sw.y, 1., -sw.z));`)
    .replace('#include <begin_vertex>', `vec3 transformed = position; transformed.y += sw.x; vH = sw.x; vAmp = max(A, .5); vSl = sw.yz; vLand = aLand; vSh = aShore;
      vWorld = (modelMatrix*vec4(transformed, 1.0)).xyz;`);
  sh.fragmentShader = TILE_GLSL + `
    varying vec3 vWorld; varying vec2 vSl; varying float vH, vAmp, vSh; uniform float uTime, uGlint, uStorm, uWave, uNight, uZoom; uniform vec3 uSun, uSky, uLair;
    #ifdef TOON
    ` + WAVES_GLSL + `
    #endif
    // hashes and noise with no sin() in them and every corner wrapped the same way: no lines where the pattern repeats, on any phone
    vec2 h2(vec2 p){ vec3 a = fract(p.xyx*vec3(.1031, .1030, .0973)); a += dot(a, a.yzx + 33.33); return fract((a.xx + a.yz)*a.zy); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); vec2 a = mod(i, 289.), b = mod(i + 1., 289.);
      return mix(mix(h2(a).x, h2(vec2(b.x, a.y)).x, f.x), mix(h2(vec2(a.x, b.y)).x, h2(b).x, f.x), f.y); }
    // lots of small waves from many directions, bent so no crest is ever a straight line: the slope, to bend the light
    vec2 ripple(vec2 w0, float t){
      vec2 w = w0 + 22.*vec2(sin(w0.y*.017 + t*.21), sin(w0.x*.013 - t*.17));
      vec2 s = vec2(0.); float f;
      f = cos(w.x*.052 + w.y*.021 + t*1.3); s += f*vec2(.052, .021)*5.;
      f = cos(w.x*-.031 + w.y*.067 - t*1.5); s += f*vec2(-.031, .067)*4.;
      f = cos(w.x*.094 - w.y*.058 + t*2.1); s += f*vec2(.094, -.058)*2.4;
      f = cos(w.x*.041 + w.y*.137 + t*2.6); s += f*vec2(.041, .137)*1.5;
      f = cos(w.x*-.181 + w.y*.083 - t*3.1); s += f*vec2(-.181, .083)*.9;
      f = cos(w.x*.23 + w.y*.19 + t*3.7); s += f*vec2(.23, .19)*.6;
      return s; }
    #ifdef TOON
    // Wind Waker wave lines: short white curved strokes that appear, drift and fade, each with its own place and tilt.
    // sc = how big the pattern is, sp = how fast they come and go, th = how thick, dens = how many, bend = how wavy, two = a second stroke under each.
    float strokes(vec2 w, float sc, float sp, float th, float dens, float bend, float two, float aa){
      vec2 p = w/sc, i0 = floor(p), f0 = fract(p); float L = 0.;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
        vec2 g = vec2(float(x), float(y)), id = mod(i0 + g, 289.), h = h2(id), h3 = h2(id + 11.); if (h3.x > dens) continue;
        float life = fract(h3.y + uTime*sp*(.7 + .6*h.x)), al = smoothstep(0., .25, life)*(1. - smoothstep(.72, 1., life));
        vec2 q = f0 - g - h; q.y += (life - .5)*.14; // each stroke drifts a little as it lives
        float an = (h.x - .5)*1.3, ca = cos(an), sa = sin(an); q = vec2(ca*q.x - sa*q.y, sa*q.x + ca*q.y);
        q.y += bend*sin(q.x*12. + h.y*6.28 + uTime*sp*5.); // a wavy stroke
        float R = .3 + .22*h.y; vec2 c = vec2(q.x, q.y*1.5 + R); float d = length(c), up = c.y/max(d, .001), tip = clamp((up - .42)*3., 0., 1.);
        float wd = th*al*tip; L = max(L, (1. - smoothstep(wd, wd + aa, abs(d - R)))*clamp(wd/.007, 0., 1.)); // tapered to nothing at the tips
        if (two > .5){ float d2 = abs(d - R*.72), wd2 = wd*.7*clamp((up - .62)*4., 0., 1.); L = max(L, (1. - smoothstep(wd2, wd2 + aa, d2))*clamp(wd2/.007, 0., 1.)); } }
      return L; }
    #endif
    ` + sh.fragmentShader
    .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      float dist = length(vWorld.xz - cameraPosition.xz), zd = dist/uZoom, near = 1. - smoothstep(500., 2600., zd); // P67: zd: how far away a point is, compared with how far the camera has pulled back, so a big ship's far-out camera still sees all the detail
      #ifdef TOON
        vec2 rp = vec2(0.); normal = normalize((viewMatrix*vec4(0., 1., 0., 0.)).xyz); // flat cartoon light: the bands below do the shading
      #else
        vec2 rw = vWorld.xz;
        vec2 rp = ripple(rw, uTime)*(.1 + .06*uStorm + .02*min(vAmp, 12.))*near;
        // fine detail from noise, close to the camera
        // P67: from further out, wider waves take over from the small ones
        if (zk > .01){ float t2 = uTime*.55; vec2 w2 = (rw + 240.*vec2(vnoise(rw/300.) - .5, vnoise(rw/260. + 9.) - .5))/2.3; vec2 s2 = ripple(w2, t2) + ripple(w2.yx*.61 + 40., t2*.8)*.7; rp = mix(rp, s2*(.07 + .014*min(vAmp, 12.)), zk*.6); } // two sets at an angle, pushed around by noise, so no weave shows
        if (near > .01){ float n0 = vnoise(rw/19. + uTime*.11), nx = vnoise((rw + vec2(4., 0.))/19. + uTime*.11), ny = vnoise((rw + vec2(0., 4.))/19. + uTime*.11); rp += vec2(nx - n0, ny - n0)*.8*near; }
        normal = normalize(normal + (viewMatrix*vec4(-rp.x, 0., -rp.y, 0.)).xyz);
      #endif`)
    .replace('#include <color_fragment>', `vec4 tileC = tileAt(vWorld.xz); float landF = tileC.a; diffuseColor.rgb *= tileC.rgb;
      float zk = clamp((uZoom - 1.15)/.9, 0., 1.); // P67: 0 up close, 1 with the camera far out
      #ifdef TOON
        // worked out for every pixel, so the bands have smooth curved edges
        // P67: the shape is pushed around by soft noise and scaled by the local chop too, so the bands wander instead of lining up in a grid
        vec2 bw = vWorld.xz + 150.*vec2(vnoise(vWorld.xz/430. + 3.) - .5, vnoise(vWorld.xz/370. + 11.) - .5) + 50.*vec2(vnoise(vWorld.xz/120.) - .5, vnoise(vWorld.xz/105. + 5.) - .5);
        vec3 swp = swell(bw, vAmp, uTime, vSh); float hk = clamp(swp.x/(vAmp + 1.5*vSh), -1., 1.);
        // flat bands of color: lighter on the crests, deeper in the troughs, with soft big patches of another blue, all with clean edges
        diffuseColor.rgb *= .92 + (.13 + .04*zk)*smoothstep(.2, .26, hk) - (.09 + .04*zk)*(1. - smoothstep(-.34, -.28, hk));
        diffuseColor.rgb *= 1. + (.05 + .05*zk)*smoothstep(.47, .5, vnoise(vWorld.xz/1100. + uTime*.004));
        diffuseColor.rgb *= 1. - uNight*.22;
      #else
        float hk = clamp(vH/vAmp, -1., 1.);
        // greener, lighter water on the crests where the light comes through, and wide slow patches, so it never looks flat
        diffuseColor.rgb *= .8*mix(.84, 1.1, smoothstep(-1., 1., hk));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(.9, 1.1, 1.05), smoothstep(.2, 1., hk)*.65);
        diffuseColor.rgb *= (.92 + .13*vnoise(vWorld.xz/620. + uTime*.008))*(1. + uNight*.08);
      #endif
      // P56: the wine-dark sea around the pirate king's lair (uLair = x, z, radius): deep wine red, crests a little lighter
      if (uLair.z > 0.){ float lk = 1. - smoothstep(uLair.z*.55, uLair.z, length(vWorld.xz - uLair.xy));
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(.24, .04, .12), vec3(.46, .12, .22), smoothstep(-1., 1., hk)), lk*.9); }`)
    // everything below goes in before the fog, so far water always melts into the haze with no edge
    .replace('#include <fog_fragment>', `
      vec3 foamC = mix(vec3(.97, .99, 1.), vec3(.62, .74, .78), uStorm*.7);
      foamC = mix(foamC, vec3(.46, .58, .8), uNight*.7); // moonlit foam: softer and bluer
      vec3 Vv = normalize(cameraPosition - vWorld);
      float lair = uLair.z > 0. ? 1. - smoothstep(uLair.z*.55, uLair.z, length(vWorld.xz - uLair.xy)) : 0.;
      #ifdef TOON
        float wobble = (vnoise(vWorld.xz/60. + uTime*.05) - .5)*.07, ll = landF + wobble;
        // shallow water near land: clean rings of lighter blue, and white foam rings that roll in to the shore
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb*vec3(1.2, 1.26, 1.16) + vec3(.03, .07, .06), 1. - smoothstep(.46, .49, ll));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb*vec3(1.14, 1.2, 1.1) + vec3(.05, .09, .06), 1. - smoothstep(.2, .23, ll));
        float roll = fract(ll*4.6 + uTime*.13), rollK = 1. - smoothstep(.55, .9, landF);
        float rings = (1. - smoothstep(.07, .13, abs(roll - .5)))*rollK*smoothstep(.34, .5, vnoise(vWorld.xz/46. - uTime*.04));
        // how rough the water is here decides which lines you see: long lazy strokes when calm, more when choppy, thick doubled ones in big seas
        float wav = vAmp, wCalm = 1. - smoothstep(3., 6., wav), wRough = smoothstep(8.5, 14., wav), wNorm = clamp(1. - wCalm - wRough, 0., 1.);
        vec2 lw = vWorld.xz + vSl*150. + vec2(uTime*2.4, -uTime*1.5); // the lines ride up and down the waves
        float px = dist*.0009, lfade = 1. - smoothstep(1300., 2700., zd), lines = 0.;
        if (wCalm > .01) lines = max(lines, wCalm*strokes(lw, 170., .05, .03, .7, .012, 0., px/170. + .004));
        if (wNorm > .01) lines = max(lines, wNorm*strokes(lw + 37., 112., .08, .042, .82, .022, 0., px/112. + .005));
        if (wRough > .01) lines = max(lines, wRough*strokes(lw*vec2(1., 1.2) + 71., 80., .13, .06, .94, .034, 1., px/80. + .006));
        // P67: from further out, bigger strokes join in, so a big ship's far-out view is never plain blue
        if (zk > .01) lines = max(lines, zk*strokes(lw + 13., 320., .05 + .04*wNorm, .034 + .012*wRough, .78, .018, 0., px/320. + .003));
        // the crest of each big wave gets its own broken white line, which moves with the wave itself
        float brk = smoothstep(.56, .66, vnoise(vWorld.xz/95. + vec2(uTime*.05, 0.)));
        float crest = (1. - smoothstep(.02, .06, abs(hk - .62)))*brk*clamp((wav - 4.5)*.2, 0., 1.)*lfade;
        float crest2 = (1. - smoothstep(.02, .06, abs(hk - .14)))*smoothstep(.5, .62, vnoise(vWorld.xz/120. - uTime*.06))*wRough*lfade;
        // white caps in rough water: hard-edged chunks of foam on the tallest waves
        float cap = smoothstep(.7, .76, hk)*smoothstep(.5, .55, vnoise(vWorld.xz/42. + vec2(uTime*.22, 0.)))*clamp((wav - 7.)*.14, 0., 1.);
        float white = max(max(lines*lfade, max(crest, crest2)), max(rings, cap))*(1. - lair)*(1. - .45*uNight)*(1. - .35*uStorm);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, foamC, white*.96);
        // star glints along the sun's path
        vec3 Rs = reflect(-uSun, vec3(0., 1., 0.)); float path = pow(max(dot(Rs, Vv), 0.), 14.);
        vec2 sp = vWorld.xz/58.; vec2 si = floor(sp), sf = fract(sp) - .5, sh = h2(mod(si, 289.));
        if (sh.x > .72 && path > .01){ float life = fract(sh.y*9. + uTime*.55), tw = sin(life*3.14159); vec2 q = sf - (sh - .5)*.5; q /= max(tw, .05);
          float star = exp(-abs(q.x)*26. - abs(q.y)*120.) + exp(-abs(q.y)*26. - abs(q.x)*120.);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1., .99, .93), min(1., star*2.2)*path*uGlint*tw); }
      #else
        // the sky mirrored in the water: more at a low angle, deeper blue high up, broken up by every little wave
        vec3 nW = normalize(vec3(-vSl.x - rp.x, 1., -vSl.y - rp.y)), Rr = reflect(-Vv, nW);
        float nv = max(dot(Vv, nW), 0.), fres = .1 + 1.5*pow(1. - nv, 2.4);
        fres = min(fres, .82);
        vec3 skyC = mix(uSky*1.08, uSky*vec3(.42, .62, .98), smoothstep(.45, 1., Rr.y));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, skyC, fres*(1. - .5*lair));
        // the sun on the water: a wide soft sheen, and bright glitter on the finest waves
        float sp = max(dot(reflect(-uSun, nW), Vv), 0.), glit = mix(vnoise(vWorld.xz/6.5 + vec2(uTime*.9, -uTime*.7)), vnoise(vWorld.xz/15. + vec2(uTime*.6, -uTime*.5)), zk);
        vec3 sunC = mix(vec3(1., .95, .84), vec3(.78, .86, 1.), uNight);
        gl_FragColor.rgb += sunC*(pow(sp, 10.)*.1 + pow(sp, 60.)*.32 + pow(sp, 300.)*smoothstep(.38, .8, glit)*2.2)*uGlint*near;
        // foam: soft white on the highest crests, more in rough water, and a gentle lace where waves lap at the shore
        float n1 = vnoise(vWorld.xz/64. + vec2(uTime*.14, -uTime*.05)), n2 = vnoise(vWorld.xz/17. - vec2(uTime*.1, uTime*.16));
        float foamN = n1*.65 + n2*.35, rough = clamp((vAmp - 2.5)*.1, 0., 1.);
        float cap = smoothstep(.34, .95, hk)*smoothstep(.56 - rough*.14, .78, foamN)*(.08 + rough);
        float lace = (1. - smoothstep(.05, .34, landF))*smoothstep(.5, .72, n2*.55 + n1*.45 + .22*sin(landF*26. - uTime*.8));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, foamC, clamp(cap*.8 + lace*.55, 0., .9)*(1. - lair)*(1. - .4*uNight)*(1. - smoothstep(1700., 3000., zd)));
      #endif
      // the wine-dark sea stays deep red and doesn't wash out to lilac
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb*vec3(.62, .28, .38) + vec3(.06, 0., .02), lair*.85);
      #include <fog_fragment>`);
};
// P56: where the wine-dark water is (the pirate king's lair); r = 0 turns it off
export function setLair(x, y, r){ foamU.uLair.value.set(x, y, r); }
export function setSeaLook(kind = 'real'){ const toon = kind === 'toon', L = LOOKS[toon ? 'toon' : 'real']; CSH.set(L[0]); CSEA.set(L[1]); CST.set(L[2]); CLAG.set(L[3]); SKY.set(toon ? '#b8def0' : '#b3d5e6');
  waterMat.defines = toon ? {TOON:1} : {}; waterMat.needsUpdate = true; }
setSeaLook((G.settings && G.settings.sea) || 'real');
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
  camK += ((G.dock && G.dock.mode !== 'out' ? .5 : 1) - camK) * .04;
  const dk = Math.min(1.85, (DEPTH_ZOOM[Math.max(0, G.curZone)] || 1)*(SHIP_ZOOM[SHIPS[G.S.tier].rank] || 1));
  if (Math.abs(dk - depthK) > .002){ depthK += (dk - depthK)*.012; if (zoomBucket(viewZoom()) !== zoomBucket(lastZoom)) applyZoom(); }
  const dist = (view.H > view.W ? 740 : 600) * viewZoom() * camK;
  // camera angle (a setting): high looks down more, low sees further toward the horizon
  const ang = CAM_ANGLES[G.settings.angle] || CAM_ANGLES.low;
  V.set(0, ang.up, Math.SQRT2).normalize() /* north is up: the camera sits to the south, looking north */.multiplyScalar(dist*ang.d);
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
const post = new T.ShaderMaterial({uniforms:{tex:{value:null}, res:{value:new T.Vector2(1, 1)}, focus:{value:.5}, bloom:{value:0}, far:{value:0}}, depthTest:false, depthWrite:false,
  vertexShader:'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader:`uniform sampler2D tex; uniform vec2 res; uniform float focus, bloom, far; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - focus), r = smoothstep(.32 - .07*far, .52 - .05*far, d)*(7. + 5.*far)*res.y/1200.; // only the outer edges blur, gently. P67: the same size on any screen, and a little more as the camera pulls back, so the tiny-world look holds
      // a soft round blur: 24 samples spread in a sunflower spiral, turned a little per pixel so no grid shows
      vec4 c = texture2D(tex, vUv); float tot = 1., spin = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453)*6.2831;
      if (r > .02) for (int i = 1; i <= 16; i++){ float k = float(i), a = k*2.39996 + spin, rr = sqrt(k/16.)*r; c += texture2D(tex, vUv + vec2(cos(a), sin(a))*rr/res); tot += 1.; } // the sharp middle skips the blur
      vec3 col = c.rgb/tot;
      // bloom: a wide ring of samples, only the bright parts, added back as a warm glow
      if (bloom > .01){ vec3 b = vec3(0.); for (int i = 0; i < 16; i++){ float k = float(i), a = k*.7854 + (i >= 8 ? .39 : 0.), rr = (i >= 8 ? 15. : 7.)*res.y/900.; // two fixed rings: smooth, no grain
          vec3 sc = texture2D(tex, vUv + vec2(cos(a), sin(a))*rr/res).rgb; b += max(sc - .8, 0.)*(i >= 8 ? .6 : 1.); } // P51: only really bright things (flames, windows) glow, not white sails
        col += b/12.*bloom*vec3(1.25, 1.05, .8); }
      float l = dot(col, vec3(.299, .587, .114));
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
  post.uniforms.far.value = Math.max(0, Math.min(1, (viewZoom() - 1)/1.2)); post.uniforms.tex.value = rt.texture; post.uniforms.res.value.set(w, h); post.uniforms.bloom.value = .1 + TOD.night*1.5; // a hint by day, strong at night around flames and windows
  renderer.render(postScene, postCam);
}
