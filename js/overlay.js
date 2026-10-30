// The flat 2D layer over the 3D view: rain, lightning, labels, progress ring, joystick, minimap, frame rate.
import {WORLD, ISLANDS, WRECKS, SHOALS, shoalOn, HARBORS, STADION, CITIES, zoneAt, hash} from './world.js?v=fdeb845';
import {G, isExplored} from './state.js?v=fdeb845';
import {fogLayer, islandPath} from './map.js?v=fdeb845';
import {view, project} from './scene.js?v=fdeb845';
import {JOY_RADIUS} from './input.js?v=fdeb845';
import {enemies, combatState, capture} from './combat.js?v=fdeb845';
import {drawFish} from './fishing.js?v=fdeb845';
import {whale} from './wildlife.js?v=fdeb845';
import {SHORE_FISH} from './config.js?v=fdeb845';
import {bottle} from './quests.js?v=fdeb845';

const MINI_RANGE = 2600, SIDE_COLOR = {pirate:'#e0614d', merchant:'#e8dcc0'};
const shipColor = e => (e.spec.side === 'navy' || e.spec.side === 'fort') && e.city ? CITIES[e.city].color : SIDE_COLOR[e.spec.side === 'fort' ? 'pirate' : e.spec.side];
const ov = document.getElementById('ov'), c = ov.getContext('2d');
export function resizeOverlay(){ ov.width = view.W*view.DPR; ov.height = view.H*view.DPR; }

let mini = null;
function buildMini(){
  const s = 1024, m = document.createElement('canvas'); m.width = m.height = s; const g = m.getContext('2d'), k = s/WORLD;
  const img = g.createImageData(s, s);
  for (let y=0;y<s;y++) for (let x=0;x<s;x++){ const z = zoneAt(x/k, y/k), col = z === 0 ? [79,183,174] : z === 1 ? [29,106,140] : [38,60,79]; img.data.set([...col, 255], (y*s+x)*4); }
  g.putImageData(img, 0, 0);
  g.fillStyle = '#e6d29c'; ISLANDS.forEach(i => { islandPath(g, i, 0, k); g.fill(); });
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

export function drawOverlay(fps){
  const {W, H, DPR} = view, S = G.S, t = G.t;
  c.setTransform(DPR,0,0,DPR,0,0); c.clearRect(0,0,W,H);
  if (G.stormK > .05){
    c.strokeStyle = `rgba(215,228,240,${.35*G.stormK})`; c.lineWidth = 1.2;
    for (let k=0;k<90;k++){ const rx = (hash(k,1)*W*1.2 + t*160) % (W*1.2) - W*.1, ry = (hash(k,2)*H + t*760) % H; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx-7, ry+20); c.stroke(); }
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
    for (let k=0;k<7;k++){ const ph = (t*.9 + hash(s.x, k)) % 1; if (ph > .4) continue;
      const gx = s.x + (hash(k, s.y) - .5)*90, gy = s.y + (hash(s.y, k) - .5)*90, [px, py, pz] = project(gx, 2, gy); if (pz > 1) continue;
      const a = Math.sin(ph/.4*Math.PI); c.fillStyle = `rgba(244,251,255,${.75*a})`; c.beginPath(); c.ellipse(px, py, 5*a + 1.5, 2.2*a + .6, 0, 0, Math.PI*2); c.fill(); }
  }
  // small "+1" pops over the boat (sardines)
  if (G.pops) G.pops = G.pops.filter(p => { const k = (t - p.t)/1.1; if (k > 1) return false; const [bx, by] = project(p.x ?? S.x, 60, p.y ?? S.y);
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
  const ms = 112, cx = W - ms/2 - 12, cy = 10 + ms/2 + topInset(), k = ms/2/MINI_RANGE;
  c.save(); c.beginPath(); c.arc(cx, cy, ms/2, 0, Math.PI*2); c.clip();
  c.fillStyle = '#1c2a36'; c.fillRect(cx - ms/2, cy - ms/2, ms, ms);
  c.translate(cx, cy); c.rotate(Math.PI/4); c.translate(-S.x*k, -S.y*k);
  c.drawImage(mini, 0, 0, WORLD*k, WORLD*k);
  c.drawImage(fogLayer('#1c2a36'), 0, 0, WORLD*k, WORLD*k);
  for (const h of HARBORS){ c.fillStyle = h.is.city ? CITIES[h.is.city].color : '#d48a2a'; c.beginPath(); c.arc(h.dock.x*k, h.dock.y*k, 2.5, 0, Math.PI*2); c.fill(); }
  if (G.dest){ c.fillStyle = '#e0614d'; c.beginPath(); c.arc(G.dest.x*k, G.dest.y*k, 3, 0, Math.PI*2); c.fill(); }
  WRECKS.forEach(w => { if (G.settings.dev.markers && w.stock && isExplored(w.x, w.y)){ c.fillStyle = '#f4fbff'; c.fillRect(w.x*k-1.5, w.y*k-1.5, 3, 3); } });
  enemies.forEach(e => { const d = Math.hypot(e.x - S.x, e.y - S.y);
    if (e.dead || d > (e.spec.side === 'pirate' ? e.spec.sight*1.3 : MINI_RANGE)) return;
    c.fillStyle = shipColor(e); c.beginPath(); if (e.fort) c.rect(e.x*k - 4, e.y*k - 4, 8, 8); else c.arc(e.x*k, e.y*k, 3, 0, Math.PI*2); c.fill(); });
  if (whale.state !== 'gone' && whale.state !== 'dive'){ c.fillStyle = '#bfe3f5'; c.beginPath(); c.ellipse(whale.x*k, whale.y*k, 5, 3, whale.a, 0, Math.PI*2); c.fill(); }
  if (bottle.on){ c.fillStyle = '#bfe8d2'; c.fillRect(bottle.x*k - 2, bottle.y*k - 2, 4, 4); }
  if (S.treasure){ const tx = S.treasure.x*k, ty = S.treasure.y*k; c.strokeStyle = '#e0614d'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx - 4, ty - 4); c.lineTo(tx + 4, ty + 4); c.moveTo(tx + 4, ty - 4); c.lineTo(tx - 4, ty + 4); c.stroke(); }
  c.fillStyle = '#fff'; c.beginPath(); c.arc(S.x*k, S.y*k, 3.5, 0, Math.PI*2); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(247,238,214,.75)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, ms/2, 0, Math.PI*2); c.stroke();

  if (G.settings.showFps){
    c.font = '800 12px Nunito, system-ui, sans-serif'; c.textAlign = 'left'; c.fillStyle = fps >= 50 ? '#cfe8c0' : fps >= 35 ? '#f2d58a' : '#f2a093';
    c.fillText(`${Math.round(fps)} fps`, 80, H - 14);
  }
}
