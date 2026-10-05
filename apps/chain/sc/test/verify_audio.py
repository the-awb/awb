import array,struct,sys
from pathlib import Path
raw=Path(sys.argv[1]).read_bytes();pos=12;data=None
while pos+8<=len(raw):
 tag=raw[pos:pos+4];n=struct.unpack_from('<I',raw,pos+4)[0];chunk=raw[pos+8:pos+8+n]
 if tag==b'fmt ':fmt,channels,rate=struct.unpack_from('<HHI',chunk);assert fmt==3 and channels==4
 if tag==b'data':data=chunk
 pos+=8+n+(n%2)
a=array.array('f');a.frombytes(data);checks=0
for start,end,expected in [(0.2,0.3,[.1,.2,0,0]),(.5,.6,[.025,.05,0,0]),(.8,.9,[.2,.4,0,0]),(1.1,1.2,[0,0,0,0])]:
 for c,value in enumerate(expected):
  samples=a[int(start*rate)*channels+c:int(end*rate)*channels:channels];assert max(abs(x-value) for x in samples)<1e-5,(start,c,value);checks+=1
def rms(start,end,c):
 values=a[int(start*rate)*channels+c:int(end*rate)*channels:channels];return (sum(v*v for v in values)/len(values))**0.5
for c in [2,3]:
 assert rms(2.1,2.2,c)>.005;checks+=1
 assert rms(2.5,2.6,c)>rms(2.1,2.2,c)*8;checks+=1
 assert rms(3,3.1,c)<1e-6;checks+=1
 assert rms(3.8,3.9,c)<1e-6;checks+=1
for c in [0,1]:
 assert rms(2.5,2.6,c)<1e-6;checks+=1
assert all(abs(v)<2 for v in a);checks+=1
print('AWB_CHAIN_AUDIO_CHECKS='+str(checks));print('AWB_CHAIN_AUDIO_RESULT=PASS')
