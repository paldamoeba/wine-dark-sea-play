// P73: every ship keeps her own record (S.shipStats[tier], written by stat() in state.js). This page ranks all your ships,
// from all three voyages, and shows what one ship has done. Only this device's saves: there is no server behind it.
import {SHIPS, NAMED} from './config.js?v=19e7728';
import {G, SLOTS, readSlot} from './state.js?v=19e7728';
import {IC, card, shipImg, tabs} from './menus.js?v=19e7728';
import {hasOnline, me, state as net, load as netLoad, setShips, push as netPush} from './online.js?v=19e7728';

const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const n = v => Math.floor(v || 0).toLocaleString();
const clock = s => { s = s || 0; return s >= 3600 ? `${Math.floor(s/3600)} h ${Math.floor(s/60) % 60} min` : `${Math.floor(s/60)} min`; };
const KING = 'Polycrates';

// things a ship can earn. Each one is worked out from her numbers, so nothing extra is saved.
const DEEDS = [
  ['First prize', 'Sink a ship', r => r.sunk >= 1, () => IC.swords],
  ['Pirate hunter', 'Sink 25 pirates', r => r.pirates >= 25, () => IC.flame],
  ['Terror of the Aegean', 'Sink 100 ships', r => r.sunk >= 100, () => IC.swords],
  ['War at sea', 'Sink 25 army ships', r => r.navy >= 25, () => IC.crew],
  ['Sea raider', 'Raid 25 merchants', r => r.merchants >= 25, () => IC.hold],
  ['Wall breaker', 'Take a fortress', r => r.forts >= 1, () => IC.catapult],
  ['Taker of cities', 'Take 10 fortresses', r => r.forts >= 10, () => IC.catapult],
  ['Camp burner', 'Burn 5 bandit camps', r => r.camps >= 5, () => IC.jobs],
  ['Full nets', 'Catch 200 fish', r => r.fish >= 200, () => IC.fish()],
  ['Treasure hunter', 'Dig up 5 treasures', r => r.treasure >= 5, () => IC.map],
  ['Blessed', 'Earn a whale blessing', r => r.whales >= 1, () => IC.bless],
  ['Far sailor', 'Sail 10,000 stadia', r => r.dist >= 10000, () => IC.world],
  ['Rich haul', 'Earn 10,000 drachmae', r => r.earned >= 10000, () => IC.coin],
  ['Never sunk', 'Sail one hour without sinking', r => r.time >= 3600 && !r.sunkMe, () => IC.hull],
  ['Touched by the gods', 'Sail through 5 gods\' fires', r => r.omens >= 5, () => IC.bless],
  ['Bronze of Rhodes', 'Win the Bronze games', r => (r.deeds || []).includes('Bronze of Rhodes'), () => IC.star],
  ['Silver of Rhodes', 'Win the Silver games', r => (r.deeds || []).includes('Silver of Rhodes'), () => IC.star],
  ['Champion of Rhodes', 'Win the Gold games', r => (r.deeds || []).includes('Champion of Rhodes'), () => IC.star],
];
const beat = (r, name) => (r.deeds || []).includes(name);
const deedCount = r => DEEDS.filter(d => d[2](r)).length + NAMED.filter(p => beat(r, p.name)).length + (beat(r, KING) ? 1 : 0);

export const RANKS = [['sunk', 'Ships sunk'], ['pirates', 'Pirates sunk'], ['navy', 'Army ships sunk'], ['merchants', 'Merchants raided'], ['forts', 'Fortresses taken'], ['camps', 'Camps burned'],
  ['deeds', 'Deeds earned'], ['earned', 'Drachmae earned'], ['fish', 'Fish caught'], ['treasure', 'Treasures dug up'], ['dist', 'Stadia sailed'], ['time', 'Time at sea']];
const valueOf = (e, k) => k === 'deeds' ? deedCount(e.rec) : e.rec[k] || 0;
const show = (v, k) => k === 'time' ? clock(v) : n(v);

// every ship of every voyage on this device; the voyage being played uses the live save
function allShips(){ const list = [];
  for (const slot of SLOTS){ const o = slot === G.slot ? G.S : readSlot(slot); if (!o) continue;
    for (const t of o.owned || Array.from({length:(o.tier || 0) + 1}, (_, i) => i)){ const sh = SHIPS[t]; if (!sh) continue;
      list.push({slot, t, sh, name:(o.names || {})[t] || sh.name, rec:(o.shipStats || {})[t] || {}, on:slot === G.slot && t === o.tier, look:{...((o.looks || {})[t] || {}), ...(t === o.tier ? o.look : {})}, old:!!o.oldLog}); } }
  return list; }
const ranked = (list, k) => [...list].sort((a, b) => valueOf(b, k) - valueOf(a, k) || b.on - a.on);
const picOf = e => shipImg(e.sh.model, {...e.look, men:e.sh.men[0]});
const place = i => ['1st', '2nd', '3rd'][i] || `${i + 1}th`;

// ---- online ----
const sendKey = k => k === 'deeds' ? 'deedN' : k;
setShips(() => allShips().filter(e => (e.rec.time || 0) > 30).map(e => { const {deeds, ...nums} = e.rec; return {slot:e.slot, t:e.t, name:e.name, paint:e.look.paint, sail:e.look.sail, rec:{...nums, deeds:deeds || [], deedN:deedCount(e.rec)}}; }));
const netShip = r => { const sh = SHIPS[r.t] || SHIPS[0]; return {online:true, id:`${r.who}-${r.slot}-${r.t}`, slot:r.slot, t:r.t, sh, name:r.name, rec:r.rec, on:r.who === me().who, look:{...(r.paint ? {paint:r.paint} : {}), ...(r.sail ? {sail:r.sail} : {})}}; };
const netRows = () => (net.rows || []).map(netShip);
// P82 (Nicholas): no dropdowns here. Like the high score tables of older games: two tabs (the world, or just you), the board's
// name big between two arrows that flip to the next board, dots for how many boards there are, and a table of names and scores.
const RK_IC = {sunk:() => IC.swords, pirates:() => IC.flame, navy:() => IC.crew, merchants:() => IC.hold, forts:() => IC.catapult, camps:() => IC.jobs, deeds:() => IC.star, earned:() => IC.coin, fish:() => IC.fish(), treasure:() => IC.map, dist:() => IC.world, time:() => IC.ship};
const whereBox = cur => hasOnline() ? `<div class="rkseg" role="tablist">${[['online', 'Everyone'], ['mine', 'My ships']].map(([v, l]) => `<button role="tab" aria-selected="${v === cur}" class="${v === cur ? 'on' : ''}" data-act="rkwhere" data-v="${v}">${l}</button>`).join('')}</div>` : '';
const rankBox = k => { const i = RANKS.findIndex(r => r[0] === k);
  return `<div class="rkcat"><button class="rkarrow" data-act="rkcat" data-d="-1" aria-label="Previous board">‹</button><div class="rktitle">${(RK_IC[k] || RK_IC.sunk)()}<b>${RANKS[i][1]}</b></div><button class="rkarrow" data-act="rkcat" data-d="1" aria-label="Next board">›</button></div>
    <div class="rkdots" aria-hidden="true">${RANKS.map((r, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div><div class="rkcols"><span>Rank</span><span>Ship</span><span>Score</span></div>`; };
function onlineHTML(k){ const key = sendKey(k), m = me();
  if (net.by !== key && !net.loading) setTimeout(() => netLoad(key)); 
  const row = (e, i, v) => `<button class="rkrow ${e.on ? 'on' : ''}" data-act="record" data-o="${esc(e.id)}"><span class="rkpos ${i < 3 ? 'p' + (i + 1) : ''}">${i + 1}</span>${picOf(e)}<span class="rkname"><b>${esc(e.name)}</b><small>${e.sh.name}${e.on ? ' · You' : ''}</small></span><b class="rkval">${show(v, k)}</b></button>`;
  const value = e => k === 'deeds' ? e.rec.deedN || 0 : e.rec[k] || 0, rows = netRows();
  const body = net.failed ? `<p class="note">The online board can't be reached right now.</p><button class="btn ghostdark" data-act="onlineretry">Try again</button>`
    : net.loading && !net.rows ? '<p class="note">Loading the board...</p>'
    : rows.length ? `<div class="rklist">${rows.map((e, i) => row(e, i, value(e))).join('')}</div>` : '<p class="note">Nobody is on this board yet. Yours could be the first ship.</p>';
  const mine = net.mine && !rows.some(e => e.on) ? `<h4 class="rkhead">Your best ship</h4><div class="rklist">${(() => { const e = netShip(net.mine); return row(e, net.mine.rank - 1, value(e)); })()}</div>` : '';
  const foot = m.off ? `<div class="rkjoin"><p class="note">Your ships are off the board.</p><button class="btn ghostdark" data-act="onlineback">Put my ships back</button></div>`
    : `<p class="note">Every ship is counted automatically. Ship names, types, colors and numbers are public.</p><button class="linkbtn" data-act="onlineleave">Take my ships off</button>`;
  return `<section class="card">${whereBox('online')}${rankBox(k)}${body}${mine}${foot}<p class="note">${net.total ? `${net.total.toLocaleString()} ships on the board. Top 25 shown.` : ''}</p></section>`; }
function boardHTML(){
  const k0 = RANKS.some(r => r[0] === tabs.rankBy) ? tabs.rankBy : (tabs.rankBy = 'sunk');
  if (hasOnline() && (tabs.rankWhere || 'online') === 'online') return onlineHTML(k0); // the world's board first
  const list = allShips(), k = k0, many = new Set(list.map(e => e.slot)).size > 1;
  const rows = ranked(list, k).map((e, i) => { const v = valueOf(e, k);
    return `<button class="rkrow ${e.on ? 'on' : ''}" data-act="record" data-n="${e.slot}" data-t="${e.t}"><span class="rkpos ${v && i < 3 ? 'p' + (i + 1) : ''}">${v ? i + 1 : '-'}</span>${picOf(e)}<span class="rkname"><b>${esc(e.name)}</b><small>${e.sh.name}${many ? ` · Voyage ${e.slot}` : ''}</small></span><b class="rkval">${show(v, k)}</b></button>`; }).join('');
  return `<section class="card">${whereBox('mine')}${rankBox(k)}
    <div class="rklist">${rows}</div><p class="note">Tap a ship to see what she has done.${list.some(e => e.old) ? ' Ships began keeping their own records in this update. Older totals stay in the Voyage log.' : ''}</p></section>`;
}
function recordHTML(ref){
  const list = ref.o ? netRows().concat(net.mine ? [netShip(net.mine)] : []) : allShips(), e = list.find(x => ref.o ? x.id === ref.o : x.slot === ref.slot && x.t === ref.t); if (!e){ tabs.rec = null; return boardHTML(); }
  const r = e.rec, tile = (ic, v, label) => `<div class="stat">${ic}<b>${v}</b><small>${label}</small></div>`;
  const medals = e.online ? '' : RANKS.map(([k, l]) => { const rk = ranked(list, k), i = rk.indexOf(e); return valueOf(e, k) > 0 && i < 3 && list.length > 1 ? `<span class="rkmedal p${i + 1}">${place(i)} · ${l}</span>` : ''; }).join('');
  const deed = (on, ic, name, how) => `<div class="deed ${on ? 'on' : ''}">${ic}<b>${esc(name)}</b><small>${esc(how)}</small></div>`;
  const deeds = DEEDS.map(d => [d[2](r), d[3](), d[0], d[1]]).concat(NAMED.map(p => [beat(r, p.name), IC.flame, p.name, 'Sink this named pirate']), [[beat(r, KING), IC.star, 'Bane of the king', 'Beat Polycrates']]).sort((a, b) => b[0] - a[0]);
  return `<button class="btn ghostdark small rkback" data-act="recback">All ships</button>
    <section class="card fcard"><div class="fhead">${picOf(e)}<div class="fname"><h3>${esc(e.name)}</h3><small>${e.sh.name}${!e.online && new Set(list.map(x => x.slot)).size > 1 ? ` · Voyage ${e.slot}` : ''}</small></div></div>${medals ? `<div class="rkmedals">${medals}</div>` : ''}</section>
    ${card(`Deeds · ${deedCount(r)} of ${DEEDS.length + NAMED.length + 1}`, `<div class="deedgrid">${deeds.map(d => deed(...d)).join('')}</div>`)}
    ${card('Her voyages', `<div class="statgrid">${tile(IC.ship, clock(r.time), 'at sea')}${tile(IC.world, n(r.dist), 'stadia sailed')}${tile(IC.coin, n(r.earned), 'drachmae earned')}</div>`)}
    ${card('Battles', `<div class="statgrid">${tile(IC.swords, n(r.sunk), 'ships sunk')}${tile(IC.flame, n(r.pirates), 'pirates sunk')}${tile(IC.crew, n(r.navy), 'army ships sunk')}${tile(IC.hold, n(r.merchants), 'merchants raided')}${tile(IC.catapult, n(r.forts), 'fortresses taken')}${tile(IC.jobs, n(r.camps), 'camps burned')}${tile(IC.hull, n(r.sunkMe), 'times she sank')}</div>`)}
    ${card('Finds', `<div class="statgrid">${tile(IC.fish(), n(r.fish), 'fish caught')}${tile(IC.wood, n(r.wood), 'wood gathered')}${tile(IC.iron, n(r.iron), 'iron dug up')}${tile(IC.map, n(r.treasure), 'treasures dug up')}${tile(IC.letter, n(r.bottles), 'bottles opened')}${tile(IC.bless, n(r.whales), 'whale blessings')}${tile(IC.chain, n(r.kraken), 'kraken seen')}</div>`)}`;
}
export const ranksBody = () => tabs.rec ? recordHTML(tabs.rec) : boardHTML();
export {netPush, netLoad};
