#!/usr/bin/env python3
"""Paired aggregates. Deliberately no significance estimate from cached status rows."""
import argparse,json,math,statistics
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--main',required=True,type=Path);p.add_argument('--paused',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
main=json.loads((a.main/'recovered-aggregates.json').read_text());assert main['measurementPhasesComplete']
rows=main['rows'];assert len(rows)==64
paused=json.loads((a.paused/'results.json').read_text());assert paused['passed']
extra=[]
for repeat,count,profile,layout,steps,messages,samples in paused['live']['records']:
 assert len(samples)==30 and all(math.isfinite(v) for row in samples for v in row)
 extra.append(dict(repeat=repeat,sends=count,profile=profile,layout=layout,meanCPU=statistics.mean(r[1] for r in samples),peakCPU=max(r[2] for r in samples),synths=samples[-1][3],ugens=samples[-1][4],steps=steps,messages=messages))
assert len(extra)==12

def compare(source,count,profile,other):
 pairs=[]
 for repeat in [1,2]:
  def find(layout):
   matches=[r for r in source if (r['repeat'],r['sends'],r['profile'],r['layout'])==(repeat,count,profile,layout)]
   assert len(matches)==1;return matches[0]
  left,right=find('monolithic'),find(other)
  pairs.append(dict(repeat=repeat,monolithic=left['meanCPU'],alternative=right['meanCPU'],deltaPoints=right['meanCPU']-left['meanCPU'],monolithicPeak=left['peakCPU'],alternativePeak=right['peakCPU']))
 return dict(sends=count,profile=profile,alternative=other,monolithic=statistics.mean(r['monolithic'] for r in pairs),alternativeCPU=statistics.mean(r['alternative'] for r in pairs),deltaPoints=statistics.mean(r['deltaPoints'] for r in pairs),pairs=pairs)

result=dict(measurementPhases=76,mainExportRecovered=True,rawRowsAvailableForPausedRun=True,channels=8,width=2,sampleRate=44100,blockSize=64,driverFrames=512,engine=paused['engineVersion'],engineSHA256=paused['engineSHA256'],hardware=dict(model='Macmini8,1',processor='Intel Core i7-8700B 3.20 GHz',physicalCores=6,logicalCores=12,memoryBytes=34359738368),
 allRunning=[compare(rows,n,profile,'split') for n in [8,16,24,32] for profile in ['full','zero','sparse','moving']],
 pauseZero=[compare(extra,24,profile,'splitPaused') for profile in ['full','zero','sparse']],
 limits=['SC callback load, not whole-system CPU or GPU/power','Main run exported 64 phase aggregates in its log but failed final raw JSON export','Two repeats only; status readings are cached at approximately 0.7 seconds','Muted hardware output; no dropout or onset/tail measurement','Paused policy is experimental and does not fade before suspension','No FX processors, followers, GUI, bridge or per-voice wrapper benchmark'])
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,indent=2)+'\n')
for v in result['allRunning']+result['pauseZero']:print('{} {} {}: {:.3f}% vs {:.3f}%, delta {:+.3f} points'.format(v['sends'],v['profile'],v['alternative'],v['monolithic'],v['alternativeCPU'],v['deltaPoints']))
