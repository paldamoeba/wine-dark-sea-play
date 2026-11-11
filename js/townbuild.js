// P111 (Nicholas: "The city is not good. Should be more random."): a harbor town laid out like an old Greek coastal town
// instead of a grid. A market square (agora) sits just behind the pier; a few winding lanes leave it and follow the ground
// (they bend away from sand, rock and the fortress); a waterfront lane runs along the shore; houses of different sizes and
// heights line the lanes at loose angles, packed near the water and thinning out inland, with gaps where trees stand; the
// temple stands on the high ground (the hilltop if the town has one near, else a stepped platform at the top of the town)
// with the city's god in front. Used by entities.js for every town; the size comes from townSize().
import {CITIES, PIER_LEN, inPoly, siteClear, GREAT_CITIES} from './world.js?v=32e89d7';
import {mesh, cypress, roundTree, CYPRESS_TINTS, ROUND_TINTS, house, temple, farm, amphoraGeo, stall, well, stoa, crane, lighthouse, LIGHT_Y} from './models.js?v=32e89d7';
import {statue, torch, buildShip, TORCH_ROOTS} from './ships.js?v=32e89d7';
import {addTown} from './town.js?v=32e89d7';
import {mergeStatic} from './merge.js?v=32e89d7';
const mergeShip = sh => { try { mergeStatic(sh); } catch (e){} };

const T = window.THREE;
// How far inside an outline a point is (0 or less = outside).
export function depthIn(pts, x, z){ if (!inPoly(pts, x, z)) return 0; let best = Infinity;
  for (let i=0;i<pts.length;i++){ const [ax, az] = pts[i], [bx, bz] = pts[(i+1) % pts.length], dx = bx-ax, dz = bz-az;
    const t = Math.max(0, Math.min(1, ((x-ax)*dx + (z-az)*dz)/(dx*dx + dz*dz || 1))); best = Math.min(best, Math.hypot(x - ax - dx*t, z - az - dz*t)); }
  return best; }
// A random spot at least `margin` inside the outline, near (cx, cz) if given.
export function spotIn(R, pts, margin, cx = 0, cz = 0, rad = Infinity){
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const x0 = Math.max(Math.min(...xs), cx - rad), x1 = Math.min(Math.max(...xs), cx + rad), z0 = Math.max(Math.min(...zs), cz - rad), z1 = Math.min(Math.max(...zs), cz + rad);
  for (let k=0;k<200;k++){ const x = x0 + R()*(x1 - x0), z = z0 + R()*(z1 - z0); if (Math.hypot(x - cx, z - cz) <= rad && depthIn(pts, x, z) >= margin) return [x, z]; }
  return null;
}

// The great cities (Sparta's three and Athens's three strongholds, and the two capitals) are big; the other city islands
// with a fortress are middling; the free harbors near Kallisto, and Kallisto itself, stay the size they were.
export const TOWN_SIZES = {
  great: {houses:96, len:640, side:300, branches:7, reach:520, trees:26, farms:7, people:16, agora:50, temple:1.2, stalls:8, stoa:7},
  // Rhodes: a long coastal city lining the shore behind the Arena (the waterfront lanes run the whole width of the basin)
  rhodes:{coast:.3, houses:150, len:520, side:300, branches:8, reach:880, trees:30, farms:7, people:18, agora:54, temple:1.25, stalls:9, stoa:7},
  medium:{houses:46, len:420, side:220, branches:4, reach:360, trees:16, farms:5, people:10, agora:40, temple:1, stalls:5, stoa:5},
  small: {houses:16, len:300, side:150, branches:3, reach:260, trees:10, farms:3, people:6, agora:30, temple:.8, stalls:3, stoa:0},
  port:  {houses:22, len:300, side:150, branches:3, reach:260, trees:14, farms:4, people:9, agora:32, temple:.8, stalls:4, stoa:0}};
export const townSize = is => is.port ? 'port' : is.name === 'Rhodes' ? 'rhodes' : GREAT_CITIES.includes(is.name) || is.capital ? 'great' : is.city && is.site ? 'medium' : 'small';

const STEP = 22, STONE = '#e2d3ae', LANE = '#d6c59c';
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
// a flat paved strip along a bent line (one piece), w wide
function ribbon(pts, w, y){ const n = pts.length, pos = new Float32Array(n*6), nor = new Float32Array(n*6), idx = [];
  for (let i=0;i<n;i++){ const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(n - 1, i + 1)], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az)/L, nz = (bx - ax)/L, [x, z] = pts[i];
    pos.set([x + nx*w/2, y, z + nz*w/2, x - nx*w/2, y, z - nz*w/2], i*6); nor.set([0, 1, 0, 0, 1, 0], i*6);
    if (i < n - 1) idx.push(i*2, i*2 + 2, i*2 + 1, i*2 + 1, i*2 + 2, i*2 + 3); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setIndex(idx); return geo; }
// a flat paved patch with an uneven edge
function patch(R, r, y, n = 14){ const pos = [0, y, 0], nor = [0, 1, 0], idx = [];
  for (let i=0;i<n;i++){ const a = i/n*Math.PI*2, rr = r*(.88 + R()*.24); pos.push(Math.cos(a)*rr, y, Math.sin(a)*rr); nor.push(0, 1, 0); idx.push(0, 1 + (i + 1) % n, 1 + i); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setIndex(idx); return geo; }

// ctx: {top, hillTop, R, ground, hill, popIn, flags}. Returns where a tree may stand (off the lanes, away from houses and the square).
export function buildTown(is, g, PIER, ctx){
  const {top, hillTop, R, ground, hill, popIn, flags} = ctx, Z = TOWN_SIZES[townSize(is)];
  const style = is.port ? null : is.city === 'sparta' ? 'sparta' : is.city === 'athens' ? 'athens' : null;
  const px = PIER.x - is.x, pz = PIER.y - is.y, ang = Math.atan2(PIER.dy, PIER.dx);
  const paved = (geo, y, col = STONE) => { const m = mesh(geo, col, {side:T.DoubleSide}, false); m.position.y = y || 0; g.add(m); return m; };
  // houses stay on the flat grass, off the hilltop and the fortress
  const off = hill ? (x, z) => inPoly(hill, x, z) : () => false, flat = (p, m) => p && !off(p[0], p[1]) && siteClear(is, p[0], p[1]) && depthIn(ground, p[0], p[1]) >= m;
  // the widest ground near the pier (farms and townspeople gather round it)
  let cx = px - PIER.dx*60, cz = pz - PIER.dy*60, best = 0;
  for (let k=0;k<300;k++){ const p = spotIn(R, ground, 1, px, pz, Z.reach); if (!p) continue; const d = depthIn(ground, p[0], p[1]); if (d > best){ best = d; cx = p[0]; cz = p[1]; } }
  const ux = -PIER.dx, uz = -PIER.dy, vx = -uz, vz = ux, hu = Math.atan2(uz, ux), keep = [], blocks = []; // u = inland from the pier, v = along the shore
  // P107: the town starts where the grass does (on 8 islands the beach in front of the pier is wide)
  let s0 = 24; while (s0 < 220 && !flat([px + ux*(s0 + 20), pz + uz*(s0 + 20)], 10)) s0 += 10;
  const fx = px + ux*(s0 + 14), fz = pz + uz*(s0 + 14); // the waterfront, in front of the pier
  // ---- the market square, just behind the waterfront ----
  let agR = Z.agora; while (agR > 18 && !flat([fx + ux*(agR + 4), fz + uz*(agR + 4)], agR*.55)) agR -= 6;
  const hasAgora = agR > 18, ax = fx + ux*(agR + 4), az = fz + uz*(agR + 4);
  // ---- lanes: each one wanders, bending away from ground it can't use, and stops where it meets another ----
  const lanes = [];
  const nearLane = (x, z, m, skip) => lanes.some(L => L !== skip && L.pts.some(([a, b]) => Math.abs(a - x) < m && Math.abs(b - z) < m && Math.hypot(a - x, b - z) < m));
  function grow(x, z, h, maxLen, w, o = {}){ const L = {pts:[[x, z]], w}, h0 = h; let len = 0;
    while (len < maxLen){ h += (R() - .5)*(o.wig ?? .6) + wrap(h0 - h)*.14; let pick = null, ps = 1e9;
      for (const d of [0, .35, -.35, .7, -.7, 1.05, -1.05, 1.4, -1.4]){ const a = h + d, nx = x + Math.cos(a)*STEP, nz = z + Math.sin(a)*STEP; if (!flat([nx, nz], o.m ?? 14)) continue;
        const sc = Math.abs(d) + (o.shore ? Math.abs(depthIn(ground, nx, nz) - o.shore)*.05 : 0); if (sc < ps){ ps = sc; pick = [nx, nz, a]; } if (!o.shore) break; }
      if (!pick) break; [x, z, h] = pick;
      if (L.pts.length > 4 && L.pts.slice(0, -3).some(([a, b]) => Math.hypot(a - x, b - z) < 44)) break; // never curls back onto itself
      L.pts.push([x, z]); len += STEP;
      if (L.pts.length > 3 && nearLane(x, z, 30, L)) break; } // runs into another lane: they join there
    if (L.pts.length > 2) lanes.push(L); return L; }
  const headAt = (L, i) => { const [a, b] = L.pts[Math.max(0, i - 1)], [c, d] = L.pts[Math.min(L.pts.length - 1, i + 1)]; return Math.atan2(d - b, c - a); };
  const main = grow(hasAgora ? ax : fx, hasAgora ? az : fz, hu, Z.len, 15, {wig:.7});
  for (const sg of [1, -1]) grow(fx + ux*8, fz + uz*8, hu + sg*Math.PI/2, Z.reach*.95, 12, {shore:26, wig:.3, m:12}); // the waterfront, both ways
  if (hasAgora) for (const sg of [1, -1]) grow(ax, az, hu + sg*(.8 + R()*.35), Z.len*.7, 12);
  { const n = main.pts.length, gap = Math.max(2, Math.floor(n/(Z.branches/2 + 1))); let sg = R() < .5 ? 1 : -1, made = 0;
    for (let i = gap; i < n - 1 && made < Z.branches; i += gap) for (let k = 0; k < 2 && made < Z.branches; k++, sg = -sg, made++) grow(main.pts[i][0], main.pts[i][1], headAt(main, i) + sg*(1.15 + R()*.5), Z.side, 11); }
  if (Z.houses > 40) for (const L of [...lanes]){ if (L === main || L.pts.length < 9) continue; const i = 4 + Math.floor(R()*(L.pts.length - 6)); grow(L.pts[i][0], L.pts[i][1], headAt(L, i) + (R() < .5 ? 1 : -1)*(1.2 + R()*.4), Z.side*.6, 10); } // back alleys in the big towns
  const segs = [], setSegs = () => { segs.length = 0; for (const L of lanes) for (let i = 0; i + 1 < L.pts.length; i++) segs.push([L.pts[i][0], L.pts[i][1], L.pts[i+1][0], L.pts[i+1][1], L.w]); }; setSegs();
  // how far (x, z) is from the edge of the nearest lane (0 or less = on it)
  const laneGap = (x, z) => { let b = 1e9; for (const [x0, z0, x1, z1, w] of segs){ if (Math.abs(x - x0) > 90 + b || Math.abs(z - z0) > 90 + b) continue; const dx = x1 - x0, dz = z1 - z0, t = Math.max(0, Math.min(1, ((x - x0)*dx + (z - z0)*dz)/(dx*dx + dz*dz || 1))); b = Math.min(b, Math.hypot(x - x0 - dx*t, z - z0 - dz*t) - w/2); } return b; };
  if (hasAgora){ const sq = paved(patch(R, agR, 0), top + 1.1); sq.position.x = ax; sq.position.z = az; blocks.push([ax, az, agR + 4]);
    const w = well(); w.position.set(ax + vx*agR*.18, top + 1, az + vz*agR*.18); g.add(w); keep.push([w.position.x, w.position.z]);
    // stalls round the rim, facing the middle, leaving the lanes' mouths open
    const mouths = lanes.filter(L => Math.hypot(L.pts[0][0] - ax, L.pts[0][1] - az) < 2).map(L => headAt(L, 1)); mouths.push(hu + Math.PI);
    for (let k = 0, n = 0; k < 16 && n < Z.stalls; k++){ const a = hu + .5 + k/16*Math.PI*2; if (mouths.some(m => Math.abs(wrap(m - a)) < .42)) continue; const sx = ax + Math.cos(a)*agR*.74, sz = az + Math.sin(a)*agR*.74;
      const st = stall(n + Math.floor(R()*5)); st.position.set(sx, top + 1, sz); st.rotation.y = -a + Math.PI/2; g.add(st); keep.push([sx, sz]); n++; k++; }
    // a colonnade along one side in the bigger towns, its columns facing the square
    if (Z.stoa) for (const sg of [1, -1]){ const a = hu + sg*2.25, d = agR + 13, sx = ax + Math.cos(a)*d, sz = az + Math.sin(a)*d, hl = Z.stoa*5.5;
      const pts = [-1, -.5, 0, .5, 1].map(f => [sx - Math.sin(a)*hl*f, sz + Math.cos(a)*hl*f]); if (!pts.every(p => flat(p, 14) && laneGap(p[0], p[1]) > 9)) continue;
      const so = stoa(Z.stoa, style); so.position.set(sx, top, sz); so.rotation.y = -a + Math.PI; g.add(so); for (const p of pts){ blocks.push([p[0], p[1], 15]); keep.push(p); } break; } }
  // ---- the temple, on the high ground: the hilltop if one is near, else a stepped platform at the top of the town ----
  const end = main.pts[main.pts.length - 1], tk = Z.temple, clearOfFort = (x, z, m) => !is.site || Math.hypot(x + is.x - is.site.x, z + is.y - is.site.y) > is.site.R + m;
  let tp = null, ty = top, onHill = false;
  if (hill && lanes.length){ let bd = 1e9; for (let k=0;k<160;k++){ const p = spotIn(R, hill, 34*tk + 12, cx, cz, Z.reach + 320); if (!p || !clearOfFort(p[0], p[1], 90*tk) || !siteClear(is, p[0], p[1])) continue;
      const d = Math.hypot(p[0] - ax, p[1] - az); if (d < bd && d > agR + 90){ bd = d; tp = p; } }
    if (tp){ ty = hillTop; onHill = true; } }
  if (!tp){ const hE = headAt(main, main.pts.length - 1), t0 = [end[0] + Math.cos(hE)*40*tk, end[1] + Math.sin(hE)*40*tk]; if (lanes.length && flat(t0, 30*tk) && laneGap(t0[0], t0[1]) > 20){ tp = t0; main.min = main.pts.length; }
    for (let k=0;k<120 && !tp;k++){ const p = spotIn(R, ground, 30*tk, cx, cz, Z.reach*.9); if (flat(p, 30*tk) && laneGap(p[0], p[1]) > 26*tk && Math.hypot(p[0] - ax, p[1] - az) > agR + 50) tp = p; } }
  let tface = hu + Math.PI; // the way the temple looks: down toward the square
  if (tp){ tface = Math.atan2(az - tp[1], ax - tp[0]); const c = Math.cos(tface), s = Math.sin(tface), base = onHill ? ty : ty + 6;
    if (onHill){ const tr = paved(patch(R, 36*tk, 0, 12), ty + .6); tr.position.x = tp[0]; tr.position.z = tp[1];
      // a stair down the slope toward the town, and a path from its foot to the nearest lane
      let e = 0; while (e < 400 && inPoly(hill, tp[0] + c*e, tp[1] + s*e)) e += 4; const n = Math.max(3, Math.ceil((ty - top)/2.6)), run = 3.4;
      if (e < 400 && siteClear(is, tp[0] + c*e, tp[1] + s*e)){ for (let k = 0; k < n; k++){ const d = e - 13 + k*run, hgt = (ty - top)*(1 - (k + .5)/n) + 1.4, st = mesh(new T.BoxGeometry(run + .3, hgt, 16), '#d8ccb0'); st.position.set(tp[0] + c*d, top + hgt/2 - .4, tp[1] + s*d); st.rotation.y = -tface; g.add(st); }
        const foot = [tp[0] + c*(e - 13 + n*run), tp[1] + s*(e - 13 + n*run)]; let near = null, nd = 260, nl = null, ni = 0; for (const L of lanes) L.pts.forEach((p, i) => { const d = Math.hypot(p[0] - foot[0], p[1] - foot[1]); if (d < nd){ nd = d; near = p; nl = L; ni = i; } });
        if (near && nd > 14){ const pts = [], m = Math.ceil(nd/STEP); for (let k = 0; k <= m; k++) pts.push([foot[0] + (near[0] - foot[0])*k/m, foot[1] + (near[1] - foot[1])*k/m]); if (pts.every(p => !off(p[0], p[1]) && depthIn(ground, p[0], p[1]) > 4)){ nl.min = Math.max(nl.min || 0, ni + 1); lanes.push({pts, w:9, min:pts.length}); setSegs(); } }
        paved(ribbon([[tp[0] + c*30*tk, tp[1] + s*30*tk], [tp[0] + c*(e - 10), tp[1] + s*(e - 10)]], 12, ty + .6)); } }
    else for (const [k, h] of [[1, 0], [.88, 3]]){ const st = mesh(new T.BoxGeometry(62*tk*k, 3, 46*tk*k), '#e9e2cf'); st.position.set(tp[0], ty + h + 1.5, tp[1]); st.rotation.y = -tface; g.add(st); }
    const t = temple(); t.position.set(tp[0], base, tp[1]); t.scale.setScalar(tk); t.rotation.y = -tface; g.add(t); blocks.push([tp[0], tp[1], 34*tk], [tp[0] + c*18*tk, tp[1] + s*18*tk, 26*tk], [tp[0] - c*18*tk, tp[1] - s*18*tk, 26*tk]); keep.push(tp, [tp[0] + c*18*tk, tp[1] + s*18*tk], [tp[0] - c*18*tk, tp[1] - s*18*tk]);
    // the city's god in front of its temple: Athena for Athens, Apollo for Sparta, Poseidon at Kallisto
    const gd = statue(is.port ? 'poseidon' : is.city === 'sparta' ? 'apollo' : 'athena', !is.port && R() < .5 ? 'marble' : 'painted'), sx = tp[0] + c*(onHill ? 30 : 42)*tk, sz = tp[1] + s*(onHill ? 30 : 42)*tk;
    gd.position.set(sx, onHill ? ty : top, sz); gd.scale.setScalar(.45*Math.sqrt(tk)); gd.rotation.y = -tface; g.add(gd); keep.push([sx, sz]); blocks.push([sx, sz, 12]); popIn(gd); }
  // ---- houses: slots along both sides of every lane (and some in a second row), filled from the water inland ----
  const cands = [];
  lanes.forEach((L, li) => { for (let i = 0; i + 1 < L.pts.length; i++){ const [x0, z0] = L.pts[i], [x1, z1] = L.pts[i+1], len = Math.hypot(x1 - x0, z1 - z0) || 1, tx = (x1 - x0)/len, tz = (z1 - z0)/len, mx = (x0 + x1)/2, mz = (z0 + z1)/2;
      for (const sd of [1, -1]){ const sc = .8 + R()*R()*.62, o1 = L.w/2 + 11.5*sc + 1 + R()*5, j = (R() - .5)*8, x = mx - tz*sd*o1 + tx*j, z = mz + tx*sd*o1 + tz*j;
        cands.push({x, z, sc, face:Math.atan2(-tx*sd, tz*sd) + (R() - .5)*.4, li, i});
        if (R() < .34){ const s2 = .8 + R()*.4, o2 = o1 + 12*sc + 12*s2 + 3 + R()*8; cands.push({x:mx - tz*sd*o2 + tx*j, z:mz + tx*sd*o2 + tz*j, sc:s2, face:Math.atan2(-tx*sd, tz*sd) + (R() - .5)*1.3, li, i, back:true}); } } } });
  for (const c of cands){ const du = (c.x - fx)*ux + (c.z - fz)*uz, dv = (c.x - fx)*vx + (c.z - fz)*vz; c.d = Math.hypot(du, dv*(Z.coast || 1)); /* coast: a city strung along its shore fills sideways first */ c.key = c.d + R()*90 + (c.back ? 40 : 0); }
  cands.sort((a, b) => a.key - b.key);
  const placed = [];
  for (const h of cands){ if (placed.length >= Z.houses) break; const rad = 12.5*h.sc;
    if (h.d > 130 && (R() > 1 - .5*Math.min(1, h.d/Z.reach) || Math.sin(h.li*12.9 + Math.floor(h.i/3)*78.2)*43758.5 % 1 > .76)) continue; // thinner inland, with gaps
    if (!flat([h.x, h.z], rad + 1) || laneGap(h.x, h.z) < rad*.82 || Math.hypot(h.x - px, h.z - pz) < 40 || blocks.some(([bx, bz, br]) => Math.hypot(bx - h.x, bz - h.z) < br + rad) || placed.some(q => Math.hypot(q.x - h.x, q.z - h.z) < q.rad + rad + 1.5)) continue;
    const k = placed.length, kinds = h.d < 170 ? [3, 0, 3, 1, 2, 0, 3, 1] : [0, 1, 0, 2, 3, 0, 1, 2], o = house(kinds[Math.floor(R()*8)], style, k >= 24);
    o.position.set(h.x, top, h.z); o.rotation.y = -h.face; o.scale.set(h.sc*(.92 + R()*.16), (.85 + R()*.4)*(h.d < 170 ? 1.12 : 1)*Math.sqrt(h.sc), h.sc*(.92 + R()*.2)); g.add(o); popIn(o); placed.push({x:h.x, z:h.z, rad}); }
  keep.push(...placed.map(q => [q.x, q.z]));
  // a lane ends a little past its last house (no long empty lanes running off into the fields), then all are paved
  for (const L of [...lanes]){ let last = -1; L.pts.forEach(([x, z], i) => { if (placed.some(q => Math.abs(q.x - x) < 46 && Math.abs(q.z - z) < 46)) last = i; });
    const n = Math.max(L.min || 0, last + 2); if (n < 3 && !L.min){ lanes.splice(lanes.indexOf(L), 1); continue; } L.pts.length = Math.min(L.pts.length, n); }
  setSegs();
  for (const L of lanes){ paved(ribbon(L.pts, L.w, top + .9), 0, LANE); for (const [x, z] of [L.pts[0], L.pts[L.pts.length - 1]]){ const c = paved(new T.CircleGeometry(L.w/2, 10).rotateX(-Math.PI/2), top + .9, LANE); c.position.x = x; c.position.z = z; } }
  // trees in the gaps between houses and along the edge of town
  const tree = () => R() < .5 ? cypress(CYPRESS_TINTS[Math.floor(R()*CYPRESS_TINTS.length)]) : roundTree(ROUND_TINTS[Math.floor(R()*ROUND_TINTS.length)], Math.floor(R()*9));
  for (let k=0, n=0;k<Z.trees*12 && n<Z.trees;k++){ const p = spotIn(R, ground, 10, cx, cz, Z.reach*.8);
    if (!flat(p, 10) || keep.some(([hx, hz]) => Math.hypot(hx - p[0], hz - p[1]) < 20) || laneGap(p[0], p[1]) < 6 || blocks.some(([bx, bz, br]) => Math.hypot(bx - p[0], bz - p[1]) < br + 6)) continue;
    const c = tree(); c.position.set(p[0], top, p[1]); c.scale.setScalar(.7 + R()*.3); g.add(c); popIn(c); keep.push(p); n++; }
  // little farms just outside town: vineyards, olive groves, wheat and vegetables, turned to face the town. Their whole field stays off the rock.
  for (let k=0, n=0, kind=Math.floor(R()*4); k<300 && n<Z.farms; k++){ const p = spotIn(R, ground, 26, cx, cz, Z.reach + 80);
    if (!flat(p, 26) || [[30, 0], [-30, 0], [0, 30], [0, -30], [22, 22], [-22, 22], [22, -22], [-22, -22]].some(([a, b]) => off(p[0] + a, p[1] + b) || !siteClear(is, p[0] + a, p[1] + b)) || Math.hypot(p[0] - ax, p[1] - az) < agR + 60 || keep.some(([hx, hz]) => Math.hypot(hx - p[0], hz - p[1]) < (is.port ? 36 : 42)) || laneGap(p[0], p[1]) < 30 || Math.hypot(p[0] - px, p[1] - pz) < 70 || blocks.some(([bx, bz, br]) => Math.hypot(bx - p[0], bz - p[1]) < br + 34)) continue;
    const f = farm(kind++); f.position.set(p[0], top, p[1]); f.rotation.y = -Math.atan2(cz - p[1], cx - p[0]); g.add(f); popIn(f); keep.push(p, [p[0] + 16, p[1]], [p[0] - 16, p[1]], [p[0], p[1] + 16], [p[0], p[1] - 16]); n++; }
  let sp = null; for (let k=0;k<60 && !sp;k++){ const p = spotIn(R, ground, 8, px - PIER.dx*30, pz - PIER.dy*30, 60); if (p && keep.every(([hx, hz]) => Math.hypot(hx - p[0], hz - p[1]) > 24) && laneGap(p[0], p[1]) > 3) sp = p; }
  if (!is.port && sp){ // a flagpole by the pier with the owner's colors
    const pole = mesh(new T.CylinderGeometry(1, 1.2, 46, 5), '#6e4a26'); pole.position.set(sp[0], top + 23, sp[1]); g.add(pole);
    const flag = new T.Mesh(new T.PlaneGeometry(22, 14), new T.MeshBasicMaterial({color:CITIES[is.city || 'athens'].color, side:T.DoubleSide}));
    flag.position.set(sp[0] + 11, top + 39, sp[1]); g.add(flag); flags.push({is, flag, c:is.city}); sp = null; }
  if (sp){ const st = statue('poseidon', 'painted'); st.position.set(sp[0], top, sp[1]); st.scale.setScalar(.55); st.rotation.y = -ang + Math.PI/2; g.add(st); keep.push(sp); }
  // townspeople walk the middle of town (off the houses; lanes and the square are theirs)
  { let mx = ax, mz = az; if (placed.length){ mx = placed.reduce((q, p) => q + p.x, 0)/placed.length; mz = placed.reduce((q, p) => q + p.z, 0)/placed.length; }
    addTown(is, g, top, keep, Z.people, {cx:(mx + ax)/2, cz:(mz + az)/2, R:Math.max(110, Z.reach*.5), ok:(x, z) => depthIn(ground, x, z) > 8 && !off(x, z) && blocks.every(([bx, bz, br], i) => i === 0 || Math.hypot(bx - x, bz - z) > br)}); }
  const onRoad = (x, z, m) => laneGap(x, z) < m;
  // P112: steps from the pier up onto the town's ground, a paved way across the sand to them, and on to the square
  { let e = 0; while (e < 260 && !inPoly(ground, px + ux*e, pz + uz*e)) e += 2; const n = Math.max(2, Math.ceil((top - 4.6)/2.6)), run = 3.2, e0 = e + 7 - n*run;
    if (e < 260){ for (let k = 0; k < n; k++){ const d = e0 + (k + .5)*run, hgt = (top - 4)*(k + 1)/n + .9, st = mesh(new T.BoxGeometry(run + .3, hgt, 22), '#d8ccb0'); st.position.set(px + ux*d, 4 + hgt/2 - .4, pz + uz*d); st.rotation.y = -hu; g.add(st); }
      if (e0 > 10){ const w = mesh(new T.BoxGeometry(e0 + 4, 1, 18), STONE, {}, false); w.position.set(px + ux*(e0/2 - 2), 4.2, pz + uz*(e0/2 - 2)); w.rotation.y = -hu; g.add(w); }
      const to = hasAgora ? [ax, az] : [fx, fz], from = [px + ux*(e + 6), pz + uz*(e + 6)]; if (Math.hypot(to[0] - from[0], to[1] - from[1]) > 8) paved(ribbon([from, to], 18, top + .95)); } }
  // the pier: starts a little inland and runs out over the water
  const pier = new T.Group(); pier.position.set(px, 0, pz); pier.rotation.y = -ang; g.add(pier);
  if ((PIER.w || 18) > 18){ /* P117 (Nicholas: "too many, make one big"): a great port's one broad pier: stone below, planks on top, cargo down the middle */
    const W = PIER.w, Lp = PIER_LEN + 30, stone = mesh(new T.BoxGeometry(Lp, 12, W), '#d9c9a2'); stone.position.set(PIER_LEN/2 - 15, .6, 0); pier.add(stone);
    const planks = mesh(new T.BoxGeometry(Lp - 4, 1.2, W - 10), '#9b6b3a', {}, false); planks.position.set(PIER_LEN/2 - 15, 7.1, 0); pier.add(planks);
    const head = mesh(new T.BoxGeometry(26, 12, W + 16), '#d9c9a2'); head.position.set(PIER_LEN + 2, .6, 0); pier.add(head);
    for (let k=0;k<=5;k++) for (const z of [-W/2 + 3, W/2 - 3]){ const post = mesh(new T.CylinderGeometry(1.8, 2.1, 5, 6), '#5a4630'); post.position.set(8 + k*(PIER_LEN - 10)/5, 9, z); pier.add(post); }
    for (let k=0;k<6;k++){ const a = mesh(amphoraGeo, ['#b8693a', '#c98a4b', '#a85c34'][k % 3], {flatShading:false}); a.scale.setScalar(.7); a.position.set(22 + (k % 3)*7, 8.2, -4 + Math.floor(k/3)*8); pier.add(a); }
    for (let k=0;k<4;k++){ const up = k === 3, c = mesh(new T.BoxGeometry(9, 8, 9), k % 2 ? '#8a6238' : '#9b6b3a'); c.position.set(62 + (up ? 5 : k*10), 11.7 + (up ? 8 : 0), up ? 1 : (k % 2)*4 - 2); c.rotation.y = k*.4; pier.add(c); }
    const cr = crane(); cr.position.set(PIER_LEN - 4, 6.6, 0); cr.rotation.y = Math.PI/2; pier.add(cr);
  } else {
  const deck = mesh(new T.BoxGeometry(PIER_LEN + 30, 3, 18), '#9b6b3a'); deck.position.set(PIER_LEN/2 - 15, 6, 0); pier.add(deck);
  for (let k=0;k<=5;k++) for (const z of [-8, 8]){ const post = mesh(new T.CylinderGeometry(1.4, 1.4, 16, 5), '#6e4a26'); post.position.set(k*PIER_LEN/5, 1, z); pier.add(post); } }
  // P110: a big harbor (Crete): two side piers with cargo on them, a stone quay joining the three at the shore, and warehouses behind
  for (const xp of (is.portx && is.portx.piers) || []){ const q = new T.Group(), qx = xp.x - is.x, qz = xp.y - is.y; q.position.set(qx, 0, qz); q.rotation.y = -Math.atan2(xp.dy, xp.dx); g.add(q);
    const d2 = mesh(new T.BoxGeometry(PIER_LEN + 30, 3, 18), '#9b6b3a'); d2.position.set(PIER_LEN/2 - 15, 6, 0); q.add(d2);
    for (let k=0;k<=5;k++) for (const z of [-8, 8]){ const post = mesh(new T.CylinderGeometry(1.4, 1.4, 16, 5), '#6e4a26'); post.position.set(k*PIER_LEN/5, 1, z); q.add(post); }
    for (let k=0;k<5;k++){ const a = mesh(amphoraGeo, ['#b8693a', '#c98a4b', '#a85c34'][k % 3], {flatShading:false}); a.scale.setScalar(.7); a.position.set(20 + k*7 + R()*3, 7.5, -4 + (k % 2)*8); q.add(a); }
    for (let k=0;k<3;k++){ const c = mesh(new T.BoxGeometry(9, 8, 9), '#8a6238'); c.position.set(PIER_LEN*.55 + k*11, 11.5, (k % 2 ? 3 : -3)); c.rotation.y = R()*.5; q.add(c); }
    keep.push([qx, qz], [qx - xp.dx*30, qz - xp.dy*30]); }
  // where a tree may stand: off the lanes, away from houses, the square, the temple and the pier
  return (x, z) => laneGap(x, z) > 8 && keep.every(([hx, hz]) => Math.hypot(hx - x, hz - z) > 22) && Math.hypot(x - px, z - pz) > 50 && blocks.every(([bx, bz, br]) => Math.hypot(bx - x, bz - z) > br + 6);
}

// P112: a port's stone: the quay along the shore, the harbor walls with boulders on their sea side, a lighthouse or beacon on
// the long wall's end, cargo and cranes, merchant ships at berth. Built the first time you come near (entities.js), then glued
// into the island's pieces like the rest of the town. Collision is world.js PORT_SOLIDS.
const BOX = new T.BoxGeometry(1, 1, 1), ROCK = new T.DodecahedronGeometry(1, 0), POST = new T.CylinderGeometry(1, 1.2, 1, 6);
export function buildPort(is, g, port, R){
  const torches = g.userData.torches || (g.userData.torches = []), QUAY = '#d9c9a2', CORE = '#b9ad94';
  const box = (w, h, d, col, x, y, z, ry = 0, shadow = true) => { const m = mesh(BOX, col, {}, shadow); m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
  const rock = (x, y, z, sc) => { const m = mesh(ROCK, ['#8f8a80', '#9a9483', '#857f73'][Math.floor(R()*3)]); m.position.set(x, y, z); m.scale.set(sc*(1 + R()*.5), sc*(.55 + R()*.3), sc*(1 + R()*.4)); m.rotation.y = R()*6; g.add(m); };
  const pots = (x, y, z, n) => { for (let k = 0; k < n; k++){ const a = mesh(amphoraGeo, ['#b8693a', '#c98a4b', '#a85c34'][k % 3], {flatShading:false}); a.scale.setScalar(.62 + R()*.14); a.position.set(x + (k % 3)*6 - 6 + R()*2, y, z + Math.floor(k/3)*6 - 3 + R()*2); g.add(a); } };
  const crates = (x, y, z, n) => { for (let k = 0; k < n; k++){ const up = k > 2 ? 1 : 0, c = box(9, 8, 9, k % 2 ? '#8a6238' : '#9b6b3a', x + (up ? 5 : k*10 - 10), y + 4 + up*8, z + (up ? 1 : (k % 2)*3), R()*.6); } };
  const post = (x, y, z, h, r = 1.6) => { const m = mesh(POST, '#5a4630'); m.scale.set(r, h, r); m.position.set(x, y + h/2, z); g.add(m); };
  const P = port.pier, dx = P.dx, dy = P.dy, L = p => [p.x - is.x, p.y - is.y];
  // the quay
  for (let i = 0; i + 1 < port.quay.length; i++){ const [x0, z0] = L(port.quay[i]), [x1, z1] = L(port.quay[i + 1]), len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0), mx = (x0 + x1)/2, mz = (z0 + z1)/2, far = Math.hypot(mx + is.x - P.x, mz + is.y - P.y);
    box(len + 10, 14, 32, QUAY, mx, 0, mz, -a); box(len + 10, 1.2, 4, '#c4b48c', mx + dx*14, 6.6, mz + dy*14, -a, false); post(mx + dx*12, 7, mz + dy*12, 4, 1.8);
    if (far > 50){ const k = i % 4; if (k === 0) pots(mx - dx*6, 7, mz - dy*6, 5 + Math.floor(R()*4)); else if (k === 2) crates(mx - dx*6, 7, mz - dy*6, 3 + Math.floor(R()*3));
      else if (k === 1 && (port.kind === 'great' || i === 1)){ const c = crane(); c.position.set(mx - dx*4, 7, mz - dy*4); c.rotation.y = -Math.atan2(dy, dx); g.add(c); } } }
  // the harbor walls
  for (const arm of port.arms){ const n = arm.pts.length;
    for (let i = 0; i + 1 < n; i++){ const [x0, z0] = L(arm.pts[i]), [x1, z1] = L(arm.pts[i + 1]), len = Math.hypot(x1 - x0, z1 - z0), h = Math.atan2(z1 - z0, x1 - x0), mx = (x0 + x1)/2, mz = (z0 + z1)/2, ox = -Math.sin(h)*arm.sg, oz = Math.cos(h)*arm.sg; // (ox, oz) = the sea side
      box(len + 7, 18, port.w, CORE, mx, -2, mz, -h); box(len + 7, 1.2, port.w - 8, QUAY, mx, 7.2, mz, -h, false);
      for (let b = 0; b < 3; b++) rock(mx + ox*(port.w/2 + 5 + R()*7) + Math.cos(h)*(R() - .5)*len, -1 + R()*3, mz + oz*(port.w/2 + 5 + R()*7) + Math.sin(h)*(R() - .5)*len, 8 + R()*7);
      if (i % 2) rock(mx - ox*(port.w/2 + 3), -2, mz - oz*(port.w/2 + 3), 6 + R()*4);
      post(mx - ox*(port.w/2 - 4), 7.6, mz - oz*(port.w/2 - 4), 4, 1.8);
      if (arm.main && port.kind === 'great' && i > 0 && i < 8 && i % 3 === 1) (i % 2 ? pots : crates)(mx + ox*4, 7.8, mz + oz*4, 4); } }
  // the light on the end of the long wall
  if (port.light){ const [x, z] = L(port.light);
    for (let k = 0; k < 9; k++){ const a = k/9*6.283 + R(), r = (port.light.big ? 27 : 18) + R()*8; rock(x + Math.cos(a)*r, -2, z + Math.sin(a)*r, 9 + R()*7); }
    const t = torch(); t.children.forEach(o => { if (o !== t.userData.flame && !o.isSprite) o.visible = false; });
    if (port.light.big){ const lh = lighthouse(); lh.position.set(x, 0, z); lh.scale.setScalar(1.35); g.add(lh); t.scale.setScalar(2.4); t.position.set(x, LIGHT_Y*1.35 - 34, z); }
    else { box(14, 14, 14, CORE, x, 3, z, R()); box(10, 12, 10, '#f1ebdc', x, 13, z, .4); box(12, 1.6, 12, '#b5562f', x, 19.6, z, .4); t.scale.setScalar(1.3); t.position.set(x, 4, z); }
    g.add(t); torches.push(t); TORCH_ROOTS.add(g); }
  // merchant ships at berth: sails stowed, nobody aboard
  for (const b of port.berths){ const sh = buildShip(b.model, {flag:'none', paint:b.model === 'merchant' ? 'white' : 'oak'}, false); for (const sl of sh.userData.sails || []) sl.visible = false;
    sh.position.set(b.x - is.x, 0, b.y - is.y); sh.rotation.y = -b.a; sh.userData.noMerge = true; mergeShip(sh); g.add(sh); }
}
