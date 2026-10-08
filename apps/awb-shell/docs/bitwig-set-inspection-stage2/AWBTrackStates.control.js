// Short second pass after the main map. Same controller identity for automatic reload.
// Separate evidence file; no editor selection or musical writes.
loadAPI(15);
host.defineController('AWB Investigation', 'One Shot Set Mapper', '0.2',
  '34912e2f-08a1-4b25-b0de-93ba1fa8910e', 'Willy / Codex');
host.defineMidiPorts(0,0);
var bank,effectBank,playing,run,done=false,offset=0,total,items=[],last=null,equal=0,attempts=0;
var effectOffset=0,effectTotal,effectItems=[],pro2Fixed,pro2Fx,masterFx,controllerTargetSet=false;
function mark(v){v.markInterested();return v;}
function emit(kind,data){var line=JSON.stringify({run:run,kind:kind,data:data});
  println('AWB_TRACK_STATES '+line);if(typeof Java==='undefined')return;
  var w=new (Java.type('java.io.FileWriter'))('/private/tmp/bitwig-set-mapper-20261004/track-states.jsonl',true);
  try{w.write(line+'\n');}finally{w.close();}}
function init(){run=String(new Date().getTime());playing=mark(host.createTransport().isPlaying());
  bank=host.createTrackBank(8,0,0,true);mark(bank.itemCount());mark(bank.scrollPosition());
  effectBank=host.createEffectTrackBank(8,0);mark(effectBank.itemCount());mark(effectBank.scrollPosition());
  for(var i=0;i<8;i++){var t=bank.getItemAt(i);
    [t.exists(),t.name(),t.isActivated(),t.arm(),t.monitorMode(),t.mute(),t.volume(),t.pan()].forEach(mark);
    var fx=effectBank.getItemAt(i);[fx.exists(),fx.name()].forEach(mark);}
  pro2Fixed=host.createTrackBank(1,0,0,true);mark(pro2Fixed.itemCount());mark(pro2Fixed.scrollPosition());mark(pro2Fixed.getItemAt(0).name());
  pro2Fx=pro2Fixed.getItemAt(0).createDeviceBank(8);masterFx=host.createMasterTrack(0).createDeviceBank(8);
  var uuid=typeof Java==='undefined'?'a0913b7f-096b-4ac9-bddd-33c775314b42':Java.type('java.util.UUID').fromString('a0913b7f-096b-4ac9-bddd-33c775314b42');
  var matcher=host.createBitwigDeviceMatcher(uuid);
  [pro2Fx,masterFx].forEach(function(b){b.setDeviceMatcher(matcher);mark(b.itemCount());mark(b.scrollPosition());for(var i=0;i<8;i++){var d=b.getItemAt(i);mark(d.exists());mark(d.name());}});
  emit('init',{hostVersion:host.getHostVersion(),api:host.getHostApiVersion(),purpose:'Activation/arm/monitor state supplement'});
  bank.scrollPosition().set(0);host.scheduleTask(capture,1000);}
function capture(){if(done)return;
  if(playing.get()!==false){emit('aborted',{reason:'Playback is running'});done=true;return;}
  var frame={offset:bank.scrollPosition().get(),total:bank.itemCount().get(),tracks:[]};
  for(var i=0;i<8;i++){var t=bank.getItemAt(i);if(t.exists().get())frame.tracks.push({index:frame.offset+i,
    name:t.name().get(),activated:t.isActivated().get(),armed:t.arm().get(),monitorMode:t.monitorMode().get(),
    mute:t.mute().get(),volume:t.volume().get(),pan:t.pan().get()});}
  var s=JSON.stringify(frame);equal=s===last?equal+1:0;last=s;attempts++;
  if(frame.offset!==offset||equal<2){if(attempts>=12){emit('aborted',{reason:'Track state bank did not settle',frame:frame});done=true;return;}host.scheduleTask(capture,150);return;}
  if(total===undefined)total=frame.total;
  if(frame.total!==total||total>512){emit('aborted',{reason:'Track count changed or exceeded 512'});done=true;return;}
  items=items.concat(frame.tracks);emit('track-state-bank',{offset:offset,tracks:frame.tracks.length});offset+=8;
  if(offset<total){bank.scrollPosition().set(offset);last=null;equal=0;attempts=0;host.scheduleTask(capture,450);return;}
  last=null;equal=0;attempts=0;effectBank.scrollPosition().set(0);host.scheduleTask(captureEffects,450);}
function captureEffects(){if(done)return;
  if(!controllerTargetSet){controllerTargetSet=true;pro2Fixed.scrollPosition().set(5);host.scheduleTask(captureEffects,450);return;}
  if(playing.get()!==false){emit('aborted',{reason:'Playback is running'});done=true;return;}
  var frame={offset:effectBank.scrollPosition().get(),total:effectBank.itemCount().get(),tracks:[],controllerTargets:readControllerTargets()};
  for(var i=0;i<8;i++){var t=effectBank.getItemAt(i);if(t.exists().get())frame.tracks.push({index:frame.offset+i,name:t.name().get()});}
  var s=JSON.stringify(frame);equal=s===last?equal+1:0;last=s;attempts++;
  if(frame.offset!==effectOffset||frame.controllerTargets.pro2Track.offset!==5||equal<2){if(attempts>=12){emit('aborted',{reason:'Effect bank did not settle'});done=true;return;}host.scheduleTask(captureEffects,150);return;}
  if(effectTotal===undefined)effectTotal=frame.total;
  if(frame.total!==effectTotal||effectTotal>512){emit('aborted',{reason:'Effect-bank count changed or exceeded 512'});done=true;return;}
  effectItems=effectItems.concat(frame.tracks);emit('effect-bank',{offset:effectOffset,tracks:frame.tracks.length});effectOffset+=8;
  if(effectOffset<effectTotal){effectBank.scrollPosition().set(effectOffset);last=null;equal=0;attempts=0;host.scheduleTask(captureEffects,450);return;}
  emit('snapshot',{totalTracks:total,tracks:items,controllerTargets:frame.controllerTargets,effectBank:{total:effectTotal,tracks:effectItems},coverage:'Stopped static-set supplement, three equal cache reads per bank'});
  emit('done',{tracks:items.length,effectTracks:effectItems.length});done=true;}
function readControllerTargets(){
  function filtered(b){var names=[];for(var i=0;i<8;i++)if(b.getItemAt(i).exists().get())names.push({index:i,name:b.getItemAt(i).name().get()});return {total:b.itemCount().get(),items:names};}
  return {matcherUUID:'a0913b7f-096b-4ac9-bddd-33c775314b42',pro2Track:{offset:pro2Fixed.scrollPosition().get(),name:pro2Fixed.getItemAt(0).name().get(),fxLayers:filtered(pro2Fx)},masterFxLayers:filtered(masterFx)};
}
function flush(){}
function exit(){if(run)emit('exit',{complete:done});done=true;}
