import dgram from 'node:dgram';
import crypto from 'node:crypto';
import {createOscOutput} from '../../awb-shell/services/oscOutput.mjs';

const pad=b=>Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);
const str=s=>pad(Buffer.from(`${s}\0`));
export function encodeOSC({address,args}) {
  if(typeof address!=='string'||!address.startsWith('/')||address.includes('\0'))throw Error('Invalid OSC address.');
  const fields=args.map(v=>{if(typeof v==='string'){if(v.includes('\0'))throw Error('Invalid OSC string.');return ['s',str(v)];}if(!Number.isFinite(v))throw Error('Invalid OSC number.');const b=Buffer.alloc(4);if(Number.isInteger(v)&&v>=-2147483648&&v<=2147483647){b.writeInt32BE(v);return ['i',b];}b.writeFloatBE(v);return ['f',b];});
  return Buffer.concat([str(address),str(','+fields.map(f=>f[0]).join('')),...fields.map(f=>f[1])]);
}
export function decodeOSC(bytes) {
  if(!Buffer.isBuffer(bytes)||bytes.length>65507||bytes.length%4)throw Error('Invalid OSC packet.');
  let offset=0;
  const string=()=>{const end=bytes.indexOf(0,offset);if(end<offset)throw Error('Unterminated OSC string.');const value=bytes.toString('utf8',offset,end);offset=(end+4)&~3;if(offset>bytes.length)throw Error('Truncated OSC string.');return value;};
  const address=string(),types=string();if(!address.startsWith('/')||!types.startsWith(','))throw Error('Expected OSC message.');
  const args=[];for(const type of types.slice(1)){if(type==='s'){args.push(string());continue;}if(!['i','f','d'].includes(type)||offset+(type==='d'?8:4)>bytes.length)throw Error('Unsupported or truncated OSC argument.');args.push(type==='i'?bytes.readInt32BE(offset):type==='d'?bytes.readDoubleBE(offset):bytes.readFloatBE(offset));offset+=type==='d'?8:4;}
  if(offset!==bytes.length)throw Error('Unexpected OSC trailing bytes.');return {address,args};
}
export function envBinding(env=process.env) {
  if(!env.AWB_RACK_INSTANCE_ID)return null;
  return {instanceID:env.AWB_RACK_INSTANCE_ID,port:Number(env.AWB_RACK_SC_PORT),libraryID:env.AWB_RACK_LIBRARY_ID,libraryRoot:env.AWB_RACK_SC_LIBRARY_ROOT};
}
export async function createSCBridge(binding,{onError=()=>{},onUpdate=()=>{},timeout=1800,heartbeat=3000}={}) {
  if(!binding||typeof binding.instanceID!=='string'||!/^sendRack:[a-zA-Z0-9_-]+$/.test(binding.instanceID)||!Number.isInteger(binding.port)||binding.port<1||binding.port>65535)throw Error('Invalid native SC rack binding.');
  const socket=dgram.createSocket('udp4'),requests=new Map(),frames=new Map(),watchToken=crypto.randomUUID();let closed=false,closeTask=null,watchTimer,watchRequest,lastWatch=0,watchFailed=false;
  const recover=()=>onUpdate({kind:'recover'});
  const clearFrames=()=>{for(const f of frames.values())clearTimeout(f.timer);frames.clear();};
  const update=(args)=>{
    const [instanceID,token,id,kind,...a]=args;if(token!==watchToken||typeof id!=='string')return;
    let f=frames.get(id);
    if(!f){if(frames.size>=4){clearFrames();recover();}f={changes:new Map(),timer:setTimeout(()=>{frames.delete(id);recover();},350)};frames.set(id,f);}
    if(kind==='begin'){
      const [baseRevision,revision,count,metadata]=a;
      if(![baseRevision,revision,count].every(Number.isSafeInteger)||baseRevision<0||revision<baseRevision||count<0||count>4096||![0,1].includes(metadata))throw Error('Invalid SC update header.');
      f.header={baseRevision,revision,count,metadata:metadata===1};
    }else if(kind==='value'){
      const [id,value,source]=a;if(typeof id!=='string'||id.length>160||!Number.isFinite(value)||typeof source!=='string')throw Error('Invalid SC update value.');
      f.changes.set(id,{id,value,source});
    }else if(kind==='end'){f.end=a[0];}else throw Error('Unknown SC update frame.');
    if(f.header&&f.end===f.header.revision&&f.changes.size===f.header.count){clearTimeout(f.timer);frames.delete(id);onUpdate({kind:'values',...f.header,changes:[...f.changes.values()]});}
  };
  socket.on('error',error=>onError(error.message));
  const output=createOscOutput({encodeMessage:encodeOSC,sendPacket:bytes=>new Promise((resolve,reject)=>socket.send(bytes,binding.port,'127.0.0.1',e=>e?reject(e):resolve()))});
  const send=message=>output.send(message);
  const finish=(id,request)=>{
    const h=request.header;
    if(!h||request.end===undefined||request.channels.size!==h.channelCount||request.slots.size!==h.slotCount||request.sends.size!==h.channelCount||request.processors.size!==h.processorCount)return;
    if(request.end!==h.revision||[...request.sends.values()].some(row=>row.length!==h.slotCount))return;
    const state={...h,channels:[...request.channels.values()].sort((a,b)=>a.order-b.order),slots:[...request.slots.values()].sort((a,b)=>a.order-b.order),processors:[...request.processors],sends:Object.fromEntries(request.sends),instanceID:binding.instanceID,port:binding.port};
    try{if(binding.libraryID&&state.libraryID!==binding.libraryID)throw Error('SC rack library identity differs from its launch binding.');documentFromState(state);clearTimeout(request.timer);requests.delete(id);request.resolve(state);}catch(e){clearTimeout(request.timer);requests.delete(id);request.reject(e);}
  };
  socket.on('message',(bytes,remote)=>{
    if(remote.address!=='127.0.0.1'||remote.port!==binding.port)return;
    try {
      const {address,args}=decodeOSC(bytes);if(args[0]!==binding.instanceID)return;
      if(address==='/awb/rack/error'){onError(String(args[1]));return;}
      if(address==='/awb/rack/update'){update(args);return;}
      if(address==='/awb/rack/watch'&&args[1]===watchToken){lastWatch=Date.now();watchFailed=false;watchRequest?.resolve();watchRequest=null;onUpdate({kind:'heartbeat',revision:args[2]});return;}
      if(address==='/awb/rack/closed'&&args[1]===watchToken){clearInterval(watchTimer);clearFrames();onError('Bound SC ToolInstance closed.');return;}
      if(address!=='/awb/rack/state')return;
      const [instanceID,id,kind,...a]=args,request=requests.get(id);if(!request)return;
      if(kind==='begin'){const [revision,name,libraryID,maxGain,channelCount,slotCount,processorCount,feedbackProtocol,maxLevel=maxGain]=a;if(feedbackProtocol!==1){clearTimeout(request.timer);requests.delete(id);request.reject(Error('SC rack feedback protocol unavailable: load this workspace SC rack classes and recompile.'));return;}if(![channelCount,slotCount,processorCount].every(n=>Number.isInteger(n)&&n>=0&&n<=64))throw Error('Invalid SC state counts.');request.header={revision,name,libraryID,maxGain,channelCount,slotCount,processorCount,feedbackProtocol,maxLevel};}
      else if(kind==='channel'){const [id,label,level,mute,solo,order,levelMin,levelMax]=a;request.channels.set(id,{id,label,level,mute,solo,order,...(levelMin!==undefined?{levelMin,levelMax}:{})});}
      else if(kind==='slot'){const [id,label,kind,fixed,active,level,processor,order,attack,release,scale,blend,floorDb,detectorActive=0,rise=.00562,fall=.0234,gainDb=14.4,consumerCount=0,controlEnabled=1]=a;request.slots.set(id,{id,label,kind,fixed,active,level,processor,order,settings:{attack,release,scale,blend,floorDb},detectorActive,detector:{rise,fall,gainDb},consumerCount,controlEnabled});}
      else if(kind==='sends'){request.sends.set(a[0],a.slice(1));}
      else if(kind==='processor'){request.processors.add(a[0]);}
      else if(kind==='end'){request.end=a[0];}
      finish(id,request);
    }catch(error){onError(error.message);}
  });
  await new Promise((resolve,reject)=>{socket.once('error',reject);socket.bind(0,'127.0.0.1',()=>{socket.removeListener('error',reject);resolve();});});
  return {binding,watchToken,
    watch(){
      if(closed)return Promise.reject(Error('SC bridge is closed.'));
      if(watchTimer)return Promise.resolve();
      const renew=()=>{if(lastWatch&&Date.now()-lastWatch>heartbeat*3&&!watchFailed){watchFailed=true;onError('SC feedback heartbeat timed out.');}send({address:'/awb/rack/control',args:[binding.instanceID,'watch',watchToken]}).catch(e=>onError(e.message));};
      return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{watchRequest=null;clearInterval(watchTimer);watchTimer=null;reject(Error('SC feedback subscription timed out.'));},timeout);watchRequest={resolve:()=>{clearTimeout(timer);resolve();},reject:e=>{clearTimeout(timer);reject(e);}};watchTimer=setInterval(renew,heartbeat);renew();});
    },
    send,sendBatch:messages=>output.sendMany(messages.map(message=>({message}))),outputStats:()=>output.snapshot(),control:async(op,args=[])=>{if(closed)throw Error('SC bridge is closed.');await send({address:'/awb/rack/control',args:[binding.instanceID,op,...args]});},
    sync(){if(closed)return Promise.reject(Error('SC bridge is closed.'));const id=crypto.randomUUID();return new Promise((resolve,reject)=>{const request={resolve,reject,channels:new Map(),slots:new Map(),sends:new Map(),processors:new Set(),timer:setTimeout(()=>{requests.delete(id);reject(Error('SC rack Sync timed out; the bound ToolInstance may be closed.'));},timeout)};requests.set(id,request);send({address:'/awb/rack/control',args:[binding.instanceID,'sync',id]}).catch(error=>{clearTimeout(request.timer);requests.delete(id);reject(error);});});},
    close(){if(closed)return closeTask;closed=true;clearInterval(watchTimer);clearFrames();watchRequest?.reject(Error('SC bridge closed.'));watchRequest=null;for(const r of requests.values()){clearTimeout(r.timer);r.reject(Error('SC bridge closed.'));}requests.clear();send({address:'/awb/rack/control',args:[binding.instanceID,'unwatch',watchToken]}).catch(()=>{});closeTask=output.close().then(()=>new Promise(resolve=>socket.close(resolve)));return closeTask;}
  };
}
export function documentFromState(state,snapshots=[]) {
  const maxLevel=state.maxLevel??state.maxGain;
  if(!Number.isFinite(maxLevel)||maxLevel<=0)throw Error('Invalid SC fader range.');
  const validID=id=>typeof id==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id);
  if(!validID(state.libraryID)||!Number.isFinite(state.maxGain)||state.maxGain<=0||!state.channels.length||state.channels.length>64||!state.slots.length||state.slots.length>64)throw Error('Invalid SC rack topology.');
  if([...state.channels,...state.slots].some(x=>!validID(x.id)||typeof x.label!=='string'||!Number.isFinite(x.level)||x.level<0||x.level>maxLevel)||new Set(state.channels.map(x=>x.id)).size!==state.channels.length||new Set(state.slots.map(x=>x.id)).size!==state.slots.length||state.slots.some(s=>!['fx','follower'].includes(s.kind)))throw Error('Invalid SC rack channels or destinations.');
  if(state.channels.some((c,i)=>c.order!==i)||state.slots.some((s,i)=>s.order!==i))throw Error('Invalid SC state ordering.');
  const region=(id,label,kind,scope,destinations,max=state.maxGain,step=.001)=>({id,label,kind,scope,destinations,min:0,max,step,curve:kind==='channel-state'?'linear':'audio',widget:scope==='global'?'fader':'knob',...(scope==='global'?{unity:1}:{}),address:'/awb/rack/control'});
  const fx=state.slots.filter(s=>s.kind==='fx'),followers=state.slots.filter(s=>s.kind==='follower'),regions=[];
  if(fx.length)regions.push(region('fx','FX sends','fx','instrument',fx.map(s=>s.id)));
  if(followers.length)regions.push(region('followers','Control sends','followers','instrument',followers.map(s=>s.id)));
  regions.push(region('state','Mute / Solo','channel-state','instrument',['mute','solo'],1,1));
  if(fx.length)regions.push(region('levels','FX returns','levels','global',fx.map(s=>s.id),maxLevel));
  if(followers.length)regions.push(region('control-levels','Control send amounts','levels','global',followers.map(s=>s.id),state.maxLevel??1));
  const channelLevels=region('channel-levels','Channel faders','channel-levels','global',state.channels.map(c=>c.id),maxLevel);
  channelLevels.ranges=Object.fromEntries(state.channels.filter(c=>c.levelMin!==undefined).map(c=>[c.id,{min:c.levelMin,max:c.levelMax}]));
  regions.push(channelLevels);
  const config={schema:'awb.rack/1',name:state.name,instruments:state.channels.map(({id,label})=>({id,label})),regions,output:{mode:'sc',host:'127.0.0.1',port:state.port,instanceID:state.instanceID,libraryID:state.libraryID}},values={};
  for(const c of state.channels){const sends=state.sends[c.id];if(!Array.isArray(sends)||sends.length!==state.slots.length||sends.some(v=>!Number.isFinite(v)||v<0||v>state.maxGain)||![0,1].includes(c.mute)||![0,1].includes(c.solo))throw Error('Incomplete SC rack mix.');state.slots.forEach((s,i)=>values[`${c.id}/${s.kind==='fx'?'fx':'followers'}/${s.id}`]=sends[i]);values[`${c.id}/state/mute`]=c.mute;values[`${c.id}/state/solo`]=c.solo;values[`global/channel-levels/${c.id}`]=c.level;}
  for(const s of fx)values[`global/levels/${s.id}`]=s.level;
  for(const s of followers){if(s.level>(state.maxLevel??1))throw Error("Control send amount exceeds fader range.");values[`global/control-levels/${s.id}`]=s.level;}
  return {schema:'awb.rack-library/1',config,values,snapshots};
}
