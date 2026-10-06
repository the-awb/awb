#!/usr/bin/env python3
"""Real scsynth NRT assertions: interpolated depths, pre-FX gain, tails, modulation."""
import array, math, struct, sys
from pathlib import Path
raw=Path(sys.argv[1]).read_bytes();at=12;data=None;fmt=None
while at+8<=len(raw):
 tag,size=struct.unpack_from('<4sI',raw,at);at+=8;chunk=raw[at:at+size];at+=size+(size%2)
 if tag==b'fmt ':fmt=struct.unpack_from('<HHIIHH',chunk)
 if tag==b'data':data=chunk
assert fmt and fmt[0]==3 and fmt[1]==8 and fmt[5]==32
v=array.array('f');v.frombytes(data)
if sys.byteorder!='little':v.byteswap()
rate=fmt[2];checks=0
assert all(math.isfinite(x) for x in v)
def check(t,ch,wanted,label,tolerance=.002):
 global checks
 samples=v[int((t-.006)*rate)*8+ch:int((t+.006)*rate)*8:8];actual=sum(samples)/len(samples)
 assert abs(actual-wanted)<tolerance,(label,t,ch,wanted,actual)
 checks+=1;print('PASS '+label+': '+str(actual))
bases=[.495,0,.14,.14,0]
profiles=[[.03,.78,-.34,-.42,.40],[-.87,1,.51,.24,.31],[-.99,.45,-.22,.73,.92],[-1.02,-.26,-1,-.56,1.12]]
def values(weights):return [max(0,min(1,b+sum(w*row[i] for w,row in zip(weights,profiles)))) for i,b in enumerate(bases)]
for t,pos,weights in [(.25,0,[0,0,0,0]),(.55,.25,[1,0,0,0]),(.95,.375,[.5,.5,0,0]),(1.35,.5,[0,1,0,0]),(1.75,.75,[0,0,1,0]),(2.15,1,[0,0,0,1])]:
 row=values(weights)
 for ch,wanted in enumerate(row):check(t,ch,wanted,'branch '+str(ch)+' position '+str(pos))
 check(t,5,pos,'selector position')
 check(t,7,math.tanh(.2*(2*row[2])**3),'gain acts before nonlinear FX')
# At S2 earth closes immediately, but its previously emitted value remains in delay.
check(1.35,6,(2*.075)**3,'existing tail persists when branch input closes')
check(1.55,6,0,'tail drains after input closes')
for ch,wanted in enumerate(bases):check(2.55,ch,wanted,'editable S4 depths updated')
for ch,wanted in enumerate(values([1,0,0,0])):check(2.95,ch,wanted,'borrowed blender -> AWParam -> SelectN')
check(3.35,5,0,'detach blender restores selector baseline')
check(3.62,5,.275,'selector timed transition runs on server',.005)
for ch in range(8):check(4.12,ch,0,'close silences channel '+str(ch),1e-8)
print('AWB_SELECT_AUDIO=PASS count='+str(checks))
