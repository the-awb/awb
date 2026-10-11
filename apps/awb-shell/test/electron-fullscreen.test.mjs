import test from 'node:test';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {createRequire} from 'node:module';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
test('Shared fullscreen controls operate native windows independently',{timeout:25000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'awb-fullscreen-')),env={...process.env,AWB_FULLSCREEN_USER_DATA:dir,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(createRequire(import.meta.url)('electron'),[fileURLToPath(new URL('./fullscreen-main.cjs',import.meta.url))],{env,stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const timer=setTimeout(()=>child.kill('SIGTERM'),20000);
 try{const code=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);});await writeFile('/tmp/awb-fullscreen-gui.log',output);assert.equal(code,0,output);assert.match(output,/FULLSCREEN PASS:/);}
 finally{clearTimeout(timer);if(child.exitCode===null)child.kill('SIGTERM');await rm(dir,{recursive:true,force:true});}
});
