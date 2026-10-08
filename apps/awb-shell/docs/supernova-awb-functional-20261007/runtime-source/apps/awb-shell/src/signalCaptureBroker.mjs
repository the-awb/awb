// Shell-owned SC signal acquisition. No audio device, playback or renderer ownership.
export class SignalCaptureBroker {
 #sources=new Map();#hosts=new WeakMap();#nextHost=0;#timer=null;#closed=false;#derived=new Map();
 constructor({open,pollMs=4,staleMs=2000,now=Date.now,setTimer=setInterval,clearTimer=clearInterval}){
  this.stats={rawFrames:0,transformCalls:0,derivedFrames:0};
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
 // Trusted adapters name a deterministic transform profile; renderers never provide functions.
 async subscribeDerived({host,configuration,profile,createTransform,onFrame=()=>{},onError=()=>{}}){
  if(this.#closed)throw new Error('Signal capture broker is closed');
  if(typeof profile!=='string'||!profile.length||profile.length>128||typeof createTransform!=='function')throw new Error('Invalid display profile');
  const key=`${this.#key(host,configuration)}:${profile}`;
  let entry=this.#derived.get(key);
  if(entry?.closing){await entry.closing;return this.subscribeDerived({host,configuration,profile,createTransform,onFrame,onError})}
  if(!entry){
   const transform=createTransform();if(typeof transform?.append!=='function')throw new Error('Display transform needs append');
   entry={key,profile,clients:new Set(),latest:null,info:null,lastAt:0,frames:0,error:null,closing:null};this.#derived.set(key,entry);
   const fault=error=>{
    entry.error=error.message;for(const client of entry.clients){try{client.onError(error)}catch{}}
    this.#disposeDerived(entry).catch(()=>{});
   };
   entry.ready=Promise.resolve().then(()=>this.subscribe({host,configuration,onFrame:(frame,info)=>{
    if(entry.closing)return;
    let next;try{this.stats.transformCalls++;next=transform.append(frame,info)}catch(error){fault(error);return}
    if(!next)return;
    entry.latest=next;entry.lastAt=this.now();entry.info={...info,publishedAt:entry.lastAt};entry.frames++;this.stats.derivedFrames++;
    for(const client of entry.clients){try{client.onFrame(next,entry.info)}catch(error){try{client.onError(error)}catch{}}}
   },onError:fault}));entry.ready.catch(()=>{});
  }
  const client={onFrame,onError};entry.clients.add(client);
  let source;
  try{source=await entry.ready;if(this.#closed||entry.error)throw new Error(entry.error??'Signal capture broker closed during startup')}
  catch(error){entry.clients.delete(client);if(!entry.clients.size)await this.#disposeDerived(entry).catch(()=>{});throw error}
  // A new viewer may receive the cached frame, with its original freshness timestamp.
  if(entry.latest){try{onFrame(entry.latest,entry.info)}catch(error){try{onError(error)}catch{}}}
  let stopped=false;const {stop,...info}=source;
  return {...info,stop:async()=>{if(stopped)return;stopped=true;entry.clients.delete(client);if(!entry.clients.size)await this.#disposeDerived(entry)}};
 }
 #disposeDerived(entry){
  if(entry.closing)return entry.closing;
  entry.closing=(async()=>{try{const source=await entry.ready.catch(()=>null);await source?.stop()}finally{if(this.#derived.get(entry.key)===entry)this.#derived.delete(entry.key)}})();return entry.closing;
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
     entry.lastEnd=frame.sourceEnd;entry.lastAt=this.now();this.stats.rawFrames++;
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
 diagnostics(){return {stats:{...this.stats},derived:[...this.#derived.values()].map(e=>({profile:e.profile,subscribers:e.clients.size,frames:e.frames,ageMs:e.latest?this.now()-e.lastAt:null})),sources:[...this.#sources.values()].map(e=>({...e.config,generation:e.source?.info.generation,nodeID:e.source?.info.nodeID,subscribers:e.clients.size,sourceEnd:e.lastEnd,ageMs:this.now()-e.lastAt,error:e.error})),polling:!!this.#timer};}
 async close(){
  this.#closed=true;const results=await Promise.allSettled([...[...this.#derived.values()].map(e=>this.#disposeDerived(e)),...[...this.#sources.values()].map(e=>this.#dispose(e))]);
  const failures=results.filter(r=>r.status==='rejected').map(r=>r.reason);
  if(failures.length)throw new AggregateError(failures,'SC signal cleanup failed');
 }
}
