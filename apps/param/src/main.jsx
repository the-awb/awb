import React,{useEffect,useRef,useState} from 'react';import {createRoot} from 'react-dom/client';
import {createStore,readBatch} from './model.mjs';import {AWParamPanel} from './widgets.jsx';import './style.css';
function App(){
  const [stores,setStores]=useState([]),[status,setStatus]=useState('Connecting…'),[hz,setHz]=useState(15),[renderer,setRenderer]=useState('svg'),[cue,setCue]=useState('arc');
  const socket=useRef(),epoch=useRef(),current=useRef([]),generation=useRef(0),sequence=useRef(0),pending=useRef(new Map()),queue=useRef(new Map()),timer=useRef();
  const visibleIDs=useRef(null),viewportTimer=useRef();
  const preferences=useRef({hz});preferences.current={hz};
  const visibility=()=>{if(socket.current?.readyState===1)socket.current.send(JSON.stringify({type:'visible',visible:!document.hidden,hz:preferences.current.hz,ids:visibleIDs.current??undefined}))};
  useEffect(()=>{
    let stopped=false;
    fetch('/api/state').then(r=>r.json()).then(({token})=>{if(stopped)return;const ws=new WebSocket(`ws://${location.host}/ws?token=${token}`);socket.current=ws;ws.binaryType='arraybuffer';
      ws.onopen=visibility;ws.onclose=()=>{if(!stopped){pending.current.clear();queue.current.clear();current.current.forEach(s=>s.observe(null));setStatus('Disconnected · reload to obtain a fresh binding')}};
      ws.onmessage=e=>{try{if(typeof e.data!=='string'){
        const b=readBatch(e.data);if(b.generation!==generation.current||b.sequence<=sequence.current)return;sequence.current=b.sequence;const affected=new Map();
        for(const [index,value]of b.fields){const i=Math.floor(index/3),s=current.current[i];if(!s||!Number.isFinite(value))continue;if(!affected.has(i))affected.set(i,s.observed()?.slice()??[NaN,NaN,NaN]);affected.get(i)[index%3]=value}
        for(const [i,v]of affected)current.current[i].observe(v);return;
      }const m=JSON.parse(e.data);
      if(m.type==='state'){epoch.current=m.state.epoch;generation.current=0;sequence.current=0;pending.current.clear();queue.current.clear();current.current=m.state.params.map(createStore);setStores(current.current);setStatus(m.state.connected?'Connected':m.state.error);visibility()}
      else if(m.type==='generation'){generation.current=m.generation;sequence.current=0;current.current.forEach(s=>s.observe(null))}
      else if(m.type==='status'){setStatus(m.connected?'Connected':m.error);if(!m.connected){queue.current.clear();current.current.forEach(s=>s.observe(null))}}
      else if(m.type==='delta'){const d=m.delta,s=current.current.find(s=>s.get().id===d.id);if(s&&d.source)s.patch({routes:s.get().routes.map(r=>r.id===d.source?(d.field.startsWith('writer:')?{...r,controls:r.controls.map(c=>c.id===d.field.slice(7)?{...c,value:d.value}:c)}:{...r,[d.field==='sourceAmount'?'amount':'curve']:d.value}):r)});else if(s)s.patch(d.metadata??{[{baseTarget:'base',amountTarget:'amount',modCurve:'modCurve'}[d.field]]:d.value})}
      else if(m.type==='routes')current.current.find(s=>s.get().id===m.id)?.patch({routes:m.routes});
      else if(m.type==='result'){pending.current.delete(m.request);if(!m.ok){setStatus(m.error);ws.send(JSON.stringify({type:'sync'}))}}
      }catch(e){setStatus(e.message)}};
    }).catch(e=>setStatus(e.message));document.addEventListener('visibilitychange',visibility);
    return()=>{stopped=true;clearTimeout(timer.current);document.removeEventListener('visibilitychange',visibility);socket.current?.close()}
  },[]);
  useEffect(visibility,[hz]);
  useEffect(()=>{visibleIDs.current=[];const visible=new Set();const observer=new IntersectionObserver(rows=>{for(const row of rows){const id=row.target.dataset.param;if(row.isIntersecting)visible.add(id);else visible.delete(id)}visibleIDs.current=[...visible];clearTimeout(viewportTimer.current);viewportTimer.current=setTimeout(visibility,50)});document.querySelectorAll('[data-param]').forEach(el=>observer.observe(el));return()=>{observer.disconnect();clearTimeout(viewportTimer.current)}},[stores]);
  const edit=(id,field,value,source='')=>{
    const s=current.current.find(s=>s.get().id===id);if(!source){if(field!=='polarity')s.patch({[field]:value})}else s.patch({routes:s.get().routes.map(r=>r.id===source?field.startsWith('writer:')?{...r,controls:r.controls.map(c=>c.id===field.slice(7)?{...c,value}:c)}:{...r,[field==='sourceAmount'?'amount':'curve']:value}:r)});
    queue.current.set(`${id}:${field}:${source}`,{type:'edit',epoch:epoch.current,id,field,value,source});
    if(!timer.current)timer.current=setTimeout(()=>{timer.current=null;const ws=socket.current;if(ws?.readyState!==1){queue.current.clear();return}for(const m of queue.current.values()){m.request=crypto.randomUUID();pending.current.set(m.request,m);ws.send(JSON.stringify(m))}queue.current.clear()},16);
  };
  return <main><header><div><small>AWB / LIVE PARAMETERS</small><h1>Parameters</h1></div><span className="status">{status}</span></header><div className="toolbar"><label>Observation<select value={hz} onChange={e=>setHz(+e.target.value)}><option value="8">8 Hz</option><option value="15">15 Hz</option></select></label><label>Renderer<select value={renderer} onChange={e=>setRenderer(e.target.value)}><option value="svg">SVG</option><option value="canvas">Canvas</option></select></label><label>Output cue<select value={cue} onChange={e=>setCue(e.target.value)}><option value="arc">Arc</option><option value="opacity">Arc + opacity</option></select></label></div><AWParamPanel {...{stores,edit,renderer,cue}}/><footer>Measured base, amount and output · white base · blue/orange amount marker (saturates at ±1) · green sampled output ring</footer></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
