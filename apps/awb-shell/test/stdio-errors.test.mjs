import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {spawn} from 'node:child_process';
import {guardStdioPipes} from '../src/stdioErrors.mjs';

test('log pipe errors are narrow: EPIPE is tolerated, unrelated failures still surface',()=>{
 const stream=new EventEmitter(),remove=guardStdioPipes([stream]);
 stream.emit('error',Object.assign(Error('broken pipe'),{code:'EPIPE'}));
 stream.emit('error',Object.assign(Error('closed stream'),{code:'ERR_STREAM_DESTROYED'}));
 assert.throws(()=>stream.emit('error',Object.assign(Error('disk error'),{code:'EIO'})),/disk error/);
 remove();assert.equal(stream.listenerCount('error'),0);
});

test('shutdown console logging survives an actually closed launcher pipe',{timeout:5000},async()=>{
 const moduleURL=new URL('../src/stdioErrors.mjs',import.meta.url).href;
 const script=`import {guardStdioPipes} from ${JSON.stringify(moduleURL)};guardStdioPipes();let pipeError=null;process.stderr.on('error',e=>pipeError=e.code);process.on('message',()=>{for(let i=0;i<64;i++)console.error('shutdown diagnostic '+ 'x'.repeat(4096));setTimeout(()=>{process.send({pipeError});process.exit(0)},50)});process.send('ready');`;
 const child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['ignore','pipe','pipe','ipc']});
 const exited=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}));});
 try{
  const result=await new Promise((resolve,reject)=>{
   child.on('message',m=>{if(m==='ready'){child.stdout.destroy();child.stderr.destroy();child.send('log');}else resolve(m);});
   child.once('exit',code=>{if(code)reject(Error(`Logging child exited ${code}`));});
  });
  assert.equal(result.pipeError,'EPIPE');assert.deepEqual(await exited,{code:0,signal:null});
 }finally{if(child.exitCode===null)child.kill();}
});
