// One-shot template documentation. No musical writes, MIDI, network or services.
// Named cursors and bank scrolling only. All API proxies are created in init().
loadAPI(15);
host.defineController('AWB Investigation', 'One Shot Set Mapper', '0.2',
  '34912e2f-08a1-4b25-b0de-93ba1fa8910e', 'Willy / Codex');
host.defineMidiPorts(0, 0);
var OUTPUT = '/private/tmp/bitwig-set-mapper-20261004/capture.jsonl';
var LIMIT = {bank:8,sends:32,tracks:512,chain:256,layers:128,pads:128,
  depth:12,devices:4096,parameters:4096,displayPage:64,waitAttempts:12,
  waitMs:150,minimumWaitMs:450};
var flat, inspectTrack, cursor, anchor, anchorEquals, siblings, layerBank, padBank, childBank, rootBank;
var rootChains=[], layerChains=[], padChains=[], groupEquals=[], rootEquals=[];
var playing, trackEquals=[], ids=[], names={}, numbers={}, displays={};
var idsSeen=false, displayObserver, run, records=[], jobs=[], stopped=false, deviceCount=0;
var originalCount, startTime, parameterEpoch=0, completed=false, remotePage;
function mark(v){v.markInterested();return v;}
function finite(v){return typeof v==='number'&&isFinite(v)?v:null;}
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function array(v){var a=[];for(var i=0;i<v.length;i++)a.push(String(v[i]));return a;}
function emit(kind,data){
  var line=JSON.stringify({run:run,kind:kind,data:data});
  if(typeof Java!=='undefined'){
    var w=new (Java.type('java.io.FileWriter'))(OUTPUT,true);
    try{w.write(line+'\n');}finally{w.close();}
  }
  println('AWB_SET_MAPPER '+line);
}
function abort(reason){if(stopped)return;stopped=true;emit('aborted',{reason:reason,tracks:records.length,devices:deviceCount});}
function later(fn,ms){
  if(stopped)return;
  host.scheduleTask(function(){
    if(stopped)return;
    try{if(playing.get()!==false){abort('Playback is running; stop playback and reload this controller.');return;}fn();}
    catch(e){abort(String(e)+' '+(e.stack||''));}
  },ms===undefined?LIMIT.waitMs:ms);
}
// Equality is a settling heuristic for this fixed template, not a transactional host snapshot.
// Each navigation has a minimum wait. Failed predicates/timeouts never become observed data.
function settle(read,ready,done){
  var last=null, attempts=0, equal=0;
  later(function poll(){
    var value=read(), json=JSON.stringify(value);attempts++;
    equal=json===last?equal+1:0;last=json;
    if(ready(value)&&equal>=2){done(value);return;}
    if(attempts>=LIMIT.waitAttempts){abort('Observation timeout: '+json.slice(0,500));return;}
    later(poll);
  },LIMIT.minimumWaitMs);
}
function series(items,work,done){var i=0;function next(){if(stopped)return;if(i===items.length){done();return;}work(items[i++],next);}next();}
function markDevice(d){
  [d.exists(),d.name(),d.position(),d.deviceType(),d.isPlugin(),d.isEnabled(),
   d.isNested(),d.hasLayers(),d.hasDrumPads(),d.hasSlots(),d.slotNames(),
   d.sampleName(),d.presetName()].forEach(mark);
}
function device(d,index){return {index:index,name:d.name().get(),position:d.position().get(),
  type:d.deviceType().get(),plugin:d.isPlugin().get(),enabled:d.isEnabled().get(),
  nested:d.isNested().get(),hasLayers:d.hasLayers().get(),hasDrumPads:d.hasDrumPads().get(),
  hasSlots:d.hasSlots().get(),slotNames:array(d.slotNames().get()),
  sampleName:d.sampleName().get(),presetName:d.presetName().get()};}
function markDeviceBank(b){mark(b.itemCount());mark(b.scrollPosition());
  for(var i=0;i<LIMIT.bank;i++)markDevice(b.getItemAt(i));return b;}
function bankImage(b,read){var items=[];
  for(var i=0;i<LIMIT.bank;i++){var t=b.getItemAt(i);items.push(t.exists().get()?read(t,b.scrollPosition().get()+i):null);}
  return {offset:b.scrollPosition().get(),total:b.itemCount().get(),items:items};}
function readDeviceBank(b){return bankImage(b,device);}
function pageBank(b,offset,read,done){b.scrollPosition().set(offset);
  settle(function(){return read(b);},function(x){return x.offset===offset&&x.total>=0;},done);}
function collectBank(b,read,limit,done){var result={total:null,status:'observed',items:[]};
  function page(offset){pageBank(b,offset,read,function(x){
    if(result.total===null)result.total=x.total;
    if(result.total!==x.total){abort('Bank item count changed during capture');return;}
    x.items.forEach(function(item){if(item!==null&&item.index<limit)result.items.push(item);});
    if(x.total>limit)result.status='truncated';
    if(offset+LIMIT.bank<Math.min(x.total,limit)){page(offset+LIMIT.bank);return;}
    var expected=Math.min(x.total,limit);
    if(result.items.length!==expected){result.status='unresolved';result.reason='Some counted bank items did not exist';}
    done(result);
  });}page(0);
}
function track(t,index){var sends=[], sb=t.sendBank();
  for(var i=0;i<LIMIT.sends;i++){var s=sb.getItemAt(i);if(s.exists().get())sends.push({
    index:i,label:s.name().get(),normalized:finite(s.get()),display:s.displayedValue().get(),
    preFader:s.isPreFader().get(),mode:s.sendMode().get(),destination:null,destinationStatus:'unresolved'});}
  return {index:index,id:'flat/'+index,name:t.name().get(),position:t.position().get(),
    type:t.trackType().get(),isGroup:t.isGroup().get(),volume:{normalized:finite(t.volume().get()),display:t.volume().displayedValue().get()},
    pan:{normalized:finite(t.pan().get()),display:t.pan().displayedValue().get()},
    mute:t.mute().get(),solo:t.solo().get(),inputFlags:{audio:t.sourceSelector().hasAudioInputSelected().get(),note:t.sourceSelector().hasNoteInputSelected().get()},
    sendTotal:sb.itemCount().get(),sends:sends,sendStatus:sb.itemCount().get()>LIMIT.sends?'truncated':'observed',
    parent:null,parentStatus:'unresolved',routingStatus:'input/output destinations unavailable through generic API'};
}
function markTrack(t){[t.exists(),t.name(),t.position(),t.trackType(),t.isGroup(),t.volume(),
  t.volume().displayedValue(),t.pan(),t.pan().displayedValue(),t.mute(),t.solo(),
  t.sourceSelector().hasAudioInputSelected(),t.sourceSelector().hasNoteInputSelected(),t.sendBank().itemCount()].forEach(mark);
  for(var s=0;s<LIMIT.sends;s++){var send=t.sendBank().getItemAt(s);
    [send.exists(),send.name(),send,send.displayedValue(),send.isPreFader(),send.sendMode()].forEach(mark);}}
function clearParameters(){parameterEpoch++;ids=[];idsSeen=false;names={};numbers={};displays={};
  displayObserver.setObservedParameterIds([]);}
function selectDevice(d,done){clearParameters();cursor.selectDevice(d);
  settle(function(){return {exists:cursor.exists().get(),device:device(cursor,0),parametersReady:idsSeen};},
    function(x){return x.exists;},function(){done();});}
function selectTrackAt(index,done){var offset=Math.floor(index/LIMIT.bank)*LIMIT.bank,slot=index%LIMIT.bank;
  pageBank(flat,offset,function(b){return bankImage(b,track);},function(x){
    if(x.total!==originalCount){abort('Track count changed');return;}
    inspectTrack.selectChannel(flat.getItemAt(slot));
    settle(function(){return {match:trackEquals[slot].get(),name:inspectTrack.name().get()};},function(x){return x.match;},done);
  });}
function navigate(path,done){var first=path[0];
  pageBank(rootChains[first.track%LIMIT.bank],Math.floor(first.device/LIMIT.bank)*LIMIT.bank,readDeviceBank,function(){
    selectDevice(rootChains[first.track%LIMIT.bank].getItemAt(first.device%LIMIT.bank),function(){
      var k=1;function step(){if(k===path.length){done();return;}var p=path[k++];
        clearParameters();
        // GraalJS in Bitwig 4.3 cannot resolve the int/String overload from a JS number.
        if(p.kind==='layer')cursor['selectFirstInLayer(int)'](p.container);
        else if(p.kind==='pad')cursor.selectFirstInKeyPad(p.container);
        else cursor.selectFirstInSlot(p.container);
        settle(function(){return {exists:cursor.exists().get(),position:cursor.position().get(),total:siblings.itemCount().get()};},
          function(x){return x.exists&&x.position===0;},function(){
            pageBank(siblings,Math.floor(p.device/LIMIT.bank)*LIMIT.bank,readDeviceBank,function(){
              selectDevice(siblings.getItemAt(p.device%LIMIT.bank),step);
            });
          });
      }step();
    });
  });
}
function captureParameters(done){
  var epoch=parameterEpoch;
  if(!idsSeen){done({status:'unresolved',reason:'No direct ID callback after cursor rebind',total:null,items:[]});return;}
  var all=ids.slice(), selected=all.slice(0,LIMIT.parameters), result=[];
  var pages=[];for(var i=0;i<selected.length;i+=LIMIT.displayPage)pages.push(selected.slice(i,i+LIMIT.displayPage));
  series(pages,function(page,next){
    displays={};displayObserver.setObservedParameterIds(page);
    settle(function(){return page.map(function(id){return {id:id,
      name:own(names,id)?names[id]:null,nameStatus:own(names,id)?'observed':'unresolved',
      normalized:own(numbers,id)?finite(numbers[id]):null,
      numericStatus:!own(numbers,id)?'unresolved':finite(numbers[id])===null?'unavailable':'observed',
      display:own(displays,id)?displays[id]:null,displayStatus:own(displays,id)?'observed':'unresolved'};});},
      function(){return epoch===parameterEpoch;},function(items){result=result.concat(items);next();});
  },function(){var complete=result.every(function(p){return p.nameStatus==='observed'&&p.numericStatus!=='unresolved'&&p.displayStatus==='observed';});
    done({total:all.length,status:all.length>LIMIT.parameters?'truncated':complete?'observed':'unresolved',items:result});});
}
function remoteControls(){var items=[];
  for(var i=0;i<8;i++){var p=remotePage.getParameter(i);items.push({index:i,exists:p.exists().get(),
    name:p.name().get(),normalized:finite(p.get()),modulated:finite(p.modulatedValue().get()),display:p.displayedValue().get()});}
  return {status:'observed',pageNames:array(remotePage.pageNames().get()),pageCount:remotePage.pageCount().get(),
    selectedPageIndex:remotePage.selectedPageIndex().get(),name:remotePage.getName().get(),items:items,
    coverage:'Current API cursor page only; other pages not traversed, existing OSC page selection not independently read'};
}
function containers(b,chains,kind,path,node,done){
  collectBank(b,function(bank){return bankImage(bank,function(c,index){return {index:index,name:c.name().get()};});},
    kind==='pad'?LIMIT.pads:LIMIT.layers,function(result){
      var list=[];node[kind==='pad'?'pads':'layers']={total:result.total,status:result.status,items:list};
      // The chain proxies follow the current container bank window. Revisit each window.
      series(result.items,function(container,next){
        pageBank(b,Math.floor(container.index/LIMIT.bank)*LIMIT.bank,function(bank){return bankImage(bank,function(c,index){return {index:index,name:c.name().get()};});},function(){
          collectBank(chains[container.index%LIMIT.bank],readDeviceBank,LIMIT.chain,function(chain){
            container.chain=chain;list.push(container);
            chain.items.forEach(function(d){var p=path.concat([{kind:kind,container:container.index,device:d.index}]);
              d.locator=p;jobs.push({path:p,node:d});});next();
          });
        });
      },done);
    });
}
function visit(job,done){var node=job.node,path=job.path;
  if(path.length>LIMIT.depth||deviceCount>=LIMIT.devices){node.inspectionStatus='truncated';done();return;}
  navigate(path,function(){
    deviceCount++;node.inspectionStatus='observed';
    // Match against its own chain bank; positions are chain-relative, never stable IDs.
    var current=device(cursor,node.index);
    if(current.name!==node.name||current.position!==node.position||current.type!==node.type){abort('Device binding did not match queued locator');return;}
    captureParameters(function(parameters){node.parameters=parameters;node.remoteControls=remoteControls();
      function slots(){var namesOfSlots=node.slotNames.slice(), entries=[];
        node.slots={status:'observed',items:entries};
        series(namesOfSlots,function(name,next){
          navigate(path,function(){anchor.selectDevice(cursor);clearParameters();cursor.selectFirstInSlot(name);
            settle(function(){return {exists:cursor.exists().get(),sameAsParent:anchorEquals.get(),position:cursor.position().get(),total:siblings.itemCount().get()};},function(){return true;},function(x){
              if(x.sameAsParent){entries.push({name:name,chain:{total:null,status:'unresolved',reason:'Slot navigation retained its parent; empty or inaccessible',items:[]}});next();return;}
              if(!x.exists){entries.push({name:name,chain:{total:0,status:'observed',items:[]}});next();return;}
              if(x.position!==0){abort('Slot navigation did not reach first device: '+name);return;}
              collectBank(siblings,readDeviceBank,LIMIT.chain,function(chain){entries.push({name:name,chain:chain});
                chain.items.forEach(function(d){var p=path.concat([{kind:'slot',container:name,device:d.index}]);d.locator=p;jobs.push({path:p,node:d});});next();});
            });
          });
        },function(){emit('device',{track:path[0].track,locator:path,node:node});done();});
      }
      function pads(){if(!node.hasDrumPads){slots();return;}navigate(path,function(){containers(padBank,padChains,'pad',path,node,slots);});}
      if(node.hasLayers)containers(layerBank,layerChains,'layer',path,node,pads);else pads();
    });
  });
}
function captureTracks(){var page=0;
  function nextPage(){pageBank(flat,page,function(b){return bankImage(b,track);},function(image){
    if(originalCount===undefined){originalCount=image.total;emit('track-count',{total:originalCount});}
    if(image.total!==originalCount){abort('Track count changed');return;}
    var present=image.items.filter(function(t){return t!==null&&t.index<LIMIT.tracks;});
    series(present,function(t,nextTrack){
      records.push(t);inspectTrack.selectChannel(flat.getItemAt(t.index%LIMIT.bank));
      settle(function(){return trackEquals[t.index%LIMIT.bank].get();},function(v){return v;},function(){
        collectBank(rootChains[t.index%LIMIT.bank],readDeviceBank,LIMIT.chain,function(chain){t.chain=chain;jobs=[];
          chain.items.forEach(function(d){var path=[{track:t.index,device:d.index}];d.locator=path;jobs.push({path:path,node:d});});
          function process(){if(!jobs.length){emit('track',t);nextTrack();return;}visit(jobs.shift(),process);}process();
        });
      });
    },function(){page+=LIMIT.bank;if(page<Math.min(originalCount,LIMIT.tracks))nextPage();else captureHierarchy();});
  });}nextPage();
}
function readChildren(b){return bankImage(b,function(t,index){return {index:index,name:t.name().get(),matches:[]};});}
function hierarchyFor(owner,b,matrix,done){
  collectBank(b,readChildren,LIMIT.tracks,function(result){var edges=[];
    var offsets=[];for(var n=0;n<Math.min(result.total,LIMIT.tracks);n+=LIMIT.bank)offsets.push(n);
    series(offsets,function(offset,nextPage){
      pageBank(b,offset,readChildren,function(children){var page=0,matches=[];
        for(var k=0;k<LIMIT.bank;k++)matches[k]=[];
        function search(){pageBank(flat,page,function(bank){var image=bankImage(bank,track);image.matches=[];
          for(var k=0;k<LIMIT.bank;k++){image.matches[k]=[];for(var j=0;j<LIMIT.bank;j++)image.matches[k].push(matrix[k][j].get());}return image;},function(image){
          if(image.total!==originalCount){abort('Track count changed during hierarchy capture');return;}
          for(var k=0;k<LIMIT.bank;k++)for(var j=0;j<LIMIT.bank;j++)if(image.matches[k][j])matches[k].push(page+j);
          page+=LIMIT.bank;if(page<Math.min(originalCount,LIMIT.tracks)){search();return;}
          children.items.forEach(function(child,k){if(!child)return;var found=matches[k];
          var edge={childIndex:child.index,label:child.name,flatIndices:found,status:found.length===1?'observed':'unresolved'};edges.push(edge);
          if(found.length===1){var t=records.filter(function(t){return t.index===found[0];})[0];
            if(t&&t.id===owner){edge.role='group_master_alias';}
            else if(t){if(t.parentStatus==='observed'&&t.parent!==owner){t.parentStatus='unresolved';t.parent=null;}
            else{t.parent=owner;t.parentStatus='observed';}}}});nextPage();
        });}search();
      });
    },function(){emit('hierarchy',{owner:owner,total:result.total,status:result.status,edges:edges});done();});
  });
}
function captureHierarchy(){
  hierarchyFor(null,rootBank,rootEquals,function(){
    series(records.filter(function(t){return t.isGroup;}),function(t,next){
      selectTrackAt(t.index,function(){hierarchyFor(t.id,childBank,groupEquals,next);});
    },finish);
  });
}
function finish(){
  emit('snapshot',{schemaVersion:1,source:{templateInstanceOf:'awb 5.2 (ef script)',
    association:'human-confirmed',instanceFilePath:null,instanceFileHash:null},
    host:{version:host.getHostVersion(),api:host.getHostApiVersion()},limits:LIMIT,
    tracks:records,totalTracks:originalCount,deviceCount:deviceCount,
    coverage:{tracks:records.length===originalCount?'observed':'truncated',
      hierarchy:records.every(function(t){return t.parentStatus==='observed';})?'observed':'unresolved',
      routing:'Generic input/output and verified send destinations unavailable; manual annotation required',
      modulation:'Assignment targets and amounts unavailable through generic API',
      pluginVersions:'unavailable',remotePages:'Current page and page names observed; remaining pages unimplemented',
      coherence:'Static stopped template; bounded host-cache settling; no atomic snapshot or UI comparison claimed'},
    durationMs:new Date().getTime()-startTime});
  emit('done',{tracks:records.length,devices:deviceCount});completed=true;stopped=true;
  host.showPopupNotification('AWB capture complete: '+records.length+' tracks, '+deviceCount+' devices');
}
function init(){
  run=String(new Date().getTime());startTime=new Date().getTime();playing=mark(host.createTransport().isPlaying());
  flat=host.createTrackBank(LIMIT.bank,LIMIT.sends,0,true);mark(flat.itemCount());mark(flat.scrollPosition());
  inspectTrack=host.createCursorTrack('AWBSetMapperTrack','AWB inspection',0,0,false);
  mark(inspectTrack.name());
  cursor=inspectTrack.createCursorDevice('AWBSetMapperDevice','AWB inspection',0,CursorDeviceFollowMode.FIRST_DEVICE);
  markDevice(cursor);mark(cursor.isPinned());cursor.isPinned().set(true);
  anchor=inspectTrack.createCursorDevice('AWBSetMapperAnchor','AWB slot parent',0,CursorDeviceFollowMode.FIRST_DEVICE);
  mark(anchor.isPinned());anchor.isPinned().set(true);anchorEquals=mark(cursor.createEqualsValue(anchor));
  remotePage=cursor.createCursorRemoteControlsPage(8);
  [remotePage.pageNames(),remotePage.pageCount(),remotePage.selectedPageIndex(),remotePage.getName()].forEach(mark);
  for(var r=0;r<8;r++){var p=remotePage.getParameter(r);[p.exists(),p.name(),p,p.modulatedValue(),p.displayedValue()].forEach(mark);}
  siblings=markDeviceBank(cursor.createSiblingsDeviceBank(LIMIT.bank));
  layerBank=cursor.createLayerBank(LIMIT.bank);padBank=cursor.createDrumPadBank(LIMIT.bank);
  childBank=inspectTrack.createTrackBank(LIMIT.bank,0,0,false);
  rootBank=host.getProject().getRootTrackGroup().createTrackBank(LIMIT.bank,0,0,false);
  [layerBank,padBank,childBank,rootBank].forEach(function(b){mark(b.itemCount());mark(b.scrollPosition());});
  for(var i=0;i<LIMIT.bank;i++){
    var t=flat.getItemAt(i);markTrack(t);rootChains.push(markDeviceBank(t.createDeviceBank(LIMIT.bank)));
    trackEquals.push(mark(t.createEqualsValue(inspectTrack)));
    [layerBank,padBank].forEach(function(b){var c=b.getItemAt(i);mark(c.exists());mark(c.name());});
    layerChains.push(markDeviceBank(layerBank.getItemAt(i).createDeviceBank(LIMIT.bank)));
    padChains.push(markDeviceBank(padBank.getItemAt(i).createDeviceBank(LIMIT.bank)));
    [childBank,rootBank].forEach(function(b){var c=b.getItemAt(i);mark(c.exists());mark(c.name());});
    groupEquals[i]=[];rootEquals[i]=[];
    for(var j=0;j<LIMIT.bank;j++){
      groupEquals[i].push(mark(childBank.getItemAt(i).createEqualsValue(flat.getItemAt(j))));
      rootEquals[i].push(mark(rootBank.getItemAt(i).createEqualsValue(flat.getItemAt(j))));
    }
  }
  cursor.addDirectParameterIdObserver(function(all){ids=array(all);idsSeen=true;names={};numbers={};displays={};});
  displayObserver=cursor.addDirectParameterValueDisplayObserver(512,function(id,value){displays[String(id)]=String(value);});
  cursor.addDirectParameterNameObserver(512,function(id,value){names[String(id)]=String(value);});
  cursor.addDirectParameterNormalizedValueObserver(function(id,value){numbers[String(id)]=Number(value);});
  emit('init',{hostVersion:host.getHostVersion(),api:host.getHostApiVersion(),limits:LIMIT,
    sideEffects:'Independent named cursors and bank scrolling; no editor selection or musical state writes',
    target:'Human-confirmed open instance of awb 5.2 (ef script)'});
  later(captureTracks,2000);
}
function flush(){}
function exit(){if(run)emit('exit',{complete:completed});stopped=true;}
