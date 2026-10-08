from pathlib import Path
import subprocess,os,json,time,shutil,socket
root=Path(__file__).resolve().parents[4];out=Path(os.environ.get('AWB_MIGRATION_EVIDENCE','/private/tmp/awb-migration-functional'));out.mkdir(exist_ok=True)
class_build=out/'class-library'
subprocess.run(['python3',str(root/'apps/live-set/sc/test-run.py'),'--output',str(class_build)],check=True)
lock=Path('/private/tmp/awb-audio-hardware-test.lock');lock.mkdir()
owner={'owner':'AWB live-set migration','pid':os.getpid(),'useMode':'exclusive-resource-functional','exclusiveResources':['private test engine','MOTU audio device'],'quietMachine':False,'sampleRate':44100,'scBlock':256,'hardwareBuffer':512,'output':'silent: physical inputs disconnected','evidence':str(out)}
(lock/'owner.json').write_text(json.dumps(owner))
with (root/'apps/awb-shell/docs/audio-testing-coordination.md').open('a') as f:f.write('\nLiveSet migration functional reservation: '+json.dumps(owner)+'\n')
for p in (root/'apps/live-set/LiveSet').iterdir():
 if p.is_file():shutil.copy2(p,out/p.name)
p=out/'BaseLaunch with efKR.scd';code=p.read_text().replace('~awbSet.gui = true;','~awbSet.gui = false;').replace('~awbSet.physicalInputs = ~awbLivePhysicalInputs ? true;','~awbSet.physicalInputs = false;')
code=code[:code.rfind('~awbSet.launch')]+'''~awbSet.launch(nil,{|base,set|
    Routine({
        var check,reads=List.new,checks=0,source,parameter,done=false,actual,error,remote,midiOutput,entry;
        check={|ok,label|if(ok.not){Error("FAIL "++label).throw};checks=checks+1;("PASS "++label).postln};
        try{
            base.rack.masterGroup.set(\\level,0);2.wait;check.value(base.rack.ready and:{base.liveDelays.ready},"owned rack, chains and four delay cells boot");
            check.value(base.followers.size==28,"25 rack followers plus 3 instrument followers registered");
            check.value(base.rack.slotAt(\\c1)[\\consumers].size==3,"C1 existing followers reused without duplication");
            check.value(base.blenders.size==42,"all 42 active BaseLaunch blenders reconstructed");
            check.value(base.namedParameters.values.every{|p|p.pendingModulationCount==0},"all registered modulation connections settled");
            ("MODULATION_COUNT="++base.modulationRegistry.connections.size).postln;base.modulationRegistry.content.postln;check.value(base.modulationRegistry.connections.size==57 and:{base.modulationRegistry.connections.every{|c|c[\\status]==\\connected}},"all 57 expected modulation routes connected");
            check.value(base.modulationRegistry.sources.size==94,"all 94 modulation producers registered");
            check.value(base.t[\\deci].p[\\depthSc].param===base.t[\\deci].p[\\depthOf],"Deci depth base and amount share one processor");
            check.value(base.t[\\deci].p[\\foldSc].param===base.t[\\deci].p[\\foldOf],"Deci folding base and amount share one processor");
            check.value(base.t[\\b1].isKindOf(AWBDelayTrack),"delay namespace retains its own subclass");
            base.t[\\b1].p[\\thM].setM(0);check.value(base.liveDelays.state[\\cells][0][\\heads].collect{|h|h[\\enabled]}==[true,true,false,false],"A head mode changes enabled heads independently");
            base.t[\\b1].p[\\thP].setM(0);check.value(base.liveDelays.state[\\cells][0][\\heads].collect{|h|h[\\value]}==[0.25,0.5,0.75,1],"quarter-grid positions retain A head mode");
            source=base.t[\\b1].p[\\thM].createMidiSource(12345,3,90,0,3,false);
            [0,42,85,127].do{|cc,i|MIDIIn.doControlAction(12345,3,90,cc);check.value(base.t[\\b1].p[\\thM].getI==i,"discrete head mode CC "++cc++" selects "++i)};source.free;
            base.t[\\b1].setLoopControl(2);check.value(base.t[\\b1].p[\\inOf].baseTarget==1 and:{base.t[\\b1].p[\\fbOf].baseTarget==0.5},"loop helper updates the actual input and feedback AWParams");
            parameter=base.t[\\delbus].p[\\fader];parameter.setBase(6.dbamp);check.value(parameter.baseTarget==6.dbamp,"Delay Bus accepts manual +6dB");
            source=parameter.createMidiSource(12345,3,32,passthru:false);MIDIIn.doControlAction(12345,3,32,127);check.value(parameter.baseTarget==1,"actual MIDI CC reaches unity on expanded Delay Bus fader");source.free;
            parameter=base.t[\\verb].p[\\fader];base.rack.setControlAmount('mod-verb',6.dbamp);check.value(parameter.baseTarget==6.dbamp,"rack edit and namespace share the envelope fader");parameter.setBase(1);
            parameter=base.t[\\deci].p[\\depthOf];parameter.setBase(0.5);source=parameter.createMidiSource(12345,3,43,passthru:true);
            MIDIIn.doControlAction(12345,3,43,0);done=false;parameter.getBase({done=true});actual=Main.elapsedTime+1.5;while{done.not and:{Main.elapsedTime<actual}}{0.01.wait};check.value(parameter.baseTarget==0.5,"real engine pickup read rejects uncrossed low CC");
            MIDIIn.doControlAction(12345,3,43,127);1.7.wait;done=false;parameter.getBase({done=true});actual=Main.elapsedTime+1.5;while{done.not and:{Main.elapsedTime<actual}}{0.01.wait};check.value(parameter.baseTarget==1,"real engine soft pickup holds, fades and latches");source.free;
            base.createScene(\\silentFixture,99).def({base.log("Silent fixture action")});base.launchScene(99,0.15);check.value(base.transitioning,"silent scene transition locks");0.2.wait;check.value(base.transitioning.not,"silent scene lock releases");
            check.value(p[\\th].notNil and:{p[\\fx].notNil},"original musical preset dictionaries load without launching them");
            
            check.value(base.t[\\b1].controls[\\0][4]===base.t[\\b1].p[\\thM],"delay remote bank keeps the same mode facade");
            check.value(base.t[\\mast].mods[\\1][2]===base.blenders[\\um_nz],"remote modulation bank borrows the existing UM process");
            midiOutput=AWBLiveTestMidiOut.new;remote=AWBRemoteControls(base,midiOutput,(deci:11),8);
            parameter=base.t[\\deci].p[\\deciShaper];parameter.setBase(0.5);0.25.wait;
            check.value(midiOutput.messages.any{|message|message==[11,10,64]},"Bitwig adapter samples and quantizes the correct control bank CC");
            entry=remote.entries.detect{|e|e[\\cc]==10};actual=midiOutput.messages.size;remote.transmit(entry,0.5);remote.transmit(entry,0.5);check.value(midiOutput.messages.size==actual,"identical quantized remote values send once");remote.close;
            base.t.values.do{|track|track.metadata.keys.do{|id|
                var m=track.metadata[id][\\midi],facade=track.p[id],p,expected;
                if(facade.notNil and:{m[\\cc].notNil}){
                    p=if(facade.isKindOf(AWParam)){facade}{facade.param};
                    source=facade.createMidiSource(12345,m[\\channel],m[\\cc],m[\\lo] ? 0,m[\\hi] ? 127,false);
                    MIDIIn.doControlAction(12345,m[\\channel],m[\\cc],127);
                    expected=if(facade.isKindOf(AWParamField) and:{facade.field==\\amount}){1}{if(facade.isKindOf(AWParamField) and:{facade.field==\\choice}){(m[\\hi] ? 127).round.clip(p.spec.minval,p.spec.maxval)}{p.midiSpec.maxval}};
                    check.value((facade.getI-expected).abs<0.00001,"MIDI upper limit "++track.name++"/"++id);source.free;
                };
            }};
            base.bindPresetMidi(12345,~awbPresetNotes.collect{|path|{var preset=p[path[0]][path[1]];if(preset.isKindOf(Routine)){preset.run(0)}{preset.value(0)}}});
            ~awbPresetNotes.keys.asArray.sort.do{|note|actual=base.logSequence;MIDIIn.doNoteOnAction(12345,3,note,100);0.05.wait;check.value(base.logSequence>actual,"real preset note "++note++" runs its configured action and logs")};
            set.close;1.wait;check.value(base.closed,"root close retires the set");
            done=false;OSCFunc({|msg|actual=AWModulationRegistry.treeOrder(msg);done=true},'/g_queryTree.reply',s.addr,argTemplate:[0,0]).oneShot;s.sendMsg(\\g_queryTree,0,0);error=Main.elapsedTime+1.5;while{done.not and:{Main.elapsedTime<error}}{0.01.wait};check.value(done and:{actual.keys.as(Set)==Set[0,1]},"root close leaves no live set DSP nodes on the private server");("AWB_MIGRATION_FUNCTIONAL_RESULT=PASS checks="++checks).postln;s.quit;1.wait;0.exit;
        }{|e|e.reportError;~awbSet.close;s.quit;1.wait;1.exit};
    }).play(SystemClock);
},{|error|error.reportError;s.quit;1.exit});'''+ '\n)\n'
action=code[code.rfind('~awbSet.launch(nil,')+len('~awbSet.launch(nil,'):code.rfind('},{|error|')+1]
action=action.replace('{|base,set|','{|base,view|var set=~awbSet;')
action=action.replace('base.rack.masterGroup.set', 'check.value(view.notNil and:{view.tool.params.notEmpty},"headless opener creates a bound surface without opening an IDE or window");base.rack.masterGroup.set')
action=action.replace('set.close;1.wait;', '~awbLiveClose.value;1.wait;')
if os.environ.get('AWB_MIGRATION_ACTION'):
 action=Path(os.environ['AWB_MIGRATION_ACTION']).read_text()
shutil.copy2(root/'apps/live-set/LiveSet/BaseLaunch with efKR.scd',p)

fixture=out/'run.scd';fixture.write_text('(\ns=Server(\\migrationFunctional,NetAddr("127.0.0.1",57981));Server.default=s;\ns.options.loadDefs=false;s.options.zeroConf=false;\n~awbLiveSetDirectory="'+str(out)+'";~awbLivePhysicalInputs=false;~awbLiveOpenGUI=false;\n~awbLiveOnReady= '+action+';\n~awbLiveOnError={|error|error.reportError;s.quit;1.exit};\n("'+str(root/'apps/live-set/open.scd')+'").load;\n)\n')
if os.environ.get('AWB_MIGRATION_SERVER'):
 fixture.write_text(fixture.read_text().replace('s.options.loadDefs=false;', 'Server.program='+json.dumps(os.environ['AWB_MIGRATION_SERVER'])+';s.options.loadDefs=false;'))
conf=class_build/'sclang_conf.yaml'
# Keep SC 3.12 exception diagnostics bounded in this private fixture only.
(class_build/'classes/TestException.sc').write_text('+ Exception { *new { |what| ^super.newCopyArgs(what ? this.name,nil,thisProcess.nowExecutingPath) } reportError { this.errorString.postln } }\n+ MethodError { reportError { this.errorString.postln;receiver.class.postln } }\n')
env=dict(os.environ)
process=None
rc=1
try:
 with (out/'engine.log').open('w') as log:
  process=subprocess.Popen(['/Applications/SuperCollider.app/Contents/MacOS/sclang','-D','-u','57982','-l',str(conf),str(fixture)],stdout=log,stderr=subprocess.STDOUT,env=env)
  rc=process.wait(timeout=int(os.environ.get('AWB_MIGRATION_TIMEOUT','150')))
 log_text=(out/'engine.log').read_text()
 unexpected=[line for line in log_text.splitlines() if 'ERROR:' in line and 'NNUGens_' not in line and 'FL Studio VSTi.vst: not a plugin' not in line]
 if unexpected or 'FAILURE IN SERVER' in log_text or 'AWB_MIGRATION_FUNCTIONAL_RESULT=PASS' not in log_text:rc=1
 print('exit',rc);print(log_text[-5000:]);print('Unexpected errors:',unexpected)
finally:
 sock=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);sock.sendto(b'/quit\0\0\0,\0\0\0',('127.0.0.1',57981));sock.close()
 if process is not None and process.poll() is None:
  process.terminate();process.wait(timeout=10)
 with (root/'apps/awb-shell/docs/audio-testing-coordination.md').open('a') as f:f.write('\nLiveSet migration functional reservation released; evidence '+str(out)+'\n')
 (lock/'owner.json').unlink();lock.rmdir()
raise SystemExit(rc)
