// The showroom: every 3D model in the game on one calm sea, to look at from all sides, under different lights.
// Uses the game's own builders, so what you see here is exactly what sails in the game.
import {buildShip, animateShip, SPECS, CEL, setCel, inkify, person, beanGeo, cuteHead, mat} from './ships.js';
import {buildColossus, buildFortress, buildStatue} from './monuments.js';
import {cypress, roundTree, CYPRESS_TINTS, ROUND_TINTS, house, temple, gull, whaleModel, dolphinModel, icebergModel, wreckModel} from './models.js';

const T = window.THREE, $ = id => document.getElementById(id);
const renderer = new T.WebGLRenderer({canvas:$('stage'), antialias:true});
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene(); scene.fog = new T.Fog('#c9e3e8', 2200, 5200);
const hemi = new T.HemisphereLight(0xeaf3f5, 0x8c927c, .8); scene.add(hemi);
const sun = new T.DirectionalLight(0xffeccc, .65); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left:-700, right:700, top:700, bottom:-700, far:2500}); scene.add(sun);
sun.shadow.bias = -.0006; sun.shadow.normalBias = .6;
const sunDir = new T.Vector3(-400, 700, 400);
const fill = new T.DirectionalLight(0xcfe3ff, .28); fill.position.set(300, 200, -300); scene.add(fill);
const seaMat = new T.MeshLambertMaterial({color:'#2b7f93'});
const sea = new T.Mesh(new T.CircleGeometry(6000, 64), seaMat); sea.rotation.x = -Math.PI/2; sea.receiveShadow = true; scene.add(sea);
const camera = new T.PerspectiveCamera(40, 1, 2, 9000);

// ---- lights: the times of day and weather from the game, plus a plain studio light for looking at shapes ----
// sky = background and fog, hemi = [sky light, ground light, strength], sun = [color, strength, direction], sea = water color
const LIGHTS = {
  noon:    {name:'Sunny day',   sky:'#c9e3e8', hemi:['#eaf3f5', '#8c927c', .8],  sun:['#ffeccc', .65, [-400, 700, 400]], fill:.28, sea:'#2b7f93'},
  morning: {name:'Morning',     sky:'#f2dccb', hemi:['#f6e6da', '#8c8a7c', .75], sun:['#ffd9b0', .6, [700, 300, 300]],   fill:.3,  sea:'#3f8c9c'},
  golden:  {name:'Golden hour', sky:'#f4cf9c', hemi:['#f8dcae', '#8a7a5c', .68], sun:['#ffbf6e', .8, [-700, 260, 200]],  fill:.18, sea:'#2f7b88'},
  sunset:  {name:'Sunset',      sky:'#e99073', hemi:['#f6b49a', '#7a6670', .85], sun:['#ff9a62', .85, [-800, 160, -100]], fill:.25, sea:'#4f8399'},
  night:   {name:'Night',       sky:'#1d2b47', hemi:['#5d74a8', '#1c2333', .55], sun:['#b8cbff', .38, [300, 600, -300]],  fill:.12, sea:'#173b56'},
  storm:   {name:'Storm',       sky:'#6e7d85', hemi:['#a9b5ba', '#4c5550', .7],  sun:['#d8dde0', .2, [-200, 700, 200]],  fill:.1,  sea:'#2c5560'},
  studio:  {name:'Studio',      sky:'#e9e6df', hemi:['#ffffff', '#b8b2a6', .85], sun:['#ffffff', .55, [-300, 600, 500]],  fill:.35, sea:'#d6d1c6'},
};
function setLight(k){
  const L = LIGHTS[k]; scene.background = new T.Color(L.sky); scene.fog.color.set(L.sky);
  hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
  sun.color.set(L.sun[0]); sun.intensity = L.sun[1]; sunDir.set(...L.sun[2]); sun.position.copy(focus).add(sunDir); fill.intensity = L.fill; seaMat.color.set(L.sea);
  document.body.style.background = L.sky; $('tagline').style.color = k === 'night' ? '#e9eef7' : '';
}

// ---- small builders for the showroom scenes ----
const grassDisc = (r, color = '#5f7433') => { const g = new T.Mesh(new T.CylinderGeometry(r, r*1.06, 6, 40), mat(color)); g.position.y = -2; g.receiveShadow = true; g.userData.ground = true; return g; };
const row = (items, gap) => { const g = new T.Group(); let x = 0; const w = items.map(o => new T.Box3().setFromObject(o).getSize(new T.Vector3()).x);
  const total = w.reduce((a, b) => a + b, 0) + gap*(items.length - 1);
  items.forEach((o, i) => { o.position.x += -total/2 + x + w[i]/2; x += w[i] + gap; g.add(o); }); return g; };
const COLORS = ['#cf9035', '#3f6c94', '#ece2cb', '#c64a3c', '#71873f', '#5c3470'];
// a townsperson, the same as in the harbor towns
function townsperson(color){ const g = new T.Group(), inner = new T.Group(); g.add(inner);
  const body = new T.Mesh(beanGeo(6.8), mat(color)); body.castShadow = true; body.scale.set(.85, 1, .85); inner.add(body);
  cuteHead(inner, 8.9); g.userData.inner = inner; return g; }
const hoppers = []; // people that hop in place, to show how they move in town
function hopper(o, ph){ hoppers.push({o, ph}); return o; }

// A harbor town, put together like the game does: a main street up from the pier, houses facing it, a square with the
// temple and the city's god at the top, trees in the gaps and people walking about.
function harborTown(god = 'poseidon'){
  const g = new T.Group(), stone = '#e2d3ae';
  const sand = new T.Mesh(new T.CylinderGeometry(330, 350, 8, 48), mat('#e2cf98')); sand.position.y = -2; sand.receiveShadow = true; g.add(sand);
  const grass = new T.Mesh(new T.CylinderGeometry(290, 305, 10, 48), mat('#5f7433')); grass.position.y = 1; grass.receiveShadow = true; g.add(grass);
  const top = 6;
  const road = (x, z, l, w, rot) => { const r = new T.Mesh(new T.BoxGeometry(l, 1, w), mat(stone)); r.position.set(x, top + .4, z); r.rotation.y = rot; r.receiveShadow = true; g.add(r); };
  road(40, 0, 340, 16, 0); road(-10, 0, 220, 12, Math.PI/2); road(100, 0, 200, 12, Math.PI/2);
  const kinds = [0, 1, 2, 3, 0, 1, 2, 0, 3, 1, 2, 0, 1, 3, 2, 0, 1, 3];
  let k = 0;
  const put = (x, z, rot) => { const h = house(kinds[k % kinds.length]); h.position.set(x, top, z); h.rotation.y = rot; h.scale.y = .9 + (k % 3)*.12; g.add(h); k++; };
  // doors face the street: along the main street, then along the two side streets
  for (const x of [210, 170, 130, 60, 20]) for (const sg of [1, -1]) put(x, sg*30, sg*Math.PI/2);
  for (const sx of [100, -10]) for (const z of [62, 100, -62, -100]) for (const side of [1, -1]) put(sx + side*22, z, side > 0 ? Math.PI : 0);
  const sq = new T.Mesh(new T.CylinderGeometry(42, 42, 1, 24), mat(stone)); sq.position.set(-140, top + .5, 0); g.add(sq);
  const t = temple(); t.position.set(-150, top, 0); t.scale.setScalar(.8); g.add(t);
  const st = buildStatue(god); st.scale.setScalar(.6); st.position.set(-112, top, 0); g.add(st);
  const R = (i => () => (i = (i*9301 + 49297) % 233280)/233280)(7);
  for (const [x, z] of [[170, 72], [160, -78], [45, 70], [50, -76], [-60, 70], [-62, -74], [200, 105], [40, 135], [-110, 95], [-110, -100], [-205, 45], [-200, -50], [150, -150], [-30, 150]]){
    const c = R() < .5 ? cypress(CYPRESS_TINTS[Math.floor(R()*4)]) : roundTree(ROUND_TINTS[Math.floor(R()*ROUND_TINTS.length)], k++);
    c.position.set(x, top, z); c.scale.setScalar(.75 + R()*.3); g.add(c); }
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
  trireme:'Three rows of oars and an outrigger. Coming later.',
  raider:'The pirate galley: a dark hull, red eyes and a bronze boar\'s head ram, like the ships of Polycrates, the pirate king of Samos.',
  trader:'A small round trading ship. Some merchants sail these.', dinghy:'The small pirate boat.', skiff:'The pirate skiff, with its own little boar\'s head.'};
const GROUPS = {
  ships:{name:'Ships', items:[
    ...Object.keys(SPECS).map(k => ({name:k[0].toUpperCase() + k.slice(1), desc:SHIP_INFO[k] || '', make:() => buildShip(k, {}, true)})),
    {name:'The whole fleet', desc:'Every ship side by side, smallest to largest.', make:() => { const g = new T.Group(); let z = 0;
      ['rowboat', 'fishing', 'trader', 'merchant', 'penteconter', 'bireme', 'trireme', 'dinghy', 'skiff', 'raider'].forEach(k => { const s = buildShip(k); z += SPECS[k].B*1.4 + 30; s.position.set(-SPECS[k].L/2 + 100, 0, z); g.add(s); z += SPECS[k].B*1.4; });
      g.position.z = -z/2; const w = new T.Group(); w.add(g); return w; }},
    {name:'Shipwreck', desc:'Wrecks lie on the sea with cargo floating around them. Sail through to salvage.', make:() => wreckModel()},
  ]},
  monuments:{name:'Monuments', items:[
    {name:'Colossus of Rhodes', desc:'The bronze sun god astride the arena gate: a torch held high, a bow, a quiver and a crown of sun rays.', make:() => { const c = buildColossus(300, 150); c.rotation.y = Math.PI/2; return c; }},
    {name:'Athenian fortress', desc:'Every city island has one. Archers on the walls, catapults on the bastions, a keep with a columned porch.', make:() => buildFortress('athens', '#2f5f8a')},
    {name:'Spartan fortress', desc:'The same plan in warmer stone, with red banners.', make:() => buildFortress('sparta', '#9e2a22')},
    {name:'Pirate fortress', desc:'Dark stone on Thasos and Kos, with black banners.', make:() => buildFortress('pirate', '#231d1d')},
    {name:'Statue of Poseidon', desc:'With his trident. Stands at harbors and pirate fortresses.', make:() => buildStatue('poseidon')},
    {name:'Statue of Athena', desc:'Helmet, spear and shield. On Athenian fortresses and harbors.', make:() => buildStatue('athena')},
    {name:'Statue of Zeus', desc:'A thunderbolt and a laurel wreath. On Spartan fortresses.', make:() => buildStatue('zeus')},
    {name:'Statue of Apollo', desc:'With his lyre. In front of Spartan temples.', make:() => buildStatue('apollo')},
    {name:'Statue of Artemis', desc:'The huntress, with her bow, cast in bronze.', make:() => buildStatue('artemis', 'bronze')},
    {name:'Temple', desc:'Every harbor town has one on its square.', make:() => temple()},
  ]},
  cities:{name:'Cities', items:[
    {name:'Harbor town', desc:'A town like Kallisto: a main street up from the pier, side streets, houses facing the street, the temple and Poseidon on the square, trees and townspeople.', make:() => harborTown('poseidon')},
    {name:'Athenian town', desc:'City harbors are built the same way, with Athena in front of the temple.', make:() => harborTown('athena')},
    {name:'Snowy northern town', desc:'In the cold north the islands, roofs and trees are covered in snow, and icebergs float offshore.', make:() => snowyTown()},
    {name:'Houses', desc:'The four kinds of house: white with a flat roof, a blue dome, a red tile roof, and two floors with a terrace.', make:() => { const g = row([0, 1, 2, 3].map(k => house(k)), 18); g.add(grassDisc(90)); return g; }},
  ]},
  people:{name:'People', items:[
    {name:'Everyone', desc:'Round and cute, no arms, legs or faces. Townspeople, a rower, a deckhand, a captain, an archer, and pirates.', make:() => {
      const ppl = [...COLORS.slice(0, 3).map((c, i) => hopper(townsperson(c), i)), person('tunic1', 'row'), person('tunic2', 'stand'), person('tunic3', 'helm', 'captain'),
        person('tunic2', 'archer', 'hoplite'), person('rTunic', 'archer', 'pirate'), person('#2c1f1f', 'stand', 'pirate')];
      ppl.forEach(p => p.rotation.y = .9); const g = row(ppl, 6); g.add(grassDisc(70)); return g; }},
    {name:'Townspeople', desc:'They hop around the harbor towns, popping up as you sail close.', make:() => { const g = row(COLORS.map((c, i) => hopper(townsperson(c), i*.5)), 6); g.add(grassDisc(50)); return g; }},
    {name:'Soldiers and archers', desc:'A round bronze helmet with cheek guards and a red horsehair crest from front to back.', make:() => { const g = row([0, 1, 2].map(i => { const p = person(['tunic1', 'tunic2', 'tunic3'][i], 'archer', 'hoplite'); p.rotation.y = .9; return p; }), 8); g.add(grassDisc(40)); return g; }},
    {name:'Captains and generals', desc:'Their crest runs from side to side, like Spartan officers wore, white with a red rim.', make:() => { const g = row([0, 1].map(i => { const p = person(['tunic3', 'tunic2'][i], 'stand', 'captain'); p.rotation.y = .9; return p; }), 8); g.add(grassDisc(36)); return g; }},
    {name:'Pirates', desc:'A dark pointed felt cap with a red band.', make:() => { const g = row([0, 1, 2].map(i => { const p = person(['rTunic', '#2c1f1f', 'rTunic'][i], i === 1 ? 'stand' : 'archer', 'pirate'); p.rotation.y = .9; return p; }), 8); g.add(grassDisc(40)); return g; }},
    {name:'Rowers', desc:'One rower for every oar on the top row. They rock with each stroke.', make:() => { const g = row([0, 1, 2, 3].map(i => { const p = person(['tunic1', 'tunic2', 'tunic3', 'tunic1'][i], 'row'); p.rotation.y = .9; hoppers.push({o:p, ph:i*.3, rock:true}); return p; }), 6); g.add(grassDisc(40)); return g; }},
  ]},
  animals:{name:'Animals', items:[
    {name:'Whale', desc:'Surfaces now and then out at sea. Sail close for Poseidon\'s blessing.', make:() => { const w = whaleModel(); w.position.y = 4; w.userData.anim = 'whale'; return w; }},
    {name:'Dolphins', desc:'A pod that jumps beside your boat when you sail fast in open water.', make:() => { const g = new T.Group(); [0, 1, 2].forEach(i => { const d = dolphinModel(); d.position.set(i*30 - 30, 6, (i % 2)*24 - 12); d.userData.ph = i*1.2; g.add(d); }); g.userData.anim = 'dolphins'; return g; }},
    {name:'Gulls', desc:'They circle above the islands.', make:() => { const g = new T.Group(); [0, 1, 2].forEach(i => { const b = gull(); b.position.set(i*22 - 22, 30 + (i % 2)*10, (i - 1)*14); b.scale.setScalar(1.6); g.add(b); }); g.userData.anim = 'gulls'; return g; }},
    {name:'Fish', desc:'A school under glinting water. Stop there and your crew fishes.', make:() => { const g = new T.Group(), geo = new T.ConeGeometry(1.8, 8, 5); geo.rotateZ(-Math.PI/2);
      for (let i=0;i<9;i++){ const f = new T.Mesh(geo, mat(i % 3 ? '#8fb0c4' : '#5f86a8')); f.scale.setScalar(2); f.userData.ph = i*.7; g.add(f); } g.userData.anim = 'fish'; return g; }},
  ]},
  nature:{name:'Trees and ice', items:[
    {name:'All trees', desc:'Every tree color on the islands: cypress greens, and round trees in blossom pink, orange, gold, lilac and greens.', make:() => { const g = new T.Group();
      CYPRESS_TINTS.forEach((t, i) => { const c = cypress(t); c.position.set(-60 + i*40, 0, -30); g.add(c); });
      ROUND_TINTS.forEach((t, i) => { const c = roundTree(t, i); c.position.set(-90 + i*30, 0, 25 + (i % 2)*18); g.add(c); });
      g.add(grassDisc(135)); return g; }},
    {name:'Cypress trees', desc:'Tall and pointed, in four greens.', make:() => { const g = row(CYPRESS_TINTS.map(t => cypress(t)), 12); g.add(grassDisc(70)); return g; }},
    {name:'Round trees', desc:'Olive, almond and fig trees in blossom and autumn colors.', make:() => { const g = row(ROUND_TINTS.map((t, i) => roundTree(t, i)), 6); g.add(grassDisc(120)); return g; }},
    {name:'Snowy trees', desc:'On the cold northern islands.', make:() => { const g = row([0, 1, 2].map(() => cypress(['#2f4d3a', '#f4f8fa'])), 12); g.add(grassDisc(50, '#eef3f5')); return g; }},
    {name:'Iceberg', desc:'Twenty-six of them float in the cold north. Ships can\'t sail through.', make:() => icebergModel(70)},
  ]},
};

// ---- showing one ----
let group = 'ships', idx = 0, obj = null, focus = new T.Vector3(), dist = 300, yaw = -.9, pitch = .42, spin = false;
function show(){
  if (obj) scene.remove(obj); hoppers.length = 0;
  const item = GROUPS[group].items[idx];
  obj = item.make(); if (CEL.on) inkify(obj); obj.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  scene.add(obj);
  // frame the models, not the ground they stand on; fit the sun's shadow to them so shadows stay crisp
  const ground = obj.children.filter(o => o.userData.ground); ground.forEach(o => obj.remove(o));
  const box = new T.Box3().setFromObject(obj), size = box.getSize(new T.Vector3()); box.getCenter(focus); ground.forEach(o => obj.add(o));
  const big = Math.max(size.x, size.y, size.z); dist = big*1.45 + 40;
  const sc = sun.shadow.camera, half = Math.max(80, big*.9); Object.assign(sc, {left:-half, right:half, top:half, bottom:-half}); sc.updateProjectionMatrix();
  sun.target.position.copy(focus); sun.position.copy(focus).add(sunDir); scene.add(sun.target); $('desc').textContent = item.desc;
}
function fillPick(){ $('pick').innerHTML = GROUPS[group].items.map((it, i) => `<option value="${i}">${it.name}</option>`).join(''); $('pick').value = idx; }
$('group').innerHTML = Object.entries(GROUPS).map(([k, g]) => `<option value="${k}">${g.name}</option>`).join('');
$('light').innerHTML = Object.entries(LIGHTS).map(([k, l]) => `<option value="${k}">${l.name}</option>`).join('');
$('group').addEventListener('change', e => { group = e.target.value; idx = 0; fillPick(); show(); });
$('pick').addEventListener('change', e => { idx = +e.target.value; show(); });
$('light').addEventListener('change', e => setLight(e.target.value));
// the cel-shaded test look: hard bands and ink outlines
$('cel').addEventListener('click', () => { setCel(!CEL.on); $('cel').setAttribute('aria-pressed', CEL.on); show(); });
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
const q = new URLSearchParams(location.search);
if (GROUPS[q.get('g')]) group = q.get('g'); idx = Math.min(+(q.get('i') || 0), GROUPS[group].items.length - 1);
$('group').value = group; fillPick();
const lk = LIGHTS[q.get('light')] ? q.get('light') : 'noon'; $('light').value = lk; setLight(lk);
if (q.get('cel') === '1'){ setCel(true); $('cel').setAttribute('aria-pressed', true); }
if (q.get('ui') === '0') fold(true), $('unfold').hidden = true;
show(); resize();
if (q.get('yaw')) yaw = +q.get('yaw'); if (q.get('pitch')) pitch = +q.get('pitch'); if (q.get('zoom')) dist /= +q.get('zoom');
const fx = +(q.get('fx') || 0), fy = +(q.get('fy') || 0);

// gentle life: oars row, flags wave, animals swim and flap, people hop
function animate(t){
  if (!obj) return;
  if (obj.userData.oars) animateShip(obj, t, 20);
  for (const s of obj.userData.ships || []) animateShip(s, t, 10);
  const a = obj.userData.anim;
  if (a === 'whale'){ obj.userData.tail.rotation.z = Math.sin(t*1.4)*.25; obj.userData.body.rotation.z = Math.sin(t*.7)*.04; }
  if (a === 'dolphins') obj.children.forEach(d => { const p = (t*.9 + d.userData.ph) % (Math.PI*2); d.position.y = 6 + Math.max(0, Math.sin(p))*26 - 8; d.rotation.z = Math.cos(p)*.7; });
  if (a === 'gulls') obj.children.forEach((b, i) => { b.userData.wings.forEach(w => w.p.rotation.x = w.s*Math.sin(t*6 + i)*.45); b.position.y = 34 + Math.sin(t*1.5 + i)*4; });
  if (a === 'fish') obj.children.forEach(f => { const p = t*.7 + f.userData.ph; f.position.set(Math.cos(p)*40, 4 + Math.sin(p*2)*2, Math.sin(p)*40*.6); f.rotation.y = -p - Math.PI/2; });
  for (const h of hoppers){ const inner = h.o.userData.inner; if (!inner) continue;
    if (h.rock) inner.rotation.z = Math.sin(t*2.6 + h.ph)*.25;
    else { const p = (t*1.3 + h.ph) % 2.2; inner.position.y = p < .42 ? Math.sin(p/.42*Math.PI)*5 : 0; } }
}
let t0 = performance.now();
function frame(now){
  const t = (now - t0)/1000; animate(t); if (spin && !pts.size) yaw += .003;
  focus.x += fx; focus.y += fy;
  camera.position.set(focus.x + Math.cos(yaw)*Math.cos(pitch)*dist, focus.y + Math.sin(pitch)*dist, focus.z + Math.sin(yaw)*Math.cos(pitch)*dist);
  camera.lookAt(focus); focus.x -= fx; focus.y -= fy;
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
