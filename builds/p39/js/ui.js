// Screen UI: top bar, messages, zone banner, harbor and settings sheets.
import {SHIPS, FISH, TUNING, QUALITY, CREW, GOD_BLESSINGS, TIMBER} from './config.js';
import {ZONES, MAP, MAP_NAMES, ISLANDS, WORLD, CITIES, HARBORS, home, rival} from './world.js';
import {G, ship, holdUsed, save, saveSettings, resetSave, revealAll, lvl, pay, addMat} from './state.js';
import {applyQuality, setSeaLook, project, view, CAM_ANGLES} from './scene.js';
import {swapBoat, refreshAllTrees} from './entities.js';
import {setZoom} from './input.js';
import {PAINTS, SAILS, GODS, SPECS, setCel} from './ships.js';
import {tutHTML} from './tutorial.js';
import {founded, blessing, seats, candidates} from './crew.js';
import {board, active, accept, decline, drop, deliver, canDeliver, progress, pillText, goal} from './quests.js';
import {REQUESTS, GOALS, UPGRADES} from './config.js';
import {effectText, buy} from './upgrades.js';
import {WX_IC, harborHTML, bagHTML, councilHTML, canBuyGood, tabs, tabBar, card, top, IC, sel, priceAt, catchValue, matPrice, matStep, goodPrice, goodSell} from './menus.js';
import {GOODS, WAR} from './config.js';
import {launch, switchTo, hireCaptain} from './fleet.js';
import {W, KINDS} from './weather.js';
import {sfx, SND, applyVolumes} from './audio.js';
import {setTimeOfDay} from './daynight.js';

const $ = id => document.getElementById(id);

// ---- messages ----
const toastEl = $('toast'); let toastT = 0;
export function toast(msg, dur=1.8){ toastEl.textContent = msg; toastEl.hidden = false; toastT = dur; }
let zoneT = 0;
export function showZone(z){
  $('zoneName').textContent = ZONES[z].name;
  $('zoneSub').textContent = z === 2 && G.S.tier >= 2 ? 'Your bireme can take it.' : ZONES[z].sub;
  $('zone').style.opacity = 1; zoneT = 3; sfx('zone');
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
  if (pill && $('goalText').textContent !== pill){ $('goalText').textContent = pill; $('goalLbl').textContent = goal() ? 'Goal' : 'Job'; $('goalPill').title = $('goalLbl').textContent + ': ' + pill; }
  // at night a clear sky shows the moon instead of the sun
  const wk = KINDS[W.kind], moon = (G.night || 0) > .5 && (W.kind === 'fair' || W.kind === 'calm'), wkey = W.kind + (moon ? '-n' : '');
  if ($('wxChip').dataset.k !== wkey){ $('wxChip').dataset.k = wkey; $('wxName').textContent = moon ? (W.kind === 'calm' ? 'Calm night' : 'Clear night') : wk.label; $('wxIcon').innerHTML = (moon ? WX_IC.night : WX_IC[W.kind]) || wk.icon; $('wxChip').className = 'hi wx ' + W.kind; }
  const bl = G.S.bless || 0; $('blessChip').hidden = !bl;
  if (bl) $('blessT').textContent = `${Math.floor(bl/60)}:${String(Math.floor(bl % 60)).padStart(2, '0')}`;
  if (toastT > 0){ toastT -= dt; if (toastT <= 0) toastEl.hidden = true; }
  placeNearBoat();
  if (zoneT > 0){ zoneT -= dt; if (zoneT <= 0) $('zone').style.opacity = 0; }
}

// Messages float just above your boat; the harbor, raid, council and arena buttons sit just below it.
function placeNearBoat(){
  if (G.sheetOpen || G.mapOpen) return;
  const [bx, by] = project(G.S.x, 0, G.S.y), x = Math.max(120, Math.min(view.W - 120, bx));
  if (!toastEl.hidden){ toastEl.classList.add('near'); toastEl.style.left = x + 'px'; toastEl.style.top = Math.max(200, by - 118) + 'px'; } // above the pick-up icons that pop out of the boat
  const below = Math.min(view.H - 150, by + 62);
  for (const id of ['dockbar', 'raidBtn', 'councilBtn', 'arenaBtn']){ const el = id === 'dockbar' ? document.querySelector('.dockbar') : $(id); if (!el) continue;
    el.classList.add('near'); el.style.left = x + 'px'; el.style.top = (below + (id === 'councilBtn' || id === 'arenaBtn' ? 54 : 0)) + 'px'; }
}
// ---- sheets (harbor, settings) ----
const sheetEl = $('sheet'); let sheet = null, resetArmed = false;
function openSheet(name){ if (!sheet) sfx('open'); sheet = name; G.sheetOpen = true; G.portOpen = name === 'port'; G.dest = null; resetArmed = false; render(); sheetEl.hidden = false; }
function closeSheet(){ if (sheet) sfx('close'); sheet = null; G.sheetOpen = false; G.portOpen = false; sheetEl.hidden = true; save(); }
export function openPort(){
  G.v = 0;
  openSheet('port'); save();
}

function render(){ const st = sheetEl.scrollTop;
  sheetEl.innerHTML = sheet === 'port' ? harborHTML(G.dock ? G.dock.h : HARBORS[0]) : sheet === 'tut' ? tutHTML(tutPage) : sheet === 'inv' ? bagHTML() : sheet === 'council' && G.council ? councilHTML(G.council) : settingsHTML();
  sheetEl.classList.add('menu'); sheetEl.scrollTop = st; }

// How to play: two pages, shown on a new game and from Settings.
let tutPage = 0;
export function openTutorial(){ tutPage = 0; hideHint(); openSheet('tut'); }

// Map choice and scale. Changing them reloads the game and starts you at the Kallisto pier (drachmae and ship are kept).
function mapHTML(){
  const d = G.settings.dev, sp = ship().speed, secs = (a, b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y)/sp);
  const isl = n => ISLANDS.find(i => i.name === n), fmt = s => s < 90 ? s + ' s' : (s/60).toFixed(1) + ' min';
  const trips = ['Naxos', 'Milos', 'Crete', 'Rhodes', 'Lesbos', 'Elaia', 'Skotia'].map(isl).filter(Boolean).slice(0, 4)
    .map(i => `${i.name} ${fmt(secs(home, i))}`).join(' · ');
  return `<div class="row"><div>Map<small>Changing the map or its scale starts you again at the Kallisto pier. Drachmae and ship stay.</small></div></div>
    <div class="looks one"><label><span>Map</span><select id="mapSel">${Object.entries(MAP_NAMES).map(([k, v]) => `<option value="${k}" ${k === MAP.id ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <div class="row"><div>Distance between islands<small>Bigger = more open sea and longer trips.</small></div><b id="spreadVal">${(+d.spread).toFixed(1)}×</b></div>
    <input type="range" id="spreadRange" min="0.5" max="1.5" step="0.1" value="${d.spread}" aria-label="Distance between islands">
    <div class="row"><div>Island size<small>Kallisto keeps its size so the town fits.</small></div><b id="isleVal">${(+d.isle).toFixed(1)}×</b></div>
    <input type="range" id="isleRange" min="0.5" max="1.6" step="0.1" value="${d.isle}" aria-label="Island size">
    <div class="row"><div>Sailing times from Kallisto with your ${ship().name.toLowerCase()}<small>${trips} · across the whole map ${fmt(Math.round(WORLD/sp))}</small></div>
      <button class="btn gold" data-act="applymap">Apply</button></div>`;
}

// Settings: the same Greek menu as the harbor, with a close button, and three tabs.
// sound volumes: Off, Quiet, Medium, Loud
const VOLS = [[0, 'Off'], [.3, 'Quiet'], [.6, 'Medium'], [1, 'Loud']];
function saveSound(){ const {on, music, sfx: fx, sea} = SND; G.settings.sound = {on, music, sfx:fx, sea}; saveSettings(); applyVolumes(); }
const tog = (act, on, label) => `<button class="tog ${on ? 'on' : ''}" data-act="${act}" role="switch" aria-checked="${on}" aria-label="${label}"><i></i></button>`;
const row = (title, small, ctl) => `<div class="row"><div>${title}${small ? `<small>${small}</small>` : ''}</div>${ctl}</div>`;
function settingsHTML(){
  const s = G.settings, q = s.quality, t = tabs.set;
  const opt = (v, label) => `<button class="seg ${q === v ? 'on' : ''}" data-act="quality" data-v="${v}" aria-pressed="${q === v}">${label}</button>`;
  const auto = s.detected ? ` (using ${QUALITY[s.detected].label})` : '';
  const mins = Math.floor((G.S.playSeconds || 0)/60);
  // the Builder tab only shows for the builder: tap the version line five times to bring it up on a new device
  const list = [['game', 'Game', IC.ship], ['gfx', 'Graphics', IC.star], ...(s.builder || s.showBuilder ? [['dev', 'Builder', IC.gear]] : [])];
  if (t === 'dev' && !list.some(([k]) => k === 'dev')) tabs.set = 'game';
  const game = card('Your voyage', `<div class="stats big">${IC.ship} ${ship().name} · ${mins} min at sea</div>${row('How to play', 'The two pages from the start of the game.', '<button class="btn" data-act="tut">Show</button>')}`)
    + card('Sound', row('Sound', 'The sea, gulls, oars, coins, arrows and a soft lyre tune.', tog('sound', SND.on, 'Sound'))
      + `<div class="looks">${[['music', 'Music'], ['sfx', 'Effects'], ['sea', 'Sea and wind']].map(([k, label]) => `<label><span>${label}</span><select data-snd="${k}" ${SND.on ? '' : 'disabled'}>${VOLS.map(([v, n]) => `<option value="${v}" ${VOLS.reduce((b, o) => Math.abs(o[0] - SND[k]) < Math.abs(b[0] - SND[k]) ? o : b)[0] === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`).join('')}</div>`)
    + card('Ships and statues', row('Showroom', 'Every ship, fortress, statue and tree in 3D, to turn around and look at.', '<a class="btn" href="showroom.html" target="_blank" rel="noopener">Open</a>')
      + (location.hostname.endsWith('github.io') ? row('Older builds', 'Every prototype of the game so far, to see how it grew.', '<a class="btn" href="builds/" target="_blank" rel="noopener">Open</a>') : ''))
    + card('Save', row('Your progress saves on this device by itself.', 'Starting over erases your drachmae, ship and cargo.', `<button class="btn danger" data-act="reset">${resetArmed ? 'Tap again to erase' : 'Start over'}</button>`))
    + `<p class="note ver" data-act="ver">Wine-Dark Sea · Prototype 39</p>`;
  const gfx = card('Graphics', `<div class="segs">${opt('auto', 'Auto')}${opt('low', 'Low')}${opt('high', 'High')}</div>
      <p class="note">Auto checks how smooth the game runs and picks for you${auto}. Low turns off shadows and draws fewer waves.</p>
      ${row('Camera angle', 'High looks down on your ship. Low sees further, toward the horizon.', '')}
      <div class="segs">${Object.entries(CAM_ANGLES).map(([k, v]) => `<button class="seg ${(s.angle || 'mid') === k ? 'on' : ''}" data-act="angle" data-v="${k}" aria-pressed="${(s.angle || 'mid') === k}">${v.label}</button>`).join('')}</div>
      ${row('Day and night', 'A 10 minute day with a short moonlit night, when torches and windows light up.', `<select class="jobsel" data-set="daynight" aria-label="Day and night">${[['cycle', 'Day and night'], ['day', 'Always day'], ['night', 'Always night']].map(([v, n]) => `<option value="${v}" ${(s.daynight || 'cycle') === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`)}
      ${row('Bright sea', 'Clear blue water with drifting white foam lines, like a cartoon sea. Off = the darker teal sea.', tog('bright', s.bright !== false, 'Bright sea'))}
      ${row('Tiny world look', 'Soft blur at the top and bottom of the screen and warmer colors, so the sea looks like a little model. Turn off if the game feels slow.', tog('tiny', s.tiny !== false, 'Tiny world look'))}
      ${row('Cel-shaded look (test)', 'Hard light and dark bands with ink outlines on ships and fortresses, like a cartoon. Try it and tell me.', tog('cel', !!s.cel, 'Cel-shaded look'))}
      ${row('Show frame rate', 'Frames per second, bottom left. 50 or more feels smooth.', tog('fps', s.showFps, 'Show frame rate'))}`);
  const dev = card('Builder tools · removed before release', `${row('Builder tools', s.builder ? 'Off plays the game the way a player would.' : 'Off: normal speed, no teleport, no hidden marks, raiders on. Your builder settings come back when you turn them on.', tog('builder', s.builder, 'Builder tools'))}
      ${s.builder ? `${mapHTML()}
      ${row('Camera zoom', 'Also pinch with two fingers, or scroll the mouse wheel.', `<b id="zoomVal">${s.dev.zoom.toFixed(1)}×</b>`)}
      <input type="range" id="zoomRange" min="0.4" max="3.5" step="0.1" value="${s.dev.zoom}" aria-label="Camera zoom">
      ${row('Ship speed', '', '')}
      <div class="segs four">${[1,2,4,8].map(v => `<button class="seg ${s.dev.speed === v ? 'on' : ''}" data-act="speed" data-v="${v}" aria-pressed="${s.dev.speed === v}">${v}×</button>`).join('')}</div>
      ${row('Tap the chart to teleport', 'Instead of setting a course.', tog('teleport', s.dev.teleport, 'Teleport'))}
      ${row('Fish and wreck marks on the charts', '', tog('markers', s.dev.markers, 'Marks'))}
      ${row('Crew on ships', 'On by default now. Turn off to compare.', tog('crew', s.dev.crew, 'Crew'))}
      ${row('Raiders attack', 'Off = a peaceful sea for testing other things.', tog('raiders', s.dev.raiders, 'Raiders'))}
      ${row('Every ship moored at Kallisto', 'All ships in a row south of the pier.', tog('fleet', s.dev.fleet, 'Fleet'))}
      ${row('Drop a bottle ahead of me', 'Coins, a note or a treasure map.', '<button class="btn" data-act="bottle">Bottle</button>')}
      ${row('Bury a treasure nearby', 'On a beach close to you, marked with an X.', '<button class="btn" data-act="treasure">Treasure</button>')}
      ${row('Weather now', '', `<div class="btns">${['calm', 'fair', 'windy', 'storm', 'mist'].map(k => `<button class="btn small" data-act="wx" data-v="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>`)}
      ${row('Time of day now', 'Jumps the clock (with Day and night on).', `<div class="btns">${[['morning', 'Morning'], ['noon', 'Noon'], ['golden', 'Golden'], ['sunset', 'Sunset'], ['night', 'Night']].map(([k, n]) => `<button class="btn small" data-act="tod" data-v="${k}">${n}</button>`).join('')}</div>`)}
      ${row('Bring up a whale', 'Surfaces ahead of you.', '<button class="btn" data-act="whale">Whale</button>')}
      ${row('Bring a raider skiff to me', 'To test a fight right away.', '<button class="btn" data-act="spawn">Spawn</button>')}
      ${row('Reveal the whole chart', '', '<button class="btn" data-act="revealall">Reveal</button>')}
      ${row('Add drachmae and materials', '100 drachmae, 200 wood, 20 bronze, 20 linen.', '<button class="btn" data-act="givestuff">Add</button>')}` : ''}
      ${row('Model showroom', 'Every ship, fortress and statue in 3D, to turn around and look at.', '<a class="btn" href="showroom.html" target="_blank" rel="noopener">Open</a>')}`, 'dev');
  return `<div class="mtop">${top('Settings', '<span class="xspace"></span>')}${tabBar(list, tabs.set, 'set')}</div><div class="mbody">${tabs.set === 'gfx' ? gfx : tabs.set === 'dev' ? dev : game}</div>`;
}

// every button gives a soft tap
document.addEventListener('click', e => { if (e.target.closest('button, a.btn')) sfx('click'); });
let verTaps = 0;
sheetEl.addEventListener('click', e => { if (e.target.closest('[data-act=ver]') && ++verTaps >= 5){ G.settings.showBuilder = true; saveSettings(); verTaps = 0; toast('Builder tab unlocked'); render(); } });
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
    S.look = {...S.look, flag:$('crewGod').value}; S.crew = []; swapBoat(); sfx('fanfare'); toast(`${S.crewName} sail under the flag of ${GODS[S.look.flag].name}!`, 3.5);
  }
  if (a === 'hire' && S.gold >= CREW.hireCost && (S.crew || []).length < seats()){
    const c = candidates()[+b.dataset.i]; S.gold -= CREW.hireCost; sfx('buy'); S.crew = [...(S.crew || []), c]; S.hireSeed = (S.hireSeed || 1) + 3;
    toast(`${c.n} joins the crew as a ${CREW.jobs[c.job].label.toLowerCase()}`, 2.6);
  }
  if (a === 'letgo'){ const c = S.crew[+b.dataset.i]; S.crew = S.crew.filter((_, i) => i !== +b.dataset.i); toast(`${c.n} goes ashore`); }
  if (a === 'toss'){ const k = b.dataset.k; if (S.cargo[k] > 0){ S.cargo[k]--; toast(`Threw 1 ${FISH[k] ? FISH[k].label.toLowerCase() : GOODS[k].label.toLowerCase()} overboard`); } }
  if (a === 'tutnext' || a === 'tutback'){ tutPage += a === 'tutnext' ? 1 : -1; render(); sheetEl.scrollTop = 0; return; }
  if (a === 'tutdone'){ closeSheet(); toast('Fair winds!', 2); return; }
  if (a === 'sail'){ closeSheet(); document.dispatchEvent(new Event('undock')); return; }
  if (a === 'upgrade'){ const k = b.dataset.k; if (buy(k)){ sfx('hammer'); if (k === 'ram' || k === 'hull' || k === 'sail') swapBoat(); toast(`${UPGRADES[k].label}: ${effectText(k)}`, 2.4); save(); } }
  if (a === 'buymat'){ const h = G.dock ? G.dock.h : HARBORS[0], k = b.dataset.k, n = +b.dataset.n, p = matPrice(h, k), cost = n/matStep(k)*p;
    if (p !== null && S.gold >= cost){ sfx('buy'); S.gold -= cost; addMat(k, n); toast(`Bought ${n} ${k} for the warehouse`, 2); } }
  if (a === 'buygood' || a === 'sellgood'){ const h = G.dock ? G.dock.h : HARBORS[0], k = b.dataset.k;
    if (a === 'buygood' && holdUsed() < ship().hold && S.gold >= goodPrice(h, k) && canBuyGood(h, k)){ S.gold -= goodPrice(h, k); S.cargo[k] = (S.cargo[k] || 0) + 1; sfx('buy'); }
    if (a === 'sellgood' && S.cargo[k]){ const g = S.cargo[k]*goodSell(h, k); S.gold += g; sfx('coins'); toast(`Sold ${S.cargo[k]} ${GOODS[k].label.toLowerCase()} for ${g} drachmae`, 2.4); S.cargo[k] = 0; progress('trade'); } }
  if (a === 'sell'){ const g = catchValue(G.dock ? G.dock.h : HARBORS[0]); S.gold += g; if (g) sfx('coins'); for (const k in FISH) S.cargo[k] = 0; toast(`Sold the catch for ${g} drachmae`); progress('sell'); }
  if (a === 'repair'){ const cost = Math.min(Math.ceil((sh.hull - S.hull)/TUNING.repairPerGold), S.gold); S.gold -= cost; S.hull = Math.min(sh.hull, S.hull + cost*TUNING.repairPerGold); if (cost) sfx('hammer'); }
  if (a === 'build'){ const t = +b.dataset.t, n = SHIPS[t]; if (pay(n.cost)){ launch(t); progress('build'); swapBoat(); sfx('fanfare'); toast(`Your ${n.name} is ready${lvl('ram') || lvl('arrows') ? '. Your ram and arrowheads came along' : ''}`, 3); } }
  if (a === 'captain'){ const n = hireCaptain(+b.dataset.t); if (n){ toast(`${n} takes your ${SHIPS[+b.dataset.t].name.toLowerCase()} out fishing`, 3); document.dispatchEvent(new Event('fleetmoved')); } }
  if (a === 'collect'){ sfx('coins'); toast(`+${S.purse} drachmae from your captains`, 2.5); S.gold += S.purse; S.purse = 0; }
  if (a === 'switch'){ const t = +b.dataset.t; if (switchTo(t)){ swapBoat(); sfx('dock'); toast(`You go aboard your ${SHIPS[t].name.toLowerCase()}`, 2.4); } }
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
  if (a === 'selup'){ sel.up = b.dataset.k; render(); return; }
  if (a === 'wartake' && G.council){ const o = WAR.offers[+b.dataset.i]; S.war = {...o, city:G.council.city, foe:rival(G.council.city), got:0}; toast('Contract taken. Good hunting.', 2.5); }
  if (a === 'warclaim' && S.war && S.war.got >= S.war.n){ S.gold += S.war.gold; sfx('coins'); toast(`${CITIES[S.war.city].name} pays you ${S.war.gold} drachmae.`, 3); S.war = null; }
  if (a === 'wardrop'){ S.war = null; }
  if (a === 'tab'){ tabs[b.dataset.sheet] = b.dataset.t; render(); sheetEl.scrollTop = 0; return; }
  if (a === 'treasure'){ document.dispatchEvent(new Event('treasure')); closeSheet(); return; }
  if (a === 'wx'){ document.dispatchEvent(new CustomEvent('weather', {detail:b.dataset.v})); closeSheet(); return; }
  if (a === 'tod'){ setTimeOfDay(b.dataset.v); G.settings.daynight = 'cycle'; saveSettings(); closeSheet(); return; }
  if (a === 'whale'){ document.dispatchEvent(new Event('whale')); closeSheet(); return; }
  if (a === 'givestuff'){ S.gold += 100; addMat('wood', 200); addMat('bronze', 20); addMat('linen', 20); toast('+100 drachmae, +200 wood, +20 bronze, +20 linen'); }
  if (a === 'applymap'){
    const d = G.settings.dev; d.map = $('mapSel').value; d.spread = +$('spreadRange').value; d.isle = +$('isleRange').value;
    saveSettings(); save(); location.reload(); return;
  }
  if (a === 'builder'){ G.settings.builder = !G.settings.builder; saveSettings(); swapBoat(); document.dispatchEvent(new Event('fleet')); }
  if (a === 'bright'){ G.settings.bright = G.settings.bright === false; saveSettings(); setSeaLook(G.settings.bright); }
  if (a === 'tiny'){ G.settings.tiny = G.settings.tiny === false; saveSettings(); }
  if (a === 'cel'){ G.settings.cel = !G.settings.cel; saveSettings(); setCel(G.settings.cel); document.dispatchEvent(new Event('crew')); swapBoat(); }
  if (a === 'sound'){ SND.on = !SND.on; saveSound(); if (SND.on) sfx('chime'); }
  if (a === 'fps'){ G.settings.showFps = !G.settings.showFps; saveSettings(); }
  if (a === 'angle'){ G.settings.angle = b.dataset.v; saveSettings(); }
  if (a === 'reset'){
    if (!resetArmed) resetArmed = true;
    else { resetArmed = false; resetSave(); swapBoat(); refreshAllTrees(); lastHud = ''; toast('Fresh start at Kallisto'); closeSheet(); return; }
  }
  save(); render();
});
sheetEl.addEventListener('change', e => {
  const ci = e.target.dataset && e.target.dataset.crew;
  if (ci !== undefined){ const c = G.S.crew[+ci]; c.job = e.target.value; toast(`${c.n} is now a ${CREW.jobs[c.job].label.toLowerCase()}`, 2); save(); render(); return; }
  if (e.target.dataset && e.target.dataset.set === 'daynight'){ G.settings.daynight = e.target.value; saveSettings(); return; }
  const sk = e.target.dataset && e.target.dataset.snd; if (sk){ SND[sk] = +e.target.value; saveSound(); sfx(sk === 'sea' ? 'gull' : 'coin'); return; }
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
$('councilBtn').addEventListener('click', () => { if (G.council) openSheet('council'); });
$('chartBtn').addEventListener('click', () => { if (sheet) closeSheet(); $('mapBtn').click(); });
// HUD and toolbar icons are the same drawings as the menus
document.querySelectorAll('i.ic[data-ic]').forEach(el => { el.innerHTML = IC[el.dataset.ic] || ''; });
