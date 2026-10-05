import React,{memo,useState,useSyncExternalStore} from 'react';

function Slot({slot,processors,armed,command,setNotice,maxGain}) {
  const [processor,setProcessor]=useState(processors.includes(slot.processor)?slot.processor:processors[0]??''),[curve,setCurve]=useState(slot.kind==='follower'&&slot.active?slot.processor:'log');
  const [settings,setSettings]=useState(slot.settings??{attack:.01,release:.1,scale:1,blend:1,floorDb:-60});
  const act=async c=>{try{await command(c);}catch(e){setNotice(e.message,true);}};
  return <div className="native-slot"><strong>{slot.label}</strong><span className="native-assignment">{slot.detectorActive?`Peak detector · ${slot.consumerCount} followers`:slot.active?slot.processor:'Empty'} · {slot.fixed?'fixed ID':'spare'}</span>
    {slot.detectorActive?<span>Gain {slot.detector.gainDb} dB · rise {(slot.detector.rise*1000).toFixed(2)} ms · fall {(slot.detector.fall*1000).toFixed(1)} ms</span>:null}
    {slot.kind==='fx'?<select aria-label={`Processor for ${slot.id}`} value={processor} disabled={!armed} onChange={e=>setProcessor(e.target.value)}>{processors.map(id=><option key={id}>{id}</option>)}</select>:<><select aria-label={`Curve for ${slot.id}`} disabled={!armed} value={curve} onChange={e=>setCurve(e.target.value)}>{['log','linear','sqrt'].map(id=><option key={id}>{id}</option>)}</select><details><summary>Follower settings</summary>{Object.entries(settings).map(([key,value])=><label key={key}>{key}<input type="number" aria-label={`${slot.id} ${key}`} disabled={!armed} step="0.01" min={key==='floorDb'?-120:0} max={key==='floorDb'?-.01:key==='blend'?1:key==='scale'?maxGain:60} value={value} onChange={e=>setSettings(s=>({...s,[key]:Number(e.target.value)}))}/></label>)}</details></>}
    {slot.kind==='follower'?<button disabled={!armed} onClick={()=>act({type:'enable-control-send',slotID:slot.id,enabled:!slot.controlEnabled})}>{slot.controlEnabled?'Pause send':'Resume send'}</button>:null}
    <button disabled={!armed||slot.kind==='fx'&&!processor} onClick={()=>act({type:slot.kind==='fx'?'set-fx':'set-follower',slotID:slot.id,processor,settings:{...settings,curve}})}>{slot.active?'Replace':'Assign'}</button>
    <button disabled={!armed||!slot.active} onClick={()=>act({type:slot.kind==='fx'?'clear-fx':'clear-follower',slotID:slot.id})}>Clear</button>
  </div>;
}
export const NativeRack=memo(function NativeRack({transport,command,setNotice}) {
  const state=useSyncExternalStore(transport.subscribe,transport.snapshot),sc=state.sc;if(!sc)return null;
  return <details className="native-rack"><summary>SC routing · {sc.instanceID} · {sc.slots.filter(s=>s.active||s.detectorActive).length}/{sc.slots.length} destinations assigned</summary>
    <div className="native-toolbar"><span>Stable buses · channel mute / solo applies before every send</span><button disabled={!state.connected} onClick={()=>command({type:'sync-sc'}).then(()=>setNotice('Synced once from SC.')).catch(()=>{})}>Sync from SC</button></div>
    <div className="native-slots">{sc.slots.map(slot=><Slot key={`${slot.id}/${slot.processor}/${slot.active}/${JSON.stringify(slot.settings)}`} slot={slot} processors={sc.processors} armed={state.armed} command={command} setNotice={setNotice} maxGain={sc.maxGain}/>)}</div>
  </details>;
});
