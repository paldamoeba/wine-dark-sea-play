// Screen UI: top bar, messages, zone banner, harbor and settings sheets.
import {TROPHIES, has as hasTrophy, cupSVG, trophyCount} from './trophies.js?v=2c85ea6';
import {comeBack, leave, load as netLoad, state as netState} from './online.js?v=2c85ea6';
import {SHIPS, FISH, TUNING, QUALITY, CREW, GOD_BLESSINGS, TIMBER, WAREHOUSE, OMENS} from './config.js?v=2c85ea6';
import {ZONES, MAP, ISLANDS, WORLD, CITIES, HARBORS, home, rival} from './world.js?v=2c85ea6';
import {showRewarded, ads, adPrivacy, CONSENT_TEST, consentTest} from './ads.js?v=2c85ea6';
import {APP, RELEASE, PUBLIC, G, shipName, ship, holdUsed, have, rank, save, saveSettings, resetSave, revealAll, lvl, pay, addMat, room, unload, used, capOf, LOADS, wareRoom, stat, gain} from './state.js?v=2c85ea6';
import {colorHeld, unlockColor, colorName} from './colors.js?v=2c85ea6';
import {CYCLE} from './daynight.js?v=2c85ea6';
import {applyQuality, project, view, CAM_ANGLES, saverOn} from './scene.js?v=2c85ea6';
import {swapBoat, refreshAllTrees} from './entities.js?v=2c85ea6';
import {setZoom} from './input.js?v=2c85ea6';
import {PAINTS, SAILS, GODS, SPECS} from './ships.js?v=2c85ea6';
import {tutHTML} from './tutorial.js?v=2c85ea6';
import {founded, blessing} from './crew.js?v=2c85ea6';
import {WHALE} from './wildlife.js?v=2c85ea6';
import {startStudy, startBuild, watchedVideo, checkYard, timeLeft, mmss} from './shipyard.js?v=2c85ea6';
import {board, active, accept, decline, drop, deliver, canDeliver, progress, pillText, goal, collect} from './quests.js?v=2c85ea6';
import {REQUESTS, GOALS, UPGRADES} from './config.js?v=2c85ea6';
import {effectText, buy} from './upgrades.js?v=2c85ea6';
import {fleetHTML} from './fleetpage.js?v=2c85ea6';
import {myLevel} from './levels.js?v=2c85ea6';
import {askName} from './naming.js?v=2c85ea6';
import {FLAG_COST, RENAME_COST, flagHeld, stockLeft, takeStock, restock} from './menus.js?v=2c85ea6';
import {GOOD_IC, WX_IC, harborHTML, bagHTML, councilHTML, repairCost, canBuyGood, tabs, tabBar, card, top, IC, sel, priceAt, catchValue, matPrice, matStep, goodPrice, goodSell} from './menus.js?v=2c85ea6';
import {GOODS, WAR} from './config.js?v=2c85ea6';
import {fly} from './fly.js?v=2c85ea6';
import {combatState} from './combat.js?v=2c85ea6';
import {launch, switchTo, hireCaptain, assignCaptain} from './fleet.js?v=2c85ea6';
import {RANKS} from './records.js?v=2c85ea6';
import {W, KINDS} from './weather.js?v=2c85ea6';
import {sfx, SND, STYLES, BATTLE, MIX, applyVolumes, playNow} from './audio.js?v=2c85ea6';
import {setTimeOfDay} from './daynight.js?v=2c85ea6';

const $ = id => document.getElementById(id);

// ---- messages ----
const toastEl = $('toast'); let toastT = 0;
export const toastBusy = () => toastT > 0;
export function toast(msg, dur=1.8){ toastEl.textContent = msg; toastEl.hidden = false; toastT = dur; }
let zoneT = 0;
export function showZone(z){
  $('zoneName').textContent = ZONES[z].name;
  $('zoneSub').textContent = ''; // P58: just the name, less text
  $('zone').style.opacity = 1; zoneT = 3; sfx('zone');
}
export function hideHint(){ if (G.S.hint){ G.S.hint = false; $('hint').hidden = true; } }

// ---- top bar ----
let lastHud = '', nearHarbor = null;
// P84: write to the page only when something changed. Setting the same text again still makes the phone redo the layout, every frame.
const put = (el, k, v) => { if (el[k] !== v) el[k] = v; };
// P93 (Nicholas): loot comes in one thing at a time. The numbers on screen (shown) climb to what you really have, one kind
// after another (drachmae, then fish, wood, bronze, iron, linen, goods), with its "+n" popping up as it starts. The save always
// holds the real amounts; only the display catches up. Anything going down, and everything while a menu is open, shows at once.
const shown = {}; let tallyQ = [], tallyT = 0;
export function popLater(key, kind, n){ (G.tallyPops = G.tallyPops || []).push({key, kind, n}); }
function tally(dt){
  const T = {gold:G.S.gold}; for (const k of LOADS) T[k] = used(k);
  for (const k in T){ if (shown[k] == null || T[k] < shown[k] || G.sheetOpen){ shown[k] = T[k]; tallyQ = tallyQ.filter(q => q !== k); continue; }
    if (T[k] > shown[k] && !tallyQ.includes(k)) tallyQ.push(k); }
  if (G.sheetOpen) for (const p of (G.tallyPops || []).splice(0)) gain(p.kind, p.n);
  if ((tallyT -= dt) > 0 || !tallyQ.length) return;
  const k = tallyQ[0], d = T[k] - shown[k];
  if (!tallyQ.started){ tallyQ.started = k; const pops = G.tallyPops || []; for (let i = pops.length - 1; i >= 0; i--) if (pops[i].key === k){ gain(pops[i].kind, pops[i].n); pops.splice(i, 1); } }
  shown[k] += Math.min(d, Math.max(1, Math.ceil(d*Math.min(1, dt*5))));
  if (shown[k] >= T[k]){ tallyQ.shift(); tallyQ.started = null; tallyT = .3; }
}
// P93 (Nicholas): the drachmae, hull and supply bars fade away while you just sail. They come back while you gain or lose
// anything (and a few seconds after), in a fight, when the hull is low, in a harbor, and for the first seconds of a voyage.
let quietKey = '', loudT = 5;
function hudQuiet(dt){ const k = [G.S.gold, ...LOADS.map(used), Math.ceil(G.S.hull)].join('|');
  if (k !== quietKey){ quietKey = k; loudT = 4; } else loudT -= dt;
  const busy = loudT > 0 || tallyQ.length || combatState.threat || combatState.target || G.S.hull < ship().hull*.35 || !!G.dock || G.sinking;
  document.body.classList.toggle('hudquiet', !busy); }
export const shownOf = k => shown[k] ?? (k === 'gold' ? G.S.gold : used(k));
export function updateUI(dt, nearDock){
  tally(dt); hudQuiet(dt);
  const sh = ship(), key = [shownOf('gold'), G.S.tier, ...LOADS.map(k => shownOf(k)), Math.ceil(G.S.hull)].join('|');
  if (key !== lastHud){
    lastHud = key;
    $('gold').textContent = shownOf('gold'); drawLoads();
    const pct = Math.max(0, G.S.hull/sh.hull*100); $('hullbar').style.width = pct + '%'; $('hullbar').classList.toggle('low', pct < 35);
  }
  const moored = !!G.dock && G.dock.mode === 'moored', h = nearDock, banned = h && h.is.city && (G.hunted || {})[h.is.city];
  nearHarbor = h;
  put($('dockBtn'), 'hidden', !!(G.sheetOpen || (moored ? false : !h || !!G.dock)));
  put($('dockBtn'), 'disabled', !moored && !!banned);
  put($('dockBtn'), 'textContent', moored ? 'Set sail' : banned ? `${CITIES[h.is.city].name} won't let you dock` : h ? `Enter ${h.is.name} harbor` : '');
  put($('harborBtn'), 'hidden', !!(G.sheetOpen || !moored));
  put($('hint'), 'hidden', !!(!G.S.hint || G.sheetOpen));
  document.body.classList.toggle('sheeton', !!G.sheetOpen); // menus cover the whole screen: the HUD and little map step aside
  G.doneT = Math.max(0, (G.doneT || 0) - dt); $('goalPill').classList.toggle('done', G.doneT > 0); { const L = myLevel(), m = $('rank'); if (m.textContent !== String(L)){ const up = +m.textContent < L && G.medalSeen; m.textContent = L; G.medalSeen = true; if (up){ const el = $('medal'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } } } /* P72: the level medal, with a little pop when it rises */ // a check mark for a moment after a goal or job is done
  // P65: the red bubble only means something: a quest is done and you haven't looked at it yet; on the chart, a treasure map you haven't looked at
  const pill = pillText(); put($('goalDot'), 'hidden', !!(!(G.S.questNew || (G.S.claims || []).length) || G.sheetOpen || G.doneT > 0)); // P92: stays while a reward waits to be collected
  { const v = !!(!G.S.mapNew || G.sheetOpen); put($('chartDot'), 'hidden', v); put($('mapDot'), 'hidden', v); }
  { const d = G.S.gold - (G.goldSeen ?? G.S.gold); if (d > 0) stat('earned', d); G.goldSeen = G.S.gold; }
  if (pill && $('goalText').textContent !== pill){ $('goalText').textContent = pill; $('goalLbl').textContent = goal() ? 'Goal' : 'Job'; $('goalPill').title = $('goalLbl').textContent + ': ' + pill; }
  // at night a clear sky shows the moon instead of the sun
  const wk = KINDS[W.kind], moon = (G.night || 0) > .5 && (W.kind === 'fair' || W.kind === 'calm'), wkey = W.kind + (moon ? '-n' : '');
  if ($('wxChip').dataset.k !== wkey){ $('wxChip').dataset.k = wkey; $('wxName').textContent = moon ? (W.kind === 'calm' ? 'Calm night' : 'Clear night') : wk.label; $('wxIcon').innerHTML = (moon ? WX_IC.night : WX_IC[W.kind]) || wk.icon; $('wxChip').className = 'hi wx ' + W.kind; }
  { const o = G.S.omen, c = $('omenChip'); c.hidden = !o; if (o){ const god = OMENS[o.g]; $('omenDot').style.background = god.color; $('omenT').textContent = `${Math.floor(o.t/60)}:${String(Math.floor(o.t % 60)).padStart(2, '0')}`; } }
  const bl = G.S.bless || 0, wh = WHALE.up && !bl; put($('blessChip'), 'hidden', !bl && !wh); $('blessChip').classList.toggle('call', wh);
  if (wh) put($('blessT'), 'textContent', '');
  if (bl) put($('blessT'), 'textContent', `${Math.floor(bl/60)}:${String(Math.floor(bl % 60)).padStart(2, '0')}`);
  if (toastT > 0){ toastT -= dt; if (toastT <= 0) toastEl.hidden = true; }
  placeNearBoat();
  // the shipyard's clocks: live countdowns in the menu, and news when a study or a build is done
  for (const el of document.querySelectorAll('[data-until]')) put(el, 'textContent', mmss(Math.max(0, +el.dataset.until - Date.now()/1000)));
  for (const d of checkYard()){ const n = SHIPS[d.t]; sfx('fanfare');
    if (d.what === 'study') toast('Plans studied!', 4.5);
    else { progress('build', n.model); document.dispatchEvent(new Event('fleetmoved')); toast(`${n.name} built!`, 5); }
    if (G.sheetOpen) render(); }
  if (zoneT > 0){ zoneT -= dt; if (zoneT <= 0) $('zone').style.opacity = 0; }
}

// What the ship carries: one short bar for each kind, stacked under the hull bar. Bronze and goods show once you have some.
const LOAD_IC = {fish:() => IC.fish(), wood:() => IC.wood, bronze:() => IC.bronze, iron:() => IC.iron, linen:() => IC.linen, goods:() => GOOD_IC('wine')};
function drawLoads(){
  const S = G.S, rows = LOADS; // P59: every kind, always
  $('loads').innerHTML = rows.map(k => { const u = shownOf(k), c = capOf(k), p = Math.min(100, u/c*100);
    return `<div class="ld ${u >= c ? 'full' : ''}" title="${k}"><i class="ic">${LOAD_IC[k]()}</i><span class="bar"><i style="width:${p}%"></i></span><b>${u}/${c}</b></div>`; }).join('');
}

// A video reward (studying or building faster, a color, sailing home). For now a 5-second placeholder; real ads come in when we choose an ad company.
const coinsFor = g => Math.max(3, Math.min(12, 2 + Math.round(Math.sqrt(g)))); // more money, more coins in the air
// P87: in the phone app a real video ad plays (ads.js; test builds get Google's test ads). Closed early: no reward.
// No video to show (offline, or none available): a message, and nothing is lost. orFree: give it anyway then (getting back afloat).
export function playVideo(done, what = 'This one takes 10 minutes off.', after = '10 minutes faster!', orFree = false, onFail = null){
  if (APP){ showRewarded(() => { done(); if (after) toast(after, 2); }, why => { if (why === 'none' && orFree){ done(); return; } if (onFail) onFail(); toast(why === 'closed' ? 'The video was closed early, so no reward' : 'No video right now. Try again in a minute', 3); }); return; }
  if (RELEASE){ done(); toast(after, 2); return; } // P78: no ads in the store build: no fake video either
  const v = document.createElement('div'); v.className = 'videobox'; v.innerHTML = `<div><b>A short video would play here</b><small>Ads come later. ${what}</small><em>5</em></div>`; document.body.appendChild(v);
  let n = 5; const iv = setInterval(() => { n--; v.querySelector('em').textContent = n; if (n <= 0){ clearInterval(iv); v.remove(); done(); if (after) toast(after, 2); } }, 1000);
}
// Tablets: everything on screen is drawn half as big again (body.big in the CSS, G.uik for the minimap and placed buttons).
// ?big=1 or ?big=0 forces it for testing.
export function sizeUI(){
  const q = new URLSearchParams(location.search).get('big'), coarse = matchMedia('(pointer:coarse)').matches;
  const big = q !== null ? q === '1' : coarse && Math.min(innerWidth, innerHeight) >= 600;
  G.uik = big ? 1.5 : 1; document.body.classList.toggle('big', big);
}
sizeUI(); addEventListener('resize', sizeUI);
// P88 (Nicholas): the buttons are Bronze (cast metal, 3D) for good; the other looks and their choice are gone.
document.body.classList.add('uibronze');

// The harbor, raid, council and arena buttons sit just below it.
function placeNearBoat(){
  if (G.sheetOpen || G.mapOpen) return;
  const [bx, by] = project(G.S.x, 0, G.S.y), x = Math.max(120, Math.min(view.W - 120, bx));
  const z = G.uik || 1;
  // P82 (Nicholas): messages no longer float over the boat in the middle of the screen; they stay low (.toast in the CSS)
  const below = Math.min(view.H - 150*z, by + 62*z);
  for (const id of ['dockbar', 'raidBtn', 'councilBtn', 'arenaBtn']){ const el = id === 'dockbar' ? document.querySelector('.dockbar') : $(id); if (!el) continue;
    el.classList.add('near'); el.style.left = x/z + 'px'; el.style.top = (below + (id === 'councilBtn' || id === 'arenaBtn' ? 54*z : 0))/z + 'px'; }
}
// ---- sheets (harbor, settings) ----
const sheetEl = $('sheet'); let sheet = null, resetArmed = false;
// the end of the voyage: a page with it in numbers
document.addEventListener('chapterdone', () => openSheet('end'));
export function openSheet(name){ if (!sheet) sfx('open'); sheet = name; if (name === 'inv' && tabs.inv === 'jobs') G.S.questNew = false; G.sheetOpen = true; G.portOpen = name === 'port'; G.dest = null; resetArmed = false; render(); sheetEl.hidden = false; }
function closeSheet(){ if (sheet) sfx('close'); sheet = null; G.sheetOpen = false; G.portOpen = false; sheetEl.hidden = true; save(); document.dispatchEvent(new Event('sheetclosed')); }
export function openPort(){
  G.v = 0; tabs.port = (G.dock && G.dock.h && !G.dock.h.is.port) ? 'market' : 'yard'; // every visit opens on the first tab
  openSheet('port'); save();
}

function render(){ const st = sheetEl.scrollTop;
  sheetEl.innerHTML = sheet === 'port' ? harborHTML(G.dock ? G.dock.h : HARBORS[0]) : sheet === 'tut' ? tutHTML(tutPage) : sheet === 'inv' ? bagHTML() : sheet === 'fleet' ? fleetHTML() : sheet === 'council' && G.council ? councilHTML(G.council) : sheet === 'end' ? endHTML() : sheet === 'log' ? `<div class="mtop">${top('Voyage log')}</div><div class="mbody">${logHTML()}</div>` : settingsHTML();
  sheetEl.classList.add('menu'); sheetEl.scrollTop = st; }

// P65: fun numbers to look at after hours of playing
function logHTML(){
  const S = G.S, s = S.stats || {}, secs = S.playSeconds || 0, n = v => (v || 0).toLocaleString();
  const time = secs >= 3600 ? `${Math.floor(secs/3600)} h ${Math.floor(secs/60) % 60} min` : `${Math.floor(secs/60)} min`, days = Math.max(s.days || 0, Math.floor(secs/CYCLE));
  const tile = (ic, v, label) => `<div class="stat">${ic}<b>${v}</b><small>${label}</small></div>`;
  return `<button class="btn gold wide" data-act="openfleet" data-to="ranks">Leaderboard</button>` + card(`Trophies <small class="cupn">${trophyCount()} of ${Object.keys(TROPHIES).length}</small>`, `<div class="cups">${Object.entries(TROPHIES).map(([k, t]) => `<div class="cupb ${hasTrophy(k) ? 'on' : ''}">${cupSVG(t.c, hasTrophy(k))}<b>${t.name}</b><small>${t.how}</small></div>`).join('')}</div>`) + card('Your voyage', `<div class="statgrid">${tile(IC.star, days, days === 1 ? 'day at sea' : 'days at sea')}${tile(IC.ship, time, 'sailing')}${tile(IC.world, n(s.dist), 'stadia sailed')}${tile(IC.coin, n(s.earned), 'drachmae earned')}</div>`)
    + card('Battles', `<div class="statgrid">${tile(IC.swords, n(s.sunk), 'ships sunk')}${tile(IC.flame, n(s.pirates), 'pirates sunk')}${tile(IC.crew, n(s.navy), 'army ships sunk')}${tile(IC.hold, n(s.merchants), 'merchants raided')}${tile(IC.catapult, n(s.forts), 'fortresses taken')}${tile(IC.jobs, n(s.camps), 'camps burned')}${tile(IC.hull, n(s.sunkMe), 'times you sank')}</div>`)
    + card('Finds', `<div class="statgrid">${tile(IC.fish(), n(s.fish), 'fish caught')}${tile(IC.wood, n(s.wood), 'wood gathered')}${tile(IC.iron, n(s.iron), 'iron dug up')}${tile(IC.map, n(s.treasure), 'treasures dug up')}${tile(IC.letter, n(s.bottles), 'bottles opened')}${tile(IC.bless, n(s.whales), 'whale blessings')}${tile(IC.chain, n(s.kraken || S.kraken), 'kraken seen')}${tile(IC.sail, n(s.colors), 'colors found')}${tile(IC.book, n(s.quests), 'quests done')}</div>`);
}
// The end of the voyage: the pirate king is beaten.
function endHTML(){
  const S = G.S, mins = Math.round((S.playSeconds || 0)/60), ships = (S.owned || []).length || S.tier + 1;
  return `<div class="mtop">${top('The Aegean is free')}</div><div class="mbody">
    ${card('The pirate king is beaten', `<div class="endpic">${IC.ship}${IC.swords}${IC.star}</div>
      <p class="endtxt">Polycrates' black and gold flagship lies at the bottom of the sea, and the merchants of the Aegean sail safe again. From one little rowboat called ${shipName(0)} you built a fleet${S.crewName ? ` and the ${S.crewName}` : ''}.</p>
      <div class="stats big">${IC.ship} ${ships} ships · ${IC.coin} ${S.gold} drachmae · ${mins} min at sea</div>`)}
    ${card('What next', '<p class="note">The Aegean is yours: keep fishing, trading and fighting as long as you like.</p><button class="btn gold wide" data-act="close">Keep sailing</button>')}</div>`;
}

// How to play: two pages, shown on a new game and from Settings.
let tutPage = 0;
export function openTutorial(){ tutPage = 0; hideHint(); openSheet('tut'); }

// Map choice and scale. Changing them reloads the game and starts you at the Kallisto pier (drachmae and ship are kept).
function mapHTML(){
  const d = G.settings.dev, sp = ship().speed, secs = (a, b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y)/sp);
  const isl = n => ISLANDS.find(i => i.name === n), fmt = s => s < 90 ? s + ' s' : (s/60).toFixed(1) + ' min';
  const trips = ['Naxos', 'Milos', 'Crete', 'Rhodes', 'Lesbos', 'Elaia', 'Skotia'].map(isl).filter(Boolean).slice(0, 4)
    .map(i => `${i.name} ${fmt(secs(home, i))}`).join(' · ');
  return `<div class="row"><div>Map size<small>Changing the map's scale starts you again at the Kallisto pier. Drachmae and ship stay.</small></div></div>
    <div class="row"><div>Distance between islands<small>Bigger = more open sea and longer trips.</small></div><b id="spreadVal">${(+d.spread).toFixed(1)}×</b></div>
    <input type="range" id="spreadRange" min="0.5" max="2" step="0.1" value="${d.spread}" aria-label="Distance between islands">
    <div class="row"><div>Island size<small>Kallisto keeps its size so the town fits.</small></div><b id="isleVal">${(+d.isle).toFixed(1)}×</b></div>
    <input type="range" id="isleRange" min="0.5" max="2" step="0.1" value="${d.isle}" aria-label="Island size">
    <div class="row"><div>Sailing times from Kallisto with your ${ship().name.toLowerCase()}<small>${trips} · across the whole map ${fmt(Math.round(WORLD/sp))}</small></div>
      <button class="btn gold" data-act="applymap">Apply</button></div>`;
}

// Settings: the same Greek menu as the harbor, with a close button, and three tabs.
// sound volumes: Off, Quiet, Medium, Loud
const VOLS = [[0, 'Off'], [.3, 'Quiet'], [.6, 'Medium'], [1, 'Loud']];
// P92 (Nicholas): the songs were too loud. Music has its own steps: the old Quiet is now Medium (and the default), the old Medium is Loud, plus a quieter Quiet.
const MUSIC_VOLS = [[0, 'Off'], [.15, 'Quiet'], [.3, 'Medium'], [.6, 'Loud']];
// full screen (Android browsers and computers; iPhones only through "Add to Home Screen")
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFull(){
  const d = document.documentElement, rq = d.requestFullscreen || d.webkitRequestFullscreen;
  if (isFull()){ (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  const blocked = () => toast('Full screen is blocked on this page. Open the play link, or add the game to your home screen', 4);
  if (!rq) return blocked();
  try { Promise.resolve(rq.call(d, {navigationUI:'hide'})).then(() => { try { screen.orientation.lock('portrait').catch(() => {}); } catch(_){} }, blocked); } catch(_){ blocked(); }
}
document.addEventListener('fullscreenchange', () => { if (sheet === 'settings') render(); });
function saveSound(){ const {on, music, sfx: fx, sea, style, battle, rest} = SND; G.settings.sound = {on, music, sfx:fx, sea, style, battle, rest}; saveSettings(); applyVolumes(); }
const tog = (act, on, label) => `<button class="tog ${on ? 'on' : ''}" data-act="${act}" role="switch" aria-checked="${on}" aria-label="${label}"><i></i></button>`;
const row = (title, small, ctl) => `<div class="row"><div>${title}${small ? `<small>${small}</small>` : ''}</div>${ctl}</div>`;
function settingsHTML(){
  const s = G.settings, q = s.quality, t = tabs.set;
  const opt = (v, label) => `<button class="seg ${q === v ? 'on' : ''}" data-act="quality" data-v="${v}" aria-pressed="${q === v}">${label}</button>`;
  const auto = s.detected ? ` (using ${QUALITY[s.detected].label})` : '';
  const mins = Math.floor((G.S.playSeconds || 0)/60);
  // the Builder tab only shows for the builder: tap the version line five times to bring it up on a new device
  // P88 (Nicholas): no music style, rests, battle music, day and night or Start over here (erase a voyage on the main menu)
  const list = [['game', 'Game', IC.ship], ['gfx', 'Graphics', IC.star], ...(s.builder || s.showBuilder ? [['dev', 'Builder', IC.gear]] : [])];
  if (t === 'dev' && !list.some(([k]) => k === 'dev')) tabs.set = 'game';
  const game = card('Your voyage', `<div class="stats big">${IC.ship} ${shipName()} · ${mins} min at sea</div>${row('Voyage log', 'Ships sunk, days at sea and other fun numbers.', '<button class="btn" data-act="log">Open</button>')}${row('Leaderboard', 'Your ships ranked, and what each one has done.', '<button class="btn" data-act="openfleet" data-to="ranks">Open</button>')}${row('Stuck?', 'Puts your ship on clear water close to where you are.', '<button class="btn" data-act="respawn">Respawn</button>')}${row('How to play', 'The pages from the start of the game.', '<button class="btn" data-act="tut">Show</button>')}${row('Main menu', 'Your three voyages. This one is saved first. Erase a voyage there to start over.', '<button class="btn" data-act="mainmenu">Go</button>')}`)
    + card('Sound', row('Sound', 'The sea, gulls, oars, coins, arrows and soft music.', tog('sound', SND.on, 'Sound'))
      + `<div class="looks">${[['music', 'Music'], ['sfx', 'Effects'], ['sea', 'Sea and wind']].map(([k, label]) => `<label><span>${label}</span><select data-snd="${k}" ${SND.on ? '' : 'disabled'}>${(k === 'music' ? MUSIC_VOLS : VOLS).map(([v, n], _, L) => `<option value="${v}" ${L.reduce((b, o) => Math.abs(o[0] - SND[k]) < Math.abs(b[0] - SND[k]) ? o : b)[0] === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`).join('')}</div>`
      )
    + (APP ? '' : card('Screen', row('Full screen', 'Hides the browser bars. On a phone you can also add the game to your home screen (browser menu, then "Add to Home screen") and it always opens full screen.', `<button class="btn" data-act="full">${isFull() ? 'Exit' : 'Go'}</button>`)))
    + (APP ? '' : card('Ships and statues', row('Showroom', 'Every ship, fortress, statue and tree in 3D, to turn around and look at.', '<a class="btn" href="showroom.html" target="_blank" rel="noopener">Open</a>')
      + (location.hostname.endsWith('github.io') ? row('Older builds', 'Every prototype of the game so far, to see how it grew.', '<a class="btn" href="builds/" target="_blank" rel="noopener">Open</a>') : '')))
    + `<p class="note ver" ${RELEASE ? '' : 'data-act="ver"'}>Wine-Dark Sea · ${RELEASE ? 'Palda Games' : 'Prototype 126'}</p>`;
  const gfx = card('Graphics', `<div class="segs four">${opt('auto', 'Auto')}${opt('low', 'Low')}${opt('mid', 'Medium')}${opt('high', 'High')}</div>
      <p class="note">Auto checks how smooth the game runs and picks for you${auto}. High is the sharpest. Low turns off shadows and draws fewer waves.</p>
      ${row('Camera angle', 'High looks down on your ship. Low sees further, toward the horizon.', '')}
      <div class="segs">${Object.entries(CAM_ANGLES).map(([k, v]) => `<button class="seg ${(s.angle || 'low') === k ? 'on' : ''}" data-act="angle" data-v="${k}" aria-pressed="${(s.angle || 'low') === k}">${v.label}</button>`).join('')}</div>
      ${row('Battery saver', 'Keeps the phone cooler: 30 frames a second while you sail and fewer pixels, 60 frames again in a fight. On by default on phones.', tog('saver', saverOn(), 'Battery saver'))}
      ${row('Tiny world look', 'Soft blur at the top and bottom of the screen and warmer colors, so the sea looks like a little model. Turn off if the game feels slow.', tog('tiny', s.tiny !== false, 'Tiny world look'))}
      ${row('Show frame rate', 'Frames per second, bottom left. 50 or more feels smooth.', tog('fps', s.showFps, 'Show frame rate'))}
      ${ads.privacy ? row('Privacy settings', 'Change what you agreed to about ads and your data.', '<button class="btn small" data-act="adprivacy">Open</button>') : ''}
      ${CONSENT_TEST ? row('Consent form test (test app only)', 'Shows the ad consent form as in Europe. Paste this phone\'s test device code from the log, then tap Show.', '<input id="consentHash" class="jobsel" placeholder="Test device code" value="' + (localStorage.getItem('wds-consent-hash') || '') + '" aria-label="Test device code"> <button class="btn small" data-act="consenttest">Show</button>') : ''}
      ${CONSENT_TEST ? row('Ad log (test app only)', ads.log.length ? ads.log.slice(-8).join(' · ') : 'Nothing yet. Watch a video, then come back here.', '') : ''}`);
  const dev = card('Builder tools · removed before release', `${row('Builder tools', s.builder ? 'Off plays the game the way a player would.' : 'Off: normal speed, no teleport, no hidden marks, raiders on. Your builder settings come back when you turn them on.', tog('builder', s.builder, 'Builder tools'))}
      ${s.builder ? `${mapHTML()}
      ${row('Camera zoom', 'Also pinch with two fingers, or scroll the mouse wheel.', `<b id="zoomVal">${s.dev.zoom.toFixed(1)}×</b>`)}
      <input type="range" id="zoomRange" min="0.4" max="3.5" step="0.1" value="${s.dev.zoom}" aria-label="Camera zoom">
      ${row('Try a ship', 'Sail any ship to test a fight. This changes this voyage, so test in Voyage 3.', `<select class="jobsel" data-set="tryship" aria-label="Ship to try">${SHIPS.map((sh, i) => `<option value="${i}" ${i === G.S.tier ? 'selected' : ''}>${sh.name}</option>`).join('')}</select>`)}
      ${row('Its upgrades', 'Hull, speed, crew, arrows, ram and every power.', `<select class="jobsel" data-set="tryups" aria-label="Upgrades to try"><option value="-1">Choose</option><option value="0">None</option><option value=".5">Half</option><option value="1">Full</option></select>`)}
      ${row('Go and fight', 'Takes you there with a full hull.', '<div class="btns"><button class="btn small" data-act="tryking">Pirate king</button><button class="btn small" data-act="tryarena">Arena</button></div>')}
      ${APP ? row('Ad log', ads.log.length ? ads.log.slice(-8).join(' · ') : 'Nothing yet. Watch a video, then come back here.', '') : ''}
      ${row('Pirate king\'s chart', `${(G.S.lairChart || []).length} of 12 pieces. Every fortress keeps one. With 12 he appears in his lair and on the chart.`, '<div class="btns"><button class="btn small" data-act="chart1">One piece</button><button class="btn small" data-act="chartall">All</button></div>')}
      ${row('Ship speed', '', '')}
      <div class="segs four">${[1,2,4,8].map(v => `<button class="seg ${s.dev.speed === v ? 'on' : ''}" data-act="speed" data-v="${v}" aria-pressed="${s.dev.speed === v}">${v}×</button>`).join('')}</div>
      ${row('Tap the chart to teleport', 'Instead of setting a course.', tog('teleport', s.dev.teleport, 'Teleport'))}
      ${row('Fish and wreck marks on the charts', '', tog('markers', s.dev.markers, 'Marks'))}
      ${row('Crew on ships', 'On by default now. Turn off to compare.', tog('crew', s.dev.crew, 'Crew'))}
      ${row('Raiders attack', 'Off = a peaceful sea for testing other things.', tog('raiders', s.dev.raiders, 'Raiders'))}
      ${row('Every ship moored at Kallisto', 'All ships in a row south of the pier.', tog('fleet', s.dev.fleet, 'Fleet'))}
      ${row('A god\'s fire ahead of me', 'A blessing found at sea.', '<button class="btn" data-act="omen">Fire</button>')}
      ${row('Drop a bottle ahead of me', 'Coins, a note or a treasure map.', '<button class="btn" data-act="bottle">Bottle</button>')}
      ${row('Bury a treasure nearby', 'On a beach close to you, marked with an X.', '<button class="btn" data-act="treasure">Treasure</button>')}
      ${row('Weather now', '', `<div class="btns">${['calm', 'fair', 'windy', 'storm', 'mist'].map(k => `<button class="btn small" data-act="wx" data-v="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>`)}
      ${row('Time of day now', 'Jumps the clock (with Day and night on).', `<div class="btns">${[['morning', 'Morning'], ['noon', 'Noon'], ['golden', 'Golden'], ['sunset', 'Sunset'], ['night', 'Night']].map(([k, n]) => `<button class="btn small" data-act="tod" data-v="${k}">${n}</button>`).join('')}</div>`)}
      ${row('Bring up a whale', 'Surfaces ahead of you.', '<button class="btn" data-act="whale">Whale</button>')}
      ${row('Bring up the kraken', 'Only works out in the Open Sea.', '<button class="btn" data-act="kraken">Kraken</button>')}
      ${row('Bring a raider skiff to me', 'To test a fight right away.', '<button class="btn" data-act="spawn">Spawn</button>')}
      ${row('Reveal the whole chart', '', '<button class="btn" data-act="revealall">Reveal</button>')}
      ${row('Add drachmae and materials', '100 drachmae, 200 wood, 20 bronze, 20 iron, 20 linen.', '<button class="btn" data-act="givestuff">Add</button>')}` : ''}
      ${row('Model showroom', 'Every ship, fortress and statue in 3D, to turn around and look at.', '<a class="btn" href="showroom.html" target="_blank" rel="noopener">Open</a>')}`, 'dev');
  return `<div class="mtop">${top('Settings')}${tabBar(list, tabs.set, 'set')}</div><div class="mbody">${tabs.set === 'gfx' ? gfx : tabs.set === 'dev' ? dev : game}</div>`;
}

// every button gives a soft tap
document.addEventListener('click', e => { if (e.target.closest('button, a.btn')) sfx('click'); });
let verTaps = 0;
sheetEl.addEventListener('click', e => { if (!PUBLIC && e.target.closest('[data-act=ver]') && ++verTaps >= 5){ G.settings.showBuilder = true; saveSettings(); verTaps = 0; toast('Builder tab unlocked'); render(); } });
sheetEl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const a = b.dataset.act, S = G.S, sh = ship();
  if (a !== 'reset') resetArmed = false;
  if (a === 'close'){ closeSheet(); return; }
  if (a === 'tut'){ openTutorial(); return; }
  if (a === 'log'){ sheet = 'log'; render(); sheetEl.scrollTop = 0; return; }
  if (a === 'respawn'){ closeSheet(); reviveDone(); document.dispatchEvent(new Event('respawn')); return; }
  if (a === 'mainmenu'){ closeSheet(); document.dispatchEvent(new Event('openmenu')); return; }
  if (a === 'colorlocked'){ toast('Found on ships you sink', 2.4); return; }
  if (a === 'colorvideo'){ const k = b.dataset.k, v = b.dataset.v; playVideo(() => { unlockColor(k, v); G.S.look = {...G.S.look, [k]:v}; swapBoat(); save(); sfx('fanfare'); render(); }, `This one unlocks ${colorName(k, v)}.`, `${colorName(k, v)}!`); return; }
  if (a === 'accept') accept(+b.dataset.i);
  if (a === 'decline') decline(+b.dataset.i);
  if (a === 'deliver'){ const g0 = S.gold; deliver(+b.dataset.i, G.dock && G.dock.h); if (S.gold > g0) fly(b, 'gold', IC.coin, coinsFor(S.gold - g0), g0, S.gold, `+${S.gold - g0}`); }
  if (a === 'drop'){ drop(+b.dataset.i); toast('Job dropped'); }
  if (a === 'claim'){ const g0 = S.gold, got = collect(+b.dataset.i); if (got) fly(b, 'gold', IC.coin, coinsFor(got), g0, S.gold, `+${got}`); }
  if (a === 'found' && S.gold >= CREW.foundCost){
    S.crewName = ($('crewName').value.trim() || 'The Sea Swallows').slice(0, 24); S.gold -= CREW.foundCost;
    S.look = {...S.look, flag:$('crewGod').value}; S.crewGod = S.look.flag; S.crew = []; swapBoat(); sfx('fanfare'); toast(S.crewName + '!', 2.5);
  }
  if (a === 'toss'){ const k = b.dataset.k; if (S.cargo[k] > 0){ S.cargo[k]--; toast('Thrown overboard'); } }
  if (a === 'tutnext' || a === 'tutback'){ tutPage += a === 'tutnext' ? 1 : -1; render(); sheetEl.scrollTop = 0; return; }
  if (a === 'tutdone'){ closeSheet(); toast('Fair winds!', 2); return; }
  if (a === 'sail'){ closeSheet(); document.dispatchEvent(new Event('undock')); return; }
  if (a === 'upgrade'){ const k = b.dataset.k; if (buy(k)){ sfx('hammer'); progress('upgrade', k); if (k === 'ram' || k === 'hull' || k === 'sail' || k === 'seats') swapBoat(); toast(`${UPGRADES[k].label}: ${effectText(k)}`, 2.4); save(); } }
  // P93 (Nicholas: +20 linen did nothing): when the warehouse can't take the whole amount, buy as much as fits (in whole steps)
  if (a === 'buymat'){ const h = G.dock ? G.dock.h : HARBORS[0], k = b.dataset.k, st = matStep(k), p = matPrice(h, k), left = stockLeft(h, k), fit = Math.floor(wareRoom(k)/st)*st, n = Math.min(+b.dataset.n, fit, Math.floor(left/st)*st), cost = n/st*p;
    if (p !== null && n > 0 && S.gold >= cost){ sfx('buy'); fly(b, k, IC[k], Math.min(7, 2 + Math.round(n/st/2)), have(k), have(k) + n); S.gold -= cost; addMat(k, n); takeStock(h, k, n); if (n < +b.dataset.n) toast(n === fit ? `Only ${n} fit in the warehouse` : `They only had ${n} left`, 2.2); }
    else if (fit <= 0){ toast('Warehouse full. Build it bigger in the Warehouse tab', 2.6); return; } }
  if (a === 'restock'){ const h = G.dock ? G.dock.h : HARBORS[0]; playVideo(() => { restock(h); sfx('coins'); render(); }, 'This one fills the market up again.', 'Market restocked!'); return; }
  if (a === 'flagpick'){ tabs.flagPick = tabs.flagPick === b.dataset.v ? null : b.dataset.v; sfx('click'); }
  const flagOn = v => { S.flags = [...new Set([...(S.flags || []), v])]; S.look = {...S.look, flag:v}; tabs.flagPick = null; swapBoat(); sfx('fanfare'); save(); };
  if (a === 'flagbuy' && S.gold >= FLAG_COST && !flagHeld(b.dataset.v)){ S.gold -= FLAG_COST; flagOn(b.dataset.v); }
  if (a === 'flagvideo'){ const v = b.dataset.v; playVideo(() => { flagOn(v); render(); }, 'This one unlocks the flag.', 'New flag!'); return; }
  if (a === 'look' && (b.dataset.k === 'flag' ? flagHeld(b.dataset.v) : colorHeld(b.dataset.k, b.dataset.v))){ G.S.look = {...G.S.look, [b.dataset.k]:b.dataset.v}; swapBoat(); save(); }
  if (a === 'wareup'){ const nx = WAREHOUSE[(S.wareLv || 0) + 1]; if (nx && pay(nx.cost)){ S.wareLv = (S.wareLv || 0) + 1; sfx('hammer'); save(); } }
  if (a === 'buygood' || a === 'sellgood'){ const h = G.dock ? G.dock.h : HARBORS[0], k = b.dataset.k, from = b.closest('.job').querySelector('.jic');
    if (a === 'buygood'){ const q = Math.min(+b.dataset.n || 1, room('goods'), stockLeft(h, k)), c = q*goodPrice(h, k); if (q > 0 && S.gold >= c && canBuyGood(h, k)){ takeStock(h, k, q); sfx('buy'); fly(from, 'hold', GOOD_IC(k), Math.min(5, q + 1)); S.gold -= c; S.cargo[k] = (S.cargo[k] || 0) + q; } }
    if (a === 'sellgood' && S.cargo[k]){ const g = S.cargo[k]*goodSell(h, k); sfx('coins'); fly(from, 'gold', IC.coin, coinsFor(g), S.gold, S.gold + g, `+${g}`); S.gold += g; S.cargo[k] = 0; progress('trade'); } }
  if (a === 'sell'){ const g = catchValue(G.dock ? G.dock.h : HARBORS[0]);
    if (g){ sfx('coins'); const tiles = [...sheetEl.querySelectorAll('.tiles .tile:not(.dim)')], n = coinsFor(g); fly(tiles.length ? tiles : b, 'gold', IC.coin, n, S.gold, S.gold + g, `+${g}`); }
    S.gold += g; for (const k in FISH) S.cargo[k] = 0; progress('sell'); }
  if (a === 'repair'){ const {gold, wood} = repairCost(), by = b.dataset.by, heal = n => { S.hull = Math.min(sh.hull, S.hull + n); sfx('hammer'); stat('repairs'); };
    if (by === 'video'){ playVideo(() => { G.S.hull = ship().hull; sfx('hammer'); render(); }, 'This one repairs your ship.', 'Repaired!'); return; }
    if (by === 'gold' && S.gold > 0){ const c = Math.min(gold, S.gold); S.gold -= c; heal(c/TUNING.repairGold[rank()]); }
    if (by === 'wood' && S.ware > 0){ const c = Math.min(wood, S.ware); S.ware -= c; heal(c/(TUNING.repairGold[rank()]*TUNING.repairWood)); } }
  if (a === 'build'){ const t = +b.dataset.t; if (startBuild(t)){ sfx('hammer'); toast('Building', 3); } }
  if (a === 'study'){ const t = +b.dataset.t; if (startStudy(t)){ sfx('buy'); toast('Studying the plans', 3); } }
  if (a === 'video'){ const k = b.dataset.k; playVideo(() => { watchedVideo(k); render(); }); }
  if (a === 'captain'){ const n = hireCaptain(+b.dataset.t); if (n){ toast(`${n} sets out`, 3); document.dispatchEvent(new Event('fleetmoved')); } }
  if (a === 'capgive'){ const t = +b.dataset.t, n = (S.idleCaps || [])[0]; if (n && assignCaptain(n, t)){ toast(`${n} sets out`, 3); document.dispatchEvent(new Event('fleetmoved')); } }
  if (a === 'rkwhere'){ tabs.rankWhere = b.dataset.v; netState.by = null; }
  if (a === 'rkcat'){ const i = RANKS.findIndex(r => r[0] === (tabs.rankBy || 'sunk')); tabs.rankBy = RANKS[(i + +b.dataset.d + RANKS.length) % RANKS.length][0]; }
  if (a === 'collect'){ sfx('coins'); fly(b, 'gold', IC.coin, coinsFor(S.purse), S.gold, S.gold + S.purse, `+${S.purse}`); S.gold += S.purse; S.purse = 0; }
  if (a === 'switch'){ const t = +b.dataset.t; if (switchTo(t)){ swapBoat(); sfx('dock'); toast(`Aboard ${shipName(t)}`, 2.4); } }
  // P83: a new name costs 1000 drachmae or a video. The money is only taken once she really gets a new name.
  if (a === 'renamepick'){ const t = +b.dataset.t; tabs.renamePick = tabs.renamePick === t ? null : t; sfx('click'); }
  if (a === 'renamebuy' && S.gold >= RENAME_COST){ const t = +b.dataset.t, old = shipName(t); tabs.renamePick = null; askName(t, () => { if (shipName(t) !== old){ S.gold -= RENAME_COST; sfx('buy'); save(); } render(); }, true); return; }
  if (a === 'renamevideo'){ const t = +b.dataset.t; tabs.renamePick = null; playVideo(() => askName(t, () => render(), true), 'This one lets you rename her.', ''); return; }
  if (a === 'pin'){ const t = +b.dataset.t; S.pin = S.pin === t ? null : t; sfx(S.pin ? 'chime' : 'click'); if (S.pin) toast('Pinned. Its plans are on your chart', 3); }
  if (a === 'onlineback' || a === 'onlineleave' || a === 'onlineretry'){ (a === 'onlineback' ? comeBack() : a === 'onlineleave' ? leave() : netLoad(tabs.rankBy === 'deeds' ? 'deedN' : tabs.rankBy || 'sunk')); return; }
  if (a === 'record' || a === 'recback'){ tabs.fleet = 'ranks'; tabs.rec = a === 'record' ? (b.dataset.o ? {o:b.dataset.o} : {slot:+b.dataset.n, t:+b.dataset.t}) : null; if (sheet === 'port') tabs.port = 'fleet'; else sheet = 'fleet'; render(); sheetEl.scrollTop = 0; return; }
  if (a === 'openfleet'){ tabs.rec = null; tabs.fleet = b.dataset.to || 'get'; if (sheet === 'port') tabs.port = 'fleet'; else sheet = 'fleet'; render(); sheetEl.scrollTop = 0; return; }
  if (a === 'quality'){ G.settings.quality = b.dataset.v; G.settings.detected = null; applyQuality(b.dataset.v === 'auto' ? 'high' : b.dataset.v); G.autoCheck = b.dataset.v === 'auto'; saveSettings(); }
  if (a === 'speed'){ G.settings.dev.speed = +b.dataset.v; saveSettings(); }
  if (a === 'teleport'){ G.settings.dev.teleport = !G.settings.dev.teleport; saveSettings(); }
  if (a === 'markers'){ G.settings.dev.markers = !G.settings.dev.markers; saveSettings(); }
  if (a === 'crew'){ G.settings.dev.crew = !G.settings.dev.crew; saveSettings(); swapBoat(); document.dispatchEvent(new Event('crew')); }
  if (a === 'raiders'){ G.settings.dev.raiders = !G.settings.dev.raiders; saveSettings(); }
  if (a === 'spawn'){ document.dispatchEvent(new Event('spawnraider')); toast('A raider skiff appears'); closeSheet(); return; }
  if (a === 'fleet'){ G.settings.dev.fleet = !G.settings.dev.fleet; saveSettings(); document.dispatchEvent(new Event('fleet')); }
  if (a === 'revealall'){ revealAll(); toast('Whole chart revealed'); }
  if (a === 'tryking' || a === 'tryarena'){ S.hull = ship().hull; document.dispatchEvent(new Event(a === 'tryking' ? 'toking' : 'toarena')); closeSheet(); return; }
  if (a === 'chart1' || a === 'chartall'){ document.dispatchEvent(new CustomEvent('chartpiece', {detail:a === 'chartall' ? 'all' : 'one'})); render(); return; }
  if (a === 'adprivacy'){ adPrivacy(); return; }
  if (a === 'consenttest'){ const h = ($('consentHash') || {}).value || ''; try { localStorage.setItem('wds-consent-hash', h); } catch(e){} consentTest(h).then(m => toast(m, 4)); return; }
  if (a === 'omen'){ document.dispatchEvent(new Event('omen')); closeSheet(); return; }
  if (a === 'bottle'){ document.dispatchEvent(new Event('bottle')); closeSheet(); return; }
  if (a === 'selup'){ if (UPGRADES[b.dataset.k].power) sel.pw = b.dataset.k; else sel.up = b.dataset.k; render(); return; }
  if (a === 'wartake' && G.council){ const o = WAR.offers[+b.dataset.i]; S.war = {...o, city:G.council.city, foe:rival(G.council.city), got:0}; toast('Contract taken', 2); }
  if (a === 'warclaim' && S.war && S.war.got >= S.war.n){ fly(b, 'gold', IC.coin, coinsFor(S.war.gold), S.gold, S.gold + S.war.gold, `+${S.war.gold}`); S.gold += S.war.gold; sfx('coins'); S.war = null; }
  if (a === 'wardrop'){ S.war = null; }
  if (a === 'tab'){ tabs[b.dataset.sheet] = b.dataset.t; if (b.dataset.sheet === 'inv' && b.dataset.t === 'jobs') S.questNew = false; render(); sheetEl.scrollTop = 0; return; }
  if (a === 'treasure'){ document.dispatchEvent(new Event('treasure')); closeSheet(); return; }
  if (a === 'wx'){ document.dispatchEvent(new CustomEvent('weather', {detail:b.dataset.v})); closeSheet(); return; }
  if (a === 'tod'){ setTimeOfDay(b.dataset.v); G.settings.daynight = 'cycle'; saveSettings(); closeSheet(); return; }
  if (a === 'kraken'){ document.dispatchEvent(new Event('kraken')); closeSheet(); return; }
  if (a === 'whale'){ document.dispatchEvent(new Event('whale')); closeSheet(); return; }
  if (a === 'givestuff'){ S.gold += 100; addMat('wood', 200); addMat('bronze', 20); addMat('iron', 20); addMat('linen', 20); toast('+100 drachmae, +200 wood, +20 bronze, +20 iron, +20 linen'); }
  if (a === 'applymap'){
    const d = G.settings.dev; d.spread = +$('spreadRange').value; d.isle = +$('isleRange').value;
    saveSettings(); save(); location.reload(); return;
  }
  if (a === 'builder'){ G.settings.builder = !G.settings.builder; saveSettings(); swapBoat(); document.dispatchEvent(new Event('fleet')); }
  if (a === 'tiny'){ G.settings.tiny = G.settings.tiny === false; saveSettings(); }
  if (a === 'saver'){ G.settings.saver = !saverOn(); saveSettings(); dispatchEvent(new Event('resize')); }
  if (a === 'full'){ toggleFull(); return; }
  if (a === 'sound'){ SND.on = !SND.on; saveSound(); if (SND.on) sfx('chime'); }
  if (a === 'fps'){ G.settings.showFps = !G.settings.showFps; saveSettings(); }
  if (a === 'angle'){ G.settings.angle = b.dataset.v; saveSettings(); }
  if (a === 'reset'){
    if (!resetArmed) resetArmed = true;
    else { resetArmed = false; resetSave(); swapBoat(); refreshAllTrees(); lastHud = ''; toast('Fresh start at Kallisto'); closeSheet(); return; }
  }
  save(); render();
});
$('medal').addEventListener('click', () => { if (G.sheetOpen || G.menuOpen || G.mapOpen) return; sfx('click'); tabs.fleet = 'mine'; tabs.rec = null; openSheet('fleet'); });
document.addEventListener('ranksready', () => { if (sheet === 'fleet' || (sheet === 'port' && tabs.port === 'fleet')) if (tabs.fleet === 'ranks') render(); });
sheetEl.addEventListener('change', e => {
  if (e.target.dataset && e.target.dataset.set === 'tryship'){ const t = +e.target.value; G.S.names = {...(G.S.names || {}), [t]:(G.S.names || {})[t] || SHIPS[t].name}; launch(t); swapBoat(); render(); return; }
  if (e.target.dataset && e.target.dataset.set === 'tryups'){ const f = +e.target.value, S = G.S, t = S.tier; if (f < 0) return; const m = n => Math.round(n*f);
    S.ups = {...(S.ups || {}), [t]:{hull:m(10), oars:m(10), helm:m(10), sail:m(SPECS[SHIPS[t].model].sailMax || 0), seats:f ? m(99) : 0}}; for (const k of ['arrows', 'ram', 'shower', 'fire', 'catapult', 'chain']) S[k] = m(10); swapBoat(); S.hull = ship().hull; render(); return; }
  if (e.target.dataset && e.target.dataset.set === 'captain'){ const n = e.target.dataset.n, t = +e.target.value; if (assignCaptain(n, t)){ sfx('dock'); toast(t < 0 ? `${n} rests at Kallisto` : `${n} sets out`, 2.6); save(); document.dispatchEvent(new Event('fleetmoved')); } render(); return; }
  if (e.target.id === 'rankBy'){ tabs.rankBy = e.target.value; render(); return; }
  if (e.target.id === 'rankWhere'){ tabs.rankWhere = e.target.value; netState.by = null; render(); return; }
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
// P49: hired sailors became each ship's own crew; say so once to players who had some
setTimeout(() => { const S = G.S; if (S && S.crewRefund){ toast(`Sailors paid back: +${30*S.crewRefund}`, 7); delete S.crewRefund; save(); } }, 4000);
// tapping the blessing icon explains it
$('omenChip').addEventListener('click', () => { const o = G.S.omen && OMENS[G.S.omen.g]; if (o) toast(`${o.name}: ${o.text}`, 3); });
$('blessChip').addEventListener('click', () => toast(G.S.bless ? "Poseidon's blessing: faster sailing and quicker work" : 'A whale! Sail close for Poseidon\'s blessing', 3));
// P82: sinking? A video puts you back afloat with half your hull (up to 3 times each trip out to sea)
document.addEventListener('askrevive', e => { const left = e.detail; $('reviveGo').innerHTML = `${IC.play} Back afloat <small>${left} left</small>`; $('revive').hidden = false; document.body.classList.add('reviving'); });
const reviveDone = () => { $('revive').hidden = true; document.body.classList.remove('reviving'); };
$('reviveGo').addEventListener('click', () => { reviveDone(); if (APP) G.vidAt = Date.now(); playVideo(() => document.dispatchEvent(new Event('revive')), 'This one puts you back afloat.', '', true, () => document.dispatchEvent(new Event('giveup'))); });
$('reviveNo').addEventListener('click', () => { reviveDone(); document.dispatchEvent(new Event('giveup')); });
// P82: "Sail her now" after naming a new ship
document.addEventListener('sailship', e => { const t = e.detail; if (switchTo(t)){ swapBoat(); sfx('dock'); toast(`Aboard ${shipName(t)}`, 2.4); save(); if (sheet) render(); } });
// docking: wood and bronze aboard go to the warehouse first, so the shipyard can use them
document.addEventListener('docked', () => { if (unload().some(Boolean)) save(); openPort(); }); // unloaded quietly: the warehouse numbers in the menu show it
$('goalPill').addEventListener('click', () => { G.S.questNew = false; if (sheet === 'inv' && tabs.inv === 'jobs') closeSheet(); else { tabs.inv = 'jobs'; openSheet('inv'); } });
$('bagBtn').addEventListener('click', () => sheet === 'inv' ? closeSheet() : openSheet('inv'));
$('gearBtn').addEventListener('click', () => sheet === 'settings' ? closeSheet() : openSheet('settings'));
$('councilBtn').addEventListener('click', () => { if (G.council) openSheet('council'); });
$('chartBtn').addEventListener('click', () => { if (sheet) closeSheet(); $('mapBtn').click(); });
// HUD and toolbar icons are the same drawings as the menus
document.querySelectorAll('i.ic[data-ic]').forEach(el => { el.innerHTML = IC[el.dataset.ic] || ''; });
// P65: the crate in the toolbar has the black outline like the other three; the power buttons show the glossy pictures
document.querySelector('#bagBtn i.ic').innerHTML = IC.crate;
for (const [id, ic] of [['stopBtn', IC.anchor], ['rowBtn', IC.rower], ['volleyBtn', IC.rain], ['fireBtn', IC.flame], ['chainBtn', IC.chain], ['cataBtn', IC.catapult]]){ const b = $(id), old = b.querySelector('svg'); old.outerHTML = ic.replace(/id="(\w+)"/g, `id="${id}$1"`).replace(/url\(#(\w+)\)/g, `url(#${id}$1)`); } // (their own gradient names: a hidden button's gradients would blank out the same picture in the menus)
