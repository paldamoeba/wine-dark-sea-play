// Fishing minigame: a needle spins around a ring over your boat. Tap (or press Space) while it is in the green part.
// Bigger fish have a smaller green part and a faster needle (see FISH in config.js).
import {FISH} from './config.js?v=2a982a2';
import {G, ship, holdUsed, save, gain} from './state.js?v=2a982a2';
import {toast} from './ui.js?v=2a982a2';
import {blessing, catchRoll} from './crew.js?v=2a982a2';
import {progress} from './quests.js?v=2a982a2';
import {sfx} from './audio.js?v=2a982a2';

const TAU = Math.PI*2;
const angDiff = (a, b) => ((a - b + Math.PI*3) % TAU) - Math.PI;

export function startFish(spot){
  const f = FISH[spot.kind];
  G.fish = {ref:spot, ang:Math.random()*TAU, speed:f.spin, size:f.green*(blessing().green || 1)*(1 + .35*G.stormK)*Math.PI/180, g:Math.random()*TAU, cool:0, flash:0, ok:false, next:false};
  if (!G.S.fishHint){ G.S.fishHint = true; toast('Tap in the green', 3); }
}
export function stopFish(){ G.fish = null; }

export function updateFish(dt){
  const F = G.fish; if (!F) return;
  F.ang = (F.ang + F.speed*dt) % TAU;
  F.cool = Math.max(0, F.cool - dt); F.flash = Math.max(0, F.flash - dt*2.2);
  if (F.next && F.cool <= 0){ F.next = false; F.g = (F.ang + Math.PI*.6 + Math.random()*Math.PI) % TAU; } // new green spot, never right under the needle
}

function tap(){
  const F = G.fish; if (!F || F.cool > 0 || G.sheetOpen) return;
  const S = G.S, kind = F.ref.kind;
  if (holdUsed() >= ship().hold){ toast('Your hold is full'); return; }
  F.next = true; F.flash = 1;
  if (Math.abs(angDiff(F.ang, F.g)) < F.size/2){
    const n = Math.min(catchRoll(), ship().hold - holdUsed()); // P67: every hand aboard pulls on the net
    S.cargo[kind] += n; F.ref.stock--; F.ok = true; F.cool = .55; progress('catch', kind, n); sfx('catch');
    gain(kind, n);
    if (F.ref.stock <= 0){ toast('The fish have moved on', 2); G.fish = null; }
    save();
  } else { F.ok = false; F.cool = .9; toast('It got away'); sfx('miss'); }
}
document.addEventListener('fishtap', tap);
addEventListener('keydown', e => { if ((e.code === 'Space' || e.code === 'Enter') && G.fish && !G.mapOpen){ e.preventDefault(); tap(); } });

// Drawn on the 2D overlay at the boat's screen position.
// P65: a cozy round dial that matches the menus: a soft cream disc with a shadow, a thin track, a glowing green catch zone with round ends,
// a little needle with a coral tip, and the fish you're after in the middle.
let fishIcons = {};
function fishPic(kind){ if (fishIcons[kind]) return fishIcons[kind]; const im = new Image(); const col = {sardine:'#9fb8c8', tuna:'#4f7fa3', swordfish:'#2f5f8a'}[kind] || '#7fb6dd';
  im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f3fb"/><stop offset=".45" stop-color="${col}"/><stop offset="1" stop-color="#3d6d94"/></linearGradient></defs><path d="M2.5 12 C5.5 6.2 13 5.6 17.2 11.2 L21.5 7.6 C21 10 21 14 21.5 16.4 L17.2 12.8 C13 18.4 5.5 17.8 2.5 12Z" fill="url(#f)"/><path d="M5.5 10.2 C8 8.2 11.8 8 14.2 9.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".8"/><circle cx="6.6" cy="11.2" r="1.1" fill="#24364a"/></svg>`);
  return fishIcons[kind] = im; }
export function drawFish(c, x, y){
  const F = G.fish; if (!F) return;
  const R = 38, pop = 1 + F.flash*.07, hit = F.flash > 0 && F.ok, miss = F.flash > 0 && !F.ok;
  c.save(); c.translate(x, y); c.scale(pop, pop);
  // the disc
  c.save(); c.shadowColor = 'rgba(25,30,40,.38)'; c.shadowBlur = 16; c.shadowOffsetY = 6;
  const dg = c.createRadialGradient(-12, -16, 6, 0, 0, R + 12); dg.addColorStop(0, '#fffdf6'); dg.addColorStop(1, '#f2e7cf'); c.fillStyle = dg; c.beginPath(); c.arc(0, 0, R + 11, 0, TAU); c.fill(); c.restore();
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, R + 10.2, 0, TAU); c.stroke();
  // the track and the catch zone
  c.lineCap = 'round'; c.lineWidth = 10; c.strokeStyle = '#e2d6bb'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  c.save(); c.shadowColor = 'rgba(92,190,84,.8)'; c.shadowBlur = 8; const a0 = F.g - F.size/2, a1 = F.g + F.size/2;
  const zg = c.createLinearGradient(Math.cos(a0)*R, Math.sin(a0)*R, Math.cos(a1)*R, Math.sin(a1)*R); zg.addColorStop(0, '#79cf5e'); zg.addColorStop(1, '#4fae48'); c.strokeStyle = zg; c.beginPath(); c.arc(0, 0, R, a0, a1); c.stroke(); c.restore();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, R + 1.5, a0, a1); c.stroke();
  // the fish
  const im = fishPic(F.ref.kind); if (im.complete && im.naturalWidth) c.drawImage(im, -19, -19, 38, 38);
  // the needle: a thin dark hand with a coral tip riding over the track
  const nx = Math.cos(F.ang), ny = Math.sin(F.ang);
  c.strokeStyle = 'rgba(34,40,58,.28)'; c.lineWidth = 5; c.beginPath(); c.moveTo(nx*22, ny*22 + 1.5); c.lineTo(nx*(R + 6), ny*(R + 6) + 1.5); c.stroke();
  c.strokeStyle = '#2d3548'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(nx*22, ny*22); c.lineTo(nx*(R + 6), ny*(R + 6)); c.stroke();
  c.fillStyle = '#e2725b'; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(nx*(R + 6), ny*(R + 6), 5.5, 0, TAU); c.fill(); c.stroke();
  // a caught fish gives a green ring; a miss a red one
  if (F.flash > 0){ c.lineWidth = 5; c.strokeStyle = hit ? `rgba(79,174,72,${F.flash})` : `rgba(226,86,63,${F.flash})`; c.beginPath(); c.arc(0, 0, R + 14 + (1 - F.flash)*12, 0, TAU); c.stroke(); }
  c.restore();
}
