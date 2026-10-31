// The flat 2D layer over the 3D view: rain, lightning, labels, progress ring, joystick, minimap, frame rate.
import {WORLD, ISLANDS, WRECKS, SHOALS, shoalOn, HARBORS, STADION, CITIES, zoneAt, hash} from './world.js';
import {G, isExplored} from './state.js';
import {fogLayer, islandPath} from './map.js';
import {view, project} from './scene.js';
import {JOY_RADIUS} from './input.js';
import {enemies, combatState, capture} from './combat.js';
import {drawFish} from './fishing.js';
import {whale} from './wildlife.js';
import {SHORE_FISH} from './config.js';
import {W as WIND} from './weather.js';
import {bottle} from './quests.js';
import {IC, GOOD_IC, FISH_COLOR} from './menus.js';
// A pick-up: pops up from the boat with a bounce, floats a moment, then drops back into the boat and shrinks away.
function drawGain(c, p, t, S){
  const k = (t - p.t)/1.5; if (k > 1) return false; if (k < 0) return true;
  let [bx, by] = project(p.x ?? S.x, 40, p.y ?? S.y);
  const up = k < .3 ? (1 - Math.pow(1 - k/.3, 3)) : k < .7 ? 1 : 1 - Math.pow((k - .7)/.3, 2);
  const sc = k < .15 ? .6 + k/.15*.6 : k < .3 ? 1.2 - (k - .15)/.15*.2 : k < .7 ? 1 : 1 - (k - .7)/.3*.7;
  const y = by - 34 - up*48, im = iconImg(p.ic), s = 30*sc; bx += ((p.slot || 0) % 3 - 1)*64 + 12; // several pick-ups sit side by side
  c.save(); c.globalAlpha = k > .85 ? (1 - k)/.15 : 1;
  c.fillStyle = 'rgba(43,33,28,.82)'; c.beginPath(); c.arc(bx - 10, y, s*.72, 0, Math.PI*2); c.fill();
  if (im.complete) c.drawImage(im, bx - 10 - s/2, y - s/2, s, s);
  c.font = `800 ${Math.round(17*sc)}px Nunito, system-ui, sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.lineWidth = 4; c.strokeStyle = 'rgba(34,28,24,.8)'; c.strokeText(p.txt, bx + s*.45, y); c.fillStyle = '#fbf3df'; c.fillText(p.txt, bx + s*.45, y);
  c.restore(); c.textBaseline = 'alphabetic'; return true;
}
// pick-up icons, drawn from the menu icons once
const icons = {};
function iconImg(k){ if (icons[k]) return icons[k];
  const svg = k === 'wood' || k === 'bronze' || k === 'linen' ? IC[k] : k === 'coin' ? IC.coin : FISH_COLOR[k] ? IC.fish(FISH_COLOR[k]) : k === 'fish' ? IC.fish(FISH_COLOR.sardine) : GOOD_IC(k);
  const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" ')); return icons[k] = im; }

const MINI_RANGE = 2600, SIDE_COLOR = {pirate:'#e0614d', merchant:'#e8dcc0'};
const shipColor = e => (e.spec.side === 'navy' || e.spec.side === 'fort') && e.city ? CITIES[e.city].color : SIDE_COLOR[e.spec.side === 'fort' ? 'pirate' : e.spec.side];
const ov = document.getElementById('ov'), c = ov.getContext('2d');
export function resizeOverlay(){ ov.width = view.W*view.DPR; ov.height = view.H*view.DPR; }

let mini = null;
function buildMini(){
  const s = 1024, m = document.createElement('canvas'); m.width = m.height = s; const g = m.getContext('2d'), k = s/WORLD;
  const img = g.createImageData(s, s);
  // the same colors as the chart: aqua shallows, blue middle sea, deep blue open sea, islands with sand, grass and rocky tops
  for (let y=0;y<s;y++) for (let x=0;x<s;x++){ const z = zoneAt(x/k, y/k), col = z === 0 ? [122,206,198] : z === 1 ? [70,154,192] : [46,100,142]; img.data.set([...col, 255], (y*s+x)*4); }
  g.putImageData(img, 0, 0);
  ISLANDS.forEach(i => { islandPath(g, i, 0, k); g.strokeStyle = 'rgba(225,245,238,.55)'; g.lineWidth = 7; g.stroke(); });
  ISLANDS.forEach(i => { islandPath(g, i, 0, k); g.fillStyle = '#efdcaa'; g.fill(); g.strokeStyle = '#6b5236'; g.lineWidth = 1.6; g.stroke();
    if (i.tiers[1]){ islandPath(g, i, 1, k); g.fillStyle = '#9fbe62'; g.fill(); } if (i.tiers[2]){ islandPath(g, i, 2, k); g.fillStyle = '#b4a888'; g.fill(); } });
  mini = m;
}
const topInset = () => parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0;

// Course marker pinned to the screen edge, pointing toward a far-off course.
function courseArrow(dx, dy, dz, W, H, M){
  let vx = dx - W/2, vy = dy - H/2;
  if (dz > 1){ vx = -vx; vy = -vy; } // behind the camera: flip
  const ang = Math.atan2(vy, vx), sx = (W/2 - M) / Math.abs(Math.cos(ang) || 1e-6), sy = (H/2 - M - 30) / Math.abs(Math.sin(ang) || 1e-6), k = Math.min(sx, sy);
  const x = W/2 + Math.cos(ang)*k, y = H/2 + 15 + Math.sin(ang)*k;
  const st = Math.max(1, Math.round(Math.hypot(G.dest.x - G.S.x, G.dest.y - G.S.y)/STADION));
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(247,238,214,.95)'; c.beginPath(); c.arc(0, 0, 21, 0, Math.PI*2); c.fill();
  c.save(); c.rotate(ang); c.fillStyle = '#b8402f'; c.beginPath(); c.moveTo(30, 0); c.lineTo(19, -7); c.lineTo(19, 7); c.closePath(); c.fill(); c.restore();
  c.fillStyle = '#22283a'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '800 13px Nunito, system-ui, sans-serif'; c.fillText(st, 0, -3);
  c.font = '700 8px Nunito, system-ui, sans-serif'; c.fillText('STADIA', 0, 8);
  c.textBaseline = 'alphabetic'; c.restore();
}

// Rain splashes: little rings that spread on the water where drops land, with two droplets jumping up. Smaller further up
// the screen (further away). Each splash has its own start time so they don't all land at once; more in heavier rain.
const SPL = Array.from({length:110}, (_, k) => ({k, t0:-k*.01, x:0, y:0}));
const SPLASH_LIFE = .5;
function drawSplashes(W, H, t){
  const n = Math.round(SPL.length*Math.min(1, G.stormK*1.15));
  c.lineWidth = 1.7;
  for (let i=0;i<n;i++){ const s = SPL[i]; let a = (t - s.t0)/SPLASH_LIFE;
    if (a >= 1 || a < 0){ s.t0 = t + Math.random()*.3; s.x = Math.random()*W; s.y = H*.12 + Math.random()*H*.88; continue; }
    const far = .5 + .6*s.y/H, r = (3 + a*13)*far, al = (1 - a)*.85*Math.min(1, G.stormK*1.8);
    c.strokeStyle = `rgba(230,242,250,${al})`; c.beginPath(); c.ellipse(s.x, s.y, r, r*.42, 0, 0, Math.PI*2); c.stroke();
    if (a < .55){ const h = Math.sin(a/.55*Math.PI)*10*far; c.fillStyle = `rgba(240,248,255,${al})`;
      c.beginPath(); c.arc(s.x - 2.5*far - a*4*far, s.y - h, 1.8*far, 0, Math.PI*2); c.arc(s.x + 2.5*far + a*4*far, s.y - h*.8, 1.5*far, 0, Math.PI*2); c.fill(); }
  }
}
// Wind: a few soft white streaks drifting over the sea the way the wind blows, more when it is strong (like a cartoon).
const STREAKS = Array.from({length:14}, (_, i) => ({life:i/14, x:0, y:0, len:0, ph:0}));
function drawWind(t, dt){
  const k = WIND.windK; if (k < .3 || G.mapOpen) return;
  const n = Math.round(STREAKS.length*Math.min(1, (k - .2)*1.3)), ca = Math.cos(WIND.windA), sa = Math.sin(WIND.windA), sp = 70 + 150*k;
  c.lineWidth = 2.8; c.lineCap = 'round';
  for (let i=0;i<n;i++){ const s = STREAKS[i]; s.life += dt/(2.6 + (i % 3)*.6);
    if (s.life >= 1 || !s.len){ s.life = s.len ? 0 : Math.random(); const r = 200 + Math.random()*500, a = Math.random()*6.28; s.x = G.cam.x + Math.cos(a)*r - ca*200; s.y = G.cam.y + Math.sin(a)*r - sa*200; s.len = 70 + Math.random()*80; s.ph = Math.random()*6.28; }
    s.x += ca*sp*dt; s.y += sa*sp*dt;
    const al = Math.sin(s.life*Math.PI)*.6*k*(1 - .5*(G.night || 0)); if (al < .02) continue;
    c.strokeStyle = `rgba(250,253,255,${al})`; c.beginPath();
    for (let j=0;j<=8;j++){ const u = j/8 - .5, w = Math.sin(u*6 + s.ph + t*3)*6, wx = s.x + ca*u*s.len - sa*w, wy = s.y + sa*u*s.len + ca*w, [px, py, pz] = project(wx, 26, wy);
      if (pz > 1){ c.beginPath(); break; } j ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.stroke(); }
}
let lastT = 0;
export function drawOverlay(fps){
  const {W, H, DPR} = view, S = G.S, t = G.t;
  c.setTransform(DPR,0,0,DPR,0,0); c.clearRect(0,0,W,H);
  drawWind(t, Math.min(.05, Math.max(0, t - lastT))); lastT = t;
  if (G.stormK > .05){
    c.strokeStyle = `rgba(215,228,240,${.35*G.stormK})`; c.lineWidth = 1.2;
    for (let k=0;k<90;k++){ const rx = (hash(k,1)*W*1.2 + t*160) % (W*1.2) - W*.1, ry = (hash(k,2)*H + t*760) % H; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx-7, ry+20); c.stroke(); }
    drawSplashes(W, H, t);
  }
  if (G.flash){ c.fillStyle = `rgba(240,245,255,${G.flash*.4})`; c.fillRect(0,0,W,H); }

  // red edges when an arrow hits you
  if (G.hurt > 0){ const g = c.createRadialGradient(W/2, H/2, Math.min(W, H)*.35, W/2, H/2, Math.max(W, H)*.75);
    g.addColorStop(0, 'rgba(196,71,59,0)'); g.addColorStop(1, `rgba(196,71,59,${G.hurt*.45})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  // health bars, colored by side: pirates red, navy blue, merchants ochre
  for (const e of enemies){
    if (e.dead || Math.hypot(e.x - S.x, e.y - S.y) > 900) continue;
    const [ex, ey, ez] = project(e.x, e.spec.len*.55, e.y); if (ez > 1) continue;
    const w = e.spec.len > 100 ? 64 : 46, pct = Math.max(0, e.hull/e.spec.hull);
    c.fillStyle = 'rgba(34,40,58,.6)'; c.fillRect(ex - w/2 - 2, ey - 2, w + 4, 9);
    c.fillStyle = e.hitT ? '#f7eed6' : shipColor(e); c.fillRect(ex - w/2, ey, w*pct, 5);
    if (e.angry){ c.fillStyle = '#c4473b'; c.font = '800 14px Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('!', ex, ey - 6); }
    if (e === combatState.target){ c.strokeStyle = 'rgba(247,238,214,.9)'; c.lineWidth = 1.5; c.strokeRect(ex - w/2 - 2, ey - 2, w + 4, 9); }
  }
  for (const {is} of HARBORS){ if (Math.hypot(is.x - S.x, is.y - S.y) > 2500) continue; // harbor town names
    const [hx, hy, hz] = project(is.x, is.ht + 60, is.y);
    if (hz < 1){ c.font = '400 20px Marcellus, Georgia, serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(34,40,58,.85)'; c.fillText(is.name, hx, hy); } }
  if (G.dest){
    const [dx, dy, dz] = project(G.dest.x, 0, G.dest.y), p = (t*1.5) % 1, r = 9 + p*12, M = 46;
    const onScreen = dz < 1 && dx > M && dx < W-M && dy > M+60 && dy < H-M;
    if (onScreen){ c.strokeStyle = `rgba(244,251,255,${.9-p*.6})`; c.lineWidth = 2.5; c.beginPath(); c.ellipse(dx, dy, r, r*.6, 0, 0, Math.PI*2); c.stroke(); }
    else if (G.dest.far) courseArrow(dx, dy, dz, W, H, M);
  }
  if (G.tapMark){ // a single tap: a small ring that fades, inviting the second tap
    const k = (G.t - G.tapMark.t)/.45;
    if (k > 1) G.tapMark = null;
    else { const [mx, my, mz] = project(G.tapMark.x, 0, G.tapMark.y); if (mz < 1){ c.strokeStyle = `rgba(244,251,255,${.8*(1 - k)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(mx, my, 8 + k*10, (8 + k*10)*.6, 0, 0, Math.PI*2); c.stroke(); } }
  }
  // sardine schools: a few small glints on the water while the school is out
  for (const s of SHOALS){
    if (Math.abs(s.x - S.x) > 1100 || Math.abs(s.y - S.y) > 1100 || !shoalOn(s, t, SHORE_FISH.period[1], SHORE_FISH.on)) continue;
    for (let k=0;k<7;k++){ const ph = (t*.9 + hash(s.x, k)) % 1; if (ph > .4 || ph < 0) continue;
      const gx = s.x + (hash(k, s.y) - .5)*90, gy = s.y + (hash(s.y, k) - .5)*90, [px, py, pz] = project(gx, 2, gy); if (pz > 1) continue;
      const a = Math.sin(ph/.4*Math.PI), nt = G.night || 0; c.fillStyle = `rgba(${244 - nt*110|0},${251},${255 - nt*30|0},${.75*a})`; /* at night the schools glow blue-green */ c.beginPath(); c.ellipse(px, py, 5*a + 1.5, 2.2*a + .6, 0, 0, Math.PI*2); c.fill(); }
  }
  // small "+1" pops over the boat (sardines)
  if (G.pops) G.pops = G.pops.filter(p => { if (p.ic){ return drawGain(c, p, t, S); } const k = (t - p.t)/1.1; if (k > 1) return false; const [bx, by] = project(p.x ?? S.x, 60, p.y ?? S.y);
    c.font = `800 ${p.c ? 20 : 15}px Nunito, system-ui, sans-serif`; c.textAlign = 'center'; c.globalAlpha = 1 - k; c.fillStyle = p.c || 'rgb(247,238,214)'; c.fillText(p.txt, bx + 18, by - k*26); c.globalAlpha = 1; return true; });
  if (G.act && G.act.type !== 'shore'){
    const [bx, by] = project(S.x, 70, S.y);
    c.fillStyle = 'rgba(247,238,214,.95)'; c.beginPath(); c.arc(bx, by, 16, 0, Math.PI*2); c.fill();
    if (G.act.full){ c.fillStyle = '#c4473b'; c.font = '800 16px Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', bx, by+1); c.textBaseline = 'alphabetic'; }
    else { c.strokeStyle = G.act.type === 'shore' ? '#1f6b8f' : G.act.type === 'wreck' ? '#d48a2a' : '#6d7d38'; c.lineWidth = 4; c.beginPath(); c.arc(bx, by, 10, -Math.PI/2, -Math.PI/2 + G.act.p*Math.PI*2); c.stroke(); }
  }
  if (capture.is){ // raising a flag over an open island
    const [bx, by] = project(S.x, 70, S.y), col = capture.to ? CITIES[capture.to].color : '#d48a2a';
    c.fillStyle = 'rgba(247,238,214,.95)'; c.beginPath(); c.arc(bx, by, 18, 0, Math.PI*2); c.fill();
    c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.arc(bx, by, 11, -Math.PI/2, -Math.PI/2 + capture.p*Math.PI*2); c.stroke();
    c.font = '800 13px Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#f7eed6'; c.strokeStyle = 'rgba(34,40,58,.7)'; c.lineWidth = 3;
    const msg = capture.msg; c.strokeText(msg, bx, by - 26); c.fillText(msg, bx, by - 26);
  }
  if (G.fish){ const [bx, by] = project(S.x, 80, S.y); drawFish(c, bx, by - 30); }
  if (G.joy){
    const j = G.joy;
    c.fillStyle = 'rgba(247,238,214,.18)'; c.strokeStyle = 'rgba(247,238,214,.6)'; c.lineWidth = 2;
    c.beginPath(); c.arc(j.bx, j.by, JOY_RADIUS, 0, Math.PI*2); c.fill(); c.stroke();
    c.fillStyle = 'rgba(247,238,214,.85)'; c.beginPath(); c.arc(j.bx + j.vx*JOY_RADIUS, j.by + j.vy*JOY_RADIUS, 24, 0, Math.PI*2); c.fill();
  }

  // round minimap, turned to match the camera, showing the sea around the ship (MINI_RANGE world units to the edge)
  if (!mini) buildMini();
  const ms = 112, cx = W - ms/2 - 12, cy = 10 + ms/2 + topInset();
  // the minimap is drawn into its own small canvas only every third frame, then copied: it's one of the slower things to draw
  if (!miniCv){ miniCv = document.createElement('canvas'); miniCv.width = miniCv.height = ms*2; }
  if ((miniTick = (miniTick + 1) % 3) === 1){ const m = miniCv.getContext('2d'); m.setTransform(2, 0, 0, 2, 0, 0); m.clearRect(0, 0, ms, ms); drawMini(m, ms/2, ms/2, ms, S); }
  c.drawImage(miniCv, cx - ms/2, cy - ms/2, ms, ms);
  // a round wooden frame, with a little N where north is (the map is turned like the camera, so north is up and to the right)
  c.save(); const wg = c.createLinearGradient(cx - ms/2, cy - ms/2, cx + ms/2, cy + ms/2); wg.addColorStop(0, '#c99560'); wg.addColorStop(.55, '#8c5b33'); wg.addColorStop(1, '#5e3a1e');
  c.shadowColor = 'rgba(45,28,12,.35)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
  c.strokeStyle = wg; c.lineWidth = 7; c.beginPath(); c.arc(cx, cy, ms/2 + 2, 0, Math.PI*2); c.stroke(); c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(255,240,210,.7)'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, ms/2 - 1.2, 0, Math.PI*2); c.stroke();
  c.strokeStyle = 'rgba(60,35,15,.5)'; c.beginPath(); c.arc(cx, cy, ms/2 + 5.6, 0, Math.PI*2); c.stroke();
  for (let i=0;i<4;i++){ const a = i*Math.PI/2 + Math.PI/4; c.fillStyle = '#4a2e17'; c.beginPath(); c.arc(cx + Math.cos(a)*(ms/2 + 2), cy + Math.sin(a)*(ms/2 + 2), 2.2, 0, Math.PI*2); c.fill(); }
  const na = -Math.PI/4, nx = cx + Math.cos(na)*(ms/2 + 2), ny = cy + Math.sin(na)*(ms/2 + 2);
  c.fillStyle = '#fbf3e0'; c.strokeStyle = '#6a4224'; c.lineWidth = 2; c.beginPath(); c.arc(nx, ny, 9, 0, Math.PI*2); c.fill(); c.stroke();
  c.fillStyle = '#b8402f'; c.font = '400 11px Marcellus, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('N', nx, ny + .5); c.restore();
  // which way the wind blows: a white arrow across the little map, stronger wind = more solid
  if (WIND.windK > .2){ const a = WIND.windA + Math.PI/4, al = Math.min(.85, WIND.windK);
    c.save(); c.translate(cx, cy); c.rotate(a); c.globalAlpha = al; c.strokeStyle = '#f4fbff'; c.fillStyle = '#f4fbff'; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-ms*.36, 0); c.lineTo(ms*.3, 0); c.stroke(); c.beginPath(); c.moveTo(ms*.38, 0); c.lineTo(ms*.27, -5); c.lineTo(ms*.27, 5); c.closePath(); c.fill();
    for (const f of [-.36, -.29]){ c.beginPath(); c.moveTo(ms*f, 0); c.lineTo(ms*(f - .06), -5); c.moveTo(ms*f, 0); c.lineTo(ms*(f - .06), 5); c.stroke(); } c.restore(); }
  // the nearest chapter goal off the little map: a red arrow on its rim pointing the way
  let gm = null, gd = Infinity; for (const m of G.goalMarks || []){ const d = Math.hypot(m.x - S.x, m.y - S.y); if (d < gd){ gd = d; gm = m; } }
  if (gm && gd > MINI_RANGE*.9){ const a = Math.atan2(gm.y - S.y, gm.x - S.x) + Math.PI/4, r = ms/2 - 2, px = cx + Math.cos(a)*r, py = cy + Math.sin(a)*r, pulse = 1 + Math.sin(G.t*5)*.12;
    c.save(); c.translate(px, py); c.rotate(a); c.scale(pulse, pulse); c.fillStyle = '#e0614d'; c.strokeStyle = '#2a1d17'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(7, 0); c.lineTo(-5, -6); c.lineTo(-2, 0); c.lineTo(-5, 6); c.closePath(); c.fill(); c.stroke(); c.restore(); }

  if (G.settings.showFps){
    c.font = '800 12px Nunito, system-ui, sans-serif'; c.textAlign = 'left'; c.fillStyle = fps >= 50 ? '#cfe8c0' : fps >= 35 ? '#f2d58a' : '#f2a093';
    c.fillText(`${Math.round(fps)} fps`, 80, H - 14);
  }
}

let miniCv = null, miniTick = 0;
function drawMini(c, cx, cy, ms, S){
  const k = ms/2/MINI_RANGE;
  c.save(); c.beginPath(); c.arc(cx, cy, ms/2, 0, Math.PI*2); c.clip();
  c.fillStyle = '#dccaa2'; c.fillRect(cx - ms/2, cy - ms/2, ms, ms); // unexplored water is blank paper, like on the chart
  c.translate(cx, cy); c.rotate(Math.PI/4); c.translate(-S.x*k, -S.y*k);
  c.drawImage(mini, 0, 0, WORLD*k, WORLD*k);
  c.drawImage(fogLayer('#dccaa2'), 0, 0, WORLD*k, WORLD*k);
  c.strokeStyle = '#3e2b1c'; c.lineWidth = 1;
  for (const h of HARBORS){ c.fillStyle = h.is.city ? CITIES[h.is.city].color : '#d48a2a'; c.beginPath(); c.arc(h.dock.x*k, h.dock.y*k, 3, 0, Math.PI*2); c.fill(); c.stroke(); }
  if (G.dest){ c.fillStyle = '#e0614d'; c.beginPath(); c.arc(G.dest.x*k, G.dest.y*k, 3, 0, Math.PI*2); c.fill(); }
  WRECKS.forEach(w => { if (G.settings.dev.markers && w.stock && isExplored(w.x, w.y)){ c.fillStyle = '#f4fbff'; c.fillRect(w.x*k-1.5, w.y*k-1.5, 3, 3); } });
  enemies.forEach(e => { const d = Math.hypot(e.x - S.x, e.y - S.y);
    if (e.dead || d > (e.spec.side === 'pirate' ? e.spec.sight*1.3 : MINI_RANGE)) return;
    c.fillStyle = shipColor(e); c.strokeStyle = 'rgba(30,20,12,.7)'; c.lineWidth = 1; c.beginPath(); if (e.fort) c.rect(e.x*k - 4, e.y*k - 4, 8, 8); else c.arc(e.x*k, e.y*k, 3, 0, Math.PI*2); c.fill(); c.stroke(); });
  if (whale.state !== 'gone' && whale.state !== 'dive'){ c.fillStyle = '#bfe3f5'; c.beginPath(); c.ellipse(whale.x*k, whale.y*k, 5, 3, whale.a, 0, Math.PI*2); c.fill(); }
  if (bottle.on){ c.fillStyle = '#bfe8d2'; c.fillRect(bottle.x*k - 2, bottle.y*k - 2, 4, 4); }
  if (S.treasure){ const tx = S.treasure.x*k, ty = S.treasure.y*k; c.strokeStyle = '#e0614d'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx - 4, ty - 4); c.lineTo(tx + 4, ty + 4); c.moveTo(tx + 4, ty - 4); c.lineTo(tx - 4, ty + 4); c.stroke(); }
  for (const m of G.goalMarks || []){ c.strokeStyle = '#e0614d'; c.lineWidth = 2; c.beginPath(); c.arc(m.x*k, m.y*k, 4 + (G.t*2 % 1)*4, 0, Math.PI*2); c.stroke(); } // the chapter goal pulses
  // you: a white arrow pointing where the ship is heading
  c.save(); c.translate(S.x*k, S.y*k); c.rotate(S.a); c.fillStyle = '#fff'; c.strokeStyle = '#3e2b1c'; c.lineWidth = 1.4; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(7, 0); c.lineTo(-5, -5); c.lineTo(-2.5, 0); c.lineTo(-5, 5); c.closePath(); c.fill(); c.stroke(); c.restore();
  c.restore();
}
