#!/usr/bin/env python3
"""Private actual-engine GUI qualification, serialized by the shared audio lock."""
import argparse,json,os,signal,subprocess,tempfile,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',type=Path);p.add_argument('--count',type=int,choices=[16,32,128],default=16);p.add_argument('--engine',choices=['scsynth','supernova','both'],default='both');args=p.parse_args()
root=Path(__file__).resolve().parents[3];output=(args.output or Path(tempfile.mkdtemp(prefix='awb-param-live-'))).resolve();output.mkdir(parents=True,exist_ok=True)
lock=Path('/private/tmp/awb-audio-hardware-test.lock');node=Path('/Users/willy/.nvm/versions/node/v22.23.2/bin');app=Path('/Applications/SuperCollider.app/Contents');result=dict(passed=False,startedEngines=[],output=str(output))
# Check reservation before compilation; never remove or overwrite another owner.
if lock.exists():
 result.update(blocked='Audio test reservation is held',reservation=json.loads((lock/'owner.json').read_text()));(output/'qualification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));raise SystemExit(3)
env=dict(os.environ,PATH=str(node)+os.pathsep+os.environ['PATH'],AWB_PARAM_COUNT=str(args.count));env.pop('ELECTRON_RUN_AS_NODE',None)
# Frozen private class path, existing offline regression suite; no installed class changes.
with (output/'prepare.log').open('w') as log:subprocess.run(['python3',str(root/'apps/core/sc/test/run.py'),'--output',str(output/'classes')],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
owner=dict(owner='AWParam GUI live qualification',pid=os.getpid(),started=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),configuration=f'Private silent {args.count}-parameter local engines; system device/rate/buffer unchanged',output=str(output))
try:lock.mkdir()
except FileExistsError:print('Audio reservation was claimed during preparation; no engine launched.');raise SystemExit(3)
(lock/'owner.json').write_text(json.dumps(owner,indent=2));child=None
try:
 for engine in (['scsynth','supernova'] if args.engine=='both' else [args.engine]):
  env.update(AWB_PARAM_TEST_OUTPUT=str(output/engine),AWB_PARAM_TEST_CONF=str(output/'classes/sclang_conf.yaml'),AWB_PARAM_ENGINE=str(app/'Resources'/engine))
  result['startedEngines'].append(engine)
  with (output/(engine+'.log')).open('w') as log:
   child=subprocess.Popen([str(root/'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),str(root/'apps/param/test/live.mjs')],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
   try:
    if child.wait(timeout=75):raise RuntimeError(f'{engine} GUI qualification failed; see {log.name}')
   finally:
    try:os.killpg(child.pid,signal.SIGTERM)
    except ProcessLookupError:pass
  print(engine+' GUI qualification passed',flush=True)
 result['passed']=True
finally:
 if child:
  try:os.killpg(child.pid,signal.SIGTERM)
  except ProcessLookupError:pass
 (output/'qualification.json').write_text(json.dumps(result,indent=2))
 if json.loads((lock/'owner.json').read_text()).get('pid')==os.getpid():(lock/'owner.json').unlink();lock.rmdir()
