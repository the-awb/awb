import {delayKnobIDs} from './delay-param-bindings.mjs';
// Borrow the parent connection and observation lease. Neither panel nor adapter owns DSP.
export function attachDelayParameters(frame,url,cell,{stores,connected,edit,onVisible=()=>{},onError=()=>{}}){
 const origin=new URL(url).origin,allowed=new Set(delayKnobIDs(cell));let session=null,closed=false,paint=0;
 const values=new Map(),metadata=new Map(),offs=[];
 const send=m=>{if(!closed&&session)frame.contentWindow?.postMessage({...m,session},origin)};
 const flush=()=>{paint=0;if(metadata.size)send({type:'awb:delay-param-meta',params:[...metadata.values()]});if(values.size)send({type:'awb:delay-param-values',values:[...values]});metadata.clear();values.clear()};
 const schedule=()=>{if(!paint)paint=requestAnimationFrame(flush)};
 const state=()=>send({type:'awb:delay-param-state',connected,params:[...allowed].flatMap(id=>{const s=stores.get(id);return s?[{metadata:s.get(),values:s.observed()}]:[]})});
 for(const id of allowed){const s=stores.get(id);if(!s)continue;offs.push(s.subscribe(()=>{metadata.set(id,s.get());schedule()}),s.subscribeValues(()=>{values.set(id,s.observed());schedule()}));}
 const receive=e=>{
  if(closed||e.source!==frame.contentWindow||e.origin!==origin)return;const m=e.data;
  if(m?.type==='awb:delay-param-hello'&&typeof m.session==='string'&&m.session.length<=64){session=m.session;state();return}
  if(!session||m?.session!==session)return;
  if(m.type==='awb:delay-param-visible'){onVisible(Array.isArray(m.ids)&&m.visible?m.ids.filter(id=>allowed.has(id)&&stores.has(id)):[]);return}
  if(m.type==='awb:delay-param-edit'){
   if(!connected||!allowed.has(m.id)||!stores.has(m.id)){send({type:'awb:delay-param-error',error:'Parameter owner unavailable'});return}
   try{edit(m.id,m.field,m.value,m.source??'')}catch(e){send({type:'awb:delay-param-error',error:e.message});onError(e.message)}
  }
  if(m.type==='awb:delay-param-detach'){session=null;onVisible([]);}
 };
 const request=()=>frame.contentWindow?.postMessage({type:'awb:delay-param-request'},origin);
 window.addEventListener('message',receive);frame.addEventListener('load',request);request();
 return {close(){if(closed)return;send({type:'awb:delay-param-state',connected:false,params:[]});closed=true;cancelAnimationFrame(paint);offs.forEach(off=>off());window.removeEventListener('message',receive);frame.removeEventListener('load',request);onVisible([])}};
}
