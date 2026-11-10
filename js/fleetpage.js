// P70: the Fleet page: every ship you own and every ship you could own, with all there is to know about each.
// Open it from the toolbar anywhere; changing ship, captains and the shipwrights' work still happen at Kallisto. Also: pinning a ship.
import {SHIPS, PLANS, CAPTAIN, UPGRADES} from './config.js?v=805d5f0';
import {G, ship, lvl, shipName, capOf, CARRY} from './state.js?v=805d5f0';
import {IC, card, top, tabBar, tabs, shipImg, bar, chip, peg, yardAct, RENAME_COST} from './menus.js?v=805d5f0';
import {owned, cantSwitch, captainOf, clock, tripPay, captainCost, allCaptains} from './fleet.js?v=805d5f0';
import {men} from './crew.js?v=805d5f0';
import {SPECS, crewLayout} from './ships.js?v=805d5f0';
import {piecesOf, studied, allPieces} from './shipyard.js?v=805d5f0';
import {HARBORS} from './world.js?v=805d5f0';
import {planSources} from './combat.js?v=805d5f0';
import {ranksBody} from './records.js?v=805d5f0';
import {myLevel, shipLevel, siteLevel, standing, LEVEL_WORD} from './levels.js?v=805d5f0';

const PIN = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3 H15 L14.2 9.5 L18 13.5 V15 H13 L12 22 L11 15 H6 V13.5 L9.8 9.5Z" fill="#c4473b" stroke="#5a1e14" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
export const atHome = () => !!(G.dock && G.dock.mode === 'moored' && G.dock.h === HARBORS[0]);
const KING = 11;
const buildable = () => SHIPS.map((sh, t) => t).filter(t => PLANS[t]);
// real numbers for a ship: with its upgrades if it's yours, as it comes from the yard if it isn't
function numbers(t){ const b = SHIPS[t], u = ((G.S.ups || {})[t] || {}), m = men(t), c = crewLayout(SPECS[b.model], m);
  return {hull:Math.round(b.hull*(1 + UPGRADES.hull.each*(u.hull || 0))), speed:Math.round(b.speed*(1 + UPGRADES.oars.each*(u.oars || 0) + UPGRADES.sail.each*(u.sail || 0))), turn:b.turn*(1 + UPGRADES.helm.each*(u.helm || 0)), hold:b.hold, goods:Math.round(b.cap.goods*CARRY/2)*2, wood:Math.round(b.cap.wood*CARRY/2)*2, men:m, most:b.men[1], archers:c.archers || m, rowers:c.rowers, ups:Object.keys(UPGRADES).filter(k => UPGRADES[k].ship).reduce((n, k) => n + (u[k] || 0), 0)}; }
const TOP = {hull:900, speed:340, turn:2, hold:40, goods:110, men:56};
const row = (label, v, max, txt, cmp) => `<div class="fstat"><span>${label}</span>${bar(v/max)}<b>${txt}${cmp ? ` <i class="${cmp > 0 ? 'up' : 'down'}">${cmp > 0 ? '+' : ''}${cmp}</i>` : ''}</b></div>`;
function statRows(n, vs){ const d = (k, dp = 0) => vs ? +((n[k] - vs[k]).toFixed(dp)) : 0;
  return row('Hull', n.hull, TOP.hull, n.hull, d('hull')) + row('Speed', n.speed, TOP.speed, n.speed, d('speed')) + row('Turning', n.turn, TOP.turn, n.turn.toFixed(2), d('turn', 2))
    + row('Fish hold', n.hold, TOP.hold, n.hold, d('hold')) + row('Trade goods', n.goods, TOP.goods, n.goods, d('goods')) + row('Crew', n.men, TOP.men, `${n.men} of ${n.most}`, 0) + row('Archers', n.archers, 12, n.archers, d('archers')); }
// P83: Rename opens a choice under the ship: pay or watch a video.
function renameRow(t){ if (tabs.renamePick !== t) return ''; const ok = G.S.gold >= RENAME_COST;
  return `<div class="btnrow flagbuy"><b>A new name for ${shipName(t)}</b><button class="btn ${ok ? 'gold' : ''}" data-act="renamebuy" data-t="${t}" ${ok ? '' : 'disabled'}>Pay ${chip(IC.coin, RENAME_COST, ok)}</button><button class="btn ghostdark" data-act="renamevideo" data-t="${t}">${IC.play} Watch a video</button></div>`; }
const lvChip = (n, st) => `<span class="lvchip ${st || ''}">Level ${n}</span>`;

function mineCard(t){
  const S = G.S, sh = SHIPS[t], on = t === S.tier, n = numbers(t), c = captainOf(t), home = atHome();
  const look = {...((S.looks || {})[t] || {}), ...(on ? S.look : {}), ram:on ? lvl('ram') : undefined, men:men(t)};
  const hullNow = on ? Math.ceil(S.hull) : Math.ceil((S.hulls || {})[t] ?? n.hull);
  const where = on ? '<span class="tag on">You are sailing her</span>' : c && c.out ? `<span class="tag">At sea with ${c.n}</span>` : '<span class="tag">Moored at Kallisto</span>';
  const perHour = Math.round(tripPay(t)*3600/(CAPTAIN.tripSeconds + CAPTAIN.restSeconds));
  const cap = on ? '' : c ? `<div class="cap">${peg('#2f5f8a', true)}<div><b>${c.n}</b><small>${c.out ? `Out fishing · back in ${clock(c.t)}` : `In port · sails in ${clock(c.t)}`}<br>${tripPay(t)} drachmae a trip, about ${perHour} an hour</small></div></div>`
    : home && (G.S.idleCaps || []).length ? `<button class="btn ghostdark" data-act="capgive" data-t="${t}">Give her ${G.S.idleCaps[0]}</button>`
    : home ? `<button class="btn ghostdark" data-act="captain" data-t="${t}" ${S.gold >= captainCost() ? '' : 'disabled'}>Hire a captain ${chip(IC.coin, captainCost())}</button><small>A captain fishes with her and earns about ${perHour} drachmae an hour, even while the game is closed (up to 2 hours). Each one costs more than the last.</small>`
    : `<small>Back at Kallisto you can hire a captain to earn with her: about ${perHour} drachmae an hour.</small>`;
  const sw = on ? '' : home ? `<button class="btn" data-act="switch" data-t="${t}" ${cantSwitch(t) ? 'disabled' : ''}>${c && c.out ? 'She is at sea' : 'Sail her'}</button>${cantSwitch(t) && !(c && c.out) ? `<small>${cantSwitch(t)}</small>` : ''}` : '<small>You can change ships at Kallisto.</small>';
  return `<section class="card fcard ${on ? 'on' : ''}"><div class="fhead">${shipImg(sh.model, look)}<div class="fname"><h3>${shipName(t)}</h3><small>${sh.name}</small>${where}${lvChip(shipLevel(t))}<div class="fbtns"><button class="btn small ${tabs.renamePick === t ? 'on' : ''}" data-act="renamepick" data-t="${t}">Rename</button><button class="btn small" data-act="record" data-n="${G.slot}" data-t="${t}">Her record</button></div></div></div>${renameRow(t)}
    <p class="note">${sh.desc || 'Your first boat: slow, small and yours.'}</p>
    <div class="line"><div><b>Hull ${hullNow} of ${n.hull}</b>${bar(hullNow/n.hull, hullNow/n.hull < .35 ? 'low' : '')}</div></div>
    ${statRows(n)}
    <p class="note">${n.ups} ship upgrades · ${sh.storm ? 'Big waves wear her down' : 'Shrugs off big waves'}</p>${cap}${sw}</section>`;
}
// where the missing plan pieces of ship t are, easiest first, each with its level
export function sourceRows(t, max = 99){ const src = planSources(t).map(f => ({f, lv:siteLevel(f)})).sort((a, b) => a.lv - b.lv), shown = src.slice(0, max);
  const rows = shown.map(({f, lv}) => { const st = standing(lv); return `<div class="srcrow"><span>${f.named ? `<b>${f.named.name}</b>, off` : f.camp ? 'Bandit camp on' : f.owner === 'pirate' ? 'Pirate fortress on' : 'Fortress on'} ${f.named ? f.isle.name : `<b>${f.isle.name}</b>`}</span><span class="lvchip ${st}">Level ${lv}</span><small class="${st}">${LEVEL_WORD[st]}</small></div>`; }).join('');
  return rows + (src.length > shown.length ? `<p class="note">And ${src.length - shown.length} more. Any of them will do.</p>` : ''); }
function getCard(t){
  const S = G.S, sh = SHIPS[t], P = PLANS[t], n = numbers(t), got = piecesOf(t), pin = S.pin === t, done = allPieces(t) || studied(t);
    const act = atHome() ? `<div class="yard">${yardAct(t, sh)}</div>` : done ? '<small>Take the plans to the Kallisto shipwrights.</small>' : '';
  return `<section class="card fcard ${pin ? 'pinned' : ''}"><div class="fhead">${shipImg(sh.model, {bare:true})}<div class="fname"><h3>${sh.name}</h3>
      <small>Plans: ${got} of ${P.pieces}${studied(t) ? ' · studied' : ''}</small>${t === KING ? '' : `<button class="btn ${pin ? 'gold' : 'ghostdark'} small pinbtn" data-act="pin" data-t="${t}">${PIN}${pin ? 'Pinned' : 'Pin this ship'}</button>`}</div></div>
    <p class="note">${sh.desc}</p>
    <h4>Compared with your ${ship().name.toLowerCase()}</h4>${statRows(n, numbers(S.tier))}
    ${done ? '' : t === KING ? '<h4>Where the plans are</h4><p class="note">Only the pirate king has them. Beat Polycrates and they are yours.</p>' : `<h4>Where the plans are</h4>${sourceRows(t, 3)}`}${act}</section>`;
}
const need = t => t === KING ? 99 : allPieces(t) || studied(t) ? 0 : Math.min(50, ...planSources(t).map(siteLevel));
export function fleetBody(){
  const S = G.S, list = [['mine', 'Your ships', IC.ship], ['get', 'Ships to get', IC.map], ['ranks', 'Leaderboard', IC.star]];
  if (!list.some(([k]) => k === tabs.fleet)) tabs.fleet = 'mine';
  if (tabs.fleet === 'ranks') return `${tabBar(list, tabs.fleet, 'fleet')}${ranksBody()}`;
  tabs.rec = null;
  const mine = owned(), rest = buildable().filter(t => !mine.includes(t)), L = myLevel();
  const purse = S.purse ? (atHome() ? card("Captains' purse", `<div class="line">${IC.coin}<div><b>${S.purse} drachmae</b><small>What your captains brought back.</small></div><button class="btn gold" data-act="collect">Collect</button></div>`, 'donecard') : `<p class="note">${S.purse} drachmae wait for you at Kallisto.</p>`) : '';
  const head = `<div class="flevel"><span class="lvchip big">Level ${L}</span><p>How strong <b>${shipName()}</b> is, from her size, upgrades and your powers. Camps and fortresses have levels too.</p></div>`;
  const caps = allCaptains(), capCard = tabs.fleet === 'mine' && caps.length ? card('Your captains', caps.map(c => {
    const opts = [[-1, 'Resting at Kallisto'], ...owned().filter(t => t !== S.tier && (!captainOf(t) || captainOf(t).n === c.n)).map(t => [t, `Sails ${shipName(t)}`])];
    return `<div class="line capline">${peg('#2f5f8a', true)}<b>${c.n}</b>${atHome() ? `<select class="jobsel" data-set="captain" data-n="${c.n}" aria-label="Ship for ${c.n}">${opts.map(([t, l]) => `<option value="${t}" ${t === c.t ? 'selected' : ''}>${l}</option>`).join('')}</select>` : `<small>${c.t < 0 ? 'Resting at Kallisto' : `Sails ${shipName(c.t)}`}</small>`}</div>`; }).join('')
    + `<p class="note">${atHome() ? 'Choose the ship each captain takes out. A captain on the ship you sail yourself rests.' : 'Back at Kallisto you can choose which ship each captain takes out.'}</p>`) : '';
  const body = tabs.fleet === 'get' ? (rest.length ? rest.sort((a, b) => need(a) - need(b)).map(getCard).join('') : card('', '<p class="note">You own every ship there is.</p>')) : [...mine].sort((a, b) => (b === S.tier) - (a === S.tier)).map(mineCard).join('');
  return `${tabBar(list, tabs.fleet, 'fleet')}${head}${purse}${capCard}${body}`;
}
export const fleetHTML = () => `<div class="mtop">${top('Your fleet')}</div><div class="mbody">${fleetBody()}</div>`;
// The pinned ship, on the quest board
export function pinCard(){
  const S = G.S, t = S.pin; const go = '<button class="btn ghostdark small" data-act="openfleet">Fleet</button>';
  if (!t || !PLANS[t] || owned().includes(t)) return card('Pinned ship', `<div class="line">${PIN}<div><small>Pin the ship you want in your fleet, and the places that hold its plans show up here and on your chart.</small></div>${go}</div>`);
  const sh = SHIPS[t], got = piecesOf(t), P = PLANS[t], src = allPieces(t) || studied(t) ? '<p class="note">You have every piece. The Kallisto shipwrights can start.</p>' : sourceRows(t, 4);
  return card(`Pinned · ${sh.name}`, `<div class="fhead small">${shipImg(sh.model, {men:sh.men[0]})}<div class="fname"><b>Plans: ${got} of ${P.pieces}</b>${bar(got/P.pieces)}<small>You are level ${myLevel()}</small>${go}</div></div>${src}`, 'pinned');
}
