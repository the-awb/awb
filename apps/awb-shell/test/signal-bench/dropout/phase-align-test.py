import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('phase_align', Path(__file__).with_name('phase-align.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

XML = '''<trace><row><event-time>100</event-time><process id="p"><pid>7</pid></process>
<signpost-name id="n" fmt="AWBPhase"/><subsystem id="s" fmt="org.awb.rack.bench"/>
<os-log-metadata fmt="n0-probe-r1:before"/></row><row><event-time>500</event-time>
<process ref="p"/><signpost-name ref="n"/><subsystem ref="s"/>
<os-log-metadata fmt="n0-probe-r1:after"/></row></trace>'''


def record():
    def clocks(start, end):
        return [{'event': 'beforeSignpost', 'machBeforeNs': start, 'pid': 7},
                {'event': 'afterSignpost', 'machAfterNs': end, 'pid': 7}]
    return {'label': 'n0-probe-r1', 'beforePhase': clocks(1090, 1110),
            'afterPhase': clocks(1495, 1515), 'auditRange': {'firstEntryNs': 1200, 'lastEntryNs': 1400}}


class AlignmentTests(unittest.TestCase):
    def test_reference_rows_and_audit_conversion(self):
        result = module.align(XML, record())
        self.assertEqual((result['machMinusTraceMinNs'], result['machMinusTraceMaxNs']), (995, 1010))
        self.assertEqual(result['auditTraceRangeNs']['firstMin'], 190)
        self.assertTrue(result['auditCovered'])

    def test_missing_marker(self):
        with self.assertRaisesRegex(ValueError, 'Missing AWB'):
            module.align(XML.replace(':after', ':other'), record())

    def test_clock_disagreement(self):
        r = record()
        r['afterPhase'][0]['machBeforeNs'] += 100
        r['afterPhase'][1]['machAfterNs'] += 100
        with self.assertRaisesRegex(ValueError, 'do not overlap'):
            module.align(XML, r)

    def test_pid_mismatch(self):
        r = record()
        r['afterPhase'][0]['pid'] = 8
        with self.assertRaisesRegex(ValueError, 'PID'):
            module.align(XML, r)

    def test_audit_outside_retained_window(self):
        r = record()
        r['auditRange']['firstEntryNs'] = 1000
        with self.assertRaisesRegex(ValueError, 'outside'):
            module.align(XML, r)

    def test_broken_xml_reference(self):
        with self.assertRaisesRegex(ValueError, 'Broken XML'):
            module.align(XML.replace('ref="n"', 'ref="missing"'), record())


if __name__ == '__main__':
    unittest.main()
