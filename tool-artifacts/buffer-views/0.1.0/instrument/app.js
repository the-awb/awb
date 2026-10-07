if(new URLSearchParams(location.search).get('embed')==='1')document.body.dataset.embedded='true';
import {ids,colours,headPaths,loopFeedback,command,timeline,ageEnvelope,headSeconds,sendDestinations,panelViews,resolvePanelView} from '/network-model.mjs';
function fmt(value){return value>=10?value.toFixed(1):value>=1?value.toFixed(2):value.toFixed(3);}
function value(el,v){if(document.activeElement!==el)el.value=v;}
function draw(canvas,wave,t,colour,advance=0){
  const width=canvas.clientWidth,height=canvas.clientHeight||62,dpr=window.devicePixelRatio||1;if(canvas.width!==Math.round(width*dpr)||canvas.height!==height*dpr){canvas.width=width*dpr;canvas.height=height*dpr;}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.strokeStyle='#28333e';ctx.beginPath();for(let j=0;j<=4;j++){const x=j*width/4;ctx.moveTo(x,0);ctx.lineTo(x,height);}ctx.moveTo(0,height/2);ctx.lineTo(width,height/2);ctx.stroke();
  const channels=wave?.channels??[];canvas.dataset.channels=channels.length;canvas.dataset.binSeconds=(channels[0]?.binWidth??Math.ceil((channels[0]?.frames??1)/(channels[0]?.bins??512)))/(channels[0]?.sampleRate??44100);
  channels.forEach((channel,ch)=>{const centre=height*(ch+.5)/2;ctx.strokeStyle=colour;ctx.globalAlpha=ch===0?.7:.45;ctx.beginPath();for(let x=0;x<width;x++){const [lo,hi]=(x/width*t.horizon<advance?[0,0]:ageEnvelope(channel,x/width*t.horizon-advance));ctx.moveTo(x,centre-hi*height*.4);ctx.lineTo(x,centre-lo*height*.4);}ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#9aa9b8';ctx.font='9px system-ui';ctx.fillText(ch===0?'L':'R',3,ch===0?10:height/2+10);});
  if(t.horizon>t.period){ctx.setLineDash([3,3]);ctx.strokeStyle='#c5cfdb';ctx.beginPath();ctx.moveTo(t.period/t.horizon*width,0);ctx.lineTo(t.period/t.horizon*width,height);ctx.stroke();ctx.setLineDash([]);}
}
// Rotary controls remain ordinary range inputs, with keyboard and vertical drag access.
function rotary(label,aria,max,callback,amount){
 const wrap=document.createElement('label');wrap.className='knob-wrap';wrap.innerHTML=`<span class="knob-label">${label}</span><span class="knob"><input type="range" min="0" max="${max}" step=".01" aria-label="${aria}"></span><output></output>`;
 const input=wrap.querySelector('input');const paint=()=>{const ratio=Number(input.value)/max;wrap.querySelector('.knob').style.setProperty('--angle',(ratio*270-135)+'deg');wrap.querySelector('.knob').style.setProperty('--sweep',ratio*270+'deg');wrap.querySelector('output').textContent=Math.round(Number(input.value)*100)+'%';};
 amount(input,aria,callback);const oninput=input.oninput;input.oninput=()=>{paint();oninput();};let ride=null;
 input.onpointerdown=e=>{e.preventDefault();input.focus();input.setPointerCapture(e.pointerId);ride={y:e.clientY,value:Number(input.value)};};
 input.onpointermove=e=>{if(!ride)return;input.value=Math.min(max,Math.max(0,ride.value+(ride.y-e.clientY)/150*max));input.dispatchEvent(new Event('input',{bubbles:true}));};
 input.onpointerup=()=>{if(ride){ride=null;input.dispatchEvent(new Event('change',{bubbles:true}));}};input.onpointercancel=input.onpointerup;
 wrap.update=v=>{value(input,v);paint();};return wrap;
}
function mountTape(root,{getState,getCell,send,select,knob,selectable=true}){
 const $=s=>root.querySelector(s);let state=null,selected=getCell();
 const choices=selectable?ids:[selected];
 choices.forEach(id=>{const b=document.createElement('button');b.textContent=id;b.dataset.tapeCell=id;b.onclick=()=>select(id);$('#cell-selector').append(b);});
const tapeKnobs=new Map(),classicRows=new Map();
for(const [field,label,max,where] of [['inputGain','Input',2,'intake'],['dryLevel','Dry',1,'intake'],['effectLevel','FX',2,'return'],['feedback','FB',1.1,'return']]){
 const k=knob(label,'Tape '+label,max,v=>({action:'cell',cell:selected,field,value:v}));k.dataset.field=field;$('#'+where+'-knobs').append(k);tapeKnobs.set(field,k);
}
// Outer cross paths, inner direct paths; first two rows read L, last two read R.
[3,0,1,2].forEach((h,rowIndex)=>{
 const row=document.createElement('div');row.className='classic-row';row.dataset.path=headPaths[h].label;row.dataset.head='h'+(h+1);row.dataset.row=rowIndex;
 row.innerHTML=`<label class="classic-label"><input type="checkbox" aria-label="${headPaths[h].label} enabled">${headPaths[h].label}</label><div class="classic-head"><button class="head-time" aria-label="${headPaths[h].label} time">—</button></div>`;
 const id='h'+(h+1),k=knob('',headPaths[h].label+' amount',1,v=>({action:'head',cell:selected,head:id,patch:{amount:v}}));row.querySelector('.classic-head').append(k);row.knob=k;
 row.querySelector('input[type=checkbox]').onchange=e=>send({action:'head',cell:selected,head:id,patch:{enabled:e.target.checked}});
 const handle=row.querySelector('.head-time');let move=null;
 handle.onpointerdown=e=>{row.dataset.moving='true';handle.setPointerCapture(e.pointerId);select(selected,id);move={x:e.clientX,cell:selected};};
 handle.onpointermove=e=>{if(!move)return;const rect=$('.stereo-tape').getBoundingClientRect();row.querySelector('.classic-head').style.left=Math.max(1,Math.min(100,(e.clientX-rect.left)/rect.width*100))+'%';};
 handle.onpointerup=e=>{if(!move)return;const cell=state.config.cells.find(c=>c.id===move.cell),head=cell.heads[h],t=timeline(cell,state.waveforms[ids.indexOf(cell.id)]),rect=$('.stereo-tape').getBoundingClientRect();if(Math.abs(e.clientX-move.x)>3){const seconds=Math.max(.000125,Math.min(t.horizon,(e.clientX-rect.left)/rect.width*t.horizon));send({action:'head',cell:move.cell,head:id,patch:{value:head.unit==='fraction'?Math.max(.01,Math.min(1,seconds/t.period)):seconds}});}move=null;delete row.dataset.moving;};handle.onpointercancel=()=>{move=null;delete row.dataset.moving;render();};
 $('#classic-heads').append(row);classicRows.set(id,row);
});
$('#tape-preset').onchange=e=>{if(e.target.value!=='custom')send({action:'preset',cell:selected,value:e.target.value});};
for(const [selector,field] of [['tape-seconds','seconds'],['tape-beats','beats'],['tape-divisor','divisor'],['timing-mode','timingMode']])$('#'+selector).onchange=e=>send({action:'cell',cell:selected,field,value:field==='timingMode'?e.target.value:Number(e.target.value)});
$('#tempo').onchange=e=>send({action:'global',field:'tempo',value:Number(e.target.value)});
$('#tape-triplet').onclick=()=>send({action:'cell',cell:selected,field:'triplet',value:!state.config.cells.find(c=>c.id===selected).triplet});
$('[data-tape-mode]').parentElement.querySelectorAll('[data-tape-mode]').forEach(b=>b.onclick=()=>send({action:'mode',cell:selected,value:b.dataset.tapeMode}));
$('#tape-fade').onclick=()=>send({action:'cell',cell:selected,field:'fadeGate',value:!state.config.cells.find(c=>c.id===selected).fadeGate});
for(const [id,field] of [['fade-in','fadeIn'],['fade-out','fadeOut']])$('#'+id).onchange=e=>send({action:'cell',cell:selected,field,value:Number(e.target.value)});
$('#tape-clear').onclick=()=>send({action:'clear',cell:selected});$('#tape-pause').onclick=()=>send({action:'cell',cell:selected,field:'running',value:!state.config.cells.find(c=>c.id===selected).running});
function render(){
 state=getState();selected=getCell();if(!state)return;
 const i=ids.indexOf(selected),cell=state.config.cells[i],t=timeline(cell,state.waveforms[i]);root.style.setProperty('--cell',colours[i]);
 $('#cell-selector').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tapeCell===selected));
 $('#tape-summary').textContent=fmt(t.period)+'s span · '+(cell.running?'running':'paused')+' · 32s storage';
 for(const [field,k] of tapeKnobs)k.update(cell[field]);value($('#tape-preset'),cell.preset);value($('#tape-seconds'),cell.seconds);value($('#tape-beats'),cell.beats);value($('#tape-divisor'),cell.divisor);value($('#timing-mode'),cell.timingMode);value($('#tempo'),state.config.tempo);
 $('#tape-triplet').classList.toggle('active',cell.triplet);$('#tape-triplet').setAttribute('aria-pressed',String(cell.triplet));
 $('#tape-fade').textContent=cell.fadeGate?'Fade out':'Fade in';$('#tape-fade').setAttribute('aria-pressed',String(!cell.fadeGate));$('#tape-fade').classList.toggle('active',!cell.fadeGate);value($('#fade-in'),cell.fadeIn);value($('#fade-out'),cell.fadeOut);
 const clearing=Boolean(state.waveforms[i]?.flags&8);$('#tape-clear').textContent=clearing?'Clearing…':'Clear';$('#tape-clear').disabled=clearing;$('#tape-clear').classList.toggle('active',clearing);
 $('#tape-pause').textContent=cell.running?'Pause':'Run';const unity=loopFeedback(cell);const mode=cell.inputGain===1&&cell.feedback===0?'record':cell.inputGain===1&&cell.feedback===unity?'overdub':cell.inputGain===0&&cell.feedback===unity?'hold':cell.inputGain===0&&cell.feedback===0?'off':null;
 root.querySelectorAll('[data-tape-mode]').forEach(b=>b.classList.toggle('active',b.dataset.tapeMode===mode));
 $('#clock-note').textContent=cell.timingMode==='beats'?'Manual tempo · '+fmt(cell.seconds)+'s resolved':'Free time · division/triplet selects beat timing';
 draw($('#tape-wave'),state.waveforms[i],t,colours[i]);const height=$('.stereo-tape').clientHeight;
 t.taps.forEach(h=>{const row=classicRows.get(h.id),head=row.querySelector('.classic-head');row.style.top=Number(row.dataset.row)*height/4+'px';row.style.height=height/4+'px';row.querySelector('input[type=checkbox]').checked=h.enabled;head.classList.toggle('disabled',!h.enabled);if(row.dataset.moving!=='true')head.style.left=h.x*100+'%';row.knob.update(h.amount);const handle=row.querySelector('.head-time');handle.textContent=fmt(h.seconds)+'s';handle.dataset.seconds=h.seconds;});
 $('#tape-scale').innerHTML=Array.from({length:5},(_,j)=>`<span>${j===0?'now':fmt(t.horizon*j/4)+'s'}</span>`).join('');
}


 return {render,draw(advance=0){const state=getState();if(!state)return;const i=ids.indexOf(getCell()),cell=state.config.cells[i],wave=state.waveforms[i];draw($('#tape-wave'),wave,timeline(cell,wave),colours[i],advance);}};
}
function mountRouting(root,{getState,send,amount}){
 const $=s=>root.querySelector(s);
$('#matrix').innerHTML=`<table><thead><tr><th>From ↓ / to →</th>${[...ids,'Wet'].map(v=>`<th>${v}</th>`).join('')}</tr></thead><tbody>${['clean',...ids].map((from,i)=>`<tr><th>${from==='clean'?'Clean':from}</th>${[...ids,'monitor'].map((to,j)=>{const allowed=to==='monitor'?from!=='clean':i<=j;return allowed?`<td><label class="send-amount"><input class="route" type="range" min="0" max="1" step=".01" data-route="${from}:${to}" aria-label="${from} to ${to} amount"><output>0%</output></label></td>`:'<td class="unavailable" title="Route unavailable in this graph">—</td>';}).join('')}</tr>`).join('')}</tbody></table>`;
$('#matrix').querySelectorAll('input').forEach(input=>amount(input,'route:'+input.dataset.route,v=>({action:'route',id:input.dataset.route,value:v})));
$('#route-reset').onclick=async()=>{for(const id of Object.keys(getState().config.routes))if(getState().config.routes[id]>0)await send({action:'route',id,value:0});};

 return {render(){const state=getState();if(!state)return;
  $('#matrix').querySelectorAll('input').forEach(input=>{const gain=state.config.routes[input.dataset.route];value(input,gain);input.nextElementSibling.textContent=Math.round(gain*100)+'%';});
  $('#route-summary').textContent=Object.entries(state.config.routes).filter(([,v])=>v>0).map(([id,gain])=>id.replace(':',' → ').replace('clean','Clean').replace('monitor','Wet')+` (${Math.round(gain*100)}%)`).join(' · ')||'No routes open';
 }};
}
function mountHeads(root,{getState,getCell,getHead,send,select,amount}){
 const $=s=>root.querySelector(s),headRows=new Map();let state=null,selected=getCell(),selectedHead='h1',sendsCell=null;
 const choose=(cell,head)=>{selectedHead=head;select(cell,head);render();};
function buildTapSends(){
 const destinations=sendDestinations(selected),cell=selected;sendsCell=selected;
 $('#tap-sends-title').textContent=selected+' / individual tap sends';
 $('#tap-sends').innerHTML=`<table><thead><tr><th>Tap ↓ / to →</th>${destinations.map(to=>`<th>${to==='monitor'?'Wet':to}</th>`).join('')}</tr></thead><tbody>${[1,2,3,4].map(h=>`<tr><th>Head ${h}</th>${destinations.map(to=>`<td><label class="send-amount"><input type="range" min="0" max="1" step=".01" data-head="h${h}" data-to="${to}" aria-label="${cell} head ${h} to ${to} amount"><output>0%</output></label></td>`).join('')}</tr>`).join('')}</tbody></table>`;
 $('#tap-sends').querySelectorAll('input').forEach(input=>amount(input,`${cell}/${input.dataset.head}:${input.dataset.to}`,v=>({action:'headSend',cell,head:input.dataset.head,to:input.dataset.to,value:v})));
}
$('#heads').innerHTML='<div class="head-caption"><span>Head</span><span>On</span><span>Time</span><span>Unit</span><span>L / R output</span></div>';
for(let h=1;h<=4;h++){
  const id=`h${h}`,row=document.createElement('div');row.className='head-row';row.dataset.head=id;row.innerHTML=`<button class="head-id">${h}</button><input class="enabled" type="checkbox" aria-label="Head ${h} enabled"><input class="time" type="number" min=".01" max="32" step=".01" aria-label="Head ${h} delay"><select class="unit" aria-label="Head ${h} time unit"><option value="fraction">× span</option><option value="seconds">seconds</option></select><div class="gain"><input class="left" type="number" min="0" max="1" step=".05" aria-label="Head ${h} left output amount"><input class="right" type="number" min="0" max="1" step=".05" aria-label="Head ${h} right output amount"></div>`;
  $('#heads').append(row);headRows.set(id,row);row.querySelector('button').textContent=headPaths[h-1].label;row.querySelector('button').title='Head '+h+' · '+headPaths[h-1].label+' · 100% return × cell feedback';row.querySelector('button').onclick=()=>choose(selected,id);
  const patch=p=>send({action:'head',cell:selected,head:id,patch:p});row.querySelector('.enabled').onchange=e=>patch({enabled:e.target.checked});row.querySelector('.time').onchange=e=>patch({value:Number(e.target.value)});
  row.querySelector('.unit').onchange=e=>{const c=state.config.cells.find(c=>c.id===selected),head=c.heads[h-1],seconds=headSeconds(head,c.seconds);patch({unit:e.target.value,value:e.target.value==='seconds'?seconds:Math.max(.01,Math.min(1,seconds/c.seconds))});};
  ['left','right'].forEach(f=>{const input=row.querySelector('.'+f);input.onchange=e=>patch({[f]:Number(e.target.value)});});
}
$('#preset').onchange=e=>{if(e.target.value!=='custom')send({action:'preset',cell:selected,value:e.target.value});};

 function render(){state=getState();selected=getCell();selectedHead=getHead?.()??selectedHead;if(!state)return;
  if(sendsCell!==selected)buildTapSends();
  $('#head-title').textContent=selected+' / tape heads';const c=state.config.cells.find(c=>c.id===selected);value($('#preset'),c.preset);
  $('#tap-sends').querySelectorAll('input').forEach(input=>{const gain=c.heads.find(h=>h.id===input.dataset.head).sends[input.dataset.to];value(input,gain);input.nextElementSibling.textContent=Math.round(gain*100)+'%';});
  c.heads.forEach(h=>{const row=headRows.get(h.id);row.querySelector('button').title=headPaths[Number(h.id.slice(1))-1].label+' · '+Math.round(h.amount*100)+'% return × cell feedback';row.classList.toggle('selected',h.id===selectedHead);row.querySelector('.enabled').checked=h.enabled;['value','unit','left','right'].forEach(f=>value(row.querySelector('.'+(f==='value'?'time':f)),h[f]));row.querySelector('.time').max=h.unit==='fraction'?1:32;row.querySelector('.time').min=h.unit==='fraction'?.01:.000125;});
 }
 return {render};
}

function startWorkspace(){
const $=s=>document.querySelector(s);let state=null,selected='B1',selectedHead='h1',tail=Promise.resolve(),pending=0,dragging=null;
const observed=new Map();
const rows=new Map();const rides=new Map();
// Bound continuous gestures to 20 updates/sec per control, preserving the last value.
function amount(input,key,payload){
 const flush=()=>{const item=rides.get(key);if(item){clearTimeout(item.timer);rides.delete(key);send(item.payload);}};
 input.oninput=()=>{const next=payload(Number(input.value));if(input.nextElementSibling?.tagName==='OUTPUT')input.nextElementSibling.textContent=Math.round(Number(input.value)*100)+'%';const item=rides.get(key);if(item)item.payload=next;else rides.set(key,{payload:next,timer:setTimeout(flush,50)});};
 input.onchange=()=>{const item=rides.get(key);if(item){item.payload=payload(Number(input.value));flush();}else send(payload(Number(input.value)));};
}
const knob=(...args)=>rotary(...args,amount);
const context={getState:()=>state,getCell:()=>selected,getHead:()=>selectedHead,send,select,knob,amount};
const tapeView=mountTape($('#performance'),context),routeView=mountRouting($('.routing'),context),headView=mountHeads($('.head-editor'),context);
document.body.dataset.pane='performance';
$('.view-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{document.body.dataset.pane=b.dataset.pane;$('.view-tabs').querySelectorAll('button').forEach(v=>v.classList.toggle('active',v===b));render();});
const panels=document.createElement('details');panels.className='panel-list';
const caption=document.createElement('summary');caption.textContent='Open panel';panels.append(caption);
const links=document.createElement('div');for(const view of panelViews){const link=document.createElement('a');link.href=view.path;link.textContent=view.label;link.target='_blank';link.rel='noopener';link.dataset.view=view.id;links.append(link);}panels.append(links);$('.view-tabs').append(panels);

function send(payload){pending++;$('#pending').textContent='Applying…';const job=tail.catch(()=>{}).then(async()=>{
  // Validate against the newest acknowledged state, without assuming earlier edits won.
  command(state.config,payload);
  const res=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const next=await res.json();if(!res.ok)throw new Error(next.error);receive(next);$('#error').textContent='';
 });tail=job;job.catch(e=>{$('#error').textContent=e.message;}).finally(()=>{pending--;$('#pending').textContent=pending?'Applying…':'Ready';render();});return job;}
function receive(next){if(!state&&next.backend==='audio')selected=next.config.cells.find(c=>next.config.routes['clean:'+c.id]>0)?.id??selected;if(!state||next.revision>=state.revision){state=next;next.waveforms.forEach((w,i)=>{const key=w?.channels?.map(c=>c.generation+":"+c.sequence).join("/");if(observed.get(i)?.key!==key)observed.set(i,{key,at:performance.now()});});render();}}
function select(cell,head=selectedHead){selected=cell;selectedHead=head;render();}
ids.forEach((id,i)=>{
  const el=document.createElement('article');el.className='cell';el.dataset.cell=id;el.style.setProperty('--cell',colours[i]);el.innerHTML=`<div class="cell-top"><button class="cell-name">${id}</button><span class="role">${['long / paired heads','medium / staggered heads','short / feedback swell','long / paired heads'][i]}</span><label>Head span <input class="seconds" aria-label="${id} head span seconds" type="number" min=".01" max="32" step=".01">s</label><span class="transport">${['record','overdub','hold','off'].map(m=>`<button data-mode="${m}">${m}</button>`).join('')}<button class="pause" title="Pause tape and silence its heads">Ⅱ</button><button class="clear">Clear</button></span></div><div class="timeline"><canvas class="wave"></canvas><div class="tap-lanes">${Array.from({length:4},(_,h)=>`<button class="tap" data-head="h${h+1}" aria-label="${id} head ${h+1}">${h+1}</button>`).join('')}</div><div class="scale"></div><div class="time-info"></div></div><div class="cell-bottom">${['inputGain','feedback'].map(f=>`<label>${f==='inputGain'?'Input':'Feedback'}<input type="range" data-field="${f}" aria-label="${id} ${f}" min="0" max="${f==='inputGain'?2:1.1}" step=".01"><output></output></label>`).join('')}<span class="state">stereo · 32s reserve</span></div>`;
  $('#cells').append(el);rows.set(id,el);el.querySelector('.cell-name').onclick=()=>select(id);
  el.querySelector('.seconds').onchange=e=>send({action:'cell',cell:id,field:'seconds',value:Number(e.target.value)});
  el.querySelectorAll('[data-field]').forEach(input=>amount(input,`${id}:${input.dataset.field}`,v=>({action:'cell',cell:id,field:input.dataset.field,value:v})));
  el.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>send({action:'mode',cell:id,value:b.dataset.mode}));
  el.querySelector('.pause').onclick=()=>send({action:'cell',cell:id,field:'running',value:!state.config.cells[i].running});el.querySelector('.clear').onclick=()=>send({action:'clear',cell:id});
  el.querySelectorAll('.tap').forEach(tap=>{
    tap.onpointerdown=e=>{select(id,tap.dataset.head);tap.setPointerCapture(e.pointerId);dragging={id,head:tap.dataset.head,start:e.clientX,x:e.clientX,moved:false};};
    tap.onpointermove=e=>{if(!dragging||dragging.id!==id||dragging.head!==tap.dataset.head)return;dragging.x=e.clientX;dragging.moved=Math.abs(e.clientX-dragging.start)>3;if(dragging.moved){const rect=el.querySelector('.tap-lanes').getBoundingClientRect();tap.style.left=`${Math.max(1,Math.min(100,(e.clientX-rect.left)/rect.width*100))}%`;}};
    tap.onpointerup=e=>{if(!dragging)return;const d=dragging;dragging=null;if(d.moved){const cell=state.config.cells[i],t=timeline(cell,state.waveforms[i]),h=cell.heads.find(h=>h.id===d.head),rect=el.querySelector('.tap-lanes').getBoundingClientRect(),seconds=Math.max(.000125,Math.min(t.horizon,(d.x-rect.left)/rect.width*t.horizon));send({action:'head',cell:id,head:d.head,patch:{value:h.unit==='fraction'?Math.max(.01,Math.min(1,seconds/t.period)):seconds}});}else render();};
    tap.onpointercancel=()=>{dragging=null;render();};
  });
});
['globalInput','master'].forEach(field=>amount($('#'+field),'global:'+field,v=>({action:'global',field,value:v})));$('#source').onchange=e=>send({action:'global',field:'source',value:e.target.value});$('#inputChannel').onchange=e=>send({action:'global',field:'inputChannel',value:Number(e.target.value)-1});
$('#stop-audio').onclick=async()=>{const res=await fetch('/api/stop',{method:'POST'});if(!res.ok)$('#error').textContent='Stop is managed by the test host.';};
function render(){if(!state)return;
  tapeView.render();routeView.render();headView.render();renderAllTapes();
  $('#stop-audio').hidden=state.backend!=='audio';
  $('#status').textContent=state.connected?(state.backend==='rehearsal'?'REHEARSAL':'SC AUDIO'):'DISCONNECTED';
  $('#notice').textContent=state.backend==='rehearsal'?'Interface rehearsal · no audio engine. Waveforms are illustrative; timing and routing controls use the same validated graph model.':'Live SuperCollider buffers · waveform summaries follow the write pointer. Hardware input and test tone are selectable. Raise Master to hear the stereo mix.';
  if(state.error)$('#error').textContent=state.error;
  value($('#inputChannel'),state.config.inputChannel+1);$('#input-channel-label').hidden=state.config.source!=='cello';
  ['source','globalInput','master'].forEach(f=>{value($('#'+f),state.config[f]);if($('#'+f+'-value'))$('#'+f+'-value').textContent=Math.round(state.config[f]*100)+'%';});
  state.config.cells.forEach((c,i)=>{const el=rows.get(c.id),wave=state.waveforms[i],t=timeline(c,wave);el.classList.toggle('selected',c.id===selected);value(el.querySelector('.seconds'),c.seconds);
    el.querySelectorAll('[data-field]').forEach(input=>{value(input,c[input.dataset.field]);input.nextElementSibling.textContent=Math.round(c[input.dataset.field]*100)+'%';});
    const unity=loopFeedback(c),mode=c.inputGain===1&&c.feedback===0?'record':c.inputGain===1&&c.feedback===unity?'overdub':c.inputGain===0&&c.feedback===unity?'hold':c.inputGain===0&&c.feedback===0?'off':null;
    el.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));el.querySelector('.pause').textContent=c.running?'Ⅱ':'▶';
    el.querySelector('.scale').innerHTML=Array.from({length:5},(_,j)=>`<span>${j===0?'now':fmt(t.horizon*j/4)+'s'}</span>`).join('');
    el.querySelector('.time-info').textContent=`${fmt(t.period)}s ${t.observed&&state.backend==='audio'?'head span':'head span'}${Math.abs(t.period-c.seconds)>.001?' → '+fmt(c.seconds)+'s target':''} · ${c.running?'writing / running':'paused'} · heads ${c.heads.filter(h=>h.enabled).length}/4`;
    t.taps.forEach(h=>{const tap=el.querySelector(`[data-head="${h.id}"]`);if(!dragging||dragging.id!==c.id||dragging.head!==h.id)tap.style.left=`${h.x*100}%`;tap.classList.toggle('disabled',!h.enabled);tap.classList.toggle('focus',selected===c.id&&selectedHead===h.id);const index=Number(h.id.slice(1))-1,path=headPaths[index],overlap=t.taps.slice(0,index).some(other=>headPaths[Number(other.id.slice(1))-1].returnChannel===path.returnChannel&&Math.abs(other.x-h.x)<.07);tap.style.top=(path.returnChannel===0?(overlap?20:3):(overlap?49:33))+'px';tap.textContent=`${h.id.slice(1)} ${path.label}`;tap.title=`${h.id}: ${path.label} · ${fmt(h.seconds)}s behind input · ${Math.round(h.amount*100)}% return × cell feedback${h.enabled?'':' · disabled'}`;tap.dataset.seconds=h.seconds;});
    draw(el.querySelector('canvas'),wave,t,colours[i]);
  });

}
const allTapes=new Map();
ids.forEach((id,i)=>{
 const el=document.createElement('article');el.className='all-tape';el.dataset.tape=id;el.style.setProperty('--cell',colours[i]);
 el.innerHTML=`<div class="all-top"><button class="detail" title="Open this tape's detailed view">${id}</button><label>Time <input class="all-seconds" aria-label="${id} all-view seconds" type="number" min=".01" max="32" step=".01">s</label><select class="all-preset" aria-label="${id} all-view preset">${['AB','A','B','quad','custom'].map(v=>`<option>${v}</option>`).join('')}</select><span class="all-state"></span></div><div class="tape-body"><div class="side-knobs all-intake"></div><div class="stereo-tape"><canvas class="all-wave"></canvas><div class="all-heads"></div></div><div class="side-knobs all-return"></div></div><div class="all-scale"></div><div class="all-transport">${['record','overdub','hold','off'].map(v=>`<button data-all-mode="${v}">${v}</button>`).join('')}<button class="all-pause">Pause</button><button class="all-fade" aria-pressed="false">Fade out</button><button class="all-clear">Clear</button></div><div class="all-fade-times"><label>Fade in <input class="all-in" type="number" aria-label="${id} all-view fade in seconds" min=".01" max="30" step=".1">s</label><label>Out <input class="all-out" type="number" aria-label="${id} all-view fade out seconds" min=".01" max="30" step=".1">s</label></div>`;
 $('#all-tapes').append(el);const knobs=new Map(),heads=new Map();
 const cell=()=>state.config.cells[i];
 el.querySelector('.detail').onclick=()=>{select(id);document.body.dataset.pane='performance';$('.view-tabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.pane==='performance'));render();};
 el.querySelector('.all-seconds').onchange=e=>send({action:'cell',cell:id,field:'seconds',value:Number(e.target.value)});
 el.querySelector('.all-preset').onchange=e=>{if(e.target.value!=='custom')send({action:'preset',cell:id,value:e.target.value});};
 for(const [field,label,max,where] of [['inputGain','Input',2,'intake'],['dryLevel','Dry',1,'intake'],['effectLevel','FX',2,'return'],['feedback','FB',1.1,'return']]){
  const k=knob(label,id+' '+label,max,v=>({action:'cell',cell:id,field,value:v}));k.dataset.field=field;el.querySelector('.all-'+where).append(k);knobs.set(field,k);
 }
 [3,0,1,2].forEach((h,j)=>{
  const hid='h'+(h+1),row=document.createElement('div');row.className='classic-row';row.dataset.head=hid;row.dataset.path=headPaths[h].label;
  row.innerHTML=`<label class="classic-label"><input type="checkbox" aria-label="${id} ${headPaths[h].label} enabled">${headPaths[h].label}</label><div class="classic-head"><button class="head-time" aria-label="${id} ${headPaths[h].label} time">—</button></div>`;
  el.querySelector('.all-heads').append(row);const k=knob('',id+' '+headPaths[h].label+' amount',1,v=>({action:'head',cell:id,head:hid,patch:{amount:v}}));row.querySelector('.classic-head').append(k);
  row.querySelector('input[type=checkbox]').onchange=e=>send({action:'head',cell:id,head:hid,patch:{enabled:e.target.checked}});
  const handle=row.querySelector('.head-time');let move=null;
  handle.onpointerdown=e=>{handle.setPointerCapture(e.pointerId);move={x:e.clientX};row.dataset.moving='true';};
  handle.onpointermove=e=>{if(!move)return;const rect=el.querySelector('.stereo-tape').getBoundingClientRect();row.querySelector('.classic-head').style.left=Math.max(0,Math.min(100,(e.clientX-rect.left)/rect.width*100))+'%';};
  handle.onpointerup=e=>{if(!move)return;if(Math.abs(e.clientX-move.x)>3){const t=timeline(cell(),state.waveforms[i]),rect=el.querySelector('.stereo-tape').getBoundingClientRect(),head=cell().heads[h],seconds=Math.max(.000125,Math.min(t.horizon,(e.clientX-rect.left)/rect.width*t.horizon));send({action:'head',cell:id,head:hid,patch:{value:head.unit==='fraction'?Math.max(.01,Math.min(1,seconds/t.period)):seconds}});}move=null;delete row.dataset.moving;render();};
  handle.onpointercancel=()=>{move=null;delete row.dataset.moving;render();};heads.set(hid,{row,k,j});
 });
 el.querySelectorAll('[data-all-mode]').forEach(b=>b.onclick=()=>send({action:'mode',cell:id,value:b.dataset.allMode}));
 el.querySelector('.all-pause').onclick=()=>send({action:'cell',cell:id,field:'running',value:!cell().running});
 el.querySelector('.all-fade').onclick=()=>send({action:'cell',cell:id,field:'fadeGate',value:!cell().fadeGate});
 el.querySelector('.all-clear').onclick=()=>send({action:'clear',cell:id});
 for(const [selector,field] of [['all-in','fadeIn'],['all-out','fadeOut']])el.querySelector('.'+selector).onchange=e=>send({action:'cell',cell:id,field,value:Number(e.target.value)});
 allTapes.set(id,{el,knobs,heads});
});
function renderAllTapes(){
 if(!state||document.body.dataset.pane!=='all')return;
 state.config.cells.forEach((cell,i)=>{
  const {el,knobs,heads}=allTapes.get(cell.id),wave=state.waveforms[i],t=timeline(cell,wave),clearing=Boolean(wave?.flags&8);
  value(el.querySelector('.all-seconds'),cell.seconds);value(el.querySelector('.all-preset'),cell.preset);knobs.forEach((k,f)=>k.update(cell[f]));
  el.querySelector('.all-state').textContent=clearing?'clearing':cell.running?'running':'paused';el.querySelector('.all-pause').textContent=cell.running?'Pause':'Run';
  const fade=el.querySelector('.all-fade');fade.textContent=cell.fadeGate?'Fade out':'Fade in';fade.setAttribute('aria-pressed',String(!cell.fadeGate));fade.classList.toggle('active',!cell.fadeGate);
  const clear=el.querySelector('.all-clear');clear.textContent=clearing?'Clearing…':'Clear';clear.disabled=clearing;value(el.querySelector('.all-in'),cell.fadeIn);value(el.querySelector('.all-out'),cell.fadeOut);
  const unity=loopFeedback(cell),mode=cell.inputGain===1&&cell.feedback===0?'record':cell.inputGain===1&&cell.feedback===unity?'overdub':cell.inputGain===0&&cell.feedback===unity?'hold':cell.inputGain===0&&cell.feedback===0?'off':null;
  el.querySelectorAll('[data-all-mode]').forEach(b=>b.classList.toggle('active',b.dataset.allMode===mode));
  el.querySelector('.all-scale').textContent='now → '+fmt(t.horizon)+'s';const height=el.querySelector('.stereo-tape').clientHeight;
  t.taps.forEach(h=>{const {row,k,j}=heads.get(h.id),head=row.querySelector('.classic-head');row.style.top=j*height/4+'px';row.style.height=height/4+'px';row.querySelector('input[type=checkbox]').checked=h.enabled;head.classList.toggle('disabled',!h.enabled);if(!row.dataset.moving)head.style.left=h.x*100+'%';k.update(h.amount);row.querySelector('.head-time').textContent=fmt(h.seconds)+'s';});
  draw(el.querySelector('canvas'),wave,t,colours[i]);
 });
}

const events=new EventSource('/events');events.onmessage=e=>receive(JSON.parse(e.data));events.onerror=()=>{$('#status').textContent='DISCONNECTED';$('#error').textContent='Connection lost. Controls wait for the instrument bridge.';};window.addEventListener('resize',render);

// Move captured content smoothly between publications, without inventing samples.
function animateTape(){
 if(state&&document.body.dataset.pane==='all'&&!document.hidden){state.config.cells.forEach((cell,i)=>{const wave=state.waveforms[i],elapsed=Math.min(.1,Math.max(0,(performance.now()-(observed.get(i)?.at??performance.now()))/1000));draw(allTapes.get(cell.id).el.querySelector('canvas'),wave,timeline(cell,wave),colours[i],wave?.flags&2?elapsed:0);});}
 if(state&&document.body.dataset.pane==='performance'&&!document.hidden){
  const i=ids.indexOf(selected),wave=state.waveforms[i],cell=state.config.cells[i];
  const elapsed=Math.min(.1,Math.max(0,(performance.now()-(observed.get(i)?.at??performance.now()))/1000));
  tapeView.draw(wave?.flags&2?elapsed:0);
 }
 requestAnimationFrame(animateTape);
}
requestAnimationFrame(animateTape);

window.addEventListener('pagehide',()=>{events.close();for(const item of rides.values())clearTimeout(item.timer);rides.clear();});

}

function startPanel(descriptor){
 const $=s=>document.querySelector(s);let state=null,tail=Promise.resolve(),pending=0,disposed=false,frame=0,observed={key:null,at:performance.now()};const rides=new Map();
 document.body.dataset.panel=descriptor.id;document.body.dataset.pane=descriptor.kind==='tape'?'performance':descriptor.kind;
 document.title=descriptor.label+' · Buffer';
 const root=$(descriptor.kind==='tape'?'#performance':descriptor.kind==='heads'?'.head-editor':'.routing');
 $('main').replaceChildren(root);$('header').remove();$('.view-tabs').remove();$('#notice').remove();
 const heading=document.createElement('div');heading.className='panel-heading';heading.innerHTML='<strong></strong><span id="status">Connecting…</span>';
 heading.querySelector('strong').textContent=descriptor.label;document.body.prepend(heading);
 $('footer').firstElementChild.textContent='Shared instrument';root.inert=true;
 const receive=next=>{if(disposed||state&&next.revision<state.revision)return;state=next;const wave=next.waveforms[ids.indexOf(descriptor.cell)],key=wave?.channels?.map(c=>c.generation+':'+c.sequence).join('/');if(key!==observed.key)observed={key,at:performance.now()};render();};
 const send=payload=>{
  if(disposed||!state?.connected)return Promise.resolve();pending++;$('#pending').textContent='Applying…';
  const job=tail.catch(()=>{}).then(async()=>{if(disposed)return;command(state.config,payload);const res=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const next=await res.json();if(!res.ok)throw Error(next.error);receive(next);if(!disposed)$('#error').textContent='';});
  tail=job;job.catch(e=>{if(!disposed)$('#error').textContent=e.message;}).finally(()=>{pending--;if(!disposed){$('#pending').textContent=pending?'Applying…':'Ready';render();}});return job;
 };
 // Coalesce live drags; detachment discards unsent gestures and never stops audio.
 const amount=(input,key,payload)=>{
  const flush=()=>{const item=rides.get(key);if(item){clearTimeout(item.timer);rides.delete(key);send(item.payload);}};
  input.oninput=()=>{const next=payload(Number(input.value));if(input.nextElementSibling?.tagName==='OUTPUT')input.nextElementSibling.textContent=Math.round(Number(input.value)*100)+'%';const item=rides.get(key);if(item)item.payload=next;else rides.set(key,{payload:next,timer:setTimeout(flush,50)});};
  input.onchange=()=>{const item=rides.get(key);if(item){item.payload=payload(Number(input.value));flush();}else send(payload(Number(input.value)));};
 };
 const context={getState:()=>state,getCell:()=>descriptor.cell,send,select:()=>{},amount,knob:(...args)=>rotary(...args,amount),selectable:false};
 const view=descriptor.kind==='tape'?mountTape(root,context):descriptor.kind==='heads'?mountHeads(root,context):mountRouting(root,context);
 function render(){if(disposed||!state)return;root.inert=!state.connected;if(state.connected&&$('#error').textContent.startsWith('Connection lost.'))$('#error').textContent='';$('#status').textContent=state.connected?(state.backend==='audio'?'SC AUDIO':'REHEARSAL'):'DISCONNECTED';if(state.error)$('#error').textContent=state.error;view.render();}
 const feed=connectPanelFeed(receive,()=>{if(disposed)return;root.inert=true;$('#status').textContent='DISCONNECTED';$('#error').textContent='Connection lost. Waiting for the instrument bridge.';});
 function animate(){if(disposed)return;if(state&&descriptor.kind==='tape'&&!document.hidden){const wave=state.waveforms[ids.indexOf(descriptor.cell)],elapsed=Math.min(.1,Math.max(0,(performance.now()-observed.at)/1000));view.draw(wave?.flags&2?elapsed:0);}frame=requestAnimationFrame(animate);}
 const dispose=()=>{if(disposed)return;disposed=true;feed.close();cancelAnimationFrame(frame);for(const item of rides.values())clearTimeout(item.timer);rides.clear();window.removeEventListener('resize',render);window.removeEventListener('pagehide',dispose);root.inert=true;$('#status').textContent='DETACHED';};
 window.bufferPanel=Object.freeze({descriptor,dispose});window.addEventListener('resize',render);window.addEventListener('pagehide',dispose);frame=requestAnimationFrame(animate);
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
}

// One stream per instrument origin for all requested panels. HTTP/1 browsers
// have only six concurrent connections; per-panel streams would block controls.
function startPanelBroker(){
 const ports=new Set();let events=null,latest=null;
 const publish=message=>{for(const port of ports)port.postMessage(message);};
 const open=()=>{if(events)return;events=new EventSource('/events');events.onmessage=e=>{latest=JSON.parse(e.data);publish({type:'state',state:latest});};events.onerror=()=>publish({type:'connection-error'});};
 self.onconnect=event=>{
  const port=event.ports[0];ports.add(port);port.onmessage=event=>{if(event.data?.type!=='detach')return;ports.delete(port);port.close();if(!ports.size){events?.close();events=null;latest=null;}};
  port.start();if(latest)port.postMessage({type:'state',state:latest});open();
 };
}
function connectPanelFeed(receive,onError){
 const worker=new SharedWorker('/app.js?broker=1',{type:'module',name:'buffer-member-views-v1'});const port=worker.port;let closed=false;
 port.onmessage=event=>{if(closed)return;if(event.data.type==='state')receive(event.data.state);else if(event.data.type==='connection-error')onError();};
 worker.onerror=onError;port.start();
 return {close(){if(closed)return;closed=true;port.postMessage({type:'detach'});port.close();worker.onerror=null;}};
}
if(typeof document==='undefined')startPanelBroker();else{
const requested=new URLSearchParams(location.search).get('view');
if(requested===null)startWorkspace();else{
 try{startPanel(resolvePanelView(requested));}catch(error){document.querySelector('main').replaceChildren();document.querySelector('header').remove();document.querySelector('.view-tabs').remove();document.querySelector('#notice').remove();document.querySelector('#error').textContent=error.message;document.querySelector('#pending').textContent='Unknown view';}
}

}
