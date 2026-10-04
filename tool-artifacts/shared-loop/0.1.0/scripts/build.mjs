import { spawnSync } from 'node:child_process';
import { mkdirSync,existsSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sc=process.env.SC_SOURCE || '/Users/willy/supercollider';
const headers=process.env.NODE_HEADERS || resolve(dirname(process.execPath),'../include/node');
if(process.platform!=='darwin')throw new Error('This demo build currently targets macOS/scsynth');
if(!existsSync(`${sc}/include/plugin_interface/SC_PlugIn.h`))throw new Error('Set SC_SOURCE to matching SuperCollider source');
mkdirSync(`${root}/build`,{recursive:true});
const includes=['plugin_interface','common','server'].map(d=>`-I${sc}/include/${d}`);
function build(args){const r=spawnSync('clang++',args,{cwd:root,encoding:'utf8'});if(r.status!==0){process.stderr.write(r.stderr);process.exit(r.status||1);}}
build(['-std=c++17','-O2','-fPIC','-bundle','-undefined','dynamic_lookup',...includes,'native/SharedLooper.cpp','-o','build/SharedLooper.scx']);
build(['-std=c++17','-O2','-fPIC','-bundle','-undefined','dynamic_lookup',`-I${headers}`,'native/addon.cpp','-o','build/loopview.node']);
build(['-std=c++17','-O2','-fPIC','-bundle','-undefined','dynamic_lookup',`-I${headers}`,
 `-I${sc}/common`,`-I${sc}/external_libraries/boost`,`-I${sc}/external_libraries/TLSF-2.4.6/src`,
 'native/scopes.cpp','-o','build/scopeview.node']);
console.log('Built SharedLooper.scx, loopview.node and scopeview.node');
