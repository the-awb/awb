import {mkdirSync,writeFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import path from 'node:path';
import {defaults,graphFor,validate} from '../../../tool-artifacts/buffer-views/0.1.0/network-model.mjs';import {compileGraph,scLiteral} from '../runtime/graph-compiler.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),live=process.argv.includes('--live-inputs'),prefix=live?'live-':'',state=defaults(live?{sources:['clean','pro2','mic']}:{ });
state.globalInput=1;state.master=.8;state.source='cello';state.cells.forEach(c=>{c.inputGain=0;c.feedback=.5;c.effectLevel=1;});for(const k of Object.keys(state.routes))state.routes[k]=0;
// All branches available without automatically injecting audio or summing duplicates.
for(const c of state.cells)state.routes[`${c.id}:monitor`]=1;
mkdirSync(root+'sc/plans',{recursive:true});
for(const sampleRate of [44100,48000])writeFileSync(root+`sc/plans/${prefix}${sampleRate}.scd`,scLiteral(compileGraph(graphFor(state),{sampleRate}))+'\n');
writeFileSync(root+`sc/plans/${prefix}configuration.scd`,scLiteral({...validate(state),routes:Object.entries(state.routes)})+'\n');
if(process.argv.includes('--native')){
 const sc=process.env.SC_SOURCE||'/Users/willy/supercollider',headers=path.resolve(path.dirname(process.execPath),'../include/node');mkdirSync(root+'.build',{recursive:true});
 for(const [input,output,includes] of [['UnifiedTape.cpp','UnifiedTape.scx',['plugin_interface','common','server'].map(p=>`-I${sc}/include/${p}`)],['addon.cpp','unifiedview.node',[`-I${headers}`]]]){
  const r=spawnSync('clang++',['-std=c++17','-O2','-fPIC','-bundle','-undefined','dynamic_lookup',...includes,root+'native/'+input,'-o',root+'.build/'+output],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);
 }
}
console.log('Delay plans prepared; no host or audio engine started.');
