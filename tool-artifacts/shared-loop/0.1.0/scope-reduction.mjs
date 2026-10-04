// Per-view display derivation. Raw source PCM is never reduced or mutated.
export class ScopeReduction {
 constructor(kind){this.kind=kind;this.previous=null;}
 append(frame,info,step=1){
  if(![1,4,16].includes(step))throw new Error('Invalid scope reduction');
  let raw=frame.samples,sourceFrames=frame.frames;
  if(this.kind!=='control'){
   const previous=this.previous;this.previous=frame;
   if(!previous||previous.channels!==frame.channels||previous.sourceEnd!==frame.sourceEnd-frame.frames)return null;
   sourceFrames=frame.frames*2;raw=new Float32Array(sourceFrames*frame.channels);
   for(let ch=0;ch<frame.channels;ch++){
    raw.set(previous.samples.subarray(ch*frame.frames,(ch+1)*frame.frames),ch*sourceFrames);
    raw.set(frame.samples.subarray(ch*frame.frames,(ch+1)*frame.frames),ch*sourceFrames+frame.frames);
   }
   this.previous=null;
  }
  const frames=sourceFrames/step,channels=frame.channels,peaks=[],rms=[];
  const samples=step===1?raw:new Float32Array(frames*channels*2);
  for(let ch=0;ch<channels;ch++){
   let peak=0,sum=0;
   for(let i=0;i<sourceFrames;i++){const v=raw[ch*sourceFrames+i];peak=Math.max(peak,Math.abs(v));sum+=v*v;}
   peaks.push(peak);rms.push(Math.sqrt(sum/sourceFrames));
   if(step>1)for(let i=0;i<frames;i++){
    let low=Infinity,high=-Infinity;
    for(let j=0;j<step;j++){const v=raw[ch*sourceFrames+i*step+j];low=Math.min(low,v);high=Math.max(high,v);}
    const at=(ch*frames+i)*2;samples[at]=low;samples[at+1]=high;
   }
  }
  return {frames,channels,sourceFrames,sourceEnd:frame.sourceEnd,samples,peaks,rms,format:step===1?'samples':'minmax',sampleRate:info.sampleRate,audioSampleRate:info.audioSampleRate,blockSize:info.blockSize};
 }
}
