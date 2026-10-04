"""Render the latest complete bounded probe run; never infer routing from labels."""
from pathlib import Path
import datetime, hashlib, json

BASE = Path(__file__).resolve().parent
events = [json.loads(line) for line in (BASE/'evidence/live-probe.jsonl').read_text().splitlines()]
completed = [e['run'] for e in events if e['kind']=='done']
assert completed, 'No complete probe run; do not report successful capture'
run = completed[-1]
rows = [e for e in events if e['run']==run]
init = next(e['data'] for e in rows if e['kind']=='init')
done = next(e['data'] for e in rows if e['kind']=='done')
windows = [e['data'] for e in rows if e['kind']=='window']
assert [w['snapshot']['offset'] for w in windows] == [0,8]
tracks=[]
for w in windows:
    for t in w['snapshot']['tracks']:
        tracks.append({'captureRef':f"window:{w['snapshot']['offset']}/slot:{t['bankIndex']}",
            'observationStatus':'observed host cache; UI comparison pending',
            'parentIdentityStatus':'unresolved; parent position has its own context',
            **t})
assert len(tracks)==16
disabled=[{'track':t['captureRef'],'trackName':t['name'],'deviceIndex':d['index'],'name':d['name']}
    for t in tracks for d in t['chain']['devices'] if d['enabled'] is False]
selected=windows[-1]['snapshot']['selectedDevice']
device_count=sum(len(t['chain']['devices']) for t in tracks)
send_count=sum(len(t['sends']) for t in tracks)
result={'artifactKind':'actual host partial witness; not complete set documentation',
    'capture':{'run':run,'host':init,'probeSha256':hashlib.sha256((BASE/'InspectionProbe.control.js').read_bytes()).hexdigest(),
        'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'settling':'Consecutive equal snapshots after bounded waits. This is not a callback-completeness proof.',
        'selectionSideEffects':'none from this probe','playback':'probe aborts if host reports playing'},
    'sourceAssociation':{'status':'unresolved','value':None,
        'reason':'Awaiting confirmation of exact open project file; do not assign the original file hash from matching names'},
    'tracks':tracks,'selectedDevice':selected,
    'coverage':{'reportedFlatBankEntries':done['total'],'returnedTracks':len(tracks),'truncated':done['truncated'],
        'deviceLimitPerChain':12,'sendLimit':8,'layerLimit':8,'selectedParameterLimit':16,
        'routingDestinationIdentities':'unresolved','allNestedTraversal':'unimplemented',
        'modulationAssignments':'unavailable through reviewed general API; specific device exceptions unresolved',
        'fxMasterCoverage':'unresolved: full flat bank not traversed','controlledFixture':'unresolved',
        'UIComparison':'unresolved'},'disabledDevices':disabled,'humanAnnotations':[]}
confirmation_path=BASE/'evidence/source-association-confirmation.json'
if confirmation_path.is_file():
    confirmation=json.loads(confirmation_path.read_text())
    result['sourceAssociation']={'status':'observed', 'value':{'mappingTargetConfirmed':confirmation['mappingTargetConfirmed'],
        'templateInstanceOf':confirmation['templateName']}, 'evidence':[confirmation],
        'instanceFileIdentity':{'status':'unresolved','path':confirmation.get('instanceFilePath'),
            'sha256':confirmation.get('instanceFileHash'), 'reason':'Template and instance file identities are separate provenance.'}}
(BASE/'evidence/host-partial.json').write_text(json.dumps(result,indent=2)+'\n')
escape=lambda s:str(s).replace('|','\\|').replace('\n',' ')
md=['# Open Bitwig set: verified partial description','',
    '4 October 2026. Actual controller observations from Bitwig **4.3.10 / API 17**.',
    '**Exact open-file association and comparison with the UI remain unconfirmed.**',
    'The original target file hash is verified separately; it is not yet attached to this host capture.','',
    f"The probe captured **16 of {done['total']} flat-bank entries**, at offsets 0 and 8. It captured",
    '**15 top-level devices**, including **four disabled devices**. Names and positions are',
    'locations in their recorded contexts, not persistent project IDs.','',
    '| Flat position | Track | Type | Ordered top-level chain |',
    '| --- | --- | --- | --- |']
for t in tracks:
    chain=' → '.join(f"{d['name']} ({'enabled' if d['enabled'] else 'disabled'})" for d in t['chain']['devices']) or '(observed empty chain)'
    md.append(f"| {t['position']} | {escape(t['name'])} | {escape(t['type'])} | {escape(chain)} |")
md+=['','## Selected FX Layer','',
    'The selected FX Layer is enabled, with preset label `delb1 routing 5.0 (remote)`. Its',
    'owning track was not captured, so the preset label is not used to assign it to a track.','',
    '| Layer index | Layer | Ordered child chain |','| --- | --- | --- |']
for layer in selected['layers']:
    chain=' → '.join(f"{d['name']} ({'enabled' if d['enabled'] else 'disabled'})" for d in layer.get('chain',{}).get('devices',[]))
    md.append(f"| {layer['index']} | {escape(layer['name'])} | {escape(chain)} |")
md+=['','Both observed layer children are nested `Audio Receiver` devices at position 0 in',
    'their own layer. Their duplicate names/positions do not make them the same instance.',
    'Both expose a `Source FX` slot; its contents and receiver source targets were not read.','',
    '| Direct parameter ID | Name | Normalized | Display |','| --- | --- | --- | --- |']
for p in selected['parameters']:
    md.append(f"| `{p['id']}` | {escape(p['name'])} | {p['normalized']} | {escape(p['display'])} |")
md+=['','## Sends','',
    'The probe read **128 send slots** across the sampled tracks, preserving zero values,',
    'display strings, effective pre-fader flags and send modes. The labels below are',
    '**not verified destination edges**. All listed nonzero sends report mode `AUTO`',
    'and effective pre-fader `false`.','',
    '| Track | Send index | Observed label | Normalized | Display |','| --- | --- | --- | --- | --- |']
for t in tracks:
    for s in t['sends']:
        if s['normalized']!=0:
            md.append(f"| {escape(t['name'])} | {s['index']} | {escape(s['label'])} | {s['normalized']} | {escape(s['display'])} |")
md+=['','## Gaps','',
    'The remaining 49 flat-bank entries, their chains, all nested containers and all-device',
    'parameters are not captured. Group parent proxies were read, but their context-relative',
    'positions and group-master behavior need comparison before building a parent tree.',
    'Hardware input/output destinations, receiver/sidechain targets and modulation assignments',
    'remain unresolved. No gain law, physical-value conversion or signal path is inferred.',
    'Twelve-device chains and eight sends/layers are fixed limits; longer cases remain untested.','',
    'See [host-partial.json](evidence/host-partial.json) for the raw observed fields and',
    '[target-partial.json](evidence/target-partial.json) for separate file/dependency evidence.','']
if confirmation_path.is_file():
    md=[line.replace('**Exact open-file association and comparison with the UI remain unconfirmed.**',
        '**Willy confirms this is the set to map, instantiated from `awb 5.2 (ef script)`. UI comparison remains outstanding.**')
        .replace('The original target file hash is verified separately; it is not yet attached to this host capture.',
        'The template file hash is separate provenance; the open instance’s path/hash were not captured.') for line in md]
(BASE/'set-description-partial.md').write_text('\n'.join(md))
print(json.dumps({'run':run,'tracks':len(tracks),'total':done['total'],'topLevelDevices':device_count,
    'disabled':len(disabled),'selectedLayers':len(selected['layers']),'directParameters':len(selected['parameters'])}))
