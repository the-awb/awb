"""Run the already prepared read-only follow-ups sequentially; replace only our mapper."""
from pathlib import Path
import json,time,hashlib
root=Path(__file__).parent
installed=Path('/Users/willy/Documents/Bitwig Studio/Controller Scripts/AWBSetMapper/AWBSetMapper.control.js')
phases=[('parameter-pass.jsonl','AWBParameterPass.control.js'),('track-states.jsonl','AWBTrackStates.control.js'),('hierarchy-pass.jsonl','AWBHierarchyPass.control.js')]
assert installed.read_bytes()==(root/phases[0][1]).read_bytes(),'Installed controller is no longer our parameter pass'
for i,(filename,source) in enumerate(phases):
 if i:
  assert installed.read_bytes()==(root/phases[i-1][1]).read_bytes(),'Installed controller changed outside this capture'
  installed.write_bytes((root/source).read_bytes())
  print('Installed '+source,flush=True)
 start=time.time();previous=None
 while True:
  p=root/filename
  rows=[]
  if p.exists():
   for line in p.read_text().splitlines():
    try:rows.append(json.loads(line))
    except json.JSONDecodeError:pass
  if rows:
   run=next(r['run'] for r in reversed(rows) if r['kind']=='init');rows=[r for r in rows if r['run']==run]
   if any(r['kind']=='aborted' for r in rows):raise RuntimeError(filename+': '+str(next(r['data'] for r in reversed(rows) if r['kind']=='aborted')))
   progress=(rows[-1]['kind'],len(rows))
   if progress!=previous:print(filename+' '+str(progress),flush=True);previous=progress
   if any(r['kind']=='done' for r in rows):break
  if time.time()-start>1800:raise RuntimeError('No completion within 30 minutes: '+filename)
  time.sleep(5)
 print('Completed '+filename,flush=True)
print('All read-only follow-ups complete',flush=True)
