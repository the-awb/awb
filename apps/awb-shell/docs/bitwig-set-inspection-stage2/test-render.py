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


if __name__ == '__main__':
    unittest.main()
