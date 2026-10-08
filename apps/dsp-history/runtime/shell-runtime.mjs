import http from 'node:http';
import dgram from 'node:dgram';
import crypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {DSPHistory} from './history.mjs';
import {encodeOscMessage,decodeOscPacket} from '../../awb-shell/services/oscCodec.mjs';
const shared=new Map();
function acquire(port) {
  let record=shared.get(port);
  if(!record) {
    const socket=dgram.createSocket('udp4'),history=new DSPHistory();let lastAt=0,pending=false,closed=false;
    record={socket,history,refs:0,timer:null};shared.set(port,record);
    socket.on('message',(packet,rinfo)=>{if(rinfo.address!=='127.0.0.1'||rinfo.port!==port)return;try {for(const m of decodeOscPacket(packet))if(m.address==='/status.reply'&&history.push(Date.now(),m.args)){lastAt=Date.now();pending=false;}}catch{}});
    socket.on('error',()=>{pending=false;history.gap(Date.now());});
    socket.bind(0,'127.0.0.1',()=>{if(closed)return;
      const poll=()=>{if(closed)return;const now=Date.now();if(pending&&now-lastAt<1000)return;if(pending)history.gap(now);pending=true;if(!lastAt)lastAt=now;socket.send(encodeOscMessage('/status',[]),port,'127.0.0.1',error=>{if(error){pending=false;history.gap(Date.now());}});};
      poll();record.timer=setInterval(poll,250);record.timer.unref();
    });
    record.stop=()=>{closed=true;clearInterval(record.timer);socket.close();shared.delete(port);};
  }
  record.refs++;let released=false;
  return {history:record.history,release(){if(released)return;released=true;if(--record.refs===0)record.stop();}};
}
export async function startRuntime({serverPort=Number(process.env.AWB_DSP_HISTORY_PORT??57110),httpPort=0}={}) {
  const valid=v=>Number.isInteger(v)&&v>0&&v<=65535;
  if(!valid(serverPort))throw Error('Invalid server OSC port.');
  let observation=acquire(serverPort),stopped=false;const token=crypto.randomUUID();
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');res.setHeader('Cache-Control','no-store');
    try {
      if(url.pathname==='/api/history'&&req.method==='GET') {
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify({...observation.history.snapshot({after:Number(url.searchParams.get('after')??0),epoch:Number(url.searchParams.get('epoch')??0)}),serverPort,token,now:Date.now(),pollHz:4}));return;
      }
      if(req.method==='POST'&&['/api/clear','/api/server'].includes(url.pathname)) {
        if(req.headers['x-awb-token']!==token||req.headers.origin&&req.headers.origin!==`http://127.0.0.1:${server.address().port}`){res.writeHead(403);res.end();return;}
        if(url.pathname==='/api/clear')observation.history.clear();
        else {let raw='';for await(const bytes of req){raw+=bytes;if(raw.length>256)throw Error('Request too large.');}const port=JSON.parse(raw).port;if(!valid(port))throw Error('Invalid server OSC port.');if(port!==serverPort){observation.release();serverPort=port;observation=acquire(port);}}
        res.setHeader('Content-Type','application/json');res.end('{}');return;
      }
      const files={'/':'../index.html','/index.html':'../index.html','/panel.js':'../panel.js','/style.css':'../style.css'};
      if(req.method!=='GET'||!files[url.pathname]){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'");
      res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'text/html');res.end(await readFile(new URL(files[url.pathname],import.meta.url)));
    } catch(error) {res.writeHead(400,{'Content-Type':'text/plain'});res.end(error.message);}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(httpPort,'127.0.0.1',resolve);}).catch(error=>{observation.release();throw error;});
  return {url:`http://127.0.0.1:${server.address().port}/`,async stop(){if(stopped)return;stopped=true;observation.release();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
