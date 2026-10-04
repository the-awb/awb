// Measure the normal prestart workspace build with all output paths in a disposable copy.
import {mkdtemp,cp,symlink,readFile,writeFile,rm,mkdir,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..'),temp=await mkdtemp('/private/tmp/awb-prestart-'),fixture=resolve(temp,'awb'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const evidence=JSON.parse(await readFile('/private/tmp/awb-startup-cost.json','utf8')),guards=evidence.protectedFiles,hash=b=>createHash('sha256').update(b).digest('hex'),runs=[];
try{
 for(const name of ['packages','apps','tools'])await cp(resolve(root,name),resolve(fixture,name),{recursive:true,verbatimSymlinks:true,filter:p=>!p.split('/').includes('node_modules')&&!p.split('/').includes('.git')});
 for(const name of ['package.json','package-lock.json'])await cp(resolve(root,name),resolve(fixture,name));
 const modules=resolve(fixture,'node_modules');await mkdir(resolve(modules,'@awb'),{recursive:true});
 for(const name of await readdir(resolve(root,'node_modules')))if(name!=='@awb')await symlink(resolve(root,'node_modules',name),resolve(modules,name));
 for(const group of ['packages','apps'])for(const name of await readdir(resolve(fixture,group))){const p=resolve(fixture,group,name,'package.json');let pkg;try{pkg=JSON.parse(await readFile(p,'utf8'))}catch{continue}if(pkg.name?.startsWith('@awb/'))await symlink(resolve(fixture,group,name),resolve(modules,'@awb',pkg.name.slice(5)));}
 // Swift PCH paths are absolute: copied native caches are invalid. First run is explicitly cold; second is warm.
 await rm(resolve(fixture,'packages/native-audio/native/.build'),{recursive:true,force:true});
 for(let repeat=1;repeat<=2;repeat++){
 const start=performance.now(),stages=[];let log='',pending='';const child=spawn('npm',['run','build'],{cwd:fixture,env,stdio:['ignore','pipe','pipe']});
 const take=b=>{const text=String(b);log+=text;pending+=text;let i;while((i=pending.indexOf('\n'))>=0){const line=pending.slice(0,i);pending=pending.slice(i+1);if(/^> @awb\/.+ build$/.test(line)){const ms=performance.now()-start;stages.push({workspace:line.slice(2,-6),atMs:ms});console.log('PRESTART_STAGE '+JSON.stringify({repeat,...stages.at(-1)}));}}};
 child.stdout.on('data',take);child.stderr.on('data',take);const timer=setTimeout(()=>child.kill('SIGTERM'),180000);
 const code=await new Promise((r,j)=>{child.once('exit',r);child.once('error',j)});clearTimeout(timer);const ms=performance.now()-start;
 for(let i=0;i<stages.length;i++)stages[i].durationMs=(stages[i+1]?.atMs??ms)-stages[i].atMs;
 await writeFile(`/private/tmp/awb-prestart-build-${repeat}.log`,log);runs.push({repeat,ms,code,stages});await writeFile('/private/tmp/awb-prestart-cost.json',JSON.stringify({complete:false,runs},null,2));
 if(code!==0)throw new Error('Private workspace build failed: '+log.slice(-6000));console.log('PRESTART_BUILD '+JSON.stringify({repeat,ms}));
 }
 const mismatches=[];for(const [p,digest] of Object.entries(guards))if(hash(await readFile(p))!==digest)mismatches.push(p);if(mismatches.length)throw new Error('Protected files changed: '+mismatches.join(','));
 await writeFile('/private/tmp/awb-prestart-cost.json',JSON.stringify({complete:true,runs,protectedCount:Object.keys(guards).length,protectedFiles:guards,privateWorkspace:true,notes:['First run may rebuild relocated Swift cache; second run measures unchanged sources in the same copy.','All @awb workspace package links point to the copy. External dependencies are read-only links.','No Electron, Field or Studio tool view is launched.']},null,2));
}finally{await rm(temp,{recursive:true,force:true})}
