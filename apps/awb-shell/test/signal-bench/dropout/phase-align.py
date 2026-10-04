"""Validate exported AWB signposts and align trace time to callback mach NS.

No wall clock or formatted timestamp is used. Each signpost timestamp must fall
between the native helper's surrounding mach reads. Their offset intervals must
overlap; otherwise this trace is unsuitable for fault correlation.
"""
import json
import sys
import xml.etree.ElementTree as ET


def align(xml, record):
    root = ET.fromstring(xml)
    ids = {e.get('id'): e for e in root.iter() if e.get('id')}

    def resolve(element):
        seen = set()
        while element is not None and element.get('ref'):
            key = element.get('ref')
            if key in seen or key not in ids:
                raise ValueError('Broken XML reference: ' + key)
            seen.add(key)
            element = ids[key]
        return element

    def value(row, tag):
        element = resolve(row.find(tag))
        if element is None:
            return None
        return element.get('fmt') or ''.join(element.itertext())

    markers = {}
    wanted = {record['label'] + ':before', record['label'] + ':after'}
    for row in root.iter('row'):
        if value(row, 'signpost-name') != 'AWBPhase' or value(row, 'subsystem') != 'org.awb.rack.bench':
            continue
        label = value(row, 'os-log-metadata')
        if label not in wanted:
            continue
        if label in markers:
            raise ValueError('Duplicate phase marker: ' + label)
        time = resolve(row.find('event-time'))
        process = resolve(row.find('process'))
        pid = resolve(process.find('pid')) if process is not None else None
        if time is None or pid is None:
            raise ValueError('Phase marker missing time or PID')
        markers[label] = {'traceNs': int(time.text), 'pid': int(pid.text)}
    if set(markers) != wanted:
        raise ValueError('Missing AWB phase markers: ' + ', '.join(sorted(wanted - set(markers))))

    anchors = []
    for side, field in [('before', 'beforePhase'), ('after', 'afterPhase')]:
        clocks = {s['event']: s for s in record[field]}
        start, end = clocks['beforeSignpost'], clocks['afterSignpost']
        marker = markers[record['label'] + ':' + side]
        if start['pid'] != end['pid'] or start['pid'] != marker['pid']:
            raise ValueError('Phase marker PID does not match native clock bracket')
        low, high = start['machBeforeNs'], end['machAfterNs']
        if low > high:
            raise ValueError('Reversed native clock bracket')
        anchors.append({'side': side, **marker, 'machMinNs': low, 'machMaxNs': high,
                        'offsetMinNs': low - marker['traceNs'], 'offsetMaxNs': high - marker['traceNs']})
    if anchors[0]['traceNs'] >= anchors[1]['traceNs']:
        raise ValueError('Reversed trace markers')
    offset_low = max(a['offsetMinNs'] for a in anchors)
    offset_high = min(a['offsetMaxNs'] for a in anchors)
    if offset_low > offset_high:
        raise ValueError('Native/trace clock offset intervals do not overlap')
    result = {'anchors': anchors, 'machMinusTraceMinNs': offset_low,
              'machMinusTraceMaxNs': offset_high, 'offsetIntervalWidthNs': offset_high - offset_low,
              'conversion': 'traceNs lies in [machNs - machMinusTraceMaxNs, machNs - machMinusTraceMinNs]',
              'wallClockUsed': False, 'auditCovered': None}
    audit = record.get('auditRange')
    if audit:
        first, last = audit['firstEntryNs'], audit['lastEntryNs']
        if first > last or first < anchors[0]['machMinNs'] or last > anchors[1]['machMaxNs']:
            raise ValueError('Callback audit range is outside retained phase markers')
        result['auditCovered'] = True
        result['auditTraceRangeNs'] = {'firstMin': first - offset_high, 'firstMax': first - offset_low,
                                       'lastMin': last - offset_high, 'lastMax': last - offset_low}
    return result


if __name__ == '__main__':
    with open(sys.argv[1]) as f:
        xml = f.read()
    with open(sys.argv[2]) as f:
        record = json.load(f)
    print(json.dumps(align(xml, record), indent=2))
