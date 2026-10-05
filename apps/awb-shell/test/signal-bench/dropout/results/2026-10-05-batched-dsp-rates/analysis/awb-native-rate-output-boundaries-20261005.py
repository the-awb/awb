import os,subprocess,json,pathlib,time,hashlib,re
repo=pathlib.Path('/Users/willy/awb');base=pathlib.Path('/private/tmp/awb-native-rate-output-boundaries-20261005');base.mkdir(exist_ok=False)
node='/Users/willy/.nvm/versions/node/v22.23.2/bin/node';rateTool='/private/tmp/awb-motu-rate-20261004'
env=dict(os.environ,PATH=str(pathlib.Path(node).parent)+':'+os.environ['PATH'],DEVELOPER_DIR='/Applications/Xcode.app/Contents/Developer',AWB_NATIVE_RACK_SIZE='sends32',AWB_NATIVE_MAST='include',AWB_NATIVE_BRIDGE='on',AWB_NATIVE_DIRECTION='gui',AWB_AUDIO_AUDIT_LIBRARY='/private/tmp/awb-callback-audit.dylib',AWB_AUDIO_AUDIT_CHANNEL='2',AWB_PILOT_BUS='2',AWB_INPUT_RECORDER='/private/tmp/awb-input-record-rates-20261005');env.pop('ELECTRON_RUN_AS_NODE',None)
manifest={'scope':'rate/output comparisons and local DSP boundary search, actual 8-channel/32-send GUI-origin bridge','runs':[],'boundaries':{},'complete':False,'baseCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'baseline':'/private/tmp/awb-native-batched-dsp-v3-20261005/manifest.json'}
def save():(base/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
def setrate(rate):
 before=subprocess.check_output([rateTool],text=True).strip()
 if f'rate {rate}' not in before: subprocess.check_call([rateTool,str(rate)],stdout=subprocess.DEVNULL)
 for _ in range(30):
  actual=subprocess.check_output([rateTool],text=True).strip()
  if f'rate {rate}' in actual:return actual
  time.sleep(1)
 raise RuntimeError('Rate did not settle: '+actual)
def stats():return subprocess.check_output(['/bin/ps','-axo','pid=,time=,comm='],text=True)
def case(rate,outputs,nodes,condition,repeat,label='matrix'):
 setrate(rate);stem=base/f'{label}-{rate}-{outputs}-n{nodes}-{condition}-p{repeat}'
 run={'sampleRate':rate,'outputChannels':outputs,'nodes':nodes,'condition':condition,'repeat':repeat,'kind':label,'stem':str(stem),'started':time.time()};manifest['runs'].append(run);save();print('START',stem.name,flush=True)
 pathlib.Path(str(stem)+'.background-before.txt').write_text(stats());pathlib.Path(str(stem)+'.udp-before.txt').write_text(subprocess.check_output(['/usr/sbin/netstat','-s','-p','udp'],text=True))
 caseenv=dict(env,AWB_NATIVE_SAMPLE_RATE=str(rate),AWB_NATIVE_OUTPUT_CHANNELS=str(outputs),AWB_AUDIO_AUDIT=str(stem)+'.audit',AWB_LOOPBACK_RECORD=str(stem)+'.input')
 cmd=[node,'apps/awb-shell/test/signal-bench/dropout/native-run.mjs','--run','--quiet-window','--trace-mode=off',f'--load-nodes={nodes}',f'--targets={nodes}','--seconds=45','--repeats=1',f'--conditions={condition}','--exclusive-sc',f'--output={stem}.json']
 with open(str(stem)+'.log','w')as log:result=subprocess.run(cmd,cwd=repo,env=caseenv,stdout=log,stderr=subprocess.STDOUT,timeout=200)
 run['exitCode']=result.returncode;save()
 if result.returncode:raise RuntimeError('Capture failed: '+str(stem)+'.log')
 pathlib.Path(str(stem)+'.background-after.txt').write_text(stats());pathlib.Path(str(stem)+'.udp-after.txt').write_text(subprocess.check_output(['/usr/sbin/netstat','-s','-p','udp'],text=True))
 with open(str(stem)+'.analysis.log','w')as log:result=subprocess.run([node,'apps/awb-shell/test/signal-bench/dropout/analyse-input.mjs',str(stem)],cwd=repo,env=caseenv,stdout=log,stderr=subprocess.STDOUT,timeout=40)
 run['analysisExit']=result.returncode
 if result.returncode:save();raise RuntimeError('Analysis failed: '+str(stem)+'.analysis.log')
 p=json.loads(pathlib.Path(str(stem)+'.return.json').read_text())['phases'][0];native=p['native'];audio=p['audio'];inp=p['input']
 run['summary']={'functionalPass':native['functionalPass'],'failureKinds':sorted(set(f['kind'] for f in native['functionalFailures'])),'accepted':native['scRevisionDelta'],'sent':native['sentDelta'],'packets':native['oscOutputAfter']['packets']-native['oscOutputBefore']['packets'],'armed':native['armedAtEnd'],'bridgeErrors':native['bridgeErrors'],'returnClean':p['returnClean'],'recorderReliable':p['recorderReliable'],'badReturnCallbacks':inp['residualCallbacks'],'silentReturnCallbacks':inp['silentCallbacks'],'outputGaps':audio['frameGaps'],'overBudgetCallbacks':audio['overBudgetCallbacks'],'maxDspMs':audio['maxDspMs'],'meanDspMs':audio['meanDspMs'],'hardwareFrames':audio['hardwareFrames'],'scAverage':p['scAverage'],'electronCPU':p['electronCPU'],'sclangCPU':next(v['corePercent'] for v in p['processes']if v['role']=='sclang'),'paintHz':native['achievedRefreshHz']}
 assert native['sampleRate']==rate and native['outputChannels']==outputs;assert audio['sampleRate']==rate and audio['hardwareFrames']==512
 run['finished']=time.time();save();print('DONE',stem.name,json.dumps(run['summary']),flush=True)
 if not run['summary']['functionalPass']:raise RuntimeError('Bridge correctness failed; investigate before further captures')
 if not run['summary']['recorderReliable']:raise RuntimeError('Recorder unreliable; investigate before further captures')
 return run
save()
try:
 # The new rate/output matrix begins only after the original 48k/10-output runner completes.
 baseline=json.loads(pathlib.Path(manifest['baseline']).read_text());assert baseline['complete'],'48k baseline must complete first'
 manifest['deviceBefore']=subprocess.check_output([rateTool],text=True).strip();save()
 configs=[(48000,4),(44100,10),(44100,4)]
 for repeat in [1,2]:
  for rate,outputs in configs if repeat==1 else configs[::-1]:
   for condition in ['idle','canvas2d-15','svg-30'] if repeat==1 else ['svg-30','canvas2d-15','idle']:case(rate,outputs,60,condition,repeat)
 # Search locally with the intended 15 Hz Canvas2D surface; report finite clean/failing brackets.
 for rate,outputs in [(48000,10)]+configs:
  prior=baseline['runs'] if (rate,outputs)==(48000,10) else [r for r in manifest['runs']if r['sampleRate']==rate and r['outputChannels']==outputs and r['nodes']==60]
  at60=[r for r in prior if r['condition']=='canvas2d-15'];assert len(at60)==2
  clean=lambda runs:all(r['summary']['returnClean'] and r['summary'].get('overBudgetCallbacks',0)==0 and r['summary'].get('outputGaps',0)==0 for r in runs)
  boundary={'condition':'canvas2d-15','tested':[60],'cleanAt60':clean(at60),'cleanNodes':60 if clean(at60) else None,'failingNodes':None if clean(at60) else 60}
  manifest['boundaries'][f'{rate}/{outputs}']=boundary;save()
  if boundary['cleanAt60']:
   for nodes in [64,68,72]:
    runs=[case(rate,outputs,nodes,'canvas2d-15',repeat,'boundary')for repeat in [1,2]];boundary['tested'].append(nodes)
    if clean(runs):boundary['cleanNodes']=nodes
    else:
     boundary['failingNodes']=nodes;mid=nodes-2
     runs=[case(rate,outputs,mid,'canvas2d-15',repeat,'boundary')for repeat in [1,2]];boundary['tested'].append(mid)
     boundary['cleanNodes'if clean(runs) else 'failingNodes']=mid;break
  else:
   for nodes in [58,56,54,52]:
    runs=[case(rate,outputs,nodes,'canvas2d-15',repeat,'boundary')for repeat in [1,2]];boundary['tested'].append(nodes)
    if clean(runs):boundary['cleanNodes']=nodes;break
    boundary['failingNodes']=nodes
  save();print('BOUNDARY',rate,outputs,json.dumps(boundary),flush=True)
 manifest['complete']=True
finally:
 manifest['deviceAfter']=setrate(44100);save();print('RESTORED',manifest['deviceAfter'],flush=True)
