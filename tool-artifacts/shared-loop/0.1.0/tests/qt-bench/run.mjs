// Isolated control/audio canvas/window layout comparison; installed production files are guarded.
import {createRequire} from 'node:module';
import {mkdtemp,cp,readFile,symlink,rm} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..');
const require=createRequire(import.meta.url),electron=require('electron');
const temp=await mkdtemp('/private/tmp/awb-scope-qt-'),fixture=resolve(temp,'artifact');
const protectedFiles=['build/scopeview.node','native/scopes.cpp','public/scope.js','public/scope-protocol.js','sc/host.scd'];
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const before=await Promise.all(protectedFiles.map(name=>hash(resolve(root,name))));
let child;
try{
 await cp(root,fixture,{recursive:true,filter:path=>!path.split('/').includes('node_modules')});
 await symlink(resolve(root,'../../../node_modules'),resolve(fixture,'node_modules'),'dir');
 const {prepare}=await import('./prepare.mjs');await prepare(fixture);
 const sc=process.env.SC_SOURCE||'/Users/willy/supercollider',headers=process.env.NODE_HEADERS||resolve(dirname(process.execPath),'../include/node');
 const built=spawnSync('clang++',['-std=c++17','-O2','-fPIC','-bundle','-undefined','dynamic_lookup',`-I${headers}`,`-I${sc}/common`,`-I${sc}/external_libraries/boost`,`-I${sc}/external_libraries/TLSF-2.4.6/src`,'native/scopes.cpp','-o','build/scopeview.node'],{cwd:fixture,encoding:'utf8'});
 if(built.status!==0)throw new Error('Audio fixture addon build failed: '+built.stderr);
 // Check the test-only codec before launching Electron.
 const codec=await import(resolve(fixture,'public/scope-protocol.js'));
 const snapshot={channels:6,frames:2,sourceFrames:2,sourceEnd:2,sampleRate:48000,sequence:1,peaks:[1,1,1,1,1,1],rms:[.5,.5,.5,.5,.5,.5],samples:new Float32Array(12).fill(.25)};
 const decoded=codec.decodeScopeFrame(codec.encodeScopeFrame('output',snapshot,1),'output',1);
 if(decoded.channels!==6||decoded.sampleRate!==48000||decoded.samples.length!==12)throw new Error('Fixture codec lost audio channels');
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 child=spawn(electron,[resolve(fixture,'tests/qt-bench/bench.mjs'),...process.argv.slice(2)],{cwd:fixture,env,stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
 process.exitCode=code??1;
}finally{
 if(child&&child.exitCode===null)child.kill('SIGTERM');
 const after=await Promise.all(protectedFiles.map(name=>hash(resolve(root,name))));
 if(before.some((value,index)=>value!==after[index])){console.error('Installed production scope files changed unexpectedly');process.exitCode=1;}
 else console.log('QT_FIXTURE_PRODUCTION_UNCHANGED');
 await rm(temp,{recursive:true,force:true});
}
