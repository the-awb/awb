// Injected only into the disposable benchmark view before the published artifact loads.
(()=>{
 const target=BENCH_TARGET,rawRAF=window.requestAnimationFrame.bind(window),rawCancel=window.cancelAnimationFrame.bind(window),deadlines=new WeakMap(),jobs=new Map();let id=0;
 if(target){window.requestAnimationFrame=callback=>{const key=++id,job={native:null};jobs.set(key,job);const tick=at=>{if(!jobs.has(key))return;const due=deadlines.get(callback)??-Infinity;if(at+.25<due){job.native=rawRAF(tick);return;}const period=1000/target;deadlines.set(callback,!Number.isFinite(due)?at+period:due+Math.max(1,Math.floor((at-due)/period)+1)*period);jobs.delete(key);callback(at);};job.native=rawRAF(tick);return key;};window.cancelAnimationFrame=key=>{const j=jobs.get(key);if(j){rawCancel(j.native);jobs.delete(key)}};}
 const plots=new Map(),get=gl=>{if(!plots.has(gl.canvas))plots.set(gl.canvas,{draws:0,points:0,pointCount:0,uploads:0,pointTimes:[]});return plots.get(gl.canvas)};
 for(const C of [window.WebGLRenderingContext,window.WebGL2RenderingContext])if(C){
  const proto=C.prototype,draw=proto.drawArrays,upload=proto.bufferSubData;
  proto.drawArrays=function(mode,first,count){const p=get(this);p.draws++;if(mode===this.POINTS&&count>=100){p.points++;p.pointCount=count;this.canvas.dataset.benchPoints=String(count);p.pointTimes.push(performance.now());if(p.pointTimes.length>1024)p.pointTimes.shift();}return draw.call(this,mode,first,count);};
  proto.bufferSubData=function(...args){const length=args.length>=5?args[4]:args[2]?.length;if(length===15000&&args[2]?.BYTES_PER_ELEMENT===4)get(this).uploads++;return upload.apply(this,args);};
 }
 const samples={packets:0,bytes:0,sourceEnd:0,sampleRate:0,channels:0,gapFrames:0};const WS=window.WebSocket;
 window.WebSocket=class extends WS{constructor(...args){super(...args);this.addEventListener('message',event=>{if(!(event.data instanceof ArrayBuffer)||event.data.byteLength<48)return;const v=new DataView(event.data);if(v.getUint32(0,true)!==0x43535741)return;const end=v.getFloat64(24,true),frames=v.getUint32(40,true);if(samples.sourceEnd&&end-frames>samples.sourceEnd)samples.gapFrames+=end-frames-samples.sourceEnd;samples.packets++;samples.bytes+=event.data.byteLength;samples.sourceEnd=end;samples.sampleRate=v.getFloat64(16,true);samples.channels=v.getUint32(36,true);});}};
 window.__patternBench=()=>({now:performance.now(),target,...samples,plots:[...plots].map(([canvas,p])=>{const r=canvas.getBoundingClientRect();return {...p,pointTimes:[...p.pointTimes],width:r.width,height:r.height,bufferWidth:canvas.width,bufferHeight:canvas.height}})});
})();
