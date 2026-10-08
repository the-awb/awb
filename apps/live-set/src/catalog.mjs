import legacy from '../fixtures/legacy-midi.json' with {type:'json'};
export const cells=[{id:'b2',label:'B2',position:'top-left',color:'#86b9ef'},{id:'a2',label:'A2',position:'top-right',color:'#e6be75'},{id:'a1',label:'A1',position:'bottom-left',color:'#b79ae5'},{id:'b1',label:'B1',position:'bottom-right',color:'#72cbb8'}];
const controls=(group,rows)=>rows.map(([name,label,target])=>({id:`${group}/${name}`,group,name,label,target,midi:legacy.mappings.find(m=>m.track===group&&m.name===name)??null}));
export const fxGroups=[
 {id:'mast',label:'Master',color:'#507878',controls:controls('mast',[['mastEQShaper','EQ','unavailable'],['schertlerMix','Scheps mix','um:schertlerMix']])},
 {id:'verb',label:'Verb',color:'#96915a',controls:controls('verb',[['verbIn','Gain','verb:inputGain'],['verbSelect','Mode','verb:selector']])},
 {id:'fuzz',label:'Fuzz',color:'#938096',controls:controls('fuzz',[['fuzzShaper','Fuzz','fuzz:shape']])},
 {id:'deci',label:'Decimate',color:'#648b99',controls:controls('deci',[['deciShaper','Shape','deci:shape'],['depthOf','Depth','deci:depth'],['foldOf','Folding','deci:folding']])},
 {id:'spark',label:'Sparkle',color:'#6e9866',controls:controls('spark',[['sparkleShaper','Sparkle','spark:sparkle'],['spark','Spark','spark:shape'],['sparkTailMix','Tail mix','spark:tailMix'],['sparkPD','Pitch select','spark:pitchSelect'],['sparkTailShapr','Tail shape','spark:tailShape']])},
 {id:'mast-um',label:'UM',color:'#8b638c',controls:controls('mast',[['umMix','Mix','um:mix'],['umMainControl','Main','um:main'],['umEarth','Earth','um:earth'],['umDiffusion','Diffuse','um:diffusion'],['umInnerDep','Depth','um:innerDepth'],['umInnerR8','Rate','um:innerRate'],['umwonkSC','Wonk','um:wonk'],['umOverMod','Overmod','um:overMod'],['umShaper','Shaper','um:shape']])},
 {id:'vcfx',label:'Cello',color:'#936e50',controls:controls('vcfx',[['submarine','Submarine','unavailable'],['stut1AMT','Stutter','vcfx:amount'],['stutWave','Wave','vcfx:waveform'],['stutRate','Rate','vcfx:rate']])},
 {id:'splut',label:'Splutter',color:'#9a7548',controls:controls('splut',[['splut1','1','unavailable'],['splut2','2','unavailable'],['splutenvMod','~ envelope','unavailable'],['splutDiv','~ time','unavailable']])},
];
fxGroups.find(g=>g.id==='vcfx').controls.find(c=>c.name==='stutWave').choices=['Tri','Pulse','Sine','Saw','Custom'];
export const delayControls=id=>controls(id,[['inOf','Input',null],['fbOf','Feedback',null],['fxOf','FX',null],['sliOf','Time',null],['inSc','~ input',null],['fbSc','~ feedback',null],['fxSc','~ FX',null],['sliSc','~ time',null]]);
export const delayRouting=id=>controls(id,[...['b1','a2','b2'].slice(0,['b1','a2','b2','a1'].indexOf(id)).reverse().map(from=>[`${from}In`,from.toUpperCase(),'delay:route']),...(id==='a1'?[['sc2In','SC2','delay:route'],['sc1In','SC1','delay:route']]:[]),['p2In','Pro2','delay:route'],['micIn','Mic','delay:route'],['vcIn','VC','delay:route']]);
export const delayModulation=id=>[
 {id:`${id}/thM`,label:'TH mode',field:'base'},{id:`${id}/thP`,label:'Position',field:'base'},
 {id:`${id}/thAMod`,label:'TH mod',field:'base'},{id:`${id}/thPMod`,label:'Position mod',field:'base'},
];
export const allControls=[...fxGroups.flatMap(g=>g.controls),...cells.flatMap(c=>[...delayControls(c.id),...delayRouting(c.id)])];
export function localViewURL(value){if(!value)return null;const u=new URL(value);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port||u.username||u.password||u.hash)throw Error('Embedded views require an explicit loopback HTTP URL');return u.href}
export function validateSurface(input={}){const cellViews={};for(const [id,url]of Object.entries(input.cellViews??{})){if(!cells.some(c=>c.id===id))throw Error('Unknown cell view');cellViews[id]=localViewURL(url)}return {name:String(input.name??'AWB / LIVE').slice(0,120),cellViews,routingView:localViewURL(input.routingView),rackView:localViewURL(input.rackView),managedCells:input.managedCells!==false}}
export function mappingLabel(m){return m?`CC ${m.cc} · ch ${m.channel+1} · ${m.device??'MIDI'}${m.pickup?' · pickup':''}`:'Unmapped'}
