import {levelStore} from './rack-levels.mjs';
// Bus registration once; changed sampled values only. No SC polling messages.
export function receiveEnvelopeLevels(token,onStores){
 let source;const stores=new Map();
 const clear=()=>{for(const s of stores.values())s.observe(null)};
 const connect=()=>{source?.close();source=null;if(document.hidden){clear();return}source=new EventSource(`/events/meters?token=${encodeURIComponent(token)}`);
  source.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='meter-state'){stores.clear();for(const id of m.ids)stores.set(id,levelStore({id,value:null}));onStores(new Map(stores))}else if(m.type==='meter-values')for(const c of m.changes)stores.get(c.id)?.observe(c.value)};source.onerror=clear;
 };document.addEventListener('visibilitychange',connect);connect();return()=>{document.removeEventListener('visibilitychange',connect);source?.close();clear()};
}
