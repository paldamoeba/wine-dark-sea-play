// Day and night: a 10 minute day. A misty sunrise, a long bright day, golden hour, sunset, a short moonlit night
// (bright enough to sail), then dawn again. At dusk every ship lights its torches, statues light their fire bowls
// and town windows glow. The time of day is kept in the save (G.S.clock), so it carries on where you left it.
// Settings can keep it always day or always night.
import {G} from './state.js?v=f11df90';
import {TORCH_ROOTS, setTorches, flicker} from './ships.js?v=f11df90';
import {WIN_MAT} from './models.js?v=f11df90';

const T = window.THREE;
export const CYCLE = 600; // seconds for a whole day
// Keyframes through the day (0 = sunrise). sky: background and fog; sun: [color, strength]; hemi: [sky light, ground light, strength];
// dir: where the sun (or moon) shines from; water: tint on the sea; glint: sun sparkle on the waves; night: 0 day to 1 night.
const KEYS = [
  {t:0,    sky:'#e6c9bd', sun:['#ffc49a', .5],  hemi:['#e4d6e2', '#6f6a70', .56], dir:[600, 260, 200],   water:'#d6d8ea', glint:.6, night:.25},
  {t:.05,  sky:null,      sun:['#ffe6c4', .64], hemi:['#e6f0f2', '#7d8670', .62], dir:[-420, 900, 160],  water:'#ffffff', glint:1,  night:0},
  {t:.70,  sky:null,      sun:['#ffe6c4', .64], hemi:['#e6f0f2', '#7d8670', .62], dir:[-420, 900, 160],  water:'#ffffff', glint:1,  night:0},
  {t:.78,  sky:'#f4bf98', sun:['#ffb866', .8],  hemi:['#ffd8be', '#7a6a66', .58], dir:[-800, 380, 200],  water:'#f2d4ea', glint:1.1, night:0},
  {t:.835, sky:'#dc8e8c', sun:['#ff9466', .58], hemi:['#eaa8b0', '#5e5068', .55], dir:[-900, 200, 0],    water:'#d9c2e2', glint:.9, night:.2},
  {t:.875, sky:'#2a3a62', sun:['#bccbff', .46], hemi:['#8299d0', '#34405c', .7], dir:[300, 700, -300],  water:'#6f7fa8', glint:.5, night:1},
  {t:.965, sky:'#2a3a62', sun:['#bccbff', .46], hemi:['#8299d0', '#34405c', .7], dir:[300, 700, -300],  water:'#6f7fa8', glint:.5, night:1},
  {t:1,    sky:'#e6c9bd', sun:['#ffc49a', .5],  hemi:['#e4d6e2', '#6f6a70', .56], dir:[600, 260, 200],   water:'#d6d8ea', glint:.6, night:.25},
];
KEYS.forEach(k => { k.skyC = k.sky ? new T.Color(k.sky) : null; k.sunC = new T.Color(k.sun[0]); k.hemiS = new T.Color(k.hemi[0]); k.hemiG = new T.Color(k.hemi[1]); k.waterC = new T.Color(k.water); });

// What the scene should look like right now (scene.js reads this every frame).
export const TOD = {sky:new T.Color(), daySky:true, skyK:0, sun:new T.Color(), sunI:.64, hemiS:new T.Color(), hemiG:new T.Color(), hemiI:.62,
  dir:new T.Vector3(-420, 900, 160), water:new T.Color('#fff'), glint:1, night:0, phase:.2};
const PRESETS = {morning:.08, noon:.4, golden:.76, sunset:.83, night:.91, dawn:.985};
const ease = x => x*x*(3 - 2*x);

export function setTimeOfDay(name){ if (PRESETS[name] !== undefined) G.S.clock = PRESETS[name]*CYCLE; }
export const timeName = () => { const p = TOD.phase; return p < .05 ? 'Dawn' : p < .7 ? 'Day' : p < .8 ? 'Golden hour' : p < .86 ? 'Sunset' : p < .97 ? 'Night' : 'Dawn'; };

function sample(p, daySky){
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1].t <= p) i++;
  const a = KEYS[i], b = KEYS[i + 1], k = ease(Math.min(1, Math.max(0, (p - a.t)/(b.t - a.t))));
  // keys without a sky color use the sea look's own sky (bright or classic)
  TOD.sky.copy(a.skyC || daySky).lerp(b.skyC || daySky, k);
  TOD.sun.copy(a.sunC).lerp(b.sunC, k); TOD.sunI = a.sun[1] + (b.sun[1] - a.sun[1])*k;
  TOD.hemiS.copy(a.hemiS).lerp(b.hemiS, k); TOD.hemiG.copy(a.hemiG).lerp(b.hemiG, k); TOD.hemiI = a.hemi[2] + (b.hemi[2] - a.hemi[2])*k;
  TOD.dir.set(...a.dir).lerp(new T.Vector3(...b.dir), k);
  TOD.water.copy(a.waterC).lerp(b.waterC, k); TOD.glint = a.glint + (b.glint - a.glint)*k; TOD.night = a.night + (b.night - a.night)*k;
}

// ---- fire: torches, fire bowls and lamplit windows ----
let halo = null; // a soft round glow drawn around each flame at night
function haloTex(){
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,226,160,1)'); gr.addColorStop(.18, 'rgba(255,190,100,.7)'); gr.addColorStop(.45, 'rgba(255,150,60,.25)'); gr.addColorStop(1, 'rgba(255,140,50,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
}
function addHalos(root){
  if (!halo) halo = new T.SpriteMaterial({map:haloTex(), blending:T.AdditiveBlending, depthWrite:false, transparent:true, fog:true});
  for (const t of root.userData.torches){ if (t.userData.halo) continue;
    const s = new T.Sprite(halo), f = t.userData.flame || t; s.scale.setScalar(t.userData.flame ? 58 : 36); s.position.y = t.userData.flame ? 3 : 4; s.renderOrder = 2; f.add(s); t.userData.halo = s; }
}
const inScene = o => { while (o.parent) o = o.parent; return o.isScene; };
const DAY_WIN = new T.Color('#33414f'), NIGHT_WIN = new T.Color('#ffc865');
let lit = false, scanT = 0, lantern = null, scene = null;
// Lights torches when the evening comes and puts them out at dawn. New ships get theirs on the next check.
function updateFires(dt){
  const on = TOD.night > .3;
  WIN_MAT.color.copy(DAY_WIN).lerp(NIGHT_WIN, Math.min(1, Math.max(0, (TOD.night - .1)/.6)));
  scanT -= dt; const check = scanT <= 0 || on !== lit; if (check) scanT = 1;
  let near = 0;
  for (const r of TORCH_ROOTS){
    if (check){ if (!inScene(r)){ if ((r.userData.lost = (r.userData.lost || 0) + 1) > 20) TORCH_ROOTS.delete(r); continue; } r.userData.lost = 0;
      if (r.userData.lit !== on){ if (on) addHalos(r); setTorches(r, on); r.userData.lit = on; } }
    if (!on || !r.userData.lit) continue;
    const p = r.getWorldPosition(tmp), d = Math.hypot(p.x - G.cam.x, p.z - G.cam.y);
    if (d < 1400){ flicker(r, G.t); if (!r.userData.spec) near = Math.max(near, 1 - d/500); }
  }
  lit = on;
  G.fireNear = on ? Math.max(.25, near) : 0; // for the crackle of fires (your own torches are always close)
  if (lantern){ lantern.visible = TOD.night > .15; lantern.intensity = Math.min(1, TOD.night*1.4)*(.9 + Math.sin(G.t*11)*.05 + Math.sin(G.t*17)*.04);
    lantern.position.set(G.S.x, 26, G.S.y); }
}
const tmp = new T.Vector3();

// The game calls this once with the scene (for the warm light around your ship at night, on High graphics).
export function initNight(sc, high){
  scene = sc;
  if (high && !lantern){ lantern = new T.PointLight('#ffad5c', 0, 260, 1.6); lantern.visible = false; scene.add(lantern); }
}

// Every frame: move the clock on and work out the light.
export function updateDayNight(dt, daySky){
  const mode = G.settings.daynight || 'cycle';
  if (G.S.clock === undefined) G.S.clock = PRESETS.morning*CYCLE*.6; // a new game starts in the early morning
  if (mode === 'cycle' && !G.sheetOpen) G.S.clock = (G.S.clock + dt) % CYCLE;
  const p = mode === 'day' ? PRESETS.noon : mode === 'night' ? PRESETS.night : G.S.clock/CYCLE;
  TOD.phase = p; sample(p, daySky);
  G.night = TOD.night;
  updateFires(dt);
}
