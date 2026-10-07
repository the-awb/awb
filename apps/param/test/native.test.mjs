import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {spawn,spawnSync} from 'node:child_process';import {mkdtemp,readFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import dgram from 'node:dgram';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../../..',import.meta.url));
export async function checkNativeReader(){
 const directory=await mkdtemp(path.join(os.tmpdir(),'param-native-')),sc=process.env.SC_SOURCE??'/Users/willy/supercollider',native=require('../../awb-shell/.build/control-bus-reader.node'),socket=dgram.createSocket('udp4');let child,handle;
 try {
  await new Promise(r=>socket.bind(0,'127.0.0.1',r));const port=socket.address().port;
  const tlsf=spawnSync('clang',['-c',`${sc}/external_libraries/TLSF-2.4.6/src/tlsf.c`,'-o',path.join(directory,'tlsf.o')],{encoding:'utf8'});assert.equal(tlsf.status,0,tlsf.stderr);
  const build=spawnSync('clang++',['-std=c++17','-O2',`-I${sc}/common`,`-I${sc}/external_libraries/boost`,`-I${sc}/external_libraries/TLSF-2.4.6/src`,path.join(root,'apps/param/test/control-fixture.cpp'),path.join(directory,'tlsf.o'),'-o',path.join(directory,'fixture')],{encoding:'utf8'});assert.equal(build.status,0,build.stderr);
  child=spawn(path.join(directory,'fixture'),[String(port)],{stdio:['pipe','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('fixture timed out')),3000);child.stdout.once('data',b=>{clearTimeout(timer);b.toString().includes('READY')?resolve():reject(Error(b.toString()))});child.once('error',reject)});
  assert.throws(()=>native.attach(port+.5,64),/Invalid/);assert.throws(()=>native.attach(port,128),/capacity exceeds/);
  handle=native.attach(port,64);const a=native.read(handle,Uint32Array.of(1,9,63));assert.deepEqual([...a],[.25,2.25,15.75]);a[0]=99;assert.equal(native.read(handle,Uint32Array.of(1))[0],.25,'returned samples are JS-owned copies');assert.throws(()=>native.read(handle,Uint32Array.of(64)),/out of bounds/);
  native.detach(handle);assert.deepEqual([...a],[99,2.25,15.75],'copy survives detachment');assert.throws(()=>native.read(handle,Uint32Array.of(1)),/detached/);native.detach(handle);handle=null;
 }finally{if(handle)native.detach(handle);socket.close();if(child){const exit=new Promise(r=>child.once('exit',r));child.stdin.end('\n');if(child.exitCode===null)await exit}await rm(directory,{recursive:true,force:true})}
}
if(!process.versions.electron)test('real addon copies sparse SHM values, checks native allocation bounds and rejects detached readers',{skip:process.platform!=='darwin',timeout:20000},checkNativeReader);
