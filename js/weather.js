// Weather: fair, calm, windy or stormy, each for a few minutes. Storms are announced a little before they hit.
// wave = how big the waves are; storm = dark sky, rain and lightning (0 to 1).
// Storms wear down small boats outside the Shallows, but fish bite faster in them: a reward for the brave.
import {G} from './state.js?v=f22acb2';
import {WEATHER_WAVES} from './world.js?v=f22acb2';
import {toast} from './ui.js?v=f22acb2';
import {sfx} from './audio.js?v=f22acb2';

export const KINDS = {
  fair:  {label:'Fair',   wave:1,   storm:0,   wind:.55, dur:[150, 280], icon:'☀'},
  calm:  {label:'Calm',   wave:.55, storm:0,   wind:.15, dur:[90, 170],  icon:'☼'},
  windy: {label:'Windy',  wave:1.5, storm:.2,  wind:1,   dur:[90, 160],  icon:'≋'},
  storm: {label:'Storm',  wave:2.1, storm:1,   wind:1,   dur:[70, 130],  icon:'⚡'},
  mist:  {label:'Misty',  wave:.5,  storm:0,   wind:.25, mist:1, dur:[60, 120], icon:'☁'}, // a soft white morning fog, sunlight glowing through
};
const NEXT = {fair:[['calm', .25], ['windy', .3], ['storm', .2], ['mist', .13], ['fair', .12]], calm:[['fair', .45], ['windy', .3], ['mist', .25]], mist:[['fair', .7], ['calm', .3]], windy:[['storm', .4], ['fair', .6]], storm:[['fair', .6], ['calm', .4]]};
const WARN = 25; // seconds of warning before a storm
const rand = ([a, b]) => a + Math.random()*(b - a);
export const W = {kind:'mist', t:45, next:'fair', warned:false, bolt:6, windA:Math.random()*6.28, windK:.25, turn:0}; // windA: where the wind blows toward; windK: how strong (0 to 1) // every voyage starts on a misty morning that soon lifts
function pick(from){ let r = Math.random(); for (const [k, p] of NEXT[from]){ if ((r -= p) <= 0) return k; } return 'fair'; }

export function updateWeather(dt){
  if (!W.next) W.next = pick(W.kind);
  W.t -= dt;
  if (W.next === 'storm' && !W.warned && W.t < WARN){ W.warned = true; toast('A storm is coming', 5); sfx('warn'); }
  if (W.t <= 0){
    W.kind = W.next; W.next = null; W.warned = false; W.t = rand(KINDS[W.kind].dur);
    // (P58: no message for calm, mist or wind: the weather chip shows it)
    if (W.kind === 'fair' && G.stormK > .3) toast('The storm passes.', 3);
  }
  const k = KINDS[W.kind], f = Math.min(1, dt*.25); // weather changes slowly
  // the wind swings round slowly, and blows harder in windy weather and storms
  W.turn += (Math.random() - .5)*dt*.02; W.turn *= Math.exp(-dt*.05); W.windA += W.turn*dt*2; W.windK += (k.wind - W.windK)*f;
  G.stormK += (k.storm - G.stormK)*f; G.mistK = (G.mistK ?? 1) + ((k.mist || 0) - (G.mistK ?? 1))*f;
  WEATHER_WAVES.k += (k.wave - WEATHER_WAVES.k)*f;
  // lightning now and then in a storm
  if (G.stormK > .6){ W.bolt -= dt; if (W.bolt <= 0){ G.flash = 1; W.bolt = 3 + Math.random()*7; setTimeout(() => sfx('thunder'), 300 + Math.random()*1500); } }
}
// How much a storm is blowing right now (0 to 1): used for wave damage and fishing.
export const storminess = () => G.stormK;
// Builder tool: make a kind of weather start now.
document.addEventListener('weather', e => { W.next = e.detail; W.t = 0; W.warned = true; });
