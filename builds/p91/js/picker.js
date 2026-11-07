// P84 (Nicholas: "this pop up is very ugly, we cannot have any of this in the game"): no phone dropdowns anywhere.
// Every <select> in the game still holds the choice and still fires its 'change' event, so all the code that reads them keeps
// working, but nobody can open it: CSS turns off touches on it (select{pointer-events:none}), and a tap where it sits opens this
// in-game page instead, in the game's own look, with each choice as a big button.
const $p = () => document.getElementById('picker');
let open = null;

// the select under a tap (it gets no touches itself, so the tap lands on whatever is behind it)
function selectAt(x, y){
  for (const s of document.querySelectorAll('select')){
    if (s.disabled || !s.offsetParent) continue;
    const r = s.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s;
  }
  return null;
}
const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
function titleOf(s){
  const lab = s.closest('label'), span = lab && lab.querySelector('span');
  if (span && span.textContent.trim()) return span.textContent.trim();
  const row = s.closest('.row'), d = row && row.firstElementChild, t = d && d.firstChild && d.firstChild.textContent.trim(); // a settings row: its title comes first
  if (t) return t;
  return s.getAttribute('aria-label') || 'Choose';
}
function show(s){
  let el = $p(); if (!el){ el = document.createElement('div'); el.id = 'picker'; el.className = 'picker'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
  const item = o => `<button type="button" class="pickopt ${o.selected ? 'on' : ''}" data-v="${esc(o.value)}" ${o.disabled ? 'disabled' : ''} aria-pressed="${o.selected}"><span>${esc(o.textContent)}</span>${o.selected ? '<i aria-hidden="true">✓</i>' : ''}</button>`;
  const list = [...s.children].map(c => c.tagName === 'OPTGROUP' ? `<h4>${esc(c.label)}</h4>${[...c.children].map(item).join('')}` : item(c)).join('');
  el.innerHTML = `<div class="pickcard"><header><h3>${esc(titleOf(s))}</h3><button type="button" class="pickx" aria-label="Close">✕</button></header><div class="picklist">${list}</div></div>`;
  el.hidden = false; open = s;
  const on = el.querySelector('.pickopt.on'); if (on) on.scrollIntoView({block:'center'});
  (on || el.querySelector('.pickopt')).focus({preventScroll:true});
}
function close(){ const el = $p(); if (el) el.hidden = true; const s = open; open = null; if (s && document.contains(s)) try { s.focus({preventScroll:true}); } catch(_){} }
function choose(v){ const s = open; close(); if (!s || s.value === v) return; s.value = v; s.dispatchEvent(new Event('change', {bubbles:true})); }

document.addEventListener('click', e => {
  const el = $p();
  if (el && !el.hidden && el.contains(e.target)){
    const b = e.target.closest('.pickopt'); if (b) choose(b.dataset.v);
    else if (e.target.closest('.pickx') || e.target === el) close();
    e.stopPropagation(); return;
  }
  const s = selectAt(e.clientX, e.clientY); if (!s) return;
  e.preventDefault(); e.stopPropagation(); show(s);
}, true);
// keyboard: Enter or Space on a select opens the page; Escape closes it
document.addEventListener('keydown', e => {
  if (open && e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); return; }
  if (!open && e.target.tagName === 'SELECT' && (e.key === 'Enter' || e.key === ' ' || (e.altKey && e.key === 'ArrowDown'))){ e.preventDefault(); e.stopPropagation(); show(e.target); }
}, true);
// a mouse press on a select would open the browser's own list on a computer
document.addEventListener('mousedown', e => { if (e.target.tagName === 'SELECT') e.preventDefault(); }, true);
export const pickerOpen = () => !!open;
