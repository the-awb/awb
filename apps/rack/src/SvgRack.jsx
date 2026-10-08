import React,{memo,useState,useMemo,useLayoutEffect,useRef,useEffect,useSyncExternalStore} from 'react';
import {positionOf,formatValue} from './model.mjs';
import {MixControlFields} from './Mixes.jsx';
import {beginDrag,keyControl,wheelControl} from './interaction.mjs';
export const svgStats={rackRenders:0,controlRenders:0,commits:0,perControl:{},paintFrames:0,valueUpdates:0,attributeWrites:0,perControlUpdates:{}};
export function resetSvgStats(){for(const k of Object.keys(svgStats))svgStats[k]=k==='perControl'||k==='perControlUpdates'?{}:0;}
const polar=(r,a,large=false)=>[(large?30:14)+r*Math.cos(a),(large?31:12)+r*Math.sin(a)];
const arc=(p,large=false)=>{const radius=large?18:9,a=polar(radius,Math.PI*.75,large),b=polar(radius,Math.PI*.75+Math.PI*1.5*Math.max(.0001,p),large);return `M ${a} A ${radius} ${radius} 0 ${p>2/3?1:0} 1 ${b}`;};
// One frame queue for the rack; React owns structure, refs own value attributes.
function paintQueue(){const dirty=new Set();let frame=null;return {
 request(paint){dirty.add(paint);if(frame===null)frame=requestAnimationFrame(()=>{frame=null;svgStats.paintFrames++;const pending=[...dirty];dirty.clear();for(const paint of pending)paint();});},
 remove(paint){dirty.delete(paint);if(!dirty.size&&frame!==null){cancelAnimationFrame(frame);frame=null;}},
 dispose(){if(frame!==null)cancelAnimationFrame(frame);frame=null;dirty.clear();}
};}
const Control=memo(function Control({store,cell,onSelect,queue,captureSelection,layout,offsetX=0,offsetY=0}){
 const d=cell.descriptor,ref=useRef(),svg=useRef(),active=useRef(),needle=useRef(),input=useRef(),readout=useRef(),drag=useRef(),[editing,setEditing]=useState(false);svgStats.controlRenders++;svgStats.perControl[d.id]=(svgStats.perControl[d.id]??0)+1;
 const showValue=!layout.hideValues,horizontal=cell.horizontal===true,large=cell.large===true,cx=large?30:14,cy=large?31:12,bottom=large?62:21,length=large?54:18;
 useLayoutEffect(()=>{
  let previous;
  const attribute=(el,name,value)=>{value=String(value);if(el.getAttribute(name)!==value){el.setAttribute(name,value);svgStats.attributeWrites++;}};
  const paint=()=>{const value=store.get(d.id);if(value===previous)return;previous=value;const p=positionOf(value,d.region);
   if(d.region.widget==='knob'){const end=polar(large?13:6.5,Math.PI*.75+Math.PI*1.5*p,large);attribute(active.current,'d',arc(p,large));attribute(needle.current,'x2',end[0]);attribute(needle.current,'y2',end[1]);}
   else if(horizontal){const x=4+p*(cell.width-8);attribute(active.current,'x1',4);attribute(active.current,'x2',x);attribute(needle.current,'x1',x);attribute(needle.current,'x2',x);}
   else{const y=bottom-p*length;attribute(active.current,'y1',y);attribute(active.current,'y2',bottom);attribute(needle.current,'y1',y);attribute(needle.current,'y2',y);}
   attribute(svg.current,'aria-valuenow',value);const formatted=formatValue(value);if(showValue&&readout.current.textContent!==formatted){if(readout.current.firstChild)readout.current.firstChild.nodeValue=formatted;else readout.current.textContent=formatted;svgStats.attributeWrites++;}if(document.activeElement===input.current&&input.current.value!==formatted)input.current.value=formatted;
   svgStats.valueUpdates++;svgStats.perControlUpdates[d.id]=(svgStats.perControlUpdates[d.id]??0)+1;
  };
  paint();const unsubscribe=store.subscribe(d.id,()=>queue.request(paint));return()=>{unsubscribe();queue.remove(paint);};
 },[store,d,large,horizontal,cell.width,queue,showValue]);
 useLayoutEffect(()=>{const paint=()=>{const capturing=!!captureSelection?.active,selected=capturing&&captureSelection.ids.has(d.id);ref.current.toggleAttribute('data-capture-mode',capturing);ref.current.toggleAttribute('data-capture-selected',selected);svg.current.setAttribute('role',capturing?'button':'slider');svg.current.setAttribute('aria-label',capturing?`${d.label}: ${selected?'selected':'not selected'} for capture`:d.label);if(capturing)svg.current.setAttribute('aria-pressed',String(selected));else svg.current.removeAttribute('aria-pressed');input.current.disabled=capturing;readout.current.tabIndex=capturing||!showValue?-1:0;svg.current.tabIndex=store.mixDraft?-1:0;if(capturing&&document.activeElement===input.current)input.current.blur();};paint();return captureSelection?.subscribeControl(d.id,paint);},[captureSelection,d,store,showValue]);
 useLayoutEffect(()=>{if(editing){input.current.value=formatValue(store.get(d.id));input.current.focus();input.current.select();}},[editing,store,d]);
 useEffect(()=>{const el=ref.current,handler=e=>{if(captureSelection?.active||store.mixDraft){e.preventDefault();return;}wheelControl(store,d,e);};el.addEventListener('wheel',handler,{passive:false});return()=>el.removeEventListener('wheel',handler);},[store,d,captureSelection]);
 return <div className={`rack-control ${d.region.kind} ${large?'large-control':''}`} data-control={d.id} ref={ref} onPointerDownCapture={e=>{if(captureSelection?.active){e.preventDefault();e.stopPropagation();captureSelection.toggle(d.id);svg.current.focus();}}} onClickCapture={e=>{if(captureSelection?.active){e.preventDefault();e.stopPropagation();if(e.detail===0)captureSelection.toggle(d.id);}}} style={{left:cell.x-offsetX,top:cell.y-offsetY,width:cell.width,height:cell.height}}>
  <svg ref={svg} style={horizontal?{height:24}:layout.hideValues?{width:Math.min(cell.width-2,cell.height*28/24),height:cell.height}:undefined} width={horizontal||large?cell.width:28} height={large?68:24} viewBox={horizontal?`0 0 ${cell.width} 24`:large?'0 0 60 68':'0 0 28 24'} tabIndex="0" role="slider" aria-label={d.label} aria-valuemin={d.region.min} aria-valuemax={d.region.max}
   onFocus={()=>onSelect(d.id)} onKeyDown={e=>{if(captureSelection?.active){e.preventDefault();if(e.key==='Enter'||e.key===' ')captureSelection.toggle(d.id);return;}keyControl(store,d,e);}} onDoubleClick={()=>{if(!captureSelection?.active)store.set(d.id,d.region.min);}}
   onPointerDown={e=>{onSelect(d.id);e.currentTarget.setPointerCapture(e.pointerId);drag.current=beginDrag(store,d,e);}}
   onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))drag.current?.(e);}}
   onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);drag.current=null;}}
   onPointerCancel={()=>{drag.current=null;}}>
   {horizontal?<><line x1="4" x2={cell.width-4} y1="12" y2="12" className="control-track"/><line ref={active} y1="12" y2="12" className="control-active"/><line ref={needle} y1="6" y2="18" className="control-needle"/></>:d.region.widget==='knob'?<><path d={arc(1,large)} className="control-track"/><path ref={active} className="control-active"/><line ref={needle} x1={cx} y1={cy} className="control-needle"/><circle cx={cx} cy={cy} r={large?2:1} className="control-center"/></>:<><line x1={cx} y1={large?8:3} x2={cx} y2={bottom} className="control-track"/><line ref={active} x1={cx} x2={cx} className="control-active"/><line ref={needle} x1={cx-(large?11:6)} x2={cx+(large?11:6)} className="control-needle"/></>}
   {d.region.widget==='fader'&&Number.isFinite(d.region.unity)&&<line className="control-unity" aria-label="Unity · 0 dB" x1={horizontal?4+positionOf(d.region.unity,d.region)*(cell.width-8):cx-(large?14:8)} x2={horizontal?4+positionOf(d.region.unity,d.region)*(cell.width-8):cx+(large?14:8)} y1={horizontal?4:bottom-positionOf(d.region.unity,d.region)*length} y2={horizontal?20:bottom-positionOf(d.region.unity,d.region)*length} stroke="#b8a47b" strokeWidth="1"><title>Unity · 0 dB</title></line>}
  </svg>
  <span ref={readout} className="control-readout" style={{display:editing||!showValue?'none':undefined}} tabIndex={showValue?0:-1} role="button" aria-label={`${d.label} edit value`} onFocus={()=>{if(!captureSelection?.active)setEditing(true);}} onClick={()=>{if(!captureSelection?.active)setEditing(true);}} onKeyDown={e=>{if(!captureSelection?.active&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setEditing(true);}}}/>
  <input ref={input} className="control-value" type="number" style={{display:editing&&showValue?undefined:'none'}} aria-label={`${d.label} value`} min={d.region.min} max={d.region.max} step={d.region.step||'any'} onFocus={()=>onSelect(d.id)} onBlur={()=>setEditing(false)} onChange={e=>{if(!captureSelection?.active&&e.target.value!=='')store.set(d.id,Number(e.target.value));}}/>
 {store.mixDraft&&<MixControlFields session={store.mixDraft} cell={cell} layout={layout} onSelect={onSelect}/>}
 </div>;
});
const ChannelState=memo(function ChannelState({store,cell,rack,captureSelection}){
 const id=cell.descriptor.id,subscribe=React.useCallback(f=>store.subscribe(id,f),[store,id]),get=React.useCallback(()=>store.get(id),[store,id]);
 const ref=useRef();useLayoutEffect(()=>{const paint=()=>{ref.current?.toggleAttribute('data-capture-selected',!!captureSelection?.active&&captureSelection.ids.has(id))};paint();return captureSelection?.subscribeControl(id,paint)},[captureSelection,id]);const value=useSyncExternalStore(subscribe,get),capturing=useSyncExternalStore(captureSelection?.subscribe??(()=>()=>{}),()=>!!captureSelection?.active);
 return <button ref={ref} className="state-button" data-control={id} title={cell.descriptor.label} aria-label={cell.descriptor.label} aria-pressed={!!value} style={{position:'absolute',left:cell.x-rack.x,top:cell.y-rack.y,width:cell.width,height:20}} onClick={()=>capturing?captureSelection.toggle(id):store.set(id,value?0:1)}>{cell.descriptor.destination==='mute'?'M':'S'}</button>;
});
const ChannelRack=memo(function ChannelRack({store,rack,onSelect,queue,captureSelection,layout}){
 return <section className="channel-rack" data-channel-rack={rack.id} data-rack-scope={rack.scope} aria-label={`${rack.label} ${rack.scope==='global'?'shared levels':'send rack'}`} style={{left:rack.x,top:rack.y,width:rack.width,height:rack.height}}>
  {rack.headers.map((h,i)=><span key={`h${i}`} className={`rack-heading ${h.small?'destination':'region'}`} style={{left:h.x-rack.x,top:h.y-rack.y,width:h.width,height:h.height,lineHeight:`${h.height}px`,fontSize:h.fontSize,textAlign:h.align}}>{h.text}</span>)}
  {rack.rows.map((r,i)=><span key={`r${i}`} className={`rack-row-name ${r.small?'rack-type':''}`} style={{left:r.x-rack.x,top:r.y-rack.y,width:r.width,height:r.height,lineHeight:`${r.height}px`,fontSize:r.fontSize,textAlign:r.align}}>{r.text}</span>)}
  {rack.cells.map(cell=>cell.descriptor.region.kind==='channel-state'&&!store.mixDraft?<ChannelState key={cell.descriptor.id} {...{store,cell,rack,captureSelection}}/>:<Control key={cell.descriptor.id} store={store} cell={cell} offsetX={rack.x} offsetY={rack.y} onSelect={onSelect} queue={queue} captureSelection={captureSelection} layout={layout}/>)}
 </section>;
});
export const SvgRack=memo(function SvgRack({store,layout,onSelect,captureSelection}){
 svgStats.rackRenders++;const queue=useMemo(()=>paintQueue(),[]);useEffect(()=>()=>queue.dispose(),[queue]);
 return <div className={`rack-plane svg-plane ${store.mixDraft?'mix-edit-plane':''}`} data-renderer="svg" style={{width:layout.width,height:layout.height,'--rack-row-height':`${layout.rowHeight??24}px`}}>{layout.racks.map(rack=><ChannelRack key={rack.id} store={store} rack={rack} onSelect={onSelect} queue={queue} captureSelection={captureSelection} layout={layout}/>)}</div>;
});
