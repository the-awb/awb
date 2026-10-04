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
async function port(){const s=dgram.createSocket('udp4');await new Promise(r=>s.bind(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function run(command,args,env,timeout){let output='';const child=spawn(command,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const timer=setTimeout(()=>child.kill('SIGTERM'),timeout);try{const code=await new Promise((r,j)=>{child.once('exit',r);child.once('error',j)});await writeFile('/private/tmp/awb-scope-tool-live.log',output);assert.equal(code,0,output);return output;}finally{clearTimeout(timer);if(child.exitCode===null)child.kill('SIGTERM');}}
test('standalone Scope uses actual shell buses, shares captures and preserves raw peers',{timeout:110000},async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'awb-scope-tool-test-')),env={...process.env,AWB_SCOPE_TEST_DIR:tmp,ELECTRON_DISABLE_SECURITY_WARNINGS:'true',AWB_HEADLESS_SERVER_PORT:String(await port())};delete env.ELECTRON_RUN_AS_NODE;
 try{
  await writeFile(path.join(tmp,'sclang.yaml'),'includePaths:\n  - /Applications/SuperCollider.app/Contents/Resources/SCClassLibrary\nexcludeDefaultPaths: true\npostInlineWarnings: false\n');
  await run('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-a','-D','-l',path.join(tmp,'sclang.yaml'),path.join(root,'test/scope-tool/source.scd')],env,30000);
  const output=await run(electron,[path.join(root,'shell/main.mjs'),'--smoke-scope-tool',`--smoke-scope-def=${tmp}/awbScopeToolSmoke.scsyndef`,`--osc-port=${await port()}`,`--user-data-dir=${tmp}/user-data`,'--smoke-screenshot=/private/tmp/awb-scope-tool.png'],env,80000);
  assert.match(output,/AWB_SCOPE_TOOL_READY audio=1,4,16 control=16 bus-switch=true binary=true live-pixels=true frozen-modes=true shared-capture=true raw-peer-isolated=true cleanup=true trigger=true meters=true opacity=true sampleRate=\d+ unrelated-tools=0 host-survives=true/);console.log(output.match(/AWB_SCOPE_TOOL_READY[^\n]+/)[0]);
 }finally{await rm(tmp,{recursive:true,force:true});}
});
