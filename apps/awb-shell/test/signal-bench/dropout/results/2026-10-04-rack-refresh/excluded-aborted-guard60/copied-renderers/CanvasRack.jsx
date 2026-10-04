import React,{memo,useEffect,useRef} from 'react';
import {MixControlFields} from './Mixes.jsx';
import {createCanvasRack} from './canvasRenderer.mjs';
export const canvasStats={hostRenders:0,frames:0,fullFrames:0,tiles:0,attributeUpdates:0,drawCalls:0,presentations:0};
export function resetCanvasStats(){for(const k in canvasStats)canvasStats[k]=0;}
export const CanvasRack=memo(function CanvasRack({store,layout,onSelect,captureSelection}){
  const host=useRef();canvasStats.hostRenders++;
  useEffect(()=>{let renderer;try{renderer=createCanvasRack(host.current,{store,layout,onSelect,captureSelection,stats:canvasStats});}catch(e){host.current.textContent=`WebGL unavailable: ${e.message}`;}return()=>renderer?.dispose();},[store,layout,onSelect,captureSelection]);
  return <div className={`rack-plane canvas-plane ${store.mixDraft?'mix-edit-plane':''}`} data-renderer="canvas" style={{width:layout.width,height:layout.height}}><div ref={host} className="canvas-drawing"/>{store.mixDraft&&layout.cells.map(cell=><div className="canvas-mix-cell" key={cell.descriptor.id} style={{left:cell.x,top:cell.y,width:cell.width,height:cell.height}}><MixControlFields session={store.mixDraft} cell={cell} layout={layout} onSelect={onSelect}/></div>)}</div>;
});
