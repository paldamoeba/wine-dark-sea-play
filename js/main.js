// Starts the game and runs the frame loop.
import {AUTO_QUALITY} from './config.js?v=5b5d761';
import {zoneAt} from './world.js?v=5b5d761';
import {G, load, loadSettings, saveSettings, startAutosave, reveal} from './state.js?v=5b5d761';

load();
loadSettings();

// These modules build the scene and wire up the UI as they load, so they come after the save is in.
const {updateClouds} = await import('./clouds.js?v=5b5d761');
const {updateWakes} = await import('./wakes.js?v=5b5d761');
const {renderer, scene, camera, applyQuality, applyZoom, resize, updateWater, updateCamera, updateWeather, renderFrame} = await import('./scene.js?v=5b5d761');
const {swapBoat, refreshAllTrees, animateEntities, showFleet} = await import('./entities.js?v=5b5d761');
const {updateUI, showZone, toast, openTutorial} = await import('./ui.js?v=5b5d761');
const {updatePlayer} = await import('./player.js?v=5b5d761');
const {updateCombat} = await import('./combat.js?v=5b5d761');
const {updateFish} = await import('./fishing.js?v=5b5d761');
const {updateTowns} = await import('./town.js?v=5b5d761');
const {updateWildlife} = await import('./wildlife.js?v=5b5d761');
const {updateQuests} = await import('./quests.js?v=5b5d761');
const {updateFleet} = await import('./fleet.js?v=5b5d761');
const {updateArena} = await import('./arena.js?v=5b5d761');
const {updateWeather: weatherTick, W} = await import('./weather.js?v=5b5d761');
const {drawOverlay, resizeOverlay} = await import('./overlay.js?v=5b5d761');
await import('./map.js?v=5b5d761');
const {updateSounds} = await import('./sounds.js?v=5b5d761');
const {initNight} = await import('./daynight.js?v=5b5d761');

const startQuality = G.settings.quality === 'auto' ? (G.settings.detected || 'high') : G.settings.quality;
applyQuality(startQuality);
initNight(scene, startQuality === 'high');
applyZoom();
resizeOverlay();
addEventListener('resize', () => { resize(); resizeOverlay(); });

swapBoat();
if (G.settings.dev.fleet) showFleet(true);
refreshAllTrees();
if (G.S.hint && !G.S.tutSeen){ G.S.tutSeen = true; openTutorial(); } // a new game starts with the how-to-play pages
document.getElementById('hint').hidden = !G.S.hint;
G.curZone = zoneAt(G.S.x, G.S.y); showZone(G.curZone);
startAutosave();

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

let last = performance.now(), fps = 60, revealT = 0;
function frame(now){
  // the first frame's time stamp can come from just before the game started: never let time run backwards
  const raw = Math.max(0, (now - last)/1000), dt = Math.min(.05, raw); last = Math.max(last, now);
  if (raw > 0) fps += (1/raw - fps) * .05;
  updateSounds(dt);
  if (G.mapOpen){ requestAnimationFrame(frame); return; } // the chart covers the screen; the world waits
  revealT += dt; if (revealT > .25){ revealT = 0; reveal(G.S.x, G.S.y, 520); }
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
  updateWater(); updateCamera(); updateWeather(dt); updateClouds(dt, W.kind); updateWakes(dt);
  renderFrame(G.settings.tiny !== false);
  drawOverlay(fps);
  updateUI(dt, nearDock);
  autoQuality(raw);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
