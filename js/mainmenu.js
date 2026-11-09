// P65: the main menu: a grid of big tiles over the live sea. Three voyages side by side, each with its own ship, money and chart.
// Starting another voyage saves this one and restarts the page on that slot, so the whole world loads clean.
import {SHIPS} from './config.js?v=a41a65b';
import {G, SLOTS, readSlot, wipeSlot, setActiveSlot, save} from './state.js?v=a41a65b';
import {IC, shipImg, tabs} from './menus.js?v=a41a65b';
import {openSheet, toast, sizeUI} from './ui.js?v=a41a65b';
import {sfx} from './audio.js?v=a41a65b';
import {PUBLIC, APP} from './state.js?v=a41a65b';

const el = document.getElementById('mainMenu');
export const GO_KEY = 'wine-dark-sea-go';
let picked = 1, armed = false, onStart = null;
const time = s => s >= 3600 ? `${Math.floor(s/3600)} h ${Math.floor(s/60) % 60} min` : `${Math.max(1, Math.floor(s/60))} min`;

function slotTile(n){
  const o = readSlot(n), on = picked === n;
  if (!o) return `<button class="mtile vslot ${on ? 'on' : ''}" data-m="pick" data-n="${n}"><span class="mplus">+</span><b>Voyage ${n}</b><small>Empty</small></button>`;
  const sh = SHIPS[o.tier] || SHIPS[0];
  return `<button class="mtile vslot ${on ? 'on' : ''}" data-m="pick" data-n="${n}">${shipImg(sh.model, {...(o.look || {}), men:sh.men[0]})}<b>Voyage ${n}</b><small>${(o.names || {})[o.tier] || sh.name}</small><small class="mt2">${time(o.playSeconds || 0)}</small></button>`;
}
function render(){
  const o = readSlot(picked), sh = o && (SHIPS[o.tier] || SHIPS[0]);
  el.innerHTML = `<h1 class="mtitle">Wine-Dark Sea</h1><div class="mcard">
    <div class="mgrid three">${SLOTS.map(slotTile).join('')}</div>
    <button class="mplay" data-m="play">${o ? `<span>Set sail</span><small>Voyage ${picked} · ${(o.names || {})[o.tier] || sh.name} · ${o.gold || 0} drachmae</small>` : `<span>New voyage</span><small>A rowboat and the open sea</small>`}</button>
    <div class="mgrid four">
      <button class="mtile" data-m="settings">${IC.gear}<b>Settings</b></button>
      <button class="mtile" data-m="tut">${IC.book}<b>How to play</b></button>
      <button class="mtile" data-m="log" ${o && picked === G.slot ? '' : 'disabled'}>${IC.star}<b>Log</b></button>
      ${APP ? `<button class="mtile" data-m="ranks">${IC.ship}<b>Ranks</b></button>` : `<a class="mtile" href="${PUBLIC ? 'builds/' : 'showroom.html'}" target="_blank" rel="noopener">${IC.ship}<b>${PUBLIC ? 'Old builds' : 'Showroom'}</b></a>`}
    </div>
    ${o ? `<button class="merase" data-m="erase">${armed ? `Tap again to erase Voyage ${picked}` : `Erase Voyage ${picked}`}</button>` : ''}
  </div>`;
}
export function openMenu(start){
  if (start) onStart = start; G.menuOpen = true; G.noSave = true; G.joy = null; G.dest = null; picked = G.slot; armed = false;
  document.body.classList.add('menuon'); render(); el.hidden = false;
}
function closeMenu(){ G.menuOpen = false; G.noSave = false; document.body.classList.remove('menuon'); el.hidden = true; if (onStart) onStart(); save(); }
el.addEventListener('click', e => {
  const b = e.target.closest('[data-m]'); if (!b || b.disabled) return; const m = b.dataset.m; sfx('click');
  if (m !== 'erase') armed = false;
  if (m === 'pick'){ picked = +b.dataset.n; render(); }
  if (m === 'play'){
    if (picked === G.slot) return closeMenu();
    // another slot: this voyage is already saved (nothing changes while the menu is up), so start the page again on that one
    setActiveSlot(picked); try { localStorage.setItem(GO_KEY, '1'); } catch(_){} location.reload();
  }
  if (m === 'erase'){
    if (!armed){ armed = true; render(); return; }
    armed = false; wipeSlot(picked);
    if (picked === G.slot){ setActiveSlot(picked); location.reload(); return; } // the loaded voyage is gone: start clean, back on this menu
    toast('Voyage erased', 2); render();
  }
  if (m === 'ranks'){ el.hidden = true; tabs.fleet = 'ranks'; tabs.rec = null; openSheet('fleet'); }
  if (m === 'settings' || m === 'tut' || m === 'log'){ el.hidden = true; openSheet(m === 'tut' ? 'tut' : m === 'log' ? 'log' : 'settings'); }
});
// back from a menu page opened from here
document.addEventListener('sheetclosed', () => { if (G.menuOpen){ render(); el.hidden = false; } });
document.addEventListener('openmenu', () => { save(); openMenu(); });
