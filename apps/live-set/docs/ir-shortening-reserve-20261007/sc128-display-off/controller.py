import os,json,time,subprocess
from pathlib import Path
from datetime import datetime,timezone
root=Path('/private/tmp/awb-earth5-echo20-prep');out=Path('/private/tmp/awb-earth5-echo20-load');lock=Path('/private/tmp/awb-audio-hardware-test.lock');ledger=Path('/Users/willy/awb/apps/awb-shell/docs/audio-testing-coordination.md')
lock.mkdir()
owner={'owner':'AWB Earth5 Echo20 full GUI/reserve repeat','pid':os.getpid(),'useMode':'exclusive-performance','quietMachine':True,'startedAt':datetime.now(timezone.utc).isoformat(),'configuration':'44100Hz;SC128;MOTU512;FFT4096;2VSTworkers;Earth5s,Composite21.818s,Echo20s;fullGUI/scopes;calibrated25%reserve','output':str(out)}
(lock/'owner.json').write_text(json.dumps(owner,indent=2))
with ledger.open('a') as f:f.write('\nEarth5/Echo20 full GUI/reserve quiet reservation '+owner['startedAt']+', PID'+str(os.getpid())+': user requested repeat. 90s GUI warmup, 90s baseline, calibrated25% extra DSP, 300s loaded, 30s restored. Please defer engine tests/builds/heavy work until this lock ends. Output '+str(out)+'.\n')
print('RESERVED '+str(os.getpid()),flush=True)
node='/Users/willy/.nvm/versions/node/v22.23.2/bin/node';monitor=None;run=None
try:
 run=subprocess.Popen([node,str(root/'run.mjs'),'--run','--quiet-window','--block=128','--fft-size=4096','--plugin-workers=2','--reserve-percent=25','--seconds=300','--repeats=1','--sc-source='+str(root/'load.scd'),'--output='+str(out)],cwd='/Users/willy/awb')
 while run.poll() is None and not out.exists():time.sleep(.1)
 if out.exists():monitor=subprocess.Popen(['/usr/bin/python3',str(root/'system-cpu.py')])
 code=run.wait()
 print('CONTROLLER_EXIT '+str(code),flush=True)
finally:
 if monitor:
  try:monitor.wait(timeout=7)
  except subprocess.TimeoutExpired:monitor.terminate();monitor.wait(timeout=5)
 live=[]
 if (out/'results.json').exists():
  r=json.loads((out/'results.json').read_text())
  for pid in r.get('ownedPIDs',[]):
   try:os.kill(pid,0);live.append(pid)
   except ProcessLookupError:pass
 if live:
  print('KEEPING_RESERVATION: owned processes remain '+str(live),flush=True)
 else:
  if json.loads((lock/'owner.json').read_text()).get('pid')==os.getpid():(lock/'owner.json').unlink();lock.rmdir()
  with ledger.open('a') as f:f.write('\nEarth5/Echo20 GUI/reserve reservation ended '+datetime.now(timezone.utc).isoformat()+', PID'+str(os.getpid())+', exit '+str(run.returncode if run else 'not launched')+'.\n')
raise SystemExit(code)
