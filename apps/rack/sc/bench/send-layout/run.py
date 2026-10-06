#!/usr/bin/env python3
"""Isolated routing equivalence and opt-in muted hardware CPU comparison."""
import argparse,hashlib,json,os,re,shutil,signal,socket,subprocess,sys,tempfile,threading
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',type=Path);p.add_argument('--live',action='store_true');p.add_argument('--quiet-window',action='store_true');p.add_argument('--pause-zero',action='store_true');p.add_argument('--cases',default='',help='Comma-separated send-count:active-count pairs');p.add_argument('--load-nodes',type=int,default=0);p.add_argument('--in-place',action='store_true');p.add_argument('--measure-seconds',type=int,default=6);p.add_argument('--engine',type=Path,default=Path('/Applications/SuperCollider.app/Contents/Resources/scsynth'));a=p.parse_args()
if a.live and not a.quiet_window:p.error('live CPU comparison requires --quiet-window')
if not 0<=a.load_nodes<=80 or not 4<=a.measure_seconds<=30:p.error("Invalid load count or measurement duration")
cases=[]
if a.cases:
 if not a.live or not a.pause_zero:p.error('--cases requires --live --pause-zero')
 try:cases=[list(map(int,v.split(':'))) for v in a.cases.split(',')]
 except ValueError:p.error('Invalid --cases syntax')
 if any(len(v)!=2 or v[0] not in (8,16,24,32) or not 0<=v[1]<=v[0] for v in cases):p.error('Invalid send/active count')
 if len({tuple(v) for v in cases})!=len(cases):p.error('Duplicate cases')
if a.in_place and (not a.live or not a.pause_zero or not cases or not a.load_nodes):p.error("--in-place requires --live --pause-zero --cases --load-nodes")
here=Path(__file__).resolve().parent;rack=here.parents[2];app=Path('/Applications/SuperCollider.app/Contents');framework=Path('/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider')
build=a.output.resolve() if a.output else Path(tempfile.mkdtemp(prefix='awb-send-layout-'))
if a.output:build.mkdir(parents=True,exist_ok=False)
for name in ['framework','classes']:(build/name).mkdir()
manifest=json.loads((rack/'sc/test/framework-files.json').read_text())
for name,relative in manifest.items():shutil.copy2(framework/relative,build/'framework'/name)
for source in (rack/'sc/classes').glob('*.sc'):shutil.copy2(source,build/'classes'/source.name)
for source in here.glob('*.scd'):shutil.copy2(source,build/source.name)
paths=[app/'Resources/SCClassLibrary',build/'framework',build/'classes']
(build/'sclang_conf.yaml').write_text('includePaths:\n'+''.join('  - '+json.dumps(str(v))+'\n' for v in paths)+'excludeDefaultPaths: true\nexcludePaths: []\npostInlineWarnings: false\n')
protected=[*[framework/v for v in manifest.values()],*(rack/'sc/classes').glob('*.sc'),*here.glob('*')]
hashes={str(v):hashlib.sha256(v.read_bytes()).hexdigest() for v in protected if v.is_file()}
summary=dict(passed=False,liveRequested=a.live,pauseZero=a.pause_zero,cases=cases,loadNodes=a.load_nodes,inPlace=a.in_place,measureSeconds=a.measure_seconds,evidence=str(build),sourceHashes=hashes,engine=str(a.engine),engineSHA256=hashlib.sha256(a.engine.read_bytes()).hexdigest())
summary['engineVersion']=subprocess.check_output([str(a.engine),'-v'],stderr=subprocess.STDOUT).decode(errors='replace').strip()
(build/'results.json').write_text(json.dumps(summary,indent=2)+'\n')
env=dict(os.environ,AWB_SEND_LAYOUT_ENGINE=str(a.engine),AWB_SEND_LAYOUT_PAUSE_ZERO="1" if a.pause_zero else "0",AWB_SEND_LAYOUT_CASES=a.cases,AWB_SEND_LAYOUT_LOAD_NODES=str(a.load_nodes),AWB_SEND_LAYOUT_SECONDS=str(a.measure_seconds))
with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as s:s.bind(('127.0.0.1',0));env['AWB_SEND_LAYOUT_PORT']=str(s.getsockname()[1])
def run(label,cmd,timeout=45,stream=False):
 print('Running '+label,flush=True);process=subprocess.Popen([str(v) for v in cmd],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
 expired=threading.Event()
 def terminate_timeout():
  expired.set()
  try:os.killpg(process.pid,signal.SIGKILL)
  except ProcessLookupError:pass
 watchdog=threading.Timer(timeout,terminate_timeout);watchdog.start()
 try:
  if stream:
   with (build/(label+'.log')).open('wb') as f:
    for line in process.stdout:
     f.write(line);f.flush()
     if b'LAYOUT_PHASE' in line or b'SEND_LAYOUT_LIVE' in line or b'INPLACE_WARMUP' in line:print(line.decode().strip(),flush=True)
   process.wait(timeout=5);output=(build/(label+'.log')).read_bytes()
  else:output,_=process.communicate(timeout=timeout);(build/(label+'.log')).write_bytes(output)
 except subprocess.TimeoutExpired:
  os.killpg(process.pid,signal.SIGKILL);output,_=process.communicate();(build/(label+'.log')).write_bytes(output);raise
 finally:
  watchdog.cancel()
  try:os.killpg(process.pid,signal.SIGTERM)
  except ProcessLookupError:pass
 if expired.is_set():raise subprocess.TimeoutExpired(cmd,timeout)
 log=output.decode(errors='replace')
 if process.returncode or 'ERROR:' in log or 'FAILURE IN SERVER' in log:raise RuntimeError(label+' failed: '+log[-3500:])
 return log
try:
 run('offline-score',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'offline.scd'])
 run('offline-render',[a.engine,'-N',build/'layout.osc','_',build/'layout.wav',44100,'WAV','float','-o',160,'-i',0,'-z',64,'-U',app/'Resources/plugins','-D',0,'-V',-1])
 print(run('equivalence',[sys.executable,here/'verify.py',build]).strip(),flush=True)
 summary['equivalence']=json.loads((build/'equivalence.json').read_text())
 if a.live:
  inventory=subprocess.check_output(['/bin/ps','-axo','pid=,comm='],text=True)
  conflicts=[v for v in inventory.splitlines() if re.search(r'/(scsynth|supernova)$|Bitwig',v)]
  if conflicts:raise RuntimeError('Existing audio engine/Bitwig; leave it untouched and retry later: '+str(conflicts))
  (build/'processes-before.txt').write_text(subprocess.check_output(['/bin/ps','-axo','pid=,time=,comm='],text=True))
  assert 'SEND_LAYOUT_LIVE=PASS' in run('live',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/('inplace.scd' if a.in_place else 'live.scd')],timeout=900,stream=True)
  (build/'processes-after.txt').write_text(subprocess.check_output(['/bin/ps','-axo','pid=,time=,comm='],text=True))
  summary['live']=json.loads((build/'live-rows.json').read_text())
 assert all(hashlib.sha256(Path(v).read_bytes()).hexdigest()==h for v,h in hashes.items()),'Protected source changed'
 summary['passed']=True;print('SEND_LAYOUT_COMPLETE=PASS '+str(build),flush=True)
finally:(build/'results.json').write_text(json.dumps(summary,indent=2)+'\n')
