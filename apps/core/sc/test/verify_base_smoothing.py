import array,math,struct,sys
from pathlib import Path
raw=Path(sys.argv[1]).read_bytes();at=12;fmt=data=None
while at+8<=len(raw):
 tag,size=struct.unpack_from('<4sI',raw,at);at+=8;chunk=raw[at:at+size];at+=size+(size%2)
 if tag==b'fmt ':fmt=struct.unpack_from('<HHIIHH',chunk)
 if tag==b'data':data=chunk
assert fmt[0]==3 and fmt[1]==6 and fmt[5]==32
v=array.array('f');v.frombytes(data)
if sys.byteorder!='little':v.byteswap()
assert all(math.isfinite(x) for x in v)
rate=fmt[2];checks=0
def check(t,ch,expected,label,tol=.008):
 global checks
 samples=v[int((t-.004)*rate)*6+ch:int((t+.004)*rate)*6:6];actual=sum(samples)/len(samples)
 assert abs(actual-expected)<tol,(label,actual,expected)
 checks+=1;print('PASS '+label)
check(.2,0,.2,'construction starts at its supplied value')
check(.2,1,.35,'modulation is present during baseline smoothing')
check(.4,0,.8-.6*math.exp(-math.log(1000)*.1/.5),'default base follows a half-second server lag')
check(.5,0,.8-.6*math.exp(-math.log(1000)*.2/.5),'default base follows the expected exponential lag')
check(.5,1,.95-.6*math.exp(-math.log(1000)*.2/.5),'modulation remains additive during base lag')
check(.5,2,.8,'per-parameter shorter smoothing reaches its target')
check(.33,4,.8,'disabled per-parameter smoothing is immediate')
check(.4,3,80/127+(.2-80/127)*math.exp(-math.log(1000)*.1/.5),'threshold MIDI pickup uses the same base lag')
check(.6,0,.1+(.8-.6*math.exp(-math.log(1000)*.25/.5)-.1)*math.exp(-math.log(1000)*.05/.5),'new target preserves the current lag state')
check(.6,3,80/127+(.2-80/127)*math.exp(-math.log(1000)*.3/.5),'MIDI continues smoothly after threshold latch')
start=80/127+(.2-80/127)*math.exp(-math.log(1000)*.4/.5)
check(.75,3,20/127+(start-20/127)*math.exp(-math.log(1000)*.05/.5),'moving pedal changes the lag target without restarting its state')
k=math.log(1000)/.5
b55=.8-.6*math.exp(-k*.25)
b8=.1+(b55-.1)*math.exp(-k*.25)
b9=.9+(b8-.9)*math.exp(-k*.1)
def ramp_lag(t):return b9+((.3-b9)/.2)*(t-(1-math.exp(-k*t))/k)
check(.83,0,.9+(b8-.9)*math.exp(-k*.03),'zero-duration target is still smoothed after the ramp')
check(1,0,ramp_lag(.1),'explicit scene ramp flows through the same downstream lag')
check(1.15,0,.3+(ramp_lag(.2)-.3)*math.exp(-k*.05),'lag continues settling after scene ramp completion')
check(1.3,3,20/127,'MIDI base finishes at latest pedal value')
check(1.3,2,1-.2*math.exp(-math.log(1000)*.1/.25),'changing per-parameter lag affects subsequent edits')
check(1.5,2,1,'MIDI-native setter settles at endpoint')
check(1.55,5,.6,'modulation amount still changes immediately')
check(1.55,1,.6,'amount changes have no extra base smoothing')
check(1.7,1,0,'incoming modulation still responds immediately')
for ch in range(6):check(1.9,ch,0,'owned processing cleans up channel '+str(ch),1e-8)
print('AWB_BASE_SMOOTHING_AUDIO_RESULT=PASS checks='+str(checks))
