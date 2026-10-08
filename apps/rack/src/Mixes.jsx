import React,{memo,useCallback,useState,useRef,useSyncExternalStore} from 'react';
import {targetCount,validateCaptureTiming} from './model.mjs';
import {MixTimers} from './Timers.jsx';
import {gridNeighbour} from './mixes.mjs';
const seconds=ms=>Number((ms/1000).toFixed(3));
const alignments=[['L','Start'],['C','Centre'],['R','End'],['J','Start (legacy J)']];
const Alignment=({value,onChange,...props})=><select {...props} value={value} onChange={e=>onChange(e.target.value)}>{alignments.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>;

const CaptureForm=memo(function CaptureForm({store,selection,command,setNotice,onCaptured,onRack,editing}){
  useSyncExternalStore(selection.subscribe,selection.getRevision);
  const [name,setName]=useState('New mix'),[scene,setScene]=useState(''),[duration,setDuration]=useState('1'),[targetTime,setTargetTime]=useState('1'),[alignment,setAlignment]=useState('L'),[busy,setBusy]=useState(false);
  let invalid='';try{if(duration===''||targetTime==='')throw Error('Enter both transition times.');validateCaptureTiming(Number(duration)*1000,Number(targetTime)*1000,alignment);if(!name.trim())throw Error('Give the snapshot a name.');}catch(e){invalid=e.message;}
  const capture=async selected=>{try{setBusy(true);const result=await command({type:'capture',label:name,sceneID:scene||null,duration:Number(duration)*1000,targetDuration:Number(targetTime)*1000,alignment,...(selected?{ids:[...selection.ids]}:{})});selection.end();onCaptured(result.snapshotID);setNotice(selected?'Selected controls captured. Other targets are blank.':'Complete matrix captured, including destination levels.');}catch(e){setNotice(e.message,true);}finally{setBusy(false);}};
  return <div className="capture-form"><h3>Capture current matrix</h3><label>Name<input aria-label="Capture name" value={name} onChange={e=>setName(e.target.value)}/></label><label>SC scene ID<input aria-label="Capture SC scene ID" value={scene} onChange={e=>setScene(e.target.value)} placeholder="Optional"/></label>
    <div className="capture-times"><label>Mix time · s<input aria-label="Capture mix time seconds" type="number" min="0" max="3600" step=".1" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Target time · s<input aria-label="Capture target time seconds" type="number" min="0" max={duration} step=".1" value={targetTime} onChange={e=>setTargetTime(e.target.value)}/></label></div>
    <label>Default alignment<Alignment aria-label="Capture default alignment" value={alignment} onChange={setAlignment}/></label>
    {invalid&&<p className="form-error" role="status">{invalid}</p>}
    {selection.active?<><p className="capture-help" role="status">{selection.ids.size} selected · click controls to toggle. Values stay unchanged.</p><div className="capture-actions"><button disabled={busy||!!invalid||!selection.ids.size} onClick={()=>capture(true)}>Make snapshot</button><button disabled={busy} onClick={()=>selection.end()}>Cancel</button></div></>:<div className="capture-actions"><button disabled={editing||busy||!!invalid} onClick={()=>capture(false)}>Snapshot all</button><button disabled={editing||busy} onClick={()=>{selection.start();onRack();}}>Select snapshot</button></div>}
  </div>;
});

export const MixPanel=memo(function MixPanel({store,selection,chosen,onChoose,onEdit,onRack,command,setNotice,editing,onLoadSet,onSaveSet,transport,savedSets,onChooseSavedSet,onBrowseSet,onCloseSavedSets}){
  useSyncExternalStore(store.subscribeMeta,store.getRevision);
  const active=useSyncExternalStore(selection.subscribe,()=>selection.active);
  const recall=async id=>{onChoose(id);try{await command({type:'recall',id});}catch{}};
  return <aside className="mix-panel" aria-label="Mixes panel"><div className="mix-panel-title"><strong title={store.mixSet?.name}>{store.mixSet?.name??'Mixes'}</strong><button disabled={!chosen} onClick={()=>onEdit(chosen)}>Edit mix</button></div><div className="mix-set-actions"><button onClick={onLoadSet}>Load set</button><button onClick={onSaveSet}>Save set</button></div>{savedSets&&<section className="saved-mix-sets" aria-label="Saved sets">
    <div className="saved-set-actions"><button onClick={onBrowseSet}>Browse…</button><button onClick={onCloseSavedSets} aria-label="Close saved sets">Close</button></div>
    {savedSets.loading&&<p role="status">Loading…</p>}
    <div className="saved-set-list">{savedSets.sets.map(s=><button key={s.id} data-saved-set={s.id} disabled={savedSets.loading} onClick={()=>onChooseSavedSet(s.id)} title={`${s.directory}/${s.file}`}><span>{s.name}</span><small>{s.count} mixes · {s.file}</small></button>)}</div>
    {!savedSets.loading&&!savedSets.sets.length&&<p>No saved sets found. Browse to a mix collection.</p>}
    {savedSets.errors.length>0&&<details><summary>{savedSets.errors.length} unavailable files</summary>{savedSets.errors.map((e,i)=><p key={i}>{e}</p>)}</details>}
  </section>}{transport&&<MixTimers transport={transport} command={command}/>}<div className="mix-buttons">{store.snapshots.map(s=><button key={s.id} data-mix={s.id} disabled={active} className={s.id===chosen?'active':''} onClick={()=>editing?onEdit(s.id):recall(s.id)}><span>{s.label}</span><small>{s.sceneID==null?'Unassigned':`SC ${s.sceneID}`} · {seconds(s.duration)}s · {targetCount(s)}/{store.controls.length}</small></button>)}{!store.snapshots.length&&<p>No mixes yet. Capture the matrix below.</p>}</div><details className="capture-disclosure" open><summary>Capture snapshot</summary><CaptureForm store={store} selection={selection} command={command} setNotice={setNotice} onCaptured={onChoose} onRack={onRack} editing={editing}/></details></aside>;
});

export const MixControlFields=memo(function MixControlFields({session,cell,layout,onSelect}){
  const d=cell.descriptor,id=d.id,root=useRef(),[expanded,setExpanded]=useState(()=>session.snapshot.targets[id]!=null);
  const subscribe=useCallback(f=>session.subscribeField(id,f),[session,id]),snapshot=useCallback(()=>session.getFieldRevision(id),[session,id]);
  useSyncExternalStore(subscribe,snapshot);useSyncExternalStore(session.subscribeTiming,session.getTimingRevision);
  const target=session.snapshot.targets[id];
  const focus=field=>{const input=root.current.querySelector(`[data-mix-field="${field}"]`);input?.focus();input?.select?.();};
  const key=e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();const next=gridNeighbour(layout.cells,id,e.key),plane=root.current.closest('.rack-plane'),input=plane.querySelector(`[data-mix-control="${next}"] [data-mix-field="amount"]`);input?.focus();input?.select();input?.scrollIntoView({block:'nearest',inline:'nearest'});return;}
    if(e.key==='Tab'){e.preventDefault();e.stopPropagation();if(!target){focus('amount');return;}setExpanded(true);const fields=['amount','time','alignment'],at=fields.indexOf(e.target.dataset.mixField),next=fields[(at+(e.shiftKey?2:1))%3];requestAnimationFrame(()=>focus(next));}
  };
  return <div ref={root} data-mix-control={id} className={`mix-control-fields ${cell.large?'large-mix':''} ${target==null?'mix-null':''}`} onKeyDown={key}>
    <input className="mix-amount" data-mix-field="amount" aria-label={`${id} mix amount`} type="number" min={d.region.min} max={d.region.max} step={d.region.step||'any'} placeholder="—" value={target?.value??''} onFocus={()=>onSelect(id)} onChange={e=>session.patch(id,{value:e.target.value===''?null:Number(e.target.value)})}/>
    <button className="mix-expand" tabIndex="-1" aria-label={`${id} expand timing`} aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'▴':'▾'}</button>
    {expanded&&<div className="mix-timing-fields"><input data-mix-field="time" aria-label={`${id} mix time seconds`} title="Transition seconds" type="number" min="0" max={session.snapshot.duration/1000} step=".1" disabled={!target} value={target?seconds(session.snapshot.duration*target.fraction):''} onChange={e=>session.patch(id,{time:Number(e.target.value)*1000})}/><Alignment data-mix-field="alignment" aria-label={`${id} mix alignment`} title="Transition alignment" disabled={!target} value={target?.alignment??'L'} onChange={alignment=>session.patch(id,{alignment})}/></div>}
  </div>;
});

export const MixEditBar=memo(function MixEditBar({session,command,setNotice,onExit,onDiscard}){
  useSyncExternalStore(session.subscribeSummary,session.getSummaryRevision);const s=session.snapshot;
  let invalid='';try{session.validate();}catch(e){invalid=e.message;}
  const save=async action=>{try{await command({type:'snapshot',snapshot:s});session.markSaved();if(action==='recall'||action==='immediate')await command({type:'recall',id:s.id,direct:action==='immediate'});if(action==='done')onExit();setNotice('Mix edits saved.');}catch(e){setNotice(e.message,true);}};
  return <div className="mix-edit-bar"><div className="mix-edit-heading"><strong>MIX EDIT</strong><span>{targetCount(s)} defined · {session.dirty?'unsaved changes':'saved'}</span><button disabled={!!invalid} onClick={()=>save()}>Save edits</button><button disabled={!!invalid} onClick={()=>save('recall')}>Save & recall</button><button disabled={!!invalid} onClick={()=>save('immediate')}>Recall immediately</button><button disabled={!!invalid} onClick={()=>save('done')}>Done</button><button onClick={onDiscard}>Discard</button><button onClick={async()=>{try{await command({type:'delete-snapshot',id:s.id});onDiscard();setNotice('Mix deleted.');}catch{}}}>Delete mix</button></div>
    <div className="mix-edit-settings"><label>Name<input aria-label="Mix name" value={s.label} onChange={e=>session.metadata({label:e.target.value})}/></label><label>SC scene ID<input aria-label="Mix SC scene ID" value={s.sceneID??''} onChange={e=>session.metadata({sceneID:e.target.value||null})}/></label><label>Mix time · s<input aria-label="Mix transition time seconds" type="number" min="0" max="3600" step=".1" value={seconds(s.duration)} onChange={e=>session.metadata({duration:Number(e.target.value)*1000})}/></label><label>Default time · s<input aria-label="Mix default target time seconds" type="number" min="0" max={s.duration/1000} step=".1" value={seconds(s.defaultTransition.duration)} onChange={e=>session.metadata({defaultTransition:{...s.defaultTransition,duration:Number(e.target.value)*1000}})}/></label><label>Default alignment<Alignment aria-label="Mix default alignment" value={s.defaultTransition.alignment} onChange={alignment=>session.metadata({defaultTransition:{...s.defaultTransition,alignment}})}/></label><button onClick={()=>session.applyDefaults()}>Apply default timing</button></div>
    <p>Amounts update live · blank = unchanged · 0 = explicit zero · arrows move controls · Tab cycles amount / time / alignment · mix time scales target times.</p>{invalid&&<p className="form-error" role="status">{invalid}</p>}
  </div>;
});
