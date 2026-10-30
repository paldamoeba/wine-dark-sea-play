// Screen UI: top bar, messages, zone banner, harbor and settings sheets.
import {SHIPS, FISH, TUNING, QUALITY} from './config.js';
import {ZONES} from './world.js';
import {G, ship, holdUsed, save, saveSettings, resetSave, revealAll} from './state.js';
import {applyQuality} from './scene.js';
import {swapBoat, refreshAllTrees} from './entities.js';
import {setZoom} from './input.js';
import {PAINTS, SAILS, GODS, SPECS} from './ships.js';

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
let lastHud = '';
export function updateUI(dt, nearDock){
  const sh = ship(), used = holdUsed(), key = [G.S.gold, used, sh.hold, Math.ceil(G.S.hull)].join('|');
  if (key !== lastHud){
    lastHud = key;
    $('gold').textContent = G.S.gold; $('hold').textContent = used + '/' + sh.hold;
    $('holdChip').classList.toggle('full', used >= sh.hold);
    const pct = Math.max(0, G.S.hull/sh.hull*100); $('hullbar').style.width = pct + '%'; $('hullbar').classList.toggle('low', pct < 35);
  }
  $('dockBtn').hidden = !nearDock || G.sheetOpen;
  $('hint').hidden = !G.S.hint || G.sheetOpen;
  if (toastT > 0){ toastT -= dt; if (toastT <= 0) toastEl.hidden = true; }
  if (zoneT > 0){ zoneT -= dt; if (zoneT <= 0) $('zone').style.opacity = 0; }
}

// ---- sheets (harbor, settings) ----
const sheetEl = $('sheet'); let sheet = null, resetArmed = false;
function openSheet(name){ sheet = name; G.sheetOpen = true; G.portOpen = name === 'port'; G.dest = null; resetArmed = false; render(); sheetEl.hidden = false; }
function closeSheet(){ sheet = null; G.sheetOpen = false; G.portOpen = false; sheetEl.hidden = true; save(); }
export function openPort(){
  G.v = 0;
  if (G.S.cargo.wood){ G.S.ware += G.S.cargo.wood; toast(`Unloaded ${G.S.cargo.wood} wood to the warehouse`); G.S.cargo.wood = 0; }
  openSheet('port'); save();
}

function render(){ sheetEl.innerHTML = sheet === 'port' ? portHTML() : settingsHTML(); }

function portHTML(){
  const S = G.S, sh = ship(), catchVal = S.cargo.sardine*FISH.sardine.price + S.cargo.tuna*FISH.tuna.price;
  const dmg = sh.hull - Math.ceil(S.hull), repairCost = Math.ceil(dmg/TUNING.repairPerGold), next = SHIPS[S.tier+1];
  let yard = '<div class="row"><small>No more ships yet.</small></div>';
  if (next && !next.locked){
    const okW = S.ware >= next.cost.wood, okG = S.gold >= next.cost.gold;
    yard = `<div class="row"><div>${next.name}<small>Hull ${next.hull} · Hold ${next.hold} · Crew who fight: ${next.fighters}<br>${next.desc}</small></div>
      <button class="btn gold" data-act="build" ${okW && okG ? '' : 'disabled'}>Build</button></div>
      <div class="row"><small>Costs ${next.cost.wood} wood and ${next.cost.gold} gold</small>${okW && okG ? '' : `<span class="need">Need ${okW ? '' : Math.max(0, next.cost.wood-S.ware)+' wood '}${okG ? '' : Math.max(0, next.cost.gold-S.gold)+' gold'}</span>`}</div>`;
  } else if (next && next.locked){
    yard = `<div class="row locked"><div>${next.name}<small>${next.desc}</small></div><span>${next.cost.wood} wood · ${next.cost.gold} gold</span></div>`;
  }
  return `
    <h1>Kallisto Harbor</h1>
    <p class="sub">Your ship: ${sh.name} · Warehouse: ${S.ware} wood</p>
    <div class="sec"><h3>Fish market</h3>
      <div class="row"><div>Sardine × ${S.cargo.sardine}<small>${FISH.sardine.price} gold each</small></div><div>Tuna × ${S.cargo.tuna}<small>${FISH.tuna.price} gold each</small></div>
      <button class="btn gold" data-act="sell" ${catchVal ? '' : 'disabled'}>Sell +${catchVal}</button></div></div>
    <div class="sec"><h3>Dry dock</h3>
      <div class="row"><div>Hull ${Math.ceil(S.hull)} / ${sh.hull}<small>1 gold patches ${TUNING.repairPerGold} hull</small></div>
      <button class="btn" data-act="repair" ${dmg > 0 && S.gold > 0 ? '' : 'disabled'}>${dmg > 0 ? 'Repair ' + Math.min(repairCost, S.gold) + 'g' : 'Hull is sound'}</button></div></div>
    <div class="sec"><h3>Shipwright</h3>${yard}</div>
    ${lookHTML()}
    <div class="foot"><span></span><button class="btn gold" data-act="close">Set sail</button></div>`;
}

// Paint, sail and flag for the current ship. Free for now; prices come with the progression design.
function lookHTML(){
  const spec = SPECS[ship().model], lk = {...spec.look, ...G.S.look};
  const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v.name}</option>`).join('');
  return `<div class="sec"><h3>Paint and flags</h3>
    <div class="looks">
      <label><span>Hull paint</span><select id="lookPaint" data-look="paint">${opts(PAINTS, lk.paint)}</select></label>
      <label><span>Sail</span>${spec.mast ? `<select id="lookSail" data-look="sail">${opts(SAILS, lk.sail)}</select>` : '<select disabled><option>Needs a mast</option></select>'}</label>
      <label><span>Flag</span><select id="lookFlag" data-look="flag">${opts(GODS, lk.flag)}</select></label>
    </div></div>`;
}

function settingsHTML(){
  const s = G.settings, q = s.quality;
  const opt = (v, label) => `<button class="seg ${q === v ? 'on' : ''}" data-act="quality" data-v="${v}" aria-pressed="${q === v}">${label}</button>`;
  const auto = s.detected ? ` (using ${QUALITY[s.detected].label})` : '';
  const mins = Math.floor((G.S.playSeconds || 0)/60);
  return `
    <h1>Settings</h1>
    <p class="sub">Time at sea: ${mins} min · Ship: ${ship().name}</p>
    <div class="sec"><h3>Graphics</h3>
      <div class="segs">${opt('auto', 'Auto')}${opt('low', 'Low')}${opt('high', 'High')}</div>
      <div class="row"><small>Auto checks how smooth the game runs and picks for you${auto}. Low turns off shadows and draws fewer waves.</small></div>
      <div class="row"><div>Show frame rate<small>Frames per second, bottom left. 50 or more feels smooth.</small></div>
        <button class="btn" data-act="fps">${s.showFps ? 'On' : 'Off'}</button></div>
    </div>
    <div class="sec dev"><h3>Builder tools · removed before release</h3>
      <div class="row"><div>Camera zoom<small>Also pinch with two fingers, or scroll the mouse wheel.</small></div><b id="zoomVal">${s.dev.zoom.toFixed(1)}×</b></div>
      <input type="range" id="zoomRange" min="0.4" max="3.5" step="0.1" value="${s.dev.zoom}" aria-label="Camera zoom">
      <div class="row"><div>Ship speed</div></div>
      <div class="segs four">${[1,2,4,8].map(v => `<button class="seg ${s.dev.speed === v ? 'on' : ''}" data-act="speed" data-v="${v}" aria-pressed="${s.dev.speed === v}">${v}×</button>`).join('')}</div>
      <div class="row"><div>Tap the chart to teleport<small>Instead of setting a course.</small></div><button class="btn" data-act="teleport">${s.dev.teleport ? 'On' : 'Off'}</button></div>
      <div class="row"><div>Fish and wreck marks on the charts</div><button class="btn" data-act="markers">${s.dev.markers ? 'On' : 'Off'}</button></div>
      <div class="row"><div>Crew on ships<small>On by default now. Turn off to compare.</small></div><button class="btn" data-act="crew">${s.dev.crew ? 'On' : 'Off'}</button></div>
      <div class="row"><div>Raiders attack<small>Off = a peaceful sea for testing other things.</small></div><button class="btn" data-act="raiders">${s.dev.raiders ? 'On' : 'Off'}</button></div>
      <div class="row"><div>Bring a raider skiff to me<small>To test a fight right away.</small></div><button class="btn" data-act="spawn">Spawn</button></div>
      <div class="row"><div>Every ship moored at Kallisto<small>All ships in a row south of the pier, to compare sizes and crew.</small></div><button class="btn" data-act="fleet">${s.dev.fleet ? 'On' : 'Off'}</button></div>
      <div class="row"><div>Reveal the whole chart</div><button class="btn" data-act="revealall">Reveal</button></div>
      <div class="row"><div>Add 100 gold and 20 wood</div><button class="btn" data-act="givestuff">Add</button></div>
    </div>
    <div class="sec"><h3>Save</h3>
      <div class="row"><div>Your progress saves on this device by itself.<small>Starting over erases your gold, ship and cargo.</small></div>
        <button class="btn danger" data-act="reset">${resetArmed ? 'Tap again to erase' : 'Start over'}</button></div>
    </div>
    <div class="foot"><span class="ver">Prototype 8</span><button class="btn gold" data-act="close">Back to sea</button></div>`;
}

sheetEl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const a = b.dataset.act, S = G.S, sh = ship();
  if (a !== 'reset') resetArmed = false;
  if (a === 'close'){ closeSheet(); return; }
  if (a === 'sell'){ const g = S.cargo.sardine*FISH.sardine.price + S.cargo.tuna*FISH.tuna.price; S.gold += g; S.cargo.sardine = S.cargo.tuna = 0; toast(`Sold the catch for ${g} gold`); }
  if (a === 'repair'){ const cost = Math.min(Math.ceil((sh.hull - S.hull)/TUNING.repairPerGold), S.gold); S.gold -= cost; S.hull = Math.min(sh.hull, S.hull + cost*TUNING.repairPerGold); }
  if (a === 'build'){ const n = SHIPS[S.tier+1]; S.ware -= n.cost.wood; S.gold -= n.cost.gold; S.tier++; S.hull = n.hull; S.look = {flag:S.look.flag}; swapBoat(); toast(`Your ${n.name} is ready`); }
  if (a === 'quality'){ G.settings.quality = b.dataset.v; G.settings.detected = null; applyQuality(b.dataset.v === 'auto' ? 'high' : b.dataset.v); G.autoCheck = b.dataset.v === 'auto'; saveSettings(); }
  if (a === 'speed'){ G.settings.dev.speed = +b.dataset.v; saveSettings(); }
  if (a === 'teleport'){ G.settings.dev.teleport = !G.settings.dev.teleport; saveSettings(); }
  if (a === 'markers'){ G.settings.dev.markers = !G.settings.dev.markers; saveSettings(); }
  if (a === 'crew'){ G.settings.dev.crew = !G.settings.dev.crew; saveSettings(); swapBoat(); document.dispatchEvent(new Event('crew')); }
  if (a === 'raiders'){ G.settings.dev.raiders = !G.settings.dev.raiders; saveSettings(); }
  if (a === 'spawn'){ document.dispatchEvent(new Event('spawnraider')); toast('A raider skiff appears'); closeSheet(); return; }
  if (a === 'fleet'){ G.settings.dev.fleet = !G.settings.dev.fleet; saveSettings(); document.dispatchEvent(new Event('fleet')); }
  if (a === 'revealall'){ revealAll(); toast('Whole chart revealed'); }
  if (a === 'givestuff'){ S.gold += 100; S.ware += 20; toast('+100 gold, +20 wood in the warehouse'); }
  if (a === 'fps'){ G.settings.showFps = !G.settings.showFps; saveSettings(); }
  if (a === 'reset'){
    if (!resetArmed) resetArmed = true;
    else { resetArmed = false; resetSave(); swapBoat(); refreshAllTrees(); lastHud = ''; toast('Fresh start at Kallisto'); closeSheet(); return; }
  }
  save(); render();
});
sheetEl.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.look; if (!k) return;
  G.S.look = {...G.S.look, [k]:e.target.value}; swapBoat(); save();
});
sheetEl.addEventListener('input', e => {
  if (e.target.id !== 'zoomRange') return;
  setZoom(+e.target.value);
  const v = document.getElementById('zoomVal'); if (v) v.textContent = G.settings.dev.zoom.toFixed(1) + '×';
});
$('dockBtn').addEventListener('click', openPort);
$('gearBtn').addEventListener('click', () => sheet === 'settings' ? closeSheet() : openSheet('settings'));
