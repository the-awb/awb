// Bounded view attachment gate. Rehearsal commands, then optional read-only
// observation of the existing audition. Never launches or retires an engine.
import {app,BrowserWindow} from 'electron';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import assert from 'node:assert/strict';
import {startNetwork,rehearsal} from '/Users/willy/awb/tool-artifacts/buffer-views/0.1.0/network-server.mjs';
import {requestableViews} from '/Users/willy/awb/tool-artifacts/buffer-views/0.1.0/network-model.mjs';
const root='/private/tmp/awb-gig-view-check';
let bridge,passed=0;const windows=new Set(),labels=[],errors=[];
app.on('window-all-closed',()=>{});
const check=(condition,label)=>{assert.ok(condition,label);passed++;labels.push(label);};
const js=(win,code)=>win.webContents.executeJavaScript('{'+code+'}');
async function wait(win,code){for(let i=0;i<100;i++){if(await js(win,code))return;await new Promise(r=>setTimeout(r,30));}throw Error('GUI timeout: '+code+'; DOM '+await js(win,"JSON.stringify({status:document.querySelector('#status')?.textContent,pending:document.querySelector('#pending')?.textContent,error:document.querySelector('#error')?.textContent,inputs:[...document.querySelectorAll('#matrix input')].map(x=>[x.dataset.route,x.value,x.nextElementSibling.textContent])})"));}
async function open(url){const win=new BrowserWindow({show:false,width:720,height:680,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});windows.add(win);win.on('closed',()=>windows.delete(win));win.webContents.on('console-message',(...args)=>{const [event,level,message]=args;if(event.level==='error'||event.level===3)errors.push(event.message);else if(level===3)errors.push(message);});win.webContents.on('render-process-gone',(_event,details)=>errors.push('Renderer exit: '+details.reason));await win.loadURL(url);await wait(win,"document.querySelector('#status')?.textContent==='REHEARSAL'||document.querySelector('#status')?.textContent==='SC AUDIO'||document.querySelector('#pending').textContent==='Unknown view'");return win;}
async function main(){app.setPath('userData',await mkdtemp(join(tmpdir(),'ubp-member-views-')));await app.whenReady();let applyCount=0,readCount=0,closeCount=0;
 try{
 const original=rehearsal();const adapter={kind:original.kind,connected:original.connected,apply:async c=>{applyCount++;await original.apply(c);},read:()=>{readCount++;return original.read();},clear:original.clear,close:async()=>{closeCount++;await original.close();}};
 bridge=await startNetwork({adapter});const initial=structuredClone(bridge.state().config),views=requestableViews(bridge.url),tapes=[];
 for(const descriptor of views.filter(v=>v.kind==='tape')){
  const win=await open(descriptor.url);tapes.push(win);
  check(await js(win,`document.body.dataset.panel===${JSON.stringify(descriptor.id)}&&window.bufferPanel.descriptor.cell===${JSON.stringify(descriptor.cell)}`),'requested '+descriptor.cell+' tape identity');
  check(await js(win,"document.querySelectorAll('canvas').length===1&&document.querySelectorAll('#classic-heads .classic-row').length===4&&document.querySelectorAll('[data-tape-cell]').length===1"),'only requested '+descriptor.cell+' tape is constructed');
  check(await js(win,"!document.querySelector('#all-tapes')&&!document.querySelector('#matrix')&&!document.querySelector('#master')&&!document.querySelector('#stop-audio')"),'member '+descriptor.cell+' omits unrelated views and host stop');
  await wait(win,"document.querySelector('#tape-wave').dataset.channels==='2'");
  check(await js(win,"document.querySelector('#tape-wave').dataset.channels==='2'&&document.querySelector('#performance').getBoundingClientRect().right<=innerWidth"),'member '+descriptor.cell+' stereo waveform and panel bounds');
 }
 check(bridge.viewConnectionCount()===1,'four panel clients share one observation stream');
 check(applyCount===1&&closeCount===0,'opening four member views performs no additional audio apply or close');
 assert.deepEqual(bridge.state().config,initial);passed++;labels.push('view opening preserves all instrument settings');
 const gig=tapes[0];gig.setContentSize(630,320);await new Promise(r=>setTimeout(r,60));
 check(await js(gig,"document.body.dataset.gig==='true'&&!document.querySelector('.panel-heading')&&!document.querySelector('header')&&!document.querySelector('footer')"),'gig view removes the header and footer');
 check(await js(gig,"const w=document.querySelector('#tape-wave').getBoundingClientRect();w.x===0&&w.y===0&&w.width===innerWidth&&w.height===innerHeight-26"),'waveform fills the 630 by 320 panel above a 26px transport strip');
 check(await js(gig,"const p=document.querySelector('#performance');const s=getComputedStyle(p);s.padding==='0px'&&s.margin==='0px'&&s.borderWidth==='0px'&&document.documentElement.scrollWidth===innerWidth&&document.documentElement.scrollHeight===innerHeight"),'gig panel has no padding, frame or scrolling');
 check(await js(gig,"const b=document.querySelector('.tape-transport').getBoundingClientRect();b.bottom===innerHeight&&b.height===26&&['tape-fade','tape-clear','tape-pause','tape-settings'].every(id=>{const e=document.querySelector('#'+id).getBoundingClientRect();return e.left>=0&&e.right<=innerWidth&&e.top>=b.top&&e.bottom<=b.bottom;})"),'Fade Clear Pause and settings fit the slim bottom strip');
 check(await js(gig,"const buttons=[...document.querySelectorAll('.tape-transport button:not(#tape-settings)')];const sizes=buttons.map(b=>b.getBoundingClientRect());Math.max(...sizes.map(r=>r.width))-Math.min(...sizes.map(r=>r.width))<1&&sizes.every(r=>r.height===25)&&sizes.slice(1).every((r,i)=>Math.abs(r.left-sizes[i].right-1)<1)"),'transport actions fill equally spaced equal-width spans');
 check(await js(gig,"const r=document.querySelector('.gig-timing').getBoundingClientRect();r.bottom===innerHeight-26&&['tape-seconds','tape-time-slider','tape-beats','tape-divisor','tape-triplet'].every(id=>{const e=document.querySelector('#'+id).getBoundingClientRect();return e.width>0&&e.left>=0&&e.right<=innerWidth&&e.top>=r.top&&e.bottom<=r.bottom;})"),'original seconds slider beats division and triplet controls share the tape timing row');
 check(await js(gig,"const rows=[...document.querySelectorAll('.classic-row')];rows.map(r=>r.dataset.path).join(',')==='L→R,L→L,R→R,R→L'&&rows.every(r=>Math.abs(r.getBoundingClientRect().height-(innerHeight-26)/4)<1)"),'four head rows span both stereo channels in Augustus order');
 check(await js(gig,"const y=f=>document.querySelector('[data-field='+f+']').getBoundingClientRect().y;y('dryLevel')<y('inputGain')&&y('feedback')<y('effectLevel')"),'Dry Input and Feedback FX placements follow the original GUI');
 check(await js(gig,"[...document.querySelectorAll('.classic-head')].every(h=>{const r=h.querySelector('.knob').getBoundingClientRect();const line=r.x+r.width/2+parseFloat(h.style.getPropertyValue('--marker-offset'));return r.left>=0&&r.right<=innerWidth&&Math.abs(line-Math.min(innerWidth-.5,Math.max(.5,Number(h.dataset.actualX)*innerWidth)))<1;})"),'edge heads remain reachable while their markers retain exact tape positions');
 check(await js(gig,"const timing=document.querySelector('.gig-timing').getBoundingClientRect();const side=[...document.querySelectorAll('.side-knobs .knob')].map(e=>e.getBoundingClientRect());[...document.querySelectorAll('.classic-head')].every(h=>{const r=h.getBoundingClientRect();return r.top>=0&&r.bottom<=timing.top&&side.every(s=>r.right<=s.left||r.left>=s.right||r.bottom<=s.top||r.top>=s.bottom);})"),'head controls clear the side knobs and timing row');
 check(await js(gig,"document.querySelector('#tape-extras').hidden&&document.querySelector('#tape-settings').getAttribute('aria-expanded')==='false'"),'extra controls start hidden');
 check(await js(gig,"['.classic-label','.classic-head output','.head-time','.gig-timing label','.gig-timing input[type=number]','.tape-transport button','.side-knobs .knob-label','.side-knobs output'].every(s=>[...document.querySelectorAll(s)].every(e=>parseFloat(getComputedStyle(e).fontSize)>=12))&&parseFloat(getComputedStyle(document.querySelector('#tape-scale')).fontSize)>=11"),'gig performance labels values and actions use readable larger text');
 await js(gig,"document.querySelector('#tape-settings').dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}))");
 check(await js(gig,"!document.querySelector('#tape-extras').hidden&&document.querySelector('#tape-settings').getAttribute('aria-expanded')==='true'"),'hover opens settings without a click');
 await js(gig,"document.querySelector('#tape-settings').dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));document.querySelector('#tape-extras').dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}))");await new Promise(r=>setTimeout(r,210));
 check(await js(gig,"!document.querySelector('#tape-extras').hidden"),'moving from settings into the overlay keeps controls available');
 await js(gig,"document.querySelector('#tape-extras').dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}))");await new Promise(r=>setTimeout(r,210));
 check(await js(gig,"document.querySelector('#tape-extras').hidden"),'hover settings dismiss after leaving');
 await js(gig,"document.querySelector('#tape-settings').click();document.querySelector('#tape-settings').dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}))");await new Promise(r=>setTimeout(r,210));
 check(await js(gig,"!document.querySelector('#tape-extras').hidden"),'click pins settings for touch and longer edits');
 check(await js(gig,"['tape-preset','timing-mode','tempo','fade-in','fade-out'].every(id=>document.querySelector('#tape-extras').contains(document.querySelector('#'+id)))&&document.querySelectorAll('#tape-extras a').length===2&&!document.querySelector('[role=dialog]')"),'presets timing fade durations and editor links are available in a nonmodal overlay');
 await writeFile(root+'/verification/gig-B1-settings.png',(await gig.webContents.capturePage()).toPNG());
 await js(gig,"const k=document.querySelector('#fade-out');k.value='3.4';k.dispatchEvent(new Event('change',{bubbles:true}));k.blur()");await wait(gig,"document.querySelector('#pending').textContent==='Ready'");
 check(bridge.state().config.cells[0].fadeOut===3.4,'overlay fade duration reaches the selected cell');
 await js(gig,"document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
 check(await js(gig,"document.querySelector('#tape-extras').hidden&&document.activeElement.id==='tape-settings'"),'Escape closes settings and returns keyboard focus');
 await js(gig,"const k=document.querySelector('#tape-time-slider');k.focus();k.value='1.25';k.dispatchEvent(new Event('input',{bubbles:true}))");await wait(gig,"document.querySelector('#tape-seconds').value==='1.25'&&document.querySelector('#pending').textContent==='Ready'");await new Promise(r=>setTimeout(r,80));
 check(bridge.state().config.cells[0].seconds===1.25&&bridge.state().config.cells[0].timingMode==='seconds','time slider applies during the gesture using free seconds');
 await js(gig,"const k=document.querySelector('#tape-time-slider');k.value='1.5';k.dispatchEvent(new Event('change',{bubbles:true}));k.blur()");await wait(gig,"document.querySelector('#tape-seconds').value==='1.5'");
 check(bridge.state().config.cells[0].seconds===1.5&&bridge.state().config.cells[1].seconds===initial.cells[1].seconds,'time slider final value is acknowledged without changing other cells');
 await js(gig,"const k=document.querySelector('#tape-divisor');k.value='8';k.dispatchEvent(new Event('change',{bubbles:true}));k.blur()");await wait(gig,"document.querySelector('#timing-mode').value==='beats'");
 check(bridge.state().config.cells[0].timingMode==='beats'&&bridge.state().config.cells[0].seconds===4,'division selects beat timing and moves the tape span');
 await js(gig,"document.querySelector('#tape-triplet').click()");await wait(gig,"document.querySelector('#tape-triplet').getAttribute('aria-pressed')==='true'");
 check(bridge.state().config.cells[0].triplet&&Math.abs(bridge.state().config.cells[0].seconds-8/3)<1e-9,'triplet changes the actual delay length');
 await js(gig,"document.querySelector('#tape-fade').click()");await wait(gig,"document.querySelector('#tape-fade').textContent==='Fade in'");
 check(!bridge.state().config.cells[0].fadeGate,'bottom Fade operates the selected cell gate');
 await js(gig,"document.querySelector('[data-tape-mode=hold]').click()");await wait(gig,"document.querySelector('[data-tape-mode=hold]').classList.contains('active')");
 check(bridge.state().config.cells[0].inputGain===0&&bridge.state().config.cells[0].feedback===.5,'bottom Hold preserves the four-head unity convention');
 const clearRev=bridge.state().revision;await js(gig,"document.querySelector('#tape-clear').click()");await wait(gig,"document.querySelector('#pending').textContent==='Ready'");
 check(bridge.state().revision===clearRev+1,'bottom Clear issues one acknowledged clear command');
 await writeFile(root+'/verification/gig-B1-630x320.png',(await gig.webContents.capturePage()).toPNG());
 gig.setContentSize(480,320);await new Promise(r=>setTimeout(r,60));
 check(await js(gig,"const r=document.querySelector('#tape-wave').getBoundingClientRect();r.width===480&&r.height===294&&document.documentElement.scrollWidth===480&&[...document.querySelectorAll('.tape-transport button,.gig-timing input,.gig-timing select,.gig-timing button')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})"),'gig timing and transport remain reachable at 480 by 320');
 check(await js(gig,"[...document.querySelectorAll('.tape-transport button:not(#tape-settings)')].every(e=>{const range=document.createRange();range.selectNodeContents(e);return range.getBoundingClientRect().width<=e.getBoundingClientRect().width;})"),'larger narrow-panel button captions fit their equal spans');
 check(await js(gig,"const top=document.querySelector('#tape-scale').getBoundingClientRect().top;['inputGain','effectLevel'].every(f=>document.querySelector('.side-knobs [data-field='+f+'] output').getBoundingClientRect().bottom<=top)"),'larger lower level values remain clear of the time scale');
 await writeFile(root+'/verification/gig-B1-480x320.png',(await gig.webContents.capturePage()).toPNG());
 const layoutRevision=bridge.state().revision;gig.setContentSize(1024,600);await new Promise(r=>setTimeout(r,60));
 check(await js(gig,"const r=document.querySelector('#tape-wave').getBoundingClientRect();r.width===1024&&r.height===574"),'gig tape expands with the host panel');
 check(bridge.state().revision===layoutRevision,'panel resizing does not change audio settings');
 gig.setContentSize(630,192);await new Promise(r=>setTimeout(r,60));
 check(await js(gig,"const wave=document.querySelector('#tape-wave').getBoundingClientRect();wave.width===630&&wave.height===166&&document.documentElement.scrollHeight===192"),'whole tape also fits a small 630 by 192 fixed host slot');
 check(await js(gig,"const t=document.querySelector('.gig-timing').getBoundingClientRect();[...document.querySelectorAll('.classic-head')].every(h=>{const r=h.getBoundingClientRect();return r.left>=0&&r.right<=630&&r.top>=0&&r.bottom<=t.top;})"),'compact head knobs time handles and values fit above the time row');
 await writeFile(root+'/verification/gig-B1-630x192.png',(await gig.webContents.capturePage()).toPNG());
 gig.setContentSize(1024,600);await new Promise(r=>setTimeout(r,60));
 await js(gig,"const host=document.createElement('div');host.id='fixture-host';host.style.cssText='position:absolute;left:13px;top:9px;width:560px;height:230px';host.append(document.querySelector('main'));document.body.append(host);dispatchEvent(new Event('resize'))");await new Promise(r=>setTimeout(r,60));
 check(await js(gig,"const p=document.querySelector('#performance').getBoundingClientRect();const w=document.querySelector('#tape-wave').getBoundingClientRect();p.x===13&&p.y===9&&p.width===560&&p.height===230&&w.width===560&&w.height===204"),'tape width and height follow an independent fixed container instead of the viewport');
 check(await js(gig,"const root=document.querySelector('#performance').getBoundingClientRect(),time=document.querySelector('.gig-timing').getBoundingClientRect();[...document.querySelectorAll('.classic-head')].every(h=>{const r=h.getBoundingClientRect();return r.left>=root.left&&r.right<=root.right&&r.top>=root.top&&r.bottom<=time.top;})&&document.querySelector('.tape-transport').getBoundingClientRect().bottom===root.bottom"),'head controls and bottom action strip follow the fixed host boundaries');
 check(bridge.state().revision===layoutRevision,'host container attachment and compact sizing preserve instrument state');
 await writeFile(root+'/verification/gig-B1-container.png',(await gig.webContents.capturePage()).toPNG());
 await js(gig,"document.body.append(document.querySelector('main'));document.querySelector('#fixture-host').remove();dispatchEvent(new Event('resize'))");


 const embedded=await open(views[0].url+'&embed=1');embedded.setContentSize(380,252);await new Promise(r=>setTimeout(r,100));
 check(await js(embedded,"document.body.dataset.embedded==='true'&&document.body.dataset.gig==='true'&&document.querySelector('#tape-wave').getBoundingClientRect().width===380"),'AWB embedded slot displays the compact gig tape');
 check(await js(embedded,"document.documentElement.scrollWidth===380&&document.documentElement.scrollHeight===252&&document.querySelector('.tape-transport').getBoundingClientRect().bottom<=252"),'compact gig panel fits the composite slot without scroll overflow');
 await js(embedded,"document.querySelector('#tape-settings').click()");check(await js(embedded,"!document.querySelector('#tape-extras').hidden"),'embedded additional settings remain reachable');
 await writeFile(root+'/verification/gig-embedded-380x252.png',(await embedded.webContents.capturePage()).toPNG());embedded.destroy();
 const duplicate=await open(views[0].url);
 await js(tapes[0],"const k=document.querySelector('#intake-knobs [data-field=inputGain] input');k.value='.23';k.dispatchEvent(new Event('change',{bubbles:true}));k.blur()");
 await js(tapes[2],"const k=document.querySelector('#return-knobs [data-field=feedback] input');k.value='.44';k.dispatchEvent(new Event('change',{bubbles:true}));k.blur()");
 await wait(duplicate,"document.querySelector('#intake-knobs [data-field=inputGain] output').textContent==='23%'");
 check(bridge.state().config.cells[0].inputGain===.23&&bridge.state().config.cells[2].feedback===.44,'simultaneous member edits reach their own cells in the shared backend');
 check(bridge.state().config.cells[1].inputGain===initial.cells[1].inputGain&&bridge.state().config.cells[3].feedback===initial.cells[3].feedback,'member edits preserve unrelated cells');
 check(await js(duplicate,"document.querySelector('#intake-knobs [data-field=inputGain] output').textContent==='23%'"),'second view of one member follows acknowledged settings');
 const routing=await open(views.find(v=>v.kind==='routing').url);
 check(await js(routing,"document.querySelectorAll('#matrix input').length===20&&document.querySelectorAll('canvas').length===0&&!document.querySelector('#classic-heads')"),'requested routing view constructs only routing amounts');
 await js(routing,"const k=document.querySelector('[data-route=\"clean:A1\"]');k.value='.31';k.dispatchEvent(new Event('change',{bubbles:true}));k.blur()");await wait(routing,"document.querySelector('[data-route=\"clean:A1\"]').nextElementSibling.textContent==='31%'");
 check(bridge.state().config.routes['clean:A1']===.31,'routing panel reaches the same instrument');
 for(const descriptor of views.filter(v=>v.kind==='heads')){
  const win=await open(descriptor.url);
  check(await js(win,`document.querySelector('#head-title').textContent.startsWith(${JSON.stringify(descriptor.cell)})&&document.querySelectorAll('#heads .head-row').length===4&&!document.querySelector('#performance')&&!document.querySelector('#matrix')`),'requested '+descriptor.cell+' head/send editor is independent');
  if(descriptor.cell==='A2'){
   await js(win,"const k=document.querySelector('#tap-sends input[data-head=h2][data-to=A1]');k.value='.37';k.dispatchEvent(new Event('change',{bubbles:true}));k.blur()");await wait(win,"document.querySelector('#tap-sends input[data-head=h2][data-to=A1]').nextElementSibling.textContent==='37%'");
   check(bridge.state().config.cells[1].heads[1].sends.A1===.37&&bridge.state().config.cells[0].heads[1].sends.A1===0,'member head send targets the requested cell and head');
  }
  win.destroy();
 }
 check(bridge.viewConnectionCount()===1,'additional duplicate, routing and head views keep one observation stream');
 const revision=bridge.state().revision;
 await js(tapes[0],"const k=document.querySelector('#intake-knobs [data-field=inputGain] input');k.value='.84';k.dispatchEvent(new Event('input',{bubbles:true}));window.bufferPanel.dispose();window.bufferPanel.dispose()");
 await new Promise(r=>setTimeout(r,80));
 check(bridge.state().revision===revision&&bridge.state().config.cells[0].inputGain===.23,'idempotent view detach cancels unsent gestures');
 check(await js(tapes[0],"document.querySelector('#status').textContent==='DETACHED'&&document.querySelector('#performance').inert"),'detached panel is visibly inactive');
 check(closeCount===0,'view detach leaves instrument ownership alive');
 const reads=readCount;for(const win of [...windows])win.destroy();await new Promise(r=>setTimeout(r,110));
 check(closeCount===0&&readCount>reads&&bridge.state().connected,'closing all views preserves the running backend and publisher');
 for(let i=0;i<100&&bridge.viewConnectionCount();i++)await new Promise(r=>setTimeout(r,20));
 check(bridge.viewConnectionCount()===0,'closing all panels releases the shared observation stream');
 const reopened=await open(views[0].url);await wait(reopened,"document.querySelector('#intake-knobs [data-field=inputGain] output').textContent==='23%'");
 check(bridge.state().revision===revision,'reopening a view attaches to retained settings without an apply');
 await writeFile(root+'/verification/panel-requested-B1.png',(await reopened.webContents.capturePage()).toPNG());
 reopened.setSize(480,720);await new Promise(r=>setTimeout(r,60));check(await js(reopened,"document.querySelector('#performance').getBoundingClientRect().right<=innerWidth&&document.querySelector('#tape-wave').clientWidth>100"),'individual tape fits a narrow host panel');
 await writeFile(root+'/verification/panel-requested-B1-narrow.png',(await reopened.webContents.capturePage()).toPNG());
 await js(reopened,'window.bufferPanel.dispose()');for(let i=0;i<100&&bridge.viewConnectionCount();i++)await new Promise(r=>setTimeout(r,20));
 check(bridge.viewConnectionCount()===0,'last-panel explicit detach releases its observation stream while the window remains open');
 const reattached=await open(views[0].url);await wait(reattached,"document.querySelector('#intake-knobs [data-field=inputGain] output').textContent==='23%'");
 check(bridge.viewConnectionCount()===1&&bridge.state().revision===revision,'new view reconnects after last-panel detach without creating an instrument');
 const invalid=await open(bridge.url+'/?view=tape%3Aunknown');check(await js(invalid,"document.querySelector('#pending').textContent==='Unknown view'&&document.querySelectorAll('canvas').length===0&&!window.bufferPanel"),'invalid view fails visibly without constructing a default cell');
 for(const win of [...windows])win.destroy();await bridge.stop();check(closeCount===1,'explicit instrument close retires the backend exactly once');bridge=null;
 const live=process.env.UBP_LIVE_VIEW_URL;
 if(live){
  const before=await(await fetch(live+'/api/state')).json();check(before.backend==='audio'&&before.connected,'existing private audition is audio-connected');
  const view=requestableViews(live).find(v=>v.id==='tape:A1'),win=await open(view.url);
  await wait(win,"document.querySelector('#status').textContent==='SC AUDIO'&&document.querySelector('#tape-wave').dataset.channels==='2'");
  check(await js(win,"document.body.dataset.panel==='tape:A1'&&document.querySelectorAll('canvas').length===1"),'requested A1 view displays real stereo engine data');
  await writeFile(root+'/verification/panel-requested-A1-live.png',(await win.webContents.capturePage()).toPNG());
  win.destroy();await new Promise(r=>setTimeout(r,110));const after=await(await fetch(live+'/api/state')).json();
  assert.deepEqual(after.config,before.config);passed++;labels.push('read-only live view leaves all audition controls untouched');
  check(after.connected&&after.revision===before.revision,'closing live panel preserves the existing instrument connection and revision');
  check(after.waveforms[2].channels.every((c,i)=>c.sequence>before.waveforms[2].channels[i].sequence),'real engine waveform publication continues after view close');
 }
 check(errors.length===0,'view renderers report no console errors');
 await writeFile(root+'/verification/gig-mode-gui.json',JSON.stringify({passed,failed:0,scope:'actual Electron member views and shared rehearsal commands; optional existing-engine observation only',liveObserved:Boolean(live),labels},null,2)+'\n');
 console.log(`GIG_MODE_RESULT passed=${passed} failed=0`);app.exit(0);
 }catch(error){console.error(error);if(bridge)console.error('BACKEND_DIAGNOSTIC '+JSON.stringify({revision:bridge.state().revision,routes:bridge.state().config.routes,applyCount,closeCount}));for(const win of [...windows])win.destroy();await bridge?.stop().catch(()=>{});await writeFile(root+'/verification/gig-mode-gui.json',JSON.stringify({passed,failed:1,error:error.message,labels},null,2)+'\n');app.exit(1);}
}
main().catch(error=>{console.error(error);app.exit(1);});
