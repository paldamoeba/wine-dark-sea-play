// Game balance and settings. Change numbers here to tune the game.

export const SAVE_VERSION = 3;
export const SAVE_KEY = 'wine-dark-sea';
export const OLD_SAVE_KEYS = ['wine-dark-sea-v2'];
export const SETTINGS_KEY = 'wine-dark-sea-settings';

// fighters = crew members who shoot in a fight. More crew, more arrows.
// turn = how fast the ship can turn (radians per second). Small boats turn quickly, big ships slowly.
export const SHIPS = [
  {name:'Rowboat',      model:'rowboat', speed:89, hull:40,  hold:10, fishTime:2.6, woodTime:3.0, storm:1.1, len:40,  beam:17, fighters:1, turn:2.4},
  {name:'Fishing Boat', model:'fishing', speed:166, hull:80,  hold:20, fishTime:1.8, woodTime:2.2, storm:.5, len:64,  beam:23, fighters:2, turn:1.92, cost:{wood:150, linen:10, gold:60},
    desc:'A sail, more speed, a second crew member, steadier in big waves'},
  {name:'Bireme',       model:'bireme',  speed:200, hull:170, hold:16, fishTime:2.4, woodTime:2.6, storm:0,   len:160, beam:30, fighters:4, turn:1.04, cost:{wood:300, bronze:30, linen:20, gold:250},
    desc:'A warship. Four archers, a hull that shrugs off big waves, but a small hold'},
  {name:'Trireme',      model:'trireme', speed:212, hull:260, hold:18, fishTime:2.6, woodTime:2.8, storm:0,   len:190, beam:34, fighters:6, turn:.9, cost:{wood:600, bronze:80, linen:40, gold:600},
    desc:'The greatest warship of the Aegean: six archers, an outrigger and a big bronze ram'},
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
export const WILDLIFE = {whaleFirst:[50, 100], whaleEvery:[160, 300], whaleNear:280, blessSeconds:120, blessSpeed:1.2, blessWork:.7,
  dolphinEvery:[180, 360],
  krakenFirst:[100, 200], krakenEvery:[360, 600], krakenNear:250, krakenStay:40, krakenGold:30}; // the kraken: only in the Open Sea, and it dives when you come close // dolphins are a rare treat, and they leave when a fight starts

// Founding your crew (needs your second ship), the gods' blessings, and sailors to hire.
export const CREW = {
  foundCost:60, hireCost:30,
  seats:[0, 3, 5, 7],  // sailors you can hire, per ship (rowboat, fishing boat, bireme, trireme)
  jobs:{
    archer:{label:'Archer', desc:'One more bow in every fight'},
    rower: {label:'Rower',  desc:'Your ship sails 5% faster', boost:.05},
  },
  fishEach:.1, // when you stop to fish, everyone aboard fishes: each sailor makes catches 10% quicker
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

// First voyages: shown one at a time under the top bar. t = what counts, n = how many, gold = reward.
export const GOALS = [
  {t:'catch', kind:'sardine', n:3, gold:5, text:'Catch 3 sardines on glinting water'},
  {t:'sell', n:1, gold:5, text:'Sell your catch at Kallisto harbor'},
  {t:'wood', n:12, gold:6, text:'Cut 12 wood beside the cypress trees'},
  {t:'salvage', n:10, gold:8, text:'Salvage 10 wood from a wreck'},
  {t:'catch', kind:'tuna', n:1, gold:8, text:'Catch a tuna in bubbling water'},
  {t:'board', n:1, gold:6, text:'Take a job from the request board in a harbor'},
  {t:'build', n:1, gold:25, text:'Build the fishing boat at Kallisto (150 wood, 10 linen, 60 drachmae)'},
  // chapter one: from fishing boat to the pirate king (about an hour)
  {t:'build', kind:'bireme', n:1, gold:100, text:'Build the bireme at Kallisto, your first warship', chapter:true},
  {t:'sink', kind:'galley', n:3, gold:150, text:'Sink 3 raider galleys out in the Open Sea', chapter:true},
  {t:'upgrade', kind:'fire', n:1, gold:60, text:'Buy fire arrows at the Kallisto shipyard', chapter:true},
  {t:'fort', n:1, gold:300, text:'Knock down a pirate fortress, on Thasos or Kos', chapter:true},
  {t:'build', kind:'trireme', n:1, gold:200, text:'Build the trireme, the greatest warship of the Aegean', chapter:true},
  {t:'boss', n:1, gold:1500, text:'Defeat Polycrates, the pirate king, off Kos', chapter:true},
];
export const STARTER_GOALS = 7; // the first seven goals teach the basics; past the rowboat they are skipped
// Polycrates, the pirate king: a huge black galley with a golden boar's head ram, waiting off his fortress with two skiffs.
// fireEvery: seconds between his flaming volleys (they set your ship alight for burnSeconds). At half hull he calls two more skiffs.
// He never heals, so you can always sail home, repair and come back.
export const BOSS = {name:'Polycrates, the pirate king', lair:'Kos', model:'raider', scale:1.35, hull:1000, speed:150, turn:.55, fighters:8, dmg:2.2, sight:900, leash:2600,
  gold:[1200, 1200], wood:200, bronze:60, len:180, beam:38, fireEvery:20, fireArrows:12, burnSeconds:4, burnDps:3, escorts:2};
// Fire arrows: a ship hit by one burns for burnSeconds, losing dps(level) hull a second.
export const FIRE_ARROWS = {burnSeconds:3, dps:l => l ? 1 + .3*l : 0};
// The request board in every harbor.
export const REQUESTS = {offers:3, max:2,
  who:['Old Pelagia, for her taverna', 'The temple priest', 'A worried mother', 'Kleon the net maker', 'The harbor master', 'Two hungry fishermen', 'A traveling poet', 'The potter\'s daughter']};
// Messages in bottles. coins / map = chance of each (the rest are notes).
export const BOTTLES = {first:40, every:[90, 170], life:100, dist:[260, 420], coins:.45, map:.3,
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
  hull:   {label:'Planking',        ship:true, each:.08, unit:'hull',  cost:{wood:20, gold:15}, desc:'Thicker planks: more hull'},
  oars:   {label:'Oars and benches', ship:true, each:.03, unit:'speed', cost:{wood:15, gold:18}, desc:'More rowers pulling: faster'},
  sail:   {label:'Sails',           ship:true, each:.05, unit:'speed', cost:{wood:5, linen:4, gold:14}, desc:'Linen from the sailmaker and wood for the yards. Every level makes the newest sail bigger; every 5 levels a new sail goes up'},
  helm:   {label:'Steering oars',   ship:true, each:.07, unit:'turning', cost:{wood:15, gold:16}, desc:'Longer steering oars: turns quicker'},
  seats:  {label:'Crew quarters',   ship:true, crew:true, cost:{wood:25, gold:25}, desc:'Room for one more sailor every two levels'},
  arrows: {label:'Arrowheads',      each:.08, unit:'arrow damage', cost:{bronze:2, gold:18}, desc:'Bronze arrowheads for every archer'},
  ram:    {label:'Ram',             cost:{wood:20, gold:14}, desc:'A beak on the bow. Hit a ship head-on to damage it'},
  fire:   {label:'Fire arrows',     minTier:2, cost:{linen:4, gold:40}, desc:'Rags soaked in oil on every arrow. Ships you hit catch fire and keep burning for a few seconds'},
};
export const UPGRADE_MAX = 10; // sails differ per ship: 5 levels for each sail it can carry
export const SHIP_K = [.6, 1, 2, 3];
// The ram: wood levels 1-10, then bronze 1-10, then gold 1-10 (30 in all). The bronze levels are paid in bronze (pay), the gold ones in more drachmae. Damage when your bow hits a ship head-on at speed.
export const RAM = {mats:[{name:'Wood', color:'#8a5a30', k:1, cost:1}, {name:'Bronze', color:'#b07f3c', k:2.2, cost:2.5, pay:'bronze'}, {name:'Drachmae', color:'#e3b341', k:4, cost:6, pay:'gold'}],
  base:8, per:2, minSpeed:.45, cooldown:1.2, bump:3};

// Captains: hire one for a ship you're not sailing and it goes out fishing on its own, bringing back gold.
// One trip: tripSeconds at sea, then restSeconds moored at Kallisto. Pay per trip = hold × perHold, plus 4% per upgrade level on that ship.
export const CAPTAIN = {cost:60, grow:2.5, // 60, 150, 380, 940...
  tripSeconds:180, restSeconds:40, perHold:2.2, perLevel:.04,
  names:['Captain Dion', 'Captain Hero', 'Captain Lysias', 'Captain Ione', 'Captain Polybos', 'Captain Thaleia']};

// Forts on island shores: Spartan, Athenian or pirate. They shoot at you when hostile (pirates always; a city's fort once you
// attack it or its city hunts you), have a big hull, and drop their treasury when they fall. Rebuilt after `rebuild` seconds.
export const FORTS = {pirates:['Thasos', 'Kos'], // every city island except the capitals has a fortress too
  hull:{city:900, pirate:700}, fighters:7, dmg:2.5, range:560, every:3.4, gold:[320, 520], wood:150, bronze:25, rebuild:600, guards:2,
  stoneEvery:5.2, stoneRange:950, stoneFlight:2.6, stoneDmg:14, stoneHit:58, heal:4, healAfter:30};

// Trade goods: each harbor makes one cheaply and wants another. Buy low, sail, sell high.
// price at a harbor = base × (made here .6 · wanted here 1.45 · otherwise 1). You sell for 85% of the price.
export const GOODS = {
  wine:     {label:'Wine',      base:14, color:'#7a2e3a'},
  oil:      {label:'Olive oil', base:16, color:'#9aa04a'},
  pottery:  {label:'Pottery',   base:11, color:'#c46a3a'},
  obsidian: {label:'Obsidian',  base:20, color:'#2c2a33'},
  dye:      {label:'Purple dye', base:42, color:'#6b2a5e', rare:true}, // only sold at your free ports
};
// War contracts from a city's fortress: sink its rival's warships, or knock down one of the rival's fortresses.
// Hand in a finished contract at any fortress of the city that gave it.
export const WAR = {offers:[{t:'sink', n:5, gold:300}, {t:'sink', n:15, gold:1200}, {t:'fort', n:1, gold:700}]};
// Free ports: a pirate fortress you take becomes yours. Its market sells goods cheaper, cheap timber and purple dye.
export const FREEPORT = {goods:.6, wood:4, fish:1.2}; // wood: per 10
export const TRADE = {makes:{Kallisto:'pottery', Chios:'wine', Crete:'oil', Milos:'obsidian', Naxos:'wine'},
  wants:{Kallisto:'oil', Chios:'obsidian', Crete:'pottery', Milos:'wine', Naxos:'oil'}, made:.6, wanted:1.45, sellK:.85};

// Building materials: wood, bronze and linen. They go straight to your warehouse at Kallisto and never take hold space.
// Prices are per 10 wood, or per 1 bronze or linen. Wood and linen are sold in every harbor (cheapest where marked);
// bronze only by the smiths of a few cities and your free ports. Bronze also comes from warship wrecks and sunk warships.
export const TIMBER = {price:12, at:{Naxos:6, Crete:6, Chios:8, Milos:10}};
export const LINEN = {price:4, at:{Chios:3, Crete:3}};
export const BRONZE = {at:{Crete:10, Chios:12, Milos:11}, free:9};
export const MATS = {wood:{label:'Wood'}, bronze:{label:'Bronze'}, linen:{label:'Linen'}};
export const TUNING = {
  spotStock: 3,          // fish per fishing spot
  spotRegen: 14,         // seconds to regrow one fish
  treeRegen: 25,         // seconds to regrow one tree
  wreckStock: 6,         // salvage pulls per wreck
  wreckRespawn: 90,      // seconds until a new wreck washes in (sizes: WRECK_SIZES below)
  wreckGoldChance: .35,  // chance a salvage pull also finds coins
  wreckGoldMin: 4, wreckGoldMax: 9,
  repairPerGold: 3,      // hull points per gold
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
  small:  {label:'Fishing boat wreck', share:.45, scale:.6,  stock:4, wood:5,  gold:[.25, 3, 6]},
  medium: {label:'Merchant wreck',     share:.35, scale:1,   stock:6, wood:10, gold:[.35, 4, 9], goods:.3},
  large:  {label:'Warship wreck',      share:.2,  scale:1.5, stock:9, wood:15, gold:[.55, 8, 16], bronze:[.6, 1, 3]}, // bronze = [chance per pull, fewest, most]
};
// Graphics presets. "auto" starts on high and drops to low if the phone struggles.
export const QUALITY = {
  low:  {dpr:1,    shadows:false, waterSeg:64, label:'Low'},
  high: {dpr:1.5, shadows:true,  waterSeg:100, label:'High'},
};
export const AUTO_QUALITY = {sampleSeconds:4, minFps:42};

// Fighting. Your crew and raider crews shoot by themselves when in range.
export const COMBAT = {
  patchTo: .6,          // salvaged timber mends the hull up to 60%; the rest needs a dry dock
  washUpHull: .35,      // after sinking you're towed home with the hull at 35%
  range: 300,           // how far arrows fly
  shotEvery: 3,         // seconds between shots for one of your fighters
  enemyShotEvery: 4.2,  // the same for one raider fighter
  firstShot: 2.5,       // seconds a raider waits after spotting you before it shoots
  windup: 1.2,          // raiders sail at half speed for this long after spotting you
  arrowDmg: 3,          // damage per arrow from your crew
  hitChance: .85,
  arrowSpeed: 300,
  volleyCooldown: 14,   // the special button
  volleyArrows: 3,      // arrows per fighter in a volley
  sideArc: .5,          // archers shoot over the sides: no shots within about 30° of dead ahead or dead astern
  respawn: 120,         // seconds until a sunk raider is replaced
  lootLife: 75,         // seconds floating loot stays before it sinks
  lootRange: 70,
};
export const ENEMIES = {
  dinghy: {name:'Raider boat',   model:'dinghy', hull:16,  speed:80,  turn:2.2, fighters:1, dmg:1.5, sight:420, leash:800, gold:[5, 10], wood:10, len:44, beam:17},
  skiff:  {name:'Raider skiff',  model:'skiff',  hull:70,  speed:95,  turn:1.5, fighters:3, dmg:2, sight:500, leash:900,  gold:[12, 24], wood:25, bronze:1, len:72,  beam:22},
  galley: {name:'Raider galley', model:'raider', hull:150, speed:150, turn:.6,  fighters:6, dmg:3, sight:600, leash:1100, gold:[60, 90], wood:60, bronze:6, len:135, beam:28},
  // side: pirate (always hostile), merchant (peaceful, flees), navy (hunts pirates; hunts you only if one of them saw you raid)
  merchant: {name:'Merchant ship', side:'merchant', model:'merchant', hull:90, speed:80, turn:.7, fighters:0, dmg:0, sight:450, gold:[45, 75], wood:30, len:110, beam:44},
  // navies: one kind per city. A patrol switches city when its island changes hands.
  athens:   {name:'Athenian trireme', side:'navy', city:'athens', model:'trireme', look:{paint:'white', sail:'athens', flag:'athens'}, hull:150, speed:165, turn:.75, fighters:4, dmg:3, sight:650, gold:[50, 80], wood:50, bronze:5, len:190, beam:34},
  sparta:   {name:'Spartan warship', side:'navy', city:'sparta', model:'bireme', look:{paint:'black', sail:'sparta', flag:'sparta'}, hull:150, speed:165, turn:.8, fighters:4, dmg:3, sight:650, gold:[50, 80], wood:50, bronze:5, len:160, beam:30},
};
for (const k in ENEMIES) ENEMIES[k].side = ENEMIES[k].side || 'pirate';
export const WITNESS = {
  crimeSeconds: 6,  // after you shoot a merchant or navy ship, any navy ship that sees you or the victim in this time joins in
  forget: 8,        // seconds out of sight (or in the Shallows) before an angry navy ship gives up
  calm: 12,         // seconds a merchant keeps fleeing once you are far away
};
// Taking islands: when an island's navy guard is sunk, the island is open. Stay near it to raise the other city's flag.
export const ISLES = {raidEvery:[120, 260], raidStay:45, takeSeconds:20, takeRange:420, aiSeconds:40, aiRange:900, reward:250, bounty:40, guardBack:25};
