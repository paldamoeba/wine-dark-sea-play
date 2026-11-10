// P70: two things that live on and over the sea, drawn in the 3D world so ships and islands properly hide them:
// the bubbles of sardine schools, and the wind.
import {G} from './state.js?v=ed3e210';
import {SHOALS, shoalOn, waterY, hash} from './world.js?v=ed3e210';
import {SHORE_FISH} from './config.js?v=ed3e210';
const T = window.THREE;

// ---- fish bubbles: a few round bubbles popping on the water while a school is out. One mesh, rebuilt each frame ----
const MAXB = 90, bPos = new Float32Array(MAXB*4*3), bUv = new Float32Array(MAXB*4*3);
const bIdx = new Uint16Array(MAXB*6); for (let i=0;i<MAXB;i++) bIdx.set([i*4, i*4 + 1, i*4 + 2, i*4, i*4 + 2, i*4 + 3], i*6);
const bGeo = new T.BufferGeometry();
bGeo.setAttribute('position', new T.BufferAttribute(bPos, 3).setUsage(T.DynamicDrawUsage));
bGeo.setAttribute('aUv', new T.BufferAttribute(bUv, 3).setUsage(T.DynamicDrawUsage));
bGeo.setIndex(new T.BufferAttribute(bIdx, 1));
const bMat = new T.ShaderMaterial({transparent:true, depthWrite:false, side:T.DoubleSide, fog:true,
  uniforms:T.UniformsUtils.merge([T.UniformsLib.fog, {uNight:{value:0}}]),
  vertexShader:`attribute vec3 aUv; varying vec3 vP;
    #include <fog_pars_vertex>
    void main(){ vP = aUv; vec4 mvPosition = modelViewMatrix*vec4(position, 1.); gl_Position = projectionMatrix*mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader:`uniform float uNight; varying vec3 vP;
    #include <fog_pars_fragment>
    void main(){ float r = length(vP.xy), disc = 1. - smoothstep(.72, 1., r), rim = smoothstep(.45, .8, r);
      vec3 day = vec3(.96, .99, 1.), night = vec3(.55, .98, .9); // at night the schools glow blue-green
      gl_FragColor = vec4(mix(day, night, uNight), disc*(.28 + .6*rim)*vP.z);
      #include <fog_fragment>
    }`});
const bMesh = new T.Mesh(bGeo, bMat); bMesh.frustumCulled = false; bMesh.renderOrder = 2;
export function updateBubbles(){
  const t = G.t, S = G.S; let n = 0;
  for (const s of SHOALS){
    if (Math.abs(s.x - S.x) > 1100 || Math.abs(s.y - S.y) > 1100 || !shoalOn(s, t, SHORE_FISH.period[1], SHORE_FISH.on)) continue;
    for (let k=0;k<7 && n<MAXB;k++){ const ph = (t*.9 + hash(s.x, k)) % 1; if (ph > .4 || ph < 0) continue;
      const x = s.x + (hash(k, s.y) - .5)*90, z = s.y + (hash(s.y, k) - .5)*90, u = ph/.4, a = Math.sin(u*Math.PI), r = 3 + 6*Math.sqrt(u), y = waterY(x, z, t) + 1.4, i = n*12;
      bPos[i] = x - r; bPos[i+1] = y; bPos[i+2] = z - r; bPos[i+3] = x + r; bPos[i+4] = y; bPos[i+5] = z - r; bPos[i+6] = x + r; bPos[i+7] = y; bPos[i+8] = z + r; bPos[i+9] = x - r; bPos[i+10] = y; bPos[i+11] = z + r;
      bUv[i] = -1; bUv[i+1] = -1; bUv[i+2] = a; bUv[i+3] = 1; bUv[i+4] = -1; bUv[i+5] = a; bUv[i+6] = 1; bUv[i+7] = 1; bUv[i+8] = a; bUv[i+9] = -1; bUv[i+10] = 1; bUv[i+11] = a; n++; }
  }
  bGeo.setDrawRange(0, n*6); bMesh.visible = n > 0; if (!n) return;
  bGeo.attributes.position.needsUpdate = true; bGeo.attributes.aUv.needsUpdate = true; bMat.uniforms.uNight.value = G.night || 0;
}
export const addBubbles = scene => scene.add(bMesh);

// ---- the wind: thin, soft threads of moving air, in small groups, sliding low over the water and bending with the gust.
// They travel on the graphics card: only a few numbers change each frame. Each thread draws itself in and fades away, and the
// whole set follows the camera. Stronger wind = more of them, faster and brighter.
const GROUPS = 9, THREADS = 3, SEG = 22, RANGE = 2600;
export function makeWind(scene, scale = 1){
  const nT = GROUPS*THREADS, nV = nT*(SEG + 1)*2, a = new Float32Array(nV*2), seed = new Float32Array(nV*4), idx = new Uint16Array(nT*SEG*6); let v = 0, q = 0;
  for (let g=0;g<GROUPS;g++){ const sx = hash(g, 3.1), sz = hash(7.7, g), ph = hash(g, 9.3);
    for (let h=0;h<THREADS;h++){ const lat = (h - 1)*(26 + hash(g, h)*26), lag = hash(h + 3, g)*.16;
      for (let j=0;j<=SEG;j++){ for (const sd of [-1, 1]){ a[v*2] = j/SEG; a[v*2 + 1] = sd; seed[v*4] = sx; seed[v*4 + 1] = sz; seed[v*4 + 2] = ph + lag; seed[v*4 + 3] = lat; v++; } }
      const v0 = v - (SEG + 1)*2; for (let j=0;j<SEG;j++){ const b = v0 + j*2; idx.set([b, b + 1, b + 2, b + 1, b + 3, b + 2], q); q += 6; } }
  }
  const len = new Float32Array(nV); for (let i=0;i<nV;i++){ const g = Math.floor(i/((SEG + 1)*2*THREADS)); len[i] = 420 + hash(g, 1.7)*520; }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(new Float32Array(nV*3), 3));
  geo.setAttribute('aS', new T.BufferAttribute(a, 2)); geo.setAttribute('aSeed', new T.BufferAttribute(seed, 4)); geo.setAttribute('aLen', new T.BufferAttribute(len, 1));
  geo.setIndex(new T.BufferAttribute(idx, 1));
  const U = {uT:{value:0}, uDir:{value:new T.Vector2(1, 0)}, uK:{value:0}, uCam:{value:new T.Vector2()}, uNight:{value:0}, uScale:{value:scale}, uSp:{value:0}};
  const mat = new T.ShaderMaterial({transparent:true, depthWrite:false, side:T.DoubleSide, fog:true,
    uniforms:T.UniformsUtils.merge([T.UniformsLib.fog, U]),
    vertexShader:`attribute vec2 aS; attribute vec4 aSeed; attribute float aLen; uniform float uT, uK, uNight, uScale, uSp; uniform vec2 uDir, uCam; varying float vA;
      #include <fog_pars_vertex>
      void main(){
        const float R = ${RANGE.toFixed(1)};
        vec2 side = vec2(-uDir.y, uDir.x);
        float s = aS.x, life = fract(uT*(.1 + .05*aSeed.x) + aSeed.z);
        // each life this thread appears somewhere new across the wind, so it never runs along the same line twice
        float cyc = floor(uT*(.1 + .05*aSeed.x) + aSeed.z);
        vec2 p0 = (vec2(fract(aSeed.x + cyc*.618), fract(aSeed.y + cyc*.382)) - .5)*R;
        vec2 base = uCam + p0 + uDir*(life*uSp*7.);
        float L = aLen*uScale, along = s*L;
        // a long lazy S, moving along the thread, the same for all threads of a group; each keeps its own place beside the others
        float bend = sin(s*3.4 + aSeed.x*6.28 + uT*.35)*46. + sin(s*7.1 + aSeed.y*6.28 - uT*.5)*12.;
        vec2 xz = base + uDir*along + side*((bend + aSeed.w*(.55 + .45*sin(s*3.14)))*uScale);
        float y = (34. + 26.*aSeed.y + 14.*sin(s*5. + uT*.4 + aSeed.x*6.))*uScale;
        // it draws itself in from the tail and is eaten from the tail again: only part of it shows at a time
        float head = smoothstep(0., .58, life), tail = smoothstep(.42, 1., life), win = smoothstep(tail - .001, tail + .2, s)*(1. - smoothstep(head - .2, head + .001, s));
        float w = sin(clamp((s - tail)/max(.02, head - tail), 0., 1.)*3.14159);
        vec2 dt = uDir + side*(cos(s*3.4 + aSeed.x*6.28 + uT*.35)*.3); vec2 nrm = normalize(vec2(-dt.y, dt.x));
        xz += nrm*aS.y*(1. + 2.6*w)*uScale;
        vA = win*(.2 + .8*w)*smoothstep(.34, .85, uK)*(.42 + .34*uK)*(1. - .45*uNight)*(1. - smoothstep(.72, 1., length(p0)/(R*.5)));
        vec4 mvPosition = modelViewMatrix*vec4(xz.x, y, xz.y, 1.); gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader:`varying float vA;
      #include <fog_pars_fragment>
      void main(){ gl_FragColor = vec4(1., 1., 1., vA);
        #include <fog_fragment>
      }`});
  const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 3; scene.add(mesh);
  const u = mat.uniforms; let clock = 0;
  return {mesh, update(dt, angle, k, cx, cz, night){ mesh.visible = k > .34; if (!mesh.visible) return;
    clock += dt; u.uT.value = clock; u.uDir.value.set(Math.cos(angle), Math.sin(angle)); u.uK.value = k; u.uSp.value = 70 + 170*k; u.uCam.value.set(cx, cz); u.uNight.value = night || 0; }};
}
