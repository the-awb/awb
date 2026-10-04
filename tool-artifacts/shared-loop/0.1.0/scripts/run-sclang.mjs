import {cpSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function runSclang({port,id,seconds=4,runtimeDirectory=resolve(root,'build')}) {
 const app=process.env.SC_APP || '/Applications/SuperCollider.app';
 mkdirSync(runtimeDirectory,{recursive:true});
 const library=resolve(runtimeDirectory,'SCClassLibrary');
 cpSync(`${app}/Contents/Resources/SCClassLibrary`,library,{recursive:true});
 // Disable startup loading in this private copy; never run the user's live startup.
 const platform=`${library}/Platform/osx/OSXPlatform.sc`;
 writeFileSync(platform,readFileSync(platform,'utf8').replace('this.loadStartupFiles;','// isolated demo: skip user startup files'));
 const config=resolve(runtimeDirectory,'sclang_conf.yaml');
 writeFileSync(config,`includePaths:\n  - ${JSON.stringify(library)}\n  - ${JSON.stringify(resolve(root,'sc'))}\nexcludePaths: []\npostInlineWarnings: false\nexcludeDefaultPaths: true\n`);
 rmSync(resolve(runtimeDirectory,'session.json'),{force:true});
 return spawn(`${app}/Contents/MacOS/sclang`,['-a','-D','-u',String(port+1),'-l',config,resolve(root,'sc/demo.scd')],{
  cwd:root,env:{...process.env,LOOP_SC_PORT:String(port),LOOP_SHARED_ID:String(id),LOOP_SECONDS:String(seconds),LOOP_DEMO_ROOT:root,LOOP_RUNTIME_ROOT:runtimeDirectory},stdio:['ignore','pipe','pipe']
 });
}
