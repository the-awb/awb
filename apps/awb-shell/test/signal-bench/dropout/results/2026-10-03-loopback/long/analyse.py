import json,struct,pathlib,gzip,hashlib,subprocess,sys,runpy
root=pathlib.Path(__file__).resolve().parents[5];stem=sys.argv[1] if len(sys.argv)>1 else '/private/tmp/awb-dropout-isolated';raw=pathlib.Path(stem+'.audit').read_bytes();header=struct.unpack_from('8Q',raw);count=header[1];assert header[0]==0x4157424155444954 and count<100000
rows=[struct.unpack_from('20d',raw,4096+i*160) for i in range(count)]
p=json.load(open(stem+'.json'));assert p['complete'] and p['cleanup'] and p['hostSurvives'] and p['protectedCount']==16 and len(p['phases'])==len(p['targets'])*p['repeats']*len(p.get('conditions',['stopped','widgets','focus']))
assert p['audit']==[0,0,0]
# Verify each phase against its exact native callback range.
for phase in p['phases']:
 a=phase['audio'];n=a['callbacks'];bounds=phase['auditRange'];i=bounds['firstSequence'];assert bounds['lastSequence']==i+n-1
 segment=rows[i:i+n];assert len(segment)==n and segment[0][0]==i and segment[-1][0]==i+n-1
 assert segment[0][1]==bounds['firstEntryNs'] and segment[-1][1]==bounds['lastEntryNs']
 assert abs((segment[-1][1]-segment[0][1])/1e9-a['seconds'])<1e-9
 assert abs(sum(r[6] for r in segment)/n/1e6-a['meanDspMs'])<1e-10
 a['lateCallbacksIncludingProbe']=sum(r[1]+r[6]+r[7]>r[2] for r in segment)
 a['overBudgetCallbacksIncludingProbe']=sum(r[6]+r[7]>r[4]/r[5]*1e9 for r in segment)
 assert a['lateCallbacksIncludingProbe']==a['lateCallbacks']
 assert a['overBudgetCallbacksIncludingProbe']==a['overBudgetCallbacks']
 assert abs(a['seconds']-phase['seconds'])<0.35,'Audio and CPU intervals diverged'
 assert a['sampleRate']==p['session']['sampleRate']
 assert a['residualCallbacks']==sum(r[11]>0 for r in segment)
 assert a['residualHits']==sum(r[11] for r in segment)
 assert a['silentCallbacks']==sum(r[12]>=32 for r in segment)
 assert a['frameGaps']==sum(abs(segment[j][3]-segment[j-1][3]-segment[j-1][4])>.5 for j in range(1,n))
 for key,col in [('overloadEvents',13),('rateChanges',14),('bufferChanges',15)]:assert a[key]==segment[-1][col]-segment[0][col]
out=root/('apps/awb-shell/test/signal-bench/dropout/results/'+sys.argv[2] if len(sys.argv)>2 else 'apps/awb-shell/test/signal-bench/dropout/results/2026-10-03-focus-control' if p.get('persistentFocus') else 'apps/awb-shell/test/signal-bench/dropout/results/2026-10-03');out.mkdir(parents=True,exist_ok=True)
(out/'full.json').write_text(json.dumps(p,indent=2)+'\n')
with gzip.open(str(out/'callback-audit.bin.gz'),'wb') as f:f.write(raw[:4096+count*160])
(out/'full.log').write_bytes(pathlib.Path(stem+'.log').read_bytes())
conditions=p.get('conditions',['stopped','widgets','focus']);keys=[(t,c) for t in p['targets'] for c in conditions];stats=lambda v:{'mean':sum(v)/len(v),'min':min(v),'max':max(v)}
summary={ 'phases':len(p['phases']),'samplesSeconds':sum(x['seconds'] for x in p['phases']),'audioCallbacks':sum(x['audio']['callbacks'] for x in p['phases']),'focusSwitches':sum(len(x['focusEvents']) for x in p['phases']),'cases':{},'session':p['session'],'protectedCount':p['protectedCount'],'probe':{'meanUs':stats([x['audio']['meanAuditUs'] for x in p['phases']]),'maxUs':max(x['audio']['maxAuditUs'] for x in p['phases'])}}
checks=['frameGaps','residualCallbacks','silentCallbacks','overloadEvents','rateChanges','bufferChanges','lateCallbacksIncludingProbe','overBudgetCallbacksIncludingProbe']
summary['totals']={k:sum(x['audio'][k] for x in p['phases']) for k in checks}
for t,c in keys:
 ps=[x for x in p['phases'] if x['target']==t and x['condition']==c];assert len(ps)==p['repeats']
 row={'passes':p['repeats'],'nodes':sorted(set(x['nodes'] for x in ps)),**{k:stats([x[k] for x in ps]) for k in ['electronCPU','scAverage','scPeak','opacityHz']+[k for k in ['waveHz','freshWaveHz','packetHz','waveDrawMs'] if all(k in x for x in ps)]},'maxDspMs':max(x['audio']['maxDspMs'] for x in ps),'audio':{k:sum(x['audio'][k] for x in ps) for k in checks},'switches':sum(len(x['focusEvents']) for x in ps)}
 summary['cases']['%s/%s'%(t,c)]=row
summary['paired']={};summary['baseline']='stopped' if 'stopped' in conditions else 'focus-noop'
baseline='stopped' if 'stopped' in conditions else 'focus-noop'
for t in p['targets']:
 for c in [v for v in conditions if v!=baseline]:
  values=[]
  for repeat in range(1,p['repeats']+1):
   a=next(x for x in p['phases'] if x['target']==t and x['condition']==baseline and x['repeat']==repeat);b=next(x for x in p['phases'] if x['target']==t and x['condition']==c and x['repeat']==repeat);values.append(b['scAverage']-a['scAverage'])
  summary['paired']['%s/%s'%(t,c)]={'scAverageIncrement':stats(values),'passes':values}
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
guards={n:hashlib.sha256((root/n).read_bytes()).hexdigest()==h for n,h in p['sourceHashes'].items()};assert all(guards.values())
q=subprocess.run(['/bin/ps','-p',str(p['session']['scPID']),'-o','pid='],stdout=subprocess.PIPE,universal_newlines=True);assert q.returncode==1 and not q.stdout.strip(),'Owned server remains'
if p.get('helperPID'):
 q=subprocess.run(['/bin/ps','-p',str(p['helperPID']),'-o','pid='],stdout=subprocess.PIPE,universal_newlines=True);assert q.returncode==1 and not q.stdout.strip(),'Owned focus helper remains'
if p.get('exclusiveSC'):
 owned={p['session']['scPID'],next(x['pid'] for x in p['phases'][0]['processes'] if x['role']=='sclang')}
 assert len(p['scInventories'])==len(p['phases'])+2
 assert all({x['pid'] for x in check['processes']}==owned for check in p['scInventories'])
 for pid in owned:
  q=subprocess.run(['/bin/ps','-p',str(pid),'-o','pid='],stdout=subprocess.PIPE,universal_newlines=True);assert q.returncode==1 and not q.stdout.strip(),'Owned SC process remains'
if p.get('loopback',{}).get('recorderPID'):
 q=subprocess.run(['/bin/ps','-p',str(p['loopback']['recorderPID']),'-o','pid='],stdout=subprocess.PIPE,universal_newlines=True);assert q.returncode==1 and not q.stdout.strip(),'Owned input recorder remains'
text_sections=runpy.run_path(str(pathlib.Path(__file__).with_name('code-sections.py')))['text_sections'];originalSections=text_sections('/Applications/SuperCollider.app/Contents/Resources/scsynth');assert originalSections==text_sections('/private/tmp/awb-audit-scsynth')
(out/'verification.json').write_text(json.dumps({'phases':len(p['phases']),'allListenersRegistered':True,'allFocusSwitchesConfirmed':all(e['confirmed'] for x in p['phases'] for e in x['focusEvents']),'exclusiveSCInventoryChecks':len(p.get('scInventories',[])),'exclusiveSC':p.get('exclusiveSC',False),'privateFocusHelperAbsent':bool(p.get('helperPID')),'nativePhaseRangesVerified':True,'privateSCProcessAbsent':True,'productionHashes':guards,'copiedSCTextSectionsMatchInstalled':True,'installedSCTextSections':originalSections,'rawAuditSHA256':hashlib.sha256(raw[:4096+count*160]).hexdigest(),'installedSCSHA256':hashlib.sha256(pathlib.Path('/Applications/SuperCollider.app/Contents/Resources/scsynth').read_bytes()).hexdigest()},indent=2)+'\n')
print(json.dumps(summary,indent=2))
