export class ChainStore{
  controls=[];state={connected:false,controls:[]};listeners=new Set();cells=new Map();values=new Map();
  subscribe=listener=>{this.listeners.add(listener);return()=>this.listeners.delete(listener);};
  snapshot=()=>this.state;
  subscribeValue(id,listener){const list=this.cells.get(id)||new Set();this.cells.set(id,list);list.add(listener);return()=>{list.delete(listener);if(!list.size)this.cells.delete(id);};}
  get(id){return this.values.get(id);}
  replace(state){this.controls=state.controls;this.values=new Map(state.controls.map(c=>[c.id,c.value]));this.state=state;this.listeners.forEach(f=>f());this.cells.forEach(list=>list.forEach(f=>f()));}
  status(status){this.state={...this.state,...status};this.listeners.forEach(f=>f());}
  patch(values){for(const [id,value] of Object.entries(values)){const c=this.controls.find(c=>c.id===id);if(!c||!Number.isFinite(value)||value<c.min||value>c.max)throw Error('Invalid Chain value.');}for(const [id,value] of Object.entries(values)){if(this.values.get(id)!==value){this.values.set(id,value);this.cells.get(id)?.forEach(f=>f());}}}
}
export const normalize=(c,value)=>c.curve==='log'?Math.log(value/c.min)/Math.log(c.max/c.min):(value-c.min)/(c.max-c.min);
export const denormalize=(c,value)=>c.curve==='log'?c.min*Math.pow(c.max/c.min,value):c.min+(c.max-c.min)*value;
// Preview the port changes before sending a topology edit. Existing matrices are
// kept when dimensions still fit. New channel conversions need explicit approval.
export function topologyPlan(state,message){
 const stages=(state.stages||[]).map(s=>({...s})),routes=Object.fromEntries(stages.filter(s=>s.matrix).map(s=>[s.id,s.matrix]));if(state.outputMatrix)routes.output=state.outputMatrix;
 const {op,id,index,factory}=message,target=stages.findIndex(s=>s.id===id),definition=(state.factories||[]).find(f=>f.id===factory);
 if(op==='insert'){if(!definition||target>=0||!Number.isInteger(index)||index<0||index>stages.length)throw Error('Invalid insertion.');stages.splice(index,0,{...definition,id,factory});}
 else if(op==='remove'){if(target<0)throw Error('Unknown stage.');stages.splice(target,1);delete routes[id];}
 else if(op==='move'){if(target<0||!Number.isInteger(index)||index<0||index>=stages.length)throw Error('Invalid move.');const[s]=stages.splice(target,1);stages.splice(index,0,s);}
 else if(op==='replace'){if(target<0||!definition)throw Error('Invalid replacement.');stages[target]={...definition,id,factory};}
 else throw Error('Unknown structural edit.');
 const conversions=[],patch={...message.routes};let width=state.width;
 for(const s of [...stages,{id:'output',name:'Chain output',inputWidth:state.width}]){
  const matrix=Object.hasOwn(patch,s.id)?patch[s.id]:routes[s.id];
  const fits=Array.isArray(matrix)&&matrix.length===s.inputWidth&&matrix.every(row=>Array.isArray(row)&&row.length===width);
  if(matrix&&!fits&&width===s.inputWidth)patch[s.id]=null;
  if(!fits&&width!==s.inputWidth){const suggested=Array.from({length:s.inputWidth},(_,r)=>Array.from({length:width},(_,c)=>r===c?1:0));conversions.push({id:s.id,name:s.name,sourceWidth:width,targetWidth:s.inputWidth,matrix:suggested});}
  width=s.outputWidth;
 }
 return {stages,patch,conversions};
}
