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
    return hashlib.sha256(json.dumps(content, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


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
              '| Capture ID | Parent | Name | Type | Volume | Mute | Solo | Top-level devices |',
              '| --- | --- | --- | --- | --- | --- | --- | --- |']
    for t in tracks:
        parent = ('project root' if t['parent'] is None else t['parent']) if t['parentStatus'] == 'observed' else 'unresolved'
        lines.append('| ' + ' | '.join(map(escape, [t['id'], parent, t['name'], t['type'], t['volume']['display'],
                                                  t['mute'], t['solo'], t['chain']['total']])) + ' |')
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
    args = parser.parse_args()
    try:
        run, snapshot = load_capture(args.capture)
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
    (args.out / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(f"Rendered {len(snapshot['tracks'])} tracks, {snapshot['deviceCount']} devices to {args.out}")


if __name__ == '__main__':
    main()
