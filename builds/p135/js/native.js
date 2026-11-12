// P78: what only the phone app needs: the Android back button, and saving the moment the app is put away.
import {G, save} from './state.js';
import {note} from './ads.js';
const N = window.Capacitor, App = N && N.isNativePlatform && N.isNativePlatform() && N.Plugins && N.Plugins.App;
export const isApp = !!App;
if (App){
  // P135 (Nicholas: Back on the chart left the game; every menu was fine): the phone can send one press of Back twice in a row.
  // The first closed the chart at once, the second found nothing open and put the game away. A second Back within a third of a
  // second is now ignored. The test app's Ad log notes each Back, so a phone problem shows there.
  let lastBack = 0;
  App.addListener('backButton', () => { const $ = id => document.getElementById(id), now = performance.now();
    if (now - lastBack < 350){ note('back: ignored a double press'); return; } lastBack = now;
    const mv = $('mapView'); note('back: ' + (G.sheetOpen ? 'menu' : G.mapOpen || (mv && !mv.hidden) ? 'chart' : 'sea'));
    /* P131: whatever is on top closes first. A choice list used to stay on screen while the page under it closed; Back did nothing on pages 2 and 3 of How to play */
    { const p = $('picker'); if (p && !p.hidden){ p.querySelector('.pickx').click(); return; } }
    { const nb = document.querySelector('.namebox'); if (nb){ const no = nb.querySelector('#nameNo, #sailLater'); if (no) no.click(); return; } }
    if (G.sheetOpen){ const x = document.querySelector('#sheet [data-act=close], #sheet [data-act=tutback]'); if (x) x.click(); return; }
    if (G.mapOpen || (mv && !mv.hidden)){ if ($('homePop') && !$('homePop').hidden) $('homeCancel').click(); else $('mapClose').click(); return; }
    save(); App.minimizeApp(); });
  App.addListener('appStateChange', s => { if (!s.isActive) save(); });
  App.addListener('pause', () => save());
}
