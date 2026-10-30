// Touch, mouse and keyboard. Tap = sail there. Press and drag = joystick.
import {G, ship, saveSettings} from './state.js';
import {ISLANDS} from './world.js';
import {canvas, screenToSea} from './scene.js';
import {hideHint, toast} from './ui.js';

export const JOY_RADIUS = 58;
const keys = new Set();
let ptr = null;

// ---- builder zoom: pinch with two fingers, or the mouse wheel ----
export const ZOOM_MIN = .4, ZOOM_MAX = 3.5;
let pinch = null, zoomSaveT = 0;
export function setZoom(z){
  G.settings.dev.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  document.dispatchEvent(new Event('zoom'));
  clearTimeout(zoomSaveT); zoomSaveT = setTimeout(saveSettings, 400);
}
const others = new Map();
canvas.addEventListener('wheel', e => { e.preventDefault(); if (!G.sheetOpen) setZoom(G.settings.dev.zoom * Math.exp(e.deltaY*.001)); }, {passive:false});

canvas.addEventListener('pointerdown', e => {
  if (ptr && e.pointerId !== ptr.id && !G.sheetOpen){ // second finger: pinch to zoom
    others.set(e.pointerId, {x:e.clientX, y:e.clientY});
    const o = [...others.values()][0];
    pinch = {d: Math.hypot(o.x - ptr.cx, o.y - ptr.cy) || 1, z: G.settings.dev.zoom};
    ptr.moved = true; G.joy = null; G.dest = null;
    return;
  }
  if (ptr || G.sheetOpen) return;
  ptr = {id:e.pointerId, sx:e.clientX, sy:e.clientY, cx:e.clientX, cy:e.clientY, moved:false};
  try { canvas.setPointerCapture(e.pointerId); } catch(_){}
  hideHint();
});
canvas.addEventListener('pointermove', e => {
  if (others.has(e.pointerId)) others.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (ptr && e.pointerId === ptr.id){ ptr.cx = e.clientX; ptr.cy = e.clientY; }
  if (pinch && ptr){ const o = [...others.values()][0]; if (o) setZoom(pinch.z * pinch.d / (Math.hypot(o.x - ptr.cx, o.y - ptr.cy) || 1)); return; }
  if (!ptr || e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.sx, dy = e.clientY - ptr.sy, d = Math.hypot(dx, dy);
  if (!ptr.moved && d > 12){ ptr.moved = true; G.dest = null; }
  if (ptr.moved){ const k = Math.min(1, d/JOY_RADIUS); G.joy = {bx:ptr.sx, by:ptr.sy, vx: d ? dx/d*k : 0, vy: d ? dy/d*k : 0}; }
});
function endPtr(e){
  if (others.has(e.pointerId)){ others.delete(e.pointerId); if (!others.size) pinch = null; return; }
  if (!ptr || e.pointerId !== ptr.id) return;
  if (pinch){ pinch = null; others.clear(); ptr = null; G.joy = null; return; }
  if (!ptr.moved && !G.sheetOpen){
    if (G.fish) document.dispatchEvent(new Event('fishtap')); // fishing: a tap is a try, not a course
    else { const p = screenToSea(ptr.sx, ptr.sy); if (p) G.dest = p; }
  }
  ptr = null; G.joy = null;
}
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
const MOVE_KEYS = new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright']);
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!MOVE_KEYS.has(k) || G.mapOpen || G.sheetOpen) return;
  keys.add(k); G.dest = null; hideHint();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

// Screen directions -> world directions for the diagonal camera.
const toWorld = (ix, iy) => [(ix + iy)*Math.SQRT1_2, (iy - ix)*Math.SQRT1_2];

// On a set course, bend around any island in the way instead of bumping into it.
function avoidIslands(S, ux, uy, dist){
  const beam = ship().beam;
  let ax = ux, ay = uy;
  for (const is of ISLANDS){
    const ox = is.x - S.x, oy = is.y - S.y, along = ox*ux + oy*uy;
    if (along <= 0 || along > Math.min(dist, 380)) continue;
    const px = ox - ux*along, py = oy - uy*along, perp = Math.hypot(px, py), clear = is.r*1.05 + beam + 45;
    if (perp >= clear) continue;
    const [sx, sy] = perp > 1 ? [-px/perp, -py/perp] : [-uy, ux], w = (clear - perp)/clear * 1.6;
    ax += sx*w; ay += sy*w;
  }
  const m = Math.hypot(ax, ay) || 1; return [ax/m, ay/m];
}

// Where the player wants to go this frame: [x, y] with length 0..1.
export function steering(S){
  if (G.joy) return toWorld(G.joy.vx, G.joy.vy);
  if (keys.size){
    let kx = 0, ky = 0;
    if (keys.has('w') || keys.has('arrowup')) ky -= 1; if (keys.has('s') || keys.has('arrowdown')) ky += 1;
    if (keys.has('a') || keys.has('arrowleft')) kx -= 1; if (keys.has('d') || keys.has('arrowright')) kx += 1;
    const m = Math.hypot(kx, ky); return m ? toWorld(kx/m, ky/m) : [0, 0];
  }
  if (G.dest){
    const dx = G.dest.x - S.x, dy = G.dest.y - S.y, d = Math.hypot(dx, dy);
    if (d < (G.dest.far ? 40 : 18)){ if (G.dest.far) toast('You have arrived'); G.dest = null; return [0, 0]; }
    const [ux, uy] = avoidIslands(S, dx/d, dy/d, d), k = Math.min(1, d/110);
    return [ux*k, uy*k];
  }
  return [0, 0];
}
