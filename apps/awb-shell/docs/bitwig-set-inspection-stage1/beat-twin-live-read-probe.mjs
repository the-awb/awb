// Temporary, loopback-only witness for the unchanged pinned controller.
// No MCP installation. Only these hard-coded reads are sent; never navigation or writes.
import net from 'node:net';
import fs from 'node:fs';
const output=new URL('evidence/beat-twin-live-read.jsonl',import.meta.url);
const log=x=>fs.appendFileSync(output,JSON.stringify({at:new Date().toISOString(),...x})+'\n');
const reads=[['ping',[]],['project.get_summary',[]],['device.list',[0]],['mixer.return.list',[]],['mixer.master.get_volume',[]],['device.get_remote_controls',[]]];
let socket,buffer='',index=0,pending,timer;
const server=net.createServer(s=>{
  if(socket||s.remoteAddress!=='127.0.0.1'){s.destroy();return;}
  socket=s;log({event:'controller-connected',peer:s.remoteAddress});s.setEncoding('utf8');
  s.on('error',e=>log({event:'socket-error',message:e.message}));
  s.on('data',data=>{
    buffer+=data;
    if(buffer.length>1048576){log({event:'oversize'});finish();return;}
    let end;
    while((end=buffer.indexOf('\n'))!==-1){
      const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.trim())continue;
      let reply;try{reply=JSON.parse(line);}catch{log({event:'unparsed',line});continue;}
      log({event:'reply',method:pending?.method,reply});
      if(pending&&reply.id===pending.id){clearTimeout(timer);pending=null;next();}
    }
  });
  setTimeout(next,1500);
});
function next(){
  if(index>=reads.length){log({event:'done',requests:index});finish();return;}
  const [method,params]=reads[index++];pending={jsonrpc:'2.0',id:index,method,params};
  log({event:'request',request:pending});
  const body=Buffer.from(JSON.stringify(pending));const header=Buffer.alloc(4);header.writeUInt32BE(body.length);
  socket.write(Buffer.concat([header,body]));
  timer=setTimeout(()=>{log({event:'request-timeout',method});pending=null;next();},4000);
}
let ending=false;
function finish(){if(ending)return;ending=true;clearTimeout(timer);clearTimeout(deadline);socket?.destroy();server.close();}
const deadline=setTimeout(()=>{log({event:'deadline',controllerConnected:Boolean(socket)});finish();},45000);
server.on('error',e=>{log({event:'listen-error',message:e.message});finish();process.exitCode=1;});
server.listen(8889,'127.0.0.1',()=>{log({event:'listening',address:'127.0.0.1:8889',deadlineSeconds:45});console.log('Bounded Beat Twin read witness: 127.0.0.1:8889, maximum 45 seconds');});
