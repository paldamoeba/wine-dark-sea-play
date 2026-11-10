// Fortress waters: when you come near a hostile fortress (a pirate one, or a city's that is after you), a warning shows once
// as you cross into its waters, and a mission bar at the top of the screen counts what's left: its walls and its guard ships.
import {G} from './state.js?v=b709147';
import {FORTS} from './config.js?v=b709147';
import {CITIES} from './world.js?v=b709147';
import {enemies, hostile, planReward, towersUp, campLeft} from './combat.js?v=b709147';
import {SHIPS, PLANS} from './config.js?v=b709147';
import {sfx} from './audio.js?v=b709147';
import {siteLevel, myLevel, standing} from './levels.js?v=b709147';

const WARN = FORTS.stoneRange + 450; // the warning comes a little before the catapults can reach you
const $ = id => document.getElementById(id);
let inside = null, cautionT = 0, last = '';
const shipIc = sunk => `<svg viewBox="0 0 24 16" class="${sunk ? 'sunk' : ''}" aria-hidden="true"><path d="M2 8 H22 L19 13.5 Q12 15.5 5 13.5Z" fill="${sunk ? '#9b8f80' : '#3a2e2a'}"/><path d="M12 1 V8" stroke="#3a2e2a" stroke-width="1.6"/><path d="M12.5 1.5 L18 6.5 H12.5Z" fill="${sunk ? '#cfc4b0' : '#c4473b'}"/>${sunk ? '<path d="M4 2 L20 15 M20 2 L4 15" stroke="#c4473b" stroke-width="2.2" stroke-linecap="round"/>' : ''}</svg>`;
// P82: a little tower for each of the fortress's four towers, crossed out when it has fallen
const towerIc = down => `<svg viewBox="0 0 14 16" class="${down ? 'sunk' : ''}" aria-hidden="true"><path d="M2 15 L3 5 H1 V1 H4 V3 H6 V1 H8 V3 H10 V1 H13 V5 H11 L12 15Z" fill="${down ? '#9b8f80' : '#3a2e2a'}"/>${down ? '<path d="M1 2 L13 15 M13 2 L1 15" stroke="#c4473b" stroke-width="2" stroke-linecap="round"/>' : ''}</svg>`;
export function updateFortWatch(dt){
  let best = null, bd = WARN;
  if (!G.dock && !G.sheetOpen && !G.mapOpen) for (const f of enemies){ if (!f.fort && !f.named) continue;
    // a standing hostile fort, or a fallen pirate fort whose guards still sail
    const live = !f.dead && hostile(f), siege = f.dead && f.owner === 'pirate' && f.guards.some(g => !g.dead); if (!live && !siege) continue;
    const d = Math.hypot(f.x - G.S.x, f.y - G.S.y) - (f.camp || f.named ? WARN - 900 : 0); if (d < bd){ bd = d; best = f; } } // camps have no catapults: the warning comes closer
  if (best && best !== inside && !best.dead && !best.named){ // just sailed into its waters (P72: a named pirate has no message: its name is over the ship and it shows under the map)
    // P82 (Nicholas): no card in the middle of the screen any more. The bar under the map turns red and pulses, with the warning sound
    cautionT = 5; sfx('warn'); last = '';
  }
  inside = best;
  if (cautionT > 0) cautionT -= dt;
  $('mission').classList.toggle('alert', cautionT > 0 && !!best);
  const m = $('mission');
  if (!best){ if (!m.hidden) m.hidden = true; last = ''; return; }
  const f = best, sunk = f.guards.filter(g => g.dead).length, n = f.guards.length, wall = f.dead ? 0 : Math.max(0, f.hull/f.spec.hull);
  const prize = planReward(f), tw = f.towers && !f.camp ? f.towers.map(t => t.hp > 0 ? 1 : 0).join('') : '', key = (f.named ? f.named.name : f.isle.name) + sunk + Math.round(wall*20) + f.dead + prize + myLevel() + tw;
  if (key !== last){ last = key;
    // P60: one short line: name, a thin bar for the walls (or "fallen"), the guard ships (crossed out when sunk), a scroll if it holds plans
    const lv = siteLevel(f), st = standing(lv);
    m.innerHTML = `<span class="mwarn" aria-label="${f.camp ? 'Bandits' : 'Hostile fortress'}">!</span><span class="lvchip ${st}">Lv ${lv}</span><b class="mt">${f.named ? f.named.name : f.isle.name}</b>${f.dead ? '<em class="done">✓</em>' : tw && towersUp(f) ? `<span class="mtowers">${f.towers.map(t => towerIc(t.hp <= 0)).join('')}</span>` : `<span class="mbar"><i style="width:${wall*100}%"></i></span>`}<span class="mships">${f.guards.map(g => shipIc(g.dead)).join('')}</span>${prize ? '<span class="mscroll" title="Holds ship plans">📜</span>' : ''}`; }
  m.hidden = false;
}
