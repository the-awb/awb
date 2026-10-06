#!/usr/bin/env python3
"""Summarise balanced layout blocks; retain signs/drift rather than imply a universal threshold."""
import argparse,json,math,statistics
from collections import defaultdict
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('runs',nargs='+',type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args();result=[]
for folder in a.runs:
 meta=json.loads((folder/'results.json').read_text());assert meta['passed'];live=meta['live'];group=defaultdict(list)
 records=live['records'];expected=2 if meta.get('inPlace') else 1
 for cycle,count,profile,layout,steps,messages,rows in records:
  assert len(rows)==meta.get('measureSeconds',6)*5 and all(math.isfinite(x) for row in rows for x in row)
  assert profile.startswith('active');active=int(profile[6:]);assert 0<=active<=count
  group[(cycle,count,active,layout)].append(dict(mean=statistics.mean(r[1] for r in rows),peak=max(r[2] for r in rows)))
 cells=[]
 for count,active in sorted({(key[1],key[2]) for key in group}):
  blocks=[]
  for cycle in [1,2]:
   mono=group[(cycle,count,active,'monolithic')];split=group[(cycle,count,active,'splitPaused')];assert len(mono)==len(split)==expected
   m=statistics.mean(v['mean'] for v in mono);s=statistics.mean(v['mean'] for v in split)
   blocks.append(dict(cycle=cycle,monolithic=m,splitPaused=s,deltaPoints=s-m,monolithicPeak=max(v['peak'] for v in mono),splitPausedPeak=max(v['peak'] for v in split),monolithicPhaseMeans=[v['mean'] for v in mono],splitPhaseMeans=[v['mean'] for v in split]))
  cells.append(dict(sends=count,active=active,inactive=count-active,monolithic=statistics.mean(v['monolithic'] for v in blocks),splitPaused=statistics.mean(v['splitPaused'] for v in blocks),deltaPoints=statistics.mean(v['deltaPoints'] for v in blocks),blocks=blocks))
 phasesOver100=[dict(index=i,cycle=r[0],sends=r[1],profile=r[2],layout=r[3],peak=max(v[2] for v in r[6])) for i,r in enumerate(records) if max(v[2] for v in r[6])>100]
 item=dict(evidence=str(folder),loadNodes=meta.get('loadNodes',0),inPlace=meta.get('inPlace',False),measureSeconds=meta.get('measureSeconds',6),phases=len(records),sampleRate=live['sampleRate'],engineSHA256=meta['engineSHA256'],idleMean=statistics.mean(v[1] for v in live['idle']),cells=cells,phasesWithSampledPeakOver100=phasesOver100)
 result.append(item)
 print('\n{}: load={} mode={} phases={} idle={:.2f}%'.format(folder.name,item['loadNodes'],'in-place' if item['inPlace'] else 'rebuild',len(records),item['idleMean']))
 for v in cells:print('{} active={:2d} inactive={:2d}: {:.3f}% / {:.3f}% delta {:+.3f}, blocks {}'.format(v['sends'],v['active'],v['inactive'],v['monolithic'],v['splitPaused'],v['deltaPoints'],[round(b['deltaPoints'],3) for b in v['blocks']]))
 assert item['sampleRate']==44100
assert len({v['engineSHA256'] for v in result})==1
out=dict(runs=result,limits=['Static send profiles, 8 stereo channels','Only declared zero routes suspended; no production pause/fade/resume policy','Loaded near-zero differences are unresolved when repeat drift is comparable','Peaks are cached status observations, not distinct overrun/dropout counts','Muted hardware, no return-audio capture','Synthetic common DSP, no GUI/bridge/actual FX chain test'])
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(out,indent=2)+'\n')
