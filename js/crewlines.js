// P122 crew moments: a short line from your crew the first time something happens. Words only: each line is said once per
// voyage (S.said), never over another message, never in a menu, and never in the rowboat (you are alone in it).
import {G, ship, holdUsed} from './state.js?v=9ed43c1';
import {toast, toastBusy} from './ui.js?v=9ed43c1';
import {W} from './weather.js?v=9ed43c1';
import {sfx} from './audio.js?v=9ed43c1';
import {zoneAt} from './world.js?v=9ed43c1';

const LINES = [
  ['hurt',  S => S.hull > 0 && S.hull < ship().hull*.3, 'She is taking water, captain! Make for a harbor.'],
  ['lair',  () => (G.lairK || 0) > .5, 'The sea is red here. Nobody speaks on deck.'],
  ['storm', () => (G.stormK || 0) > .7, 'Hold fast! Zeus is angry today.'],
  ['fort',  S => ((S.stats || {}).forts || 0) > 0, 'The fortress is ours! They will sing of this in every harbor.'],
  ['sunk',  S => ((S.stats || {}).sunk || 0) > 0, 'Down she goes! Poseidon can keep her.'],
  ['night', () => (G.night || 0) > .85, 'Light the lamp. Raiders love the dark.'],
  ['dawn',  S => (S.said || []).includes('night') && (G.night || 0) < .15, 'Rosy-fingered dawn. We made it through the night.'],
  ['open',  S => zoneAt(S.x, S.y) === 2, 'No land in sight. This is deep water, captain.'],
  ['full',  () => holdUsed() >= ship().hold, 'The hold is full. Time to find a market.'],
  ['calm',  () => W.kind === 'calm' && W.windK < .2 && G.v > 30, 'Not a breath of wind. Out oars, lads.'],
  ['rich',  S => (S.gold || 0) >= 1000, 'A thousand drachmas! Wine for everyone tonight.'],
];
let wait = 20;
export function updateCrewLines(dt){
  wait -= dt; if (wait > 0) return; wait = 1.5;
  const S = G.S; if (!S || G.dock || G.sheetOpen || G.mapOpen || G.sinking || toastBusy() || (ship().rank || 0) < 1) return;
  const said = S.said || (S.said = []);
  for (const [k, test, text] of LINES) if (!said.includes(k) && test(S)){ said.push(k); toast('“' + text + '”', 5); sfx('bell'); wait = 60; return; }
}
