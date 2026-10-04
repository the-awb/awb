const clamp=value=>Math.max(0,Math.min(1,value));
export function valueOpacity(value,rate){
 if(!Number.isFinite(value))return .12;
 const unit=rate==='audio'?value>0?clamp((20*Math.log10(value)+60)/60):0:clamp((value+1)/2);
 return .12+.88*unit;
}
// Only the latest ordered control value is needed; audio uses the existing RMS summaries.
export class OpacityValues {
 constructor(channels,rate){this.channels=channels;this.rate=rate;this.reset();}
 reset(){this.lanes=Array.from({length:this.channels},()=>({sum:0,weight:0,value:0}));}
 append(packet){
  if(packet.channels!==this.channels||packet.rate!==this.rate)throw new Error('Opacity routing mismatch');
  this.lanes.forEach((lane,ch)=>{
   if(this.rate==='audio'){lane.sum+=packet.rms[ch]**2*packet.sourceFrames;lane.weight+=packet.sourceFrames;}
   else if(packet.frames){const value=packet.samples[ch*packet.frames+packet.frames-1];if(Number.isFinite(value))lane.value=value;}
  });
 }
 take(){return this.lanes.map(lane=>{if(lane.weight){lane.value=Math.sqrt(lane.sum/lane.weight);lane.sum=0;lane.weight=0;}return valueOpacity(lane.value,this.rate);});}
}
export class OpacityBusWidgets {
 constructor(container){this.container=container;this.key='';this.widgets=[];this.updates=0;this.writes=0;}
 configure(config){
  const sizes=config?.size==='all'?[24,48,96]:[Number(config?.size||48)];
  if(config&&!sizes.every(size=>[24,48,96].includes(size)))throw new Error('Invalid opacity widget size');
  const key=config?[config.bus,config.channels,config.rate,...sizes].join(':'):'';if(key===this.key)return;
  this.key=key;this.container.replaceChildren();this.widgets=[];this.values=config?new OpacityValues(config.channels,config.rate):null;
  this.container.classList.toggle('all-sizes',sizes.length>1);this.container.classList.toggle('control',config?.rate==='control');
  if(!config)return;const doc=this.container.ownerDocument;
  for(let ch=0;ch<config.channels;ch++){
   const card=doc.createElement('div'),label=doc.createElement('span'),examples=doc.createElement('div');card.className='opacity-card';label.className='opacity-bus';label.textContent='Bus '+(config.bus+ch);examples.className='opacity-examples';card.append(label,examples);
   for(const size of sizes){
    const example=doc.createElement('div'),face=doc.createElement('div'),caption=doc.createElement('span');example.className='opacity-example';face.className='opacity-face';caption.className='opacity-size';caption.textContent=size+' px';
    face.style.setProperty('--knob-size',size+'px');face.setAttribute('role','img');face.setAttribute('aria-label',`Bus ${config.bus+ch}, ${size} px opacity indicator`);face.dataset.bus=String(config.bus+ch);face.dataset.size=String(size);example.append(face,caption);examples.append(example);this.widgets.push({face,ch,key:''});
   }
   this.container.append(card);
  }
 }
 append(packet){this.values?.append(packet);}
 render(){
  if(!this.values||this.container.closest('[hidden]'))return;const opacities=this.values.take();this.updates++;
  for(const widget of this.widgets){const key=opacities[widget.ch].toFixed(3);if(key===widget.key)continue;widget.key=key;widget.face.style.opacity=key;this.writes++;}
 }
 clear(){this.configure(null);}
}
