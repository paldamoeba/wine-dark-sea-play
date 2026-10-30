// Game balance and settings. Change numbers here to tune the game.

export const SAVE_VERSION = 3;
export const SAVE_KEY = 'wine-dark-sea';
export const OLD_SAVE_KEYS = ['wine-dark-sea-v2'];
export const SETTINGS_KEY = 'wine-dark-sea-settings';

// fighters = crew members who shoot in a fight. More crew, more arrows.
export const SHIPS = [
  {name:'Rowboat',      model:'rowboat', speed:150, hull:40,  hold:10, fishTime:2.6, woodTime:3.0, storm:9,   len:40,  beam:17, fighters:1},
  {name:'Fishing Boat', model:'fishing', speed:195, hull:80,  hold:20, fishTime:1.8, woodTime:2.2, storm:4.5, len:64,  beam:23, fighters:2, cost:{wood:25, gold:80},
    desc:'A sail, more speed, a second crew member, steadier in rough water'},
  {name:'Bireme',       model:'bireme',  speed:235, hull:170, hold:16, fishTime:2.4, woodTime:2.6, storm:0,   len:160, beam:30, fighters:4, cost:{wood:60, gold:250},
    desc:'A warship. Four archers, a hull that survives the storm, but a small hold'},
  {name:'Trireme', locked:true, cost:{wood:120, gold:600}, desc:'Three rows of oars and a bronze ram. Coming in a later build.'},
];

export const FISH = {
  sardine: {price:3, label:'Sardine'},
  tuna:    {price:8, label:'Tuna'},
};

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
  shotEvery: 1.7,       // seconds between shots for one fighter
  arrowDmg: 3,          // damage per arrow from your crew
  hitChance: .85,
  arrowSpeed: 380,
  volleyCooldown: 14,   // the special button
  volleyArrows: 3,      // arrows per fighter in a volley
  respawn: 120,         // seconds until a sunk raider is replaced
  lootLife: 75,         // seconds floating loot stays before it sinks
  lootRange: 70,
};
export const ENEMIES = {
  skiff:  {name:'Raider skiff',  model:'skiff',  hull:36,  speed:165, fighters:2, dmg:2, sight:520, leash:900,  gold:[12, 24], wood:3, len:72,  beam:22},
  galley: {name:'Raider galley', model:'raider', hull:150, speed:190, fighters:5, dmg:3, sight:640, leash:1100, gold:[60, 90], wood:8, len:135, beam:28},
};
