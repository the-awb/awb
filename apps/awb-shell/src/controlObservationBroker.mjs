import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export class ControlObservationBroker {
  #hosts=new Map(); #generation=0;
  constructor({native,clock=()=>performance.now(),timer=setInterval,clearTimer=clearInterval}={}) {
    this.native=native;this.clock=clock;this.timer=timer;this.clearTimer=clearTimer;
  }
  subscribe(host,indices,{hz=15,onValues,onError=()=>{}}={}) {
    if(![8,15].includes(hz)||typeof onValues!=='function')throw Error('Expected 8/15 Hz and a callback');
    const {port,capacity,pid,epoch}=host;
    if(!Number.isInteger(port)||port<1||port>65535||!Number.isInteger(capacity)||capacity<1||capacity>65536||!Number.isInteger(pid)||pid<1||typeof epoch!=='string'||!epoch)throw Error('Invalid server identity');
    if(!Array.isArray(indices)||!indices.length||indices.length>3072||indices.some(v=>!Number.isInteger(v)||v<0||v>=capacity))throw Error('Invalid control bus indices');
    const key=`${pid}:${port}:${epoch}:${capacity}`;
    let entry=this.#hosts.get(key);
    if(!entry) {
      const native=this.native??=require('../.build/control-bus-reader.node');
      entry={key,host,native,reader:native.attach(port,capacity),leases:new Set(),generation:++this.#generation,reads:0,scalars:0};
      this.#hosts.set(key,entry);
    }
    if(new Set([...(entry.indices??[]),...indices]).size>4096)throw Error('Server observer index budget exhausted');
    const lease={indices:[...indices],hz,onValues,onError,isAlive:host.isAlive,last:null,next:0,closed:false};
    entry.leases.add(lease);this.#schedule(entry);
    return {generation:entry.generation,close:()=>this.#release(entry,lease)};
  }
  #schedule(e) {
    if(e.timer)this.clearTimer(e.timer);
    e.indices=Uint32Array.from(new Set([...e.leases].flatMap(l=>l.indices)));
    e.positions=new Map([...e.indices].map((v,i)=>[v,i]));
    e.hz=Math.max(...[...e.leases].map(l=>l.hz));
    e.timer=this.timer(()=>this.#poll(e),1000/e.hz);e.timer.unref?.();
  }
  #poll(e) {
    try {
      for(const l of [...e.leases])if(l.isAlive&&!l.isAlive()){this.#release(e,l);try{l.onError(Error('Control observation binding unavailable'))}catch{}}
      if(!e.leases.size)return;
      const now=this.clock(),values=e.native.read(e.reader,e.indices),positions=new Map(e.positions);e.reads++;e.scalars+=values.length;
      for(const l of [...e.leases]) {
        if(l.closed||now+1<l.next)continue;
        l.next=l.next ? l.next+1000/l.hz : now+1000/l.hz;
        if(l.next<=now)l.next=now+1000/l.hz;
        const latest=Float32Array.from(l.indices.map(i=>values[positions.get(i)]));
        if([...latest].some(v=>!Number.isFinite(v)))throw Error('Non-finite control observation');
        const changed=[];latest.forEach((v,i)=>{if(!l.last||v!==l.last[i])changed.push(i)});l.last=latest;
        if(changed.length)try{l.onValues({generation:e.generation,time:now,values:latest,changed})}catch(error){this.#release(e,l);try{l.onError(error)}catch{}};
      }
    }catch(error) {
      for(const l of [...e.leases]){this.#release(e,l);try{l.onError(error)}catch{}}
    }
  }
  #release(e,l) {
    if(l.closed)return;l.closed=true;e.leases.delete(l);
    if(e.leases.size)this.#schedule(e);
    else {this.clearTimer(e.timer);e.native.detach(e.reader);this.#hosts.delete(e.key)}
  }
  diagnostics(){return {hosts:[...this.#hosts.values()].map(e=>({generation:e.generation,leases:e.leases.size,buses:e.indices.length,hz:e.hz,reads:e.reads,scalars:e.scalars})),polling:this.#hosts.size>0}}
  close(){for(const e of [...this.#hosts.values()])for(const l of [...e.leases])this.#release(e,l)}
}
