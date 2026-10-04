// Adapt the existing six-audio-channel fixture in a temporary copy only.
import {prepare as prepareAudio} from '../multichannel-audio/prepare.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
function replace(s,before,after){if(!s.includes(before))throw new Error('Layout fixture source drift: '+before);return s.replace(before,after);}
export async function prepare(root){
 await prepareAudio(root);
 const path=resolve(root,'public/scope.js');let s=await readFile(path,'utf8');
 s=replace(s,"const title='Six-channel audio benchmark';","const title=kind==='control'?'Control layout benchmark':'Audio layout benchmark';");
 s=replace(s,"'AUDIO · 6 CHANNELS'","kind==='control'?'CONTROL · 6 CHANNELS':'AUDIO · 6 CHANNELS'");
 s=replace(s,"const signalNames=['Audio 110 Hz','Audio 220 Hz','Audio 330 Hz','Audio 440 Hz','Audio 550 Hz','Audio 660 Hz'];","const signalNames=kind==='control'?['Sine 1 Hz','Sine 10 Hz','Noise 1 Hz','Noise 5 Hz','Noise 20 Hz','Noise 100 Hz']:['Audio 110 Hz','Audio 220 Hz','Audio 330 Hz','Audio 440 Hz','Audio 550 Hz','Audio 660 Hz'];");
 s=replace(s,"function selectedChannels(){return Array.from({length:Number($('signals').value)||6},(_,i)=>i);}",`
const layoutParams=new URLSearchParams(location.search);
const layout=layoutParams.get('layout')||'shared';
const laneCount=Number(layoutParams.get('count')||6);
const windowChannel=layoutParams.has('channel')?Number(layoutParams.get('channel')):null;
if(!['shared','canvases','windows'].includes(layout)||![1,2,4,6].includes(laneCount)||windowChannel!==null&&(!Number.isInteger(windowChannel)||windowChannel<0||windowChannel>=laneCount))throw new Error('Invalid layout fixture');
function selectedChannels(){return windowChannel===null?Array.from({length:laneCount},(_,i)=>i):[windowChannel];}
`);
 s=replace(s,"else $('level').textContent=snapshot.peaks.map((peak,ch)=>", "else $('level').textContent=selectedChannels().map(ch=>{const peak=snapshot.peaks[ch];return");
 s=replace(s,"${db(peak)}`).join('  /  ');}","${db(peak)}`;}).join('  /  ');}");
 // Extract the installed renderer's plotting body; preserve its actual line/bucket code.
 const start=s.indexOf('function draw(){'),tail=s.indexOf(' if(receivedAt&&',start),end=s.indexOf('}draw();',tail);
 if(start<0||tail<0||end<0)throw new Error('Missing installed draw boundaries');
 let plot=s.slice(start,tail);
 plot=replace(plot,'function draw(){','function drawPlot(canvas,ctx,chosen){');
 plot=replace(plot,'const {count,start}=visibleRange(),chosen=selectedChannels(),laneHeight=h/chosen.length;', 'const {count,start}=visibleRange(),laneHeight=h/chosen.length;');
 const wrapped=`
const fixture={paint:true,frames:0,strokes:0};window.__layoutFixture=fixture;
$('signals').value=String(selectedChannels().length);$('signals').disabled=true;
$('source').textContent=layout==='windows'?'One selected lane; full six-channel feed in this window':layout==='canvases'?'Separate canvases; one shared feed/history/animation loop':'Shared canvas; one feed/history/animation loop';
const totalHeight=240,plotHeight=layout==='windows'?totalHeight/laneCount:totalHeight;
const plots=[];
function instrument(canvas){canvas.style.width='620px';const ctx=canvas.getContext('2d'),stroke=ctx.stroke.bind(ctx);ctx.stroke=function(...args){fixture.strokes++;return stroke(...args);};return ctx;}
if(layout==='canvases'){
 canvas.style.display='none';
 const group=document.createElement('div');group.id='fixture-plots';canvas.before(group);
 for(const ch of selectedChannels()){const plot=document.createElement('canvas');plot.dataset.fixtureChannel=String(ch);plot.style.height=(totalHeight/laneCount)+'px';plot.style.display='block';group.append(plot);plots.push({canvas:plot,ctx:instrument(plot),chosen:[ch]});}
}else{canvas.style.height=plotHeight+'px';plots.push({canvas,ctx:instrument(canvas),chosen:selectedChannels()});}
${plot}}
window.__layoutState=()=>({kind,layout,laneCount,selected:selectedChannels(),paint:fixture.paint,paintFrames:fixture.frames,strokes:fixture.strokes,channels:snapshot?.channels,sourceFrames:snapshot?.sourceFrames,frames:snapshot?.frames,missingSourceFrames:snapshot?.missingSourceFrames,sourceEnd:history.latest?.sourceEnd,rate:snapshot?.sampleRate,format:snapshot?.format,connection:$('connection').textContent,footerFits:document.querySelector('footer').getBoundingClientRect().bottom<=innerHeight,plots:plots.map(({canvas})=>{const r=canvas.getBoundingClientRect();return {width:r.width,height:r.height,dpr:devicePixelRatio};})});
function draw(){
 if(fixture.paint){for(const plot of plots)drawPlot(plot.canvas,plot.ctx,plot.chosen);fixture.frames++;}
 if(receivedAt&&performance.now()-receivedAt>1500){$('connection').textContent='Disconnected';$('connection').classList.remove('live');}
 requestAnimationFrame(draw);
}draw();`;
 s=s.slice(0,start)+wrapped+s.slice(end+'}draw();'.length);
 await writeFile(path,s);
}
