import json,pathlib,hashlib,re,statistics,collections,sys
base=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);manifest=json.loads((base/'manifest.json').read_text());rows=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def compact(value):
 if isinstance(value,dict):return {k:compact(v) for k,v in value.items() if k!='events'}
 if isinstance(value,list):return [compact(v) for v in value]
 return value
def drops(s):
 m=re.search(r'(\d+) dropped due to full socket buffers',s);return int(m[1]) if m else None
def background(d):
 def parse(text):
  rows={}
  for line in text.splitlines():
   m=re.match(r'\s*(\d+)\s+\d+\s+[\d.]+\s+(\S+)\s+(.*)',line)
   if not m:continue
   fields=m[2].split(':');t=float(fields[-1]);mult=60
   for f in reversed(fields[:-1]):t+=int(f)*mult;mult*=60
   rows[int(m[1])]=(t,m[3])
  return rows
 before=parse(d['backgroundBefore']);after=parse(d['backgroundAfter'])
 start=d['beforePhase'][0];end=d['afterPhase'][0];seconds=((end['machBeforeNs']+end['machAfterNs'])-(start['machBeforeNs']+start['machAfterNs']))/2e9
 values={}
 for pid,(t,name) in after.items():
  if pid not in before:continue
  for daemon in ['mediaanalysisd','coreduetd','mds_stores','coreaudiod']:
   if name.endswith('/'+daemon):values[daemon]=(t-before[pid][0])/seconds*100
 return {'intervalSeconds':seconds,'daemonCPU':values,'note':'Surrounding phase marker interval; not sampled causal attribution.'}
for r in manifest['runs']:
 if not r['complete']:continue
 raw=pathlib.Path(r['stem']+'.json');ret=pathlib.Path(r['stem']+'.return.json');prov=pathlib.Path(r['stem']+'.json.instruments/provenance.json')
 d=json.loads(raw.read_text());p=d['phases'][0];a=json.loads(ret.read_text());q=a['phases'][0];n=p['native'];g=p['gui'];roles={x['role']:x['corePercent'] for x in p['processes']};provenance=json.loads(prov.read_text());before=drops(r.get('udpBefore',''));after=drops(r.get('udpAfter',''))
 row={k:r[k] for k in ['pass','size','bridge','direction','condition','stem']}
 row.update(auditRange=p['auditRange'],inputRange=p['inputRange'],detector=compact(d['detector']),loopbackDetector={k:{a:b for a,b in v.items() if a!='events'} for k,v in d['loopback'].items() if isinstance(v,dict)},calibration=d['calibration'],background=background(json.loads(pathlib.Path(p['instruments']['phaseMetadata']).read_text())),scReplay=n['scReplay'],functionalPass=n['functionalPass'],functionalFailuresByKind=dict(collections.Counter(x['kind'] for x in n['functionalFailures'])),bridgeErrors=n['bridgeErrors'],armedAtEnd=n['armedAtEnd'],sentDelta=n['sentDelta'],scRevisionDelta=n['scRevisionDelta'],movingControls=n['movingControls'],mountedControls=n['mountedControls'],configuredControls=n['configuredControls'],actualStoreChanges=n['actualStoreChanges'],requestedRefreshHz=n['requestedRefreshHz'],achievedRefreshHz=n['achievedRefreshHz'],refreshUnderTarget=n['refreshUnderTarget'],endpointSettleMs=n['endpointSettleMs'],electronCPU=p['electronCPU'],processCPU=roles,scAverage=p['scAverage'],scPeak=p['scPeak'],audio={k:v for k,v in p['audio'].items() if k!='events'},input={k:v for k,v in q['input'].items() if k!='events'},recorderReliable=q['recorderReliable'],returnClean=q['returnClean'],gui={k:g.get(k) for k in ['elapsedMs','updates','actualValueChanges','batches','appRenders','frameP95Ms','frameMaxMs']},react={k:g.get('svg',{}).get(k) for k in ['rackRenders','controlRenders','commits']},diagnosticDraws=p['diagnostic']['draws'],udpFullSocketDropsBefore=before,udpFullSocketDropsAfter=after,udpFullSocketDrops=None if before is None or after is None else after-before,visibility=p['visibility'],topology=p['topology'],sourceGuardsVerified=provenance['native']['guardsVerified'],nodeManagerEnabled=d['session']['nodeManagerEnabled'],nodeManagerTracked=d['session']['nodeManagerTracked'],ownedObjects=d['session']['ownedObjects'],hashes={'rawReport':sha(raw),'returnReport':sha(ret),'provenance':sha(prov)},sourceHashes=d['sourceHashes'],rackSourceHashes=d['rackSourceHashes'],nativeGuards=provenance['native']['guards'],coreClassHashes=d['session']['coreClassHashes'],cleanup=d['cleanup'])
 rows.append(row)
catalog={k:rows[0][k] for k in ['sourceHashes','rackSourceHashes','nativeGuards','coreClassHashes']} if rows else {}
for row in rows:
 for key,value in catalog.items():
  assert row.pop(key)==value, 'Source guard catalog drift: '+key
groups=[]
for key in sorted(set(tuple(r[k] for k in ['size','direction','bridge','condition']) for r in rows)):
 cases=[r for r in rows if tuple(r[k] for k in ['size','direction','bridge','condition'])==key];group=dict(zip(['size','direction','bridge','condition'],key));group.update(captures=len(cases),functionalPasses=sum(r['functionalPass'] for r in cases),returnCleanCaptures=sum(r['returnClean'] for r in cases),badReturnCallbacks=[r['input']['residualCallbacks'] for r in cases],silentReturnCallbacks=[r['input']['silentCallbacks'] for r in cases],electronCPU=statistics.mean(r['electronCPU'] for r in cases),sclangCPU=statistics.mean(r['processCPU']['sclang'] for r in cases),windowServerCPU=statistics.mean(r['processCPU']['WindowServer'] for r in cases),scAverage=statistics.mean(r['scAverage'] for r in cases),maxDspMs=max(r['audio']['maxDspMs'] for r in cases),achievedRefreshHz=[r['achievedRefreshHz'] for r in cases],udpFullSocketDrops=[r['udpFullSocketDrops'] for r in cases],missingGUICommands=[r['sentDelta']-r['scRevisionDelta'] if r['direction']=='gui' and r['bridge']=='on' else None for r in cases]);groups.append(group)
summary={'complete':manifest['complete'],'commit':manifest['commit'],'evidenceBase':str(base),'planned':len(manifest['plannedCases']),'captures':len(rows),'functionalPasses':sum(r['functionalPass'] for r in rows),'recordersReliable':all(r['recorderReliable'] for r in rows),'sourceCatalog':catalog,'groups':groups,'cases':rows}
out.write_text(json.dumps(summary,indent=2)+'\n')
for g in groups: print(g['size'],g['direction'],g['bridge'],g['condition'],'pass',str(g['functionalPasses'])+'/'+str(g['captures']),'CPU',round(g['electronCPU'],1),'SC',round(g['scAverage'],1),'bad',g['badReturnCallbacks'],'Hz',[round(x,1) if isinstance(x,(int,float)) else x for x in g['achievedRefreshHz']])
