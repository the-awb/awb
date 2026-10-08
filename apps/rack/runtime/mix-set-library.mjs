import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {readdir,readFile,stat} from 'node:fs/promises';
import {importMixSet} from '../src/mix-sets.mjs';
const candidate=name=>/\.json$/i.test(name)&&(/(^|[ _-])config([ ._-]|$)/i.test(name)||/\.(mixes|rack)\.json$/i.test(name)||/^rack-library.*\.json$/i.test(name));
const identifier=file=>crypto.createHash('sha256').update(file).digest('hex');
export function mixSetFolders(libraryPath,directories){
 const configured=directories??(process.env.AWB_RACK_MIX_SET_DIRECTORIES?JSON.parse(process.env.AWB_RACK_MIX_SET_DIRECTORIES):[path.join(os.homedir(),'Documents/GitHub/osc-config'),path.dirname(libraryPath)]);
 if(!Array.isArray(configured)||configured.length>16||configured.some(d=>typeof d!=='string'||!path.isAbsolute(d)))throw Error('Mix set directories must be absolute paths.');
 return [...new Set(configured.map(d=>path.resolve(d)))];
}
async function readCollection(file,document){
 if((await stat(file)).size>4*1024*1024)throw Error('Mix collection exceeds 4 MiB.');
 return importMixSet(JSON.parse(await readFile(file,'utf8')),document,path.basename(file).replace(/\.json$/i,''));
}
export async function listMixSets(directories,document){
 const sets=[],errors=[];
 for(const directory of directories){
  let entries;try{entries=await readdir(directory,{withFileTypes:true});}catch(e){if(e.code!=='ENOENT')errors.push(`${directory}: ${e.message}`);continue;}
  for(const entry of entries.filter(e=>e.isFile()&&candidate(e.name)).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,512)){
   const file=path.join(directory,entry.name);
   try{const loaded=await readCollection(file,document);if(loaded.snapshots.length)sets.push({id:identifier(file),name:loaded.name,file:entry.name,directory,count:loaded.snapshots.length,skipped:loaded.skipped});}
   catch(e){errors.push(`${entry.name}: ${e.message}`);}
  }
 }
 return {sets,errors};
}
export async function readMixSet(directories,document,id){
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw Error('Unknown saved mix set.');
 const {sets}=await listMixSets(directories,document),entry=sets.find(s=>s.id===id);
 if(!entry)throw Error('This saved mix set is no longer available.');
 return readCollection(path.join(entry.directory,entry.file),document);
}
