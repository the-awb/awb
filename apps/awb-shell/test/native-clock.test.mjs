import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import dgram from 'node:dgram';
const exec=promisify(execFile),require=createRequire(import.meta.url),root=fileURLToPath(new URL('..',import.meta.url));
test('native reader rejects invalid active clocks but waits through invalid startup publication',{timeout:30000},async()=>{
 const tmp=await mkdtemp('/private/tmp/awb-native-clock-'),header=process.env.SC_SOURCE||'/Users/willy/supercollider',socket=dgram.createSocket('udp4');let child,reader;
 const native=require(process.env.AWB_CLOCK_READER||root+'/.build/sc-bus-reader.node');
 try{
  await exec('clang',['-O2','-c',header+'/external_libraries/TLSF-2.4.6/src/tlsf.c','-o',tmp+'/tlsf.o']);
  await exec('clang++',['-std=c++17','-O2','-Wno-deprecated-builtins','-I'+header+'/common','-I'+header+'/external_libraries/boost','-I'+header+'/external_libraries/TLSF-2.4.6/src',root+'/test/native-clock-writer.cpp',tmp+'/tlsf.o','-o',tmp+'/writer']);
  await new Promise(r=>socket.bind(0,'127.0.0.1',r));const port=socket.address().port;
  child=spawn(tmp+'/writer',[String(port)],{stdio:['pipe','pipe','inherit']});const lines=[],waiting=[];const rl=createInterface({input:child.stdout});rl.on('line',line=>waiting.length?waiting.shift()(line):lines.push(line));
  const line=()=>lines.length?Promise.resolve(lines.shift()):new Promise(r=>waiting.push(r));const push=async command=>{child.stdin.write(command+'\n');assert.equal(await line(),'published');};
  assert.equal(await line(),'ready');reader=native.attach(port,0,1,512);
  await push('bad');assert.equal(native.read(reader),null,'Cached invalid startup data is not exposed');
  await push('512');assert.equal(native.read(reader),null,'First good clock only warms reader');assert.equal(native.read(reader),null,'Repeated cached clock does not activate reader');
  await push('1024');const packet=native.read(reader);assert.equal(packet.sourceEnd,1024);assert.equal(packet.frames,512);assert.ok([...packet.samples].every(v=>v===.125));
  await push('bad');assert.throws(()=>native.read(reader),/Invalid SC bus clock/,'Corruption after activation remains a hard error');native.detach(reader);reader=null;
  child.stdin.write('quit\n');const exit=await new Promise(r=>child.once('exit',r));assert.equal(exit,0);rl.close();
 }finally{if(reader)native.detach(reader);if(child&&child.exitCode===null){child.stdin.end('quit\n');await new Promise(r=>child.once('exit',r));}socket.close();await rm(tmp,{recursive:true,force:true});}
});
