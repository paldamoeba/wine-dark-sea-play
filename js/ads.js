// P87: real video ads in the phone app (AdMob, through the @capacitor-community/admob plugin).
// Only rewarded videos: the player chooses to watch one for a reward (a shorter wait, a color, a repair, sailing home). No banners.
// Test builds always ask Google for its sample test ads; only the store build (RELEASE) uses the real ad unit.
// Europe and the UK (and US states with privacy laws) get Google's consent form first, from the message set up in AdMob, Privacy & messaging.
import {APP, RELEASE} from './state.js?v=788f7d6';
import {hush} from './audio.js?v=788f7d6';

export const ADMOB = {
  real:'ca-app-pub-4758417555480046/2855047321',  // "Shorten wait", Wine-Dark Sea (app ID ca-app-pub-4758417555480046~2858916755 is in the Android manifest)
  test:'ca-app-pub-3940256099942544/5224354917',  // Google's own sample rewarded ad: always safe to tap
};
const P = APP && window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AdMob;
const unit = RELEASE ? ADMOB.real : ADMOB.test;
export const ads = {on:false, ready:false, loading:false, privacy:false, err:'', log:[], busy:false, paidAt:0};

async function prepare(){
  if (!P || !ads.on || ads.ready || ads.loading) return; ads.loading = true;
  try { await P.prepareRewardVideoAd({adId:unit, isTesting:!RELEASE, immersiveMode:true}); ads.ready = true; ads.err = ''; }
  catch (e){ ads.err = String(e && e.message || e); setTimeout(prepare, 60000); } // no video right now (offline, or none to give): try again in a minute
  ads.loading = false;
}
export const note = m => { ads.log.push(new Date().toLocaleTimeString() + ' ' + m); if (ads.log.length > 30) ads.log.shift(); };
// P105: Google's consent answer also says whether the game must offer a "Privacy settings" button (the UMP privacy options
// entry point). The Europe and US states messages in AdMob depend on it. If the phone was offline, ask again every minute.
let started = false;
async function consent(){
  try {
    let c = await P.requestConsentInfo();
    if (c.status === 'REQUIRED' && c.isConsentFormAvailable) c = await P.showConsentForm();
    ads.privacy = c.privacyOptionsRequirementStatus === 'REQUIRED'; // then Settings shows "Privacy settings"
    note('consent ' + c.status + ', privacy button ' + (ads.privacy ? 'on' : 'off'));
    if (c.canRequestAds === false) return false;
  } catch (e){ ads.err = 'consent: ' + (e && e.message || e); note(ads.err); setTimeout(retry, 60000); } // no answer from Google (offline): ads can still load once online
  return true;
}
async function retry(){ if (await consent() && !started) startAds(); }
async function startAds(){ started = true; try { await P.initialize({maxAdContentRating:'ParentalGuidance'}); ads.on = true; prepare(); } catch (e){ started = false; ads.err = 'init: ' + (e && e.message || e); } }
export async function initAds(){
  if (!P) return;
  if (await consent()) startAds();
}
export function adPrivacy(){ if (P) P.showPrivacyOptionsForm().then(c => { if (c) ads.privacy = c.privacyOptionsRequirementStatus !== 'NOT_REQUIRED'; note('privacy settings closed'); }).catch(e => note('privacy settings: ' + (e && e.message || e))); }
// P100: test app only. Shows Google's consent form as a player in Europe sees it, from anywhere. Google allows that only on a test
// device: its code (a hash) is printed in the phone's log as addTestDeviceHashedId("...") the first time the app asks for consent.
export const CONSENT_TEST = !!P && !RELEASE;
export async function consentTest(hash){
  if (!CONSENT_TEST) return 'Only in the test app';
  try { await P.resetConsentInfo();
    let c = await P.requestConsentInfo({debugGeography:1, testDeviceIdentifiers:hash ? [hash.trim()] : []}); // 1 = EEA
    if (c.isConsentFormAvailable && c.status === 'REQUIRED'){ c = await P.showConsentForm(); ads.privacy = c.privacyOptionsRequirementStatus === 'REQUIRED'; return 'Form shown'; }
    return 'No form: status ' + c.status + (hash ? '' : ' (add the test device code)'); }
  catch (e){ return 'Error: ' + (e && e.message || e); } }

// Show a video. done() once the player has earned the reward; fail(reason) otherwise ('none' = no video to show, 'closed' = closed early).
// P89 (Nicholas: the video played but no reward came): the reward can reach the game after the video is closed, or only through the
// show call, so wait a moment after it closes and give the reward whichever way it arrives (only once). ads.log keeps what happened
// (Builder tab, "Ad log") so a phone problem can be seen.
export function showRewarded(done, fail){
  if (!P || !ads.ready){ prepare(); fail('none'); return; }
  ads.ready = false; ads.busy = true; let paid = false, over = false, timer = 0; const subs = [];
  const log = m => { ads.log.push(new Date().toLocaleTimeString() + ' ' + m); if (ads.log.length > 30) ads.log.shift(); };
  const pay = how => { log('reward (' + how + ')'); if (paid) return; paid = true; ads.paidAt = Date.now(); if (over){ done(); return; } if (!timer) timer = setTimeout(end, 4000); }; // closed never heard: pay anyway
  const end = () => { if (over) return; over = true; ads.busy = false; clearTimeout(timer);
    try { subs.forEach(s => Promise.resolve(s).then(h => h && h.remove && h.remove()).catch(() => {})); hush(false); } catch (e){ log('cleanup error ' + (e && e.message || e)); }
    try { if (paid){ log('giving the reward'); done(); } else { log('no reward'); fail('closed'); } } catch (e){ log('reward error ' + (e && e.message || e)); } // P106: shows in the Ad log if the game side breaks
    setTimeout(prepare, 500); };
  const closed = what => { log(what); clearTimeout(timer); timer = setTimeout(end, 1500); };
  // P104 (Nicholas: after a revive video he came back to a ship still sinking, for good): sometimes no "closed" news ever comes
  // back from the ad. So when the game is on screen again, finish a moment later anyway; and never wait more than 3 minutes.
  const back = () => { if (document.visibilityState === 'visible' && !over && !timer){ log('back in the game'); timer = setTimeout(end, 2500); } };
  document.addEventListener('visibilitychange', back); subs.push(Promise.resolve({remove:() => document.removeEventListener('visibilitychange', back)}));
  const cap = setTimeout(() => { log('gave up waiting'); end(); }, 180000); subs.push(Promise.resolve({remove:() => clearTimeout(cap)}));
  subs.push(P.addListener('onRewardedVideoAdReward', () => pay('event')));
  subs.push(P.addListener('onRewardedVideoAdDismissed', () => closed('closed')));
  subs.push(P.addListener('onRewardedVideoAdFailedToShow', e => { log('failed to show ' + JSON.stringify(e)); end(); }));
  hush(true); log('show');
  P.showRewardVideoAd().then(() => pay('call')).catch(e => { log('show error ' + (e && e.message || e)); closed('error'); });
}
