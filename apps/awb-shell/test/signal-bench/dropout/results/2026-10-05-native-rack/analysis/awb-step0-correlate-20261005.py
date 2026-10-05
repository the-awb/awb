import pathlib,json,struct,bisect,collections,statistics,sys
label=sys.argv[1];base=pathlib.Path('/private/tmp/awb-step0-scheduler-ea338b9')
stem='/private/tmp/awb-step0-followups-ea338b9/replacement-pass1-canvas2d-30' if label=='fault-canvas2d30' else '/private/tmp/awb-step0-system-ea338b9/pass1-svg-30'
r=json.loads(pathlib.Path(stem+'.json').read_text());phase=r['phases'][0];meta=json.loads(pathlib.Path(phase['instruments']['phaseMetadata']).read_text());align=meta['clockAlignment'];low,high=align['machMinusTraceMinNs'],align['machMinusTraceMaxNs'];offset=(low+high)/2
states=json.loads((base/(label+'-thread-state.audio.json')).read_text())['rows'];segments=sorted((int(v['start']['raw']),int(v['start']['raw'])+int(v['duration']['raw']),v['state']['raw'],v['priority']['raw']) for v in states);starts=[s[0] for s in segments]
for i in range(1,len(segments)):
 if segments[i][0]!=segments[i-1][1]:raise ValueError('Audio state timeline has gap/overlap at '+str(i))
first,last=phase['auditRange']['firstSequence'],phase['auditRange']['lastSequence'];out=[]
with open(stem+'.audit','rb') as f:
 h=f.read(64);assert struct.unpack_from('<Q',h)[0]==0x4157424155444954
 f.seek(4096+first*160);data=f.read((last-first+1)*160)
for v in struct.iter_unpack('<20d',data):
 s=v[1]-offset;e=s+v[6];j=max(0,bisect.bisect_right(starts,s)-1);parts=collections.defaultdict(float)
 while j<len(segments) and segments[j][0]<e:
  a,b,state,priority=segments[j];parts[state]+=max(0,min(e,b)-max(s,a));j+=1
 covered=sum(parts.values());assert abs(covered-v[6])<1,'Incomplete callback state coverage'
 off=sum(t for k,t in parts.items() if k!='Running');uncertainty=2*(high-low)
 out.append({'sequence':int(v[0]),'traceStartNs':s,'wallMs':v[6]/1e6,'runningMs':parts['Running']/1e6,'interruptedMs':parts['Interrupted']/1e6,'runnableMs':parts['Runnable']/1e6,'blockedMs':parts['Blocked']/1e6,'offCpuMs':off/1e6,'offCpuLowerMs':max(0,off-uncertainty)/1e6,'offCpuUpperMs':min(v[6],off+uncertainty)/1e6,'overBudget':v[6]+v[7]>v[4]/v[5]*1e9})
def aggregate(v):
 return {'callbacks':len(v),'meanWallMs':statistics.mean(x['wallMs'] for x in v),'meanRunningMs':statistics.mean(x['runningMs'] for x in v),'meanOffCpuMs':statistics.mean(x['offCpuMs'] for x in v),'maxOffCpuMs':max(x['offCpuMs'] for x in v),'maxOffCpuUpperMs':max(x['offCpuUpperMs'] for x in v),'maxRunnableMs':max(x['runnableMs'] for x in v),'maxBlockedMs':max(x['blockedMs'] for x in v),'maxWallMs':max(x['wallMs'] for x in v)} if v else None
result={'label':label,'scPID':r['session']['scPID'],'alignmentWidthUs':(high-low)/1000,'priorityCounts':dict(collections.Counter(x[3] for x in segments)),'all':aggregate(out),'overBudget':aggregate([x for x in out if x['overBudget']]),'longest':sorted(out,key=lambda x:-x['wallMs'])[:12],'method':'Overlap native DSP body with Xcode Running/Interrupted/Runnable/Blocked intervals. Conservative offset uncertainty bound 2 times alignment width. Does not identify CPU clock, GPU power or shared-resource cause.'}
(base/(label+'-correlation.json')).write_text(json.dumps(result,indent=2)+'\n');(base/(label+'-callbacks.json')).write_text(json.dumps(out,separators=(',',':'))+'\n');print(json.dumps(result,indent=2))
