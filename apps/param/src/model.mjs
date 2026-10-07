export const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
export function normalized(v,p){return clamp(['exp','exponential'].includes(p.warp)?Math.log(v/p.min)/Math.log(p.max/p.min):(v-p.min)/(p.max-p.min))}
export function nativeValue(v,p){return ['exp','exponential'].includes(p.warp)?p.min*(p.max/p.min)**clamp(v):p.min+(p.max-p.min)*clamp(v)}
export function shape(x,c){return Math.abs(c)<.001?x:Math.expm1(x*c)/Math.expm1(c)}
// Signed amount is a fraction of the full range; numeric edits retain ±8.
export const amountPosition=value=>.5+.5*clamp(value,-1,1);
export const displayOrigin=p=>p.polarity==='bipolar'?.5:0;
export function arc(from,to,r=33){const point=t=>{const a=(-225+270*t)*Math.PI/180;return [50+r*Math.cos(a),50+r*Math.sin(a)]};const a=point(clamp(from)),b=point(clamp(to)),diff=clamp(to)-clamp(from);return Math.abs(diff)<.0001?'':`M ${a} A ${r} ${r} 0 ${Math.abs(diff)>.6667?1:0} ${diff>0?1:0} ${b}`}
export function wireBatch(generation,sequence,values,changed){const b=Buffer.alloc(12+changed.length*8);b.writeUInt32LE(generation,0);b.writeUInt32LE(sequence,4);b.writeUInt32LE(changed.length,8);changed.forEach((i,n)=>{b.writeUInt32LE(i,12+n*8);b.writeFloatLE(values[i],16+n*8)});return b}
export function readBatch(buffer){const d=new DataView(buffer);if(d.byteLength<12)throw Error('Truncated observation');const count=d.getUint32(8,true);if(count>384||d.byteLength!==12+count*8)throw Error('Invalid observation size');return {generation:d.getUint32(0,true),sequence:d.getUint32(4,true),fields:Array.from({length:count},(_,i)=>[d.getUint32(12+i*8,true),d.getFloat32(16+i*8,true)])}}
// A widget's observation subscribers are independent of React metadata renders.
export function createStore(meta){let metadata=meta,values=null;const configListeners=new Set(),valueListeners=new Set();return {
 get:()=>metadata,observed:()=>values,
 patch:patch=>{metadata={...metadata,...patch};for(const fn of configListeners)fn()},
 observe:next=>{values=next;for(const fn of valueListeners)fn()},
 subscribe:fn=>{configListeners.add(fn);return()=>configListeners.delete(fn)},
 subscribeValues:fn=>{valueListeners.add(fn);return()=>valueListeners.delete(fn)}
}}
