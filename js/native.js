// P78: what only the phone app needs: the Android back button, and saving the moment the app is put away.
import {G, save} from './state.js?v=3370c69';
const N = window.Capacitor, App = N && N.isNativePlatform && N.isNativePlatform() && N.Plugins && N.Plugins.App;
export const isApp = !!App;
if (App){
  App.addListener('backButton', () => { const $ = id => document.getElementById(id);
    /* P131: whatever is on top closes first. A choice list used to stay on screen while the page under it closed; Back did nothing on pages 2 and 3 of How to play */
    { const p = $('picker'); if (p && !p.hidden){ p.querySelector('.pickx').click(); return; } }
    { const nb = document.querySelector('.namebox'); if (nb){ const no = nb.querySelector('#nameNo, #sailLater'); if (no) no.click(); return; } }
    if (G.sheetOpen){ const x = document.querySelector('#sheet [data-act=close], #sheet [data-act=tutback]'); if (x) x.click(); return; }
    if (G.mapOpen){ if ($('homePop') && !$('homePop').hidden) $('homeCancel').click(); else $('mapClose').click(); return; }
    save(); App.minimizeApp(); });
  App.addListener('appStateChange', s => { if (!s.isActive) save(); });
  App.addListener('pause', () => save());
}
