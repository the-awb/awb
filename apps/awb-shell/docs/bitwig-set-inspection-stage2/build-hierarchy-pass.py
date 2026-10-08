from pathlib import Path
root=Path(__file__).parent
source=(root/'AWBSetMapper.control.js').read_text().replace("/capture.jsonl'", "/hierarchy-pass.jsonl'")
source=source.replace('later(captureTracks,2000);', '''supplementGroupFx=inspectTrack.createEffectTrackBank(LIMIT.bank,0,false);
  supplementRootFx=host.getProject().getRootTrackGroup().createEffectTrackBank(LIMIT.bank,0,false);
  supplementMaster=host.createMasterTrack(0);
  [supplementGroupFx,supplementRootFx].forEach(function(b){mark(b.itemCount());mark(b.scrollPosition());});
  mark(supplementMaster.exists());mark(supplementMaster.name());
  for(var i=0;i<LIMIT.bank;i++){
    supplementGroupEquals[i]=[];supplementRootEquals[i]=[];
    [supplementGroupFx,supplementRootFx].forEach(function(b){mark(b.getItemAt(i).exists());mark(b.getItemAt(i).name());});
    supplementMasterEquals.push(mark(supplementMaster.createEqualsValue(flat.getItemAt(i))));
    for(var j=0;j<LIMIT.bank;j++){
      supplementGroupEquals[i].push(mark(supplementGroupFx.getItemAt(i).createEqualsValue(flat.getItemAt(j))));
      supplementRootEquals[i].push(mark(supplementRootFx.getItemAt(i).createEqualsValue(flat.getItemAt(j))));
    }
  }
  later(hierarchySupplement,2000);''')
source+='''
var supplementGroupFx,supplementRootFx,supplementMaster,supplementGroupEquals=[],supplementRootEquals=[],supplementMasterEquals=[];
'''
tail=(root/'parameter-pass-tail.js').read_text();source+='\n'+tail[:tail.index('function parameterPass()')]
source+='''
function hierarchySupplement(){
  var source=readMainCapture();records=source.snapshot.tracks;originalCount=source.snapshot.totalTracks;
  emit('hierarchy-pass-start',{sourceRun:source.run,purpose:'Explicit group/root effect banks and root master identity'});
  hierarchyFor(null,supplementRootFx,supplementRootEquals,function(){
    series(records.filter(function(t){return t.isGroup;}),function(t,next){
      selectTrackAt(t.index,function(){hierarchyFor(t.id,supplementGroupFx,supplementGroupEquals,next);});
    },function(){var offset=0,matched=[];
      function page(){pageBank(flat,offset,function(b){var image=bankImage(b,track);image.masterMatches=[];
        for(var j=0;j<LIMIT.bank;j++)image.masterMatches.push(supplementMasterEquals[j].get());return image;
      },function(image){
        if(image.total!==originalCount){abort('Track count changed in master hierarchy supplement');return;}
        image.masterMatches.forEach(function(equal,j){if(equal)matched.push(offset+j);});offset+=LIMIT.bank;
        if(offset<originalCount){page();return;}
        if(matched.length===1){var t=records.filter(function(t){return t.index===matched[0];})[0];
          if(t.parentStatus!=='observed'||t.parent===null){t.parent=null;t.parentStatus='observed';}
        }
        emit('master-identity',{name:supplementMaster.name().get(),flatIndices:matched,status:matched.length===1?'observed':'unresolved'});
        emit('snapshot',{sourceRun:source.run,parents:records.map(function(t){return {id:t.id,name:t.name,parent:t.parent,parentStatus:t.parentStatus};}),
          coverage:'Explicit effect banks and root master identity, joined by createEqualsValue; static stopped set'});
        emit('done',{tracks:records.length,unresolved:records.filter(function(t){return t.parentStatus!=='observed';}).length});completed=true;stopped=true;
      });}page();
    });
  });
}
'''
(root/'AWBHierarchyPass.control.js').write_text(source)
