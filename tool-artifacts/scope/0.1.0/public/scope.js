import {BUS_SCOPE_PROTOCOL,decodeBusScopeFrame} from './protocol.js';
import {ScopeHistory,findTriggerWindow} from './scope-history.js';
import {ScopePainter,ScopeFrameClock} from './scope-painter.js';
import {ScopeMetadata,CanvasBusMeters} from './scope-metadata.js';
import {OpacityBusWidgets} from './scope-opacity.js';
import {paintScopeTrace} from './scope-trace.js';
const $=id=>document.getElementById(id),canvas=$('scope'),ctx=canvas.getContext('2d'),grid=document.createElement('canvas');
const meters=new CanvasBusMeters($('meters')),opacityWidgets=new OpacityBusWidgets($('opacityWidgets'));
const waveVisible=()=>['both','waves','wave-opacity'].includes($('displayMode').value),meterVisible=()=>['both','meters'].includes($('displayMode').value),opacityVisible=()=>['opacity','wave-opacity'].includes($('displayMode').value);
const colors=['#6ce0c1','#ffb276','#80bcff','#ed97bd','#b5df85','#bbabff'];
let active=false,configuration=null,generation=0,history=new ScopeHistory(1024),snapshot=null,reuse,dirty=false,frozen=false,zoom=1,gain=1,stream,closed=false,retryTimer,retryMs=500,zoomTimer,queue=Promise.resolve(),gridKey='';
let triggerWindow=null,triggerStatus='Free running',triggerKey='';
let rect=canvas.getBoundingClientRect();
const frameClock=new ScopeFrameClock(),frameOptions={requestFrame:fn=>frameClock.request(fn),cancelFrame:id=>frameClock.cancel(id),phase:()=>frameClock.epoch};
const painter=new ScopePainter({...frameOptions,paint:draw}),meterPainter=new ScopePainter({...frameOptions,fps:15,paint:()=>{if(meterVisible())meters.render();}}),metadata=new ScopeMetadata({hz:8,update:updateMetadata});
const opacityPainter=new ScopePainter({...frameOptions,rates:[8,15],fps:15,paint:()=>{if(opacityVisible())opacityWidgets.render();}});
function text(id,value){if($(id).textContent!==value)$(id).textContent=value;}
function error(message){$('error').hidden=!message;text('error',message||'');}
function connection(value){text('connection',value);$('connection').classList.toggle('live',value==='Live');}
async function request(path,input){
 const response=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}),result=await response.json();
 if(!response.ok)throw new Error(result.error||'Scope request failed');return result;
}
function resume(){frozen=false;$('freeze').textContent='Freeze';$('freeze').classList.remove('selected');}
function clearHistory(rate){opacityWidgets.values?.reset();meters.levels?.reset();triggerWindow=null;triggerKey='';triggerStatus='Waiting for capture';history=new ScopeHistory(rate==='control'?128:1024);snapshot=null;reuse=null;dirty=false;resume();metadata.invalidate();painter.invalidate(true);}
function onState(state){
 if(state.type!=='status')throw new Error('Invalid scope status');
 if(state.generation!==generation){generation=state.generation;clearHistory(state.configuration?.rate);}
 active=!!state.connected;configuration=state.configuration;meters.configure(active?configuration:null);configureOpacity();
 $('stop').disabled=!active;$('freeze').disabled=!active;$('listen').disabled=stream?.readyState!==WebSocket.OPEN;
 connection(active?'Live':state.error?'Disconnected':'Stopped');error(state.error);
 if(configuration){const last=configuration.bus+configuration.channels-1;text('routing',`${configuration.rate==='control'?'Control':'Audio'} buses ${configuration.bus}${last===configuration.bus?'':'–'+last}`);document.title=$('routing').textContent+' · Scope';}
 else{text('routing','Choose a bus range and listen.');document.title='Scope';text('channels','No active capture');text('source','Shell SC · no active bus');text('duration','—');text('level','—');text('updates','—');text('resolution','Waiting for capture');}
 const channelKey=configuration?[configuration.bus,configuration.channels].join(':'):'';
 if(channelKey!==$('triggerChannel').dataset.range){const chosen=Number($('triggerChannel').value);$('triggerChannel').replaceChildren(...Array.from({length:configuration?.channels||1},(_,ch)=>{const option=document.createElement('option');option.value=String(ch);option.textContent=configuration?'Bus '+(configuration.bus+ch):'First channel';return option;}));$('triggerChannel').value=String(Math.min(chosen,(configuration?.channels||1)-1));$('triggerChannel').dataset.range=channelKey;}
 metadata.invalidate();painter.invalidate(true);globalThis.awbHost?.reportSessionState?.({listening:active,bus:configuration?.bus??null,channels:configuration?.channels??null,rate:configuration?.rate??null});
}
function configureOpacity(){opacityWidgets.configure(active&&opacityVisible()?{...configuration,size:$('opacitySize').value}:null);text('opacityMapping',!configuration?'Listen to a bus range.':configuration.rate==='audio'?'Audio RMS · −60…0 dBFS → opacity 0.12…1':'Control −1…+1 → opacity 0.12…1');}
function syncView(){
 const waves=waveVisible();$('meters').hidden=!meterVisible();$('opacityDemo').hidden=!opacityVisible();configureOpacity();document.querySelector('main').classList.toggle('meters-only',!waves);
 for(const selector of ['.scope-display','.scope-controls','.scope-navigation','.trigger-controls','.paint-rate'])document.querySelector(selector).hidden=!waves;
 if(meterVisible()&&history.latest){meters.levels?.reset();meters.append(history.latest);}if(opacityVisible()&&history.latest){opacityWidgets.values?.reset();opacityWidgets.append(history.latest);opacityPainter.invalidate();}dirty=true;metadata.invalidate();metadata.flush();if(meterVisible())meterPainter.invalidate();if(waves)painter.invalidate(true);
}
$('displayMode').onchange=syncView;
$('opacitySize').onchange=syncView;
$('opacityRate').onchange=()=>{opacityPainter.setRate(Number($('opacityRate').value));metadata.invalidate();metadata.flush();};
function submitConfiguration(config){
 const job=queue.catch(()=>{}).then(async()=>{if(closed)return;await request('listen',config);});queue=job;
 job.catch(e=>error(e.message));return job;
}
$('busForm').onsubmit=event=>{
 event.preventDefault();if(!$('busForm').reportValidity())return;
 error(null);submitConfiguration({bus:Number($('bus').value),channels:Number($('channelCount').value),rate:$('rate').value,zoom:profile($('rate').value)});
};
$('stop').onclick=()=>{clearTimeout(zoomTimer);queue=queue.catch(()=>{}).then(()=>request('stop',{}));queue.catch(e=>error(e.message));};
$('freeze').onclick=()=>{frozen=!frozen;$('freeze').textContent=frozen?'Resume':'Freeze';$('freeze').classList.toggle('selected',frozen);if(!frozen)dirty=true;metadata.invalidate();metadata.flush();painter.invalidate(true);};
function profile(rate){return rate==='control'||zoom>=1?1:zoom>=.25?.25:.0625;}
function updateAxis(id,value){const label=`${Number(value.toPrecision(3))}×`;text(id+'Value',label);$(id).setAttribute('aria-valuetext',label);}
function updateCapture(){
 if(!active||!configuration)return;const next=profile(configuration.rate);
 if(next!==configuration.zoom){resume();submitConfiguration({...configuration,zoom:next});}
}
function changeZoom(immediate){
 zoom=2**Number($('zoom').value);updateAxis('zoom',zoom);$('pan').disabled=zoom<=1;
 if(frozen&&snapshot&&history.baseFrames/Math.min(zoom,1)>snapshot.sourceFrames)resume();
 if(!frozen)dirty=true;clearTimeout(zoomTimer);if(immediate)updateCapture();else zoomTimer=setTimeout(updateCapture,100);
 metadata.invalidate();metadata.flush();painter.invalidate(immediate);
}
$('zoom').oninput=()=>changeZoom(false);$('zoom').onchange=()=>changeZoom(true);
$('gain').oninput=()=>{gain=2**Number($('gain').value);updateAxis('gain',gain);painter.invalidate(false);};$('gain').onchange=()=>{gain=2**Number($('gain').value);updateAxis('gain',gain);painter.invalidate(true);};
for(const id of ['zoom','gain'])$(id).ondblclick=()=>{$(id).value='0';$(id).dispatchEvent(new Event('change'));};
$('pan').oninput=()=>{metadata.invalidate();metadata.flush();painter.invalidate(true);};
$('traceMode').onchange=()=>{canvas.dataset.traceMode=$('traceMode').value;if(!frozen)dirty=true;painter.invalidate(true);};canvas.dataset.traceMode='connected';
$('paintRate').onchange=()=>{painter.setRate(Number($('paintRate').value));canvas.dataset.paintFPS=String(painter.fps);};canvas.dataset.paintFPS='0';
function triggerChanged(){text('triggerLevelValue',Number($('triggerLevel').value).toFixed(2));if(!frozen)dirty=true;metadata.invalidate();painter.invalidate(true);}
for(const id of ['triggerMode','triggerChannel','triggerLevel'])$(id).oninput=$(id).onchange=triggerChanged;
function range(){if(triggerWindow)return {count:triggerWindow.count,start:0};const frames=snapshot?.frames||history.baseFrames,step=snapshot?snapshot.sourceFrames/snapshot.frames:1,count=Math.min(frames,Math.max(2,Math.floor(history.baseFrames/zoom/step)));return {count,start:Math.round((frames-count)*Number($('pan').value)/100)};}
function consume(){
 if(!dirty||frozen)return;
 if(history.latest){
  const enabled=$('triggerMode').value!=='free'&&history.step===1;
  const key=[$('triggerMode').value,$('triggerChannel').value,$('triggerLevel').value,zoom,$('traceMode').value].join(':');
  if(key!==triggerKey){triggerWindow=null;snapshot=null;triggerKey=key;}
  if(enabled){
   const count=Math.min(history.capacity-1,Math.max(2,Math.floor(history.baseFrames/zoom)));
   const window=findTriggerWindow(history,{count,channel:Number($('triggerChannel').value),level:Number($('triggerLevel').value),edge:$('triggerMode').value,mode:$('traceMode').value});
   if(window){snapshot=history.view(count+1,{reuse,end:window.end});reuse=snapshot.samples;triggerWindow=window;triggerStatus='Triggered';}
   else triggerStatus=triggerWindow?'Waiting · holding trace':'Waiting for crossing';
  }else{
   triggerWindow=null;triggerStatus=$('triggerMode').value==='free'?'Free running':'Unavailable · envelope';
   const bins=Math.min(history.capacity,Math.max(2,Math.floor(history.baseFrames/Math.min(zoom,1)/history.step)));snapshot=history.view(bins*history.step,{reuse});reuse=snapshot.samples;
  }
  metadata.invalidate();
 }
 dirty=false;
}
function updateMetadata(){
 if(!waveVisible()){const latest=history.latest;if(latest){text('channels',`${latest.rate.toUpperCase()} · ${latest.channels} CHANNELS`);text('source',`Shell SC · ${(latest.audioSampleRate/1000).toFixed(1)} kHz audio · block ${latest.blockSize}`);text('updates',`Update ${latest.sequence}`);text('resolution',`Live ${opacityVisible()?(latest.rate==='audio'?'RMS-driven opacity':'control-driven opacity'):(latest.rate==='audio'?'RMS / held peak (dBFS)':'signed control values')} · ${opacityVisible()?'opacity ≤ '+opacityPainter.fps+' Hz':'meters ≤ 15 Hz'} · ${latest.channels} buses`);}return;}
 text('triggerState',!active?'Stopped':frozen?'Frozen · Resume applies settings':triggerStatus);$('triggerChannel').disabled=$('triggerLevel').disabled=$('triggerMode').value==='free'||history.step>1;
 $('pan').disabled=zoom<=1||!!triggerWindow;canvas.dataset.triggerState=triggerStatus;
 if(triggerWindow){canvas.dataset.triggerFraction=String(triggerWindow.fraction);canvas.dataset.triggerCrossing=String(triggerWindow.crossing);}else{delete canvas.dataset.triggerFraction;delete canvas.dataset.triggerCrossing;}
 if(!snapshot)return;const {count,start}=range(),ms=1000*snapshot.sourceFrames/snapshot.frames/snapshot.sampleRate;
 text('channels',`${snapshot.rate.toUpperCase()} · ${snapshot.channels} ${snapshot.channels===1?'CHANNEL':'CHANNELS'}`);text('duration',`${(count*ms).toFixed(2)} ms · ${snapshot.rate==='control'?snapshot.sampleRate.toFixed(1)+' Hz kr':(snapshot.sampleRate/1000).toFixed(1)+' kHz ar'}`);
 text('startTime',`${(start*ms).toFixed(2)} ms`);text('endTime',`${((start+count)*ms).toFixed(2)} ms`);
 text('source',`Shell SC · ${(snapshot.audioSampleRate/1000).toFixed(1)} kHz audio · block ${snapshot.blockSize}`);text('updates',`Update ${snapshot.sequence}`);
 const peak=Math.max(...snapshot.peaks),rms=Math.sqrt(snapshot.rms.reduce((sum,v)=>sum+v*v,0)/snapshot.channels);text('level',`Peak ${peak.toFixed(3)} · RMS ${rms.toFixed(3)}`);$('level').classList.toggle('clipping',peak>=1);
 const missing=1000*snapshot.missingSourceFrames/snapshot.sampleRate;text('resolution',`Rolling ${(snapshot.sourceFrames*1000/snapshot.sampleRate).toFixed(2)} ms · ${snapshot.frames} ${snapshot.format==='minmax'?'min/max bins':'points'} · ${missing?missing.toFixed(1)+' ms filling / gaps':'complete history'}`);
 $('traceMode').disabled=snapshot.format==='minmax';$('traceMode').title=snapshot.format==='minmax'?'Min/max envelope retains every bin peak':'Connections between measured samples';
 for(const [key,value] of Object.entries({bus:snapshot.bus,channels:snapshot.channels,rate:snapshot.rate,generation:snapshot.generation,sourceEnd:snapshot.sourceEnd,frames:snapshot.frames,sourceFrames:snapshot.sourceFrames,format:snapshot.format,visibleFrames:count,sampleRate:snapshot.sampleRate,audioSampleRate:snapshot.audioSampleRate,peaks:snapshot.peaks.join(','),rms:snapshot.rms.join(',')}))canvas.dataset[key]=String(value);
}
function draw(){
 if(!waveVisible())return;consume();const dpr=devicePixelRatio||1,w=rect.width,h=rect.height,width=Math.round(w*dpr),height=Math.round(h*dpr),channels=snapshot?.channels||0,laneHeight=h/Math.max(1,channels);
 const key=[width,height,dpr,snapshot?.bus,channels,snapshot?.rate].join(':');
 if(key!==gridKey){gridKey=key;if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}grid.width=width;grid.height=height;const g=grid.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.strokeStyle='#253638';g.lineWidth=1;g.beginPath();for(let i=0;i<=8;i++){g.moveTo(i*w/8,0);g.lineTo(i*w/8,h);}for(let i=1;i<=Math.max(1,channels);i++){g.moveTo(0,i*laneHeight);g.lineTo(w,i*laneHeight);}g.stroke();
  if(snapshot)for(let ch=0;ch<channels;ch++){g.font='10px -apple-system, sans-serif';g.fillStyle=colors[ch%colors.length];g.fillText(`Bus ${snapshot.bus+ch}`,6,ch*laneHeight+12);}canvas.dataset.backgroundBuilds=String(Number(canvas.dataset.backgroundBuilds||0)+1);
 }
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(grid,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
 if(snapshot){const {count,start}=range();ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
  if(triggerWindow)ctx.translate(-triggerWindow.fraction*w/(count-1),0);
  for(let ch=0;ch<channels;ch++){ctx.strokeStyle=ctx.fillStyle=colors[ch%colors.length];paintScopeTrace(ctx,{samples:snapshot.samples,format:snapshot.format,frames:snapshot.frames,channel:ch,start,count:count+(triggerWindow?1:0),width:triggerWindow?w*count/(count-1):w,middle:(ch+.5)*laneHeight,scale:laneHeight*.4,gain,mode:$('traceMode').value,control:snapshot.rate==='control',pixelRatio:dpr});}
  ctx.restore();canvas.dataset.renderedSourceEnd=String(snapshot.sourceEnd);
 }
 canvas.dataset.paints=String(Number(canvas.dataset.paints||0)+1);
}
function connect(){
 const url=new URL('/socket',location.href);url.protocol='ws:';const socket=new WebSocket(url,BUS_SCOPE_PROTOCOL);stream=socket;socket.binaryType='arraybuffer';
 socket.onopen=()=>{retryMs=500;$('listen').disabled=false;};
 socket.onmessage=event=>{try{
  if(typeof event.data==='string'){onState(JSON.parse(event.data));return;}
  const packet=decodeBusScopeFrame(event.data,generation);if(!configuration||packet.bus!==configuration.bus||packet.rate!==configuration.rate||packet.channels!==configuration.channels)throw new Error('Bus routing mismatch');
  history.append(packet);if(opacityVisible()){opacityWidgets.append(packet);opacityPainter.invalidate();metadata.invalidate();}if(meterVisible()){meters.append(packet);meterPainter.invalidate();metadata.invalidate();}if(!frozen){dirty=true;if(waveVisible())painter.invalidate(false);}canvas.dataset.transport=BUS_SCOPE_PROTOCOL;socket.send(JSON.stringify({ack:packet.sequence}));
 }catch(e){error(e.message);socket.close(1002,'Invalid scope packet');}};
 socket.onerror=()=>connection('Disconnected');
 socket.onclose=()=>{active=false;meters.clear();opacityWidgets.clear();$('listen').disabled=true;$('stop').disabled=true;$('freeze').disabled=true;connection('Disconnected');if(!closed)retryTimer=setTimeout(connect,retryMs),retryMs=Math.min(5000,retryMs*2);};
}
function dispose(){if(closed)return;closed=true;clearTimeout(retryTimer);clearTimeout(zoomTimer);stream?.close();painter.close();meterPainter.close();opacityPainter.close();opacityWidgets.clear();frameClock.close();metadata.close();observer.disconnect();}
const observer=new ResizeObserver(()=>{rect=canvas.getBoundingClientRect();if(meterVisible())meterPainter.invalidate();if(opacityVisible())opacityPainter.invalidate();painter.invalidate(true);});observer.observe(canvas);
window.addEventListener('pagehide',dispose);globalThis.awbHost?.onCommand?.(command=>{if(command?.type==='dispose')dispose();});
syncView();$('listen').disabled=true;connect();painter.invalidate(true);globalThis.awbHost?.reportReady?.({toolID:'scope'});
