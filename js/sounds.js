// Tells the sound engine what is going on around the ship each frame: speed, weather, land, wrecks, fights, harbors.
import {G, ship, lvl} from './state.js?v=fe8e317';
import {SHIPS} from './config.js?v=fe8e317';
import {landDist, WRECKS} from './world.js?v=fe8e317';
import {W, KINDS} from './weather.js?v=fe8e317';
import {combatState} from './combat.js?v=fe8e317';
import {SND, applyVolumes, updateAudio, setListener, musicMood} from './audio.js?v=fe8e317';

Object.assign(SND, G.settings.sound || {}); applyVolumes();

const ROWED = {rowboat:true, bireme:true, trireme:true}; // ships pulled by oars (the others sail)
let near = {land:0, gulls:0}, scanT = 0;
// every half second: how close the land and the gulls are (gulls circle wrecks and live on the shores)
function scan(){
  const S = G.S, d = landDist(S.x, S.y);
  let wreck = 1e9; for (const w of WRECKS) if (w.stock > 0){ const k = Math.hypot(w.x - S.x, w.y - S.y); if (k < wreck) wreck = k; }
  near.land = Math.max(0, 1 - d/450);
  near.gulls = Math.min(1, Math.max(near.land*.7, wreck < 700 ? 1 - wreck/700 : 0, G.dock ? .9 : 0));
}
export function updateSounds(dt){
  if ((scanT -= dt) <= 0){ scanT = .5; scan(); }
  const S = G.S, sh = SHIPS[S.tier], k = KINDS[W.kind] || KINDS.fair;
  setListener(G.cam.x, G.cam.y, 1500*(G.settings.dev.zoom || 1));
  const night = G.night || 0;
  updateAudio(dt, {
    speed: G.sinking || G.dock ? 0 : Math.min(1, Math.abs(G.v)/(ship().speed || 1)),
    waves: k.wave*(G.dock ? .5 : 1), storm: G.stormK || 0, rain: Math.max(0, (G.stormK - .35)/.65),
    wind: Math.min(1, (k.wave - .5)*.6 + G.stormK*.5 + .15), night, land: near.land, gulls: near.gulls,
    fire: G.fireNear || 0, rowing: !!ROWED[sh.model] && !G.dock, sail: !ROWED[sh.model] || lvl('sail') > 0, docked: !!G.dock,
  });
  musicMood(combatState.threat || combatState.target ? 'battle' : G.dock ? 'harbor' : night > .6 ? 'night' : 'day');
}
