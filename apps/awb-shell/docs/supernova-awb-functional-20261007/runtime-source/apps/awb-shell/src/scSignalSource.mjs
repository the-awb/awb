import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {OSC} from './scBusOsc.mjs';
const require=createRequire(import.meta.url);
export async function openScSignalSource({host,configuration,native=require('../.build/sc-bus-reader.node')}){
 if(host.oscHost!=='127.0.0.1'||!host.isConnected())throw new Error('SC signal needs a running local shell SC host.');
 const generation=crypto.randomInt(1,16777216),osc=new OSC(host.oscPort);
 let reader,stopping;
 const stop=()=>stopping??=(async()=>{
  if(reader)native.detach(reader);
  try{await osc.request('/awb/sc-bus/close',[generation,host.token],'/awb/sc-bus/closed',a=>a[0]===generation,5000)}finally{osc.close()}
 })();
 try{
  const control=configuration.rate==='control';
  const reply=await osc.request('/awb/sc-bus/open',[generation,configuration.bus,configuration.channels,control?1:0,2,host.token],'/awb/sc-bus/ready',a=>a[0]===generation,12000);
  const info={generation,sampleRate:reply[3],channels:reply[4],bus:reply[5],nodeID:reply[6],serverPID:reply[7],audioSampleRate:reply[8],blockSize:reply[9],rate:configuration.rate};
  if(!Number.isFinite(info.sampleRate)||info.sampleRate<=0||info.channels!==configuration.channels||info.bus!==configuration.bus||!Number.isFinite(info.audioSampleRate)||!Number.isInteger(info.blockSize))throw new Error('SC signal allocation reply mismatch');
  reader=native.attach(reply[1],reply[2],info.channels,control?32:512);
  return {info,read:()=>native.read(reader),stop};
 }catch(error){await stop().catch(()=>{});throw new Error(`${error.message}. Load the updated AWBScBusAudio.scd bridge in the attached host, or restart the shell-owned host.`)}
}
