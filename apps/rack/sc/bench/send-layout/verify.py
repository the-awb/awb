"""Stream float WAV diagnostics; no timing/CPU inference from this check."""
import array,json,math,struct,sys
from pathlib import Path
root=Path(sys.argv[1]);windows=json.loads((root/'windows.json').read_text());checks=[]
with (root/'layout.wav').open('rb') as f:
 assert f.read(4)==b'RIFF';f.read(8);fmt=None;offset=None
 while True:
  header=f.read(8)
  if not header:break
  tag,size=struct.unpack('<4sI',header)
  if tag==b'fmt ':fmt=struct.unpack_from('<HHIIHH',f.read(size))
  elif tag==b'data':offset=f.tell();break
  else:f.seek(size,1)
  if size%2:f.seek(1,1)
 assert fmt and fmt[0]==3 and fmt[1]==160 and fmt[2]==44100 and fmt[5]==32,fmt
 for start,end,count,profile in windows:
  start_frame=int(start*44100);remaining=int((end-start)*44100);error=energy=leak=0.0
  f.seek(offset+start_frame*160*4)
  while remaining:
   n=min(remaining,512);v=array.array('f',f.read(n*160*4));assert len(v)==n*160
   if sys.byteorder!='little':v.byteswap()
   assert all(math.isfinite(x) for x in v)
   active=(count+8)*2
   for i in range(n):
    row=v[i*160:(i+1)*160]
    error=max(error,max(abs(row[c]-row[80+c]) for c in range(active)))
    energy=max(energy,max(abs(x) for x in row[:count*2]))
    leak=max(leak,max([abs(x) for x in row[active:80]]+[abs(x) for x in row[80+active:]]+[0]))
   remaining-=n
  assert error<1e-6,(count,profile,error)
  assert leak<1e-8,(count,profile,'undeclared output',leak)
  if profile in ('full','sparse','moving','faderMuteSolo'):assert energy>1e-5,(count,profile,'silent positive fixture')
  else:assert energy<2e-5,(count,profile,'expected zero after smoothing/closure',energy)
  checks.append(dict(sends=count,profile=profile,maxDifference=error,sendPeak=energy))
result=dict(passed=True,comparisonWindows=len(checks),rate=44100,blockSize=64,channels=8,width=2,checks=checks,
 limits=['Offline audio equivalence only; no CPU or hardware deadline result','Split mode retains all send nodes even at zero gain'])
(root/'equivalence.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS send layout: {} matched diagnostic windows'.format(len(checks)))
