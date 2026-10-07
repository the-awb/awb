// Executable subset of the v1 logical graph: same-source working cells in a DAG.
// Processors, cyclic edges and retained/external source leases are refused here.
import {validateGraph} from './graph-layout.mjs';
const fail=message=>{throw new Error(`Graph compiler: ${message}`);};
const explicit=(mapping,width)=>mapping==='identity'?Array.from({length:width},(_,channel)=>({from:channel,to:channel,gain:1})):structuredClone(mapping);
export function compileGraph(candidate,{sampleRate=44100,maxBufferBytes=64*1024*1024}={}){
  const graph=validateGraph(candidate);
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>384000)fail('unsupported sample rate');
  if(!Number.isSafeInteger(maxBufferBytes)||maxBufferBytes<1)fail('invalid memory budget');
  const indices=new Map(graph.nodes.map((node,index)=>[node.id,index]));
  const portIndices=graph.nodes.map(node=>new Map(node.ports.map((port,index)=>[port.id,index])));
  const nodes=graph.nodes.map((node,index)=>{
    if(node.kind==='processor')fail('processing FX need an explicit backend; no bypass was inserted');
    if(node.kind==='input'&&node.ports.some(p=>p.direction!=='out'))fail('input nodes only expose output ports');
    if(node.kind==='output'&&node.ports.some(p=>p.direction!=='in'))fail('output nodes only expose input ports');
    const result={id:node.id,kind:node.kind,index,ports:structuredClone(node.ports),incoming:[]};
    if(node.kind==='cell'){
      if(!node.writer)fail('this backend requires a working-buffer writer for each cell');
      const bufferIndex=graph.buffers.findIndex(b=>b.id===node.writer.buffer),buffer=graph.buffers[bufferIndex];
      if(node.heads.some(head=>head.source.buffer!==buffer.id))fail('shared/external source readers require leases; this backend reads its own working ring');
      if(node.periodSeconds>buffer.capacitySeconds)fail('head timing span exceeds working capacity');
      if(node.periodSeconds*sampleRate<1)fail('period below one sample');
      if(node.heads.some(head=>(head.delay.unit==='seconds'?head.delay.value:head.delay.value*node.periodSeconds)*sampleRate<1))fail('head delay below one sample');
      const fractions=node.heads.filter(head=>head.delay.unit==='fraction').map(head=>head.delay.value);
      const minPeriod=Math.max(1/sampleRate,...fractions.map(f=>1/sampleRate/f));
      const maxPeriod=Math.min(buffer.capacitySeconds,...fractions.map(f=>buffer.capacitySeconds/f));
      if(minPeriod>=maxPeriod)fail('no usable continuous time range for this working capacity');
      Object.assign(result,{periodBounds:{min:minPeriod,max:maxPeriod},buffer:bufferIndex,periodSeconds:node.periodSeconds,
        writerPort:portIndices[index].get(node.writer.port),writerMapping:explicit(node.writer.mapping,node.ports[portIndices[index].get(node.writer.port)].channels),
        headSlots:node.layout.headSlots,layout:node.layout.kind,
        ...(node.mix?{mix:{input:portIndices[index].get(node.mix.input),output:portIndices[index].get(node.mix.output),mapping:explicit(node.mix.mapping,node.ports[portIndices[index].get(node.mix.input)].channels)}}:{}),
        heads:node.heads.map(head=>({id:head.id,level:head.level??1,source:head.source.channel,delay:head.delay,
          returns:head.returns??[{channel:head.source.channel,gain:1}],
          destinations:head.destinations.map(d=>({port:portIndices[index].get(d.port),channel:d.channel,gain:d.gain}))}))});
    }return result;
  });
  for(const edge of graph.connections){
    const from=indices.get(edge.from.node),to=indices.get(edge.to.node),sourcePort=portIndices[from].get(edge.from.port);
    nodes[to].incoming.push({id:edge.id,fromNode:from,fromPort:sourcePort,toPort:portIndices[to].get(edge.to.port),
      mapping:explicit(edge.mapping,nodes[from].ports[sourcePort].channels)});
  }
  const order=[],pending=new Set(nodes.map(n=>n.index));
  while(pending.size){
    const next=[...pending].find(index=>nodes[index].incoming.every(edge=>!pending.has(edge.fromNode)));
    if(next===undefined)fail('cyclic routes need an explicit return latency; graph not launched');
    pending.delete(next);order.push(next);
  }
  const buffers=graph.buffers.map((b,index)=>{
    const writer=nodes.find(node=>node.buffer===index);if(!writer)fail('unused/external buffer not supported by working-ring backend');
    const frames=Math.ceil(b.capacitySeconds*sampleRate);
    if(!Number.isSafeInteger(frames)||frames>2147483647)fail('buffer frame count exceeds server range');
    return {...b,frames,writer:writer.index};
  });
  const bytes=buffers.reduce((sum,b)=>sum+b.frames*b.channels*4,0);
  if(!Number.isSafeInteger(bytes)||bytes>maxBufferBytes)fail(`working audio exceeds explicit ${maxBufferBytes} byte budget`);
  const waveformRegions=buffers.reduce((sum,b)=>sum+b.channels,0);
  if(waveformRegions>32)fail('current waveform publisher has 32 slots; requested graph not admitted');
  // Parameters and coefficients are explicit. There is no implicit head normalization.
  return {version:1,backend:'channels-v2',sampleRate,buffers,nodes,order,
    admission:{bufferBytes:bytes,maxBufferBytes,waveformRegions},defaults:{inputGain:0,feedback:1,running:1}};
}
// Fixed-key Events and JSON-quoted strings; never interpolate executable user text.
export function scLiteral(value){
  if(value===null)return 'nil';
  if(typeof value==='boolean')return value?'true':'false';
  if(typeof value==='number'){if(!Number.isFinite(value))fail('nonfinite SC literal');return String(value);}
  if(typeof value==='string'){if(/[\x00-\x1f]/.test(value))fail('control character in SC string');return JSON.stringify(value);}
  if(Array.isArray(value))return '['+value.map(scLiteral).join(',')+']';
  if(value&&typeof value==='object')return '('+Object.entries(value).map(([key,v])=>{
    if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(key))fail('unsafe SC Event key');return key+':'+scLiteral(v);
  }).join(',')+')';
  fail('unsupported SC literal');
}
