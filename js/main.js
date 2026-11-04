// Starts the game and runs the frame loop.
import {AUTO_QUALITY} from './config.js?v=cc3055d';
import {zoneAt} from './world.js?v=cc3055d';
import {G, load, loadSettings, saveSettings, startAutosave, reveal} from './state.js?v=cc3055d';
import {REVEAL} from './config.js?v=cc3055d';

// P65: the main menu comes first, unless it just sent us here to start a voyage
const GO = 'wine-dark-sea-go'; let skipMenu = false;
try { skipMenu = localStorage.getItem(GO) === '1'; localStorage.removeItem(GO); } catch(_){}
G.noSave = true; // nothing is written until a voyage really starts: an empty slot stays empty
load();
loadSettings();

// P73: while the rest loads, the player's own ship sails on the loading screen
const {startBootShip} = await import('./bootship.js?v=cc3055d');
const boot = startBootShip();
await boot.breathe();

// These modules build the scene and wire up the UI as they load, so they come after the save is in.
const {updateClouds} = await import('./clouds.js?v=cc3055d'); await boot.breathe();
const {updateWakes} = await import('./wakes.js?v=cc3055d'); await boot.breathe();
const {renderer, scene, camera, applyQuality, applyZoom, resize, updateWater, updateCamera, updateWeather, renderFrame, setGust} = await import('./scene.js?v=cc3055d'); await boot.breathe();
const {swapBoat, refreshAllTrees, animateEntities, showFleet} = await import('./entities.js?v=cc3055d'); await boot.breathe();
const {updateUI, showZone, toast, openTutorial} = await import('./ui.js?v=cc3055d'); await boot.breathe();
const {updatePlayer} = await import('./player.js?v=cc3055d'); await boot.breathe();
const {updateCombat} = await import('./combat.js?v=cc3055d'); await boot.breathe();
const {updateFish} = await import('./fishing.js?v=cc3055d'); await boot.breathe();
const {updateTowns} = await import('./town.js?v=cc3055d'); await boot.breathe();
const {updateWildlife} = await import('./wildlife.js?v=cc3055d'); await boot.breathe();
const {updateQuests} = await import('./quests.js?v=cc3055d'); await boot.breathe();
const {updateFleet} = await import('./fleet.js?v=cc3055d'); await boot.breathe();
const {updateArena} = await import('./arena.js?v=cc3055d'); await boot.breathe();
const {updateWeather: weatherTick, W} = await import('./weather.js?v=cc3055d'); await boot.breathe();
const {drawOverlay, resizeOverlay} = await import('./overlay.js?v=cc3055d'); await boot.breathe();
const {mapTick} = await import('./map.js?v=cc3055d'); await boot.breathe();
const {updateSounds} = await import('./sounds.js?v=cc3055d'); await boot.breathe();
const {initNight} = await import('./daynight.js?v=cc3055d'); await boot.breathe();
const {updateSmoke} = await import('./smoke.js?v=cc3055d'); await boot.breathe();
const {updateGrass} = await import('./grass.js?v=cc3055d'); await boot.breathe();
const {addBubbles, updateBubbles, makeWind} = await import('./seafx.js?v=cc3055d'); await boot.breathe();
const {updateGuide} = await import('./guide.js?v=cc3055d'); await boot.breathe();
addBubbles(scene); const WIND3D = makeWind(scene);
const seaFx = dt => { updateGuide(dt); updateBubbles(); WIND3D.update(dt, W.windA, W.windK, G.cam.x, G.cam.y, G.night); setGust(W.windA, W.windK); };
const {updateFortWatch} = await import('./fortwatch.js?v=cc3055d'); await boot.breathe();
const {openMenu} = await import('./mainmenu.js?v=cc3055d'); await boot.breathe();
const {offlineEarnings} = await import('./fleet.js?v=cc3055d'); await boot.breathe();
const {askName, checkNames} = await import('./naming.js?v=cc3055d'); await boot.breathe();

// P74: the game got much lighter, so a phone that was moved down to lower graphics earlier gets to try again, once
if (G.settings.perfV !== 74){ G.settings.perfV = 74; if (G.settings.quality === 'auto') G.settings.detected = null; saveSettings(); }
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
  // P70: first the boat gets a name, then a new game shows the how-to-play pages
  const pages = () => { if (G.S.hint && !G.S.tutSeen){ G.S.tutSeen = true; openTutorial(); } G.voyageOn = true; };
  if (!(G.S.names || {})[G.S.tier] && (!window.__TEST || __TEST.get('askname'))) askName(G.S.tier, pages); else pages();
  showZone(G.curZone); if (awayPay) setTimeout(() => toast(`Captains' purse +${awayPay}`, 4), 1200); }

// Auto graphics: on the first run, watch the frame rate for a few seconds and drop to Low if it is choppy.
G.autoCheck = G.settings.quality === 'auto' && !G.settings.detected;
let sampleT = 0, sampleFrames = 0;
function autoQuality(dt){
  if (!G.autoCheck || document.hidden) return;
  sampleT += dt; sampleFrames++;
  if (sampleT < AUTO_QUALITY.sampleSeconds) return;
  const fps = sampleFrames / sampleT;
  // P67: one step at a time: High, then Medium, then Low, checking again after each
  const cur = G.settings.detected || 'high', next = fps >= AUTO_QUALITY.minFps ? cur : cur === 'high' ? 'mid' : 'low';
  G.autoCheck = next !== cur && next !== 'low'; G.settings.detected = next;
  if (next !== cur){ applyQuality(next); resizeOverlay(); if (next === 'low') toast('Switched to Low graphics for smoother sailing', 3); }
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
  if (G.menuOpen){ // the main menu: the sea and the town live on behind it, but nothing happens to your ship
    if (!menuPlaced){ menuPlaced = true; updatePlayer(0); }
    G.t += dt; weatherTick(dt); animateEntities(dt); updateWater(); updateCamera(); updateWeather(dt); updateClouds(dt, W.kind); updateWakes(dt); seaFx(dt); updateSmoke(G.t, G.night, W.windA, W.windK); updateGrass(G.t);
    renderFrame(G.settings.tiny !== false); requestAnimationFrame(frame); return; }
  revealT += dt; if (revealT > .25){ revealT = 0; reveal(G.S.x, G.S.y, REVEAL.sail); }
  const nearDock = updatePlayer(dt);
  updateCombat(dt);
  updateFish(dt);
  updateTowns(dt);
  updateWildlife(dt);
  updateQuests(dt);
  updateFleet(dt); checkNames();
  updateArena(dt);
  weatherTick(dt);
  animateEntities(dt);
  updateWater(); updateCamera(); updateWeather(dt); updateClouds(dt, W.kind); updateWakes(dt); seaFx(dt); updateSmoke(G.t, G.night, W.windA, W.windK); updateGrass(G.t);
  // P67: the game runs on behind the chart: you keep sailing and fighting. Only the drawing rests, since the chart covers the screen.
  if (G.mapOpen) mapTick(dt); else { renderFrame(G.settings.tiny !== false); drawOverlay(fps); autoQuality(raw); }
  updateUI(dt, nearDock); updateFortWatch(dt);
  requestAnimationFrame(frame);
}
await boot.hold(1800); // long enough to see her, even on a quick load
const {realizeAllNear} = await import('./combat.js?v=cc3055d'), {mergeNearIslands} = await import('./entities.js?v=cc3055d');
realizeAllNear(2000); mergeNearIslands(2600, true); // what you can see straight away is ready before the first frame
await boot.breathe();
if (skipMenu) startVoyage(); else openMenu(startVoyage);
requestAnimationFrame(frame);
if (!(window.__TEST && __TEST.get('bootstay'))) requestAnimationFrame(() => requestAnimationFrame(boot.finish)); // the loading screen fades once the sea behind it has been drawn
