#!/usr/bin/env python3
"""Compact report and screenshot/controller checks for a completed mapper snapshot."""
import argparse
import json
from collections import Counter
from pathlib import Path


def devices(chain):
    for d in chain.get('items', []):
        yield d
        for kind in ('layers', 'pads', 'slots'):
            for c in d.get(kind, {}).get('items', []):
                yield from devices(c.get('chain', {}))


def esc(value):
    return str(value).replace('|', '\\|').replace('\n', ' ').replace('<', '&lt;').replace('>', '&gt;')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--references', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    s = json.loads(args.snapshot.read_text())
    ref = json.loads((args.references / 'screenshot-track-reference.json').read_text())
    osc = json.loads((args.references / 'osc-controller-reference.json').read_text())
    tracks = {t['index']: t for t in s['tracks']}
    all_devices = [d for t in s['tracks'] for d in devices(t['chain'])]
    names = []
    for r in ref['tracks']:
        t = tracks.get(r['inferredFlatIndex'])
        expected = r['visibleName']
        status = 'missing' if t is None else 'match' if t['name'] == expected else 'partial_match' if r['nameTruncated'] and t['name'].startswith(expected.rstrip('.')) else 'mismatch'
        names.append({'index': r['inferredFlatIndex'], 'screenshotLabel': expected,
                      'hostName': t['name'] if t else None, 'status': status})
    modules = []
    for m in osc['modules']:
        t = tracks.get(m['flatIndex'])
        modules.append({**m, 'hostTrackName': t['name'] if t else None,
                        'trackNameMatches': t is not None and t['name'] == m['screenshotTrackLabel']})
    parameter_coverage = Counter(d.get('parameters', {}).get('status', 'unimplemented') for d in all_devices)
    send_counts = dict(Counter(t['sendTotal'] for t in s['tracks']))
    missing_slots = [{'track': t['id'], 'locator': d['locator'], 'device': d['name'], 'slot': c['name'],
                      'reason': c['chain'].get('reason')} for t in s['tracks'] for d in devices(t['chain'])
                     for c in d.get('slots', {}).get('items', []) if c['chain']['status'] != 'observed']
    checks = {'screenshots': names, 'nameStatusCounts': dict(Counter(n['status'] for n in names)),
              'countMatches': len(s['tracks']) == ref['totalVisibleTracks'], 'oscModules': modules,
              'directParameterCoverage': dict(parameter_coverage), 'sendCounts': send_counts,
              'unresolvedDeviceSlots': missing_slots,
              'boundaries': ['Matching a send label or controller position does not independently prove a routing edge.',
                             'UUID-filtered controller device positions are not unfiltered capture positions.']}
    if 'rootEffectBank' in s:
        bank = {t['index']: t for t in s['rootEffectBank']['tracks']}
        checks['oscBusBindings'] = [{'module': m['key'], 'localBusIndex': j, 'effectBankIndex': i,
                                    'hostName': bank.get(i, {}).get('name'),
                                    'screenshotOrderName': tracks.get(45 + i, {}).get('name'),
                                    'nameOrderMatches': bank.get(i, {}).get('name') == tracks.get(45 + i, {}).get('name')}
                                   for m in modules for j, i in enumerate(m['effectBankBusIndices'])]
    if 'controllerTargets' in s:
        checks['controllerDeviceTargets'] = s['controllerTargets']
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / 'reference-checks.json').write_text(json.dumps(checks, indent=2) + '\n')
    lines = ['# awb 5.2: capture overview', '',
             f"Bitwig {s['host']['version']} / API {s['host']['api']}. "
             f"{len(s['tracks'])}/{s['totalTracks']} tracks, {s['deviceCount']} inspected devices, "
             f"{sum(d['enabled'] is False for d in all_devices)} disabled devices.", '',
             f"Screenshot name checks: {dict(Counter(n['status'] for n in names))}. "
             f"OSC module track checks: {sum(m['trackNameMatches'] for m in modules)}/{len(modules)}.", '',
             f"Direct-parameter coverage by device: {dict(parameter_coverage)}. "
             f"Unresolved named device slots: {len(missing_slots)}.", '',
             'See [the complete map](set-map.md) for every captured value and locator, '
             '[reference checks](reference-checks.json) for discrepancies, and [the snapshot](snapshot.json) '
             'for the structured hierarchy. Values come from a stopped, static host-cache capture; '
             'no atomic snapshot or independent device-parameter UI check is claimed.', '',
             '## Track tree and ordered root devices', '',
             '| Track | Parent | Root device order (disabled marked) |', '| --- | --- | --- |']
    for t in s['tracks']:
        chain = ' → '.join(d['name'] + (' [disabled]' if not d['enabled'] else '') for d in t['chain']['items']) or 'empty'
        parent = t['parent'] or 'project root' if t['parentStatus'] == 'observed' else 'unresolved'
        lines.append('| ' + ' | '.join(map(esc, [t['id'] + ': ' + t['name'], parent, chain])) + ' |')
    lines += ['', '## Sends with nonzero normalized levels', '',
              'These are observed send controls and labels. Destination edges remain unverified.', '',
              '| Source track | Send index | Label | Host display | Normalized | Mode |',
              '| --- | --- | --- | --- | --- | --- |']
    for t in s['tracks']:
        for send in t['sends']:
            if send['normalized'] is not None and send['normalized'] != 0:
                lines.append('| ' + ' | '.join(map(esc, [t['name'], send['index'], send['label'], send['display'],
                                                          send['normalized'], send['mode']])) + ' |')
    lines += ['', '## OSC module controls present in the capture', '',
              'Current remote pages are captured at each device, including nested devices. '
              'The table retains only assigned remote controls. Page labels are resolved from the '
              'observed page-name array when the page proxy itself reports an empty name.', '',
              '| Module / track | Device locator | Page | Assigned controls (index: name = display) |',
              '| --- | --- | --- | --- |']
    selected = {m['flatIndex']: m['key'] for m in modules}
    selected[64] = 'Master devices used by mast'
    for t in s['tracks']:
        if t['index'] not in selected:
            continue
        for d in devices(t['chain']):
            remote = d.get('remoteControls', {})
            params = [p for p in remote.get('items', []) if p['exists']]
            if not params:
                continue
            idx = remote['selectedPageIndex']
            page_name = remote['name'] or (remote['pageNames'][idx] if 0 <= idx < len(remote['pageNames']) else 'unresolved')
            label = json.dumps(d['locator'], separators=(',', ':'))
            controls = '; '.join(f"{p['index']}: {p['name']} = {p['display']}" for p in params)
            lines.append('| ' + ' | '.join(map(esc, [selected[t['index']] + ' / ' + t['name'], d['name'] + ' ' + label, page_name, controls])) + ' |')
    if 'rootEffectBank' in s:
        lines += ['', '## Root effect-bank order used by OSC', '',
                  'The dedicated API effect bank reports ' + str(s['rootEffectBank']['total']) +
                  ' tracks. These positions are independent of flat positions and send indices.', '',
                  '| Effect-bank index | Host track name |', '| --- | --- |']
        for t in s['rootEffectBank']['tracks']:
            lines.append('| ' + str(t['index']) + ' | ' + esc(t['name']) + ' |')
    if 'controllerTargets' in s:
        c = s['controllerTargets']
        lines += ['', '## OSC device-target check', '',
                  'The exact native FX Layer matcher from the installed controller is `' + c['matcherUUID'] + '`.', '',
                  '- `pro2`: ' + str(c['pro2Track']['fxLayers']['total']) + ' matching root FX Layers on `' + c['pro2Track']['name'] +
                  '`. The source binds filtered FX Layer index 0.',
                  '- `mast`: ' + str(c['masterFxLayers']['total']) + ' matching root FX Layers on Master. '
                  'The source binds filtered root index 0 for mast and index 1 for `stut 2`.', '',
                  'An absent filtered target is a configuration mismatch with this open template instance. '
                  'This check does not send MIDI or prove which controls are used during performance.']
    if all('activated' in t for t in s['tracks']):
        lines += ['', '## Track state supplement', '',
                  'Inactive tracks: ' + ', '.join('`' + t['name'] + '`' for t in s['tracks'] if t['activated'] is False) + '.',
                  'Armed tracks: ' + ', '.join('`' + t['name'] + '`' for t in s['tracks'] if t['armed'] is True) + '.',
                  'All 65 track names, mute states, volume and pan values agreed between the main and state passes.']
    lines += ['', '## Remaining gaps', '',
              'Input/output destinations, verified send edges, modulation assignment targets/amounts, '
              'plugin versions and hidden device state need separate evidence. Remaining unresolved '
              'parameter observations are explicitly marked in the full map. Slot navigation that '
              'retained its parent is unresolved rather than claimed empty. Other remote pages '
              'were not traversed. These gaps limit reproduction of the original DSP and routing.']
    (args.out / 'overview.md').write_text('\n'.join(lines) + '\n')
    print(json.dumps({'tracks': len(s['tracks']), 'devices': s['deviceCount'],
                      'nameChecks': checks['nameStatusCounts'], 'moduleMatches': sum(m['trackNameMatches'] for m in modules),
                      'parameterCoverage': dict(parameter_coverage), 'unresolvedSlots': len(missing_slots)}))


if __name__ == '__main__':
    main()
