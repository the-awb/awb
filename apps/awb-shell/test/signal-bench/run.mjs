import {createRequire} from 'node:module';
import {mkdtemp,cp,symlink,rm,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {prepare} from './prepare.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..'),require=createRequire(import.meta.url),electron=require('electron');
const tag=process.argv.find(a=>a.startsWith('--tag='))?.slice(6)||'baseline',temp=await mkdtemp('/private/tmp/awb-signal-cost-'),fixture=resolve(temp,'awb');let child;
try{
 await cp(resolve(root,'apps/awb-shell/src'),resolve(fixture,'apps/awb-shell/src'),{recursive:true});
 await cp(resolve(root,'apps/awb-shell/sc'),resolve(fixture,'apps/awb-shell/sc'),{recursive:true});
 await cp(resolve(root,'apps/awb-shell/.build'),resolve(fixture,'apps/awb-shell/.build'),{recursive:true});
 await cp(resolve(root,'apps/awb-shell/test/signal-bench'),resolve(fixture,'apps/awb-shell/test/signal-bench'),{recursive:true});
 await cp(resolve(root,'tool-artifacts/shared-loop/0.1.0'),resolve(fixture,'tool-artifacts/shared-loop/0.1.0'),{recursive:true,filter:p=>!p.split('/').includes('node_modules')});
 await symlink(resolve(root,'node_modules'),resolve(fixture,'node_modules'),'dir');await writeFile(resolve(fixture,'package.json'),'{"type":"module"}');
 // Replay the retained before sources only inside this temporary fixture.
 if(process.argv.includes('--before'))await cp(resolve(root,'apps/awb-shell/test/signal-bench/results/baseline-sources'),fixture,{recursive:true});
 const protectedPaths=['apps/awb-shell/.build/sc-bus-reader.node','apps/awb-shell/src/scSignalSource.mjs','apps/awb-shell/src/signalCaptureBroker.mjs','tool-artifacts/shared-loop/0.1.0/server.mjs','tool-artifacts/shared-loop/0.1.0/public/scope.js','tool-artifacts/shared-loop/0.1.0/public/scope-protocol.js','tool-artifacts/shared-loop/0.1.0/scope-transport.mjs','tool-artifacts/shared-loop/0.1.0/scope-reduction.mjs','tool-artifacts/shared-loop/0.1.0/public/scope-history.js',...(process.argv.includes('--cadence')?['tool-artifacts/shared-loop/0.1.0/public/scope-painter.js']:[])];
 const hashes=Object.fromEntries(await Promise.all(protectedPaths.map(async name=>[name,createHash('sha256').update(await readFile(resolve(fixture,name))).digest('hex')])));
 await writeFile(resolve(fixture,'source-hashes.json'),JSON.stringify(hashes));await prepare(fixture);
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 child=spawn(electron,[resolve(fixture,'apps/awb-shell/test/signal-bench/bench.mjs'),`--tag=${tag}`,...process.argv.slice(2).filter(a=>!a.startsWith('--tag='))],{cwd:fixture,env,stdio:'inherit'});
 const timer=setTimeout(()=>child.kill('SIGTERM'),process.argv.includes('--cadence')?1800000:900000);try{process.exitCode=await new Promise((r,j)=>{child.once('exit',r);child.once('error',j)})??1}finally{clearTimeout(timer)}
}finally{if(child&&child.exitCode===null)child.kill('SIGTERM');await rm(temp,{recursive:true,force:true})}
