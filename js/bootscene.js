// P74: the loading screen's little scene: one ship on her own sea. It runs on a background thread when the device allows it (bootworker.js),
// so it stays smooth while the game is busy loading. Otherwise it runs on the page (bootship.js).
import {buildShip, animateShip} from './ships.js?v=e95989f';
const T = self.THREE;
const SEA_V = `uniform float uT, uHalf, uBeam; varying vec2 vP; varying vec3 vW;
float wave(vec2 p, float t){ return sin(p.x*.052 + p.y*.021 + t*1.1)*1.5 + sin(p.x*.031 - p.y*.058 + t*.8)*1.1 + sin(p.x*.11 + p.y*.07 + t*1.7)*.4; }
void main(){ vec2 p = position.xy; vP = p; vec2 q = vec2(p.x/uHalf, p.y/uBeam);
  float calm = smoothstep(.9, 2.4, length(q)); // the water lies flat right at the hull, so no wave comes up through the deck
  float h = wave(vec2(p.x + uT*42., p.y), uT)*calm; vW = vec3(p.x, h, -p.y); gl_Position = projectionMatrix*modelViewMatrix*vec4(p, h, 1.); }`;
const SEA_F = `precision highp float; uniform float uT, uHalf, uBeam, uFar, uK; uniform vec3 uCam, uSky; varying vec2 vP; varying vec3 vW;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ return noise(p)*.55 + noise(p*2.1 + 3.7)*.3 + noise(p*4.3 + 7.1)*.15; }
void main(){ vec2 s = vec2(vP.x + uT*42., vP.y)/uK; // the water's pattern scales with the ship, so a close-up of a little boat stays smooth
  vec3 v = uCam - vW; float dist = length(v); v /= dist;
  float near = clamp(1. - dist/(uHalf*26.), 0., 1.); near *= near;
  float e = .35; vec2 g = vec2(fbm(s*.05 + uT*.1 + vec2(e, 0.)) - fbm(s*.05 + uT*.1 - vec2(e, 0.)), fbm(s*.05 - uT*.08 + vec2(0., e)) - fbm(s*.05 - uT*.08 - vec2(0., e)));
  vec3 n = normalize(vec3(-g.x*.42*near, 1., -g.y*.42*near));
  float fres = pow(1. - max(dot(n, v), 0.), 5.);
  float swell = fbm(s*.014 + uT*.03);
  vec3 col = mix(vec3(.035, .27, .45), vec3(.08, .46, .62), smoothstep(.25, .75, swell));
  col = mix(col, uSky*.92, min(.62, fres*.8 + .03));
  vec3 sun = normalize(vec3(-.35, .55, .75)); col += vec3(1., .94, .78)*pow(max(dot(reflect(-v, n), sun), 0.), 90.)*.55*near;
  // shade and foam around the ship: x runs along her, the bow is at +x
  float x = vP.x, z = abs(vP.y), back = uHalf - x, ell = length(vec2(x/uHalf, vP.y/uBeam));
  col *= mix(.72, 1., smoothstep(.85, 2., ell));
  float brk = fbm(s*.16 + vec2(uT*.2, 0.)), foam = 0.;
  float wide = 1.2 + max(back, 0.)*.055, d = abs(z - (back*.24 + uBeam*.45));
  foam += step(0., back)*smoothstep(wide, 0., d)*smoothstep(uHalf*7., uHalf*.4, back);         // the V the bow pushes out
  foam += smoothstep(1.55, .95, ell)*smoothstep(.72, .9, ell)*.75;                                 // white water along the hull
  float aft = -uHalf - x, aw = uBeam*.55 + max(aft, 0.)*.07;
  foam += step(0., aft)*exp(-z*z/(aw*aw))*smoothstep(uHalf*5., 0., aft)*.9;                        // the churned trail astern
  foam *= smoothstep(.34, .62, brk + foam*.22);
  col = mix(col, vec3(.95, .98, .98), clamp(foam, 0., 1.)*.9);
  col = mix(col, uSky, smoothstep(uFar*.3, uFar*.95, dist));
  gl_FragColor = vec4(col, 1.); }`;

const SKY_V = `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix*mat4(mat3(modelViewMatrix))*vec4(position, 1.); gl_Position = p.xyww; }`;
const SKY_F = `precision highp float; uniform vec3 uSky; varying vec3 vD; void main(){ float y = max(normalize(vD).y, 0.); vec3 c = mix(uSky, vec3(.55, .8, .92), smoothstep(0., .035, y)); gl_FragColor = vec4(mix(c, vec3(.2, .52, .8), smoothstep(.03, .2, y)), 1.); }`;


// info: {model, look, len, beam, speed}. Returns {stop, resize}.
export function runBootScene(canvas, info, w, h, dpr, onFirst){
  let alive = true; const raFrame = self.requestAnimationFrame ? cb => self.requestAnimationFrame(cb) : cb => setTimeout(() => cb(performance.now()), 16), born = performance.now();
  const renderer = new T.WebGLRenderer({canvas, antialias:true, powerPreference:'low-power'}); renderer.setPixelRatio(dpr);
  const sh = info;
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 1, 30000);
    scene.add(new T.HemisphereLight(0xeaf3f5, 0x8c927c, .85));
    const sun = new T.DirectionalLight(0xffeccc, .7); sun.position.set(-120, 260, 200); scene.add(sun);
    const fill = new T.DirectionalLight(0xcfe3ff, .3); fill.position.set(200, 120, -180); scene.add(fill);
    // the same ship the game will show: her own paint, sails, upgrades and crew
    const root = buildShip(sh.model, sh.look, true);
    root.userData.windFill = .6; root.userData.stow = !!(root.userData.sails || []).length;
    root.rotation.order = 'YXZ'; root.position.y = sh.len*.05; scene.add(root);
    const box = new T.Box3().setFromObject(root), size = box.getSize(new T.Vector3()), mid = box.getCenter(new T.Vector3());
    const half = sh.len/2, beam = sh.beam*.62, far = Math.max(9000, sh.len*80);
    const sky = new T.Color('#e6f4f0');
    const U = {uT:{value:0}, uHalf:{value:half}, uBeam:{value:beam}, uFar:{value:far}, uCam:{value:new T.Vector3()}, uSky:{value:new T.Vector3(sky.r, sky.g, sky.b)}, uK:{value:Math.max(.45, sh.len/130)}};
    const geo = new T.PlaneGeometry(far*2, far*2, 240, 240); // more detail near the ship: squeeze the grid toward the middle
    { const p = geo.attributes.position; for (let i = 0; i < p.count; i++){ const f = c => { const k = c/far; return Math.sign(k)*Math.pow(Math.abs(k), 2.6)*far; }; p.setXY(i, f(p.getX(i)), f(p.getY(i))); } }
    const sea = new T.Mesh(geo, new T.ShaderMaterial({uniforms:U, vertexShader:SEA_V, fragmentShader:SEA_F, side:T.DoubleSide})); sea.rotation.x = -Math.PI/2; sea.frustumCulled = false; scene.add(sea);
    const dome = new T.Mesh(new T.SphereGeometry(10, 24, 12), new T.ShaderMaterial({uniforms:U, vertexShader:SKY_V, fragmentShader:SKY_F, side:T.BackSide, depthWrite:false})); dome.frustumCulled = false; dome.renderOrder = -1; scene.add(dome);
    const fit = () => { renderer.setSize(w, h, false); cam.aspect = w/h; cam.updateProjectionMatrix(); };
    fit();
    const tanV = Math.tan(cam.fov*Math.PI/360);
    const draw = now => { if (!alive) return; const t = (now - born)/1000;
      const a = .5 + Math.sin(t*.13)*.1; // the camera drifts slowly, well forward, looking back along her bow
      const wideNow = Math.abs(size.x*Math.sin(a)) + Math.abs(size.z*Math.cos(a));
      const d = Math.max(wideNow*.5/(tanV*cam.aspect), size.y*.62/tanV)*.84 + size.x*.2, pitch = .2;
      root.position.y = sh.len*.05 + Math.sin(t*.9)*.5; root.rotation.z = Math.sin(t*.7)*.022; root.rotation.x = Math.sin(t*.55 + 1)*.035 - .03;
      animateShip(root, t, sh.speed*.7);
      cam.position.set(mid.x + Math.cos(a)*d*Math.cos(pitch), mid.y*.55 + Math.sin(pitch)*d, Math.sin(a)*d*Math.cos(pitch)); cam.lookAt(mid.x, mid.y*.86, 0);
      U.uT.value = t; U.uCam.value.copy(cam.position);
      renderer.render(scene, cam); if (onFirst){ onFirst(); onFirst = null; }
      if (alive) raFrame(draw); };
  
  raFrame(draw);
  return {stop(){ alive = false; renderer.dispose(); renderer.forceContextLoss(); }, resize(a, b){ w = a; h = b; fit(); }};
}
