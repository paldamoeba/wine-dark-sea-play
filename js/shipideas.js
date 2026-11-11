// P81: ship ideas for the Showroom only (nothing in the game uses them yet). Real ancient Greek and Mediterranean ship types,
// built from the game's own ship builder so they look like they belong. Pick the ones you like and they can become ships to build.
import {SPECS} from './ships.js?v=2e38722';
export const IDEAS = {
  hemiolia:      {name:'Hemiolia', desc:'The pirates\' favourite: a fast, low ship with one and a half rows of oars. The rowers at the back fold the sail away and row hard to catch a merchant. Idea: a quick raider for the player between the skiff and the bireme.',
    spec:{L:120, B:24, H:13, rise:20, oarRows:1, oarCount:12, mast:true, sailW:46, sailH:38, sailMax:10, ram:true, fans:true, eyes:true, raider:true, crew:[['stand', 1], ['archer', 4]], look:{paint:'green', sail:'sea', flag:'hermes'}}},
  trihemiolia:   {name:'Trihemiolia', desc:'The warship of Rhodes itself: built to hunt pirates, with a deck over the rowers and a heavy ram. Idea: a ship you win in the Arena of Rhodes.',
    spec:{L:158, B:40, H:20, rise:28, oarRows:2, oarCount:14, mast:true, sailW:64, sailH:54, sailMax:15, ram:true, bigRam:true, fans:true, bowFans:true, eyes:true, twoDeck:true, crew:[['stand', 1], ['archer', 7]], look:{paint:'white', sail:'purple', flag:'apollo'}}},
  lembos:        {name:'Lembos', desc:'A small, light boat from the northern coasts, all oars and a little sail, used for quick raids and carrying messages. Idea: a cheap second boat to send on errands.',
    spec:{L:70, B:18, H:10, rise:10, oarRows:1, oarCount:6, mast:true, sailW:28, sailH:22, sailMax:5, ram:true, crew:[['archer', 2]], look:{paint:'oak', sail:'ochre', flag:'none'}}},
  gaulos:        {name:'Gaulos', desc:'The round, deep Phoenician trader: a fat hull for cargo, one big sail, no oars. Slow and steady. Idea: a trading ship that carries twice the goods but can\'t fight.',
    spec:{L:100, B:46, H:22, rise:16, mast:true, sailW:62, sailH:52, sailMax:20, hats:true, cargo:true, cabin:true, crew:[['stand', 3]], crewAt:[[-.42, 0], [.36, 0], [-.1, .3]], look:{paint:'oak', sail:'bwr', flag:'none'}}},
  kerkouros:     {name:'Kerkouros', desc:'A Cypriot cargo ship with oars as well as a sail, so it can still move with no wind. Idea: a trader that can row out of trouble.',
    spec:{L:118, B:38, H:19, rise:14, oarRows:1, oarCount:8, mast:true, sailW:56, sailH:46, sailMax:15, hats:true, cargo:true, crateX:-.2, crew:[['stand', 2]], crewAt:[[-.4, 0], [.33, 0]], look:{paint:'aegean', sail:'ochre', flag:'hermes'}}},
  ghostship:     {name:'Ghost galley', desc:'A raider that sank with all hands and still sails at night, with torn black sails and nobody aboard. Idea: a night-only enemy, or a spooky look for a captured ship.',
    spec:{L:135, B:28, H:16, rise:24, oarRows:1, oarCount:9, mast:true, sailW:56, sailH:46, sailMax:10, ram:true, fans:true, eyes:true, raider:true, ghost:true, crew:[], look:{paint:'king', sail:'blood', flag:'none'}}},
};
for (const [k, v] of Object.entries(IDEAS)) SPECS['idea_' + k] = v.spec;
