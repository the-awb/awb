// Aggregate real physical bins for the visible span, bounding the HTTP payload.
export function channelView(wave,seconds,maxBins=1024){
 if(!wave?.envelope?.length||!wave.frames)return wave;
 const rawBins=wave.envelope.length/2,rawWidth=Math.ceil(wave.frames/rawBins);
 const factor=Math.max(1,Math.ceil(Math.min(wave.frames,seconds*wave.sampleRate)/rawWidth/maxBins));
 const binWidth=rawWidth*factor,bins=Math.ceil(wave.frames/binWidth);
 const frame=((wave.position-1)%wave.frames+wave.frames)%wave.frames;
 const oldest=((frame-Math.ceil(Math.min(seconds*wave.sampleRate,wave.frames-1)))%wave.frames+wave.frames)%wave.frames;
 const first=Math.floor(oldest/binWidth),last=Math.floor(frame/binWidth);
 const full=seconds*wave.sampleRate>=wave.frames-1;
 const count=full?bins:(last-first+bins)%bins+1,binOffset=full?0:first;
 const envelope=[];
 function extrema(start,end){
  let lo=Infinity,hi=-Infinity;
  for(let b=start;b<end&&b*rawWidth<wave.frames;b++){lo=Math.min(lo,wave.envelope[b*2]);hi=Math.max(hi,wave.envelope[b*2+1]);}
  return lo===Infinity?[0,0]:[lo,hi];
 }
 for(let j=0;j<count;j++){const b=(binOffset+j)%bins;envelope.push(...extrema(b*factor,(b+1)*factor));}
 const prefixFrames=wave.position%binWidth;
 let prefix=[0,0];
 if(prefixFrames){
  const start=Math.floor(wave.position/binWidth)*factor,end=Math.floor(wave.position/rawWidth);
  prefix=extrema(start,end);
  if(wave.prefixFrames>0&&wave.prefix){prefix=end===start?[...wave.prefix]:[Math.min(prefix[0],wave.prefix[0]),Math.max(prefix[1],wave.prefix[1])];}
 }
 return {...wave,envelope,bins,binWidth,binOffset,prefixFrames,prefix,sourceBins:rawBins};
}
export function waveformView(wave,seconds){
 if(!wave)return wave;
 const channels=wave.channels?.map(c=>channelView(c,seconds));
 return channels?{...channels[0],peak:wave.peak,channels}:channelView(wave,seconds);
}
