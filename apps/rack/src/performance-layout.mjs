import {descriptors,channelRegions} from './model.mjs';
export function performanceLayout(config,{editing=false,height=720,width=640}={}){
 const ds=descriptors(config),first=config.instruments[0],rs=channelRegions(config,first).filter(r=>r.kind!=='channel-state').map(r=>({...r,destinations:r.destinations.filter(d=>editing||r.kind!=='fx'||!['fx1','fx2','fx3'].includes(d))}));
 const count=rs.reduce((n,r)=>n+r.destinations.length,0),left=editing?74:70,cw=editing?84:Math.max(28,Math.min(140,Math.floor((width-left-4)/config.instruments.length))),rh=editing?60:Math.max(16,Math.min(52,Math.floor((height-126)/Math.max(1,count)))),headers=[],cells=[],rows=[],racks=[];
 let y=22;const labels={id:'labels',label:'Destinations',scope:'labels',x:0,y:0,width:left,height:0,headers:[],rows:[],cells:[]};
 for(const r of rs){labels.headers.push({text:r.label.replace(/ sends$/i,''),x:4,y,width:left-8,height:12,fontSize:11});y+=18;
  for(const dest of r.destinations){labels.headers.push({text:dest.replace(/^mod-/,'').toUpperCase(),x:4,y:y+(rh-16)/2,width:left-8,height:16,fontSize:11,small:true});y+=rh;}y+=4;
 }
 const stateHeight=editing?60:26,levelHeight=editing?60:34,stateY=y;y+=stateHeight;const levelY=y;y+=levelHeight;
 labels.headers.push({text:'MUTE / SOLO',x:4,y:stateY+7,width:left-8,height:12,fontSize:9},{text:'LEVEL',x:4,y:levelY+7,width:left-8,height:12,fontSize:9});labels.height=y;racks.push(labels);
 config.instruments.forEach((i,col)=>{const x=left+col*cw,rack={id:i.id,label:i.label,scope:'instrument',x,y:0,width:cw,height:y,headers:[],rows:[],cells:[]};
  rack.rows.push({text:i.label.replace(/ IN.*$/,'').replace(/ \(.*\)/,''),x,y:3,width:cw,height:16,fontSize:11,align:'center',bold:true});let cy=22;
  for(const r of rs){cy+=18;for(const dest of r.destinations){const d=ds.find(d=>d.instrument===i.id&&d.region.id===r.id&&d.destination===dest);if(d)rack.cells.push({descriptor:d,x:x+2,y:cy,width:cw-4,height:rh});cy+=rh;}cy+=4;}
  for(const [n,d]of ds.filter(d=>d.instrument===i.id&&d.region.kind==='channel-state').entries())rack.cells.push({descriptor:d,x:x+2+n*cw/2,y:stateY,width:cw/2-4,height:stateHeight});
  const d=ds.find(d=>d.instrument==='global'&&d.region.kind==='channel-levels'&&d.destination===i.id);if(d)rack.cells.push({descriptor:d,x:x+2,y:levelY,width:cw-4,height:levelHeight-2,horizontal:true});
  cells.push(...rack.cells);rows.push(...rack.rows);headers.push(...rack.headers);racks.push(rack);
 });
 if(editing){for(const r of config.regions.filter(r=>r.scope==='global'&&(!['channel-levels','levels'].includes(r.kind)||r.id==='control-levels'))){
  y+=16;const shared={id:r.id,label:r.label,scope:'global',x:0,y:y-16,width:left+config.instruments.length*cw,height:0,headers:[],rows:[],cells:[]};shared.headers.push({text:r.label,x:4,y:y-14,width:left-8,height:12,fontSize:8});
  r.destinations.forEach((dest,i)=>{const x=left+(i%config.instruments.length)*cw,cy=y+Math.floor(i/config.instruments.length)*76,d=ds.find(d=>d.instrument==='global'&&d.region.id===r.id&&d.destination===dest);shared.headers.push({text:dest.replace(/^mod-/,'').toUpperCase(),x,y:cy,width:cw,height:12,fontSize:9,align:'center'});if(d)shared.cells.push({descriptor:d,x:x+2,y:cy+14,width:cw-4,height:60})});
  y+=Math.ceil(r.destinations.length/config.instruments.length)*76;shared.height=y-shared.y;cells.push(...shared.cells);headers.push(...shared.headers);racks.push(shared);
 }}headers.push(...labels.headers);return {hideValues:!editing,rowHeight:rh,width:left+config.instruments.length*cw,height:y,headers,rows,cells,racks};
}
