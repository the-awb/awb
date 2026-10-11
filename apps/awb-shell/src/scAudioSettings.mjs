import {readFile,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const defaultAudioSettings=Object.freeze({inputDevice:null,outputDevice:null,sampleRate:null,inputChannels:2,outputChannels:2});
export function validateAudioSettings(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Audio settings must be an object.');
 for(const key of Object.keys(value))if(!(Object.hasOwn(defaultAudioSettings,key)))throw Error('Unknown audio setting: '+key);
 const next={...defaultAudioSettings,...value};
 for(const key of ['inputDevice','outputDevice'])if(next[key]!==null&&(typeof next[key]!=='string'||!next[key].trim()||next[key].length>256))throw Error('Use a device name or System default.');
 if((next.inputDevice===null)!==(next.outputDevice===null))throw Error('Choose both devices, or leave both on System default.');
 if(next.sampleRate!==null&&![22050,32000,44100,48000,88200,96000,176400,192000].includes(next.sampleRate))throw Error('Unsupported sample rate.');
 for(const [key,min] of [['inputChannels',0],['outputChannels',1]])if(!Number.isInteger(next[key])||next[key]<min||next[key]>256)throw Error('Invalid '+key);
 return next;
}
export async function loadAudioSettings(file){try{return validateAudioSettings(JSON.parse(await readFile(file,'utf8')));}catch(e){if(e.code==='ENOENT')return {...defaultAudioSettings};throw e;}}
export async function saveAudioSettings(file,value){const next=validateAudioSettings(value),temp=file+'.'+randomUUID()+'.tmp';await mkdir(path.dirname(file),{recursive:true});try{await writeFile(temp,JSON.stringify(next,null,2)+'\n');await rename(temp,file);}finally{await rm(temp,{force:true});}return next;}
