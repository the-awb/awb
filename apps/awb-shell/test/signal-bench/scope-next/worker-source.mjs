import {Worker} from 'node:worker_threads';
export async function openWorkerSource({host,configuration,onFrame,onError}){
 const worker=new Worker(new URL('./reader-worker.mjs',import.meta.url),{workerData:{host:{oscHost:host.oscHost,oscPort:host.oscPort,token:host.token},configuration}});
 let info,id=0,stopping=false;const replies=new Map();
 let readyResolve,readyReject;const ready=new Promise((r,j)=>{readyResolve=r;readyReject=j;});
 const request=type=>new Promise((resolve,reject)=>{const next=++id,t=setTimeout(()=>{replies.delete(next);reject(new Error('Worker command timeout: '+type));},6000);replies.set(next,{resolve:value=>{clearTimeout(t);resolve(value)},reject});worker.postMessage({type,id:next});});
 const fail=error=>{readyReject(error);for(const pending of replies.values())pending.reject(error);replies.clear();onError(error);};
 worker.on('error',fail);worker.on('exit',code=>{if(code&&!stopping)fail(new Error('Reader worker exited '+code));});
 worker.on('message',message=>{
  if(message.type==='ready'){info=message.info;readyResolve();}
  else if(message.type==='reply'){replies.get(message.id)?.resolve(message.stats);replies.delete(message.id);}
  else if(message.type==='error')fail(new Error(message.error));
  else if(message.type==='frame'){try{onFrame(message.frame,info)}catch(error){onError(error)}finally{if(!stopping)worker.postMessage({type:'ack'});}}
 });
 try{await ready;}catch(error){await worker.terminate();throw error}
 return {info,resetStats:()=>request('reset'),stats:()=>request('stats'),stop:async()=>{if(stopping)return;stopping=true;try{await request('stop')}finally{await worker.terminate();}}};
}
