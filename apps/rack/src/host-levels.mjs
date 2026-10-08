// Embedded surface exposes only the existing global fader controls to its host.
// The rack connection remains the single OSC owner; no second SC bridge is opened.
export function attachHostLevels(store,transport,hostOrigin){
 if(!hostOrigin||window.parent===window)return()=>{};
 const target=new URL(hostOrigin);if(target.protocol!=='http:'||target.hostname!=='127.0.0.1')throw Error('Invalid host origin');
 const post=m=>window.parent.postMessage(m,target.origin);
 const state=()=>post({type:'awb:rack-levels',connected:transport.value.connected,armed:transport.value.armed,controls:store.controls.filter(d=>d.region.scope==='global').map(d=>({id:d.id,min:d.region.min,max:d.region.max,step:d.region.step,value:store.get(d.id)}))});
 const values=new Map();let timer;
 const off=store.subscribeAll(e=>{if(e.kind==='value'&&e.id.startsWith('global/')){values.set(e.id,e.value);if(!timer)timer=setTimeout(()=>{timer=null;post({type:'awb:rack-level-delta',changes:[...values].map(([id,value])=>({id,value}))});values.clear()},16)}else if(e.kind==='structure')state()});
 const status=()=>state();transport.listeners.add(status);
 const receive=e=>{if(e.source!==window.parent||e.origin!==target.origin)return;const m=e.data;if(m?.type==='awb:rack-levels-request')state();
  if(m?.type==='awb:rack-level-edit'&&transport.value.connected&&transport.value.armed){const d=store.byID.get(m.id);if(d?.region.scope==='global'&&Number.isFinite(m.value))store.set(m.id,m.value);}
 };window.addEventListener('message',receive);state();return()=>{off();transport.listeners.delete(status);window.removeEventListener('message',receive);clearTimeout(timer)};
}
