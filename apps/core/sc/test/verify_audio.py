#!/usr/bin/env python3
import array, math, struct, sys
from pathlib import Path
raw=Path(sys.argv[1]).read_bytes();at=12;data=None;fmt=None
while at+8<=len(raw):
 tag,size=struct.unpack_from('<4sI',raw,at);at+=8;chunk=raw[at:at+size];at+=size+(size%2)
 if tag==b'fmt ':fmt=struct.unpack_from('<HHIIHH',chunk)
 if tag==b'data':data=chunk
assert fmt and data is not None and fmt[0]==3 and fmt[1]==8 and fmt[5]==32,fmt
values=array.array('f');values.frombytes(data)
if sys.byteorder!='little':values.byteswap()
rate=fmt[2];checks=0
assert all(math.isfinite(v) for v in values)
def mean(t,ch,width=.012):
 start=int((t-width/2)*rate)*8;stop=int((t+width/2)*rate)*8
 a=values[start+ch:stop:8];return sum(a)/len(a)
def check(t,ch,expected,label,tolerance=.006):
 global checks
 actual=mean(t,ch);checks+=1
 assert abs(actual-expected)<=tolerance,(label,t,ch,expected,actual)
 print(f'PASS {label}: {actual:.6f}')
def shaped(x,c):return x if abs(c)<.001 else math.expm1(x*c)/math.expm1(c)
for ch,expected in enumerate([.2,.2,.45,.5+.5*shaped(.5,4),200*1000**.1,.4,.2,.45]):check(.25,ch,expected,f'initial channel {ch}',.01 if ch==4 else .006)
check(.55,0,.2+.6*.15,'base progresses on server')
check(.55,1,.2+.5*.15,'amount progresses independently')
check(.65,3,.5-.5*shaped(.5,4),'bipolar shaping preserves sign')
check(.65,7,.2,'last writer removal clears modulation')
# interruption starts from ~.38 base and .15 amount, not original or target.
check(.95,0,.38+(.1-.38)*.5,'base interruption uses current base',.01)
check(.95,1,.2+(.15+(-.1-.15)*.5),'amount interruption uses current amount',.01)
check(.95,2,.2+.5*.1,'independent writers sum instead of replace')
check(1.15,6,.65,'adjacent-block commands reach final target')
check(1.5,6,.65,'bipolar mode preserves positive bare multiplier')
check(1.75,6,-.25,'bipolar normalized negative value reaches real DSP output')
check(2.0,6,0,'unipolar mode clamps negative bare output to zero')
check(1.15,3,.25,'modulation curve changes independently of transitions')
check(1.25,2,.52,'sum above one is preserved before amount scaling')
check(1.25,7,.175,'borrowed bus connections sum with independent depth')
check(1.6,7,.1,'removing one connection preserves remaining contribution')
check(1.9,7,.2,'removing last connection returns to base')
check(1.3,5,.9,'mapped destination receives transitioned effective value')
check(1.35,0,.9,'zero-duration base edit is immediate')
check(1.35,1,.2,'zero-duration amount edit is immediate')
check(1.6,0,.9-.6*shaped(1/3,4),'positive numeric transition curve',.01)
check(1.6,1,.2+.5*shaped(1/3,-4),'negative amount transition curve',.01)
start=.9-.6*shaped(.5,4)
check(1.9,0,start+(.3-start)/3,'same-target retrigger restarts duration',.01)
check(2.15,5,.05,'free restores unmapped destination scalar')
check(2.35,0,.3,'base finishes exactly at target')
check(2.35,1,.7,'amount finishes exactly at target')
for ch in range(8):check(2.6,ch,0,f'core closure silences channel {ch}',1e-8)
print(f'AWB_CORE_AUDIO_CHECKS={checks}')
print('AWB_CORE_AUDIO_RESULT=PASS')
