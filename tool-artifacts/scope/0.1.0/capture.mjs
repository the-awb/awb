import {ScopeReduction} from '../../shared-loop/0.1.0/scope-reduction.mjs';
export function validateScopeConfiguration(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['bus','channels','rate','zoom'].includes(k)))throw new Error('Choose an audio/control bus range.');
 const {bus=0,channels=2,rate='audio',zoom=1}=input;
 if(!Number.isInteger(bus)||bus<0||bus>65535||!Number.isInteger(channels)||channels<1||channels>16||!['audio','control'].includes(rate)||![1,.25,.0625].includes(zoom))throw new Error('Choose a nonnegative bus, 1–16 channels, and audio or control rate.');
 return {bus,channels,rate,zoom:rate==='control'?1:zoom};
}
// One tool window's lease. Changes are transactional; closing fences pending allocation.
export class ScopeCapture {
 constructor({broker,getHost,onChange=()=>{}}){Object.assign(this,{broker,getHost,onChange});this.tail=Promise.resolve();this.active=null;this.closing=false;this.generation=0;this.sequence=0;this.latest=null;this.error=null;}
 queue(job){const next=this.tail.catch(()=>{}).then(job);this.tail=next;return next;}
 state(){return {type:'status',connected:!!this.active&&!this.error,configuration:this.active?.configuration??null,generation:this.active?.generation??this.generation,error:this.error};}
 emit(){this.onChange(this.latest,this.state());}
 listen(input){const configuration=validateScopeConfiguration(input);return this.queue(async()=>{
  if(this.closing)throw new Error('Scope is closed');
  if(this.active&&JSON.stringify(configuration)===JSON.stringify(this.active.configuration)&&!this.error)return this.state();
  const host=await this.getHost();if(!host?.isConnected())throw new Error('Start the shell SC host or attach a prepared IDE before listening.');
  const record={configuration,generation:this.generation+1,lease:null,latest:null,error:null};
  const step=1/configuration.zoom,kind=configuration.rate==='control'?'control':'audio';
  const frame=(next,info)=>{
   record.latest={...next,bus:configuration.bus,rate:configuration.rate,sourceChannels:configuration.channels,generation:record.generation,sequence:++this.sequence};
   if(this.active===record&&!this.closing){this.latest=record.latest;this.emit();}
  };
  const fault=error=>{record.error=error.message;if(this.active===record&&!this.closing){this.error=error.message;this.latest=null;this.emit();this.queue(async()=>{if(this.active===record){this.active=null;await record.lease?.stop();this.emit();}}).catch(()=>{});}};
  try{
   record.lease=await this.broker.subscribeDerived({host,configuration:{bus:configuration.bus,channels:configuration.channels,rate:configuration.rate},profile:`scope:${kind==='control'?32:1024}:${step}`,createTransform:()=>{const reduction=new ScopeReduction(kind);return {append:(raw,info)=>reduction.append(raw,info,step)};},onFrame:frame,onError:fault});
   if(this.closing||record.error)throw new Error(record.error??'Scope closed during allocation');
  }catch(error){await record.lease?.stop().catch(()=>{});throw error;}
  const old=this.active;this.active=record;this.generation=record.generation;this.latest=record.latest;this.error=null;this.emit();await old?.lease.stop();return this.state();
 });}
 stop(){return this.queue(async()=>{const old=this.active;this.active=null;this.latest=null;this.error=null;this.generation++;this.emit();await old?.lease.stop();return this.state();});}
 async close(){this.closing=true;await this.stop();}
}
