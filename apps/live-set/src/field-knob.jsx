import {faderGain,faderPosition} from '../../rack/src/fader-scale.mjs';
import React,{memo,useEffect,useRef,useSyncExternalStore} from 'react';
import {arc,clamp,amountMinimum} from '../../param/src/model.mjs';
export const FieldKnob=memo(function FieldKnob({id,label,store,field='base',curve='linear',edit,disabled}){
 const p=useSyncExternalStore(store?.subscribe??(()=>()=>{}),store?.get??(()=>null)),root=useRef(),active=useRef(),pointer=useRef(),drag=useRef(),preview=useRef(null),wheelEdit=useRef();
 const audio=curve==='audio'&&field==='base';
 const lo=field==='amount'?amountMinimum(p??{}):p?.min??0,hi=field==='amount'?1:p?.max??1;
 useEffect(()=>{if(!store)return;let frame=0;
  preview.current=null;drag.current=null;
  const paint=()=>{frame=0;const meta=store.get(),value=preview.current??store.observed()?.[field==='amount'?1:0]??meta[field],position=audio?faderPosition(value,lo,hi):clamp((value-lo)/(hi-lo));active.current?.setAttribute('d',arc(field==='amount'&&lo<0?.5:0,position,31));pointer.current?.setAttribute('transform',`rotate(${-225+270*position} 50 50)`);root.current?.setAttribute('aria-valuenow',value);root.current?.setAttribute('title',`${label}: ${Number(value.toFixed(3))}`)};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint)};
  const off=store.subscribe(schedule),observe=store.subscribeValues(()=>{const value=store.observed()?.[field==='amount'?1:0];if(preview.current!==null&&Number.isFinite(value)&&Math.abs(value-preview.current)<1e-5)preview.current=null;schedule()});schedule();return()=>{cancelAnimationFrame(frame);off();observe()};
 },[store,field,lo,hi,label,audio]);
 const position=value=>audio?faderPosition(value,lo,hi):clamp((value-lo)/(hi-lo));
 const atPosition=value=>audio?faderGain(value,lo,hi):lo+clamp(value)*(hi-lo);
 const change=value=>{if(disabled||!store)return;preview.current=clamp(value,lo,hi);edit(id,field,preview.current)};
 wheelEdit.current=e=>{if(disabled||!store||!e.deltaY)return;e.preventDefault();const step=(e.deltaY<0?1:-1)*(e.shiftKey||e.ctrlKey?.001:.01);if(e.altKey&&field==='base'){const meta=store.get();edit(id,'amount',clamp(meta.amount+step,amountMinimum(meta),1))}else change(atPosition(position(preview.current??store.get()[field])+step))};
 useEffect(()=>{const node=root.current,handler=e=>wheelEdit.current(e);node?.addEventListener('wheel',handler,{passive:false});return()=>node?.removeEventListener('wheel',handler)},[store]);
 return <label className={`field-control ${p?'':'unavailable'}`} data-param={p?id:undefined} data-field-control={`${id}:${field}`}><span>{label}</span>{p?<svg ref={root} viewBox="0 0 100 100" data-pickup={p[field==='amount'?'pickupAmount':'pickupBase']==='idle'?undefined:p[field==='amount'?'pickupAmount':'pickupBase']} className="field-knob" role="slider" tabIndex={disabled?-1:0} aria-label={`${id} ${field}`} aria-disabled={disabled} aria-valuemin={lo} aria-valuemax={hi} aria-valuenow={p[field]}
 onPointerDown={e=>{if(disabled)return;drag.current={y:e.clientY,position:position(store.get()[field])};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drag.current)change(atPosition(drag.current.position+(drag.current.y-e.clientY)/150))}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}
 onKeyDown={e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();change(atPosition(position(store.get()[field])+(['ArrowUp','ArrowRight'].includes(e.key)?1:-1)*(e.shiftKey?.001:.01)))}}}>
 <path d={arc(0,1,31)} stroke="#293b43" strokeWidth="6"/><path ref={active} stroke={field==='amount'?'#78b4d4':'#b8d9d1'} strokeWidth="5"/><line ref={pointer} x1="50" y1="50" x2="73" y2="50" stroke="#b8d9d1" strokeWidth="3"/>
 </svg>:<span className="field-unbound" title={`${id}: not implemented in the delay host`}>—</span>}</label>;
});
