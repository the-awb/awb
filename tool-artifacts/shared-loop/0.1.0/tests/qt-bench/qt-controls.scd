// Loaded only by the isolated fixture. Never reads Node-owned scope indices.
{
 |server, controlBus, audioBus|
 var windows=List.new, views=List.new, buffers=List.new, writer;
 var currentKind="none", currentMode="none", currentLayout="none", currentCount=0, currentFrames=0;
 var close={
  views.do({|view| view.stop}); windows.do({|win|win.close});views.clear;windows.clear;
  if(writer.notNil){writer.free;writer=nil};server.sync;
  buffers.do({|buf|buf.free});buffers.clear;
 };
 OSCdef(\qtBenchShow,{|msg,time,addr|
  Routine({
   var kind=msg[1].asString, mode=msg[2].asString, layout=msg[3].asString, count=msg[4].asInteger;
   var frames, nViews, nWindows, colors=["6ce0c1","ffb276","80bcff","ed97bd","b5df85","bbabff"].collect({|hex|Color.fromHexString(hex)});
   var rate=if(kind=="control"){server.sampleRate/server.options.blockSize}{server.sampleRate};
   close.value;
   currentKind=kind;currentMode=mode;currentLayout=layout;currentCount=count;
   if(kind!="none"){
    frames=if(kind=="control"){if(mode=="short"){32}{2048}}{if(mode=="short"){1024}{16384}};
    currentFrames=frames;nViews=if(layout=="shared"){1}{count};nWindows=if(layout=="windows"){count}{1};
    nViews.do({buffers.add(ScopeBuffer.alloc(server,if(layout=="shared"){count}{1}))});
    SynthDef(\qtBenchWriter,{
     var data=if(kind=="control"){In.kr(controlBus.index,6)}{In.ar(audioBus.index,6)};
     buffers.do({|buf,index|
      var signal=if(layout=="shared"){data.copyRange(0,count-1)}{data[index]};
      if(kind=="control"){ScopeOut2.kr(signal,buf.index,frames,frames)}{ScopeOut2.ar(signal,buf.index,frames,frames)};
     });
    }).add;server.sync;
    writer=Synth(\qtBenchWriter,[],RootNode(server),\addToTail);server.sync;
    nWindows.do({|index|
     var height=if(layout=="windows"){400+(240/count)}{640};
     var win=Window("Qt "++kind++" "++mode++" "++layout,Rect(20+((index%3)*740),40+((index.div(3))*500),720,height)).background_(Color.fromHexString("0b1213")).front;
     StaticText(win,Rect(30,20,660,30)).string_("Native Qt ScopeView · "++kind++" · "++mode).stringColor_(Color.white);
     StaticText(win,Rect(30,55,660,30)).string_("Fresh captures "++(rate/frames).round(0.001)++" Hz · poll 33 ms · "++((frames/rate)*1000).round(0.01)++" ms span").stringColor_(Color.grey(0.7));
     if(layout=="windows"){
      var view=ScopeView(win,Rect(42,130,620,240/count));views.add(view);
     }{
      if(layout=="shared"){views.add(ScopeView(win,Rect(42,130,620,240)))}{
       count.do({|ch|views.add(ScopeView(win,Rect(42,130+(ch*(240/count)),620,240/count)))})
      };
     };
     StaticText(win,Rect(30,if(layout=="windows"){155+(240/count)}{395},660,45)).string_("Same SC signals; private ScopeBuffers\n"++if(mode=="wide"){"Long completed capture; no rolling history"}{"Short completed capture"}).stringColor_(Color.grey(0.7));
     windows.add(win);
    });
    views.do({|view,index|
     view.server=server;view.bufnum=buffers[index].index;view.style=0;view.fill=false;view.yZoom=0.8;
     view.background=Color.fromHexString("101b1d");view.waveColors=if(layout=="shared"){colors.copyRange(0,count-1)}{[colors[index]]};
     view.setProperty(\updateInterval,33);view.start;
    });
   };
   addr.sendMsg('/bench/qt/ready',kind,mode,layout,count,views.size,windows.size,frames ? 0);
  }).play(AppClock);
 },'/bench/qt/show');
 OSCdef(\qtBenchInspect,{|msg,time,addr|
  {
   var prefix=msg[1].asString, area=views.sum({|view|view.bounds.width*view.bounds.height}) ? 0;
   views.do({|view,index|Image.fromWindow(view,Rect(0,0,view.bounds.width,view.bounds.height)).write(prefix++"-plot-"++index++".png","png")});
   if(windows.notEmpty){Image.fromWindow(windows[0]).write(prefix++"-window.png","png")};
   addr.sendMsg('/bench/qt/inspected',prefix,views.size,windows.size,area,currentFrames,
    *views.collect({|view|view.getProperty(\updateInterval)}));
  }.defer;
 },'/bench/qt/inspect');
}
