// Human-readable metadata only. Sample history and waveform painting never wait for this timer.
export class ScopeMetadata {
 constructor({update,hz=8,now=()=>performance.now(),setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}){
  if(typeof update!=='function'||!Number.isFinite(hz)||hz<=0)throw new Error('Invalid scope metadata scheduler');
  Object.assign(this,{update,now,setTimer,clearTimer});this.period=1000/hz;this.last=-Infinity;this.timer=null;this.dirty=false;this.closed=false;
 }
 invalidate(){if(this.closed)return;this.dirty=true;if(this.timer===null)this.timer=this.setTimer(()=>{this.timer=null;this.flush();},Math.max(0,this.last+this.period-this.now()));}
 flush(){if(this.timer!==null){this.clearTimer(this.timer);this.timer=null;}if(this.closed||!this.dirty)return;this.dirty=false;this.last=this.now();this.update();}
 close(){this.closed=true;this.dirty=false;if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;}
}

// Compact observed-level widgets. No audio routing, extra subscription or rAF loop.
export const amplitudeDB=value=>value>0?Math.max(-60,20*Math.log10(value)):-60;
export class MeterLevels {
 constructor(channels,rate){this.rate=rate;this.channels=channels;this.reset();}
 reset(){this.lanes=Array.from({length:this.channels},()=>({peak:0,sum:0,weight:0,current:0,low:Infinity,high:-Infinity,rms:0,held:0,holdUntil:0}));this.packets=0;}
 append(packet){
  if(packet.channels!==this.channels||packet.rate!==this.rate)throw new Error('Meter routing mismatch');
  for(let ch=0;ch<this.channels;ch++){
   const lane=this.lanes[ch];lane.peak=Math.max(lane.peak,packet.peaks[ch]);lane.sum+=packet.rms[ch]**2*packet.sourceFrames;lane.weight+=packet.sourceFrames;
   if(this.rate==='control')for(let i=0;i<packet.frames;i++){
    const v=packet.samples[ch*packet.frames+i];if(!Number.isFinite(v))continue;
    lane.low=Math.min(lane.low,v);lane.high=Math.max(lane.high,v);lane.current=v;
   }
  }
  this.packets++;
 }
 take(now){return this.lanes.map(lane=>{
  if(lane.weight){lane.rms=Math.sqrt(lane.sum/lane.weight);if(lane.peak>=lane.held||now>=lane.holdUntil){lane.held=lane.peak;lane.holdUntil=now+600;}}
  const result={rms:lane.rms,peak:lane.held,current:lane.current,low:Number.isFinite(lane.low)?lane.low:lane.current,high:Number.isFinite(lane.high)?lane.high:lane.current};
  lane.peak=0;lane.sum=0;lane.weight=0;lane.low=Infinity;lane.high=-Infinity;return result;
 });}
}
export class CanvasBusMeters {
 constructor(container,{now=()=>performance.now(),dpr=()=>globalThis.devicePixelRatio||1}={}){this.container=container;this.now=now;this.dpr=dpr;this.key='';this.widgets=[];this.updates=0;this.paints=0;}
 configure(configuration){
  const key=configuration?[configuration.bus,configuration.channels,configuration.rate].join(':'):'';
  if(key===this.key)return;this.key=key;this.container.replaceChildren();this.widgets=[];
  this.levels=configuration?new MeterLevels(configuration.channels,configuration.rate):null;
  if(!configuration)return;
  this.widgets=Array.from({length:configuration.channels},(_,ch)=>{
   const canvas=this.container.ownerDocument.createElement('canvas');canvas.setAttribute('role','img');
   canvas.setAttribute('aria-label',`Bus ${configuration.bus+ch}: ${configuration.rate==='audio'?'RMS dBFS and held peak':'signed control value and observed range'}`);
   canvas.dataset.bus=String(configuration.bus+ch);this.container.append(canvas);
   return {canvas,ctx:canvas.getContext('2d'),bus:configuration.bus+ch,key:''};
  });
 }
 append(packet){this.levels?.append(packet);}
 render(){
  if(!this.levels||this.container.hidden)return;const levels=this.levels.take(this.now()),dpr=this.dpr();this.updates++;
  this.widgets.forEach((widget,ch)=>{
   const {canvas,ctx,bus}=widget,rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;if(w<1||h<1)return;
   const width=Math.round(w*dpr),height=Math.round(h*dpr),lane=levels[ch],audio=this.levels.rate==='audio',left=7,right=w-7,span=right-left;
   const x=value=>left+span*Math.max(0,Math.min(1,audio?(amplitudeDB(value)+60)/60:(value+1)/2));
   const value=audio?lane.rms:lane.current,label=audio?(value>0?amplitudeDB(value).toFixed(1)+' dB':'−∞ dB'):value.toFixed(3);
   const key=[width,height,dpr,Math.round(x(value)*dpr),Math.round(x(lane.peak)*dpr),Math.round(x(lane.low)*dpr),Math.round(x(lane.high)*dpr),label,lane.peak>=1].join(':');if(key===widget.key)return;widget.key=key;
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#111a1e';ctx.fillRect(0,0,w,h);
   ctx.font='9px -apple-system, sans-serif';ctx.fillStyle='#8aa29d';ctx.textAlign='left';ctx.fillText('Bus '+bus,left,12);ctx.textAlign='right';ctx.fillStyle='#d8e3df';ctx.fillText(label,right,12);
   ctx.fillStyle='#243438';ctx.fillRect(left,21,span,10);
   if(audio){ctx.fillStyle=lane.peak>=1?'#ed97bd':'#6ce0c1';ctx.fillRect(left,21,x(value)-left,10);ctx.fillStyle='#ffb276';ctx.fillRect(Math.min(right-1,x(lane.peak)),20,1,12);}
   else{
    const center=x(0);ctx.globalAlpha=.2;ctx.fillStyle='#80bcff';ctx.fillRect(x(lane.low),20,Math.max(1,x(lane.high)-x(lane.low)),12);ctx.globalAlpha=1;
    ctx.fillStyle=Math.abs(value)>1?'#ffb276':'#80bcff';ctx.fillRect(Math.min(center,x(value)),21,Math.abs(x(value)-center),10);ctx.fillStyle='#8aa29d';ctx.fillRect(center,20,1,12);
   }
   this.paints++;
  });
 }
 clear(){this.configure(null);}
}
