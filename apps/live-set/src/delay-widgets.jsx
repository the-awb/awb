import React,{useEffect,useRef} from 'react';import {createRoot} from 'react-dom/client';
import {AWParamKnob} from '../../param/src/widgets.jsx';import {createStore} from '../../param/src/model.mjs';
import {delayKnobID} from './delay-param-bindings.mjs';import './delay-widgets.css';
// Loaded only by a host-bound tape view. Reuse the shared primitive and its measured-value store.
const host=new URLSearchParams(location.search).get('hostOrigin');
if(host&&window.parent!==window&&/^http:\/\/127\.0\.0\.1:\d+$/.test(host)){
 const session=crypto.randomUUID(),stores=new Map(),mounts=new Map();let connected=false,closed=false;
 const send=m=>{if(!closed)parent.postMessage({...m,session},host)};
 function Widget({id,label}){
  const out=useRef(),store=stores.get(id);
  useEffect(()=>{if(!store)return;const paint=()=>{if(out.current){const v=store.observed()?.[2];out.current.textContent=Number.isFinite(v)?Math.round(v*100)+'%':'—'}};paint();return store.subscribeValues(paint)},[store]);
  return <><span className="knob-label">{label}</span>{store?<fieldset disabled={!connected} onKeyDownCapture={e=>{if(!connected){e.preventDefault();e.stopPropagation()}}}><AWParamKnob store={store} compact disabled={!connected} edit={(id,field,value,source)=>send({type:'awb:delay-param-edit',id,field,value,source})}/></fieldset>:<span className="unbound-param" title={id}>Unbound</span>}<output ref={out} title="Measured effective value">—</output></>;
 }
 const paint=()=>{for(const [el,m]of mounts){const id=delayKnobID(el.dataset.paramCell,el.dataset.paramField,el.dataset.paramHead);m.id=id;m.root.render(<Widget key={id} id={id} label={m.label}/>);}};
 const visible=()=>send({type:'awb:delay-param-visible',visible:!document.hidden,ids:[...new Set([...mounts.values()].map(m=>m.id).filter(Boolean))]});
 const scan=()=>{let changed=false;for(const el of document.querySelectorAll('.knob-wrap[data-param-field]')){if(mounts.has(el))continue;const label=el.querySelector('.knob-label')?.textContent??'';el.dataset.awparamGui='true';el.replaceChildren();mounts.set(el,{root:createRoot(el),label});changed=true;}for(const [el,m]of mounts)if(!el.isConnected){m.root.unmount();mounts.delete(el);changed=true;}if(changed){paint();visible();}};
 const receive=e=>{if(e.source!==parent||e.origin!==host)return;const m=e.data;
  if(m?.type==='awb:delay-param-request'){send({type:'awb:delay-param-hello'});return}
  if(m?.session!==session)return;
  if(m.type==='awb:delay-param-state'){
   document.body.dataset.paramConnected=String(m.connected);
   connected=m.connected;const active=new Set(m.params.map(p=>p.metadata.id));for(const id of stores.keys())if(!active.has(id)){stores.get(id).observe(null);stores.delete(id)}
   for(const p of m.params){let store=stores.get(p.metadata.id);if(store)store.patch(p.metadata);else stores.set(p.metadata.id,store=createStore(p.metadata));store.observe(p.values)}paint();visible();
  }else if(m.type==='awb:delay-param-meta'){for(const p of m.params)stores.get(p.id)?.patch(p)}
  else if(m.type==='awb:delay-param-values'){for(const [id,values]of m.values)stores.get(id)?.observe(values)}
  else if(m.type==='awb:delay-param-error'){document.querySelector('#error').textContent=m.error;send({type:'awb:delay-param-hello'})}
 };
 window.addEventListener('message',receive);document.addEventListener('visibilitychange',visible);
 const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes')){paint();visible();}else scan()});
 observer.observe(document.querySelector('main'),{childList:true,subtree:true,attributes:true,attributeFilter:['data-param-cell']});scan();send({type:'awb:delay-param-hello'});
 const close=()=>{if(closed)return;send({type:'awb:delay-param-detach'});closed=true;observer.disconnect();window.removeEventListener('message',receive);document.removeEventListener('visibilitychange',visible);for(const m of mounts.values())m.root.unmount();mounts.clear();stores.clear()};window.addEventListener('pagehide',close,{once:true});
}
