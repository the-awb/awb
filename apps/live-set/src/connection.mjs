import {createStore,readBatch} from '../../param/src/model.mjs';
export function connectParameters({onStores=()=>{},onStatus=()=>{},hz=15}={}){
 let socket,epoch,generation=0,sequence=0,closed=false,connected=false,timer,visible=[],stores=[],pending=new Set();const queued=new Map();
 const send=m=>{if(socket?.readyState===1)socket.send(JSON.stringify(m))};
 const visibility=()=>send({type:'visible',visible:connected&&!document.hidden,hz,ids:visible});
 const unavailable=message=>{connected=false;queued.clear();pending.clear();stores.forEach(s=>{s.observe(null);s.patch({pickupBase:'idle',pickupAmount:'idle'})});onStatus(false,message)};
 const applyDelta=d=>{const s=stores.find(s=>s.get().id===d.id);if(!s)return;if(d.source)s.patch({routes:s.get().routes.map(r=>r.id!==d.source?r:d.field.startsWith('writer:')?{...r,controls:r.controls.map(c=>c.id===d.field.slice(7)?{...c,value:d.value}:c)}:{...r,[d.field==='sourceAmount'?'amount':'curve']:d.value})});else s.patch(d.metadata??{[{baseTarget:'base',amountTarget:'amount',modCurve:'modCurve',pickupBase:'pickupBase',pickupAmount:'pickupAmount'}[d.field]]:d.value})};
 const ready=fetch('/api/state').then(r=>r.json()).then(({token})=>{if(closed)return;socket=new WebSocket(`ws://${location.host}/ws?token=${token}`);socket.binaryType='arraybuffer';socket.onopen=visibility;socket.onclose=()=>{if(!closed)unavailable('Disconnected · reload to rebind')};socket.onerror=()=>onStatus(false,'Parameter connection failed');
 socket.onmessage=e=>{try{if(typeof e.data!=='string'){const b=readBatch(e.data);if(b.generation!==generation||b.sequence<=sequence)return;sequence=b.sequence;const changes=new Map();for(const [index,value]of b.fields){const i=Math.floor(index/3),s=stores[i];if(!s||!Number.isFinite(value))continue;if(!changes.has(i))changes.set(i,s.observed()?.slice()??[NaN,NaN,NaN]);changes.get(i)[index%3]=value}for(const [i,v]of changes)stores[i].observe(v);return}
 const m=JSON.parse(e.data);if(m.type==='state'){epoch=m.state.epoch;generation=sequence=0;queued.clear();pending.clear();stores=m.state.params.map(createStore);connected=m.state.connected;onStores(stores);onStatus(connected,m.state.error);visibility()}
 else if(m.type==='generation'){generation=m.generation;sequence=0;stores.forEach(s=>{s.observe(null);s.patch({pickupBase:'idle',pickupAmount:'idle'})})}
 else if(m.type==='status'){if(!m.connected)unavailable(m.error);else{connected=true;onStatus(true,null)}}
 else if(m.type==='delta')applyDelta(m.delta);
 else if(m.type==='routes')stores.find(s=>s.get().id===m.id)?.patch({routes:m.routes});
 else if(m.type==='result'){pending.delete(m.request);if(!m.ok){onStatus(connected,m.error);send({type:'sync'})}}
 }catch(e){unavailable(e.message)}};return token}).catch(e=>unavailable(e.message));
 document.addEventListener('visibilitychange',visibility);
 return {ready,setVisible(ids){visible=[...new Set(ids)];visibility()},setRate(rate){if(![8,15].includes(rate))throw Error('Expected 8/15 Hz');hz=rate;visibility()},
 edit(id,field,value,source='',dur,curve){if(!connected)throw Error('Control owner unavailable');const s=stores.find(s=>s.get().id===id);if(!s)throw Error('Unknown bound control');if(field!=='polarity')applyDelta({id,field:{base:'baseTarget',amount:'amountTarget'}[field]??field,value,source});queued.set(`${id}:${field}:${source}`,{type:'edit',epoch,id,field,value,source,dur,curve});if(!timer)timer=setTimeout(()=>{timer=null;if(!connected||socket?.readyState!==1){queued.clear();return}for(const m of queued.values()){m.request=crypto.randomUUID();pending.add(m.request);send(m)}queued.clear()},16)},
 close(){closed=true;clearTimeout(timer);queued.clear();pending.clear();document.removeEventListener('visibilitychange',visibility);socket?.close();stores.forEach(s=>{s.observe(null);s.patch({pickupBase:'idle',pickupAmount:'idle'})})},stores:()=>stores};
}
