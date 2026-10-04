import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
function replace(s,a,b){if(!s.includes(a))throw new Error('Scope fixture source drift: '+a);return s.replace(a,b)}
export async function prepare(root){
 const path=resolve(root,'tool-artifacts/shared-loop/0.1.0/public/scope.js');let s=await readFile(path,'utf8');
 s=replace(s,"const requestedKind=",`const fixtureParams=new URLSearchParams(location.search),fixtureCount=Number(fixtureParams.get('count')||6),fixtureLayout=fixtureParams.get('layout')||'shared',fixtureChannel=fixtureParams.has('channel')?Number(fixtureParams.get('channel')):null;
const fixtureChosen=fixtureChannel===null?Array.from({length:fixtureCount},(_,i)=>i):[fixtureChannel];
const fixture={paints:0,strokes:0,packets:0,sourceGaps:0,lastEnd:0};
const requestedKind=`);
 const start=s.indexOf('function selectedChannels(){'),end=s.indexOf("$('signals').onchange",start);
 s=s.slice(0,start)+'function selectedChannels(){return fixtureChosen;}\n'+s.slice(end);
 // Both six-channel audio and control use the same stacked plotting body/area.
 s=s.replace("laneHeight=kind==='control'?h/chosen.length:h",'laneHeight=h/chosen.length').replace("const middle=kind==='control'?(slot+.5)*laneHeight:h/2",'const middle=(slot+.5)*laneHeight');
 // The production setup/paint loop is retained; only layout routing is added.
 const drawStart=s.indexOf('function draw(){'),paintStart=s.indexOf(' const dpr=',drawStart),drawEnd=s.indexOf('\nconst resizeObserver=',paintStart);
 let body=s.slice(paintStart,drawEnd);body=replace(body,'chosen=selectedChannels()','chosen=plot.chosen');
 body=body.replace("if(kind==='control'){ctx.strokeStyle=", "if(true){ctx.strokeStyle=").replace("ctx.strokeStyle=kind==='control'?signalColors[ch]:ch?'#ffb276':'#6ce0c1'",'ctx.strokeStyle=signalColors[ch]');
 body=replace(body," canvas.dataset.paints=String(Number(canvas.dataset.paints||0)+1);",' plot.gridDpr=gridDpr;');
 s=s.slice(0,drawStart)+`const fixturePlots=[];
function instrument(element,chosen,height){element.style.width='620px';element.style.height=height+'px';element.style.display='block';const c=element.getContext('2d'),stroke=c.stroke.bind(c);c.stroke=(...args)=>{fixture.strokes++;return stroke(...args)};fixturePlots.push({canvas:element,ctx:c,chosen,grid:document.createElement('canvas'),gridDpr:0,get rect(){return element.getBoundingClientRect()}});}
if(fixtureLayout==='canvases'){canvas.style.display='none';for(const ch of fixtureChosen){const element=document.createElement('canvas');canvas.before(element);instrument(element,[ch],240/fixtureCount)}}else instrument(canvas,fixtureChosen,fixtureLayout==='windows'?240/fixtureCount:240);
function drawPlot(plot){let {canvas,ctx,grid,gridDpr,rect}=plot;
${body}
function draw(){if(historyDirty&&!frozen)consumeHistory();for(const plot of fixturePlots)drawPlot(plot);fixture.paints++;if(fixtureLayout==='canvases')Object.assign(canvas.dataset,fixturePlots[0].canvas.dataset);}
window.__signalBench=()=>({...fixture,...(typeof painter!=='undefined'?painter.diagnostics():{}),selected:fixtureChosen,channels:snapshot?.channels,rate:snapshot?.sampleRate,sourceEnd:history.latest?.sourceEnd,missing:snapshot?.missingSourceFrames,renderedSequence:canvas.dataset.renderedSequence,connected:$('connection').textContent,plots:fixturePlots.map(p=>({width:p.rect.width,height:p.rect.height})),renderedSourceEnd:Number(canvas.dataset.renderedSourceEnd||0),transportChannels:Number(canvas.dataset.channels||0)});
`+s.slice(drawEnd);
 s=replace(s,'receivedAt=performance.now();retryMs=500;',`receivedAt=performance.now();retryMs=500;fixture.packets++;if(fixture.lastEnd&&next.sourceEnd-next.sourceFrames>fixture.lastEnd)fixture.sourceGaps+=next.sourceEnd-next.sourceFrames-fixture.lastEnd;fixture.lastEnd=next.sourceEnd;`);
 // Before v5, subscribers select channels only at paint; v5 passes selection in its socket URL.
 if(s.includes("url.searchParams.set('channels'"))s=replace(s,"url.searchParams.set('channels',requestedChannels().join(','))", "url.searchParams.set('channels',fixtureChosen.join(','))");
 // Make the fixture's metadata channel count truthful (plot layout remains test-only).
 await writeFile(path,s);
 const codec=resolve(root,'tool-artifacts/shared-loop/0.1.0/public/scope-protocol.js');let c=await readFile(codec,'utf8');
 c=c.replaceAll('channels!==channelCounts[index]',"(index===1?![2,6].includes(channels):channels!==channelCounts[index])");
 c=c.replaceAll('sourceChannels!==channelCounts[index]',"(index===1?![2,6].includes(sourceChannels):sourceChannels!==channelCounts[index])");
 await writeFile(codec,c);
 const transport=resolve(root,'tool-artifacts/shared-loop/0.1.0/scope-transport.mjs');let t=await readFile(transport,'utf8');t=t.replace('mic:1,output:2,control:6','mic:1,output:6,control:6');await writeFile(transport,t);
}
