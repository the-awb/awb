// A second static-set pass. Uses the controller's observer cache as host state,
// rather than requiring fresh callbacks when IDs/names/numbers are unchanged.
function readMainCapture(){
  var Reader=Java.type('java.io.BufferedReader'), FileReader=Java.type('java.io.FileReader');
  var reader=new Reader(new FileReader('/private/tmp/bitwig-set-mapper-20261004/capture.jsonl'));
  var line, snapshot=null, sourceRun=null, complete=false;
  try{while((line=reader.readLine())!==null){var r=JSON.parse(String(line));
    if(r.kind==='init'){snapshot=null;sourceRun=r.run;complete=false;}
    if(r.kind==='snapshot'){snapshot=r.data;sourceRun=r.run;}
    if(r.kind==='done')complete=true;
    if(r.kind==='aborted')complete=false;
  }}finally{reader.close();}
  if(!complete||!snapshot)throw new Error('Main capture is not complete');
  return {run:sourceRun,snapshot:snapshot};
}
function parameterPass(){
  var source=readMainCapture(), selected=[], result=[];
  originalCount=source.snapshot.totalTracks;
  function walk(chain){chain.items.forEach(function(d){
    if(d.parameters&&d.parameters.status==='unresolved')selected.push(d);
    ['layers','pads','slots'].forEach(function(kind){
      if(d[kind])d[kind].items.forEach(function(c){walk(c.chain);});
    });
  });}
  source.snapshot.tracks.forEach(function(t){walk(t.chain);});
  emit('parameter-pass-start',{sourceRun:source.run,devices:selected.length,
    semantics:'Current host-observer caches after bounded cursor rebinding; unchanged fields retain values; static stopped set, not atomic'});
  var previousTrack=-1;
  series(selected,function(d,next){var index=d.locator[0].track;
    function captureOne(){navigate(d.locator,function(){
      var current=device(cursor,d.index);
      if(current.name!==d.name||current.position!==d.position||current.type!==d.type){abort('Parameter-pass locator no longer matches');return;}
      captureParameters(function(parameters){var record={locator:d.locator,name:d.name,type:d.type,parameters:parameters};
        result.push(record);emit('parameters',record);next();});
    });}
    if(previousTrack===index)captureOne();else selectTrackAt(index,function(){previousTrack=index;captureOne();});
  },function(){
    emit('snapshot',{sourceRun:source.run,items:result,coverage:'Follow-up for unresolved parameter fields using persistent host-observer caches'});
    emit('done',{devices:result.length});completed=true;stopped=true;
  });
}
