// Display interpolation only: raw samples use explicit connections; NaNs split traces.
export function paintScopeTrace(ctx,{samples,format,frames,channel=0,start=0,count,width,middle,scale,gain=1,control=false,mode='connected'}){
 if(control&&format==='minmax')throw new Error('Control traces require ordered samples');
 const y=value=>middle-Math.max(-1,Math.min(1,value*gain))*scale;
 ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.lineCap='round';
 if(format!=='minmax'){
  ctx.beginPath();let previous=null;
  for(let i=0;i<count;i++){
   const value=samples[channel*frames+start+i];if(!Number.isFinite(value)){previous=null;continue;}
   const x=i*width/(count-1),at=y(value);
   if(previous===null)ctx.moveTo(x,at);else{if(mode==='stepped')ctx.lineTo(x,previous);ctx.lineTo(x,at);}previous=at;
  }ctx.stroke();return;
 }
 const low=i=>samples[(channel*frames+start+i)*2],high=i=>samples[(channel*frames+start+i)*2+1];
 const valid=i=>Number.isFinite(low(i))&&Number.isFinite(high(i));
 const center=i=>(i+.5)*width/count,left=i=>i*width/count,right=i=>(i+1)*width/count;
 for(let first=0;first<count;){
  if(!valid(first)){first++;continue;}let end=first+1;while(end<count&&valid(end))end++;
  // Connected upper/lower bounds replace isolated vertical bars. Fill remains behind the outlines.
  ctx.beginPath();ctx.moveTo(left(first),y(high(first)));
  for(let i=first;i<end;i++)ctx.lineTo(center(i),y(high(i)));
  ctx.lineTo(right(end-1),y(high(end-1)));ctx.lineTo(right(end-1),y(low(end-1)));
  for(let i=end-1;i>=first;i--)ctx.lineTo(center(i),y(low(i)));
  ctx.lineTo(left(first),y(low(first)));ctx.closePath();
  const alpha=ctx.globalAlpha;ctx.globalAlpha=alpha*.16;ctx.fill();ctx.globalAlpha=alpha;
  ctx.stroke();first=end;
 }
}
