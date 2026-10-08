import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(process.argv[2]??new URL('./AWBSetMapper.control.js',import.meta.url),'utf8');
function fixture(){
  let serial=0;
  const dev=(name,extra={})=>({uid:++serial,name,type:'audio-effect',enabled:true,params:[{id:'gain',name:'Gain',value:0,display:'-inf dB'}],...extra});
  const tracks=Array.from({length:19},(_,i)=>({uid:++serial,name:i<3?'Duplicate':'Track '+i,type:'Audio',volume:0,pan:.5,mute:false,solo:false,devices:[],children:[]}));
  tracks[0].type='Group';tracks[0].children=[tracks[1],tracks[2],tracks[0]]; // Some banks expose the group master alias.
  tracks[1].devices=Array.from({length:11},()=>dev('Duplicate', {enabled:false}));
  tracks[2].devices=[dev('Layer', {layers:Array.from({length:9},(_,i)=>({uid:++serial,name:'Duplicate',devices:[dev('Receiver', {slots:{'Source FX':i===8?[dev('Deep', {enabled:false,params:[{id:'gain',name:'Gain',value:NaN,display:''}]})]:[]}})]}))})];
  tracks[8].devices=[dev('Drum', {pads:[{uid:++serial,name:'Kick',devices:[dev('Pad FX')]}]})];
  tracks[18].type='Master';
  tracks[1].sends=Array.from({length:25},(_,i)=>({name:'Send '+i,value:i===24?.5:0}));
  return {tracks,roots:tracks.filter((_,i)=>i!==1&&i!==2)};
}
function simulate({playing=false,suppressIds=false,changedCallbacksOnly=false}={}){
  const data=fixture(), output=[], tasks=[];let time=0,seq=0;
  const schedule=(fn,ms)=>tasks.push({fn,time:time+ms,seq:seq++});
  const value=(read,write)=>({get:read,markInterested(){},set(v){if(!write)throw Error('Unexpected musical write');write(v);}});
  const prop=(obj,key,fallback)=>value(()=>obj()?.[key]??fallback);
  const exists=read=>value(()=>!!read());
  const equal=(a,b)=>value(()=>!!a()&&a()===b._getNode());
  function bank(read,item){let offset=0;return {
    itemCount:()=>value(()=>read().length),scrollPosition:()=>value(()=>offset,v=>{offset=v;}),
    getItemAt:i=>item(()=>read()[offset+i])};}
  function device(read){return {
    _getNode:read,exists:()=>exists(read),name:()=>prop(read,'name',''),position:()=>value(()=>read()?read().chain.indexOf(read()):-1),
    deviceType:()=>prop(read,'type',''),isPlugin:()=>prop(read,'plugin',false),isEnabled:()=>prop(read,'enabled',false),
    isNested:()=>prop(read,'nested',false),hasLayers:()=>value(()=>!!read()?.layers),hasDrumPads:()=>value(()=>!!read()?.pads),
    hasSlots:()=>value(()=>!!read()?.slots),slotNames:()=>value(()=>Object.keys(read()?.slots??{})),
    sampleName:()=>prop(read,'sampleName',''),presetName:()=>prop(read,'presetName',''),createEqualsValue:b=>equal(read,b)};}
  function container(read){return {_getNode:read,exists:()=>exists(read),name:()=>prop(read,'name',''),
    createDeviceBank:()=>bank(()=>read()?.devices??[],device)};}
  function track(read){return {...container(read),position:()=>value(()=>data.tracks.indexOf(read())),
    trackType:()=>prop(read,'type',''),isGroup:()=>value(()=>read()?.type==='Group'),
    volume:()=>parameter(()=>read()?.volume??0,'0 dB'),pan:()=>parameter(()=>read()?.pan??0,'Center'),
    mute:()=>prop(read,'mute',false),solo:()=>prop(read,'solo',false),
    sourceSelector:()=>({hasAudioInputSelected:()=>value(()=>false),hasNoteInputSelected:()=>value(()=>false)}),
    sendBank:()=>bank(()=>read()?.sends??[],s=>({...parameter(()=>s()?.value??0,'0 dB'),exists:()=>exists(s),name:()=>prop(s,'name',''),isPreFader:()=>value(()=>false),sendMode:()=>value(()=> 'POST')})),
    createTrackBank:()=>bank(()=>read()?.children??[],track),createEqualsValue:b=>equal(read,b)};}
  function parameter(read,display){return {...value(read),displayedValue:()=>value(()=>display)};}
  function cursorDevice(){let current=null,idCb,nameCb,numCb,displayCb;let pin=false,lastIds=null,lastNames={},lastNumbers={};
    const bind=n=>{current=n;schedule(()=>{const nextIds=(n?.params??[]).map(p=>p.id),signature=JSON.stringify(nextIds);
      if(!suppressIds&&(!changedCallbacksOnly||signature!==lastIds))idCb?.(nextIds);lastIds=signature;
      for(const p of n?.params??[]){
        if(!changedCallbacksOnly||lastNames[p.id]!==p.name)nameCb?.(p.id,p.name);
        if(!changedCallbacksOnly||!Object.is(lastNumbers[p.id],p.value))numCb?.(p.id,p.value);
        lastNames[p.id]=p.name;lastNumbers[p.id]=p.value;
      }},100);};
    return {...device(()=>current),isPinned:()=>value(()=>pin,v=>pin=v),selectDevice:d=>bind(d._getNode()),
      'selectFirstInLayer(int)':i=>bind(current?.layers?.[i]?.devices?.[0]??null),
      selectFirstInKeyPad:i=>bind(current?.pads?.[i]?.devices?.[0]??null),
      selectFirstInSlot:s=>bind(current?.slots?.[s]?.[0]??null),
      createSiblingsDeviceBank:()=>bank(()=>current?.chain??[],device),
      createLayerBank:()=>bank(()=>current?.layers??[],container),createDrumPadBank:()=>bank(()=>current?.pads??[],container),
      createCursorRemoteControlsPage:()=>({pageNames:()=>value(()=>['AWB']),pageCount:()=>value(()=>1),selectedPageIndex:()=>value(()=>0),getName:()=>value(()=> 'AWB'),
        getParameter:i=>({...parameter(()=>i===0?0:.5,'0 dB'),exists:()=>value(()=>!!current),name:()=>value(()=> 'Remote '+i),modulatedValue:()=>value(()=>0)})}),
      addDirectParameterIdObserver:cb=>{idCb=cb;},addDirectParameterNameObserver:(n,cb)=>{nameCb=cb;},
      addDirectParameterNormalizedValueObserver:cb=>{numCb=cb;},
      addDirectParameterValueDisplayObserver:(n,cb)=>{displayCb=cb;return {setObservedParameterIds(ids){const selected=current;schedule(()=>{
        for(const p of selected?.params??[])if(ids.includes(p.id))displayCb(p.id,p.display);},50);}}}};
  }
  // Identity uses the same fixture objects across every bank and every nested chain.
  function chains(chain){chain.forEach(d=>{d.chain=chain;for(const c of [...(d.layers??[]),...(d.pads??[])])chains(c.devices);
    for(const c of Object.values(d.slots??{}))chains(c);});}
  data.tracks.forEach(t=>chains(t.devices));
  let cursorTrackNode=null;
  const ct={...track(()=>cursorTrackNode),selectChannel:t=>{cursorTrackNode=t._getNode();},name:()=>prop(()=>cursorTrackNode,'name',''),createCursorDevice:()=>cursorDevice()};
  const host={defineController(){},defineMidiPorts(){},createTransport:()=>({isPlaying:()=>value(()=>playing)}),
    createTrackBank:()=>bank(()=>data.tracks,track),createCursorTrack:()=>ct,
    getProject:()=>({getRootTrackGroup:()=>({createTrackBank:()=>bank(()=>data.roots,track)})}),
    getHostVersion:()=> 'mock 4.3.10',getHostApiVersion:()=>17,scheduleTask:schedule,showPopupNotification(){}};
  const context={host,loadAPI(){},CursorDeviceFollowMode:{FIRST_DEVICE:'FIRST_DEVICE'},println:line=>output.push(JSON.parse(line.replace('AWB_SET_MAPPER ',''))),Date,JSON,Math,isFinite};
  vm.createContext(context);vm.runInContext(source,context);
  // Exercise the parameter pass's persistent-cache reader against the same full fixture.
  if(source.includes('function parameterPass()'))context.parameterPass=context.captureTracks;
  context.init();
  let iterations=0;
  while(tasks.length){assert.ok(iterations++<100000,'Scheduler did not terminate');tasks.sort((a,b)=>a.time-b.time||a.seq-b.seq);const task=tasks.shift();time=task.time;task.fn();}
  return {output,time};
}
const good=simulate();
assert.equal(good.output.at(-1).kind,'done',JSON.stringify(good.output.at(-1)));
const snapshot=good.output.find(r=>r.kind==='snapshot').data;
assert.equal(snapshot.tracks.length,19);assert.equal(snapshot.coverage.hierarchy,'observed');
assert.equal(snapshot.tracks[1].parent,'flat/0');assert.equal(snapshot.tracks[2].parent,'flat/0');assert.equal(snapshot.tracks[18].parent,null);
assert.equal(snapshot.tracks[0].parent,null);assert.equal(snapshot.tracks[0].parentStatus,'observed');
assert.ok(good.output.some(r=>r.kind==='hierarchy'&&r.data.edges.some(e=>e.role==='group_master_alias')));
assert.equal(snapshot.tracks[1].chain.items.length,11);assert.ok(snapshot.tracks[1].chain.items.every(d=>d.enabled===false));
assert.equal(snapshot.tracks[1].chain.items[10].parameters.items[0].normalized,0);
assert.equal(snapshot.tracks[1].sends.length,25);assert.equal(snapshot.tracks[1].sends[24].normalized,.5);
assert.equal(snapshot.tracks[1].chain.items[10].remoteControls.items[0].normalized,0);
assert.equal(snapshot.tracks[2].chain.items[0].layers.items.length,9);
const deep=snapshot.tracks[2].chain.items[0].layers.items[8].chain.items[0].slots.items[0].chain.items[0];
assert.equal(deep.enabled,false);assert.equal(deep.parameters.items[0].numericStatus,'unavailable');assert.equal(deep.parameters.items[0].display,'');
assert.equal(snapshot.tracks[8].chain.items[0].pads.items[0].chain.items.length,1);
assert.equal(snapshot.deviceCount,24);
if(source.includes('function parameterPass()')){
  const unchanged=simulate({changedCallbacksOnly:true}).output.find(r=>r.kind==='snapshot').data;
  assert.ok(unchanged.tracks[1].chain.items.every(d=>d.parameters.status==='observed'));
  assert.ok(unchanged.tracks[1].chain.items.every(d=>d.parameters.items[0].normalized===0));
}
const noIds=simulate({suppressIds:true}).output.find(r=>r.kind==='snapshot').data;
assert.equal(noIds.tracks[1].chain.items[0].parameters.status,'unresolved');
const running=simulate({playing:true});assert.equal(running.output.at(-1).kind,'aborted');assert.equal(running.output.filter(r=>r.kind==='track').length,0);
fs.writeFileSync(new URL('./fixture-capture.jsonl',import.meta.url),good.output.map(r=>JSON.stringify(r)).join('\n')+'\n');
console.log('Passed: whole-bank tracks, long chains, duplicate names, nested layers/slots/pads, object-identity hierarchy, disabled/zero/empty/NaN values, absent callbacks, playback abort. Mock proof only.');
