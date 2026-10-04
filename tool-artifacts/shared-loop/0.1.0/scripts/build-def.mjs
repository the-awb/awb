import {cpSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const app=process.env.SC_APP || '/Applications/SuperCollider.app';
const scratch=mkdtempSync(resolve(tmpdir(),'awb-loop-def-'));
try {
 const library=resolve(scratch,'SCClassLibrary');
 cpSync(`${app}/Contents/Resources/SCClassLibrary`,library,{recursive:true});
 const config=resolve(scratch,'sclang_conf.yaml');
 writeFileSync(config,`includePaths:\n  - ${JSON.stringify(library)}\n  - ${JSON.stringify(resolve(root,'sc'))}\nexcludePaths: []\nexcludeDefaultPaths: true\n`);
 const result=spawnSync(`${app}/Contents/MacOS/sclang`,['-a','-D','-u','0','-l',config,resolve(root,'sc/build-def.scd')],{
  env:{...process.env,LOOP_DEF_DIRECTORY:resolve(root,'build')},encoding:'utf8',timeout:30000
 });
 if(result.status!==0) throw new Error(`SynthDef build failed: ${result.error || ''}\n${result.stdout}\n${result.stderr}`);
 console.log('Built awbSharedLoopV1.scsyndef (no audio server)');
} finally {rmSync(scratch,{recursive:true,force:true});}
