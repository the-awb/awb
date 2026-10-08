"""Verify automatic FX returns, extra sends, solo feed retention and Verb gain."""
import json,math,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'rack/sc/sets/awb52'))
from verify import read_float_wav
out=Path(sys.argv[1]);channels,rate,data=read_float_wav(out/'fx-faders.wav');checks=[]
def check(label,ok):
    assert ok,label
    checks.append(label)
check('six diagnostic channels',channels==6)
check('all samples finite',all(math.isfinite(v)for v in data))
rows=[
    ('unity',0,[.1,.1,.1,.1,.1,.1]),
    ('half level applied once',1,[.05,.1,.1,.05,.05,.05]),
    ('mute automatic return and sends',2,[0,.1,.1,0,0,0]),
    ('FX solo retains source feed',3,[.05,0,0,.05,.05,.1]),
    ('FX solo retains other FX feed',4,[.075,0,0,.075,.075,.1]),
    ('source mute',5,[0,0,0,0,0,.1]),
    ('mapped parameter',6,[.04,.1,.1,.04,.04,.1]),
    ('mapped parameter change',7,[.06,.1,.1,.06,.06,.1]),
    ('unmap restores baseline',8,[.06,.1,.1,.06,.06,.1]),
    ('replacement inherits mapping',9,[.02,.1,.1,.02,.02,.1]),
    ('retiring generation freed',10,[.02,.1,.1,.02,.02,.1]),
    ('replacement inherits mute',11,[0,.1,.1,0,0,.1]),
    ('replacement inherits other FX solo',12,[0,.1,0,.02,.02,.1]),
]
for label,second,expected in rows:
    frames=[data[i*channels:i*channels+channels]for i in range(round((second+.5)*rate),round((second+.9)*rate))]
    for channel,target in enumerate(expected):
        check('%s channel %s'%(label,channel),max(abs(f[channel]-target)for f in frames)<1e-5)
log=(out/'fx-fader-render.log').read_text()
check('render has no server failures',not any(marker in log for marker in ['FAILURE','ERROR','exception in']))
(out/'fx-fader-results.json').write_text(json.dumps(dict(passed=True,checks=len(checks),rows=checks),indent=2)+'\n')
print('AWB_FX_FADERS=PASS checks='+str(len(checks)))
