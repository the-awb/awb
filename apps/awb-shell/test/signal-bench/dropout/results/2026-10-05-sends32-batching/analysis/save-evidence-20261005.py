import json,pathlib,hashlib,statistics,shutil,subprocess,time
root=pathlib.Path('/Users/willy/awb');base=pathlib.Path('/private/tmp/awb-transport-batching-6a9bc49-20261005');m=json.loads((base/'manifest.json').read_text());assert m['complete'] and m['sourceGuardsVerified'] and len(m['results'])==4
out=root/'apps/awb-shell/test/signal-bench/dropout/results/2026-10-05-sends32-batching';out.mkdir(exist_ok=False);(out/'analysis').mkdir()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for r in m['results']:
 assert r['functionalPass'] and r['missingCommands']==0 and r['endpointMismatchCount']==0 and r['shadowMismatchCount']==0 and r['after']['audioServerRunning']==0
 assert r['wire']['commands']==r['sentCommands']==r['acceptedCommands']
 row={k:v for k,v in r.items() if k not in ['udpBefore','udpAfter']}
 row['rawResultSHA256']=sha(base/f"pass{r['pass']}-{r['mode']}"/'result.json');row['sourceGuardsVerified']=True
 entry=next(e for e in m['runs'] if e['pass']==r['pass'] and e['mode']==r['mode']);row['languagePID']=entry['languagePID'];row['languageExitCode']=entry['languageExitCode'];assert row['languageExitCode']==0
 rows.append(row)
groups=[]
for mode in ['baseline','batched']:
 cases=[r for r in rows if r['mode']==mode];groups.append({'mode':mode,'passes':sum(r['functionalPass'] for r in cases),'captures':len(cases),'requestedChanges':sum(r['requestedChanges'] for r in cases),'sentAndAcceptedCommands':sum(r['acceptedCommands'] for r in cases),'outgoingUDPPackets':sum(r['wire']['packets'] for r in cases),'bundles':sum(r['wire']['bundles'] for r in cases),'udpFullBufferDrops':sum(r['udpFullBufferDrops'] for r in cases),'missingCommands':sum(r['missingCommands'] for r in cases),'retainedFraction':sum(r['acceptedCommands'] for r in cases)/sum(r['requestedChanges'] for r in cases)})
summary={k:v for k,v in m.items() if k not in ['results','runs']};summary.update(cases=rows,groups=groups,recordedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),baselineFullCommit=subprocess.check_output(['git','rev-parse',m['baseline']],cwd=root,text=True).strip(),runnerSHA256=sha(pathlib.Path('/private/tmp/awb-transport-batching-load-20261005.mjs')),baselineSourceHashes={str(p.relative_to(base/'baseline')):sha(p) for p in (base/'baseline/apps/rack').rglob('*.mjs')},limitations=['Bitwig was running; no CPU or audio performance claims.','SC audio dispatch was stubbed and endpoint commands captured; no scsynth process or MOTU configuration changes.','Both baseline runs passed here, so the original combined-load receiver failure was not reproduced.','Intermediate values can be coalesced before sending; missingCommands counts sent-but-unaccepted commands only.'])
(out/'transport-summary.json').write_text(json.dumps(summary,indent=2)+'\n');shutil.copy2('/private/tmp/awb-transport-batching-load-20261005.mjs',out/'analysis/transport-load-20261005.mjs');shutil.copy2(__file__,out/'analysis/save-evidence-20261005.py')
before,after=groups;packetSaving=100*(1-after['outgoingUDPPackets']/after['sentAndAcceptedCommands']);more=100*(after['sentAndAcceptedCommands']/before['sentAndAcceptedCommands']-1)
report=root/'apps/awb-shell/docs/rack-motu-sends32-bridge.md';s=report.read_text();s+='''
## Transport-only batching follow-up — 5 October 2026

The outgoing batching and shutdown EPIPE fix are committed as `6a9bc49` on
`integration/bw-sc`. At Willy's request this follow-up leaves Bitwig running and
makes no CPU/audio-performance claim. It starts private sclang instances with
the actual ToolInstance/Tool/NodeManager and the same eight-channel/32-send rack,
including all 32 pass processors. Audio dispatch is stubbed: the outgoing SC
server commands are captured and checked, and no scsynth server is booted. No
MOTU sample-rate, buffer, routing or Bitwig state is changed.

The previous runtime at `fba7843` and the batched runtime each run twice for
45 seconds, with order reversed. The same 296 controls change every 32 ms:
416,472 requested changes per run. WebSocket input, Node's 16 ms coalescing,
OSC transport, SC revision fences and bidirectional feedback are real. Graphics
are absent. Final SC commanded values and the stubbed server gain/level writes
must match all 296 targets; accepted revisions must equal transmitted commands.

| Runtime | Control passes | Sent and accepted commands, both runs | UDP packets, both runs | Missing commands | UDP buffer drops |
|---|---:|---:|---:|---:|---:|
'''+f"| Previous | 2/2 | {before['sentAndAcceptedCommands']:,} | {before['outgoingUDPPackets']:,} | 0 | 0 |\n| Batched | 2/2 | {after['sentAndAcceptedCommands']:,} | {after['outgoingUDPPackets']:,} | 0 | 0 |\n"+f'''
The batched runs accepted {rows[1]['acceptedCommands']:,} and {rows[2]['acceptedCommands']:,}
commands in {rows[1]['wire']['packets']:,} and {rows[2]['wire']['packets']:,} packets respectively:
**{packetSaving:.2f}% fewer packets per retained command** than one-message packets.
Both had zero bridge failures, disarming, sync errors or final-value mismatches.
All batched control packets were bounded at 1,200 bytes. The queue preserves
retained commands; it does not promise to send every calculated intermediate
value. Across the two runs it retained {more:.1f}% more intermediate commands
than the previous runtime; these counts are transport observations on a busy
machine, not a controlled CPU/latency comparison.

The previous runtime also passed in this audio-free environment. The original
combined DSP/graphics receiver failure therefore was **not reproduced**, and
these results do not establish that batching fixes it at that earlier limit.
They establish correct sustained batching at the requested message workload,
with substantially fewer packets. A quiet-window repeat with the original
hardware DSP load remains the test for the earlier capacity failure. SC's
repeated full gain-vector writes and transition step scheduling remain unchanged.

All four sclang instances exited cleanly. All 27 protected implementation/class
source hashes remained unchanged during capture. The committed [transport
summary](../test/signal-bench/dropout/results/2026-10-05-sends32-batching/transport-summary.json)
retains endpoint snapshots, command/packet counts, revision accounting and source
provenance; its analysis folder retains the historical runner. Raw logs and
private fixtures remain in `/private/tmp/awb-transport-batching-6a9bc49-20261005`.
''';report.write_text(s)
p=root/'apps/awb-shell/docs/rack-instruments-readiness.md';s=p.read_text();old='''Next: compare the previous and batched 8-channel/32-send heavy transport with
actual sclang classes and stubbed audio dispatch, while Bitwig work continues.
This is a transport-correctness gate; CPU/audio performance awaits a quiet window.
''';assert old in s;s=s.replace(old,'''The transport-only previous/batched comparison is complete: both batched runs
passed with 826,834 accepted commands in 55,860 packets, zero missing commands,
zero UDP buffer drops and correct final values. Both previous-runtime runs also
passed without DSP/graphics load, so the original failure is not reproduced.
See the follow-up in the [32-send report](rack-motu-sends32-bridge.md). The original
hardware/DSP repeat remains pending a quiet window; Bitwig stayed running.
''');p.write_text(s)
print(json.dumps(groups,indent=2));print('source guards',len(m['sourceGuards']));print(out)
