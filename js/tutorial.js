// The two "how to play" pages shown on a new game (and from Settings). Pictures are real renders of the game's boat with
// drawn hints on top (a finger, arrows); if 3D can't draw, the old drawings are used.
import {tutShot} from './portrait.js?v=b8d289e';
const C = {sea:'#2f7f9a', shallow:'#6cc3bd', sand:'#e6d29c', grass:'#76883c', hill:'#8a8a74', wood:'#a3754a', deck:'#d2a873',
  foam:'#f4fbff', ink:'#22283a', ochre:'#d48a2a', skin:'#e3b591', green:'#5f9c3a', ring:'#d9cba8', parch:'#f7eed6'};

// a rowboat seen from above, nose to the right
const boat = (x, y, rot = 0, s = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M-22 -5 L-46 -13 M-22 5 L-46 13" stroke="${C.foam}" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
  <path d="M-20 0 Q-17 -9 0 -9 L12 -6 Q24 0 12 6 L0 9 Q-17 9 -20 0Z" fill="${C.wood}"/>
  <path d="M-14 0 Q-12 -5 0 -5 L9 -3 Q16 0 9 3 L0 5 Q-12 5 -14 0Z" fill="${C.deck}"/>
  <circle cx="-2" cy="0" r="3.2" fill="${C.ink}" opacity=".75"/></g>`;
// a white pointing hand (fingertip at x, y), like the hints in mobile games
const finger = (x, y) => `<g transform="translate(${x} ${y}) rotate(-18)"><path d="M-3.6 2 Q-3.6 -2.2 0 -2.2 Q3.6 -2.2 3.6 2 V13 L6 12 Q9.6 11.4 10.2 14.6 L13.2 13.6 Q16.6 13.2 17 16.6 V26 Q17 34 9 35 H1 Q-5 35 -7.4 29 L-11.6 19.4 Q-12.6 16 -9.6 15.4 Q-7.4 15 -5.8 17.6 L-3.6 21Z" fill="#fbfaf6" stroke="${C.ink}" stroke-opacity=".55" stroke-width="1.6" stroke-linejoin="round"/><path d="M3.6 13 V19 M10.2 14.6 V20" stroke="${C.ink}" stroke-opacity=".3" stroke-width="1.2"/></g>`;
const fish = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-7 0 Q0 -6 7 0 Q0 6 -7 0Z M7 0 L12 -4 L12 4Z" fill="${C.sea}"/></g>`;
const frame = body => `<svg viewBox="0 0 280 140" role="img" aria-hidden="true"><rect width="280" height="140" rx="14" fill="${C.sea}"/>${body}</svg>`;
// a real render as the background; boats = [[model, x, y, rotation in degrees]], isle = [x, y, radius]
const shot = (kind, boats, isle, hints, fallback) => { const u = tutShot(kind, boats, isle);
  return u ? `<svg viewBox="0 0 280 140" role="img" aria-hidden="true"><defs><clipPath id="r${kind}"><rect width="280" height="140" rx="14"/></clipPath></defs><image href="${u}" width="280" height="140" clip-path="url(#r${kind})"/>${hints}</svg>` : frame(fallback + hints); };
const wake = () => ''; // the 3D picture draws its own foam trail

const PICS = {
  get drag(){ return shot('drag', [['rowboat', 92, 84, -28]], null, `${wake(92, 84, -28, 1.25)}
    <path d="M118 62 Q150 34 186 46" stroke="${C.ochre}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M186 46 l-10 -6 l2 11Z" fill="${C.ochre}"/>
    <circle cx="210" cy="96" r="28" fill="${C.foam}" fill-opacity=".15" stroke="${C.foam}" stroke-opacity=".7" stroke-width="2"/>
    <circle cx="226" cy="82" r="12" fill="${C.foam}" fill-opacity=".9"/>
    ${finger(222, 78)}`, boat(92, 84, -28, 1.25)); },
  get tap(){ return shot('tap', [['rowboat', 62, 92, -14]], null, `${wake(62, 92, -14, 1.25)}
    <path d="M90 84 L206 56" stroke="${C.foam}" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>
    <circle cx="214" cy="54" r="9" fill="none" stroke="${C.foam}" stroke-width="2.5"/>
    <circle cx="214" cy="54" r="19" fill="none" stroke="${C.foam}" stroke-width="2" opacity=".55"/>
    ${finger(214, 56)}
    <text x="246" y="34" fill="${C.foam}" font-family="Nunito, sans-serif" font-weight="800" font-size="13">×2</text>`, boat(62, 92, -14, 1.25)); },
  get shore(){ return shot('shore', [['rowboat', 186, 102, -8]], [96, 72, 52], `
    ${[[168, 96], [200, 110], [178, 116], [206, 92]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${2 + i % 2}" fill="${C.foam}" opacity=".85"/>`).join('')}
    <circle cx="190" cy="62" r="16" fill="${C.parch}"/>${fish(190, 62, 1)}
    <path d="M186 76 l4 6 l4 -6Z" fill="${C.parch}"/>`, `<ellipse cx="96" cy="72" rx="84" ry="56" fill="${C.shallow}"/><path d="M44 74 Q46 38 92 34 Q140 30 146 66 Q150 104 100 108 Q48 110 44 74Z" fill="${C.sand}"/>${boat(186, 102, -8, 1.2)}`); },
  get spot(){ return shot('spot', [['rowboat', 96, 74, 12]], null, `
    ${[[70, 60], [96, 46], [120, 64], [84, 92], [112, 96], [58, 84], [132, 82]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${3 + i % 3}" fill="${C.foam}" opacity=".75"/>`).join('')}
    <circle cx="206" cy="70" r="40" fill="${C.parch}"/>
    <circle cx="206" cy="70" r="28" fill="none" stroke="${C.ring}" stroke-width="8"/>
    <path d="M226 50 A28 28 0 0 1 234 70" fill="none" stroke="${C.green}" stroke-width="8"/>
    <path d="M206 70 L228 52" stroke="${C.ink}" stroke-width="3.5" stroke-linecap="round"/><circle cx="206" cy="70" r="4" fill="${C.ink}"/>`, boat(96, 74, 12, 1.15)); },
};

import {shipPortrait} from './portrait.js?v=b8d289e';
import {IC} from './menus.js?v=b8d289e';
const STEPS = [[IC.fish(), 'Fish and cut wood', 'on glinting water and by the trees'], [IC.coin, 'Sell at the harbors', 'and take jobs from the boards'],
  [IC.ship, 'Build bigger ships', 'more speed, hold and archers'], [IC.swords, 'Fight pirates, loot, get rich', 'take forts and islands, rule the Aegean']];
const ladder = () => [['rowboat', 'Rowboat'], ['fishing', 'Fishing boat'], ['bireme', 'Warship']].map(([m, n], i) => { const u = shipPortrait(m, {});
  return `${i ? '<span class="arr">›</span>' : ''}<figure>${u ? `<img src="${u}" alt="">` : ''}<figcaption>${n}</figcaption></figure>`; }).join('');
export const TUT_PAGES = [
  {title:'Welcome, captain', intro:true},
  {title:'How to sail', cards:[
    ['drag', 'Press and drag', 'Steer the boat. It turns first, then picks up speed.'],
    ['tap', 'Double tap', 'Sail to that spot by itself.']],
   foot:'Sail into the glowing ring by a pier to enter that harbor. Pinch to zoom a little.'},
  {title:'How to earn', cards:[
    ['shore', 'Glinting water near islands', 'Stop on it and your crew fishes.'],
    ['spot', 'Bubbling water', 'Big fish. Tap when the needle is in the green.']],
   foot:'Pirates and bandits attack you. Turn side-on so your crew shoots back; the buttons at the bottom fire volleys and more.'},
];

export function tutHTML(page){
  const p = TUT_PAGES[page], last = page === TUT_PAGES.length - 1;
  const body = p.intro ? `<p class="tutlead">Start with a little rowboat on Kallisto. Grow into a captain of warships.</p>
      <div class="ladder">${ladder()}</div>
      <ol class="steps">${STEPS.map(([ic, h, t]) => `<li><span class="sic">${ic}</span><div><b>${h}</b><small>${t}</small></div></li>`).join('')}</ol>`
    : `${p.cards.map(([pic, h, t]) => `<div class="tut">${PICS[pic]}<b>${h}</b><span>${t}</span></div>`).join('')}<p class="tutfoot">${p.foot}</p>`;
  return `<div class="mtop"><div class="mhead"><span class="xspace"></span><h1>${p.title}<small>${page + 1} of ${TUT_PAGES.length}</small></h1><span class="xspace"></span></div></div>
    <div class="mbody tutbody">${body}
    <div class="foot">${page ? '<button class="btn" data-act="tutback">Back</button>' : '<button class="btn" data-act="close">Skip</button>'}
      <button class="btn gold" data-act="${last ? 'tutdone' : 'tutnext'}">${last ? 'Start sailing' : 'Next'}</button></div></div>`;
}
