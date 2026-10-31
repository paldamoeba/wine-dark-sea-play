// Fortress waters: when you come near a hostile fortress (a pirate one, or a city's that is after you), a warning shows once
// as you cross into its waters, and a mission bar at the top of the screen counts what's left: its walls and its guard ships.
import {G} from './state.js?v=5a6bfb2';
import {FORTS} from './config.js?v=5a6bfb2';
import {CITIES} from './world.js?v=5a6bfb2';
import {enemies, hostile} from './combat.js?v=5a6bfb2';
import {sfx} from './audio.js?v=5a6bfb2';

const WARN = FORTS.stoneRange + 450; // the warning comes a little before the catapults can reach you
const $ = id => document.getElementById(id);
let inside = null, cautionT = 0, last = '';
const shipIc = sunk => `<svg viewBox="0 0 24 16" class="${sunk ? 'sunk' : ''}" aria-hidden="true"><path d="M2 8 H22 L19 13.5 Q12 15.5 5 13.5Z" fill="${sunk ? '#9b8f80' : '#3a2e2a'}"/><path d="M12 1 V8" stroke="#3a2e2a" stroke-width="1.6"/><path d="M12.5 1.5 L18 6.5 H12.5Z" fill="${sunk ? '#cfc4b0' : '#c4473b'}"/>${sunk ? '<path d="M4 2 L20 15 M20 2 L4 15" stroke="#c4473b" stroke-width="2.2" stroke-linecap="round"/>' : ''}</svg>`;
export function updateFortWatch(dt){
  let best = null, bd = WARN;
  if (!G.dock && !G.sheetOpen && !G.mapOpen) for (const f of enemies){ if (!f.fort) continue;
    // a standing hostile fort, or a fallen pirate fort whose guards still sail
    const live = !f.dead && hostile(f), siege = f.dead && f.owner === 'pirate' && f.guards.some(g => !g.dead); if (!live && !siege) continue;
    const d = Math.hypot(f.x - G.S.x, f.y - G.S.y) - (f.camp ? WARN - 900 : 0); if (d < bd){ bd = d; best = f; } } // camps have no catapults: the warning comes closer
  if (best && best !== inside && !best.dead){ // just sailed into its waters
    const who = best.city ? CITIES[best.city].name : 'Pirate';
    if (best.camp) $('cautionText').innerHTML = `<b>Caution: bandits</b>The ${best.isle.name} bandit camp and its mothership will shoot at you, even in the Shallows.${best.camp.plans ? ' It holds ship plans.' : ''}`; else
    $('cautionText').innerHTML = `<b>Caution: ${who === 'Pirate' ? 'pirate' : who + "'s"} waters</b>Sail closer to the ${best.isle.name} fortress and its catapults and guard ships will attack you.`;
    $('caution').hidden = false; cautionT = 5; sfx('warn');
  }
  inside = best;
  if (cautionT > 0 && (cautionT -= dt) <= 0) $('caution').hidden = true;
  const m = $('mission');
  if (!best){ if (!m.hidden) m.hidden = true; last = ''; return; }
  const f = best, sunk = f.guards.filter(g => g.dead).length, n = f.guards.length, wall = f.dead ? 0 : Math.max(0, f.hull/f.spec.hull);
  const key = f.isle.name + sunk + Math.round(wall*20) + f.dead;
  if (key !== last){ last = key;
    m.innerHTML = `<b class="mt">${f.camp ? 'Bandit camp' : (f.city ? CITIES[f.city].name + "'s" : 'Pirate') + ' fortress'} · ${f.isle.name}</b>
      <div class="mrow"><span>${f.camp ? 'Palisade' : 'Walls'}</span>${f.dead ? `<em class="done">${f.camp ? 'Burnt' : 'Fallen'}</em>` : `<div class="mbar"><i style="width:${wall*100}%"></i></div>`}</div>
      <div class="mrow"><span>${f.camp ? 'Mothership' : 'Guard ships'}</span><span class="mships">${f.guards.map(g => shipIc(g.dead)).join('')}</span><em>${sunk} of ${n} sunk</em></div>`; }
  m.hidden = false;
}
