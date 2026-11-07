// Game balance and settings. Change numbers here to tune the game.

export const SAVE_VERSION = 3;
export const SAVE_KEY = 'wine-dark-sea';
export const OLD_SAVE_KEYS = ['wine-dark-sea-v2'];
export const SETTINGS_KEY = 'wine-dark-sea-settings';

// fighters = crew members who shoot in a fight. More crew, more arrows.
// turn = how fast the ship can turn (radians per second). Small boats turn quickly, big ships slowly.
export const SHIPS = [
// speed and turn are lower than before P48 and heavy = how slowly the ship gets going and stops (bigger = heavier).
// hold = fish; cap = how much wood, bronze and trade goods it can carry (wood and bronze go to the warehouse when you dock).
// rank = its size class (0 small boat .. 3 big warship): captured bandit ships slot in by rank.
// men = [start, most]: the crew it comes with and the most it can carry (the Crew upgrade adds the rest). On oared ships
// speed is with every bench filled; with few rowers they're much slower (crew.js rowBoost). fighters = archers with a full crew.
// plans = needs a blueprint (won from a bandit camp or a pirate fortress) before you can build it.
  {name:'Rowboat',      model:'rowboat', rank:0, speed:70, hull:40,  hold:10, cap:{wood:40, bronze:10, iron:6, linen:6, goods:12}, heavy:1.6, fishTime:2.6, woodTime:3.0, storm:1.1, len:40,  beam:17, fighters:2, men:[1, 2], turn:1.6},
  {name:'Fishing Boat', model:'fishing', rank:1, speed:118, hull:80,  hold:20, cap:{wood:80, bronze:20, iron:12, linen:12, goods:24}, heavy:2.4, fishTime:1.8, woodTime:2.2, storm:.5, len:64,  beam:23, fighters:4, men:[1, 4], turn:1.3, cost:{wood:150, linen:10, gold:60}, plans:true,
    desc:'A sail, more speed, room for a crew of four, steadier in big waves'},
  {name:'Bireme',       model:'bireme',  rank:2, speed:165, hull:170, hold:16, cap:{wood:140, bronze:40, iron:24, linen:20, goods:24}, heavy:4, fishTime:2.4, woodTime:2.6, storm:0,   len:141, beam:44, fighters:4, men:[6, 33], turn:.75, cost:{wood:300, bronze:30, iron:15, linen:20, gold:250}, plans:true,
    desc:'A warship. Benches for 28 rowers and four archers, a hull that shrugs off big waves, but a small hold'},
  {name:'Trireme',      model:'trireme', rank:3, speed:195, hull:260, hold:18, cap:{wood:200, bronze:60, iron:36, linen:30, goods:32}, heavy:5, fishTime:2.6, woodTime:2.8, storm:0,   len:167, beam:49, fighters:6, men:[6, 39], turn:.62, cost:{wood:600, bronze:80, iron:50, linen:40, gold:600}, plans:true,
    desc:'The greatest warship of the Aegean: benches for 32 rowers, six archers, an outrigger and a big bronze ram'},
  // bandit ships: built from plans won from the named pirates who sail them
  {name:'Bandit boat',   model:'dinghy', rank:0, plans:true, cost:{wood:60, linen:4, gold:40}, speed:84, hull:36, hold:6, cap:{wood:30, bronze:10, iron:4, linen:4, goods:8}, heavy:1.5, fishTime:2.8, woodTime:3.2, storm:1, len:44, beam:17, fighters:1, men:[1, 5], turn:1.6,
    desc:'A quick little raider boat with a blood-red sail'},
  {name:'Bandit skiff',  model:'skiff',  rank:1, plans:true, cost:{wood:140, linen:8, gold:100}, speed:125, hull:95, hold:10, cap:{wood:60, bronze:20, iron:8, linen:8, goods:16}, heavy:2.2, fishTime:2.4, woodTime:2.6, storm:.6, len:72, beam:22, fighters:3, men:[3, 9], turn:1.15,
    desc:'A raider skiff with a ram: three archers and a small hold'},
  {name:'Bandit galley', model:'raider', rank:2, plans:true, cost:{wood:350, bronze:40, iron:20, linen:20, gold:350}, speed:160, hull:200, hold:12, cap:{wood:120, bronze:40, iron:20, linen:15, goods:24}, heavy:3.6, fishTime:2.6, woodTime:2.8, storm:0, len:135, beam:28, fighters:6, men:[6, 25], turn:.62,
    desc:'A black pirate galley with a boar\'s head ram: six archers when its benches are full'},
  // P62: the biggest warship you can build: two decks
  {name:'Quinquereme', model:'quinquereme', rank:4, speed:205, hull:420, hold:24, cap:{wood:260, bronze:90, iron:60, linen:40, goods:40}, heavy:6.5, fishTime:3, woodTime:3, storm:0, len:215, beam:62, fighters:10, men:[10, 56], turn:.5,
    cost:{wood:1000, bronze:200, iron:140, linen:100, gold:1500}, plans:true, desc:'Two decks: rowers below on two rows of oars, ten archers on the fighting deck above, two sails and a huge ram'},
  // P71: every ship in the game can be yours. Traders carry the most, the penteconter is the fastest thing on oars, the flagship comes only from Polycrates himself.
  {name:'Small Trader', model:'trader', rank:1, speed:100, hull:110, hold:30, cap:{wood:120, bronze:40, iron:20, linen:20, goods:60}, heavy:3.2, fishTime:2, woodTime:2.4, storm:.3, len:84, beam:36, fighters:2, men:[2, 6], turn:.9, plans:true, cost:{wood:200, linen:14, gold:140},
    desc:'A round little trader: slow to turn, but with room for more than twice the goods of a warship'},
  {name:'Merchant Ship', model:'merchant', rank:2, speed:120, hull:220, hold:40, cap:{wood:240, bronze:90, iron:50, linen:45, goods:110}, heavy:5, fishTime:2.2, woodTime:2.4, storm:0, len:110, beam:44, fighters:3, men:[3, 9], turn:.55, plans:true, cost:{wood:420, bronze:30, iron:15, linen:30, gold:400},
    desc:'The biggest hold in the Aegean, with a cabin and crates on deck. Few archers: this ship is for getting rich'},
  {name:'Penteconter', model:'penteconter', rank:2, speed:190, hull:130, hold:8, cap:{wood:80, bronze:30, iron:16, linen:12, goods:12}, heavy:3, fishTime:3, woodTime:3, storm:.2, len:150, beam:22, fighters:3, men:[8, 23], turn:.85, plans:true, cost:{wood:380, bronze:40, iron:20, linen:24, gold:380},
    desc:'Long, narrow and fast, with benches for 22 rowers and a ram. Thin planks and almost no hold'},
  {name:'Pirate King\'s Flagship', model:'flagship', rank:4, speed:190, hull:800, hold:30, cap:{wood:300, bronze:110, iron:70, linen:50, goods:60}, heavy:8, fishTime:3, woodTime:3, storm:0, len:280, beam:96, fighters:14, men:[14, 24], turn:.42, plans:true, cost:{wood:1500, bronze:300, iron:200, linen:150, gold:3000},
    desc:'Polycrates\' floating fortress: towers, statues and a golden stern. There is only one, and you have to beat him for it'},
];

// spin = needle speed (radians per second), green = size of the green part (degrees). Bigger fish: faster, smaller.
export const FISH = {
  sardine: {price:3, label:'Sardine', spin:3.4, green:80},
  tuna:    {price:8, label:'Tuna',    spin:5.2, green:46},
  swordfish:{price:16, label:'Swordfish', spin:6.4, green:34},
};
// Sardines are caught by the crew in the light water near any shore (no minigame). Bubbling spots hold the big fish.
// Schools of sardines glint in the light water near shores. Each comes and goes; stop on one and the crew fishes.
export const SHORE_FISH = {kind:'sardine', timeK:1.8, range:110, settle:1.2, period:[60, 120], on:.45};
// The whale: sail close to it for Poseidon's blessing.
export const WILDLIFE = {whaleFirst:[180, 320], whaleEvery:[480, 840], whaleNear:280, blessSeconds:120, blessSpeed:1.2, blessWork:.7,
  dolphinEvery:[420, 780],
  krakenFirst:[100, 200], krakenEvery:[360, 600], krakenNear:380, krakenStay:40, krakenGold:30}; // the kraken: only in the Open Sea, and it dives when you come close // dolphins are a rare treat, and they leave when a fight starts

// Founding your crew (needs your second ship), the gods' blessings, and sailors to hire.
export const CREW = {
  foundCost:60, hireCost:30,
  seats:[0, 3, 5, 7],  // sailors you can hire, per ship (rowboat, fishing boat, bireme, trireme)
  jobs:{
    archer:{label:'Archer', desc:'One more bow in every fight'},
    rower: {label:'Rower',  desc:'Your ship sails 5% faster', boost:.05},
  },
  names:['Nikias', 'Theron', 'Phaedra', 'Lykon', 'Doris', 'Kleon', 'Ianthe', 'Myron', 'Thalia', 'Dion', 'Eudora', 'Philon', 'Melita', 'Ariston', 'Kallias', 'Xanthe', 'Timon', 'Agape', 'Stavros', 'Chloe'],
};
export const GOD_BLESSINGS = {
  poseidon:{desc:'Big waves do half the damage', wave:.5},
  zeus:    {desc:'Your arrows hit 25% harder', dmg:1.25},
  athena:  {desc:'Your crew aims better: more arrows hit', hit:.1},
  apollo:  {desc:'Volley recharges 30% faster', volley:.7},
  artemis: {desc:'Fishing: the green part is 25% bigger', green:1.25},
  hermes:  {desc:'Fish sell for 15% more', price:1.15},
};

// P78: blessings found at sea (omens.js). Each lasts OMEN.seconds; they are stronger than the flag blessings because they are short.
export const OMENS = {
  ares:{name:'Ares', color:'#ff4a30', text:'arrows and ram hit 30% harder', dmg:1.3, ram:1.3},
  aphrodite:{name:'Aphrodite', color:'#ff8cc4', text:'sea foam mends your hull', regen:.012},
  apollo:{name:'Apollo', color:'#ffc53a', text:'powers recharge 30% faster', cd:.7},
  artemis:{name:'Artemis', color:'#a4e87a', text:'a bigger green zone when fishing', green:1.4},
  hermes:{name:'Hermes', color:'#62d6ff', text:'fish sell for 25% more', price:1.25},
};
export const OMEN = {seconds:150, life:240, reach:75, first:[70, 130], every:[140, 280], dist:[700, 1700]};
// First voyages: shown one at a time under the top bar. t = what counts, n = how many, gold = reward.
export const GOALS = [
  {t:'catch', kind:'sardine', n:3, gold:5, text:'Catch 3 sardines on glinting water'},
  {t:'sell', n:1, gold:5, text:'Sell your catch at Kallisto harbor'},
  {t:'wood', n:12, gold:6, text:'Cut 12 wood beside the cypress trees'},
  {t:'salvage', n:10, gold:8, text:'Salvage 10 wood from a wreck'},
  {t:'catch', kind:'tuna', n:1, gold:8, text:'Catch a tuna in bubbling water'},
  {t:'board', n:1, gold:6, text:'Take a job from the request board in a harbor'},
  {t:'piece', kind:1, n:1, gold:20, text:'Burn the bandit camp on Ikaria to win the fishing boat\'s plans'},
  {t:'build', n:1, gold:25, text:'At the Kallisto shipyard, study the plans and build the fishing boat (150 wood, 10 linen, 60 drachmae)'},
  // the voyage: from fishing boat to the pirate king
  {t:'piece', kind:2, n:2, gold:60, text:'Win the 2 pieces of the bireme\'s plans: burn the bandit camps on Tinos and Syros', chapter:true},
  {t:'build', kind:'bireme', n:1, gold:100, text:'Study the plans and build the bireme at Kallisto, your first warship', chapter:true},
  {t:'sink', kind:'galley', n:3, gold:150, text:'Sink 3 raider galleys out in the Open Sea', chapter:true},
  {t:'upgrade', kind:'fire', n:1, gold:60, text:'Buy fire arrows at the Kallisto shipyard', chapter:true},
  {t:'piece', kind:3, n:3, gold:300, text:'Win the 3 pieces of the trireme\'s plans: the Ios bandit camp, the pirate fortress of Kos, and Nikandros the Scourge, who sails off Skyros', chapter:true},
  {t:'build', kind:'trireme', n:1, gold:200, text:'Study the plans and build the trireme, the greatest warship of the Aegean', chapter:true},
  {t:'boss', n:1, gold:1500, text:'Find the pirate king: every fortress keeps a piece of the chart to his lair. Win 12 of them, then defeat Polycrates', chapter:true},
];
// P85 (Nicholas): the pirate king hides until you hold the chart to his lair. P86 (Nicholas: fighting him should need about 90% of the game
// cleared): every fortress keeps one piece (14 of them), and you need 12, so two hard ones can be left.
export const LAIR_NEED = 12;
export const STARTER_GOALS = 8; // the first eight goals teach the basics; past the rowboat they are skipped
// Polycrates, the pirate king: a huge black galley with a golden boar's head ram, waiting off his fortress with two skiffs.
// fireEvery: seconds between his flaming volleys (they set your ship alight for burnSeconds). At half hull he calls two more skiffs.
// He never heals, so you can always sail home, repair and come back.
export const BOSS = {name:'Polycrates, the pirate king', model:'flagship', scale:1, hull:1000, speed:125, turn:.42, fighters:8, dmg:1.4, sight:1100, leash:3000,
  gold:[1200, 1200], wood:200, bronze:60, len:280, beam:96, fireEvery:20, fireArrows:12, burnSeconds:4, burnDps:3, escorts:2, potAt:.6, potEvery:8, pots:3, rushAt:.25, rushEvery:11, rushWarn:2.2, rushTime:2.6, rushK:3, rushDmg:60};
// Fire arrows: a ship hit by one burns for burnSeconds, losing dps(level) hull a second.
// P50: abilities in the bar at the bottom of the screen. fire: seconds of flaming arrows, then a cooldown.
// chain: how long a ship stays dismasted (grows with the Chain shot level) and how slow it goes meanwhile.
// P51: shower, chain and catapult are aimed: drag the button onto the sea (range = how far from your ship, r = how wide it lands,
// flight = seconds in the air, so you aim where the ship is going to be). A tap fires at where the target is right now.
export const ABILITIES = {fire:{secs:8, cd:28},
  shower:{cd:16, range:420, r:42, flight:1.7},
  chain:{cd:22, secs:l => 4 + .6*l, slow:.25, range:380, r:45, flight:1.3},
  catapult:{cd:20, range:540, r:60, flight:2.4, dmg:l => 26 + 6*l}};
// P65: every level of a power helps in three ways. cd = shorter wait (share per level), flight = reaches the target sooner, so it is easier
// to hit a moving ship; spread = arrows land closer together; blast = chains and fireballs hit a little wider;
// seek = how far (world units) a shot bends onto a ship it would have just missed. dmg = extra arrow rain damage per level.
export const POWER = {cd:.04, flight:.03, spread:.05, blast:.03, seek:9, seek0:12, dmg:.1, max:10};
export const FIRE_ARROWS = {burnSeconds:2.5, dps:l => l ? .6 + .18*l : 0}; // P49: weaker, so fire no longer sinks ships at once
// The request board in every harbor.
export const REQUESTS = {offers:3, max:2,
  who:['Old Pelagia, for her taverna', 'The temple priest', 'A worried mother', 'Kleon the net maker', 'The harbor master', 'Two hungry fishermen', 'A traveling poet', 'The potter\'s daughter']};
// Messages in bottles. coins / map = chance of each (the rest are notes).
export const BOTTLES = {first:40, every:[90, 170], life:100, dist:[260, 420], coins:.45, map:.3, gold:[3, 9],
  notes:['To whoever finds this: the tuna run thick east of Paros. Signed, an old fisher.',
    'Help! Stranded on a rock with a goat. The goat is fine. I am bored.',
    'Poseidon, I promise to stop complaining about the waves. Please stop the waves.',
    'Never accept dinner from a Spartan. The black broth is real.',
    'Athena\'s owl was seen over Naxos. Good luck to all who sail there.',
    'Dear Kallisto, your harbor smells of fish. We love it. The merchants of Chios.',
    'I buried nothing. Stop looking. Signed, definitely not a pirate.',
    'Three dolphins in one day means a fair wind tomorrow.']};

// The upgrade board at the Kallisto shipwright. Every upgrade has 10 levels.
// ship:true upgrades are parts of the ship you're on (a new ship starts fresh); arrows and the ram stay with you.
// Level n costs base × n, times the ship's size (shipK) for ship parts.
export const UPGRADES = {
  hull:   {label:'Planking',        ship:true, each:.08, unit:'hull',  cost:{wood:20, gold:15}, iron:1, desc:'Thicker planks: more hull. Warships also need iron nails'},
  oars:   {label:'Oars and benches', ship:true, each:.03, unit:'speed', cost:{wood:15, gold:18}, desc:'Lighter oars and better benches: faster'},
  sail:   {label:'Sails',           ship:true, each:.05, unit:'speed', cost:{wood:5, linen:4, gold:14}, desc:'Linen from the sailmaker and wood for the yards. Every level makes the newest sail bigger; every 5 levels a new sail goes up'},
  helm:   {label:'Steering oars',   ship:true, each:.07, unit:'turning', cost:{wood:15, gold:16}, desc:'Longer steering oars: turns quicker'},
  seats:  {label:'Crew',            ship:true, cost:{gold:9}, desc:'Hire hands for this ship. More rowers make it faster, more archers hit harder, more hands bring in more fish'}, // (kept as "seats" so old crew quarters levels carry over)
  arrows: {label:'Arrowheads',      each:.08, unit:'arrow damage', cost:{bronze:2, gold:18}, desc:'Bronze arrowheads for every archer'},
  shower: {label:'Arrow rain',      power:true, cost:{bronze:2, gold:24}, desc:'Drill your archers. More damage, a shorter wait, and the arrows land closer together, so they hit what you aim at'},
  ram:    {label:'Ram',             cost:{wood:20, gold:14}, desc:'A beak on the bow. Hit a ship head-on to damage it. The faster you hit, the harder it hurts'},
  fire:   {label:'Fire arrows',     power:true, minTier:2, cost:{linen:4, gold:40}, desc:'Rags soaked in oil. Tap Fire in a fight and for a few seconds every arrow sets ships alight'},
  catapult:{label:'Catapult',      power:true, minTier:2, cost:{iron:5, bronze:3, gold:70}, desc:'A catapult on deck that throws a ball of fire high into the air. Drag the Catapult button to where the enemy will be'},
  chain:  {label:'Chain shot',      power:true, minTier:1, cost:{iron:3, gold:30}, desc:'Iron balls joined by a chain. Tap Chains in a fight to tear down a ship\'s sail: it can barely move for a while'},
};
// P61: the Kallisto warehouse holds only so much; upgrade it at the shipyard. Level 1 is enough for the fishing boat,
// level 2 for the bireme, level 3 for the trireme. What doesn't fit stays aboard your ship.
export const WAREHOUSE = [
  {cap:{wood:200, bronze:40, iron:20, linen:30}},
  {cap:{wood:400, bronze:80, iron:40, linen:50},   cost:{wood:120, gold:100}},
  {cap:{wood:700, bronze:140, iron:90, linen:80},  cost:{wood:300, iron:15, linen:20, gold:300}},
  {cap:{wood:1100, bronze:220, iron:180, linen:120}, cost:{wood:600, bronze:60, iron:50, gold:700}},
];
export const UPGRADE_MAX = 10; // sails differ per ship: 5 levels for each sail it can carry
export const SHIP_K = [.6, 1, 2, 3, 4.5];
// The ram: wood levels 1-10, then bronze 1-10, then gold 1-10 (30 in all). The bronze levels are paid in bronze (pay), the gold ones in more drachmae. Damage when your bow hits a ship head-on at speed.
export const RAM = {mats:[{name:'Wood', color:'#8a5a30', k:1, cost:1}, {name:'Bronze', color:'#b07f3c', k:2.2, cost:2.5, pay:'bronze'}, {name:'Gold', color:'#e3b341', k:4, cost:6, pay:'gold'}],
  base:8, per:4, lv:5, minSpeed:.3, cooldown:1.2, bump:3}; // P64: 5 levels each of wood, bronze and gold (15 in all), like the sails

// Captains: hire one for a ship you're not sailing and it goes out fishing on its own, bringing back gold.
// One trip: tripSeconds at sea, then restSeconds moored at Kallisto. Pay per trip = hold × perHold, plus 4% per upgrade level on that ship.
// P65: much less money (about a quarter per hour), and they keep working for 2 hours after you close the game (offline).
export const CAPTAIN = {cost:500, step:250, // P84 (Nicholas): 500, 750, 1000, then 250 more for each one after
  tripSeconds:300, restSeconds:60, perHold:1, perLevel:.04, offline:7200,
  names:['Captain Dion', 'Captain Hero', 'Captain Lysias', 'Captain Ione', 'Captain Polybos', 'Captain Thaleia']};

// Forts on island shores: Spartan, Athenian or pirate. They shoot at you when hostile (pirates always; a city's fort once you
// attack it or its city hunts you), have a big hull, and drop their treasury when they fall. Rebuilt after `rebuild` seconds.
// Bandit camps on the wild islands near Kallisto: a palisade with archers and one mothership guarding it. Easier than a
// fortress, no catapults. Burn one and it stays burnt; some give ship blueprints (plans = SHIPS index).
export const CAMPS = [
  // P84 (Nicholas: too hard, too little loot): walls and boats at half the health, three times the gold
  {isle:'Ikaria',  lv:1, hull:35,  fighters:1, dmg:.8,  sight:420, mother:'dinghy', motherHull:15,  motherDmg:1,  gold:[60, 90],   wood:30,  bronze:2,  plans:1},
  // P67: ships = how many guard the camp (the mothership and smaller boats around it)
  {isle:'Tinos',   lv:2, ships:2, hull:110, fighters:2, dmg:1.3, sight:480, mother:'skiff',  motherHull:55, motherDmg:1.4, gold:[150, 210], wood:70,  bronze:8,  plans:2},
  {isle:'Syros',   lv:2, ships:2, plans:2, hull:150, fighters:3, dmg:2,   sight:520, mother:'skiff',  motherHull:75, gold:[240, 330], wood:110, bronze:14},
  {isle:'Ios',     lv:3, ships:3, plans:3, hull:170, fighters:3, dmg:2, sight:520, mother:'galley', motherHull:130, gold:[330, 450], wood:120, bronze:20},
  // P84 (Nicholas: more camps near home, so raiding merchants isn't the only way to earn). No plans; the bandits come back
  // `back` seconds after you burn one, so these are a steady source of gold and supplies.
  {isle:'Donousa', lv:1, back:420, hull:60,  fighters:2, dmg:1,   sight:440, mother:'dinghy', motherHull:25, gold:[90, 130], wood:40, bronze:4},
  {isle:'Amorgos', lv:2, back:480, ships:2, hull:120, fighters:2, dmg:1.4, sight:480, mother:'skiff', motherHull:60, gold:[180, 250], wood:80, bronze:10, iron:4},
  {isle:'Sikinos', lv:3, back:540, ships:3, hull:180, fighters:3, dmg:2, sight:520, mother:'galley', motherHull:130, gold:[300, 420], wood:120, bronze:18, iron:8},
];
export const PIRATE_PLANS = 3; // a pirate fortress gives a piece of the trireme's plans (so does any city fortress you knock down)
// P54: ship plans come in pieces won from camps and fortresses. With every piece, the Kallisto shipwrights study them,
// then build the ship. Both take real time (seconds, running even while the game is closed); a video makes it faster.
// P65: the fishing boat's plans take 25 minutes, so you really live with the rowboat first; the later ships stay longer than that.
export const PLANS = {1:{pieces:1, study:1500, build:120}, 2:{pieces:2, study:2100, build:900}, 3:{pieces:3, study:3000, build:1500}, 7:{pieces:3, study:4200, build:2400}, 4:{pieces:1, study:600, build:120}, 8:{pieces:1, study:900, build:180}, 5:{pieces:1, study:1200, build:300}, 9:{pieces:1, study:1800, build:600}, 10:{pieces:2, study:1800, build:600}, 6:{pieces:1, study:2100, build:900}, 11:{pieces:1, study:900, build:900}};
// P71: named pirates, each sailing near one island and holding the plans of a ship. Sink one and the piece is yours. Numbers set their level (levels.js).
export const NAMED = [
  {name:'Mikros the Rat', near:'Donousa', kind:'dinghy', plans:4, hull:90, fighters:3, dmg:2, gold:[40, 60], paint:'raider', sail:'blood'},
  {name:'Greedy Kerkyon', near:'Amorgos', kind:'skiff', plans:8, hull:150, fighters:4, dmg:2, gold:[80, 110], paint:'green', sail:'plain'},
  {name:'Lysandra Red-Sail', near:'Samos', kind:'skiff', plans:5, hull:220, fighters:5, dmg:2.4, gold:[120, 170], paint:'raider', sail:'blood'},
  {name:'Hermon the Smuggler', near:'Astypalaia', kind:'galley', plans:9, hull:380, fighters:6, dmg:3.2, gold:[220, 320], paint:'white', sail:'purple'},
  {name:'Black Lykos', near:'Kea', kind:'galley', plans:6, hull:520, fighters:7, dmg:3.6, gold:[320, 460], paint:'black', sail:'blood'},
  {name:'Nikandros the Scourge', near:'Skyros', kind:'pirateQ', plans:3, hull:640, fighters:8, dmg:3.2, gold:[600, 800], paint:'black', sail:'purple'},
  {name:'Aristaios the Ghost', near:'Skopelos', kind:'pirateQ', plans:7, hull:1800, fighters:10, dmg:5.5, gold:[900, 1300], paint:'king', sail:'plain'},
];
export const VIDEO_SKIP = 600; // each video takes 10 minutes off studying or building (a placeholder until real ads)
// Athens and Sparta keep their fortresses and navies this far from Kallisto: the start is neutral (P49).
export const NEUTRAL_R = 8000; // P52: the fortresses stand far out
export const FORTS = {pirates:['Thasos', 'Kos'], // every city island except the capitals has a fortress too
  hull:{city:450, pirate:350}, fighters:7, dmg:2.5, range:560, every:3.4, gold:[320, 520], wood:150, bronze:25, rebuild:600, guards:2,
  stoneEvery:5.2, stoneRange:950, stoneFlight:2.6, stoneDmg:14, stoneHit:58, heal:2.5, healAfter:120};

// Trade goods: each harbor makes one cheaply and wants another. Buy low, sail, sell high.
// price at a harbor = base × (made here .6 · wanted here 1.45 · otherwise 1). You sell for 85% of the price.
export const GOODS = {
  wine:     {label:'Wine',      base:6, color:'#7a2e3a'},
  oil:      {label:'Olive oil', base:7, color:'#9aa04a'},
  pottery:  {label:'Pottery',   base:5, color:'#c46a3a'},
  obsidian: {label:'Obsidian',  base:9, color:'#2c2a33'},
  dye:      {label:'Purple dye', base:18, color:'#6b2a5e', rare:true}, // only sold at your free ports
};
// War contracts from a city's fortress: sink its rival's warships, or knock down one of the rival's fortresses.
// Hand in a finished contract at any fortress of the city that gave it.
export const WAR = {offers:[{t:'sink', n:5, gold:300}, {t:'sink', n:15, gold:1200}, {t:'fort', n:1, gold:700}]};
// Free ports: a pirate fortress you take becomes yours. Its market sells goods cheaper, cheap timber and purple dye.
export const FREEPORT = {goods:.6, wood:14, fish:1.2}; // wood: per 10
export const TRADE = {makes:{Kallisto:'pottery', Chios:'wine', Crete:'oil', Milos:'obsidian', Naxos:'wine'},
  wants:{Kallisto:'oil', Chios:'obsidian', Crete:'pottery', Milos:'wine', Naxos:'oil'}, made:.6, wanted:1.45, sellK:.85};

// Building materials: wood, bronze and linen. Wood and bronze ride aboard (each with its own limit) until you dock; linen you buy goes straight to the warehouse.
// Prices are per 10 wood, or per 1 bronze or linen. Wood and linen are sold in every harbor (cheapest where marked);
// bronze only by the smiths of a few cities and your free ports. Bronze also comes from warship wrecks and sunk warships.
export const TIMBER = {price:30, at:{Naxos:16, Crete:16, Chios:20, Milos:24}}; // P67: dear enough that cutting and salvaging is worth it
export const LINEN = {price:10, at:{Chios:7, Crete:7}};
export const BRONZE = {at:{Crete:22, Chios:26, Milos:24}, free:20};
// P65: iron, the construction material: nails, fittings and anchors for warships, the warehouse's frames, chain shot and the catapult.
// Dug from mines on three islands (stop at the shore, like cutting wood), found in warship wrecks and sunk warships, or bought from a few smiths.
export const IRON = {at:{Naxos:20, Chios:18, Samos:18}, free:16, mines:['Amorgos', 'Serifos', 'Skyros'], perDig:2, digTime:1.3, stock:6, regen:45};
export const MATS = {wood:{label:'Wood'}, bronze:{label:'Bronze'}, iron:{label:'Iron'}, linen:{label:'Linen'}};
// P65: hull and sail colors are found on the sea. Each ship you sink has this chance of carrying each color you don't have yet.
// video:true colors can also be unlocked by watching a video (a placeholder until real ads). Rare ones can only be found.
export const COLORS = {
  paint:{gold:{drop:.05, video:true}, white:{drop:.05, video:true}, green:{drop:.025, video:true}, aegean:{drop:.025}, black:{drop:.01}, raider:{drop:.01}},
  sail:{ochre:{drop:.05, video:true}, sea:{drop:.025, video:true}, bwr:{drop:.025}, purple:{drop:.01}, blood:{drop:.01}},
};
export const FREE_COLORS = {paint:['oak'], sail:['plain']};
// P65: how much of the chart you uncover: around your ship, and in one go when you win a place or find a map.
export const REVEAL = {sail:1500, start:2600, camp:3200, fort:4200, map:1700};
// P65: music: how long the sea plays alone between songs, in seconds (a setting)
export const MUSIC_REST = {short:[45, 90], medium:[120, 240], long:[300, 540]};
export const TUNING = {
  spotStock: 3,          // fish per fishing spot
  spotRegen: 14,         // seconds to regrow one fish
  treeRegen: 25,         // seconds to regrow one tree
  wreckStock: 6,         // salvage pulls per wreck
  wreckRespawn: 90,      // seconds until a new wreck washes in (sizes: WRECK_SIZES below)
  wreckGoldChance: .35,  // chance a salvage pull also finds coins
  wreckGoldMin: 4, wreckGoldMax: 9,
  repairGold: [.5, 1, 1.5, 2, 2.5], // P67: drachmae per hull point, by ship size (a full repair: rowboat 20, fishing boat 80, bireme 255, trireme 520, quinquereme 1050)
  repairWood: .3,        // P82: or wood, a third of the drachmae (wood is much harder to come by than drachmae). Out of both? A video repairs it.
  woodPerCut: 4,         // wood from one cut at the cypress trees
  plankHull: 1.2,        // hull that 1 wood mends when salvaged wreckage patches your ship
  slowSpeed: 30,         // below this speed the boat can fish / gather
  fishRange: 70, wreckRange: 95, treeRange: 50, dockRange: 140,
  stormDrift: 22,
  autosaveSeconds: 5,
};

// Three sizes of shipwreck. share = how many of the wrecks are this size; stock = salvage pulls; wood = timber per pull;
// gold = [chance per pull, fewest, most coins]; goods = chance a pull also brings up an amphora (wine or oil) for the hold.
export const WRECK_SIZES = {
  small:  {label:'Fishing boat wreck', share:.45, scale:.6,  stock:4, wood:5,  gold:[.25, 2, 4]},
  medium: {label:'Merchant wreck',     share:.35, scale:1,   stock:6, wood:10, gold:[.35, 3, 6], goods:.3},
  large:  {label:'Warship wreck',      share:.2,  scale:1.5, stock:9, wood:15, gold:[.55, 6, 12], bronze:[.6, 1, 3], iron:[.45, 1, 2]}, // bronze, iron = [chance per pull, fewest, most]
};
// Graphics presets. "auto" starts on high and drops to low if the phone struggles.
export const QUALITY = {
  // P67: dpr = how sharp (a phone's screen has about 3 real pixels per point; the old High drew only 1.5, which is why it looked soft). pix = most pixels drawn, so huge tablets stay smooth.
  low:  {dpr:1,    shadows:false, waterSeg:64, pix:1e9, label:'Low'},
  mid:  {dpr:1.5,  shadows:true,  waterSeg:90, pix:2.2e6, label:'Medium'},
  high: {dpr:2.25, shadows:true,  waterSeg:120, pix:3.2e6, label:'High'},
};
// P75: where the online Leaderboard lives (tools/leaderboard). Empty: only your own ships show.
export const ONLINE_URL = 'https://wine-dark-sea-palda-games.pages.dev';
export const AUTO_QUALITY = {sampleSeconds:4, minFps:42};

// Fighting. Your crew and raider crews shoot by themselves when in range.
export const COMBAT = {
  patchTo: .6,          // salvaged timber mends the hull up to 60%; the rest needs a dry dock
  washUpHull: .35,      // after sinking you're towed home with the hull at 35%
  range: 300,           // how far arrows fly
  rangePerLen: .8,      // P85 (Nicholas): bigger ships shoot further: every unit of length past a rowboat's 40 adds this much (a trireme 400, a quinquereme 440)
  siegeRange: 180,      // P85: and further still at fortresses and bandit camps (a big target on land): a trireme just outranges a fortress's archers, never its catapults
  shotEvery: 3,         // seconds between shots for one of your fighters
  enemyShotEvery: 4.2,  // the same for one raider fighter
  firstShot: 2.5,       // seconds a raider waits after spotting you before it shoots
  windup: 1.2,          // raiders sail at half speed for this long after spotting you
  arrowDmg: 3,          // damage per arrow from your crew
  hitChance: .85,
  arrowSpeed: 300,
  volleyCooldown: 16,   // the special button
  volleyArrows: 2,      // arrows per fighter in a volley
  sideArc: .5,          // archers shoot over the sides: no shots within about 30° of dead ahead or dead astern
  respawn: 120,         // seconds until a sunk raider is replaced
  lootLife: 75,         // seconds floating loot stays before it sinks
  lootRange: 70,
};
export const ENEMIES = {
  dinghy: {name:'Raider boat',   model:'dinghy', hull:16,  speed:64,  turn:1.5, fighters:1, dmg:1.5, sight:420, leash:800, gold:[3, 6], wood:10, len:44, beam:17},
  skiff:  {name:'Raider skiff',  model:'skiff',  hull:90,  speed:80,  turn:1.05, fighters:3, dmg:2, sight:500, leash:900,  gold:[8, 14], wood:25, bronze:1, len:72,  beam:22},
  galley: {name:'Raider galley', model:'raider', hull:220, speed:120, turn:.45, fighters:6, dmg:3, sight:600, leash:1100, gold:[25, 40], wood:60, bronze:6, iron:3, len:135, beam:28},
  // side: pirate (always hostile), merchant (peaceful, flees), navy (hunts pirates; hunts you only if one of them saw you raid)
  merchant: {name:'Merchant ship', side:'merchant', model:'merchant', hull:90, speed:64, turn:.5, fighters:0, dmg:0, sight:450, gold:[18, 30], wood:30, len:110, beam:44},
  // P65: small traders in the Shallows. They never shoot back: the first good money of the game for a rowboat.
  trader:   {name:'Small trader', side:'merchant', model:'trader', hull:32, speed:50, turn:.6, fighters:0, dmg:0, sight:380, gold:[8, 14], wood:14, len:84, beam:36},
  // navies: one kind per city. A patrol switches city when its island changes hands.
  athens:   {name:'Athenian trireme', side:'navy', city:'athens', model:'trireme', look:{paint:'white', sail:'athens', flag:'athens'}, hull:230, speed:132, turn:.55, fighters:4, dmg:3, sight:650, gold:[25, 40], wood:50, bronze:5, iron:2, len:167, beam:49},
  sparta:   {name:'Spartan warship', side:'navy', city:'sparta', model:'bireme', look:{paint:'black', sail:'sparta', flag:'sparta'}, hull:230, speed:132, turn:.6, fighters:4, dmg:3, sight:650, gold:[25, 40], wood:50, bronze:5, iron:2, len:141, beam:44},
  // P64: the two-deck quinqueremes: the navies' heaviest ships (guarding their strongest fortresses) and a pirate one
  athensQ:  {name:'Athenian quinquereme', side:'navy', city:'athens', model:'quinquereme', look:{paint:'white', sail:'athens', flag:'athens'}, hull:520, speed:125, turn:.4, fighters:8, dmg:3.4, sight:700, gold:[80, 120], wood:120, bronze:20, iron:8, len:215, beam:62},
  spartaQ:  {name:'Spartan quinquereme', side:'navy', city:'sparta', model:'quinquereme', look:{paint:'black', sail:'sparta', flag:'sparta'}, hull:520, speed:125, turn:.4, fighters:8, dmg:3.4, sight:700, gold:[80, 120], wood:120, bronze:20, iron:8, len:215, beam:62},
  pirateQ:  {name:'Pirate quinquereme', model:'quinquereme', look:{paint:'raider', sail:'blood', flag:'none', helm:'pirate'}, hull:480, speed:125, turn:.42, fighters:8, dmg:3.2, sight:650, leash:1300, gold:[90, 130], wood:120, bronze:18, iron:8, len:215, beam:62},
};
for (const k in ENEMIES) ENEMIES[k].side = ENEMIES[k].side || 'pirate';
// P64: three levels of fortress (by how far out they stand) and of bandit camp. Level 3 fortresses are guarded by quinqueremes.
// P67: guards = ships around it (a level 3 fortress has 5, the farthest and Thasos 7; only the first two are quinqueremes). Richer prizes the higher the level.
// P85 (Nicholas: a level 8 fortress had one small ship guarding it): more guards, 3 / 4 / 6 (the farthest and Thasos 8)
// P84 (Nicholas: too hard to get past them, too little loot): half the health, twice the gold, and the treasury nearly fills your hold (see FILL)
export const FORT_LV = [null, {hull:325, fighters:5, dmg:2, guards:3, gold:[300, 460], wood:80, bronze:10, iron:6, linen:6}, {hull:450, fighters:7, dmg:2.5, guards:4, gold:[800, 1200], wood:170, bronze:30, iron:14, linen:12}, {hull:650, fighters:9, dmg:3.2, guards:6, most:8, gold:[1800, 2800], wood:320, bronze:70, iron:35, linen:24, big:true}];
// P84: a fallen fortress or burnt camp fills this share of the free room aboard with each supply (or gives its own amount, if that's more)
export const FILL = {fort:{wood:.9, bronze:.8, iron:.8, linen:.8}, camp:{wood:.7, bronze:.5, iron:.5, linen:.5}};
// enemy ship levels: 0 near Kallisto, 1 further, 2 far out. Bigger sails, bigger rams, fuller crews, tougher hulls.
export const SHIP_LV = {near:9000, far:16000, hull:[1, 1.3, 1.7], dmg:[1, 1.15, 1.35], gold:[1, 1.4, 2], sail:[3, 8, 14], ram:[2, 7, 12], crew:[.45, .7, 1]};
export const WITNESS = {
  crimeSeconds: 6,  // after you shoot a merchant or navy ship, any navy ship that sees you or the victim in this time joins in
  forget: 8,        // seconds out of sight (or in the Shallows) before an angry navy ship gives up
  calm: 12,         // seconds a merchant keeps fleeing once you are far away
};
// Taking islands: when an island's navy guard is sunk, the island is open. Stay near it to raise the other city's flag.
export const ISLES = {raidEvery:[120, 260], raidStay:45, takeSeconds:20, takeRange:420, aiSeconds:40, aiRange:900, reward:250, bounty:15, guardBack:25};
