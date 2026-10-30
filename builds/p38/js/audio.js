// Every sound in the game, made on the fly with the Web Audio API: no sound files to download or license.
// Three volume knobs: music (the lyre and flute), effects (coins, arrows, bells) and the sea (waves, wind, rain, gulls).
// Sounds with a place in the world (x, y) get quieter far from the camera and lean left or right on the screen.
// Browsers keep sound off until the first tap, so everything waits for that.
const AC = window.AudioContext || window.webkitAudioContext;
export const SND = {on:true, music:.6, sfx:.6, sea:.6, ready:false}; // .6 = Medium in Settings
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
['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, () => startAudio(), {capture:true, passive:true}));
export function applyVolumes(){
  if (!ctx) return; const t = ctx.currentTime, on = SND.on ? 1 : 0;
  musicBus.gain.setTargetAtTime(SND.music*.8*on, t, .3); sfxBus.gain.setTargetAtTime(SND.sfx*1.33*on, t, .1); seaBus.gain.setTargetAtTime(SND.sea*1.17*on, t, .3);
}
// A level meter on everything that plays (for tests and the showroom).
export function meter(){ if (!ctx) return null; const a = ctx.createAnalyser(); a.fftSize = 2048; out.connect(a); return a; }
export function setListener(x, y, far = 1400){ lis.x = x; lis.y = y; lis.far = far; }
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (SND.on) ctx.resume(); });

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
    if (ctx.createStereoPanner){ const p = ctx.createStereoPanner(); p.pan.value = Math.max(-.8, Math.min(.8, (dx - dy)*.7071/600)); g.connect(p); p.connect(bus); } else g.connect(bus); }
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
  catch:{name:'Big fish landed', play:(t, d) => { noise(t, .5, d, {f:2600, f2:350, q:.7, peak:.6}); const w = wet(d, .5); [62, 66, 69, 74].forEach((m, i) => pluck(midi(m + 12), t + .15 + i*.08, w, .5)); }},
  miss:{name:'The fish got away', play:(t, d) => { noise(t, .2, d, {f:1800, f2:600, peak:.3}); const w = wet(d, .4); [69, 65, 62].forEach((m, i) => pluck(midi(m), t + .05 + i*.12, w, .4, .3)); }},
  wood:{name:'Wood picked up', gap:.08, play:(t, d) => { [0, .11].forEach(o => { osc('triangle', 240, t + o, .09, d, .35, .002, 150); noise(t + o, .05, d, {f:1100, q:2, peak:.3}); }); }},
  chop:{name:'Axe on a tree', gap:.15, play:(t, d) => { noise(t, .07, d, {type:'lowpass', f:2600, peak:.7}); osc('triangle', 180, t, .14, d, .45, .002, 110); noise(t + .05, .25, d, {f:3500, f2:6000, q:4, peak:.04}); }},
  bow:{name:'Arrow fired', gap:.04, play:(t, d) => { osc('triangle', 190, t, .09, d, .35, .002, 120); noise(t + .02, .32, d, {f:2200, f2:600, q:2, peak:.3, a:.04}); }},
  thud:{name:'Arrow hits a hull', gap:.05, play:(t, d) => { noise(t, .07, d, {type:'lowpass', f:1400, peak:.5}); osc('sine', 140, t, .1, d, .4, .002, 80); }},
  plop:{name:'Arrow misses into the sea', gap:.06, vol:.9, play:(t, d) => { osc('sine', 900, t, .07, d, .2, .003, 1500); noise(t, .14, d, {f:3000, f2:1200, q:1.5, peak:.15}); }},
  hurt:{name:'Your hull is hit', gap:.12, play:(t, d) => { noise(t, .12, d, {type:'lowpass', f:900, peak:.7}); osc('sine', 95, t, .2, d, .5, .002, 55); creakAt(t + .05, d, .3); }},
  volley:{name:'Volley', play:(t, d) => { for (let i=0;i<6;i++){ const o = i*.05 + Math.random()*.03; osc('triangle', 170 + Math.random()*50, t + o, .09, d, .2, .002, 110); noise(t + o + .02, .4, d, {f:2000, f2:500, q:2, peak:.12, a:.05}); } }},
  catapult:{name:'Catapult throws', gap:.3, play:(t, d) => { creakAt(t, d, .7); osc('sine', 70, t + .25, .25, d, .45, .003, 40); noise(t + .25, .2, d, {type:'lowpass', f:700, peak:.4}); }},
  bigsplash:{name:'Stone lands in the sea', gap:.15, play:(t, d) => { noise(t, .9, d, {type:'lowpass', f:3500, f2:250, peak:.7, a:.01}); osc('sine', 110, t, .25, d, .4, .004, 50); }},
  ram:{name:'Ram hit', play:(t, d) => { osc('sine', 75, t, .35, d, .9, .002, 35); noise(t, .35, d, {type:'lowpass', f:1800, f2:300, peak:.8}); for (let i=0;i<4;i++) noise(t + .05 + i*.06, .05, d, {type:'highpass', f:2500, peak:.35}); }},
  bump:{name:'Ships bump', gap:.3, play:(t, d) => { osc('sine', 110, t, .18, d, .5, .003, 70); noise(t, .1, d, {type:'lowpass', f:800, peak:.35}); }},
  crash:{name:'A ship breaks apart', gap:.4, play:(t, d) => { noise(t, 1.6, d, {type:'lowpass', f:600, f2:120, peak:.8, buf:brownBuf, a:.02});
    for (let i=0;i<7;i++){ const o = Math.random()*.9; noise(t + o, .06, d, {type:'highpass', f:1800 + Math.random()*2000, peak:.4}); osc('triangle', 120 + Math.random()*80, t + o, .1, d, .2, .002, 60); }
    bubbles(t + .8, d, 10); }},
  sink:{name:'Your ship sinks', play:(t, d) => { const w = wet(d, .4); noise(t, 2, w, {type:'lowpass', f:500, f2:90, peak:.8, buf:brownBuf}); creakAt(t, w, .6); creakAt(t + .7, w, .5); bubbles(t + 1, w, 16); [62, 61, 57, 50].forEach((m, i) => pluck(midi(m), t + 1.2 + i*.35, w, .4, .25)); }},
  bubbles:{name:'Bubbles', play:(t, d) => bubbles(t, d, 12)},
  bell:{name:'Harbor bell', gap:.5, play:(t, d) => { const w = wet(d, .9); bell(t, w, 523, .4); bell(t + .9, w, 523, .3); }},
  horn:{name:'War horn', gap:1, play:(t, d) => { const w = wet(d, .5), o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.setValueAtTime(196, t); o.frequency.linearRampToValueAtTime(220, t + .25); o2.frequency.setValueAtTime(197.5, t); o2.frequency.linearRampToValueAtTime(221.5, t + .25);
    f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(1500, t + .3); f.frequency.linearRampToValueAtTime(700, t + 1.3);
    g.gain.value = .0001; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.2, t + .15); g.gain.setValueAtTime(.2, t + 1); g.gain.exponentialRampToValueAtTime(.0001, t + 1.5);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(w); o.start(t); o2.start(t); o.stop(t + 1.6); o2.stop(t + 1.6); }},
  chime:{name:'Goal or job done', play:(t, d) => { const w = wet(d, .6); [62, 66, 69, 74, 78].forEach((m, i) => pluck(midi(m + 12), t + i*.09, w, .45, .6)); }},
  fanfare:{name:'New ship ready', play:(t, d) => { SOUNDS.horn.play(t, d); const w = wet(d, .6); [[62, 66, 69], [64, 67, 71], [66, 69, 74]].forEach((ch, i) => ch.forEach((m, k) => pluck(midi(m + 12), t + .4 + i*.3 + k*.025, w, .4, .6))); }},
  hammer:{name:'Shipwright at work', play:(t, d) => { for (let i=0;i<3;i++){ const o = i*.2; noise(t + o, .05, d, {f:2500, q:3, peak:.5}); osc('triangle', 330, t + o, .08, d, .3, .001, 200); osc('sine', 2900, t + o, .12, d, .05); } SOUNDS.chime.play(t + .65, d); }},
  buy:{name:'Bought something', play:(t, d) => { SOUNDS.coin.play(t, d); osc('sine', 660, t + .1, .12, d, .1); }},
  blessing:{name:'Poseidon\'s blessing', play:(t, d) => { const w = wet(d, 1); for (let i=0;i<14;i++) pluck(midi(62 + [0, 2, 4, 7, 9][i % 5] + 12*Math.floor(i/5)), t + i*.06, w, .35, .7);
    osc('sine', 1174, t + .9, 1.6, w, .06, .6); osc('sine', 1760, t + 1, 1.6, w, .04, .6); }},
  whale:{name:'Whale song', gap:2, sea:true, play:(t, d) => { const w = wet(d, 1.2), o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.linearRampToValueAtTime(240, t + .8); o.frequency.linearRampToValueAtTime(120, t + 2.6);
    lfo.frequency.value = 5; lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency); f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.value = .0001; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.2, t + .5); g.gain.linearRampToValueAtTime(.14, t + 2); g.gain.exponentialRampToValueAtTime(.0001, t + 2.8);
    o.connect(f); f.connect(g); g.connect(w); o.start(t); lfo.start(t); o.stop(t + 3); lfo.stop(t + 3);
    noise(t + 2.4, 1.1, d, {f:900, f2:2500, q:.6, peak:.3, a:.15}); }},
  spout:{name:'Whale blows', sea:true, play:(t, d) => noise(t, 1.2, d, {f:700, f2:2200, q:.5, peak:.35, a:.12})},
  splash:{name:'Splash', gap:.1, sea:true, play:(t, d) => noise(t, .35, d, {f:2200, f2:500, q:.8, peak:.5})},
  gull:{name:'Gull calls', gap:.4, sea:true, play:(t, d) => gullCry(t, d)},
  thunder:{name:'Thunder', gap:1, sea:true, play:(t, d) => { noise(t, .25, d, {type:'highpass', f:900, peak:.35}); noise(t + .05, 3.2, d, {type:'lowpass', f:260, f2:60, peak:1, buf:brownBuf, a:.08}); noise(t + .6, 2.2, d, {type:'lowpass', f:180, f2:50, peak:.6, buf:brownBuf, a:.3}); }},
  creak:{name:'Hull creaks', gap:.5, sea:true, play:(t, d) => creakAt(t, d, .35)},
  oar:{name:'Oar stroke', gap:.15, sea:true, play:(t, d) => { noise(t, .18, d, {f:1300, f2:700, q:1.2, peak:.14, a:.02}); noise(t + .14, .35, d, {type:'highpass', f:3000, peak:.04, a:.05}); osc('sine', 600 + Math.random()*300, t + .25, .05, d, .03, .002, 1100); }},
  sail:{name:'Sail flaps', gap:.6, sea:true, play:(t, d) => { for (let i=0;i<3;i++) noise(t + i*.09, .12, d, {f:500, f2:300, q:.8, peak:.5 - i*.12, buf:pinkBuf}); }},
  bottle:{name:'Bottle opened', play:(t, d) => { osc('sine', 2400, t, .3, d, .2); osc('sine', 3900, t + .05, .2, d, .1); osc('sine', 700, t + .4, .06, d, .22, .001, 300); noise(t + .4, .05, d, {type:'highpass', f:2000, peak:.3}); }},
  treasure:{name:'Treasure found', play:(t, d) => { creakAt(t, d, .4); SOUNDS.coins.play(t + .3, d); SOUNDS.chime.play(t + .5, d); }},
  crowd:{name:'The arena crowd cheers', gap:1, play:(t, d) => { const w = wet(d, .6); [700, 1100, 1600, 2400].forEach((f, i) => noise(t + i*.03, 2, w, {f, q:1.5, peak:.35, a:.4, buf:pinkBuf})); for (let i=0;i<10;i++) osc('triangle', 500 + Math.random()*500, t + .2 + Math.random()*1.2, .25, w, .06, .05); }},
  zone:{name:'New waters', play:(t, d) => { const w = wet(d, .9); pluck(midi(57), t, w, .35, .35); pluck(midi(64), t + .25, w, .3, .35); pluck(midi(69), t + .5, w, .3, .35); }},
  warn:{name:'A storm is coming', sea:true, play:(t, d) => noise(t, 3.5, d, {type:'lowpass', f:160, f2:60, peak:.7, buf:brownBuf, a:.6})},
  dock:{name:'Mooring ropes', play:(t, d) => { creakAt(t, d, .35); osc('sine', 120, t + .2, .2, d, .3, .004, 80); noise(t + .2, .1, d, {type:'lowpass', f:900, peak:.3}); }},
};
function bubbles(t, d, n){ for (let i=0;i<n;i++){ const o = i*.07 + Math.random()*.05, f = 300 + Math.random()*500; osc('sine', f, t + o, .06, d, .12, .004, f*2.2); } }
function bell(t, d, f, vol){ [[1, 1], [2.02, .5], [2.76, .35], [4.07, .2], [5.4, .1]].forEach(([r, v]) => osc('sine', f*r, t, 2.4/r + .4, d, vol*v, .002)); }
function creakAt(t, d, vol){ vol *= 1.8; const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), base = 70 + Math.random()*40;
  o.type = 'sawtooth'; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base*1.6, t + .25); o.frequency.linearRampToValueAtTime(base*1.2, t + .5);
  f.type = 'bandpass'; f.frequency.value = 900 + Math.random()*500; f.Q.value = 6;
  g.gain.value = .0001; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol*.5, t + .08); g.gain.linearRampToValueAtTime(vol*.3, t + .35); g.gain.exponentialRampToValueAtTime(.0001, t + .6);
  o.connect(f); f.connect(g); g.connect(d); o.start(t); o.stop(t + .7); }
// a gull: two or three falling "kee-ow" cries
function gullCry(t, d){ const n = 2 + Math.floor(Math.random()*2), p = .9 + Math.random()*.25;
  for (let i=0;i<n;i++){ const s = t + i*(.26 + Math.random()*.08), o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(1300*p, s); o.frequency.linearRampToValueAtTime(1750*p, s + .05); o.frequency.exponentialRampToValueAtTime(850*p, s + .22);
    f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 2.5;
    g.gain.value = .0001; g.gain.setValueAtTime(.0001, s); g.gain.linearRampToValueAtTime(.26, s + .03); g.gain.exponentialRampToValueAtTime(.0001, s + .24);
    o.connect(f); f.connect(g); g.connect(d); o.start(s); o.stop(s + .3); } }

// ---- the sea: sounds that never stop, louder or softer with what is happening ----
let beds = null;
function loop(buf, type, f, q, dest){ const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; s.loop = true;
  fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(dest); s.start(0, Math.random()*3); return {g, fl}; }
function buildBeds(){
  beds = {
    waves: loop(brownBuf, 'lowpass', 420, .5, seaBus),   // the low roll of the sea
    wash:  loop(pinkBuf, 'bandpass', 700, .7, seaBus),   // waves breaking, swelling in and out
    wind:  loop(pinkBuf, 'bandpass', 500, 1.6, seaBus),  // wind, whistling higher in storms
    rain:  loop(noiseBuf, 'highpass', 2500, .5, seaBus),
    bow:   loop(pinkBuf, 'bandpass', 1100, .9, seaBus),  // water rushing past the hull
    fire:  loop(noiseBuf, 'bandpass', 3000, .7, seaBus), // the hiss under crackling fires
  };
}
// The game calls this every frame with what is going on around the ship.
// a = {speed 0..1, waves 0..2, storm 0..1, wind 0..1, rain 0..1, night 0..1, gulls 0..1, fire 0..1, rowing, sail, docked}
const QUIET = {speed:0, waves:1, storm:0, wind:0, rain:0, night:0, land:0, gulls:0, fire:0, rowing:false, sail:false, docked:false};
let swell = 0, windWander = 0, nextGull = 4, nextCreak = 3, oarT = 0, nextCricket = 1, nextCrackle = .5, nextSail = 5;
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
  set('rain', a.rain*.11);
  set('bow', a.speed*a.speed*.12, .2);
  set('fire', a.fire*.02);
  const sea = seaBus;
  // gulls near islands, wrecks and harbors
  if ((nextGull -= dt) <= 0){ nextGull = 4 + Math.random()*10; if (Math.random() < a.gulls && a.night < .5){ const g = place(sea, null, .25 + Math.random()*.3); if (g){ if (ctx.createStereoPanner){ const p = ctx.createStereoPanner(); p.pan.value = Math.random()*1.4 - .7; g.disconnect(); g.connect(p); p.connect(sea); } gullCry(t, g); } } }
  // the hull creaks as the boat rolls, more in big waves
  if ((nextCreak -= dt) <= 0){ nextCreak = 3 + Math.random()*7/(.6 + a.waves*.5); if (!a.docked || Math.random() < .3){ const g = place(sea, null, .5 + a.waves*.3); if (g) creakAt(t, g, .35); } }
  // oars dip in time with the stroke
  if (a.rowing && a.speed > .08){ oarT += dt*(.55 + a.speed*.6); if (oarT >= 1){ oarT -= 1; const g = place(sea, null, .5 + a.speed*.5); if (g) SOUNDS.oar.play(t, g); } }
  if (a.sail && a.speed > .3 && (nextSail -= dt) <= 0){ nextSail = 6 + Math.random()*10; const g = place(sea, null, .4 + a.wind*.6); if (g) SOUNDS.sail.play(t, g); }
  // crickets at night, from the islands
  if (a.night > .5 && a.land > .2 && (nextCricket -= dt) <= 0){ nextCricket = .5 + Math.random()*1.4; const g = place(sea, null, .1*a.land); if (g) cricket(t, g); }
  // fires crackle near torches and fire bowls
  if (a.fire > .05 && (nextCrackle -= dt) <= 0){ nextCrackle = .05 + Math.random()*.25; const g = place(sea, null, a.fire*.5); if (g) noise(t, .02, g, {type:'highpass', f:2000 + Math.random()*3000, peak:.2 + Math.random()*.2}); }
  updateMusic(dt, a);
}
function cricket(t, d){ const f = 4200 + Math.random()*300; for (let i=0;i<3;i++) osc('sine', f, t + i*.06, .035, d, .12, .004); }

// ---- music: a lyre, a soft drone and now and then a flute, made up as it plays ----
// Day plays in a warm Greek mode (D Dorian), night slower and softer, battle with a frame drum and a darker mode.
// Every few minutes the music rests and lets the sea be heard.
const MODES = {
  day:   {root:50, scale:[0, 2, 3, 5, 7, 9, 10], bpm:84, chords:[[0, 3, 7], [-2, 2, 5], [0, 3, 7], [-5, 0, 3], [5, 9, 12], [3, 7, 10], [-2, 2, 5], [0, 3, 7]]},
  night: {root:45, scale:[0, 2, 3, 5, 7, 8, 10], bpm:62, chords:[[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [0, 3, 7]]},
  harbor:{root:55, scale:[0, 2, 4, 5, 7, 9, 10], bpm:92, chords:[[0, 4, 7], [-2, 2, 5], [5, 9, 12], [0, 4, 7], [-5, -1, 2], [0, 4, 7]]},
  battle:{root:50, scale:[0, 1, 3, 5, 7, 8, 10], bpm:120, chords:[[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 1, 5]]},
};
const M = {mood:'day', want:'day', next:0, step:0, bar:0, rest:0, playing:0, mel:7, drone:null, test:null};
export function musicMood(m){ M.want = m; }
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
function updateMusic(dt, a){
  if (SND.music <= 0){ if (M.drone) droneStop(); return; }
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
    if (M.mood !== 'battle' && !M.noRest && M.playing >= 28 && M.step % 8 === 0){ M.playing = 0; M.rest = 20 + Math.random()*30; droneStop(); break; }
  }
}
// The showroom plays the music on its own, without the game around it.
export function testMusic(mood, noRest = false){ M.noRest = noRest; M.want = M.mood = mood; M.rest = 0; M.playing = 0; M.bar = 0; M.step = 0; if (M.drone) droneStop(); }
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
export async function renderMusic(mood, secs = 20){
  const keep = {ctx, out, musicBus, musicWet, sfxBus, seaBus, verb}, m = {...M};
  const off = new OfflineAudioContext(2, Math.ceil(44100*secs), 44100); init(off, false);
  Object.assign(M, {drone:null, playing:0}); testMusic(mood);
  try { for (fakeT = 0; fakeT < secs - 1; fakeT += .1) updateMusic(.1, {}); if (M.drone) M.drone.os.forEach(o => o.stop(secs)); }
  finally { fakeT = null; ({ctx, out, musicBus, musicWet, sfxBus, seaBus, verb} = keep); Object.assign(M, m); }
  return off.startRendering();
}
