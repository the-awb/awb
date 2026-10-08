from pathlib import Path
import json,datetime,re
p=Path('/private/tmp/awb-earth5-echo20-sc256-reserve-ladder');r=json.loads((p/'results.json').read_text());gui=json.loads((p/'fixture/gui-result.json').read_text());snapshots=[]
def cpu(t):
 parts=t.split(':');return float(parts[-1])+60*float(parts[-2])+(3600*float(parts[-3]) if len(parts)>2 else 0)
for raw in (p/'system-cpu.jsonl').read_text().splitlines():
 s=json.loads(raw);rows={}
 for line in s['processes'].splitlines():
  a=line.split(None,4)
  if len(a)==5:
   try:rows[int(a[0])]={'parent':int(a[1]),'percent':float(a[2]),'seconds':cpu(a[3]),'command':a[4]}
   except ValueError:pass
 s['rows']=rows;snapshots.append(s)
guiPID=r['ownedPIDs'][-1];tree={guiPID}
for _ in range(5):
 for s in snapshots:
  tree.update(pid for pid,v in s['rows'].items() if v['parent'] in tree)
def cost(ss,pids):
 total=0
 for pid in pids:
  found=[s for s in ss if pid in s['rows']]
  if len(found)>1:total+=(found[-1]['rows'][pid]['seconds']-found[0]['rows'][pid]['seconds'])
 return round(total/(ss[-1]['utc']-ss[0]['utc'])*100,2) if len(ss)>1 else None
summary={'date':'2026-10-07','duration':'90s GUI baseline;300s 35pp reserve; conditional300s 45pp reserve;30s restored','configuration':r['workload'],'sampleRate':44100,'hardwareFrames':512,'scBlock':256,'phases':[],'gui':gui,'allPluginsVerified':len(r['pluginChecks'])==2,'serverFailures':r['serverFailures'],'cleanup':r['teardown'],'engineShutdownConfirmed':r['engineShutdownConfirmed'],'calibrationPassed':True,'rawResults':str(p/'results.json'),'sourceHashes':r['guards'],'scopeAPI':'8 ScopeOut2 stereo taps; native sc-bus-reader; 15Hz polling/canvas display. Direct observer setup, not the full Scope Tool lease UI.','limitations':['Single sequential comparison, no repeated/reversed order','Temporary caffeinate assertions keep display awake through every phase','90s GUI warmup, then calibrated reserve and30s additional settling','Extra DSP calibrated live to 25–30 percentage points; exact result retained','Pro2 silent; recorded cello is the source','SC percentage is callback wall time; process CPU percentages below use one core as 100%','GPU-helper CPU counted; GPU execution time/power not measured']}
for phase in r['phases']:
 start=datetime.datetime.fromisoformat(phase['startedAt'].replace('Z','+00:00')).timestamp();end=datetime.datetime.fromisoformat(phase['endedAt'].replace('Z','+00:00')).timestamp();ss=[s for s in snapshots if start<=s['utc']<=end];gpu={pid for s in ss for pid,v in s['rows'].items() if pid in tree and '/Electron Helper.app/' in v['command']};window={pid for s in ss for pid,v in s['rows'].items() if v['command'].endswith('/WindowServer')}
 summary['phases'].append({'label':phase['label'],'scAverage':phase['scAverage'],'scSampledPeak':phase['scPeak'],'engineFaultCallbacks':phase['audio']['residualCallbacks'],'returnFaultCallbacks':phase['input']['residualCallbacks'],'nativeOverBudgetCallbacks':phase['audio']['overBudgetCallbacks'],'nativeLateCallbacks':phase['audio']['lateCallbacks'],'nativeMaxCallbackMs':phase['audio']['maxDspMs'],'recorderReliable':phase['recorderReliable'],'engineFaultAndOverBudgetSecondsIntoPhase':[round((e['entryNs']-phase['hostNsRange'][0])/1e9,3) for e in phase['audio']['events']],'systemCPU':{'samples':len(ss),'enginePercentOneCore':cost(ss,{r['session']['scPID']}),'languagePercentOneCore':cost(ss,{r['session']['sclangPID']}),'compositeElectronIncludingGPUPercentOneCore':cost(ss,tree),'nonRendererHelpersGPUAndUtilityPercentOneCoreIncludedAbove':cost(ss,gpu),'WindowServerPercentOneCore':cost(ss,window)}})
summary['reserveCalibration']=r['reserveCalibration'];summary['reserveCalibrations']=r.get('reserveCalibrations',[]);summary['followupSkipped']=r.get('followupSkipped');summary['configuration']['note']='Actual cello, live FX/follower modulation, full composite, four delay waves, eight native scopes and16 send edits at15Hz; separate continuity pilot with hardware FX muted';summary['rendererDuringMeasurement']='Current compact delay performance view loaded at GUI startup';
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({'phases':summary['phases'],'gui':gui},indent=2))
