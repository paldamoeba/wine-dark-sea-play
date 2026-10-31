// Touch, mouse and keyboard. Double tap = sail there (a single tap only marks the spot). Press and drag = joystick.
// Volley: while one thumb steers, a quick tap with another finger anywhere; or a double tap on your own ship.
// Two fingers moving apart or together: zoom in and out a little.
import {G, ship, saveSettings} from './state.js?v=1ea44ec';
import {landDist} from './world.js?v=1ea44ec';
import {canvas, screenToSea} from './scene.js?v=1ea44ec';
import {hideHint, toast} from './ui.js?v=1ea44ec';

export const JOY_RADIUS = 58;
const keys = new Set();
let ptr = null, lastTap = null;

// ---- builder zoom: pinch with two fingers, or the mouse wheel ----
export const ZOOM_MIN = .4, ZOOM_MAX = 3.5;
let pinch = null, zoomSaveT = 0;
// P50: players can zoom a little too (PZOOM range, saved as settings.pzoom); builder tools zoom much further.
export const PZOOM = [.75, 1.4];
export const curZoom = () => G.settings.builder ? G.settings.dev.zoom : (G.settings.pzoom || 1);
export function setZoom(z){
  if (!G.settings.builder) G.settings.pzoom = Math.max(PZOOM[0], Math.min(PZOOM[1], z));
  else G.settings.dev.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  document.dispatchEvent(new Event('zoom'));
  clearTimeout(zoomSaveT); zoomSaveT = setTimeout(saveSettings, 400);
}
const others = new Map();
canvas.addEventListener('wheel', e => { e.preventDefault(); if (!G.sheetOpen) setZoom(curZoom() * Math.exp(e.deltaY*.001)); }, {passive:false});

canvas.addEventListener('pointerdown', e => {
  if (ptr && e.pointerId !== ptr.id && !G.sheetOpen){ // second finger: a quick tap fires the volley; in builder mode, moving it pinches to zoom
    others.set(e.pointerId, {x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY, t:performance.now()});
    return;
  }
  if (ptr || G.sheetOpen) return;
  ptr = {id:e.pointerId, sx:e.clientX, sy:e.clientY, cx:e.clientX, cy:e.clientY, moved:false};
  try { canvas.setPointerCapture(e.pointerId); } catch(_){}
  hideHint();
});
canvas.addEventListener('pointermove', e => {
  if (others.has(e.pointerId)){ const o = others.get(e.pointerId); o.x = e.clientX; o.y = e.clientY;
    if (!pinch && ptr && Math.hypot(o.x - o.sx, o.y - o.sy) > 20){ pinch = {d: Math.hypot(o.x - ptr.cx, o.y - ptr.cy) || 1, z: curZoom()}; ptr.moved = true; G.joy = null; G.dest = null; } }
  if (ptr && e.pointerId === ptr.id){ ptr.cx = e.clientX; ptr.cy = e.clientY; }
  if (pinch && ptr){ const o = [...others.values()][0]; if (o) setZoom(pinch.z * pinch.d / (Math.hypot(o.x - ptr.cx, o.y - ptr.cy) || 1)); return; }
  if (!ptr || e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.sx, dy = e.clientY - ptr.sy, d = Math.hypot(dx, dy);
  if (!ptr.moved && d > 12){ ptr.moved = true; G.dest = null; }
  if (ptr.moved){ const k = Math.min(1, d/JOY_RADIUS); G.joy = {bx:ptr.sx, by:ptr.sy, vx: d ? dx/d*k : 0, vy: d ? dy/d*k : 0}; }
});
function endPtr(e){
  if (others.has(e.pointerId)){ const o = others.get(e.pointerId); others.delete(e.pointerId);
    if (!pinch && e.type === 'pointerup' && performance.now() - o.t < 350 && Math.hypot(o.x - o.sx, o.y - o.sy) < 20) document.dispatchEvent(new Event('volley'));
    if (!others.size) pinch = null; return; }
  if (!ptr || e.pointerId !== ptr.id) return;
  if (pinch){ pinch = null; others.clear(); ptr = null; G.joy = null; return; }
  if (!ptr.moved && !G.sheetOpen){
    if (G.fish) document.dispatchEvent(new Event('fishtap')); // fishing: a tap is a try, not a course
    else {
      // two taps close together in time and place set the course; one tap just shows a little ring
      const p = screenToSea(ptr.sx, ptr.sy), now = performance.now(), tp = lastTap;
      if (p && tp && now - tp.t < 420 && Math.hypot(ptr.sx - tp.sx, ptr.sy - tp.sy) < 45){ lastTap = null; G.tapMark = null;
        if (Math.hypot(p.x - G.S.x, p.y - G.S.y) < Math.max(60, ship().len*.7)) document.dispatchEvent(new Event('volley')); // double tap on your own ship
        else G.dest = p; }
      else if (p){ lastTap = {t:now, sx:ptr.sx, sy:ptr.sy}; G.tapMark = {x:p.x, y:p.y, t:G.t};
        if ((G.S.singleTaps = (G.S.singleTaps || 0) + 1) === 3) toast('Double tap to sail there', 2.2); }
    }
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

// Screen directions -> world directions. North is up on screen, so they are the same.
const toWorld = (ix, iy) => [ix, iy];

// On a set course, bend around land in the way instead of bumping into it: feel ahead, and turn toward the first clear heading.
function avoidIslands(S, ux, uy, dist){
  const look = Math.min(dist, 340), clear = ship().beam + 30, a0 = Math.atan2(uy, ux);
  const open = a => [.3, .6, 1].every(k => landDist(S.x + Math.cos(a)*look*k, S.y + Math.sin(a)*look*k) > clear);
  if (open(a0)) return [ux, uy];
  const side = avoidSide(S, a0);
  for (const off of [.3, .6, .9, 1.25, 1.6, 2]) for (const sg of [side, -side]){ const a = a0 + off*sg; if (open(a)) return [Math.cos(a), Math.sin(a)]; }
  return [ux, uy];
}
// Keep turning the same way around an island instead of flipping back and forth.
let lastSide = 1, sideT = 0;
function avoidSide(S, a0){
  if (G.t - sideT > 1.5){ const l = landDist(S.x + Math.cos(a0 + .6)*200, S.y + Math.sin(a0 + .6)*200), r = landDist(S.x + Math.cos(a0 - .6)*200, S.y + Math.sin(a0 - .6)*200); lastSide = l >= r ? 1 : -1; }
  sideT = G.t; return lastSide;
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
    const [ux, uy] = avoidIslands(S, dx/d, dy/d, d), k = Math.min(1, d/(110*Math.sqrt(ship().heavy || 2))); // heavy ships ease off sooner so they stop on the spot
    return [ux*k, uy*k];
  }
  return [0, 0];
}
