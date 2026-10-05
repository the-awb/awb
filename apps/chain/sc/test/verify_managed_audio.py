import array,struct,sys
from pathlib import Path
raw=Path(sys.argv[1]).read_bytes();pos=12;data=None
while pos+8<=len(raw):
 tag=raw[pos:pos+4];n=struct.unpack_from('<I',raw,pos+4)[0];chunk=raw[pos+8:pos+8+n]
 if tag==b'fmt ':fmt,channels,rate=struct.unpack_from('<HHI',chunk);assert fmt==3 and channels==4
 if tag==b'data':data=chunk
 pos+=8+n+(n%2)
a=array.array('f');a.frombytes(data);checks=0
for start,end,expected in [(.2,.3,[.15,.2,0,0]),(.5,.6,[.075,.125,0,0]),(.8,.9,[.05,.1,0,0]),(1.1,1.2,[.15,.2,0,0]),(1.4,1.5,[.2,.3,0,0]),(1.7,1.8,[.3,.2,0,0]),(2,2.1,[.2,.3,0,0]),(2.3,2.4,[.2,.3,0,0]),(2.6,2.7,[.2,.3,0,0]),(2.9,3,[.2,.4,0,0]),(3.2,3.3,[0,0,0,0])]:
 for c,value in enumerate(expected):
  samples=a[int(start*rate)*channels+c:int(end*rate)*channels:channels];assert max(abs(x-value) for x in samples)<1e-5,(start,c,value,max(samples));checks+=1
print('AWB_CHAIN_MANAGED_AUDIO_CHECKS='+str(checks));print('AWB_CHAIN_MANAGED_AUDIO_RESULT=PASS')
