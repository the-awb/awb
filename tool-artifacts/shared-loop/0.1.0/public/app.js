const $=id=>document.getElementById(id);let state=null,snapshot=null,lastAt=0;const canvas=$('wave'),ctx=canvas.getContext('2d');
async function control(action,value){try{const res=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,value})});const result=await res.json();if(!res.ok)throw new Error(result.error);$('error').hidden=true;}catch(e){$('error').textContent=e.message;$('error').hidden=false;}}
$('record').onclick=()=>control('record');$('play').onclick=()=>control('play',!(snapshot?.flags&2));$('overdub').onclick=()=>control('overdub',!(snapshot?.flags&4));$('clear').onclick=()=>control('clear');$('tone').onclick=()=>control('source',0);$('mic').onclick=()=>control('source',1);
for(const id of ['frequency','toneLevel','inputGain','outputGain','feedback']){const el=$(id),out=document.querySelector(`output[for="${id}"]`);el.oninput=()=>{out.value=id==='frequency'?`${el.value} Hz`:Number(el.value).toFixed(2);};el.onchange=()=>control(id,Number(el.value));}
let readyReported=false,lastShellReport=0;
const shell=globalThis.awbHost;
async function openScope(kind){try{if(shell)await shell.request('scope.open',{kind});else window.open(`/scope?kind=${kind}`,`shared-loop-${kind}`,'width=720,height=440');}catch(error){$('error').textContent=error.message;$('error').hidden=false;}}
$('micScope').onclick=()=>openScope('mic');$('outputScope').onclick=()=>openScope('output');$('controlScope').onclick=()=>openScope('control');
shell?.onCommand?.(command=>{if(command.type==='dispose')stream.close();});
function renderState(s){state=s;if(s.snapshot){snapshot=s.snapshot;lastAt=performance.now();}const f=snapshot?.flags||0,ready=!!(f&16),recording=!!(f&1),clearing=!!(f&8),live=s.connected;
 if(shell && snapshot && live && !readyReported){readyReported=true;shell.reportReady({mode:'hosted-looper'});}
 if(shell && snapshot && performance.now()-lastShellReport>500){lastShellReport=performance.now();shell.reportSessionState({mode:'hosted-looper',status:live?'ready':'disconnected',loopSeconds:snapshot.frames/snapshot.sampleRate});}
 $('micScope').disabled=!s.scopes?.available;$('outputScope').disabled=!s.scopes?.available;$('controlScope').disabled=!s.scopes?.available;
 $('scopeStatus').textContent=s.scopes?.available?'Input 1 · Output 1–2 · LFO + Noise array':s.scopes?.error||'Scopes unavailable';
 $('connection').textContent=live?'Connected to SC':'Disconnected';$('connection').classList.toggle('live',live);
 $('mode').textContent=clearing?'CLEARING':recording?'RECORDING':f&4?'OVERDUBBING':f&2?'PLAYING':ready?'STOPPED':'EMPTY';
 $('record').classList.toggle('active',recording);$('play').classList.toggle('active',!!(f&2));$('play').textContent=f&2?'Ⅱ Stop':'▶ Play';$('overdub').classList.toggle('active',!!(f&4));
 $('record').disabled=!live||recording||clearing;$('play').disabled=!live||!ready||recording||clearing;$('overdub').disabled=!live||!ready||recording||clearing;$('clear').disabled=!live||clearing;
 $('tone').classList.toggle('selected',s.config.source===0);$('mic').classList.toggle('selected',s.config.source===1);
 $('hint').textContent=clearing?'Clearing loop storage…':recording?'Recording one complete pass…':f&4?'Overdub is writing into the loop.':ready?'Change the input and overdub another layer.':'Record one pass to create your loop.';
 if(snapshot){const duration=snapshot.frames/snapshot.sampleRate;$('duration').textContent=`${duration.toFixed(2)} s / MONO`;$('end').textContent=`${duration.toFixed(1)} s`;$('position').textContent=`${(snapshot.position/snapshot.sampleRate).toFixed(2)} s`;$('frames').textContent=`Update ${snapshot.sequence}`;}
}
const stream=new EventSource('/events');stream.onmessage=e=>renderState(JSON.parse(e.data));stream.onerror=()=>{if(state)renderState({...state,connected:false,snapshot:null});};
function draw(){const rect=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height;ctx.clearRect(0,0,w,h);
 ctx.strokeStyle='#233235';ctx.lineWidth=1;for(let i=0;i<=8;i++){ctx.beginPath();ctx.moveTo(i*w/8,0);ctx.lineTo(i*w/8,h);ctx.stroke();}ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
 if(snapshot){const e=snapshot.envelope,n=e.length/2;ctx.fillStyle=snapshot.flags&1?'#d38175':snapshot.flags&4?'#b5df85':'#69cfb4';for(let i=0;i<n;i++){const x=i*w/n,y=h/2-e[i*2+1]*h*.44,bottom=h/2-e[i*2]*h*.44;ctx.fillRect(x,y,Math.max(1,w/n-.3),Math.max(1,bottom-y));}
 let position=snapshot.position;if(snapshot.flags&3 && !(snapshot.flags&8) && state?.connected){position+=Math.min((performance.now()-lastAt)/1000,.1)*snapshot.sampleRate;}const x=(position%snapshot.frames)/snapshot.frames*w;ctx.strokeStyle=snapshot.flags&1?'#ffb2a0':'#d5fff0';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.moveTo(x-4,0);ctx.lineTo(x+4,0);ctx.lineTo(x,6);ctx.fill();}
 requestAnimationFrame(draw);
}draw();setInterval(()=>{if(lastAt&&performance.now()-lastAt>1000&&state?.connected)renderState({...state,connected:false,snapshot:null});},500);
