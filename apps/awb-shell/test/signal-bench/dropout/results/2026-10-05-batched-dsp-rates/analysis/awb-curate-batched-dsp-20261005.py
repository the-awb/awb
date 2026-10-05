import pathlib,json,hashlib,subprocess,re,shutil,time
repo=pathlib.Path('/Users/willy/awb');dest=repo/'apps/awb-shell/test/signal-bench/dropout/results/2026-10-05-batched-dsp-rates';dest.mkdir(exist_ok=True);(dest/'analysis').mkdir(exist_ok=True)
bases=[pathlib.Path('/private/tmp/awb-native-batched-dsp-v3-20261005'),pathlib.Path('/private/tmp/awb-native-rate-output-boundaries-20261005')]
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def snapshot(p):
 out={}
 for l in p.read_text().splitlines():
  try:
   pid,t,cmd=l.strip().split(None,2);seconds=0
   for v in t.split(':'):seconds=seconds*60+float(v)
   out[int(pid)]=(seconds,cmd)
  except ValueError:pass
 return out
def background(stem):
 a=pathlib.Path(str(stem)+'.background-before.txt');b=pathlib.Path(str(stem)+'.background-after.txt')
 if not a.exists() or not b.exists():return None
 before=snapshot(a);after=snapshot(b);dt=b.stat().st_mtime-a.stat().st_mtime
 entries=[{'pid':pid,'command':cmd,'cpuSeconds':round(sec-before[pid][0],3),'corePercent':round(100*(sec-before[pid][0])/dt,3)}for pid,(sec,cmd)in after.items()if pid in before and sec>=before[pid][0]]
 return {'surroundingSeconds':dt,'includesStartupAndTeardown':True,'topExistingProcesses':sorted(entries,key=lambda x:x['cpuSeconds'],reverse=True)[:15]}
def udp(stem):
 result={}
 for suffix in ['before','after']:
  p=pathlib.Path(str(stem)+f'.udp-{suffix}.txt')
  if p.exists():result[suffix]={m.group(2):int(m.group(1))for l in p.read_text().splitlines()if(m:=re.match(r'\s*(\d+)\s+(.+)',l))}
 return {'globalCounters':True,'delta':{k:v-result['before'].get(k,0)for k,v in result.get('after',{}).items()}} if len(result)==2 else None
runs=[];owned=set();guards={};variants={}
for base in bases:
 manifest=json.load(open(base/'manifest.json'));assert manifest['complete'];shutil.copy2(base/'manifest.json',dest/(base.name+'-manifest.json'))
 for r in manifest['runs']:
  stem=pathlib.Path(r['stem']);raw=json.load(open(str(stem)+'.json'));parsed=json.load(open(str(stem)+'.return.json'));phase=parsed['phases'][0];prov=json.load(open(str(stem)+'.json.instruments/provenance.json'));nat=phase['native'];audio=phase['audio'];gui=phase['gui']
  assert raw['complete'] and raw['cleanup'] and prov['native']['guardsVerified'];assert nat['functionalPass'] and phase['recorderReliable'];assert nat['sentDelta']==nat['scRevisionDelta'];assert not nat['bridgeErrors'];assert nat['actualStoreChanges']==gui['actualValueChanges']
  for proc in phase['processes']:
   if proc['role']!='WindowServer':owned.add(proc['pid'])
  for inv in raw['scInventories']:
   for proc in inv['processes']:owned.add(proc['pid'])
  source=prov['native']['guards'];variant=hashlib.sha256(json.dumps(source,sort_keys=True).encode()).hexdigest();variants[variant]=source
  for p,h in source.items():guards[p]=h
  guards.update(prov['native']['coreClassGuards'])
  for group in ['sourceHashes','rackSourceHashes']:
   for p,h in raw[group].items():guards[str(pathlib.Path(p)if p.startswith('/')else repo/p)]=h
  for p,h in prov['sources'].items():guards[str(repo/'apps/awb-shell/test/signal-bench/dropout'/p)]=h
  item={'case':stem.name,'rawPrefix':str(stem),'kind':r.get('kind','baseline'),'repeat':r['repeat'],'condition':r['condition'],'sampleRate':nat['sampleRate'],'outputChannels':nat['outputChannels'],'nodes':r.get('nodes',manifest.get('nodes')),'sourceVariant':variant,'sourceProvenance':prov,'sourceHashes':raw['sourceHashes'],'rackSourceHashes':raw['rackSourceHashes'],'functional':nat,'audio':audio,'input':phase['input'],'returnClean':phase['returnClean'],'recorderReliable':phase['recorderReliable'],'scAverage':phase['scAverage'],'scPeak':phase['scPeak'],'electronCPU':phase['electronCPU'],'processes':phase['processes'],'gui':gui,'background':background(stem),'udp':udp(stem),'guardsVerified':True,'machine':raw['machine'],'window':raw['window'],'visibility':phase['visibility'],'topology':phase['topology'],'detectorVerified':raw['detector'],'rawHashes':{ext:sha(str(stem)+ext)for ext in ['.json','.return.json','.json.instruments/provenance.json']}}
  seq=sorted(set(e['sequence']for e in phase['input']['events']if e.get('residualHits',0)>0 or e.get('silent')));item['returnFaultGrouping']={'affectedCallbacks':len(seq),'contiguousGroups':sum(i==0 or n!=seq[i-1]+1 for i,n in enumerate(seq)),'definition':'Union of residual-hit and silent callbacks, grouped only by adjacent recorder sequence. Not a perceptual glitch count.'}
  runs.append(item)
manifest=json.load(open(bases[-1]/'manifest.json'))
bands={}
for rate,outputs in [(48000,10),(48000,4),(44100,10),(44100,4)]:
 grouped={}
 for r in runs:
  if r['sampleRate']==rate and r['outputChannels']==outputs and r['condition']=='canvas2d-15':grouped.setdefault(r['nodes'],[]).append(r)
 bands[f'{rate}/{outputs}']=[{'nodes':n,'band':'clean-both'if all(r['returnClean']for r in rr)else('faults-both'if all(not r['returnClean']for r in rr)else'intermittent'),'residualCallbacks':[r['input']['residualCallbacks']for r in rr],'silentCallbacks':[r['input']['silentCallbacks']for r in rr],'contiguousFaultGroups':[r['returnFaultGrouping']['contiguousGroups']for r in rr]}for n,rr in sorted(grouped.items())]
summary={'observedBands':bands,'date':'2026-10-05','baseCommit':manifest['baseCommit'],'scope':'Real 8 instrument channel / 32 destination rack, GUI-origin full-matrix automation, batched OSC, origin-filtered SC feedback, actual server writes, MOTU return audio','secondsPerCapture':45,'requestedChangesPerMovingCapture':416472,'userInteraction':'User confirms no computer interaction; background macOS tasks remain active.','traceMode':'off; callback audit active; no new Instruments scheduler trace','boundaries':manifest['boundaries'],'functionalPasses':len(runs),'reliableRecordings':len(runs),'runs':runs,'sourceVariants':variants,'limitations':['Synthetic stress nodes and pass processors, not migrated real Bitwig FX','Background CPU snapshots bracket capture startup/teardown, not only timed phase','Finite two-pass clean/failing observations, not safe capacity guarantees','Baseline precedes recovery recall-active status-only fix; no recall in these workloads','Average process CPU includes GPU helper CPU but hardware GPU utilization and power unmeasured']}
(dest/'native-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
ps=subprocess.check_output(['/bin/ps','-axo','pid=,ppid=,command='],text=True);live=[]
for l in ps.splitlines():
 try:pid,ppid,cmd=l.strip().split(None,2)
 except ValueError:continue
 if int(pid)in owned:live.append({'pid':int(pid),'ppid':int(ppid),'command':cmd})
assert not live,live
changed=[p for p,h in guards.items()if not pathlib.Path(p).exists()or sha(p)!=h];assert not changed,changed
rate=subprocess.check_output(['/private/tmp/awb-motu-rate-20261004'],text=True).strip();assert 'rate 44100' in rate
completion={'completed':True,'captures':len(runs),'functionalPasses':len(runs),'reliableRecordings':len(runs),'guardPathsCheckedAgainstCurrentSource':len(guards),'guardDifferences':changed,'ownedProcessIDsChecked':len(owned),'remainingOwnedProcesses':live,'hardwareReadback':rate,'focusedNodeTests':{'passed':31,'failed':0,'scope':'Rack, real private sclang bridge and delayed automatic recovery; no complete repository suite'},'checkedAt':time.time()}
(dest/'completion-verification.json').write_text(json.dumps(completion,indent=2)+'\n')
for p in ['/private/tmp/awb-native-batched-dsp-20261005.py','/private/tmp/awb-native-rate-output-boundaries-20261005.py','/private/tmp/awb-curate-batched-dsp-20261005.py','/private/tmp/awb-native-consistent-band-20261005.py']:shutil.copy2(p,dest/'analysis'/pathlib.Path(p).name)
shutil.copy2('/private/tmp/awb-rack-origin-recovery-final-node.log',dest/'rack-tests.log')
v2=pathlib.Path('/private/tmp/awb-native-batched-dsp-v2-20261005/manifest.json');shutil.copy2(v2,dest/'recovery-race-negative-manifest.json')
print(json.dumps(completion,indent=2));print('BOUNDARIES',json.dumps(summary['boundaries']));print('TOTAL SENT',sum(r['functional']['sentDelta']for r in runs));print('TOTAL PACKETS',sum(r['functional']['oscOutputAfter']['packets']-r['functional']['oscOutputBefore']['packets']for r in runs))
