import {OSC} from '/Users/willy/awb/apps/awb-shell/src/scBusOsc.mjs';
import {readFile,writeFile} from 'node:fs/promises';
const dir='/private/tmp/awb-audio-pause-load';
const session=JSON.parse(await readFile(dir+'/fixture/session.json'));
const osc=new OSC(session.port);
try {
 const a=await osc.request('/g_queryTree',[0,0],'/g_queryTree.reply');
 let p=1;const nodes=[];
 function parse(){const id=a[p++],count=a[p++];if(count>=0){for(let i=0;i<count;i++)parse();}else{const name=a[p++];nodes.push({id,name,controls:{}});}}
 parse();
 const relevant=nodes.filter(n=>/Measurement$|ControlFollower$/.test(n.name));
 if(relevant.filter(n=>/Measurement$/.test(n.name)).length!==16||relevant.filter(n=>/ControlFollower$/.test(n.name)).length!==25)throw Error('Unexpected detector/follower counts');
 for(const n of relevant){const v=await osc.request('/s_get',[n.id,'in','out','scale'],'/n_set',a=>a[0]===n.id);for(let i=1;i<v.length;i+=2)n.controls[v[i]]=v[i+1];}
 const buses=relevant.map(n=>n.controls.out);
 const samples=[];for(let i=0;i<8;i++){const values=await osc.request('/c_get',buses,'/c_set');samples.push({utc:new Date().toISOString(),values});await new Promise(r=>setTimeout(r,1000));}
 const stats=relevant.map(n=>{const vals=samples.map(s=>{const k=s.values.indexOf(n.controls.out);return s.values[k+1];});return {...n,min:Math.min(...vals),max:Math.max(...vals),finite:vals.every(Number.isFinite)};});
 const result={treeUTC:new Date().toISOString(),detectors:16,followers:25,samples,stats};await writeFile(dir+'/follower-coverage.json',JSON.stringify(result,null,2));console.log(JSON.stringify(stats.map(n=>({name:n.name,id:n.id,out:n.controls.out,scale:n.controls.scale,min:n.min,max:n.max,finite:n.finite}))));
}finally{osc.close();}
