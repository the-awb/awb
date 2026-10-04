import {createWebGLRack} from './diagnostic-worker-renderer.mjs';
let values,listener,renderer,stats;
self.onmessage=async({data:d})=>{try{
 if(d.type==='init'){values=new Map(d.values);stats={hostRenders:0,frames:0,fullFrames:0,tiles:0,attributeUpdates:0,drawCalls:0,presentations:0};
 const store={get:id=>values.get(id),mixDraft:null,subscribeAll:f=>{listener=f;return()=>{listener=null;};}};
 renderer=createWebGLRack({canvas:d.canvas},{store,layout:d.layout,stats});postMessage({type:'ready'});
 }else if(d.type==='changes'){for(const [id,value]of d.changes){values.set(id,value);listener?.({kind:'value',id});}}
 else if(d.type==='flush'||d.type==='reset'){await rackDiagnostic[d.type]();postMessage({type:'response',request:d.request,snapshot:rackDiagnostic.snapshot()});}
 else if(d.type==='dispose'){renderer.dispose();close();}
}catch(e){postMessage({type:'error',message:e.stack||e.message});}};
