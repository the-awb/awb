import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const electron=createRequire(import.meta.url)('electron'),root=fileURLToPath(new URL('..',import.meta.url));
test('NodeShell launches and closes the real SC lattice instrument without booting audio',{timeout:65000},async()=>{
 const userData=await mkdtemp(path.join(os.tmpdir(),'awb-lattice-shell-'));
 const env={...process.env,AWB_SC_OSC_PORT:'58399',AWB_HEADLESS_SERVER_PORT:'58400',AWB_HOST_AUTOSTART:'0',ELECTRON_DISABLE_SECURITY_WARNINGS:'true'};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(electron,[path.join(root,'shell/main.mjs'),'--smoke-lattice',`--user-data-dir=${userData}`,'--smoke-screenshot=/tmp/awb-lattice-shell.png'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 const timer=setTimeout(()=>child.kill('SIGTERM'),60000);
 try{const code=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);});await writeFile('/tmp/awb-lattice-shell.log',output);assert.equal(code,0,output);assert.match(output,/AWB_LATTICE_SHELL_PASS/);}
 finally{clearTimeout(timer);if(child.exitCode===null)child.kill('SIGTERM');await rm(userData,{recursive:true,force:true});}
});
