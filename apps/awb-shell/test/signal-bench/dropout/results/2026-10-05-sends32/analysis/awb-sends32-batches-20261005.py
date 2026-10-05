import os,json,pathlib,subprocess,time,re
root=pathlib.Path('/Users/willy/awb');node='/Users/willy/.nvm/versions/node/v22.23.2/bin/node';runner=str(root/'apps/awb-shell/test/signal-bench/dropout/native-run.mjs');rateHelper='/private/tmp/awb-motu-rate-20261004'
base=pathlib.Path('/private/tmp/awb-native-sends32-adf3f93-20261005');base.mkdir(exist_ok=False)
initial=subprocess.check_output([rateHelper],text=True).strip();original=float(re.search(r'rate (\d+)',initial)[1]);assert original in [44100,48000]
manifest={'commit':'adf3f93','profile':'sends32','mast':'include','nodes':60,'seconds':45,'originalMOTURate':original,'initialMOTUQuery':initial,'runs':[],'complete':False};cases=[];conditions=['idle','svg-15','svg-30','canvas2d-15','canvas2d-30']
for outer_pass in [1,2]:
 for condition in (conditions if outer_pass==1 else list(reversed(conditions))):
  for bridge in (['off','on'] if outer_pass==1 else ['on','off']):cases.append((outer_pass,'sends32',bridge,'gui',condition))
for outer_pass in [1,2]:
 for condition in (conditions[1:] if outer_pass==1 else list(reversed(conditions[1:]))):cases.append((outer_pass,'sends32','on','sc',condition))
manifest['plannedCases']=cases
save=lambda:(base/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
def capture(outer_pass,size,bridge,direction,condition,seconds,nodes,smoke=False):
 stem=base/('smoke-'+condition if smoke else f'pass{outer_pass}-{size}-{bridge}-{direction}-{condition}')
 entry={'pass':outer_pass,'size':size,'bridge':bridge,'direction':direction,'condition':condition,'stem':str(stem),'startedAt':time.time(),'complete':False}
 if smoke:manifest['smoke']=entry
 else:manifest['runs'].append(entry)
 save();env=os.environ.copy();env.pop('ELECTRON_RUN_AS_NODE',None);env.update(PATH=str(pathlib.Path(node).parent)+':'+env['PATH'],DEVELOPER_DIR='/Applications/Xcode.app/Contents/Developer',AWB_AUDIO_AUDIT=str(stem)+'.audit',AWB_AUDIO_AUDIT_LIBRARY='/private/tmp/awb-callback-audit.dylib',AWB_AUDIO_AUDIT_CHANNEL='2',AWB_PILOT_BUS='2',AWB_LOOPBACK_RECORD=str(stem)+'.input',AWB_NATIVE_RACK_SIZE=size,AWB_NATIVE_MAST='include',AWB_NATIVE_BRIDGE=bridge,AWB_NATIVE_DIRECTION=direction)
 args=[node,runner,'--run','--quiet-window','--trace-mode=off','--load-nodes='+str(nodes),'--targets='+str(nodes),'--seconds='+str(seconds),'--repeats=1','--exclusive-sc','--conditions='+condition,'--output='+str(stem)+'.json']
 print('START',outer_pass,size,bridge,direction,condition,'SMOKE' if smoke else '',flush=True);entry['udpBefore']=subprocess.check_output(['/usr/sbin/netstat','-s','-p','udp'],text=True);save()
 with open(str(stem)+'.log','w') as log:result=subprocess.run(args,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
 entry.update(exitCode=result.returncode,endedAt=time.time(),udpAfter=subprocess.check_output(['/usr/sbin/netstat','-s','-p','udp'],text=True));save()
 if result.returncode:raise RuntimeError('Benchmark failed; see '+str(stem)+'.log')
 report=json.loads(pathlib.Path(str(stem)+'.json').read_text());assert report['complete'] and report['cleanup'] and report['protectedCount']==16
 phase=report['phases'][0];assert phase['native']['instrumentChannels']==8 and phase['native']['sendDestinations']==32 and phase['native']['movingControls']==296 and phase['native']['mountedControls']==312
 entry.update(complete=True,functionalPass=phase['native']['functionalPass'],functionalFailureCount=len(phase['native']['functionalFailures']))
 with open(str(stem)+'.analysis.log','w') as log:analysis=subprocess.run([node,str(root/'apps/awb-shell/test/signal-bench/dropout/analyse-input.mjs'),str(stem)],cwd=root,stdout=log,stderr=subprocess.STDOUT)
 entry['analysisExitCode']=analysis.returncode
 if analysis.returncode:raise RuntimeError('Return analysis failed; see '+str(stem)+'.analysis.log')
 q=json.loads(pathlib.Path(str(stem)+'.return.json').read_text())['phases'][0];entry.update(returnClean=q['returnClean'],recorderReliable=q['recorderReliable'],badReturnCallbacks=q['input']['residualCallbacks'],silentReturnCallbacks=q['input']['silentCallbacks']);assert q['recorderReliable'];save();print('CAPTURE_COMPLETE',outer_pass,bridge,direction,condition,'functionalPass',entry['functionalPass'],'badReturnCallbacks',entry['badReturnCallbacks'],flush=True)
 if smoke:assert entry['functionalPass']
try:
 subprocess.run([rateHelper,'48000'],check=True)
 for attempt in range(30):
  if subprocess.check_output([rateHelper],text=True).strip().endswith('rate 48000'):break
  time.sleep(1)
 else:raise RuntimeError('MOTU did not switch to 48000')
 capture(0,'sends32','on','sc','canvas2d-15',6,0,smoke=True)
 for case in cases:capture(*case,45,60)
 manifest['complete']=True;save();print('SENDS32_MATRIX_COMPLETE',flush=True)
finally:
 setResult=subprocess.run([rateHelper,str(int(original))],capture_output=True,text=True)
 query=subprocess.run([rateHelper],capture_output=True,text=True)
 for attempt in range(30):
  if query.stdout.strip().endswith('rate '+str(int(original))):break
  time.sleep(1);query=subprocess.run([rateHelper],capture_output=True,text=True)
 record={'setExitCode':setResult.returncode,'setOutput':setResult.stdout,'queryExitCode':query.returncode,'queryOutput':query.stdout,'original':original,'time':time.time()};(base/'restoration.json').write_text(json.dumps(record,indent=2)+'\n');print('MOTU_RESTORATION',json.dumps(record),flush=True)
