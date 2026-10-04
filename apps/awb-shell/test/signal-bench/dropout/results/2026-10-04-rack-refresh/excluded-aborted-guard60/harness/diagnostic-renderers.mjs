// Diagnostic variants are installed only into the disposable rack copy.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('Diagnostic source drift: '+a);return s.replace(a,b);};
export async function installDiagnostics(fixture){
 const dir=resolve(fixture,'apps/rack/src'),original=await readFile(resolve(dir,'canvasRenderer.mjs'),'utf8');
 let instrumented=replace(original,'export function createCanvasRack','export function createWebGLRack');
 instrumented=replace(instrumented,'const indices=new Map(),dirty=new Set();',`let appliedChanges=0,draws=0,renderedValues={};const errors=[];
  const indices=new Map(),dirty=new Set();`);
 instrumented=replace(instrumented,'dirty.clear();pendingFull=false;};',`dirty.clear();pendingFull=false;draws++;renderedValues=Object.fromEntries(layout.cells.map(c=>[c.descriptor.id,store.get(c.descriptor.id)]));};`);
 instrumented=replace(instrumented,"if(e.kind==='value'){const index=", "if(e.kind==='value'){appliedChanges++;const index=");
 const diag=`globalThis.rackDiagnostic={variant:'webgl',ready:true,errors,
    async flush(){while(frame!==null)await new Promise(r=>setTimeout(r,5));},
    async reset(){await this.flush();appliedChanges=0;draws=0;for(const k in stats)stats[k]=0;},
    snapshot(){return {variant:this.variant,ready:true,errors:[...errors],appliedChanges,draws,renderedValues:{...renderedValues},stats:{...stats},context:renderer.getContext().getParameter(renderer.getContext().VERSION)};}};\n  `;
 instrumented=replace(instrumented,'const hit=e=>',diag+'const hit=e=>');
 await writeFile(resolve(dir,'diagnostic-webgl.mjs'),instrumented);
 let workerRenderer=replace(instrumented,"import {beginDrag,keyControl,wheelControl} from './interaction.mjs';",'');
 workerRenderer=replace(workerRenderer,"new THREE.WebGLRenderer({antialias:true", "new THREE.WebGLRenderer({canvas:host.canvas,antialias:true");
 workerRenderer=replace(workerRenderer,'renderer.setSize(layout.width,layout.height);','renderer.setSize(layout.width,layout.height,false);');
 workerRenderer=replace(workerRenderer,"const canvas=renderer.domElement;canvas.tabIndex=store.mixDraft?-1:0;canvas.setAttribute('role','application');canvas.setAttribute('aria-label','Rack controls. Select with pointer or Tab; use arrow keys to adjust.');host.append(canvas);",'const canvas=renderer.domElement;');
 workerRenderer=workerRenderer.replaceAll("document.createElement('canvas')",'new OffscreenCanvas(1,1)');
 const cut=workerRenderer.indexOf('  const hit=e=>');workerRenderer=workerRenderer.slice(0,cut)+`  globalThis.rackDiagnostic.variant='worker';
  return {dispose(){disposed=true;unsub();unselect?.();if(frame!==null)cancelAnimationFrame(frame);g.dispose();material.dispose();glyphs.dispose();text.dispose();borders.dispose();borderMaterial.dispose();retained.dispose();presentGeometry.dispose();presentMaterial.dispose();renderer.dispose();renderer.forceContextLoss();}};\n}\n`;
 await writeFile(resolve(dir,'diagnostic-worker-renderer.mjs'),workerRenderer);
 await writeFile(resolve(dir,'diagnostic-worker.mjs'),`import {createWebGLRack} from './diagnostic-worker-renderer.mjs';
let values,listener,renderer,stats;
self.onmessage=async({data:d})=>{try{
 if(d.type==='init'){values=new Map(d.values);stats={hostRenders:0,frames:0,fullFrames:0,tiles:0,attributeUpdates:0,drawCalls:0,presentations:0};
 const store={get:id=>values.get(id),mixDraft:null,subscribeAll:f=>{listener=f;return()=>{listener=null;};}};
 renderer=createWebGLRack({canvas:d.canvas},{store,layout:d.layout,stats});postMessage({type:'ready'});
 }else if(d.type==='changes'){for(const [id,value]of d.changes){values.set(id,value);listener?.({kind:'value',id});}}
 else if(d.type==='flush'||d.type==='reset'){await rackDiagnostic[d.type]();postMessage({type:'response',request:d.request,snapshot:rackDiagnostic.snapshot()});}
 else if(d.type==='dispose'){renderer.dispose();close();}
}catch(e){postMessage({type:'error',message:e.stack||e.message});}};
`);
 await writeFile(resolve(dir,'diagnostic-worker-host.mjs'),`export function createWorkerRack(host,{store,layout,stats}){
 const canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;canvas.style.width=layout.width+'px';canvas.style.height=layout.height+'px';canvas.setAttribute('aria-label','Diagnostic worker rack');host.append(canvas);
 const worker=new Worker(new URL('./diagnostic-worker.mjs',import.meta.url),{type:'module'}),errors=[],requests=new Map();let next=0,disposed=false,pending=[],queued=false,last=null;
 const sendPending=()=>{queued=false;if(!disposed&&pending.length){worker.postMessage({type:'changes',changes:pending});pending=[];}};
 const request=type=>new Promise((resolve,reject)=>{sendPending();const request=++next;const timer=setTimeout(()=>{requests.delete(request);reject(Error('Worker '+type+' timeout'));},10000);requests.set(request,s=>{clearTimeout(timer);last=s;for(const [k,v]of Object.entries(s.stats))if(k!=='hostRenders')stats[k]=v;resolve();});worker.postMessage({type,request});});
 const diag={variant:'worker',ready:false,errors,flush:()=>request('flush'),reset:()=>request('reset'),snapshot:()=>({...last,errors:[...errors]})};globalThis.rackDiagnostic=diag;
 worker.onmessage=({data:d})=>{if(d.type==='ready')diag.ready=true;else if(d.type==='error'){errors.push(d.message);console.error(d.message);}else if(d.type==='response'){requests.get(d.request)?.(d.snapshot);requests.delete(d.request);}};
 worker.onerror=e=>{errors.push(e.message);console.error('Rack worker: '+e.message);};
 const offscreen=canvas.transferControlToOffscreen();worker.postMessage({type:'init',canvas:offscreen,layout,values:layout.cells.map(c=>[c.descriptor.id,store.get(c.descriptor.id)])},[offscreen]);
 const unsub=store.subscribeAll(e=>{if(e.kind==='value'){pending.push([e.id,store.get(e.id)]);if(!queued){queued=true;queueMicrotask(sendPending);}}});
 return {dispose(){disposed=true;unsub();worker.terminate();canvas.remove();if(globalThis.rackDiagnostic===diag)delete globalThis.rackDiagnostic;}};
}
`);
 await writeFile(resolve(dir,'diagnostic-canvas2d.mjs'),canvas2d);
 await writeFile(resolve(dir,'canvasRenderer.mjs'),`import {createWebGLRack} from './diagnostic-webgl.mjs';
import {createWorkerRack} from './diagnostic-worker-host.mjs';
import {createCanvas2DRack} from './diagnostic-canvas2d.mjs';
export function createCanvasRack(host,options){const variant=window.__rackDiagnosticVariant||'webgl';return (variant==='worker'?createWorkerRack:variant==='canvas2d'?createCanvas2DRack:createWebGLRack)(host,options);}
`);
}
const canvas2d=`import {positionOf,formatValue} from './model.mjs';
export function createCanvas2DRack(host,{store,layout,stats}){
 const canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;canvas.style.width=layout.width+'px';canvas.style.height=layout.height+'px';canvas.setAttribute('aria-label','Diagnostic Canvas2D rack');host.append(canvas);const ctx=canvas.getContext('2d',{alpha:false}),indices=new Map(layout.cells.map((c,n)=>[c.descriptor.id,n])),dirty=new Set(),errors=[];let frame=null,disposed=false,appliedChanges=0,draws=0,renderedValues={};
 function paint(){ctx.fillStyle='#101516';ctx.fillRect(0,0,layout.width,layout.height);
 for(const i of [...layout.headers,...layout.rows]){ctx.save();ctx.beginPath();ctx.rect(i.x,i.y,i.width,i.height??16);ctx.clip();ctx.fillStyle='#b9c5c6';ctx.font=(i.bold?'600 ':'')+(i.fontSize??9)+'px sans-serif';ctx.textAlign=i.align??'left';ctx.textBaseline='middle';ctx.fillText(i.text.slice(0,30),i.x+(i.align==='center'?i.width/2:0),i.y+(i.height??12)/2);ctx.restore();}
 ctx.strokeStyle='#344145';ctx.lineWidth=1;for(const r of layout.racks){ctx.beginPath();if(r.scope==='global'){ctx.moveTo(r.x,r.y);ctx.lineTo(r.x+r.width,r.y);}else{ctx.moveTo(r.x+r.width-1,0);ctx.lineTo(r.x+r.width-1,r.height);}ctx.stroke();}
 for(const c of layout.cells){const d=c.descriptor,v=store.get(d.id),p=positionOf(v,d.region),big=c.large,color=d.region.kind==='fx'?'#82d5c5':d.region.kind==='bus'?'#dcaa88':'#b3a7d6';ctx.save();ctx.translate(c.x,c.y);ctx.lineWidth=big?2:1.2;
 if(d.region.widget==='knob'){const x=big?c.width*.5:14,y=big?31:20,r=big?18:9,n=big?13:6.5,start=Math.PI*.75,end=start+Math.PI*1.5*p;ctx.strokeStyle='#4a5759';ctx.beginPath();ctx.arc(x,y,r,start,start+Math.PI*1.5);ctx.stroke();ctx.strokeStyle=color;ctx.beginPath();ctx.arc(x,y,r,start,end);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(end)*n,y+Math.sin(end)*n);ctx.stroke();}
 else{const x=big?c.width*.5:14,top=big?8:11,bottom=big?62:29,length=big?54:18,y=bottom-p*length;ctx.strokeStyle='#4a5759';ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,bottom);ctx.moveTo(x-(big?11:6),y);ctx.lineTo(x+(big?11:6),y);ctx.stroke();}
 ctx.fillStyle='#c7c7c7';ctx.font=(big?14:8)+'px monospace';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(formatValue(v).slice(0,7),big?c.width*.5:37.5,big?c.height-20:14);ctx.restore();}
 }
 const draw=full=>{frame=null;if(disposed)return;stats.frames++;draws++;if(full){stats.fullFrames++;paint();}else{stats.tiles+=dirty.size;for(const n of dirty){const c=layout.cells[n];ctx.save();ctx.beginPath();ctx.rect(c.x,c.y,c.width,c.height);ctx.clip();paint();ctx.restore();}}stats.presentations++;stats.attributeUpdates+=dirty.size;stats.drawCalls++;dirty.clear();renderedValues=Object.fromEntries(layout.cells.map(c=>[c.descriptor.id,store.get(c.descriptor.id)]));};
 draw(true);const unsub=store.subscribeAll(e=>{if(e.kind==='value'){appliedChanges++;const n=indices.get(e.id);if(n!==undefined){dirty.add(n);if(frame===null)frame=requestAnimationFrame(()=>draw(dirty.size>32));}}});
 const diag={variant:'canvas2d',ready:true,errors,async flush(){while(frame!==null)await new Promise(r=>setTimeout(r,5));},async reset(){await this.flush();appliedChanges=0;draws=0;for(const k in stats)stats[k]=0;},snapshot(){return {variant:'canvas2d',ready:true,errors:[...errors],appliedChanges,draws,renderedValues:{...renderedValues},stats:{...stats},context:'CanvasRenderingContext2D'};}};globalThis.rackDiagnostic=diag;
 return {dispose(){disposed=true;unsub();if(frame!==null)cancelAnimationFrame(frame);canvas.remove();if(globalThis.rackDiagnostic===diag)delete globalThis.rackDiagnostic;}};
}
`;
