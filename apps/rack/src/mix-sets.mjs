import {copy,descriptors,RackStore,importSceneConfig,defaultConfig} from './model.mjs';
const channels={in0:'vc',p2:'pro2'};
const destinations={b1:'mod-b1',b2:'mod-b2',a1:'mod-a1',a2:'mod-a2',stut:'mod-stut',splut:'mod-splut',um:'mod-um',spark:'mod-spark',deci:'mod-deci',fuzz:'mod-fuzz',verb:'mod-verb',mast:'mod-mast'};
export function exportMixSet(document,name=document.mixSet?.name??'Live mixes'){
 return {schema:'awb.mix-set/1',name,config:copy(document.config),snapshots:copy(document.snapshots)};
}
// Import targets only. Live topology, values and SC ownership never come from a file.
export function importMixSet(input,document,fallbackName='Imported mixes'){
 if(!input||typeof input!=='object')throw Error('Expected a mix set or o-s-c scenes file.');
 let source=input;
 if(Array.isArray(input.scenes)){
  // Import legacy scenes against their original addresses/ranges, then translate.

  const result=importSceneConfig(input,{config:defaultConfig(),values:{},snapshots:[]});source={...result.document,name:input.name};
 }
 if(!Array.isArray(source.snapshots)||source.snapshots.length>256)throw Error('The file has no valid mix collection.');
 const target=descriptors(document.config),targetByID=new Map(target.map(d=>[d.id,d]));
 const sourceByID=new Map(source.config?descriptors(source.config).map(d=>[d.id,d]):[]);
 let skipped=0,mapped=0;const native=document.config.output.mode==='sc'||document.config.regions.some(r=>r.kind==='followers'),name=String(input.name??input.mixSet?.name??fallbackName).trim().slice(0,120)||'Imported mixes';
 const snapshots=source.snapshots.map(s=>{
  const targets={};
  if(!s.targets||typeof s.targets!=='object'||Array.isArray(s.targets))throw Error('Invalid mix targets.');
  for(const [id,t]of Object.entries(s.targets)){
   let d=targetByID.get(id),old=sourceByID.get(id);
   if(native&&source.config?.output.mode==='legacy'){const [channel,region,dest]=id.split('/'),ch=channels[channel]??channel;
    const translated=region==='bus'?`${ch}/followers/${destinations[dest]??dest}`:region==='levels'?`global/control-levels/${destinations[dest]??dest}`:region==='fx'?`${ch}/fx/${dest}`:id;
    d=targetByID.get(translated);
   }
   if(!d){if(t!==null)skipped++;continue;}
   if(t===null){targets[d.id]=null;continue;}
   if(!t||!Number.isFinite(t.value))throw Error('Invalid mix amount.');
   let value=t.value;
   if(native&&old&&source.config.output.mode==='legacy'&&old.region.min===0&&old.region.max===127)value=value/127;
   targets[d.id]={...t,value};mapped++;
  }
  return {...copy(s),targets};
 });
 new RackStore({...document,snapshots,mixSet:{name}});
 if(snapshots.some(s=>Object.values(s.targets).some(t=>t!==null))===false&&source.snapshots.some(s=>Object.values(s.targets).some(t=>t!==null)))throw Error('None of this set’s targets match the current rack.');
 return {name,snapshots,mapped,skipped};
}
