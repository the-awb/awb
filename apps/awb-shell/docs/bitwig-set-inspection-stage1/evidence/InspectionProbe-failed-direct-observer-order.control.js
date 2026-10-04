// Disposable compatibility witness for Bitwig 4.3.10. Not a production inspector.
// No MIDI, network, playback, project writes, parameter writes or UI selection.
// Writes only its JSON evidence to the fixed local path below.
// Captures at most two windows of eight tracks and twelve devices per track.
loadAPI(15);
host.defineController('AWB Investigation', 'Read Only Inspection Probe', '0.1',
  '5319f9e5-c70e-4d1c-bc62-f642973c1e2a', 'Willy / Codex');
host.defineMidiPorts(0, 0);
var bank, cursor, layerBank, slot, slotBank, playing;
var chains = [], parents = [], ids = [], names = {}, values = {}, displays = {};
var displayObserver, last, attempt = 0, page = 0, run;
function mark(value) { value.markInterested(); return value; }
function log(kind, data) {
  var record=JSON.stringify({run:run,kind:kind,data:data});
  println('AWB_INSPECTION_PROBE ' + record);
  if(typeof Java==='undefined')return; // Offline interface harness, never host proof.
  var writer=new (Java.type('java.io.FileWriter'))('/private/tmp/bitwig-set-inspection-20261004/evidence/live-probe.jsonl',true);
  try {writer.write(record+'\n');} finally {writer.close();}
}
function markDevice(d) {
  [d.exists(),d.name(),d.position(),d.deviceType(),d.isPlugin(),d.isEnabled(),
   d.isNested(),d.hasLayers(),d.hasDrumPads(),d.hasSlots(),d.slotNames(),d.sampleName(),d.presetName()].forEach(mark);
}
function device(d, index) {
  return {index:index,exists:d.exists().get(),name:d.name().get(),position:d.position().get(),
    type:d.deviceType().get(),plugin:d.isPlugin().get(),enabled:d.isEnabled().get(),nested:d.isNested().get(),
    hasLayers:d.hasLayers().get(),hasDrumPads:d.hasDrumPads().get(),hasSlots:d.hasSlots().get(),
    slotNames:d.slotNames().get(),sampleName:d.sampleName().get(),presetName:d.presetName().get()};
}
function devices(b) {
  var result=[];
  for(var i=0;i<12;i++) if(b.getItemAt(i).exists().get()) result.push(device(b.getItemAt(i),i));
  return {total:b.itemCount().get(),offset:b.scrollPosition().get(),limit:12,
    truncated:b.itemCount().get()>12,devices:result};
}
function init() {
  run=String(new Date().getTime());
  playing=mark(host.createTransport().isPlaying());
  bank=host.createTrackBank(8,8,0,true);
  mark(bank.itemCount());mark(bank.scrollPosition());
  for(var i=0;i<8;i++) {
    var t=bank.getItemAt(i);
    [t.exists(),t.name(),t.position(),t.trackType(),t.isGroup(),t.volume(),t.volume().displayedValue(),
     t.mute(),t.sourceSelector().hasAudioInputSelected(),t.sourceSelector().hasNoteInputSelected()].forEach(mark);
    var p=t.createParentTrack(0,0);[p.exists(),p.name(),p.position()].forEach(mark);parents.push(p);
    var b=t.createDeviceBank(12);mark(b.itemCount());mark(b.scrollPosition());chains.push(b);
    for(var j=0;j<12;j++) markDevice(b.getItemAt(j));
    for(var s=0;s<8;s++) {
      var send=t.sendBank().getItemAt(s);
      [send.exists(),send.name(),send,send.displayedValue(),send.isPreFader(),send.sendMode()].forEach(mark);
    }
  }
  cursor=host.createEditorCursorDevice(0);markDevice(cursor);
  layerBank=cursor.createLayerBank(8);mark(layerBank.itemCount());
  for(var k=0;k<8;k++) {var layer=layerBank.getItemAt(k);[layer.exists(),layer.name()].forEach(mark);}
  slot=cursor.getCursorSlot();mark(slot.exists());mark(slot.name());
  slotBank=slot.createDeviceBank(12);mark(slotBank.itemCount());mark(slotBank.scrollPosition());
  for(var n=0;n<12;n++) markDevice(slotBank.getItemAt(n));
  displayObserver=cursor.addDirectParameterValueDisplayObserver(256,function(id,value){displays[String(id)]=String(value);});
  cursor.addDirectParameterIdObserver(function(all){
    ids=[];for(var q=0;q<all.length;q++)ids.push(String(all[q]));
    names={};values={};displays={};displayObserver.setObservedParameterIds(ids.slice(0,16));
  });
  cursor.addDirectParameterNameObserver(256,function(id,value){names[String(id)]=String(value);});
  cursor.addDirectParameterNormalizedValueObserver(function(id,value){values[String(id)]=Number(value);});
  log('init',{api:host.getHostApiVersion(),hostVersion:host.getHostVersion(),limits:{tracksPerWindow:8,maxWindows:2,devicesPerChain:12,sends:8,layers:8,directParameters:16},
    sideEffects:'bank window navigation only; no UI selection or musical state writes'});
  host.scheduleTask(capture,2000);
}
function snapshot() {
  var tracks=[];
  for(var i=0;i<8;i++) {
    var t=bank.getItemAt(i);if(!t.exists().get())continue;
    var sends=[];
    for(var s=0;s<8;s++) {
      var send=t.sendBank().getItemAt(s);if(!send.exists().get())continue;
      sends.push({index:s,label:send.name().get(),normalized:send.get(),display:send.displayedValue().get(),
        preFader:send.isPreFader().get(),mode:send.sendMode().get(),destinationStatus:'unresolved: label is not a verified edge'});
    }
    var p=parents[i];
    tracks.push({bankIndex:i,position:t.position().get(),name:t.name().get(),type:t.trackType().get(),isGroup:t.isGroup().get(),
      parent:p.exists().get()?{name:p.name().get(),position:p.position().get()}:null,
      volume:{normalized:t.volume().get(),display:t.volume().displayedValue().get()},mute:t.mute().get(),
      inputFlags:{audio:t.sourceSelector().hasAudioInputSelected().get(),note:t.sourceSelector().hasNoteInputSelected().get()},
      routingStatus:'input/output destinations unresolved',sends:sends,chain:devices(chains[i])});
  }
  var layers=[];
  for(var k=0;k<8;k++) {var l=layerBank.getItemAt(k);if(l.exists().get())layers.push({index:k,name:l.name().get()});}
  var params=[];
  for(var n=0;n<Math.min(ids.length,16);n++) {
    var id=ids[n],v=values[id];
    params.push({id:id,name:names[id]===undefined?null:names[id],normalized:typeof v==='number'&&isFinite(v)?v:null,
      numericStatus:v===undefined?'not_observed':isFinite(v)?'observed':'unavailable',
      display:displays[id]===undefined?null:displays[id]});
  }
  return {offset:bank.scrollPosition().get(),total:bank.itemCount().get(),tracks:tracks,
    selectedDevice:{device:device(cursor,cursor.position().get()),layerTotal:layerBank.itemCount().get(),layers:layers,
      slot:{exists:slot.exists().get(),name:slot.name().get(),chain:devices(slotBank)},
      parameterTotal:ids.length,parameterLimit:16,parameters:params}};
}
function capture() {
  if(playing.get()!==false) {log('aborted',{reason:'Stop playback before inspecting'});return;}
  if(page===1&&bank.scrollPosition().get()!==8) {
    attempt++;
    if(attempt<8){host.scheduleTask(capture,500);return;}
    log('unsettled',{page:page,reason:'Requested bank offset 8 was not observed'});return;
  }
  var result=snapshot(),serialized=JSON.stringify(result);attempt++;
  if(serialized!==last) {
    last=serialized;
    if(attempt<8){host.scheduleTask(capture,500);return;}
    log('unsettled',{page:page,attempts:attempt,reason:'No consecutive equal snapshots within bounded wait'});return;
  }
  log('window',{page:page,attempts:attempt,settling:'two consecutive equal host-cache snapshots; inspect against host UI',snapshot:result});
  if(page===0&&result.total>8) {
    page=1;last=null;attempt=0;bank.scrollPosition().set(8);host.scheduleTask(capture,2000);return;
  }
  log('done',{windows:page+1,total:result.total,truncated:result.total>16,needsUIComparison:true});
}
function flush() {}
function exit() { log('exit',{}); }
