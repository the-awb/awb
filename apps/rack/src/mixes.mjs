import {RackStore,copy,quantise} from './model.mjs';
// Capture selection is independent of values and React structure. A single
// selection click notifies only that control, plus the small capture form.
export class CaptureSelection {
  active=false;ids=new Set();revision=0;listeners=new Set();changes=new Set();controls=new Map();
  subscribe=f=>{this.listeners.add(f);return()=>this.listeners.delete(f);};
  getRevision=()=>this.revision;
  subscribeChanges(f){this.changes.add(f);return()=>this.changes.delete(f);}
  subscribeControl(id,f){const set=this.controls.get(id)??new Set();set.add(f);this.controls.set(id,set);return()=>{set.delete(f);if(!set.size)this.controls.delete(id);};}
  emit(event){this.revision++;if(event.kind==='mode')for(const set of this.controls.values())for(const f of set)f();else this.controls.get(event.id)?.forEach(f=>f());this.changes.forEach(f=>f(event));this.listeners.forEach(f=>f());}
  start(){this.ids.clear();this.active=true;this.emit({kind:'mode'});}
  end(){if(!this.active)return;this.active=false;this.ids.clear();this.emit({kind:'mode'});}
  toggle(id){if(!this.active)return;this.ids.has(id)?this.ids.delete(id):this.ids.add(id);this.emit({kind:'selection',id});}
  reconcile(valid){const known=new Set(valid);for(const id of this.ids)if(!known.has(id)){this.ids.delete(id);this.emit({kind:'selection',id});}}
}

export class MixDraft extends RackStore {
  constructor(live,snapshot){super({config:live.config,values:Object.fromEntries(live.controls.map(d=>[d.id,snapshot.targets[d.id]?.value??d.region.min])),snapshots:[]});this.live=live;this.snapshot=copy(snapshot);this.snapshot.defaultTransition??={duration:snapshot.duration,alignment:'L'};this.mixDraft=this;this.dirty=false;this.fields=new Map();this.fieldRevision=new Map();this.summaryListeners=new Set();this.summaryRevision=0;this.timingListeners=new Set();this.timingRevision=0;}
  subscribeSummary=f=>{this.summaryListeners.add(f);return()=>this.summaryListeners.delete(f);};
  getSummaryRevision=()=>this.summaryRevision;
  subscribeTiming=f=>{this.timingListeners.add(f);return()=>this.timingListeners.delete(f);};
  getTimingRevision=()=>this.timingRevision;
  subscribeField(id,f){const set=this.fields.get(id)??new Set();set.add(f);this.fields.set(id,set);return()=>{set.delete(f);if(!set.size)this.fields.delete(id);};}
  getFieldRevision(id){return this.fieldRevision.get(id)??0;}
  changed(id){this.dirty=true;if(id){this.fieldRevision.set(id,this.getFieldRevision(id)+1);this.fields.get(id)?.forEach(f=>f());}this.summaryRevision++;this.summaryListeners.forEach(f=>f());}
  markSaved(){this.dirty=false;this.summaryRevision++;this.summaryListeners.forEach(f=>f());}
  set(id,value){return this.patch(id,{value});}
  patch(id,patch){const d=this.byID.get(id);if(!d)throw Error('Unknown mix control.');const before=this.snapshot.targets[id];if(before==null&&patch.value===undefined)return false;const defaults=this.snapshot.defaultTransition;let target=before?{...before}:{value:this.live.get(id),fraction:this.snapshot.duration?defaults.duration/this.snapshot.duration:0,alignment:defaults.alignment};
    if(patch.value===null)target=null;else{if(patch.value!==undefined){if(!Number.isFinite(patch.value))throw Error('Invalid target amount.');target.value=quantise(patch.value,d.region);}if(patch.time!==undefined)target.fraction=this.snapshot.duration?patch.time/this.snapshot.duration:(patch.time?2:0);if(patch.alignment)target.alignment=patch.alignment;}
    this.snapshot.targets[id]=target;
    if(patch.value!==undefined){const value=target?.value??d.region.min,changed=super.set(id,value,'draft');if(!changed){this.listeners.get(id)?.forEach(f=>f());this.allListeners.forEach(f=>f({kind:'value',id,value,origin:'draft'}));}}
    if(target&&patch.value!==undefined)this.live.set(id,target.value);
    this.changed(id);return true;
  }
  metadata(patch){const previous=this.snapshot.duration;Object.assign(this.snapshot,patch);if(patch.duration!==undefined)this.snapshot.defaultTransition.duration=previous?this.snapshot.defaultTransition.duration*patch.duration/previous:patch.duration;this.timingRevision++;this.timingListeners.forEach(f=>f());this.changed();}
  applyDefaults(){for(const [id,t]of Object.entries(this.snapshot.targets))if(t){t.fraction=this.snapshot.duration?this.snapshot.defaultTransition.duration/this.snapshot.duration:0;t.alignment=this.snapshot.defaultTransition.alignment;this.changed(id);}}
  validate(){new RackStore({config:this.live.config,values:{},snapshots:[this.snapshot]});}
}

export function gridNeighbour(cells,id,key){const from=cells.find(c=>c.descriptor.id===id);if(!from)return id;const horizontal=key==='ArrowLeft'||key==='ArrowRight',positive=key==='ArrowRight'||key==='ArrowDown',cx=from.x+from.width/2,cy=from.y+from.height/2;
  const candidates=cells.filter(c=>c!==from).map(c=>{const dx=c.x+c.width/2-cx,dy=c.y+c.height/2-cy,along=horizontal?dx:dy,across=Math.abs(horizontal?dy:dx);return {c,along,across};}).filter(p=>(positive?p.along>1:p.along<-1)&&(!horizontal||p.across<1));
  // Prefer the same visual row/column, then the closest cell across a gap.
  candidates.sort((a,b)=>a.across-b.across||Math.abs(a.along)-Math.abs(b.along));return candidates[0]?.c.descriptor.id??id;
}
