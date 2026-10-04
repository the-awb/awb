export function createWorkerRack(host,{store,layout,stats}){
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
