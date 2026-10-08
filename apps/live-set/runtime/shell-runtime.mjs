import {ControlObservationBroker} from '../../awb-shell/src/controlObservationBroker.mjs';
import {createDelayBridge} from './delay-bridge.mjs';import {startNetwork} from '../../../tool-artifacts/buffer-views/0.1.0/network-server.mjs';import path from 'node:path';import {readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {startRuntime as startParams} from '../../param/runtime/shell-runtime.mjs';import {startRuntime as startRack} from '../../rack/runtime/shell-runtime.mjs';import {createBaseBridge} from './base-bridge.mjs';import {validateSurface,localViewURL} from '../src/catalog.mjs';import {requestableViews} from '../../../tool-artifacts/buffer-views/0.1.0/network-model.mjs';
export async function startRuntime({runtimeDirectory='/private/tmp/awb-live-set-runtime',controlObservations,binding,baseBinding,surface={},bridgeFactory,baseBridgeFactory=createBaseBridge,rackFactory=startRack,previewRack=false,rackBinding,delayURL=process.env.AWB_LIVE_DELAY_URL,delayBinding=process.env.AWB_LIVE_DELAY_BIND==='1',delayBridgeFactory=createDelayBridge}={}){
 const ownBroker=!controlObservations,broker=controlObservations??new ControlObservationBroker(),meterClosers=new Set();
 const clients=new Set(),config=validateSurface(surface);let base,params,rack,delays,stopped=false,error=null;
 const publish=m=>{const text=`data: ${JSON.stringify(m)}\n\n`;for(const res of clients){if(res.destroyed){clients.delete(res);continue}if(res.writableLength>131072){res.destroy();clients.delete(res)}else res.write(text)}};
 const port=Number(process.env.AWB_PARAM_SC_PORT);binding??=process.env.AWB_PARAM_INSTANCE_ID?{instanceID:process.env.AWB_PARAM_INSTANCE_ID,port}:null;
 baseBinding??=process.env.AWB_LIVE_BASE_ID?{instanceID:process.env.AWB_LIVE_BASE_ID,port}:null;
 if(process.env.AWB_LIVE_CELL_VIEWS)config.cellViews=validateSurface({cellViews:JSON.parse(process.env.AWB_LIVE_CELL_VIEWS)}).cellViews;
 if(process.env.AWB_LIVE_ROUTING_VIEW)config.routingView=validateSurface({routingView:process.env.AWB_LIVE_ROUTING_VIEW}).routingView;
 try{
 if(delayBinding){
  const adapter=await delayBridgeFactory(baseBinding);try{delays=await startNetwork({adapter,initial:adapter.initial});delayURL=delays.url;}catch(e){await adapter.close();throw e}
 }
 if(delayURL){
  const views=requestableViews(localViewURL(delayURL));
  const embed=url=>{const u=new URL(url);u.searchParams.set('embed','1');return u.href};
  config.cellViews=Object.fromEntries(views.filter(v=>v.kind==='tape').map(v=>[v.cell.toLowerCase(),embed(v.url)]));
  config.headViews=Object.fromEntries(views.filter(v=>v.kind==='heads').map(v=>[v.cell.toLowerCase(),embed(v.url)]));
  config.routingView=embed(views.find(v=>v.kind==='routing').url);config.managedCells=true;
 }
  if(!config.rackView&&(previewRack||rackBinding||process.env.AWB_RACK_INSTANCE_ID)){
   const native=!!(rackBinding||process.env.AWB_RACK_INSTANCE_ID);let seedDocument;
   if(!native){seedDocument=JSON.parse(await readFile(new URL('../../rack/fixtures/live-set.rack.json',import.meta.url),'utf8'));seedDocument.config.output.mode='off'}
   rack=await rackFactory({runtimeDirectory:path.join(runtimeDirectory,'rack'),scBinding:rackBinding,seedDocument,fixedFXReturns:true,autoArmSC:native,sceneTransitioning:()=>base?.state().scene?.transitioning===true,sceneLauncher:async(id,duration)=>{if(!base)throw Error('SC scene host is unavailable');return base.launchScene(id,duration)},...(!native?{sendPacket:()=>{}}:{})});config.rackView=new URL("?embed=1",rack.url).href;config.rackMode=native?'native':'preview';
  }
  if(baseBinding)try{base=await baseBridgeFactory(baseBinding,{onLog:entry=>publish({type:'log',entry}),onScene:scene=>publish({type:'scene-state',scene}),onStatus:(connected,message)=>{error=message;publish({type:'console-status',connected,error:message})}})}catch(e){error=e.message}
  params=await startParams({binding,controlObservations:broker,bridgeFactory,frameSources:"http://127.0.0.1:*",rendererRoot:path.resolve(fileURLToPath(new URL('../dist/',import.meta.url))),additionalRoutes:async(req,res,url,{token})=>{
   if(req.method==='GET'&&['/delay-widgets.js','/delay-widgets.css'].includes(url.pathname)){const body=await readFile(new URL('../.build/delay-widgets/'+url.pathname.slice(1),import.meta.url));res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':'text/javascript');res.setHeader('Access-Control-Allow-Origin','*');res.end(body);return true}
   if(req.method==='POST'&&url.pathname==='/api/scenes/launch'){
    if(req.headers['x-param-token']!==token){res.writeHead(403);res.end();return true}
    if(!base)throw Error('SC scene host is unavailable');if(rack?.state?.().recall)throw Error('A scene transition is already in progress');let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('Scene request too large')}const request=JSON.parse(body);const scene=await base.launchScene(request.id,request.duration);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,scene}));return true;
   }
   if(url.pathname==='/api/live-set'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({surface:config,console:{...(base?.state()??{logs:[],mappings:[]}),connected:!!base&&!error,error},rackBound:!!(rackBinding??process.env.AWB_RACK_INSTANCE_ID)}));return true}
   if(url.pathname==='/events/meters'){
    if(url.searchParams.get('token')!==token){res.writeHead(403);res.end();return true}
    const host=params.observationHost(),meters=base?.state().meters??[];
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store'});res.write(`data: ${JSON.stringify({type:'meter-state',ids:host?meters.map(m=>m.id):[]})}\n\n`);
    let lease,ended=false;const close=()=>{if(ended)return;ended=true;lease?.close();lease=null;meterClosers.delete(close);if(!res.destroyed)res.end()};meterClosers.add(close);res.on('close',close);
    if(host&&meters.length)try{lease=broker.subscribe({...host,isAlive:()=>!stopped&&!!params.observationHost()},meters.map(m=>m.bus),{hz:15,onValues:batch=>{
      if(res.destroyed||res.writableLength>131072){close();res.destroy();return}
      res.write(`data: ${JSON.stringify({type:'meter-values',changes:batch.changed.map(i=>({id:meters[i].id,value:batch.values[i]}))})}\n\n`);
    },onError:close})}catch{close()}
    return true;
   }
   if(url.pathname!=='/events/logs')return false;
   if(url.searchParams.get('token')!==token){res.writeHead(403);res.end();return true}
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store'});res.write(`data: ${JSON.stringify({type:'console-state',state:base?.state()??{logs:[],mappings:[]}})}\n\n`);clients.add(res);req.on('close',()=>clients.delete(res));return true;
  }});
 for(const [cell,url]of Object.entries(config.cellViews)){const u=new URL(url);u.searchParams.set('hostOrigin',new URL(params.url).origin);u.searchParams.set('paramGUI','1');config.cellViews[cell]=u.href;}
 if(config.rackView){const u=new URL(config.rackView);u.searchParams.set('hostOrigin',new URL(params.url).origin);config.rackView=u.href;}
 }catch(e){await delays?.stop();await rack?.stop();await base?.close();if(ownBroker)broker.close();throw e}
 return {...params,surface:config,async stop(){if(stopped)return;stopped=true;for(const close of [...meterClosers])close();for(const c of clients)c.end();clients.clear();await params.stop();await delays?.stop();await base?.close();await rack?.stop();if(ownBroker)broker.close()}};
}
