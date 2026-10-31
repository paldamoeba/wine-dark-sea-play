// Ship and statue models in the game's art style ("Warm": painted shading, calm colors).
// Built from the Shipyard art tests. Ships face +x, the deck sits near y = 0.
const T = window.THREE;

// ---------- colors ----------
export const P = {
  oar:'#c9503f', blue:'#33589a', white:'#f1ece0', red:'#c64a3c', rope:'#cfa960', fan:'#e8c661', mast:'#6e3d1e',
  bronze:'#b07f3c', cream:'#efe4c8', ochre:'#cf9035', net:'#506a42', skin:'#cf9f7c', steer:'#5a3518', hair:'#3a2a20',
  rOar:'#3a2a24', rTunic:'#6e1f22', tunic1:'#cf9035', tunic2:'#3f6c94', tunic3:'#ece2cb', belt:'#5a3518', bow:'#7a4a22', plume:'#b8402f',
};
export const PAINTS = {
  gold:   {name:'Sunlit gold',  top:'#e3ad48', panel:'#8a5530', bottom:'#9a3b2e', deck:'#e8c97c', inner:'#bf8a3a', wale:'#74401f'},
  aegean: {name:'Aegean blue',  top:'#41699f', panel:'#ece6d8', bottom:'#283a58', deck:'#e0c690', inner:'#33598a', wale:'#20304c'},
  black:  {name:'Pitch black',  top:'#33313a', panel:'#bd4a37', bottom:'#211f25', deck:'#c49c66', inner:'#423f47', wale:'#bd4a37'},
  white:  {name:'Lime white',   top:'#e9e3d4', panel:'#c08736', bottom:'#86402f', deck:'#ddc18f', inner:'#d2cab8', wale:'#6c4a2c'},
  green:  {name:'Olive green',  top:'#71873f', panel:'#e0c162', bottom:'#3f4b27', deck:'#ddc48d', inner:'#5f7334', wale:'#e0c162'},
  oak:    {name:'Bare oak',     top:'#a3754a', panel:'#7a5230', bottom:'#5e3c22', deck:'#d2a873', inner:'#8c6337', wale:'#4f3119'},
  raider: {name:'Raider dark',  top:'#5e3628', panel:'#271b1b', bottom:'#3c2626', deck:'#8a5d3e', inner:'#4a2c22', wale:'#271b1b'},
  king:   {name:'Pirate king',  top:'#1f1c24', panel:'#e3ad48', bottom:'#141217', deck:'#8a5d3e', inner:'#2a2630', wale:'#e3ad48', hidden:true}, // Polycrates' flagship: black and gold
};
export const SAILS = {
  bwr:    {name:'Blue, white, red', stripes:['#33589a','#f1ece0','#c64a3c','#f1ece0','#33589a']},
  ochre:  {name:'Cream and ochre',  stripes:['#efe4c8','#cf9035','#efe4c8','#cf9035','#efe4c8']},
  plain:  {name:'Plain linen',      stripes:['#ece2cb']},
  purple: {name:'Royal purple',     stripes:['#5c3470','#e0c162','#5c3470']},
  sea:    {name:'Sea green',        stripes:['#348a84','#f1ece0','#348a84','#f1ece0','#348a84']},
  blood:  {name:'Blood red',        stripes:['#7a2426','#2c1f1f','#7a2426','#2c1f1f','#7a2426']},
  // city sails, only for Athenian and Spartan ships
  athens: {name:'Athens', stripes:['#f1ece0'], border:'#b8322a', city:true},
  sparta: {name:'Sparta', stripes:['#9e2a22'], border:'#e6c27a', city:true},
};
export const GODS = {
  none:    {name:'None'},
  poseidon:{name:'Poseidon',  bg:'#244f86', fg:'#e9f1f7', sign:'trident'},
  zeus:    {name:'Zeus',      bg:'#3d3369', fg:'#ecc657', sign:'bolt'},
  athena:  {name:'Athena',    bg:'#5c6a32', fg:'#ece5cf', sign:'owl'},
  apollo:  {name:'Apollo',    bg:'#ab4636', fg:'#f0cd62', sign:'sun'},
  artemis: {name:'Artemis',   bg:'#26473e', fg:'#e4ebe8', sign:'moon'},
  hermes:  {name:'Hermes',    bg:'#cf9035', fg:'#faf2df', sign:'wings'},
  athens:  {name:'Athens',    bg:'#f1ece0', fg:'#b8322a', sign:'owl', city:true},
  sparta:  {name:'Sparta',    bg:'#9e2a22', fg:'#efe0b8', sign:'lambda', city:true},
};
// Sizes are matched to the crew: a person is about 13 units tall.
// Every top-row oar has its own rower on deck. (Lower rows would row from inside the hull, through oar holes; no ship uses them now.)
// sailMax = how many sail upgrades the ship takes: every 5 levels a new sail goes up (see sailSizes).
export const SPECS = {
  rowboat:    {L:40, B:17, H:9, rise:5, oarRows:1, oarCount:1, sailW:20, sailH:17, sailMax:5, crew:[], look:{paint:'oak', sail:null, flag:'none'}},
  fishing:    {L:64, B:23, H:12, rise:9, mast:true, sailW:34, sailH:28, sailMax:10, hats:true, nets:true, crew:[['stand', 2]], look:{paint:'gold', sail:'ochre', flag:'artemis'}},
  merchant:   {L:110, B:44, H:22, rise:14, mast:true, sailW:64, sailH:52, sailMax:20, hats:true, cargo:true, cabin:true, crew:[['stand', 3]], crewAt:[[-.45, 0], [.37, 0], [-.12, .32]], look:{paint:'white', sail:'plain', flag:'hermes'}},
  penteconter:{L:150, B:22, H:13, rise:18, oarRows:1, oarCount:11, mast:true, sailW:44, sailH:38, sailMax:10, ram:true, eyes:true, fans:true, crew:[['stand', 1]], look:{paint:'black', sail:'bwr', flag:'apollo'}},
  bireme:     {L:160, B:30, H:18, rise:26, oarRows:1, oarCount:14, mast:true, sailW:62, sailH:52, sailMax:10, ram:true, fans:true, eyes:true, crew:[['stand', 1], ['archer', 4]], look:{paint:'gold', sail:'bwr', flag:'poseidon'}},
  trireme:    {L:190, B:34, H:21, rise:32, oarRows:1, oarCount:16, mast:true, sailW:74, sailH:60, sailMax:15, ram:true, bigRam:true, fans:true, bowFans:true, eyes:true, outrigger:true, canopy:true, crew:[['stand', 1], ['archer', 6]], look:{paint:'aegean', sail:'bwr', flag:'zeus'}},
  raider:     {L:135, B:28, H:16, rise:22, oarRows:1, oarCount:9, mast:true, sailW:56, sailH:46, sailMax:10, ram:true, fans:true, eyes:true, raider:true, crew:[['stand', 1], ['archer', 6]], look:{paint:'raider', sail:'blood', flag:'none'}},
  trader:     {L:84, B:36, H:18, rise:12, mast:true, sailW:50, sailH:42, sailMax:15, hats:true, cargo:true, crateX:-.25, crew:[['stand', 2]], crewAt:[[-.4, 0], [.33, 0]], look:{paint:'oak', sail:'ochre', flag:'hermes'}}, // a small round trading ship
  dinghy:     {L:44, B:17, H:9, rise:6, oarRows:1, oarCount:2, mast:true, sailW:20, sailH:18, sailMax:5, raider:true, crew:[['archer', 1]], look:{paint:'raider', sail:'blood', flag:'none'}},
  skiff:      {L:72, B:22, H:12, rise:12, oarRows:1, oarCount:3, mast:true, sailW:34, sailH:28, sailMax:10, fans:true, ram:true, raider:true, crew:[['archer', 3]], look:{paint:'raider', sail:'blood', flag:'none'}},
};

// ---------- materials ----------
function gradTex(steps){ const d = new Uint8Array(steps.length*3); steps.forEach((v, i) => d.set([v, v, v], i*3));
  const t = new T.DataTexture(d, steps.length, 1, T.RGBFormat); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t; }
const GRAD = gradTex([150, 205, 255]); // three gentle steps
// ---- the cel-shaded test look: two hard bands of light and dark ink outlines (a setting under Graphics) ----
export const CEL = {on:(() => { try { return !!JSON.parse(localStorage.getItem('wine-dark-sea-settings')).cel; } catch (e) { return false; } })()};
export function setCel(on){ CEL.on = on; GRAD.image.data.set(on ? [118, 118, 118, 255, 255, 255, 255, 255, 255] : [150, 150, 150, 205, 205, 205, 255, 255, 255]);
  GRAD.minFilter = GRAD.magFilter = on ? T.NearestFilter : T.LinearFilter; GRAD.needsUpdate = true; } // the normal look shades smoothly; cel has hard bands
setCel(CEL.on);
const inkMat = new T.MeshBasicMaterial({color:'#1d1a22', side:T.BackSide});
// the rim stays the same thickness however much a part is scaled up (tree crowns are small balls blown up 10 times)
inkMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'float inkS = max(.001, length(vec3(modelMatrix[0][0], modelMatrix[0][1], modelMatrix[0][2])));\nvec3 transformed = position + normal * (0.9 / inkS);'); };
// Outlines: a slightly fatter dark copy of every solid mesh, drawn inside out so only its rim shows.
export function inkify(obj){
  const add = []; obj.traverse(o => { if (o.isMesh && !o.userData.ink && o.material && !o.material.map && !o.material.transparent && o.geometry.attributes.normal) add.push(o); });
  for (const o of add){ const m = new T.Mesh(o.geometry, inkMat); m.userData.ink = true; m.castShadow = m.receiveShadow = false; o.add(m); }
  return obj;
}
const GREY = new T.Color('#a39d90');
const KEEP = ['side', 'map', 'transparent', 'alphaTest', 'vertexColors', 'opacity', 'depthWrite', 'flatShading'];
const mats = {};
export function mat(color, o = {}){
  const opts = {}; for (const k of KEEP) if (k in o) opts[k] = o[k];
  const key = color + JSON.stringify(opts, (k, v) => v && v.isTexture ? v.uuid : v);
  if (mats[key]) return mats[key];
  const c = new T.Color(P[color] || color); if (!opts.map && !opts.vertexColors) c.lerp(GREY, .06);
  return mats[key] = new T.MeshToonMaterial({color:c, gradientMap:GRAD, flatShading:true, ...opts});
}
export function mesh(geo, color, o){ const m = new T.Mesh(geo, mat(color, o)); m.castShadow = m.receiveShadow = true; return m; }
function tube(points, radius, color, radial = 5, closed = false){
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), closed, 'centripetal');
  return mesh(new T.TubeGeometry(curve, Math.max(8, points.length*(closed ? 4 : 2)), radius, radial, closed), color);
}
// one closed ring around the whole hull: down the left side bow to stern, back up the right, so the two sides meet at the ends with no seam
const loop = (st, f) => [...st.map(p => f(p, -1)), ...st.slice(1, -1).reverse().map(p => f(p, 1))];

// ---------- emblems ----------
function drawSign(c, sign, x, y, s, fg, bg){
  c.save(); c.translate(x, y); c.fillStyle = fg;
  if (sign === 'trident'){
    c.fillRect(-s*.05, -s*.25, s*.1, s*.75); c.fillRect(-s*.32, -s*.28, s*.64, s*.09);
    for (const px of [-.3, 0, .3]){ c.fillRect(px*s - s*.045, -s*.62, s*.09, s*.38); c.beginPath(); c.moveTo(px*s - s*.1, -s*.6); c.lineTo(px*s, -s*.78); c.lineTo(px*s + s*.1, -s*.6); c.fill(); }
  } else if (sign === 'bolt'){
    c.beginPath(); [[.12,-.7],[-.28,.02],[-.02,.02],[-.16,.7],[.3,-.08],[.04,-.08],[.22,-.7]].forEach(([a, b], i) => i ? c.lineTo(a*s, b*s) : c.moveTo(a*s, b*s)); c.closePath(); c.fill();
  } else if (sign === 'owl'){
    c.beginPath(); c.ellipse(0, s*.18, s*.34, s*.45, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.moveTo(-s*.34, -s*.32); c.lineTo(-s*.2, -s*.58); c.lineTo(-s*.08, -s*.3); c.moveTo(s*.34, -s*.32); c.lineTo(s*.2, -s*.58); c.lineTo(s*.08, -s*.3); c.fill();
    c.beginPath(); c.ellipse(0, -s*.18, s*.36, s*.26, 0, 0, Math.PI*2); c.fill();
    c.fillStyle = bg; for (const ex of [-.15, .15]){ c.beginPath(); c.arc(ex*s, -s*.18, s*.12, 0, Math.PI*2); c.fill(); }
    c.fillStyle = fg; for (const ex of [-.15, .15]){ c.beginPath(); c.arc(ex*s, -s*.18, s*.05, 0, Math.PI*2); c.fill(); }
  } else if (sign === 'sun'){
    c.beginPath(); c.arc(0, 0, s*.3, 0, Math.PI*2); c.fill();
    for (let i=0;i<12;i++){ const a = i/12*Math.PI*2; c.beginPath(); c.moveTo(Math.cos(a-.12)*s*.36, Math.sin(a-.12)*s*.36); c.lineTo(Math.cos(a)*s*.66, Math.sin(a)*s*.66); c.lineTo(Math.cos(a+.12)*s*.36, Math.sin(a+.12)*s*.36); c.fill(); }
  } else if (sign === 'moon'){
    c.beginPath(); c.arc(0, 0, s*.5, Math.PI*.3, Math.PI*1.7); c.arc(s*.2, 0, s*.38, Math.PI*1.55, Math.PI*.45, true); c.closePath(); c.fill();
    c.beginPath(); c.arc(s*.38, -s*.32, s*.06, 0, Math.PI*2); c.fill();
  } else if (sign === 'lambda'){ // the Spartan shield letter
    c.beginPath(); c.moveTo(-s*.42, s*.5); c.lineTo(-s*.1, -s*.55); c.lineTo(s*.1, -s*.55); c.lineTo(s*.42, s*.5); c.lineTo(s*.2, s*.5); c.lineTo(0, -s*.18); c.lineTo(-s*.2, s*.5); c.closePath(); c.fill();
  } else if (sign === 'wings'){
    for (const d of [-1, 1]) for (let k=0;k<4;k++){ c.beginPath(); c.ellipse(d*s*(.2 + k*.1), -s*(.05 + k*.1), s*.32 - k*.04, s*.07, d*(-.5 - k*.18), 0, Math.PI*2); c.fill(); }
    c.beginPath(); c.arc(0, s*.12, s*.13, 0, Math.PI*2); c.fill();
  }
  c.restore();
}
const texCache = {};
function canvasTex(key, w, h, draw){
  if (texCache[key]) return texCache[key];
  const cnv = document.createElement('canvas'); cnv.width = w; cnv.height = h; draw(cnv.getContext('2d'), w, h);
  const t = new T.CanvasTexture(cnv); t.anisotropy = 4; return texCache[key] = t;
}
function sailTex(sailKey, god){
  return canvasTex('sail' + sailKey + god, 256, 256, (c, w, h) => {
    const st = SAILS[sailKey].stripes; st.forEach((col, i) => { c.fillStyle = col; c.fillRect(Math.floor(i*w/st.length), 0, Math.ceil(w/st.length) + 1, h); });
    c.fillStyle = 'rgba(0,0,0,.06)'; for (let y=0;y<h;y+=32) c.fillRect(0, y, w, 2);
    const bd = SAILS[sailKey].border; if (bd){ c.fillStyle = bd; c.fillRect(0, 0, w, h*.06); c.fillRect(0, h*.94, w, h*.06); c.fillRect(0, h*.11, w, h*.02); c.fillRect(0, h*.87, w, h*.02); }
    const g = GODS[god]; if (g && g.sign){ c.fillStyle = g.bg; c.beginPath(); c.arc(w/2, h*.5, w*.27, 0, Math.PI*2); c.fill(); c.lineWidth = 6; c.strokeStyle = g.fg; c.stroke(); drawSign(c, g.sign, w/2, h*.5, w*.36, g.fg, g.bg); }
  });
}
function flagTex(god){
  return canvasTex('flag' + god, 256, 160, (c, w, h) => {
    const g = GODS[god];
    c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w*.8, h/2); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fillStyle = g.bg; c.fill();
    c.fillStyle = g.fg; c.fillRect(0, 0, w*.06, h); drawSign(c, g.sign, w*.4, h/2, h*.72, g.fg, g.bg);
  });
}

// ---------- hull ----------
function buildGeo(tris){
  const pos = new Float32Array(tris.length*9), col = new Float32Array(tris.length*9);
  tris.forEach(([a, b, c, cn], i) => { const k = new T.Color(cn); [a, b, c].forEach((p, j) => { pos.set(p, i*9 + j*3); col.set([k.r, k.g, k.b], i*9 + j*3); }); });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
const keelAt = (s, a) => -s.H*.5 + s.rise*.5*Math.pow(a, 4);
function hull(s, paint){
  const {L, B, H, rise} = s, C = PAINTS[paint] || PAINTS.gold, N = 30;
  const W = a => B/2 * Math.pow(Math.max(0, 1 - Math.pow(a, 2.4)), .55);
  const deckY = a => H*.5 + rise*Math.pow(a, 3.2);
  const deckLevel = H*.5 - H*.3, phis = [0, .32, .64, .95, 1.25, Math.PI/2];
  const st = [];
  for (let i=0;i<=N;i++){
    const t = -1 + 2*i/N, a = Math.abs(t), x = t*L/2, w = W(a), dy = deckY(a), ky = keelAt(s, a);
    const side = sg => phis.map(p => [x, dy - (dy-ky)*Math.sin(p), sg*w*Math.pow(Math.cos(p), .7)]);
    st.push({x, a, w, dy, ring:[...side(-1), ...side(1).reverse().slice(1)], inL:[x, Math.min(dy, deckLevel), -w*.84], inR:[x, Math.min(dy, deckLevel), w*.84]});
  }
  const tris = [], M = st[0].ring.length;
  for (let i=0;i<N;i++){
    const A = st[i], Bs = st[i+1], amid = (A.a + Bs.a)/2;
    for (let k=0;k<M-1;k++){
      const p1 = A.ring[k], p2 = Bs.ring[k], p3 = Bs.ring[k+1], p4 = A.ring[k+1];
      const cy = (p1[1]+p2[1]+p3[1]+p4[1])/4, band = Math.min(k, M-2-k);
      let c = C.top;
      if (cy < -H*.12 + rise*.3*Math.pow(amid, 3)) c = C.bottom;
      else if (band === 1 && i % 2 === 0 && amid < .72) c = C.panel;
      tris.push([p1, p2, p3, c], [p1, p3, p4, c]);
    }
    const gl = A.ring[0], gl2 = Bs.ring[0], gr = A.ring[M-1], gr2 = Bs.ring[M-1];
    tris.push([gl, A.inL, Bs.inL, C.inner], [gl, Bs.inL, gl2, C.inner], [gr, Bs.inR, A.inR, C.inner], [gr, gr2, Bs.inR, C.inner]);
    tris.push([A.inL, A.inR, Bs.inR, C.deck], [A.inL, Bs.inR, Bs.inL, C.deck]);
  }
  const g = new T.Group();
  const m = new T.Mesh(buildGeo(tris), mat('#ffffff', {vertexColors:true, side:T.DoubleSide})); m.castShadow = m.receiveShadow = true; g.add(m);
  const railR = Math.max(.9, B*.045), waleR = Math.max(.7, B*.035);
  g.add(tube(loop(st, (p, sg) => [p.x, p.dy + railR*.3, sg*p.w]), railR, C.wale, 7, true));
  g.add(tube(loop(st, (p, sg) => { const r = p.ring[sg < 0 ? 2 : M-3]; return [r[0], r[1], r[2]*1.04]; }), waleR, C.wale, 6, true));
  if (H > 11) g.add(tube(loop(st, (p, sg) => { const r = p.ring[sg < 0 ? 3 : M-4]; return [r[0], r[1] - .5, r[2]*1.05]; }), waleR*.8, C.wale, 6, true));
  g.add(tube(st.map(p => p.ring[5]).map(([x, y]) => [x, y - .6, 0]), Math.max(1, B*.04), C.bottom));
  for (let k=-2;k<=2;k++){ const p = mesh(new T.BoxGeometry(L*.6, .35, .5), C.inner); p.position.set(0, deckLevel + .2, k*B*.12); g.add(p); }
  for (let k=0;k<6;k++){ const x = (-.3 + k*.12)*L, w = W(Math.abs(x/(L/2)))*1.7; const bm = mesh(new T.BoxGeometry(1.6, 1.2, w), C.wale); bm.position.set(x, deckLevel + .6, 0); g.add(bm); }
  g.userData = {W, deckY, deckLevel};
  return g;
}

// ---------- parts ----------
// A crew member: a peg figure like the townspeople, a body and a head with no arms or legs. About 13 units tall. Faces +x.
// pose: 'row' (seated lower, rocks with the stroke), 'stand', 'helm', 'archer' (a bow at their side, leans in to shoot).
// Round, cute bodies: a bean shape (wide in the middle, rounded at the bottom) and a big round head, no face. Shared by crews and towns.
const beans = {};
export function beanGeo(h = 7.4){ return beans[h] || (beans[h] = new T.LatheGeometry([[0, 0], [2.1, .25], [3, 1.3], [3.3, 2.9], [3.1, 4.5], [2.5, 5.9], [1.5, 6.9], [0, 7.3]].map(([r, y]) => new T.Vector2(r, y*h/7.3)), 18)); }
const headGeo = new T.SphereGeometry(3, 22, 16);
const SM = {flatShading:false}; // people are smooth and round
const capGeo = new T.SphereGeometry(3.15, 22, 9, 0, Math.PI*2, 0, Math.PI/2.1), helmGeo = new T.SphereGeometry(3.35, 24, 10, 0, Math.PI*2, 0, Math.PI/1.75);
const cheekGeo = new T.SphereGeometry(1.5, 14, 10), standGeo = new T.CylinderGeometry(.5, .7, 1.2, 10);
const crestGeo = new T.CylinderGeometry(3.4, 3.4, 1.3, 24, 1, false, Math.PI/2, Math.PI); crestGeo.rotateX(Math.PI/2); // a solid half disc, like a horsehair crest
const pilosGeo = new T.LatheGeometry([[3.45, 0], [3.35, 1.4], [2.8, 3], [1.8, 4.4], [.7, 5.4], [0, 5.7]].map(([r, y]) => new T.Vector2(r, y)), 22), bandGeo = new T.TorusGeometry(3.35, .5, 8, 24);
const coneGeo = new T.LatheGeometry([[3.5, 0], [3.4, 1.6], [2.8, 3.6], [1.6, 5.6], [.5, 6.8], [0, 7]].map(([r, y]) => new T.Vector2(r, y)), 22);
const brimGeo = new T.CylinderGeometry(6.4, 6.8, .5, 28), rimGeo = new T.TorusGeometry(3.4, .45, 8, 24), featherGeo = new T.ConeGeometry(.7, 5.5, 10);
const leafGeo = new T.SphereGeometry(.8, 8, 6);
// Helmets and hats (no face under them, by choice):
//  'hoplite'  a round bronze helmet with cheek guards and a front-to-back horsehair crest (archers, marines)
//  'captain'  the same helmet with a tall crest running side to side, like Spartan officers wore (captains, generals)
//  'pirate'   a dark pointed felt cap with a red band
//  'spartan'  a plain bronze cone, the pilos helmet Spartan soldiers wore
//  'attic'    Athenian: bronze with a crest and two tall white feathers
//  'phrygian' a tall bronze cap whose top curls forward, with a crest along it
//  'boeotian' a bronze dome with a wide folded brim, for horsemen and lookouts
//  'petasos'  a wide straw sun hat, for fishermen and merchants
//  'laurel'   a golden laurel wreath, for champions of the games
export const HELMETS = {hoplite:'Hoplite', captain:'Captain', attic:'Athenian', spartan:'Spartan', phrygian:'Phrygian', boeotian:'Boeotian', pirate:'Pirate cap', petasos:'Straw hat', laurel:'Laurel wreath'};
const HATS = ['petasos', 'laurel']; // worn over the hair
// A tube that narrows along a curve: circles swept along pts, radius r(t) from 0 (start) to 1 (end), closed with a point.
function taper(pts, r, seg = 24, rad = 14){
  const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), fr = curve.computeFrenetFrames(seg, false), pos = [], idx = [];
  for (let i=0;i<=seg;i++){ const t = i/seg, c = curve.getPointAt(t), rr = r(t), N = fr.normals[i], B = fr.binormals[i];
    for (let j=0;j<=rad;j++){ const a = j/rad*Math.PI*2; pos.push(c.x + (N.x*Math.cos(a) + B.x*Math.sin(a))*rr, c.y + (N.y*Math.cos(a) + B.y*Math.sin(a))*rr, c.z + (N.z*Math.cos(a) + B.z*Math.sin(a))*rr); } }
  for (let i=0;i<seg;i++) for (let j=0;j<rad;j++){ const a = i*(rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// the Phrygian helmet in one smooth piece: it fits the head, rises, and its top curls forward over the brow to a little knob
const phryGeo = taper([[-.3, -.7, 0], [-.5, 1.6, 0], [-.3, 4, 0], [.7, 6, 0], [2.4, 6.9, 0], [4, 6.5, 0], [4.9, 5.2, 0], [4.8, 3.9, 0]], t => t < .25 ? 3.45 - t*.6 : 3.3*(1 - (t - .25)/.75*.86), 48, 24);
// the Boeotian helmet: a round dome and a wide brim that flares down, with soft folds in it
const boeoGeo = (() => { const g = new T.LatheGeometry(new T.SplineCurve([[0, 3.7], [1.9, 3.5], [3.1, 2.7], [3.55, 1.3], [3.65, .2], [4.5, -.5], [5.5, -1.5], [6, -2.3], [5.8, -2.6]].map(([r, y]) => new T.Vector2(r, y))).getPoints(30), 36);
  const p = g.attributes.position; for (let i=0;i<p.count;i++){ const x = p.getX(i), z = p.getZ(i), y = p.getY(i); if (y > 0) continue; const k = 1 + Math.sin(Math.atan2(x, z)*6)*.07*Math.min(1, -y/1.5); p.setX(i, x*k); p.setZ(i, z*k); p.setY(i, y - Math.max(0, x)/6*.6*Math.min(1, -y)); }
  g.computeVertexNormals(); return g; })();
const hm = (geo, c, o = {}) => mesh(geo, c, {...SM, ...o}); // helmets are smooth too
function cheeks(parent, y){ for (const sg of [1, -1]){ const ch = hm(cheekGeo, 'bronze'); ch.scale.set(.9, 1.25, .45); ch.position.set(1.1, y - 1.2, sg*2.75); parent.add(ch); } }
function helmetOn(parent, y, kind){
  if (kind === 'pirate'){ const cap = hm(pilosGeo, '#2e2522'); cap.position.y = y - .3; parent.add(cap);
    const band = hm(bandGeo, '#9b2c26'); band.rotation.x = Math.PI/2; band.position.y = y + .2; parent.add(band); return; }
  if (kind === 'petasos'){ const brim = hm(brimGeo, '#d9b56a'); brim.position.y = y + 1.9; parent.add(brim);
    const crown = hm(capGeo, '#c9a055'); crown.scale.set(.82, .7, .82); crown.position.y = y + 1.8; parent.add(crown);
    const band = hm(rimGeo, '#8a5530'); band.scale.setScalar(.78); band.rotation.x = Math.PI/2; band.position.y = y + 2.3; parent.add(band); return; }
  if (kind === 'laurel'){ for (let i=0;i<14;i++){ const a = i/14*Math.PI*2; if (Math.cos(a) > .8) continue; // open at the front
      const l = hm(leafGeo, '#d9b13f'); l.scale.set(1.1, .5, .6); l.position.set(Math.cos(a)*3.15, y + 1.3 + Math.sin(i*2.1)*.15, Math.sin(a)*3.15); l.rotation.y = -a; l.rotation.z = (i % 2 ? .5 : -.5); parent.add(l); }
    return; }
  if (kind === 'spartan'){ const c = hm(coneGeo, 'bronze'); c.position.y = y - .2; parent.add(c);
    const r = hm(rimGeo, '#8a6330'); r.rotation.x = Math.PI/2; r.position.y = y; parent.add(r); return; }
  if (kind === 'boeotian'){ const hb = hm(boeoGeo, 'bronze', {side:T.DoubleSide}); hb.position.y = y + .1; parent.add(hb);
    const r = hm(rimGeo, '#d4a24c'); r.scale.set(1.06, 1.06, 1.4); r.rotation.x = Math.PI/2; r.position.y = y + .5; parent.add(r); return; }
  if (kind === 'phrygian'){ // a bronze cap that rises and curls forward, a gold band and knob, big cheek guards
    const top = hm(phryGeo, 'bronze', {side:T.DoubleSide}); top.position.y = y; parent.add(top);
    const knob = hm(cheekGeo, '#d4a24c'); knob.scale.setScalar(.5); knob.position.set(4.8, y + 3.7, 0); parent.add(knob);
    const band = hm(rimGeo, '#d4a24c'); band.scale.set(1.02, 1.02, 1.3); band.rotation.x = Math.PI/2; band.position.set(-.3, y - .3, 0); parent.add(band);
    for (const sg of [1, -1]){ const ch = hm(cheekGeo, 'bronze'); ch.scale.set(1.1, 1.45, .4); ch.position.set(1.2, y - 1.4, sg*2.95); ch.rotation.x = -sg*.15; parent.add(ch); }
    return; }
  const dome = hm(helmGeo, 'bronze'); dome.position.y = y + .25; parent.add(dome);
  cheeks(parent, y);
  const neck = hm(cheekGeo, 'bronze'); neck.scale.set(.5, .9, 1.6); neck.position.set(-2.6, y - .9, 0); parent.add(neck);
  const capt = kind === 'captain';
  const st = hm(standGeo, 'bronze'); st.position.y = y + 3.6; parent.add(st);
  const cr = hm(crestGeo, capt ? '#f1e6c8' : kind === 'attic' ? '#2f5f8a' : 'plume'); cr.scale.set(capt ? 1.2 : 1.05, capt ? 1.45 : 1, capt ? 1.3 : .9); cr.position.y = y + 2.6;
  if (capt){ cr.rotation.y = Math.PI/2; const rim = hm(crestGeo, 'plume'); rim.scale.set(1.32, 1.58, .35); /* much thinner than the white crest, so their faces are well apart */ rim.rotation.y = Math.PI/2; rim.position.set(.1, y + 2.5, 0); parent.add(rim); }
  if (kind === 'attic') for (const sg of [1, -1]){ const f = hm(featherGeo, '#f4efe2'); f.position.set(-.2, y + 4.6, sg*2.9); f.rotation.x = -sg*.25; parent.add(f); }
  parent.add(cr);
}
// The hair has a shape of its own: fuller on top and at the back, a wavy fringe in front with a few soft locks, and it
// comes lower over the ears and the back of the neck. (Hats sit over the plain cap below.)
const hairGeo = (() => { const g = new T.SphereGeometry(1, 48, 32), p = g.attributes.position, v = new T.Vector3();
  const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a)/(b - a))); return t*t*(3 - 2*t); };
  for (let i=0;i<p.count;i++){ v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), fr = Math.cos(a), lat = Math.acos(Math.max(-1, Math.min(1, v.y)))/Math.PI; // 0 top, 1 bottom
    // the hairline: high over the forehead with soft locks (bangs), lower over the ears, lowest at the back of the neck
    const hem = fr > 0 ? .34 + .1*(1 - fr) + .035*Math.cos(a*9) : .56 - .06*fr;
    // a solid round mass: thick hair down to the hairline, then it tucks into the head (hidden) with a rounded edge
    const k = sst(hem + .07, hem - .02, lat);
    const r = 2.5 + k*(.92 + .28*Math.pow(1 - lat, 2) + .05*Math.sin(a*5 + lat*8)); // fuller at the crown, gentle waves
    v.multiplyScalar(r); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g; })();
// fine strands drawn on the hair, from the crown down (you liked the look of hair when the shadows striped them)
let hairT = null;
function hairTex(){ if (hairT) return hairT; const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 32);
  for (let i=0;i<64;i++){ const x = i*2 + (i % 3)*.6; g.fillStyle = i % 2 ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.18)'; g.fillRect(x, 0, 1, 32); }
  hairT = new T.CanvasTexture(c); hairT.wrapS = T.RepeatWrapping; return hairT; }
// a big round head (no eyes, by choice), hair or a helmet; y = the head's center. helmet: false, true (hoplite) or a kind above.
export function cuteHead(parent, y, hairColor = 'hair', helmet = false){ const n0 = parent.children.length;
  const head = mesh(headGeo, 'skin', SM); head.position.y = y; parent.add(head);
  const kind = helmet === true ? 'hoplite' : helmet;
  if (!kind){ const hair = mesh(hairGeo, hairColor, SM); hair.position.set(-.15, y + .05, 0); hair.rotation.z = .1; parent.add(hair); }
  else if (HATS.includes(kind)){ const hair = mesh(capGeo, hairColor, {...SM, map:hairTex()}); hair.position.set(-.35, y + .45, 0); hair.rotation.z = .3; parent.add(hair); }
  if (kind) helmetOn(parent, y, kind);
  parent.children.slice(n0).forEach(m => { m.receiveShadow = false; m.userData.ns = true; }); // no shadow blotches sliding over heads and helmets as people move
}
// A crew member: a round peg figure like the townspeople, a body and a head with no arms or legs. About 13 units tall. Faces +x.
// pose: 'row' (seated lower, rocks with the stroke), 'stand', 'helm', 'archer' (a bow at their side, leans in to shoot).
export function person(tunic, pose = 'stand', helmet = false){
  const g = new T.Group(), inner = new T.Group(); g.add(inner);
  const sit = pose === 'row', base = sit ? 1.6 : .3, h = sit ? 5.2 : 6.6; // standing people stand right on the deck
  const body = mesh(beanGeo(h), tunic, SM); body.receiveShadow = false; body.userData.ns = true; body.position.y = base; body.scale.set(.85, 1, .85); inner.add(body);
  cuteHead(inner, base + h + 2.1, 'hair', helmet);
  if (pose === 'archer'){ const bow = mesh(new T.TorusGeometry(4.6, .35, 4, 10, Math.PI*.8), 'bow'); bow.rotation.set(0, 0, Math.PI*.6); bow.position.set(3.4, base + 4.5, 0); inner.add(bow); }
  g.userData = {inner, pose};
  return g;
}
function oars(s, info, col){
  const g = new T.Group(), list = [], n = s.oarCount, rows = s.oarRows;
  for (let r=0;r<rows;r++) for (let i=0;i<n;i++){
    const x = n === 1 ? 0 : (-.32 + .64*i/(n-1))*s.L + (r % 2)*s.L*.018;
    for (const sg of [1, -1]){
      const a = Math.abs(x/(s.L/2)), out = info.W(a) + (s.outrigger && r === 0 ? 5 : .4);
      const piv = new T.Group(); piv.position.set(x, info.deckLevel + s.H*.14 - r*s.H*.16, sg*out);
      const len = 22 + r*6 + (n === 1 ? -4 : 0);
      const shaft = mesh(new T.CylinderGeometry(.7, .8, len, 5), col); shaft.rotation.x = Math.PI/2; shaft.position.z = sg*len/2; piv.add(shaft);
      const blade = mesh(new T.BoxGeometry(4.4, .8, 7), col); blade.position.z = sg*(len - 2.5); piv.add(blade);
      piv.rotation.x = sg*(.55 + r*.07);
      g.add(piv); list.push({piv, sg, ph:i*.12 + r*.4, x, r, i});
      if (r > 0){ const hole = mesh(new T.CircleGeometry(1.6, 8), '#1c1712', {side:T.DoubleSide}); hole.position.set(x, piv.position.y, sg*(info.W(a) + .15)); hole.rotation.y = Math.PI/2; hole.castShadow = false; g.add(hole); }
    }
  }
  g.userData.list = list; return g;
}
function fan(x, y, dir, color){
  const g = new T.Group(); g.position.set(x, y, 0);
  const post = mesh(new T.CylinderGeometry(1.4, 2, 9, 6), color); post.position.y = 3; post.rotation.z = dir*.3; g.add(post);
  for (let k=0;k<5;k++){ const leaf = mesh(new T.BoxGeometry(2.6, 14, 1.4), color); leaf.position.set(0, 7, 0);
    const p = new T.Group(); p.position.y = 5; p.add(leaf); p.rotation.z = dir*(.1 + k*.27); p.rotation.x = (k-2)*.13; g.add(p); }
  return g;
}
function steeringOars(s, info){
  const g = new T.Group();
  for (const sg of [1, -1]){ const w = info.W(.8);
    const p = new T.Group(); p.position.set(-s.L*.4, info.deckY(.8) - 1, sg*(w + .5));
    const shaft = mesh(new T.CylinderGeometry(.8, .9, s.H*1.6, 5), 'steer'); shaft.position.y = -s.H*.6; p.add(shaft);
    const blade = mesh(new T.BoxGeometry(5, s.H*.6, 1), 'steer'); blade.position.y = -s.H*1.35; p.add(blade);
    p.rotation.z = .5; p.rotation.x = sg*.25; g.add(p); }
  return g;
}
// color/k: the player's upgraded ram (wood, bronze or gold; k grows it a little with each level)
function ram(s, color = 'bronze', k = 1){
  const g = new T.Group(), len = s.L*(s.bigRam ? .21 : .18)*k, h = Math.max(4, s.H*(s.bigRam ? .34 : .26))*k;
  const body = mesh(new T.BoxGeometry(len, h, s.B*.16), color); body.position.x = len/2; g.add(body);
  const tip = mesh(new T.ConeGeometry(h*.62, len*.45, 4), color); tip.rotation.z = -Math.PI/2; tip.rotation.x = Math.PI/4; tip.position.x = len*1.2; g.add(tip);
  for (const dy of [-.28, 0, .28]){ const fin = mesh(new T.BoxGeometry(len*.8, h*.12, s.B*.3), color); fin.position.set(len*.55, dy*h, 0); g.add(fin); }
  g.position.set(s.L*.38, keelAt(s, .76) + h*.45, 0); return g;
}
// The pirate ram: a bronze boar's head, like the "samaina" ships of Polycrates, the pirate king of Samos.
function boarRam(s){
  const g = new T.Group(), k = Math.max(.55, s.H/16), c = '#6d4a2a';
  const neck = mesh(new T.CylinderGeometry(2.6*k, 3.8*k, 16*k, 8), c); neck.rotation.z = -Math.PI/2; neck.position.x = 0; g.add(neck);
  const head = mesh(new T.SphereGeometry(4*k, 10, 8), c); head.scale.set(1.35, .95, .9); head.position.x = 9*k; g.add(head);
  const snout = mesh(new T.CylinderGeometry(2.2*k, 3*k, 6*k, 8), c); snout.rotation.z = -Math.PI/2; snout.position.set(14*k, -.6*k, 0); g.add(snout);
  const nose = mesh(new T.CylinderGeometry(2.3*k, 2.3*k, .8*k, 10), '#3e2a1a'); nose.rotation.z = -Math.PI/2; nose.position.set(17.2*k, -.6*k, 0); g.add(nose);
  for (const sg of [1, -1]){
    const tusk = mesh(new T.ConeGeometry(.7*k, 4.6*k, 5), '#efe4c8'); tusk.position.set(14.5*k, .6*k, sg*2.6*k); tusk.rotation.set(sg*.5, 0, -.5); g.add(tusk);
    const ear = mesh(new T.ConeGeometry(1.4*k, 3.4*k, 4), c); ear.position.set(7*k, 3.8*k, sg*2.2*k); ear.rotation.set(sg*.5, 0, .5); g.add(ear);
    const eye = mesh(new T.SphereGeometry(.8*k, 6, 5), '#c8402f'); eye.position.set(11*k, 1.6*k, sg*2.9*k); g.add(eye);
  }
  g.position.set(s.L*.46 - 4*k, keelAt(s, .8) + s.H*.38, 0); return g;
}
function flagOn(god, x, y){
  const geo = new T.PlaneGeometry(16, 10, 8, 2); geo.translate(-8, 0, 0);
  const m = new T.Mesh(geo, mat('#ffffff', {map:flagTex(god), side:T.DoubleSide, transparent:true, alphaTest:.5})); m.castShadow = true;
  m.position.set(x, y, 0); m.userData.flagBase = geo.attributes.position.array.slice(); return m;
}
const amphora = new T.LatheGeometry([[0,0],[2.5,.8],[4,3.5],[4.4,7],[3.2,10.5],[1.6,12],[1.6,14.5],[2.6,15.3]].map(([x, y]) => new T.Vector2(x, y)), 14);

// How big each sail is for a sail upgrade level (undefined = the ship as built). Levels 1-5 grow the main sail; level 6
// puts up a foresail that grows to 10; 11 a topsail (to 15); 16 a mizzen at the stern (to 20). A boat without a mast
// (the rowboat) gets its little sail at level 1. Returns sizes for [main, fore, top, mizzen]; 0 = that sail isn't up.
export function sailSizes(s, lv){
  if (lv === undefined) return [s.mast ? 1 : 0, 0, 0, 0];
  lv = Math.min(lv, s.sailMax || 0);
  if (!s.mast) return [lv > 0 ? .75 + .0625*(lv - 1) : 0, 0, 0, 0];
  const grow = (from, base, len) => lv < from ? 0 : base*(1 + .06*Math.min(lv - from, len));
  return [grow(0, 1, 5), grow(6, .5, 4), grow(11, 1, 4), grow(16, .42, 4)];
}
function squareSail(w, h, tex){
  const geo = new T.PlaneGeometry(w, h, 10, 6); geo.translate(0, -h/2, 0); geo.rotateY(Math.PI/2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i=0;i<pos.count;i++){ const u = uv.getX(i), v = 1 - uv.getY(i); pos.setX(i, Math.sin(Math.PI*u)*Math.sin(Math.PI*(v*.85 + .1))*w*.16); pos.setZ(i, pos.getZ(i)*(1 + v*.1)); }
  geo.computeVertexNormals();
  const m = new T.Mesh(geo, mat('#ffffff', {map:tex, side:T.DoubleSide})); m.castShadow = true; return m;
}
// A torch on a pole: a bronze bowl and a flickering flame. The flame is marked glow, so the showroom's bloom makes it shine.
const flameGeo = new T.ConeGeometry(2, 6, 7), coreGeo = new T.ConeGeometry(1.1, 3.6, 6), bowlGeo = new T.CylinderGeometry(2.4, 1.2, 2.2, 8);
const flameMat = new T.MeshBasicMaterial({color:'#ff9a3c'}), coreMat = new T.MeshBasicMaterial({color:'#fff2b8'});
let torchN = 0;
// Everything with torches or fire bowls, so the day and night cycle can light them (daynight.js).
export const TORCH_ROOTS = new Set();
function torch(){
  const g = new T.Group();
  const pole = mesh(new T.CylinderGeometry(.5, .6, 12, 5), 'mast'); pole.position.y = 6; g.add(pole);
  const bowl = mesh(bowlGeo, 'bronze'); bowl.position.y = 12.6; g.add(bowl);
  const flame = new T.Group(); flame.position.y = 13.4; g.add(flame);
  const f = new T.Mesh(flameGeo, flameMat); f.position.y = 3; f.userData.glow = true; flame.add(f);
  const c = new T.Mesh(coreGeo, coreMat); c.position.y = 2; c.userData.glow = true; flame.add(c);
  g.userData.flame = flame; g.userData.ph = torchN++ % 97; return g;
}
// Light or put out a ship's torches. light = also give each one a real point light (pretty, but costly on phones).
export function setTorches(root, on, light = false){
  for (const t of root.userData.torches || []){ t.visible = on;
    if (on && light && !t.userData.light){ const b = t.userData.lb || 1.2, l = new T.PointLight('#ff9c48', b, 150, 2); l.userData.base = b; l.position.y = t.userData.ly || 17; t.add(l); t.userData.light = l; }
    if (t.userData.light) t.userData.light.visible = on && light; }
}

// Torch and fire bowl flames dance and their lights flicker (ships, and the fire bowls around statues).
export function flicker(root, t){
  for (const tc of root.userData.torches || []) if (tc.visible){ const f = tc.userData.flame, k = 1 + Math.sin(t*13 + tc.userData.ph)*.08 + Math.sin(t*23 + tc.userData.ph*2)*.06;
    f.scale.set(1/k, k, 1/k); f.rotation.y = t*2; if (tc.userData.light) tc.userData.light.intensity = tc.userData.light.userData.base*(.85 + .15*k); }
}
// Who is aboard a ship with m men (the player's ships, P49): a helmsman, archers and rowers, one rower per oar.
// The rowboat: you row, and a second hand sits at the stern. Sail boats: everyone works the deck.
// Warships: about one in three becomes an archer until the bows are all taken, the rest fill the benches.
export function crewLayout(s, m){
  const count = kind => (s.crew || []).filter(c => c[0] === kind).reduce((a, c) => a + c[1], 0), A = count('archer'), O = s.oarRows ? s.oarCount : 0;
  if (O === 1) return {stand:Math.max(0, m - 1), archers:0, rowers:1, pairs:1};
  if (!O) return {stand:m, archers:0, rowers:0, pairs:0};
  const helm = count('stand') ? Math.min(1, m) : 0, rest = m - helm;
  let a = Math.min(A, Math.ceil(rest/3)); const r = Math.min(2*O, rest - a); a = Math.min(A, rest - r);
  return {stand:helm, archers:a, rowers:r, pairs:Math.ceil(r/2)};
}
// Build a ship. look = {paint, sail, flag, helm (the archers' helmet), sailLv (the player's sail upgrades), men (crew size; all benches full if not given)}; crew = show the crew.
export function buildShip(key, look = {}, crew = true){
  const s = SPECS[key], lk = {...s.look, ...look}, root = new T.Group(), body = new T.Group(); root.add(body);
  const h = hull(s, lk.paint), info = h.userData; body.add(h);
  const pc = PAINTS[lk.paint] || PAINTS.gold;
  root.userData = {oars:[], flags:[], spec:s, body};
  const lay = lk.men != null ? crewLayout(s, lk.men) : null;
  if (s.oarRows){ const o = oars(s, info, s.raider ? 'rOar' : 'oar'); body.add(o); root.userData.oars = o.userData.list;
    // a short crew mans only some of the benches, spread along the ship; the other oars are shipped (not shown)
    if (lay && s.oarCount > 1 && lay.pairs < s.oarCount){ const keep = new Set(Array.from({length:lay.pairs}, (_, k) => Math.round((k + .5)*s.oarCount/lay.pairs - .5)));
      root.userData.oars = o.userData.list.filter(q => { const on = keep.has(q.i); q.piv.visible = on; return on; }); } }
  if (s.oarCount !== 1) body.add(steeringOars(s, info)); // the rowboat steers with its oars
  if (s.outrigger) for (const sg of [1, -1]){ const box = mesh(new T.BoxGeometry(s.L*.62, s.H*.2, 5), pc.top); box.position.set(-s.L*.02, info.deckLevel + s.H*.2, sg*(info.W(.3) + 2.5)); body.add(box);
    const lip = mesh(new T.BoxGeometry(s.L*.63, 1.2, 6), pc.wale); lip.position.set(-s.L*.02, info.deckLevel + s.H*.31, sg*(info.W(.3) + 2.5)); body.add(lip); }
  // Sails: the ship's own, or as many as the player's sail upgrades have put up (lk.sailLv). sz[i] = size of sail i, 0 = not up.
  const sz = sailSizes(s, lk.sailLv), sailKey = lk.sail || 'plain';
  root.userData.sails = [];
  if (sz[0]){
    // the rig; on a boat built without a mast (the rowboat) it stands forward of the rower
    const mx = s.mast ? 0 : s.L*.22, rig = new T.Group(); rig.position.x = mx; body.add(rig);
    const mw = s.sailW*sz[0], mh = s.sailH*sz[0], extra = sz[2] ? s.sailH*.42*sz[2] : 0; // a topsail needs a taller mast
    const top = info.deckLevel + mh + 16, mtop = top + extra;
    const mast = mesh(new T.CylinderGeometry(1.6, 2.4, mtop - info.deckLevel + 6, 7), 'mast'); mast.position.set(0, (mtop + info.deckLevel)/2 + 3, 0); rig.add(mast);
    const yard = mesh(new T.CylinderGeometry(1.2, 1.2, mw + 14, 6), 'mast'); yard.rotation.x = Math.PI/2; yard.position.set(1.8, top, 0); rig.add(yard);
    const fin = mesh(new T.ConeGeometry(2.2, 7, 6), pc.panel); fin.position.set(0, mtop + 9.5, 0); rig.add(fin);
    if (lk.sail || !s.mast){
      const sl = squareSail(mw, mh, sailTex(sailKey, lk.flag)); sl.position.set(3, top - 1.2, 0); rig.add(sl); root.userData.sail = sl; root.userData.sails.push(sl);
      const bow = [s.L/2 - 2 - mx, info.deckY(1) - 2, 0], stern = [-s.L/2 + 2 - mx, info.deckY(1) - 2, 0];
      const pts = [[1.8, mtop, mw/2 + 6], bow, [1.8, mtop, -mw/2 - 6], stern, [0, mtop + 4, 0], bow, [0, mtop + 4, 0], stern,
        [1.8, top, mw/2], [0, info.deckLevel + 1, info.W(mx/(s.L/2))], [1.8, top, -mw/2], [0, info.deckLevel + 1, -info.W(mx/(s.L/2))]].flat();
      const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      rig.add(new T.LineSegments(lg, new T.LineBasicMaterial({color:P.rope})));
      // the foresail (artemon): a small sail on a mast leaning out over the bow
      if (sz[1]){ const fw = s.sailW*sz[1], fh = s.sailH*sz[1], fm = new T.Group(); fm.position.set(s.L*.33, info.deckY(.66) - 1, 0); fm.rotation.z = -.42; rig.add(fm);
        const m2 = mesh(new T.CylinderGeometry(1, 1.5, fh + 14, 6), 'mast'); m2.position.y = (fh + 14)/2; fm.add(m2);
        const y2 = mesh(new T.CylinderGeometry(.8, .8, fw + 8, 6), 'mast'); y2.rotation.x = Math.PI/2; y2.position.set(1.2, fh + 11, 0); fm.add(y2);
        const s2 = squareSail(fw, fh, sailTex(sailKey, 'none')); s2.position.set(2.2, fh + 10, 0); fm.add(s2); root.userData.sails.push(s2); }
      // the topsail: a triangle above the main yard
      if (sz[2]){ const tw = mw*.7, th = s.sailH*.42*sz[2], tg = new T.BufferGeometry();
        tg.setAttribute('position', new T.Float32BufferAttribute([0, 0, -tw/2, 0, 0, tw/2, 0, th, 0], 3)); tg.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, .5, 1], 2)); tg.computeVertexNormals();
        const s3 = new T.Mesh(tg, mat('#ffffff', {map:sailTex(sailKey, 'none'), side:T.DoubleSide})); s3.castShadow = true; s3.position.set(2.6, top + 1, 0); rig.add(s3); root.userData.sails.push(s3); }
      // the mizzen: a small sail near the stern
      if (sz[3]){ const zw = s.sailW*sz[3], zh = s.sailH*sz[3], zx = -s.L*.4;
        const m4 = mesh(new T.CylinderGeometry(1, 1.4, zh + 16, 6), 'mast'); m4.position.set(zx, info.deckY(.8) + (zh + 16)/2 - 2, 0); rig.add(m4);
        const y4 = mesh(new T.CylinderGeometry(.8, .8, zw + 8, 6), 'mast'); y4.rotation.x = Math.PI/2; y4.position.set(zx + 1.2, info.deckY(.8) + zh + 11, 0); rig.add(y4);
        const s4 = squareSail(zw, zh, sailTex(sailKey, 'none')); s4.position.set(zx + 2.2, info.deckY(.8) + zh + 10, 0); rig.add(s4); root.userData.sails.push(s4); }
    }
    if (lk.flag && lk.flag !== 'none'){ const f = flagOn(lk.flag, -1, mtop + 18); rig.add(f); root.userData.flags.push(f);
      const pole = mesh(new T.CylinderGeometry(.5, .5, 12, 5), 'mast'); pole.position.set(0, mtop + 16, 0); rig.add(pole); }
  } else if (lk.flag && lk.flag !== 'none'){
    const pole = mesh(new T.CylinderGeometry(.5, .6, 22, 5), 'mast'); pole.position.set(-s.L*.42, info.deckY(.84) + 10, 0); body.add(pole);
    const f = flagOn(lk.flag, -s.L*.42, info.deckY(.84) + 17); f.scale.setScalar(.75); body.add(f); root.userData.flags.push(f);
  }
  // Torches for the night: one at the stern and one at the bow, and a pair at the rails on big ships. Hidden in daylight (setTorches).
  root.userData.torches = [];
  const torchAt = [[-s.L*.43, info.deckY(.86) - 1, 0], [s.L*.39, info.deckY(.78) - 1, 0]];
  if (s.L >= 100) for (const sg of [1, -1]) torchAt.push([-s.L*.12, info.deckY(.24), sg*info.W(.24)*.95]);
  for (const [x, y, z] of torchAt){ const t = torch(); t.scale.setScalar(.65); t.position.set(x, y, z); t.visible = false; body.add(t); root.userData.torches.push(t); }
  // The player's ship shows its upgrades: the ram it has bought (not the built-in one) and extra planking along the sides.
  if (lk.ram !== undefined){ if (lk.ram > 0){ const m = Math.min(2, Math.floor((lk.ram - 1)/10)), sub = lk.ram - m*10; body.add(ram(s, ['#8a5a30', '#b07f3c', '#e3b341'][m], .8 + sub*.03 + m*.1)); } }
  else if (s.raider && s.ram) body.add(boarRam(s));
  else if (s.ram) body.add(ram(s));
  if (lk.plate > 0){ const c = lk.plate >= 10 ? '#e3b341' : lk.plate >= 5 ? '#b07f3c' : '#7a5230', n = 6;
    for (let i=0;i<n;i++) for (const sg of [1, -1]){ const f = -.34 + i*.68/(n - 1), x = f*s.L, w = info.W(Math.abs(f*2));
      const b = mesh(new T.BoxGeometry(s.L*.68/n + 1, s.H*.2, 1.4), c); b.position.set(x, s.H*.28, sg*(w + .5)); b.rotation.y = -sg*f*.35; body.add(b); } }
  const ornament = lk.paint === 'raider' ? '#271b1b' : 'fan';
  if (s.fans) body.add(fan(-s.L/2 + 1.5, info.deckY(1) - 3, 1, ornament));
  if (s.bowFans) body.add(fan(s.L/2 - 1.5, info.deckY(1) - 3, -1, ornament));
  if (s.eyes) for (const sg of [1, -1]){
    const x = s.L*.36, w = info.W(.72);
    const e = mesh(new T.CircleGeometry(2.8, 14), 'white', {side:T.DoubleSide}); e.position.set(x, s.H*.15 + s.rise*.12, sg*(w + .6)); e.rotation.y = sg > 0 ? .45 : Math.PI - .45; body.add(e);
    const pu = mesh(new T.CircleGeometry(1.4, 10), s.raider ? '#b8322a' : '#1c1c22', {side:T.DoubleSide}); pu.position.copy(e.position); pu.position.z += sg*.2; pu.position.x += .6; pu.rotation.y = e.rotation.y; body.add(pu);
  }
  if (s.nets){ const n = mesh(new T.DodecahedronGeometry(6, 0), 'net'); n.scale.set(1.3, .5, 1); n.position.set(-s.L*.3, info.deckLevel + 2, 0); body.add(n); }
  if (s.cargo){ for (let i=0;i<8;i++){ const a = mesh(amphora, '#b06a3d', {flatShading:false}); a.position.set(-8 + (i % 4)*8, info.deckLevel, -7 + Math.floor(i/4)*12); body.add(a); }
    const crate = mesh(new T.BoxGeometry(14, 9, 12), '#9b6b3a'); crate.position.set(s.crateX != null ? s.crateX*s.L : 24, info.deckLevel + 4.5, 0); body.add(crate); }
  if (s.cabin){ const cab = mesh(new T.BoxGeometry(18, 11, s.B*.5), pc.inner); cab.position.set(-s.L*.3, info.deckLevel + 5.5, 0); body.add(cab);
    const roof = mesh(new T.BoxGeometry(20, 1.5, s.B*.56), pc.panel); roof.position.set(-s.L*.3, info.deckLevel + 11.5, 0); body.add(roof); }
  if (s.canopy){ const roof = mesh(new T.BoxGeometry(s.L*.18, 1.2, s.B*.62), pc.panel); roof.position.set(-s.L*.3, info.deckLevel + 22, 0); body.add(roof); // tall enough for the captain's crest
    for (const x of [-.22, -.38]) for (const sg of [1, -1]){ const post = mesh(new T.CylinderGeometry(.6, .6, 22, 5), 'mast'); post.position.set(x*s.L, info.deckLevel + 11, sg*s.B*.28); body.add(post); } }
  root.userData.crew = [];
  if (crew && s.crew){
    const tunics = s.raider ? ['rTunic', 'rTunic', '#2c1f1f'] : ['tunic1', 'tunic2', 'tunic3'];
    const add = (p, x, y, z, ph = 0) => { p.position.set(x, y, z); body.add(p); root.userData.crew.push({p, ph}); };
    // One rower per top-row oar, sitting facing the stern as real oarsmen did, pulling in time with that oar.
    let seated = 0;
    root.userData.oars.filter(o => o.r === 0).forEach((o, i) => {
      if (s.oarCount === 1 && o.sg < 0) return; // the rowboat: one rower works both oars
      if (lay && seated >= lay.rowers) return; seated++;
      const p = person(tunics[i % 3], 'row'); p.rotation.y = Math.PI; p.traverse(m => m.castShadow = false);
      add(p, o.x, info.deckLevel, s.oarCount === 1 ? 0 : o.sg*info.W(Math.abs(o.x/(s.L/2)))*.5, o.ph);
    });
    for (const [kind, n] of lay ? [['stand', lay.stand], ['archer', lay.archers]].filter(c => c[1]) : s.crew){
      if (kind === 'archer'){
        // On long oared warships the archers stand on a gangway down the middle, clear of the rowers on both sides
        // (and of the mast); on small boats they stand at the rails. Half face each side.
        const mid = s.oarCount >= 9, gy = info.deckLevel + (mid ? 1.2 : 0);
        if (mid && n){ const walk = mesh(new T.BoxGeometry(s.L*.62, 1.2, 6), pc.deck); walk.position.set(0, gy - .6, 0); body.add(walk); }
        for (let i=0;i<n;i++){
          const sg = i % 2 ? 1 : -1;
          const x = mid ? (n === 1 ? .1 : -.27 + .54*i/(n - 1))*s.L : (-.2 + .45*Math.floor(i/2)/Math.max(1, Math.ceil(n/2) - 1))*s.L;
          const p = person(tunics[(i+1) % 3], 'archer', s.raider ? 'pirate' : lk.helm || 'hoplite'); p.rotation.y = -sg*Math.PI/2;
          add(p, x, gy, mid ? sg*1.4 : sg*info.W(Math.abs(x/(s.L/2)))*.62);
        }
      } else for (let i=0;i<n;i++){
        // First standing crew takes the helm at the stern; the rest work the deck.
        // crewAt (fractions of length and width) keeps them clear of cargo and cabins on ships that carry them
        const helm = i === 0, at = s.crewAt && s.crewAt[i], x = at ? at[0]*s.L : helm ? -s.L*.36 : [s.L*.18, -s.L*.05, s.L*.3][(i-1) % 3];
        const p = person(tunics[(i+1) % 3], helm ? 'helm' : 'stand', helm && (s.ram || s.raider) ? (s.raider ? 'pirate' : 'captain') : s.hats && i % 2 === 1 ? 'petasos' : false); if (i === 2) p.rotation.y = 1.2;
        add(p, x, info.deckLevel + (helm ? 1 : 0), at ? at[1]*s.B : i === 2 ? 4 : 0);
      }
    }
  }
  if (CEL.on) inkify(root);
  if (root.userData.torches.length) TORCH_ROOTS.add(root);
  return root;
}

// Oars row, sail breathes, flags flutter.
export function animateShip(root, t, speed){
  const row = Math.min(1, .25 + speed/60);
  root.userData.oars.forEach(o => { o.piv.rotation.y = o.sg*Math.sin(t*2.6 + o.ph)*.4*row; });
  // Rowers rock in time with the oars; archers lean in when the ship is fighting.
  for (const c of root.userData.crew || []){ const {inner, pose} = c.p.userData;
    if (pose === 'row') inner.rotation.z = Math.sin(t*2.6 + c.ph)*.25*row;                                  // rocking with the oar
    else if (pose === 'archer') inner.rotation.z = root.userData.firing ? -.18*(.5 + .5*Math.sin(t*5 + c.ph*9)) : 0; } // leaning in to shoot
  const fill = root.userData.windFill || 0; // the player's sail bellies out more with the wind behind it
  (root.userData.sails || []).forEach((sl, i) => { sl.scale.x = 1 + Math.min(.9, speed/80) + fill*.7 + Math.sin(t*(1.3 + fill*2) + i)*(.06 + fill*.04); });
  flicker(root, t);
  root.userData.flags.forEach(f => { const p = f.geometry.attributes.position, b = f.userData.flagBase;
    for (let i=0;i<p.count;i++){ const x = b[i*3]; p.setZ(i, Math.sin(x*.5 + t*6)*(-x)*.06); } p.needsUpdate = true; });
}

// ---------- statues ----------
// Statues are smooth: one turned body with soft folds in the robe, rounded arms, a round head, with soft shading
// (a little shine on bronze) instead of the flat facets of boats and houses. Fire bowls stand at the corners and burn at night.
const smats = {};
const smat = (c, shine = 10) => smats[c + shine] || (smats[c + shine] = new T.MeshPhongMaterial({color:c === 'vc' ? '#ffffff' : P[c] || c, vertexColors:c === 'vc', shininess:shine, specular:new T.Color(shine > 20 ? '#6a5030' : '#262626')}));
function sm(geo, c, shine){ const m = new T.Mesh(geo, smat(c, shine)); m.castShadow = m.receiveShadow = true; return m; }
const sphere = (r, c, shine, sx = 1, sy = 1, sz = 1) => { const m = sm(new T.SphereGeometry(r, 40, 28), c, shine); m.scale.set(sx, sy, sz); return m; };
// the body from the hem of the robe to the neck, turned on a lathe; colorAt(x, y, z) paints it (robe, bare skin, a drape)
function statueBody(colorAt, shine){
  const prof = new T.SplineCurve([[11.5, 0], [10.6, 3], [9.2, 10], [8.2, 18], [7.4, 26], [7.3, 30], [8.1, 35], [8.8, 39], [8.7, 42], [7.6, 45], [5, 47], [3, 48.4], [2.7, 51]].map(([r, y]) => new T.Vector2(r, y))).getPoints(64);
  const geo = new T.LatheGeometry(prof, 44), pos = geo.attributes.position, col = new Float32Array(pos.count*3);
  for (let i=0;i<pos.count;i++){ const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(x, z);
    const fold = 1 + Math.sin(a*9)*.045*Math.max(0, 1 - y/30); // soft folds, deepest at the hem
    pos.setX(i, x*fold*.8); pos.setZ(i, z*fold); }
  for (let i=0;i<pos.count;i++){ const c = colorAt(pos.getX(i), pos.getY(i), pos.getZ(i)); col.set([c.r, c.g, c.b], i*3); }
  geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.computeVertexNormals();
  return sm(geo, 'vc', shine);
}
// a fire bowl on three bronze legs; returns the stand and its flame (the flame is what lights at night)
const bowlLathe = new T.LatheGeometry([[0, 0], [1.6, .2], [3.4, 1.4], [4.2, 3], [4.4, 3.4], [3.9, 3.5]].map(([x, y]) => new T.Vector2(x, y)), 20);
function brazier(){
  const g = new T.Group();
  for (let k=0;k<3;k++){ const a = k/3*Math.PI*2, leg = sm(taper([[Math.cos(a)*3.2, 0, Math.sin(a)*3.2], [Math.cos(a)*1.6, 6, Math.sin(a)*1.6], [Math.cos(a)*2.2, 11, Math.sin(a)*2.2]], () => .45, 10, 6), 'bronze', 40); g.add(leg); }
  const bowl = sm(bowlLathe, 'bronze', 40); bowl.position.y = 10.6; g.add(bowl);
  const flame = new T.Group(); flame.position.y = 13.4; flame.visible = false; g.add(flame);
  const f = new T.Mesh(flameGeo, flameMat); f.position.y = 2.6; f.scale.setScalar(1.15); f.userData.glow = true; flame.add(f);
  const c = new T.Mesh(coreGeo, coreMat); c.position.y = 1.8; c.userData.glow = true; flame.add(c);
  flame.userData = {flame, ph:torchN++ % 97, ly:5, lb:.45};
  return {g, flame};
}
export function statue(god, stone = 'painted'){
  const g = new T.Group(), shine = stone === 'bronze' ? 45 : stone === 'marble' ? 14 : 8;
  const skinC = stone === 'bronze' ? '#a3733d' : '#efe9de';
  const robeC = stone === 'bronze' ? '#8f6332' : stone === 'painted' ? ({poseidon:'#41699f', zeus:'#5c3470', athena:'#71873f', apollo:'#cf9035', artemis:'#26473e'})[god] : '#e2dccf';
  const hairC = stone === 'painted' ? '#6b4a2a' : skinC, goldC = stone === 'marble' ? '#ddd5c4' : '#dcb453', trimC = stone === 'painted' ? '#e8c867' : robeC;
  // the pedestal: a step, a block with a molding top and bottom
  const stoneC = '#e2dbcb';
  [[48, 5, 2.5, '#d3cab6'], [40, 2.4, 6.2, stoneC], [35, 10, 12.4, stoneC], [40, 2.6, 18.7, '#ece6d8']].forEach(([w, h, y, c]) => { const b = mesh(new T.BoxGeometry(w, h, w), c); b.position.y = y; g.add(b); });
  const base = 20, bare = god === 'poseidon' || god === 'zeus', S = base + 0;
  const RC = new T.Color(robeC), SC = new T.Color(skinC), TC = new T.Color(trimC);
  // bare-chested gods wear the robe from the waist down, with a drape over the left shoulder
  const body = statueBody((x, y, z) => {
    if (y < 1.4 || (y > 28.6 && y < 30.2)) return TC; // a gold hem and belt
    return !bare || y < 29 ? RC : SC; }, shine);
  body.position.y = S; g.add(body);
  if (bare){ const drape = new T.CatmullRomCurve3([[0, 48, -8.2], [6, 42, -3.5], [6.6, 36, 2.5], [5, 31, 7.6], [0, 29.6, 9.4], [-5, 31, 7.6], [-6.6, 36, 2.5], [-6, 42, -3.5]].map(p => new T.Vector3(...p)), true);
    const d = sm(new T.TubeGeometry(drape, 60, 1.9, 12, true), robeC, shine); d.scale.set(.98, 1, 1); d.position.y = S; g.add(d); }
  if (god === 'poseidon'){ const wave = sm(taper([[4, 0, 12], [9, 4, 9], [11, 9, 4], [8, 12, 1], [5, 10, 2]], t => 2.6*(1 - t*.6), 24, 12), robeC, shine); wave.position.y = S; g.add(wave); }
  // the head: round, a small nose, hair, and a beard for Zeus and Poseidon
  const hy = S + 56;
  const neck = sm(new T.CylinderGeometry(2.6, 3, 5, 16), skinC, shine); neck.position.y = S + 51.5; g.add(neck);
  const head = sphere(5.4, skinC, shine, 1, 1.05, .96); head.position.y = hy; g.add(head);
  const nose = sphere(1, skinC, shine, .9, 1.5, .8); nose.position.set(5.2, hy - .5, 0); g.add(nose);
  const hair = sm(new T.SphereGeometry(5.75, 28, 14, 0, Math.PI*2, 0, Math.PI/2), hairC, shine); hair.position.set(-.5, hy + .2, 0); hair.rotation.z = .35; g.add(hair);
  if (god === 'artemis' || god === 'apollo'){ const bun = sphere(2.6, hairC, shine); bun.position.set(-5.2, hy + 1.5, 0); g.add(bun); }
  if (bare){ const beard = sphere(4, hairC, shine, .85, 1.25, 1.05); beard.position.set(2.8, hy - 4.6, 0); g.add(beard); }
  if (god === 'zeus' || god === 'apollo'){ const w = sm(new T.TorusGeometry(5.6, .85, 8, 36), god === 'apollo' && stone !== 'marble' ? '#7d9a48' : goldC, shine + 20); w.rotation.set(Math.PI/2, .18, 0); w.position.set(-.3, hy + 2.4, 0); g.add(w); }
  if (god === 'athena'){ // a smooth bronze helmet with a tall curved red crest
    const helm = sm(new T.SphereGeometry(6.1, 28, 14, 0, Math.PI*2, 0, Math.PI/1.85), stone === 'marble' ? skinC : '#c4a04c', 40); helm.position.set(-.3, hy + .4, 0); g.add(helm);
    const crest = sm(taper([[4.2, hy + 4.4, 0], [1, hy + 8.6, 0], [-3.5, hy + 8.4, 0], [-6.6, hy + 4.4, 0], [-7.2, hy + 1, 0]], t => .9 + Math.sin(Math.PI*Math.min(1, t*1.15))*1.6, 30, 12), stone === 'painted' ? '#bd4a37' : robeC, shine);
    crest.scale.z = .6; g.add(crest); }
  // arms: rounded tubes from the shoulder through the elbow to a round hand; sleeves for the robed gods
  const shL = [0, S + 43, -9.4], shR = [0, S + 43, 9.4];
  const arm = (sh, el, hand) => { g.add(sm(taper([sh, el, hand], t => 2.55 - .75*t + .2*Math.sin(t*Math.PI), 32, 20), skinC, shine));
    const top = sphere(2.9, bare && sh[2] > 0 ? skinC : robeC, shine, 1.15, .9, 1); top.position.set(sh[0], sh[1] - .4, sh[2]*.96); g.add(top);
    const f = sphere(1.85, skinC, shine, 1, 1.1, .9); f.position.set(...hand); g.add(f); };
  const staff = (x, z, top) => { const s = sm(new T.CylinderGeometry(.85, .85, top - S + 2, 12), goldC, shine + 25); s.position.set(x, (top + S)/2, z); g.add(s); return top; };
  if (god === 'poseidon'){
    arm(shR, [3, S + 38, 15], [3, S + 48, 15.5]); const top = staff(3, 15.5, S + 84);
    const bar = sm(taper([[3, top - 4, 9.5], [3, top - 6.5, 15.5], [3, top - 4, 21.5]], () => .8, 16, 8), goldC, shine + 25); g.add(bar);
    for (const dz of [-6, 0, 6]){ const pr = sm(new T.ConeGeometry(1.2, 9, 12), goldC, shine + 25); pr.position.set(3, top + (dz ? -.6 : 2), 15.5 + dz); g.add(pr); }
    arm(shL, [2, S + 34, -12], [5, S + 26, -10.5]);
  } else if (god === 'zeus'){
    arm(shR, [-3, S + 52, 14], [-5, S + 62, 12]);
    const shape = new T.Shape([[0,-11],[3.5,-1],[0,-1],[3,10],[-3.5,-2],[0,-2],[-2.5,-11]].map(([x, y]) => new T.Vector2(x, y)));
    const bolt = sm(new T.ExtrudeGeometry(shape, {depth:1.4, bevelEnabled:true, bevelThickness:.5, bevelSize:.5, bevelSegments:3}), goldC, shine + 25); bolt.position.set(-5.4, S + 64, 11.4); bolt.rotation.set(0, Math.PI/5, .5); g.add(bolt);
    arm(shL, [7, S + 38, -12], [14, S + 40, -8]);
  } else if (god === 'athena'){
    arm(shR, [3, S + 38, 15], [3, S + 48, 15.5]); const top = staff(3, 15.5, S + 86);
    const tip = sphere(1.6, goldC, shine + 25, .45, 3, 1); tip.position.set(3, top + 4, 15.5); g.add(tip);
    arm(shL, [3, S + 33, -12.5], [5, S + 26, -13.5]);
    const shield = sm(new T.LatheGeometry([[0, 2.2], [6, 1.9], [10.5, 1], [12.6, .5], [12.8, -.4], [11.4, -.6], [0, -.2]].map(([x, y]) => new T.Vector2(x, y)), 36), stone === 'painted' ? '#c4a04c' : goldC, 40);
    shield.rotation.x = -Math.PI/2; shield.position.set(5, S + 24, -16.5); g.add(shield);
    if (stone === 'painted'){ const owl = sm(new T.CircleGeometry(4, 24), '#bd4a37', 8); owl.position.set(5, S + 24, -18.75); owl.rotation.y = Math.PI; g.add(owl); }
  } else if (god === 'apollo'){
    const lyre = new T.Group(); lyre.position.set(10, S + 31, -4); lyre.rotation.x = .25; g.add(lyre);
    const box = sphere(4, goldC, shine + 25, .7, .55, 1); lyre.add(box);
    for (const sd of [-1, 1]) lyre.add(sm(taper([[0, 1, sd*2.4], [0, 7, sd*5], [0, 12, sd*4.2], [0, 14, sd*5.6]], t => .9 - t*.3, 16, 8), goldC, shine + 25));
    const bar = sm(new T.CylinderGeometry(.6, .6, 11, 10), goldC, shine + 25); bar.rotation.x = Math.PI/2; bar.position.y = 12.2; lyre.add(bar);
    for (const dz of [-1.6, 0, 1.6]){ const s = new T.Mesh(new T.CylinderGeometry(.12, .12, 10, 4), smat('#f4efe2')); s.position.set(.2, 7, dz); lyre.add(s); }
    arm(shL, [5, S + 33, -12], [9, S + 30, -6]);
    arm(shR, [6, S + 36, 13], [11, S + 34, 3]);
  } else if (god === 'artemis'){ // the huntress holds up her bow
    arm(shL, [5, S + 40, -14], [12, S + 43, -13]);
    const bow = sm(new T.TorusGeometry(16, .7, 8, 32, Math.PI*.6), goldC, shine + 25); bow.position.set(12, S + 43, 2); bow.rotation.set(0, -Math.PI/2, Math.PI*.7); g.add(bow);
    const str = new T.Mesh(new T.CylinderGeometry(.12, .12, 32*Math.sin(Math.PI*.3), 4), smat('#f4efe2')); str.position.set(12, S + 43, 2 - 16*Math.cos(Math.PI*.3)); g.add(str); // the bowstring
    arm(shR, [2, S + 33, 13], [4, S + 26, 13]);
    const quiver = sm(new T.CylinderGeometry(1.8, 1.5, 14, 14), '#7a4a22', 8); quiver.position.set(-8, S + 40, 3); quiver.rotation.x = .5; g.add(quiver);
  }
  // fire bowls at the four corners, lit at night (setTorches)
  g.userData.torches = [];
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]){ const b = brazier(); b.g.position.set(x*21.8, 5, z*21.8); b.g.scale.setScalar(.85); g.add(b.g); g.userData.torches.push(b.flame); }
  TORCH_ROOTS.add(g);
  return g;
}
