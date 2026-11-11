// P78: what only the phone app needs: the Android back button, and saving the moment the app is put away.
import {G, save} from './state.js?v=11d7486';
const N = window.Capacitor, App = N && N.isNativePlatform && N.isNativePlatform() && N.Plugins && N.Plugins.App;
export const isApp = !!App;
if (App){
  App.addListener('backButton', () => { const $ = id => document.getElementById(id);
    if (G.sheetOpen){ const x = document.querySelector('#sheet [data-act=close]'); if (x) x.click(); return; }
    if (G.mapOpen){ if ($('homePop') && !$('homePop').hidden) $('homeCancel').click(); else $('mapClose').click(); return; }
    save(); App.minimizeApp(); });
  App.addListener('appStateChange', s => { if (!s.isActive) save(); });
  App.addListener('pause', () => save());
}
