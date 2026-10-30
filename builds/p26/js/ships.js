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
// Every top-row oar has its own rower on deck. Lower rows (bireme, trireme) row from inside the hull, through oar holes.
export const SPECS = {
  rowboat:    {L:40, B:17, H:9, rise:5, oarRows:1, oarCount:1, crew:[], look:{paint:'oak', sail:null, flag:'none'}},
  fishing:    {L:64, B:23, H:12, rise:9, mast:true, sailW:34, sailH:28, nets:true, crew:[['stand', 2]], look:{paint:'gold', sail:'ochre', flag:'artemis'}},
  merchant:   {L:110, B:44, H:22, rise:14, mast:true, sailW:64, sailH:52, cargo:true, cabin:true, crew:[['stand', 3]], crewAt:[[-.45, 0], [.37, 0], [-.12, .32]], look:{paint:'white', sail:'plain', flag:'hermes'}},
  penteconter:{L:150, B:22, H:13, rise:18, oarRows:1, oarCount:11, mast:true, sailW:44, sailH:38, ram:true, eyes:true, fans:true, crew:[['stand', 1]], look:{paint:'black', sail:'bwr', flag:'apollo'}},
  bireme:     {L:160, B:30, H:18, rise:26, oarRows:1, oarCount:14, mast:true, sailW:62, sailH:52, ram:true, fans:true, eyes:true, crew:[['stand', 1], ['archer', 4]], look:{paint:'gold', sail:'bwr', flag:'poseidon'}},
  trireme:    {L:190, B:34, H:21, rise:32, oarRows:3, oarCount:11, mast:true, sailW:74, sailH:60, ram:true, bigRam:true, fans:true, bowFans:true, eyes:true, outrigger:true, canopy:true, crew:[['stand', 1], ['archer', 6]], look:{paint:'aegean', sail:'bwr', flag:'zeus'}},
  raider:     {L:135, B:28, H:16, rise:22, oarRows:1, oarCount:9, mast:true, sailW:56, sailH:46, ram:true, fans:true, shields:true, raider:true, crew:[['stand', 1], ['archer', 6]], look:{paint:'raider', sail:'blood', flag:'none'}},
  dinghy:     {L:44, B:17, H:9, rise:6, oarRows:1, oarCount:2, mast:true, sailW:20, sailH:18, raider:true, crew:[['archer', 1]], look:{paint:'raider', sail:'blood', flag:'none'}},
  skiff:      {L:72, B:22, H:12, rise:12, oarRows:1, oarCount:3, mast:true, sailW:34, sailH:28, fans:true, shields:true, shieldCount:5, raider:true, crew:[['archer', 3]], look:{paint:'raider', sail:'blood', flag:'none'}},
};

// ---------- materials ----------
function gradTex(steps){ const d = new Uint8Array(steps.length*3); steps.forEach((v, i) => d.set([v, v, v], i*3));
  const t = new T.DataTexture(d, steps.length, 1, T.RGBFormat); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t; }
const GRAD = gradTex([150, 205, 255]); // three gentle steps
// ---- the cel-shaded test look: two hard bands of light and dark ink outlines (a setting under Graphics) ----
export const CEL = {on:(() => { try { return !!JSON.parse(localStorage.getItem('wine-dark-sea-settings')).cel; } catch (e) { return false; } })()};
export function setCel(on){ CEL.on = on; GRAD.image.data.set(on ? [118, 118, 118, 255, 255, 255, 255, 255, 255] : [150, 150, 150, 205, 205, 205, 255, 255, 255]); GRAD.needsUpdate = true; }
setCel(CEL.on);
const inkMat = new T.MeshBasicMaterial({color:'#1d1a22', side:T.BackSide});
inkMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.9;'); };
// Outlines: a slightly fatter dark copy of every solid mesh, drawn inside out so only its rim shows.
export function inkify(obj){
  const add = []; obj.traverse(o => { if (o.isMesh && !o.userData.ink && o.material && !o.material.map && !o.material.transparent && o.geometry.attributes.normal) add.push(o); });
  for (const o of add){ const m = new T.Mesh(o.geometry, inkMat); m.userData.ink = true; m.castShadow = m.receiveShadow = false; o.add(m); }
  return obj;
}
const GREY = new T.Color('#a39d90');
const KEEP = ['side', 'map', 'transparent', 'alphaTest', 'vertexColors', 'opacity', 'depthWrite'];
const mats = {};
export function mat(color, o = {}){
  const opts = {}; for (const k of KEEP) if (k in o) opts[k] = o[k];
  const key = color + JSON.stringify(opts, (k, v) => v && v.isTexture ? v.uuid : v);
  if (mats[key]) return mats[key];
  const c = new T.Color(P[color] || color); if (!opts.map && !opts.vertexColors) c.lerp(GREY, .06);
  return mats[key] = new T.MeshToonMaterial({color:c, gradientMap:GRAD, flatShading:true, ...opts});
}
export function mesh(geo, color, o){ const m = new T.Mesh(geo, mat(color, o)); m.castShadow = m.receiveShadow = true; return m; }
function tube(points, radius, color, radial = 5){
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
  return mesh(new T.TubeGeometry(curve, Math.max(8, points.length*2), radius, radial, false), color);
}

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
  const railR = Math.max(.9, B*.045), waleR = Math.max(.7, B*.035), inner = st.slice(1, -1);
  for (const sg of [1, -1]){
    g.add(tube(st.map(p => [p.x, p.dy + railR*.3, sg*p.w]), railR, C.wale));
    g.add(tube(inner.map(p => { const r = p.ring[sg < 0 ? 2 : M-3]; return [r[0], r[1], r[2]*1.04]; }), waleR, C.wale));
    if (H > 11) g.add(tube(inner.map(p => { const r = p.ring[sg < 0 ? 3 : M-4]; return [r[0], r[1] - .5, r[2]*1.05]; }), waleR*.8, C.wale));
  }
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
export function beanGeo(h = 7.4){ return beans[h] || (beans[h] = new T.LatheGeometry([[0, 0], [2.1, .25], [3, 1.3], [3.3, 2.9], [3.1, 4.5], [2.5, 5.9], [1.5, 6.9], [0, 7.3]].map(([r, y]) => new T.Vector2(r, y*h/7.3)), 10)); }
const headGeo = new T.SphereGeometry(3, 12, 9);
const capGeo = new T.SphereGeometry(3.15, 12, 6, 0, Math.PI*2, 0, Math.PI/2.1), helmGeo = new T.SphereGeometry(3.3, 12, 6, 0, Math.PI*2, 0, Math.PI/1.9);
// a big round head (no eyes, by choice), hair or a helmet; y = the head's center
export function cuteHead(parent, y, hairColor = 'hair', helmet = false){
  const head = mesh(headGeo, 'skin'); head.position.y = y; parent.add(head);
  if (helmet){ const hm = mesh(helmGeo, 'bronze'); hm.position.y = y + .35; hm.rotation.z = .12; parent.add(hm);
    const crest = mesh(new T.BoxGeometry(6, 2, .9), 'plume'); crest.position.y = y + 3.6; parent.add(crest); }
  else { const hair = mesh(capGeo, hairColor); hair.position.set(-.35, y + .45, 0); hair.rotation.z = .3; parent.add(hair); }
}
// A crew member: a round peg figure like the townspeople, a body and a head with no arms or legs. About 13 units tall. Faces +x.
// pose: 'row' (seated lower, rocks with the stroke), 'stand', 'helm', 'archer' (a bow at their side, leans in to shoot).
export function person(tunic, pose = 'stand', helmet = false){
  const g = new T.Group(), inner = new T.Group(); g.add(inner);
  const sit = pose === 'row', base = sit ? 1.6 : 2.4, h = sit ? 5.2 : 6.6;
  const body = mesh(beanGeo(h), tunic); body.position.y = base; body.scale.set(.85, 1, .85); inner.add(body);
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
      g.add(piv); list.push({piv, sg, ph:i*.12 + r*.4, x, r});
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
function flagOn(god, x, y){
  const geo = new T.PlaneGeometry(16, 10, 8, 2); geo.translate(-8, 0, 0);
  const m = new T.Mesh(geo, mat('#ffffff', {map:flagTex(god), side:T.DoubleSide, transparent:true, alphaTest:.5})); m.castShadow = true;
  m.position.set(x, y, 0); m.userData.flagBase = geo.attributes.position.array.slice(); return m;
}
const amphora = new T.LatheGeometry([[0,0],[2.5,.8],[4,3.5],[4.4,7],[3.2,10.5],[1.6,12],[1.6,14.5],[2.6,15.3]].map(([x, y]) => new T.Vector2(x, y)), 8);

// Build a ship. look = {paint, sail, flag}; crew = show the crew.
export function buildShip(key, look = {}, crew = true){
  const s = SPECS[key], lk = {...s.look, ...look}, root = new T.Group(), body = new T.Group(); root.add(body);
  const h = hull(s, lk.paint), info = h.userData; body.add(h);
  const pc = PAINTS[lk.paint] || PAINTS.gold;
  root.userData = {oars:[], flags:[], spec:s, body};
  if (s.oarRows){ const o = oars(s, info, s.raider ? 'rOar' : 'oar'); body.add(o); root.userData.oars = o.userData.list; }
  body.add(steeringOars(s, info));
  if (s.outrigger) for (const sg of [1, -1]){ const box = mesh(new T.BoxGeometry(s.L*.62, s.H*.2, 5), pc.top); box.position.set(-s.L*.02, info.deckLevel + s.H*.2, sg*(info.W(.3) + 2.5)); body.add(box);
    const lip = mesh(new T.BoxGeometry(s.L*.63, 1.2, 6), pc.wale); lip.position.set(-s.L*.02, info.deckLevel + s.H*.31, sg*(info.W(.3) + 2.5)); body.add(lip); }
  if (s.shields){ const sn = s.shieldCount || 11; for (let i=0;i<sn;i++) for (const sg of [1, -1]){ const x = (-.32 + i*.64/(sn-1))*s.L, w = info.W(Math.abs(x/(s.L/2)));
    const sh = mesh(new T.CylinderGeometry(3.4, 3.4, 1, 10), i % 2 ? '#7a2426' : '#c4b08a'); sh.rotation.x = Math.PI/2; sh.position.set(x, info.deckLevel + s.H*.38, sg*(w + .8)); body.add(sh); } }
  if (s.mast){
    const top = info.deckLevel + s.sailH + 16;
    const mast = mesh(new T.CylinderGeometry(1.6, 2.4, top - info.deckLevel + 6, 7), 'mast'); mast.position.set(0, (top + info.deckLevel)/2 + 3, 0); body.add(mast);
    const yard = mesh(new T.CylinderGeometry(1.2, 1.2, s.sailW + 14, 6), 'mast'); yard.rotation.x = Math.PI/2; yard.position.set(1.8, top, 0); body.add(yard);
    const fin = mesh(new T.ConeGeometry(2.2, 7, 6), pc.panel); fin.position.set(0, top + 9.5, 0); body.add(fin);
    if (lk.sail){
      const geo = new T.PlaneGeometry(s.sailW, s.sailH, 10, 6); geo.translate(0, -s.sailH/2, 0); geo.rotateY(Math.PI/2);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i=0;i<pos.count;i++){ const u = uv.getX(i), v = 1 - uv.getY(i); pos.setX(i, Math.sin(Math.PI*u)*Math.sin(Math.PI*(v*.85 + .1))*s.sailW*.16); pos.setZ(i, pos.getZ(i)*(1 + v*.1)); }
      geo.computeVertexNormals();
      const sl = new T.Mesh(geo, mat('#ffffff', {map:sailTex(lk.sail, lk.flag), side:T.DoubleSide})); sl.castShadow = true; sl.position.set(3, top - 1.2, 0); body.add(sl); root.userData.sail = sl;
      const bow = [s.L/2 - 2, info.deckY(1) - 2, 0], stern = [-s.L/2 + 2, info.deckY(1) - 2, 0];
      const pts = [[1.8, top, s.sailW/2 + 6], bow, [1.8, top, -s.sailW/2 - 6], stern, [0, top + 4, 0], bow, [0, top + 4, 0], stern,
        [1.8, top, s.sailW/2], [0, info.deckLevel + 1, info.W(0)], [1.8, top, -s.sailW/2], [0, info.deckLevel + 1, -info.W(0)]].flat();
      const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      body.add(new T.LineSegments(lg, new T.LineBasicMaterial({color:P.rope})));
    }
    if (lk.flag && lk.flag !== 'none'){ const f = flagOn(lk.flag, -1, top + 18); body.add(f); root.userData.flags.push(f);
      const pole = mesh(new T.CylinderGeometry(.5, .5, 12, 5), 'mast'); pole.position.set(0, top + 16, 0); body.add(pole); }
  } else if (lk.flag && lk.flag !== 'none'){
    const pole = mesh(new T.CylinderGeometry(.5, .6, 22, 5), 'mast'); pole.position.set(-s.L*.42, info.deckY(.84) + 10, 0); body.add(pole);
    const f = flagOn(lk.flag, -s.L*.42, info.deckY(.84) + 17); f.scale.setScalar(.75); body.add(f); root.userData.flags.push(f);
  }
  // The player's ship shows its upgrades: the ram it has bought (not the built-in one) and extra planking along the sides.
  if (lk.ram !== undefined){ if (lk.ram > 0){ const m = Math.min(2, Math.floor((lk.ram - 1)/10)), sub = lk.ram - m*10; body.add(ram(s, ['#8a5a30', '#b07f3c', '#e3b341'][m], .8 + sub*.03 + m*.1)); } }
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
    const pu = mesh(new T.CircleGeometry(1.4, 10), '#1c1c22', {side:T.DoubleSide}); pu.position.copy(e.position); pu.position.z += sg*.2; pu.position.x += .6; pu.rotation.y = e.rotation.y; body.add(pu);
  }
  if (s.nets){ const n = mesh(new T.DodecahedronGeometry(6, 0), 'net'); n.scale.set(1.3, .5, 1); n.position.set(-s.L*.3, info.deckLevel + 2, 0); body.add(n); }
  if (s.cargo){ for (let i=0;i<8;i++){ const a = mesh(amphora, '#b06a3d'); a.position.set(-8 + (i % 4)*8, info.deckLevel, -7 + Math.floor(i/4)*12); body.add(a); }
    const crate = mesh(new T.BoxGeometry(14, 9, 12), '#9b6b3a'); crate.position.set(24, info.deckLevel + 4.5, 0); body.add(crate); }
  if (s.cabin){ const cab = mesh(new T.BoxGeometry(18, 11, s.B*.5), pc.inner); cab.position.set(-s.L*.3, info.deckLevel + 5.5, 0); body.add(cab);
    const roof = mesh(new T.BoxGeometry(20, 1.5, s.B*.56), pc.panel); roof.position.set(-s.L*.3, info.deckLevel + 11.5, 0); body.add(roof); }
  if (s.canopy){ const roof = mesh(new T.BoxGeometry(s.L*.18, 1.2, s.B*.62), pc.panel); roof.position.set(-s.L*.3, info.deckLevel + 14, 0); body.add(roof);
    for (const x of [-.22, -.38]) for (const sg of [1, -1]){ const post = mesh(new T.CylinderGeometry(.6, .6, 14, 5), 'mast'); post.position.set(x*s.L, info.deckLevel + 7, sg*s.B*.28); body.add(post); } }
  root.userData.crew = [];
  if (crew && s.crew){
    const tunics = s.raider ? ['rTunic', 'rTunic', '#2c1f1f'] : ['tunic1', 'tunic2', 'tunic3'];
    const add = (p, x, y, z, ph = 0) => { p.position.set(x, y, z); body.add(p); root.userData.crew.push({p, ph}); };
    // One rower per top-row oar, sitting facing the stern as real oarsmen did, pulling in time with that oar.
    root.userData.oars.filter(o => o.r === 0).forEach((o, i) => {
      if (s.oarCount === 1 && o.sg < 0) return; // the rowboat: one rower works both oars
      const p = person(tunics[i % 3], 'row'); p.rotation.y = Math.PI; p.traverse(m => m.castShadow = false);
      add(p, o.x, info.deckLevel, s.oarCount === 1 ? 0 : o.sg*info.W(Math.abs(o.x/(s.L/2)))*.5, o.ph);
    });
    for (const [kind, n] of s.crew){
      if (kind === 'archer') for (let i=0;i<n;i++){
        // Archers stand along the rails, half on each side, facing outboard.
        const sg = i % 2 ? 1 : -1, x = (-.2 + .45*Math.floor(i/2)/Math.max(1, Math.ceil(n/2) - 1))*s.L;
        const p = person(tunics[(i+1) % 3], 'archer', true); p.rotation.y = -sg*Math.PI/2;
        add(p, x, info.deckLevel + s.H*.12, sg*info.W(Math.abs(x/(s.L/2)))*.62);
      } else for (let i=0;i<n;i++){
        // First standing crew takes the helm at the stern; the rest work the deck.
        // crewAt (fractions of length and width) keeps them clear of cargo and cabins on ships that carry them
        const helm = i === 0, at = s.crewAt && s.crewAt[i], x = at ? at[0]*s.L : helm ? -s.L*.36 : [s.L*.18, -s.L*.05][(i-1) % 2];
        const p = person(tunics[(i+1) % 3], helm ? 'helm' : 'stand'); if (i === 2) p.rotation.y = 1.2;
        add(p, x, info.deckLevel + (helm ? 1 : 0), at ? at[1]*s.B : i === 2 ? 4 : 0);
      }
    }
  }
  if (CEL.on) inkify(root);
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
  if (root.userData.sail) root.userData.sail.scale.x = 1 + Math.min(.9, speed/80) + Math.sin(t*1.3)*.06;
  root.userData.flags.forEach(f => { const p = f.geometry.attributes.position, b = f.userData.flagBase;
    for (let i=0;i<p.count;i++){ const x = b[i*3]; p.setZ(i, Math.sin(x*.5 + t*6)*(-x)*.06); } p.needsUpdate = true; });
}

// ---------- statues ----------
function limb(a, b, r1, r2, color){
  const A = new T.Vector3(...a), B = new T.Vector3(...b);
  const m = mesh(new T.CylinderGeometry(r2, r1, A.distanceTo(B), 6), color);
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m;
}
export function statue(god, stone = 'painted'){
  const g = new T.Group();
  const skinC = stone === 'bronze' ? '#a3733d' : '#e8e2d6';
  const robeC = stone === 'bronze' ? '#8f6332' : stone === 'painted' ? ({poseidon:'#41699f', zeus:'#5c3470', athena:'#71873f', apollo:'#cf9035'})[god] : '#ded7c9';
  const hairC = stone === 'painted' ? '#6b4a2a' : skinC, goldC = stone === 'marble' ? '#d9d1c1' : '#dcb453';
  const p1 = mesh(new T.BoxGeometry(48, 6, 48), '#d3cab6'); p1.position.y = 3; g.add(p1);
  const p2 = mesh(new T.BoxGeometry(38, 9, 38), '#e2dbcb'); p2.position.y = 10.5; g.add(p2);
  const base = 15, bare = god === 'poseidon' || god === 'zeus';
  if (god === 'poseidon'){ const wave = mesh(new T.TorusGeometry(9, 3.6, 6, 10, Math.PI), robeC); wave.position.set(-2, base, 0); wave.rotation.y = Math.PI/2; g.add(wave); }
  const robe = mesh(new T.CylinderGeometry(6.6, 10, 30, 10), robeC); robe.position.y = base + 15; g.add(robe);
  const torso = mesh(new T.CylinderGeometry(8, 6.6, 16, 9), bare ? skinC : robeC); torso.position.y = base + 38; g.add(torso);
  const sash = mesh(new T.BoxGeometry(2.4, 20, 15), robeC); sash.position.set(.5, base + 37, 0); sash.rotation.x = .75; g.add(sash);
  const shoulders = mesh(new T.BoxGeometry(9, 5, 20), bare ? skinC : robeC); shoulders.position.y = base + 46; g.add(shoulders);
  const neck = mesh(new T.CylinderGeometry(2.6, 3, 4, 6), skinC); neck.position.y = base + 50; g.add(neck);
  const head = mesh(new T.IcosahedronGeometry(5.6, 1), skinC); head.position.y = base + 56; g.add(head);
  const nose = mesh(new T.BoxGeometry(2, 2.6, 1.4), skinC); nose.position.set(5.4, base + 56, 0); g.add(nose);
  const hair = mesh(new T.SphereGeometry(6, 9, 5, 0, Math.PI*2, 0, Math.PI/2), hairC); hair.position.set(-.8, base + 56.6, 0); hair.rotation.z = .25; g.add(hair);
  if (bare){ const beard = mesh(new T.ConeGeometry(4.6, 10, 7), hairC); beard.rotation.z = Math.PI; beard.position.set(3, base + 50, 0); g.add(beard); }
  if (god === 'zeus' || god === 'apollo'){ const w = mesh(new T.TorusGeometry(5.8, 1, 5, 16), god === 'apollo' && stone !== 'marble' ? '#7d9a48' : goldC); w.rotation.x = Math.PI/2; w.position.y = base + 58.5; g.add(w); }
  if (god === 'athena'){
    const helm = mesh(new T.SphereGeometry(6.4, 10, 6, 0, Math.PI*2, 0, Math.PI/1.8), stone === 'marble' ? skinC : '#c4a04c'); helm.position.y = base + 56.5; g.add(helm);
    const crest = mesh(new T.BoxGeometry(15, 6, 1.8), stone === 'painted' ? '#bd4a37' : robeC); crest.position.set(-1.5, base + 64, 0); g.add(crest);
  }
  const shL = [0, base + 46, -10], shR = [0, base + 46, 10];
  const arm = (sh, el, hand) => { g.add(limb(sh, el, 2.4, 2.1, skinC)); g.add(limb(el, hand, 2.1, 1.8, skinC)); const f = mesh(new T.SphereGeometry(2.3, 6, 5), skinC); f.position.set(...hand); g.add(f); };
  const staff = (x, z, top) => { const s = mesh(new T.CylinderGeometry(.9, .9, top - base + 2, 6), goldC); s.position.set(x, (top + base)/2, z); g.add(s); return top; };
  if (god === 'poseidon'){
    arm(shR, [2, base + 44, 16], [3, base + 52, 15.5]); const top = staff(3, 15.5, base + 84);
    const bar = mesh(new T.BoxGeometry(1.6, 1.8, 13), goldC); bar.position.set(3, top - 4, 15.5); g.add(bar);
    for (const dz of [-5.5, 0, 5.5]){ const pr = mesh(new T.ConeGeometry(1.4, 10, 5), goldC); pr.position.set(3, top + 1.5, 15.5 + dz); g.add(pr); }
    arm(shL, [1, base + 36, -12], [3, base + 27, -11]);
  } else if (god === 'zeus'){
    arm(shR, [-4, base + 54, 14], [-6, base + 64, 12]);
    const shape = new T.Shape([[0,-11],[3.5,-1],[0,-1],[3,10],[-3.5,-2],[0,-2],[-2.5,-11]].map(([x, y]) => new T.Vector2(x, y)));
    const bolt = mesh(new T.ExtrudeGeometry(shape, {depth:2.4, bevelEnabled:false}), goldC); bolt.position.set(-6, base + 66, 11); bolt.rotation.set(0, Math.PI/2, .5); g.add(bolt);
    arm(shL, [7, base + 42, -12], [15, base + 41, -8]);
  } else if (god === 'athena'){
    arm(shR, [2, base + 44, 16], [3, base + 52, 15.5]); const top = staff(3, 15.5, base + 86);
    const tip = mesh(new T.ConeGeometry(1.8, 8, 5), goldC); tip.position.set(3, top + 4, 15.5); g.add(tip);
    arm(shL, [2, base + 36, -13], [4, base + 29, -14]);
    const shield = mesh(new T.CylinderGeometry(12, 12, 1.8, 18), stone === 'painted' ? '#c4a04c' : goldC); shield.rotation.x = Math.PI/2; shield.position.set(4, base + 22, -17); g.add(shield);
  } else if (god === 'apollo'){
    arm(shL, [5, base + 36, -12], [8, base + 38, -5]);
    const lyre = new T.Group(); lyre.position.set(9, base + 38, -4); g.add(lyre);
    for (const dz of [-3.6, 3.6]) lyre.add(limb([0, 0, dz*.6], [0, 13, dz*1.3], 1, .8, goldC));
    const bar = mesh(new T.BoxGeometry(1.2, 1.2, 11), goldC); bar.position.y = 12.5; lyre.add(bar);
    arm(shR, [6, base + 40, 13], [12, base + 40, 5]);
  }
  return g;
}
