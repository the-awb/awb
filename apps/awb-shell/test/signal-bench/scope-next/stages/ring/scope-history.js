// Bounded, source-indexed history. Missing chunks remain NaN, never compressed in time.
export class ScopeHistory {
 constructor(baseFrames){this.baseFrames=baseFrames;this.reset();}
 reset(){this.latest=null;this.tags=null;}
 append(packet){
  const step=packet.sourceFrames/packet.frames,start=packet.sourceEnd-packet.sourceFrames;
  if(!Number.isInteger(step)||![1,4,16].includes(step)||!Number.isSafeInteger(packet.sourceEnd))throw new Error('Invalid history chunk');
  const channelIds=packet.channelIds??Array.from({length:packet.channels},(_,i)=>i);
  const identity=[packet.generation,packet.sampleRate,step,packet.sourceChannels??packet.channels].join(':');
  if(this.latest&&identity===this.identity&&packet.sourceEnd<this.latest.sourceEnd)return false;
  let changedChannels=false;
  if(identity!==this.identity||!this.tags){
   this.identity=identity;this.step=step;this.capacity=this.baseFrames*16/step;this.origin=start%step;
   this.tags=new Float64Array(this.capacity);this.tags.fill(NaN);this.complete=new Uint8Array(this.capacity);
   this.low=new Float32Array(this.capacity*packet.channels);this.high=new Float32Array(this.capacity*packet.channels);this.low.fill(NaN);this.high.fill(NaN);
   this.latest=null;this.channelIds=channelIds;
  }else if(channelIds.join(',')!==this.channelIds.join(',')){
   const low=new Float32Array(this.capacity*packet.channels),high=new Float32Array(this.capacity*packet.channels);low.fill(NaN);high.fill(NaN);
   channelIds.forEach((id,ch)=>{const old=this.channelIds.indexOf(id);if(old>=0){low.set(this.low.subarray(old*this.capacity,(old+1)*this.capacity),ch*this.capacity);high.set(this.high.subarray(old*this.capacity,(old+1)*this.capacity),ch*this.capacity)}});
   this.low=low;this.high=high;this.channelIds=channelIds;changedChannels=true;
   // Recompute completeness only when the channel layout changes.
   for(let slot=0;slot<this.capacity;slot++){
    this.complete[slot]=1;
    for(let ch=0;ch<packet.channels;ch++)if(!Number.isFinite(low[ch*this.capacity+slot])||!Number.isFinite(high[ch*this.capacity+slot])){this.complete[slot]=0;break;}
   }
  }
  if((start-this.origin)%step)throw new Error('Misaligned history clock');
  if(this.latest&&packet.sourceEnd<=this.latest.sourceEnd&&!changedChannels)return false;
  const values=packet.format==='minmax'?2:1;
  for(let i=0;i<packet.frames;i++){
   const id=(start+i*step-this.origin)/step,slot=((id%this.capacity)+this.capacity)%this.capacity;
   this.tags[slot]=id;this.complete[slot]=1;
   for(let ch=0;ch<packet.channels;ch++){
    const from=(ch*packet.frames+i)*values,to=ch*this.capacity+slot;
    this.low[to]=packet.samples[from];this.high[to]=packet.samples[from+values-1];
    if(!Number.isFinite(this.low[to])||!Number.isFinite(this.high[to]))this.complete[slot]=0;
   }
  }
  this.latest=packet;return true;
 }
 view(sourceFrames,{reuse}={}){
  if(!this.latest)return null;
  const frames=sourceFrames/this.step,packet=this.latest,values=this.step>1?2:1;
  if(!Number.isInteger(frames)||frames<1||frames>this.capacity)throw new Error('History span exceeds capacity');
  const length=frames*packet.channels*values;
  const samples=reuse instanceof Float32Array&&reuse.length===length?reuse:new Float32Array(length);if(values===2)samples.fill(NaN);
  const first=(packet.sourceEnd-sourceFrames-this.origin)/this.step;let missingBins=0;
  if(values===1){
   const slot=((first%this.capacity)+this.capacity)%this.capacity,head=Math.min(frames,this.capacity-slot);
   for(let ch=0;ch<packet.channels;ch++){
    const base=ch*this.capacity,to=ch*frames;
    samples.set(this.low.subarray(base+slot,base+slot+head),to);
    if(head<frames)samples.set(this.low.subarray(base,base+frames-head),to+head);
   }
   for(let i=0;i<frames;i++){
    const id=first+i,at=(slot+i)%this.capacity;
    if(this.tags[at]!==id){missingBins++;for(let ch=0;ch<packet.channels;ch++)samples[ch*frames+i]=NaN;}
    else if(!this.complete[at])missingBins++;
   }
   return {...packet,frames,sourceFrames,format:'samples',samples,captureFrames:packet.sourceFrames,missingSourceFrames:missingBins*this.step,history:true};
  }
  for(let i=0;i<frames;i++){
   const id=first+i,slot=((id%this.capacity)+this.capacity)%this.capacity;
   if(this.tags[slot]!==id){missingBins++;continue;}
   let incomplete=false;
   for(let ch=0;ch<packet.channels;ch++){
    const from=ch*this.capacity+slot,to=(ch*frames+i)*values;
    samples[to]=this.low[from];if(values===2)samples[to+1]=this.high[from];if(!Number.isFinite(this.low[from])||!Number.isFinite(this.high[from]))incomplete=true;
   }if(incomplete)missingBins++;
  }
  return {...packet,frames,sourceFrames,format:values===2?'minmax':'samples',samples,captureFrames:packet.sourceFrames,missingSourceFrames:missingBins*this.step,history:true};
 }
}
