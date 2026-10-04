import array,contextlib,gzip,hashlib,io,json,pathlib,shutil,struct,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[5];fixture=root/'apps/awb-shell/test/signal-bench/dropout';stem=pathlib.Path(sys.argv[1]);name=sys.argv[2]
out=fixture/'results/2026-10-04-rack-diagnostics'/name
node='/Users/willy/.nvm/versions/node/v22.23.2/bin/node'
subprocess.run([node,str(fixture/'analyse-input.mjs'),str(stem)],stdout=subprocess.DEVNULL,check=True)
# Reuse every native range/cleanup/provenance assertion; only rename its baseline for the rack matrix.
audit_script=fixture/'analyse.py';audit_source=audit_script.read_text().replace("else 'focus-noop'","else 'idle'")
saved_argv=sys.argv;sys.argv=[str(audit_script),str(stem),'2026-10-04-rack-diagnostics/'+name]
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
for f in ['diagnostic-analyse.py','diagnostic-run.mjs','diagnostic-measure.mjs','diagnostic-renderers.mjs','diagnostic-prepare-thread.py','producer.scd','callback-audit.cpp','input-record.cpp','audit.mjs','input-audit.mjs']:
 src=pathlib.Path(str(stem)+'.json.harness')/f
 shutil.copyfile(src if src.exists() else fixture/f,out/f)
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

# CPU sampling encloses the DSP wall-time interval. Subtracting it directly
# understates off-CPU time because the Mach queries themselves consume CPU.
# Retain bounds using both measured query durations and 2 us clock quantization.
has_cpu=bool(report.get('telemetry',{}).get('threadCPUProbe'))
if has_cpu:
 cpu_path=pathlib.Path(report.get('telemetry',{}).get('threadCPUProbe') or str(stem.with_suffix('.cpu')))
 cpu_raw=cpu_path.read_bytes();cpu_header=struct.unpack_from('<4Q',cpu_raw);native_raw=stem.with_suffix('.audit').read_bytes();native_header=struct.unpack_from('<8Q',native_raw)
 assert cpu_header[0]==0x4157424350553031 and cpu_header[2]==5 and cpu_header[1]==native_header[1]
 cpu_rows=[struct.unpack_from('<5d',cpu_raw,4096+i*40) for i in range(cpu_header[1])]
 assert all(r[0]==i and r[1]>=0 and r[4]==0 for i,r in enumerate(cpu_rows))
 metrics=[]
 def distribution(a):
  a=sorted(a);return {'mean':sum(a)/len(a),'p50':a[int(.5*(len(a)-1))],'p95':a[int(.95*(len(a)-1))],'p99':a[int(.99*(len(a)-1))],'max':a[-1]}
 for phase in report['phases']:
  b=phase['auditRange'];pairs=[]
  for seq in range(b['firstSequence'],b['lastSequence']+1):
   c=cpu_rows[seq];a=struct.unpack_from('<20d',native_raw,4096+seq*160);wall=a[6];cpu=c[1];query=c[2]+c[3];pairs.append({'seq':seq,'wallMs':wall/1e6,'threadCPURawMs':cpu/1e6,'queryUs':query/1e3,'offCPULowerMs':max(0,wall-cpu-2000)/1e6,'offCPUUpperMs':max(0,wall-cpu+query+2000)/1e6,'entryNs':a[1],'outputNs':a[2],'arrivalBudgetMs':(a[2]-a[1])/1e6,'finishSlackMs':(a[2]-a[1]-a[6]-a[7])/1e6})
  metrics.append({'condition':phase['condition'],'nodes':phase['nodes'],'repeat':phase['repeat'],'callbacks':len(pairs),'metrics':{k:distribution([v[k] for v in pairs]) for k in ['wallMs','threadCPURawMs','queryUs','offCPULowerMs','offCPUUpperMs','arrivalBudgetMs','finishSlackMs']},'offCPULowerOver1ms':sum(v['offCPULowerMs']>1 for v in pairs),'largestWallCallbacks':sorted(pairs,key=lambda v:v['wallMs'],reverse=True)[:15]})
 (out/'thread-cpu-analysis.json').write_text(json.dumps({'method':'Mach THREAD_BASIC_INFO before/after DSP; query interval bounds include 2 us quantization; not a scheduler trace','columns':['sequence','threadCPUNs','queryBeforeNs','queryAfterNs','status'],'phases':metrics},indent=2)+'\n')
 with gzip.open(out/'callback-thread-cpu.bin.gz','wb') as f:f.write(cpu_raw[:4096+cpu_header[1]*40])
if (out/'copied-renderers').exists():shutil.rmtree(out/'copied-renderers')
shutil.copytree(str(stem)+'.json.renderers',out/'copied-renderers')
probe_dir=pathlib.Path('/private/tmp/awb-rack-diagnostics-20261004')
for name2 in ['callback-thread-audit.cpp','callback-thread-audit.dylib','prepare-thread-probe.py']:
 shutil.copyfile(probe_dir/name2,out/name2)
verification=json.loads((out/'verification.json').read_text());verification['rackSourceHashes']=report['rackSourceHashes'];verification['allRecorderRangesReliable']=True;verification['allRequestedControlsActuallyChanged']=all(p['gui']['actualValueChanges']==p['gui']['updates'] for p in report['phases']);verification['noReactRackRendersDuringMotion']=all(not p['gui'].get('appRenders') and not p['gui'].get('svg',{}).get('rackRenders') and not p['gui'].get('canvas',{}).get('hostRenders') for p in report['phases']);verification['allControlsVisible']=all(p['visibility']['fits'] for p in report['phases']);verification['noScopeCapture']=all(p['scopeCaptures']==0 for p in report['phases']);verification['threadCPUCallbackRangesMatch']=has_cpu;verification['threadCPUQueryStatusesAllZero']=has_cpu;verification['canvasFinalDrawInputsVerified']=all(p['diagnostic']['renderedValues'] and p['diagnostic']['appliedChanges']==p['gui']['updates'] for p in report['phases'] if p.get('diagnostic'));verification['staticCanvasDrawsZero']=all(p['diagnostic']['draws']==0 for p in report['phases'] if p['condition'].endswith('-static'));verification['copiedRendererChecksums']={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (out/'copied-renderers').rglob('*') if p.is_file()};verification['checksums']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir() if p.is_file() and p.name!='verification.json'};(out/'verification.json').write_text(json.dumps(verification,indent=2)+'\n')
print(name,len(report['phases']),'phases; reliable input; maximum gap',max(p['maxSilenceMs'] for p in phases),'ms')
