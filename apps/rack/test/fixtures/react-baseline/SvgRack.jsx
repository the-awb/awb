import React,{memo,useSyncExternalStore,useRef,useEffect,Profiler} from 'react';
import {positionOf,formatValue} from './model.mjs';
import {beginDrag,keyControl,wheelControl} from './interaction.mjs';
export const svgStats={rackRenders:0,controlRenders:0,commits:0,perControl:{}};
export function resetSvgStats(){svgStats.rackRenders=svgStats.controlRenders=svgStats.commits=0;svgStats.perControl={};}
const polar=(r,a,large=false)=>[(large?30:14)+r*Math.cos(a),(large?31:12)+r*Math.sin(a)];
const arc=(p,large=false)=>{const radius=large?18:9,a=polar(radius,Math.PI*.75,large),b=polar(radius,Math.PI*.75+Math.PI*1.5*Math.max(.0001,p),large);return `M ${a} A ${radius} ${radius} 0 ${p>2/3?1:0} 1 ${b}`;};
const Control=memo(function Control({store,cell,onSelect,offsetX=0,offsetY=0}){
  const d=cell.descriptor,value=useSyncExternalStore(f=>store.subscribe(d.id,f),()=>store.get(d.id)),ref=useRef(),drag=useRef();svgStats.controlRenders++;svgStats.perControl[d.id]=(svgStats.perControl[d.id]??0)+1;
  const large=cell.large===true,p=positionOf(value,d.region),end=polar(large?13:6.5,Math.PI*.75+Math.PI*1.5*p,large),cx=large?30:14,cy=large?31:12,bottom=large?62:21,length=large?54:18;
  useEffect(()=>{const el=ref.current,handler=e=>wheelControl(store,d,e);el.addEventListener('wheel',handler,{passive:false});return()=>el.removeEventListener('wheel',handler);},[store,d]);
  return <div className={`rack-control ${d.region.kind} ${large?'large-control':''}`} data-control={d.id} ref={ref} style={{left:cell.x-offsetX,top:cell.y-offsetY,width:cell.width,height:cell.height}}>
    <svg width={large?60:28} height={large?68:24} viewBox={large?'0 0 60 68':'0 0 28 24'} tabIndex="0" role="slider" aria-label={d.label} aria-valuemin={d.region.min} aria-valuemax={d.region.max} aria-valuenow={value}
      onFocus={()=>onSelect(d.id)} onKeyDown={e=>keyControl(store,d,e)} onDoubleClick={()=>store.set(d.id,d.region.min)}
      onPointerDown={e=>{onSelect(d.id);e.currentTarget.setPointerCapture(e.pointerId);drag.current=beginDrag(store,d,e);}}
      onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))drag.current?.(e);}}
      onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);drag.current=null;}}
      onPointerCancel={()=>{drag.current=null;}}>
      {d.region.widget==='knob'?<><path d={arc(1,large)} className="control-track"/><path d={arc(p,large)} className="control-active"/><line x1={cx} y1={cy} x2={end[0]} y2={end[1]} className="control-needle"/><circle cx={cx} cy={cy} r={large?2:1} className="control-center"/></>:<><line x1={cx} y1={large?8:3} x2={cx} y2={bottom} className="control-track"/><line x1={cx} y1={bottom-p*length} x2={cx} y2={bottom} className="control-active"/><line x1={cx-(large?11:6)} y1={bottom-p*length} x2={cx+(large?11:6)} y2={bottom-p*length} className="control-needle"/></>}
    </svg>
    <input className="control-value" type="number" aria-label={`${d.label} value`} min={d.region.min} max={d.region.max} step={d.region.step||'any'} value={formatValue(value)} onFocus={()=>onSelect(d.id)} onChange={e=>{if(e.target.value!=='')store.set(d.id,Number(e.target.value));}}/>
  </div>;
});
const ChannelRack=memo(function ChannelRack({store,rack,onSelect}){
  return <section className="channel-rack" data-channel-rack={rack.id} data-rack-scope={rack.scope} aria-label={`${rack.label} ${rack.scope==='global'?'shared levels':'send rack'}`} style={{left:rack.x,top:rack.y,width:rack.width,height:rack.height}}>
    {rack.headers.map((h,i)=><span key={`h${i}`} className={`rack-heading ${h.small?'destination':'region'}`} style={{left:h.x-rack.x,top:h.y-rack.y,width:h.width,height:h.height,lineHeight:`${h.height}px`,fontSize:h.fontSize,textAlign:h.align}}>{h.text}</span>)}
    {rack.rows.map((r,i)=><span key={`r${i}`} className={`rack-row-name ${r.small?'rack-type':''}`} style={{left:r.x-rack.x,top:r.y-rack.y,width:r.width,height:r.height,lineHeight:`${r.height}px`,fontSize:r.fontSize,textAlign:r.align}}>{r.text}</span>)}
    {rack.cells.map(cell=><Control key={cell.descriptor.id} store={store} cell={cell} offsetX={rack.x} offsetY={rack.y} onSelect={onSelect}/>)}
  </section>;
});
export const SvgRack=memo(function SvgRack({store,layout,onSelect}){
  svgStats.rackRenders++;
  return <Profiler id="svg-rack" onRender={()=>svgStats.commits++}><div className="rack-plane svg-plane" data-renderer="svg" style={{width:layout.width,height:layout.height}}>
    {layout.racks.map(rack=><ChannelRack key={rack.id} store={store} rack={rack} onSelect={onSelect}/>)}
  </div></Profiler>;
});
