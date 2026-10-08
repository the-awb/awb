"""Verify the native file render; this does not open any hardware."""
import argparse,json,struct
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--directory',default='/private/tmp/awb-stutter-20261008');args=parser.parse_args();root=Path(args.directory)
raw=(root/'stutter.wav').read_bytes();position=12
while position<len(raw):
    tag,length=struct.unpack_from('<4sI',raw,position);payload=raw[position+8:position+8+length];position+=8+length+(length%2)
    if tag==b'fmt ':format_info=struct.unpack_from('<HHIIHH',payload)
    if tag==b'data':data=payload
code,channels,rate,_,_,bits=format_info
assert code==3 and bits==32 and channels==6
samples=struct.unpack('<'+'f'*(len(data)//4),data)
def window(start,end,channel=0):return samples[round(start*rate)*channels+channel:round(end*rate)*channels:channels]
def stats(start,end):
    values=window(start,end);return dict(min=min(values),max=max(values),mean=sum(values)/len(values))
checks=[]
def check(passed,label):
    checks.append(dict(passed=bool(passed),label=label));print(('PASS ' if passed else 'FAIL ')+label)
check(all(abs(value-.125)<1e-7 for value in window(.2,.9)),'amount 0 is exact unity')
for index,name in enumerate(['tri','pulse','sine','saw','custom']):
    values=window(1.1+index,1.9+index)
    check(min(values)<.005 and max(values)>.105,name+' produces deep chopping')
check(all(abs(value-.125)<1e-7 for value in window(6.7,6.9)),'timed scene ramp reaches clean bypass')
check(all(abs(value-.125)<1e-7 for value in window(9.2,9.9)),'real MIDI amount 0 restores unity')
check(all(abs(value-.0625)<1e-7 for value in window(.2,9.9,2)),'other input remains unchanged')
check(all(abs(samples[index]-samples[index+1])<1e-7 for index in range(round(.2*rate)*channels,round(9.9*rate)*channels,channels)),'both cello sides receive the same gain with pan disabled')
def turns(start,end):
    values=window(start,end);return sum(values[index-1]<values[index]>=values[index+1] for index in range(1,len(values)-1))
check(turns(8.2,8.9)>turns(7.2,7.9)*3,'envelope input modulates chopping rate')
check(max(abs(value) for value in window(.2,9.9))<=.12500001,'no gain boost')
left,right=window(.2,8.9,4),window(.2,8.9,5)
check(max(abs(a-b) for a,b in zip(left,right))>.01 and max(left+right)<=.12500001,'pan modulation moves the stereo image without gain boost')
check(all(abs(value-.125)<1e-7 for channel in [4,5] for value in window(9.2,9.9,channel)),'pan stage also returns to exact unity at zero amount')
log=(root/'stutter.log').read_text();check('FAILURE IN SERVER' not in log,'renderer has no failed OSC commands')
result=dict(checks=checks,passed=sum(check['passed'] for check in checks),total=len(checks),waveforms=[stats(1.1+index,1.9+index) for index in range(5)],envelopeTurns=[turns(7.2,7.9),turns(8.2,8.9)],hardwareOpened=False)
(root/'audio-results.json').write_text(json.dumps(result,indent=2)+'\n')
assert all(check['passed'] for check in checks),result
