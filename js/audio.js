// Every sound in the game, made on the fly with the Web Audio API: no sound files to download or license.
// Three volume knobs: music (the lyre and flute), effects (coins, arrows, bells) and the sea (waves, wind, rain, gulls).
// Sounds with a place in the world (x, y) get quieter far from the camera and lean left or right on the screen.
// Browsers keep sound off until the first tap, so everything waits for that.
import {MUSIC_REST} from './config.js?v=a41a65b';
const AC = window.AudioContext || window.webkitAudioContext;
export const SND = {on:true, music:.3, sfx:.6, sea:.6, style:'mix', rest:'medium', ready:false}; // .6 = Medium in Settings
let ctx = null, out, musicBus, musicWet, sfxBus, seaBus, verb, noiseBuf, pinkBuf, brownBuf;
const lis = {x:0, y:0, far:1400};

// ---- start up ----
export function startAudio(){
  if (!AC) return;
  if (ctx){ if (ctx.state !== 'running' && SND.on) ctx.resume(); return; }
  init(new AC(), true); SND.ready = true; applyVolumes();
  if (ctx.state !== 'running') ctx.resume();
}
function init(c, live){
  ctx = c;
  out = ctx.createDynamicsCompressor(); out.threshold.value = -14; out.ratio.value = 4; out.connect(ctx.destination);
  const bus = v => { const g = ctx.createGain(); g.gain.value = v; g.connect(out); return g; };
  sfxBus = bus(live ? 0 : 1); seaBus = bus(live ? 0 : 1);
  // the music goes through a gentle low-pass so the lyre stays warm, never sharp
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 3400; warm.Q.value = .5; warm.connect(out);
  musicBus = ctx.createGain(); musicBus.gain.value = live ? 0 : .55; musicBus.connect(warm);
  // a soft hall for the lyre, bells and far-off sounds
  verb = ctx.createConvolver(); verb.buffer = impulse(2.6); const vg = ctx.createGain(); vg.gain.value = .32; verb.connect(vg); vg.connect(out);
  if (!noiseBuf){ noiseBuf = makeNoise('white'); pinkBuf = makeNoise('pink'); brownBuf = makeNoise('brown'); }
  musicWet = wet(musicBus, .55);
  if (live) buildBeds();
}
// For checking sounds: play one into a silent recording and hand back the samples (used by the tests).
export async function renderSound(name, secs = 3){
  const keep = {ctx, out, musicBus, musicWet, sfxBus, seaBus, verb, ready:SND.ready, on:SND.on};
  const off = new OfflineAudioContext(2, Math.ceil(44100*secs), 44100); init(off, false); SND.ready = true; SND.on = true;
  const busyKeep = busy[name]; busy[name] = -1e9; sfx(name); busy[name] = busyKeep;
  ({ctx, out, musicBus, musicWet, sfxBus, seaBus, verb} = keep); SND.ready = keep.ready; SND.on = keep.on;
  const buf = await off.startRendering(); return buf;
}
// the first tap or key anywhere turns the sound on
['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, e => { if (e.isTrusted) startAudio(); }, {capture:true, passive:true}));
export function applyVolumes(){
  if (!ctx) return; const t = ctx.currentTime, on = SND.on ? 1 : 0;
  musicBus.gain.setTargetAtTime(SND.music*.8*on, t, .3); sfxBus.gain.setTargetAtTime(SND.sfx*1.33*on, t, .1); seaBus.gain.setTargetAtTime(SND.sea*1.17*on, t, .3);
}
// A level meter on everything that plays (for tests and the showroom).
export function meter(){ if (!ctx) return null; const a = ctx.createAnalyser(); a.fftSize = 2048; out.connect(a); return a; }
export function setListener(x, y, far = 1400){ lis.x = x; lis.y = y; lis.far = far; }
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (SND.on) ctx.resume(); });
export function hush(on){ if (!ctx) return; if (on) ctx.suspend(); else if (SND.on && !document.hidden) ctx.resume(); } // P87: quiet while a video ad plays

function makeNoise(kind){
  const n = ctx.sampleRate*4, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i=0;i<n;i++){ const w = Math.random()*2 - 1;
    if (kind === 'white') d[i] = w;
    else if (kind === 'pink'){ b0 = .99765*b0 + w*.099046; b1 = .963*b1 + w*.2965164; b2 = .57*b2 + w*1.0526913; d[i] = (b0 + b1 + b2 + w*.1848)*.16; }
    else { last = (last + .02*w)/1.02; d[i] = last*3.2; } }
  return b;
}
function impulse(sec){
  const n = ctx.sampleRate*sec, b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c=0;c<2;c++){ const d = b.getChannelData(c); for (let i=0;i<n;i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/n, 3.2); }
  return b;
}

// ---- little building blocks ----
let fakeT = null; // the tests move time by hand
const now = () => fakeT ?? ctx.currentTime;
// where a sound sits: a gain for distance and a panner for left and right (the camera looks north-west, so screen right is +x, -y)
function place(bus, at, vol = 1){
  const g = ctx.createGain(); let k = vol;
  if (at){ const dx = at.x - lis.x, dy = at.y - lis.y, d = Math.hypot(dx, dy); k *= Math.max(0, 1 - d/lis.far)**2; if (k < .01) return null;
    if (ctx.createStereoPanner){ const p = ctx.createStereoPanner(); p.pan.value = Math.max(-.8, Math.min(.8, dx/600)); g.connect(p); p.connect(bus); } else g.connect(bus); }
  else g.connect(bus);
  g.gain.value = k; return g;
}
function env(g, t, a, peak, d, sus = 0){ g.gain.value = .0001; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(.0001, sus), t + a + d); }
function osc(type, f, t, dur, dest, peak = .3, a = .005, f2){
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env(g, t, a, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + .05); return o;
}
// a burst of noise through a filter. f2 sweeps the filter.
function noise(t, dur, dest, {type = 'bandpass', f = 1000, f2, q = 1, peak = .4, a = .005, buf = noiseBuf, rate = 1} = {}){
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; s.playbackRate.value = rate;
  fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q; if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env(g, t, a, peak, dur); s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random()*3); s.stop(t + a + dur + .05);
}
// P82 (Nicholas: the catch sounded like a slap): water. A soft wash of spray, a run of rising bubbles and a few drops falling back.
function water(t, d, k = 1){
  noise(t, .5*k, d, {type:'lowpass', f:1600, f2:380, q:.5, peak:.32*k, a:.035});
  for (let i = 0; i < Math.round(5*k); i++){ const f = 380 + Math.random()*520, t0 = t + .02 + i*.045 + Math.random()*.02; osc('sine', f, t0, .07, d, .1*k, .004, f*2.3); }
  for (let i = 0; i < 3; i++){ const f = 1300 + Math.random()*900, t0 = t + .26 + i*.08 + Math.random()*.04; osc('sine', f, t0, .05, d, .05*k, .002, f*1.5); }
}
function wet(dest, amt){ const g = ctx.createGain(); g.gain.value = amt; g.connect(verb); const split = ctx.createGain(); split.connect(dest); split.connect(g); return split; }

// a plucked string (Karplus-Strong), rendered once per note and kept
const plucks = new Map();
function pluckBuf(f, bright = .5){
  const key = Math.round(f*10) + '|' + bright; if (plucks.has(key)) return plucks.get(key);
  const sr = ctx.sampleRate, n = Math.floor(sr*2.4), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), p = Math.max(2, Math.round(sr/f)), line = new Float32Array(p);
  for (let i=0;i<p;i++) line[i] = (Math.random()*2 - 1)*(.6 + .4*Math.sin(i/p*Math.PI));
  let idx = 0; const damp = .994 + bright*.0045;
  for (let i=0;i<n;i++){ const cur = line[idx], nxt = line[(idx + 1) % p]; const v = (cur*(1 - bright*.3) + nxt*(1 + bright*.3))*.5*damp; line[idx] = v; d[i] = cur; idx = (idx + 1) % p; }
  // soften the very start so it does not click, and fade the tail
  for (let i=0;i<64;i++) d[i] *= i/64; for (let i=n - 2000;i<n;i++) d[i] *= (n - i)/2000;
  plucks.set(key, b); return b;
}
function pluck(f, t, dest, vol = .5, bright = .5){
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = pluckBuf(f, bright); g.gain.value = vol; s.connect(g); g.connect(dest); s.start(t);
}
const midi = m => 440*Math.pow(2, (m - 69)/12);

// ---- one-shot sounds ----
// sfx('coin') plays where you are; sfx('bow', {x, y}) plays out in the world.
export const played = {}; // how many times each sound played (for tests)
const busy = {}; // keeps very fast repeats (a volley of 20 arrows) from piling up into noise
export function sfx(name, at, vol = 1){
  if (!ctx || !SND.on || !SND.ready) return;
  const S = SOUNDS[name]; if (!S) return;
  const t = now(), gap = S.gap || .03; if (busy[name] && t - busy[name] < gap) return; busy[name] = t;
  const g = place(S.sea ? seaBus : sfxBus, at, vol*(S.vol || 1)); if (!g) return;
  S.play(t + .01, g); played[name] = (played[name] || 0) + 1;
}
export const SOUNDS = {
  click:{name:'Button tap', vol:.5, play:(t, d) => { osc('sine', 1300, t, .05, d, .25, .002, 700); }},
  open:{name:'Menu opens', vol:.6, play:(t, d) => { noise(t, .12, d, {f:1600, f2:700, q:1.4, peak:.35}); osc('sine', 330, t, .14, d, .18, .004, 440); }},
  close:{name:'Menu closes', vol:.5, play:(t, d) => { noise(t, .1, d, {f:900, f2:1600, q:1.4, peak:.3}); osc('sine', 440, t, .12, d, .14, .004, 330); }},
  coin:{name:'Coin', gap:.05, play:(t, d) => { [0, .07].forEach((o, i) => { const f = i ? 2637 : 1976; osc('sine', f, t + o, .35, d, .22); osc('sine', f*2.76, t + o, .12, d, .06); }); }},
  coins:{name:'Selling: a pile of coins', play:(t, d) => { for (let i=0;i<9;i++){ const o = i*.045 + Math.random()*.03, f = 1800 + Math.random()*1400; osc('sine', f, t + o, .28, d, .16); osc('sine', f*2.7, t + o, .08, d, .05); } noise(t, .5, d, {type:'highpass', f:5000, peak:.05}); }},
  fish:{name:'Fish caught', gap:.08, play:(t, d) => { noise(t, .25, d, {f:2400, f2:500, q:.8, peak:.5}); osc('sine', 210, t + .05, .1, d, .25, .003, 130); osc('sine', 260, t + .18, .08, d, .18, .003, 160); }},
  catch:{name:'Big fish landed', play:(t, d) => { water(t, d, 1); const w = wet(d, .5); [62, 66, 69, 74].forEach((m, i) => jingle(m + 12, t + .15 + i*.08, w, .5)); }},
  miss:{name:'The fish got away', play:(t, d) => { water(t, d, .6); const w = wet(d, .4); [69, 65, 62].forEach((m, i) => jingle(m, t + .05 + i*.12, w, .4, .3)); }},
  wood:{name:'Wood picked up', gap:.08, play:(t, d) => { [0, .11].forEach(o => { osc('triangle', 240, t + o, .09, d, .35, .002, 150); noise(t + o, .05, d, {f:1100, q:2, peak:.3}); }); }},
  chop:{name:'Axe on a tree', gap:.15, play:(t, d) => { noise(t, .07, d, {type:'lowpass', f:2600, peak:.7}); osc('triangle', 180, t, .14, d, .45, .002, 110); noise(t + .05, .25, d, {f:3500, f2:6000, q:4, peak:.04}); }},
  bow:{name:'Arrow fired', gap:.04, play:(t, d) => { osc('triangle', 190, t, .09, d, .35, .002, 120); noise(t + .02, .32, d, {f:2200, f2:600, q:2, peak:.3, a:.04}); }},
  thud:{name:'Arrow hits a hull', gap:.05, vol:1.4, play:(t, d) => { noise(t, .09, d, {type:'lowpass', f:420, peak:.55, buf:brownBuf, a:.003}); osc('sine', 150, t, .1, d, .38, .004, 82); }},
  plop:{name:'Arrow misses into the sea', gap:.06, vol:.9, play:(t, d) => { osc('sine', 900, t, .07, d, .2, .003, 1500); noise(t, .14, d, {f:3000, f2:1200, q:1.5, peak:.15}); }},
  // P71: a dull heavy knock on thick wood, with nothing high in it
  hurt:{name:'Your hull is hit', gap:.12, vol:1.7, play:(t, d) => { noise(t, .2, d, {type:'lowpass', f:380, f2:130, peak:.95, buf:brownBuf, a:.004}); osc('sine', 118, t, .26, d, .7, .005, 52); osc('triangle', 196, t, .08, d, .26, .004, 120); }},
  volley:{name:'Volley', play:(t, d) => { for (let i=0;i<6;i++){ const o = i*.05 + Math.random()*.03; osc('triangle', 170 + Math.random()*50, t + o, .09, d, .2, .002, 110); noise(t + o + .02, .4, d, {f:2000, f2:500, q:2, peak:.12, a:.05}); } }},
  catapult:{name:'Catapult throws', gap:.3, play:(t, d) => { creakAt(t, d, .7); osc('sine', 70, t + .25, .25, d, .45, .003, 40); noise(t + .25, .2, d, {type:'lowpass', f:700, peak:.4}); }},
  bigsplash:{name:'Stone lands in the sea', gap:.15, play:(t, d) => { noise(t, .9, d, {type:'lowpass', f:3500, f2:250, peak:.7, a:.01}); osc('sine', 110, t, .25, d, .4, .004, 50); }},
  ram:{name:'Ram hit', play:(t, d) => { osc('sine', 75, t, .35, d, .9, .002, 35); noise(t, .35, d, {type:'lowpass', f:1800, f2:300, peak:.8}); for (let i=0;i<4;i++) noise(t + .05 + i*.06, .05, d, {type:'highpass', f:2500, peak:.35}); }},
  bump:{name:'Ships bump', gap:.3, play:(t, d) => { osc('sine', 110, t, .18, d, .5, .003, 70); noise(t, .1, d, {type:'lowpass', f:800, peak:.35}); }},
  // P84 (Nicholas: redo the sinking sound): told as a story, all wood and water. Timbers crack, the sea rushes in, the hull groans,
  // big slow bubbles glug up as she goes under, then the water closes over her. (The old one had low buzzing tones under it.)
  crash:{name:'A ship breaks apart', gap:.4, play:(t, d) => { timberCrack(t, d, .9); rushIn(t + .15, d, 1.1, .5); creakAt(t + .5, d, .35); glugs(t + .7, d, 5, .8); }},
  sink:{name:'Your ship sinks', play:(t, d) => { const w = wet(d, .35); timberCrack(t, w, 1); rushIn(t + .2, w, 2.2, .7); creakAt(t + .6, w, .55); creakAt(t + 1.5, w, .45);
    glugs(t + 1.2, w, 9, 1); noise(t + 3.2, 1.4, w, {type:'lowpass', f:900, f2:250, q:.5, peak:.22, a:.3, buf:pinkBuf}); [62, 57].forEach((m, i) => jingle(m, t + 3.4 + i*.5, w, .25, .2)); }},
  bubbles:{name:'Bubbles', play:(t, d) => bubbles(t, d, 12)},
  bell:{name:'Harbor bell', gap:.5, play:(t, d) => { const w = wet(d, .9); bell(t, w, 523, .4); bell(t + .9, w, 523, .3); }},
  // P82: a conch shell, soft and breathy. The old horn was two buzzing sawtooth tones and could sound like an engine.
  horn:{name:'War horn (conch)', gap:1, play:(t, d) => { const w = wet(d, .6), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 1100; f.Q.value = .7;
    g.gain.value = .0001; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.26, t + .14); g.gain.setValueAtTime(.24, t + .95); g.gain.exponentialRampToValueAtTime(.0001, t + 1.45); f.connect(g); g.connect(w);
    [[196, 'triangle', 1], [392, 'sine', .35], [588, 'sine', .12]].forEach(([fr, ty, v]) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = ty; o.frequency.setValueAtTime(fr*.94, t); o.frequency.linearRampToValueAtTime(fr, t + .18); og.gain.value = v; o.connect(og); og.connect(f); o.start(t); o.stop(t + 1.55); });
    noise(t, 1.3, w, {f:420, q:1.2, peak:.07, a:.12}); }},
  chime:{name:'Goal or job done', play:(t, d) => { const w = wet(d, .6); [62, 66, 69, 74, 78].forEach((m, i) => jingle(m + 12, t + i*.09, w, .45, .6)); }},
  fanfare:{name:'New ship ready', play:(t, d) => { SOUNDS.horn.play(t, d); const w = wet(d, .6); [[62, 66, 69], [64, 67, 71], [66, 69, 74]].forEach((ch, i) => ch.forEach((m, k) => jingle(m + 12, t + .4 + i*.3 + k*.025, w, .4, .6))); }},
  hammer:{name:'Shipwright at work', play:(t, d) => { for (let i=0;i<3;i++){ const o = i*.2; noise(t + o, .05, d, {f:2500, q:3, peak:.5}); osc('triangle', 330, t + o, .08, d, .3, .001, 200); osc('sine', 2900, t + o, .12, d, .05); } SOUNDS.chime.play(t + .65, d); }},
  buy:{name:'Bought something', play:(t, d) => { SOUNDS.coin.play(t, d); osc('sine', 660, t + .1, .12, d, .1); }},
  blessing:{name:'Poseidon\'s blessing', play:(t, d) => { const w = wet(d, 1); for (let i=0;i<14;i++) jingle(62 + [0, 2, 4, 7, 9][i % 5] + 12*Math.floor(i/5), t + i*.06, w, .35, .7);
    osc('sine', 1174, t + .9, 1.6, w, .06, .6); osc('sine', 1760, t + 1, 1.6, w, .04, .6); }},
  whale:{name:'Whale song', gap:2, sea:true, play:(t, d) => { const w = wet(d, 1.2), o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.linearRampToValueAtTime(240, t + .8); o.frequency.linearRampToValueAtTime(120, t + 2.6);
    lfo.frequency.value = 5; lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency); f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.value = .0001; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.2, t + .5); g.gain.linearRampToValueAtTime(.14, t + 2); g.gain.exponentialRampToValueAtTime(.0001, t + 2.8);
    o.connect(f); f.connect(g); g.connect(w); o.start(t); lfo.start(t); o.stop(t + 3); lfo.stop(t + 3);
    noise(t + 2.4, 1.1, d, {f:900, f2:2500, q:.6, peak:.3, a:.15}); }},
  kraken:{name:'The kraken groans', gap:2, sea:true, play:(t, d) => { const w = wet(d, 1.3), o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(62, t); o.frequency.linearRampToValueAtTime(48, t + 2.2); lfo.frequency.value = 7; lg.gain.value = 4; lfo.connect(lg); lg.connect(o.frequency); f.type = 'lowpass'; f.frequency.value = 320;
    g.gain.value = .0001; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.4, t + .6); g.gain.exponentialRampToValueAtTime(.0001, t + 2.6);
    o.connect(f); f.connect(g); g.connect(w); o.start(t); lfo.start(t); o.stop(t + 2.8); lfo.stop(t + 2.8); bubbles(t + .4, d, 14); }},
  spout:{name:'Whale blows', sea:true, play:(t, d) => noise(t, 1.2, d, {f:700, f2:2200, q:.5, peak:.35, a:.12})},
  splash:{name:'Splash', gap:.1, sea:true, play:(t, d) => noise(t, .35, d, {f:2200, f2:500, q:.8, peak:.5})},
  gull:{name:'Gull calls', gap:.4, sea:true, play:(t, d) => gullCry(t, d)},
  // P70: thunder, three distances: the crack comes first and sharp when it's close; far off there is only a long roll
  thunder:{name:'Thunder: a few miles off', gap:1, sea:true, vol:1.45, play:(t, d) => thunderAt(t, d, .55)},
  thunderNear:{name:'Thunder: right overhead', gap:1, sea:true, vol:1.15, play:(t, d) => thunderAt(t, d, 1)},
  thunderFar:{name:'Thunder: far away', gap:1, sea:true, vol:1.35, play:(t, d) => thunderAt(t, d, .12)},
  creak:{name:'Hull creaks', gap:.5, sea:true, play:(t, d) => creakAt(t, d, .35)},
  rain:{name:'Rain', sea:true, gap:2, play:(t, d) => rainSample(t, d, 10)},
  torch:{name:'Torches at night', sea:true, gap:2, play:(t, d) => torchSample(t, d, 10)},
  oar:{name:'Oar stroke', gap:.15, sea:true, play:(t, d) => { noise(t, .4, d, {type:'lowpass', f:900, f2:400, peak:.09, a:.08}); noise(t + .22, .5, d, {f:1800, f2:900, q:.8, peak:.035, a:.12}); }}, // a soft swish of water, no click
  drum:{name:'Rowing drum', gap:.2, play:(t, d) => { osc('sine', 82, t, .22, d, .5, .004, 55); noise(t, .06, d, {type:'lowpass', f:500, peak:.2}); }},
  // P83: the sail catching the wind: one soft gust that dies away, two loose flaps of cloth, then it fills with a deep whump and the wood creaks.
  // (The P65 sound swept a filter upward under a run of faster and faster flaps, which sounded like an engine starting.)
  sailfill:{name:'Sail catches the wind', gap:2, sea:true, vol:1.5, play:(t, d) => {
    noise(t, .9, d, {f:900, f2:450, q:.6, peak:.3, a:.25, buf:pinkBuf});
    noise(t + .05, .14, d, {f:520, f2:330, q:1, peak:.3, buf:pinkBuf}); noise(t + .34, .14, d, {f:480, f2:300, q:1, peak:.26, buf:pinkBuf});
    noise(t + .62, .3, d, {f:300, f2:120, q:.7, peak:.55, buf:pinkBuf}); osc('sine', 62, t + .62, .3, d, .3, .006, 42);
    creakAt(t + .95, d, .2); }},
  sail:{name:'Sail flaps', gap:.6, sea:true, play:(t, d) => { noise(t, .13, d, {f:500, f2:300, q:.8, peak:.45, buf:pinkBuf}); noise(t + .22 + Math.random()*.12, .12, d, {f:460, f2:290, q:.8, peak:.28, buf:pinkBuf}); }}, // P83: two loose flaps, not a quick run (a run sounded like a motor)
  bottle:{name:'Bottle opened', play:(t, d) => { osc('sine', 2400, t, .3, d, .2); osc('sine', 3900, t + .05, .2, d, .1); osc('sine', 700, t + .4, .06, d, .22, .001, 300); noise(t + .4, .05, d, {type:'highpass', f:2000, peak:.3}); }},
  treasure:{name:'Treasure found', play:(t, d) => { creakAt(t, d, .4); SOUNDS.coins.play(t + .3, d); SOUNDS.chime.play(t + .5, d); }},
  crowd:{name:'The arena crowd cheers', gap:1, play:(t, d) => { const w = wet(d, .6); [700, 1100, 1600, 2400].forEach((f, i) => noise(t + i*.03, 2, w, {f, q:1.5, peak:.35, a:.4, buf:pinkBuf})); for (let i=0;i<10;i++) osc('triangle', 500 + Math.random()*500, t + .2 + Math.random()*1.2, .25, w, .06, .05); }},
  zone:{name:'New waters', play:(t, d) => { const w = wet(d, .9); jingle(57, t, w, .35, .35); jingle(64, t + .25, w, .3, .35); jingle(69, t + .5, w, .3, .35); }},
  warn:{name:'A storm is coming', sea:true, play:(t, d) => noise(t, 3.5, d, {type:'lowpass', f:160, f2:60, peak:.7, buf:brownBuf, a:.6})},
  dock:{name:'Mooring ropes', play:(t, d) => { creakAt(t, d, .35); osc('sine', 120, t + .2, .2, d, .3, .004, 80); noise(t + .2, .1, d, {type:'lowpass', f:900, peak:.3}); }},
};
// P71: thunder is all low: no crack at all. A heavy boom that swells in when it's close, then a long deep roll that rises and sinks slowly, wandering across the sky.
// near: 1 overhead, 0 far off. A soft clip adds just enough low overtones to carry on a phone speaker.
function softClip(){ const w = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n); for (let i=0;i<n;i++){ const x = i/(n - 1)*2 - 1; c[i] = Math.tanh(x*1.8)/Math.tanh(1.8); } w.curve = c; return w; }
function thunderAt(t, d, near){
  const R = Math.random, far = 1 - near, dur = 7 + far*3 + R()*3, mix = ctx.createGain(); mix.gain.value = .6 + near*.4;
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 520; tone.Q.value = .4; mix.connect(tone); // nothing sharp gets through
  let last = tone; if (ctx.createStereoPanner){ const p = ctx.createStereoPanner(), s = (R() < .5 ? -1 : 1)*(.2 + R()*.3); p.pan.setValueAtTime(s, t); p.pan.linearRampToValueAtTime(-s*.6, t + dur); tone.connect(p); last = p; }
  last.connect(wet(d, .25 + far*.4));
  // the boom: a very low swell, felt more than heard
  if (near > .3){ const k = near*near; osc('sine', 78, t, 1.5, mix, .95*k, .06, 30); osc('sine', 118, t + .03, 1, mix, .5*k, .07, 46); noise(t, 1.9, mix, {type:'lowpass', f:300, f2:70, peak:1.1*k, a:.09, buf:brownBuf}); }
  const roll = ctx.createGain(), clip = softClip(), start = t + .08 + far*.3; roll.gain.value = .0001; roll.connect(clip); clip.connect(mix);
  const src = (f, q, g, type, f2) => { const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), gn = ctx.createGain(); s.buffer = brownBuf; s.loop = true; s.playbackRate.value = .55 + R()*.15; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, start); fl.frequency.exponentialRampToValueAtTime(f2, start + dur); gn.gain.value = g; s.connect(fl); fl.connect(gn); gn.connect(roll); s.start(start, R()*3); s.stop(start + dur + .1); };
  src(120 + near*60, .7, 2.2, 'lowpass', 55);
  src(170 + near*70, 1, 1.6, 'bandpass', 95);
  // slow swells, each a little lower than the one before
  let at = start, level = .6 + near*.45; roll.gain.setValueAtTime(.0001, start);
  while (at < start + dur - 1){ const up = .2 + R()*.5, back = .5 + R()*1.1, peak = level*(.6 + R()*.4);
    roll.gain.linearRampToValueAtTime(peak, at + up); roll.gain.linearRampToValueAtTime(peak*(.35 + R()*.3), at + up + back); at += up + back; level *= .84 + R()*.08; }
  roll.gain.exponentialRampToValueAtTime(.0001, start + dur);
}
// P84: wood splitting: a few sharp dry snaps close together, with a dull knock of the hull under them
function timberCrack(t, d, k){ for (let i = 0; i < 4; i++){ const o = i*.05 + Math.random()*.04; noise(t + o, .05 + Math.random()*.04, d, {f:900 + Math.random()*1400, q:2.5, peak:.45*k, a:.001}); }
  noise(t, .25, d, {type:'lowpass', f:420, f2:160, q:.7, peak:.5*k, a:.004, buf:brownBuf}); }
// the sea pouring in: a wide wash of water that swells and dies away
function rushIn(t, d, dur, k){ noise(t, dur, d, {type:'lowpass', f:700, f2:1500, q:.4, peak:.35*k, a:dur*.35, buf:pinkBuf}); noise(t + .1, dur*.8, d, {f:2400, f2:1200, q:.6, peak:.1*k, a:dur*.3}); }
// big air bubbles escaping the hull: round low "glug"s, each a quick upward chirp, further and further apart
function glugs(t, d, n, k){ let o = 0; for (let i = 0; i < n; i++){ const f = 110 + Math.random()*90; osc('sine', f, t + o, .12, d, .22*k*(1 - i/(n + 2)), .01, f*2.4); noise(t + o, .1, d, {type:'lowpass', f:600, f2:300, peak:.08*k}); o += .16 + i*.05 + Math.random()*.08; } }
function bubbles(t, d, n){ for (let i=0;i<n;i++){ const o = i*.07 + Math.random()*.05, f = 300 + Math.random()*500; osc('sine', f, t + o, .06, d, .12, .004, f*2.2); } }
function bell(t, d, f, vol){ [[1, 1], [2.02, .5], [2.76, .35], [4.07, .2], [5.4, .1]].forEach(([r, v]) => osc('sine', f*r, t, 2.4/r + .4, d, vol*v, .002)); }
// P82 (Nicholas: something sounded like an engine running): the creak was a buzzing sawtooth whose pitch rose, like a motor revving.
// Wood creaks by sticking and slipping: an uneven run of tiny clicks that speeds up and slows down, never a steady pitch.
const creaks = [];
function creakBuf(){
  if (creaks.length >= 6) return creaks[Math.floor(Math.random()*creaks.length)];
  const sr = ctx.sampleRate, n = Math.floor(sr*.6), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), r0 = 18 + Math.random()*14, r1 = r0*(1.4 + Math.random()*.8);
  let x = Math.floor(sr*.01);
  while (x < n){ const u = x/n, rate = u < .45 ? r0 + (r1 - r0)*u/.45 : r1 - (r1 - r0)*.7*(u - .45)/.55, len = Math.floor(sr*.0025), amp = .5 + Math.random()*.5;
    for (let i = 0; i < len && x + i < n; i++) d[x + i] += (Math.random()*2 - 1)*amp*Math.exp(-i/(len*.3));
    x += Math.floor(sr/rate*(.6 + Math.random()*.8)); }
  creaks.push(b); return b;
}
function creakAt(t, d, vol){ vol *= 2.2; const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = creakBuf(); s.playbackRate.value = .85 + Math.random()*.3;
  f.type = 'bandpass'; f.frequency.value = 650 + Math.random()*300; f.Q.value = 4; f2.type = 'peaking'; f2.frequency.value = 1700 + Math.random()*500; f2.Q.value = 5; f2.gain.value = 8;
  g.gain.value = .0001; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol*.5, t + .06); g.gain.linearRampToValueAtTime(vol*.35, t + .35); g.gain.exponentialRampToValueAtTime(.0001, t + .6);
  s.connect(f); f.connect(f2); f2.connect(g); g.connect(d); s.start(t); s.stop(t + .7); }
// a gull: two or three falling "kee-ow" cries
function gullCry(t, d){ const n = 2 + Math.floor(Math.random()*2), p = .9 + Math.random()*.25;
  for (let i=0;i<n;i++){ const s = t + i*(.26 + Math.random()*.08), o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(1300*p, s); o.frequency.linearRampToValueAtTime(1750*p, s + .05); o.frequency.exponentialRampToValueAtTime(850*p, s + .22);
    f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 2.5;
    g.gain.value = .0001; g.gain.setValueAtTime(.0001, s); g.gain.linearRampToValueAtTime(.26, s + .03); g.gain.exponentialRampToValueAtTime(.0001, s + .24);
    o.connect(f); f.connect(g); g.connect(d); o.start(s); o.stop(s + .3); } }

// ---- the sea: sounds that never stop, louder or softer with what is happening ----
let beds = null;
const FIRE = {low:.07, lowMove:.22, air:.03, airMove:.13}; // P66: how loud the torch's flutter is, steady part and moving part (the air layer is what a phone speaker can actually play)
function loop(buf, type, f, q, dest){ const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; s.loop = true;
  fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(dest); s.start(0, Math.random()*3); return {g, fl}; }
function buildBeds(){
  beds = {
    waves: loop(brownBuf, 'lowpass', 420, .5, seaBus),   // the low roll of the sea
    wash:  loop(pinkBuf, 'bandpass', 700, .7, seaBus),   // waves breaking, swelling in and out
    wind:  loop(pinkBuf, 'bandpass', 500, 1.6, seaBus),  // wind, whistling higher in storms
    rain:  loop(pinkBuf, 'bandpass', 5200, .4, seaBus),  // P67: rain: a soft, wide hiss of far-off drops...
    rainLow: loop(pinkBuf, 'bandpass', 900, .55, seaBus), // ...the patter on the water around you...
    bow:   loop(pinkBuf, 'bandpass', 1100, .9, seaBus),  // water rushing past the hull
    fire:  loop(brownBuf, 'lowpass', 420, .6, seaBus),   // P66: a torch is mostly a low, soft flutter of burning air...
    fireAir: loop(pinkBuf, 'bandpass', 850, .5, seaBus), // ...with a little breath on top that moves with it
  };
}
// The game calls this every frame with what is going on around the ship.
// a = {speed 0..1, waves 0..2, storm 0..1, wind 0..1, rain 0..1, night 0..1, gulls 0..1, fire 0..1, rowing, sail, docked}
const QUIET = {speed:0, waves:1, storm:0, wind:0, rain:0, night:0, land:0, gulls:0, fire:0, rowing:false, burst:false, sail:false, docked:false};
let swell = 0, windWander = 0, nextGull = 4, nextCreak = 3, oarT = 0, nextCricket = 1, nextCrackle = 1, nextSail = 5, flutter = .5, flutterTo = .5, nextFlutter = 0, gust = .8, gustTo = .8, nextGust = 1, dropN = 0;
export function updateAudio(dt, a){
  if (!ctx || !beds || !SND.on || (ctx.state !== 'running' && fakeT === null)) return;
  a = {...QUIET, ...a};
  if (a.seaOff){ for (const n in beds) beds[n].g.gain.setTargetAtTime(0, now(), .2); if (!a.musicOn){ if (M.drone) droneStop(); return; } updateMusic(dt, a); return; }
  const t = now(), set = (n, v, tc = .4) => beds[n].g.gain.setTargetAtTime(v, t, tc);
  swell += dt*(.9 + a.waves*.25); windWander += (Math.random() - .5)*dt*2;
  windWander = Math.max(-1, Math.min(1, windWander));
  const sw = .55 + .45*Math.sin(swell*.9)*Math.sin(swell*.37 + 1);
  set('waves', .16 + a.waves*.1 + a.storm*.08);
  set('wash', (.05 + a.waves*.05 + a.storm*.06)*sw, .25); beds.wash.fl.frequency.setTargetAtTime(500 + sw*500, t, .3);
  set('wind', a.wind*.13 + a.storm*.12); beds.wind.fl.frequency.setTargetAtTime(380 + a.storm*500 + windWander*180, t, .5);
  // P67: rain comes in waves, never a steady jet, with single drops landing all around (that steady hiss is what sounded like a hose)
  if ((nextGust -= dt) <= 0){ nextGust = .9 + Math.random()*2.4; gustTo = .55 + Math.random()*.6; } gust += (gustTo - gust)*Math.min(1, dt*.9);
  set('rain', a.rain*RAIN.hiss*gust, .3); set('rainLow', a.rain*RAIN.patter*gust, .3);
  if (a.rain > .03){ dropN += dt*a.rain*RAIN.drops*gust; while (dropN >= 1){ dropN--; const g = place(seaBus, null, a.rain); if (g) raindrop(t + Math.random()*.04, dropBus(g)); } }
  set('bow', a.speed*a.speed*.12, .2);
  // P66: the flame wanders: it swells and sinks a few times a second, never steady, like a real flame in the wind
  if ((nextFlutter -= dt) <= 0){ nextFlutter = .07 + Math.random()*.26; flutterTo = .3 + Math.random()*.7; }
  flutter += (flutterTo - flutter)*Math.min(1, dt*9);
  const fireK = a.fire*(1 - a.storm*.6); // the rain and wind drown a torch out
  set('fire', fireK*(FIRE.low + flutter*FIRE.lowMove), .05);
  set('fireAir', fireK*(FIRE.air + flutter*FIRE.airMove), .05); beds.fireAir.fl.frequency.setTargetAtTime(600 + flutter*650, t, .08);
  const sea = seaBus;
  // gulls near islands, wrecks and harbors
  if ((nextGull -= dt) <= 0){ nextGull = 4 + Math.random()*10; if (Math.random() < a.gulls && a.night < .5){ const g = place(sea, null, .25 + Math.random()*.3); if (g){ if (ctx.createStereoPanner){ const p = ctx.createStereoPanner(); p.pan.value = Math.random()*1.4 - .7; g.disconnect(); g.connect(p); p.connect(sea); } gullCry(t, g); } } }
  // the hull creaks as the boat rolls, more in big waves
  if ((nextCreak -= dt) <= 0){ nextCreak = 3 + Math.random()*7/(.6 + a.waves*.5); if (!a.docked || Math.random() < .3){ const g = place(sea, null, .5 + a.waves*.3); if (g) creakAt(t, g, .35); } }
  // oars dip in time with the stroke
  // P56: a slow, soft stroke while someone rows (about one every 2 seconds); a Row! burst is quicker, with a drum keeping time
  if (a.rowing && a.speed > .08){ oarT += dt*(a.burst ? 1.25 : .32 + a.speed*.18); if (oarT >= 1){ oarT -= 1; const g = place(sea, null, (.35 + a.speed*.3)*(a.burst ? 1.2 : 1)); if (g){ SOUNDS.oar.play(t, g); if (a.burst) SOUNDS.drum && SOUNDS.drum.play(t, g); } } }
  if (a.sail && a.speed > .3 && (nextSail -= dt) <= 0){ nextSail = 6 + Math.random()*10; const g = place(sea, null, .4 + a.wind*.6); if (g) SOUNDS.sail.play(t, g); }
  // crickets at night, from the islands
  if (a.night > .5 && a.land > .2 && (nextCricket -= dt) <= 0){ nextCricket = .5 + Math.random()*1.4; const g = place(sea, null, .1*a.land); if (g) cricket(t, g); }
  // P66: a few small cracks now and then, not a constant patter. A fire bowl close by is busier than your own torches.
  if (fireK > .05 && (nextCrackle -= dt) <= 0){ nextCrackle = (.9 + Math.random()*3.2)/(.45 + fireK); crackle(t, sea, fireK); }
  updateMusic(dt, a);
}
// P67: one raindrop: a tiny wet tick, somewhere left or right. Now and then a bigger, rounder one.
const RAIN = {hiss:.15, patter:.22, drops:24, drop:2.4};
function dropBus(g){ if (!ctx.createStereoPanner) return g; const p = ctx.createStereoPanner(); p.pan.value = Math.random()*1.7 - .85; g.disconnect(); g.connect(p); p.connect(seaBus); return g; }
function raindrop(t, d){ const big = Math.random() < .14, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), len = big ? .03 + Math.random()*.03 : .004 + Math.random()*.014, peak = RAIN.drop*(big ? .1 + Math.random()*.12 : .025 + Math.random()*Math.random()*.11);
  s.buffer = noiseBuf; fl.type = 'bandpass'; fl.frequency.value = big ? 500 + Math.random()*800 : 1400 + Math.random()*5200; fl.Q.value = big ? 3 + Math.random()*3 : 1.5 + Math.random()*4;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + .001); g.gain.exponentialRampToValueAtTime(.0001, t + .001 + len);
  s.connect(fl); fl.connect(g); g.connect(d); s.start(t, Math.random()*3); s.stop(t + len + .02); }
function rainSample(t, d, secs){
  const layer = (f, q, level) => { const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = pinkBuf; s.loop = true; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(.0001, t); let o = 0; while (o < secs){ const e = Math.min(1, Math.min(o, secs - o)/1); g.gain.linearRampToValueAtTime(Math.max(.0001, e*level*(.55 + Math.random()*.6)), t + o); o += .9 + Math.random()*2.4; }
    s.connect(fl); fl.connect(g); g.connect(d); s.start(t, Math.random()*3); s.stop(t + secs); };
  layer(5200, .4, RAIN.hiss); layer(900, .55, RAIN.patter);
  const panned = () => { if (!ctx.createStereoPanner) return d; const p = ctx.createStereoPanner(); p.pan.value = Math.random()*1.7 - .85; p.connect(d); return p; }, pans = [0, 1, 2, 3, 4, 5].map(panned);
  for (let o = .4; o < secs - .4; o += (.2 + Math.random()*1.8)/RAIN.drops) raindrop(t + o, pans[Math.floor(Math.random()*6)]);
}
// A torch: burning resin. Soft woody ticks in little runs (each one a tiny resonant click, a few milliseconds long, in a
// different spot left or right), and now and then a rounder snap of wood with a little weight under it.
function tick(t, d, peak){ const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), len = .004 + Math.random()*.014; s.buffer = noiseBuf;
  fl.type = 'bandpass'; fl.frequency.value = 1100 + Math.random()*Math.random()*3200; fl.Q.value = 2.5 + Math.random()*5;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + .0007); g.gain.exponentialRampToValueAtTime(.0001, t + .0007 + len);
  s.connect(fl); fl.connect(g); g.connect(d); s.start(t, Math.random()*3); s.stop(t + len + .02); }
function snap(t, d, peak){ const f = 480 + Math.random()*620;
  noise(t, .035 + Math.random()*.04, d, {f, q:3.5, peak, a:.0008}); osc('sine', 150 + Math.random()*110, t, .05, d, peak*.5, .001, 80);
  for (let i=0;i<3;i++) tick(t + .012 + Math.random()*.09, d, peak*.35); }
function crackle(t, bus, k){ const g = place(bus, null, k); if (!g) return; let d = g;
  if (ctx.createStereoPanner){ const p = ctx.createStereoPanner(); p.pan.value = Math.random()*1.1 - .55; g.disconnect(); g.connect(p); p.connect(bus); }
  crackleAt(t, d); }
// the same fire on its own, for the showroom and the tests
function torchSample(t, d, secs){
  const layer = (buf, type, f, q, base, depth) => { const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(.0001, t); let o = 0; while (o < secs){ const e = Math.min(1, Math.min(o, secs - o)/.6); g.gain.linearRampToValueAtTime(Math.max(.0001, e*(base + (.3 + Math.random()*.7)*depth)), t + o); o += .07 + Math.random()*.26; }
    s.connect(fl); fl.connect(g); g.connect(d); s.start(t, Math.random()*3); s.stop(t + secs); };
  layer(brownBuf, 'lowpass', 420, .6, FIRE.low, FIRE.lowMove); layer(pinkBuf, 'bandpass', 900, .5, FIRE.air, FIRE.airMove);
  for (let o = .3 + Math.random()*.5; o < secs - .4; o += (.9 + Math.random()*3.2)/1.4) crackleAt(t + o, d);
}
function crackleAt(t, d){ if (Math.random() < .22){ snap(t, d, .22 + Math.random()*.2); return; }
  let o = 0; for (let i = 1 + Math.floor(Math.random()*Math.random()*7); i > 0; i--){ tick(t + o, d, .08 + Math.random()*Math.random()*.34); o += .015 + Math.random()*Math.random()*.16; } }
function cricket(t, d){ const f = 4200 + Math.random()*300; for (let i=0;i<3;i++) osc('sine', f, t + i*.06, .035, d, .12, .004); }

// ---- music ----
// Several styles to choose from in Settings. The new ones are soft and slow, with a felt piano, strings, a harp, a flute,
// a guitar or a music box: written as little tunes (a motif, the same motif again, something new, the motif to finish)
// over gentle chords, made up fresh every couple of minutes. The old lyre music is still there as its own style.
// Every few minutes the music rests and lets the sea be heard.
export const MIX = {name:'A bit of everything', desc:'Every song on its own instruments, one after another, with the sea alone in between.'};
export const STYLES = {
  piano: {name:'Soft piano', desc:'A felt piano on its own, slow and gentle.', lh:'piano', mel:'piano'},
  cello: {name:'Piano and cello', desc:'The piano rolls the chords, a cello sings the tune and soft strings hold the harmony.', lh:'piano', mel:'cello', pad:true},
  harp:  {name:'Harp and flute', desc:'A harp, a wooden flute and soft strings: the most "old Greece" of the new ones.', lh:'harp', mel:'flute', pad:true},
  guitar:{name:'Guitar and piano', desc:'A nylon guitar picks the chords and the piano plays the tune, with soft strings.', lh:'guitar', mel:'piano', pad:true},
  box:   {name:'Music box', desc:'A little music box over a harp, like a lullaby.', lh:'harp', mel:'box', lhVol:.75},
  lyre:  {name:'Greek lyre (the old music)', desc:'The first music: a lyre, a drone and a flute in an old Greek mode.'},
};
if (SND.style !== 'mix' && !STYLES[SND.style]) SND.style = 'mix';
// P57: the fight has its own music, chosen apart from the calm style. Drums lead; the old calm battle music is still there.
export const BATTLE = {
  war:   {name:'War drums', desc:'Big booming drums and rattling toms, a low drone underneath. No tune at all: just the beat of the fight.'},
  horn:  {name:'Drums and horns', desc:'The war drums with low bronze horns calling out over them.'},
  strings:{name:'Drums and low strings', desc:'The drums with low strings driving underneath, short and urgent.'},
  ship:  {name:'Rowing drum', desc:'A ship\'s rowing drum: steady deep beats that speed up, with sticks clacking and a deep chant-like hum.'},
  calm:  {name:'Calm (the old one)', desc:'The calm battle music from before: your music style with a soft frame drum.'},
};
if (!BATTLE[SND.battle]) SND.battle = 'war';

// sounds rendered once per note and kept (a piano, a music box)
const bufs = new Map();
function additive(key, len, parts, atk = .004, hammer = 0){
  if (bufs.has(key)) return bufs.get(key);
  const sr = ctx.sampleRate, n = Math.floor(sr*len), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
  // each part: [frequency, loudness, fast fade, slow fade, how much fades fast]; sines turned by rotation, so this stays quick
  for (const [f, a, tf, ts = tf, mix = 1] of parts){ if (f >= sr*.45) continue;
    const w = 2*Math.PI*f/sr, cs = Math.cos(w), sn = Math.sin(w), k1 = Math.exp(-1/(tf*sr)), k2 = Math.exp(-1/(ts*sr));
    let s = 0, c = 1, e1 = a*mix, e2 = a*(1 - mix);
    for (let i=0;i<n;i++){ d[i] += s*(e1 + e2); const s1 = s*cs + c*sn; c = c*cs - s*sn; s = s1; e1 *= k1; e2 *= k2; } }
  const na = Math.max(1, Math.floor(sr*atk)); for (let i=0;i<na;i++) d[i] *= i/na;
  if (hammer){ let lp = 0; const nh = Math.floor(sr*.03); for (let i=0;i<nh;i++){ lp += ((Math.random()*2 - 1) - lp)*.12; d[i] += lp*hammer*(1 - i/nh); } }
  const nf = Math.min(n, Math.floor(sr*.4)); for (let i=n - nf;i<n;i++) d[i] *= (n - i)/nf;
  bufs.set(key, b); return b;
}
// a soft felt piano: overtones a little stretched like real strings, highs damped, two strings a hair apart so it breathes
function pianoBuf(m){
  const f0 = midi(m), B = .00018*Math.pow(2, (m - 60)/12), slow = 3.4*Math.pow(.965, m - 48), parts = [];
  for (let h=1; h<=9; h++){ const f = f0*h*Math.sqrt(1 + B*h*h); if (f > 5500) break;
    const a = .55*Math.pow(h, -1.2)*Math.exp(-(h - 1)*.42), ts = slow/(1 + .45*(h - 1)), tf = ts*.12;
    parts.push([f, a, tf, ts, .55]); if (h <= 3) parts.push([f*1.0009, a*.45, tf, ts*.85, .55]); }
  return additive('p' + m, Math.min(6, slow*1.8 + .5), parts, .007, .05);
}
// a music box tine: a pure tone with a bright little "ting" over it
function boxBuf(m){ const f = midi(m); return additive('b' + m, 3, [[f, .5, 1.5], [f*2, .05, .6], [f*5.4, .14, .18], [f*8.9, .05, .09]], .002); }
function playBuf(b, t, d, vol){ const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(d); s.start(t); }
// a bowed string (cello): two saws through a soft filter, a slow bow, vibrato that comes in after the note starts
function bowed(f, t, dur, d, vol, lp = 1300){
  dur = Math.max(.45, dur);
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = o2.type = 'sawtooth'; o.frequency.value = o2.frequency.value = f; o2.detune.value = 7;
  lfo.frequency.value = 4.8; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f*.006, t + .6); lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
  fl.type = 'lowpass'; fl.frequency.setValueAtTime(lp*.45, t); fl.frequency.linearRampToValueAtTime(lp, t + .35); fl.Q.value = .6;
  const fl2 = ctx.createBiquadFilter(); fl2.type = 'lowpass'; fl2.frequency.value = lp*1.4; fl2.Q.value = .5; // two filters: a warm tone, no buzz
  g.gain.value = .0001; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .25); g.gain.setValueAtTime(vol, t + dur); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .6);
  o.connect(fl); o2.connect(fl); fl.connect(fl2); fl2.connect(g); g.connect(d); [o, o2, lfo].forEach(x => { x.start(t); x.stop(t + dur + .7); });
}
// soft strings holding a chord: detuned saws, a very slow bow in and out
function strings(ms, t, dur, d, vol){
  const fl = ctx.createBiquadFilter(), fl2 = ctx.createBiquadFilter(), g = ctx.createGain(); fl.type = fl2.type = 'lowpass'; fl.frequency.value = 900; fl2.frequency.value = 1300; fl.Q.value = fl2.Q.value = .3;
  g.gain.value = .0001; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(1.6, dur*.45)); g.gain.setValueAtTime(vol, t + dur); g.gain.linearRampToValueAtTime(.0001, t + dur + 1.8);
  fl.connect(fl2); fl2.connect(g); g.connect(d);
  ms.forEach(m => [-8, 8].forEach(c => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(m); o.detune.value = c + (Math.random() - .5)*5; o.connect(fl); o.start(t); o.stop(t + dur + 2); }));
}
const INST = {
  piano: (m, t, dur, d, v) => playBuf(pianoBuf(m), t, d, v*.9),
  box:   (m, t, dur, d, v) => playBuf(boxBuf(m), t, d, v*1.25),
  harp:  (m, t, dur, d, v) => pluck(midi(m), t, d, v*1.45, .62),
  guitar:(m, t, dur, d, v) => pluck(midi(m), t, d, v*1.6, .18),
  flute: (m, t, dur, d, v) => flute(midi(m), t, Math.max(.3, dur*.95), d, v*.3),
  cello: (m, t, dur, d, v) => bowed(midi(m), t, dur*.95, d, v*.32),
};
// The little tunes in jingles (a goal done, a big fish) play on the chosen style's instrument.
function jingle(m, t, d, vol, bright = .5){
  const st = M.style || (SND.style === 'mix' ? 'piano' : SND.style);
  if (st === 'piano' || st === 'cello' || st === 'guitar') playBuf(pianoBuf(m), t, d, vol*.55);
  else if (st === 'box') playBuf(boxBuf(m), t, d, vol*.6);
  else pluck(midi(m), t, d, vol, bright);
}

// The songs: a key, a speed and eight chords for each mood. Chords are written as the bass note, then three notes above it
// (semitones from the key note). Day and the harbor are in major keys, night drifts in a dreamy Lydian, and battle is minor
// but still calm: a soft low pulse and a frame drum far away.
const SONGS = {
  day:   {root:53, bpm:66, scale:[0, 2, 4, 7, 9], lh:[{0:0, 2:1, 4:2, 6:3}, {0:0, 2:1, 3:2, 4:3, 6:2}],
          prog:[[0, 7, 14, 16], [5, 9, 12, 16], [-3, 4, 7, 12], [5, 9, 12, 16], [0, 7, 14, 16], [4, 7, 11, 14], [5, 9, 12, 16], [7, 12, 14, 19],
                [0, 7, 14, 16], [5, 9, 12, 16], [-3, 4, 7, 12], [4, 7, 11, 14], [5, 9, 12, 16], [5, 8, 12, 14], [0, 7, 14, 16], [0, 7, 12, 16]]},
  night: {root:50, bpm:52, scale:[0, 2, 4, 7, 9], thin:.55, lh:[{0:0, 4:2}, {0:0, 3:1, 6:3}],
          prog:[[0, 7, 14, 16], [2, 6, 9, 14], [0, 7, 11, 16], [-3, 4, 7, 12], [5, 9, 12, 16], [2, 6, 9, 14], [0, 7, 14, 16], [0, 7, 14, 16]]},
  harbor:{root:55, bpm:76, scale:[0, 2, 4, 7, 9], lh:[{0:0, 2:2, 3:1, 4:3, 6:2}, {0:0, 2:1, 4:2, 5:3, 6:1}],
          prog:[[0, 7, 12, 16], [5, 9, 12, 16], [0, 7, 12, 16], [7, 11, 14, 19], [-3, 4, 7, 12], [5, 9, 12, 16], [7, 11, 14, 19], [0, 7, 12, 16]]},
  battle:{root:50, bpm:92, scale:[0, 3, 5, 7, 10], lh:[{0:2, 4:3}],
          prog:[[0, 7, 12, 15], [-4, 3, 8, 12], [3, 7, 10, 15], [-2, 5, 10, 14], [0, 7, 12, 15], [-4, 3, 8, 12], [5, 8, 12, 17], [7, 11, 14, 19]]},
};
// P65: the song book. Like Minecraft: a song plays to its end, then the sea plays alone for a few minutes, then another song comes (never the same
// one twice in a row). Each has its own key, speed, chords and instruments. slow = longer notes and fewer of them. moods = when it may come up.
const WARM = [[0, 7, 14, 16], [5, 9, 12, 16], [-3, 4, 7, 12], [5, 9, 12, 16], [0, 7, 14, 16], [4, 7, 11, 14], [5, 9, 12, 16], [7, 12, 14, 19]];
const WIDE = [[0, 7, 14, 16], [2, 6, 9, 14], [0, 7, 11, 16], [-3, 4, 7, 12], [5, 9, 12, 16], [2, 6, 9, 14], [0, 7, 14, 16], [0, 7, 14, 16]];
const FOLK = [[0, 7, 12, 16], [5, 9, 12, 16], [0, 7, 12, 16], [7, 11, 14, 19], [-3, 4, 7, 12], [5, 9, 12, 16], [7, 11, 14, 19], [0, 7, 12, 16]];
const TIDE = [[0, 7, 12, 16], [-3, 4, 9, 12], [5, 9, 12, 19], [0, 7, 12, 16], [-5, 2, 7, 11], [-3, 4, 9, 12], [5, 12, 16, 21], [0, 7, 12, 16]];
const DUSK = [[0, 7, 12, 15], [-4, 3, 8, 12], [3, 7, 10, 15], [-2, 5, 10, 14], [-4, 3, 8, 12], [3, 7, 10, 15], [-2, 5, 10, 14], [0, 7, 12, 15]];
const ROLL = [{0:0, 2:1, 4:2, 6:3}, {0:0, 2:2, 4:1, 6:3}], SLOW = [{0:0, 4:2}, {0:0, 3:1, 6:3}], SLOWER = [{0:0}, {0:0, 4:2}], WALTZ = [{0:0, 3:1, 6:2}, {0:0, 3:2, 6:1}];
const PENTA = [0, 2, 4, 7, 9], MINOR = [0, 3, 5, 7, 10];
export const SONGBOOK = [
  {name:'First Light',        style:'piano',  moods:['day', 'harbor'], root:53, bpm:62, scale:PENTA, lh:ROLL, prog:WARM, bars:32},
  {name:'Slow Tide',          style:'harp',   moods:['day', 'night'],  root:50, bpm:40, scale:PENTA, lh:SLOW, prog:TIDE, bars:24, thin:.45, solo:true, soft:1.1},
  {name:'The Calm Between',   style:'harp',   moods:['day', 'night'],  root:55, bpm:36, scale:PENTA, lh:SLOWER, prog:WIDE, bars:16, thin:.35, solo:true, soft:1.15},
  {name:'Olive Shade',        style:'cello',  moods:['day', 'harbor'], root:48, bpm:46, scale:PENTA, lh:SLOW, prog:WARM, bars:24, thin:.6},
  {name:'Net Mender',         style:'guitar', moods:['day', 'harbor'], root:52, bpm:58, scale:PENTA, lh:WALTZ, prog:FOLK, bars:32},
  {name:'Moon over Naxos',    style:'box',    moods:['night'],         root:57, bpm:44, scale:PENTA, lh:SLOW, prog:WIDE, bars:24, thin:.5, soft:1.05},
  {name:'Night Watch',        style:'piano',  moods:['night'],         root:50, bpm:42, scale:MINOR, lh:SLOWER, prog:DUSK, bars:24, thin:.45, soft:1.3},
  {name:'Harbor Morning',     style:'guitar', moods:['harbor'],        root:55, bpm:68, scale:PENTA, lh:ROLL, prog:FOLK, bars:24},
  {name:'Wine-Dark Evening',  style:'cello',  moods:['night', 'day'],  root:45, bpm:40, scale:MINOR, lh:SLOW, prog:DUSK, bars:24, thin:.5, soft:1.05},
  {name:'Old Lyre',           style:'harp',   moods:['day'],           root:50, bpm:50, scale:[0, 2, 3, 7, 9], lh:ROLL, prog:DUSK, bars:24, thin:.6, solo:true},
];
// P95 (Nicholas): six recorded songs on real instruments (made from FluidR3 GM samples, MIT licence; game/music). They replace
// the made-up songs: one plays to its end, the sea rests, then another that suits the moment (day, night, the harbor), never
// one of the last few. vol matches them to the old music's loudness (the night ones a little softer, like before).
export const RECORDED = [
  {name:'Morning over Kallisto', file:'1-morning-over-kallisto', moods:['day', 'harbor'], vol:.6},
  {name:'Olive Grove',           file:'2-olive-grove',           moods:['harbor', 'day'], vol:.6},
  {name:'Moonlit Harbor',        file:'3-moonlit-harbor',        moods:['night', 'harbor'], vol:.5},
  {name:'Cello at Dusk',         file:'4-cello-at-dusk',         moods:['night', 'day'], vol:.5},
  {name:'Tide Pools',            file:'5-tide-pools',            moods:['day'], vol:.6},
  {name:'Sleeping Sea',          file:'6-sleeping-sea',          moods:['night', 'day'], vol:.45},
];
const recBufs = {};
function loadRec(r){ return recBufs[r.file] || (recBufs[r.file] = fetch('music/' + r.file + '.ogg').then(x => x.arrayBuffer()).then(ab => new Promise((ok, no) => ctx.decodeAudioData(ab, ok, no)))); }
function stopRec(fade = 1.5){ const p = M.rec; M.rec = null; if (!p || !p.src) return; try { p.g.gain.setTargetAtTime(0, now(), fade/3); p.src.stop(now() + fade + .1); } catch(e){} }
function playRec(mood){
  const list = RECORDED.filter(r => r.moods.includes(mood)), fresh = list.filter(r => !M.heardRec.includes(r.file)), pool = fresh.length ? fresh : list, r = pool[Math.floor(Math.random()*pool.length)];
  if (!r) return; M.heardRec = [...M.heardRec, r.file].slice(-3); const p = M.rec = {r, src:null, g:null};
  loadRec(r).then(buf => { if (M.rec !== p) return; const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; g.gain.value = r.vol; src.connect(g); g.connect(musicBus); src.start(now() + .05);
    src.onended = () => { if (M.rec === p){ M.rec = null; restNow(); } }; p.src = src; p.g = g; })
    .catch(() => { recBufs[r.file] = null; if (M.rec === p){ M.rec = null; restNow(); } }); }
const songStyle = sg => SND.style === 'mix' || !STYLES[SND.style] || SND.style === 'lyre' ? sg.style : SND.style;
// the next song: one that suits the moment, not one of the last few heard
function nextSong(mood){ const list = SONGBOOK.map((s, i) => i).filter(i => SONGBOOK[i].moods.includes(mood) || mood === 'battle'), fresh = list.filter(i => !M.heard.includes(i)), pool = fresh.length ? fresh : list, i = pool[Math.floor(Math.random()*pool.length)];
  M.heard = [...M.heard, i].slice(-4); return SONGBOOK[i]; }
export function restNow(){ const r = MUSIC_REST[SND.rest] || MUSIC_REST.medium; M.rest = r[0] + Math.random()*(r[1] - r[0]); M.song = null; M.playing = 0; }
// tune rhythms for two bars (16 eighth notes): [start, length]
const RHYTHMS = [[[0, 2], [2, 2], [4, 4], [8, 8]], [[0, 3], [3, 1], [4, 4], [10, 6]], [[0, 4], [4, 2], [6, 2], [8, 8]], [[2, 2], [4, 2], [6, 6], [12, 4]],
  [[0, 6], [6, 2], [8, 6], [14, 2]], [[0, 2], [2, 2], [4, 2], [6, 2], [8, 8]], [[0, 4], [4, 4], [8, 4], [12, 4]]];
const pickR = a => a[Math.floor(Math.random()*a.length)];
function motif(thin){ return pickR(RHYTHMS).map(([s, l], i) => ({s, l, mv:i ? pickR([-2, -1, -1, 1, 1, 2, 0]) : 0})).filter((n, i) => !thin || i === 0 || Math.random() < thin); }
// a tune for eight bars: motif A, A again a step away, something new (or a breath), then A to finish on the home note
function newTune(sg){ const A = motif(sg.thin), B = Math.random() < .2 ? [] : motif(sg.thin); return {mot:[A, A, B, A], start:[4, pickR([3, 5]), 6, 4]}; }

const M = {rec:null, heardRec:[], mood:'day', want:'day', next:0, step:0, bar:0, rest:25 + Math.random()*35, playing:0, mel:7, drone:null, test:null, style:null, cur:null, tune:null, idx:4, song:null, heard:[]}; // a new voyage opens on just the sea
export function musicMood(m){ M.want = m; }
function updateMusic(dt, a){
  if (SND.music <= 0){ if (M.drone) droneStop(); if (M.rec) stopRec(.3); return; }
  const st = M.style || SND.style || 'mix';
  if (st !== M.cur){ M.cur = st; M.bar = 0; M.step = 0; M.tune = null; M.playing = 0; M.song = null; if (M.drone) droneStop(); M.next = now() + .3; }
  if (st === 'lyre') return lyreMusic(dt);
  const t = now();
  // a fight starts its music right away; when it ends the sea comes back first, and then in a while a new song
  if (M.want === 'battle' && M.mood !== 'battle'){ M.mood = 'battle'; M.rest = 0; M.bar = 0; M.tune = null; M.song = null; B.step = 0; B.next = t + .05; M.next = t + .05; }
  else if (M.want !== 'battle' && M.mood === 'battle'){ M.mood = M.want; M.bar = 0; M.step = 0; M.tune = null; if (!M.test) restNow(); }
  else if (!M.song) M.mood = M.want; // a song plays to its end, even if day turns to night or you dock
  if (M.rest > 0){ M.rest -= dt; if (M.rest > 0) return; M.bar = 0; M.step = 0; M.next = t + .1; M.tune = null; M.playing = 0; }
  const bst = M.bstyle || SND.battle;
  if (M.mood === 'battle' && M.rec) stopRec(1.2); // a fight fades the song out; its drums take over
  if (M.mood === 'battle' && bst !== 'calm') return battleMusic(t, bst);
  if (M.mood !== 'battle' && st === 'mix' && !M.test){ if (!M.rec) playRec(M.mood); return; } // P95: the recorded songs
  if (M.mood !== 'battle' && !M.song) M.song = M.test || (M.noRest && M.style ? SONGS[M.mood] : nextSong(M.mood));
  const sg = M.mood === 'battle' ? SONGS.battle : M.song, S = STYLES[M.mood === 'battle' ? (st === 'mix' ? 'piano' : st) : (M.style || songStyle(sg))] || STYLES.piano, soft = sg.soft || 1, w = musicWet, root = sg.root;
  // the last two bars slow down a little, so a song ends like a song
  const beat = 60/sg.bpm/2*(sg.bars && M.playing >= sg.bars - 2 ? 1.22 : 1);
  if (M.next < t - .5) M.next = t + .05;
  while (M.next < t + .3){
    const s = M.step % 8, nt = M.next, ch = sg.prog[M.bar % sg.prog.length];
    if (!M.tune || (s === 0 && M.bar % 16 === 0)) M.tune = newTune(sg);
    // the left hand (or harp, or guitar) rolls the chord: bass note low, the others in the middle
    const tones = [root + ch[0] - 12, root + ch[1] - 12, root + ch[2] - 12, root + ch[3] - 12];
    const pat = sg.lh[M.bar % sg.lh.length], lhv = .2*(S.lhVol || 1)*soft*(M.mood === 'night' ? .8 : 1);
    if (pat[s] !== undefined) INST[S.lh](tones[pat[s]], nt + (s === 0 ? 0 : (Math.random() - .5)*.012), beat*2, w, lhv*(s === 0 ? 1.15 : .9));
    if (sg.pulse) INST[S.lh === 'piano' ? 'piano' : S.lh](tones[0] - (s % 2 ? 0 : 12), nt, beat, w, lhv*(s % 4 === 0 ? .55 : .3)); // battle: a soft low pulse
    if (S.pad && s === 0) strings(tones.slice(1), nt, beat*8*.97, w, (M.mood === 'night' ? .022 : .028)*soft);
    // the tune
    const bi = M.bar % 8, win = bi >> 1, ws = (bi & 1)*8 + s, mot = M.tune.mot[win];
    if (ws === 0) M.idx = M.tune.start[win];
    const lad = k => { const sc = sg.scale; k = Math.max(0, Math.min(10, k)); return sc[k % 5] + 12*Math.floor(k/5); };
    for (let i=0;i<mot.length;i++){ const n = mot[i]; if (n.s !== ws) continue;
      M.idx = Math.max(0, Math.min(10, M.idx + n.mv));
      const last = win === 3 && i === mot.length - 1, strong = ws % 4 === 0 || last;
      if (strong){ // land on a note of the chord (and on the home note at the very end)
        const pcs = last ? [0] : ch.map(c => ((c % 12) + 12) % 12); let best = M.idx, bd = 99;
        for (let k=0;k<=10;k++) if (pcs.includes(lad(k) % 12) && Math.abs(k - M.idx) < bd){ bd = Math.abs(k - M.idx); best = k; }
        M.idx = best; }
      INST[sg.solo ? S.lh : S.mel](root + 12 + lad(M.idx) - (S.mel === 'cello' && !sg.solo ? 12 : 0), nt, n.l*beat, w, (M.mood === 'night' ? .26 : .32)*soft*(strong ? 1 : .85));
    }
    if (M.mood === 'battle') battleBeat(s, nt, w, tones[0]);
    M.next += beat; M.step++; if (M.step % 8 === 0){ M.bar++; M.playing++; }
    // the end of the song: let the last note ring, then just the sea for a while
    if (M.mood !== 'battle' && !M.noRest && sg.bars && M.playing >= sg.bars && M.step % 8 === 0){ restNow(); break; }
    if (M.noRest && sg.bars && M.playing >= sg.bars && M.step % 8 === 0) M.playing = 0;
  }
}
// ---- the drum-led fight music (P57). 16 steps (two bars of eighths) at 108 beats a minute. ----
// boom: a big deep drum that drops in pitch; tom: a smaller drum; clack: sticks on the drum's rim
function boom(t, d, v = 1){ osc('sine', 118, t, .7, d, .62*v, .004, 42); osc('sine', 62, t, .9, d, .3*v, .01, 38); noise(t, .14, d, {type:'lowpass', f:300, peak:.3*v, buf:brownBuf}); }
function tom(t, d, f = 150, v = 1){ osc('sine', f, t, .28, d, .32*v, .003, f*.6); noise(t, .05, d, {type:'lowpass', f:900, peak:.12*v}); }
function clack(t, d, v = 1){ osc('triangle', 820, t, .03, d, .1*v, .001, 700); noise(t, .025, d, {f:3200, q:2, peak:.14*v}); }
// a low bronze horn: three detuned saws through a soft filter, swelling in
function horn(m, t, dur, d, vol){ const fl = ctx.createBiquadFilter(), g = ctx.createGain(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(380, t); fl.frequency.linearRampToValueAtTime(1100, t + dur*.4); fl.Q.value = .7;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .18); g.gain.setValueAtTime(vol, t + dur*.7); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .3);
  fl.connect(g); g.connect(d); [-7, 0, 6].forEach(c => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(m); o.detune.value = c; o.connect(fl); o.start(t); o.stop(t + dur + .4); }); }
const B = {next:0, step:0};
const BROOT = 38; // D, low
const BOOMS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0], TOMS = [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1];
function battleMusic(t, st){
  const w = musicWet, bpm = st === 'ship' ? 84 + Math.min(40, (B.step/16)*2) : 108, beat = 60/bpm/2; // the rowing drum slowly speeds up
  if (B.next < t - .5) B.next = t + .05;
  while (B.next < t + .3){
    const s = B.step % 16, bar = Math.floor(B.step/16), nt = B.next, fill = bar % 4 === 3;
    if (st === 'ship'){
      if (s % 4 === 0) boom(nt, w, s === 0 ? 1 : .75);
      if (s % 4 === 2) clack(nt, w, .9);
      if (s === 0 && bar % 2 === 0) strings([BROOT, BROOT + 7], nt, beat*16*.97, w, .03); // a deep hum, like rowers chanting
    } else {
      if (BOOMS[s] || (fill && s === 14)) boom(nt, w, s === 0 ? 1 : .8);
      if (fill ? s >= 10 && s % 1 === 0 && s !== 14 : TOMS[s]) tom(nt, w, fill ? 210 - (s - 10)*14 : 150, fill ? .9 : .7);
      if (s % 2 === 1) clack(nt, w, .45);
      if (s === 0 && bar % 2 === 0) strings([BROOT, BROOT + 7], nt, beat*32*.97, w, .02); // a low drone under everything
      if (st === 'horn' && (bar % 4 === 0 || bar % 4 === 2) && (s === 0 || s === 6)) horn(BROOT + 12 + (s === 6 ? (bar % 4 === 2 ? 5 : 7) : 0), nt, beat*(s === 0 ? 5 : 8), w, .09);
      if (st === 'strings' && s % 2 === 0){ const fig = [0, 0, 3, 0, 5, 3, 7, 5][(s/2) % 8] + (bar % 4 === 2 ? -2 : 0); bowed(midi(BROOT + 12 + fig), nt, beat*1.6, w, .1, 900); }
    }
    B.next += beat; B.step++;
  }
}
export function battleMusicReset(){ B.step = 0; B.next = 0; }
function softDrum(t, d, low){ const g = ctx.createGain(); g.gain.value = low ? .5 : .3; g.connect(d); drum(t, g, low); }
// The fight: still calm, but with a heartbeat under it. Low frame drums (boom, boom, tak), plucked strings repeating a short
// figure, and a soft shaker on the off-beats.
const PIZZ = [0, 0, 7, 0, 12, 0, 7, 3];
function battleBeat(s, t, d, bass){
  const boom = s === 0 || s === 3, tak = s === 4 || s === 6 || (s === 7 && Math.random() < .4);
  if (boom){ osc('sine', 72, t, .4, d, .34, .003, 46); noise(t, .09, d, {type:'lowpass', f:420, peak:.16}); }
  if (tak){ osc('triangle', 190, t, .09, d, .1, .002, 140); noise(t, .06, d, {f:1500, q:1.2, peak:.12}); }
  if (s % 2) noise(t, .05, d, {type:'highpass', f:6500, peak:.035, a:.01}); // the shaker
  pluck(midi(bass + PIZZ[s]), t, d, .26, .3); // plucked strings
}

// ---- the old music: a lyre, a soft drone and now and then a flute ----
// Day plays in a warm Greek mode (D Dorian), night slower and softer, battle with a frame drum and a darker mode.
const MODES = {
  day:   {root:50, scale:[0, 2, 3, 5, 7, 9, 10], bpm:84, chords:[[0, 3, 7], [-2, 2, 5], [0, 3, 7], [-5, 0, 3], [5, 9, 12], [3, 7, 10], [-2, 2, 5], [0, 3, 7]]},
  night: {root:45, scale:[0, 2, 3, 5, 7, 8, 10], bpm:62, chords:[[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [0, 3, 7]]},
  harbor:{root:55, scale:[0, 2, 4, 5, 7, 9, 10], bpm:92, chords:[[0, 4, 7], [-2, 2, 5], [5, 9, 12], [0, 4, 7], [-5, -1, 2], [0, 4, 7]]},
  battle:{root:50, scale:[0, 1, 3, 5, 7, 8, 10], bpm:120, chords:[[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 1, 5]]},
};
function droneStart(root){
  if (M.drone) droneStop();
  const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0; f.connect(g); g.connect(musicWet);
  const os = [0, 7, 12].map((iv, i) => { const o = ctx.createOscillator(); o.type = i === 2 ? 'sine' : 'triangle'; o.frequency.value = midi(root - 12 + iv); o.detune.value = (i - 1)*4; o.connect(f); o.start(); return o; });
  g.gain.setTargetAtTime(.07, now(), 2.5); M.drone = {g, os};
}
function droneStop(){ const d = M.drone; if (!d) return; d.g.gain.setTargetAtTime(0, now(), 1.5); d.os.forEach(o => o.stop(now() + 6)); M.drone = null; }
function flute(f, t, dur, d, vol = .1){
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
  o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f*2; lfo.frequency.value = 5.2; lg.gain.value = f*.006;
  lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency); fl.type = 'lowpass'; fl.frequency.value = 2400;
  const g2 = ctx.createGain(); g2.gain.value = .15; o2.connect(g2); g2.connect(fl); o.connect(fl); fl.connect(g);
  g.gain.value = .0001; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .09); g.gain.setValueAtTime(vol*.85, t + dur*.7); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .15);
  g.connect(d); [o, o2, lfo].forEach(x => { x.start(t); x.stop(t + dur + .25); });
  noise(t, .08, d, {f:f*2, q:2, peak:vol*.25});
}
function drum(t, d, low){ osc('sine', low ? 85 : 140, t, low ? .3 : .12, d, low ? .45 : .2, .002, low ? 50 : 90); noise(t, low ? .08 : .05, d, {f:low ? 600 : 1800, q:1, peak:low ? .12 : .1}); }
function lyreMusic(dt){
  const t = now();
  if (M.rest > 0){ M.rest -= dt; if (M.rest > 0) return; M.bar = 0; M.step = 0; M.next = t + .1; }
  if (M.want !== M.mood && M.step % 8 === 0){ M.mood = M.want; M.bar = 0; if (M.drone) droneStop(); }
  const md = MODES[M.mood], beat = 60/md.bpm/2; // eighth notes
  if (!M.drone && M.mood !== 'battle') droneStart(md.root);
  if (M.next < t - .5) M.next = t + .05;
  const w = musicWet;
  while (M.next < t + .25){
    const s = M.step % 8, ch = md.chords[M.bar % md.chords.length], root = md.root, nt = M.next;
    // lyre: the chord rolled on the downbeat, then a gentle pattern
    if (s === 0) ch.forEach((iv, i) => pluck(midi(root + iv), nt + i*.03, w, .3, .4));
    else if (M.mood !== 'night' || s % 2 === 0){ const pat = M.mood === 'battle' ? [0, 1, 2, 1, 0, 1, 2, 1] : [0, 0, 1, 2, 1, 2, 0, 1];
      if (Math.random() < (M.mood === 'night' ? .55 : .8)) pluck(midi(root + ch[pat[s]] + 12), nt, w, .18 + Math.random()*.06, .35); }
    // the tune: a flute in some phrases, the lyre's high strings in others
    const phrase = Math.floor(M.bar/4) % 3;
    if (phrase !== 0 && (s === 0 || s === 3 || s === 4 || (s === 6 && Math.random() < .5)) && Math.random() < .75){
      M.mel = Math.max(0, Math.min(13, M.mel + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random()*7)]));
      if (s === 0){ const sc = md.scale; let best = M.mel, bd = 99; for (let k=0;k<14;k++){ const iv = sc[k % 7] + 12*Math.floor(k/7); if (ch.some(c => ((c - iv) % 12 + 12) % 12 === 0) && Math.abs(k - M.mel) < bd){ bd = Math.abs(k - M.mel); best = k; } } M.mel = best; }
      const iv = md.scale[M.mel % 7] + 12*Math.floor(M.mel/7), f = midi(root + 12 + iv);
      if (phrase === 1 && M.mood !== 'battle') flute(f, nt, beat*(s === 4 ? 3 : 2), w, M.mood === 'night' ? .06 : .08);
      else pluck(f*2, nt, w, .22, .6);
    }
    if (M.mood === 'battle'){ if (s === 0 || s === 3 || s === 6) drum(nt, w, true); else if (s % 2 === 0) drum(nt, w, false); }
    else if (M.mood === 'harbor' && (s === 0 || s === 5)) drum(nt, w, s === 0);
    M.next += beat; M.step++; if (M.step % 8 === 0){ M.bar++; M.playing++; }
    // after a while, rest: 28 bars of music, then 20 to 50 seconds of just the sea
    if (M.mood !== 'battle' && !M.noRest && M.playing >= 28 && M.step % 8 === 0){ M.playing = 0; restNow(); droneStop(); break; }
  }
}
// The showroom plays the music on its own, without the game around it.
export function testMusic(mood, noRest = false, style = null, bstyle = null, song = null){ M.test = song; M.song = song; M.heard = []; M.bstyle = bstyle; B.step = 0; B.next = 0; M.style = style; M.noRest = noRest; M.tune = null; M.want = M.mood = mood; M.rest = 0; M.playing = 0; M.bar = 0; M.step = 0; if (M.drone) droneStop(); }
export function stopMusic(){ M.rest = 1e9; droneStop(); }
export function musicResting(){ return M.rest > 0; }
// For checking the sea: record secs of the background sounds for a situation a (used by the tests).
export async function renderAmbient(a, secs = 10){
  const keep = {ctx, out, musicBus, musicWet, sfxBus, seaBus, verb, beds}, mus = SND.music;
  const off = new OfflineAudioContext(2, Math.ceil(44100*secs), 44100); init(off, true); seaBus.gain.value = 1; SND.music = 0;
  try { for (fakeT = 0; fakeT < secs; fakeT += 1/30) updateAudio(1/30, a); }
  finally { fakeT = null; SND.music = mus; ({ctx, out, musicBus, musicWet, sfxBus, seaBus, verb, beds} = keep); }
  return off.startRendering();
}
// For checking the music: record secs of a mood offline (used by the tests).
export async function renderMusic(mood, secs = 20, style = null, bstyle = null, song = null){
  const keep = {ctx, out, musicBus, musicWet, sfxBus, seaBus, verb}, m = {...M};
  const off = new OfflineAudioContext(2, Math.ceil(44100*secs), 44100); init(off, false);
  Object.assign(M, {drone:null, playing:0, cur:null}); testMusic(mood, true, style, bstyle, song);
  try { for (fakeT = 0; fakeT < secs - 1; fakeT += .1) updateMusic(.1, {}); if (M.drone) M.drone.os.forEach(o => o.stop(secs)); }
  finally { fakeT = null; ({ctx, out, musicBus, musicWet, sfxBus, seaBus, verb} = keep); Object.assign(M, m); }
  return off.startRendering();
}
// A new style picked in Settings starts playing straight away, even in the middle of a rest.
export function playNow(){ M.rest = 0; M.playing = 0; M.cur = null; }
export const songNow = () => M.rec ? M.rec.r.name + (M.rec.src ? '' : ' (loading)') : null; // for tests and the Settings page
