// P67: when you buy or sell, the thing flies: coins rise from what you sold and land on your money; bought wood lands on your wood.
// The number on the bar counts up as they arrive.
const PATH = 620; // how long one icon is in the air (ms)
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const res = key => document.querySelector(`[data-res="${key}"]`);
function pulse(el){ if (!el) return; el.classList.remove('rbhit'); void el.offsetWidth; el.classList.add('rbhit'); }
function countUp(key, from, to, ms){ const start = performance.now(), step = now => { const el = res(key), b = el && el.querySelector('b'); if (!b) return; const k = Math.min(1, (now - start)/ms); b.textContent = Math.round(from + (to - from)*k); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
// src = the element (or list of elements) it comes from, key = which bar it goes to, svg = the picture, n = how many.
// from and to = the number on that bar before and after; label = a little "+25" that floats up where it started.
// Call it before the money changes hands: the menu is drawn again right after, so the bar is looked up a moment later.
export function fly(src, key, svg, n, from, to, label){
  const list = (Array.isArray(src) ? src : [src]).map(e => e.getBoundingClientRect());
  setTimeout(() => { const t = res(key); if (!t) return;
    const pic = t.querySelector('.rbi') || t, tr = pic.getBoundingClientRect(), tx = tr.left + tr.width/2, ty = tr.top + tr.height/2;
    if (still()){ pulse(t); return; }
    const gap = 70, total = PATH + (n - 1)*gap;
    if (from !== undefined) countUp(key, from, to, total);
    for (let i=0;i<n;i++){ const r = list[i % list.length], x0 = r.left + r.width/2 + (Math.random() - .5)*r.width*.4, y0 = r.top + r.height/2 + (Math.random() - .5)*r.height*.3;
      const d = document.createElement('div'); d.className = 'flyic'; d.innerHTML = svg; d.style.left = x0 + 'px'; d.style.top = y0 + 'px'; document.body.appendChild(d);
      const dx = tx - x0, dy = ty - y0, side = (Math.random() - .5)*60, up = -34 - Math.random()*26; // a little hop up first, then a curve to the bar
      const a = d.animate([
        {transform:'translate(-50%,-50%) scale(.3)', opacity:0, offset:0},
        {transform:`translate(calc(-50% + ${side*.5}px),calc(-50% + ${up}px)) scale(1.15)`, opacity:1, offset:.28},
        {transform:`translate(calc(-50% + ${dx*.55 + side}px),calc(-50% + ${dy*.55 + up*.5}px)) scale(1)`, opacity:1, offset:.68},
        {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.55)`, opacity:.9, offset:1},
      ], {duration:PATH, delay:i*gap, easing:'cubic-bezier(.35,0,.5,1)', fill:'both'});
      const end = () => { if (d.isConnected){ d.remove(); pulse(res(key)); } }; a.onfinish = end; setTimeout(end, PATH + i*gap + 150); } // (the timer in case the browser pauses animations)
    if (label){ const r = list[0], l = document.createElement('div'); l.className = 'flytxt'; l.textContent = label; l.style.left = r.left + r.width/2 + 'px'; l.style.top = r.top + 'px'; document.body.appendChild(l);
      l.animate([{transform:'translate(-50%,0)', opacity:0}, {transform:'translate(-50%,-14px)', opacity:1, offset:.2}, {transform:'translate(-50%,-44px)', opacity:0}], {duration:1200, easing:'ease-out'}).onfinish = () => l.remove(); }
  }, 0);
}
