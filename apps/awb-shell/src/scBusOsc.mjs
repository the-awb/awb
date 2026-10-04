import dgram from 'node:dgram';
import {EventEmitter} from 'node:events';
const str=s=>{const b=Buffer.from(s+'\0');return Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);};
export function encode(address,args=[]) {
 let tags=',';const data=[];
 for(const x of args){
  if(typeof x==='string'){tags+='s';data.push(str(x));}
  else {const b=Buffer.alloc(4);if(Number.isInteger(x)){tags+='i';b.writeInt32BE(x);}else{tags+='f';b.writeFloatBE(x);}data.push(b);}
 }
 return Buffer.concat([str(address),str(tags),...data]);
}
export function decode(b){
 let offset=0;const string=()=>{const end=b.indexOf(0,offset);if(end<0)throw new Error('Invalid OSC string');const s=b.toString('utf8',offset,end);offset=(end+4)&~3;return s;};
 const address=string(),tags=string(),args=[];
 for(const tag of tags.slice(1)){if(tag==='s')args.push(string());else if(tag==='i'){args.push(b.readInt32BE(offset));offset+=4;}else if(tag==='f'){args.push(b.readFloatBE(offset));offset+=4;}else if(tag==='d'){args.push(b.readDoubleBE(offset));offset+=8;}else throw new Error('Unsupported OSC type');}
 return {address,args};
}
export class OSC extends EventEmitter {
 constructor(port){super();this.port=port;this.socket=dgram.createSocket('udp4');this.socket.on('message',b=>{try{const m=decode(b);this.emit('message',m);if(m.address==='/fail')this.emit('serverFailure',m.args);}catch{}});this.socket.on('error',e=>this.emit('socketError',e));}
 send(address,...args){this.socket.send(encode(address,args),this.port,'127.0.0.1');}
 async request(address,args,response,match=()=>true,timeout=4000){
  return new Promise((resolve,reject)=>{const handler=m=>{if(m.address===response&&match(m.args)){done();resolve(m.args);}else if(m.address==='/fail'||m.address==='/awb/sc-bus/error'&&m.args[0]===args[0]){done();reject(new Error(m.args.join(' ')));}};const timer=setTimeout(()=>{done();reject(new Error(`${address} timed out`));},timeout);const done=()=>{clearTimeout(timer);this.off('message',handler);};this.on('message',handler);this.send(address,...args);});
 }
 async sync(){const id=Math.floor(Math.random()*1e7);await this.request('/sync',[id],'/synced',a=>a[0]===id);}
 close(){this.socket.close();}
}
