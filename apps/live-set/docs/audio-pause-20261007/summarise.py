import json,struct,shutil
from pathlib import Path
root=Path('/private/tmp/awb-audio-pause-load');r=json.loads((root/'results.json').read_text());cov=json.loads((root/'follower-coverage.json').read_text());binary=(root/'output.audit').read_bytes()
phases=[]
for p in r['phases']:
 rows=[struct.unpack_from('<20d',binary,4096+i*160) for i in range(p['outputRange']['first'],p['outputRange']['end'])]
 assert all(x[0]==p['outputRange']['first']+i and x[4]==512 and x[5]==44100 for i,x in enumerate(rows))
 assert sum(x[11]>0 for x in rows)==p['audio']['residualCallbacks']
 phases.append(dict(label=p['label'],seconds=p['audio']['seconds'],scAverage=p['scAverage'],scSampledPeak=p['scPeak'],meanCallbackDspMs=p['audio']['meanDspMs'],maxCallbackDspMs=p['audio']['maxDspMs'],maxAuditMs=p['audio']['maxAuditUs']/1000,engineDiscontinuityCallbacks=p['audio']['residualCallbacks'],returnDiscontinuityCallbacks=p['input']['residualCallbacks'],returnSilentCallbacks=p['input']['silentCallbacks'],nativeOverBudgetCallbacks=p['audio']['overBudgetCallbacks'],engineFrameGaps=p['audio']['frameGaps'],recorderReliable=p['recorderReliable']))
measure=[x for x in cov['stats'] if x['name'].endswith('Measurement')];follow=[x for x in cov['stats'] if x['name'].endswith('ControlFollower')]
assert all(x['finite'] and x['max']>0 and x['max']>x['min'] for x in measure)
assert all(x['controls']['in'] in [m['controls']['out'] for m in measure] for x in follow)
s=dict(complete=r['complete'],configuration=r['workload'],session=r['session'],phases=phases,coverage=dict(detectorsWithVaryingNonzeroInput=len(measure),followersReceivingThoseInputs=len(follow),followersWithVaryingNonzeroOutput=sum(x['max']>0 and x['max']>x['min'] for x in follow),zeroOutputFollower=dict(id='f_stut',scale=0,reason='Original BaseLaunch preset; input is active')),guardsVerified=r['guardsVerified'],engineShutdownConfirmed=r['engineShutdownConfirmed'],teardown=r['teardown'],serverFailures=r['serverFailures'],nativePhaseRowsRevalidatedAfterShutdown=True,rawDirectory=str(root),limits=['No GUI/scope bridge or extra calibrated 25% DSP reserve','VC is the real cello source; Pro2 and external SC1/SC2 inputs are silent','Five active audio FX sends and all sixteen control sends are fed; three spare audio slots remain empty','Pause windows are 12 seconds, one sequential pass, changing audio/modulation state','Continuity is measured on a separate quiet pilot; processed FX output is metered then cleared at hardware output','A1 fault coincides with 14.22 ms in callback auditor, so instrumentation/scheduling may contribute','Original live loading summary includes invalid zero records; do not use its aggregate timing/frame-gap totals'])
(root/'summary.json').write_text(json.dumps(s,indent=2))
out=Path('/Users/willy/awb/apps/live-set/docs/audio-pause-20261007');out.mkdir(exist_ok=True)
for name in ['summary.json','results.json','follower-coverage.json','process.log']:shutil.copy2(root/name,out/name)
for name in ['pause-run.mjs','pause-source.scd','verify-followers.mjs','summarise.py']:shutil.copy2(Path('/private/tmp/awb-audio-pause-prep')/name,out/name)
rows='\n'.join('| '+p['label'].replace('cello-profile-','').replace('pause-','Paused ')+' | '+f"{p['scAverage']:.2f}% | {p['scPeak'] if 'scPeak' in p else p['scSampledPeak']:.2f}% | {p['maxCallbackDspMs']:.2f} | {p['engineDiscontinuityCallbacks']} | {p['returnDiscontinuityCallbacks']} |" for p in phases)
text='''\n\n## Warmed audio-only component pause test — 7 October 2026

The user cleared the machine. An isolated audited scsynth host ran real recorded cello through the same first-pass FX, 16 control sends, 25 followers and four recording delays. Configuration: 44.1 kHz, SC block 128, MOTU 512, four hardware outputs, FFT 4096, IR cap 30 seconds, two VST DSP workers. No GUI, scopes, MIDI or additional calibrated DSP reserve. There are nine persistent rack channels, but VC is the active source; Pro2 and external SC1/SC2 are silent. The three spare audio destinations remain empty. Five active audio sends and all sixteen control sends receive cello.

After 90 seconds warmup: 60 seconds all-active, 12-second hard pause windows for each listed component with 3-second settle/resume gaps, then 30 seconds restored. Hard server node/group pauses preserve mappings; they are diagnostic operations, not a live tail policy. The source and modulation evolve during this sequential test; small differences cannot be assigned as precise additive component costs.

| State | SC average | Sampled SC peak | Max native DSP ms | Engine discontinuity callbacks | Return discontinuity callbacks |
| --- | ---: | ---: | ---: | ---: | ---: |
'''+rows+'''

Both all-active baseline windows were clean and had almost identical average load. Verb accounts for the largest measurable saving (approximately 14.3 percentage points); all FX paused lowers average load to 7.51%. All delays paused leaves average at 33.72%, so this short run finds little marginal delay cost. Individual UM/Scheps/delay differences are within workload variation. This warmed clean audio-only result removes any need to infer that the GUI made the previous run better; it does not establish the cause of those earlier faults.

Two transient fault episodes occurred during pause windows. A1 paused: engine pilot clean, two discontinuity callbacks and three silent callbacks on the return; native DSP itself peaked at 7.58 ms, but one audit section took 14.22 ms. That section is normally a few microseconds; instrumentation/preemption may have contributed, so this episode cannot be attributed to audio DSP. All delays paused: two engine discontinuity callbacks, four return discontinuity callbacks; native DSP reached 12.19 ms (hardware period 11.61 ms). Neither episode demonstrates that delay processing caused the fault. The capture recorder had no dropped data, overruns or timestamp frame gaps. Pauses/resumes outside the measured intervals are retained in the complete timeline and raw data.

Coverage was queried during warmup: all 16 detector outputs were nonzero and changing; all 25 follower inputs refer to those live detector buses. 24 follower outputs were nonzero and changing. f_stut retains its saved zero scale, so its output is zero by design. No GUI polling was added. The initial whole-tree query exceeded the server response buffer; a compact tree and individual readbacks succeeded. This read-only diagnostic failure is separate from the main harness, which recorded no OSC failures.

Every measured native phase was checked again against the completed binary capture: all sequence IDs, 512-frame periods and 44.1 kHz rates were valid and discontinuity counts matched. The live allocation/loading aggregate contains invalid zero records and must not be used for timing/frame-gap totals; the actual heaviest valid startup callback was 18.18 ms while starting cello. All 13 plugins passed readbacks before and after. Frozen source guards passed. Engine, language and return recorder exited, and the exclusive reservation was released; preview remains stopped.

Evidence: `audio-pause-20261007/summary.json`, full status/timeline `results.json`, `follower-coverage.json`, process log and exact private probe variants. Raw native/return capture remains at `/private/tmp/awb-audio-pause-load`. This is component isolation, not a full GUI/headroom qualification or a sustained dropout-free claim.
'''
p=Path('/Users/willy/awb/apps/live-set/docs/shared-host-audio.md');p.write_text(p.read_text()+text)
print(json.dumps({'saved':str(out),'phases':len(phases),'nativeRowsValidated':sum(p['audio']['callbacks'] for p in r['phases'])}))
