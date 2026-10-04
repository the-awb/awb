import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),electron=require('electron'),root=fileURLToPath(new URL('..',import.meta.url));
async function port(){const socket=dgram.createSocket('udp4');await new Promise(resolve=>socket.bind(0,'127.0.0.1',resolve));const p=socket.address().port;socket.close();return p}
async function run(command,args,env,timeout){let output='';const child=spawn(command,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const timer=setTimeout(()=>child.kill('SIGTERM'),timeout);try {const code=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject)});assert.equal(code,0,output);return output}finally{clearTimeout(timer)}}
test('native SC bus samples feed a real Lissajous Electron view and release independently',{timeout:110000},async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'awb-sc-bus-test-'));
 const env={...process.env,AWB_SC_BUS_TEST_DIR:tmp,ELECTRON_DISABLE_SECURITY_WARNINGS:'true',AWB_HEADLESS_SERVER_PORT:String(await port())};delete env.ELECTRON_RUN_AS_NODE;
 try {
  await writeFile(path.join(tmp,'sclang_conf.yaml'),'includePaths:\n  - /Applications/SuperCollider.app/Contents/Resources/SCClassLibrary\nexcludeDefaultPaths: true\npostInlineWarnings: false\n');
  await run('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-a','-D','-l',path.join(tmp,'sclang_conf.yaml'),path.join(root,'test/sc-bus-source.scd')],env,30000);
  const log=await run(electron,[path.join(root,'shell/main.mjs'),'--smoke-sc-bus',`--smoke-sc-bus-def=${tmp}/awbScBusSmokeSource.scsyndef`,`--osc-port=${await port()}`,`--user-data-dir=${tmp}/user-data`,'--smoke-screenshot=/private/tmp/awb-lissajous-sc-bus.png'],env,80000);
  assert.match(log,/AWB_SC_BUS_READY source=sc-bus channels=4,2 raw-peaks=true switching=true live-image=true concurrent=true pair-routing=true actualRate=\d+ host-survives=true unrelated-tools=0/);
  console.log(log.match(/AWB_SC_BUS_READY[^\n]+/)[0]);
 } finally {await rm(tmp,{recursive:true,force:true})}
});
