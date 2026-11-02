// Starts the game and runs the frame loop.
import {AUTO_QUALITY} from './config.js';
import {zoneAt} from './world.js';
import {G, load, loadSettings, saveSettings, startAutosave, reveal} from './state.js';
import {REVEAL} from './config.js';

// P65: the main menu comes first, unless it just sent us here to start a voyage
const GO = 'wine-dark-sea-go'; let skipMenu = false;
try { skipMenu = localStorage.getItem(GO) === '1'; localStorage.removeItem(GO); } catch(_){}
G.noSave = true; // nothing is written until a voyage really starts: an empty slot stays empty
load();
loadSettings();

// These modules build the scene and wire up the UI as they load, so they come after the save is in.
const {updateClouds} = await import('./clouds.js');
const {updateWakes} = await import('./wakes.js');
const {renderer, scene, camera, applyQuality, applyZoom, resize, updateWater, updateCamera, updateWeather, renderFrame} = await import('./scene.js');
const {swapBoat, refreshAllTrees, animateEntities, showFleet} = await import('./entities.js');
const {updateUI, showZone, toast, openTutorial} = await import('./ui.js');
const {updatePlayer} = await import('./player.js');
const {updateCombat} = await import('./combat.js');
const {updateFish} = await import('./fishing.js');
const {updateTowns} = await import('./town.js');
const {updateWildlife} = await import('./wildlife.js');
const {updateQuests} = await import('./quests.js');
const {updateFleet} = await import('./fleet.js');
const {updateArena} = await import('./arena.js');
const {updateWeather: weatherTick, W} = await import('./weather.js');
const {drawOverlay, resizeOverlay} = await import('./overlay.js');
await import('./map.js');
const {updateSounds} = await import('./sounds.js');
const {initNight} = await import('./daynight.js');
const {updateSmoke} = await import('./smoke.js');
const {updateGrass} = await import('./grass.js');
const {updateFortWatch} = await import('./fortwatch.js');
const {openMenu} = await import('./mainmenu.js');
const {offlineEarnings} = await import('./fleet.js');

const startQuality = G.settings.quality === 'auto' ? (G.settings.detected || 'high') : G.settings.quality;
applyQuality(startQuality);
initNight(scene, startQuality === 'high');
applyZoom();
resizeOverlay();
addEventListener('resize', () => { resize(); resizeOverlay(); });

swapBoat();
if (G.settings.dev.fleet) showFleet(true);
refreshAllTrees();
document.getElementById('hint').hidden = !G.S.hint;
G.curZone = zoneAt(G.S.x, G.S.y);
// P65: captains kept fishing while the game was closed (up to 2 hours): their pay waits in the purse at Kallisto
const awayPay = offlineEarnings();
startAutosave();
// the voyage begins (from the menu, or straight away when the menu just sent us here)
let startedOnce = false;
function startVoyage(){ if (startedOnce) return; startedOnce = true; G.noSave = false;
  if (G.S.hint && !G.S.tutSeen){ G.S.tutSeen = true; openTutorial(); } // a new game starts with the how-to-play pages
  showZone(G.curZone); if (awayPay) setTimeout(() => toast(`Captains' purse +${awayPay}`, 4), 1200); }

// Auto graphics: on the first run, watch the frame rate for a few seconds and drop to Low if it is choppy.
G.autoCheck = G.settings.quality === 'auto' && !G.settings.detected;
let sampleT = 0, sampleFrames = 0;
function autoQuality(dt){
  if (!G.autoCheck || document.hidden) return;
  sampleT += dt; sampleFrames++;
  if (sampleT < AUTO_QUALITY.sampleSeconds) return;
  const fps = sampleFrames / sampleT;
  G.autoCheck = false;
  G.settings.detected = fps < AUTO_QUALITY.minFps ? 'low' : 'high';
  if (G.settings.detected === 'low'){ applyQuality('low'); resizeOverlay(); toast('Switched to Low graphics for smoother sailing', 3); }
  saveSettings();
  sampleT = 0; sampleFrames = 0;
}

document.addEventListener('course', e => toast(`Course set: ${e.detail} stadia`));
document.addEventListener('teleport', () => toast('Teleported'));
document.addEventListener('zoom', applyZoom);

let last = performance.now(), fps = 60, revealT = 0, menuPlaced = false;
function frame(now){
  // the first frame's time stamp can come from just before the game started: never let time run backwards
  const raw = Math.max(0, (now - last)/1000), dt = Math.min(.05, raw); last = Math.max(last, now);
  if (raw > 0) fps += (1/raw - fps) * .05;
  updateSounds(dt);
  if (G.mapOpen){ requestAnimationFrame(frame); return; } // the chart covers the screen; the world waits
  if (G.menuOpen){ // the main menu: the sea and the town live on behind it, but nothing happens to your ship
    if (!menuPlaced){ menuPlaced = true; updatePlayer(0); }
    G.t += dt; weatherTick(dt); animateEntities(dt); updateWater(); updateCamera(); updateWeather(dt); updateClouds(dt, W.kind); updateWakes(dt); updateSmoke(G.t, G.night, W.windA, W.windK); updateGrass(G.t);
    renderFrame(G.settings.tiny !== false); requestAnimationFrame(frame); return; }
  revealT += dt; if (revealT > .25){ revealT = 0; reveal(G.S.x, G.S.y, REVEAL.sail); }
  const nearDock = updatePlayer(dt);
  updateCombat(dt);
  updateFish(dt);
  updateTowns(dt);
  updateWildlife(dt);
  updateQuests(dt);
  updateFleet(dt);
  updateArena(dt);
  weatherTick(dt);
  animateEntities(dt);
  updateWater(); updateCamera(); updateWeather(dt); updateClouds(dt, W.kind); updateWakes(dt); updateSmoke(G.t, G.night, W.windA, W.windK); updateGrass(G.t);
  renderFrame(G.settings.tiny !== false);
  drawOverlay(fps);
  updateUI(dt, nearDock); updateFortWatch(dt);
  autoQuality(raw);
  requestAnimationFrame(frame);
}
if (skipMenu) startVoyage(); else openMenu(startVoyage);
requestAnimationFrame(frame);
document.getElementById('boot').remove(); // the title card that shows while the game loads
