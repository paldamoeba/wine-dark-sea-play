// Screen UI: top bar, messages, zone banner, harbor and settings sheets.
import {SHIPS, FISH, TUNING, QUALITY, CREW, GOD_BLESSINGS, TIMBER} from './config.js';
import {ZONES, MAP, MAP_NAMES, ISLANDS, WORLD, CITIES, HARBORS, home} from './world.js';
import {G, ship, holdUsed, save, saveSettings, resetSave, revealAll} from './state.js';
import {applyQuality} from './scene.js';
import {swapBoat, refreshAllTrees} from './entities.js';
import {setZoom} from './input.js';
import {PAINTS, SAILS, GODS, SPECS} from './ships.js';
import {tutHTML} from './tutorial.js';
import {founded, blessing, seats, candidates} from './crew.js';
import {board, active, accept, decline, drop, deliver, canDeliver, progress, pillText, goal} from './quests.js';
import {REQUESTS, GOALS} from './config.js';

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

// Fish prices at a harbor: some markets pay more for some fish.
const priceAt = (h, k) => Math.round(FISH[k].price*((h && h.prices[k]) || 1)*(blessing().price || 1));
const catchValue = h => Object.keys(FISH).reduce((sum, k) => sum + (G.S.cargo[k] || 0)*priceAt(h, k), 0);
function render(){ sheetEl.innerHTML = sheet === 'port' ? portHTML() : sheet === 'tut' ? tutHTML(tutPage) : sheet === 'inv' ? invHTML() : sheet === 'jobs' ? jobsHTML() : settingsHTML(); }

// ---- inventory: what's in the hold, the warehouse, your ship, and how the two cities see you ----
const ICON = {
  fish: c => `<svg viewBox="0 0 32 32"><path d="M4 16 Q14 6 24 16 Q14 26 4 16Z M24 16 L30 10 L30 22Z" fill="${c}"/><circle cx="10" cy="14.5" r="1.6" fill="#22283a"/></svg>`,
  wood: `<svg viewBox="0 0 32 32"><rect x="4" y="11" width="22" height="10" rx="5" fill="#a3754a"/><ellipse cx="26" cy="16" rx="4" ry="5" fill="#d9b382"/><ellipse cx="26" cy="16" rx="1.6" ry="2" fill="#a3754a"/></svg>`,
  gold: `<svg viewBox="0 0 32 32"><ellipse cx="16" cy="20" rx="11" ry="5" fill="#b07f3c"/><ellipse cx="16" cy="17" rx="11" ry="5" fill="#e3ad48"/><ellipse cx="16" cy="13" rx="8" ry="3.6" fill="#f0c766"/></svg>`,
};
const FISH_COLOR = {sardine:'#9fb8c8', tuna:'#4f7fa3', swordfish:'#2f5f8a'};
function invHTML(){
  const S = G.S, sh = ship(), used = holdUsed(), row = (icon, name, sub, n, act) => `<div>${icon}</div><div>${name}<small>${sub}</small></div><span class="n">${n}</span>${act || '<span></span>'}`;
  const toss = k => S.cargo[k] ? `<button class="btn" data-act="toss" data-k="${k}">Throw 1</button>` : '';
  const items = [...Object.entries(FISH).map(([k, f]) => row(ICON.fish(FISH_COLOR[k] || '#4f7fa3'), f.label, `${f.price} gold each`, S.cargo[k] || 0, toss(k))),
    row(ICON.wood, 'Wood', 'Unloaded to the warehouse when you dock', S.cargo.wood || 0, toss('wood'))].join('');
  const held = c => ISLANDS.filter(i => i.city === c).length;
  const city = c => `<div class="row"><div>${CITIES[c].name}<small>${held(c)} islands</small></div><b style="color:${(G.hunted || {})[c] ? 'var(--danger)' : 'var(--olive)'}">${(G.hunted || {})[c] ? 'Hunting you' : 'Leaves you alone'}</b></div>`;
  const bl = S.bless || 0;
  return `
    <h1>Inventory</h1>
    <p class="sub">${sh.name} · Hold ${used} / ${sh.hold}</p>
    <div class="sec"><div class="bar2"><i style="width:${Math.min(100, used/sh.hold*100)}%"></i></div>
      <div class="inv">${row(ICON.gold, 'Gold', 'Spend it at Kallisto', S.gold)}${items}</div></div>
    <div class="sec"><h3>Kallisto warehouse</h3><div class="inv">${row(ICON.wood, 'Wood', 'For building ships', S.ware)}</div></div>
    <div class="sec"><h3>Your ship</h3>
      <div class="row"><div>${sh.name}<small>Speed ${sh.speed} · Crew who fight ${sh.fighters} · ${sh.storm ? 'Big waves wear it down in the Open Sea' : 'Shrugs off big waves'}</small></div><b>Hull ${Math.ceil(S.hull)} / ${sh.hull}</b></div>
      ${bl ? `<div class="row"><div>Poseidon's blessing<small>Faster sailing and quicker work</small></div><b>${Math.floor(bl/60)}:${String(Math.floor(bl % 60)).padStart(2, '0')}</b></div>` : ''}</div>
    <div class="sec"><div class="row"><div>Jobs and goals<small>${active().length ? `${active().length} job${active().length > 1 ? 's' : ''} taken` : 'No jobs taken'}${S.treasure ? ' · a treasure map' : ''}</small></div><button class="btn" data-act="jobs">See jobs</button></div></div>
    ${founded() ? `<div class="sec"><h3>${S.crewName}</h3><div class="row"><small>${(S.crew || []).map(c => `${c.n} (${CREW.jobs[c.job].label.toLowerCase()})`).join(', ') || 'No sailors hired yet'}${blessing().desc ? `<br>Blessing: ${blessing().desc}` : ''}</small></div></div>` : ''}
    <div class="sec"><h3>The war</h3>${city('athens')}${city('sparta')}
      <div class="row"><small>Raid a city's ships and only that city's navy comes after you, if they see it. Sink a warship whose island guard is gone, then stay near the island to raise the other city's flag.</small></div></div>
    <div class="foot"><span></span><button class="btn gold" data-act="close">Close</button></div>`;
}
// Your goal, the jobs you took from request boards, and any treasure map. Opened from the goal line or the bag.
const jobWhere = r => r.t === 'deliver' ? `Hand over in ${r.to} harbor` : r.t === 'visit' ? `Sail close to ${r.to}` : r.t === 'sink' ? 'Raider skiffs sail the Coastal Waters' : r.t === 'salvage' ? 'Wrecks are marked × on the chart' : r.t === 'wood' ? 'Stop beside cypress trees on any island' : 'Glinting water near islands, or bubbling water';
function jobsHTML(){
  const S = G.S, g = goal(), jobs = active(), tr = S.treasure;
  const prog = r => r.t === 'deliver' ? `${Math.min(r.n, S.cargo[r.kind] || 0)} of ${r.n} aboard` : r.n > 1 ? `${r.got} of ${r.n} done` : 'Not done yet';
  return `
    <h1>Jobs</h1>
    <p class="sub">You can take ${REQUESTS.max} jobs at a time from any harbor's request board.</p>
    ${g ? `<div class="sec"><h3>First voyage · goal ${(S.goal || 0) + 1} of ${GOALS.length}</h3><div class="row"><div>${g.text}<small>${g.n > 1 ? `${S.goalN || 0} of ${g.n} done · ` : ''}+${g.gold} gold</small></div></div></div>` : ''}
    <div class="sec"><h3>Your jobs · ${jobs.length} of ${REQUESTS.max}</h3>
      ${jobs.map((r, i) => `<div class="row"><div>${r.text}<small>For ${r.who} · ${prog(r)} · +${r.gold} gold<br>${jobWhere(r)}</small></div><button class="btn" data-act="drop" data-i="${i}">Drop</button></div>`).join('') || '<div class="row"><small>No jobs yet. Dock at any harbor and open its request board.</small></div>'}
      ${jobs.some(r => r.to) ? '<div class="row"><small>Islands your jobs send you to have a dashed red ring on the chart.</small></div>' : ''}</div>
    ${tr ? `<div class="sec"><h3>Treasure map</h3><div class="row"><div>${tr.land ? `Buried on a beach${tr.name ? ` of ${tr.name}` : ''}` : 'Floating out at sea'}<small>The red X on your chart. ${tr.land ? 'Sail up close to the beach to dig it out.' : 'Sail over it.'}</small></div></div></div>` : ''}
    <div class="foot"><span></span><button class="btn gold" data-act="close">Close</button></div>`;
}
// How to play: two pages, shown on a new game and from Settings.
let tutPage = 0;
export function openTutorial(){ tutPage = 0; hideHint(); openSheet('tut'); }

function portHTML(){
  const S = G.S, sh = ship(), h = G.dock ? G.dock.h : HARBORS[0], atHome = h.is.port, catchVal = catchValue(h);
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
    <div class="foot top"><button class="btn" data-act="close">Close</button><button class="btn gold" data-act="sail">Set sail</button></div>
    <h1>${h.is.name} Harbor</h1>
    <p class="sub">${atHome ? `Your ship: ${sh.name} · Warehouse: ${S.ware} wood` : `Flies the flag of ${CITIES[h.is.city].name} · Your ship: ${sh.name}`}</p>
    <div class="sec"><h3>Fish market</h3>
      <div class="row">${Object.entries(FISH).map(([k, f]) => `<div>${f.label} × ${S.cargo[k] || 0}<small>${priceAt(h, k)} gold each${priceAt(h, k) > f.price ? ' ★' : ''}</small></div>`).join('')}
      <button class="btn gold" data-act="sell" ${catchVal ? '' : 'disabled'}>Sell +${catchVal}</button></div></div>
    ${timberHTML(h)}
    ${boardHTML(h)}
    <div class="sec"><h3>Dry dock</h3>
      <div class="row"><div>Hull ${Math.ceil(S.hull)} / ${sh.hull}<small>1 gold patches ${TUNING.repairPerGold} hull</small></div>
      <button class="btn" data-act="repair" ${dmg > 0 && S.gold > 0 ? '' : 'disabled'}>${dmg > 0 ? 'Repair ' + Math.min(repairCost, S.gold) + 'g' : 'Hull is sound'}</button></div></div>
    ${atHome ? `<div class="sec"><h3>Shipwright</h3>${yard}</div>${crewHTML()}${lookHTML()}` : `${founded() && (S.crew || []).length ? crewJobsHTML() : ''}<div class="row"><small>★ This market pays more for it. Ships are built at Kallisto, and wood is unloaded there.</small></div>`}`;
}

// The timber merchant: turn gold into wood. At home it goes straight to the warehouse; elsewhere it fills your hold.
const woodPrice = h => TIMBER.at[h.is.name] || TIMBER.price;
function woodRoom(h){ return h.is.port ? Infinity : Math.max(0, ship().hold - holdUsed()); }
function timberHTML(h){
  const S = G.S, p = woodPrice(h), room = woodRoom(h), can = n => Math.min(n, room, Math.floor(S.gold/p));
  const fill = h.is.port ? 0 : can(Infinity), btn = (n, label) => `<button class="btn ${label ? 'gold' : ''}" data-act="buywood" data-n="${n}" ${n > 0 && can(n) >= n ? '' : 'disabled'}>${label || 'Buy ' + n}</button>`;
  return `<div class="sec"><h3>Timber merchant</h3>
    <div class="row"><div>Wood · ${p} gold each${p < TIMBER.price ? ' ★' : ''}<small>${h.is.port ? 'Goes straight to your warehouse' : `Rides in your hold to Kallisto · room for ${room}`}</small></div></div>
    <div class="row"><span></span><div class="btns">${btn(1)}${btn(5)}${h.is.port ? btn(10) : fill > 5 ? btn(fill, `Fill hold ${fill * p}g`) : ''}</div></div></div>`;
}
// The request board: jobs on offer (take up to REQUESTS.max), and deliveries you can hand over here.
function boardHTML(h){
  const mine = active(), full = mine.length >= REQUESTS.max;
  const del = mine.map((r, i) => canDeliver(r, h) ? `<div class="row"><div>${r.text}<small>${r.who} · +${r.gold} gold</small></div><button class="btn gold" data-act="deliver" data-i="${i}">Deliver</button></div>` : '').join('');
  const offers = board().map((r, i) => `<div class="row"><div>${r.text}<small>${r.who} · +${r.gold} gold</small></div>
    <span class="btns"><button class="btn" data-act="decline" data-i="${i}" aria-label="Turn down">✕</button><button class="btn gold" data-act="accept" data-i="${i}" ${full ? 'disabled' : ''}>Take</button></span></div>`).join('');
  return `<div class="sec"><h3>Request board · ${mine.length} / ${REQUESTS.max} jobs taken</h3>${del}${offers}
    ${full ? '<div class="row"><small>You have as many jobs as you can carry. Finish one first, or drop one in your bag.</small></div>' : ''}</div>`;
}

// Your crew: found it (name + god's flag) once you own a second ship, then hire sailors into the free seats.
// Before you sail, put each sailor where you need them: more bows for a fight, more oars for a long trip.
const jobSelect = (c, i) => `<select class="jobsel" data-crew="${i}" aria-label="${c.n}'s job">${Object.entries(CREW.jobs).map(([k, j]) => `<option value="${k}" ${k === c.job ? 'selected' : ''}>${j.label}</option>`).join('')}</select>`;
function crewJobsHTML(){
  return `<div class="sec"><h3>Your sailors' jobs</h3><div class="row"><small>Change jobs here before you set sail. When you stop to fish, everyone aboard helps.</small></div>
    ${G.S.crew.map((c, i) => `<div class="row"><div>${c.n}<small>${CREW.jobs[c.job].desc}</small></div>${jobSelect(c, i)}</div>`).join('')}</div>`;
}
function crewHTML(){
  const S = G.S, jobs = CREW.jobs;
  if (S.tier < 1) return `<div class="sec"><h3>Your crew</h3><div class="row"><small>With your second ship you can found your own crew, fly a god's flag and hire sailors.</small></div></div>`;
  const gods = Object.entries(GOD_BLESSINGS).map(([k, b]) => `<option value="${k}">${GODS[k].name}: ${b.desc}</option>`).join('');
  if (!founded()) return `<div class="sec"><h3>Found your crew</h3>
    <div class="row"><small>Name your crew and choose a god. Their flag flies on your ship and brings a blessing.</small></div>
    <div class="looks one"><label><span>Crew name</span><input id="crewName" maxlength="24" placeholder="The Sea Swallows"></label>
      <label><span>God</span><select id="crewGod">${gods}</select></label></div>
    <div class="row"><small>Costs ${CREW.foundCost} gold</small><button class="btn gold" data-act="found" ${S.gold >= CREW.foundCost ? '' : 'disabled'}>Found</button></div></div>`;
  const b = blessing(), list = S.crew || [], free = seats() - list.length;
  const mine = list.map((c, i) => `<div class="row"><div>${c.n}<small>${jobs[c.job].desc}</small></div>${jobSelect(c, i)}<button class="btn" data-act="letgo" data-i="${i}">Let go</button></div>`).join('');
  const offers = free > 0 ? candidates().map((c, i) => `<div class="row"><div>${c.n}<small>${jobs[c.job].label}: ${jobs[c.job].desc}</small></div><button class="btn gold" data-act="hire" data-i="${i}" ${S.gold >= CREW.hireCost ? '' : 'disabled'}>Hire ${CREW.hireCost}g</button></div>`).join('')
    : '<div class="row"><small>Every seat is taken. A bigger ship has more seats.</small></div>';
  return `<div class="sec"><h3>${S.crewName} · ${list.length} / ${seats()} sailors</h3>
    <div class="row"><small>Flag of ${GODS[S.look.flag] ? GODS[S.look.flag].name : 'none'}${b.desc ? ': ' + b.desc : ''}. Change it under Paint and flags.</small></div>
    ${mine}${free > 0 ? '<h3>Waiting on the pier</h3>' : ''}${offers}</div>`;
}

// Paint, sail and flag for the current ship. Free for now; prices come with the progression design.
function lookHTML(){
  const spec = SPECS[ship().model], lk = {...spec.look, ...G.S.look};
  const opts = (obj, sel) => Object.entries(obj).filter(([, v]) => !v.city).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v.name}</option>`).join('');
  return `<div class="sec"><h3>Paint and flags</h3>
    <div class="looks">
      <label><span>Hull paint</span><select id="lookPaint" data-look="paint">${opts(PAINTS, lk.paint)}</select></label>
      <label><span>Sail</span>${spec.mast ? `<select id="lookSail" data-look="sail">${opts(SAILS, lk.sail)}</select>` : '<select disabled><option>Needs a mast</option></select>'}</label>
      <label><span>Flag</span>${founded() ? `<select id="lookFlag" data-look="flag">${opts(GODS, lk.flag)}</select>` : '<select disabled><option>Found a crew first</option></select>'}</label>
    </div></div>`;
}

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
    <div class="foot"><span class="ver">Prototype 16</span><button class="btn gold" data-act="close">Back to sea</button></div>`;
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
  if (a === 'buywood'){ const h = G.dock ? G.dock.h : HARBORS[0], n = Math.min(+b.dataset.n, woodRoom(h), Math.floor(S.gold/woodPrice(h)));
    if (n > 0){ S.gold -= n*woodPrice(h); if (h.is.port) S.ware += n; else S.cargo.wood += n; toast(`Bought ${n} wood${h.is.port ? ' for the warehouse' : ''}`, 2); } }
  if (a === 'sell'){ const g = catchValue(G.dock ? G.dock.h : HARBORS[0]); S.gold += g; for (const k in FISH) S.cargo[k] = 0; toast(`Sold the catch for ${g} gold`); progress('sell'); }
  if (a === 'repair'){ const cost = Math.min(Math.ceil((sh.hull - S.hull)/TUNING.repairPerGold), S.gold); S.gold -= cost; S.hull = Math.min(sh.hull, S.hull + cost*TUNING.repairPerGold); }
  if (a === 'build'){ const n = SHIPS[S.tier+1]; S.ware -= n.cost.wood; S.gold -= n.cost.gold; S.tier++; progress('build'); S.hull = n.hull; S.look = {flag:S.look.flag}; swapBoat(); toast(`Your ${n.name} is ready`); }
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
  if (a === 'jobs'){ openSheet('jobs'); return; }
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
$('goalPill').addEventListener('click', () => sheet === 'jobs' ? closeSheet() : openSheet('jobs'));
$('bagBtn').addEventListener('click', () => sheet === 'inv' ? closeSheet() : openSheet('inv'));
$('gearBtn').addEventListener('click', () => sheet === 'settings' ? closeSheet() : openSheet('settings'));
