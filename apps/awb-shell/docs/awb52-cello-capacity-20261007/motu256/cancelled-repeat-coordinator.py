import datetime,json,os,pathlib,subprocess,sys,traceback,time
ROOT=pathlib.Path('/private/tmp/awb-motu256-baseline-repeat-20261007')
LOCK=pathlib.Path('/private/tmp/awb-audio-hardware-test.lock')
NOTE=pathlib.Path('/Users/willy/awb/apps/awb-shell/docs/audio-testing-coordination.md')
THREAD='01a10182-c25b-77a3-a12b-2b5266ded6f7'
NODE='/Users/willy/.nvm/versions/node/v22.23.2/bin/node'
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def device(*args):return json.loads(subprocess.check_output(['/private/tmp/awb-motu256-device',*map(str,args)],text=True))
def inventory():
 return subprocess.check_output(['/bin/ps','-axo','pid=,comm='],text=True)
def engines(text):
 return [l for l in text.splitlines() if 'Bitwig' in l or l.strip().endswith(('/scsynth','/supernova','/awb-audit-scsynth'))]
def emit(x):print(json.dumps(x),flush=True)
def save():
 (ROOT/'session.json').write_text(json.dumps(report,indent=2)+'\n')
 (LOCK/'owner.json').write_text(json.dumps(owner,indent=2)+'\n')
def state(stage):
 owner['stage']=stage;owner['updatedAt']=now();save()
 s=NOTE.read_text();prefix='Status: '
 a=s.index(prefix);b=s.index('\n',a)
 NOTE.write_text(s[:a]+prefix+stage+', updated '+now()+'. Owner: rack and live-set integration chat, thread `'+THREAD+'`.'+s[b:])
 emit({'stage':stage,'at':now()})
ROOT.mkdir(exist_ok=False)
deadline=time.monotonic()+600
while True:
 try:
  LOCK.mkdir(exist_ok=False)
  break
 except FileExistsError:
  if time.monotonic()>deadline:raise RuntimeError('Timed out awaiting other hardware reservation; no settings changed')
  time.sleep(5)

owner={'owner':'rack/live-set integration','thread':THREAD,'pid':os.getpid(),'startedAt':now(),'stage':'preflight','output':str(ROOT),'configuration':{'sampleRate':44100,'hardwareFrames':256,'scBlock':128,'fft':4096,'vstWorkers':2}}
report={'startedAt':now(),'complete':False,'runs':[],'hardwareBefore':None,'hardwareAfter':None}
restored=False
try:
 save()
 active=engines(inventory());assert not active,active
 report['hardwareBefore']=device();assert report['hardwareBefore']['sampleRate']==44100;assert report['hardwareBefore']['hardwareFrames']==512
 report['hardware256']=device(256);assert report['hardware256']['hardwareFrames']==256
 state('active hardware reservation; rack-only preparation and capture')
 for label,reserve in [('baseline',0)]:
  output=ROOT/label
  cmd=[NODE,'/private/tmp/awb-motu256-full-audit-run.mjs','--run','--quiet-window','--seconds=300','--repeats=1','--block=128','--ir-cap=30','--plugin-workers=2','--fft-size=4096',f'--reserve-percent={reserve}',f'--output={output}','--sc-source=/private/tmp/awb-motu256-cello-source.scd']
  state('active hardware reservation; '+label+' preparation and capture')
  entry={'name':label,'command':cmd,'startedAt':now(),'results':str(output/'results.json')};report['runs'].append(entry);save()
  code=subprocess.call(cmd,cwd='/Users/willy/awb')
  entry['exitCode']=code;entry['endedAt']=now();save()
  assert code==0, f'{label} harness failed, exit {code}'
  d=json.loads((output/'results.json').read_text());assert d['complete'];assert d['engineShutdownConfirmed'];assert d['guardsVerified']
  emit({'runFinished':label,'phase':[{'avg':p['scAverage'],'peak':p['scPeak'],'late':p['audio']['lateCallbacks'],'overBudget':p['audio']['overBudgetCallbacks'],'return':p['input']['residualCallbacks']} for p in d['phases']]})
 report['complete']=True
except Exception as e:
 report['error']=traceback.format_exc();emit({'error':str(e)});raise
finally:
 try:
  active=engines(inventory());assert not active, f'Audio processes remain; device restoration deferred: {active}'
  if report['hardwareBefore']:
   current=device();assert current['sampleRate']==report['hardwareBefore']['sampleRate'];assert current['hardwareFrames'] in [256,512]
   report['hardwareAfter']=device(report['hardwareBefore']['hardwareFrames']);restored=report['hardwareAfter']['hardwareFrames']==report['hardwareBefore']['hardwareFrames']
  else:restored=True
  assert restored
  state('released; MOTU256 session '+('completed' if report['complete'] else 'failed')+' and original hardware buffer restored')
 except Exception:
  report['cleanupError']=traceback.format_exc();save();emit({'cleanupError':report['cleanupError']})
 if restored:
  report['releasedAt']=now();save();(LOCK/'owner.json').unlink();LOCK.rmdir()
 emit({'sessionResults':str(ROOT/'session.json'),'complete':report['complete'],'restored':restored})
