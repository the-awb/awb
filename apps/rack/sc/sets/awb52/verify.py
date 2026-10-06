"""Verify rendered routing, audible effects and teardown; this is not a load test."""
import array
import json
import math
import struct
import sys
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
    return fmt[1], fmt[2], samples


def verify(directory):
    directory = Path(directory)
    channels, rate, data = read_float_wav(directory/'first-pass.wav')
    checks = []

    def check(label, ok, measured=None):
        assert ok, (label, measured)
        checks.append(dict(label=label, measured=measured))

    check('14 diagnostic channels at 44.1 kHz', channels == 14 and rate == 44100)
    check('Actual post-close window rendered', len(data)/channels/rate >= 27)
    check('All samples finite', all(math.isfinite(v) for v in data))

    def window(time, channel, seconds=.25):
        start, stop = int(time*rate)*channels, int((time+seconds)*rate)*channels
        return data[start+channel:stop:channels]

    def rms(time, channel):
        values = window(time, channel)
        return math.sqrt(sum(v*v for v in values)/len(values))

    def pair_rms(time, channel):
        return (rms(time, channel)+rms(time, channel+1))/2

    check('Mono VC duplicates its signal to stereo', max(abs(a-b) for a,b in zip(window(2,2),window(2,3))) < 1e-8)
    difference = math.sqrt(sum((a-b)**2 for a,b in zip(window(2,4),window(2,5)))/len(window(2,4)))
    check('Stereo Pro 2 preserves different sides', difference > .01, difference)
    # Input processing changes VC amplitude; derive expected mix from actual isolated channels.
    expected = math.sqrt((rms(2,2)**2+rms(2,4)**2))
    check('Explicit Mast carries both persistent channels', abs(pair_rms(2,0)-expected) < .001, pair_rms(2,0))

    for name,time,channel in [('Deci',4,6),('Fuzz',7,8),('Spark',10,10),('Verb',14,12)]:
        level = pair_rms(time,channel)
        check(name+' produces audio on its isolated return', level > .001, level)
        check(name+' reaches the limited master', pair_rms(time,0) > .001, pair_rms(time,0))

    check('Deci silent without a send', pair_rms(2,6) < 1e-8)
    check('Fuzz silent without a send', pair_rms(2,8) < 1e-8)
    check('VC mute silences post-fader audio', pair_rms(17,2) < 1e-8)
    check('VC mute leaves Pro 2 active', pair_rms(17,4) > .01)
    check('VC solo suppresses Pro 2 post-fader audio', pair_rms(19,4) < 1e-8)
    check('VC solo leaves VC active', pair_rms(19,2) > .001)
    check('Deci replacement on stable pipe still reaches master', pair_rms(23,0) > .001, pair_rms(23,0))
    check('Verb tail survives removal of its input send', pair_rms(17,12) > .001, pair_rms(17,12))
    peak = max(max(abs(v) for v in data[c::channels]) for c in [0,1])
    check('Master is finite and bounded', peak <= 1, peak)
    check('Close silences every observed bus and output', max(abs(v) for c in range(channels) for v in window(26.5,c)) < 1e-8)
    prepared=json.loads((directory/'source/prepared/first-pass.json').read_text())
    if prepared.get('validationSharedFX'):
        check('Shared chain level zero silences selected returns',pair_rms(2.5,0)<1e-7,pair_rms(2.5,0))
        check('Verb remains audible while shared chain is muted',pair_rms(14,0)>.001,pair_rms(14,0))
        check('Closing shared Chain restores direct master audio',pair_rms(25.5,0)>.001,pair_rms(25.5,0))
    profile_mode=json.loads((directory/'source/prepared/first-pass.json').read_text()).get('validationVerbProfiles',False)
    result = dict(passed=True, audioChecks=len(checks), fullLoad=not profile_mode,verbProfiles=profile_mode, sampleRate=rate, checks=checks)
    (directory/'audio-results.json').write_text(json.dumps(result,indent=2)+'\n')
    print('AWB_FIRSTPASS_AUDIO=PASS count='+str(len(checks)))
    return result


if __name__ == '__main__': verify(sys.argv[1])
