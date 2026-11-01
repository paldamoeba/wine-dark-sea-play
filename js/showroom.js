// The showroom: every 3D model in the game on one calm sea, to look at from all sides, under different lights.
// Uses the game's own builders, so what you see here is exactly what sails in the game.
import {buildShip, animateShip, SPECS, CEL, setCel, inkify, person, beanGeo, cuteHead, mat, setTorches, HELMETS, statue, flicker} from './ships.js?v=f22acb2';
import {makePost} from './glow.js?v=f22acb2';
import {SOUNDS, STYLES, BATTLE, sfx, updateAudio, testMusic, stopMusic, startAudio} from './audio.js?v=f22acb2';
import {buildColossus, buildFortress, buildGladiator, buildCamp} from './monuments.js?v=f22acb2';
import {makeFire, updateFire} from './fire.js?v=f22acb2';
import {updateSmoke} from './smoke.js?v=f22acb2';
import {addGrass, updateGrass} from './grass.js?v=f22acb2';
import {WIN_MAT, cypress, roundTree, CYPRESS_TINTS, ROUND_TINTS, house, temple, farm, gull, whaleModel, dolphinModel, krakenModel, icebergModel, wreckModel, fishModel} from './models.js?v=f22acb2';

const T = window.THREE, $ = id => document.getElementById(id);
const renderer = new T.WebGLRenderer({canvas:$('stage'), antialias:true});
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
const scene = new T.Scene(); scene.fog = new T.Fog('#c9e3e8', 2200, 5200);
const hemi = new T.HemisphereLight(0xeaf3f5, 0x8c927c, .8); scene.add(hemi);
const sun = new T.DirectionalLight(0xffeccc, .65); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left:-700, right:700, top:700, bottom:-700, far:2500}); scene.add(sun);
sun.shadow.bias = -.0006; sun.shadow.normalBias = 1.4; sun.shadow.radius = 3;
const sunDir = new T.Vector3(-400, 700, 400);
const fill = new T.DirectionalLight(0xcfe3ff, .28); fill.position.set(300, 200, -300); scene.add(fill);
const seaMat = new T.MeshLambertMaterial({color:'#2b7f93'});
const sea = new T.Mesh(new T.CircleGeometry(6000, 64), seaMat); sea.rotation.x = -Math.PI/2; sea.receiveShadow = true; scene.add(sea);
// Full graphics: a rolling sea like the game's, with drifting foam lines, white crests, sky reflections and sun glints.
// The same wave sum runs here in JavaScript (wv) so ships ride on it. uCalm flattens it around islands and towns.
const waveU = {uTime:{value:0}, uAmp:{value:.5}, uStorm:{value:0}, uGlint:{value:1}, uSky:{value:new T.Color()}, uSun:{value:new T.Vector3(0, 1, 0)}, uCalm:{value:new T.Vector3(0, 0, 0)}};
const WV = `uniform float uTime, uAmp; uniform vec3 uCalm;
  float wv(vec2 p0){ float k = uAmp*smoothstep(uCalm.z, uCalm.z + 160., length(p0 - uCalm.xy));
    vec2 p = vec2(p0.x + 70.*sin(p0.y*.0021 + 1.3) + 30.*sin(p0.y*.0057 + p0.x*.0013), p0.y + 70.*sin(p0.x*.0017 - .7) + 30.*sin(p0.x*.0049 - p0.y*.0011));
    return k*(sin(p.x*.012 + uTime*1.1)*3.2 + sin(p.y*.017 - uTime*1.3)*2.4 + sin((p.x + p.y)*.03 + uTime*1.9)*1.1 + sin((p.x - p.y)*.05 - uTime*2.4)*.5); }`;
function wv(x0, z0, t){ const k = waveU.uAmp.value*Math.min(1, Math.max(0, (Math.hypot(x0 - waveU.uCalm.value.x, z0 - waveU.uCalm.value.y) - waveU.uCalm.value.z)/160));
  const x = x0 + 70*Math.sin(z0*.0021 + 1.3) + 30*Math.sin(z0*.0057 + x0*.0013), z = z0 + 70*Math.sin(x0*.0017 - .7) + 30*Math.sin(x0*.0049 - z0*.0011);
  return k*(Math.sin(x*.012 + t*1.1)*3.2 + Math.sin(z*.017 - t*1.3)*2.4 + Math.sin((x + z)*.03 + t*1.9)*1.1 + Math.sin((x - z)*.05 - t*2.4)*.5); }
const waveMat = new T.MeshLambertMaterial({color:'#2b7f93'});
waveMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, waveU);
  sh.vertexShader = WV + '\nvarying vec3 vWorld;\n' + sh.vertexShader
    .replace('#include <beginnormal_vertex>', 'vec2 pp = position.xz; float e = 2.; vec3 objectNormal = normalize(vec3(wv(pp - vec2(e, 0.)) - wv(pp + vec2(e, 0.)), 2.*e, wv(pp - vec2(0., e)) - wv(pp + vec2(0., e))));')
    .replace('#include <begin_vertex>', 'vec3 transformed = position; transformed.y += wv(position.xz); vWorld = (modelMatrix*vec4(transformed, 1.)).xyz;');
  sh.fragmentShader = `varying vec3 vWorld; uniform float uTime, uStorm, uGlint, uAmp; uniform vec3 uSun, uSky;
    vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p)*43758.5453); }
    float cells(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(float(x), float(y)), o = h2(mod(i + g, 256.));
        o = .5 + .42*sin(uTime*.35 + 6.2831*o); float d = length(g + o - f); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return d2 - d1; }
    ` + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      vec2 q = vWorld.xz/125.; q += .32*vec2(sin(q.y*1.3 + uTime*.4), cos(q.x*1.1 - uTime*.3)); q += .1*vec2(sin(q.y*4.7 - uTime*.6), cos(q.x*4.3 + uTime*.5));
      float line = 1. - smoothstep(.02, .055, cells(q));
      float dist = length(vWorld.xz - cameraPosition.xz), fade = smoothstep(3200., 600., dist);
      vec3 foamC = mix(vec3(.92, .98, 1.), vec3(.42, .62, .68), uStorm);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, foamC, line*.75*fade*(1. - .45*uStorm));
      float crest = smoothstep(.55, .9, vWorld.y/max(.01, 7.2*uAmp)); gl_FragColor.rgb = mix(gl_FragColor.rgb, foamC, crest*.45);
      vec3 V = normalize(cameraPosition - vWorld); gl_FragColor.rgb = mix(gl_FragColor.rgb, uSky, pow(1. - max(V.y, 0.), 3.)*.35);
      vec2 w = vWorld.xz + 40.*vec2(sin(vWorld.z*.013), sin(vWorld.x*.011));
      vec3 nrm = normalize(vec3(sin(w.x*.045 + uTime*1.7)*.16 + sin((w.x + w.y)*.11 - uTime*2.3)*.08, 1., cos(w.y*.05 - uTime*1.4)*.16 + sin((w.x - w.y)*.09 + uTime*2.1)*.08));
      float sp = max(dot(reflect(-uSun, nrm), V), 0.); gl_FragColor.rgb += vec3(1., .96, .86)*(pow(sp, 24.)*.1 + pow(sp, 260.)*.75)*uGlint;`);
};
const waveGeo = new T.PlaneGeometry(6000, 6000, 220, 220); waveGeo.rotateX(-Math.PI/2);
const waves = new T.Mesh(waveGeo, waveMat); waves.receiveShadow = true; waves.visible = false; scene.add(waves);
const post = makePost(renderer);
const camera = new T.PerspectiveCamera(40, 1, 2, 9000);
let group = 'ships', idx = 0, obj = null, focus = new T.Vector3(), dist = 300, yaw = -.9, pitch = .42, spin = false;

// ---- lights: the times of day and weather from the game, plus a plain studio light for looking at shapes ----
// sky = background and fog, hemi = [sky light, ground light, strength], sun = [color, strength, direction], sea = water color
const LIGHTS = {
  noon:    {name:'Sunny day',   sky:'#c9e3e8', hemi:['#eaf3f5', '#8c927c', .8],  sun:['#ffeccc', .65, [-400, 700, 400]], fill:.28, sea:'#2b7f93'},
  morning: {name:'Morning',     sky:'#f2dccb', hemi:['#f6e6da', '#8c8a7c', .75], sun:['#ffd9b0', .6, [700, 300, 300]],   fill:.3,  sea:'#3f8c9c'},
  golden:  {name:'Golden hour', sky:'#f3bd6a', hemi:['#ffd590', '#7a6a58', .64], sun:['#ffae45', .92, [-700, 220, 200]],  fill:.14, sea:'#4a8db0'},
  sunset:  {name:'Sunset',      sky:'#e99073', hemi:['#f6b49a', '#7a6670', .85], sun:['#ff9a62', .85, [-800, 160, -100]], fill:.25, sea:'#4f8399'},
  night:   {name:'Night',       sky:'#16213a', hemi:['#5d74a8', '#1c2333', .4], sun:['#b8cbff', .24, [300, 600, -300]],  fill:.08, sea:'#14334c'},
  storm:   {name:'Storm',       sky:'#6e7d85', hemi:['#a9b5ba', '#4c5550', .7],  sun:['#d8dde0', .2, [-200, 700, 200]],  fill:.1,  sea:'#2c5560'},
  studio:  {name:'Studio',      sky:'#e9e6df', hemi:['#ffffff', '#b8b2a6', .85], sun:['#ffffff', .55, [-300, 600, 500]],  fill:.35, sea:'#d6d1c6'},
};
let lightKey = 'noon', full = false, glowOn = false;
function setLight(k){
  lightKey = k; const L = LIGHTS[k]; scene.background = new T.Color(L.sky); scene.fog.color.set(L.sky);
  scene.fog.near = k === 'storm' ? 900 : 2200; scene.fog.far = k === 'storm' ? 3200 : 5200;
  waveMat.color.set(L.sea); waveU.uSky.value.set(L.sky); waveU.uStorm.value = k === 'storm' ? 1 : 0; waveU.uGlint.value = k === 'storm' ? .2 : k === 'night' ? .35 : 1;
  rain.visible = k === 'storm'; lightTorches(); WIN_MAT.color.set(k === 'night' ? '#ffc865' : k === 'storm' ? '#8a7a5a' : '#33414f'); // lamplit windows at night
  hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
  sun.color.set(L.sun[0]); sun.intensity = L.sun[1]; sunDir.set(...L.sun[2]); sun.position.copy(focus).add(sunDir); fill.intensity = L.fill; seaMat.color.set(L.sea);
  document.body.style.background = L.sky; $('tagline').style.color = k === 'night' || k === 'storm' ? '#e9eef7' : ''; document.body.classList.toggle('dark', k === 'night' || k === 'storm');
  setWaves();
}
// waves: gentle in fair weather, big in a storm (full graphics only; the simple look keeps a flat sea)
function setWaves(){ waves.visible = full; sea.visible = !full; waveU.uAmp.value = lightKey === 'storm' ? 1.25 : .5; }
// Torches burn at night and in storms. With a few torches each one also lights the deck around it.
function lightTorches(){ if (!obj) return; const on = lightKey === 'night' || lightKey === 'storm', roots = [];
  obj.traverse(o => { if (o.userData.torches && o.userData.torches.length) roots.push(o); });
  const n = roots.reduce((a, r) => a + r.userData.torches.length, 0);
  roots.forEach(r => setTorches(r, on, n <= 12)); fires = roots.filter(r => !r.userData.spec); }
let fires = []; // statues with fire bowls (ships flicker their own torches)

// ---- the storm: rain streaks, rings where the drops hit the water, and lightning ----
const RAIN = 1400, rainPos = new Float32Array(RAIN*6), rainV = new Float32Array(RAIN);
const rainGeo = new T.BufferGeometry(); rainGeo.setAttribute('position', new T.BufferAttribute(rainPos, 3));
const rain = new T.LineSegments(rainGeo, new T.LineBasicMaterial({color:'#dfe9ef', transparent:true, opacity:.55})); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const box = () => Math.max(300, dist*1.1);
function dropAt(i, top){ const b = box(); const x = focus.x + (Math.random() - .5)*2*b, z = focus.z + (Math.random() - .5)*2*b, y = top ? focus.y + b*.8 + Math.random()*b*.3 : Math.random()*b*.9;
  rainPos.set([x, y, z, x - 3, y + 26, z - 2], i*6); rainV[i] = 520 + Math.random()*180; }
for (let i=0;i<RAIN;i++) dropAt(i, false);
const ringGeo = new T.RingGeometry(.7, 1, 14); ringGeo.rotateX(-Math.PI/2);
const rings = Array.from({length:70}, () => { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({color:'#e9f3f7', transparent:true, opacity:0, depthWrite:false})); m.visible = false; scene.add(m); return {m, k:1}; });
let ringI = 0, flash = 0, boltT = 3;
function updateStorm(dt, t){
  if (!rain.visible){ rings.forEach(r => r.m.visible = false); return; }
  for (let i=0;i<RAIN;i++){ const o = i*6, dy = rainV[i]*dt; rainPos[o + 1] -= dy; rainPos[o + 4] -= dy; rainPos[o] -= dy*.1; rainPos[o + 3] -= dy*.1;
    if (rainPos[o + 1] < 0){ if (Math.random() < .12){ const r = rings[ringI++ % rings.length]; r.k = 0; r.m.visible = true; r.m.position.set(rainPos[o], full ? wv(rainPos[o], rainPos[o + 2], t) + .6 : .6, rainPos[o + 2]); } dropAt(i, true); } }
  rainGeo.attributes.position.needsUpdate = true;
  for (const r of rings) if (r.m.visible){ r.k += dt*1.8; r.m.scale.setScalar(2 + r.k*9); r.m.material.opacity = (1 - r.k)*.7; if (r.k >= 1) r.m.visible = false; }
  boltT -= dt; if (boltT <= 0){ flash = 1; boltT = 2.5 + Math.random()*5; setTimeout(() => sfx('thunder'), 300 + Math.random()*1200); }
  flash = Math.max(0, flash - dt*2.6); const L = LIGHTS.storm, f = flash*flash;
  sun.intensity = L.sun[1] + f*1.4; hemi.intensity = L.hemi[2] + f*.9; scene.background.set(L.sky).lerp(WHITE, f*.5);
}
const WHITE = new T.Color('#f4f7fb');

// ---- small builders for the showroom scenes ----
const grassDisc = (r, color = '#5f7433') => { const g = new T.Mesh(new T.CylinderGeometry(r, r*1.06, 6, 40), mat(color)); g.position.y = -2; g.receiveShadow = true; g.userData.ground = true; return g; };
const row = (items, gap) => { const g = new T.Group(); let x = 0; const w = items.map(o => new T.Box3().setFromObject(o).getSize(new T.Vector3()).x);
  const total = w.reduce((a, b) => a + b, 0) + gap*(items.length - 1);
  items.forEach((o, i) => { o.position.x += -total/2 + x + w[i]/2; x += w[i] + gap; g.add(o); }); return g; };
const COLORS = ['#cf9035', '#3f6c94', '#ece2cb', '#c64a3c', '#71873f', '#5c3470'];
// a townsperson, the same as in the harbor towns
function townsperson(color){ const g = new T.Group(), inner = new T.Group(); g.add(inner);
  const body = new T.Mesh(beanGeo(6.8), mat(color, {flatShading:false})); body.castShadow = true; body.userData.ns = true; body.scale.set(.85, 1, .85); inner.add(body);
  cuteHead(inner, 8.9); g.userData.inner = inner; return g; }
// a name under a model, as a flat sign that always faces the camera
function label(text, w = 60){ const c = document.createElement('canvas'); c.width = 512; c.height = 112; const g = c.getContext('2d');
  g.fillStyle = 'rgba(43,33,28,.86)'; g.beginPath(); g.roundRect ? g.roundRect(4, 8, 504, 96, 40) : g.rect(4, 8, 504, 96); g.fill();
  g.fillStyle = '#f6e7c6'; g.font = '800 54px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 58);
  const tex = new T.CanvasTexture(c); const sp = new T.Sprite(new T.SpriteMaterial({map:tex, depthTest:false, transparent:true})); sp.scale.set(w, w*112/512, 1); sp.renderOrder = 5; return sp; }
const labeled = (o, text, y, w) => { const l = label(text, w); l.position.y = y; o.add(l); return o; };
const hoppers = []; // people that hop in place, to show how they move in town
function hopper(o, ph){ hoppers.push({o, ph}); return o; }

// A harbor town, put together like the game does: a main street up from the pier, houses facing it, a square with the
// temple and the city's god at the top, trees in the gaps and people walking about.
function harborTown(god = 'poseidon', style = null){
  const g = new T.Group(), stone = '#e2d3ae';
  const sand = new T.Mesh(new T.CylinderGeometry(330, 350, 8, 48), mat('#e2cf98')); sand.position.y = -2; sand.receiveShadow = true; g.add(sand);
  const grass = new T.Mesh(new T.CylinderGeometry(290, 305, 10, 48), mat('#5f7433')); grass.position.y = 1; grass.receiveShadow = true; g.add(grass);
  const top = 6;
  const road = (x, z, l, w, rot) => { const r = new T.Mesh(new T.BoxGeometry(l, 1, w), mat(stone)); r.position.set(x, top + .4, z); r.rotation.y = rot; r.receiveShadow = true; g.add(r); };
  road(40, 0, 340, 16, 0); if (style !== 'sparta'){ road(-10, 0, 220, 12, Math.PI/2); road(100, 0, 200, 12, Math.PI/2); }
  const kinds = [0, 1, 2, 3, 0, 1, 2, 0, 3, 1, 2, 0, 1, 3, 2, 0, 1, 3];
  let k = 0;
  const put = (x, z, rot) => { const h = house(kinds[k % kinds.length], style); h.position.set(x, top, z); h.rotation.y = rot; h.scale.y = .9 + (k % 3)*.12; g.add(h); k++; };
  // doors face the street: along the main street, then along the two side streets
  if (style === 'sparta'){ // Spartan towns: houses in rings around a round market square, the main street running through
    for (let i=0;i<14;i++){ const a = i/14*Math.PI*2 + .2; if (Math.abs(Math.sin(a)) < .2) continue; put(60 + Math.cos(a)*92, Math.sin(a)*92, -a + Math.PI/2); }
    for (let i=0;i<10;i++){ const a = i/10*Math.PI*2; if (Math.abs(Math.sin(a)) < .3) continue; put(60 + Math.cos(a)*48, Math.sin(a)*48, -a - Math.PI/2); }
    const ag = new T.Mesh(new T.CylinderGeometry(26, 26, 1, 24), mat(stone)); ag.position.set(60, top + .5, 0); g.add(ag);
  } else {
    for (const x of [210, 170, 130, 60, 20]) for (const sg of [1, -1]) put(x, sg*30, sg*Math.PI/2);
    for (const sx of [100, -10]) for (const z of [62, 100, -62, -100]) for (const side of [1, -1]) put(sx + side*22, z, side > 0 ? Math.PI : 0);
    if (style === 'athens') for (const z of [140, -140]) for (const x of [150, 80]) put(x, z, z > 0 ? Math.PI/2 : -Math.PI/2); }
  const sq = new T.Mesh(new T.CylinderGeometry(42, 42, 1, 24), mat(stone)); sq.position.set(-140, top + .5, 0); g.add(sq);
  const t = temple(); t.position.set(-150, top, 0); t.scale.setScalar(.8); g.add(t);
  const st = statue(god, 'painted'); st.scale.setScalar(.45); st.position.set(-112, top, 0); g.add(st);
  const R = (i => () => (i = (i*9301 + 49297) % 233280)/233280)(7);
  for (const [x, z] of [[170, 72], [160, -78], [45, 70], [50, -76], [-60, 70], [-62, -74], [200, 105], [40, 135], [-110, 95], [-110, -100], [-205, 45], [-200, -50], [150, -150], [-30, 150]]){
    const c = R() < .5 ? cypress(CYPRESS_TINTS[Math.floor(R()*4)]) : roundTree(ROUND_TINTS[Math.floor(R()*ROUND_TINTS.length)], k++);
    c.position.set(x, top, z); c.scale.setScalar(.75 + R()*.3); g.add(c); }
  [[-215, 150, .4], [-235, -120, -.3], [175, -205, 1], [190, 185, -.9]].forEach(([x, z, r], i) => { const f = farm(i); f.position.set(x, top, z); f.rotation.y = r; g.add(f); });
  for (let i=0;i<9;i++){ const p = hopper(townsperson(COLORS[i % 6]), i*.7); p.position.set(-70 + i*28, top, (i % 3 - 1)*6); p.rotation.y = R()*6; g.add(p); }
  const pier = new T.Group(); pier.position.set(250, 0, 0); g.add(pier);
  const deck = new T.Mesh(new T.BoxGeometry(170, 3, 18), mat('#9b6b3a')); deck.position.set(60, 6, 0); deck.castShadow = deck.receiveShadow = true; pier.add(deck);
  for (let i=0;i<=5;i++) for (const z of [-8, 8]){ const post = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 16, 6), mat('#6e4a26')); post.position.set(i*28, 1, z); pier.add(post); }
  const boat = buildShip('fishing'); boat.position.set(320, 4, 30); boat.rotation.y = Math.PI; g.add(boat); g.userData.ships = [boat];
  return g;
}
function snowyTown(){ const g = new T.Group();
  const isle = new T.Mesh(new T.CylinderGeometry(200, 215, 12, 40), mat('#eef3f5')); isle.position.y = 0; isle.receiveShadow = true; g.add(isle);
  [0, 1, 2, 3, 1].forEach((kd, i) => { const h = house(kd); h.position.set(-80 + i*40, 6, (i % 2)*40 - 20); h.rotation.y = Math.PI/2; g.add(h); });
  for (let i=0;i<9;i++){ const c = cypress(['#2f4d3a', '#f4f8fa']); const a = i*.7; c.position.set(Math.cos(a)*150, 6, Math.sin(a)*120); c.scale.setScalar(.8 + (i % 3)*.15); g.add(c); }
  const berg = icebergModel(70); berg.position.set(330, 0, -60); g.add(berg);
  return g; }

// ---- what you can look at ----
const SHIP_INFO = {
  rowboat:'Your first boat. One rower, a small hold.', fishing:'A sail, nets and a second crew member.', merchant:'Trade ships with a cabin and a cargo of amphorae.',
  penteconter:'A long fast warship with one row of oars.', bireme:'Your warship: one row of oars, four archers in bronze helmets, a captain with an officer\'s crest and a bronze ram.',
  trireme:'A long warship with one row of oars, an outrigger, a canopy over the captain and a big bronze ram. Coming later.',
  raider:'The pirate galley: a dark hull, red eyes and a bronze boar\'s head ram, like the ships of Polycrates, the pirate king of Samos.',
  trader:'A small round trading ship. Some merchants sail these.', dinghy:'The small pirate boat.', skiff:'The pirate skiff, with its own little boar\'s head.'};
// ---- sounds: every sound in the game, with a model to look at while it plays ----
// Scenes keep playing (music, the sea); single sounds play once when picked and again with Play.
const MOOD_INFO = {day:'Out at sea in the daytime.', night:'Slower and softer, for sailing under the stars.', harbor:'A little brighter, while your ship is tied up in a harbor.',
  battle:'When raiders or warships come for you. Still calm, with a low pulse and a far-off drum.'};
const SOUND_SCENES = [
  // every music style in every mood, to compare (the game uses the one picked in Settings)
  ...Object.entries(STYLES).flatMap(([st, S]) => [['day', 'a day at sea', () => statue('apollo', 'painted')], ['night', 'night', () => statue('apollo', 'painted'), 'night'], ['harbor', 'in the harbor', () => harborTown('poseidon')], ['battle', 'battle', () => buildShip('raider')]]
    .map(([m, label, make, light], i) => ({name:`${S.name}: ${label}`, desc:(i ? MOOD_INFO[m] : S.desc + ' ' + MOOD_INFO.day) + ' It makes itself up as it plays, so it never repeats exactly.', music:m, style:st, light, make}))),
  // P57: the drum-led battle music styles
  ...Object.entries(BATTLE).filter(([k]) => k !== 'calm').map(([k, b]) => ({name:`Battle music: ${b.name}`, desc:b.desc + ' Pick it in Settings, Sound, Battle music.', music:'battle', style:null, bstyle:k, make:() => buildShip('raider')})),
  {name:'Sea: calm near an island', desc:'Soft waves, gulls calling from the shore, the hull creaking now and then.', sea:{speed:.3, waves:.55, wind:.1, land:.4, gulls:.8, sail:true}, make:() => buildShip('fishing')},
  {name:'Sea: rowing at full speed', desc:'Oars dipping in time, water rushing past the hull, the wind in your ears.', sea:{speed:1, waves:1, wind:.4, rowing:true}, make:() => buildShip('bireme')},
  {name:'Sea: storm', desc:'Big waves, howling wind, rain and thunder after each lightning flash.', sea:{speed:.8, waves:2.1, storm:1, wind:1, rain:1, rowing:true}, light:'storm', make:() => buildShip('bireme')},
  {name:'Sea: night by an island', desc:'Quiet waves, crickets on the island and the crackle of the fire bowls.', sea:{speed:0, waves:.6, wind:.15, night:1, land:1, fire:.8}, light:'night', make:() => statue('poseidon', 'painted')},
];
const SOUND_INFO = {
  click:'Every button gives a soft tap.', open:'A menu opens.', close:'A menu closes.', coin:'A coin from a wreck or a crate.', coins:'Selling fish or goods, getting paid for a job.',
  fish:'A sardine comes aboard.', catch:'You landed a tuna or swordfish in the fishing game.', miss:'The fish got away.', wood:'Wood comes aboard.', chop:'Your crew cuts a tree.',
  bow:'Each archer looses an arrow.', thud:'An arrow hits a ship.', plop:'An arrow misses and drops in the sea.', hurt:'Something hits your ship.', volley:'Every archer fires at once.',
  catapult:'A fortress catapult throws a stone.', bigsplash:'The stone lands in the sea.', ram:'Your ram hits a ship head-on.', bump:'Two ships bump.', crash:'A ship breaks apart and sinks.',
  sink:'Your own ship goes down.', bubbles:'Bubbles from a sinking ship.', bell:'The harbor bell as you come in to dock.', horn:'A war horn when you raid a ship, or a navy ship sees a crime.',
  chime:'A goal or a job is done.', fanfare:'Your new ship is ready, or an island raises your flag.', hammer:'The shipwright fits an upgrade or repairs your hull.', buy:'You buy something.',
  blessing:'Poseidon blesses you after you sail close to a whale.', whale:'A whale surfaces.', kraken:'The kraken rises, and again when it dives.', spout:'The whale breathes out.', splash:'Dolphins splash beside your boat.', gull:'Gulls over islands, wrecks and harbors.',
  thunder:'After each lightning flash in a storm.', creak:'Your hull creaks as it rolls on the waves.', oar:'Each stroke of the oars.', sail:'The sail flaps in the wind.',
  bottle:'You open a message in a bottle.', treasure:'You dig up a treasure.', crowd:'The crowd at the Rhodes arena.', zone:'You sail into new waters.', warn:'Distant rumbling when a storm is coming.', dock:'Mooring ropes pull tight at the pier.'};
const SOUND_MODEL = {
  coin:() => wreckModel('medium'), coins:() => harborTown('poseidon'), fish:() => buildShip('fishing'), catch:() => buildShip('fishing'), miss:() => buildShip('fishing'),
  wood:() => wreckModel('small'), chop:() => { const g = row([0, 1, 2].map(() => cypress(CYPRESS_TINTS[0])), 12); g.add(grassDisc(50)); return g; },
  bow:() => buildShip('bireme'), thud:() => buildShip('raider'), plop:() => buildShip('raider'), hurt:() => buildShip('bireme'), volley:() => buildShip('bireme'),
  catapult:() => buildFortress('pirate', '#231d1d'), bigsplash:() => buildFortress('pirate', '#231d1d'), ram:() => buildShip('bireme', {ram:1}), bump:() => buildShip('trader'),
  crash:() => wreckModel('large'), sink:() => wreckModel('small'), bubbles:() => wreckModel('medium'), bell:() => harborTown('poseidon'), horn:() => buildShip('raider'),
  chime:() => temple(), fanfare:() => buildShip('trireme'), hammer:() => buildShip('bireme'), buy:() => harborTown('athena'), blessing:() => statue('poseidon', 'painted'),
  kraken:() => { const k = krakenModel(); k.position.y = -2; k.userData.anim = 'kraken'; return k; },
  whale:() => { const w = whaleModel(); w.position.y = -8; w.userData.anim = 'whale'; return w; }, spout:() => { const w = whaleModel(); w.position.y = -8; w.userData.anim = 'whale'; return w; },
  splash:() => { const g = new T.Group(); [0, 1, 2].forEach(i => { const d = dolphinModel(); d.position.set(i*30 - 30, 6, (i % 2)*24 - 12); d.userData.ph = i*1.2; g.add(d); }); g.userData.anim = 'dolphins'; return g; },
  gull:() => { const g = new T.Group(); [0, 1, 2].forEach(i => { const b = gull(); b.position.set(i*22 - 22, 30 + (i % 2)*10, (i - 1)*14); b.scale.setScalar(1.6); g.add(b); }); g.userData.anim = 'gulls'; return g; },
  thunder:() => buildShip('merchant'), creak:() => buildShip('merchant'), oar:() => buildShip('rowboat'), sail:() => buildShip('fishing'),
  bottle:() => buildShip('rowboat'), treasure:() => wreckModel('medium'), crowd:() => buildColossus(300, 150), zone:() => buildShip('fishing'), warn:() => buildShip('fishing'), dock:() => harborTown('poseidon'),
};
let playing = null; // the item whose sound is on
function playItem(item){
  playing = item.music || item.sea ? item : null;
  if (item.music) testMusic(item.music, true, item.style, item.bstyle); else stopMusic();
  if (item.sound) setTimeout(() => sfx(item.sound), 150);
  $('play').hidden = !(item.sound || item.music || item.sea); 
}
function updateSoundScene(dt){
  if (!playing) return updateAudio(dt, {seaOff:true});
  if (playing.music) return updateAudio(dt, {seaOff:true, musicOn:true});
  updateAudio(dt, playing.sea);
}

// P55 prototype: the warships bigger and heavier (25% longer, 40% wider, a taller hull and bigger sails), to compare.
const bigger = k => { const s = SPECS[k], key = k + 'XL'; if (!SPECS[key]) SPECS[key] = {...s, L:s.L*1.25, B:s.B*1.4, H:s.H*1.3, rise:s.rise*1.25, sailW:s.sailW*1.15, sailH:s.sailH*1.15}; return key; };
// P56 prototype: the same size class, just wider and a little shorter (Nicholas: the warships look too skinny and too long)
const wider = k => { const s = SPECS[k], key = k + 'W'; if (!SPECS[key]) SPECS[key] = {...s, L:s.L*.88, B:s.B*1.45, H:s.H*1.1}; return key; };
function sideBySide(k, alt = bigger){ const g = new T.Group(), a = buildShip(k), b = buildShip(alt(k)); a.position.z = -SPECS[k].B*1.6; b.position.z = SPECS[k].B*1.9; g.add(a, b); return g; }
const GROUPS = {
  ships:{name:'Ships', items:[
    {name:'The pirate king\'s flagship', desc:'Polycrates\' floating fortress, waiting in the wine-dark water off Kos: a towering hull with statues along its sides, a flat deck with six towers and a hall, three masts, a great golden curl at the stern. A ghost ship: you never see a single person aboard.', make:() => buildShip('flagship', {paint:'king', sail:'plain'})},
    ...Object.keys(SPECS).map(k => ({name:k[0].toUpperCase() + k.slice(1), desc:SHIP_INFO[k] || '', make:() => buildShip(k, {}, true)})),
    {name:'Burning ship', desc:'A badly damaged ship catches fire: flames on deck, sparks, and a thick column of smoke that sways as it rises, dark at the bottom and grey at the top.', make:() => {
      const sh = buildShip('raider'), f = makeFire(SPECS.raider.L, SPECS.raider.B, SPECS.raider.H*.9); sh.add(f); sh.userData.fire = f; sh.userData.anim = 'fire'; return sh; }},
    {name:'The whole fleet', desc:'Every ship side by side, smallest to largest.', make:() => { const g = new T.Group(); let z = 0;
      ['rowboat', 'fishing', 'trader', 'merchant', 'penteconter', 'bireme', 'trireme', 'dinghy', 'skiff', 'raider'].forEach(k => { const s = buildShip(k); z += SPECS[k].B*1.4 + 30; s.position.set(-SPECS[k].L/2 + 100, 0, z); g.add(s); z += SPECS[k].B*1.4; });
      g.position.z = -z/2; const w = new T.Group(); w.add(g); return w; }},
    {name:'Torches at night', desc:'At night every ship lights torches at the bow and stern, and big ships a pair at the rails. Turn Glow on and off to compare.', light:'night', glow:true,
      make:() => { const g = new T.Group(); [['bireme', 0], ['merchant', 140], ['raider', 280]].forEach(([k, z]) => { const sh = buildShip(k); sh.position.z = z - 140; g.add(sh); }); return g; }},
    {name:'Sail upgrades', desc:'Levels 1 to 5 make the sail bigger. Level 6 puts up a foresail over the bow, which grows to 10. Level 11 adds a topsail (to 15), and level 16 a little sail at the stern (to 20). The rowboat gets one small sail (5 levels).',
      make:() => { const g = new T.Group(); [0, 5, 6, 10, 11, 15].forEach((lv, i) => { const sh = buildShip('trireme', {sailLv:lv}); sh.position.set((i % 3)*260 - 260, 0, Math.floor(i/3)*170 - 85); labeled(sh, 'Level ' + lv, -26, 70); g.add(sh); });
        [1, 5].forEach((lv, i) => { const sh = buildShip('rowboat', {sailLv:lv, sail:'ochre'}); sh.position.set(i*90 - 45, 0, 240); labeled(sh, 'Rowboat ' + lv, -16, 50); g.add(sh); }); return g; }},
    {name:'Shipwrecks', desc:'Three sizes. A fishing boat wreck: 4 pulls of 1 wood. A merchant wreck: 6 pulls of 2 wood, coins, and sometimes an amphora of wine or oil. A warship wreck: 9 pulls of 3 wood and more coins.',
      make:() => { const g = new T.Group(); [['small', 'Fishing boat', -170], ['medium', 'Merchant', 0], ['large', 'Warship', 220]].forEach(([k, n, x]) => { const w = wreckModel(k); w.position.x = x; labeled(w, n, -22, 60); g.add(w); }); return g; }},
  ]},
  monuments:{name:'Monuments', items:[
    {name:'Colossus of Rhodes', desc:'The bronze sun god astride the arena gate: a torch held high, a bow, a quiver and a crown of sun rays.', make:() => { const c = buildColossus(300, 150); c.rotation.y = Math.PI/2; return c; }},
    {name:'Athenian fortress', desc:'Every city island has one. Archers on the walls, catapults on the bastions, a keep with a columned porch.', make:() => buildFortress('athens', '#2f5f8a')},
    {name:'Spartan fortress', desc:'The same plan in warmer stone, with red banners.', make:() => buildFortress('sparta', '#9e2a22')},
    {name:'Pirate fortress', desc:'Dark stone on Thasos and Kos, with black banners.', make:() => buildFortress('pirate', '#231d1d')},
    {name:'Bandit camp', desc:'On the wild islands near Kallisto: two log cabins, a tent, a campfire with a cooking pot, a black flag, and bandits with bows on the beach.', make:() => buildCamp()},
    {name:'Spartacus, in marble', desc:'The champion of the games, as a cartoony gladiator: a huge chest, a crested helmet, his sword raised and his shield up. He stands in white marble in the middle of the Arena of Rhodes.', make:() => buildGladiator('marble')},
    {name:'Spartacus, in bronze', desc:'The same champion cast in polished bronze, with a red crest.', make:() => buildGladiator('bronze')},
    {name:'Statue of Athena, in marble', desc:'Some towns keep their statues plain white marble instead of painting them.', make:() => statue('athena', 'marble')},
    {name:'Statue of Poseidon', desc:'With his trident, a wave at his feet. Stands at harbors and pirate fortresses. Try the Night light: the fire bowls at the corners burn.', make:() => statue('poseidon', 'painted')},
    {name:'Statue of Athena', desc:'Helmet, spear and shield. On Athenian fortresses and harbors. Fire bowls at the corners burn at night.', make:() => statue('athena', 'painted')},
    {name:'Statue of Zeus', desc:'A thunderbolt and a golden wreath. On Spartan fortresses. Fire bowls at the corners burn at night.', make:() => statue('zeus', 'painted')},
    {name:'Statue of Apollo', desc:'With his lyre. In front of Spartan temples. Fire bowls at the corners burn at night.', make:() => statue('apollo', 'painted')},
    {name:'Statue of Artemis', desc:'The huntress, with her bow and quiver, cast in shiny bronze. Fire bowls at the corners burn at night.', make:() => statue('artemis', 'bronze')},
    {name:'Temple', desc:'Every harbor town has one on its square.', make:() => temple()},
  ]},
  cities:{name:'Cities', items:[
    {name:'Harbor town', desc:'A town like Kallisto: a main street up from the pier, side streets, houses facing the street, the temple and Poseidon on the square, trees and townspeople.', make:() => harborTown('poseidon')},
    {name:'Athenian town', desc:'Athens\' towns are whitewashed, with blue shutters and blue domes, and Athena in front of the temple.', make:() => harborTown('athena', 'athens')},
    {name:'Spartan town', desc:'Sparta\'s towns are warm sandstone with dark red shutters and terracotta roofs, built in rings around a round market square, with Zeus by the temple.', make:() => harborTown('zeus', 'sparta')},
    {name:'Snowy northern town', desc:'In the cold north the islands, roofs and trees are covered in snow, and icebergs float offshore.', make:() => snowyTown()},
    {name:'Farms', desc:'Little farms just outside the towns, inside low stone walls: a vineyard with grapes, an olive grove, a wheat field and a vegetable garden with melons.', make:() => { const g = row([0, 1, 2, 3].map(i => farm(i)), 14); g.add(grassDisc(120)); return g; }},
    {name:'Houses', desc:'The four kinds of house: white with a flat roof, a blue dome, a red tile roof, and two floors with a terrace. Most have a chimney, and many have white smoke curling up from the cooking fire.', make:() => { const g = row([0, 1, 2, 3].map(k => house(k)), 18); g.add(grassDisc(90)); return g; }},
  ]},
  people:{name:'People', items:[
    {name:'Everyone', desc:'Round and cute, no arms, legs or faces. Townspeople, a rower, a deckhand, a captain, an archer, and pirates.', make:() => {
      const ppl = [...COLORS.slice(0, 3).map((c, i) => hopper(townsperson(c), i)), person('tunic1', 'row'), person('tunic2', 'stand'), person('tunic3', 'helm', 'captain'),
        person('tunic2', 'archer', 'hoplite'), person('rTunic', 'archer', 'pirate'), person('#2c1f1f', 'stand', 'pirate')];
      ppl.forEach(p => p.rotation.y = .9); const g = row(ppl, 6); g.add(grassDisc(70)); return g; }},
    {name:'Townspeople', desc:'They hop around the harbor towns, popping up as you sail close.', make:() => { const g = row(COLORS.map((c, i) => hopper(townsperson(c), i*.5)), 6); g.add(grassDisc(50)); return g; }},
    {name:'Helmets and hats', desc:'Every helmet and hat, left to right: hoplite, captain, Athenian (feathers), Spartan (bronze cone), Phrygian (curled top), Boeotian (wide brim), pirate cap, straw hat for fishermen and merchants, and the laurel wreath for champions of the games.',
      make:() => { const ks = Object.keys(HELMETS), g = new T.Group(); g.userData.view = {yaw:0, pitch:.38};
        ks.forEach((k, i) => { const p = person(['tunic1', 'tunic2', 'tunic3', '#9e2a22', 'tunic2', 'tunic1', 'rTunic', 'tunic3', '#5c3470'][i], 'stand', k); p.scale.setScalar(1.8); p.rotation.y = -.6;
          p.position.set((Math.floor(i/3) - 1)*-56, 0, (1 - i % 3)*36); hopper(p, i*.4); labeled(p, HELMETS[k], 19, 9); g.add(p); });
        g.add(grassDisc(70)); return g; }},
    {name:'Soldiers and archers', desc:'A round bronze helmet with cheek guards and a red horsehair crest from front to back.', make:() => { const g = row([0, 1, 2].map(i => { const p = person(['tunic1', 'tunic2', 'tunic3'][i], 'archer', 'hoplite'); p.rotation.y = .9; return p; }), 8); g.add(grassDisc(40)); return g; }},
    {name:'Captains and generals', desc:'Their crest runs from side to side, like Spartan officers wore, white with a red rim.', make:() => { const g = row([0, 1].map(i => { const p = person(['tunic3', 'tunic2'][i], 'stand', 'captain'); p.rotation.y = .9; return p; }), 8); g.add(grassDisc(36)); return g; }},
    {name:'Pirates', desc:'A dark pointed felt cap with a red band.', make:() => { const g = row([0, 1, 2].map(i => { const p = person(['rTunic', '#2c1f1f', 'rTunic'][i], i === 1 ? 'stand' : 'archer', 'pirate'); p.rotation.y = .9; return p; }), 8); g.add(grassDisc(40)); return g; }},
    {name:'Rowers', desc:'One rower for every oar on the top row. They rock with each stroke.', make:() => { const g = row([0, 1, 2, 3].map(i => { const p = person(['tunic1', 'tunic2', 'tunic3', 'tunic1'][i], 'row'); p.rotation.y = .9; hoppers.push({o:p, ph:i*.3, rock:true}); return p; }), 6); g.add(grassDisc(40)); return g; }},
  ]},
  animals:{name:'Animals', items:[
    {name:'Whale, whole body', desc:'The same whale lifted out of the sea, so you can see its whole shape: flippers, flukes and the low fin on its back.', make:() => { const w = whaleModel(); w.position.y = 24; w.userData.anim = 'whale'; return w; }},
    {name:'Whale', desc:'Surfaces now and then out at sea. Sail close for Poseidon\'s blessing.', make:() => { const w = whaleModel(); w.position.y = -8; w.userData.anim = 'whale'; return w; }},
    {name:'Kraken', desc:'Far out in the Open Sea, now and then, its tentacles rise from the water ahead of you. Sail close and it slips back into the deep, and the story earns you a few drachmae.', make:() => { const k = krakenModel(); k.position.y = -2; k.userData.anim = 'kraken'; return k; }},
    {name:'Dolphins', desc:'A pod that jumps beside your boat when you sail fast in open water.', make:() => { const g = new T.Group(); [0, 1, 2].forEach(i => { const d = dolphinModel(); d.position.set(i*30 - 30, 6, (i % 2)*24 - 12); d.userData.ph = i*1.2; g.add(d); }); g.userData.anim = 'dolphins'; return g; }},
    {name:'Gulls', desc:'They glide above the islands and wrecks on long bent wings, flapping slowly now and then.', make:() => { const g = new T.Group(); [0, 1, 2].forEach(i => { const b = gull(); b.position.set(i*22 - 22, 30 + (i % 2)*10, (i - 1)*14); b.scale.setScalar(1.6); g.add(b); }); g.userData.anim = 'gulls'; return g; }},
    {name:'Fish', desc:'Sardines (caught near shores), tuna and swordfish (in bubbling water). Smooth bodies, dark backs and silver bellies.', make:() => { const g = new T.Group();
      ['sardine', 'tuna', 'swordfish'].forEach((k, i) => { const f = fishModel(k); f.scale.setScalar([2.2, 3.2, 3.4][i]); f.position.set(0, 10, i*34 - 34); f.userData.ph = i; labeled(f, k[0].toUpperCase() + k.slice(1), -3, 8); g.add(f); });
      g.userData.anim = 'wiggle'; return g; }},
    {name:'Fishing spot', desc:'Out at sea, look for rings of bubbling water with fish jumping out of it. Stop your boat inside the rings and your crew starts fishing. Sardines live near the shore, tuna and swordfish farther out.', make:() => { const g = new T.Group();
      const water = new T.Mesh(new T.CircleGeometry(60, 40), new T.MeshBasicMaterial({color:'#3f9db0', transparent:true, opacity:.5})); water.rotation.x = -Math.PI/2; water.position.y = .3; g.add(water);
      const ringG = new T.RingGeometry(10, 13.5, 32); ringG.rotateX(-Math.PI/2);
      g.userData.rings = [0, 1, 2].map(() => { const m = new T.Mesh(ringG, new T.MeshBasicMaterial({color:0xf4fbff, transparent:true, opacity:.5, depthWrite:false})); m.position.y = .6; g.add(m); return m; });
      g.userData.fish = [0, 1, 2, 3].map(k => { const f = fishModel(k % 2 ? 'tuna' : 'sardine'); f.scale.setScalar(1.6); f.userData.ph = k*.27; f.userData.ang = k*1.9; g.add(f); return f; });
      const boat = buildShip('fishing'); boat.position.set(-22, 2, 26); boat.rotation.y = .5; boat.scale.setScalar(.7); g.add(boat); g.userData.ships = [boat];
      g.userData.anim = 'spot'; return g; }},
  ]},
  nature:{name:'Trees and ice', items:[
    {name:'All trees', desc:'Every tree color on the islands: cypress greens, and round trees in blossom pink, orange, gold, lilac and greens.', make:() => { const g = new T.Group();
      CYPRESS_TINTS.forEach((t, i) => { const c = cypress(t); c.position.set(-60 + i*40, 0, -30); g.add(c); });
      ROUND_TINTS.forEach((t, i) => { const c = roundTree(t, i); c.position.set(-90 + i*30, 0, 25 + (i % 2)*18); g.add(c); });
      g.add(grassDisc(135)); return g; }},
    {name:'Cypress trees', desc:'Tall and slim like a flame, with soft tufts of leaves, in four greens.', make:() => { const g = row(CYPRESS_TINTS.map(t => cypress(t)), 12); g.add(grassDisc(70)); return g; }},
    {name:'Round trees', desc:'Olive, almond and fig trees in blossom and autumn colors.', make:() => { const g = row(ROUND_TINTS.map((t, i) => roundTree(t, i)), 6); g.add(grassDisc(120)); return g; }},
    {name:'Snowy trees', desc:'On the cold northern islands, with snow lying on top of the tufts.', make:() => { const g = row([0, 1, 2].map(() => cypress(['#2f4d3a', '#f4f8fa'])), 12); g.add(grassDisc(50, '#eef3f5')); return g; }},
    {name:'Grass', desc:'Little tufts of grass in soft patches on the green islands, swaying in the wind. Only on High graphics in the game, so slower phones stay smooth.', make:() => {
      const g = new T.Group(), d = grassDisc(130, '#76883c'); d.userData.ground = false; g.add(d); const pts = Array.from({length:40}, (_, i) => [Math.cos(i/40*6.283)*124, Math.sin(i/40*6.283)*124]);
      addGrass(g, pts, null, 1, Math.random, null, '#f2f7e4'); return g; }},
    {name:'Iceberg', desc:'Chunks of sharp-cut ice: a wide slab, a tall peak and a smaller chunk. Twenty-six of them float in the cold north. Ships can\'t sail through.', make:() => icebergModel(70)},
  ]},
  sounds:{name:'Sounds and music', items:[
    ...SOUND_SCENES,
    ...Object.entries(SOUNDS).map(([k, v]) => ({name:v.name, desc:`${SOUND_INFO[k] || ''} Tap Play to hear it again.`, sound:k, make:SOUND_MODEL[k] || (() => buildShip('fishing'))})),
  ]},
};

// ---- showing one ----
function show(){
  if (obj) scene.remove(obj); hoppers.length = 0;
  const item = GROUPS[group].items[idx];
  obj = item.make(); if (CEL.on) inkify(obj); obj.traverse(o => { if (o.isMesh){ o.castShadow = !(o.material && o.material.transparent); o.receiveShadow = !o.userData.ns; } }); /* see-through things (foam rings, the kraken's dark shape) cast no shadows */
  scene.add(obj);
  // frame the models, not the ground they stand on; fit the sun's shadow to them so shadows stay crisp
  const ground = obj.children.filter(o => o.userData.ground); ground.forEach(o => obj.remove(o));
  const box = new T.Box3().setFromObject(obj), size = box.getSize(new T.Vector3()); box.getCenter(focus); ground.forEach(o => obj.add(o));
  const big = Math.max(size.x, size.y, size.z); dist = big*1.45 + 40;
  const sc = sun.shadow.camera, half = Math.max(80, big*.9); Object.assign(sc, {left:-half, right:half, top:half, bottom:-half}); sc.updateProjectionMatrix();
  sun.shadow.normalBias = Math.max(1.4, half*.02); // big scenes have coarser shadow pixels: lift the shadow off surfaces more, so no stripes
  sun.target.position.copy(focus); sun.position.copy(focus).add(sunDir); scene.add(sun.target); $('desc').textContent = item.desc;
  // the waves stay calm over islands and towns; ships ride them
  const land = ground.length || group === 'cities' || group === 'monuments' || group === 'nature' || group === 'people';
  waveU.uCalm.value.set(focus.x, focus.z, land ? Math.max(size.x, size.z)*.62 + 30 : 0);
  if (item.light && !q0){ $('light').value = item.light; setLight(item.light); } if (item.glow && !q0){ setGlow(true); }
  if (obj.userData.view && !q.get('yaw')){ yaw = obj.userData.view.yaw; pitch = obj.userData.view.pitch; dist *= .8; }
  lightTorches(); ridersOf(); playItem(item);
}
// the ships in view, so they can bob on the waves
let riders = [];
function ridersOf(){ riders = []; obj.traverse(o => { if (o.userData.body && o.userData.spec) riders.push({o, y:o.position.y}); }); }
function setGlow(on){ glowOn = on; $('glow').setAttribute('aria-pressed', on); }
function setFull(on){ full = on; $('gfx').value = on ? 'full' : 'simple'; setWaves(); } // (soft shadows the same way in both looks: PCF with a radius)
function fillPick(){ $('pick').innerHTML = GROUPS[group].items.map((it, i) => `<option value="${i}">${it.name}</option>`).join(''); $('pick').value = idx; }
$('group').innerHTML = Object.entries(GROUPS).map(([k, g]) => `<option value="${k}">${g.name}</option>`).join('');
$('light').innerHTML = Object.entries(LIGHTS).map(([k, l]) => `<option value="${k}">${l.name}</option>`).join('');
$('group').addEventListener('change', e => { group = e.target.value; idx = 0; fillPick(); show(); });
$('pick').addEventListener('change', e => { idx = +e.target.value; show(); });
$('light').addEventListener('change', e => setLight(e.target.value));
$('gfx').addEventListener('change', e => setFull(e.target.value === 'full'));
$('glow').addEventListener('click', () => setGlow(!glowOn));
// the cel-shaded test look: hard bands and ink outlines
$('cel').addEventListener('click', () => { setCel(!CEL.on); $('cel').setAttribute('aria-pressed', CEL.on); show(); });
$('play').addEventListener('click', () => { startAudio(); const it = GROUPS[group].items[idx]; if (it.sound) sfx(it.sound); if (it.music) testMusic(it.music, true, it.style, it.bstyle); });
// Download the model as a .glb file, to open and edit in Blender (or any 3D program). Edited models can come back into the game.
$('dl').addEventListener('click', () => {
  if (!T.GLTFExporter || !obj) return;
  const name = GROUPS[group].items[idx].name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  new T.GLTFExporter().parse(obj, glb => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([glb], {type:'model/gltf-binary'})); a.download = `wine-dark-${name}.glb`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }, {binary:true, onlyVisible:true});
});
$('spin').addEventListener('click', () => { spin = !spin; $('spin').setAttribute('aria-pressed', spin); });
const fold = on => { $('bar').classList.toggle('folded', on); $('unfold').hidden = !on; $('fold').setAttribute('aria-expanded', !on); resize(); };
$('fold').addEventListener('click', () => fold(true)); $('unfold').addEventListener('click', () => fold(false));

// drag to turn, wheel or pinch to zoom
const pts = new Map();
const cv = $('stage');
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, {x:e.clientX, y:e.clientY}); });
cv.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return;
  if (pts.size === 2){ const [a, b] = [...pts.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y); p.x = e.clientX; p.y = e.clientY; const [c, d] = [...pts.values()], d1 = Math.hypot(c.x - d.x, c.y - d.y); if (d0) dist *= d0/d1; return; }
  yaw += (e.clientX - p.x)*.008; pitch = Math.max(.05, Math.min(1.4, pitch + (e.clientY - p.y)*.006)); p.x = e.clientX; p.y = e.clientY; });
const up = e => pts.delete(e.pointerId); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { e.preventDefault(); dist *= Math.exp(e.deltaY*.001); }, {passive:false});

// the model sits in the upper part of the screen, clear of the panel at the bottom
function resize(){ renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth/innerHeight;
  const lift = $('bar').classList.contains('folded') ? 0 : $('bar').offsetHeight*.5;
  camera.setViewOffset(innerWidth, innerHeight, 0, lift, innerWidth, innerHeight); camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

// start: ?g=group&i=item&light=key (and test views: yaw, pitch, zoom, fx, fy, ui=0)
const q = new URLSearchParams(location.search); let q0 = true; // q0: while starting, the address decides the light and glow
if (GROUPS[q.get('g')]) group = q.get('g'); idx = Math.min(+(q.get('i') || 0), GROUPS[group].items.length - 1);
$('group').value = group; fillPick();
const lk = LIGHTS[q.get('light')] ? q.get('light') : 'noon'; $('light').value = lk; setLight(lk);
if (q.get('cel') === '1'){ setCel(true); $('cel').setAttribute('aria-pressed', true); }
if (q.get('ui') === '0') fold(true), $('unfold').hidden = true;
setFull(q.get('gfx') === 'full'); setGlow(q.get('glow') === '1');
show(); resize(); q0 = false;
if (q.get('yaw')) yaw = +q.get('yaw'); if (q.get('pitch')) pitch = +q.get('pitch'); if (q.get('zoom')) dist /= +q.get('zoom');
const tmpV = new T.Vector3(), fx = +(q.get('fx') || 0), fy = +(q.get('fy') || 0);

// gentle life: oars row, flags wave, animals swim and flap, people hop
function animate(t){
  if (!obj) return;
  if (obj.userData.oars) animateShip(obj, t, 20);
  for (const s of obj.userData.ships || []) animateShip(s, t, 10);
  const a = obj.userData.anim;
  for (const r of fires) flicker(r, t);
  if (a === 'fire') updateFire(obj.userData.fire, .9, t);
  updateSmoke(t, lightKey === 'night' ? .6 : 0, -.8, .35); updateGrass(t);
  if (a === 'whale'){ obj.userData.tail.rotation.z = Math.sin(t*1.4)*.25; obj.userData.body.rotation.z = Math.sin(t*.7)*.04; }
  if (a === 'kraken'){ obj.userData.shadow.material.opacity = 1; obj.userData.tents.forEach(tn => { tn.piv.rotation.z = Math.sin(t*1.3 + tn.ph)*.25 - .1; tn.piv.rotation.x = Math.sin(t*.9 + tn.ph*2)*.15; }); obj.userData.body.rotation.z = Math.sin(t*.7)*.04; }
  if (a === 'dolphins') obj.children.forEach(d => { const p = (t*.9 + d.userData.ph) % (Math.PI*2); d.position.y = 6 + Math.max(0, Math.sin(p))*26 - 8; d.rotation.z = Math.cos(p)*.7; });
  if (a === 'gulls') obj.children.forEach((b, i) => { b.userData.flap(Math.sin(t*2.4 + i)*.45 + .1); b.position.y = 34 + Math.sin(t*1.5 + i)*4; });
  if (a === 'wiggle') obj.children.forEach(f => { f.rotation.y = Math.sin(t*3 + f.userData.ph)*.18; f.position.y = 10 + Math.sin(t*1.4 + f.userData.ph)*1.5; });
  if (a === 'spot'){ // the same as at sea: rings spread out, fish leap in arcs and dive back in
    obj.userData.rings.forEach((r, k) => { const p = (t*.45 + k/3) % 1; r.scale.setScalar(1 + p*2.6); r.material.opacity = .55*(1 - p); });
    obj.userData.fish.forEach(f => { const u = ((t*.4 + f.userData.ph) % 1)/.3, a = f.userData.ang; f.visible = u < 1;
      if (f.visible){ f.position.set(Math.cos(a)*(u - .5)*26, Math.sin(u*Math.PI)*16 - 1, Math.sin(a)*(u - .5)*26); f.rotation.set(0, -a, Math.cos(u*Math.PI)*1.1); } }); }
  for (const h of hoppers){ const inner = h.o.userData.inner; if (!inner) continue;
    if (h.rock) inner.rotation.z = Math.sin(t*2.6 + h.ph)*.25;
    else { const p = (t*1.3 + h.ph) % 2.2; inner.position.y = p < .42 ? Math.sin(p/.42*Math.PI)*5 : 0; } }
}
let t0 = performance.now(), last = 0;
function frame(now){
  const t = (now - t0)/1000, dt = Math.min(.05, t - last); last = t; animate(t); updateSoundScene(dt); if (spin && !pts.size) yaw += .003;
  waveU.uTime.value = t; waveU.uSun.value.copy(sunDir).normalize(); updateStorm(dt, t);
  // full graphics: ships ride the waves, pitching and rolling a little
  for (const r of riders){ const p = r.o.getWorldPosition(tmpV), h = full ? wv(p.x, p.z, t) : 0;
    r.o.position.y = r.y + h*.8; r.o.rotation.z = full ? (wv(p.x + 20, p.z, t) - wv(p.x - 20, p.z, t))*.012 : 0; r.o.rotation.x = full ? (wv(p.x, p.z - 12, t) - wv(p.x, p.z + 12, t))*.02 : 0; }
  focus.x += fx; focus.y += fy;
  camera.position.set(focus.x + Math.cos(yaw)*Math.cos(pitch)*dist, focus.y + Math.sin(pitch)*dist, focus.z + Math.sin(yaw)*Math.cos(pitch)*dist);
  // the near edge of what the camera sees moves with the distance: depth precision stays high, so close surfaces never flicker
  // into stripes (it was 2 for every view, too small when looking at a whole town from far away)
  const nr = Math.max(2, dist*.05); if (Math.abs(camera.near - nr) > .5){ camera.near = nr; camera.updateProjectionMatrix(); }
  camera.lookAt(focus); focus.x -= fx; focus.y -= fy;
  post(scene, camera, {glow:glowOn ? 1.5 : 0, tilt:full}); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
