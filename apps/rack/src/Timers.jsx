import React,{memo,useEffect,useRef,useSyncExternalStore} from 'react';
const clock=ms=>{const s=Math.max(0,Math.floor(ms/1000));return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`};
export const MixTimers=memo(function MixTimers({transport,command}){
 const status=useSyncExternalStore(transport.subscribe,transport.snapshot),root=useRef();
 useEffect(()=>{
  const t=status.timing;if(!t||!root.current)return;
  const received=performance.now();let frame,last=-Infinity;
  const paint=stamp=>{
   // Follow the display frame, at 8 Hz, without rerendering the matrix or sending telemetry.
   if(stamp-last>=125){last=stamp;const now=t.now+stamp-received,s=t.scene,c=t.set;
    const sceneElapsed=Math.min(s.duration,s.elapsed+(s.startedAt===null?0:Math.max(0,now-s.startedAt)));
    root.current.querySelector('[data-scene-clock]').textContent=clock(Math.ceil((s.duration-sceneElapsed)/1000)*1000);
    root.current.querySelector('progress').value=s.duration?sceneElapsed/s.duration:0;
    root.current.querySelector('[data-set-clock]').textContent=clock(c.elapsed+(c.startedAt===null?0:Math.max(0,now-c.startedAt)));
   }
   if(t.scene.active||t.set.running)frame=requestAnimationFrame(paint);
  };paint(received);return()=>cancelAnimationFrame(frame);
 },[status.timing]);
 return <div ref={root} className="mix-timers"><div className="timer-row scene-timer" data-active={status.recall} title={status.timing?.scene.label||'No scene recalled'}><span>Transition</span><output data-scene-clock aria-label="Scene transition remaining">00:00</output>{status.recall&&<button aria-label="Stop scene transition" onClick={()=>command({type:'stop'})}>■</button>}</div><progress max="1" value="0" aria-label="Scene transition progress"/><div className="timer-row"><span>Set</span><output data-set-clock aria-label="Set elapsed time">00:00</output></div><div className="timer-actions"><button disabled={!status.connected} onClick={()=>command({type:'set-timer',action:status.timing?.set.running?'pause':'start'})}>{status.timing?.set.running?'Pause timer':'Start timer'}</button><button disabled={!status.connected} onClick={()=>command({type:'set-timer',action:'reset'})}>Reset timer</button></div></div>;
});
