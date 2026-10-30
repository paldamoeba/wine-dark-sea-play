// The flat 2D layer over the 3D view: rain, lightning, labels, progress ring, joystick, minimap, frame rate.
import {WORLD, ISLANDS, WRECKS, DOCK, STADION, home, zoneAt, hash} from './world.js';
import {G, isExplored} from './state.js';
import {fogLayer} from './map.js';
import {view, project} from './scene.js';
import {JOY_RADIUS} from './input.js';

const ov = document.getElementById('ov'), c = ov.getContext('2d');
export function resizeOverlay(){ ov.width = view.W*view.DPR; ov.height = view.H*view.DPR; }

let mini = null;
function buildMini(){
  const s = 224, m = document.createElement('canvas'); m.width = m.height = s; const g = m.getContext('2d'), k = s/WORLD;
  const img = g.createImageData(s, s);
  for (let y=0;y<s;y++) for (let x=0;x<s;x++){ const z = zoneAt(x/k, y/k), col = z === 0 ? [79,183,174] : z === 1 ? [29,106,140] : [38,60,79]; img.data.set([...col, 255], (y*s+x)*4); }
  g.putImageData(img, 0, 0);
  g.fillStyle = '#e6d29c'; ISLANDS.forEach(i => { g.beginPath(); g.arc(i.x*k, i.y*k, Math.max(3, i.r*k), 0, Math.PI*2); g.fill(); });
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

  const [hx, hy, hz] = project(home.x, home.ht + 60, home.y);
  if (hz < 1){ c.font = '400 20px Marcellus, Georgia, serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(34,40,58,.85)'; c.fillText(home.name, hx, hy); }
  if (G.dest){
    const [dx, dy, dz] = project(G.dest.x, 0, G.dest.y), p = (t*1.5) % 1, r = 9 + p*12, M = 46;
    const onScreen = dz < 1 && dx > M && dx < W-M && dy > M+60 && dy < H-M;
    if (onScreen){ c.strokeStyle = `rgba(244,251,255,${.9-p*.6})`; c.lineWidth = 2.5; c.beginPath(); c.ellipse(dx, dy, r, r*.6, 0, 0, Math.PI*2); c.stroke(); }
    else if (G.dest.far) courseArrow(dx, dy, dz, W, H, M);
  }
  if (G.act){
    const [bx, by] = project(S.x, 70, S.y);
    c.fillStyle = 'rgba(247,238,214,.95)'; c.beginPath(); c.arc(bx, by, 16, 0, Math.PI*2); c.fill();
    if (G.act.full){ c.fillStyle = '#c4473b'; c.font = '800 16px Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', bx, by+1); c.textBaseline = 'alphabetic'; }
    else { c.strokeStyle = G.act.type === 'fish' ? '#1f6b8f' : G.act.type === 'wreck' ? '#d48a2a' : '#6d7d38'; c.lineWidth = 4; c.beginPath(); c.arc(bx, by, 10, -Math.PI/2, -Math.PI/2 + G.act.p*Math.PI*2); c.stroke(); }
  }
  if (G.joy){
    const j = G.joy;
    c.fillStyle = 'rgba(247,238,214,.18)'; c.strokeStyle = 'rgba(247,238,214,.6)'; c.lineWidth = 2;
    c.beginPath(); c.arc(j.bx, j.by, JOY_RADIUS, 0, Math.PI*2); c.fill(); c.stroke();
    c.fillStyle = 'rgba(247,238,214,.85)'; c.beginPath(); c.arc(j.bx + j.vx*JOY_RADIUS, j.by + j.vy*JOY_RADIUS, 24, 0, Math.PI*2); c.fill();
  }

  // round minimap, turned to match the camera
  if (!mini) buildMini();
  const ms = 112, cx = W - ms/2 - 12, cy = 10 + ms/2 + topInset(), k = ms/WORLD;
  c.save(); c.beginPath(); c.arc(cx, cy, ms/2, 0, Math.PI*2); c.clip();
  c.translate(cx, cy); c.rotate(Math.PI/4); c.translate(-ms/2, -ms/2);
  c.drawImage(mini, 0, 0, ms, ms);
  c.drawImage(fogLayer('#1c2a36'), 0, 0, ms, ms);
  c.fillStyle = '#d48a2a'; c.beginPath(); c.arc(DOCK.x*k, DOCK.y*k, 2.5, 0, Math.PI*2); c.fill();
  if (G.dest){ c.fillStyle = '#e0614d'; c.beginPath(); c.arc(G.dest.x*k, G.dest.y*k, 3, 0, Math.PI*2); c.fill(); }
  WRECKS.forEach(w => { if (G.settings.dev.markers && w.stock && isExplored(w.x, w.y)){ c.fillStyle = '#f4fbff'; c.fillRect(w.x*k-1.5, w.y*k-1.5, 3, 3); } });
  c.fillStyle = '#fff'; c.beginPath(); c.arc(S.x*k, S.y*k, 3.5, 0, Math.PI*2); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(247,238,214,.75)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, ms/2, 0, Math.PI*2); c.stroke();

  if (G.settings.showFps){
    c.font = '800 12px Nunito, system-ui, sans-serif'; c.textAlign = 'left'; c.fillStyle = fps >= 50 ? '#cfe8c0' : fps >= 35 ? '#f2d58a' : '#f2a093';
    c.fillText(`${Math.round(fps)} fps`, 14, H - 14);
  }
}
