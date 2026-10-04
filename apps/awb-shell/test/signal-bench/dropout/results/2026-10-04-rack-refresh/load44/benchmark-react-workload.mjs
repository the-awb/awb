import {descriptors} from '../src/model.mjs';
const smoke=false;
function motionTrace(ids,count,duration){
 const active=ids.slice(0,count),events=[];
 for(let frame=0,at=0;at<duration;frame++,at+=32){
  const changes=active.map((id,k)=>{const p=(frame+1+k*7)%62;return [id,1+4*(p<=31?p:62-p)];});
  events.push({at,changes});
 }
 return {name:`moving-${count}`,count,cadenceMs:32,duration,events};
}
function trace(document){
 const ds=descriptors(document.config),byInstrument=document.config.instruments.map(i=>ds.filter(d=>d.instrument===i.id));
 // Spread each prefix across channel strips. Up to 100 controls are all send knobs;
 // the maximum also includes the 18 shared bus faders. All 354 stay mounted.
 const ids=[];for(let row=0;row<24;row++)for(const channel of byInstrument)if(channel[row])ids.push(channel[row].id);
 ids.push(...ds.filter(d=>d.instrument==='global').map(d=>d.id));
 const counts=smoke?[1,25,354]:[1,5,10,25,50,100,354];
 const workloads=[{name:'idle',count:0,duration:smoke?300:2000,events:[]},...counts.map(n=>motionTrace(ids,n,smoke?700:6000))];
 for(const w of workloads){if(w.count){const state=new Map(ids.map(id=>[id,0]));for(const e of w.events){if(e.changes.length!==w.count)throw Error('Wrong batch size');for(const [id,v]of e.changes){if(state.get(id)===v)throw Error('A selected control did not change');state.set(id,v);}}}}
 return {ids,counts,cadenceMs:32,durationMs:smoke?700:6000,selection:'round-robin channels; fixed visible 354-control rack',workloads};
}
const prepare=(mode,ids)=>`(()=>{
 const ids=${JSON.stringify(ids)};window.benchMode=${JSON.stringify(mode)};window.benchIDs=ids;
 if(benchMode==='osc'){
  const widgets=new Map([...document.querySelectorAll('[data-widget]')].map(el=>el._widget_instance).filter(Boolean).map(w=>[w.getProp('id'),w]));
  window.benchWidgets=ids.map(id=>{const w=widgets.get(id);if(!w)throw Error('missing OSC control '+id);return w;});
  window.benchSet=(id,v)=>widgets.get(id).setValue(v,{sync:true,send:false});
  window.benchGet=id=>widgets.get(id).getValue();
 }else{window.benchSet=(id,v)=>rackDebug.store.set(id,v,'remote');window.benchGet=id=>rackDebug.store.get(id);}
 window.benchCounts={draws:0};if(benchMode==='osc')for(const w of benchWidgets){const draw=w.draw.bind(w);w.draw=(...args)=>{benchCounts.draws++;return draw(...args);};}
 for(const id of ids)benchSet(id,0);
 return {controls:ids.length,canvases:document.querySelectorAll('canvas').length,svgControls:document.querySelectorAll('[data-control]').length,dpr:devicePixelRatio,canvasScaling:window.CANVAS_SCALING||1,viewport:[innerWidth,innerHeight],domNodes:document.querySelectorAll('*').length};
})()`;
function replay(workload){return `(async()=>{
 const work=window.benchWork;const frames=[],lateness=[],apply=[],longTasks=[];let stopped=false,last,raf;
 const frame=t=>{if(last!==undefined)frames.push(t-last);last=t;if(!stopped)raf=requestAnimationFrame(frame);};
 const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));observer.observe({entryTypes:['longtask']});
 if(window.rackDebug)rackDebug.reset();benchCounts.draws=0;
 const storeChangesBefore=window.rackDebug?.store.stats.changes;const started=performance.now();raf=requestAnimationFrame(frame);let changes=0;
 for(const event of work.events){const delay=started+event.at-performance.now();if(delay>0)await new Promise(r=>setTimeout(r,delay));lateness.push(Math.max(0,performance.now()-started-event.at));const t=performance.now();for(const [id,v]of event.changes){benchSet(id,v);changes++;}apply.push(performance.now()-t);}
 const remainder=started+work.duration+100-performance.now();if(remainder>0)await new Promise(r=>setTimeout(r,remainder));stopped=true;cancelAnimationFrame(raf);observer.disconnect();
 const expected=new Map(benchIDs.map(id=>[id,0]));for(const e of work.events)for(const [id,v]of e.changes)expected.set(id,v);const mismatches=[...expected].filter(([id,v])=>benchGet(id)!==v);
 const p=(a,q)=>{a=[...a].sort((a,b)=>a-b);return a.length?a[Math.min(a.length-1,Math.floor(a.length*q))]:0;};
 return {elapsedMs:performance.now()-started,updates:changes,actualValueChanges:window.rackDebug?rackDebug.store.stats.changes-storeChangesBefore:null,batches:work.events.length,frameCount:frames.length,frameMedianMs:p(frames,.5),frameP95Ms:p(frames,.95),frameMaxMs:p(frames,1),framesOver25ms:frames.filter(v=>v>25).length,applyTotalMs:apply.reduce((a,b)=>a+b,0),applyP95Ms:p(apply,.95),scheduleP95Ms:p(lateness,.95),longTasks,mismatches,oscDraws:benchCounts.draws,svg:window.rackDebug?structuredClone(rackDebug.svgStats):null,canvas:window.rackDebug?structuredClone(rackDebug.canvasStats):null,appRenders:window.rackDebug?rackDebug.appStats.renders:null,heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null};
})()`;}

export {motionTrace,trace,prepare,replay};
