// The harbor and bag screens: tabs with drawn icons, picture cards, costs shown as coins and logs.
// ui.js owns opening, closing and the button actions; this file only draws.
import {SHIPS, FISH, TUNING, CREW, GOD_BLESSINGS, TIMBER, LINEN, BRONZE, REQUESTS, GOALS, STARTER_GOALS, UPGRADES, CAPTAIN, GOODS, TRADE, WAR, FREEPORT} from './config.js?v=6731910';
import {ISLANDS, CITIES, HARBORS, rival} from './world.js?v=6731910';
import {G, ship, holdUsed, lvl, have, canPay} from './state.js?v=6731910';
import {PAINTS, SAILS, GODS, SPECS} from './ships.js?v=6731910';
import {founded, blessing, seats, candidates, aboard, fighters, hired} from './crew.js?v=6731910';
import {board, active, canDeliver, goal} from './quests.js?v=6731910';
import {costOf, effectText, maxOf, ramMat, ramDmg, upKeys} from './upgrades.js?v=6731910';
import {shipPortrait} from './portrait.js?v=6731910';
import {owned, cantSwitch, captainOf, clock, tripPay, captainCost} from './fleet.js?v=6731910';

const INK = '#22283a', OCHRE = '#d48a2a', WOOD = '#a3754a', SEA = '#2f7f9a';
const svg = (body, vb = 24) => `<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true">${body}</svg>`;
// ---- icons: small drawings in the game's colors ----
export const IC = {
  // a book of quests: a red leather cover, cream pages and a ribbon
  book: svg(`<path d="M4 5.5 Q4 4 5.5 4 H18.5 a1 1 0 0 1 1 1 V18 H6 a2 2 0 0 0 0 4 H19.5" fill="none" stroke="#3a2618" stroke-width="1.3"/><path d="M4 5.5 Q4 4 5.5 4 H18.5 a1 1 0 0 1 1 1 V18 H6 Q4 18 4 20Z" fill="#b8402f" stroke="#3a2618" stroke-width="1.2"/><path d="M6 18 H19.5 V21.5 H6 a1.75 1.75 0 0 1 0 -3.5Z" fill="#f3e3b8" stroke="#3a2618" stroke-width="1.2"/><path d="M8 7.5 H16 V11 H8Z" fill="#e8c867"/><path d="M15 4 V9 L16.3 8 L17.6 9 V4" fill="#e8c867"/>`),
  // a silver drachma: the owl of Athena on a worn silver coin
  coin: svg(`<circle cx="12" cy="12.8" r="9.6" fill="#8d949b"/><circle cx="12" cy="12" r="9.6" fill="#d5dade"/><circle cx="12" cy="12" r="7.6" fill="#c3c9ce"/><path d="M8.2 16.5 Q7.6 9 12 7.4 Q16.4 9 15.8 16.5 Q12 18 8.2 16.5Z" fill="#9aa1a8"/><circle cx="10.3" cy="10.9" r="1.7" fill="#eef1f3"/><circle cx="13.7" cy="10.9" r="1.7" fill="#eef1f3"/><circle cx="10.3" cy="10.9" r=".8" fill="#3c4148"/><circle cx="13.7" cy="10.9" r=".8" fill="#3c4148"/><path d="M11.4 12.6 L12 13.6 L12.6 12.6Z" fill="#7a5a2a"/>`),
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
  hold: svg(`<path d="M3.5 10 h17 v9.5 a1.5 1.5 0 0 1 -1.5 1.5 h-14 a1.5 1.5 0 0 1 -1.5 -1.5Z" fill="#b5793f" ${OL}/><path d="M3.5 10 Q3.5 4 12 4 Q20.5 4 20.5 10Z" fill="#d49a58" ${OL}/><path d="M7 4.8 V21 M17 4.8 V21" stroke="#e3b341" stroke-width="2"/><rect x="10" y="8.5" width="4" height="5" rx="1" fill="#e3b341" ${OL}/><path d="M5.5 6.5 Q8 5.2 11 5" stroke="#f3cf95" stroke-width="1.2" fill="none"/>`),
  hull: svg(`<path d="M12 2.5 L20.5 5.5 V12 Q20.5 18.5 12 21.5 Q3.5 18.5 3.5 12 V5.5Z" fill="#c98a4b" ${OL}/><path d="M4 9.5h16M4 14h16M6 18h12" stroke="#8a5a30" stroke-width="1.3"/><path d="M12 2.8 V21.2" stroke="#8a5a30" stroke-width="1.2"/><path d="M6 6.6 L11 4.8" stroke="#f0c48a" stroke-width="1.4" stroke-linecap="round"/>`),
  map: svg(`<path d="M3 5.5 L8.5 3.5 L15.5 5.5 L21 3.5 V18.5 L15.5 20.5 L8.5 18.5 L3 20.5Z" fill="#f3e3b8" ${OL}/><path d="M8.5 3.8V18.5M15.5 5.5V20.2" stroke="#c9ad74" stroke-width="1"/><path d="M5.5 15.5 Q9 9 12.5 12 T16.5 8.5" stroke="#3f6c94" stroke-width="1.5" stroke-dasharray="1.6 1.5" fill="none"/><path d="M15.8 6.2 l3.2 3.2 m0 -3.2 l-3.2 3.2" stroke="#c64a3c" stroke-width="2.2" stroke-linecap="round"/>`),
  gear: svg(`${teeth}<circle cx="12" cy="12" r="7" fill="#8fa3b5" ${OL}/><circle cx="12" cy="12" r="3" fill="#e9d9b4" ${OL}/><path d="M7.8 9.5 A5 5 0 0 1 10.5 7.2" stroke="#d7e2ea" stroke-width="1.4" fill="none" stroke-linecap="round"/>`),
  market: svg(`<rect x="4.5" y="10" width="15" height="10.5" fill="#efd9a6" ${OL}/><path d="M3 10 L5 4 H19 L21 10Z" fill="#d6503f" ${OL}/><path d="M7.8 4.4 L7.2 10 M11.6 4.4 V10 M15.3 4.4 L15.9 10" stroke="#fbf3df" stroke-width="2.2"/><path d="M3 10 q1.5 2.2 3 0 q1.5 2.2 3 0 q1.5 2.2 3 0 q1.5 2.2 3 0 q1.5 2.2 3 0 q1.5 2.2 3 0" fill="#d6503f" ${OL}/><rect x="9.5" y="14" width="5" height="6.5" fill="#8a5a30" ${OL}/>`),
  jobs: svg(`<path d="M6 21.5 L7 17 M18 21.5 L17 17" stroke="#2a1d17" stroke-width="1.8" stroke-linecap="round"/><rect x="3" y="3.5" width="18" height="14" rx="1.5" fill="#a86f3c" ${OL}/><rect x="5.3" y="5.8" width="6.2" height="8" fill="#fbf3df" ${OL} transform="rotate(-6 8.4 9.8)"/><rect x="12.6" y="6.2" width="6" height="6.5" fill="#f3d27a" ${OL} transform="rotate(6 15.6 9.4)"/><circle cx="8.4" cy="6.2" r="1.1" fill="#d6503f"/><circle cx="15.6" cy="6.6" r="1.1" fill="#3f6c94"/><path d="M6.5 9.5h3.6M6.7 11.5h3" stroke="#8a7a60" stroke-width=".9"/>`),
  yard: svg(`<path d="M3 15 Q12 21.5 21 15 L19.6 12.5 H4.4Z" fill="#b5793f" ${OL}/><path d="M12 3 V12.5" stroke="#6e3d1e" stroke-width="1.8"/><path d="M12.6 4 L18.5 11 H12.6Z" fill="#fbf3df" ${OL}/><path d="M12.6 7.5 L15.5 11" stroke="#d6503f" stroke-width="1.6"/><path d="M4 21 L7 17.5 M20 21 L17 17.5" stroke="#6e4a2a" stroke-width="2" stroke-linecap="round"/><rect x="1.5" y="20" width="21" height="2" rx="1" fill="#3f8fb0" ${OL}/>`),
  crew: svg(`<path d="M3.6 21.5 Q3.2 13 8 13 Q12.8 13 12.4 21.5Z" fill="#3f6c94" ${OL}/><circle cx="8" cy="9" r="3.6" fill="#e9b88f" ${OL}/><path d="M4.6 8 Q8 2.5 11.4 8Z" fill="#c9922e" ${OL}/><path d="M11.6 21.5 Q11.2 14 16 14 Q20.8 14 20.4 21.5Z" fill="#d6503f" ${OL}/><circle cx="16" cy="10.2" r="3.4" fill="#e9b88f" ${OL}/><path d="M12.8 9.6 Q16 6 19.2 9.6 Q16 8 12.8 9.6Z" fill="#4a3022"/>`),
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
// trade goods: an amphora (wine, oil), a painted pot, a shard of black obsidian
export const GOOD_IC = k => k === 'obsidian' ? svg(`<path d="M6 19 L9 6 L15 3 L19 11 L14 21Z" fill="#2c2a33"/><path d="M9 6 L15 3 L13 12Z" fill="#4c4a58"/>`)
  : k === 'pottery' ? svg(`<path d="M7 5 h10 l-1 3 q5 3 3 9 q-2 4 -7 4 q-5 0 -7 -4 q-2 -6 3 -9Z" fill="#c46a3a"/><path d="M5.5 13 h13" stroke="${INK}" stroke-width="1.6"/><path d="M8 16 h8" stroke="${INK}" stroke-width="1" stroke-dasharray="2 1.5"/>`)
  : svg(`<path d="M10 2 h4 v3 q4 2 4 8 q0 6 -6 9 q-6 -3 -6 -9 q0 -6 4 -8Z" fill="${GOODS[k].color}"/><path d="M8 7 q-3 0 -3 3 M16 7 q3 0 3 3" stroke="${GOODS[k].color}" stroke-width="1.6" fill="none"/>`);
export const goodPrice = (h, k) => Math.round(GOODS[k].base*(h.free ? FREEPORT.goods : TRADE.makes[h.is.name] === k ? TRADE.made : TRADE.wants[h.is.name] === k ? TRADE.wanted : 1));
export const canBuyGood = (h, k) => !GOODS[k].rare || !!h.free;
export const goodSell = (h, k) => Math.round(goodPrice(h, k)*TRADE.sellK);
const JOB_IC = {catch:() => IC.fish(), deliver:() => IC.hold, salvage:() => IC.wreck, wood:() => IC.wood, visit:() => IC.letter, sink:() => IC.swords};
const UP_IC = {fire:() => IC.flame, sail:() => IC.sail, helm:() => IC.helm, hull:() => IC.hull, oars:() => IC.rower, seats:() => IC.seats, arrows:() => IC.arrows, ram:() => IC.ram((ramMat(lvl('ram') + 1) || ramMat(lvl('ram')) || {color:'#8a5a30'}).color)};
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
  const ram = lk.ram > 0 ? `<path d="M${x1 - 2} ${y - H*.25} L${x1 + 10} ${y - H*.1} L${x1 - 2} ${y + 2}Z" fill="${['#8a5a30', '#b07f3c', '#e3b341'][Math.min(2, Math.floor((lk.ram - 1)/10))]}"/>` : s.ram && lk.ram === undefined ? `<path d="M${x1 - 2} ${y - H*.25} L${x1 + 10} ${y - H*.1} L${x1 - 2} ${y + 2}Z" fill="#b07f3c"/>` : '';
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
export const top = (title, right) => `<div class="mhead">${xBtn}<h1>${title}</h1>${right || '<span></span>'}</div>`;
// the top line of every menu: drachmae, the warehouse (wood, bronze, linen) and the hold
const res = () => `<div class="res">${chip(IC.coin, G.S.gold)}<span class="ware" title="Warehouse at Kallisto">${chip(IC.wood, G.S.ware)}${chip(IC.bronze, G.S.bronze || 0)}${chip(IC.linen, G.S.linen || 0)}</span><span title="Hold">${chip(IC.hold, `${holdUsed()}/${ship().hold}`)}</span></div>`;
export const card = (title, body, cls = '') => `<section class="card ${cls}">${title ? `<h3>${title}</h3>` : ''}${body}</section>`;

// ---- the harbor ----
export const priceAt = (h, k) => Math.round(FISH[k].price*((h && h.prices[k]) || 1)*(blessing().price || 1));
export const catchValue = h => Object.keys(FISH).reduce((sum, k) => sum + (G.S.cargo[k] || 0)*priceAt(h, k), 0);
// material prices at a harbor: wood per 10, bronze and linen each. Bronze only where a smith sells it (null otherwise).
export const woodPrice = h => h.free ? FREEPORT.wood : TIMBER.at[h.is.name] || TIMBER.price;
export const matPrice = (h, k) => k === 'wood' ? woodPrice(h) : k === 'linen' ? LINEN.at[h.is.name] || LINEN.price : h.free ? BRONZE.free : BRONZE.at[h.is.name] || null;
export const matStep = k => k === 'wood' ? 10 : 1; // wood is sold in bundles of 10
export function harborHTML(h){
  const home = h.is.port, list = home ? [['market', 'Market', IC.market], ['jobs', 'Jobs', IC.jobs], ['yard', 'Shipyard', IC.yard], ['crew', 'Crew', IC.crew]]
    : h.free ? [['market', 'Market', IC.market], ['dock', 'Dock', IC.dock]] : [['market', 'Market', IC.market], ['jobs', 'Jobs', IC.jobs], ['dock', 'Dock', IC.dock]];
  if (!list.some(([k]) => k === tabs.port)) tabs.port = 'market';
  const t = tabs.port, body = t === 'jobs' ? jobsTab(h) : t === 'yard' ? yardTab() : t === 'crew' ? crewTab() : t === 'dock' ? dockTab() : marketTab(h);
  const sub = home ? 'Your home harbor' : h.free ? 'Your free port: cheaper goods, cheap timber, purple dye' : `Flies the flag of ${CITIES[h.is.city].name}`;
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
  const S = G.S, room = Math.max(0, ship().hold - holdUsed());
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
    + card('Your jobs', myJobs());
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
function yardTab(){
  const S = G.S, own = owned();
  const fleet = SHIPS.map((sh, t) => {
    const mine = own.includes(t), on = t === S.tier, lk = mine ? {...((S.looks || {})[t] || {}), ...(on ? S.look : {}), ram:on ? lvl('ram') : undefined} : {};
    let act = '';
    if (on) act = '<span class="tag on">Sailing</span>';
    else if (mine){ const why = cantSwitch(t), c = captainOf(t);
      const cap = c ? `<div class="cap">${peg('#2f5f8a', true)}<div><b>${c.n}</b><small>${c.out ? `Out fishing · back in ${clock(c.t)}` : `In port · sails in ${clock(c.t)}`} · ${tripPay(t)} drachmae a trip</small></div></div>`
        : `<button class="btn ghostdark" data-act="captain" data-t="${t}" ${G.S.gold >= captainCost() ? '' : 'disabled'}>Hire a captain ${chip(IC.coin, captainCost())}</button><small>They fish with it and bring back about ${tripPay(t)} drachmae every few minutes. Each captain costs more than the last.</small>`;
      act = `${cap}<button class="btn" data-act="switch" data-t="${t}" ${why ? 'disabled' : ''}>${c && c.out ? 'At sea' : 'Sail this'}</button>`; }
    else if (sh.locked) act = '<span class="tag">Coming later</span>';
    else if (t === Math.max(...own) + 1){ const ok = canPay(sh.cost); act = `<div class="cost">${costChips(sh.cost)}</div><button class="btn gold" data-act="build" data-t="${t}" ${ok ? '' : 'disabled'}>Build</button>`; }
    else act = '<span class="tag">Build the one before first</span>';
    return `<div class="fship ${on ? 'on' : ''} ${!mine && sh.locked ? 'dim' : ''}">${shipImg(sh.model, lk)}<b>${sh.name}</b><small>${sh.desc || 'Your first boat.'}</small>
      <div class="stats">${IC.hull}${sh.hull}${IC.speed}${sh.speed}${IC.hold}${sh.hold}${IC.archer}${sh.fighters}</div>${act}</div>`;
  }).join('');
  const purse = S.purse ? card("Captains' purse", `<div class="line">${IC.coin}<div><b>${S.purse} drachmae</b><small>What your captains brought back from their trips.</small></div><button class="btn gold" data-act="collect">Collect</button></div>`, 'hi') : '';
  // repairs first, then upgrades for the ship you sail, then your fleet
  return repairCard() + upgradesCard() + purse + card('Your fleet', `<div class="fleet">${fleet}</div><p class="note">Every ship you build stays yours, moored here with its own upgrades. Switch any time you're in Kallisto.</p>`)
    + looksCard();
}
// The upgrade stage: your ship in the middle, upgrade slots around it (tap one to see it), its details below.
export const sel = {up:'hull'};
function upgradesCard(){
  const S = G.S, keys = upKeys();
  if (!keys.includes(sel.up)) sel.up = keys[0];
  const slot = k => { const l = lvl(k), m = k === 'ram' ? ramMat(l) : null, c = costOf(k), ok = canPay(c);
    return `<button class="slot ${k === sel.up ? 'on' : ''} ${ok ? 'can' : ''}" data-act="selup" data-k="${k}" aria-label="${UPGRADES[k].label}">${UP_IC[k]()}<span class="badge">${k === 'ram' ? (m ? m.name[0] + m.sub : 0) : l}</span>${ok ? '<i class="plus">+</i>' : ''}</button>`; };
  const left = keys.slice(0, Math.ceil(keys.length/2)), right = keys.slice(Math.ceil(keys.length/2));
  const k = sel.up, u = UPGRADES[k], l = lvl(k), c = costOf(k), ok = canPay(c), m = k === 'ram' ? ramMat(l) : null;
  const short = l => k === 'ram' ? (ramMat(l) ? `${ramDmg(l)} damage` : 'no ram') : effectText(k, l);
  const next = c ? (k === 'seats' && l % 2 === 0 ? `a seat at level ${l + 2}` : short(l + 1)) : '';
  const detail = `<div class="updetail"><div class="uh"><span class="uic">${UP_IC[k]()}</span><div><b>${u.label}</b><span class="lv">${k === 'ram' ? (m ? `${m.name} ram · level ${m.sub} of 10` : 'No ram yet') : `Level ${l} of ${maxOf(k)}`}</span></div></div>
      ${pips(k === 'ram' ? (m ? m.sub : 0) : l, k === 'ram' ? 10 : maxOf(k))}${k === 'ram' ? `<span class="mats">${['Wood', 'Bronze', 'Drachmae'].map((n, i) => `<i class="${m && m.i >= i ? 'on' : ''}" style="--c:${['#8a5a30', '#b07f3c', '#e3b341'][i]}">${n}</i>`).join('')}</span>` : ''}
      <small>${u.desc}.${u.ship ? ' Stays with this ship.' : ' Comes with you to any ship.'}</small>
      <p class="eff"><span>Now: ${short(l)}</span>${c ? ` → <b>${next}</b>` : ''}</p>
      ${c ? `<div class="btnrow"><div class="cost">${costChips(c)}</div><button class="btn ${ok ? 'gold' : ''}" data-act="upgrade" data-k="${k}" ${ok ? '' : 'disabled'}>Upgrade</button></div>` : '<span class="tag on">Fully upgraded</span>'}</div>`;
  return card(`Upgrades · ${ship().name}`, `<div class="stage"><div class="slots">${left.map(slot).join('')}</div><div class="hero">${shipImg(ship().model, {...S.look, ram:lvl('ram'), sailLv:lvl('sail')})}</div><div class="slots">${right.map(slot).join('')}</div></div>${detail}
    <p class="note">Paid with materials from the Kallisto warehouse and drachmae. A + means you can afford the next level.</p>`);
}
function looksCard(){
  const spec = SPECS[ship().model], lk = {...spec.look, ...G.S.look};
  const opts = (obj, sel) => Object.entries(obj).filter(([, v]) => !v.city && !v.hidden).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v.name}</option>`).join('');
  return card('Paint and flag', `${shipImg(ship().model, {...G.S.look, ram:lvl('ram'), sailLv:lvl('sail')})}<div class="looks">
      <label><span>Hull paint</span><select data-look="paint">${opts(PAINTS, lk.paint)}</select></label>
      <label><span>Sail</span>${spec.mast || lvl('sail') ? `<select data-look="sail">${opts(SAILS, lk.sail)}</select>` : '<select disabled><option>Needs a mast</option></select>'}</label>
      <label><span>Flag</span>${founded() ? `<select data-look="flag">${opts(GODS, lk.flag)}</select>` : '<select disabled><option>Found a crew first</option></select>'}</label></div>`);
}

// ---- crew ----
const jobSelect = (c, i) => `<select class="jobsel" data-crew="${i}" aria-label="${c.n}'s job">${Object.entries(CREW.jobs).map(([k, j]) => `<option value="${k}" ${k === c.job ? 'selected' : ''}>${j.label}</option>`).join('')}</select>`;
function sailorRows(canLetGo){
  const on = aboard().length;
  return (G.S.crew || []).map((c, i) => `<div class="sailor ${i >= on ? 'dim' : ''}"><span class="av">${peg(JOB_COLOR[c.job] || '#cf9035')}</span><div><b>${c.n}</b><small>${i >= on ? 'Waiting on the pier: no seat on this ship' : CREW.jobs[c.job].desc}</small></div>
      ${jobSelect(c, i)}${canLetGo ? `<button class="btn ghostdark" data-act="letgo" data-i="${i}">Let go</button>` : ''}</div>`).join('');
}
function crewTab(){
  const S = G.S;
  if (!founded() && owned().length < 2) return card('Your crew', `<div class="line">${IC.crew}<div><b>Not yet</b><small>Build your second ship at the shipyard. Then you can found a crew, fly a god's flag and hire sailors.</small></div></div>`);
  const gods = Object.entries(GOD_BLESSINGS).map(([k, b]) => `<option value="${k}">${GODS[k].name}: ${b.desc}</option>`).join('');
  if (!founded()) return card('Found your crew', `<p class="note">Name your crew and choose a god. Their flag flies on your ships and brings a blessing.</p>
    <div class="looks one"><label><span>Crew name</span><input id="crewName" maxlength="24" placeholder="The Sea Swallows"></label><label><span>God</span><select id="crewGod">${gods}</select></label></div>
    <div class="btnrow"><div class="cost">${chip(IC.coin, CREW.foundCost, S.gold >= CREW.foundCost)}</div><button class="btn gold" data-act="found" ${S.gold >= CREW.foundCost ? '' : 'disabled'}>Found the crew</button></div>`);
  const b = blessing(), list = S.crew || [], free = seats() - list.length, god = GODS[S.look.flag];
  const flagCard = card(S.crewName, `<div class="line"><span class="emb" style="background:${god ? god.bg : '#ccc'}">${IC.bless}</span><div><b>Flag of ${god ? god.name : 'none'}</b><small>${b.desc || 'No blessing'}. Change the flag in the shipyard.</small></div></div>
    <div class="stats big">${IC.archer} ${fighters()} archers ${IC.rower} ${hired('rower')} rowers ${IC.seats} ${aboard().length}/${seats()} seats</div>`);
  const hire = free > 0 ? candidates().map((c, i) => `<div class="sailor"><span class="av">${peg(JOB_COLOR[c.job] || '#cf9035')}</span><div><b>${c.n}</b><small>${CREW.jobs[c.job].label}: ${CREW.jobs[c.job].desc}</small></div>
      <button class="btn gold" data-act="hire" data-i="${i}" ${S.gold >= CREW.hireCost ? '' : 'disabled'}>Hire ${chip(IC.coin, CREW.hireCost)}</button></div>`).join('')
    : '<p class="note">Every seat is taken. Crew quarters upgrades and bigger ships have more seats.</p>';
  return flagCard + card(`Sailors · ${list.length}`, (sailorRows(true) || '<p class="note">No sailors yet.</p>') + '<p class="note">Archers shoot in fights. Rowers make you faster. When you stop to fish, everyone helps.</p>') + card('Waiting on the pier', hire);
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
  return `<div class="mtop">${top('Your things')}${res()}${tabBar(list, t, 'inv')}</div><div class="mbody">${body}</div>`;
}
function holdTab(){
  const S = G.S, sh = ship(), used = holdUsed();
  const tile = (icon, name, n, k) => `<div class="tile ${n ? '' : 'dim'}">${icon}<b>${name}</b><span class="n">× ${n}</span>${k && n ? `<button class="btn ghostdark small" data-act="toss" data-k="${k}">Throw 1</button>` : ''}</div>`;
  return card(`Hold · ${used} of ${sh.hold}`, `${bar(used/sh.hold)}<div class="tiles">${Object.entries(FISH).map(([k, f]) => tile(IC.fish(FISH_COLOR[k]), f.label, S.cargo[k] || 0, k)).join('')}${Object.entries(GOODS).filter(([k]) => S.cargo[k]).map(([k, g]) => tile(GOOD_IC(k), g.label, S.cargo[k], k)).join('')}</div>
      <p class="note">The hold is for fish and trade goods. Sell fish at any harbor.</p>`)
    + card('Warehouse at Kallisto', `<div class="tiles">${tile(IC.wood, 'Wood', S.ware)}${tile(IC.bronze, 'Bronze', S.bronze || 0)}${tile(IC.linen, 'Linen', S.linen || 0)}</div><p class="note">Wood, bronze and linen go straight here when you find or buy them.</p>`);
}
function shipTab(){
  const S = G.S, sh = ship(), bl = S.bless || 0;
  const ups = upKeys().map(k => `<div class="uprow"><span class="uic">${UP_IC[k]()}</span><span>${UPGRADES[k].label}</span>${pips(k === 'ram' ? (ramMat() ? ramMat().sub : 0) : lvl(k), 10)}</div>`).join('');
  return card(sh.name, `${shipImg(sh.model, {...S.look, ram:lvl('ram')})}
      <div class="line">${IC.hull}<div><b>Hull ${Math.ceil(S.hull)} / ${sh.hull}</b>${bar(S.hull/sh.hull, S.hull/sh.hull < .35 ? 'low' : '')}</div></div>
      <div class="stats big">${IC.speed} ${sh.speed} ${IC.hold} ${sh.hold} ${IC.archer} ${fighters()} ${IC.rower} ${hired('rower')}</div>
      <p class="note">${sh.storm ? 'Big waves in the Open Sea wear this ship down.' : 'Shrugs off the big waves of the Open Sea.'}</p>`)
    + card('Upgrades', `${ups}<p class="note">Upgrade at the Kallisto shipyard.</p>`)
    + (bl ? card("Poseidon's blessing", `<div class="line">${IC.bless}<div><b>${Math.floor(bl/60)}:${String(Math.floor(bl % 60)).padStart(2, '0')} left</b><small>Faster sailing and quicker work</small></div></div>`) : '');
}
function bagJobs(){
  const S = G.S, g = goal(), tr = S.treasure;
  return (g ? card(g.chapter ? `Chapter one · goal ${(S.goal || 0) + 1 - STARTER_GOALS} of ${GOALS.length - STARTER_GOALS}` : `First voyage · goal ${(S.goal || 0) + 1} of ${STARTER_GOALS}`, `<div class="job"><span class="jic">${IC.star}</span><div><b>${g.text}</b>${g.n > 1 ? bar((S.goalN || 0)/g.n) : ''}<small>${g.n > 1 ? `${S.goalN || 0} of ${g.n} · ` : ''}reward</small></div><span class="reward">${chip(IC.coin, '+' + g.gold)}</span></div>`) : '')
    + card(`Your jobs · ${active().length} of ${REQUESTS.max}`, myJobs() + (active().some(r => r.to) ? '<p class="note">The islands they send you to have a dashed red ring on the chart.</p>' : ''))
    + (S.war ? card('War contract', `<div class="job"><span class="jic">${IC.swords}</span><div><b>${warText(S.war)}</b><small>For ${CITIES[S.war.city].name} · ${Math.min(S.war.got, S.war.n)} of ${S.war.n}</small>${bar(S.war.got/S.war.n)}</div><span class="reward">${chip(IC.coin, '+' + S.war.gold)}</span></div>`) : '')
    + (tr ? card('Treasure map', `<div class="line">${IC.map}<div><b>${tr.land ? `Buried on a beach${tr.name ? ` of ${tr.name}` : ''}` : 'Floating out at sea'}</b><small>The red X on your chart. ${tr.land ? 'Sail up close to the beach to dig it out.' : 'Sail over it.'}</small></div></div>`) : '');
}
function worldTab(){
  const held = c => ISLANDS.filter(i => i.city === c).length, hunt = G.hunted || {};
  const city = c => `<div class="line"><span class="emb" style="background:${CITIES[c].color}">${IC.swords}</span><div><b>${CITIES[c].name}</b><small>${held(c)} islands</small></div><span class="tag ${hunt[c] ? 'bad' : 'on'}">${hunt[c] ? 'Hunting you' : 'Leaves you alone'}</span></div>`;
  return card('The war', `${city('athens')}${city('sparta')}<p class="note">Raid a city's ships and only that city's navy comes after you, if they see it. To take an island: knock down its fortress, sink its guard ships, then hold the bay until the other city's flag goes up. Its fortress is rebuilt for the new owner.</p>`)
    + (founded() ? card(G.S.crewName, `<p class="note">${aboard().map(c => c.n).join(', ') || 'No sailors hired yet'}${blessing().desc ? `. Blessing: ${blessing().desc}` : ''}</p>`) : '');
}
