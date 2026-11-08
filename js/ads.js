// P87: real video ads in the phone app (AdMob, through the @capacitor-community/admob plugin).
// Only rewarded videos: the player chooses to watch one for a reward (a shorter wait, a color, a repair, sailing home). No banners.
// Test builds always ask Google for its sample test ads; only the store build (RELEASE) uses the real ad unit.
// Europe and the UK (and US states with privacy laws) get Google's consent form first, from the message set up in AdMob, Privacy & messaging.
import {APP, RELEASE} from './state.js?v=5a19ef6';
import {hush} from './audio.js?v=5a19ef6';

export const ADMOB = {
  real:'ca-app-pub-4758417555480046/2855047321',  // "Shorten wait", Wine-Dark Sea (app ID ca-app-pub-4758417555480046~2858916755 is in the Android manifest)
  test:'ca-app-pub-3940256099942544/5224354917',  // Google's own sample rewarded ad: always safe to tap
};
const P = APP && window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AdMob;
const unit = RELEASE ? ADMOB.real : ADMOB.test;
export const ads = {on:false, ready:false, loading:false, privacy:false, err:'', log:[]};

async function prepare(){
  if (!P || !ads.on || ads.ready || ads.loading) return; ads.loading = true;
  try { await P.prepareRewardVideoAd({adId:unit, isTesting:!RELEASE, immersiveMode:true}); ads.ready = true; ads.err = ''; }
  catch (e){ ads.err = String(e && e.message || e); setTimeout(prepare, 60000); } // no video right now (offline, or none to give): try again in a minute
  ads.loading = false;
}
export async function initAds(){
  if (!P) return;
  try {
    let c = await P.requestConsentInfo();
    if (c.status === 'REQUIRED' && c.isConsentFormAvailable) c = await P.showConsentForm();
    ads.privacy = c.privacyOptionsRequirementStatus === 'REQUIRED'; // then Settings shows "Ad privacy choices"
    if (c.canRequestAds === false) return;
  } catch (e){ ads.err = 'consent: ' + (e && e.message || e); } // no answer from Google (offline): ads can still load once online
  try { await P.initialize({maxAdContentRating:'ParentalGuidance'}); ads.on = true; prepare(); } catch (e){ ads.err = 'init: ' + (e && e.message || e); }
}
export function adPrivacy(){ if (P) P.showPrivacyOptionsForm().catch(() => {}); }

// Show a video. done() once the player has earned the reward; fail(reason) otherwise ('none' = no video to show, 'closed' = closed early).
// P89 (Nicholas: the video played but no reward came): the reward can reach the game after the video is closed, or only through the
// show call, so wait a moment after it closes and give the reward whichever way it arrives (only once). ads.log keeps what happened
// (Builder tab, "Ad log") so a phone problem can be seen.
export function showRewarded(done, fail){
  if (!P || !ads.ready){ prepare(); fail('none'); return; }
  ads.ready = false; let paid = false, over = false, timer = 0; const subs = [];
  const log = m => { ads.log.push(new Date().toLocaleTimeString() + ' ' + m); if (ads.log.length > 30) ads.log.shift(); };
  const pay = how => { log('reward (' + how + ')'); if (paid) return; paid = true; if (over){ done(); return; } if (!timer) timer = setTimeout(end, 4000); }; // closed never heard: pay anyway
  const end = () => { if (over) return; over = true; clearTimeout(timer); subs.forEach(s => s.then(h => h.remove()).catch(() => {})); hush(false);
    if (paid) done(); else { log('no reward'); fail('closed'); } setTimeout(prepare, 500); };
  const closed = what => { log(what); clearTimeout(timer); timer = setTimeout(end, 1500); };
  subs.push(P.addListener('onRewardedVideoAdReward', () => pay('event')));
  subs.push(P.addListener('onRewardedVideoAdDismissed', () => closed('closed')));
  subs.push(P.addListener('onRewardedVideoAdFailedToShow', e => { log('failed to show ' + JSON.stringify(e)); end(); }));
  hush(true); log('show');
  P.showRewardVideoAd().then(() => pay('call')).catch(e => { log('show error ' + (e && e.message || e)); closed('error'); });
}
