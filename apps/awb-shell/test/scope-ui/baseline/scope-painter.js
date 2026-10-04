// Paint deadlines only. Capture, acknowledgements and history stay outside this scheduler.
export class ScopePainter {
 constructor({paint,fps=0,now=()=>performance.now(),requestFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id),setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}){
  if(typeof paint!=='function')throw new Error('Scope painter needs paint');
  Object.assign(this,{paint,now,requestFrame,cancelFrame,setTimer,clearTimer});
  this.frame=null;this.timer=null;this.closed=false;this.dirty=false;this.lastPaint=-Infinity;this.nextDue=-Infinity;
  this.urgent=false;this.count=0;this.times=new Float64Array(512);this.fps=this.validate(fps);
 }
 validate(fps){if(![0,15,30].includes(fps))throw new Error('Invalid scope paint rate');return fps;}
 setRate(fps){this.fps=this.validate(fps);this.invalidate(true);}
 invalidate(immediate=false){
  if(this.closed)return;this.dirty=true;this.urgent||=immediate;
  if(immediate&&this.timer!==null){this.clearTimer(this.timer);this.timer=null;}
  if(this.frame!==null||this.timer!==null)return;
  const wait=immediate||!this.fps?0:this.nextDue-this.now()-4;
  if(wait>0){this.timer=this.setTimer(()=>{this.timer=null;this.queueFrame();},wait);}
  else this.queueFrame();
 }
 queueFrame(){if(this.closed||!this.dirty||this.frame!==null)return;
  this.frame=this.requestFrame(timestamp=>{
   this.frame=null;if(this.closed||!this.dirty)return;
   const at=Number.isFinite(timestamp)?timestamp:this.now();
   if(!this.urgent&&this.fps&&at+0.25<this.nextDue){this.queueFrame();return;}
   if(this.fps){const period=1000/this.fps;this.nextDue=this.urgent||!Number.isFinite(this.nextDue)?at+period:this.nextDue+Math.max(1,Math.floor((at-this.nextDue)/period)+1)*period;}
   this.dirty=false;this.urgent=false;this.lastPaint=at;this.times[this.count%this.times.length]=this.lastPaint;this.count++;
   this.paint();
  });
 }
 diagnostics(){const n=Math.min(this.count,this.times.length),start=this.count-n;return {fps:this.fps,paints:this.count,now:this.now(),paintTimes:Array.from({length:n},(_,i)=>this.times[(start+i)%this.times.length])};}
 close(){this.closed=true;this.dirty=false;if(this.frame!==null)this.cancelFrame(this.frame);if(this.timer!==null)this.clearTimer(this.timer);this.frame=null;this.timer=null;}
}
