import {installDiagnostics} from './diagnostic-renderers.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('Refresh fixture source drift: '+a);return s.replace(a,b);};
export async function installRefresh(fixture){
 await installDiagnostics(fixture);const dir=resolve(fixture,'apps/rack/src');
 await writeFile(resolve(dir,'refreshGate.mjs'),"// Fixture-only on-demand gate. Paint on rAF, retain latest values, skip missed deadlines.\nexport function refreshGate(paint){\n let frame=null,deadline=null,disposed=false,pending=false,times=[],durations=[],requests=0;\n const period=()=>1000/Number(globalThis.__rackRefreshHz||30);\n function tick(timestamp){\n  frame=null;if(disposed||!pending)return;\n  if(deadline===null||timestamp+.5>=deadline){\n   pending=false;const t=performance.now();paint();durations.push(performance.now()-t);times.push(timestamp);\n   if(deadline===null)deadline=timestamp+period();\n   else do{deadline+=period();}while(deadline<=timestamp+.5);\n  }\n  if(pending&&frame===null)frame=requestAnimationFrame(tick);\n }\n return {\n  request(){requests++;pending=true;if(frame===null)frame=requestAnimationFrame(tick);},\n  cancel(){pending=false;if(frame!==null)cancelAnimationFrame(frame);frame=null;},\n  async flush(){while(pending||frame!==null)await new Promise(r=>setTimeout(r,5));},\n  async reset(){await this.flush();times=[];durations=[];requests=0;deadline=null;},\n  snapshot(){const intervals=times.slice(1).map((v,i)=>v-times[i]),sorted=[...intervals].sort((a,b)=>a-b),d=[...durations].sort((a,b)=>a-b);return {requestedHz:Number(globalThis.__rackRefreshHz||30),draws:times.length,requests,times,paintDurationTotalMs:durations.reduce((a,b)=>a+b,0),paintDurationP95Ms:d[Math.floor((d.length-1)*.95)]??0,intervalMeanMs:intervals.reduce((a,b)=>a+b,0)/Math.max(1,intervals.length),intervalP95Ms:sorted[Math.floor((sorted.length-1)*.95)]??0,achievedHz:times.length>1?1000*(times.length-1)/(times.at(-1)-times[0]):0,coalescedRequests:requests-times.length};},\n  dispose(){disposed=true;this.cancel();}\n };\n}\n");
 let svg=await readFile(resolve(dir,'SvgRack.jsx'),'utf8');
 svg="import {refreshGate} from './refreshGate.mjs';\n"+svg;
 const start=svg.indexOf('function paintQueue()'),end=svg.indexOf('const Control=',start);
 if(start<0||end<0)throw Error('Missing SVG queue');
 svg=svg.slice(0,start)+"function paintQueue(){const dirty=new Set();let appliedChanges=0;const gate=refreshGate(()=>{svgStats.paintFrames++;const pending=[...dirty];dirty.clear();for(const paint of pending)paint();});\n const diag={variant:'svg',ready:true,errors:[],flush:()=>gate.flush(),async reset(){await gate.reset();appliedChanges=0;},snapshot(){return {variant:'svg',ready:true,errors:[],appliedChanges,draws:gate.snapshot().draws,cadence:gate.snapshot(),stats:{...svgStats},renderedValues:Object.fromEntries([...document.querySelectorAll('[data-control]')].map(el=>[el.dataset.control,Number(el.querySelector('svg').getAttribute('aria-valuenow'))]))};}};globalThis.rackSvgDiagnostic=diag;\n return {\n request(paint){appliedChanges++;dirty.add(paint);gate.request();},\n remove(paint){dirty.delete(paint);if(!dirty.size)gate.cancel();},\n dispose(){gate.dispose();dirty.clear();if(globalThis.rackDiagnostic===diag)delete globalThis.rackDiagnostic;}\n };}\n"+svg.slice(end);
 await writeFile(resolve(dir,'SvgRack.jsx'),svg);
 let canvas=await readFile(resolve(dir,'diagnostic-canvas2d.mjs'),'utf8');
 canvas="import {refreshGate} from './refreshGate.mjs';\n"+canvas;
 canvas=replace(canvas,'draw(true);const unsub=',"draw(true);const gate=refreshGate(()=>draw(dirty.size>32));const unsub=");
 canvas=replace(canvas,'if(frame===null)frame=requestAnimationFrame(()=>draw(dirty.size>32));','gate.request();');
 canvas=replace(canvas,'while(frame!==null)await new Promise(r=>setTimeout(r,5));','await gate.flush();');
 canvas=replace(canvas,'await this.flush();appliedChanges=0;','await this.flush();await gate.reset();appliedChanges=0;');
 canvas=replace(canvas,"context:'CanvasRenderingContext2D'","cadence:gate.snapshot(),context:'CanvasRenderingContext2D'");
 canvas=replace(canvas,'disposed=true;unsub();','disposed=true;gate.dispose();unsub();');
 await writeFile(resolve(dir,'diagnostic-canvas2d.mjs'),canvas);
}
