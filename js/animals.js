// P74: 35 new animals for the Showroom: five real species for each animal in the game. Made in the same style as whaleModel, dolphinModel, gull, krakenModel and fishModel.
// P75: all but the rose dolphin (a river animal) and the krakens swim in the game; wildlife.js and entities.js pick them. The krakens wait for a decision.
import {soft, softMat, latheBody, blade, tentacleGeo} from './models.js?v=628a65a';
const T = window.THREE;
const C = new T.Color(), A = new T.Color(), B = new T.Color();
const mix = (a, b, k) => { A.set(a); B.set(b); return A.lerp(B, Math.max(0, Math.min(1, k))); };
const sst = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a)/(b - a))); return t*t*(3 - 2*t); };
const wob = (x, z) => Math.sin(x*1.3 + z*2.1)*Math.sin(x*.7 - z*1.7) + .5*Math.sin(x*3.1 + z*.9);
// paint a body after it is made. fn(x, up, side, fwd): up is -1 belly to 1 back, side -1 to 1. Returns a color.
function paint(m, fn){ const g = m.geometry, p = g.attributes.position, col = g.attributes.color, box = (g.computeBoundingBox(), g.boundingBox), L = box.max.x - box.min.x;
  for (let i = 0; i < p.count; i++){ const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(y, z) || 1, c = fn(x, y/r, z/r, (x - box.min.x)/L); col.setXYZ(i, c.r, c.g, c.b); }
  col.needsUpdate = true; return m; }
const eye = (g, x, y, z, r = 1.5) => { for (const sd of [-1, 1]){ const e = soft(new T.SphereGeometry(r, 10, 8), '#14191f'); e.position.set(x, y, sd*z); g.add(e); const h = soft(new T.SphereGeometry(r*.32, 6, 5), '#ffffff'); h.position.set(x + r*.4, y + r*.4, sd*(z + r*.72)); g.add(h); } };

// ---------- whales ----------
function whale(o){ const g = new T.Group(), body = new T.Group(); g.add(body);
  const b = latheBody(o.prof, '#555', '#eee', o.ys ?? .85, o.zs ?? 1, 32, -.05); paint(b, o.paint); body.add(b);
  const tx = o.prof[0][0], k = o.fl ?? 1;
  for (const sd of [-1, 1]){ const f = blade(o.flip[0], o.flip[1], 1.6, .6, .45, 0, o.fin); f.rotation.set(sd*.3, -sd*(Math.PI/2 + .6), 0); f.position.set(o.flipAt[0], o.flipAt[1], sd*o.flipAt[2]); body.add(f); }
  if (o.dorsal){ const [h, w, x, y, tilt = 1.05] = o.dorsal, d = blade(h, w, 1.5, .8, -.4, 0, o.fin); d.rotation.z = Math.PI/2 + tilt; d.position.set(x, y, 0); body.add(d); }
  const tail = new T.Group(); tail.position.set(tx + 3, 0, 0); body.add(tail);
  for (const sd of [-1, 1]){ const fl = blade(34*k, 12*k, 1.8, .75, -.55*sd, 0, o.fin); fl.rotation.set(Math.PI/2, 0, Math.PI - sd*1.05); fl.position.x = 1; tail.add(fl); }
  eye(body, o.eye[0], o.eye[1], o.eye[2], o.eye[3]);
  if (o.more) o.more(body);
  const spout = []; for (let k = 0; k < 7; k++){ const p = new T.Mesh(new T.SphereGeometry(5, 10, 8), new T.MeshLambertMaterial({color:'#f4fbff', transparent:true, opacity:.8})); p.visible = false; g.add(p); spout.push(p); }
  g.userData = {body, tail, spout}; return g; }
const WHALES = [
  {key:'blue', name:'Blue whale', desc:'The biggest animal that has ever lived: very long and slim, mottled blue, with a tiny fin far back.', make:() => whale({
    prof:[[-120, 0], [-114, 2.6], [-96, 5], [-70, 10], [-36, 16], [4, 21], [46, 23], [78, 21], [100, 16], [114, 8], [119, 0]], fin:'#567d9e', flip:[36, 6.5], flipAt:[62, -9, 17], dorsal:[8, 3, -70, 8, 1.15], eye:[92, -5, 15.8, 1.6], fl:1.25,
    paint:(x, u, s) => { const m = wob(x*.18, s*5 + u*3); return mix(mix('#5d87a9', '#7ea3bf', m*.5 + .5), '#c5d4dc', sst(.15, -.55, u)); }})},
  {key:'sperm', name:'Sperm whale', desc:'A huge square head, a thin lower jaw and wrinkled grey skin. It dives the deepest of all.', make:() => whale({
    prof:[[-76, 0], [-70, 3], [-50, 9], [-22, 17], [6, 21], [34, 22], [54, 21.5], [68, 20], [74, 15], [76, 7], [76.5, 0]], ys:.95, zs:.9, fin:'#59606a', flip:[20, 5], flipAt:[30, -11, 18], dorsal:[8, 5, -26, 13, 1.15], eye:[32, -2, 18.6, 1.4],
    paint:(x, u, s) => { const w = Math.sin(x*.9 + u*5)*.5 + .5; return mix(mix('#6b727c', '#7c838c', w), '#a6abb1', sst(-.2, -.8, u)); },
    more:b => { const jaw = blade(50, 2.4, 2.8, .4, 0, 0, '#d9dbd8'); jaw.position.set(24, -17, 0); jaw.rotation.z = .03; b.add(jaw); for (let i = 0; i < 4; i++){ const k = soft(new T.SphereGeometry(2.4 - i*.4, 8, 6), '#616873'); k.position.set(-34 - i*7, 11.4 - i*1.5, 0); k.scale.set(1.4, .55, .8); b.add(k); } }})},
  {key:'orca', name:'Orca', desc:'The killer whale: glossy black, white belly and eye patch, a grey saddle and a very tall fin.', make:() => whale({
    prof:[[-48, 0], [-45, 2.2], [-36, 4.5], [-20, 9.5], [-4, 13.5], [12, 15], [28, 14], [39, 10.5], [45, 6], [48, 0]], fin:'#14161b', flip:[17, 7.5], flipAt:[23, -7, 11.5], dorsal:[25, 4.4, 1, 10, 1.42], eye:[35, 1.6, 10.2, 1], fl:.72,
    paint:(x, u, s) => { const belly = sst(-.1, -.5, u + (x < -5 ? .15 : 0)); let c = mix('#16181d', '#f5f5f2', belly); const patch = Math.hypot((x - 27)/6.5, (u - .32)/.28); if (patch < 1) c = C.set('#f5f5f2'); const sad = Math.hypot((x + 8)/8.5, (u - .75)/.36); if (sad < 1) c = mix('#16181d', '#9da3a8', sst(1, .7, sad)); return c; }})},
  {key:'beluga', name:'Beluga', desc:'The white whale, with a round forehead and a soft neck. It has no fin on its back at all.', make:() => whale({
    prof:[[-46, 0], [-43, 2.2], [-32, 5], [-16, 11], [2, 15], [17, 15], [27, 12.2], [33, 11.8], [40, 12.4], [45, 9], [47, 3.5], [48, 0]], fin:'#d6dcd8', flip:[14, 5.5], flipAt:[20, -8, 11], eye:[36, 1.8, 10, 1], fl:.66,
    paint:(x, u) => mix('#f2f1e8', '#dfe5e1', sst(.5, -.8, u) + wob(x*.2, u*2)*.05)})},
  {key:'narwhal', name:'Narwhal', desc:'The unicorn of the sea: a spotted grey back, a pale belly and one long spiral tusk.', make:() => whale({
    prof:[[-46, 0], [-42, 2.3], [-30, 5], [-14, 10.5], [4, 14], [20, 14], [32, 11.5], [41, 8], [45, 4], [46, 0]], fin:'#464d57', flip:[11, 4], flipAt:[26, -7, 11], eye:[36, 1, 8.1, .95], fl:.68,
    paint:(x, u, s) => { const sp = Math.sin(x*1.2 + s*5)*Math.sin(u*7 - x*.6); return mix(sp > .35 ? '#30363e' : '#616873', '#e5e7e2', sst(.1, -.6, u)); },
    more:b => { const geo = new T.ConeGeometry(1.55, 60, 12, 24), p = geo.attributes.position, col = new Float32Array(p.count*3), c = new T.Color(); for (let i = 0; i < p.count; i++){ const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i)); c.set(Math.sin(y*.9 + a*2) > 0 ? '#efe6cc' : '#b9a981'); col.set([c.r, c.g, c.b], i*3); } geo.setAttribute('color', new T.BufferAttribute(col, 3)); const m = new T.Mesh(geo, softMat('#ffffff', true)); m.rotation.z = -Math.PI/2 + .14; m.position.set(73, 6, 0); m.castShadow = true; b.add(m); }})},
];

// ---------- dolphins ----------
function dolphin(o){ const g = new T.Group(), k = o.size ?? 1, fin = o.fin;
  const b = latheBody(o.prof, '#777', '#eee', .92, .85, 28, -.05); paint(b, o.paint); g.add(b);
  const [h, w, x, y, tilt = .55] = o.dorsal, df = blade(h, w, .8, .85, -.5, 0, fin); df.rotation.z = Math.PI/2 + tilt; df.position.set(x, y, 0); g.add(df);
  for (const sd of [-1, 1]){ const pf = blade(6.5*k, 1.8*k, .5, .7, .4, 0, fin); pf.rotation.set(sd*-.7, sd*(Math.PI/2 + .7), 0); pf.position.set(7.5, -2.2, sd*2); g.add(pf);
    const fl = blade(7*k, 2.2*k, .5, .75, -.35*sd, 0, fin); fl.rotation.set(Math.PI/2, 0, Math.PI - sd*.95); fl.position.set(o.prof[0][0] + 1.5, .2, 0); g.add(fl); }
  eye(g, o.eye[0], o.eye[1], o.eye[2], .46); return g; }
const DOLPHINS = [
  {key:'spinner', name:'Spinner dolphin', desc:'Slim, with a long beak and three bands of color. It leaps and spins in the air.', make:() => dolphin({
    prof:[[-17, 0], [-15, 1.1], [-10, 2.3], [-3, 3.8], [3, 4.2], [8, 3.5], [11, 2.5], [13, 1.4], [15, .9], [20, .7], [21.3, 0]], fin:'#39424c', dorsal:[7.5, 3, 1, 2.8, .4], eye:[11, .55, 2.05],
    paint:(x, u) => mix(mix('#39424c', '#919ba4', sst(.42, .1, u)), '#f5ecec', sst(-.15, -.45, u))})},
  {key:'striped', name:'Striped dolphin', desc:'Blue-grey, with a dark line running from its eye down along its side.', make:() => dolphin({
    prof:[[-17, 0], [-15, 1.2], [-10, 2.6], [-3, 4.3], [3, 4.7], [8, 4], [11.5, 3], [13.5, 2], [15, 1.1], [18, .85], [19, 0]], fin:'#2d4768', dorsal:[8, 3.4, 1, 2.6], eye:[11.2, .55, 2.5],
    paint:(x, u) => { const line = u + x*.012 + .2; if (Math.abs(line) < .1) return C.set('#22344f'); const blaze = Math.abs(u - .25 + (x - 2)*.045); return blaze < .1 && x < 6 ? C.set('#dbe6ec') : mix('#4a6d93', '#f3f6f7', sst(-.12, -.42, u)); }})},
  {key:'common', name:'Common dolphin', desc:'The dolphin on old Greek vases: a dark back and an hourglass of pale yellow and grey on its side.', make:() => dolphin({
    prof:[[-17, 0], [-15, 1.2], [-10, 2.6], [-3, 4.2], [3, 4.6], [8, 3.9], [11.5, 2.8], [13.5, 1.7], [15.5, 1], [18.5, .8], [19.6, 0]], fin:'#2a3038', dorsal:[8, 3.3, 1, 2.6], eye:[11.2, .5, 2.3],
    paint:(x, u) => { const belly = sst(-.2, -.5, u), w = .15 + .28*Math.pow(Math.abs(x + 1)/15, 1.4); let c = mix('#2a3038', '#f7f7f2', belly); if (u < .5 - w*.2 && !belly) c = x > -1 ? C.set('#e2c678') : C.set('#99a0a6'); return u > .24 + (x > -1 ? .05 : -.05)*(x/10) ? C.set('#2a3038') : belly > .4 ? C.set('#f7f7f2') : c; }})},
  {key:'rissos', name:"Risso's dolphin", desc:'A blunt, beakless head, a tall fin and pale grey skin covered in the white scars of old fights.', make:() => dolphin({
    prof:[[-18, 0], [-16, 1.3], [-11, 3], [-3, 5.2], [4, 5.8], [10, 5.1], [13.5, 3.8], [15.5, 2], [16, 0]], fin:'#57606a', dorsal:[11, 3.8, .8, 3.8, .4], eye:[11.8, .6, 3.8], size:1.1,
    paint:(x, u, s) => { const sc = Math.abs(Math.sin(x*1.8 + s*7 + u*3))*Math.abs(Math.sin(x*.5 - u*9)); return sc > .86 ? C.set('#f3f4f1') : mix(mix('#8d969e', '#a9b0b5', sst(-5, 13, x)), '#e1e4e2', sst(-.3, -.7, u)); }})},
  {key:'boto', name:'Rose dolphin', desc:'The pink dolphin: a round bulging forehead, a long thin beak and a low ridge instead of a fin.', make:() => dolphin({
    prof:[[-17, 0], [-15, 1.3], [-10, 2.9], [-3, 4.7], [3, 5.1], [7.5, 4.3], [10, 3.8], [11.8, 3.6], [13, 2.2], [14.5, .95], [20, .65], [21.5, 0]], fin:'#ee9fa8', dorsal:[8, 2, -2, 3, .92], eye:[10.4, .8, 3], size:1.15,
    paint:(x, u) => mix(mix('#e989a0', '#f5b5bc', wob(x*.5, u*3)*.5 + .5), '#fbdfdd', sst(0, -.6, u))})},
];

// ---------- sea birds ----------
const birdMat = new T.MeshPhongMaterial({color:'#e8e8e8', vertexColors:true, shininess:12, specular:new T.Color('#2a3036'), morphTargets:true, morphNormals:false});
function bird(o){ const span = o.span ?? 16, ch = o.chord ?? 7.5, geo = new T.SphereGeometry(1, 48, 26), p = geo.attributes.position, up = new Float32Array(p.count*3), col = new Float32Array(p.count*3), c = new T.Color();
  for (let i = 0; i < p.count; i++){ const u = p.getX(i), y = p.getY(i), w = p.getZ(i), aw = Math.abs(w);
    const chord = ch*(1 - .72*Math.pow(aw, 1.15)) + .6, X = u*chord - (o.sweep ?? 5.5)*aw*aw + Math.max(0, u - .4)*2.2*Math.max(0, 1 - aw*5), Z = w*span;
    const th = (o.plump ?? 2.5)*Math.pow(Math.max(0, 1 - aw*1.6), 1.6) + .32*(1 - aw*.6), Y = y*th + 2.4*Math.sin(Math.min(aw/.42, 1)*Math.PI/2) - 3.2*Math.pow(Math.max(0, aw - .42), 1.3);
    p.setXYZ(i, X, Y, Z); const fl = 7*Math.pow(aw, 1.4); up[i*3] = X - 1.2*aw; up[i*3 + 1] = Y + fl; up[i*3 + 2] = Z*(1 - .12*aw);
    const col0 = o.paint(c, u, y, aw, X); col.set([col0.r, col0.g, col0.b], i*3); }
  geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.morphAttributes.position = [new T.BufferAttribute(up, 3)]; geo.computeVertexNormals();
  const g = new T.Group(), m = new T.Mesh(geo, birdMat); m.castShadow = m.receiveShadow = true; m.morphTargetInfluences = [0]; g.add(m);
  if (o.more) o.more(g, ch); g.userData.flap = v => { m.morphTargetInfluences[0] = Math.max(-.5, v); }; g.userData.wings = []; return g; }
const beak = (g, x, y, len, r, color, down = .12) => { const b = soft(new T.ConeGeometry(r, len, 12), color); b.rotation.z = -Math.PI/2 - down; b.position.set(x + len/2 - .4, y, 0); g.add(b); return b; };
const neckHead = (g, pts, r0, r1, color) => { const curve = new T.CatmullRomCurve3(pts.map(q => new T.Vector3(...q))), geo = new T.TubeGeometry(curve, 16, r0, 10, false); g.add(soft(geo, color)); const e = pts[pts.length - 1], h = soft(new T.SphereGeometry(r1, 12, 10), color); h.position.set(...e); h.scale.set(1.25, .9, .9); g.add(h); return e; };
const backOf = (u, y, aw) => Math.min(1, Math.max(0, (aw - .12)/.18))*Math.min(1, Math.max(0, y*3 + .4));
const BIRDS = [
  {key:'blackhead', name:'Black-headed gull', desc:'A small gull with a chocolate hood, a red bill and white wings with black tips.', make:() => bird({
    paint:(c, u, y, aw) => { c.set('#f4f3ef').lerp(A.set('#aab4bc'), backOf(u, y, aw)*.9).lerp(A.set('#23262a'), sst(.8, .93, aw)); if (u > .55 && aw < .16) c.set('#3b2b23'); return c; }, more:g => beak(g, 8.4, .6, 2, .4, '#b6322c')})},
  {key:'shearwater', name:"Cory's shearwater", desc:'The great glider of the Aegean: long narrow wings, brown above, white below, and a yellow bill.', make:() => bird({ span:23, chord:5.6, sweep:3.2, plump:2.1,
    paint:(c, u, y, aw) => { const under = sst(.15, -.3, y); return c.set('#70604f').lerp(A.set('#f4f1e8'), under).lerp(A.set('#4e4338'), sst(.7, .95, aw)*(1 - under*.7)); }, more:g => beak(g, 6.6, .4, 2.2, .46, '#d9b03f')})},
  {key:'tern', name:'Common tern', desc:'A slim sea swallow with a black cap, an orange bill and a long forked tail. It dives for its fish.', make:() => bird({ span:15, chord:5.5, sweep:6, plump:1.6,
    paint:(c, u, y, aw) => { c.set('#f6f6f3').lerp(A.set('#c1cad1'), backOf(u, y, aw)).lerp(A.set('#4d5258'), sst(.86, .97, aw)); if (u > .5 && aw < .17 && y > -.3) c.set('#1b1c1f'); return c; },
    more:g => { beak(g, 6.6, .45, 2.7, .3, '#e4622a'); for (const sd of [-1, 1]){ const t = blade(10, 1, .22, .85, 0, 0, '#ecefef'); t.rotation.y = Math.PI - sd*.22; t.position.set(-5, 0, sd*.2); g.add(t); } }})},
  {key:'cormorant', name:'Cormorant', desc:'A dark, oily-looking diver with a long snake neck and a hooked bill.', make:() => bird({ span:15, chord:6.4, sweep:3, plump:2.6,
    paint:(c, u, y, aw) => c.set('#22272a').lerp(A.set('#31403b'), wob(u*4, aw*5)*.5 + .5),
    more:g => { const e = neckHead(g, [[5, .4, 0], [8, 1, 0], [11, 1.8, 0], [14.5, 2.5, 0]], .8, 1.25, '#23292a'); const b = beak(g, e[0] + 1, e[1], 3, .36, '#b6a06a', .05); const hook = soft(new T.SphereGeometry(.28, 6, 5), '#b6a06a'); hook.position.set(e[0] + 3.7, e[1] - .28, 0); g.add(hook); const ch = soft(new T.SphereGeometry(.6, 8, 6), '#dcae4c'); ch.position.set(e[0] + .7, e[1] - .35, 0); ch.scale.set(1.1, .7, 1.05); g.add(ch); }})},
  {key:'pelican', name:'Dalmatian pelican', desc:'A huge silver-white bird of the Greek lakes and coasts, with a great bill and an orange pouch.', make:() => bird({ span:26, chord:8.6, sweep:3.6, plump:3,
    paint:(c, u, y, aw) => c.set('#ecebe6').lerp(A.set('#bfc4c5'), backOf(u, y, aw)*.5).lerp(A.set('#3c3f42'), sst(.76, .95, aw)),
    more:g => { const e = neckHead(g, [[7, 1, 0], [10, 3, 0], [11.5, 5.3, 0], [14, 6, 0]], 1.05, 1.85, '#efeee9'); const up = soft(new T.ConeGeometry(.82, 11, 10), '#b9a28a'); up.scale.set(1, 1, .9); up.rotation.z = -Math.PI/2 - .05; up.position.set(e[0] + 6.4, e[1] - .3, 0); g.add(up);
      const pouch = soft(new T.SphereGeometry(1, 14, 10), '#e0752d'); pouch.scale.set(4.4, 1.55, .85); pouch.position.set(e[0] + 5.1, e[1] - 1.7, 0); g.add(pouch); }})},
];

// ---------- fish ----------
function fish(o){ const g = new T.Group(), top = o.top, F = o.finC ?? top;
  const b = latheBody(o.prof, '#555', '#eee', o.ys ?? 1, o.zs ?? .58, 28, .05); paint(b, o.paint); g.add(b);
  const [tl, tw] = o.tail ?? [3, 1], tx = o.prof[0][0] + .7; for (const sd of [-1, 1]){ const t = blade(tl, tw, .22, .5, -.25*sd, 0, F); t.rotation.set(Math.PI/2, 0, Math.PI - sd*(o.fork ?? .6)); t.position.x = tx; g.add(t); }
  for (const [h, w, x, y, tilt] of o.fins ?? [[2.6, 1, .6, 1.4, .6]]){ const d = blade(h, w, .2, .8, -.4, 0, o.dorsalC ?? F); d.rotation.z = Math.PI/2 + tilt; d.position.set(x, y, 0); g.add(d); }
  for (const [h, w, x, y] of o.bellyFins ?? []){ const d = blade(h, w, .2, .8, .3, 0, o.dorsalC ?? F); d.rotation.z = -Math.PI/2 - .6; d.position.set(x, y, 0); g.add(d); }
  if (o.pect) for (const sd of [-1, 1]){ const [l, w, x, y, z] = o.pect, f = blade(l, w, .16, .75, .35, 0, o.pectC ?? F); f.rotation.set(sd*-.55, sd*(Math.PI/2 + .85), 0); f.position.set(x, y, sd*z); g.add(f); }
  if (o.bill){ const c = soft(new T.ConeGeometry(o.bill[1], o.bill[0], 12), o.bill[2]); c.rotation.z = -Math.PI/2; c.position.x = o.prof[o.prof.length - 1][0] + o.bill[0]/2 - .6; g.add(c); }
  eye(g, o.eye[0], o.eye[1], o.eye[2], o.eye[3] ?? .32);
  if (o.more) o.more(g); g.scale.setScalar(o.scale); return g; }
const silver = (top, line = .1) => (x, u) => mix(top, '#e8eff2', sst(line, line - .5, u));
const finlets = (g, x0, y, n, color) => { for (let i = 0; i < n; i++){ const f = soft(new T.ConeGeometry(.22, .8, 5), color); f.position.set(x0 - i*.8, y - i*.09, 0); f.rotation.z = .55; g.add(f); f.scale.z = .3; const u = f.clone(); u.position.y = -y + i*.15; u.rotation.z = Math.PI - .55; g.add(u); } };
const PROF_SMALL = [[-4.6, 0], [-4, .45], [-2.2, 1.5], [0, 2.1], [2.2, 1.9], [3.8, 1.2], [4.6, 0]], PROF_TUNA = [[-6.2, 0], [-5.6, .3], [-3.8, 1.4], [-1, 2.8], [1.6, 3.1], [3.6, 2.5], [5, 1.5], [5.8, .5], [6, 0]];
const SMALL = [
  {key:'anchovy', name:'Anchovy', desc:'Very slim and silver, with a green-blue back, a bright side line and a big eye.', make:() => fish({ top:'#3e7a7b', prof:[[-4.7, 0], [-4.1, .3], [-2.2, 1], [0, 1.35], [2.4, 1.25], [3.9, .8], [4.8, 0]], eye:[3.3, .24, .62, .36], scale:2.3, tail:[2.4, .8], fins:[[1.8, .7, -.5, .9, .6]],
    paint:(x, u) => Math.abs(u) < .13 ? C.set('#f6fbfb') : mix('#357376', '#e6eef0', sst(0, -.5, u))})},
  {key:'mackerel', name:'Mackerel', desc:'Green-blue with dark tiger stripes on the back and a shining belly.', make:() => fish({ top:'#31716d', prof:[[-5.2, 0], [-4.6, .32], [-2.6, 1.15], [0, 1.75], [2.5, 1.65], [4.2, 1], [5.2, 0]], eye:[3.6, .32, .8], scale:2.3, tail:[2.8, .75], fork:.72, fins:[[1.9, .7, 1, 1.15, .6], [1.5, .6, -1.5, 1.05, .6]],
    paint:(x, u) => { const st = Math.sin(x*4.6 + u*3.4 + Math.sin(u*7)*.8); return mix(st > .1 ? '#132a36' : '#2e8079', '#f0f4ef', sst(.08, -.28, u)); }})},
  {key:'herring', name:'Herring', desc:'Deep blue on top and bright silver below, with a soft, rounded body.', make:() => fish({ top:'#284e80', prof:[[-4.8, 0], [-4.2, .4], [-2.3, 1.5], [0, 2.2], [2.3, 2], [3.9, 1.1], [4.8, 0]], ys:1.1, zs:.46, eye:[3.4, .35, .6, .36], scale:2.3,
    paint:silver('#26508a', .25)})},
  {key:'mullet', name:'Red mullet', desc:'Rosy red with gold along its side and two feelers under its chin, for finding food in the sand.', make:() => fish({ top:'#d14f46', finC:'#e56f55', prof:[[-4.5, 0], [-4, .45], [-2.2, 1.35], [0, 1.9], [2.2, 1.85], [3.8, 1.3], [4.5, .55], [4.6, 0]], eye:[3.1, .65, .73, .36], scale:2.3,
    paint:(x, u) => Math.abs(u - .05) < .12 ? C.set('#e7bd5a') : mix('#c7443e', '#fbe1d4', sst(-.1, -.6, u)),
    more:g => { for (const sd of [-1, 1]){ const b = soft(new T.CylinderGeometry(.08, .04, 1.7, 5), '#f4d9b6'); b.position.set(4.2, -.72, sd*.25); b.rotation.z = .9; g.add(b); } }})},
  {key:'bream', name:'Gilthead bream', desc:'A deep, flat body of silver with a band of gold between the eyes, loved at Greek tables.', make:() => fish({ top:'#8ea3ac', prof:[[-4.4, 0], [-3.9, .5], [-2, 2], [0, 3.1], [2.1, 2.8], [3.7, 1.7], [4.5, 0]], zs:.38, eye:[2.9, .75, .56, .42], scale:2.3, fins:[[3.1, 1.2, 1.2, 2.35, .9], [2.5, 1.1, -.9, 2.5, .7]], tail:[3, 1],
    paint:(x, u) => { let c = mix('#7f96a0', '#eef3f3', sst(.5, -.4, u)); if (x > 2.6 && x < 3.2 && u > .1) c = C.set('#e8bd42'); if (Math.abs(u) < .4 && Math.sin(u*20) > .78 && x < 2.2) return mix('#7f96a0', '#5e7680', .55); return c; }})},
];
const TUNAS = [
  {key:'bluefin', name:'Bluefin tuna', desc:'The giant the Greeks painted on their coins: midnight blue, silver below, with a row of yellow finlets.', make:() => fish({ top:'#1a2c55', prof:PROF_TUNA, zs:.82, eye:[4, .85, 1.75, .36], scale:3.4, tail:[4.8, .95], fork:.82, pect:[3.2, .7, 3, .3, 1.8],
    fins:[[3, 1, .9, 2.8, .6], [3.3, 1, -1.6, 2.5, .3]], bellyFins:[[3.1, 1, -1.8, -2.4]], paint:silver('#16264d', .18), more:g => finlets(g, -2.8, 1.75, 5, '#e6c541')})},
  {key:'yellowfin', name:'Yellowfin tuna', desc:'A streak of gold along its side and very long curved yellow fins.', make:() => fish({ top:'#1f3b67', dorsalC:'#ecc032', finC:'#1f3b67', pectC:'#2b4a78', prof:PROF_TUNA, zs:.76, eye:[4, .85, 1.62, .36], scale:3.4, tail:[4.7, .85], fork:.84, pect:[4.2, .7, 3, .25, 1.7],
    fins:[[2.6, .8, 1, 2.7, .6], [6, 1, -1.6, 2.35, .1]], bellyFins:[[6, 1, -1.8, -2.25]], paint:(x, u) => Math.abs(u - .1) < .1 ? C.set('#ecc032') : mix('#1c3560', '#eef1f0', sst(.03, -.4, u)), more:g => finlets(g, -3, 1.65, 5, '#ecc032')})},
  {key:'albacore', name:'Albacore', desc:'The longfin: slim tuna with sword-like side fins nearly as long as half its body.', make:() => fish({ top:'#2c466b', prof:[[-6, 0], [-5.4, .28], [-3.6, 1.15], [-1, 2.3], [1.6, 2.6], [3.6, 2.15], [5, 1.25], [5.8, .45], [6, 0]], zs:.8, eye:[4, .75, 1.5, .34], scale:3.4, tail:[4.1, .8], fork:.82, pect:[6.8, .6, 2.8, .2, 1.45],
    fins:[[2.5, .9, 1, 2.3, .6], [2.2, .8, -1.4, 2.1, .3]], paint:silver('#29405f', .12), more:g => finlets(g, -2.9, 1.42, 5, '#d8dee0')})},
  {key:'bonito', name:'Atlantic bonito', desc:'Small and fast, with long dark stripes running down its blue-green back.', make:() => fish({ top:'#2d5c70', prof:[[-5.8, 0], [-5.2, .26], [-3.5, 1], [-1, 1.95], [1.6, 2.2], [3.5, 1.85], [4.9, 1.05], [5.7, .35], [5.9, 0]], zs:.72, eye:[4, .62, 1.13, .33], scale:3.4, tail:[3.6, .75], fork:.8, pect:[1.9, .5, 3, .1, 1.2],
    fins:[[2.2, 1.5, .4, 1.85, .95], [1.5, .6, -1.5, 1.8, .4]], paint:(x, u, s) => { const k = Math.abs(s)*7 + x*.04; return u > .08 ? (Math.sin(k*3.1) > .25 ? C.set('#101f2c') : C.set('#3a7a87')) : mix('#92aeb6', '#f1f5f4', sst(.08, -.3, u)); }})},
  {key:'tunny', name:'Little tunny', desc:'A small tuna with wild wavy lines on its back, and a few dark spots under its side fin.', make:() => fish({ top:'#2a5668', prof:[[-5.4, 0], [-4.9, .3], [-3.3, 1.2], [-1, 2.25], [1.4, 2.5], [3.2, 2.05], [4.5, 1.2], [5.2, .4], [5.4, 0]], zs:.8, eye:[3.6, .75, 1.45, .33], scale:3.4, tail:[3.5, .8], fork:.8, pect:[2.1, .55, 2.7, .1, 1.5],
    fins:[[2.3, 1.2, .4, 2.1, .9], [1.5, .6, -1.5, 2, .4]], paint:(x, u, s) => { if (u > .15 && x < 1.5){ return Math.sin(x*3 + Math.sin(s*7)*1.8 + u*6) > 0 ? C.set('#112936') : C.set('#3f8a95'); } const sp = Math.hypot((x - 1.6)*1.6, (u + .12)*4) < 1 && Math.sin(x*9 + s*7) > .5; return sp ? C.set('#1c2a31') : mix('#3f8a95', '#f0f4f3', sst(.2, -.2, u)); }})},
];
const SWORDS = [
  {key:'bluemarlin', name:'Blue marlin', desc:'A huge cobalt hunter with a pointed spear and a tall fin at the front of its back.', make:() => fish({ top:'#1f3e8c', prof:[[-7.2, 0], [-6.5, .25], [-4, .95], [-1, 1.8], [2, 2.25], [4.3, 1.9], [5.7, 1.1], [6.5, .4], [6.6, 0]], zs:.66, eye:[5, .6, 1, .32], scale:3.4, tail:[4.6, .72], fork:.84, bill:[7.5, .34, '#27365b'], pect:[3.1, .5, 3.9, -.6, 1.2],
    fins:[[4.5, 1.5, 3.1, 1.75, .25], [2.5, .5, -2.6, 1.15, .7]], paint:(x, u) => mix('#1b3585', '#eff4f4', sst(.1, -.3, u))})},
  {key:'sailfish', name:'Sailfish', desc:'The fastest fish in the sea, with a great spotted sail along its whole back.', make:() => fish({ top:'#233f7e', prof:[[-7, 0], [-6.3, .22], [-4, .75], [-1, 1.45], [2, 1.8], [4.3, 1.45], [5.7, .85], [6.4, .3], [6.5, 0]], zs:.66, eye:[5, .48, .75, .3], scale:3.4, tail:[4.1, .66], fork:.84, bill:[7.3, .27, '#293b60'], fins:[], paint:(x, u) => mix('#203a79', '#f2f5f3', sst(.08, -.32, u)),
    more:g => { const sh = new T.Shape(); sh.moveTo(4.2, 1.1); sh.bezierCurveTo(3.8, 6.8, -.6, 6.6, -3.4, 2.7); sh.lineTo(-3.8, .7); sh.lineTo(4.2, .9); const geo = new T.ExtrudeGeometry(sh, {depth:.08, bevelEnabled:false, curveSegments:18}); const p = geo.attributes.position, col = new Float32Array(p.count*3), c = new T.Color(); for (let i = 0; i < p.count; i++){ const sp = Math.sin(p.getX(i)*3.5)*Math.sin(p.getY(i)*3.5) > .55; c.set(sp ? '#142554' : '#2e62b4'); col.set([c.r, c.g, c.b], i*3); } geo.setAttribute('color', new T.BufferAttribute(col, 3)); const m = new T.Mesh(geo, softMat('#ffffff', true)); m.material.side = T.DoubleSide; m.castShadow = true; g.add(m); }})},
  {key:'striped', name:'Striped marlin', desc:'Pale blue bars run down its sides, and they light up when it hunts.', make:() => fish({ top:'#274e8f', prof:[[-7, 0], [-6.3, .24], [-4, .85], [-1, 1.65], [2, 2.05], [4.2, 1.7], [5.6, 1], [6.3, .35], [6.4, 0]], zs:.62, eye:[4.9, .55, .9, .3], scale:3.4, tail:[4.3, .66], fork:.84, bill:[7, .29, '#2d4470'], pect:[3, .46, 3.7, -.55, 1.1],
    fins:[[4, 1.2, 3, 1.55, .35], [2.3, .5, -2.6, 1.05, .7]], paint:(x, u) => { const bar = Math.sin(x*3.4) > .55 && u > -.28; return bar ? C.set('#a9d4ea') : mix('#234987', '#eff4f4', sst(.05, -.34, u)); }})},
  {key:'spearfish', name:'Mediterranean spearfish', desc:'The smallest of the billfish and the one nearest home: slender, with a short spear.', make:() => fish({ top:'#30537a', prof:[[-6.4, 0], [-5.8, .2], [-3.6, .65], [-1, 1.18], [2, 1.45], [4, 1.2], [5.3, .68], [5.9, .25], [6, 0]], zs:.6, eye:[4.6, .38, .64, .28], scale:3.4, tail:[3.5, .55], fork:.82, bill:[2.8, .17, '#30435f'], pect:[1.8, .3, 3.5, -.4, .76],
    fins:[[2.5, 3, .5, 1.05, 1.24], [1.5, .34, -2.6, .75, .7]], paint:(x, u) => mix('#2c4c70', '#f1f4f2', sst(.12, -.28, u))})},
  {key:'blackmarlin', name:'Black marlin', desc:'The heaviest billfish: nearly black, with stiff side fins that never fold down.', make:() => fish({ top:'#1a2232', prof:[[-7.3, 0], [-6.6, .3], [-4, 1.15], [-1, 2.15], [2, 2.65], [4.4, 2.2], [5.8, 1.25], [6.6, .45], [6.7, 0]], zs:.7, eye:[5.1, .68, 1.28, .34], scale:3.4, tail:[4.5, .8], fork:.84, bill:[7.3, .4, '#1c2331'], pect:[4, .6, 3.9, -1, 1.5],
    fins:[[3, 1.6, 3.2, 2.1, .4], [2.5, .5, -2.6, 1.3, .7]], paint:(x, u) => mix('#141b2a', '#cfd6db', sst(-.02, -.42, u))})},
];

// ---------- kraken ----------
function kraken(o){ const g = new T.Group(), body = new T.Group(); g.add(body); g.userData.tents = [];
  const skin = (geo, c) => { if (!o.ghost) return soft(geo, c); const m = new T.Mesh(geo, new T.MeshPhongMaterial({color:c, transparent:true, opacity:.68, shininess:40, specular:new T.Color('#ffffff'), depthWrite:false})); return m; };
  o.spots.forEach(([x, z, lenK = 1, rK = 1], i) => { const piv = new T.Group(), len = (78 + (i*37 % 4)*10)*lenK, a = Math.atan2(-z, -x) + (i % 2 ? .6 : -.6); piv.position.set(x, -4, z); piv.rotation.y = a; body.add(piv);
    const t = skin(tentacleGeo(len, (9 + (i % 3)*1.3)*rK), o.arms[i % o.arms.length]); piv.add(t);
    for (let k = 1; k < 7; k++){ const u = k/8, c = new T.Mesh(new T.SphereGeometry(1.8*(1 - u*.6)*rK, 10, 8), o.glow ? new T.MeshBasicMaterial({color:o.sucker}) : softMat(o.sucker)); c.scale.set(1, .45, 1); c.userData.glow = !!o.glow; c.position.set(len*.32*Math.sin(u*Math.PI*1.15) + 6.5*rK*(1 - u*.8), len*.9*Math.sin(u*Math.PI*.5), 0); t.add(c); }
    if (o.barn) for (let k = 0; k < 7; k++){ const u = .07 + k*.1, s = new T.Mesh(new T.ConeGeometry(2, 2.2, 7), softMat(k % 2 ? '#e7dfca' : '#c9b89a')); s.position.set(len*.32*Math.sin(u*Math.PI*1.15) - 6.5*rK*(1 - u), len*.9*Math.sin(u*Math.PI*.5), (k % 2 ? 2 : -2)*rK); s.rotation.z = 1.4; t.add(s); }
    const ring = new T.Mesh(new T.RingGeometry(11*rK, 20*rK, 28), new T.MeshBasicMaterial({color:'#f4fbff', transparent:true, opacity:.7, depthWrite:false})); ring.rotation.x = -Math.PI/2; ring.position.set(x, 4, z); body.add(ring);
    g.userData.tents.push({piv, ph:i*1.7, ring, delay:(i*.37) % 1}); });
  if (o.head) o.head(body, skin);
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 3, 32, 32, 32); gr.addColorStop(0, 'rgba(8,10,24,.75)'); gr.addColorStop(.55, 'rgba(8,10,24,.5)'); gr.addColorStop(1, 'rgba(8,10,24,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({map:new T.CanvasTexture(c), transparent:true, depthWrite:false, opacity:1})); shadow.rotation.x = -Math.PI/2; shadow.scale.set(380, 320, 1); shadow.position.y = 1.5; shadow.renderOrder = 1; body.add(shadow); g.userData.shadow = shadow; g.userData.body = body; return g; }
const RING = [[0, -150], [110, -100], [150, 15], [100, 120], [-20, 150], [-125, 95], [-155, -20], [-105, -115]];
const KRAKENS = [
  {key:'octopus', name:'Giant octopus', desc:'Eight fiery red arms around a great round head that rises out of the sea to look at you.', make:() => kraken({ spots:RING, arms:['#b53a22', '#c9472b'], sucker:'#f4b7a0',
    head:(b, sk) => { const h = sk(new T.SphereGeometry(52, 28, 20), '#bf3f25'); h.scale.set(1, 1.15, 1); h.position.y = 15; b.add(h); eye(b, 40, 28, 34, 7); }})},
  {key:'squid', name:'Giant squid', desc:'Pale and rose, with a tall pointed body with fins, short arms, and two very long hunting arms.', make:() => kraken({ spots:[[80, 90], [-80, 90], [120, 0, .85, .75], [-120, 0, .85, .75], [60, -95], [-60, -95], [175, 135, 1.85, .62], [-175, 135, 1.85, .62]], arms:['#d98c8b', '#e4a29c'], sucker:'#fff2e2',
    head:(b, sk) => { const geo = new T.LatheGeometry([[0, 205], [14, 170], [28, 120], [40, 70], [47, 30], [50, 6], [46, -6]].map(([r, y]) => new T.Vector2(r, y)), 28); geo.computeVertexNormals(); const h = sk(geo, '#cf7f83'); b.add(h); for (const sd of [-1, 1]){ const f = blade(84, 40, 3.5, .8, -.15, 0, '#c6727b'); f.position.set(0, 150, sd*8); f.rotation.set(0, -sd*Math.PI/2, sd*-.12); b.add(f); } eye(b, 42, 18, 26, 9); }})},
  {key:'abyssal', name:'Abyssal kraken', desc:'From the darkest deep: nearly black, with suckers that glow an eerie blue. Best seen at night.', make:() => kraken({ spots:RING.slice(0, 7), arms:['#14162b', '#1f2040'], sucker:'#5ff2ff', glow:true,
    head:(b, sk) => { const h = sk(new T.SphereGeometry(38, 24, 16), '#15162c'); h.scale.set(1.3, .72, 1.2); h.position.y = 3; b.add(h); for (const sd of [-1, 1]){ const e = new T.Mesh(new T.SphereGeometry(6.5, 12, 10), new T.MeshBasicMaterial({color:'#7dfcff'})); e.userData.glow = true; e.position.set(36, 13, sd*19); b.add(e); } }})},
  {key:'coral', name:'Reef kraken', desc:'Ancient and slow: teal arms crusted with shells and barnacles, as if the sea floor came up with it.', make:() => kraken({ spots:RING.slice(0, 6).map(([x, z]) => [x, z, 1, 1.2]), arms:['#22757c', '#2c8a84'], sucker:'#f0a05e', barn:true,
    head:(b, sk) => { const h = sk(new T.SphereGeometry(44, 24, 16), '#227076'); h.scale.set(1.15, .8, 1.15); h.position.y = 5; b.add(h); for (let i = 0; i < 26; i++){ const a = i*2.4, u = (i + .5)/26, r = Math.sqrt(1 - u*u)*48, c = new T.Mesh(new T.DodecahedronGeometry(3 + i % 4, 0), softMat(['#e69a5a', '#d8cdb2', '#e2706e', '#f1dca6'][i % 4])); c.position.set(Math.cos(a)*r, 5 + u*36, Math.sin(a)*r); b.add(c); } }})},
  {key:'ghost', name:'Ghost kraken', desc:'See-through and pale as moonlight. Sailors swear they have seen right through its arms to the stars.', make:() => kraken({ spots:RING.filter((_, i) => i % 2 === 0).concat([[75, 75], [-75, -75]]), arms:['#d5d7f6', '#e5dcf5'], sucker:'#ffffff', ghost:true,
    head:(b, sk) => { const h = sk(new T.SphereGeometry(40, 24, 16), '#dcdcf9'); h.scale.set(1, 1.4, 1); h.position.y = 26; b.add(h); }})},
];
export const ANIMALS = [
  {name:'Whale', list:WHALES, anim:'whale', y:24, gap:44}, {name:'Dolphin', list:DOLPHINS, anim:'dolphins', y:6, gap:16}, {name:'Kraken', list:KRAKENS, anim:'kraken', gap:80},
  {name:'Sea bird', list:BIRDS, anim:'gulls', gap:16}, {name:'Small fish', list:SMALL, anim:'wiggle', gap:8}, {name:'Tuna', list:TUNAS, anim:'wiggle', gap:8}, {name:'Billfish', list:SWORDS, anim:'wiggle', gap:8},
];

// ---- for the game: one model of a species, cached and copied ----
const ALL = {}; for (const A of ANIMALS) for (const a of A.list) ALL[a.key + (A.name === 'Billfish' && a.key === 'striped' ? 'marlin' : '')] = a;
const tmpl = {}; const master = key => tmpl[key] || (tmpl[key] = ALL[key].make());
export const animal = key => ALL[key].make();
// fish and birds are many, so they are copies that share their shapes
export function fishCopy(key, scale = .85){ const c = master(key).clone(); c.scale.setScalar(scale); return c; }
export function birdCopy(key){ const c = master(key).clone(), m = c.children[0]; m.morphTargetInfluences = [0]; c.userData.flap = v => { m.morphTargetInfluences[0] = Math.max(-.5, v); }; c.userData.wings = []; return c; }
export const SMALL_FISH = SMALL.map(a => a.key), TUNA_FISH = TUNAS.map(a => a.key), BILL_FISH = ['bluemarlin', 'sailfish', 'stripedmarlin', 'spearfish', 'blackmarlin'], SEA_BIRDS = BIRDS.map(a => a.key);
