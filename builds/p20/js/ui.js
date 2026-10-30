// Screen UI: top bar, messages, zone banner, harbor and settings sheets.
import {SHIPS, FISH, TUNING, QUALITY, CREW, GOD_BLESSINGS, TIMBER} from './config.js';
import {ZONES, MAP, MAP_NAMES, ISLANDS, WORLD, CITIES, HARBORS, home} from './world.js';
import {G, ship, holdUsed, save, saveSettings, resetSave, revealAll, lvl} from './state.js';
import {applyQuality} from './scene.js';
import {swapBoat, refreshAllTrees} from './entities.js';
import {setZoom} from './input.js';
import {PAINTS, SAILS, GODS, SPECS} from './ships.js';
import {tutHTML} from './tutorial.js';
import {founded, blessing, seats, candidates} from './crew.js';
import {board, active, accept, decline, drop, deliver, canDeliver, progress, pillText, goal} from './quests.js';
import {REQUESTS, GOALS, UPGRADES} from './config.js';
import {effectText, buy} from './upgrades.js';
import {harborHTML, bagHTML, tabs, priceAt, catchValue, woodPrice, woodRoom} from './menus.js';
import {launch, switchTo} from './fleet.js';

const $ = id => document.getElementById(id);

// ---- messages ----
const toastEl = $('toast'); let toastT = 0;
export function toast(msg, dur=1.8){ toastEl.textContent = msg; toastEl.hidden = false; toastT = dur; }
let zoneT = 0;
export function showZone(z){
  $('zoneName').textContent = ZONES[z].name;
  $('zoneSub').textContent = z === 2 && G.S.tier >= 2 ? 'Your bireme can take it.' : ZONES[z].sub;
  $('zone').style.opacity = 1; zoneT = 3;
}
export function hideHint(){ if (G.S.hint){ G.S.hint = false; $('hint').hidden = true; } }

// ---- top bar ----
let lastHud = '', nearHarbor = null;
export function updateUI(dt, nearDock){
  const sh = ship(), used = holdUsed(), key = [G.S.gold, used, sh.hold, Math.ceil(G.S.hull)].join('|');
  if (key !== lastHud){
    lastHud = key;
    $('gold').textContent = G.S.gold; $('hold').textContent = used + '/' + sh.hold;
    $('holdChip').classList.toggle('full', used >= sh.hold);
    const pct = Math.max(0, G.S.hull/sh.hull*100); $('hullbar').style.width = pct + '%'; $('hullbar').classList.toggle('low', pct < 35);
  }
  const moored = !!G.dock && G.dock.mode === 'moored', h = nearDock, banned = h && h.is.city && (G.hunted || {})[h.is.city];
  nearHarbor = h;
  $('dockBtn').hidden = G.sheetOpen || (moored ? false : !h || !!G.dock);
  $('dockBtn').disabled = !moored && !!banned;
  $('dockBtn').textContent = moored ? 'Set sail' : banned ? `${CITIES[h.is.city].name} won't let you dock` : h ? `Enter ${h.is.name} harbor` : '';
  $('harborBtn').hidden = G.sheetOpen || !moored;
  $('hint').hidden = !G.S.hint || G.sheetOpen;
  const pill = pillText(); $('goalPill').hidden = !pill || G.sheetOpen;
  if (pill && $('goalText').textContent !== pill){ $('goalText').textContent = pill; $('goalLbl').textContent = goal() ? 'Goal' : 'Job'; }
  const bl = G.S.bless || 0; $('blessChip').hidden = !bl;
  if (bl) $('blessT').textContent = `${Math.floor(bl/60)}:${String(Math.floor(bl % 60)).padStart(2, '0')}`;
  if (toastT > 0){ toastT -= dt; if (toastT <= 0) toastEl.hidden = true; }
  if (zoneT > 0){ zoneT -= dt; if (zoneT <= 0) $('zone').style.opacity = 0; }
}

// ---- sheets (harbor, settings) ----
const sheetEl = $('sheet'); let sheet = null, resetArmed = false;
function openSheet(name){ sheet = name; G.sheetOpen = true; G.portOpen = name === 'port'; G.dest = null; resetArmed = false; render(); sheetEl.hidden = false; }
function closeSheet(){ sheet = null; G.sheetOpen = false; G.portOpen = false; sheetEl.hidden = true; save(); }
export function openPort(){
  G.v = 0;
  if (G.S.cargo.wood && (!G.dock || G.dock.h.is.port)){ G.S.ware += G.S.cargo.wood; toast(`Unloaded ${G.S.cargo.wood} wood to the warehouse`); G.S.cargo.wood = 0; }
  openSheet('port'); save();
}

function render(){ const st = sheetEl.scrollTop;
  sheetEl.innerHTML = sheet === 'port' ? harborHTML(G.dock ? G.dock.h : HARBORS[0]) : sheet === 'tut' ? tutHTML(tutPage) : sheet === 'inv' ? bagHTML() : settingsHTML();
  sheetEl.classList.toggle('menu', sheet === 'port' || sheet === 'inv'); sheetEl.scrollTop = st; }

// How to play: two pages, shown on a new game and from Settings.
let tutPage = 0;
export function openTutorial(){ tutPage = 0; hideHint(); openSheet('tut'); }

// Map choice and scale. Changing them reloads the game and starts you at the Kallisto pier (gold and ship are kept).
function mapHTML(){
  const d = G.settings.dev, sp = ship().speed, secs = (a, b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y)/sp);
  const isl = n => ISLANDS.find(i => i.name === n), fmt = s => s < 90 ? s + ' s' : (s/60).toFixed(1) + ' min';
  const trips = ['Naxos', 'Milos', 'Crete', 'Rhodes', 'Lesbos', 'Elaia', 'Skotia'].map(isl).filter(Boolean).slice(0, 4)
    .map(i => `${i.name} ${fmt(secs(home, i))}`).join(' · ');
  return `<div class="row"><div>Map<small>Changing the map or its scale starts you again at the Kallisto pier. Gold and ship stay.</small></div></div>
    <div class="looks one"><label><span>Map</span><select id="mapSel">${Object.entries(MAP_NAMES).map(([k, v]) => `<option value="${k}" ${k === MAP.id ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <div class="row"><div>Distance between islands<small>Bigger = more open sea and longer trips.</small></div><b id="spreadVal">${(+d.spread).toFixed(1)}×</b></div>
    <input type="range" id="spreadRange" min="0.5" max="1.5" step="0.1" value="${d.spread}" aria-label="Distance between islands">
    <div class="row"><div>Island size<small>Kallisto keeps its size so the town fits.</small></div><b id="isleVal">${(+d.isle).toFixed(1)}×</b></div>
    <input type="range" id="isleRange" min="0.5" max="1.6" step="0.1" value="${d.isle}" aria-label="Island size">
    <div class="row"><div>Sailing times from Kallisto with your ${ship().name.toLowerCase()}<small>${trips} · across the whole map ${fmt(Math.round(WORLD/sp))}</small></div>
      <button class="btn gold" data-act="applymap">Apply</button></div>`;
}

function settingsHTML(){
  const s = G.settings, q = s.quality;
  const opt = (v, label) => `<button class="seg ${q === v ? 'on' : ''}" data-act="quality" data-v="${v}" aria-pressed="${q === v}">${label}</button>`;
  const auto = s.detected ? ` (using ${QUALITY[s.detected].label})` : '';
  const mins = Math.floor((G.S.playSeconds || 0)/60);
  return `
    <h1>Settings</h1>
    <p class="sub">Time at sea: ${mins} min · Ship: ${ship().name}</p>
    <div class="sec"><div class="row"><div>How to play<small>The two pages from the start of the game.</small></div><button class="btn" data-act="tut">Show</button></div></div>
    <div class="sec"><h3>Graphics</h3>
      <div class="segs">${opt('auto', 'Auto')}${opt('low', 'Low')}${opt('high', 'High')}</div>
      <div class="row"><small>Auto checks how smooth the game runs and picks for you${auto}. Low turns off shadows and draws fewer waves.</small></div>
      <div class="row"><div>Show frame rate<small>Frames per second, bottom left. 50 or more feels smooth.</small></div>
        <button class="btn" data-act="fps">${s.showFps ? 'On' : 'Off'}</button></div>
    </div>
    <div class="sec dev"><h3>Builder tools · removed before release</h3>
      <div class="row"><div>Builder tools<small>${s.builder ? 'Off plays the game the way a player would.' : 'Off: normal speed, no teleport, no hidden fish and wreck marks, raiders on. Your builder settings come back when you turn them on.'}</small></div>
        <button class="btn" data-act="builder">${s.builder ? 'On' : 'Off'}</button></div>
      ${s.builder ? `${mapHTML()}
      <div class="row"><div>Camera zoom<small>Also pinch with two fingers, or scroll the mouse wheel.</small></div><b id="zoomVal">${s.dev.zoom.toFixed(1)}×</b></div>
      <input type="range" id="zoomRange" min="0.4" max="3.5" step="0.1" value="${s.dev.zoom}" aria-label="Camera zoom">
      <div class="row"><div>Ship speed</div></div>
      <div class="segs four">${[1,2,4,8].map(v => `<button class="seg ${s.dev.speed === v ? 'on' : ''}" data-act="speed" data-v="${v}" aria-pressed="${s.dev.speed === v}">${v}×</button>`).join('')}</div>
      <div class="row"><div>Tap the chart to teleport<small>Instead of setting a course.</small></div><button class="btn" data-act="teleport">${s.dev.teleport ? 'On' : 'Off'}</button></div>
      <div class="row"><div>Fish and wreck marks on the charts</div><button class="btn" data-act="markers">${s.dev.markers ? 'On' : 'Off'}</button></div>
      <div class="row"><div>Crew on ships<small>On by default now. Turn off to compare.</small></div><button class="btn" data-act="crew">${s.dev.crew ? 'On' : 'Off'}</button></div>
      <div class="row"><div>Raiders attack<small>Off = a peaceful sea for testing other things.</small></div><button class="btn" data-act="raiders">${s.dev.raiders ? 'On' : 'Off'}</button></div>
      <div class="row"><div>Drop a bottle ahead of me<small>A message in a bottle: coins, a note or a treasure map.</small></div><button class="btn" data-act="bottle">Bottle</button></div>
      <div class="row"><div>Bury a treasure nearby<small>On a beach close to you, marked with an X.</small></div><button class="btn" data-act="treasure">Treasure</button></div>
      <div class="row"><div>Bring up a whale<small>Surfaces ahead of you. Sail close for the blessing.</small></div><button class="btn" data-act="whale">Whale</button></div>
      <div class="row"><div>Bring a raider skiff to me<small>To test a fight right away.</small></div><button class="btn" data-act="spawn">Spawn</button></div>
      <div class="row"><div>Every ship moored at Kallisto<small>All ships in a row south of the pier, to compare sizes and crew.</small></div><button class="btn" data-act="fleet">${s.dev.fleet ? 'On' : 'Off'}</button></div>
      <div class="row"><div>Reveal the whole chart</div><button class="btn" data-act="revealall">Reveal</button></div>
      <div class="row"><div>Add 100 gold and 20 wood</div><button class="btn" data-act="givestuff">Add</button></div>` : ''}
    </div>
    <div class="sec"><h3>Save</h3>
      <div class="row"><div>Your progress saves on this device by itself.<small>Starting over erases your gold, ship and cargo.</small></div>
        <button class="btn danger" data-act="reset">${resetArmed ? 'Tap again to erase' : 'Start over'}</button></div>
    </div>
    <div class="foot"><span class="ver">Prototype 20</span><button class="btn gold" data-act="close">Back to sea</button></div>`;
}

sheetEl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const a = b.dataset.act, S = G.S, sh = ship();
  if (a !== 'reset') resetArmed = false;
  if (a === 'close'){ closeSheet(); return; }
  if (a === 'tut'){ openTutorial(); return; }
  if (a === 'accept') accept(+b.dataset.i);
  if (a === 'decline') decline(+b.dataset.i);
  if (a === 'deliver') deliver(+b.dataset.i, G.dock && G.dock.h);
  if (a === 'drop'){ drop(+b.dataset.i); toast('Job dropped'); }
  if (a === 'found' && S.gold >= CREW.foundCost){
    S.crewName = ($('crewName').value.trim() || 'The Sea Swallows').slice(0, 24); S.gold -= CREW.foundCost;
    S.look = {...S.look, flag:$('crewGod').value}; S.crew = []; swapBoat(); toast(`${S.crewName} sail under the flag of ${GODS[S.look.flag].name}!`, 3.5);
  }
  if (a === 'hire' && S.gold >= CREW.hireCost && (S.crew || []).length < seats()){
    const c = candidates()[+b.dataset.i]; S.gold -= CREW.hireCost; S.crew = [...(S.crew || []), c]; S.hireSeed = (S.hireSeed || 1) + 3;
    toast(`${c.n} joins the crew as a ${CREW.jobs[c.job].label.toLowerCase()}`, 2.6);
  }
  if (a === 'letgo'){ const c = S.crew[+b.dataset.i]; S.crew = S.crew.filter((_, i) => i !== +b.dataset.i); toast(`${c.n} goes ashore`); }
  if (a === 'toss'){ const k = b.dataset.k; if (S.cargo[k] > 0){ S.cargo[k]--; toast(`Threw 1 ${k === 'wood' ? 'wood' : FISH[k].label.toLowerCase()} overboard`); } }
  if (a === 'tutnext' || a === 'tutback'){ tutPage += a === 'tutnext' ? 1 : -1; render(); sheetEl.scrollTop = 0; return; }
  if (a === 'tutdone'){ closeSheet(); toast('Fair winds!', 2); return; }
  if (a === 'sail'){ closeSheet(); document.dispatchEvent(new Event('undock')); return; }
  if (a === 'upgrade'){ const k = b.dataset.k; if (buy(k)){ if (k === 'ram' || k === 'hull') swapBoat(); toast(`${UPGRADES[k].label}: ${effectText(k)}`, 2.4); save(); } }
  if (a === 'buywood'){ const h = G.dock ? G.dock.h : HARBORS[0], n = Math.min(+b.dataset.n, woodRoom(h), Math.floor(S.gold/woodPrice(h)));
    if (n > 0){ S.gold -= n*woodPrice(h); if (h.is.port) S.ware += n; else S.cargo.wood += n; toast(`Bought ${n} wood${h.is.port ? ' for the warehouse' : ''}`, 2); } }
  if (a === 'sell'){ const g = catchValue(G.dock ? G.dock.h : HARBORS[0]); S.gold += g; for (const k in FISH) S.cargo[k] = 0; toast(`Sold the catch for ${g} gold`); progress('sell'); }
  if (a === 'repair'){ const cost = Math.min(Math.ceil((sh.hull - S.hull)/TUNING.repairPerGold), S.gold); S.gold -= cost; S.hull = Math.min(sh.hull, S.hull + cost*TUNING.repairPerGold); }
  if (a === 'build'){ const t = +b.dataset.t, n = SHIPS[t]; if (S.ware >= n.cost.wood && S.gold >= n.cost.gold){ S.ware -= n.cost.wood; S.gold -= n.cost.gold; launch(t); progress('build'); swapBoat(); toast(`Your ${n.name} is ready${lvl('ram') || lvl('arrows') ? '. Your ram and arrowheads came along' : ''}`, 3); } }
  if (a === 'switch'){ const t = +b.dataset.t; if (switchTo(t)){ swapBoat(); toast(`You go aboard your ${SHIPS[t].name.toLowerCase()}`, 2.4); } }
  if (a === 'quality'){ G.settings.quality = b.dataset.v; G.settings.detected = null; applyQuality(b.dataset.v === 'auto' ? 'high' : b.dataset.v); G.autoCheck = b.dataset.v === 'auto'; saveSettings(); }
  if (a === 'speed'){ G.settings.dev.speed = +b.dataset.v; saveSettings(); }
  if (a === 'teleport'){ G.settings.dev.teleport = !G.settings.dev.teleport; saveSettings(); }
  if (a === 'markers'){ G.settings.dev.markers = !G.settings.dev.markers; saveSettings(); }
  if (a === 'crew'){ G.settings.dev.crew = !G.settings.dev.crew; saveSettings(); swapBoat(); document.dispatchEvent(new Event('crew')); }
  if (a === 'raiders'){ G.settings.dev.raiders = !G.settings.dev.raiders; saveSettings(); }
  if (a === 'spawn'){ document.dispatchEvent(new Event('spawnraider')); toast('A raider skiff appears'); closeSheet(); return; }
  if (a === 'fleet'){ G.settings.dev.fleet = !G.settings.dev.fleet; saveSettings(); document.dispatchEvent(new Event('fleet')); }
  if (a === 'revealall'){ revealAll(); toast('Whole chart revealed'); }
  if (a === 'bottle'){ document.dispatchEvent(new Event('bottle')); closeSheet(); return; }
  if (a === 'tab'){ tabs[b.dataset.sheet] = b.dataset.t; render(); sheetEl.scrollTop = 0; return; }
  if (a === 'treasure'){ document.dispatchEvent(new Event('treasure')); closeSheet(); return; }
  if (a === 'whale'){ document.dispatchEvent(new Event('whale')); closeSheet(); return; }
  if (a === 'givestuff'){ S.gold += 100; S.ware += 20; toast('+100 gold, +20 wood in the warehouse'); }
  if (a === 'applymap'){
    const d = G.settings.dev; d.map = $('mapSel').value; d.spread = +$('spreadRange').value; d.isle = +$('isleRange').value;
    saveSettings(); save(); location.reload(); return;
  }
  if (a === 'builder'){ G.settings.builder = !G.settings.builder; saveSettings(); swapBoat(); document.dispatchEvent(new Event('fleet')); }
  if (a === 'fps'){ G.settings.showFps = !G.settings.showFps; saveSettings(); }
  if (a === 'reset'){
    if (!resetArmed) resetArmed = true;
    else { resetArmed = false; resetSave(); swapBoat(); refreshAllTrees(); lastHud = ''; toast('Fresh start at Kallisto'); closeSheet(); return; }
  }
  save(); render();
});
sheetEl.addEventListener('change', e => {
  const ci = e.target.dataset && e.target.dataset.crew;
  if (ci !== undefined){ const c = G.S.crew[+ci]; c.job = e.target.value; toast(`${c.n} is now a ${CREW.jobs[c.job].label.toLowerCase()}`, 2); save(); render(); return; }
  const k = e.target.dataset && e.target.dataset.look; if (!k) return;
  G.S.look = {...G.S.look, [k]:e.target.value}; swapBoat(); save();
});
sheetEl.addEventListener('input', e => {
  if (e.target.id === 'spreadRange' || e.target.id === 'isleRange'){ $(e.target.id === 'spreadRange' ? 'spreadVal' : 'isleVal').textContent = (+e.target.value).toFixed(1) + '×'; return; }
  if (e.target.id !== 'zoomRange') return;
  setZoom(+e.target.value);
  const v = document.getElementById('zoomVal'); if (v) v.textContent = G.settings.dev.zoom.toFixed(1) + '×';
});
// Closing the harbor keeps the ship tied up; only "Set sail" leaves.
$('dockBtn').addEventListener('click', () => {
  if (!G.dock && nearHarbor) document.dispatchEvent(new CustomEvent('dock', {detail:nearHarbor}));
  else if (G.dock.mode === 'moored') document.dispatchEvent(new Event('undock'));
});
$('harborBtn').addEventListener('click', openPort);
document.addEventListener('docked', openPort);
$('goalPill').addEventListener('click', () => { if (sheet === 'inv' && tabs.inv === 'jobs') closeSheet(); else { tabs.inv = 'jobs'; openSheet('inv'); } });
$('bagBtn').addEventListener('click', () => sheet === 'inv' ? closeSheet() : openSheet('inv'));
$('gearBtn').addEventListener('click', () => sheet === 'settings' ? closeSheet() : openSheet('settings'));
