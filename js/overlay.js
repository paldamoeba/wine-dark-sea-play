// The flat 2D layer over the 3D view: rain, lightning, labels, progress ring, joystick, minimap, frame rate.
import {omen} from './omens.js?v=19e7728';
import {OMENS} from './config.js?v=19e7728';
import {WORLD, ISLANDS, WRECKS, HARBORS, STADION, CITIES, zoneAt} from './world.js?v=19e7728';
import {G, isExplored} from './state.js?v=19e7728';
import {fogLayer, islandPath} from './map.js?v=19e7728';
import {view, project, screenToSea} from './scene.js?v=19e7728';
import {JOY_RADIUS} from './input.js?v=19e7728';
import {enemies, combatState, capture, aimLeads, planSources, towerPos, towersUp} from './combat.js?v=19e7728';
import {drawFish} from './fishing.js?v=19e7728';
import {whale} from './wildlife.js?v=19e7728';
import {W as WIND} from './weather.js?v=19e7728';
import {bottle} from './quests.js?v=19e7728';
import {IC, GOOD_IC, FISH_COLOR} from './menus.js?v=19e7728';
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
  const svg = k === 'wood' || k === 'bronze' || k === 'iron' || k === 'linen' ? IC[k] : k === 'coin' ? IC.coin : FISH_COLOR[k] ? IC.fish(FISH_COLOR[k]) : k === 'fish' ? IC.fish(FISH_COLOR.sardine) : GOOD_IC(k);
  const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" ')); return icons[k] = im; }

const MINI_RANGE = 2600, SIDE_COLOR = {pirate:'#e0614d', merchant:'#e8dcc0', ally:'#5fd06a'}; // your own ships at sea are green
const shipColor = e => (e.spec.side === 'navy' || e.spec.side === 'fort') && e.city ? CITIES[e.city].color : SIDE_COLOR[e.spec.side === 'fort' ? 'pirate' : e.spec.side];
const ov = document.getElementById('ov'), c = ov.getContext('2d');
// P65: the 2D layer is drawn sharper than the 3D view (on a phone the 3D runs at 1.5x to stay fast; text and icons should not)
const ovDPR = () => Math.max(view.DPR, Math.min(2.5, devicePixelRatio || 1));
export function resizeOverlay(){ const d = ovDPR(); ov.width = view.W*d; ov.height = view.H*d; rimCv = null; }

let mini = null;
function buildMini(){
  const s = 1024, m = document.createElement('canvas'); m.width = m.height = s; const g = m.getContext('2d'), k = s/WORLD;
  const img = g.createImageData(s, s);
  // the same colors as the chart: aqua shallows, blue middle sea, deep blue open sea, islands with sand, grass and rocky tops
  for (let y=0;y<s;y++) for (let x=0;x<s;x++){ const z = zoneAt(x/k, y/k), col = z === 0 ? [122,206,198] : z === 1 ? [70,154,192] : [46,100,142]; img.data.set([...col, 255], (y*s+x)*4); }
  g.putImageData(img, 0, 0);
  ISLANDS.forEach(i => { islandPath(g, i, 0, k); g.strokeStyle = 'rgba(225,245,238,.55)'; g.lineWidth = 7; g.stroke(); });
  // (P60: the islands themselves are drawn sharp each time in drawMini, not into this small picture)
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

// Raindrops falling through the air around the ship: each has a place in the world, so when the ship sails on, it leaves
// the rain behind instead of the rain moving with the screen.
const DROPS = Array.from({length:120}, () => ({x:0, y:0, h:-1, v:0}));
let dropT = 0;
function drawDrops(t){
  const dt = Math.min(.05, Math.max(0, t - dropT)); dropT = t;
  c.strokeStyle = `rgba(215,228,240,${.38*G.stormK})`; c.lineWidth = 1.2; c.beginPath();
  for (const d of DROPS){ d.h -= d.v*dt;
    if (d.h < 0){ const a = Math.random()*6.28, r = Math.sqrt(Math.random())*900; d.x = G.cam.x + Math.cos(a)*r; d.y = G.cam.y + Math.sin(a)*r - 150; d.h = 80 + Math.random()*420; d.v = 650 + Math.random()*200; }
    const p = project(d.x, d.h, d.y), q = project(d.x - 4, d.h + 34, d.y - 3); if (p[2] > 1 || q[2] > 1) continue;
    c.moveTo(q[0], q[1]); c.lineTo(p[0], p[1]); }
  c.stroke();
}
// Rain splashes: little rings that spread on the water where drops land, with two droplets jumping up. Smaller further up
// the screen (further away). Each splash has its own start time so they don't all land at once; more in heavier rain.
// Each one lands on a spot on the sea (wx, wy) and stays there, so the rain doesn't slide along with the camera.
const SPL = Array.from({length:110}, (_, k) => ({k, t0:-k*.01, wx:0, wy:0}));
const SPLASH_LIFE = .5;
function drawSplashes(W, H, t){
  const n = Math.round(SPL.length*Math.min(1, G.stormK*1.15));
  c.lineWidth = 1.7;
  for (let i=0;i<n;i++){ const s = SPL[i]; let a = (t - s.t0)/SPLASH_LIFE;
    if (a >= 1 || a < 0){ s.t0 = t + Math.random()*.3; const p = screenToSea(Math.random()*W, H*.12 + Math.random()*H*.88); s.wx = p ? p.x : NaN; s.wy = p ? p.y : 0; continue; }
    if (s.wx !== s.wx) continue;
    const q = project(s.wx, 0, s.wy); if (q[2] > 1) continue; s.x = q[0]; s.y = q[1];
    const far = .5 + .6*s.y/H, r = (3 + a*13)*far, al = (1 - a)*.85*Math.min(1, G.stormK*1.8);
    c.strokeStyle = `rgba(230,242,250,${al})`; c.beginPath(); c.ellipse(s.x, s.y, r, r*.42, 0, 0, Math.PI*2); c.stroke();
    if (a < .55){ const h = Math.sin(a/.55*Math.PI)*10*far; c.fillStyle = `rgba(240,248,255,${al})`;
      c.beginPath(); c.arc(s.x - 2.5*far - a*4*far, s.y - h, 1.8*far, 0, Math.PI*2); c.arc(s.x + 2.5*far + a*4*far, s.y - h*.8, 1.5*far, 0, Math.PI*2); c.fill(); }
  }
}
// A town's name on a little ribbon banner: cream cloth with folded tails, a wooden edge, the name in carved capitals,
// and the city that rules it on a small colored tag underneath.
function banner(name, x, y, alpha, city){
  c.save(); c.globalAlpha = alpha; c.font = '400 17px Marcellus, Georgia, serif';
  const txt = name.toUpperCase().split('').join(String.fromCharCode(8202)), w = c.measureText(txt).width + 28, h = 26, l = x - w/2, tp = y - h/2;
  c.shadowColor = 'rgba(40,24,10,.35)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
  // the folded tails behind each end
  c.fillStyle = '#c9a874'; c.strokeStyle = '#5a381d'; c.lineWidth = 1.5; c.lineJoin = 'round';
  for (const sg of [-1, 1]){ const ex = x + sg*w/2; c.beginPath(); c.moveTo(ex - sg*6, tp + 6); c.lineTo(ex + sg*14, tp + 6); c.lineTo(ex + sg*8, tp + h/2 + 3); c.lineTo(ex + sg*14, tp + h); c.lineTo(ex - sg*6, tp + h); c.closePath(); c.fill(); c.stroke(); }
  // the band, curving gently like cloth
  const g = c.createLinearGradient(0, tp, 0, tp + h); g.addColorStop(0, '#fff8e8'); g.addColorStop(1, '#ecd8b0'); c.fillStyle = g;
  c.beginPath(); c.moveTo(l, tp); c.quadraticCurveTo(x, tp - 5, l + w, tp); c.lineTo(l + w, tp + h - 4); c.quadraticCurveTo(x, tp + h - 9, l, tp + h - 4); c.closePath(); c.fill();
  c.shadowColor = 'transparent'; c.lineWidth = 1.8; c.stroke();
  c.strokeStyle = 'rgba(181,85,44,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(l + 5, tp + 2.5); c.quadraticCurveTo(x, tp - 2, l + w - 5, tp + 2.5); c.moveTo(l + 5, tp + h - 6.5); c.quadraticCurveTo(x, tp + h - 11, l + w - 5, tp + h - 6.5); c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText(txt, x, y - 1); c.fillStyle = '#4a2a14'; c.fillText(txt, x, y - 2.2);
  if (city){ c.font = '800 9px Nunito, system-ui, sans-serif'; const cw = c.measureText(city.name.toUpperCase()).width + 12;
    c.fillStyle = city.color; c.strokeStyle = '#3e2b1c'; c.lineWidth = 1.2; c.beginPath(); c.roundRect ? c.roundRect(x - cw/2, tp + h - 3, cw, 13, 6.5) : c.rect(x - cw/2, tp + h - 3, cw, 13); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.fillText(city.name.toUpperCase(), x, tp + h + 3.6); }
  c.restore();
}
export function drawOverlay(fps){
  const {W, H} = view, DPR = ovDPR(), S = G.S, t = G.t;
  c.setTransform(DPR,0,0,DPR,0,0); c.clearRect(0,0,W,H);
  if (G.stormK > .05){
    drawDrops(t);
    drawSplashes(W, H, t);
  }
  // aiming a power (P51): a faint ring for its range around your ship, a dashed arc to the spot, and the circle where it will land
  if (G.aim){ const A = G.aim, col = A.k === 'catapult' ? '255,150,70' : A.k === 'chain' ? '190,205,220' : '255,240,200';
    const ring = (x, y, r, w, a, dash) => { c.save(); c.setLineDash(dash || []); c.lineWidth = w; c.strokeStyle = `rgba(${col},${a})`; c.beginPath();
      for (let i=0;i<=40;i++){ const t = i/40*Math.PI*2, p = project(x + Math.cos(t)*r, 2, y + Math.sin(t)*r); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); c.restore(); };
    ring(S.x, S.y, A.range, 2, .25, [6, 8]);
    ring(A.x, A.y, A.r, 3, .9); c.fillStyle = `rgba(${col},.18)`; c.fill();
    c.save(); c.setLineDash([8, 8]); c.lineWidth = 2.5; c.strokeStyle = `rgba(${col},.75)`; c.beginPath();
    for (let i=0;i<=24;i++){ const k = i/24, p = project(S.x + (A.x - S.x)*k, 20 + Math.sin(k*Math.PI)*Math.min(260, Math.hypot(A.x - S.x, A.y - S.y)*.5), S.y + (A.y - S.y)*k); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
    c.stroke(); c.restore();
    // P65: where each ship in reach will be when the shot lands: a little dashed ring ahead of it, so you know where to aim
    if (A.k !== 'fire') for (const L of aimLeads(A.k)){ const p0 = project(L.from.x, 2, L.from.y), p1 = project(L.x, 2, L.y), R = L.from.spec.beam*.55;
      c.save(); c.setLineDash([3, 5]); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke(); c.setLineDash([]);
      c.strokeStyle = 'rgba(255,255,255,.95)'; c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); for (let i=0;i<=20;i++){ const a = i/20*6.283, q = project(L.x + Math.cos(a)*R, 2, L.y + Math.sin(a)*R); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.fill(); c.stroke(); c.restore(); }
  }
  if (G.flash){ c.fillStyle = `rgba(240,245,255,${G.flash*.4})`; c.fillRect(0,0,W,H); }

  // red edges when an arrow hits you
  if (G.hurt > 0){ const g = c.createRadialGradient(W/2, H/2, Math.min(W, H)*.35, W/2, H/2, Math.max(W, H)*.75);
    g.addColorStop(0, 'rgba(196,71,59,0)'); g.addColorStop(1, `rgba(196,71,59,${G.hurt*.45})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  // health bars, colored by side: pirates red, navy blue, merchants ochre
  for (const e of enemies){
    if (e.dead || Math.hypot(e.x - S.x, e.y - S.y) > 900) continue;
    // P82: a fortress with towers standing shows a bar over each tower instead; the walls can't be hurt until they fall
    if (e.towers && towersUp(e) && !e.camp){ e.towers.forEach((tw, i) => { if (tw.hp <= 0) return; const p = towerPos(e, i), [tx, ty, tz] = project(p.x, 80*(e.site ? e.site.s : 1) + (e.baseY || 0), p.y); if (tz > 1) return;
      const w = 34; c.fillStyle = 'rgba(34,40,58,.6)'; c.fillRect(tx - w/2 - 2, ty - 2, w + 4, 8); c.fillStyle = tw.hitT ? '#f7eed6' : shipColor(e); c.fillRect(tx - w/2, ty, w*tw.hp/tw.max, 4); }); continue; }
    const [ex, ey, ez] = project(e.x, e.spec.len*.55*(e.site ? e.site.s : 1) + (e.baseY || 0), e.y); if (ez > 1) continue;
    const w = e.spec.len > 100 ? 64 : 46, pct = Math.max(0, e.hull/e.spec.hull);
    c.fillStyle = 'rgba(34,40,58,.6)'; c.fillRect(ex - w/2 - 2, ey - 2, w + 4, 9);
    c.fillStyle = e.hitT ? '#f7eed6' : shipColor(e); c.fillRect(ex - w/2, ey, w*pct, 5);
    if (e.named){ c.save(); c.font = '400 15px Marcellus, Georgia, serif'; c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 3.5; c.strokeStyle = 'rgba(34,20,14,.85)'; c.strokeText(e.named.name, ex, ey - 9); c.fillStyle = '#ffd98a'; c.fillText(e.named.name, ex, ey - 9); c.restore(); }
    else if (e.angry){ c.fillStyle = '#c4473b'; c.font = '800 14px Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('!', ex, ey - 6); }
    if (e === combatState.target){ c.strokeStyle = 'rgba(247,238,214,.9)'; c.lineWidth = 1.5; c.strokeRect(ex - w/2 - 2, ey - 2, w + 4, 9); }
  }
  for (const {is} of HARBORS){ if (Math.hypot(is.x - S.x, is.y - S.y) > 2500) continue; // harbor town names
    const [hx, hy, hz] = project(is.x, is.ht + 60, is.y);
    const dd = Math.hypot(is.x - S.x, is.y - S.y); if (hz < 1 && dd < 1700) banner(is.name, hx, hy, Math.min(1, (1700 - dd)/400), is.city && CITIES[is.city]); } // only nearby towns
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
  // small "+1" pops over the boat (sardines)
  if (G.pops) G.pops = G.pops.filter(p => { if (p.ic){ return drawGain(c, p, t, S); } const k = (t - p.t)/1.1; if (k > 1) return false; const [bx, by] = project(p.x ?? S.x, 60, p.y ?? S.y);
    c.font = `800 ${p.c ? 20 : 15}px Nunito, system-ui, sans-serif`; c.textAlign = 'center'; c.globalAlpha = 1 - k; c.fillStyle = p.c || 'rgb(247,238,214)'; c.fillText(p.txt, bx + 18, by - k*26); c.globalAlpha = 1; return true; });
  if (G.act && G.act.type !== 'shore'){
    const [bx, by] = project(S.x, 70, S.y);
    c.fillStyle = 'rgba(247,238,214,.95)'; c.beginPath(); c.arc(bx, by, 16, 0, Math.PI*2); c.fill();
    if (G.act.full){ c.fillStyle = '#c4473b'; c.font = '800 16px Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', bx, by+1); c.textBaseline = 'alphabetic'; }
    else { c.strokeStyle = G.act.type === 'shore' ? '#1f6b8f' : G.act.type === 'wreck' ? '#d48a2a' : G.act.type === 'mine' ? '#5d6773' : '#6d7d38'; c.lineWidth = 4; c.beginPath(); c.arc(bx, by, 10, -Math.PI/2, -Math.PI/2 + G.act.p*Math.PI*2); c.stroke(); }
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
    if (G.rowT > 0){ c.strokeStyle = 'rgba(94,195,232,.7)'; c.lineWidth = 4; c.beginPath(); c.arc(j.bx, j.by, JOY_RADIUS + 6, 0, Math.PI*2); c.stroke(); }
  }

  drawMiniEl(S);

  if (G.settings.showFps){
    c.font = '800 12px Nunito, system-ui, sans-serif'; c.textAlign = 'left'; c.fillStyle = fps >= 50 ? '#cfe8c0' : fps >= 35 ? '#f2d58a' : '#f2a093';
    c.fillText(`${Math.round(fps)} fps`, 80, H - 14);
  }
}

// P65: the minimap and its wooden rim have their own canvas at the phone's full sharpness (up to 4x), so they stay crisp even though the
// 3D view is drawn at a lower resolution. The rim is drawn once and kept; the map inside changes every few frames.
const miniEl = document.getElementById('miniEl'), PAD = 6;
let miniTick = 0, rimCv = null;
const seeded = n => { let s = n; return () => (s = (s*16807) % 2147483647)/2147483647; };
function buildRim(ms, rim, md){
  const R = ms/2, sz = ms + (rim + PAD)*2, cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(sz*md);
  const g = cv.getContext('2d'), cx = sz/2, cy = sz/2, u = rim/11, rnd = seeded(77); g.scale(md, md);
  const ring = () => { g.beginPath(); g.arc(cx, cy, R + rim, 0, 6.2832); g.arc(cx, cy, R, 0, 6.2832, true); };
  // a soft shadow under the whole thing, then the wood
  g.save(); g.shadowColor = 'rgba(30,18,8,.45)'; g.shadowBlur = 9*u; g.shadowOffsetY = 3.5*u; ring(); g.fillStyle = '#7d5129'; g.fill(); g.restore();
  g.save(); ring(); g.clip();
  const wg = g.createLinearGradient(cx - R, cy - R - rim, cx + R, cy + R + rim); wg.addColorStop(0, '#c99a62'); wg.addColorStop(.5, '#a8743f'); wg.addColorStop(1, '#7f512a'); g.fillStyle = wg; g.fillRect(0, 0, sz, sz);
  // wood grain: many fine lines following the ring, some long, some short, light and dark
  for (let i=0;i<150;i++){ const r = R + rnd()*rim, a0 = rnd()*6.2832, len = .12 + rnd()*.8; g.strokeStyle = rnd() < .62 ? `rgba(58,32,12,${.1 + rnd()*.3})` : `rgba(255,220,165,${.06 + rnd()*.18})`; g.lineWidth = (.25 + rnd()*.55)*u; g.beginPath(); g.arc(cx, cy, r, a0, a0 + len); g.stroke(); }
  // a few knots in the wood
  for (let i=0;i<5;i++){ const a = rnd()*6.2832, r = R + rim*(.3 + rnd()*.4), x = cx + Math.cos(a)*r, y = cy + Math.sin(a)*r; for (let k=3;k>=1;k--){ g.strokeStyle = `rgba(52,28,10,${.32 - k*.05})`; g.lineWidth = .45*u; g.beginPath(); g.ellipse(x, y, k*1.3*u, k*.8*u, a + 1.57, 0, 6.2832); g.stroke(); } }
  g.restore();
  // rounded edges: light from the top left along the outside, dark along the inside
  const edge = (r, w, c0, c1) => { const lg = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); lg.addColorStop(0, c0); lg.addColorStop(1, c1); g.strokeStyle = lg; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.stroke(); };
  edge(R + rim - .9*u, 1.8*u, 'rgba(255,226,175,.75)', 'rgba(60,32,12,.45)'); edge(R + 1.6*u, 1.6*u, 'rgba(45,24,8,.5)', 'rgba(255,220,165,.4)');
  g.strokeStyle = '#3a2410'; g.lineWidth = 1.1*u; g.beginPath(); g.arc(cx, cy, R + rim, 0, 6.2832); g.stroke();
  // tick marks
  for (let i=0;i<32;i++){ if (i % 8 === 0) continue; const a = i/32*6.2832 - 1.5708, mid = i % 4 === 0, l = mid ? rim*.42 : rim*.24, r0 = R + 2.5*u;
    g.strokeStyle = 'rgba(40,22,8,.85)'; g.lineWidth = (mid ? 1.15 : .8)*u; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + Math.cos(a)*r0, cy + Math.sin(a)*r0); g.lineTo(cx + Math.cos(a)*(r0 + l), cy + Math.sin(a)*(r0 + l)); g.stroke(); }
  // brass studs between the letters
  for (let i=0;i<4;i++){ const a = i*1.5708 + .7854, x = cx + Math.cos(a)*(R + rim*.58), y = cy + Math.sin(a)*(R + rim*.58), r = 2.3*u, bg = g.createRadialGradient(x - r*.4, y - r*.45, .1, x, y, r);
    bg.addColorStop(0, '#fff6cf'); bg.addColorStop(.45, '#e0b95c'); bg.addColorStop(1, '#7c5a1c'); g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(40,22,8,.7)'; g.lineWidth = .5*u; g.stroke(); }
  // N, E, S, W carved in
  g.font = `800 ${9.5*u}px Nunito, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  [['N', -1.5708], ['E', 0], ['S', 1.5708], ['W', 3.1416]].forEach(([l, a]) => { const x = cx + Math.cos(a)*(R + rim*.56), y = cy + Math.sin(a)*(R + rim*.56); g.fillStyle = 'rgba(255,232,190,.7)'; g.fillText(l, x, y + .7*u); g.fillStyle = l === 'N' ? '#a8301f' : '#2a1608'; g.fillText(l, x, y); });
  // the thin brass ring around the map, with a shine, and the shadow it throws onto the map
  const br = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); br.addColorStop(0, '#fff0b8'); br.addColorStop(.35, '#d9b25a'); br.addColorStop(.7, '#a07c2c'); br.addColorStop(1, '#e8c66e'); g.strokeStyle = br; g.lineWidth = 2*u; g.beginPath(); g.arc(cx, cy, R + .5*u, 0, 6.2832); g.stroke();
  g.save(); g.beginPath(); g.arc(cx, cy, R - .3*u, 0, 6.2832); g.clip(); const sh = g.createRadialGradient(cx, cy + 1.5*u, R*.8, cx, cy + 1.5*u, R + 1); sh.addColorStop(0, 'rgba(30,18,6,0)'); sh.addColorStop(1, 'rgba(30,18,6,.34)'); g.fillStyle = sh; g.fillRect(0, 0, sz, sz); g.restore();
  return cv;
}
function drawMiniEl(S){
  if (!mini) buildMini();
  const u = G.uik || 1, ms = 112*u, rim = 11*u, md = Math.min(4, devicePixelRatio || 1), sz = ms + (rim + PAD)*2, px = Math.ceil(sz*md);
  if (miniEl.width !== px || !rimCv){ miniEl.width = miniEl.height = px; miniEl.style.width = miniEl.style.height = sz + 'px'; rimCv = buildRim(ms, rim, md); miniTick = 0; }
  const cx = view.W - ms/2 - 12 - 6*u, cy = 10 + 8*u + ms/2 + topInset();
  miniEl.style.left = (cx - sz/2) + 'px'; miniEl.style.top = (cy - sz/2) + 'px';
  if ((miniTick = (miniTick + 1) % 3) !== 1) return;
  const m = miniEl.getContext('2d'); m.setTransform(md, 0, 0, md, 0, 0); m.clearRect(0, 0, sz, sz); m.imageSmoothingQuality = 'high';
  drawMini(m, sz/2, sz/2, ms, S);
  m.setTransform(1, 0, 0, 1, 0, 0); m.drawImage(rimCv, 0, 0); m.setTransform(md, 0, 0, md, 0, 0);
  const ox = sz/2, oy = sz/2;
  // which way the wind blows: a white arrow across the little map, stronger wind = more solid
  if (WIND.windK > .2){ const a = WIND.windA, al = Math.min(.85, WIND.windK);
    m.save(); m.translate(ox, oy); m.rotate(a); m.globalAlpha = al; m.strokeStyle = '#f4fbff'; m.fillStyle = '#f4fbff'; m.lineWidth = 2.2*u; m.lineCap = 'round';
    m.beginPath(); m.moveTo(-ms*.36, 0); m.lineTo(ms*.3, 0); m.stroke(); m.beginPath(); m.moveTo(ms*.38, 0); m.lineTo(ms*.27, -5*u); m.lineTo(ms*.27, 5*u); m.closePath(); m.fill();
    for (const f of [-.36, -.29]){ m.beginPath(); m.moveTo(ms*f, 0); m.lineTo(ms*(f - .06), -5*u); m.moveTo(ms*f, 0); m.lineTo(ms*(f - .06), 5*u); m.stroke(); } m.restore(); }
  // the nearest goal off the little map: a red arrow on its rim pointing the way
  let gm = null, gd = Infinity; for (const g of G.goalMarks || []){ const d = Math.hypot(g.x - S.x, g.y - S.y); if (d < gd){ gd = d; gm = g; } }
  if (gm && gd > MINI_RANGE*.9){ const a = Math.atan2(gm.y - S.y, gm.x - S.x), r = ms/2 - 2, ax = ox + Math.cos(a)*r, ay = oy + Math.sin(a)*r, pulse = 1 + Math.sin(G.t*5)*.12;
    m.save(); m.translate(ax, ay); m.rotate(a); m.scale(pulse*u, pulse*u); m.fillStyle = '#e0614d'; m.strokeStyle = '#2a1d17'; m.lineWidth = 1.5;
    m.beginPath(); m.moveTo(7, 0); m.lineTo(-5, -6); m.lineTo(-2, 0); m.lineTo(-5, 6); m.closePath(); m.fill(); m.stroke(); m.restore(); }
}
function drawMini(c, cx, cy, ms, S){
  const k = ms/2/MINI_RANGE;
  c.save(); c.beginPath(); c.arc(cx, cy, ms/2, 0, Math.PI*2); c.clip();
  c.fillStyle = '#dccaa2'; c.fillRect(cx - ms/2, cy - ms/2, ms, ms); // unexplored water is blank paper, like on the chart
  c.translate(cx, cy); c.translate(-S.x*k, -S.y*k);
  c.drawImage(mini, 0, 0, WORLD*k, WORLD*k);
  // P60: nearby islands as sharp outlines (the world picture is too coarse for a phone screen)
  for (const i of ISLANDS){ if (Math.abs(i.x - S.x) > MINI_RANGE + i.r || Math.abs(i.y - S.y) > MINI_RANGE + i.r) continue;
    islandPath(c, i, 0, k); c.fillStyle = '#efdcaa'; c.fill(); c.strokeStyle = '#6b5236'; c.lineWidth = 1; c.stroke();
    if (i.tiers[1]){ islandPath(c, i, 1, k); c.fillStyle = '#9fbe62'; c.fill(); } if (i.tiers[2]){ islandPath(c, i, 2, k); c.fillStyle = '#b4a888'; c.fill(); } }
  c.drawImage(fogLayer('#dccaa2'), 0, 0, WORLD*k, WORLD*k);
  for (const i of ISLANDS) if (i.mine && isExplored(i.mine.x, i.mine.y)){ c.fillStyle = '#4a525c'; c.strokeStyle = '#efe6cf'; c.lineWidth = 1; c.beginPath(); c.rect(i.mine.x*k - 3, i.mine.y*k - 3, 6, 6); c.fill(); c.stroke(); }
  c.strokeStyle = '#3e2b1c'; c.lineWidth = 1;
  for (const h of HARBORS){ c.fillStyle = h.is.city ? CITIES[h.is.city].color : '#d48a2a'; c.beginPath(); c.arc(h.dock.x*k, h.dock.y*k, 3, 0, Math.PI*2); c.fill(); c.stroke(); }
  if (G.dest){ c.fillStyle = '#e0614d'; c.beginPath(); c.arc(G.dest.x*k, G.dest.y*k, 3, 0, Math.PI*2); c.fill(); }
  WRECKS.forEach(w => { if (G.settings.dev.markers && w.stock && isExplored(w.x, w.y)){ c.fillStyle = '#f4fbff'; c.fillRect(w.x*k-1.5, w.y*k-1.5, 3, 3); } });
  enemies.forEach(e => { const d = Math.hypot(e.x - S.x, e.y - S.y);
    if (e.dead || d > (e.guard ? 2200 : e.spec.side === 'pirate' ? e.spec.sight*1.3 : MINI_RANGE)) return; // P67: a fortress's guards show from further off, so you can see where they are
    c.fillStyle = shipColor(e); c.strokeStyle = 'rgba(30,20,12,.7)'; c.lineWidth = 1; c.beginPath(); if (e.fort) c.rect(e.x*k - 4, e.y*k - 4, 8, 8); else c.arc(e.x*k, e.y*k, 3, 0, Math.PI*2); c.fill(); c.stroke(); });
  if (whale.state !== 'gone' && whale.state !== 'dive'){ c.fillStyle = '#bfe3f5'; c.beginPath(); c.ellipse(whale.x*k, whale.y*k, 5, 3, whale.a, 0, Math.PI*2); c.fill(); }
  if (bottle.on){ c.fillStyle = '#bfe8d2'; c.fillRect(bottle.x*k - 2, bottle.y*k - 2, 4, 4); }
  if (S.treasure){ const tx = S.treasure.x*k, ty = S.treasure.y*k; c.strokeStyle = '#e0614d'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx - 4, ty - 4); c.lineTo(tx + 4, ty + 4); c.moveTo(tx + 4, ty - 4); c.lineTo(tx - 4, ty + 4); c.stroke(); }
  if (S.pin) for (const f of planSources(S.pin)){ c.strokeStyle = '#ffd25e'; c.lineWidth = 2; c.beginPath(); c.arc(f.x*k, f.y*k, 7, 0, Math.PI*2); c.stroke(); } // P70: where your pinned ship's plans are
  if (omen.on){ const p = G.t % 1; c.fillStyle = OMENS[omen.g].color; c.strokeStyle = 'rgba(30,20,12,.8)'; c.lineWidth = 1.5; c.beginPath(); c.arc(omen.x*k, omen.y*k, 3.5 + p*2, 0, Math.PI*2); c.fill(); c.stroke(); } // P78: a god's fire
  for (const m of G.goalMarks || []){ c.strokeStyle = '#e0614d'; c.lineWidth = 2; c.beginPath(); c.arc(m.x*k, m.y*k, 4 + (G.t*2 % 1)*4, 0, Math.PI*2); c.stroke(); } // the chapter goal pulses
  // you: a white arrow pointing where the ship is heading
  c.save(); c.translate(S.x*k, S.y*k); c.rotate(S.a); c.fillStyle = '#fff'; c.strokeStyle = '#3e2b1c'; c.lineWidth = 1.4; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(7, 0); c.lineTo(-5, -5); c.lineTo(-2.5, 0); c.lineTo(-5, 5); c.closePath(); c.fill(); c.stroke(); c.restore();
  c.restore();
}
