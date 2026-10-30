// The hand-made map: zones, islands, fishing spots, wrecks, and the wave math.
// Pure data and math, no 3D here.
import {TUNING} from './config.js';

export const WORLD = 5800;
export const SPREAD = 1.6;
export const HOME = {x:1500, y:2900};
const OH = {x:900, y:1800}; // original layout origin, positions below are spread out from it
export const P = (x, y) => ({x: HOME.x + (x-OH.x)*SPREAD, y: HOME.y + (y-OH.y)*SPREAD});

export const ZONES = [
  {name:'The Shallows', sub:'Calm water around Kallisto'},
  {name:'Coastal Waters', sub:'Tuna run out here, and old wrecks drift in.'},
  {name:'Storm Sea', sub:'Rough water breaks small hulls. You need a bigger ship.'},
];
const ZR = [1120, 2400];

export function hash(a, b){ const s = Math.sin(a*127.1 + b*311.7)*43758.5453; return s - Math.floor(s); }
export function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };

const wob = (a, s) => (Math.sin(a*3+s)*60 + Math.sin(a*5+s*2)*35 + Math.sin(a*2+s*.5)*45) * SPREAD;
export function bounds(x, y){ const dx = x-HOME.x, dy = y-HOME.y, a = Math.atan2(dy,dx); return {d:Math.hypot(dx,dy), b0:ZR[0]+wob(a,1), b1:ZR[1]+wob(a,4)}; }
export function zoneAt(x, y){ const b = bounds(x,y); return b.d < b.b0 ? 0 : b.d < b.b1 ? 1 : 2; }
export function stormDepth(x, y){ const b = bounds(x,y); return Math.max(0, b.d - b.b1); }

export const ISLANDS = [
  {o:[900,1800], r:150, port:true, name:'Kallisto'},
  {o:[1320,1460], r:85, trees:3, name:'Elaia'},   {o:[1240,2230], r:105, trees:4, name:'Myrtia'}, {o:[560,1330], r:70, trees:2, name:'Thymari'},
  {o:[480,2380], r:90, trees:3, name:'Agrios'},   {o:[1950,1720], r:130, trees:5, name:'Kypari'}, {o:[1720,2520], r:80, trees:3, name:'Petra'},
  {o:[1980,1180], r:100, trees:4, name:'Lykos'},  {o:[2850,1850], r:170, name:'Thyella'}, {o:[2650,700], r:120, name:'Nyx'}, {o:[2500,2900], r:140, name:'Skotia'},
].map(i => ({...P(...i.o), r:i.r*1.2, port:!!i.port, name:i.name, trees:i.trees||0, stock:i.trees||0, regen:0}));
export const home = ISLANDS[0];
export const PIER_LEN = 110;
// Explored map: a 64 x 64 grid over the world, revealed as you sail.
export const EXP_N = 64, EXP_CELL = WORLD/EXP_N;
export const STADION = 100; // world units per stadion, the Greek distance unit shown on the chart

export const DOCK = {x: home.x + home.r*.85 + PIER_LEN + 30, y: home.y};

export const SPOTS = [[1150,1650],[700,1600],[1050,2050],[700,2100],[1250,1900],[600,1850],[1600,1500],[1650,2000],
  [1500,2400],[2150,1500],[1800,1300],[900,2600],[1100,1050],[400,1700]]
  .map(([x,y]) => { const p = P(x,y); return {...p, kind: zoneAt(p.x,p.y)===0 ? 'sardine' : 'tuna', stock:TUNING.spotStock, regen:0}; });

export const WRECKS = [[1150,1350],[650,2150],[1550,1850],[1400,2550],[1750,1100],[300,1600]]
  .map(([x,y], i) => ({...P(x,y), stock:TUNING.wreckStock, regen:0, rot:hash(i,9)*6.28}));

// ---- waves ----
export function seaInfo(x, z){
  const b = bounds(x, z), k0 = sstep(b.b0-160, b.b0+160, b.d), k1 = sstep(b.b1-220, b.b1+220, b.d);
  const deep = Math.max(0, b.d - b.b1);
  return {k0, k1, amp: 1.6 + k0*2.6 + k1*(7 + Math.min(10, deep/90))};
}
export function waveH(x, z, amp, t){ return amp * (Math.sin(x*.011 + t*1.3) + Math.sin(z*.013 - t*1.1)*.8 + Math.sin((x+z)*.021 + t*2)*.4) / 2.2; }
export function waveAt(x, z, t){ return waveH(x, z, seaInfo(x, z).amp, t); }
