// The showroom: every 3D model in the game on one calm sea, to look at from all sides. Uses the game's own builders,
// so what you see here is exactly what sails in the game.
import {buildShip, SPECS, CEL, setCel, inkify} from './ships.js?v=1b5598e';
import {buildColossus, buildFortress, buildStatue} from './monuments.js?v=1b5598e';

const T = window.THREE, $ = id => document.getElementById(id);
const renderer = new T.WebGLRenderer({canvas:$('stage'), antialias:true});
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene(); scene.background = new T.Color('#c9e3e8'); scene.fog = new T.Fog('#c9e3e8', 2200, 5200);
scene.add(new T.HemisphereLight(0xeaf3f5, 0x8c927c, .8));
const sun = new T.DirectionalLight(0xffeccc, .65); sun.position.set(-400, 700, 400); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left:-700, right:700, top:700, bottom:-700, far:2500}); scene.add(sun);
const fill = new T.DirectionalLight(0xcfe3ff, .28); fill.position.set(300, 200, -300); scene.add(fill);
const sea = new T.Mesh(new T.CircleGeometry(6000, 64), new T.MeshLambertMaterial({color:'#2b7f93'})); sea.rotation.x = -Math.PI/2; sea.receiveShadow = true; scene.add(sea);
const camera = new T.PerspectiveCamera(40, 1, 2, 9000);

const SHIP_INFO = {
  rowboat:'Your first boat. One rower, a small hold.', fishing:'A sail, nets and a second crew member.', merchant:'Trade ships with a cabin and a cargo of amphorae.',
  penteconter:'A long fast warship with one row of oars.', bireme:'Your warship: one row of oars, four archers, a bronze ram.', trireme:'Three rows of oars and an outrigger. Coming later.',
  raider:'The pirate galley, with shields along its sides.', dinghy:'The small pirate boat.', skiff:'The pirate skiff.'};
const GROUPS = {
  ships:Object.keys(SPECS).map(k => ({key:k, name:k[0].toUpperCase() + k.slice(1), desc:SHIP_INFO[k] || '', make:() => buildShip(k, {}, true)})),
  monuments:[
    {key:'colossus', name:'Colossus of Rhodes', desc:'The bronze sun god astride the arena gate: a torch held high, a bow, a quiver and a crown of sun rays.', make:() => buildColossus(300, 150)},
    {key:'athens', name:'Athenian fortress', desc:'Every city island has one. Archers on the walls, catapults on the bastions, a keep with a columned porch.', make:() => buildFortress('athens', '#2f5f8a')},
    {key:'sparta', name:'Spartan fortress', desc:'The same plan in warmer stone, with red banners.', make:() => buildFortress('sparta', '#9e2a22')},
    {key:'pirate', name:'Pirate fortress', desc:'Dark stone on Thasos and Kos, with black banners.', make:() => buildFortress('pirate', '#231d1d')},
    {key:'statue', name:'Marble statue', desc:'A god on a plinth, for the harbors.', make:() => buildStatue('marble')},
    {key:'bronze', name:'Bronze statue', desc:'The same god cast in bronze.', make:() => buildStatue('bronze')},
  ]};

let group = 'ships', obj = null, focus = new T.Vector3(), dist = 300, yaw = -.9, pitch = .42;
function show(item){
  if (obj) scene.remove(obj);
  obj = item.make(); if (CEL.on && !obj.userData.inked) inkify(obj); obj.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  if (item.key === 'colossus') obj.rotation.y = Math.PI/2;
  scene.add(obj);
  const box = new T.Box3().setFromObject(obj), size = box.getSize(new T.Vector3()); box.getCenter(focus);
  dist = Math.max(size.x, size.y, size.z)*1.5 + 40; $('desc').textContent = item.desc;
}
function fillPick(){
  $('pick').innerHTML = GROUPS[group].map((it, i) => `<option value="${i}">${it.name}</option>`).join('');
  show(GROUPS[group][0]);
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { group = b.dataset.g;
  document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-pressed', x === b)); fillPick(); }));
$('pick').addEventListener('change', e => show(GROUPS[group][+e.target.value]));
// the cel-shaded test look: hard bands and ink outlines
$('cel').addEventListener('click', () => { setCel(!CEL.on); $('cel').setAttribute('aria-pressed', CEL.on); show(GROUPS[group][+$('pick').value]); });

// drag to turn, wheel or pinch to zoom
const pts = new Map(); let pinch = 0;
const cv = $('stage');
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, {x:e.clientX, y:e.clientY}); });
cv.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return;
  if (pts.size === 2){ const [a, b] = [...pts.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y); p.x = e.clientX; p.y = e.clientY; const [c, d] = [...pts.values()], d1 = Math.hypot(c.x - d.x, c.y - d.y); if (d0) dist *= d0/d1; return; }
  yaw += (e.clientX - p.x)*.008; pitch = Math.max(.05, Math.min(1.4, pitch + (e.clientY - p.y)*.006)); p.x = e.clientX; p.y = e.clientY; });
const up = e => pts.delete(e.pointerId); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { e.preventDefault(); dist *= Math.exp(e.deltaY*.001); }, {passive:false});

function resize(){ renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const q = new URLSearchParams(location.search); if (q.get('g')) group = q.get('g');
document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-pressed', x.dataset.g === group)); fillPick();
if (q.get('cel') === '1'){ setCel(true); $('cel').setAttribute('aria-pressed', true); show(GROUPS[group][+$('pick').value]); }
if (q.get('i')){ $('pick').value = q.get('i'); show(GROUPS[group][+q.get('i')]); }
function frame(t){
  if (obj && obj.userData.flame) obj.userData.flame.scale.set(1 + Math.sin(t*.009)*.08, 1 + Math.sin(t*.013)*.15, 1);
  camera.position.set(focus.x + Math.cos(yaw)*Math.cos(pitch)*dist, focus.y + Math.sin(pitch)*dist, focus.z + Math.sin(yaw)*Math.cos(pitch)*dist);
  camera.lookAt(focus); renderer.render(scene, camera); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
