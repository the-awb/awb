#!/usr/bin/env python3
"""Verify tail audio and actual pause/resume using DSP progress counters."""
import array,math,struct,sys
from pathlib import Path
raw=Path(sys.argv[1]).read_bytes();at=12;data=None;fmt=None
while at+8<=len(raw):
 tag,size=struct.unpack_from('<4sI',raw,at);at+=8;chunk=raw[at:at+size];at+=size+(size%2)
 if tag==b'fmt ':fmt=struct.unpack_from('<HHIIHH',chunk)
 if tag==b'data':data=chunk
assert fmt and fmt[0]==3 and fmt[1]==8 and fmt[5]==32
values=array.array('f');values.frombytes(data)
if sys.byteorder!='little':values.byteswap()
rate=fmt[2];checks=0
assert all(math.isfinite(v)for v in values)
def mean(t,ch,width=.008):
 samples=values[int((t-width/2)*rate)*8+ch:int((t+width/2)*rate)*8:8]
 return sum(samples)/len(samples)
def check(label,ok,actual=None):
 global checks
 assert ok,(label,actual);checks+=1;print('PASS '+label+': '+str(actual))
def eq(t,ch,wanted,label,tol=.002):
 actual=mean(t,ch);check(label,abs(actual-wanted)<tol,actual)
eq(.45,0,.1,'selected effect receives gain-scaled input')
eq(.2,5,0,'initial zero mix pauses processor group')
eq(.2,6,0,'initial inactive processor does no DSP')
eq(.4,5,1,'initially paused processor resumes on selection')
check('first effect stays selected during AWParam ramp',mean(.56,3)>.99,mean(.56,3))
check('tail remains audible after effective mix reaches zero',mean(.72,0)>.0001,mean(.72,0))
eq(.72,2,1,'processor runs while tail drains')
eq(.98,2,0,'quiet drained tail suspends processor')
eq(1.05,0,0,'suspended branch emits no stale audio',1e-8)
check('processor DSP counter stops advancing after suspension',abs(mean(1.1,4)-mean(1.0,4))<1e-5,(mean(1.0,4),mean(1.1,4)))
eq(1.25,2,1,'reselection resumes processor')
check('processor counter resumes from retained state',mean(1.27,4)-mean(1.23,4)>.035,(mean(1.23,4),mean(1.27,4)))
eq(1.5,0,.1,'audio returns after reselection')
eq(1.7,2,1,'second tail drain starts')
eq(1.9,2,1,'reselection cancels pending tail suspension')
check('cancelled drain keeps processor advancing',mean(2.0,4)-mean(1.8,4)>.19,(mean(1.8,4),mean(2.0,4)))
eq(2.25,3,1,'modulation drives selection with baseline at zero')
eq(2.25,2,1,'effective modulated value keeps effect running')
eq(2.95,2,0,'server-side modulation returning to zero drains and pauses')
check('modulation-driven pause stops real DSP',abs(mean(3.1,4)-mean(3.0,4))<1e-5,(mean(3.0,4),mean(3.1,4)))
eq(3.25,2,1,'modulation rise resumes effect without language callback')
eq(3.5,0,.1,'modulation reselection restores audio')
eq(.7,5,1,'nondecaying output runs during configured capped tail')
check('nondecaying output remains audible before cap',mean(.7,7)>.09,mean(.7,7))
eq(.9,5,0,'explicit hard cap suspends a nondecaying processor')
eq(1.0,7,0,'cap fades output and removes stale branch audio',1e-8)
check('hard cap stops DSP counter',abs(mean(1.1,6)-mean(1.0,6))<1e-5,(mean(1.0,6),mean(1.1,6)))
for ch in range(8):eq(3.7,ch,0,'close silences channel '+str(ch),1e-8)
print('AWB_TAIL_AUDIO=PASS count='+str(checks))
