// Game balance and settings. Change numbers here to tune the game.

export const SAVE_VERSION = 3;
export const SAVE_KEY = 'wine-dark-sea';
export const OLD_SAVE_KEYS = ['wine-dark-sea-v2'];
export const SETTINGS_KEY = 'wine-dark-sea-settings';

// fighters = crew members who shoot in a fight. More crew, more arrows.
// turn = how fast the ship can turn (radians per second). Small boats turn quickly, big ships slowly.
export const SHIPS = [
  {name:'Rowboat',      model:'rowboat', speed:105, hull:40,  hold:10, fishTime:2.6, woodTime:3.0, storm:9,   len:40,  beam:17, fighters:1, turn:3},
  {name:'Fishing Boat', model:'fishing', speed:195, hull:80,  hold:20, fishTime:1.8, woodTime:2.2, storm:4.5, len:64,  beam:23, fighters:2, turn:2.4, cost:{wood:25, gold:80},
    desc:'A sail, more speed, a second crew member, steadier in rough water'},
  {name:'Bireme',       model:'bireme',  speed:235, hull:170, hold:16, fishTime:2.4, woodTime:2.6, storm:0,   len:160, beam:30, fighters:4, turn:1.3, cost:{wood:60, gold:250},
    desc:'A warship. Four archers, a hull that survives the storm, but a small hold'},
  {name:'Trireme', locked:true, cost:{wood:120, gold:600}, desc:'Three rows of oars and a bronze ram. Coming in a later build.'},
];

// spin = needle speed (radians per second), green = size of the green part (degrees). Bigger fish: faster, smaller.
export const FISH = {
  sardine: {price:3, label:'Sardine', spin:3.4, green:80},
  tuna:    {price:8, label:'Tuna',    spin:5.2, green:46},
  swordfish:{price:16, label:'Swordfish', spin:6.4, green:34},
};
// Sardines are caught by the crew in the light water near any shore (no minigame). Bubbling spots hold the big fish.
export const SHORE_FISH = {range:170, kind:'sardine', timeK:1.5};
// The whale: sail close to it for Poseidon's blessing.
export const WILDLIFE = {whaleFirst:[50, 100], whaleEvery:[160, 300], whaleNear:280, blessSeconds:120, blessSpeed:1.2, blessWork:.7,
  dolphinEvery:[180, 360]}; // dolphins are a rare treat, and they leave when a fight starts

export const TUNING = {
  spotStock: 3,          // fish per fishing spot
  spotRegen: 14,         // seconds to regrow one fish
  treeRegen: 25,         // seconds to regrow one tree
  wreckStock: 6,         // salvage pulls per wreck
  wreckRespawn: 90,      // seconds until a new wreck washes in
  wreckGoldChance: .35,  // chance a salvage pull also finds coins
  wreckGoldMin: 4, wreckGoldMax: 9,
  repairPerGold: 3,      // hull points per gold
  slowSpeed: 30,         // below this speed the boat can fish / gather
  fishRange: 70, wreckRange: 95, treeRange: 50, dockRange: 140,
  stormDrift: 22,
  autosaveSeconds: 5,
};

// Graphics presets. "auto" starts on high and drops to low if the phone struggles.
export const QUALITY = {
  low:  {dpr:1,    shadows:false, waterSeg:36, label:'Low'},
  high: {dpr:1.75, shadows:true,  waterSeg:56, label:'High'},
};
export const AUTO_QUALITY = {sampleSeconds:4, minFps:42};

// Fighting. Your crew and raider crews shoot by themselves when in range.
export const COMBAT = {
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
  respawn: 120,         // seconds until a sunk raider is replaced
  lootLife: 75,         // seconds floating loot stays before it sinks
  lootRange: 70,
};
export const ENEMIES = {
  skiff:  {name:'Raider skiff',  model:'skiff',  hull:36,  speed:95,  turn:1.5, fighters:2, dmg:2, sight:500, leash:900,  gold:[12, 24], wood:3, len:72,  beam:22},
  galley: {name:'Raider galley', model:'raider', hull:150, speed:150, turn:.6,  fighters:5, dmg:3, sight:600, leash:1100, gold:[60, 90], wood:8, len:135, beam:28},
  // side: pirate (always hostile), merchant (peaceful, flees), navy (hunts pirates; hunts you only if one of them saw you raid)
  merchant: {name:'Merchant ship', side:'merchant', model:'merchant', hull:90, speed:80, turn:.7, fighters:0, dmg:0, sight:450, gold:[45, 75], wood:6, len:110, beam:44},
  // navies: one kind per city. A patrol switches city when its island changes hands.
  athens:   {name:'Athenian trireme', side:'navy', city:'athens', model:'trireme', look:{paint:'white', sail:'athens', flag:'athens'}, hull:150, speed:165, turn:.75, fighters:4, dmg:3, sight:650, gold:[50, 80], wood:6, len:190, beam:34},
  sparta:   {name:'Spartan warship', side:'navy', city:'sparta', model:'bireme', look:{paint:'black', sail:'sparta', flag:'sparta'}, hull:150, speed:165, turn:.8, fighters:4, dmg:3, sight:650, gold:[50, 80], wood:6, len:160, beam:30},
};
for (const k in ENEMIES) ENEMIES[k].side = ENEMIES[k].side || 'pirate';
export const WITNESS = {
  crimeSeconds: 6,  // after you shoot a merchant or navy ship, any navy ship that sees you or the victim in this time joins in
  forget: 8,        // seconds out of sight (or in the Shallows) before an angry navy ship gives up
  calm: 12,         // seconds a merchant keeps fleeing once you are far away
};
// Taking islands: when an island's navy guard is sunk, the island is open. Stay near it to raise the other city's flag.
export const ISLES = {raidEvery:[120, 260], raidStay:45, takeSeconds:8, takeRange:380, aiSeconds:12, aiRange:900, reward:100, bounty:40, guardBack:25};
