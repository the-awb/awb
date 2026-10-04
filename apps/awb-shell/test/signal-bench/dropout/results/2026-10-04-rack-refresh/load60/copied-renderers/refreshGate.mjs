// Fixture-only on-demand gate. Paint on rAF, retain latest values, skip missed deadlines.
export function refreshGate(paint){
 let frame=null,deadline=null,disposed=false,pending=false,times=[],durations=[],requests=0;
 const period=()=>1000/Number(globalThis.__rackRefreshHz||30);
 function tick(timestamp){
  frame=null;if(disposed||!pending)return;
  if(deadline===null||timestamp+.5>=deadline){
   pending=false;const t=performance.now();paint();durations.push(performance.now()-t);times.push(timestamp);
   if(deadline===null)deadline=timestamp+period();
   else do{deadline+=period();}while(deadline<=timestamp+.5);
  }
  if(pending&&frame===null)frame=requestAnimationFrame(tick);
 }
 return {
  request(){requests++;pending=true;if(frame===null)frame=requestAnimationFrame(tick);},
  cancel(){pending=false;if(frame!==null)cancelAnimationFrame(frame);frame=null;},
  async flush(){while(pending||frame!==null)await new Promise(r=>setTimeout(r,5));},
  async reset(){await this.flush();times=[];durations=[];requests=0;deadline=null;},
  snapshot(){const intervals=times.slice(1).map((v,i)=>v-times[i]),sorted=[...intervals].sort((a,b)=>a-b),d=[...durations].sort((a,b)=>a-b);return {requestedHz:Number(globalThis.__rackRefreshHz||30),draws:times.length,requests,times,paintDurationTotalMs:durations.reduce((a,b)=>a+b,0),paintDurationP95Ms:d[Math.floor((d.length-1)*.95)]??0,intervalMeanMs:intervals.reduce((a,b)=>a+b,0)/Math.max(1,intervals.length),intervalP95Ms:sorted[Math.floor((sorted.length-1)*.95)]??0,achievedHz:times.length>1?1000*(times.length-1)/(times.at(-1)-times[0]):0,coalescedRequests:requests-times.length};},
  dispose(){disposed=true;this.cancel();}
 };
}
