export function captureDefaults(capacity=64){return {enabled:0,high:.02,low:.01,gap:.04,minimum:.03,maximum:capacity,release:.01};}
export const captureProfiles={note:{high:.08,low:.04,gap:.03,minimum:.03,release:.005},wisp:{high:.008,low:.003,gap:.12,minimum:.03,release:.02},passage:{high:.02,low:.008,gap:.3,minimum:.08,release:.02}};
export function defaults(){return {capacity:64,globalInput:1,master:0,source:0,frequency:220,toneLevel:.1,cells:[4,8].map((seconds,i)=>({id:i?'B':'A',seconds,inputGain:0,feedback:1,fx:.4,cleanGain:1,routeGain:0,running:1,layout:'AB',heads:[1,1,1,1],capture:captureDefaults()}))};}
const ranges={globalInput:[0,1],master:[0,1],source:[0,1],frequency:[20,2000],toneLevel:[0,.5],inputGain:[0,2],feedback:[0,1.1],fx:[0,1],cleanGain:[0,1],routeGain:[0,1],running:[0,1]};
function bounded(value,min,max,key){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error(`Invalid ${key}`);return value;}
export function validate(candidate){
  const c=structuredClone(candidate);bounded(c.capacity,.1,128,'capacity');
  for(const k of ['globalInput','master','source','frequency','toneLevel'])bounded(c[k],...ranges[k],k);
  if(!Number.isInteger(c.source))throw new Error('Source must be 0 or 1');
  if(!Array.isArray(c.cells)||c.cells.length!==2)throw new Error('Two cells required');
  c.cells.forEach((cell,i)=>{
    if(cell.id!==(i?'B':'A'))throw new Error('Stable cell IDs required');
    bounded(cell.seconds,.01,c.capacity,'seconds');
    for(const k of ['inputGain','feedback','fx','cleanGain','routeGain','running'])bounded(cell[k],...ranges[k],k);
    if(!Number.isInteger(cell.running))throw new Error('Running must be 0 or 1');
    if(!['AB','A','B','quad'].includes(cell.layout))throw new Error('Unknown layout');
    if(!Array.isArray(cell.heads)||cell.heads.length!==4)throw new Error('Four head gains required');
    cell.heads.forEach(v=>bounded(v,0,1,'head'));
    cell.capture??=captureDefaults(c.capacity);
    const g=cell.capture;
    if(g.enabled===0 && typeof g.maximum==='number')g.maximum=Math.min(g.maximum,c.capacity);
    bounded(g.enabled,0,1,'capture enabled');if(!Number.isInteger(g.enabled))throw new Error('Capture enabled must be 0 or 1');
    bounded(g.high,.000001,2,'capture high');bounded(g.low,0,g.high,'capture low');
    if(g.low>=g.high)throw new Error('Capture closing threshold must be below opening threshold');
    bounded(g.gap,0,Math.min(5,c.capacity),'capture gap');bounded(g.release,0,2,'capture release');
    bounded(g.minimum,.001,c.capacity,'capture minimum');bounded(g.maximum,g.minimum,c.capacity,'capture maximum');
    if(i===0&&cell.routeGain!==0)throw new Error('First pass routes A to B only');
  });return c;
}
export function command(current,{scope,index,key,value}){
  const next=structuredClone(current);
  if(scope==='global'){
    if(!['globalInput','master','source','frequency','toneLevel'].includes(key))throw new Error('Unknown global control');
    next[key]=value;
  }else if(scope==='cell'){
    if(!Number.isInteger(index)||index<0||index>1)throw new Error('Unknown cell');
    const cell=next.cells[index];
    if(key==='mode'){
      const modes={off:[0,0],record:[1,0],overdub:[1,1],hold:[0,1]};
      if(!Object.hasOwn(modes,value))throw new Error('Unknown loop mode');
      [cell.inputGain,cell.feedback]=modes[value];
    }else if(key==='clear'){
      return {config:validate(next),clear:index};
    }else{
      if(!['seconds','inputGain','feedback','fx','cleanGain','routeGain','running','layout','heads','capture'].includes(key))throw new Error('Unknown cell control');
      cell[key]=value;
    }
  }else throw new Error('Unknown control scope');
  return {config:validate(next),clear:null};
}
export function mode(cell){return ({'0,0':'off','1,0':'record','1,1':'overdub','0,1':'hold'})[`${cell.inputGain},${cell.feedback}`]??'custom';}
