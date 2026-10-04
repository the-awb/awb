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
