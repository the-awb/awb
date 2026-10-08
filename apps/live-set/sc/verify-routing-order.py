"""Check gate scaling and exact sample alignment of real offline rack/pipe DSP."""
import json,math,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'rack/sc/sets/awb52'))
from verify import read_float_wav
out=Path(sys.argv[1]);channels,rate,data=read_float_wav(out/'routing-order.wav');checks=[]
def check(label,ok):
    assert ok,label
    checks.append(label)
check('four diagnostic channels',channels==4)
check('all samples finite',all(math.isfinite(v)for v in data))
for lo,hi,gain in [(0.5,0.9,0.5),(1.5,1.9,0),(2.5,2.9,1)]:
    frames=[data[i*channels:i*channels+channels]for i in range(round(lo*rate),round(hi*rate))]
    check('VC remains active at %ss'%lo,sum(f[1]>0.9 for f in frames)>100)
    check('input pipe is sample-aligned with gain %s'%gain,max(abs(f[0]-gain*f[1])for f in frames)<1e-5)
    check('return pipe is sample-aligned with gain %s'%gain,max(abs(f[2]-gain*f[3])for f in frames)<1e-5)
check('render has no server failures','FAILURE' not in (out/'routing-render.log').read_text())
(out/'routing-order-results.json').write_text(json.dumps(dict(passed=True,checks=len(checks),rows=checks),indent=2)+'\n')
print('AWB_SAME_BLOCK_ROUTING=PASS checks='+str(len(checks)))
