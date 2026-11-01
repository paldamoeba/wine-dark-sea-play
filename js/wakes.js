// Wakes: every moving ship pushes the water aside. Two smooth bands of foam spread out from the bow in a V, and a wider,
// softer trail stays behind the stern, widening and fading as it goes. Each band is a ribbon that follows the ship's path,
// so turns leave curved wakes. All ships share one mesh, rebuilt every frame (a few thousand points at most).
import {G, ship} from './state.js?v=e273bb2';
import {scene} from './scene.js?v=e273bb2';
import {waterY} from './world.js?v=e273bb2';
import {enemies} from './combat.js?v=e273bb2';

const T = window.THREE;
const MAXV = 30000;
const posA = new Float32Array(MAXV*3), uA = new Float32Array(MAXV), aA = new Float32Array(MAXV);
const geo = new T.BufferGeometry();
geo.setAttribute('position', new T.BufferAttribute(posA, 3).setUsage(T.DynamicDrawUsage));
geo.setAttribute('aU', new T.BufferAttribute(uA, 1).setUsage(T.DynamicDrawUsage));
geo.setAttribute('aA', new T.BufferAttribute(aA, 1).setUsage(T.DynamicDrawUsage));
const mat = new T.ShaderMaterial({transparent:true, depthWrite:false, fog:true,
  uniforms:T.UniformsUtils.merge([T.UniformsLib.fog, {uTime:{value:0}, uNight:{value:0}}]),
  vertexShader:`attribute float aU, aA; varying float vU, vA; varying vec2 vW;
    #include <fog_pars_vertex>
    void main(){ vU = aU; vA = aA; vW = position.xz; vec4 mvPosition = modelViewMatrix*vec4(position, 1.); gl_Position = projectionMatrix*mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader:`uniform float uTime, uNight; varying float vU, vA; varying vec2 vW;
    #include <fog_pars_fragment>
    float h(vec2 p){ return fract(sin(dot(mod(p, 256.), vec2(127.1, 311.7)))*43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    void main(){
      // soft edges across the band, and the foam broken into gentle clumps so it looks like water, not paint
      float edge = 1. - smoothstep(.2, 1., abs(vU)), clump = .7 + .4*n2(vW*.07 + vec2(uTime*.3, 0.)) + .15*n2(vW*.25);
      gl_FragColor = vec4(mix(vec3(.96, .99, 1.), vec3(.55, .66, .86), uNight*.6), clamp(vA*edge*clump, 0., 1.));
      #include <fog_fragment>
    }`});
const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 1; scene.add(mesh);

// each ship's track: points dropped every few steps while it moves, newest first
const tracks = new Map();
let nv = 0;
function record(o, x, y, a, v, len, beam){
  let tr = tracks.get(o); if (!tr){ tr = {pts:[], d:0, lx:x, ly:y, len, beam, seen:0}; tracks.set(o, tr); }
  tr.seen = G.t; tr.len = len; tr.beam = beam;
  tr.d += Math.hypot(x - tr.lx, y - tr.ly); tr.lx = x; tr.ly = y;
  tr.head = v >= 20 ? {x, y, a, v, t:G.t} : null; // the live end of the ribbons stays glued to the ship
  if (v < 20 || tr.d < 5 + len*.02) return; tr.d = 0;
  const k = Math.min(1, v/180); tr.pts.unshift({x, y, a, v, t:G.t, life:1.6 + k*1.6});
}
// one ribbon: a list of centers newest first, each {x, y, w (width), a (alpha)}
const C = [];
function strip(n){
  if (n < 2 || nv + (n - 1)*6 > MAXV) return;
  let pl = null;
  for (let j=0;j<n;j++){
    const c = C[j], p = C[Math.max(0, j - 1)], q = C[Math.min(n - 1, j + 1)];
    let dx = p.x - q.x, dy = p.y - q.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const hw = c.w/2, y = waterY(c.x, c.y, G.t) + .8;
    const cur = [c.x - dy*hw, y, c.y + dx*hw, c.x + dy*hw, y, c.y - dx*hw, c.a];
    if (pl){ quad(pl, cur); }
    pl = cur;
  }
}
function vert(x, y, z, u, a){ const i = nv*3; posA[i] = x; posA[i+1] = y; posA[i+2] = z; uA[nv] = u; aA[nv] = a; nv++; }
function quad(p, c){ // p, c: [left x, y, z, right x, y, z, alpha]
  vert(p[0], p[1], p[2], -1, p[6]); vert(p[3], p[4], p[5], 1, p[6]); vert(c[0], c[1], c[2], -1, c[6]);
  vert(p[3], p[4], p[5], 1, p[6]); vert(c[3], c[4], c[5], 1, c[6]); vert(c[0], c[1], c[2], -1, c[6]);
}
function build(tr){
  const now = G.t, L = tr.len, B = tr.beam;
  tr.pts = tr.pts.filter(p => now - p.t < p.life);
  const all = tr.head ? [tr.head, ...tr.pts] : tr.pts; if (all.length < 2) return;
  // the trail behind the stern: wide and soft, spreading as it ages
  let n = 0;
  for (const p of all){ const age = now - p.t, f = age/(p.life || 3), ca = Math.cos(p.a), sa = Math.sin(p.a);
    C[n++] = {x:p.x - ca*L*.46, y:p.y - sa*L*.46, w:B*.75 + age*16, a:.62*Math.min(1, p.v/90)*(1 - f)*Math.min(1, age*4 + .4)}; }
  strip(n);
  // the two bow waves: born at the shoulders of the bow, sliding outward as they age, so they open into a V
  for (const s of [1, -1]){ n = 0;
    for (const p of all){ const age = now - p.t, f = age/(p.life || 3), ca = Math.cos(p.a), sa = Math.sin(p.a), out = B*.5 + age*p.v*.33, bx = p.x + ca*L*.28, by = p.y + sa*L*.28;
      C[n++] = {x:bx - sa*s*out - ca*age*p.v*.06, y:by + ca*s*out - sa*age*p.v*.06, w:5 + B*.16 + age*11, a:.9*Math.min(1, p.v/70)*Math.pow(1 - f, 1.4)*Math.min(1, age*6 + .2)}; }
    strip(n); }
}
export function updateWakes(dt){
  const S = G.S, sh = ship(), cx = G.cam.x, cy = G.cam.y;
  mat.uniforms.uTime.value = G.t; mat.uniforms.uNight.value = G.night || 0;
  record(S, S.x, S.y, S.a, G.dock ? 0 : G.v, sh.len, sh.beam);
  for (const e of enemies){ if (e.dead || e.fort || Math.abs(e.x - cx) > 1500 || Math.abs(e.y - cy) > 1500) continue; record(e, e.x, e.y, e.a, e.v, e.spec.len, e.spec.beam); }
  nv = 0;
  for (const [o, tr] of tracks){
    if (G.t - tr.seen > 4 && !tr.pts.length){ tracks.delete(o); continue; } // a ship that sank or sailed away
    if (G.t - tr.seen > .2) tr.head = null;
    build(tr);
  }
  geo.setDrawRange(0, nv);
  for (const a of ['position', 'aU', 'aA']){ const at = geo.attributes[a]; at.needsUpdate = true; at.updateRange.offset = 0; at.updateRange.count = nv*at.itemSize; }
}
