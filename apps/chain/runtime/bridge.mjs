import dgram from 'node:dgram';
import crypto from 'node:crypto';
import {encodeOSC,decodeOSC} from '../../rack/runtime/sc-bridge.mjs';
import {createOscOutput} from '../../awb-shell/services/oscOutput.mjs';
export function envBinding(env=process.env){return env.AWB_CHAIN_INSTANCE_ID?{instanceID:env.AWB_CHAIN_INSTANCE_ID,port:Number(env.AWB_CHAIN_SC_PORT)}:null;}
export function validateState(state){
  if(typeof state.name!=='string'||typeof state.factory!=='string'||![1,2].includes(state.width)||!Number.isSafeInteger(state.revision)||state.revision<0||!Array.isArray(state.controls)||state.controls.length>128)throw Error('Invalid Chain state.');
  const ids=new Set();for(const c of state.controls){
    if(typeof c.id!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}(\/[a-zA-Z][a-zA-Z0-9_-]{0,63})?$/.test(c.id)||ids.has(c.id)||!['label','unit','section'].every(k=>typeof c[k]==='string'&&c[k].length<=120)||!['min','max','default','step','value'].every(k=>Number.isFinite(c[k]))||c.min>=c.max||c.step<=0||c.default<c.min||c.default>c.max||c.value<c.min||c.value>c.max||!['linear','log'].includes(c.curve)||(c.curve==='log'&&c.min<=0))throw Error('Invalid Chain control.');ids.add(c.id);
  }
  const stages=state.stages||[],factories=state.factories||[];if(stages.length>32||factories.length>64||new Set(stages.map(s=>s.id)).size!==stages.length)throw Error('Invalid stage topology.');
  for(const s of [...stages,...factories])if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(s.id)||typeof s.name!=='string'||!['inputWidth','outputWidth'].every(k=>Number.isInteger(s[k])&&s[k]>=1&&s[k]<=32))throw Error('Invalid stage ports.');
  let width=state.width;for(const s of stages){validateMatrix(s.matrix,width,s.inputWidth);width=s.outputWidth;}if(state.managed)validateMatrix(state.outputMatrix,width,state.width);
  return state;
}
export function validateMatrix(matrix,sourceWidth,targetWidth){if(matrix===null||matrix===undefined){if(sourceWidth!==targetWidth)throw Error('Channel widths require a matrix.');return;}if(!Array.isArray(matrix)||matrix.length!==targetWidth||matrix.some(row=>!Array.isArray(row)||row.length!==sourceWidth||row.some(v=>!Number.isFinite(v)||Math.abs(v)>16)))throw Error('Invalid routing matrix.');}
export async function createBridge(binding,{onValue=()=>{},onTopology=()=>{},onStatus=()=>{},timeout=1800,heartbeat=3000}={}){
  if(!binding||!/^chain:[a-zA-Z0-9_-]+$/.test(binding.instanceID)||!Number.isInteger(binding.port)||binding.port<1||binding.port>65535)throw Error('Invalid native Chain binding.');
  const socket=dgram.createSocket('udp4'),token=crypto.randomUUID(),requests=new Map(),edits=new Map();let closed=false,alive=0,timer,failed=false;
  const output=createOscOutput({encodeMessage:encodeOSC,sendPacket:bytes=>new Promise((resolve,reject)=>socket.send(bytes,binding.port,'127.0.0.1',e=>e?reject(e):resolve()))});
  const send=(op,args=[])=>output.send({address:'/awb/chain/control',args:[binding.instanceID,op,...args]});
  const rejectAll=error=>{for(const r of requests.values()){clearTimeout(r.timer);r.reject(error);}requests.clear();for(const r of edits.values()){clearTimeout(r.timer);r.reject(error);}edits.clear();};
  socket.on('error',e=>onStatus(false,e.message));
  socket.on('message',(bytes,remote)=>{
    if(closed||remote.address!=='127.0.0.1'||remote.port!==binding.port)return;
    try{
      const {address,args}=decodeOSC(bytes);if(args[0]!==binding.instanceID)return;
      if(address==='/awb/chain/error'){const error=Error(String(args[1]));rejectAll(error);onStatus(false,error.message,'edit-rejected');return;}
      if(address==='/awb/chain/closed'&&args[1]===token){clearInterval(timer);rejectAll(Error('Chain closed.'));onStatus(false,'Chain closed.');return;}
      if(address==='/awb/chain/alive'&&args[1]===token){alive=Date.now();failed=false;onStatus(true,null);return;}
      if(address==='/awb/chain/topology'&&args[1]===token){onTopology(args[2]);return;}
      if(address==='/awb/chain/edit'&&args[1]===token){const r=edits.get(args[2]);if(!r)return;clearTimeout(r.timer);edits.delete(args[2]);if(args[3]==='ok')r.resolve(args[4]);else r.reject(Error(String(args[4])));return;}
      if(address==='/awb/chain/value'&&args[1]===token){const [, ,revision,id,value]=args;if(!Number.isSafeInteger(revision)||typeof id!=='string'||!Number.isFinite(value))throw Error('Invalid Chain update.');onValue({id,value,revision});return;}
      if(address!=='/awb/chain/state')return;
      const [,id,kind,...a]=args,r=requests.get(id);if(!r)return;
      if(kind==='begin'){const [name,factory,width,count,revision,managed=0,stageCount=0,factoryCount=0]=a;if(![stageCount,factoryCount].every(n=>Number.isInteger(n)&&n>=0&&n<=64)||![0,1].includes(managed))throw Error('Invalid Chain stage counts.');if(!Number.isInteger(count)||count<0||count>128)throw Error('Invalid Chain control count.');r.header={name,factory,width,revision,count,managed:managed===1,stageCount,factoryCount};}
      else if(kind==='control'){const [id,label,min,max,initial,step,curve,unit,section,value,index,stage='']=a;if(!Number.isInteger(index)||index<0||index>=128)throw Error('Invalid Chain control index.');r.controls.set(index,{id,label,min,max,default:initial,step,curve,unit,section,value,stage});}
      else if(kind==='stage'){const[id,factory,name,inputWidth,outputWidth,index,matrix]=a;r.stages.set(index,{id,factory,name,inputWidth,outputWidth,matrix:JSON.parse(matrix)});}
      else if(kind==='factory'){const[id,name,inputWidth,outputWidth,index]=a;r.factories.set(index,{id,name,inputWidth,outputWidth});}
      else if(kind==='route')r.outputMatrix=JSON.parse(a[0]);
      else if(kind==='end')r.end=a[0];
      if(r.header&&r.end===r.header.revision&&r.controls.size===r.header.count&&r.stages.size===r.header.stageCount&&r.factories.size===r.header.factoryCount){const controls=[];for(let i=0;i<r.header.count;i++){if(!r.controls.has(i))throw Error('Incomplete Chain control order.');controls.push(r.controls.get(i));}const stages=[...r.stages].sort((a,b)=>a[0]-b[0]).map(e=>e[1]),factories=[...r.factories].sort((a,b)=>a[0]-b[0]).map(e=>e[1]);const state=validateState({...r.header,controls,stages,factories,outputMatrix:r.outputMatrix??null,instanceID:binding.instanceID});clearTimeout(r.timer);requests.delete(id);r.resolve(state);}
    }catch(e){rejectAll(e);onStatus(false,e.message);}
  });
  await new Promise((resolve,reject)=>{socket.once('error',reject);socket.bind(0,'127.0.0.1',()=>{socket.removeListener('error',reject);resolve();});});
  const watch=()=>send('watch',[token]).catch(e=>onStatus(false,e.message));
  timer=setInterval(()=>{if(Date.now()-alive>heartbeat*3&&!failed){failed=true;onStatus(false,'Chain feedback timed out.');}void watch();},heartbeat);alive=Date.now();await watch();
  return {
    token,binding,stats:()=>output.snapshot(),
    setMany(values){if(closed)return Promise.reject(Error('Chain bridge closed.'));return output.sendMany(Object.entries(values).map(([id,value])=>({message:{address:'/awb/chain/control',args:[binding.instanceID,'set',id,value,token]}})));},
    edit(op,args=[]){if(closed)return Promise.reject(Error('Chain bridge closed.'));const id=crypto.randomUUID();return new Promise((resolve,reject)=>{const r={resolve,reject,timer:setTimeout(()=>{edits.delete(id);reject(Error('Chain topology edit timed out.'));},5000)};edits.set(id,r);send('edit',[token,id,op,...args]).catch(e=>{clearTimeout(r.timer);edits.delete(id);reject(e);});});},
    sync(){if(closed)return Promise.reject(Error('Chain bridge closed.'));const id=crypto.randomUUID();return new Promise((resolve,reject)=>{const r={resolve,reject,controls:new Map(),stages:new Map(),factories:new Map(),timer:setTimeout(()=>{requests.delete(id);reject(Error('Chain Sync timed out.'));},timeout)};requests.set(id,r);send('sync',[id]).catch(e=>{clearTimeout(r.timer);requests.delete(id);reject(e);});});},
    async close(){if(closed)return;closed=true;clearInterval(timer);rejectAll(Error('Chain bridge closed.'));await send('unwatch',[token]).catch(()=>{});await output.close();await new Promise(resolve=>socket.close(resolve));}
  };
}
