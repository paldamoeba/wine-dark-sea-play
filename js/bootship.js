// P73, P74: the loading screen: your own ship under way, up close, while the game loads. The picture runs on a background thread when it can (bootworker.js),
// or on the page if not. If neither works the plain title card stays. The canvas also has a slow sway in the CSS.
import {SHIPS} from './config.js?v=e95989f';
import {G, lvl} from './state.js?v=e95989f';
import {men} from './crew.js?v=e95989f';
const THREE_URL = new URL('../vendor/three.min.js', import.meta.url).href; // inside the game, so it works offline in the app

export function startBootShip(){
  const boot = document.getElementById('boot'), born = performance.now(), test = window.__TEST && !__TEST.get('bootship');
  let worker = null, onPage = null, cv = null, smooth = false, gone = false;
  const api = {
    // a free moment for the ship between loading steps (needed only when she runs on the page)
    breathe:() => smooth || test ? Promise.resolve() : new Promise(r => { const t = setTimeout(r, 40); requestAnimationFrame(() => { clearTimeout(t); r(); }); }),
    hold:ms => { const left = born + ms - performance.now(); return left > 0 && !test ? new Promise(r => setTimeout(r, left)) : Promise.resolve(); },
    finish(){ gone = true; boot.classList.add('gone'); setTimeout(() => { boot.remove(); removeEventListener('resize', size); if (worker) worker.terminate(); if (onPage) onPage.stop(); }, 500); },
  };
  const size = () => { if (worker) worker.postMessage({resize:[innerWidth, innerHeight]}); else if (onPage) onPage.resize(innerWidth, innerHeight); };
  if (test || !window.THREE) return api;
  const S = G.S, sh = SHIPS[S.tier] || SHIPS[0];
  const info = {model:sh.model, len:sh.len, beam:sh.beam, speed:sh.speed, look:{...S.look, ...(S.crewName ? {} : {flag:'none'}), ram:lvl('ram'), plate:lvl('hull'), sailLv:lvl('sail'), men:men()}};
  const dpr = Math.min(devicePixelRatio || 1, 1.75), name = (S.names || {})[S.tier];
  if (name){ const el = document.createElement('p'); el.textContent = name; boot.querySelector('h1').after(el); }
  const canvas = () => { if (cv) cv.remove(); cv = document.createElement('canvas'); cv.width = Math.round(innerWidth*dpr); cv.height = Math.round(innerHeight*dpr); boot.prepend(cv); return cv; };
  const pageScene = async () => { if (gone) return; smooth = false; if (worker){ worker.terminate(); worker = null; }
    try { const {runBootScene} = await import('./bootscene.js?v=e95989f'); if (gone) return; const c = canvas(); onPage = runBootScene(c, info, innerWidth, innerHeight, dpr, () => c.classList.add('on')); } catch (e) { /* the plain title card stays */ } };
  addEventListener('resize', size);
  const q = window.__TEST && __TEST.get('bootpage');
  if (q || !window.Worker || !HTMLCanvasElement.prototype.transferControlToOffscreen){ pageScene(); return api; }
  try {
    // started through a small blob so it also runs inside a sandboxed frame (like the claude.ai page), where a plain worker file is refused
    const url = new URL('./bootworker.js' + new URL(import.meta.url).search, import.meta.url).href;
    const blob = URL.createObjectURL(new Blob([`import(${JSON.stringify(url)}).catch(e => postMessage({err:String(e)}));`], {type:'text/javascript'}));
    worker = new Worker(blob, {type:'module'});
    const c = canvas();
    let off = null, late = setTimeout(pageScene, 2500); // no word from the worker: draw on the page instead
    worker.onerror = e => { clearTimeout(late); pageScene(); };
    worker.onmessage = e => { const m = e.data;
      if (m.ready){ off = c.transferControlToOffscreen(); worker.postMessage({canvas:off, three:THREE_URL, info, w:innerWidth, h:innerHeight, dpr}, [off]); smooth = true; }
      if (m.first){ clearTimeout(late); c.classList.add('on'); if (window.__TEST) console.log('BOOTSHIP worker'); }
      if (m.err){ clearTimeout(late); pageScene(); if (window.__TEST) console.log('BOOTSHIP worker failed ' + m.err); } };
  } catch (e) { pageScene(); }
  return api;
}
