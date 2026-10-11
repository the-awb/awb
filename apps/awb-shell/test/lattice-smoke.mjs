import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';

// Full NodeShell + managed private sclang. Audio boot is deliberately excluded.
export async function runLatticeSmoke({launchFromHome,closeToolView,windows,registry,nativeScHost,toolRuntimes,homeWindow,screenshot}) {
  const until=async(fn,label)=>{const end=Date.now()+35000;while(Date.now()<end){if(await fn())return;await delay(35);}throw Error('Lattice shell timeout: '+label);};
  const homeJS=code=>homeWindow.webContents.executeJavaScript(code,true);
  await until(()=>homeJS(`Boolean(document.querySelector('[data-tool="lattice-instrument"]'))`),'Home launch button');
  const point=await homeJS(`(()=>{const button=document.querySelector('[data-tool="lattice-instrument"]');button.scrollIntoView({block:'center'});window.__launchButton=button;const b=button.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)}})()`);
  homeWindow.webContents.sendInputEvent({type:'mouseMove',...point});
  homeWindow.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});
  homeWindow.webContents.send('awb:command',{type:'shell-registry-changed'});
  await delay(80);
  assert.equal(await homeJS(`window.__launchButton===document.querySelector('[data-tool="lattice-instrument"]')`),true);
  homeWindow.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1});
  await until(()=>registry.list().some(v=>v.toolID==='lattice-instrument'),'first Home click creates view');
  const launch={viewID:registry.list().find(v=>v.toolID==='lattice-instrument').viewID};
  await until(()=>windows.has(launch.viewID)&&registry.get(launch.viewID)?.lifecycle==='ready','preload reports ready');
  const win=windows.get(launch.viewID),js=code=>win.webContents.executeJavaScript(code,true);
  const scene=()=>js(`fetch('/api/state').then(r=>r.json()).then(e=>e.scene)`);
  await until(()=>js(`Boolean(window.latticeDiagnostics?.().connected)`),'real SC scene');
  const first=await scene();assert.equal(first.reference,144);assert.equal(first.audioReady,false);assert.equal(first.armed,false);assert.equal(first.voices.length,0);
  const permissions=await js(`({node:typeof require,media:window.awbHost.capabilities().media})`);
  assert.equal(permissions.node,'undefined');assert.ok(permissions.media.includes('midi-input'));
  assert.ok(nativeScHost.snapshot().processID,'standalone launch starts managed sclang');
  assert.equal(registry.get(launch.viewID).sessionState.connected,true);
  const hostStatus=await homeJS(`window.awbHost.request('shell.snapshot')`);
  assert.equal(hostStatus.host.control.audioLifecycle,true);
  const audio=await homeJS(`window.awbHost.request('shell.server',{action:'status'})`);
  assert.equal(audio.state,'stopped');assert.ok(audio.outputDevices.includes('1248'));
  const settings={inputDevice:'1248',outputDevice:'1248',sampleRate:44100,inputChannels:2,outputChannels:2};
  assert.deepEqual(await homeJS(`window.awbHost.request('shell.audio-settings',${JSON.stringify(settings)})`),settings);
  const configured=await homeJS(`window.awbHost.request('shell.server',{action:'status'})`);
  assert.equal(configured.settings.outputDevice,'1248');assert.equal(configured.settings.sampleRate,44100);
  await assert.rejects(homeJS(`window.awbHost.request('shell.restart-headless-sc')`),/close instrument views/);
  assert.equal(nativeScHost.snapshot().processID,hostStatus.nativeScHost.processID);

  for(const view of ['fan','3d','line','wheel','ladder']) {
    await js(`document.querySelector('[data-view="${view}"]').click();void 0;`);
    assert.equal(await js(`document.getElementById('field').dataset.projection`),view);
    assert.equal(await js(`Number(document.getElementById('field').dataset.visibleNodes)`),first.nodes.filter(n=>n.displayDefault).length);
  }
  assert.equal(first.settings.foldOctaves,false);assert.ok(first.axisEdges.length>0);
  assert.equal(await js(`window.latticeDiagnostics().wheelRings`),0);
  const fifth=first.nodes.find(n=>n.displayDefault&&n.ratio[0]===3&&n.ratio[1]===1);assert.ok(fifth);
  await js(`document.querySelector('[data-view="fan"]').click();document.getElementById('fit').click();document.getElementById('field').focus();void 0;`);
  const hoverPoint=await js(`(()=>{const b=document.getElementById('field').getBoundingClientRect(),p=window.latticeDiagnostics().nodes.find(n=>n.positionId===${JSON.stringify(fifth.positionId)});return{x:Math.round(b.left+p.x),y:Math.round(b.top+p.y)}})()`);
  win.webContents.sendInputEvent({type:'mouseMove',...hoverPoint});await delay(180);
  assert.equal((await scene()).hover.sourceId??null,null,'ordinary hover must not change the query');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Shift'});
  await until(()=>js(`window.latticeDiagnostics().hoverSourceId===${JSON.stringify(fifth.positionId)}`),'Shift over stationary point previews real SC neighbourhood');
  const preview=await scene();assert.deepEqual(preview.selectionIds,first.selectionIds);assert.equal(preview.voices.length,0);assert.ok(preview.hover.relationships.length>0);
  assert.match(await js(`document.getElementById('legend').textContent`),/hover/);
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Shift'});await delay(180);
  assert.equal((await scene()).hover.sourceId,fifth.positionId,'release stops new queries but preserves the timed preview');
  const action=async(command)=>js(`fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify(command)})}).then(r=>r.json())`);
  assert.equal((await action({action:'select',targetIds:[fifth.positionId]})).ok,true);
  await until(()=>js(`window.latticeDiagnostics().selectionIds.includes(${JSON.stringify(fifth.positionId)})`),'SC selection round trip');
  assert.equal((await scene()).voices.length,0);
  assert.equal((await action({action:'keyboardEqual',divisions:19,anchor:220})).ok,true);
  await until(async()=>{const s=await scene();return s.keyboardReference.degreeFrequencies.length===19;},'real nineteen-tone ScaleContext');
  await js(`document.querySelector('[data-view="keyboard"]').click();void 0;`);
  await until(()=>js(`window.latticeDiagnostics().keyboard?.layout==='blocks'`),'real Keyboard guide');
  const keyboardScene=await scene();assert.equal(keyboardScene.frameId,first.frameId);assert.equal(keyboardScene.voices.length,0);assert.ok(Math.abs(keyboardScene.keyboardReference.degreeFrequencies[1]-220*2**(1/19))<1e-9);
  assert.equal((await action({action:'query',settings:{relationships:['traversal','substitution','nearMiss','shared'],depth:2}})).ok,true);
  await until(async()=>{const s=await scene();return s.settings.depth===2&&s.settings.relationships.length===4;},'SC relationship request');
  assert.ok((await scene()).relationships.some(r=>r.type==='substitution'));
  await js(`document.getElementById('kind').value='cps';document.getElementById('kind').dispatchEvent(new Event('change'));document.getElementById('axes').value='1, 3, 5, 15';document.getElementById('k').value='2';document.getElementById('context-form').requestSubmit();void 0;`);
  await until(async()=>{const s=await scene();return s.kind==='cps';},'context form creates real CPS');
  const cps=await scene(),pair=cps.nodes.filter(n=>n.displayDefault&&n.elements&&['1,15','3,5'].includes(n.elements.join(',')));
  assert.equal(pair.length,2);assert.notEqual(pair[0].positionId,pair[1].positionId);assert.equal(pair[0].placedFrequency,pair[1].placedFrequency);
  assert.equal(cps.audioReady,false);assert.equal(cps.voices.length,0);
  if(screenshot)await writeFile(screenshot,(await win.webContents.capturePage()).toPNG());
  await closeToolView(launch.viewID);
  await until(()=>!toolRuntimes.has('lattice-instrument'),'last view releases runtime');
  assert.equal(registry.list().some(v=>v.toolID==='lattice-instrument'),false);
  await homeJS(`window.awbHost.request('shell.restart-headless-sc')`);
  await until(async()=>{const s=await homeJS(`window.awbHost.request('shell.snapshot')`);return s.host.control?.status==='ready'&&s.host.control.processID!==hostStatus.host.control.processID;},'language restarted after view closure');
  const recalled=await homeJS(`window.awbHost.request('shell.server',{action:'status'})`);
  assert.equal(recalled.state,'stopped');assert.equal(recalled.settings.outputDevice,'1248');assert.equal(recalled.settings.sampleRate,44100);

  console.log('AWB_LATTICE_SHELL_PASS real-sclang=true first-home-click=true preload=true midi-capability=true views=6 keyboard-reference=true shift-hover=true selection=true query=true cps-collision=true audio-unbooted=true close=true');
}
