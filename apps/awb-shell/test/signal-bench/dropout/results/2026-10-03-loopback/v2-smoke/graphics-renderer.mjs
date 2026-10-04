// Disposable fixture only: production trace painter, shared snapshots, visible canvases.
import {ScopePainter} from './scope-painter.js';
import {paintScopeTrace} from './scope-trace.js';
export function installGraphicsLoad({container,frameOptions,getSnapshot}) {
 let panels=[],scheduler=null,profile=null,batches=0,freshBatches=0,lastSource=null,drawMs=0;
 const times=[];
 function paint(){
  const snapshot=getSnapshot();if(!snapshot)return;
  const t=performance.now();
  for(let i=0;i<panels.length;i++){
   const {canvas,ctx}=panels[i],ch=i%snapshot.channels;
   ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle=ctx.fillStyle=['#6ce0c1','#ffb276','#80bcff','#ed97bd'][ch%4];
   paintScopeTrace(ctx,{samples:snapshot.samples,format:snapshot.format,frames:snapshot.frames,channel:ch,count:snapshot.frames,width:canvas.width,middle:canvas.height/2,scale:canvas.height*.4,mode:'connected',control:false,pixelRatio:1});
   canvas.dataset.sourceEnd=String(snapshot.sourceEnd);canvas.dataset.channel=String(ch);
  }
  batches++;if(lastSource!==snapshot.sourceEnd)freshBatches++;lastSource=snapshot.sourceEnd;
  drawMs+=performance.now()-t;times.push(t);if(times.length>2048)times.shift();
 }
 function configure(next){
  scheduler?.close();scheduler=null;profile=next;panels=[];container.replaceChildren();container.hidden=!next?.canvases;container.style.display=next?.canvases?'grid':'none';container.style.flexShrink='0';
  batches=0;freshBatches=0;lastSource=null;drawMs=0;times.length=0;
  if(!next?.canvases)return;
  container.style.display='grid';container.style.gridTemplateColumns=`repeat(${next.canvases===128?16:8},${next.width}px)`;container.style.gap='4px';
  for(let i=0;i<next.canvases;i++){
   const canvas=container.ownerDocument.createElement('canvas');canvas.width=next.width;canvas.height=next.height;canvas.style.width=next.width+'px';canvas.style.height=next.height+'px';canvas.style.background='#0e1a1d';canvas.style.margin='0';canvas.style.display='block';canvas.setAttribute('aria-label','Benchmark scope '+(i+1));
   container.append(canvas);panels.push({canvas,ctx:canvas.getContext('2d')});
  }
  scheduler=new ScopePainter({...frameOptions,rates:[30,60],fps:next.paintHz,paint});
  scheduler.invalidate(true);
 }
 return {configure,invalidate(){scheduler?.invalidate();},close(){scheduler?.close();},diagnostics(){return {profile,batches,freshBatches,drawMs,times:[...times],sourceEnd:lastSource,canvases:panels.map(({canvas})=>{const r=canvas.getBoundingClientRect();return {channel:Number(canvas.dataset.channel),sourceEnd:Number(canvas.dataset.sourceEnd),x:r.x,y:r.y,width:r.width,height:r.height};})};}};
}
