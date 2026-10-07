import dgram from 'node:dgram';import crypto from 'node:crypto';import {encode,decode} from '../../awb-shell/src/scBusOsc.mjs';
export async function createBaseBridge(binding,{onLog=()=>{},onStatus=()=>{},timeout=2500}={}){
 if(!/^awbBase:[a-zA-Z0-9_-]+$/.test(binding?.instanceID)||!Number.isInteger(binding.port)||binding.port<1||binding.port>65535)throw Error('Invalid AWBase binding');
 const socket=dgram.createSocket('udp4'),token=crypto.randomUUID(),request=crypto.randomUUID();let epoch,closed=false,timer,alive=performance.now(),logs=[],mappings=[],resolve,reject,waiting;
 const send=(op,args)=>new Promise((ok,fail)=>socket.send(encode('/awb/base/control',[binding.instanceID,op,token,...args]),binding.port,'127.0.0.1',e=>e?fail(e):ok()));
 socket.on('error',e=>{reject?.(e);onStatus(false,e.message)});
 socket.on('message',(bytes,peer)=>{if(peer.address!=='127.0.0.1'||peer.port!==binding.port)return;try{const {address,args:a}=decode(bytes);if(a[0]!==binding.instanceID||a[1]!==token)return;
  if(address==='/awb/base/error'){reject?.(Error(a[3]));return}
  if(address==='/awb/base/begin'&&a[3]===request){epoch=a[2];logs=[];mappings=[];return}
  if(a[2]!==epoch)return;
  if(address==='/awb/base/log'){const entry={seq:a[3],time:a[4],level:a[5],text:a[6]};if(!Number.isInteger(entry.seq)||typeof entry.text!=='string')return;if(!logs.some(l=>l.seq===entry.seq)){logs.push(entry);logs=logs.slice(-500);onLog(entry)}return}
  if(address==='/awb/base/mapping'){mappings.push({track:a[3],name:a[4],label:a[5],channel:a[6],cc:a[7],lo:a[8],hi:a[9],pickup:!!a[10],status:a[11]});return}
  if(address==='/awb/base/end'&&a[3]===request){clearTimeout(waiting);alive=performance.now();resolve?.({epoch,logs,mappings});resolve=reject=null;onStatus(true,null);return}
  if(address==='/awb/base/alive'){alive=performance.now();onStatus(true,null)}
  if(address==='/awb/base/closed'){onStatus(false,'AWBase closed')}
 }catch(e){onStatus(false,e.message)}});
 await new Promise((ok,fail)=>{socket.once('error',fail);socket.bind(0,'127.0.0.1',ok)});
 try{await new Promise((ok,fail)=>{resolve=ok;reject=fail;waiting=setTimeout(()=>fail(Error('AWBase console bind timed out')),timeout);void send('bind',[request]).catch(fail)})}catch(e){socket.close();clearTimeout(waiting);throw e}
 timer=setInterval(()=>{if(closed)return;if(performance.now()-alive>6500)onStatus(false,'AWBase console heartbeat timed out');void send('alive',['heartbeat',epoch]).catch(e=>onStatus(false,e.message))},2000);timer.unref();
 return {state:()=>({epoch,logs:logs.slice(),mappings:mappings.slice()}),async close(){if(closed)return;closed=true;clearTimeout(waiting);clearInterval(timer);await send('unwatch',['close',epoch]).catch(()=>{});socket.close()}};
}
