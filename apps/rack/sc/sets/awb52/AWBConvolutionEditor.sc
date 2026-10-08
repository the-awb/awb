// A static waveform and edit-only controls: no polling, audio bridge or redraw loop.
AWBConvolutionEditor {
    var <set,<window,<waveform,<envelope,<gainBox,<curveBox,<branchMenu,<applyButton,<status;
    var drafts,info,label,dependant,busy=false;
    *open { |set| ^super.new.init(set) }
    init { |owner|
        set=owner;if(set.ready.not or:{set.closed} or:{set.spec[\irFiles].isNil}){Error("Wait for set readiness before opening the convolution editor").throw};
        drafts=IdentityDictionary.new;
        AWBConvolutionIR.branchIDs.do{|id|drafts[id]=set.convolutionSettings(id)};
        window=Window("Convolution — envelope / gain",Rect(120,100,780,530)).background_(Color.fromHexString("#11171b"));
        branchMenu=PopUpMenu(window,Rect(16,14,220,28)).items_(["Earth / Mulching","Composite Earth","Echo / Inchindown"]).action_({this.loadBranch});
        label=StaticText(window,Rect(250,14,514,28)).stringColor_(Color.white);
        waveform=SoundFileView(window,Rect(16,54,748,225)).background_(Color.fromHexString("#0b1013")).waveColors_([Color.fromHexString("#68c8c9"),Color.fromHexString("#90c1b5")]).gridOn_(true).gridResolution_(1).timeCursorOn_(false);
        envelope=EnvelopeView(window,Rect(16,298,748,100)).background_(Color.fromHexString("#192226")).drawLines_(true).drawRects_(true).editable_(true).keepHorizontalOrder_(true).step_(0.001).action_({|view|
            var value=view.value,times=value[0].copy;
            times[0]=0;times[times.size-1]=1;
            if(times.size>2){(1..(times.size-2)).do{|i|times[i]=times[i].clip(times[i-1]+0.00001,1-((times.size-1-i)*0.00001))}};
            view.value=[times,value[1]];this.remember;
        });
        StaticText(window,Rect(16,408,85,25)).string_("IR gain / dB").stringColor_(Color.white);
        gainBox=NumberBox(window,Rect(103,408,90,25)).clipLo_(-60).clipHi_(24).decimals_(2).action_({this.remember});
        StaticText(window,Rect(222,408,70,25)).string_("Curve").stringColor_(Color.white);
        curveBox=NumberBox(window,Rect(290,408,70,25)).clipLo_(-8).clipHi_(8).decimals_(2).action_({envelope.curves=curveBox.value;this.remember});
        Button(window,Rect(386,408,92,25)).states_([["Flat"]]).action_({envelope.value=[[0,0.05,0.25,0.5,0.8,1],[1,1,1,1,1,1]];this.remember});
        Button(window,Rect(486,408,130,25)).states_([["Fade both ends"]]).action_({envelope.value=[[0,0.05,0.25,0.5,0.8,1],[0,1,1,1,1,0]];this.remember});
        applyButton=Button(window,Rect(638,408,126,25)).states_([["Apply to branch"]]).action_({this.apply});
        status=StaticText(window,Rect(16,444,748,32)).stringColor_(Color.white).string_("Drag envelope points. Apply changes the IR; originals remain untouched.");
        Button(window,Rect(16,485,150,25)).states_([["Save settings…"]]).action_({Dialog.savePanel({|path|this.save(path)})});
        StaticText(window,Rect(178,485,586,25)).string_("Old convolution tails drain after Apply. Gain is baked into the IR.").stringColor_(Color.gray(0.75));
        dependant=SimpleController(set).put(\closed,{{window.close}.defer});
        window.onClose={dependant.remove};this.loadBranch;window.front;^this;
    }
    branch { ^AWBConvolutionIR.branchIDs[branchMenu.value] }
    remember { drafts[this.branch]=AWBConvolutionIR.settings((times:envelope.value[0],levels:envelope.value[1],curve:curveBox.value,gainDb:gainBox.value));if(busy.not){status.string="Edited — Apply to prepare this IR."};^this }
    loadBranch {
        var settings=drafts[this.branch];info=set.convolutionSource(this.branch);
        waveform.load(info[\preparedPath] ? info[\path],0,info[\frames]);
        label.string=if(info[\preparedPath].notNil){"Prepared • "}{"Source • "}++info[\path].basename++"  /  "++(info[\frames]/info[\sampleRate]).round(0.001)++" seconds";
        envelope.value=[settings[\times],settings[\levels]];envelope.curves=settings[\curve];gainBox.value=settings[\gainDb];curveBox.value=settings[\curve];^this;
    }
    apply {
        var id=this.branch;if(busy){^this};this.remember;busy=true;applyButton.enabled=false;branchMenu.enabled=false;status.string="Preparing IR…";
        set.applyConvolution(id,drafts[id],{|error|
            {if(window.isClosed.not){busy=false;applyButton.enabled=true;branchMenu.enabled=true;if(error.isNil){this.loadBranch};status.string=if(error.isNil){"Applied "++id++". Previous tail draining."}{error.errorString}}}.defer;
        });^this;
    }
    save { |path|
        this.remember;File.use(path,"w",{|file|file.write("// Apply before AWBFirstPassSet.open: spec[\\irEnvelopes] = thisFile.load;\n"++drafts.asCompileString++"\n")});status.string="Saved "++path;^this;
    }
    close {window.close;^this}
}
