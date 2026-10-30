// Starts the game and runs the frame loop.
import {AUTO_QUALITY} from './config.js';
import {zoneAt} from './world.js';
import {G, load, loadSettings, saveSettings, startAutosave, reveal} from './state.js';

load();
loadSettings();

// These modules build the scene and wire up the UI as they load, so they come after the save is in.
const {renderer, scene, camera, applyQuality, applyZoom, resize, updateWater, updateCamera, updateWeather} = await import('./scene.js');
const {swapBoat, refreshAllTrees, animateEntities} = await import('./entities.js');
const {updateUI, showZone, toast} = await import('./ui.js');
const {updatePlayer} = await import('./player.js');
const {drawOverlay, resizeOverlay} = await import('./overlay.js');
await import('./map.js');

const startQuality = G.settings.quality === 'auto' ? (G.settings.detected || 'high') : G.settings.quality;
applyQuality(startQuality);
applyZoom();
resizeOverlay();
addEventListener('resize', () => { resize(); resizeOverlay(); });

swapBoat();
refreshAllTrees();
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
  const raw = (now - last)/1000, dt = Math.min(.05, raw); last = now;
  if (raw > 0) fps += (1/raw - fps) * .05;
  if (G.mapOpen){ requestAnimationFrame(frame); return; } // the chart covers the screen; the world waits
  revealT += dt; if (revealT > .25){ revealT = 0; reveal(G.S.x, G.S.y, 520); }
  const nearDock = updatePlayer(dt);
  animateEntities(dt);
  updateWater(); updateCamera(); updateWeather();
  renderer.render(scene, camera);
  drawOverlay(fps);
  updateUI(dt, nearDock);
  autoQuality(raw);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
