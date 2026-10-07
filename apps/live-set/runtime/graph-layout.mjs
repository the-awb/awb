// Data-only graph contract. This does not compile SynthDefs, allocate buses,
// schedule nodes, migrate writer state or change the running prototype.
import {validate as validatePrototype} from './model.mjs';

const fail=message=>{throw new Error(`Graph layout: ${message}`);};
function id(value,label){if(typeof value!=='string'||!value.trim()||/[\x00-\x1f]/.test(value))fail(`invalid ${label}`);return value;}
function integer(value,min,label){if(!Number.isSafeInteger(value)||value<min)fail(`invalid ${label}`);return value;}
function number(value,label){if(!Number.isFinite(value))fail(`invalid ${label}`);return value;}
function positive(value,label){number(value,label);if(value<=0)fail(`invalid ${label}`);return value;}
function array(value,label){if(!Array.isArray(value))fail(`${label} must be an array`);return value;}
function index(value,width,label){integer(value,0,label);if(value>=width)fail(`${label} outside declared channels`);return value;}
function records(items,label){
  const map=new Map();
  for(const item of array(items,label)){
    if(!item||typeof item!=='object')fail(`invalid ${label} entry`);
    id(item.id,`${label} ID`);if(map.has(item.id))fail(`duplicate ${label} ID ${item.id}`);map.set(item.id,item);
  }return map;
}
function channelLayout(value,label){
  integer(value.channels,1,`${label} channel count`);
  if(value.labels!==undefined){
    array(value.labels,`${label} labels`);if(value.labels.length!==value.channels)fail(`${label} labels do not match channels`);
    const seen=new Set();for(const name of value.labels){id(name,`${label} channel label`);if(seen.has(name))fail(`duplicate ${label} channel label`);seen.add(name);}
  }
}
export function validateMapping(mapping,from,to){
  if(mapping==='identity'){
    if(from.channels!==to.channels||JSON.stringify(from.labels??null)!==JSON.stringify(to.labels??null))
      fail('identity needs matching channel counts and labels; declare a mapping');
    return mapping;
  }
  const seen=new Set();
  for(const entry of array(mapping,'channel mapping')){
    if(!entry||typeof entry!=='object')fail('invalid mapping entry');
    index(entry.from,from.channels,'mapping source');index(entry.to,to.channels,'mapping destination');number(entry.gain,'mapping gain');
    const key=`${entry.from}:${entry.to}`;if(seen.has(key))fail('duplicate mapping pair');seen.add(key);
  }
  return mapping;
}
export function headSeconds(head,periodSeconds){
  if(!head.delay||!['seconds','fraction'].includes(head.delay.unit))fail('head delay must declare seconds or fraction');
  positive(head.delay.value,'head delay');
  const seconds=head.delay.unit==='seconds'?head.delay.value:head.delay.value*positive(periodSeconds,'cell period');
  return positive(seconds,'resolved head delay');
}
export function validateGraph(candidate){
  const graph=structuredClone(candidate);
  if(!graph||graph.version!==1)fail('unsupported description version');
  const buffers=records(graph.buffers,'buffer'),nodes=records(graph.nodes,'node');
  const ports=new Map(),writers=new Map();
  for(const buffer of buffers.values()){channelLayout(buffer,'buffer');positive(buffer.capacitySeconds,'buffer capacity');}
  for(const node of nodes.values()){
    if(!['input','cell','processor','output'].includes(node.kind))fail('unknown node role');
    const bank=records(node.ports,`${node.id} port`);ports.set(node.id,bank);
    for(const port of bank.values()){
      if(!['in','out'].includes(port.direction))fail('port direction must be in or out');channelLayout(port,'port');
    }
    if(node.kind==='processor')id(node.processor,'processor identifier');
    if(node.kind!=='cell'){
      if(node.heads!==undefined||node.layout!==undefined||node.writer!==undefined)fail('only cells declare memory writers or heads');
      continue;
    }
    if(node.mix!==undefined){const from=bank.get(node.mix.input),to=bank.get(node.mix.output);if(!from||from.direction!=='in'||!to||to.direction!=='out')fail('mix needs declared input and output ports');validateMapping(node.mix.mapping,from,to);}
    positive(node.periodSeconds,'cell period');
    const heads=records(node.heads,`${node.id} head`);
    if(!node.layout||!['fitted','headroom'].includes(node.layout.kind))fail('cell must declare fitted or headroom layout');
    integer(node.layout.headSlots,0,'head slots');
    if(node.layout.headSlots<heads.size)fail('head capacity exceeded');
    if(node.layout.kind==='fitted'&&node.layout.headSlots!==heads.size)fail('fitted layout must match declared heads');
    for(const head of heads.values()){
      if(head.level!==undefined){number(head.level,'head level');if(head.level<0||head.level>1)fail('head level outside 0..1');}
      const source=buffers.get(head.source?.buffer);if(!source)fail('unknown head source buffer');
      index(head.source.channel,source.channels,'head source');
      if(headSeconds(head,node.periodSeconds)>source.capacitySeconds)fail('head delay exceeds source capacity');
      if(head.returns!==undefined){
        const target=buffers.get(node.writer?.buffer);if(!target)fail('head returns need a working-buffer writer');
        const channels=new Set();for(const r of array(head.returns,'head returns')){
          index(r.channel,target.channels,'head return channel');number(r.gain,'head return gain');
          if(Math.abs(r.gain)>2)fail('head return gain outside -2..2');if(channels.has(r.channel))fail('duplicate head return channel');channels.add(r.channel);
        }
      }
      const destinations=array(head.destinations,'head destinations'),seen=new Set();
      if(!destinations.length)fail('head needs a destination; use zero gain for a muted head');
      for(const destination of destinations){
        const port=bank.get(destination.port);if(!port||port.direction!=='out')fail('head destination must name a declared output port');
        index(destination.channel,port.channels,'head destination');number(destination.gain,'head destination gain');
        const key=JSON.stringify([destination.port,destination.channel]);if(seen.has(key))fail('duplicate head destination');seen.add(key);
      }
    }
    if(node.writer!==undefined){
      const buffer=buffers.get(node.writer.buffer),port=bank.get(node.writer.port);
      if(!buffer)fail('unknown writer buffer');if(!port||port.direction!=='in')fail('writer needs a declared input port');
      if(writers.has(buffer.id))fail(`competing writers for ${buffer.id}`);
      validateMapping(node.writer.mapping,port,buffer);writers.set(buffer.id,node.id);
    }
  }
  for(const edge of records(graph.connections,'connection').values()){
    const from=ports.get(edge.from?.node)?.get(edge.from?.port),to=ports.get(edge.to?.node)?.get(edge.to?.port);
    if(!from||from.direction!=='out'||!to||to.direction!=='in')fail('connection must join declared output to input');
    validateMapping(edge.mapping,from,to);
    // Cycles are descriptions only. Execution order/return latency need the backend.
  }
  return graph;
}

export function layoutRequirements(candidate){
  const graph=validateGraph(candidate);
  return graph.nodes.map(node=>({id:node.id,kind:node.kind,
    ports:structuredClone(node.ports),
    ...(node.kind==='cell'?{headSlots:node.layout.headSlots,declaredHeads:node.heads.length,
      spareHeads:node.layout.headSlots-node.heads.length,
      sourceLayouts:[...new Set(node.heads.map(head=>head.source.buffer))].map(id=>{
        const source=graph.buffers.find(buffer=>buffer.id===id);return {id,channels:source.channels};
      })}:{}),
  }));
}

// Small fixture evaluator for declared gains/channel maps, not an audio backend.
export function routeChannelFixture(samples,from,to,mapping){
  channelLayout(from,'source');channelLayout(to,'destination');
  if(!Array.isArray(samples)||samples.length!==from.channels||!samples.every(Number.isFinite))fail('fixture does not match source channels');
  validateMapping(mapping,from,to);
  if(mapping==='identity')return samples.slice();
  const output=Array(to.channels).fill(0);for(const edge of mapping)output[edge.to]+=samples[edge.from]*edge.gain;
  if(!output.every(Number.isFinite))fail('fixture mix overflow');return output;
}

// Describe the EXISTING prototype's channel/head/route topology. This is not an
// Augustus compatibility preset or a full DSP render: AWParam input/feedback,
// global input/master, capture and running state remain in its existing controller.
// Native output normalisation is independent of its dedicated full-period feedback.
export function prototypeGraph(config,{headSlots=4}={}){
  const c=validatePrototype(config),stereo={channels:2,labels:['L','R']};
  const buffers=c.cells.map(cell=>({id:`memory-${cell.id}`,...stereo,capacitySeconds:c.capacity}));
  const nodes=[{id:'clean',kind:'input',ports:[{id:'out',direction:'out',...stereo}]}];
  for(const cell of c.cells){
    const fractions=cell.layout==='quad'?[.25,.5,.75,1]:[.5,.5,1,1],weights=cell.heads.slice();
    if(cell.layout==='A'){weights[2]=weights[3]=0;}if(cell.layout==='B'){weights[0]=weights[1]=0;}
    const denominators=[0,1].map(channel=>Math.max(1,weights.filter((_,h)=>h%2===channel).reduce((a,b)=>a+b,0)));
    nodes.push({id:cell.id,kind:'cell',periodSeconds:cell.seconds,
      layout:{kind:headSlots===4?'fitted':'headroom',headSlots},
      ports:[{id:'record',direction:'in',...stereo},{id:'wet',direction:'out',...stereo}],
      writer:{buffer:`memory-${cell.id}`,port:'record',mapping:'identity'},
      heads:fractions.map((value,h)=>({id:`head-${h+1}`,source:{buffer:`memory-${cell.id}`,channel:h%2},
        delay:{unit:'fraction',value},destinations:[{port:'wet',channel:h%2,gain:weights[h]/denominators[h%2]}]})),
    });
  }
  nodes.push({id:'mix',kind:'output',ports:[{id:'in',direction:'in',...stereo}]});
  const diagonal=gain=>[0,1].map(channel=>({from:channel,to:channel,gain}));
  const connections=[];
  for(const cell of c.cells){
    connections.push({id:`clean-${cell.id}`,from:{node:'clean',port:'out'},to:{node:cell.id,port:'record'},mapping:diagonal(cell.cleanGain)});
    connections.push({id:`wet-${cell.id}`,from:{node:cell.id,port:'wet'},to:{node:'mix',port:'in'},mapping:diagonal(cell.fx)});
  }
  // wet ports here mean the native head mix BEFORE the existing FX wet gain.
  connections.push({id:'A-B',from:{node:'A',port:'wet'},to:{node:'B',port:'record'},mapping:diagonal(c.cells[0].fx*c.cells[1].routeGain)});
  return validateGraph({version:1,buffers,nodes,connections});
}
