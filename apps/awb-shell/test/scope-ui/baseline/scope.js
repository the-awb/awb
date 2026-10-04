import {decodeScopeFrame,SCOPE_PROTOCOL} from './scope-protocol.js';
import {ScopePainter} from './scope-painter.js';
import {ScopeHistory} from './scope-history.js';
const history=new ScopeHistory(new URLSearchParams(location.search).get('kind')==='control'?128:1024);
const $=id=>document.getElementById(id);
const requestedKind=new URLSearchParams(location.search).get('kind');
const kind=['mic','output','control'].includes(requestedKind)?requestedKind:'mic';
const title=kind==='mic'?'Mic / input 1':kind==='output'?'Audio out / 1–2':'Control / LFO + Noise';
document.title=`${title} · Shared Loop`;$('title').textContent=title;
$('routing').textContent=kind==='mic'?'Raw hardware input · before looper input gain':kind==='output'?'SC hardware output buses · final stereo mix':'Owned SC control buses · In.kr → ScopeOut2.kr';
$('source').textContent=kind==='mic'?'Independent of tone/mic selection':kind==='output'?'Includes other instruments on the same SC output buses':'Two sine LFOs + four independent LFNoise0 channels';
if(kind==='control'){document.body.classList.add('control-scope');$('signalPicker').hidden=false;}
const signalNames=['Sine 1 Hz','Sine 10 Hz','Noise 1 Hz','Noise 5 Hz','Noise 20 Hz','Noise 100 Hz'];
const signalColors=['#6ce0c1','#ffb276','#80bcff','#ed97bd','#b5df85','#bbabff'];
function selectedChannels(){if(kind!=='control')return Array.from({length:snapshot?.channels||1},(_,i)=>i);
 return {all:[0,1,2,3,4,5],noise:[2,3,4,5],slow:[0],fast:[1]}[$('signals').value];}
$('signals').onchange=()=>{if(!frozen)requestSelection();if(snapshot)updateLevel();invalidate();};
function channelIndex(id){return snapshot?.channelIds?.indexOf(id)??id;}
function requestedChannels(){return kind==='control'?selectedChannels():kind==='mic'?[0]:[0,1];}
function requestSelection(){if(stream?.readyState===WebSocket.OPEN)stream.send(JSON.stringify({channels:requestedChannels()}));}
function updateSignalChoices(){if(kind!=='control')return;for(const option of $('signals').options){const ids={all:[0,1,2,3,4,5],noise:[2,3,4,5],slow:[0],fast:[1]}[option.value];option.disabled=frozen&&ids.some(id=>channelIndex(id)<0);}if(frozen&&$('signals').selectedOptions[0]?.disabled){$('signals').value=[...$('signals').options].find(option=>!option.disabled)?.value??'all';if(snapshot)updateLevel();}}
function updateLevel(){if(kind==='control'){const chosen=selectedChannels(),peak=Math.max(...chosen.map(ch=>snapshot.peaks[channelIndex(ch)]??0)),rms=Math.sqrt(chosen.reduce((sum,ch)=>sum+(snapshot.rms[channelIndex(ch)]??0)**2,0)/chosen.length);
 $('level').textContent=`Peak ${peak.toFixed(3)} · RMS ${rms.toFixed(3)}`;}
 else $('level').textContent=snapshot.peaks.map((peak,ch)=>`${snapshot.channels===2?(ch?'R ':'L '):''}${db(peak)}`).join('  /  ');}
const canvas=$('scope'),ctx=canvas.getContext('2d');let snapshot=null,receivedAt=0,frozen=false,gain=1,zoom=1;
let historyDirty=false,displaySamples;
let rect=canvas.getBoundingClientRect();const grid=document.createElement('canvas');let gridDpr=0;
const painter=new ScopePainter({paint:()=>draw()});
function invalidate(immediate=true){if(!stopped)painter.invalidate(immediate)}
$('paintRate').onchange=()=>{painter.setRate(Number($('paintRate').value));canvas.dataset.paintFPS=String(painter.fps);};
const initialPaintRate=new URLSearchParams(location.search).get('fps');
if(['0','30','15'].includes(initialPaintRate)){$('paintRate').value=initialPaintRate;painter.fps=Number(initialPaintRate);}
canvas.dataset.paintFPS=String(painter.fps);
const db=value=>value>0?`${(20*Math.log10(value)).toFixed(1)} dBFS`:'−∞ dBFS';
$('freeze').onclick=()=>{frozen=!frozen;if(!frozen)refreshHistory();$('freeze').textContent=frozen?'Resume':'Freeze';$('freeze').classList.toggle('selected',frozen);updateSignalChoices();if(!frozen)requestSelection();invalidate();};
$('gain').onchange=()=>{gain=Number($('gain').value);invalidate();};
let captureZoom=1,captureQueue=Promise.resolve();
function requestCapture(next){
 const target=Math.min(next,1);if(target===captureZoom)return;
 captureZoom=target;captureQueue=captureQueue.catch(()=>{}).then(async()=>{
  const response=await fetch('/api/scope-view',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,zoom:target})});
  const result=await response.json();if(!response.ok)throw new Error(result.error);
 }).catch(error=>{$('resolution').textContent=error.message;});
 if(frozen){frozen=false;$('freeze').textContent='Freeze';$('freeze').classList.remove('selected');updateSignalChoices();requestSelection();}
}
$('zoom').onchange=()=>{zoom=Number($('zoom').value);$('pan').disabled=zoom<=1;requestCapture(zoom);if(!frozen)refreshHistory();updateRange();invalidate();};
$('pan').oninput=()=>{updateRange();invalidate();};
function visibleRange(){const frames=snapshot?.frames||1024,count=Math.max(2,Math.floor(frames/Math.max(1,zoom)));return {count,start:Math.round((frames-count)*Number($('pan').value)/100)};}
function updateRange(){if(!snapshot)return;const {count,start}=visibleRange(),ms=1000*snapshot.sourceFrames/snapshot.frames/snapshot.sampleRate;
 $('duration').textContent=`${(count*ms).toFixed(2)} ms · ${kind==='control'?snapshot.sampleRate.toFixed(1)+' Hz kr':(snapshot.sampleRate/1000).toFixed(1)+' kHz ar'}`;
 $('startTime').textContent=`${(start*ms).toFixed(2)} ms`;$('endTime').textContent=`${((start+count)*ms).toFixed(2)} ms`;
}

let stream,retryTimer,stopped=false,retryMs=500,generation;
function disconnected(){ $('connection').textContent='Disconnected';$('connection').classList.remove('live'); }
function refreshHistory(){historyDirty=true;invalidate(false);}
function consumeHistory(){const span=history.baseFrames/Math.min(zoom,1);if(history.latest&&history.step===1/Math.min(zoom,1)){const next=history.view(span,{reuse:displaySamples});displaySamples=next.samples;applySnapshot(next);}historyDirty=false;}
function applySnapshot(next){if(frozen||!next)return;snapshot=next;
 $('channels').textContent=kind==='control'?`CONTROL · ${snapshot.channels} OF ${snapshot.sourceChannels??6} CHANNELS`:snapshot.channels===1?'INPUT 1':'L · R';updateRange();
 $('resolution').textContent=`Rolling ${(1000*snapshot.sourceFrames/snapshot.sampleRate).toFixed(1)} ms · ${snapshot.frames} ${snapshot.format==='minmax'?'min/max bins':'points'} · ${snapshot.captureFrames}-frame chunks · ${snapshot.missingSourceFrames?'filling / gaps '+(1000*snapshot.missingSourceFrames/snapshot.sampleRate).toFixed(1)+' ms':'complete history'}`;
 if(kind==='control')$('source').textContent=`${snapshot.blockSize} audio samples/control block · ${(snapshot.audioSampleRate/1000).toFixed(1)} kHz audio`;
 updateLevel();
 $('level').classList.toggle('clipping',kind!=='control'&&snapshot.peaks.some(peak=>peak>=1));$('updates').textContent=`Update ${snapshot.sequence}`;
}
function connect(){
 const url=new URL('/scope/socket',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';url.searchParams.set('kind',kind);url.searchParams.set('channels',requestedChannels().join(','));
 const socket=new WebSocket(url,SCOPE_PROTOCOL);stream=socket;socket.binaryType='arraybuffer';
 socket.onmessage=event=>{try{
  if(typeof event.data==='string'){
   const state=JSON.parse(event.data);if(state.type!=='status')throw new Error('Invalid scope status');generation=state.generation;
   $('connection').textContent=state.connected?'Live':'Disconnected';$('connection').classList.toggle('live',state.connected);return;
  }
  const next=decodeScopeFrame(event.data,kind,generation);receivedAt=performance.now();retryMs=500;history.append(next);if(!frozen)refreshHistory();
  $('connection').textContent='Live';$('connection').classList.add('live');
  canvas.dataset.transport='binary-v5';canvas.dataset.channelIds=next.channelIds.join(',');canvas.dataset.channels=String(next.channels);canvas.dataset.chunkFrames=String(next.sourceFrames);canvas.dataset.sourceEnd=String(next.sourceEnd);
  socket.send(JSON.stringify({ack:next.sequence}));
 }catch{disconnected();socket.close(1002,'Invalid scope packet');}};
 socket.onerror=disconnected;
 socket.onclose=()=>{disconnected();history.reset();if(!stopped){retryTimer=setTimeout(connect,retryMs);retryMs=Math.min(retryMs*2,5000);}};
}
// Reopening a viewer restores its baseline capture; widened settings belong to this live view.
captureZoom=0;requestCapture(1);connect();
function draw(){
 if(historyDirty&&!frozen)consumeHistory();
 const dpr=devicePixelRatio||1,w=rect.width,h=rect.height;
 const width=Math.round(w*dpr),height=Math.round(h*dpr);
 if(canvas.width!==width||canvas.height!==height||gridDpr!==dpr){
  canvas.width=width;canvas.height=height;grid.width=width;grid.height=height;gridDpr=dpr;
  const g=grid.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.strokeStyle='#253638';g.lineWidth=1;
  g.beginPath();for(let i=0;i<=8;i++){g.moveTo(i*w/8,0);g.lineTo(i*w/8,h);}
  for(let i=1;i<4;i++){g.moveTo(0,i*h/4);g.lineTo(w,i*h/4);}g.stroke();
 }
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(grid,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
 if(snapshot){const {count,start}=visibleRange(),chosen=selectedChannels(),laneHeight=kind==='control'?h/chosen.length:h;
 for(const [slot,ch] of chosen.entries()){
  const dataChannel=channelIndex(ch);if(dataChannel<0)continue;
  const middle=kind==='control'?(slot+.5)*laneHeight:h/2;
  if(kind==='control'){ctx.strokeStyle='#253638';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,slot*laneHeight);ctx.lineTo(w,slot*laneHeight);ctx.stroke();
   ctx.font='10px -apple-system, sans-serif';ctx.fillStyle=signalColors[ch];ctx.fillText(signalNames[ch],6,slot*laneHeight+12);}
  ctx.strokeStyle=kind==='control'?signalColors[ch]:ch?'#ffb276':'#6ce0c1';ctx.lineWidth=1.3;ctx.beginPath();
  const y=value=>middle-Math.max(-1,Math.min(1,value*gain))*laneHeight*.40;
  for(let i=0;i<count;i++){
   const x=i*w/(count-1),at=dataChannel*snapshot.frames+start+i;
   if(snapshot.format==='minmax'){const low=snapshot.samples[at*2],high=snapshot.samples[at*2+1];if(!Number.isFinite(low)||!Number.isFinite(high))continue;
    if(kind==='control'&&low===high){ctx.moveTo(i*w/count,y(low));ctx.lineTo((i+1)*w/count,y(high));}
    else{ctx.moveTo(x,y(low));ctx.lineTo(x,y(high));}}
   else{const value=snapshot.samples[at];if(!Number.isFinite(value))continue;const current=y(value);
    if(!i||!Number.isFinite(snapshot.samples[at-1]))ctx.moveTo(x,current);
    else{if(kind==='control')ctx.lineTo(x,y(snapshot.samples[at-1]));ctx.lineTo(x,current);}}
  }
  ctx.stroke();
 }canvas.dataset.frames=String(snapshot.frames);canvas.dataset.sourceFrames=String(snapshot.sourceFrames);canvas.dataset.missingSourceFrames=String(snapshot.missingSourceFrames);canvas.dataset.format=snapshot.format;canvas.dataset.visibleChannels=chosen.join(',');canvas.dataset.renderedSequence=String(snapshot.sequence);canvas.dataset.renderedSourceEnd=String(snapshot.sourceEnd);canvas.dataset.visibleFrames=String(count);canvas.dataset.startFrame=String(start);}
 canvas.dataset.paints=String(Number(canvas.dataset.paints||0)+1);
}
const resizeObserver=new ResizeObserver(()=>{rect=canvas.getBoundingClientRect();gridDpr=0;invalidate()});resizeObserver.observe(canvas);
const freshnessTimer=setInterval(()=>{if(receivedAt&&performance.now()-receivedAt>1500)disconnected()},250);
invalidate();
addEventListener('pagehide',()=>{stopped=true;painter.close();clearTimeout(retryTimer);clearInterval(freshnessTimer);resizeObserver.disconnect();stream?.close();});
