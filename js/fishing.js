// Fishing minigame: a needle spins around a ring over your boat. Tap (or press Space) while it is in the green part.
// Bigger fish have a smaller green part and a faster needle (see FISH in config.js).
import {FISH} from './config.js?v=af6cebe';
import {G, ship, holdUsed, save, gain} from './state.js?v=af6cebe';
import {toast} from './ui.js?v=af6cebe';
import {blessing, fishBoost} from './crew.js?v=af6cebe';
import {progress} from './quests.js?v=af6cebe';
import {sfx} from './audio.js?v=af6cebe';

const TAU = Math.PI*2;
const angDiff = (a, b) => ((a - b + Math.PI*3) % TAU) - Math.PI;

export function startFish(spot){
  const f = FISH[spot.kind];
  G.fish = {ref:spot, ang:Math.random()*TAU, speed:f.spin, size:f.green*(blessing().green || 1)*(1 + (fishBoost() - 1)*.6)*(1 + .35*G.stormK)*Math.PI/180, g:Math.random()*TAU, cool:0, flash:0, ok:false, next:false};
  if (!G.S.fishHint){ G.S.fishHint = true; toast('Tap when the needle is in the green', 3); }
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
    S.cargo[kind]++; F.ref.stock--; F.ok = true; F.cool = .55; progress('catch', kind); sfx('catch');
    gain(kind);
    if (F.ref.stock <= 0){ toast('The fish have moved on', 2); G.fish = null; }
    save();
  } else { F.ok = false; F.cool = .9; toast('It got away'); sfx('miss'); }
}
document.addEventListener('fishtap', tap);
addEventListener('keydown', e => { if ((e.code === 'Space' || e.code === 'Enter') && G.fish && !G.mapOpen){ e.preventDefault(); tap(); } });

// Drawn on the 2D overlay at the boat's screen position.
export function drawFish(c, x, y){
  const F = G.fish; if (!F) return;
  const R = 34;
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(247,238,214,.95)'; c.beginPath(); c.arc(0, 0, R + 7, 0, TAU); c.fill();
  c.lineWidth = 9; c.strokeStyle = '#d9cba8'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  c.strokeStyle = '#5f9c3a'; c.beginPath(); c.arc(0, 0, R, F.g - F.size/2, F.g + F.size/2); c.stroke();
  c.strokeStyle = '#22283a'; c.lineWidth = 3.5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(F.ang)*(R + 5), Math.sin(F.ang)*(R + 5)); c.stroke();
  c.fillStyle = '#22283a'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill();
  if (F.flash > 0){ c.lineWidth = 4; c.strokeStyle = F.ok ? `rgba(95,156,58,${F.flash})` : `rgba(196,71,59,${F.flash})`; c.beginPath(); c.arc(0, 0, R + 9 + (1 - F.flash)*8, 0, TAU); c.stroke(); }
  c.restore();
}
