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
   this.tags=new Float64Array(this.capacity);this.tags.fill(NaN);
   this.low=new Float32Array(this.capacity*packet.channels);this.high=new Float32Array(this.capacity*packet.channels);this.low.fill(NaN);this.high.fill(NaN);
   this.latest=null;this.channelIds=channelIds;
  }else if(channelIds.join(',')!==this.channelIds.join(',')){
   const low=new Float32Array(this.capacity*packet.channels),high=new Float32Array(this.capacity*packet.channels);low.fill(NaN);high.fill(NaN);
   channelIds.forEach((id,ch)=>{const old=this.channelIds.indexOf(id);if(old>=0){low.set(this.low.subarray(old*this.capacity,(old+1)*this.capacity),ch*this.capacity);high.set(this.high.subarray(old*this.capacity,(old+1)*this.capacity),ch*this.capacity)}});
   this.low=low;this.high=high;this.channelIds=channelIds;changedChannels=true;
  }
  if((start-this.origin)%step)throw new Error('Misaligned history clock');
  if(this.latest&&packet.sourceEnd<=this.latest.sourceEnd&&!changedChannels)return false;
  const values=packet.format==='minmax'?2:1;
  for(let i=0;i<packet.frames;i++){
   const id=(start+i*step-this.origin)/step,slot=((id%this.capacity)+this.capacity)%this.capacity;
   this.tags[slot]=id;
   for(let ch=0;ch<packet.channels;ch++){
    const from=(ch*packet.frames+i)*values,to=ch*this.capacity+slot;
    this.low[to]=packet.samples[from];this.high[to]=packet.samples[from+values-1];
   }
  }
  this.latest=packet;return true;
 }
 sampleAt(sourceFrame,channel=0){
  if(!this.latest||this.step!==1||!Number.isSafeInteger(sourceFrame)||!Number.isInteger(channel)||channel<0||channel>=this.latest.channels)return NaN;
  const id=sourceFrame-this.origin,slot=((id%this.capacity)+this.capacity)%this.capacity;
  return this.tags[slot]===id?this.low[channel*this.capacity+slot]:NaN;
 }
 view(sourceFrames,{reuse,end=this.latest?.sourceEnd}={}){
  if(!this.latest)return null;
  const frames=sourceFrames/this.step,packet=this.latest,values=this.step>1?2:1;
  if(!Number.isInteger(frames)||frames<1||frames>this.capacity)throw new Error('History span exceeds capacity');
  if(!Number.isSafeInteger(end)||end>packet.sourceEnd||(end-this.origin)%this.step)throw new Error('Invalid history end');
  const length=frames*packet.channels*values;
  const samples=reuse instanceof Float32Array&&reuse.length===length?reuse:new Float32Array(length);samples.fill(NaN);
  const first=(end-sourceFrames-this.origin)/this.step;let missingBins=0;
  for(let i=0;i<frames;i++){
   const id=first+i,slot=((id%this.capacity)+this.capacity)%this.capacity;
   if(this.tags[slot]!==id){missingBins++;continue;}
   let incomplete=false;
   for(let ch=0;ch<packet.channels;ch++){
    const from=ch*this.capacity+slot,to=(ch*frames+i)*values;
    samples[to]=this.low[from];if(values===2)samples[to+1]=this.high[from];if(!Number.isFinite(this.low[from])||!Number.isFinite(this.high[from]))incomplete=true;
   }if(incomplete)missingBins++;
  }
  return {...packet,sourceEnd:end,frames,sourceFrames,format:values===2?'minmax':'samples',samples,captureFrames:packet.sourceFrames,missingSourceFrames:missingBins*this.step,history:true};
 }
}

// Display-only threshold alignment. Reads one lane from the bounded raw history;
// never crosses missing publications or guesses signal frequency/character.
export function findTriggerWindow(history,{count,channel=0,level=0,edge='rising',mode='connected'}={}){
 if(!history.latest||history.step!==1)return null;
 if(!Number.isInteger(count)||count<2||count+1>history.capacity||!Number.isInteger(channel)||channel<0||channel>=history.latest.channels||!Number.isFinite(level)||!['rising','falling'].includes(edge))throw new Error('Invalid trigger configuration');
 const latest=history.latest.sourceEnd,oldest=Math.max(0,latest-history.capacity),pre=Math.floor((count-1)*.25);
 let runEnd=latest,next=NaN,pending=null;
 for(let i=latest-1;i>=oldest;i--){
  const value=history.sampleAt(i,channel);
  if(!Number.isFinite(value)){runEnd=i;next=NaN;pending=null;continue;}
  if(!pending&&Number.isFinite(next)&&(edge==='rising'?value<level&&next>=level:value>level&&next<=level)){
   const crossing=i+(mode==='stepped'?1:(level-value)/(next-value)),origin=crossing-pre,start=Math.floor(origin),end=start+count+1;
   if(start>=oldest&&end<=runEnd)pending={start,end,fraction:origin-start,crossing,count};
  }
  // Every sample from the pre-trigger start through the post-trigger end is present.
  if(pending&&i<=pending.start)return pending;
  next=value;
 }
 return null;
}
