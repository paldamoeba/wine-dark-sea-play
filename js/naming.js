// P70: you name your ships. The rowboat when a voyage begins, and every ship you build, as soon as things are quiet.
// A box of its own over everything (not a menu page), so nothing redraws it while you type. There is no way around it: a ship needs a name.
import {SHIPS} from './config.js?v=733c6b7';
import {G, save, shipName} from './state.js?v=733c6b7';
import {IC, shipImg} from './menus.js?v=733c6b7';
import {owned} from './fleet.js?v=733c6b7';
import {combatState} from './combat.js?v=733c6b7';
import {sfx} from './audio.js?v=733c6b7';
import {HARBORS} from './world.js?v=733c6b7';

const SUGGEST = ['Kalypso', 'Thetis', 'Galene', 'Halkyon', 'Selene', 'Eos', 'Melite', 'Ariadne', 'Zephyros', 'Nerine', 'Psyche', 'Iris', 'Amphitrite', 'Leukothea', 'Phaia', 'Kymo', 'Doris', 'Paralos', 'Thalassa', 'Aura'];
const clean = v => v.normalize('NFC').replace(/[^\p{L}\p{N} '.-]/gu, '').replace(/\s+/g, ' ').slice(0, 18); // only letters, numbers and a little punctuation, so a name can go anywhere on screen
let box = null;
export const nameOpen = () => !!box;
export function askName(t, then, rename = false){
  if (box) return; const sh = SHIPS[t], S = G.S, wasSheet = G.sheetOpen; G.sheetOpen = true; G.dest = null; G.joy = null;
  const taken = Object.values(S.names || {}), free = SUGGEST.filter(n => !taken.includes(n)); let si = Math.floor(Math.random()*free.length);
  box = document.createElement('div'); box.className = 'namebox';
  box.innerHTML = `<div class="namecard"><div class="namepic">${shipImg(sh.model, {...((S.looks || {})[t] || {}), ...(t === S.tier ? S.look : {}), men:sh.men[0]})}</div>
    <h2>${rename ? 'A new name' : `Name your ${sh.name.toLowerCase()}`}</h2>${rename ? '' : `<p>${t === 0 ? 'Every voyage starts with a boat and a name.' : 'A new ship joins your fleet. What will she be called?'}</p>`}
    <input id="nameIn" maxlength="18" enterkeyhint="done" autocomplete="off" aria-label="Ship name" placeholder="${free[si] || 'Kalypso'}" value="${rename ? shipName(t) : ''}">
    <div class="namebtns"><button type="button" class="btn ghostdark" id="nameDice">Suggest one</button><button type="button" class="btn gold" id="nameOk">Done</button></div>${rename ? '<button type="button" class="namex" id="nameNo">Keep the old name</button>' : ''}</div>`;
  document.body.appendChild(box);
  const inp = box.querySelector('#nameIn'), ok = box.querySelector('#nameOk'), sync = () => { ok.disabled = !inp.value.trim(); }; sync();
  inp.addEventListener('input', () => { const c = clean(inp.value); if (c !== inp.value) inp.value = c; sync(); });
  // keys typed here belong to the name, not to the ship
  for (const ev of ['keydown', 'keyup']) inp.addEventListener(ev, e => e.stopPropagation());
  box.querySelector('#nameDice').addEventListener('click', () => { si = (si + 1) % Math.max(1, free.length); inp.value = free[si] || 'Kalypso'; sync(); sfx('click'); });
  const shut = () => { box.remove(); box = null; G.sheetOpen = wasSheet; };
  // P71: a plain button, not a form: the claude.ai page runs the game in a frame that silently blocks forms, so Done did nothing there
  const done = () => { const v = clean(inp.value).trim(); if (!v) return; S.names = {...(S.names || {}), [t]:v}; sfx('chime'); shut(); save(); if (then) then(v); };
  ok.addEventListener('click', done); inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); done(); } });
  const no = box.querySelector('#nameNo'); if (no) no.addEventListener('click', shut);
  setTimeout(() => { try { inp.focus(); } catch(_){} }, 60);
}
// Called every frame: any ship of yours without a name gets one as soon as you're not in the middle of something.
// P82 (Nicholas): only back at Kallisto, where the new ship waits, never out at sea in the middle of a fight
const quiet = () => !box && G.voyageOn && !G.menuOpen && (!G.sheetOpen || G.portOpen) && !G.mapOpen && !G.sinking && !!G.dock && G.dock.mode === 'moored' && G.dock.h === HARBORS[0];
export function checkNames(){
  if (!quiet()) return; const t = owned().find(t => !(G.S.names || {})[t]); if (t === undefined) return;
  if (window.__TEST && !__TEST.get('askname')){ G.S.names = {...(G.S.names || {}), [t]:'Test'}; return; }
  askName(t, () => { if (t !== G.S.tier) offerSail(t); });
}
// P82: a new ship is named, then you can go aboard her straight away (changing ships confused players)
function offerSail(t){
  const sh = SHIPS[t], wasSheet = G.sheetOpen; G.sheetOpen = true; box = document.createElement('div'); box.className = 'namebox';
  box.innerHTML = `<div class="namecard"><div class="namepic">${shipImg(sh.model, {...((G.S.looks || {})[t] || {}), men:sh.men[0]})}</div><h2>${shipName(t)} is ready</h2><p>She is moored here at Kallisto. You can change ships any time in Fleet.</p>
    <div class="namebtns"><button type="button" class="btn ghostdark" id="sailLater">Later</button><button type="button" class="btn gold" id="sailNow">Sail her now</button></div></div>`;
  document.body.appendChild(box);
  const shut = go => { box.remove(); box = null; G.sheetOpen = wasSheet; if (go) document.dispatchEvent(new CustomEvent('sailship', {detail:t})); };
  box.querySelector('#sailNow').addEventListener('click', () => shut(true)); box.querySelector('#sailLater').addEventListener('click', () => shut(false));
}
