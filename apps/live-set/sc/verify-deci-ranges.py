"""Verify real offline profile output, including endpoint and modulation behaviour."""
import json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'rack/sc/sets/awb52'))
from verify import read_float_wav

out=Path(sys.argv[1]);channels,rate,data=read_float_wav(out/'deci-range.wav');checks=[]
def check(label,ok):
    assert ok,label
    checks.append(label)
def near(label,time,index,expected):
    got=data[round(time*rate)*channels+index]
    check(label,abs(got-expected)<0.003)
check('four actual diagnostic channels',channels==4)
check('all samples finite',all(math.isfinite(v) for v in data))
for time,expected in [(0.5,[0,0]),(1.5,[1,1]),(2.5,[0.25,0.75]),(3.5,[0.35,0.765]),(4.5,[1,1]),(5.75,[0.25,0.75])]:
    for index,value in enumerate(expected):near('full range at %ss output %s'%(time,index),time,index,value)
for index,value in enumerate([0.6,0.85]):near('timed change keeps current starting value %s'%index,5.25,index,value)
for time in [0.5,3.5,5.75]:
    for index,value in enumerate([0.72280720435,0.66152187725]):near('captured macro compatibility at %ss output %s'%(time,index),time,index+2,value)
(out/'deci-range-results.json').write_text(json.dumps(dict(passed=True,checks=len(checks),rows=checks),indent=2)+'\n')
print('AWB_DECI_FULL_RANGES=PASS checks='+str(len(checks)))
