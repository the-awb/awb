#!/usr/bin/env python3
"""Render one completed controller run. Human annotations remain in a separate file."""
import argparse
import hashlib
import json
from pathlib import Path


def load_capture(path):
    runs = {}
    for line_no, line in enumerate(path.read_text().splitlines(), 1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f'{path}:{line_no}: invalid capture JSON: {exc}') from exc
        runs.setdefault(record['run'], []).append(record)
    if not runs:
        raise ValueError('No controller observations yet')
    # Never silently present an older successful run if the latest run failed.
    run, records = list(runs.items())[-1]
    snapshots = [r['data'] for r in records if r['kind'] == 'snapshot']
    if any(r['kind'] == 'aborted' for r in records):
        reason = next(r['data']['reason'] for r in reversed(records) if r['kind'] == 'aborted')
        raise ValueError(f'Latest run {run} aborted: {reason}')
    if not snapshots or not any(r['kind'] == 'done' for r in records):
        tracks = sum(r['kind'] == 'track' for r in records)
        devices = sum(r['kind'] == 'device' for r in records)
        raise ValueError(f'Latest run {run} is incomplete: {tracks} tracks, {devices} devices recorded')
    return run, snapshots[-1]


def musical_digest(snapshot):
    content = {key: snapshot[key] for key in ('schemaVersion', 'tracks', 'coverage')}
    for key in ('rootEffectBank', 'controllerTargets'):
        if key in snapshot:
            content[key] = snapshot[key]
    return hashlib.sha256(json.dumps(content, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def apply_track_states(snapshot, run, states):
    if states['totalTracks'] != snapshot['totalTracks'] or len(states['tracks']) != len(snapshot['tracks']):
        raise ValueError('Track-state supplement count differs from the main capture')
    by_index = {t['index']: t for t in states['tracks']}
    if len(by_index) != len(states['tracks']):
        raise ValueError('Duplicate indices in track-state supplement')
    for t in snapshot['tracks']:
        state = by_index.get(t['index'])
        if state is None or state['name'] != t['name']:
            raise ValueError(f"Track-state supplement identity mismatch at {t['id']}")
        if state['mute'] != t['mute'] or state['volume'] != t['volume']['normalized'] or state['pan'] != t['pan']['normalized']:
            raise ValueError(f"Track controls changed between capture passes at {t['id']}")
    if 'controllerTargets' in states:
        pro2 = states['controllerTargets']['pro2Track']
        if pro2['offset'] != 5 or pro2['name'] != snapshot['tracks'][5]['name']:
            raise ValueError('Controller target track differs from main capture')
    for t in snapshot['tracks']:
        state = by_index[t['index']]
        t.update({key: state[key] for key in ('activated', 'armed', 'monitorMode')})
        t['trackStateStatus'] = 'observed'
    snapshot['trackStateSupplement'] = {'run': run, 'coverage': states['coverage'],
                                       'association': 'Flat position/name and unchanged mute/volume/pan; static-set two-pass capture, not atomic'}
    if 'effectBank' in states:
        snapshot['rootEffectBank'] = states['effectBank']
    if 'controllerTargets' in states:
        snapshot['controllerTargets'] = states['controllerTargets']


def apply_parameter_pass(snapshot, main_run, run, followup):
    if followup['sourceRun'] != main_run:
        raise ValueError('Parameter follow-up belongs to a different main capture run')
    lookup = {}
    for t in snapshot['tracks']:
        for d in walk_devices(t['chain']):
            key = json.dumps(d['locator'], sort_keys=True)
            if key in lookup:
                raise ValueError('Duplicate device locator in main capture')
            lookup[key] = d
    seen = set()
    for item in followup['items']:
        key = json.dumps(item['locator'], sort_keys=True)
        d = lookup.get(key)
        if key in seen or d is None or d['name'] != item['name'] or d['type'] != item['type']:
            raise ValueError('Parameter follow-up device identity mismatch')
        seen.add(key)
    for item in followup['items']:
        d = lookup[json.dumps(item['locator'], sort_keys=True)]
        d['parameters'] = item['parameters']
        d['parameterSource'] = 'Static-set follow-up, persistent current host-observer cache after bounded rebinding'
    snapshot['parameterFollowup'] = {'run': run, 'sourceRun': main_run, 'coverage': followup['coverage']}


def apply_hierarchy_pass(snapshot, main_run, run, supplement):
    if supplement['sourceRun'] != main_run:
        raise ValueError('Hierarchy supplement belongs to a different main capture')
    by_id = {t['id']: t for t in supplement['parents']}
    if len(by_id) != len(supplement['parents']) or set(by_id) != {t['id'] for t in snapshot['tracks']}:
        raise ValueError('Hierarchy supplement track identities differ')
    for t in snapshot['tracks']:
        parent = by_id[t['id']]
        if parent['name'] != t['name'] or (parent['parent'] is not None and parent['parent'] not in by_id):
            raise ValueError('Hierarchy supplement identity mismatch')
        if t['parentStatus'] == 'observed' and (parent['parentStatus'] != 'observed' or parent['parent'] != t['parent']):
            raise ValueError('Hierarchy supplement conflicts with an observed parent')
    for t in snapshot['tracks']:
        parent = by_id[t['id']]
        t.update({key: parent[key] for key in ('parent', 'parentStatus')})
    snapshot['coverage']['hierarchy'] = 'observed' if all(t['parentStatus'] == 'observed' for t in snapshot['tracks']) else 'unresolved'
    snapshot['hierarchySupplement'] = {'run': run, 'sourceRun': main_run, 'coverage': supplement['coverage']}


def escape(value):
    return str(value).replace('|', '\\|').replace('\n', ' ').replace('\r', ' ').replace('<', '&lt;').replace('>', '&gt;')


def walk_devices(chain):
    for device in chain.get('items', []):
        yield device
        for kind in ('layers', 'pads', 'slots'):
            for container in device.get(kind, {}).get('items', []):
                yield from walk_devices(container.get('chain', {}))


def render(run, snapshot, annotations):
    tracks = snapshot['tracks']
    devices = [d for t in tracks for d in walk_devices(t['chain'])]
    unavailable = sum(d.get('parameters', {}).get('status') != 'observed' for d in devices)
    lines = ['# awb 5.2 (ef script): open-set map', '',
             f"Host: Bitwig {snapshot['host']['version']} / API {snapshot['host']['api']}. Capture run: `{run}`.", '',
             f"Captured {len(tracks)} of {snapshot['totalTracks']} flat-bank tracks and {snapshot['deviceCount']} inspected devices. "
             f"{sum(d['enabled'] is False for d in devices)} devices are disabled. "
             f"{unavailable} devices have partial, unavailable or uninspected parameter coverage.", '',
             'The open set is human-confirmed as an instance of the named template. '
             'Its file path and hash are unresolved; the template hash identifies the source template separately. '
             'Locators identify positions within this capture and are not stable Bitwig object IDs.', '',
             f"Comparable content SHA-256: `{musical_digest(snapshot)}`.", '', '## Coverage', '']
    for key, value in snapshot['coverage'].items():
        lines.append(f'- **{escape(key)}:** {escape(value)}')
    lines += ['', 'Bank and traversal limits: `' + json.dumps(snapshot['limits'], sort_keys=True) + '`.', '',
              'Track volumes and sends retain normalized values and host display strings. '
              'Send labels are not verified routing destinations. Empty strings, zero and disabled states are retained. '
              'Missing callbacks and API NaN values have explicit status.', '', '## Tracks and groups', '',
              '| Capture ID | Parent | Name | Type | Volume | Mute | Solo | Activated | Armed | Monitor | Top-level devices |',
              '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    for t in tracks:
        parent = ('project root' if t['parent'] is None else t['parent']) if t['parentStatus'] == 'observed' else 'unresolved'
        lines.append('| ' + ' | '.join(map(escape, [t['id'], parent, t['name'], t['type'], t['volume']['display'],
                                                  t['mute'], t['solo'], t.get('activated', 'unimplemented'),
                                                  t.get('armed', 'unimplemented'), t.get('monitorMode', 'unimplemented'), t['chain']['total']])) + ' |')
    for t in tracks:
        lines += ['', f"## {escape(t['id'])}: {escape(t['name'])}", '',
                  f"Type: {escape(t['type'])}. Chain coverage: **{t['chain']['status']}**. "
                  f"Volume: {escape(t['volume']['display'])} ({t['volume']['normalized']}); "
                  f"pan: {escape(t['pan']['display'])} ({t['pan']['normalized']}).", '']
        if t['sends']:
            lines += ['| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |',
                      '| --- | --- | --- | --- | --- | --- | --- |']
            for s in t['sends']:
                lines.append('| ' + ' | '.join(map(escape, [s['index'], s['label'], s['display'], s['normalized'],
                                                          s['mode'], s['preFader'], s['destinationStatus']])) + ' |')
            lines += ['', f"Send coverage: {t['sendStatus']}; host count {t['sendTotal']}.", '']
        for d in walk_devices(t['chain']):
            locator = json.dumps(d['locator'], separators=(',', ':'))
            lines += [f"### {escape(d['name'])} — {'enabled' if d['enabled'] else 'disabled'}", '',
                      f"Locator: `{locator}`. Type: {escape(d['type'])}; plugin: {d['plugin']}. "
                      f"Inspection: {d.get('inspectionStatus', 'unimplemented')}.", '']
            for label in ('presetName', 'sampleName'):
                if d[label]:
                    lines += [f"{label}: {escape(d[label])}.", '']
            remote = d.get('remoteControls')
            if remote:
                lines += [f"Remote controls: current page **{escape(remote['name'])}** "
                          f"(index {remote['selectedPageIndex']}, {remote['pageCount']} pages). "
                          f"{escape(remote['coverage'])}.", '',
                          '| Remote index | Name | Normalized | Modulated | Host display | Exists |',
                          '| --- | --- | --- | --- | --- | --- |']
                for p in remote['items']:
                    lines.append('| ' + ' | '.join(map(escape, [p[k] for k in ('index', 'name', 'normalized', 'modulated', 'display', 'exists')])) + ' |')
                lines += ['']
            for kind in ('layers', 'pads', 'slots'):
                if kind in d:
                    containers = d[kind]
                    lines += [f"{kind.capitalize()} ({containers['status']}): " + '; '.join(
                        f"{escape(c.get('name', ''))}: {c['chain']['total']} devices ({c['chain']['status']})" for c in containers['items']) + '.', '']
            params = d.get('parameters', {})
            lines += [f"Parameters: **{params.get('status', 'unimplemented')}**, host count {params.get('total', 'unresolved')}.", '']
            if params.get('items'):
                lines += ['<details><summary>Exposed direct parameters</summary>', '',
                          '| ID | Name | Normalized | Host display | Name / numeric / display status |',
                          '| --- | --- | --- | --- | --- |']
                for p in params['items']:
                    lines.append('| ' + ' | '.join(map(escape, [p['id'], p['name'], p['normalized'], p['display'],
                                                              ' / '.join(p[k] for k in ('nameStatus', 'numericStatus', 'displayStatus'))])) + ' |')
                lines += ['', '</details>', '']
    lines += ['## Human annotations', '',
              'These entries come from the separate annotation file. They do not replace controller observations.', '']
    for key, text in annotations.get('notes', {}).items():
        lines += [f'- **{escape(key)}:** {escape(text)}']
    if not annotations.get('notes'):
        lines += ['No annotations recorded yet. Input/output destinations, send edges, modulation assignments '
                  'and any hidden device state need targeted UI inspection.']
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('capture', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--annotations', type=Path)
    parser.add_argument('--track-states', type=Path)
    parser.add_argument('--parameter-pass', type=Path)
    parser.add_argument('--hierarchy-pass', type=Path)
    args = parser.parse_args()
    try:
        run, snapshot = load_capture(args.capture)
        if args.parameter_pass:
            parameter_run, parameter_snapshot = load_capture(args.parameter_pass)
            apply_parameter_pass(snapshot, run, parameter_run, parameter_snapshot)
        if args.hierarchy_pass:
            hierarchy_run, hierarchy_snapshot = load_capture(args.hierarchy_pass)
            apply_hierarchy_pass(snapshot, run, hierarchy_run, hierarchy_snapshot)
        if args.track_states:
            state_run, state_snapshot = load_capture(args.track_states)
            apply_track_states(snapshot, state_run, state_snapshot)
    except (ValueError, OSError) as exc:
        parser.exit(1, str(exc) + '\n')
    annotations = {'notes': {}}
    if args.annotations and args.annotations.exists():
        annotations = json.loads(args.annotations.read_text())
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / 'snapshot.json').write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + '\n')
    (args.out / 'set-map.md').write_text(render(run, snapshot, annotations))
    provenance = {'run': run, 'capturePath': str(args.capture.resolve()),
                  'captureSha256': hashlib.sha256(args.capture.read_bytes()).hexdigest(),
                  'musicalContentSha256': musical_digest(snapshot),
                  'annotationsPath': str(args.annotations.resolve()) if args.annotations else None}
    if args.track_states:
        provenance['trackStates'] = {'path': str(args.track_states.resolve()),
                                    'sha256': hashlib.sha256(args.track_states.read_bytes()).hexdigest(), 'run': state_run}
    if args.parameter_pass:
        provenance['parameterPass'] = {'path': str(args.parameter_pass.resolve()),
                                      'sha256': hashlib.sha256(args.parameter_pass.read_bytes()).hexdigest(), 'run': parameter_run}
    if args.hierarchy_pass:
        provenance['hierarchyPass'] = {'path': str(args.hierarchy_pass.resolve()),
                                      'sha256': hashlib.sha256(args.hierarchy_pass.read_bytes()).hexdigest(), 'run': hierarchy_run}
    (args.out / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(f"Rendered {len(snapshot['tracks'])} tracks, {snapshot['deviceCount']} devices to {args.out}")


if __name__ == '__main__':
    main()
