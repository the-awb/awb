import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).parent
spec = importlib.util.spec_from_file_location('renderer', ROOT / 'render-capture.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class CaptureTests(unittest.TestCase):
    def test_fixture_render_preserves_false_zero_and_annotations(self):
        run, snapshot = renderer.load_capture(ROOT / 'fixture-capture.jsonl')
        annotations = {'notes': {'flat/1': 'Human verified: external return destination'}}
        before = json.dumps(annotations)
        result = renderer.render(run, snapshot, annotations)
        self.assertIn('disabled', result)
        self.assertIn('| gain | Gain | 0 | -inf dB |', result)
        self.assertIn('external return destination', result)
        self.assertEqual(before, json.dumps(annotations))

    def test_latest_incomplete_run_never_uses_previous_success(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'capture.jsonl'
            path.write_text((ROOT / 'fixture-capture.jsonl').read_text() + json.dumps({'run': 'new', 'kind': 'init', 'data': {}}) + '\n')
            with self.assertRaisesRegex(ValueError, 'incomplete'):
                renderer.load_capture(path)

    def test_comparable_hash_ignores_session_and_duration(self):
        _, snapshot = renderer.load_capture(ROOT / 'fixture-capture.jsonl')
        old = renderer.musical_digest(snapshot)
        snapshot['durationMs'] += 1000
        self.assertEqual(old, renderer.musical_digest(snapshot))
        snapshot['tracks'][1]['mute'] = True
        self.assertNotEqual(old, renderer.musical_digest(snapshot))

    def state_fixture(self, snapshot):
        return {'totalTracks': snapshot['totalTracks'], 'coverage': 'mock', 'tracks': [
            {'index': t['index'], 'name': t['name'], 'mute': t['mute'], 'volume': t['volume']['normalized'],
             'pan': t['pan']['normalized'], 'activated': False, 'armed': False, 'monitorMode': 'AUTO'}
            for t in snapshot['tracks']]}

    def test_track_supplement_retains_false(self):
        _, snapshot = renderer.load_capture(ROOT / 'fixture-capture.jsonl')
        renderer.apply_track_states(snapshot, 'mock-state', self.state_fixture(snapshot))
        self.assertIs(snapshot['tracks'][1]['activated'], False)
        self.assertEqual(snapshot['trackStateSupplement']['run'], 'mock-state')

    def test_track_supplement_rejects_name_or_control_changes(self):
        _, snapshot = renderer.load_capture(ROOT / 'fixture-capture.jsonl')
        states = self.state_fixture(snapshot)
        states['tracks'][1]['name'] = 'Wrong track'
        with self.assertRaisesRegex(ValueError, 'identity mismatch'):
            renderer.apply_track_states(snapshot, 'mock-state', states)
        states = self.state_fixture(snapshot)
        states['tracks'][1]['volume'] = .9
        with self.assertRaisesRegex(ValueError, 'controls changed'):
            renderer.apply_track_states(snapshot, 'mock-state', states)

    def test_parameter_pass_uses_locator_with_duplicate_names(self):
        main_run, snapshot = renderer.load_capture(ROOT / 'fixture-capture.jsonl')
        first, second = snapshot['tracks'][1]['chain']['items'][:2]
        self.assertEqual(first['name'], second['name'])
        followup = {'sourceRun': main_run, 'coverage': 'mock', 'items': [
            {'locator': first['locator'], 'name': first['name'], 'type': first['type'],
             'parameters': {'status': 'observed', 'total': 0, 'items': []}}]}
        renderer.apply_parameter_pass(snapshot, main_run, 'followup-run', followup)
        self.assertEqual(first['parameters']['total'], 0)
        self.assertEqual(second['parameters']['total'], 1)
        old_hash = renderer.musical_digest(snapshot)
        snapshot['parameterFollowup']['run'] = 'another-session'
        self.assertEqual(old_hash, renderer.musical_digest(snapshot))

    def test_parameter_pass_rejects_wrong_main_run(self):
        main_run, snapshot = renderer.load_capture(ROOT / 'fixture-capture.jsonl')
        with self.assertRaisesRegex(ValueError, 'different main capture'):
            renderer.apply_parameter_pass(snapshot, main_run, 'followup', {'sourceRun': 'wrong', 'items': []})

    def test_hierarchy_supplement_rejects_changed_observed_parent(self):
        run, snapshot = renderer.load_capture(ROOT / 'fixture-capture.jsonl')
        parents = [{key: t[key] for key in ('id', 'name', 'parent', 'parentStatus')} for t in snapshot['tracks']]
        observed = next(p for p in parents if p['parentStatus'] == 'observed')
        observed['parent'] = next(p['id'] for p in parents if p['id'] != observed['parent'])
        with self.assertRaisesRegex(ValueError, 'conflicts'):
            renderer.apply_hierarchy_pass(snapshot, run, 'supplement', {'sourceRun': run, 'parents': parents, 'coverage': 'mock'})



if __name__ == '__main__':
    unittest.main()
