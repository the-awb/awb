// Runtime-owned clocks; renderers extrapolate locally between configuration changes.
export function createRackTiming(now=()=>performance.timeOrigin+performance.now()){
 let scene={active:false,id:null,label:'',duration:0,startedAt:null,elapsed:0},set={running:false,startedAt:null,elapsed:0};
 const elapsed=(timer,at)=>timer.elapsed+(timer.startedAt===null?0:Math.max(0,at-timer.startedAt));
 return {
  snapshot(){return {now:now(),scene:{...scene},set:{...set}}},
  startScene(snapshot,duration){scene={active:true,id:snapshot.id,label:snapshot.label,duration,startedAt:now(),elapsed:0}},
  finishScene(completed=false){if(!scene.active)return;scene={...scene,active:false,elapsed:completed?scene.duration:Math.min(scene.duration,elapsed(scene,now())),startedAt:null}},
  setClock(action){
   if(!['start','pause','reset'].includes(action))throw Error('Invalid set timer action.');
   if(action==='start'&&!set.running)set={...set,running:true,startedAt:now()};
   if(action==='pause'&&set.running)set={running:false,startedAt:null,elapsed:elapsed(set,now())};
   if(action==='reset')set={running:false,startedAt:null,elapsed:0};
  }
 };
}
