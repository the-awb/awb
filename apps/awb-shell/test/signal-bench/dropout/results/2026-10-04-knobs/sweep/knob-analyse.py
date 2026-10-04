import array,contextlib,gzip,hashlib,io,json,pathlib,shutil,struct,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[5];fixture=root/'apps/awb-shell/test/signal-bench/dropout';stem=pathlib.Path(sys.argv[1]);name=sys.argv[2]
out=fixture/'results/2026-10-04-knobs'/name
node='/Users/willy/.nvm/versions/node/v22.23.2/bin/node'
subprocess.run([node,str(fixture/'analyse-input.mjs'),str(stem)],stdout=subprocess.DEVNULL,check=True)
# Reuse every native range/cleanup/provenance assertion; only rename its baseline for the rack matrix.
audit_script=fixture/'analyse.py';audit_source=audit_script.read_text().replace("else 'focus-noop'","else 'idle'")
saved_argv=sys.argv;sys.argv=[str(audit_script),str(stem),'2026-10-04-knobs/'+name]
try:
 with contextlib.redirect_stdout(io.StringIO()):exec(compile(audit_source,str(audit_script),'exec'),{'__file__':str(audit_script),'__name__':'__main__'})
finally:sys.argv=saved_argv
(out/'native-range-verifier.py').write_text(audit_source)

report=json.loads(stem.with_suffix('.json').read_text());ret=json.loads(stem.with_suffix('.return.json').read_text());shutil.copyfile(stem.with_suffix('.return.json'),out/'return.json')
assert all(p['recorderReliable'] for p in ret['phases']), 'Unreliable input recorder phase'
assert ret['recorder']['captureDrops']==0
for f,h in report['rackSourceHashes'].items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==h, 'Rack changed: '+f
with open(report['loopback']['path'],'rb') as src,gzip.open(out/'input-return.bin.gz','wb') as dst:shutil.copyfileobj(src,dst)
for pic in stem.parent.glob(stem.name+'.json.*.png'):shutil.copyfile(pic,out/pic.name.split('.json.',1)[1])
for f in ['knob-analyse.py','knob-run.mjs','knob-measure.mjs','producer.scd','callback-audit.cpp','input-record.cpp','audit.mjs','input-audit.mjs']:
 shutil.copyfile(fixture/f,out/f)
shutil.copyfile(root/'apps/rack/test/benchmark-react-workload.mjs',out/'benchmark-react-workload.mjs')
phases=[]
with open(report['loopback']['path'],'rb') as f:
 header=struct.unpack('<12Q',f.read(96));pcm=4096+header[2]*80;rate=header[7]
 for phase in ret['phases']:
  b=phase['inputRange'];f.seek(4096+b['firstSequence']*80);first=struct.unpack('<10d',f.read(80));f.seek(4096+b['lastSequence']*80);last=struct.unpack('<10d',f.read(80));start=int(first[5]);end=int(last[5]+last[4]);f.seek(pcm+start*4);samples=array.array('f');samples.frombytes(f.read((end-start)*4))
  if sys.byteorder!='little':samples.byteswap()
  runs=[];run=0
  for x in samples:
   if abs(x)<1e-9:run+=1
   else:
    if run>=32:runs.append(run)
    run=0
  if run>=32:runs.append(run)
  phases.append({'nodes':phase['nodes'],'condition':phase['condition'],'repeat':phase['repeat'],'scAverage':phase['scAverage'],'silenceRunsFrames':runs,'silenceRunsMs':[1000*n/rate for n in runs],'silenceRunCount':len(runs),'maxSilenceMs':1000*max(runs,default=0)/rate,'totalSilenceMs':1000*sum(runs)/rate})
(out/'silence-analysis.json').write_text(json.dumps({'threshold':1e-9,'minimumFrames':32,'sampleRate':rate,'phases':phases},indent=2)+'\n')
verification=json.loads((out/'verification.json').read_text());verification['rackSourceHashes']=report['rackSourceHashes'];verification['allRecorderRangesReliable']=True;verification['allRequestedControlsActuallyChanged']=all(p['gui']['actualValueChanges']==p['gui']['updates'] for p in report['phases']);verification['noReactRackRendersDuringMotion']=all(not p['gui'].get('appRenders') and not p['gui'].get('svg',{}).get('rackRenders') and not p['gui'].get('canvas',{}).get('hostRenders') for p in report['phases']);verification['allControlsVisible']=all(p['visibility']['fits'] for p in report['phases']);verification['noScopeCapture']=all(p['scopeCaptures']==0 for p in report['phases']);verification['checksums']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir() if p.is_file() and p.name!='verification.json'};(out/'verification.json').write_text(json.dumps(verification,indent=2)+'\n')
print(name,len(report['phases']),'phases; reliable input; maximum gap',max(p['maxSilenceMs'] for p in phases),'ms')
