// P75: the online Leaderboard. Every ship is counted automatically, and a player can take theirs off. What leaves this device: a random player id, ship names, types, two colors and each ship's numbers.
// The address comes from ONLINE_URL in config.js (tools/leaderboard is the server).
import {ONLINE_URL} from './config.js?v=2c85ea6';
import {G} from './state.js?v=2c85ea6';
const KEY = 'wine-dark-sea-online';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
const write = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
export const onlineURL = () => window.__TEST ? __TEST.get('onlineurl') || '' : ONLINE_URL; // tests never touch the real board
export const hasOnline = () => !!onlineURL();
export const me = read;
const newId = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); };
export const state = {rows:null, mine:null, total:0, by:null, loading:false, failed:false};
let shipsFn = null, lastSent = '';
export const setShips = f => { shipsFn = f; };
async function call(path, opt){ const c = new AbortController(), t = setTimeout(() => c.abort(), 9000); try { return await fetch(onlineURL() + path, {...opt, signal:c.signal}); } finally { clearTimeout(t); } }
const send = (method, body) => call('/ships', {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
const changed = () => document.dispatchEvent(new Event('ranksready'));
export async function load(by){ if (!hasOnline()) return; state.by = by; state.loading = true; state.failed = false; changed();
  try { const m = read(), r = await call(`/top?by=${encodeURIComponent(by)}${m.who ? `&me=${m.who}` : ''}`), d = await r.json(); if (state.by !== by) return; if (d.error) throw 0; state.rows = d.rows; state.mine = d.mine; state.total = d.total; }
  catch (e) { state.failed = true; } state.loading = false; changed(); }
export async function push(force){ let m = read(); if (m.off || !hasOnline() || !shipsFn || (G.noSave && !force)) return false;
  if (!m.player){ m = {...m, player:newId()}; write(m); }
  const ships = shipsFn(), s = JSON.stringify(ships); if (s === lastSent) return true;
  try { const r = await send('POST', {player:m.player, ships}), d = await r.json(); if (d.who){ write({...read(), who:d.who}); } if (r.ok) lastSent = s; return r.ok; } catch (e) { return false; } }
export async function comeBack(){ write({...read(), off:false}); lastSent = ''; await push(true); await load(state.by || 'sunk'); }
export async function leave(){ const m = read(); write({...m, off:true}); try { if (m.player) await send('DELETE', {player:m.player}); } catch (e) {} lastSent = ''; await load(state.by || 'sunk'); }
setTimeout(() => push(), window.__TEST ? 2500 : 30000); // the first count soon after you start sailing
setInterval(() => { if (!document.hidden) push(); }, 180000); // your numbers go up every few minutes while you play
