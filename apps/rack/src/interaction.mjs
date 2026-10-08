import {mapPosition,positionOf,clamp} from './model.mjs';
export function beginDrag(store,descriptor,event,{snap=false,height=88}={}){
  const start=positionOf(store.get(descriptor.id),descriptor.region);
  return e=>{const fine=e.shiftKey||e.ctrlKey||e.metaKey?10:1;const p=snap?1-e.localY/height:start+(event.clientY-e.clientY)/(150*fine);store.set(descriptor.id,mapPosition(clamp(p),descriptor.region));};
}
export function keyControl(store,d,e){const r=d.region,current=store.get(d.id);let next;
  if(e.key==='Home')next=r.min;else if(e.key==='End')next=r.max;
  else if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){const direction=['ArrowUp','ArrowRight'].includes(e.key)?1:-1;const step=r.step||((r.max-r.min)/100);next=r.curve==='audio'?mapPosition(positionOf(current,r)+direction*(e.shiftKey?.001:.01),r):current+step*direction*(e.shiftKey?0.1:1);}else return false;
  e.preventDefault();store.set(d.id,next);return true;
}
export function wheelControl(store,d,e){e.preventDefault();const r=d.region;store.set(d.id,mapPosition(positionOf(store.get(d.id),r)+(e.deltaY<0?1:-1)/(e.shiftKey||e.ctrlKey?1000:100),r));}
