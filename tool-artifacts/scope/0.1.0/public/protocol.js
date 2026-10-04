// Generic bus scopes use their own binary protocol; the looper's v5 wire format is untouched.
export const BUS_SCOPE_PROTOCOL='awb.bus-scope.v1';
const MAGIC=0x42534341,VERSION=1,BASE=64;
const littleEndian=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
function dimensions(packet){
 const {channels,frames,sourceFrames,sourceEnd,sampleRate,audioSampleRate,blockSize,bus,rate,format,generation,sequence}=packet;
 const values=format==='minmax'?2:1;
 if(!Number.isInteger(channels)||channels<1||channels>16||!Number.isInteger(frames)||frames<1||frames>2048||!Number.isInteger(sourceFrames)||sourceFrames<frames||sourceFrames>16384||![1,4,16].includes(sourceFrames/frames)||values===1&&sourceFrames!==frames||!['samples','minmax'].includes(format)||!['audio','control'].includes(rate)||rate==='control'&&values!==1||!Number.isInteger(bus)||bus<0||bus>65535||!Number.isSafeInteger(sourceEnd)||sourceEnd<sourceFrames||!Number.isInteger(generation)||generation<1||generation>0xffffffff||!Number.isInteger(sequence)||sequence<1||sequence>0xffffffff||!Number.isFinite(sampleRate)||sampleRate<=0||sampleRate>768000||!Number.isFinite(audioSampleRate)||audioSampleRate<=0||audioSampleRate>768000||!Number.isInteger(blockSize)||blockSize<1||blockSize>8192||Math.abs(sampleRate-(rate==='control'?audioSampleRate/blockSize:audioSampleRate))>sampleRate*1e-8)throw new Error('Invalid bus scope dimensions');
 return values;
}
export function encodeBusScopeFrame(packet){
 const values=dimensions(packet),{channels,samples}=packet,header=BASE+channels*8;
 if(!(samples instanceof Float32Array)||samples.length!==packet.frames*channels*values||packet.peaks?.length!==channels||packet.rms?.length!==channels||[...packet.peaks,...packet.rms].some(n=>!Number.isFinite(n)||n<0))throw new Error('Invalid bus scope samples/levels');
 const buffer=new ArrayBuffer(header+samples.byteLength),view=new DataView(buffer);
 view.setUint32(0,MAGIC,true);view.setUint16(4,VERSION,true);view.setUint8(6,(packet.rate==='control'?1:0)|(values===2?2:0));view.setUint8(7,channels);
 view.setFloat64(8,packet.sampleRate,true);view.setFloat64(16,packet.audioSampleRate,true);view.setUint32(24,packet.frames,true);view.setUint32(28,packet.sourceFrames,true);view.setFloat64(32,packet.sourceEnd,true);
 view.setUint32(40,packet.generation,true);view.setUint32(44,packet.sequence,true);view.setUint32(48,packet.bus,true);view.setUint32(52,packet.blockSize,true);view.setUint32(56,header,true);
 for(let ch=0;ch<channels;ch++){view.setFloat32(BASE+ch*8,packet.peaks[ch],true);view.setFloat32(BASE+ch*8+4,packet.rms[ch],true);}
 if(littleEndian)new Float32Array(buffer,header).set(samples);else for(let i=0;i<samples.length;i++)view.setFloat32(header+i*4,samples[i],true);
 return buffer;
}
export function decodeBusScopeFrame(input,expectedGeneration){
 const buffer=input instanceof ArrayBuffer?input:input?.buffer,offset=input instanceof ArrayBuffer?0:input?.byteOffset,length=input?.byteLength;
 if(!(buffer instanceof ArrayBuffer)||length<BASE)throw new Error('Truncated bus scope frame');
 const view=new DataView(buffer,offset,length),flags=view.getUint8(6),channels=view.getUint8(7),header=view.getUint32(56,true);
 if(view.getUint32(0,true)!==MAGIC||view.getUint16(4,true)!==VERSION||flags>3||header!==BASE+channels*8||view.getUint32(60,true)!==0)throw new Error('Unsupported bus scope frame');
 const packet={channels,frames:view.getUint32(24,true),sourceFrames:view.getUint32(28,true),sourceEnd:view.getFloat64(32,true),sampleRate:view.getFloat64(8,true),audioSampleRate:view.getFloat64(16,true),blockSize:view.getUint32(52,true),bus:view.getUint32(48,true),rate:flags&1?'control':'audio',format:flags&2?'minmax':'samples',generation:view.getUint32(40,true),sequence:view.getUint32(44,true)};
 const values=dimensions(packet);if(length!==header+packet.frames*channels*values*4||expectedGeneration!==undefined&&packet.generation!==expectedGeneration)throw new Error('Bus scope length/identity mismatch');
 packet.peaks=[];packet.rms=[];
 for(let ch=0;ch<channels;ch++){packet.peaks.push(view.getFloat32(BASE+ch*8,true));packet.rms.push(view.getFloat32(BASE+ch*8+4,true));}
 if([...packet.peaks,...packet.rms].some(n=>!Number.isFinite(n)||n<0))throw new Error('Invalid bus scope levels');
 if(littleEndian&&(offset+header)%4===0)packet.samples=new Float32Array(buffer,offset+header,packet.frames*channels*values);
 else{packet.samples=new Float32Array(packet.frames*channels*values);for(let i=0;i<packet.samples.length;i++)packet.samples[i]=view.getFloat32(header+i*4,true);}
 packet.sourceChannels=channels;packet.channelIds=Array.from({length:channels},(_,i)=>i);return packet;
}
