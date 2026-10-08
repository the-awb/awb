import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import dgram from 'node:dgram';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),electron=require('electron');
const root=fileURLToPath(new URL('..',import.meta.url));
test('Electron launcher opens/focuses real Qt Tool Station in isolated language host',{timeout:45000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'awb-qt-station-'));
 const socket=dgram.createSocket('udp4');await new Promise(r=>socket.bind(0,'127.0.0.1',r));const port=socket.address().port;socket.close();
 const sclang=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-D','-u',`${port}`,'-l',process.env.AWB_TEST_SCLANG_CONFIG ?? '/Users/willy/Library/Application Support/SuperCollider/sclang_conf.yaml',process.env.AWB_TEST_QT_HOST_SCRIPT ?? path.join(root,'test/qt-station-host.scd')],{env:{...process.env,AWB_HOST_AUTOSTART:'0'},stdio:['ignore','pipe','pipe']});
 let scOutput='',output='',child;
 sclang.stdout.on('data',c=>scOutput+=c);sclang.stderr.on('data',c=>scOutput+=c);
 try{
  const deadline=Date.now()+15000;
  while(!scOutput.includes('AWB_QT_HOST_READY')){if(Date.now()>deadline||sclang.exitCode!==null)throw new Error(scOutput);await new Promise(r=>setTimeout(r,100));}
  const env={...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'};delete env.ELECTRON_RUN_AS_NODE;
  child=spawn(electron,[path.join(root,'shell/main.mjs'),'--smoke-qt-station',`--osc-port=${port}`,`--user-data-dir=${dir}`],{cwd:root,env,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
  const code=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject)});
  assert.equal(code,0,output);assert.match(output,/AWB_QT_STATION_ELECTRON_RESULT=PASS/);
  await new Promise(r=>setTimeout(r,500));assert.match(scOutput,/AWB_QT_STATION_OBSERVED windows=1/);
 }finally{
  await writeFile(process.env.AWB_TEST_QT_LOG ?? path.join(os.tmpdir(),'awb-qt-station-electron.log'),output+'\n'+scOutput);
  if(child?.exitCode===null)child.kill('SIGKILL');if(sclang.exitCode===null)sclang.kill('SIGTERM');
  await rm(dir,{recursive:true,force:true});
 }
});
