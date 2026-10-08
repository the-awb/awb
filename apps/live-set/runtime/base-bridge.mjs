import dgram from 'node:dgram';import crypto from 'node:crypto';import {encode,decode} from '../../awb-shell/src/scBusOsc.mjs';
export async function createBaseBridge(binding,{onLog=()=>{},onStatus=()=>{},onScene=()=>{},timeout=2500}={}){
 if(!/^awbBase:[a-zA-Z0-9_-]+$/.test(binding?.instanceID)||!Number.isInteger(binding.port)||binding.port<1||binding.port>65535)throw Error('Invalid AWBase binding');
 const socket=dgram.createSocket('udp4'),token=crypto.randomUUID(),request=crypto.randomUUID();let epoch,closed=false,timer,alive=performance.now(),logs=[],mappings=[],meters=[],resolve,reject,waiting,scenes=[],scene={current:null,name:"",transitioning:false,remaining:0};const launches=new Map();
 const send=(op,args)=>new Promise((ok,fail)=>socket.send(encode('/awb/base/control',[binding.instanceID,op,token,...args]),binding.port,'127.0.0.1',e=>e?fail(e):ok()));
 socket.on('error',e=>{reject?.(e);onStatus(false,e.message)});
 socket.on('message',(bytes,peer)=>{if(peer.address!=='127.0.0.1'||peer.port!==binding.port)return;try{const {address,args:a}=decode(bytes);if(a[0]!==binding.instanceID||a[1]!==token)return;
  if(address==='/awb/base/error'){const pending=launches.get(a[2]);if(pending){clearTimeout(pending.timer);launches.delete(a[2]);pending.reject(Error(a[3]))}else if(a[2]===request)reject?.(Error(a[3]));return}
  if(address==='/awb/base/begin'&&a[3]===request){epoch=a[2];logs=[];mappings=[];meters=[];scenes=[];return}
  if(a[2]!==epoch)return;
  if(address==='/awb/base/scenes-begin'){scenes=[];return}
  if(address==='/awb/base/scenes-end'){onScene({...scene});return}
  if(address==='/awb/base/scene-result'){const pending=launches.get(a[3]);if(pending){clearTimeout(pending.timer);launches.delete(a[3]);pending.resolve(scene)}return}
  if(address==='/awb/base/scene-entry'){if(Number.isInteger(a[3])&&typeof a[4]==='string'&&Number.isFinite(a[5]))scenes.push({id:a[3],name:a[4],duration:a[5]});return}
  if(address==='/awb/base/scene-state'){if(!Number.isInteger(a[3])||![0,1].includes(a[5])||!Number.isFinite(a[6])||a[6]<0)return;scene={current:a[3]<0?null:a[3],name:a[4],transitioning:!!a[5],remaining:a[6]};onScene(scene);return}
  if(address==='/awb/base/log'){const entry={seq:a[3],time:a[4],level:a[5],text:a[6]};if(!Number.isInteger(entry.seq)||typeof entry.text!=='string')return;if(!logs.some(l=>l.seq===entry.seq)){logs.push(entry);logs=logs.slice(-500);onLog(entry)}return}
  if(address==='/awb/base/meter'){if(typeof a[3]==='string'&&Number.isInteger(a[4])&&a[4]>=0)meters.push({id:a[3],bus:a[4]});return}
  if(address==='/awb/base/mapping'){mappings.push({track:a[3],name:a[4],label:a[5],channel:a[6],cc:a[7],lo:a[8],hi:a[9],pickup:!!a[10],status:a[11]});return}
  if(address==='/awb/base/end'&&a[3]===request){clearTimeout(waiting);alive=performance.now();resolve?.({epoch,logs,mappings});resolve=reject=null;onStatus(true,null);return}
  if(address==='/awb/base/alive'){alive=performance.now();onStatus(true,null)}
  if(address==='/awb/base/closed'){onStatus(false,'AWBase closed')}
 }catch(e){onStatus(false,e.message)}});
 await new Promise((ok,fail)=>{socket.once('error',fail);socket.bind(0,'127.0.0.1',ok)});
 try{await new Promise((ok,fail)=>{resolve=ok;reject=fail;waiting=setTimeout(()=>fail(Error('AWBase console bind timed out')),timeout);void send('bind',[request]).catch(fail)})}catch(e){socket.close();clearTimeout(waiting);throw e}
 timer=setInterval(()=>{if(closed)return;if(performance.now()-alive>6500)onStatus(false,'AWBase console heartbeat timed out');void send('alive',['heartbeat',epoch]).catch(e=>onStatus(false,e.message))},2000);timer.unref();
 return {state:()=>({epoch,logs:logs.slice(),mappings:mappings.slice(),meters:meters.slice(),scenes:scenes.slice(),scene:{...scene}}),
 launchScene(id,duration){
  if(closed)return Promise.reject(Error('AWBase bridge closed'));
  if(!(Number.isInteger(id)&&id>=0)&&!(typeof id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(id)))return Promise.reject(Error('Invalid scene ID'));
  const seconds=duration??scenes.find(s=>String(s.id)===String(id)||s.name===id)?.duration??0;
  if(!Number.isFinite(seconds)||seconds<0||seconds>3600)return Promise.reject(Error('Invalid scene duration'));
  if(scene.transitioning)return Promise.reject(Error('A scene transition is already in progress'));
  const idRequest=crypto.randomUUID();return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{launches.delete(idRequest);reject(Error('Scene launch acknowledgement timed out'))},timeout);launches.set(idRequest,{resolve,reject,timer});
   void send('launch-scene',[idRequest,epoch,String(id),seconds]).catch(error=>{clearTimeout(timer);launches.delete(idRequest);reject(error)});
  });
 },async close(){if(closed)return;closed=true;for(const p of launches.values()){clearTimeout(p.timer);p.reject(Error('AWBase bridge closed'))}launches.clear();clearTimeout(waiting);clearInterval(timer);await send('unwatch',['close',epoch]).catch(()=>{});socket.close()}};
}
