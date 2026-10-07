import React,{useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import {arc,clamp,normalized,nativeValue,shape,displayOrigin,amountPosition} from './model.mjs';
const angle=v=>Math.round(v*10000)/10000;
const format=n=>Number.isFinite(n)?Number(n.toPrecision(5)).toString():'—';
// One rAF queue for local edits and observation. Work is per affected primitive.
const paints=new Set();let frame=0;function schedule(fn){paints.add(fn);if(!frame)frame=requestAnimationFrame(()=>{frame=0;const next=[...paints];paints.clear();next.forEach(fn=>fn())})}
function NumberEdit({label,value,onCommit,min,max}) {
  const [draft,setDraft]=useState(format(value)),focused=useRef(false),cancelBlur=useRef(false);useEffect(()=>{if(!focused.current)setDraft(format(value))},[value]);
  const commit=()=>{const n=Number(draft);if(draft.trim()&&Number.isFinite(n)&&n>=min&&n<=max)onCommit(n);else setDraft(format(value))};
  return <label className="number">{label}<input type="text" inputMode="decimal" aria-label={label} value={draft} onChange={e=>setDraft(e.target.value)} onFocus={()=>focused.current=true} onBlur={()=>{focused.current=false;if(cancelBlur.current){cancelBlur.current=false}else commit()}} onKeyDown={e=>{if(e.key==='Enter'){e.currentTarget.blur()}if(e.key==='Escape'){cancelBlur.current=true;setDraft(format(value));e.currentTarget.blur()}}}/></label>;
}
function geometry(store,preview){const p=store.get(),o=store.observed();return {origin:displayOrigin(p),base:angle(normalized(preview.current.base??o?.[0]??p.base,p)),amount:preview.current.amount??o?.[1]??p.amount,out:o?angle(normalized(o[2],p)):null,effective:o?.[2],measuredAmount:o?.[1],overflow:Math.abs(preview.current.amount??o?.[1]??p.amount)>1}}
const artwork=new Map();
function staticArtwork(size){const pixels=Math.max(1,Math.round(size*devicePixelRatio));if(!artwork.has(pixels)){const c=document.createElement('canvas');c.width=c.height=pixels;const ctx=c.getContext('2d');ctx.scale(pixels/100,pixels/100);ctx.lineCap='round';ctx.strokeStyle='#28383d';ctx.lineWidth=7;ctx.beginPath();ctx.arc(50,50,31,-225*Math.PI/180,45*Math.PI/180);ctx.stroke();if(artwork.size>=16)artwork.delete(artwork.keys().next().value);artwork.set(pixels,c)}return artwork.get(pixels)}
function drawCanvas(ctx,g,x,y,size,cue){
  ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);ctx.lineCap='round';
  const line=(a,b,r,color,width,alpha=1)=>{if(Math.abs(a-b)<.0001)return;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.arc(50,50,r,(-225+270*a)*Math.PI/180,(-225+270*b)*Math.PI/180,b<a);ctx.stroke()};
  ctx.drawImage(staticArtwork(size),0,0,100,100);line(g.origin,g.base,31,'#e8eeee',5);
  if(g.out!==null){line(g.origin,g.out,42,'#59dcc2',3,cue==='opacity'?.15+.85*g.out:1);const a=(-225+270*g.out)*Math.PI/180;ctx.globalAlpha=1;ctx.strokeStyle='#59dcc2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(50+40*Math.cos(a),50+40*Math.sin(a));ctx.lineTo(50+44*Math.cos(a),50+44*Math.sin(a));ctx.stroke()}
  ctx.globalAlpha=1;ctx.fillStyle=g.overflow?'#ffa774':'#71868d';if(g.overflow){ctx.beginPath();ctx.arc(50,7,2,0,Math.PI*2);ctx.fill()}
  const m=(-225+270*amountPosition(g.amount))*Math.PI/180;ctx.beginPath();ctx.strokeStyle=g.amount<0?'#ffa774':'#70b8ff';ctx.lineWidth=4*100/size;ctx.moveTo(50+25*Math.cos(m),50+25*Math.sin(m));ctx.lineTo(50+34*Math.cos(m),50+34*Math.sin(m));ctx.stroke();
  const a=(-225+270*g.base)*Math.PI/180;ctx.beginPath();ctx.strokeStyle='#e8eeee';ctx.lineWidth=2;ctx.moveTo(50,50);ctx.lineTo(50+23*Math.cos(a),50+23*Math.sin(a));ctx.stroke();ctx.restore();
}
export function AWParamKnob({store,edit,renderer='svg',cue='arc',registerCanvas,onProcess}) {
  const p=useSyncExternalStore(store.subscribe,store.get),preview=useRef({}),svg=useRef(),actual=useRef(),amountText=useRef(),opener=useRef(),panel=useRef(),drag=useRef(),[expanded,setExpanded]=useState(false);
  const paint=useRef();paint.current=()=>{
    const g=geometry(store,preview),root=svg.current;
    if(renderer==='svg'&&root){const put=(selector,attrs)=>{const el=root.querySelector(selector);for(const [key,value]of Object.entries(attrs))if(el.getAttribute(key)!==String(value))el.setAttribute(key,value)};
      put('.base',{d:arc(g.origin,g.base,31)});put('.amount-marker',{transform:`rotate(${-225+270*amountPosition(g.amount)} 50 50)`,stroke:g.amount<0?'#ffa774':'#70b8ff'});
      put('.output',{d:g.out===null?'':arc(g.origin,g.out,42),opacity:cue==='opacity'&&g.out!==null?.15+.85*g.out:1});
      put('.output-tip',{visibility:g.out===null?'hidden':'visible',transform:`rotate(${-225+270*(g.out??0)} 50 50)`});
      put('.pointer',{transform:`rotate(${-225+270*g.base} 50 50)`});put('.overflow',{visibility:g.overflow?'visible':'hidden'});
    }
    if(actual.current&&actual.current.textContent!==format(g.effective))actual.current.textContent=format(g.effective);
    if(amountText.current&&amountText.current.textContent!==format(g.measuredAmount))amountText.current.textContent=format(g.measuredAmount);
  };
  const redraw=useRef(()=>paint.current());
  useEffect(()=>{const off=store.subscribeValues(()=>{const o=store.observed();for(const [key,index]of [['base',0],['amount',1]])if(o&&preview.current[key]!==undefined&&Math.abs(preview.current[key]-o[index])<Math.max(1e-6,Math.abs(o[index])*1e-6))delete preview.current[key];schedule(redraw.current)});schedule(redraw.current);return()=>{off();paints.delete(redraw.current)}},[store,renderer,cue]);
  useEffect(()=>{schedule(redraw.current)},[p]);
  useEffect(()=>{if(expanded)panel.current?.querySelector('input')?.focus()},[expanded]);
  useLayoutEffect(()=>registerCanvas?.(p.id,{element:svg.current,store,preview}),[registerCanvas,p.id,renderer]);
  const change=(field,value,source)=>{if(!source&&['base','amount'].includes(field))preview.current[field]=value;edit(p.id,field,value,source);schedule(redraw.current)};
  const close=()=>{setExpanded(false);opener.current?.focus()};
  return <section className="knob-card" data-param={p.id}><h2>{p.id}</h2><svg ref={svg} viewBox="0 0 100 100" className={'knob '+(renderer==='canvas'?'canvas-hit':'')} role="slider" tabIndex={0} aria-label={`${p.id} base`} aria-valuemin={p.min} aria-valuemax={p.max} aria-valuenow={p.base}
    onPointerDown={e=>{const box=e.currentTarget.getBoundingClientRect(),x=(e.clientX-box.left)/box.width*100-50,y=(e.clientY-box.top)/box.height*100-50,radius=Math.hypot(x,y),a=(-225+270*amountPosition(geometry(store,preview).amount))*Math.PI/180,marker=Math.hypot(x-29.5*Math.cos(a),y-29.5*Math.sin(a))<8;if(radius>=38)return;const field=marker?'amount':'base';drag.current={y:e.clientY,field,start:field==='amount'?geometry(store,preview).amount:normalized(p.base,p)};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drag.current){const d=drag.current;change(d.field,d.field==='amount'?clamp(d.start+(d.y-e.clientY)/100,-8,8):nativeValue(d.start+(d.y-e.clientY)/150,p))}}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}
    onKeyDown={e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();change('base',nativeValue(normalized(p.base,p)+(['ArrowUp','ArrowRight'].includes(e.key)?1:-1)*(e.shiftKey?.001:.01),p))}}}>
    <path d={arc(0,1,31)} stroke="#28383d" strokeWidth="7"/><path className="base" stroke="#e8eeee" strokeWidth="5"/><line className="amount-marker" x1="75" y1="50" x2="84" y2="50" stroke="#70b8ff" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke"><title>Modulation amount · drag marker</title></line><path className="output" stroke="#59dcc2" strokeWidth="3"><title>Sampled control-bus output · read only</title></path><line className="output-tip" strokeLinecap="round" x1="90" y1="50" x2="94" y2="50" stroke="#59dcc2" strokeWidth="2"/><line className="pointer" strokeLinecap="round" x1="50" y1="50" x2="73" y2="50" stroke="#e8eeee" strokeWidth="2"/><circle className="overflow" cx="50" cy="7" r="2" fill="#ffa774"/>
  </svg><div className="scale" aria-label={`${p.id} normalized scale`}><span>{p.polarity==='bipolar'?'−1':'0'}</span><span>{p.polarity==='bipolar'?'0':'0.5'}</span><span>+1</span></div><div className="observed">Output <strong ref={actual}>—</strong> · amount <span ref={amountText}>—</span></div>
    <div className="fields"><NumberEdit label={`${p.id} Base`} value={p.base} min={p.min} max={p.max} onCommit={v=>change('base',v)}/><NumberEdit label={`${p.id} Amount`} value={p.amount} min={-8} max={8} onCommit={v=>change('amount',v)}/></div>
    <label className="polarity">Polarity<select aria-label={`${p.id} polarity`} value={p.polarity??'unipolar'} onChange={e=>change('polarity',e.target.value)}><option value="unipolar">0 … 1</option><option value="bipolar">−1 … +1</option></select></label>
    <label className="amount-slider">Amount<input type="range" min="-8" max="8" step="0.01" value={p.amount} onChange={e=>change('amount',+e.target.value)}/></label>
    <button ref={opener} aria-expanded={expanded} onClick={()=>expanded?close():setExpanded(true)}>Sources · {p.routes.length}</button>
    {expanded&&<div ref={panel} className="sources" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close()}}}>
      <NumberEdit label="Overall curve" value={p.modCurve} min={-16} max={16} onCommit={v=>change('modCurve',v)}/>
      {p.routes.map(r=><div className="source" key={r.id}><b>{r.label}</b><small>{r.kind} · bus {r.bus<0?'—':r.bus} · {r.producer<0?'producer unknown':`producer ${r.producer}`} · {r.status}</small>{r.producer>=0&&<button disabled={!onProcess} title={onProcess?'Select producing process':'Parent Tool can attach NodeManager navigation'} onClick={()=>onProcess?.({paramID:p.id,producer:r.producer,node:r.node})}>Process {r.producer}</button>}{r.error&&<small>{r.error}</small>}
        {r.editable&&r.status==='connected'?<><div className="fields"><NumberEdit label="Source amount" value={r.amount} min={-8} max={8} onCommit={v=>change('sourceAmount',v,r.id)}/><NumberEdit label="Source curve" value={r.curve} min={-16} max={16} onCommit={v=>change('sourceCurve',v,r.id)}/></div><svg className="curve" viewBox="0 0 100 24"><path d={Array.from({length:33},(_,i)=>`${i?'L':'M'} ${i/32*100} ${22-shape(i/32,r.curve)*20}`).join(' ')} stroke="#59dcc2"/></svg></>:<>{(r.controls??[]).map(c=><NumberEdit key={c.id} label={c.id} value={c.value} min={c.min} max={c.max} onCommit={v=>change(`writer:${c.id}`,v,r.id)}/>)}{!r.controls?.length&&<small>{r.kind==='custom'?'Custom writer · no editable controls declared':'Editing unavailable until connected'}</small>}</>}</div>)}
      {!p.routes.length&&<small>No modulation routes.</small>}<button onClick={close}>Close sources</button>
    </div>}
  </section>;
}
export function AWParamPanel({stores,edit,renderer='svg',cue='arc',onProcess}) {
  const canvas=useRef(),container=useRef(),entries=useRef(new Map()),dirty=useRef(new Set()),positions=useRef(new Map()),redraw=useRef();
  redraw.current=()=>{const c=canvas.current;if(!c)return;const ctx=c.getContext('2d'),dpr=devicePixelRatio;ctx.setTransform(dpr,0,0,dpr,0,0);
    for(const id of dirty.current){const e=entries.current.get(id),b=positions.current.get(id);if(!e||!b)continue;ctx.clearRect(b.x-2,b.y-2,b.w+4,b.w+4);drawCanvas(ctx,geometry(e.store,e.preview),b.x,b.y,b.w,cue)}dirty.current.clear();
  };
  const paint=useRef(()=>redraw.current());
  const registerCanvas=React.useCallback((id,e)=>{if(renderer!=='canvas')return;const invalidate=()=>{dirty.current.add(id);schedule(paint.current)},off=e.store.subscribeValues(invalidate),metaOff=e.store.subscribe(invalidate);entries.current.set(id,e);invalidate();return()=>{off();metaOff();entries.current.delete(id);positions.current.delete(id);dirty.current.delete(id)}},[renderer]);
  useLayoutEffect(()=>{if(renderer!=='canvas')return;const resize=()=>{const root=container.current.getBoundingClientRect(),c=canvas.current;c.width=Math.ceil(root.width*devicePixelRatio);c.height=Math.ceil(root.height*devicePixelRatio);for(const [id,e]of entries.current){const b=e.element.getBoundingClientRect();positions.current.set(id,{x:b.left-root.left,y:b.top-root.top,w:b.width});dirty.current.add(id)}schedule(paint.current)};const observer=new ResizeObserver(resize);observer.observe(container.current);resize();return()=>{observer.disconnect();paints.delete(paint.current)}},[renderer,stores,cue]);
  return <div className="panel" ref={container}>{renderer==='canvas'&&<canvas ref={canvas} className="panel-canvas"/>}{stores.map(store=><AWParamKnob key={store.get().id} {...{store,edit,renderer,cue,registerCanvas,onProcess}}/>)}</div>;
}
