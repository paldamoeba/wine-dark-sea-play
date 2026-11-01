// The harbor and bag screens: tabs with drawn icons, picture cards, costs shown as coins and logs.
// ui.js owns opening, closing and the button actions; this file only draws.
import {SHIPS, FISH, TUNING, CREW, GOD_BLESSINGS, TIMBER, LINEN, BRONZE, REQUESTS, GOALS, STARTER_GOALS, UPGRADES, CAPTAIN, GOODS, TRADE, WAR, FREEPORT, CAMPS, PIRATE_PLANS, PLANS, WAREHOUSE, RAM} from './config.js?v=a77b89b';
import {ISLANDS, CITIES, HARBORS, rival} from './world.js?v=a77b89b';
import {G, ship, holdUsed, lvl, have, canPay, wareCap, room as roomFor, used as usedOf, capOf} from './state.js?v=a77b89b';
import {PAINTS, SAILS, GODS, SPECS} from './ships.js?v=a77b89b';
import {founded, blessing, fighters, men, layout} from './crew.js?v=a77b89b';
import {planClues} from './combat.js?v=a77b89b';
import {piecesOf, studied, allPieces, timeLeft, mmss, span} from './shipyard.js?v=a77b89b';
import {board, active, canDeliver, goal} from './quests.js?v=a77b89b';
import {costOf, effectText, maxOf, ramMat, ramDmg, upKeys} from './upgrades.js?v=a77b89b';
import {shipPortrait} from './portrait.js?v=a77b89b';
import {owned, cantSwitch, captainOf, clock, tripPay, captainCost} from './fleet.js?v=a77b89b';

const INK = '#22283a', OCHRE = '#d48a2a', WOOD = '#a3754a', SEA = '#2f7f9a';
const svg = (body, vb = 24) => `<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true">${body}</svg>`;
// ---- icons: small drawings in the game's colors ----
export const IC = {
  // a book of quests: a red leather cover, cream pages and a ribbon
  book: svg(`<path d="M4 5.5 Q4 4 5.5 4 H18.5 a1 1 0 0 1 1 1 V18 H6 a2 2 0 0 0 0 4 H19.5" fill="none" stroke="#3a2618" stroke-width="1.3"/><path d="M4 5.5 Q4 4 5.5 4 H18.5 a1 1 0 0 1 1 1 V18 H6 Q4 18 4 20Z" fill="#b8402f" stroke="#3a2618" stroke-width="1.2"/><path d="M6 18 H19.5 V21.5 H6 a1.75 1.75 0 0 1 0 -3.5Z" fill="#f3e3b8" stroke="#3a2618" stroke-width="1.2"/><path d="M8 7.5 H16 V11 H8Z" fill="#e8c867"/><path d="M15 4 V9 L16.3 8 L17.6 9 V4" fill="#e8c867"/>`),
  // a silver drachma: the owl of Athena on a worn silver coin
  // gold drachmae: a little stack behind, and a front coin with Athena's owl
  coin: svg(`<ellipse cx="15.5" cy="17.6" rx="7" ry="2.6" fill="#a8721f"/><ellipse cx="15.5" cy="16.4" rx="7" ry="2.6" fill="#e8b23f"/><ellipse cx="15.5" cy="14.9" rx="7" ry="2.6" fill="#a8721f"/><ellipse cx="15.5" cy="13.7" rx="7" ry="2.6" fill="#f3c654"/>
    <circle cx="10" cy="12.6" r="8.4" fill="#9a6417"/><circle cx="10" cy="11.8" r="8.4" fill="#f4c24a"/><circle cx="10" cy="11.8" r="6.6" fill="#e2a632"/><path d="M6.7 15.7 Q6.2 9.2 10 7.8 Q13.8 9.2 13.3 15.7 Q10 17 6.7 15.7Z" fill="#b97f1f"/><circle cx="8.5" cy="10.8" r="1.5" fill="#fff1c4"/><circle cx="11.5" cy="10.8" r="1.5" fill="#fff1c4"/><circle cx="8.5" cy="10.8" r=".7" fill="#4a3210"/><circle cx="11.5" cy="10.8" r=".7" fill="#4a3210"/><path d="M9.5 12.3 L10 13.2 L10.5 12.3Z" fill="#6a4512"/><path d="M4.6 8.6 A6.6 6.6 0 0 1 8.4 5.4" fill="none" stroke="#fff3c8" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>`),
  wood: svg(`<rect x="3" y="8" width="16" height="8" rx="4" fill="${WOOD}"/><ellipse cx="19" cy="12" rx="3" ry="4" fill="#d9b382"/><ellipse cx="19" cy="12" rx="1.2" ry="1.6" fill="${WOOD}"/>`),
  fish: (c = '#4f7fa3') => svg(`<path d="M2 12 Q9 4 17 12 Q9 20 2 12Z M17 12 L23 7 L23 17Z" fill="${c}"/><circle cx="7" cy="10.8" r="1.3" fill="${INK}"/>`),
  market: svg(`<path d="M3 9 L5 4 H19 L21 9Z" fill="#c64a3c"/><path d="M3 9 h18 v2 H3Z" fill="#efe4c8"/><rect x="5" y="11" width="14" height="9" fill="#e6d29c"/><rect x="10" y="14" width="4" height="6" fill="${WOOD}"/>`),
  jobs: svg(`<rect x="5" y="3" width="14" height="18" rx="2" fill="#efe4c8" stroke="${WOOD}" stroke-width="1.5"/><path d="M8 8h8M8 12h8M8 16h5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`),
  yard: svg(`<path d="M4 15 Q12 21 20 15 L19 13 H5Z" fill="${WOOD}"/><path d="M12 4 V13" stroke="#6e3d1e" stroke-width="1.6"/><path d="M12.5 5 L18 11 H12.5Z" fill="#efe4c8"/><rect x="2" y="17.5" width="20" height="2" rx="1" fill="${SEA}"/>`),
  crew: svg(`<circle cx="8" cy="7" r="3" fill="#e3b591"/><path d="M4.5 21 L5.5 11 H10.5 L11.5 21Z" fill="#3f6c94"/><circle cx="16" cy="8" r="3" fill="#e3b591"/><path d="M12.5 21 L13.5 12 H18.5 L19.5 21Z" fill="${OCHRE}"/>`),
  dock: svg(`<circle cx="12" cy="5" r="2.2" fill="none" stroke="${INK}" stroke-width="1.8"/><path d="M12 7v13M7 11h10M5 15 Q6 20 12 20 Q18 20 19 15" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`),
  hold: svg(`<rect x="4" y="7" width="16" height="13" rx="1.5" fill="${WOOD}"/><path d="M4 11h16M12 7v13" stroke="#6e4a2a" stroke-width="1.4"/><path d="M6 7 L8 3 H16 L18 7" fill="#c49c66"/>`),
  ship: svg(`<path d="M3 14 Q12 21 21 14 L20 12 H4Z" fill="${WOOD}"/><path d="M11 3 V12" stroke="#6e3d1e" stroke-width="1.6"/><path d="M11.5 4 Q17 8 11.5 11.5Z" fill="#efe4c8"/>`),
  world: svg(`<circle cx="12" cy="12" r="9" fill="${SEA}"/><path d="M7 9 Q9 6 12 8 Q11 11 8 11Z M13 14 Q16 12 17 15 Q15 18 13 16Z" fill="#76883c"/>`),
  hull: svg(`<path d="M12 3 L20 6 V12 Q20 18 12 21 Q4 18 4 12 V6Z" fill="${WOOD}"/><path d="M5 9h14M4.5 13h15M6 17h12" stroke="#6e4a2a" stroke-width="1.3"/>`),
  speed: svg(`<path d="M4 20 L17 5" stroke="${WOOD}" stroke-width="2.4" stroke-linecap="round"/><path d="M15 3 L21 3 L21 9 L17 7Z" fill="${WOOD}"/><path d="M3 12h5M2 16h4" stroke="${SEA}" stroke-width="2" stroke-linecap="round"/>`),
  catapult: svg(`<path d="M3 20 H21" stroke="#6b4a2c" stroke-width="2.4" stroke-linecap="round"/><path d="M6 20 L12 10 L9 20" stroke="#8a5a30" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M12 10 L18 5" stroke="#8a5a30" stroke-width="2"/><circle cx="18.5" cy="5" r="3.2" fill="#f08a3a"/><circle cx="17.8" cy="4.3" r="1.2" fill="#ffd27a"/>`),
  chain: svg(`<circle cx="6" cy="17" r="4" fill="#4a525c"/><circle cx="18" cy="7" r="4" fill="#4a525c"/><circle cx="4.8" cy="15.8" r="1.2" fill="#8a96a3"/><circle cx="16.8" cy="5.8" r="1.2" fill="#8a96a3"/><path d="M9 14.5 Q11 11 12.5 12 Q14 13 15 10" stroke="#6b5a48" stroke-width="2" fill="none" stroke-dasharray="2.4 1.4"/>`),
  seats: svg(`<circle cx="7" cy="7" r="2.6" fill="#e3b591"/><path d="M4 18 L5 10 H9 L10 18Z" fill="#3f6c94"/><circle cx="17" cy="7" r="2.6" fill="#e3b591"/><path d="M14 18 L15 10 H19 L20 18Z" fill="#cf9035"/><path d="M12 9v6M9 12h6" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`),
  arrows: svg(`<path d="M4 20 L18 6" stroke="#6e4a2a" stroke-width="2"/><path d="M15 4 L21 3 L20 9Z" fill="#9aa1a8"/><path d="M4 20 l-1-4 M4 20 l4 1" stroke="#c64a3c" stroke-width="2" stroke-linecap="round"/>`),
  ram: (c = '#b07f3c') => svg(`<path d="M2 9 H14 L22 12 L14 15 H2Z" fill="${c}"/><path d="M5 9 V15 M9 9 V15" stroke="rgba(0,0,0,.25)" stroke-width="1.4"/>`),
  archer: svg(`<path d="M7 3 Q17 12 7 21" fill="none" stroke="#7a4a22" stroke-width="2"/><path d="M7 3 V21" stroke="#efe4c8" stroke-width="1"/><path d="M4 12 H19 M16 9 L19 12 L16 15" fill="none" stroke="${INK}" stroke-width="1.6"/>`),
  rower: svg(`<path d="M5 3 L15.5 17" stroke="#6e4a2a" stroke-width="2.2" stroke-linecap="round"/><path d="M14 15 L19.5 13.5 L21 19 L16.5 20.5Z" fill="${WOOD}" stroke="#6e4a2a" stroke-width="1"/><path d="M2 21 Q5 19 8 21 T14 21" stroke="${SEA}" stroke-width="1.8" fill="none"/>`),
  letter: svg(`<rect x="3" y="6" width="18" height="12" rx="1.5" fill="#efe4c8" stroke="${WOOD}" stroke-width="1.4"/><path d="M3.5 7 L12 13 L20.5 7" fill="none" stroke="${WOOD}" stroke-width="1.4"/><circle cx="12" cy="14" r="2" fill="#c64a3c"/>`),
  swords: svg(`<path d="M4 4 L18 18 M20 4 L6 18" stroke="#9aa1a8" stroke-width="2.4" stroke-linecap="round"/><path d="M15 20 L20 15 M4 15 L9 20" stroke="#7a4a22" stroke-width="2.4" stroke-linecap="round"/>`),
  wreck: svg(`<path d="M3 16 L10 10 L14 13 L21 8" stroke="${WOOD}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M2 19 Q7 17 12 19 Q17 21 22 19" stroke="${SEA}" stroke-width="2" fill="none"/>`),
  star: svg(`<path d="M12 3 L14.6 9 L21 9.5 L16 13.6 L17.6 20 L12 16.5 L6.4 20 L8 13.6 L3 9.5 L9.4 9Z" fill="${OCHRE}"/>`),
  bless: svg(`<path d="M12 3 V21 M6 6 Q12 12 18 6 M7 3 V8 M17 3 V8" stroke="#244f86" stroke-width="2" fill="none" stroke-linecap="round"/>`),
  gear: svg(`<circle cx="12" cy="12" r="7.5" fill="#9aa1a8"/><path d="M12 1.8 v4 M12 18.2 v4 M1.8 12 h4 M18.2 12 h4 M4.8 4.8 l2.8 2.8 M16.4 16.4 l2.8 2.8 M4.8 19.2 l2.8-2.8 M16.4 7.6 l2.8-2.8" stroke="#9aa1a8" stroke-width="3.4" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" fill="#e9d9b4"/>`),
  sail: svg(`<path d="M11 2 V21" stroke="#6e3d1e" stroke-width="1.8"/><path d="M5 4 H19" stroke="#6e3d1e" stroke-width="1.6"/><path d="M5.5 4.5 Q12 9 5.5 17 H18.5 Q12 9 18.5 4.5Z" fill="#efe4c8" stroke="${WOOD}" stroke-width="1"/><path d="M8.5 10 h7" stroke="#c64a3c" stroke-width="2"/>`),
  helm: svg(`<circle cx="12" cy="12" r="6.5" fill="none" stroke="${WOOD}" stroke-width="2.4"/><circle cx="12" cy="12" r="2" fill="${WOOD}"/><path d="M12 2 V22 M2 12 H22 M5 5 L19 19 M19 5 L5 19" stroke="${WOOD}" stroke-width="2" stroke-linecap="round"/>`),
  map: svg(`<path d="M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20Z" fill="#efe4c8" stroke="${WOOD}" stroke-width="1.2"/><path d="M14 10 l3 3 m0-3 l-3 3" stroke="#c64a3c" stroke-width="1.8"/>`),
};
// ---- the main icons, redrawn as chunky game icons: dark outlines, bright fills, a highlight ----
const OL = 'stroke="#2a1d17" stroke-width="1.3" stroke-linejoin="round"';
const teeth = Array.from({length:8}, (_, i) => `<rect x="10.4" y="1.6" width="3.2" height="5" rx="1" fill="#8fa3b5" ${OL} transform="rotate(${i*45} 12 12)"/>`).join('');
Object.assign(IC, {
  // supplies: an open wooden crate with things poking out (a fish, a rolled cloth, an amphora)
  hold: svg(`<path d="M7.2 9.5 Q6.4 4.6 9 3.6 Q11.4 4.6 10.6 9.5Z" fill="#c46a3a" ${OL}/><path d="M8.2 4.1 H9.8" stroke="#2a1d17" stroke-width="1.2"/><ellipse cx="15.2" cy="7.6" rx="3.6" ry="2" fill="#7fb0c8" ${OL} transform="rotate(-25 15.2 7.6)"/><path d="M18.2 5.6 L20.6 4.4 L20.2 7.2Z" fill="#7fb0c8" ${OL}/>
    <path d="M3 9.5 H21 L20 20.5 Q12 21.6 4 20.5Z" fill="#c98a4b" ${OL}/><path d="M3.4 13.2 H20.6 M3.7 17 H20.3" stroke="#8a5a30" stroke-width="1.3"/><path d="M6 9.8 L7 20.6 M18 9.8 L17 20.6" stroke="#8a5a30" stroke-width="1.3"/><path d="M3 9.5 H21" stroke="#2a1d17" stroke-width="1.6"/><path d="M4.5 11.3 H11" stroke="#f0c48a" stroke-width="1.1" stroke-linecap="round"/>`),
  // the hull: a boat seen from the side, planks and bronze nails
  hull: svg(`<path d="M2 9.5 H22 L19.4 17.6 Q12 20.8 4.6 17.6Z" fill="#c98a4b" ${OL}/><path d="M2.9 12.2 H21.1 M3.9 15 H20.1" stroke="#8a5a30" stroke-width="1.3"/><path d="M2 9.5 H22" stroke="#6e3d1e" stroke-width="2.2" stroke-linecap="round"/><path d="M4 7.8 Q12 5.6 20 7.8" fill="none" stroke="#2a1d17" stroke-width="1.2"/><circle cx="7" cy="13.6" r=".9" fill="#e2ac5a"/><circle cx="12" cy="13.6" r=".9" fill="#e2ac5a"/><circle cx="17" cy="13.6" r=".9" fill="#e2ac5a"/><path d="M5 11 H11" stroke="#f0c48a" stroke-width="1.1" stroke-linecap="round"/>`),
  // oars: two crossed oars with wide blades
  rower: svg(`<path d="M4 20 L16.4 7.6 M20 20 L7.6 7.6" stroke="#2a1d17" stroke-width="3.8" stroke-linecap="round"/><path d="M4 20 L16.4 7.6 M20 20 L7.6 7.6" stroke="#d29a5c" stroke-width="2" stroke-linecap="round"/>
    <path d="M15.2 8.8 L18.6 2.6 Q21.6 2.4 21.4 5.4 L15.2 8.8Z" fill="#c98a4b" ${OL}/><path d="M8.8 8.8 L5.4 2.6 Q2.4 2.4 2.6 5.4 L8.8 8.8Z" fill="#c98a4b" ${OL}/><path d="M3 19 l2 2 M21 19 l-2 2" stroke="#2a1d17" stroke-width="2.4" stroke-linecap="round"/>`),
  // the sail: a square sail full of wind on its mast and yard, red stripes, a small hull underneath
  sail: svg(`<path d="M12 1.8 V17" stroke="#2a1d17" stroke-width="3.2" stroke-linecap="round"/><path d="M12 1.8 V17" stroke="#8a5a30" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M4.5 3.4 Q8 6.6 6 14.2 H18 Q16 6.6 19.5 3.4Z" fill="#f6ecd2" ${OL}/><path d="M5.6 7 Q12 9 18.4 7 M5.9 10.6 Q12 12.6 18.1 10.6" fill="none" stroke="#d6503f" stroke-width="1.8"/>
    <path d="M3.5 3.4 H20.5" stroke="#2a1d17" stroke-width="2.6" stroke-linecap="round"/><path d="M3.5 3.4 H20.5" stroke="#b5793f" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M3 17 H21 L19.4 20.4 Q12 22.4 4.6 20.4Z" fill="#b5793f" ${OL}/>`),
  map: svg(`<path d="M3 5.5 L8.5 3.5 L15.5 5.5 L21 3.5 V18.5 L15.5 20.5 L8.5 18.5 L3 20.5Z" fill="#f3e3b8" ${OL}/><path d="M8.5 3.8V18.5M15.5 5.5V20.2" stroke="#c9ad74" stroke-width="1"/><path d="M5.5 15.5 Q9 9 12.5 12 T16.5 8.5" stroke="#3f6c94" stroke-width="1.5" stroke-dasharray="1.6 1.5" fill="none"/><path d="M15.8 6.2 l3.2 3.2 m0 -3.2 l-3.2 3.2" stroke="#c64a3c" stroke-width="2.2" stroke-linecap="round"/>`),
  gear: svg(`${teeth}<circle cx="12" cy="12" r="7" fill="#8fa3b5" ${OL}/><circle cx="12" cy="12" r="3" fill="#e9d9b4" ${OL}/><path d="M7.8 9.5 A5 5 0 0 1 10.5 7.2" stroke="#d7e2ea" stroke-width="1.4" fill="none" stroke-linecap="round"/>`),
  market: svg(`<rect x="4.5" y="10" width="15" height="10.5" fill="#efd9a6" ${OL}/><path d="M3 10 L5 4 H19 L21 10Z" fill="#d6503f" ${OL}/><path d="M7.8 4.4 L7.2 10 M11.6 4.4 V10 M15.3 4.4 L15.9 10" stroke="#fbf3df" stroke-width="2.2"/><path d="M3 10 q1.5 2.2 3 0 q1.5 2.2 3 0 q1.5 2.2 3 0 q1.5 2.2 3 0 q1.5 2.2 3 0 q1.5 2.2 3 0" fill="#d6503f" ${OL}/><rect x="9.5" y="14" width="5" height="6.5" fill="#8a5a30" ${OL}/>`),
  jobs: svg(`<path d="M6 21.5 L7 17 M18 21.5 L17 17" stroke="#2a1d17" stroke-width="1.8" stroke-linecap="round"/><rect x="3" y="3.5" width="18" height="14" rx="1.5" fill="#a86f3c" ${OL}/><rect x="5.3" y="5.8" width="6.2" height="8" fill="#fbf3df" ${OL} transform="rotate(-6 8.4 9.8)"/><rect x="12.6" y="6.2" width="6" height="6.5" fill="#f3d27a" ${OL} transform="rotate(6 15.6 9.4)"/><circle cx="8.4" cy="6.2" r="1.1" fill="#d6503f"/><circle cx="15.6" cy="6.6" r="1.1" fill="#3f6c94"/><path d="M6.5 9.5h3.6M6.7 11.5h3" stroke="#8a7a60" stroke-width=".9"/>`),
  yard: svg(`<path d="M3 15 Q12 21.5 21 15 L19.6 12.5 H4.4Z" fill="#b5793f" ${OL}/><path d="M12 3 V12.5" stroke="#6e3d1e" stroke-width="1.8"/><path d="M12.6 4 L18.5 11 H12.6Z" fill="#fbf3df" ${OL}/><path d="M12.6 7.5 L15.5 11" stroke="#d6503f" stroke-width="1.6"/><path d="M4 21 L7 17.5 M20 21 L17 17.5" stroke="#6e4a2a" stroke-width="2" stroke-linecap="round"/><rect x="1.5" y="20" width="21" height="2" rx="1" fill="#3f8fb0" ${OL}/>`),
  // crew: a soldier in a bronze helmet with a red crest, easy to spot at a glance
  crew: svg(`<path d="M5 22 Q4.6 15.5 12 15.5 Q19.4 15.5 19 22Z" fill="#3f6c94" ${OL}/><circle cx="12" cy="11" r="5" fill="#e9b88f" ${OL}/>
    <path d="M6.8 11.4 Q6.4 4.6 12 4.4 Q17.6 4.6 17.2 11.4 L15.6 11.4 L15.4 9 H8.6 L8.4 11.4Z" fill="#e2ac5a" ${OL}/><path d="M8.6 12 L8.4 15 M15.4 12 L15.6 15" stroke="#e2ac5a" stroke-width="2.4" stroke-linecap="round"/><path d="M8.6 12 L8.4 15 M15.4 12 L15.6 15" stroke="#2a1d17" stroke-width=".8" stroke-linecap="round" opacity=".6"/>
    <path d="M6.6 5.6 Q12 -1.4 17.4 5.6 Q12 3.4 6.6 5.6Z" fill="#d6503f" ${OL}/><path d="M9.6 6.2 Q10.4 5.4 11.6 5.3" stroke="#fff3c8" stroke-width="1" stroke-linecap="round" fill="none"/>`),
  dock: svg(`<circle cx="12" cy="4.8" r="2.3" fill="none" stroke="#2a1d17" stroke-width="3.4"/><circle cx="12" cy="4.8" r="2.3" fill="none" stroke="#e3b341" stroke-width="1.8"/><path d="M12 7v13.5 M7 10.5h10 M4.5 14.5 Q5.5 20.5 12 20.5 Q18.5 20.5 19.5 14.5" fill="none" stroke="#2a1d17" stroke-width="3.6" stroke-linecap="round"/><path d="M12 7v13.5 M7 10.5h10 M4.5 14.5 Q5.5 20.5 12 20.5 Q18.5 20.5 19.5 14.5" fill="none" stroke="#e3b341" stroke-width="2" stroke-linecap="round"/>`),
  ship: svg(`<path d="M2.5 14 Q12 21.5 21.5 14 L20.3 12 H3.7Z" fill="#b5793f" ${OL}/><path d="M11 2.5 V12" stroke="#6e3d1e" stroke-width="1.8"/><path d="M11.6 3.5 Q18 7.5 11.6 11.5Z" fill="#fbf3df" ${OL}/><path d="M12 5.4 Q15 7.4 12 9.6" stroke="#3f6c94" stroke-width="1.6" fill="none"/><path d="M3 18.5 Q7 17 12 18.5 T21 18.5" stroke="#3f8fb0" stroke-width="1.6" fill="none"/>`),
  world: svg(`<circle cx="12" cy="12" r="9.2" fill="#3f8fb0" ${OL}/><path d="M6.5 8.5 Q9 5 12.5 7.5 Q12 10.5 8.5 11Z M13 14 Q16.5 11.5 17.5 15 Q15.5 18.5 13 16.5Z M8 15.5 q1.5 -1 2 1 q-1 1.5 -2 -1Z" fill="#8fb34a" ${OL}/><path d="M6.5 6 A8 8 0 0 1 11 3.6" stroke="#bfe3f0" stroke-width="1.4" fill="none" stroke-linecap="round"/>`),
  swords: svg(`<path d="M4.5 3.5 L17 16 M19.5 3.5 L7 16" stroke="#2a1d17" stroke-width="3.6" stroke-linecap="round"/><path d="M4.5 3.5 L17 16 M19.5 3.5 L7 16" stroke="#d7e2ea" stroke-width="2" stroke-linecap="round"/><path d="M14.5 19.5 L19.5 14.5 M4.5 14.5 L9.5 19.5" stroke="#2a1d17" stroke-width="3.6" stroke-linecap="round"/><path d="M14.5 19.5 L19.5 14.5 M4.5 14.5 L9.5 19.5" stroke="#e3b341" stroke-width="2" stroke-linecap="round"/>`),
  flame: svg(`<path d="M12 2.5 C14 7 19 9 18.5 14.5 C18 19 15 21.5 12 21.5 C8.5 21.5 5.5 19 5.5 14.8 C5.5 11 8.5 9.5 9 6 C10.5 8 11 9.5 11 11 C12.5 9 12.8 5.5 12 2.5Z" fill="#ef7a2c" ${OL}/><path d="M12 12 C13.8 14 15 15.5 14.6 17.6 C14.2 19.6 13 20.4 12 20.4 C10.6 20.4 9.4 19.4 9.4 17.6 C9.4 15.6 11.2 14.6 12 12Z" fill="#ffd35a"/>`),
  bronze: svg(`<path d="M3 16.5 L6.5 9 H17.5 L21 16.5Z" fill="#c48a3e" ${OL}/><path d="M6.5 9 L8.5 5.5 H15.5 L17.5 9Z" fill="#e2ac5a" ${OL}/><path d="M9 7.2 H14" stroke="#f6d79a" stroke-width="1.3" stroke-linecap="round"/>`),
  linen: svg(`<path d="M4 6 H17 V18 H4Z" fill="#efe6cf" ${OL}/><ellipse cx="17" cy="12" rx="3.2" ry="6" fill="#e2d6b6" ${OL}/><ellipse cx="17" cy="12" rx="1.2" ry="2.4" fill="#b9a57e"/><path d="M4 10 H15 M4 14 H15" stroke="#cbbd99" stroke-width="1"/>`),
  wood: svg(`<rect x="2.5" y="7.5" width="16" height="9" rx="4.5" fill="#a3683a" ${OL}/><ellipse cx="18.5" cy="12" rx="3.2" ry="4.5" fill="#e6c48f" ${OL}/><ellipse cx="18.5" cy="12" rx="1.4" ry="2" fill="none" stroke="#a3683a" stroke-width="1"/><path d="M5 10h8M6 13.5h7" stroke="#7a4a25" stroke-width="1"/>`),
});
// weather icons for the badge beside the map
const cloud = (x, y, c = '#f4f6f8') => `<path d="M${x} ${y} h11 a3.2 3.2 0 0 0 0 -6.4 a4.6 4.6 0 0 0 -8.8 -1 a3.6 3.6 0 0 0 -2.2 7.4Z" fill="${c}" ${OL}/>`;
export const WX_IC = {
  fair: svg(`<circle cx="12" cy="12" r="5" fill="#f6c443" ${OL}/>${Array.from({length:8}, (_, i) => `<path d="M12 2.2 V5" stroke="#e9a52a" stroke-width="2" stroke-linecap="round" transform="rotate(${i*45} 12 12)"/>`).join('')}`),
  calm: svg(`<circle cx="9" cy="9" r="4.2" fill="#f6c443" ${OL}/><path d="M3 16 Q6 14.5 9 16 T15 16 T21 16 M5 19.5 Q8 18 11 19.5 T17 19.5" stroke="#3f8fb0" stroke-width="1.8" fill="none" stroke-linecap="round"/>`),
  windy: svg(`<path d="M3 8 H14 a2.5 2.5 0 1 0 -2.5 -2.5 M3 12.5 H18 a3 3 0 1 1 -3 3 M3 17 H10" stroke="#3f8fb0" stroke-width="2.2" fill="none" stroke-linecap="round"/>`),
  storm: svg(`${cloud(5, 13, '#8c97a0')}<path d="M12 13 L9.5 17.5 H12.5 L10.5 22" stroke="#f6c443" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`),
  mist: svg(`${cloud(5, 11)}<path d="M4 15.5 H20 M6 19 H18" stroke="#c9d4da" stroke-width="2" stroke-linecap="round"/>`),
  night: svg(`<path d="M15.5 3.5 A8.5 8.5 0 1 0 20.5 15 A7 7 0 0 1 15.5 3.5Z" fill="#f3e7b4" ${OL}/><circle cx="5" cy="5" r="1" fill="#f3e7b4"/><circle cx="9" cy="2.8" r=".7" fill="#f3e7b4"/>`),
};
// P58: the resource icons redrawn soft and glossy (no outlines): smooth gradients, a white shine on top, a soft shadow under.
// Gradient ids are unique per icon so they don't clash on a page.
const glossy = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const shade = (cx = 12, cy = 21, rx = 8) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="1.6" fill="rgba(0,0,0,.18)"/>`;
Object.assign(IC, {
  // a plump fish with a pale belly and a shine
  fish: (c = '#7fb6dd') => { const id = 'gf' + c.slice(1); return svg(`<defs>${glossy(id, [[0, '#d6ecfa'], [.45, c], [1, '#4f86b3']])}</defs>${shade(12, 20.5, 7)}
    <path d="M2.5 12 C5.5 6.2 13 5.6 17.2 11.2 L21.5 7.6 C21 10 21 14 21.5 16.4 L17.2 12.8 C13 18.4 5.5 17.8 2.5 12Z" fill="url(#${id})"/>
    <path d="M5.5 10.2 C8 8.2 11.8 8 14.2 9.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".75"/>
    <circle cx="6.6" cy="11.2" r="1.1" fill="#24364a"/><circle cx="6.9" cy="10.9" r=".35" fill="#fff"/>`); },
  // a little pile of three logs with green leaves
  wood: svg(`<defs>${glossy('gw', [[0, '#c98a52'], [1, '#7e4f2b']])}${glossy('gwe', [[0, '#f4d9a8'], [1, '#d4a86c']])}</defs>${shade(12, 21, 9)}
    <rect x="2.5" y="13" width="13" height="6.4" rx="3.2" fill="url(#gw)"/><rect x="8.5" y="13" width="13" height="6.4" rx="3.2" fill="url(#gw)"/><rect x="5.5" y="7.4" width="13" height="6.4" rx="3.2" fill="url(#gw)"/>
    <ellipse cx="15.5" cy="16.2" rx="2.3" ry="3.2" fill="url(#gwe)"/><ellipse cx="21.5" cy="16.2" rx="2.3" ry="3.2" fill="url(#gwe)"/><ellipse cx="18.5" cy="10.6" rx="2.3" ry="3.2" fill="url(#gwe)"/>
    <path d="M7 8.8 H14 M5 14.4 H11" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".35"/>
    <path d="M6 7.6 C4.2 5.2 5.4 3.6 7.4 3.8 C7.8 5.6 7.2 6.8 6 7.6Z" fill="#6cbf4a"/><path d="M9.4 7.4 C10.2 4.8 12.2 4.6 13 6 C12 7.2 10.8 7.6 9.4 7.4Z" fill="#4fa83a"/>`),
  // a stack of bronze ingots (three below, two on top), warm and shiny
  bronze: svg(`<defs>${glossy('gb', [[0, '#f6c98a'], [.5, '#d08a43'], [1, '#9a5a24']])}${glossy('gbt', [[0, '#fde3b8'], [1, '#e7aa64']])}</defs>${shade(12, 21.2, 9)}
    ${[[2, 14], [8, 14], [14, 14], [5, 8.6], [11, 8.6]].map(([x, y]) => `<path d="M${x} ${y + 6} L${x + 1.2} ${y + 1.6} H${x + 6.8} L${x + 8} ${y + 6}Z" fill="url(#gb)"/><path d="M${x + 1.2} ${y + 1.6} L${x + 2} ${y} H${x + 6} L${x + 6.8} ${y + 1.6}Z" fill="url(#gbt)"/>`).join('')}
    <path d="M7 9.2 H10.6 M13 9.2 H16.6" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".8"/>`),
  // a roll of linen cloth
  linen: svg(`<defs>${glossy('gl', [[0, '#ffffff'], [1, '#d9cfb8']])}${glossy('gle', [[0, '#f3ead6'], [1, '#bfb398']])}</defs>${shade(12, 21, 9)}
    <path d="M4 6.5 H17 V17.5 H4Z" fill="url(#gl)"/><ellipse cx="17" cy="12" rx="3.2" ry="5.5" fill="url(#gle)"/><ellipse cx="17" cy="12" rx="1.3" ry="2.4" fill="#a99b7c"/>
    <path d="M6 9 H14" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><path d="M4 12 H15 M4 14.6 H15" stroke="#c9bd9f" stroke-width=".7"/>`),
  // a stack of gold coins with a shine
  coin: svg(`<defs>${glossy('gc', [[0, '#fff0a8'], [.5, '#f5c242'], [1, '#c98a1c']])}</defs>${shade(12, 21.2, 8)}
    ${[18, 15, 12].map(y => `<ellipse cx="12" cy="${y + 1.4}" rx="7.5" ry="2.8" fill="#b67a16"/><ellipse cx="12" cy="${y}" rx="7.5" ry="2.8" fill="url(#gc)"/>`).join('')}
    <ellipse cx="12" cy="12" rx="4.6" ry="1.4" fill="none" stroke="#c98a1c" stroke-width=".8"/><path d="M8 11.2 Q10 10.2 12.5 10.4" stroke="#fff" stroke-width="1" stroke-linecap="round" fill="none" opacity=".85"/>`),
});
// trade goods: an amphora (wine, oil), a painted pot, a shard of black obsidian
// P60: icons seen from a little above (like the wood and linen): the supply crate as a box in perspective, bronze as a stack of ingots
// in perspective, plus glossy upgrade and war pictures.
const face = (pts, fill) => `<path d="M${pts.map(p => p.join(' ')).join(' L')}Z" fill="${fill}"/>`;
Object.assign(IC, {
  hold: svg(`<defs>${glossy('h3t', [[0, '#e6b27a'], [1, '#c48a52']])}${glossy('h3l', [[0, '#b77a42'], [1, '#8a5528']])}${glossy('h3r', [[0, '#a06634'], [1, '#74451f']])}</defs>${shade(12, 21.6, 9)}
    <path d="M8.6 8.4 C8 4.6 9.6 3.4 11 3.9 C11.4 5.4 10.6 7.4 9.8 8.4Z" fill="#c8593a"/><ellipse cx="14.8" cy="7.2" rx="3.2" ry="1.7" fill="#8cc4e6" transform="rotate(-25 14.8 7.2)"/>
    ${face([[12, 6.5], [21, 10], [12, 13.5], [3, 10]], 'url(#h3t)')}${face([[3, 10], [12, 13.5], [12, 21.5], [3, 18]], 'url(#h3l)')}${face([[12, 13.5], [21, 10], [21, 18], [12, 21.5]], 'url(#h3r)')}
    <path d="M3 14 L12 17.5 L21 14" stroke="#6a3f1c" stroke-width=".8" fill="none" opacity=".6"/><path d="M5 10.6 L12 13.1" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".45"/>`),
  bronze: svg(`<defs>${glossy('b3t', [[0, '#fde3b8'], [1, '#eab06a']])}${glossy('b3s', [[0, '#d99a52'], [1, '#9a5a24']])}</defs>${shade(12, 21.4, 9.5)}
    ${[[3, 17], [9.5, 17], [6.2, 12.2]].map(([x, y]) => face([[x + 1.5, y - 2.4], [x + 10, y - 2.4], [x + 11.5, y], [x, y]], 'url(#b3t)') + face([[x, y], [x + 11.5, y], [x + 11.5, y + 3.4], [x, y + 3.4]], 'url(#b3s)')).join('')}
    <path d="M8.6 10.6 H15" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".85"/>`),
  // upgrades
  hull: svg(`<defs>${glossy('uh', [[0, '#d39257'], [1, '#7e4f2b']])}</defs>${shade(12, 21.4, 9)}<path d="M2.5 9 H21.5 C21 15.5 17.5 19.5 12 19.5 C6.5 19.5 3 15.5 2.5 9Z" fill="url(#uh)"/>
    <path d="M3.4 12 H20.6 M4.6 15 H19.4" stroke="#5e3a1c" stroke-width=".8" opacity=".55"/><path d="M5 10.4 H19" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".5"/><rect x="2" y="7.6" width="20" height="2" rx="1" fill="#e3ad48"/>`),
  // two crossed oars: long round shafts with wide flat blades and grips
  rower: svg(`<defs>${glossy('uo', [[0, '#e6b984'], [1, '#8a5a30']])}${glossy('uob', [[0, '#d49a5e'], [1, '#7e4f2b']])}</defs>${shade(12, 22, 9)}
    ${[1, -1].map(sg => `<g transform="translate(12 12) scale(${sg} 1) translate(-12 -12)"><path d="M4.2 3.4 L15.6 14.8" stroke="url(#uo)" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M14.2 13.2 C16.6 13 19.8 15.8 20.6 18.8 C20.9 20 20 20.9 18.8 20.6 C15.8 19.8 13 16.6 13.2 14.2Z" fill="url(#uob)"/><path d="M15.2 15.4 C16.8 16 18.4 17.6 19.2 19.2" stroke="#fff" stroke-width=".8" stroke-linecap="round" opacity=".55" fill="none"/>
    <circle cx="4" cy="3.2" r="1.4" fill="#6a4223"/></g>`).join('')}`),
  sail: svg(`<defs>${glossy('us', [[0, '#ffffff'], [1, '#d9cfb8']])}</defs>${shade(12, 21.6, 8)}<path d="M12 2.5 V20" stroke="#8a5a30" stroke-width="1.8"/><path d="M5.5 4.5 H18.5" stroke="#8a5a30" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M6 5.2 H18 C19 9.5 18.6 13.5 17 17 H7 C5.4 13.5 5 9.5 6 5.2Z" fill="url(#us)"/><path d="M7.4 7.6 C7 10 7.2 12.4 7.8 14.4" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none"/><path d="M12 8 V15" stroke="#c64a3c" stroke-width="2.2" opacity=".85"/>`),
  helm: svg(`<defs><radialGradient id="uw" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#e0b07a"/><stop offset="1" stop-color="#7e4f2b"/></radialGradient></defs>${shade(12, 21.8, 7)}
    ${Array.from({length:8}, (_, i) => { const a = i*Math.PI/4; return `<path d="M${12 + Math.cos(a)*3} ${11 + Math.sin(a)*3} L${12 + Math.cos(a)*9.5} ${11 + Math.sin(a)*9.5}" stroke="url(#uw)" stroke-width="2" stroke-linecap="round"/>`; }).join('')}
    <circle cx="12" cy="11" r="6.2" fill="none" stroke="url(#uw)" stroke-width="2.4"/><circle cx="12" cy="11" r="2.4" fill="#e3ad48"/><path d="M7.6 7.4 A6 6 0 0 1 12 5" stroke="#fff" stroke-width="1" fill="none" opacity=".7"/>`),
  seats: svg(`<defs>${glossy('uc', [[0, '#7fb6dd'], [1, '#3f6c94']])}${glossy('uc2', [[0, '#f08a6a'], [1, '#b8402f']])}</defs>${shade(12, 21.6, 9)}
    <path d="M2.5 21 C2.5 15 5 13.5 7.5 13.5 C10 13.5 12.5 15 12.5 21Z" fill="url(#uc2)"/><circle cx="7.5" cy="9.5" r="3.5" fill="#f2c9a2"/><path d="M4 8.8 C4.4 5.4 10.6 5.4 11 8.8 C9 7.4 6 7.4 4 8.8Z" fill="#5a3a22"/>
    <path d="M11.5 21 C11.5 14 14.5 12 17 12 C19.5 12 22 14 22 21Z" fill="url(#uc)"/><circle cx="17" cy="8" r="3.8" fill="#f2c9a2"/><path d="M13.2 7.2 C13.6 3.6 20.4 3.6 20.8 7.2 C18.6 5.8 15.4 5.8 13.2 7.2Z" fill="#3a2614"/>`),
  // one arrow: a wooden shaft, a bronze head, red feathers
  arrows: svg(`<defs>${glossy('ua', [[0, '#e6b984'], [1, '#8a5a30']])}${glossy('uah', [[0, '#f6d29a'], [1, '#b07a35']])}</defs>${shade(12, 22, 8)}
    <path d="M4.5 19.5 L17 7" stroke="url(#ua)" stroke-width="2" stroke-linecap="round"/><path d="M15.4 4.6 L21 3 L19.4 8.6 Z" fill="url(#uah)"/>
    <path d="M4.5 19.5 l-2.6 -.4 l2 -3.2 l2.6 1.2 z M4.5 19.5 l.4 2.6 l3.2 -2 l-1.2 -2.6 z" fill="#d9483c"/><path d="M6 17.2 L15 8.2" stroke="#fff" stroke-width=".7" stroke-linecap="round" opacity=".55"/>`),
  ram: c => svg(`<defs>${glossy('ur' + c.slice(1), [[0, '#fff2cc'], [.4, c], [1, '#4a2e17']])}</defs>${shade(12, 21.4, 9)}<path d="M2.5 9 H13 L22 13 L13 17 H2.5Z" fill="url(#ur${c.slice(1)})"/>
    <path d="M13 9 L22 13 L13 17" stroke="#4a2e17" stroke-width=".7" fill="none" opacity=".5"/><path d="M4 10.8 H13" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".7"/><rect x="6" y="8" width="2" height="10" rx="1" fill="#4a2e17" opacity=".5"/>`),
  flame: svg(`<defs>${glossy('uf', [[0, '#ffe08a'], [.5, '#f59a3a'], [1, '#d9482c']])}</defs>${shade(12, 22, 6)}<path d="M12 2 C13.4 7 19 9 18.6 14.6 C18.2 19 15.2 21.5 12 21.5 C8.6 21.5 5.6 19 5.6 15 C5.6 11 8.8 9.4 9.4 5.6 C11.2 7.6 11.4 9.8 11.4 11 C12.8 8.8 12.4 5 12 2Z" fill="url(#uf)"/>
    <path d="M12 13 C13.4 15 15.2 16.2 14.8 18.4 C14.4 20 13.2 20.6 12 20.6 C10.4 20.6 9.2 19.6 9.2 18.2 C9.2 16.4 11.2 15.4 12 13Z" fill="#fff2b8"/>`),
  chain: svg(`<defs><radialGradient id="uk" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#b6c0cc"/><stop offset="1" stop-color="#3a414c"/></radialGradient></defs>${shade(12, 21.6, 9)}
    <circle cx="6" cy="16" r="4.4" fill="url(#uk)"/><circle cx="18" cy="7" r="4.4" fill="url(#uk)"/><path d="M9.5 13.6 Q11.4 10.4 12.6 11.4 Q13.8 12.4 14.8 9.4" stroke="#8a7a66" stroke-width="2" fill="none" stroke-dasharray="2.2 1.2" stroke-linecap="round"/>
    <circle cx="4.6" cy="14.6" r="1.1" fill="#fff" opacity=".7"/><circle cx="16.6" cy="5.6" r="1.1" fill="#fff" opacity=".7"/>`),
  catapult: svg(`<defs>${glossy('ut', [[0, '#d39257'], [1, '#7e4f2b']])}</defs>${shade(12, 21.8, 9)}<path d="M3 19.5 H21" stroke="url(#ut)" stroke-width="2.6" stroke-linecap="round"/><path d="M6 19.5 L11 11 L16 19.5" stroke="url(#ut)" stroke-width="2.2" fill="none" stroke-linejoin="round"/>
    <path d="M11 11 L18.5 4.5" stroke="url(#ut)" stroke-width="2"/><circle cx="19" cy="4.6" r="3.2" fill="#f59a3a"/><circle cx="18.2" cy="3.8" r="1.2" fill="#ffe08a"/>`),
  // war: two crossed swords with bronze guards
  swords: svg(`<defs>${glossy('wz', [[0, '#f4f7fa'], [1, '#9aa6b2']])}</defs>${shade(12, 21.8, 8)}
    ${[1, -1].map(sg => `<g transform="translate(12 12) scale(${sg} 1) translate(-12 -12)"><path d="M5 4 L6.4 3.6 L17.4 14.6 L16 16Z" fill="url(#wz)"/><path d="M14.4 17.6 L18.6 13.4" stroke="#c48a3e" stroke-width="2.4" stroke-linecap="round"/><path d="M17.4 16.4 L20.4 19.4" stroke="#7e4f2b" stroke-width="2.2" stroke-linecap="round"/><circle cx="20.8" cy="19.8" r="1.3" fill="#e3ad48"/></g>`).join('')}`),
});
// P59: trade goods in the glossy style: an amphora with a shine (wine, oil, dye in their colors), a red-figure pot, a black glass shard
const tone = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c*k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
export const GOOD_IC = k => {
  if (k === 'obsidian') return svg(`<defs>${glossy('go', [[0, '#6a6680'], [.5, '#2c2a36'], [1, '#121118']])}</defs>${shade(12, 21.3, 6)}
    <path d="M7 20 L5.5 11 L10 3.5 L17 6 L19 14 L14 20.5Z" fill="url(#go)"/><path d="M10 3.5 L12.5 11 L5.5 11Z" fill="#4c4860"/><path d="M12.5 11 L19 14 L14 20.5Z" fill="#1d1b26"/>
    <path d="M9.6 5.6 L8 9.6" stroke="#c9c2ff" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>`);
  if (k === 'pottery') return svg(`<defs>${glossy('gp', [[0, '#f0955f'], [.55, '#c8592f'], [1, '#8f3a1c']])}</defs>${shade(12, 21.4, 6)}
    <path d="M8 4 H16 L15 7 C20 9 20.5 15 17.5 18.5 C16 20.3 14 21 12 21 C10 21 8 20.3 6.5 18.5 C3.5 15 4 9 9 7Z" fill="url(#gp)"/>
    <path d="M5.2 12 H18.8 V14.6 H5.2Z" fill="#2a1d17"/><path d="M8 13.3 h1.4 M11.3 13.3 h1.4 M14.6 13.3 h1.4" stroke="#e8955e" stroke-width="1.2"/>
    <path d="M7.4 9.6 C8.6 8.6 10 8.4 11 8.5" stroke="#fff" stroke-width="1.1" stroke-linecap="round" fill="none" opacity=".75"/>`);
  const c = GOODS[k] ? GOODS[k].color : '#8a3a4a', id = 'ga' + k;
  return svg(`<defs>${glossy(id, [[0, tone(c, 1.45)], [.5, c], [1, tone(c, .6)]])}</defs>${shade(12, 21.4, 5.5)}
    <path d="M10 2.5 H14 V5 C17.8 6.8 18.5 10.5 18 13.5 C17.4 17 15 19.8 12 21 C9 19.8 6.6 17 6 13.5 C5.5 10.5 6.2 6.8 10 5Z" fill="url(#${id})"/>
    <path d="M9.6 6.2 C7 6 5.6 7.4 6.2 9.4 M14.4 6.2 C17 6 18.4 7.4 17.8 9.4" stroke="${tone(c, .8)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <rect x="9.5" y="1.6" width="5" height="1.8" rx=".9" fill="${tone(c, .7)}"/>
    <path d="M8.6 9.4 C8.4 11.6 8.8 13.6 9.8 15.4" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".7"/>`);
};
// P59: the tab pictures in the glossy style too
Object.assign(IC, {
  hold: svg(`<defs>${glossy('th', [[0, '#d9a066'], [1, '#93602f']])}</defs>${shade(12, 21.4, 9)}
    <path d="M8.2 9 C7.6 5 9 3.6 10.4 4 C11 5.4 10.4 7.6 9.6 9Z" fill="#c8593a"/><ellipse cx="15.2" cy="7.6" rx="3.4" ry="1.9" fill="#8cc4e6" transform="rotate(-25 15.2 7.6)"/>
    <path d="M3.5 9 H20.5 V19.5 C20.5 20.3 19.8 21 19 21 H5 C4.2 21 3.5 20.3 3.5 19.5Z" fill="url(#th)"/>
    <path d="M3.5 13 H20.5 M3.5 17 H20.5" stroke="#7a4e25" stroke-width=".8" opacity=".6"/><path d="M5 10.4 H19" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".5"/>`),
  ship: svg(`<defs>${glossy('ts', [[0, '#c98a52'], [1, '#7e4f2b']])}${glossy('tss', [[0, '#ffffff'], [1, '#e2d8c4']])}</defs>${shade(12, 21.6, 9)}
    <path d="M12 3 V15" stroke="#7a4e25" stroke-width="1.4"/><path d="M12.6 4 C17 6 18 10 17.5 13.5 H12.6Z" fill="url(#tss)"/><path d="M11.4 6 C8.4 8 7.6 11 8 13.5 H11.4Z" fill="url(#tss)"/>
    <path d="M2.5 14.5 H21.5 C20.5 18 17 20.5 12 20.5 C7 20.5 3.5 18 2.5 14.5Z" fill="url(#ts)"/><path d="M5 16 H19" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".45"/>`),
  jobs: svg(`<defs>${glossy('tj', [[0, '#fff6dc'], [1, '#e6d1a2']])}</defs>${shade(12, 21.6, 7)}
    <rect x="5" y="3.5" width="14" height="17" rx="2" fill="url(#tj)"/><rect x="9" y="2" width="6" height="3" rx="1.2" fill="#c8593a"/>
    <path d="M8 9 H16 M8 12 H16 M8 15 H13" stroke="#8a6a48" stroke-width="1.3" stroke-linecap="round"/><path d="M14.6 16.4 l1.2 1.3 l2.4 -2.8" stroke="#5fb35a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`),
  world: svg(`<defs><radialGradient id="tw" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#9fd8f2"/><stop offset=".6" stop-color="#3f8fb0"/><stop offset="1" stop-color="#245f7c"/></radialGradient></defs>${shade(12, 21.8, 7)}
    <circle cx="12" cy="11.5" r="9" fill="url(#tw)"/><path d="M6.5 8 C8.5 6.5 10.5 8.5 9.5 10.5 C8.5 12.5 6 11.5 6.5 8Z M13 13 C15.5 11.5 18.5 13 17.5 15.5 C16.5 17.5 13.5 17 13 13Z M13.5 5 C15 4.5 16.5 5.5 16 7 C15 7.5 13.5 6.5 13.5 5Z" fill="#8cc061"/>
    <path d="M7 6 C8.5 4.5 10.5 3.8 12.5 3.8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".7"/>`),
});
export const goodPrice = (h, k) => Math.round(GOODS[k].base*(h.free ? FREEPORT.goods : TRADE.makes[h.is.name] === k ? TRADE.made : TRADE.wants[h.is.name] === k ? TRADE.wanted : 1));
export const canBuyGood = (h, k) => !GOODS[k].rare || !!h.free;
export const goodSell = (h, k) => Math.round(goodPrice(h, k)*TRADE.sellK);
const JOB_IC = {catch:() => IC.fish(), deliver:() => IC.hold, salvage:() => IC.wreck, wood:() => IC.wood, visit:() => IC.letter, sink:() => IC.swords};
const UP_NAME = {hull:'Hull', oars:'Oars', sail:'Sail', helm:'Helm', seats:'Crew', arrows:'Arrows', ram:'Ram', fire:'Fire', chain:'Chains', catapult:'Catapult'}; // short names under the upgrade pictures
const UP_IC = {catapult:() => IC.catapult, chain:() => IC.chain, fire:() => IC.flame, sail:() => IC.sail, helm:() => IC.helm, hull:() => IC.hull, oars:() => IC.rower, seats:() => IC.seats, arrows:() => IC.arrows, ram:() => IC.ram((ramMat(lvl('ram') + 1) || ramMat(lvl('ram')) || {color:'#8a5a30'}).color)};
export const FISH_COLOR = {sardine:'#9fb8c8', tuna:'#4f7fa3', swordfish:'#2f5f8a'};
// cost chips: "12 [log] 40 [coin]", red when you're short
const chip = (icon, n, ok = true) => `<span class="chipc ${ok ? '' : 'short'}">${icon}${n}</span>`;
export const costChips = c => ['wood', 'bronze', 'linen', 'gold'].map(k => c[k] ? chip(k === 'gold' ? IC.coin : IC[k], c[k], have(k) >= c[k]) : '').join('');
const pips = (l, max) => `<span class="pips">${Array.from({length:max}, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</span>`;
const bar = (k, cls = '') => `<span class="pbar ${cls}"><i style="width:${Math.max(0, Math.min(100, k*100))}%"></i></span>`;

// ---- a side view of any ship, drawn from its model's size and paint ----
export function shipPic(model, look = {}){
  const s = SPECS[model], lk = {...s.look, ...look}, pc = PAINTS[lk.paint] || PAINTS.gold, sc = 150/Math.max(s.L, 75); // every ship fills the picture
  const L = s.L*sc, H = Math.max(10, s.H*sc*1.3), x0 = 100 - L/2, x1 = 100 + L/2, y = 70, up = s.rise*sc*.6;
  const hull = `<path d="M${x0} ${y - H - up*.6} Q${x0 + L*.12} ${y} ${100} ${y + 2} Q${x1 - L*.1} ${y} ${x1} ${y - H - up} L${x1 - 4} ${y - H} H${x0 + 4}Z" fill="${pc.top}"/>
    <path d="M${x0 + L*.06} ${y - H*.45} Q100 ${y - H*.3} ${x1 - L*.06} ${y - H*.5}" stroke="${pc.wale}" stroke-width="2.5" fill="none"/>
    <path d="M${x0 + L*.15} ${y - 2} Q100 ${y + 6} ${x1 - L*.12} ${y - 2}" stroke="${pc.bottom}" stroke-width="4" fill="none"/>`;
  const oars = s.oarCount > 1 ? Array.from({length:Math.min(12, s.oarCount)}, (_, i) => { const ox = x0 + L*.2 + i*L*.6/Math.max(1, Math.min(12, s.oarCount) - 1); return `<path d="M${ox} ${y - H*.4} L${ox - 7} ${y + 10}" stroke="${s.raider ? '#3a2a24' : '#c9503f'}" stroke-width="2"/>`; }).join('') : '';
  const sail = s.mast ? (() => { const sw = s.sailW*sc*.95, sh = s.sailH*sc, top = y - H - sh - 14, st = SAILS[lk.sail] || SAILS.plain;
    const stripes = (st.stripes || ['#ece2cb']).map((c, i, a) => `<rect x="${100 - sw/2 + i*sw/a.length}" y="${top}" width="${sw/a.length + .5}" height="${sh}" fill="${c}"/>`).join('');
    return `<path d="M100 ${y - H} V${top - 6}" stroke="#6e3d1e" stroke-width="3"/><path d="M${100 - sw/2 - 4} ${top} H${100 + sw/2 + 4}" stroke="#6e3d1e" stroke-width="2.5"/><g>${stripes}</g>`; })() : '';
  const ram = lk.ram > 0 ? `<path d="M${x1 - 2} ${y - H*.25} L${x1 + 10} ${y - H*.1} L${x1 - 2} ${y + 2}Z" fill="${['#8a5a30', '#b07f3c', '#e3b341'][Math.min(2, Math.floor((lk.ram - 1)/5))]}"/>` : s.ram && lk.ram === undefined ? `<path d="M${x1 - 2} ${y - H*.25} L${x1 + 10} ${y - H*.1} L${x1 - 2} ${y + 2}Z" fill="#b07f3c"/>` : '';
  const topY = Math.min(y - H - up - 6, s.mast ? y - H - s.sailH*sc - 24 : 99) - 4;
  return `<svg viewBox="0 ${topY} 200 ${90 - topY}" class="shippic" aria-hidden="true"><path d="M0 76 Q50 72 100 76 T200 76 V90 H0Z" fill="${SEA}" opacity=".35"/>${oars}${sail}${hull}${ram}</svg>`;
}
// A real picture of the 3D model (falls back to the drawing if the picture can't be made).
export function shipImg(model, look = {}){ const u = shipPortrait(model, look); return u ? `<img class="shippic photo" src="${u}" alt="">` : shipPic(model, look); }
// a peg person (no arms or legs), like the ones in the game
export const peg = (c, helmet) => svg(`<path d="M12 11.5 C17.5 11.5 18.5 16 18 19 C17.6 21.6 15.5 23 12 23 C8.5 23 6.4 21.6 6 19 C5.5 16 6.5 11.5 12 11.5Z" fill="${c}"/><circle cx="12" cy="8" r="5.6" fill="#e3b591"/>${helmet ? '<path d="M6.2 7 Q12 -1 17.8 7Z" fill="#b07f3c"/><rect x="8.5" y="1" width="7" height="1.8" rx=".9" fill="#b8402f"/>' : '<path d="M6.4 7 Q12 .5 17.6 7 Q12 4.2 6.4 7Z" fill="#3a2a20"/>'}`);
const JOB_COLOR = {archer:'#c64a3c', rower:'#3f6c94'};

// ---- tabs ----
export const tabs = {port:'market', inv:'hold', set:'game'};
export const tabBar = (list, cur, sheet) => `<nav class="tabs" role="tablist">${list.map(([k, label, icon]) => `<button class="tab ${k === cur ? 'on' : ''}" role="tab" aria-selected="${k === cur}" data-act="tab" data-sheet="${sheet}" data-t="${k}">${icon}<span>${label}</span></button>`).join('')}</nav>`;
export const xBtn = '<button class="xbtn" data-act="close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>';
export const top = (title, right) => `<div class="mhead"><div class="plank"><h1>${title}</h1></div>${xBtn}${right ? `<div class="mright">${right}</div>` : ''}</div>`;
// the top line of every menu: drachmae, the warehouse (wood, bronze, linen) and the hold
// each one a little bar with its picture on the left end; the hold's bar fills up as it gets full
const rb = (icon, val, title, frac = null, cls = '') => `<span class="rb ${cls}" title="${title}"><span class="rbi">${icon}</span><span class="rbv">${frac !== null ? `<i style="width:${Math.min(100, frac*100)}%"></i>` : ''}<b>${val}</b></span></span>`;
const res = () => { const used = holdUsed(), cap = ship().hold;
  return `<div class="res">${rb(IC.coin, G.S.gold, 'Drachmae', null, 'gold')}${rb(IC.wood, G.S.ware, 'Wood in the warehouse')}${rb(IC.bronze, G.S.bronze || 0, 'Bronze in the warehouse')}${rb(IC.linen, G.S.linen || 0, 'Linen in the warehouse')}${rb(IC.hold, `${used}/${cap}`, 'Hold', used/cap, used >= cap ? 'full' : '')}</div>`; };
export const card = (title, body, cls = '') => `<section class="card ${cls}">${title ? `<h3>${title}</h3>` : ''}${body}</section>`;

// ---- the harbor ----
export const priceAt = (h, k) => Math.round(FISH[k].price*((h && h.prices[k]) || 1)*(blessing().price || 1));
export const catchValue = h => Object.keys(FISH).reduce((sum, k) => sum + (G.S.cargo[k] || 0)*priceAt(h, k), 0);
// material prices at a harbor: wood per 10, bronze and linen each. Bronze only where a smith sells it (null otherwise).
export const woodPrice = h => h.free ? FREEPORT.wood : TIMBER.at[h.is.name] || TIMBER.price;
export const matPrice = (h, k) => k === 'wood' ? woodPrice(h) : k === 'linen' ? LINEN.at[h.is.name] || LINEN.price : h.free ? BRONZE.free : BRONZE.at[h.is.name] || null;
export const matStep = k => k === 'wood' ? 10 : 1; // wood is sold in bundles of 10
export function harborHTML(h){
  const home = h.is.port, list = home ? [['yard', 'Shipyard', IC.yard], ['market', 'Market', IC.market], ['jobs', 'Jobs', IC.jobs], ['crew', 'Crew', IC.crew]] // P63: Kallisto opens on the shipyard
    : h.free ? [['market', 'Market', IC.market], ['dock', 'Dock', IC.dock]] : [['market', 'Market', IC.market], ['jobs', 'Jobs', IC.jobs], ['dock', 'Dock', IC.dock]];
  if (!list.some(([k]) => k === tabs.port)) tabs.port = list[0][0];
  const t = tabs.port, body = t === 'jobs' ? jobsTab(h) : t === 'yard' ? yardTab() : t === 'crew' ? crewTab() : t === 'dock' ? dockTab() : marketTab(h);
  const sub = home ? 'Your home harbor' : h.free ? 'Your free port: cheaper goods, cheap timber, purple dye' : h.is.city ? `Flies the flag of ${CITIES[h.is.city].name}` : 'A free harbor: no city rules it';
  return `<div class="mtop">${top(`${h.is.name}<small>${sub}</small>`, '<button class="btn gold" data-act="sail">Set sail</button>')}${res()}${tabBar(list, t, 'port')}</div><div class="mbody">${body}</div>`;
}
function marketTab(h){
  const S = G.S, val = catchValue(h);
  const tiles = Object.entries(FISH).map(([k, f]) => { const p = priceAt(h, k), best = p > f.price;
    return `<div class="tile ${S.cargo[k] ? '' : 'dim'}">${best ? `<span class="badge">${IC.star}</span>` : ''}${IC.fish(FISH_COLOR[k])}<b>${f.label}</b><span class="n">× ${S.cargo[k] || 0}</span><span class="price">${chip(IC.coin, p)}</span></div>`; }).join('');
  // materials: each line shows the price, what you have in the warehouse and buttons for a few amounts
  const mrow = (k, desc, amounts) => { const p = matPrice(h, k), st = matStep(k), cheap = k === 'wood' ? p < TIMBER.price : k === 'linen' ? p < LINEN.price : false;
    if (p === null) return '';
    const btn = n => `<button class="btn small ${n === amounts[amounts.length - 1] ? 'gold' : ''}" data-act="buymat" data-k="${k}" data-n="${n}" ${S.gold >= n/st*p ? '' : 'disabled'}>+${n} ${chip(IC.coin, n/st*p)}</button>`;
    return `<div class="job"><span class="jic">${IC[k]}</span><div><b>${MAT_NAMES[k]}${cheap ? ' <span class="good">cheap here</span>' : ''}</b><small>${desc} · ${chip(IC.coin, p)} ${st > 1 ? `per ${st}` : 'each'} · you have ${have(k)}</small></div><div class="btnrow tight">${amounts.map(btn).join('')}</div></div>`; };
  return card('Fish market', `<div class="tiles">${tiles}</div>
      <button class="btn gold wide" data-act="sell" ${val ? '' : 'disabled'}>${val ? `Sell the catch ${chip(IC.coin, '+' + val)}` : 'Nothing to sell'}</button>
      ${Object.keys(FISH).some(k => priceAt(h, k) > FISH[k].price) ? `<p class="note">${IC.star} pays more here than anywhere else.</p>` : ''}`)
    + tradeCard(h)
    + card('Building materials', `${mrow('wood', 'For hulls, oars and upgrades', [10, 50])}${mrow('linen', 'For sails', [5, 20])}${mrow('bronze', 'For rams, arrowheads and warships', [1, 5])}
      <p class="note">Materials go straight to your warehouse at Kallisto: they never take room in the hold.${matPrice(h, 'bronze') === null ? ' No smith here sells bronze: try Crete, Chios or Milos, or salvage warship wrecks.' : ''}</p>`);
}
const home = h => h.is.port;
const MAT_NAMES = {wood:'Wood', bronze:'Bronze', linen:'Linen'};
function tradeCard(h){
  const S = G.S, room = roomFor('goods');
  const rows = Object.entries(GOODS).filter(([k]) => canBuyGood(h, k) || S.cargo[k]).map(([k, g]) => { const p = goodPrice(h, k), sp = goodSell(h, k), n = S.cargo[k] || 0, made = TRADE.makes[h.is.name] === k, want = TRADE.wants[h.is.name] === k;
    return `<div class="job"><span class="jic">${GOOD_IC(k)}</span><div><b>${g.label}${made ? ' <span class="good">made here: cheap</span>' : want ? ' <span class="good">wanted here</span>' : ''}</b><small>Buy ${p} · sell ${sp} · you have ${n}</small></div>
      <div class="btnrow tight"><button class="btn ghostdark small" data-act="sellgood" data-k="${k}" ${n ? '' : 'disabled'}>Sell ${n ? chip(IC.coin, n*sp) : ''}</button><button class="btn gold small" data-act="buygood" data-k="${k}" ${room && S.gold >= p && canBuyGood(h, k) ? '' : 'disabled'}>Buy</button></div></div>`; }).join('');
  return card('Trade goods', `${rows}<p class="note">Every harbor makes one good cheaply and pays well for another. Buy where it's made, sell where it's wanted. Room in your hold: ${room}.</p>`);
}
function jobsTab(h){
  const mine = active(), full = mine.length >= REQUESTS.max;
  const ready = mine.map((r, i) => canDeliver(r, h) ? `<div class="job ready"><span class="jic">${JOB_IC[r.t]()}</span><div><b>${r.text}</b><small>${r.who}</small></div><button class="btn gold" data-act="deliver" data-i="${i}">Hand over ${chip(IC.coin, '+' + r.gold)}</button></div>` : '').join('');
  const offers = board().map((r, i) => `<div class="job"><span class="jic">${JOB_IC[r.t]()}</span><div><b>${r.text}</b><small>${r.who}</small><span class="reward">${chip(IC.coin, '+' + r.gold)}</span></div>
      <div class="btnrow tight"><button class="btn ghostdark" data-act="decline" data-i="${i}" aria-label="Turn it down">✕</button><button class="btn gold" data-act="accept" data-i="${i}" ${full ? 'disabled' : ''}>Take</button></div></div>`).join('');
  return (ready ? card('Ready to hand over', ready, 'hi') : '')
    + card(`Request board · ${mine.length} of ${REQUESTS.max} taken`, `${offers}${full ? '<p class="note">You have two jobs. Finish or drop one to take another.</p>' : ''}`)
    + card('Your jobs', myJobs())
    + plansCard(); // P60: the ship plan clues live in the harbor
}
function myJobs(){
  const S = G.S, jobs = active();
  const prog = r => r.t === 'deliver' ? Math.min(1, (S.cargo[r.kind] || 0)/r.n) : (r.got || 0)/r.n;
  const txt = r => r.t === 'deliver' ? `${Math.min(r.n, S.cargo[r.kind] || 0)} of ${r.n} aboard · hand over in ${r.to}` : `${r.got || 0} of ${r.n}`;
  return jobs.map((r, i) => `<div class="job"><span class="jic">${JOB_IC[r.t]()}</span><div><b>${r.text}</b><small>${r.who} · ${txt(r)}</small>${bar(prog(r))}</div>
      <div class="btnrow tight"><span class="reward">${chip(IC.coin, '+' + r.gold)}</span><button class="btn ghostdark" data-act="drop" data-i="${i}">Drop</button></div></div>`).join('')
    || '<p class="note">No jobs yet. Every harbor has a request board.</p>';
}
function repairCard(){
  const S = G.S, sh = ship(), dmg = sh.hull - Math.ceil(S.hull), cost = Math.ceil(dmg/TUNING.repairPerGold);
  return card('Dry dock', `<div class="line">${IC.hull}<div><b>Hull ${Math.ceil(S.hull)} / ${sh.hull}</b>${bar(S.hull/sh.hull, S.hull/sh.hull < .35 ? 'low' : '')}<small>1 drachma patches ${TUNING.repairPerGold} hull</small></div>
    <button class="btn ${dmg > 0 ? 'gold' : ''}" data-act="repair" ${dmg > 0 && S.gold > 0 ? '' : 'disabled'}>${dmg > 0 ? `Repair ${chip(IC.coin, Math.min(cost, S.gold))}` : 'Sound'}</button></div>`);
}
function dockTab(){ return repairCard() + (founded() && (G.S.crew || []).length ? card('Your sailors', sailorRows(false)) : ''); }

// ---- the shipyard: your fleet, repairs, upgrades, paint ----
// P54: what the shipwrights can do for a ship you don't have yet: collect its plan pieces, study them, build it.
// Times count down live (ui.js fills any [data-until] with the time left). A video takes 10 minutes off.
const video = kind => `<button class="btn ghostdark small" data-act="video" data-k="${kind}">${IC.play || '▶'} Watch a video: 10 min faster</button>`;
function yardAct(t, sh){
  const S = G.S, P = PLANS[t], n = piecesOf(t);
  if (S.build && S.build.t === t) return `<span class="tag on">Building · <b data-until="${S.build.until}">${mmss(timeLeft(S.build))}</b> left</span>${video('build')}`;
  if (S.study && S.study.t === t) return `<span class="tag on">Studying the plans · <b data-until="${S.study.until}">${mmss(timeLeft(S.study))}</b> left</span>${video('study')}`;
  if (studied(t)){ const ok = canPay(sh.cost) && !S.build;
    return `<div class="cost">${costChips(sh.cost)}</div><button class="btn gold" data-act="build" data-t="${t}" ${ok ? '' : 'disabled'}>Build (${span(P.build)})</button>${S.build ? '<small>The slipway is busy with another ship.</small>' : ''}`; }
  if (allPieces(t)) return `<button class="btn gold" data-act="study" data-t="${t}" ${S.study ? 'disabled' : ''}>Study the plans (${span(P.study)})</button>${S.study ? '<small>The shipwrights are studying other plans.</small>' : ''}`;
  return `<span class="tag">Plans: ${n} of ${P.pieces}</span><small>Clues in your bag</small>`;
}
// where each ship's plans come from (the camps in config CAMPS, and the pirate fortresses)
const PLANS_FROM = {1:'From the bandit camp on Ikaria', 2:'From the bandit camps on Tinos and Syros', 3:'From the Ios bandit camp and the pirate fortresses of Thasos and Kos', 7:'From the fortresses of Athens and Sparta'};
function yardTab(){
  const S = G.S, own = owned();
  const fleet = SHIPS.map((sh, t) => {
    if (sh.captured && !own.includes(t)) return ''; // bandit ships are only taken, never built
    const mine = own.includes(t), on = t === S.tier, lk = mine ? {...((S.looks || {})[t] || {}), ...(on ? S.look : {}), ram:on ? lvl('ram') : undefined, men:men(t)} : {men:sh.men[0]};
    let act = '';
    if (on) act = '<span class="tag on">Sailing</span>';
    else if (mine){ const why = cantSwitch(t), c = captainOf(t);
      const cap = c ? `<div class="cap">${peg('#2f5f8a', true)}<div><b>${c.n}</b><small>${c.out ? `Out fishing · back in ${clock(c.t)}` : `In port · sails in ${clock(c.t)}`} · ${tripPay(t)} drachmae a trip</small></div></div>`
        : `<button class="btn ghostdark" data-act="captain" data-t="${t}" ${G.S.gold >= captainCost() ? '' : 'disabled'}>Hire a captain ${chip(IC.coin, captainCost())}</button><small>They fish with it and bring back about ${tripPay(t)} drachmae every few minutes. Each captain costs more than the last.</small>`;
      act = `${cap}<button class="btn" data-act="switch" data-t="${t}" ${why ? 'disabled' : ''}>${c && c.out ? 'At sea' : 'Sail this'}</button>`; }
    else if (sh.locked) act = '<span class="tag">Coming later</span>';
    else act = yardAct(t, sh);
    return `<div class="fship ${on ? 'on' : ''} ${!mine && sh.locked ? 'dim' : ''}">${shipImg(sh.model, lk)}<b>${sh.name}</b><small>${sh.desc || 'Your first boat.'}</small>
      <div class="stats">${IC.hull}${sh.hull}${IC.speed}${sh.speed}${IC.hold}${sh.hold}${IC.crew}${sh.men[0]}/${sh.men[1]}</div>${act}</div>`;
  }).join('');
  const purse = S.purse ? card("Captains' purse", `<div class="line">${IC.coin}<div><b>${S.purse} drachmae</b><small>What your captains brought back from their trips.</small></div><button class="btn gold" data-act="collect">Collect</button></div>`, 'hi') : '';
  // repairs first, then upgrades for the ship you sail, then your fleet
  return repairCard() + warehouseCard() + upgradesCard() + purse + card('Your fleet', `<div class="fleet">${fleet}</div><p class="note">Every ship you build stays yours, moored here with its own upgrades. Switch any time you're in Kallisto.</p>`)
    + looksCard();
}
// P61: the Kallisto warehouse: how full it is, and its next level
function warehouseCard(){
  const S = G.S, lv = S.wareLv || 0, nx = WAREHOUSE[lv + 1], cap = WAREHOUSE[lv].cap;
  const row = (k, ic) => { const n = have(k), c = cap[k]; return `<div class="wrow"><span class="uic">${ic}</span><span class="pbar ${n >= c ? 'full' : ''}"><i style="width:${Math.min(100, n/c*100)}%"></i></span><b>${n}/${c}</b></div>`; };
  return card(`Warehouse · level ${lv + 1}`, `${row('wood', IC.wood)}${row('bronze', IC.bronze)}${row('linen', IC.linen)}
    ${nx ? `<div class="btnrow"><div class="cost">${costChips(nx.cost)}</div><button class="btn gold" data-act="wareup" ${canPay(nx.cost) ? '' : 'disabled'}>Bigger warehouse</button></div>` : ''}`);
}
// The upgrade stage: your ship in the middle, upgrade slots around it (tap one to see it), its details below.
export const sel = {up:'hull'};
function upgradesCard(){
  const S = G.S, keys = upKeys();
  if (!keys.includes(sel.up)) sel.up = keys[0];
  const slot = k => { const l = lvl(k), m = k === 'ram' ? ramMat(l) : null, c = costOf(k), ok = canPay(c);
    return `<button class="slot ${k === sel.up ? 'on' : ''} ${ok ? 'can' : ''}" data-act="selup" data-k="${k}" aria-label="${UPGRADES[k].label}">${UP_IC[k]()}<span class="slab">${UP_NAME[k] || UPGRADES[k].label}</span><span class="badge">${k === 'ram' ? (m ? m.name[0] + m.sub : 0) : l}</span>${ok ? '<i class="plus">+</i>' : ''}</button>`; };
  const left = keys.slice(0, Math.ceil(keys.length/2)), right = keys.slice(Math.ceil(keys.length/2));
  const k = sel.up, u = UPGRADES[k], l = lvl(k), c = costOf(k), ok = canPay(c), m = k === 'ram' ? ramMat(l) : null;
  const short = l => k === 'ram' ? (ramMat(l) ? `${ramDmg(l)} damage` : 'no ram') : effectText(k, l);
  const next = c ? short(l + 1) : '';
  const detail = `<div class="updetail"><div class="uh"><span class="uic">${UP_IC[k]()}</span><div><b>${u.label}</b><span class="lv">${k === 'ram' ? (m ? `${m.name} ram · level ${m.sub} of 5` : 'No ram yet') : `Level ${l} of ${maxOf(k)}`}</span></div></div>
      ${pips(k === 'ram' ? (m ? m.sub : 0) : l, k === 'ram' ? RAM.lv : maxOf(k))}${k === 'ram' ? `<span class="mats">${['Wood', 'Bronze', 'Gold'].map((n, i) => `<i class="${m && m.i >= i ? 'on' : ''}" style="--c:${['#8a5a30', '#b07f3c', '#e3b341'][i]}">${n}</i>`).join('')}</span>` : ''}
      <small>${u.desc}.${u.ship ? ' Stays with this ship.' : ' Comes with you to any ship.'}</small>
      <p class="eff"><span>Now: ${short(l)}</span>${c ? ` → <b>${next}</b>` : ''}</p>
      ${c ? `<div class="btnrow"><div class="cost">${costChips(c)}</div><button class="btn ${ok ? 'gold' : ''}" data-act="upgrade" data-k="${k}" ${ok ? '' : 'disabled'}>Upgrade</button></div>` : '<span class="tag on">Fully upgraded</span>'}</div>`;
  return card(`Upgrades · ${ship().name}`, `<div class="stage"><div class="slots">${left.map(slot).join('')}</div><div class="hero">${shipImg(ship().model, {...S.look, ram:lvl('ram'), sailLv:lvl('sail'), men:men()})}</div><div class="slots">${right.map(slot).join('')}</div></div>${detail}
    <p class="note">Paid with materials from the Kallisto warehouse and drachmae. A + means you can afford the next level.</p>`);
}
// P62: paint, sail and flag as pictures to tap (not text lists): a little hull in each paint, a sail in each pattern, each god's pennant
const paintSw = p => `<svg viewBox="0 0 48 26"><path d="M2 6 H46 C44 16 36 22 24 22 C12 22 4 16 2 6Z" fill="${p.top}"/><path d="M4 11 H44" stroke="${p.panel}" stroke-width="3.4"/><path d="M8.6 17 C13 20.4 18 21.6 24 21.6 C30 21.6 35 20.4 39.4 17Z" fill="${p.bottom}"/><rect x="1" y="4.4" width="46" height="2.6" rx="1.3" fill="${p.wale}"/></svg>`;
const sailSw = sl => { const st = sl.stripes, w = 30/st.length; return `<svg viewBox="0 0 40 34"><path d="M20 2 V32" stroke="#8a5a30" stroke-width="2"/><path d="M4 4 H36" stroke="#8a5a30" stroke-width="2" stroke-linecap="round"/>
  <clipPath id="sc${st.join('').replace(/#/g, '')}"><path d="M5 5 H35 C36.5 14 36 22 33 29 H7 C4 22 3.5 14 5 5Z"/></clipPath><g clip-path="url(#sc${st.join('').replace(/#/g, '')})">${st.map((c, i) => `<rect x="${5 + i*w}" y="4" width="${w + .4}" height="26" fill="${c}"/>`).join('')}</g>
  <path d="M5 5 H35 C36.5 14 36 22 33 29 H7 C4 22 3.5 14 5 5Z" fill="none" stroke="${sl.border || 'rgba(60,40,20,.35)'}" stroke-width="${sl.border ? 2.4 : 1}"/></svg>`; };
const flagSw = g => g.bg ? `<svg viewBox="0 0 40 30"><path d="M5 3 V28" stroke="#8a5a30" stroke-width="2.2" stroke-linecap="round"/><path d="M6 4 H35 L29 11.5 L35 19 H6Z" fill="${g.bg}"/><circle cx="17" cy="11.5" r="4.2" fill="${g.fg}"/></svg>`
  : `<svg viewBox="0 0 40 30"><path d="M5 3 V28" stroke="#8a5a30" stroke-width="2.2" stroke-linecap="round"/><path d="M10 9 L22 21 M22 9 L10 21" stroke="#c9b48e" stroke-width="2.4" stroke-linecap="round"/></svg>`;
function looksCard(){
  const spec = SPECS[ship().model], lk = {...spec.look, ...G.S.look};
  const pick = (k, obj, sel, draw) => `<div class="swatches">${Object.entries(obj).filter(([, v]) => !v.city && !v.hidden).map(([v, o]) => `<button class="sw ${v === sel ? 'on' : ''}" data-act="look" data-k="${k}" data-v="${v}" aria-label="${o.name}">${draw(o)}<small>${o.name}</small></button>`).join('')}</div>`;
  return card('Paint and flag', `${shipImg(ship().model, {...G.S.look, ram:lvl('ram'), sailLv:lvl('sail'), men:men()})}
    <h4 class="swh">Hull</h4>${pick('paint', PAINTS, lk.paint, paintSw)}
    <h4 class="swh">Sail</h4>${spec.mast || lvl('sail') ? pick('sail', SAILS, lk.sail, sailSw) : '<p class="note">Your boat needs a sail first (Sail upgrade).</p>'}
    <h4 class="swh">Flag</h4>${founded() ? pick('flag', GODS, lk.flag, flagSw) : '<p class="note">Found a crew first (Crew tab).</p>'}`);
}

// ---- crew ----
function crewTab(){
  const S = G.S, c = layout(), sh = ship();
  const crewCard = card(`Crew of your ${sh.name.toLowerCase()} · ${men()} of ${sh.men[1]}`, `<div class="stats big">${IC.archer} ${fighters()} ${c.archers ? 'archers' : 'with bows'} ${IC.rower} ${c.rowers} rowers ${IC.crew} ${men()} men</div>
    <p class="note">Each ship has its own crew. Hire more with the Crew upgrade at the Kallisto shipyard: rowers make it faster, archers hit harder, and everyone helps when you fish.</p>`);
  if (!founded() && owned().length < 2) return crewCard + card('Name your crew', `<div class="line">${IC.crew}<div><b>Not yet</b><small>Build your second ship at the shipyard. Then you can name your crew and fly a god's flag.</small></div></div>`);
  const gods = Object.entries(GOD_BLESSINGS).map(([k, b]) => `<option value="${k}">${GODS[k].name}: ${b.desc}</option>`).join('');
  if (!founded()) return crewCard + card('Found your crew', `<p class="note">Name your crew and choose a god. Their flag flies on your ships and brings a blessing.</p>
    <div class="looks one"><label><span>Crew name</span><input id="crewName" maxlength="24" placeholder="The Sea Swallows"></label><label><span>God</span><select id="crewGod">${gods}</select></label></div>
    <div class="btnrow"><div class="cost">${chip(IC.coin, CREW.foundCost, S.gold >= CREW.foundCost)}</div><button class="btn gold" data-act="found" ${S.gold >= CREW.foundCost ? '' : 'disabled'}>Found the crew</button></div>`);
  const b = blessing(), god = GODS[S.look.flag];
  return card(S.crewName, `<div class="line"><span class="emb" style="background:${god ? god.bg : '#ccc'}">${IC.bless}</span><div><b>Flag of ${god ? god.name : 'none'}</b><small>${b.desc || 'No blessing'}. Change the flag in the shipyard.</small></div></div>`) + crewCard;
}

// ---- the war council at a friendly city's fortress ----
const adjOf = c => c === 'athens' ? 'Athenian' : 'Spartan';
const warText = o => o.t === 'fort' ? `Knock down ${o.n > 1 ? o.n + ' ' : 'an '}${adjOf(o.foe)} fortress${o.n > 1 ? 'es' : ''}`.replace('an Spartan', 'a Spartan') : `Sink ${o.n} ${adjOf(o.foe)} warships`;
export function councilHTML(f){
  const S = G.S, c = f.city, foe = rival(c), w = S.war;
  let body;
  if (w){ const done = w.got >= w.n, here = w.city === c;
    body = card('Your war contract', `<div class="job ${done ? 'ready' : ''}"><span class="jic">${IC.swords}</span><div><b>${warText(w)}</b><small>For ${CITIES[w.city].name} · ${Math.min(w.got, w.n)} of ${w.n}</small>${bar(w.got/w.n)}</div>
      <div class="btnrow tight">${done && here ? `<button class="btn gold" data-act="warclaim">Claim ${chip(IC.coin, '+' + w.gold)}</button>` : `<span class="reward">${chip(IC.coin, '+' + w.gold)}</span><button class="btn ghostdark" data-act="wardrop">Drop</button>`}</div></div>
      ${done && !here ? `<p class="note">Hand it in at any ${adjOf(w.city)} fortress.</p>` : !done ? `<p class="note">Warships of ${CITIES[w.foe].name} sail around their islands. Guard ships at fortresses count too.</p>` : ''}`, done ? 'hi' : ''); }
  else body = card(`Contracts from ${CITIES[c].name}`, WAR.offers.map((o, i) => `<div class="job"><span class="jic">${IC.swords}</span><div><b>${warText({...o, foe})}</b><small>The ${adjOf(c)} commander pays when it's done.</small><span class="reward">${chip(IC.coin, '+' + o.gold)}</span></div>
      <button class="btn gold" data-act="wartake" data-i="${i}">Take</button></div>`).join('') + '<p class="note">One war contract at a time. Sinking their ships makes that city hunt you, so watch out.</p>');
  const held = k => ISLANDS.filter(i => i.city === k).length;
  return `<div class="mtop">${top(`${f.isle.name}<small>${CITIES[c].name}'s fortress</small>`)}</div><div class="mbody">${body}
    ${card('The war', `<div class="stats big"><span class="emb" style="background:${CITIES.athens.color};width:22px;height:22px"></span> Athens ${held('athens')} islands · <span class="emb" style="background:${CITIES.sparta.color};width:22px;height:22px"></span> Sparta ${held('sparta')} islands</div>`)}</div>`;
}

// ---- the bag ----
export function bagHTML(){
  const list = [['hold', 'Hold', IC.hold], ['ship', 'Ship', IC.ship], ['jobs', 'Jobs', IC.jobs], ['world', 'World', IC.world]];
  const t = tabs.inv, body = t === 'ship' ? shipTab() : t === 'jobs' ? bagJobs() : t === 'world' ? worldTab() : holdTab();
  return `<div class="mtop">${top('Your bag')}${res()}${tabBar(list, t, 'inv')}</div><div class="mbody">${body}</div>`;
}
function holdTab(){
  const S = G.S, sh = ship(), used = holdUsed();
  const tile = (icon, name, n, k) => `<div class="tile ${n ? '' : 'dim'}">${icon}<b>${name}</b><span class="n">× ${n}</span>${k && n ? `<button class="btn ghostdark small" data-act="toss" data-k="${k}">Throw 1</button>` : ''}</div>`;
  const gu = usedOf('goods'), gc = capOf('goods'), wu = S.cargo.wood || 0, bu = S.cargo.bronze || 0, lu = S.cargo.linen || 0;
  return card(`Fish · ${used} of ${sh.hold}`, `${bar(used/sh.hold)}<div class="tiles">${Object.entries(FISH).map(([k, f]) => tile(IC.fish(FISH_COLOR[k]), f.label, S.cargo[k] || 0, k)).join('')}</div>
      <p class="note">Sell fish at any harbor.</p>`)
    + card('Aboard', `<div class="tiles">${tile(IC.wood, 'Wood', wu)}${tile(IC.bronze, 'Bronze', bu)}${tile(IC.linen, 'Linen', lu)}</div><p class="note">Each kind has its own space. Dock at any harbor and it's shipped to the Kallisto warehouse.</p>`)
    + card(`Trade goods · ${gu} of ${gc}`, `${bar(gu/gc)}<div class="tiles">${Object.entries(GOODS).map(([k, g]) => tile(GOOD_IC(k), g.label, S.cargo[k] || 0, S.cargo[k] ? k : null)).join('')}</div>`)
    + card(`Warehouse at Kallisto · level ${(S.wareLv || 0) + 1}`, `<div class="tiles">${tile(IC.wood, 'Wood', `${S.ware}/${wareCap('wood')}`)}${tile(IC.bronze, 'Bronze', `${S.bronze || 0}/${wareCap('bronze')}`)}${tile(IC.linen, 'Linen', `${S.linen || 0}/${wareCap('linen')}`)}</div>`);
}
function shipTab(){
  const S = G.S, sh = ship(), bl = S.bless || 0;
  const ups = upKeys().map(k => `<div class="uprow"><span class="uic">${UP_IC[k]()}</span><span>${UPGRADES[k].label}</span>${pips(k === 'ram' ? (ramMat() ? ramMat().sub : 0) : lvl(k), k === 'ram' ? RAM.lv : maxOf(k))}</div>`).join('');
  return card(sh.name, `${shipImg(sh.model, {...S.look, ram:lvl('ram'), men:men()})}
      <div class="line">${IC.hull}<div><b>Hull ${Math.ceil(S.hull)} / ${sh.hull}</b>${bar(S.hull/sh.hull, S.hull/sh.hull < .35 ? 'low' : '')}</div></div>
      <div class="stats big">${IC.speed} ${sh.speed} ${IC.hold} ${sh.hold} ${IC.archer} ${fighters()} ${IC.rower} ${layout().rowers} ${IC.crew} ${men()}/${sh.men[1]}</div>
      <p class="note">${sh.storm ? 'Big waves in the Open Sea wear this ship down.' : 'Shrugs off the big waves of the Open Sea.'}</p>`)
    + card('Upgrades', `${ups}<p class="note">Upgrade at the Kallisto shipyard.</p>`)
    + (bl ? card("Poseidon's blessing", `<div class="line">${IC.bless}<div><b>${Math.floor(bl/60)}:${String(Math.floor(bl % 60)).padStart(2, '0')} left</b><small>Faster sailing and quicker work</small></div></div>`) : '');
}
// Ship plans still to find, with a clue for each piece
function plansCard(){ const list = planClues(); if (!list.length) return '';
  return card('Ship plans', list.map(p => `<div class="job"><span class="jic">${IC.map}</span><div><b>${SHIPS[p.t].name}: ${p.have} of ${p.need}</b>${p.clues.map(c => `<small>${c}</small>`).join('')}</div></div>`).join('')); }
function bagJobs(){
  const S = G.S, g = goal(), tr = S.treasure;
  return (g ? card(g.chapter ? `Chapter one · goal ${(S.goal || 0) + 1 - STARTER_GOALS} of ${GOALS.length - STARTER_GOALS}` : `First voyage · goal ${(S.goal || 0) + 1} of ${STARTER_GOALS}`, `<div class="job"><span class="jic">${IC.star}</span><div><b>${g.text}</b>${g.n > 1 ? bar((S.goalN || 0)/g.n) : ''}<small>${g.n > 1 ? `${S.goalN || 0} of ${g.n} · ` : ''}reward</small></div><span class="reward">${chip(IC.coin, '+' + g.gold)}</span></div>`) : '')
    + (S.lastDone && Date.now() - S.lastDone.t < 600000 ? card('Just done', `<div class="job ready"><span class="jic">${IC.check || '✓'}</span><div><b>${S.lastDone.text}</b></div><span class="reward">${chip(IC.coin, '+' + S.lastDone.gold)}</span></div>`, 'hi') : '')
    + card(`Your jobs · ${active().length} of ${REQUESTS.max}`, myJobs() + (active().some(r => r.to) ? '<p class="note">The islands they send you to have a dashed red ring on the chart.</p>' : ''))
    + (S.war ? card('War contract', `<div class="job"><span class="jic">${IC.swords}</span><div><b>${warText(S.war)}</b><small>For ${CITIES[S.war.city].name} · ${Math.min(S.war.got, S.war.n)} of ${S.war.n}</small>${bar(S.war.got/S.war.n)}</div><span class="reward">${chip(IC.coin, '+' + S.war.gold)}</span></div>`) : '')
    + (tr ? card('Treasure map', `<div class="line">${IC.map}<div><b>${tr.land ? `Buried on a beach${tr.name ? ` of ${tr.name}` : ''}` : 'Floating out at sea'}</b><small>The red X on your chart. ${tr.land ? 'Sail up close to the beach to dig it out.' : 'Sail over it.'}</small></div></div>`) : '');
}
function worldTab(){
  const held = c => ISLANDS.filter(i => i.city === c).length, hunt = G.hunted || {};
  const city = c => `<div class="line"><span class="emb" style="background:${CITIES[c].color}">${IC.swords}</span><div><b>${CITIES[c].name}</b><small>${held(c)} islands</small></div><span class="tag ${hunt[c] ? 'bad' : 'on'}">${hunt[c] ? 'Hunting you' : 'Leaves you alone'}</span></div>`;
  return card('The war', `${city('athens')}${city('sparta')}<p class="note">Raid a city's ships and only that city's navy comes after you, if they see it. To take an island: knock down its fortress, sink its guard ships, then hold the bay until the other city's flag goes up. Its fortress is rebuilt for the new owner.</p>`)
    + (founded() ? card(G.S.crewName, `<p class="note">Flag of ${(GODS[G.S.look.flag] || {name:'none'}).name}${blessing().desc ? `. Blessing: ${blessing().desc}` : ''}</p>`) : '');
}
