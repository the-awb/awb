// Node/browser codec. Planar Float32 samples or interleaved min/max pairs per channel.
export const SCOPE_HEADER_BYTES=112;
export const SCOPE_PROTOCOL='awb.scope.v5';
const MAGIC=0x504f4353,VERSION=5;
const littleEndian=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
const kinds=['mic','output','control'],channelCounts=[1,2,6];
export function encodeScopeFrame(kind,snapshot,generation){
 const index=kinds.indexOf(kind),{frames,channels,sampleRate,sequence,samples}=snapshot;
 const sourceFrames=snapshot.sourceFrames??frames,bucketed=snapshot.format==='minmax',values=bucketed?2:1;
 const blockSize=snapshot.blockSize??64,audioSampleRate=snapshot.audioSampleRate??(kind==='control'?sampleRate*blockSize:sampleRate);
 const sourceChannels=snapshot.sourceChannels??channelCounts[index],channelIds=snapshot.channelIds??Array.from({length:channels},(_,i)=>i);
 const validIds=channelIds.length===channels&&channelIds.every((id,i)=>Number.isInteger(id)&&id>=0&&id<sourceChannels&&(!i||id>channelIds[i-1]));
 if(index<0||sourceChannels!==channelCounts[index]||channels<1||channels>sourceChannels||!validIds||!Number.isInteger(frames)||frames<1||frames>2048||!Number.isInteger(sourceFrames)||sourceFrames<frames||sourceFrames>16384||!bucketed&&sourceFrames!==frames||!(samples instanceof Float32Array)||samples.length!==frames*channels*values||!Number.isFinite(sampleRate)||sampleRate<=0)throw new Error('Invalid scope snapshot');
 const sourceEnd=snapshot.sourceEnd;
 if(!Number.isSafeInteger(sourceEnd)||sourceEnd<sourceFrames)throw new Error('Invalid scope source clock');
 const buffer=new ArrayBuffer(SCOPE_HEADER_BYTES+samples.byteLength),view=new DataView(buffer);
 view.setUint32(0,MAGIC,true);view.setUint16(4,VERSION,true);view.setUint8(6,index);view.setUint8(7,channels);
 view.setUint32(8,frames,true);view.setUint32(12,sequence,true);view.setFloat64(16,sampleRate,true);
 for(let ch=0;ch<channels;ch++){view.setFloat32(24+ch*4,snapshot.peaks[ch],true);view.setFloat32(48+ch*4,snapshot.rms[ch],true);}
 view.setUint32(72,generation,true);view.setUint32(76,sourceFrames,true);
 view.setUint32(80,(bucketed?1:0)|(index===2?2:0),true);view.setUint32(84,blockSize,true);view.setFloat64(88,audioSampleRate,true);view.setFloat64(96,sourceEnd,true);
 view.setUint32(104,channelIds.reduce((mask,id)=>mask|(1<<id),0),true);view.setUint8(108,sourceChannels);
 if(littleEndian)new Float32Array(buffer,SCOPE_HEADER_BYTES).set(samples);
 else for(let i=0;i<samples.length;i++)view.setFloat32(SCOPE_HEADER_BYTES+i*4,samples[i],true);
 return buffer;
}
export function decodeScopeFrame(input,expectedKind,expectedGeneration){
 const buffer=input instanceof ArrayBuffer?input:input?.buffer,offset=input instanceof ArrayBuffer?0:input?.byteOffset,length=input?.byteLength;
 if(!(buffer instanceof ArrayBuffer)||length<104)throw new Error('Truncated scope frame');
 const view=new DataView(buffer,offset,length),index=view.getUint8(6),channels=view.getUint8(7),frames=view.getUint32(8,true),generation=view.getUint32(72,true);
 const version=view.getUint16(4,true),header=version===4?104:SCOPE_HEADER_BYTES;
 if(length<header)throw new Error('Truncated scope frame');
 if(view.getUint32(0,true)!==MAGIC||![4,VERSION].includes(version))throw new Error('Unsupported scope frame');
 const sourceChannels=version===4?channels:view.getUint8(108),mask=version===4?(1<<channels)-1:view.getUint32(104,true);
 const channelIds=Array.from({length:sourceChannels},(_,i)=>i).filter(id=>mask&(1<<id));
 const sourceFrames=view.getUint32(76,true),flags=view.getUint32(80,true),bucketed=!!(flags&1),values=bucketed?2:1;
 if(index>2||sourceChannels!==channelCounts[index]||channels<1||channels>sourceChannels||channelIds.length!==channels||mask>>>sourceChannels||version===5&&(view.getUint8(109)||view.getUint16(110,true))||frames<1||frames>2048||sourceFrames<frames||sourceFrames>16384||!bucketed&&sourceFrames!==frames||flags>3||!!(flags&2)!==(index===2)||length!==header+frames*channels*values*4)throw new Error('Invalid scope dimensions');
 const kind=kinds[index],sampleRate=view.getFloat64(16,true),blockSize=view.getUint32(84,true),audioSampleRate=view.getFloat64(88,true);
 if(expectedKind!==undefined&&kind!==expectedKind||expectedGeneration!==undefined&&generation!==expectedGeneration)throw new Error('Scope identity mismatch');
 if(!Number.isFinite(sampleRate)||sampleRate<=0||sampleRate>768000||!Number.isFinite(audioSampleRate)||audioSampleRate<=0||audioSampleRate>768000||blockSize<1||blockSize>8192||Math.abs(sampleRate-(index===2?audioSampleRate/blockSize:audioSampleRate))>sampleRate*1e-8)throw new Error('Invalid scope sample rate');
 const sourceEnd=view.getFloat64(96,true);if(!Number.isSafeInteger(sourceEnd)||sourceEnd<sourceFrames)throw new Error('Invalid scope source clock');
 const peaks=[],rms=[];
 for(let ch=0;ch<channels;ch++){peaks.push(view.getFloat32(24+ch*4,true));rms.push(view.getFloat32(48+ch*4,true));}
 if([...peaks,...rms].some(n=>!Number.isFinite(n)||n<0))throw new Error('Invalid scope levels');
 let samples;
 if(littleEndian&&(offset+header)%4===0)samples=new Float32Array(buffer,offset+header,frames*channels*values);
 else {samples=new Float32Array(frames*channels*values);for(let i=0;i<samples.length;i++)samples[i]=view.getFloat32(header+i*4,true);}
 return {kind,generation,channelIds,sourceChannels,version,frames,sourceFrames,sourceEnd,format:bucketed?'minmax':'samples',channels,sampleRate,audioSampleRate,blockSize,sequence:view.getUint32(12,true),peaks,rms,samples};
}

// Select whole planar lanes. Samples remain owned and immutable while sockets are in flight.
export function selectScopeChannels(snapshot,ids){
 const available=snapshot.channelIds??Array.from({length:snapshot.channels},(_,i)=>i),sourceChannels=snapshot.sourceChannels??snapshot.channels;
 if(!Array.isArray(ids)||!ids.length||ids.some((id,i)=>!Number.isInteger(id)||!available.includes(id)||i&&id<=ids[i-1]))throw new Error('Invalid scope channel selection');
 if(ids.length===available.length&&ids.every((id,i)=>id===available[i]))return snapshot;
 const values=snapshot.format==='minmax'?2:1,stride=snapshot.frames*values,samples=new Float32Array(stride*ids.length),indices=ids.map(id=>available.indexOf(id));
 indices.forEach((ch,i)=>samples.set(snapshot.samples.subarray(ch*stride,(ch+1)*stride),i*stride));
 return {...snapshot,channels:ids.length,sourceChannels,channelIds:ids,samples,peaks:indices.map(i=>snapshot.peaks[i]),rms:indices.map(i=>snapshot.rms[i])};
}
