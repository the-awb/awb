"""Check the actual SC base and amount buses rendered from live-timed MIDI commands."""
import array, math, struct, sys
from pathlib import Path
raw=Path(sys.argv[1]).read_bytes();at=12;fmt=data=None
while at+8<=len(raw):
 tag,size=struct.unpack_from('<4sI',raw,at);at+=8;chunk=raw[at:at+size];at+=size+(size%2)
 if tag==b'fmt ':fmt=struct.unpack_from('<HHIIHH',chunk)
 if tag==b'data':data=chunk
assert fmt and data and fmt[0]==3 and fmt[1]==2
samples=array.array('f');samples.frombytes(data)
if sys.byteorder!='little':samples.byteswap()
assert all(math.isfinite(v) for v in samples)
rate=fmt[2];checks=0
def check(t,ch,expected,label,tolerance=.015,window=.005):
 global checks
 start=int((t-window)*rate)*2;stop=int((t+window)*rate)*2
 values=samples[start+ch:stop:2];actual=sum(values)/len(values)
 assert abs(actual-expected)<tolerance,(label,actual,expected)
 checks+=1;print(f'PASS {label}: {actual:.6f}')
# Use actual language timestamps: scheduler jitter must not shift the expected curve.
timing=dict(line.split() for line in Path(sys.argv[1]).with_name('soft-pickup-timing.txt').read_text().splitlines())
for ch,field,held,anchor,latest in [(0,'base',.5,100/127,110/127),(1,'amount',-.5,200/127-1,220/127-1)]:
 start=float(timing[field+'-ramping']);warning=float(timing[field+'-warning'])
 assert abs((start-warning)-1) < .03,(field,'warning duration',start-warning)
 checks+=1;print('PASS '+field+' waits one second before takeover')
 for t in [.5,1,1.25]:
  check(t,ch,held,field+' is held during warning')
 for elapsed in [.1,.2]:
  check(start+elapsed,ch,held+((anchor-held)*(elapsed/.5)),field+' follows a linear delta fade',.006)
 # Full controller movement at ~1.55 s, with the original delta still fading.
 for elapsed in [.34,.4]:
  remaining=1-(elapsed/.5)
  check(start+elapsed,ch,latest-((anchor-held)*remaining),field+' passes full movement with decaying fixed delta',.006)
 moved=float(timing['controller-move'])
 expected=latest-((anchor-held)*(1-((moved-start)/.5)))
 check(moved+.005,ch,expected,field+' movement is immediate rather than attenuated by fade',.006,.001)
 check(start+.6,ch,latest,field+' reaches latest controller')
print(f'AWB_SOFT_PICKUP_AUDIO_RESULT=PASS checks={checks}')
