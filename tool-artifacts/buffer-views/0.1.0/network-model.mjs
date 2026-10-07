// Performance controls for the first executable, acyclic delay-network graph.
export const ids=['B1','A2','A1','B2'];
// Classic stereo feedback paths: paired direct returns, then paired cross returns.
export const headPaths=[{source:0,returnChannel:0,label:'L→L'},{source:1,returnChannel:1,label:'R→R'},{source:1,returnChannel:0,label:'R→L'},{source:0,returnChannel:1,label:'L→R'}];
export const colours=['#72cbb8','#e6be75','#b79ae5','#86b9ef'];
export const sendDestinations=id=>[...ids.slice(ids.indexOf(id)+1),'monitor'];
export function headPreset(mode){
  const times=mode==='quad'?[.25,.5,.75,1]:[.5,.5,1,1];
  return times.map((value,i)=>({id:`h${i+1}`,enabled:mode==='A'?i<2:mode==='B'?i>=2:true,unit:'fraction',value,amount:1,left:i%2?0:.5,right:i%2?.5:0}));
}
// A legacy loop-mode action chooses its base value; head toggles never normalize feedback.
export const loopFeedback=cell=>cell.heads.filter(h=>h.enabled).length===4?.5:1;
export function defaults(){
  const periods=[8,2,.5,16],modes=['AB','quad','quad','AB'];
  const routes={};ids.forEach((to,i)=>{routes[`clean:${to}`]=i===0?1:0;ids.slice(0,i).forEach(from=>routes[`${from}:${to}`]=ids[i-1]===from?1:0);routes[`${to}:monitor`]=i===3?1:0;});
  return {version:1,reserveSeconds:32,tempo:120,globalInput:1,master:0,source:'tone',inputChannel:0,frequency:220,toneLevel:.1,
    cells:ids.map((id,i)=>({id,seconds:periods[i],timingMode:'seconds',beats:periods[i]*2,divisor:4,triplet:false,effectLevel:1,dryLevel:0,inputGain:1,feedback:i===2?.4:.5,running:true,heads:headPreset(modes[i]).map(h=>({...h,sends:Object.fromEntries(sendDestinations(id).map(to=>[to,0]))})),preset:modes[i]})),routes};
}
export const beatSeconds=(cell,tempo)=>60/tempo*cell.beats*4/cell.divisor*(cell.triplet?2/3:1);
const number=(v,min,max,name)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error(`${name} must be ${min}–${max}`);};
export function validate(candidate){
  const c=structuredClone(candidate),keys=Object.keys(defaults().routes);
  if(c.version!==1||c.reserveSeconds!==32||!Array.isArray(c.cells)||c.cells.length!==4)throw new Error('This view requires the four-cell, classic stereo layout');
  c.tempo??=120;number(c.tempo,20,400,'Tempo');
  number(c.globalInput,0,1,'Clean availability');number(c.master,0,.8,'Master');number(c.frequency,20,2000,'Frequency');number(c.toneLevel,0,.3,'Test level');
  if(!Number.isInteger(c.inputChannel)||c.inputChannel<0||c.inputChannel>16)throw new Error('Input channel must be 1–17');
  if(!['tone','cello'].includes(c.source))throw new Error('Unknown input source');
  if(!c.routes||Object.keys(c.routes).length!==keys.length||keys.some(k=>!(k in c.routes)))throw new Error('Unknown route or unsupported return cycle');
  keys.forEach(k=>number(c.routes[k],0,1,k));
  c.cells.forEach((cell,i)=>{
    if(cell.id!==ids[i]||typeof cell.running!=='boolean')throw new Error('Unknown cell');
    cell.fadeGate??=true;cell.fadeIn??=2;cell.fadeOut??=2;
    if(typeof cell.fadeGate!=="boolean")throw new Error("Invalid fade gate");number(cell.fadeIn,.01,30,"Fade in time");number(cell.fadeOut,.01,30,"Fade out time");
    cell.effectLevel??=1;cell.dryLevel??=0;cell.timingMode??='seconds';cell.beats??=cell.seconds*c.tempo/60;cell.divisor??=4;cell.triplet??=false;
    number(cell.effectLevel,0,2,'FX level');number(cell.dryLevel,0,1,'Dry level');number(cell.beats,.001,256,'Beats');
    if(!['seconds','beats'].includes(cell.timingMode)||![1,2,4,8,16,32,64].includes(cell.divisor)||typeof cell.triplet!=='boolean')throw new Error('Invalid rhythmic timing');
    if(cell.timingMode==='beats')cell.seconds=beatSeconds(cell,c.tempo);
    number(cell.seconds,.01,c.reserveSeconds,'Head timing span');number(cell.inputGain,0,2,'Input');number(cell.feedback,0,1.1,'Feedback');
    if(!Array.isArray(cell.heads)||cell.heads.length!==4)throw new Error('Four declared heads required');
    cell.heads.forEach((h,j)=>{if(h.id!==`h${j+1}`||typeof h.enabled!=='boolean'||!['fraction','seconds'].includes(h.unit))throw new Error('Invalid head');
      h.amount??=1;number(h.amount,0,1,'Head amount');
      number(h.value,h.unit==='fraction'?.01:.000125,h.unit==='fraction'?1:c.reserveSeconds,'Head time');number(h.left,0,1,'Left gain');number(h.right,0,1,'Right gain');
      const destinations=sendDestinations(cell.id);if(!h.sends||Object.keys(h.sends).length!==destinations.length||destinations.some(to=>!(to in h.sends)))throw new Error('Invalid head destinations');destinations.forEach(to=>number(h.sends[to],0,1,'Head send'));});
  });return c;
}
export function command(current,p){
  const c=structuredClone(current);let clear=null;
  if(p.action==='global'&&['globalInput','master','source','inputChannel','frequency','toneLevel','tempo'].includes(p.field))c[p.field]=p.value;
  else if(['cell','head','headSend','preset','mode','clear'].includes(p.action)){
    const cell=c.cells.find(v=>v.id===p.cell);if(!cell)throw new Error('Unknown cell');
    if(p.action==='clear')clear=cell.id;
    else if(p.action==='preset'){if(!['AB','A','B','quad'].includes(p.value))throw new Error('Unknown head preset');cell.heads=headPreset(p.value).map((h,i)=>({...h,amount:cell.heads[i].amount,sends:cell.heads[i].sends}));cell.preset=p.value;}
    else if(p.action==='mode'){
      const feedback=loopFeedback(cell),values={record:[1,0],overdub:[1,feedback],hold:[0,feedback],off:[0,0]};if(!values[p.value])throw new Error('Unknown mode');[cell.inputGain,cell.feedback]=values[p.value];
    }else if(p.action==='headSend'){const h=cell.heads.find(h=>h.id===p.head);if(!h||!(p.to in h.sends))throw new Error('Unsupported head send');h.sends[p.to]=p.value;
    }else if(p.action==='cell'&&['seconds','inputGain','feedback','running','effectLevel','dryLevel','timingMode','beats','divisor','triplet','fadeGate','fadeIn','fadeOut'].includes(p.field)){cell[p.field]=p.value;if(p.field==='seconds')cell.timingMode='seconds';if(['beats','divisor','triplet'].includes(p.field))cell.timingMode='beats';}
    else if(p.action==='head'){
      const h=cell.heads.find(v=>v.id===p.head);if(!h)throw new Error('Unknown head');
      if(!p.patch||Object.keys(p.patch).some(k=>!['enabled','unit','value','left','right','amount'].includes(k)))throw new Error('Invalid head edit');Object.assign(h,p.patch);cell.preset='custom';
    }else throw new Error('Unsupported cell edit');
  }else if(p.action==='route'&&p.id in c.routes)c.routes[p.id]=p.value;
  else throw new Error('Unsupported control');
  return {config:validate(c),clear};
}
export function graphFor(c){
  c=validate(c);
  const graph={version:1,buffers:ids.map(id=>({id:`memory-${id}`,channels:2,labels:['L','R'],capacitySeconds:c.reserveSeconds})),
    nodes:[{id:'clean',kind:'input',ports:[{id:'out',direction:'out',channels:1,labels:['mono']}]}],connections:[]};
  c.cells.forEach(cell=>{graph.nodes.push({id:cell.id,kind:'cell',periodSeconds:cell.seconds,layout:{kind:'fitted',headSlots:4},
    ports:[{id:'record',direction:'in',channels:2,labels:['L','R']},{id:'wet',direction:'out',channels:2,labels:['L','R']},...cell.heads.map(h=>({id:'tap-'+h.id,direction:'out',channels:2,labels:['L','R']}))],mix:{input:'record',output:'wet',mapping:'identity'},writer:{buffer:`memory-${cell.id}`,port:'record',mapping:'identity'},
    heads:cell.heads.map((h,i)=>({id:h.id,level:h.amount,source:{buffer:`memory-${cell.id}`,channel:headPaths[i].source},delay:{unit:h.unit,value:h.value},returns:[{channel:headPaths[i].returnChannel,gain:1}],destinations:[{port:'wet',channel:0,gain:h.left},{port:'wet',channel:1,gain:h.right},{port:'tap-'+h.id,channel:0,gain:h.left},{port:'tap-'+h.id,channel:1,gain:h.right}]}))});});
  graph.nodes.push({id:'monitor',kind:'output',ports:[{id:'in',direction:'in',channels:2,labels:['L','R']}]});
  Object.keys(c.routes).forEach(id=>{const [from,to]=id.split(':');graph.connections.push({id,from:{node:from,port:from==='clean'?'out':'wet'},to:{node:to,port:to==='monitor'?'in':'record'},
    mapping:from==='clean'?[{from:0,to:0,gain:1},{from:0,to:1,gain:1}]:'identity'});});
  c.cells.forEach(cell=>cell.heads.forEach(h=>sendDestinations(cell.id).forEach(to=>graph.connections.push({id:`${cell.id}/${h.id}:${to}`,from:{node:cell.id,port:'tap-'+h.id},to:{node:to,port:to==='monitor'?'in':'record'},mapping:'identity'}))));return graph;
}
export const headSeconds=(head,period)=>head.value*(head.unit==='fraction'?period:1);
export function timeline(cell,wave){
  const observed=wave&&wave.sampleRate>0&&wave.recorded>0?wave.recorded/wave.sampleRate:null;
  const period=observed??cell.seconds;
  const taps=cell.heads.map(h=>({...h,seconds:wave?Math.max(1,Math.round(headSeconds(h,period)*wave.sampleRate))/wave.sampleRate:headSeconds(h,period)}));
  const horizon=Math.max(period,...taps.map(h=>h.seconds));
  return {period,target:cell.seconds,observed:observed!==null,horizon,taps:taps.map(h=>({...h,x:h.seconds/horizon}))};
}
// Summaries refer to the physical ring, never the target period. Re-index them
// by age behind the write pointer; do not manufacture finer audio samples.
export function ageEnvelope(wave,seconds){
  if(!wave||!wave.envelope?.length||wave.frames<1||wave.sampleRate<=0)return [0,0];
  const frame=((wave.position-1-Math.round(seconds*wave.sampleRate))%wave.frames+wave.frames)%wave.frames;
  const bins=wave.bins??wave.envelope.length/2,width=wave.binWidth??Math.ceil(wave.frames/bins);
  const bin=Math.min(bins-1,Math.floor(frame/width));
  // Prefix extrema must never include old material ahead of the writer.
  if(wave.prefixFrames>0&&frame<wave.position&&bin===Math.floor(wave.position/width))return wave.prefix;
  const local=(bin-(wave.binOffset??0)+bins)%bins;
  if(local>=wave.envelope.length/2)return [0,0];
  return [wave.envelope[2*local],wave.envelope[2*local+1]];
}

// Renderer attachment descriptors; requesting one never creates an audio instrument.
export const panelViews=Object.freeze([
 ...ids.map(cell=>Object.freeze({id:`tape:${cell}`,kind:'tape',cell,label:`${cell} · stereo tape`,path:`/?view=tape%3A${cell}`,preferredSize:Object.freeze({width:720,height:600})})),
 ...ids.map(cell=>Object.freeze({id:`heads:${cell}`,kind:'heads',cell,label:`${cell} · heads and sends`,path:`/?view=heads%3A${cell}`,preferredSize:Object.freeze({width:600,height:650})})),
 Object.freeze({id:'routing',kind:'routing',cell:null,label:'Buffer · routing',path:'/?view=routing',preferredSize:Object.freeze({width:600,height:420})})
]);
export function resolvePanelView(id){const view=panelViews.find(v=>v.id===id);if(!view)throw new Error(`Unknown buffer view: ${String(id).slice(0,80)}`);return view;}
export function requestableViews(baseURL){return panelViews.map(view=>({...view,url:new URL(view.path,baseURL).href}));}
