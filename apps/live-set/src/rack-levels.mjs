export function levelStore(control){
 let value=control.value;const listeners=new Set();return {...control,get:()=>value,subscribe:f=>{listeners.add(f);return()=>listeners.delete(f)},observe:v=>{if(value===v)return;value=v;listeners.forEach(f=>f())}};
}
// Source and origin are checked against the actual borrowed rack iframe.
export function receiveRackLevels(frame,url,{onControls,onStatus}){
 const origin=new URL(url).origin,stores=new Map();
 const request=()=>frame.contentWindow?.postMessage({type:'awb:rack-levels-request'},origin);
 const receive=e=>{if(e.source!==frame.contentWindow||e.origin!==origin)return;const m=e.data;
  if(m?.type==='awb:rack-levels'){let changed=false;for(const c of m.controls){const old=stores.get(c.id);if(!old||old.min!==c.min||old.max!==c.max||old.step!==c.step){stores.set(c.id,levelStore(c));changed=true}else old.observe(c.value)}for(const id of stores.keys())if(!m.controls.some(c=>c.id===id)){stores.delete(id);changed=true}if(changed)onControls(new Map(stores));onStatus(m.connected&&m.armed);}
  else if(m?.type==='awb:rack-level-delta')for(const c of m.changes)stores.get(c.id)?.observe(c.value);
 };window.addEventListener('message',receive);frame.addEventListener('load',request);request();
 return {edit:(id,value)=>{stores.get(id)?.observe(value);frame.contentWindow?.postMessage({type:'awb:rack-level-edit',id,value},origin)},close(){window.removeEventListener('message',receive);frame.removeEventListener('load',request)}};
}
