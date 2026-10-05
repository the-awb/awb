import os,subprocess,json,pathlib,time,hashlib
repo=pathlib.Path('/Users/willy/awb');base=pathlib.Path('/private/tmp/awb-native-batched-dsp-v3-20261005');base.mkdir(exist_ok=False)
node='/Users/willy/.nvm/versions/node/v22.23.2/bin/node'; rate='/private/tmp/awb-motu-rate-20261004'
env=dict(os.environ,PATH=str(pathlib.Path(node).parent)+':'+os.environ['PATH'],DEVELOPER_DIR='/Applications/Xcode.app/Contents/Developer',AWB_NATIVE_RACK_SIZE='sends32',AWB_NATIVE_MAST='include',AWB_NATIVE_BRIDGE='on',AWB_NATIVE_DIRECTION='gui',AWB_AUDIO_AUDIT_LIBRARY='/private/tmp/awb-callback-audit.dylib',AWB_AUDIO_AUDIT_CHANNEL='2',AWB_PILOT_BUS='2',AWB_NATIVE_SAMPLE_RATE='48000',AWB_NATIVE_OUTPUT_CHANNELS='10',AWB_INPUT_RECORDER='/private/tmp/awb-input-record-rates-20261005');env.pop('ELECTRON_RUN_AS_NODE',None)
manifest={'scope':'real DSP/MOTU loopback, 8 instrument channels, 32 destinations, GUI-origin batched bridge with own-value echo suppression','nodes':60,'seconds':45,'runs':[],'complete':False,'baseCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()}
manifest['workingDiff']=subprocess.check_output(['git','diff','--','apps/rack','apps/awb-shell/test/signal-bench/dropout/native-rack-fixture.mjs','apps/awb-shell/test/signal-bench/dropout/native-run.mjs'],cwd=repo,text=True);(base/'implementation.diff').write_text(manifest.pop('workingDiff'))
def save():(base/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
manifest['deviceBefore']=subprocess.check_output([rate],text=True).strip();manifest['originalRate']=44100;save()
cases=[(1,'svg-15'),(1,'idle'),(1,'canvas2d-15'),(1,'canvas2d-30'),(1,'svg-30'),(2,'svg-30'),(2,'canvas2d-30'),(2,'canvas2d-15'),(2,'idle'),(2,'svg-15')]
try:
 manifest['rateSet']=subprocess.check_output([rate,'48000'],text=True).strip();
 for attempt in range(30):
  if 'rate 48000' in subprocess.check_output([rate],text=True): break
  time.sleep(1)
 else: raise RuntimeError('MOTU failed to settle at 48000')
 for repeat,condition in cases:
  stem=base/f'pass{repeat}-{condition}';run={'repeat':repeat,'condition':condition,'stem':str(stem),'started':time.time()};manifest['runs'].append(run);save();print('START',repeat,condition,flush=True)
  caseenv=dict(env,AWB_AUDIO_AUDIT=str(stem)+'.audit',AWB_LOOPBACK_RECORD=str(stem)+'.input')
  command=[node,'apps/awb-shell/test/signal-bench/dropout/native-run.mjs','--run','--quiet-window','--trace-mode=off','--load-nodes=60','--targets=60','--seconds=45','--repeats=1',f'--conditions={condition}','--exclusive-sc',f'--output={stem}.json']
  with open(str(stem)+'.log','w') as log: result=subprocess.run(command,cwd=repo,env=caseenv,stdout=log,stderr=subprocess.STDOUT,timeout=200)
  run['exitCode']=result.returncode;save()
  if result.returncode: raise RuntimeError(f'Capture failed: {stem}.log')
  with open(str(stem)+'.analysis.log','w') as log: result=subprocess.run([node,'apps/awb-shell/test/signal-bench/dropout/analyse-input.mjs',str(stem)],cwd=repo,env=caseenv,stdout=log,stderr=subprocess.STDOUT,timeout=40)
  run['analysisExit']=result.returncode
  if result.returncode: save();raise RuntimeError(f'Analysis failed: {stem}.analysis.log')
  data=json.loads(pathlib.Path(str(stem)+'.return.json').read_text());p=data['phases'][0]
  run['summary']={'functionalPass':p['native']['functionalPass'],'functionalFailures':p['native']['functionalFailures'],'accepted':p['native']['scRevisionDelta'],'sent':p['native']['sentDelta'],'packets':p['native']['oscOutputAfter']['packets']-p['native']['oscOutputBefore']['packets'],'failures':p['native']['failures'],'armed':p['native']['armedAtEnd'],'returnClean':p['returnClean'],'recorderReliable':p['recorderReliable'],'badReturnCallbacks':p['input']['residualCallbacks'],'scAverage':p['scAverage'],'electronCPU':p['electronCPU'],'paintHz':p['native']['achievedRefreshHz']};run['finished']=time.time();save();print('DONE',repeat,condition,json.dumps({k:v for k,v in run['summary'].items() if k!='functionalFailures'}),flush=True)
  if not run['summary']['functionalPass']: raise RuntimeError('Bridge correctness failed; stop matrix and investigate')
  if not run['summary']['recorderReliable']: raise RuntimeError('Recorder unreliable; stop matrix')
 manifest['complete']=True
finally:
 manifest['deviceRestoration']=subprocess.check_output([rate,'44100'],text=True).strip();
 for attempt in range(30):
  manifest['deviceAfter']=subprocess.check_output([rate],text=True).strip()
  if 'rate 44100' in manifest['deviceAfter']: break
  time.sleep(1)
 save();print('RESTORED',manifest['deviceAfter'],flush=True)
