// P87: real video ads in the phone app (AdMob, through the @capacitor-community/admob plugin).
// Only rewarded videos: the player chooses to watch one for a reward (a shorter wait, a color, a repair, sailing home). No banners.
// Test builds always ask Google for its sample test ads; only the store build (RELEASE) uses the real ad unit.
// Europe and the UK (and US states with privacy laws) get Google's consent form first, from the message set up in AdMob, Privacy & messaging.
import {APP, RELEASE} from './state.js';
import {hush} from './audio.js';

export const ADMOB = {
  real:'ca-app-pub-4758417555480046/2855047321',  // "Shorten wait", Wine-Dark Sea (app ID ca-app-pub-4758417555480046~2858916755 is in the Android manifest)
  test:'ca-app-pub-3940256099942544/5224354917',  // Google's own sample rewarded ad: always safe to tap
};
const P = APP && window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AdMob;
const unit = RELEASE ? ADMOB.real : ADMOB.test;
export const ads = {on:false, ready:false, loading:false, privacy:false, err:''};

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

// Show a video. done() only if it was watched to the end; fail(reason) otherwise ('none' = no video to show, 'closed' = closed early).
export function showRewarded(done, fail){
  if (!P || !ads.ready){ prepare(); fail('none'); return; }
  ads.ready = false; let earned = false, over = false; const subs = [];
  const finish = () => { if (over) return; over = true; subs.forEach(s => s.then(h => h.remove())); hush(false); earned ? done() : fail('closed'); setTimeout(prepare, 500); };
  subs.push(P.addListener('onRewardedVideoAdReward', () => { earned = true; }));
  subs.push(P.addListener('onRewardedVideoAdDismissed', finish));
  subs.push(P.addListener('onRewardedVideoAdFailedToShow', () => { earned = false; finish(); }));
  hush(true);
  P.showRewardVideoAd().then(() => { earned = true; }).catch(() => finish());
}
