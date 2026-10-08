export const copy = value => JSON.parse(JSON.stringify(value));
export const clamp = (v,lo=0,hi=1) => Math.max(lo,Math.min(hi,v));
const idPattern=/^[a-z0-9][a-z0-9_-]{0,63}$/;
export const BUS_NAMES=['c1','c2','c3','c4','b1','a1','a2','b2','stut','splut','um','spark','deci','fuzz','verb','mast','p2','envir'];
export const FX_NAMES=['splut','spark','deci','fuzz','verb','mast'];
export function defaultConfig() {
  return {schema:'awb.rack/1',name:'Live set · send rack',
    instruments:['in0','in1','b1','a1','a2','b2','delbus','p2','splut','spark','deci','fuzz','verb','mast'].map(id=>({id,label:id.toUpperCase()})),
    regions:[
      {id:'fx',label:'FX sends',kind:'fx',scope:'instrument',widget:'knob',destinations:[...FX_NAMES],min:0,max:127,step:1,curve:'linear',address:'/sends/{instrument}/fx/{index}'},
      {id:'bus',label:'Bus sends',kind:'bus',scope:'instrument',widget:'knob',destinations:[...BUS_NAMES],min:0,max:127,step:1,curve:'linear',address:'/sends/{instrument}/bus/{index}'},
      {id:'levels',label:'Bus levels',kind:'levels',scope:'global',widget:'fader',destinations:[...BUS_NAMES],min:0,max:127,step:1,curve:'linear',address:'/levels/busses/{destination}'}],
    output:{mode:'legacy',host:'127.0.0.1',port:8080},
    notes:['Matches the loaded surface: 6 FX sends and 18 bus destinations.','ENVIR is not mapped in transition.js; legacy output blocks it.','transition.js uses DECI channel 13 / FUZZ 12; the extension uses DECI 12 / FUZZ 13. This preset preserves the surface addresses.']};
}
export function validateConfig(input) {
  const c=copy(input);
  if(c.schema!=='awb.rack/1')throw Error('Expected awb.rack/1 configuration.');
  const ids=(items,label,max)=>{if(!Array.isArray(items)||!items.length||items.length>max)throw Error(`${label}: invalid count.`);const seen=new Set();for(const item of items){if(!idPattern.test(item.id)||seen.has(item.id))throw Error(`${label}: invalid or duplicate id ${item.id}.`);seen.add(item.id);if(typeof item.label!=='string'||item.label.length>120)throw Error(`${label}: invalid label.`);}};
  ids(c.instruments,'Instruments',64);ids(c.regions,'Regions',16);
  for(const i of c.instruments)if(i.regions!==undefined){ids(i.regions,`Regions for ${i.id}`,16);if(i.regions.some(r=>r.scope!=='instrument'))throw Error('Channel rack regions must use per-instrument scope.');}
  for(const r of [...c.regions,...c.instruments.flatMap(i=>i.regions??[])]){
    if(!['instrument','global'].includes(r.scope)||!['knob','fader'].includes(r.widget))throw Error(`Invalid region ${r.id}.`);
    if(!Array.isArray(r.destinations)||!r.destinations.length||r.destinations.length>64||new Set(r.destinations).size!==r.destinations.length||r.destinations.some(d=>!idPattern.test(d)))throw Error(`Invalid destinations in ${r.id}.`);
    if(!Number.isFinite(r.min)||!Number.isFinite(r.max)||r.max<=r.min||!Number.isFinite(r.step)||r.step<0)throw Error(`Invalid range in ${r.id}.`);
    if(!['linear','log','piecewise'].includes(r.curve)||(r.curve==='log'&&r.min<=0))throw Error(`Invalid curve in ${r.id}.`);
    if(r.curve==='piecewise'){
      const p=r.points;if(!Array.isArray(p)||p.length<2||p.length>32||p[0][0]!==0||p.at(-1)[0]!==1||p[0][1]!==r.min||p.at(-1)[1]!==r.max)throw Error('Curve points must run from [0,min] to [1,max].');
      p.forEach((v,i)=>{if(!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isFinite(n))||(i&&(v[0]<=p[i-1][0]||v[1]<=p[i-1][1])))throw Error('Curve points must increase.');});
    }
    if(typeof r.address!=='string'||!r.address.startsWith('/')||r.address.length>240||/[\s\0]/.test(r.address))throw Error(`Invalid OSC address in ${r.id}.`);
  }
  const perInstrument=c.instruments.map(i=>channelRegions(c,i).reduce((n,r)=>n+r.destinations.length,0)),global=c.regions.filter(r=>r.scope==='global').reduce((n,r)=>n+r.destinations.length,0);
  if(Math.max(...perInstrument,global)>96||perInstrument.reduce((a,b)=>a+b,0)+global>4096)throw Error('Rack supports up to 96 controls per row and 4096 controls total.');
  if(!['legacy','osc','sc','off'].includes(c.output?.mode)||!['127.0.0.1','localhost'].includes(c.output?.host)||!Number.isInteger(c.output?.port)||c.output.port<1||c.output.port>65535)throw Error('Output must use a local UDP endpoint.');
  if(c.output.mode==='sc'&&(!/^sendRack:[a-zA-Z0-9_-]+$/.test(c.output.instanceID)||!idPattern.test(c.output.libraryID)))throw Error('Invalid SC ToolInstance binding.');
  return c;
}
export function quantise(v,r){return clamp(r.step?Math.round((v-r.min)/r.step)*r.step+r.min:v,r.min,r.max);}
export function mapPosition(p,r){p=clamp(p);let v;
  if(r.curve==='log')v=r.min*Math.pow(r.max/r.min,p);
  else if(r.curve==='piecewise'){const i=Math.max(1,r.points.findIndex(x=>x[0]>=p));const a=r.points[i-1],b=r.points[i];v=a[1]+(b[1]-a[1])*(p-a[0])/(b[0]-a[0]);}
  else v=r.min+p*(r.max-r.min);return quantise(v,r);
}
export function positionOf(v,r){v=clamp(v,r.min,r.max);
  if(r.curve==='log')return Math.log(v/r.min)/Math.log(r.max/r.min);
  if(r.curve==='piecewise'){const i=Math.max(1,r.points.findIndex(x=>x[1]>=v));const a=r.points[i-1],b=r.points[i];return a[0]+(b[0]-a[0])*(v-a[1])/(b[1]-a[1]);}
  return (v-r.min)/(r.max-r.min);
}
export function formatValue(v){return Number.isInteger(v)?String(v):String(Number(v.toPrecision(4)));}
export function channelRegions(config,instrument){return instrument.regions??config.regions.filter(r=>r.scope==='instrument');}
export function descriptors(config){
  const out=[];
  const append=(i,r)=>r.destinations.forEach((d,n)=>out.push({id:`${i.id}/${r.id}/${d}`,instrument:i.id,instrumentLabel:i.label,destination:d,index:n,region:r,address:r.address.replaceAll('{instrument}',i.id).replaceAll('{destination}',d).replaceAll('{index}',String(n)),label:`${i.label} → ${d.toUpperCase()} · ${r.label}`}));
  for(const i of config.instruments)for(const r of channelRegions(config,i))append(i,r);
  for(const r of config.regions.filter(r=>r.scope==='global'))append({id:'global',label:'LEVELS'},r);
  return out;
}
export function importSceneConfig(input,document){const ds=descriptors(document.config);let skipped=0;const snapshots=input.scenes.map(s=>{const targets={};for(const t of s.transitions??[]){const kind=String(t.type).toLowerCase(),line=String(t.item_1).toLowerCase(),destination=String(t.item_2).toLowerCase(),d=ds.find(d=>d.region.kind===(kind==='bus'&&line==='level'?'levels':kind)&&d.instrument===(line==='level'?'global':line)&&d.destination===destination);const value=document.config.output.mode==='sc'?Number(t.amount):Math.trunc(Number(t.amount)*127);if(!d||!Number.isFinite(value)){skipped++;continue;}const aligned=['J','L','C','R'].includes(t.alignment);targets[d.id]={value,fraction:aligned&&t.duration?Number(t.duration):1,alignment:aligned?t.alignment:'J'};}return {id:`imported-${s.id}`,sceneID:String(s.id),label:s.description||`Scene ${s.id}`,duration:Number(s.transition_dur)||0,targets};});return {document:{...document,snapshots},skipped};}
export function wireMessage(d,value,config){
  if(config.output.mode==='off')return null;
  if(config.output.mode==='osc')return {address:d.address,args:[value]};
  if(config.output.mode==='sc'){
    let op,channel=d.instrument,destination=d.destination;
    if(['fx','followers'].includes(d.region.kind)&&d.region.scope==='instrument')op='send';
    else if(d.region.kind==='channel-state'&&['mute','solo'].includes(destination)&&d.region.scope==='instrument')op=destination;
    else if(d.region.kind==='channel-levels'&&d.region.scope==='global'){op='level';channel=destination;}
    else if(d.region.kind==='levels'&&d.region.scope==='global'){op='return';channel='';}
    else throw Error('Unknown SC rack mapping.');
    return {address:'/awb/rack/control',args:[config.output.instanceID,op,channel,destination,value]};
  }
  if(!['fx','bus','levels'].includes(d.region.kind))throw Error('This custom region needs direct OSC output.');
  if(d.destination==='envir')throw Error('ENVIR has no mapping in the current o-s-c bridge.');
  if(!config.instruments.some(i=>i.id===d.instrument)&&d.instrument!=='global')throw Error('Unknown legacy instrument.');
  if(d.region.kind==='fx'&&(d.index>=6||FX_NAMES[d.index]!==d.destination))throw Error('FX order differs from the current bridge.');
  if(d.region.kind==='bus'&&(d.index>=17||BUS_NAMES[d.index]!==d.destination))throw Error('Bus order differs from the current bridge.');
  if(d.region.kind==='levels'&&!BUS_NAMES.slice(0,17).includes(d.destination))throw Error('No legacy level mapping.');
  if(d.region.min!==0||d.region.max!==127)throw Error('The current bridge expects values from 0 to 127.');
  if(d.region.kind!=='levels'&&!['in0','in1','b1','a1','a2','b2','delbus','p2','splut','spark','deci','fuzz','verb','mast'].includes(d.instrument))throw Error('Instrument is not mapped in the current bridge.');
  const expected=d.region.kind==='levels'?`/levels/busses/${d.destination}`:`/sends/${d.instrument}/${d.region.kind}/${d.index}`;
  if(d.address!==expected||d.region.scope!==(d.region.kind==='levels'?'global':'instrument'))throw Error('Address or scope differs from the current bridge.');
  return {address:'/SET',args:[d.address,Math.round(value)]};
}

// Structural notifications and per-control notifications are deliberately separate.
// Neither a value gesture nor a recall tick publishes a rack-wide React snapshot.
export class RackStore {
  constructor(document={config:defaultConfig(),values:{},snapshots:[]}){
    this.listeners=new Map();this.metaListeners=new Set();this.allListeners=new Set();this.revision=0;this.stats={changes:0};this.replace(document,false);
  }
  replace(doc,notify=true){const config=validateConfig(doc.config);const ds=descriptors(config);this.config=config;this.controls=ds;this.byID=new Map(ds.map(d=>[d.id,d]));this.values=new Map(ds.map(d=>[d.id,quantise(Number.isFinite(doc.values?.[d.id])?doc.values[d.id]:d.region.min,d.region)]));this.snapshots=copy(doc.snapshots??[]);this.mixSet=copy(doc.mixSet??{name:'Live mixes'});this.validateSnapshots();if(notify){this.revision++;this.metaListeners.forEach(f=>f());this.allListeners.forEach(f=>f({kind:'structure'}));}}
  validateSnapshots(){if(!Array.isArray(this.snapshots)||this.snapshots.length>256)throw Error('Invalid mix snapshot library.');const seen=new Set();for(const s of this.snapshots){if(typeof s.id!=='string'||seen.has(s.id)||typeof s.label!=='string'||!s.label.trim()||s.label.length>120||!Number.isFinite(s.duration)||s.duration<0||s.duration>3600000||!s.targets||typeof s.targets!=='object'||Array.isArray(s.targets))throw Error('Invalid mix snapshot.');seen.add(s.id);if(s.defaultTransition)validateCaptureTiming(s.duration,s.defaultTransition.duration,s.defaultTransition.alignment);for(const [id,t]of Object.entries(s.targets)){if(t===null)continue;const d=this.byID.get(id);if(!t||!Number.isFinite(t.value)||!Number.isFinite(t.fraction)||t.fraction<0||t.fraction>1||!['J','L','C','R'].includes(t.alignment)||(d&&(t.value<d.region.min||t.value>d.region.max)))throw Error(`Invalid transition for ${id}.`);}}}
  get(id){return this.values.get(id);}
  subscribe(id,f){const set=this.listeners.get(id)??new Set();set.add(f);this.listeners.set(id,set);return()=>{set.delete(f);if(!set.size)this.listeners.delete(id);};}
  subscribeMeta=f=>{this.metaListeners.add(f);return()=>this.metaListeners.delete(f);};
  getRevision=()=>this.revision;
  subscribeAll(f){this.allListeners.add(f);return()=>this.allListeners.delete(f);}
  set(id,value,origin='local'){const d=this.byID.get(id);if(!d||!Number.isFinite(value))throw Error('Unknown control or non-finite value.');value=quantise(value,d.region);if(value===this.get(id))return false;this.values.set(id,value);this.stats.changes++;this.listeners.get(id)?.forEach(f=>f());this.allListeners.forEach(f=>f({kind:'value',id,value,origin}));return true;}
  configure(config){this.replace({...this.document(),config});}
  document(){return {schema:'awb.rack-library/1',config:copy(this.config),values:Object.fromEntries(this.values),snapshots:copy(this.snapshots),mixSet:copy(this.mixSet)};}
  capture(label,sceneID=null,ids=this.controls.map(d=>d.id),{duration=1000,targetDuration=duration,alignment='L'}={}){
    if(typeof label!=='string'||!label.trim()||label.length>120)throw Error('Give the snapshot a name.');
    validateCaptureTiming(duration,targetDuration,alignment);
    if(!Array.isArray(ids)||!ids.length||ids.length>this.controls.length||new Set(ids).size!==ids.length||ids.some(id=>!this.byID.has(id)))throw Error('Select at least one valid control to capture.');
    const selected=new Set(ids),s={id:`mix-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,label:label.trim(),sceneID,duration,defaultTransition:{duration:targetDuration,alignment},targets:Object.fromEntries(this.controls.map(d=>[d.id,selected.has(d.id)?{value:this.get(d.id),fraction:duration?targetDuration/duration:0,alignment}:null]))};
    this.snapshots.push(s);try{this.validateSnapshots();}catch(e){this.snapshots.pop();throw e;}this.notifyMeta();return s;
  }
  updateSnapshot(snapshot){const next=copy(snapshot),previous=this.snapshots;this.snapshots=this.snapshots.map(s=>s.id===next.id?next:s);try{this.validateSnapshots();}catch(e){this.snapshots=previous;throw e;}this.notifyMeta();}
  notifyMeta(){this.revision++;this.metaListeners.forEach(f=>f());this.allListeners.forEach(f=>f({kind:'library'}));}
}
export function validateCaptureTiming(duration,targetDuration,alignment){if(!Number.isFinite(duration)||duration<0||duration>3600000||!Number.isFinite(targetDuration)||targetDuration<0||targetDuration>duration||!['J','L','C','R'].includes(alignment))throw Error('Target time must be between zero and the overall mix transition time.');}
export const targetCount=s=>Object.values(s.targets).filter(t=>t!==null).length;
export function transitionWindow(duration,target){const length=duration*target.fraction;return {length,delay:target.alignment==='R'?duration-length:target.alignment==='C'?(duration-length)/2:0};}
export function createRecall(store,snapshot,{now=()=>performance.now(),schedule=f=>setTimeout(f,32),cancel=clearTimeout,onFinish=()=>{}}={}){
  const started=now(),items=Object.entries(snapshot.targets).filter(([id,t])=>t!==null&&store.byID.has(id)).map(([id,t])=>({id,target:t.value,from:store.get(id),...transitionWindow(snapshot.duration,t)}));let handle,stopped=false;
  const tick=()=>{if(stopped)return;const elapsed=now()-started;for(const i of items){if(elapsed<i.delay)continue;const p=i.length?clamp((elapsed-i.delay)/i.length):1;store.set(i.id,i.from+(i.target-i.from)*p,'recall');}if(elapsed<snapshot.duration)handle=schedule(tick);else{stopped=true;onFinish();}};
  tick();return {stop(){stopped=true;cancel(handle);},override(id){const i=items.findIndex(i=>i.id===id);if(i>=0)items.splice(i,1);}};
}

export function makeLayout(config,{instrument='all',regions='all',editing=false}={}){
  const ds=descriptors(config),stripWidth=editing?84:52,cellHeight=editing?60:32,headers=[],cells=[],rows=[],racks=[];let x=4,height=0;
  const addRack=(i,rs,scope)=>{
    rs=rs.filter(r=>regions==='all'||regions===r.id);if(!rs.length)return;
    const rack={id:i.id,label:i.label,scope,x,y:0,width:stripWidth,height:0,headers:[],rows:[],cells:[]};
    rack.rows.push({text:i.label,x,y:4,width:stripWidth-1,height:16,fontSize:10,bold:true,align:'center'});let y=26;
    for(const r of rs){
      rack.headers.push({text:r.label.replace(/ sends$/i,'').toUpperCase(),x:x+2,y,width:stripWidth-5,height:12,fontSize:8,align:'center'});y+=16;
      for(const d of ds.filter(d=>d.instrument===i.id&&d.region.id===r.id)){
        rack.headers.push({text:d.destination.toUpperCase(),x:x+2,y,width:stripWidth-5,height:10,fontSize:8,align:'center',small:true});
        rack.cells.push({descriptor:d,x:x+2,y,width:stripWidth-5,height:cellHeight});y+=cellHeight;
      }
      y+=4;
    }
    rack.height=y+4;height=Math.max(height,rack.height);headers.push(...rack.headers);rows.push(...rack.rows);cells.push(...rack.cells);racks.push(rack);x+=stripWidth;
  };
  for(const i of config.instruments.filter(i=>instrument==='all'||i.id===instrument))addRack(i,channelRegions(config,i),'instrument');
  let width=x+4;
  const globals=config.regions.filter(r=>r.scope==='global'&&(regions==='all'||regions===r.id));
  if(globals.length){
    const rack={id:'global',label:'LEVELS',scope:'global',x:0,y:height+12,width:0,height:editing?188:148,headers:[],rows:[],cells:[]};let cx=118;
    rack.rows.push({text:'LEVELS',x:8,y:rack.y+70,width:106,height:16,fontSize:11,bold:true});
    for(const r of globals){
      rack.headers.push({text:r.label,x:cx,y:rack.y+16,width:r.destinations.length*(editing?88:64),height:16,fontSize:11});
      for(const d of ds.filter(d=>d.instrument==='global'&&d.region.id===r.id)){
        rack.headers.push({text:d.destination.toUpperCase(),x:cx,y:rack.y+35,width:editing?84:60,height:16,fontSize:10,small:true});
        rack.cells.push({descriptor:d,x:cx,y:rack.y+44,width:editing?84:60,height:editing?128:88,large:true});cx+=editing?88:64;
      }
      cx+=16;
    }
    rack.width=cx;width=Math.max(width,cx);height=rack.y+rack.height;
    headers.push(...rack.headers);rows.push(...rack.rows);cells.push(...rack.cells);racks.push(rack);
  }
  return {width:Math.max(200,width),height:Math.max(200,height),headers,cells,rows,racks};
}
