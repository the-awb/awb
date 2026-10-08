"""Check a four-channel offline rack render, including exact one-block tap latency."""
import argparse, json, math, struct
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('wav',type=Path);parser.add_argument('--output',type=Path);args=parser.parse_args()
b=args.wav.read_bytes();offset=12;fmt=None;data=None
assert b[:4]==b'RIFF' and b[8:12]==b'WAVE'
while offset+8<=len(b):
 tag=b[offset:offset+4];size=struct.unpack_from('<I',b,offset+4)[0];chunk=b[offset+8:offset+8+size];offset+=8+size+size%2
 if tag==b'fmt ':fmt=struct.unpack_from('<HHIIHH',chunk)
 if tag==b'data':data=chunk
assert fmt and fmt[0]==3 and fmt[1]==4 and fmt[5]==32 and data is not None
samples=struct.unpack('<'+'f'*(len(data)//4),data);rate=fmt[2];assert all(math.isfinite(x) for x in samples)
checks=[];values=[]
for t,expected,label in [(.7,[.1,.1,0,.1],'zero additional sends preserve original return'),(1.7,[.2,.2,0,.2],'self-feedback gain is correct'),(2.7,[.25,.25,.06,.2],'cross-send and follower receive return audio'),(3.7,[.25,.25,.06,.2],'processor replacement preserves routing'),(4.7,[0,0,0,0],'clear and retirement leave no stale audio')]:
 rows=[samples[int(t*rate)*4+i:int((t+.2)*rate)*4:4] for i in range(4)]
 means=[sum(row)/len(row) for row in rows]
 assert all(abs(a-e)<1e-5 for a,e in zip(means,expected)),(label,means,expected)
 checks.append(label);values.append({'seconds':t,'measured':means,'expected':expected})
onsets=[next(n for n,x in enumerate(samples[i::4]) if abs(x)>.001) for i in [0,3]]
assert onsets[1]-onsets[0]==256,onsets
checks.append('FX return channel has exactly one 256-sample block delay')
result={'passed':True,'checks':checks,'sampleRate':rate,'blockSize':256,'onsets':onsets,'levels':values}
if args.output:args.output.write_text(json.dumps(result,indent=2)+'\n')
print('AWB_FX_RETURN_AUDIO=PASS checks='+str(len(checks)))
