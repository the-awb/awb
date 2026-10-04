import array
import json
import math
import struct
from pathlib import Path


def read_float_wav(path):
    raw = Path(path).read_bytes()
    offset, fmt, samples = 12, None, None
    while offset + 8 <= len(raw):
        kind, size = raw[offset:offset+4], struct.unpack_from('<I', raw, offset+4)[0]
        if kind == b'fmt ': fmt = struct.unpack_from('<HHIIHH', raw, offset+8)
        if kind == b'data': samples = array.array('f', raw[offset+8:offset+8+size])
        offset += 8 + size + size % 2
    assert fmt and fmt[0] == 3 and fmt[5] == 32 and samples is not None, 'Expected float WAV'
    assert all(math.isfinite(v) for v in samples), 'Audio has nonfinite samples'
    return fmt[1], fmt[2], samples


def verify(directory):
    directory = Path(directory)
    channels, rate, data = read_float_wav(directory / 'audio.wav')
    assert channels == 8 and rate == 48000
    windows = [
        (.30, [0, .1, .2, .1], 'No implicit dry output'),
        (.60, [.3, .1, .2, .1], 'Two persistent channel inputs'),
        (.90, [.25, .05, .2, .05], 'Fader and empty FX are correct'),
        (1.20, [.2, 0, .2, 0], 'Mute affects audio and follower'),
        (1.60, [.2, 0, .2, 0], 'Solo suppresses other channel sends'),
        (2.00, [.05, .05, 0, .05], 'Solo can transfer between channels'),
        (2.30, [.25, .05, .2, .05], 'Clearing solo restores channel mix'),
        (2.60, [.25, .05, .2, (20*math.log10(.05)+60)/60], 'Log follower curve'),
        (2.90, [.25, .05, .2, 0], 'Follower removal resets stable output'),
        (3.20, [.275, .05, .2, 0], 'Assign a spare FX'),
        (3.55, [.275, .05, .2, 0], 'Replace processor on same input pipe'),
        (3.69, [.275, .05, .2, 0], 'Removed delay still has an audible tail'),
        (3.95, [.25, .05, .2, 0], 'Tail finishes without continued input'),
        (4.23, [.275, .05, .2, 0], 'Reassign the same FX bus'),
        (4.35, [.475, .05, .2, 0], 'Direct voice bypasses channel fader'),
        (4.55, [.275, .05, .2, 0], 'One-shot frees itself'),
        (4.69, [.175, .05, .1, 0], 'Explicit voice bus override enters persistent channel'),
        (4.85, [.125, .05, .05, 0], 'Override voice expires independently'),
        (5.00, [0, 0, 0, 0], 'Tool close silences its graph'),
    ]
    checks = []
    for time, expected, label in windows:
        count, start = 480, int(time * rate)
        measured = [sum(data[(start+i)*channels+c] for i in range(count))/count for c in range(4)]
        error = max(abs(a-b) for a,b in zip(expected, measured))
        assert error < .002, (label, expected, measured, error)
        checks.append(dict(time=time, label=label, expected=expected, measured=measured, maxError=error))
    for c in range(4, 8): assert max(abs(v) for v in data[c::channels]) < 1e-8, 'Output escaped rack and diagnostics'
    channels, rate, data = read_float_wav(directory / 'stereo.wav')
    for time, expected, label in [(.3, [.1,.2], 'Stereo full wrapper with one port'), (.75,[.99,.99], 'Master limiter catches boost'), (1.2,[0,0], 'Stereo close')]:
        measured = [sum(data[(int(time*rate)+i)*channels+c] for i in range(480))/480 for c in range(2)]
        assert max(abs(a-b) for a,b in zip(expected, measured)) < .002, (label, measured)
        checks.append(dict(time=time, label=label, expected=expected, measured=measured))
    result = dict(passed=True, audioWindows=len(checks), assertionCount=19*4+4+3*2+2, checks=checks)
    (directory / 'audio-results.json').write_text(json.dumps(result, indent=2)+'\n')
    print('AWB_RACK_AUDIO_RESULT=PASS', result['audioWindows'], 'windows;', result['assertionCount'], 'assertions')
    return result


if __name__ == '__main__': verify(Path(__file__).parent)
