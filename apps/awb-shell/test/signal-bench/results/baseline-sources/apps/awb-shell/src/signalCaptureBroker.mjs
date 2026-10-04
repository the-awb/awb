// Shell-owned SC signal acquisition. No audio device, playback or renderer ownership.
export class SignalCaptureBroker {
 #sources=new Map();#hosts=new WeakMap();#nextHost=0;#timer=null;#closed=false;
 constructor({open,pollMs=4,staleMs=2000,now=Date.now,setTimer=setInterval,clearTimer=clearInterval}){
  Object.assign(this,{open,pollMs,staleMs,now,setTimer,clearTimer});
 }
 #key(host,{bus,channels,rate='audio'}){
  if(!Number.isInteger(bus)||bus<0||bus>65535||!Number.isInteger(channels)||channels<1||channels>16||!['audio','control'].includes(rate))throw new Error('Invalid SC signal range');
  const identity=host.service??host;
  if(!this.#hosts.has(identity))this.#hosts.set(identity,++this.#nextHost);
  return `${this.#hosts.get(identity)}:${host.oscHost}:${host.oscPort}:${rate}:${bus}:${channels}`;
 }
 async subscribe({host,configuration,onFrame=()=>{},onError=()=>{}}){
  if(this.#closed)throw new Error('Signal capture broker is closed');
  const config={rate:'audio',...configuration},key=this.#key(host,config);
  let entry=this.#sources.get(key);
  if(entry?.closing){await entry.closing;return this.subscribe({host,configuration,onFrame,onError})}
  if(!entry){
   entry={key,host,config,clients:new Set(),source:null,lastAt:this.now(),lastEnd:null,error:null,closing:null};
   this.#sources.set(key,entry);
   entry.ready=Promise.resolve().then(()=>this.open({host,configuration:config})).then(source=>{entry.source=source;entry.lastAt=this.now();return source});
   entry.ready.catch(()=>{});
  }
  const client={onFrame,onError};entry.clients.add(client);
  try{await entry.ready;if(this.#closed||entry.error)throw new Error(entry.error??'Signal capture broker closed during startup')}
  catch(error){entry.clients.delete(client);if(!entry.clients.size)await this.#dispose(entry).catch(()=>{});throw error}
  this.#startPolling();let stopped=false;
  return {...entry.source.info,stop:async()=>{if(stopped)return;stopped=true;entry.clients.delete(client);if(!entry.clients.size)await this.#dispose(entry)}};
 }
 #startPolling(){if(!this.#timer)this.#timer=this.setTimer(()=>this.poll(),this.pollMs)}
 // Separate immutable JS-owned frames; callbacks may derive displays, never mutate samples.
 poll(){
  for(const entry of this.#sources.values()){
   if(!entry.source||entry.closing||entry.error||!entry.clients.size)continue;
   try{
    if(!entry.host.isConnected())throw new Error('SC host disconnected');
    const frame=entry.source.read();
    if(frame&&frame.sourceEnd!==entry.lastEnd){
     entry.lastEnd=frame.sourceEnd;entry.lastAt=this.now();
     for(const client of entry.clients){try{client.onFrame(frame,entry.source.info)}catch(error){try{client.onError(error)}catch{}}}
    }else if(this.now()-entry.lastAt>this.staleMs)throw new Error('SC signal tap stopped publishing');
   }catch(error){
    entry.error=error.message;
    for(const client of entry.clients){try{client.onError(error)}catch{}}
    this.#dispose(entry).catch(()=>{});
   }
  }
 }
 #dispose(entry){
  if(entry.closing)return entry.closing;
  entry.closing=(async()=>{try{const source=await entry.ready;await source.stop()}finally{
   if(this.#sources.get(entry.key)===entry)this.#sources.delete(entry.key);
   if(!this.#sources.size&&this.#timer){this.clearTimer(this.#timer);this.#timer=null}
  }})();return entry.closing;
 }
 diagnostics(){return {sources:[...this.#sources.values()].map(e=>({...e.config,generation:e.source?.info.generation,nodeID:e.source?.info.nodeID,subscribers:e.clients.size,sourceEnd:e.lastEnd,ageMs:this.now()-e.lastAt,error:e.error})),polling:!!this.#timer};}
 async close(){
  this.#closed=true;const results=await Promise.allSettled([...this.#sources.values()].map(e=>this.#dispose(e)));
  const failures=results.filter(r=>r.status==='rejected').map(r=>r.reason);
  if(failures.length)throw new AggregateError(failures,'SC signal cleanup failed');
 }
}
