// All replacements affect the temporary test copy, never the installed artifact.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
function replace(source,before,after){if(!source.includes(before))throw new Error('Audio fixture source has drifted: '+before);return source.replace(before,after);}
export async function prepare(root){
 const change=async(name,fn)=>{const path=resolve(root,name);await writeFile(path,fn(await readFile(path,'utf8')));};
 await change('native/scopes.cpp',s=>replace(s,'r->output.channels()!=3','r->output.channels()!=7'));
 await change('public/scope-protocol.js',s=>replace(replace(s,'channelCounts=[1,2,6]','channelCounts=[1,6,6]'),"'awb.scope.v4'","'awb.scope.audio-bench.v4'"));
 await change('tests/component-server.scd',s=>{
  s=replace(s,'out = ScopeBuffer.alloc(s, 3)','out = ScopeBuffer.alloc(s, 7)');
  s=replace(s,' Synth(\\awbScopeOutputProbeV1, [], RootNode(s), \\addToTail);',' // Six benchmark signals are never routed to hardware output.');
  return replace(s,' tap = Synth(\\awbSharedLoopScopesV1,',`
 SynthDef(\\awbAudioChannelBench, { |micScope, outScope, controlScope, controlBus|
  var audioClock = Phasor.ar(0, 1, 0, 4194304);
  var controlClock = Phasor.kr(0, 1, 0, 4194304);
  var signals = SinOsc.ar([110, 220, 330, 440, 550, 660]) * [0.10, 0.12, 0.14, 0.16, 0.18, 0.20];
  Out.kr(controlBus, [SinOsc.kr(1), SinOsc.kr(10)] ++ LFNoise0.kr([1, 5, 20, 100]));
  ScopeOut2.ar([SoundIn.ar(0), audioClock], micScope, 2048, 1024);
  ScopeOut2.ar(signals ++ [audioClock], outScope, 2048, 1024);
  ScopeOut2.kr(In.kr(controlBus, 6) ++ [controlClock], controlScope, 256, 32);
 }).add; s.sync;
 tap = Synth(\\awbAudioChannelBench,`);
 });
 await change('public/scope.js',s=>{
  s=replace(s,"if(kind==='control'){document.body.classList.add('control-scope');$('signalPicker').hidden=false;}","document.body.classList.add('control-scope');$('signalPicker').hidden=false;");
  const start=s.indexOf('function selectedChannels()'),end=s.indexOf("$('signals').onchange",start);
  if(start<0||end<0)throw new Error('Missing signal selection');
  s=s.slice(0,start)+`function selectedChannels(){return Array.from({length:Number($('signals').value)||6},(_,i)=>i);}
`+s.slice(end);
  s=replace(s,"const title=kind==='mic'?'Mic / input 1':kind==='output'?'Audio out / 1–2':'Control / LFO + Noise';","const title='Six-channel audio benchmark';");
  s=replace(s,"kind==='output'?'SC hardware output buses · final stereo mix'","kind==='output'?'Six internal SinOsc.ar signals · no speaker routing'");
  s=replace(s,"kind==='output'?'Includes other instruments on the same SC output buses'","kind==='output'?'Six SC audio-rate test signals; no hardware output'");
  s=replace(s,"const signalNames=['Sine 1 Hz','Sine 10 Hz','Noise 1 Hz','Noise 5 Hz','Noise 20 Hz','Noise 100 Hz'];","const signalNames=['Audio 110 Hz','Audio 220 Hz','Audio 330 Hz','Audio 440 Hz','Audio 550 Hz','Audio 660 Hz'];");
  s=replace(s,"kind==='control'?'CONTROL · 6 CHANNELS':snapshot.channels===1?'INPUT 1':'L · R'","'AUDIO · 6 CHANNELS'");
  s=replace(s,"kind==='control'?h/chosen.length:h","h/chosen.length");
  s=replace(s,"kind==='control'?(slot+.5)*laneHeight:h/2","(slot+.5)*laneHeight");
  s=replace(s,"if(kind==='control'){ctx.strokeStyle", "if(true){ctx.strokeStyle");
  s=replace(s,"kind==='control'?signalColors[ch]:ch?'#ffb276':'#6ce0c1'","signalColors[ch]");
  // Audio retains ordinary line drawing, not the control-rate step interpolation.
  return s;
 });
 await change('public/scope.html',s=>{
  const start=s.indexOf('<select id="signals">'),end=s.indexOf('</select>',start);
  if(start<0||end<0)throw new Error('Missing lane picker');
  return s.slice(0,start)+'<select id="signals"><option value="1">One channel</option><option value="2">Two channels</option><option value="4">Four channels</option><option value="6" selected>All six channels</option>'+s.slice(end);
 });
 await change('tests/component-bench.mjs',s=>{
  s=replace(s,"process.argv.includes('--control-cost-only')","process.argv.includes('--audio-channel-cost-only')");
  const start=s.indexOf(' if(controlCostOnly){'),end=s.indexOf(' }else{',start);
  if(start<0||end<0)throw new Error('Missing focused benchmark block');
  s=s.slice(0,start)+audioPhases+s.slice(end);
  s=replace(s,"'/private/tmp/awb-control-cost-results.json'","(process.argv.includes('--verify-only')?'/private/tmp/awb-audio-channel-verify-results.json':'/private/tmp/awb-audio-channel-cost-results.json')");
  s=replace(s,"protocol:'awb.scope.v4'","protocol:'awb.scope.audio-bench.v4',audioChannels:6,drawnLaneCounts:[1,2,4,6],zooms:[1,0.0625]");
  s=replace(s,"controlDisplayGain:controlCostOnly?1:null,controlZoom:controlCostOnly?0.0625:null,","audioDisplayGain:1,");
  return s;
 });
}
const audioPhases=` if(controlCostOnly){
  await show('output');const win=viewers[0].win;
  await win.webContents.executeJavaScript(\`
   document.querySelector('#gain').value=String(document.querySelector('#gain').dataset.scale==='log2'?Math.log2(1):1);document.querySelector('#gain').dispatchEvent(new Event('change'));
   const context=document.querySelector('#scope').getContext('2d'),stroke=context.stroke.bind(context);
   window.__benchStrokes=0;context.stroke=function(...args){window.__benchStrokes++;return stroke(...args);};
   window.__benchRAF=requestAnimationFrame.bind(window);
   window.requestAnimationFrame=callback=>{window.__benchResume=callback;return 0;};void 0;\`);
  await delay(100); // Allow the first pending animation frame to save its callback.
  if(process.argv.includes('--verify-only')){
   win.setSize(720,640);win.show();win.focus();
   for(const zoom of [1,0.0625]){
    await win.webContents.executeJavaScript(\`document.querySelector('#signals').value='6';document.querySelector('#signals').dispatchEvent(new Event('change'));document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(Number('\${zoom}')):Number('\${zoom}'));document.querySelector('#zoom').dispatchEvent(new Event('change'));window.requestAnimationFrame=window.__benchRAF;window.requestAnimationFrame(window.__benchResume);void 0;\`);
    await phase(\`audio-verify-\${zoom}-six-live-lanes\`);
    const measured=results.at(-1),paintHz=measured.rendererDiagnostics.strokes/24/measured.seconds;
    if(paintHz<20||paintHz>90)throw new Error('Visual test paint loop duplicated or stalled: '+paintHz);
    const info=await win.webContents.executeJavaScript(\`({channels:document.querySelector('#scope').dataset.channels,visible:document.querySelector('#scope').dataset.visibleChannels,sourceFrames:Number(document.querySelector('#scope').dataset.sourceFrames),bins:Number(document.querySelector('#scope').dataset.frames),end:Number(document.querySelector('#scope').dataset.sourceEnd),format:document.querySelector('#scope').dataset.format,connected:document.querySelector('#connection').textContent,footerFits:document.querySelector('footer').getBoundingClientRect().bottom<=innerHeight})\`);
    if(info.channels!=='6'||info.visible!=='0,1,2,3,4,5'||info.sourceFrames!==1024/zoom||info.bins!==1024||info.connected!=='Live'||!info.footerFits)throw new Error('Audio visual/layout verification failed: '+JSON.stringify(info));
    await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const image=await win.webContents.capturePage();await writeFile(\`/private/tmp/awb-audio-channel-\${zoom===1?'raw':'wide'}-six.png\`,image.toPNG());
    console.log('AUDIO_VISUAL_VERIFIED '+JSON.stringify(info));
    await win.webContents.executeJavaScript(\`window.requestAnimationFrame=callback=>{window.__benchResume=callback;return 0;};void 0;\`);
    await delay(100); // Let the pending draw observe the pause before resuming once.
   }
  }else{
  for(const zoom of [1,0.0625]){
   const mode=zoom===1?'raw':'wide';
   await win.webContents.executeJavaScript(\`document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(Number('\${zoom}')):Number('\${zoom}'));document.querySelector('#zoom').dispatchEvent(new Event('change'));void 0;\`);
   await phase(\`audio-\${mode}-streaming-no-canvas-paint\`);
   if(zoom===1){probe.send('/n_run',session.scopeNodeId,0);await probe.sync();await phase('audio-connected-idle-no-new-publications-no-canvas-paint');probe.send('/n_run',session.scopeNodeId,1);await probe.sync();}
   await win.webContents.executeJavaScript(\`window.requestAnimationFrame=window.__benchRAF;window.requestAnimationFrame(window.__benchResume);void 0;\`);
   for(const [repeat,counts] of [[1,[1,2,4,6]],[2,[6,4,2,1]]])for(const count of counts){
    await win.webContents.executeJavaScript(\`document.querySelector('#signals').value='\${count}';document.querySelector('#signals').dispatchEvent(new Event('change'));void 0;\`);
    await phase(\`audio-\${mode}-draw-\${count}-lanes-repeat-\${repeat}\`);
    const diag=results.at(-1).rendererDiagnostics;
    if(diag.strokes<100||diag.visibleChannels.split(',').length!==count||diag.transport!=='binary-v4')throw new Error('Audio benchmark did not render selected live lanes');
    const snapshot=bridge.scopeSnapshots().output;
    if(snapshot.channels!==6||snapshot.sampleRate!==session.sampleRate||snapshot.sourceFrames!==1024||snapshot.format!==(zoom===1?'samples':'minmax')||snapshot.peaks.some((p,i)=>Math.abs(p-(.1+.02*i))>.006))throw new Error('Audio fixture channel/native data mismatch');
   }
   const image=await win.webContents.capturePage();await writeFile(\`/private/tmp/awb-audio-channel-\${mode}.png\`,image.toPNG());
   await win.webContents.executeJavaScript(\`window.requestAnimationFrame=callback=>{window.__benchResume=callback;return 0;};void 0;\`);
   await phase(\`audio-\${mode}-streaming-no-canvas-paint-repeat\`);
  }
  }
  await closeViews();if(!process.argv.includes('--verify-only'))await phase('scope-tap-node-reader-no-viewer-repeat');
  for(const result of results.filter(result=>result.name.includes('no-canvas-paint')))if(result.rendererDiagnostics.strokes!==0)throw new Error('Canvas painted during audio no-paint baseline');
`;
