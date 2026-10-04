import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {WebSocketServer,WebSocket} from 'ws';
import {ScopeCapture} from './capture.mjs';
import {BUS_SCOPE_PROTOCOL,encodeBusScopeFrame} from './public/protocol.js';
const assets=new Map(['index.html','scope.js','scope.css','scope-opacity.js','protocol.js'].map(name=>['/'+name,new URL('./public/'+name,import.meta.url)]));
for(const name of ['scope-history.js','scope-painter.js','scope-metadata.js','scope-trace.js','style.css'])assets.set('/'+name,new URL('../../shared-loop/0.1.0/public/'+name,import.meta.url));
export async function startScopeRuntime({broker,getHost,ackTimeoutMs=5000}){
 if(!broker?.subscribeDerived||typeof getHost!=='function')throw new Error('Scope needs the shell signal engine.');
 let server,wss,closing=false,stopping,latest=null,packet=null,state;
 const clients=new Set();
 const pump=client=>{
  const {ws}=client;if(ws.readyState!==WebSocket.OPEN)return;
  if(client.awaiting!==null||client.busy||ws.bufferedAmount){if(Date.now()-client.sentAt>ackTimeoutMs)ws.terminate();return;}
  const text=JSON.stringify(state);
  if(client.status!==text){client.status=text;client.busy=true;client.sentAt=Date.now();ws.send(text,error=>{client.busy=false;if(error)ws.terminate();else pump(client);});return;}
  if(!state.connected||!latest||client.sequence===latest.sequence)return;
  packet??=Buffer.from(encodeBusScopeFrame(latest));client.sequence=latest.sequence;client.awaiting=latest.sequence;client.sentAt=Date.now();client.busy=true;
  ws.send(packet,{binary:true,compress:false},error=>{client.busy=false;if(error)ws.terminate();else if(client.awaiting===null)pump(client);});
 };
 const capture=new ScopeCapture({broker,getHost,onChange:(frame,next)=>{latest=frame;packet=null;state=next;for(const client of clients)pump(client);}});state=capture.state();
 const respond=(res,code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 server=http.createServer(async(req,res)=>{try{
  const authority=`127.0.0.1:${server.address()?.port}`,origin=`http://${authority}`;
  if(closing||req.headers.host!==authority){respond(res,403,{error:'Local scope address required'});return;}
  const pathname=new URL(req.url,origin).pathname;
  if(req.method==='GET'&&pathname==='/api/state'){respond(res,200,state);return;}
  if(req.method==='POST'&&['/api/listen','/api/stop'].includes(pathname)){
   if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'){respond(res,403,{error:'Same-origin JSON request required'});return;}
   let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>2048){respond(res,413,{error:'Scope request too large'});return;}body+=chunk;}
   let input;try{input=JSON.parse(body)}catch{respond(res,400,{error:'Invalid JSON'});return;}
   if(pathname==='/api/listen'&&!clients.size){respond(res,409,{error:'Connect the scope display before listening'});return;}
   const next=pathname==='/api/listen'?await capture.listen(input):await capture.stop();respond(res,200,next);return;
  }
  const file=assets.get(pathname==='/'?'/index.html':pathname);
  if(req.method!=='GET'||!file){respond(res,404,{error:'Not found'});return;}
  res.writeHead(200,{'Content-Type':file.pathname.endsWith('.js')?'text/javascript':file.pathname.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:"});res.end(await readFile(file));
 }catch(error){respond(res,400,{error:error.message});}});
 wss=new WebSocketServer({noServer:true,maxPayload:128,perMessageDeflate:false,handleProtocols:protocols=>protocols.has(BUS_SCOPE_PROTOCOL)?BUS_SCOPE_PROTOCOL:false});
 server.on('upgrade',(req,socket,head)=>{
  const authority=`127.0.0.1:${server.address()?.port}`;
  if(closing||req.url!=='/socket'||req.headers.host!==authority||req.headers.origin!==`http://${authority}`||!req.headers['sec-websocket-protocol']?.split(',').map(s=>s.trim()).includes(BUS_SCOPE_PROTOCOL)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  wss.handleUpgrade(req,socket,head,ws=>{
   const client={ws,awaiting:null,busy:false,status:null,sequence:null,sentAt:0};clients.add(client);
   ws.on('error',()=>ws.terminate());ws.on('close',()=>{clients.delete(client);if(!clients.size&&!closing)capture.stop().catch(()=>{});});
   ws.on('message',(data,binary)=>{try{
    const message=binary?null:JSON.parse(data.toString());
    if(!message||Object.keys(message).length!==1||!Number.isInteger(message.ack)||message.ack!==client.awaiting)throw new Error('Invalid acknowledgement');
    client.awaiting=null;pump(client);
   }catch{ws.close(1008,'Invalid scope acknowledgement');}});pump(client);
  });
 });
 const stop=()=>stopping??=(async()=>{
  closing=true;for(const client of clients)client.ws.terminate();
  const results=await Promise.allSettled([capture.close(),new Promise(r=>wss.close(r)),(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));})()]);
  const failures=results.filter(result=>result.status==='rejected').map(result=>result.reason);if(failures.length)throw new AggregateError(failures,'Scope runtime cleanup failed');
 })();
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});return {url:`http://127.0.0.1:${server.address().port}/`,stop};}
 catch(error){await stop().catch(()=>{});throw error;}
}
