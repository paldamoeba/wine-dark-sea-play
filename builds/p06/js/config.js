// Game balance and settings. Change numbers here to tune the game.

export const SAVE_VERSION = 3;
export const SAVE_KEY = 'wine-dark-sea';
export const OLD_SAVE_KEYS = ['wine-dark-sea-v2'];
export const SETTINGS_KEY = 'wine-dark-sea-settings';

export const SHIPS = [
  {name:'Rowboat',      model:'rowboat', speed:150, hull:40, hold:10, fishTime:2.6, woodTime:3.0, storm:9,   len:40, beam:17},
  {name:'Fishing Boat', model:'fishing', speed:195, hull:80, hold:20, fishTime:1.8, woodTime:2.2, storm:4.5, len:64, beam:23, cost:{wood:25, gold:80}},
  {name:'Bireme', locked:true, cost:{wood:60, gold:250}},
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
