import os,json,pathlib,subprocess,time
try:
 root=pathlib.Path('/Users/willy/awb');node='/Users/willy/.nvm/versions/node/v22.23.2/bin/node';runner=str(root/'apps/awb-shell/test/signal-bench/dropout/native-run.mjs')
 base=pathlib.Path('/private/tmp/awb-native-live-v3-ea338b9');base.mkdir(exist_ok=False)
 conditions=['idle','svg-15','svg-30','canvas2d-15','canvas2d-30'];cases=[]
 for outer_pass in [1,2]:
  for size in (['32','small','large'] if outer_pass==1 else ['large','small','32']):
   for condition in (conditions if outer_pass==1 else list(reversed(conditions))):
    for bridge in (['off','on'] if outer_pass==1 else ['on','off']):cases.append((outer_pass,size,bridge,'gui',condition))
 for outer_pass in [1,2]:
  for size in (['32','small','large'] if outer_pass==1 else ['large','small','32']):
   for condition in (conditions[1:] if outer_pass==1 else list(reversed(conditions[1:]))):cases.append((outer_pass,size,'on','sc',condition))
 manifest={'harnessVersion':'native-v3-feedback-counters-and-error-telemetry','commit':'ea338b9','mode':'off','nodes':60,'seconds':45,'runs':[],'complete':False,'plannedCases':cases}
 def save(): (base/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 save()
 for outer_pass,size,bridge,direction,condition in cases:
  stem=base/f'pass{outer_pass}-{size}-{bridge}-{direction}-{condition}'
  entry={'pass':outer_pass,'size':size,'bridge':bridge,'direction':direction,'condition':condition,'stem':str(stem),'startedAt':time.time(),'complete':False};manifest['runs'].append(entry);save()
  env=os.environ.copy();env.pop('ELECTRON_RUN_AS_NODE',None);env.update(PATH=str(pathlib.Path(node).parent)+':'+env['PATH'],DEVELOPER_DIR='/Applications/Xcode.app/Contents/Developer',AWB_AUDIO_AUDIT=str(stem)+'.audit',AWB_AUDIO_AUDIT_LIBRARY='/private/tmp/awb-callback-audit.dylib',AWB_AUDIO_AUDIT_CHANNEL='2',AWB_PILOT_BUS='2',AWB_LOOPBACK_RECORD=str(stem)+'.input',AWB_NATIVE_RACK_SIZE=size,AWB_NATIVE_BRIDGE=bridge,AWB_NATIVE_DIRECTION=direction)
  args=[node,runner,'--run','--quiet-window','--trace-mode=off','--load-nodes=60','--targets=60','--seconds=45','--repeats=1','--exclusive-sc','--conditions='+condition,'--output='+str(stem)+'.json']
  print('START',outer_pass,size,bridge,direction,condition,flush=True)
  udpBefore=subprocess.run(['/usr/sbin/netstat','-s','-p','udp'],capture_output=True,text=True);entry['udpBefore']=udpBefore.stdout;entry['udpBeforeExitCode']=udpBefore.returncode;save()
  with open(str(stem)+'.log','w') as log: result=subprocess.run(args,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
  udpAfter=subprocess.run(['/usr/sbin/netstat','-s','-p','udp'],capture_output=True,text=True);entry['udpAfter']=udpAfter.stdout;entry['udpAfterExitCode']=udpAfter.returncode
  entry['exitCode']=result.returncode;entry['endedAt']=time.time()
  if result.returncode: save();raise SystemExit('Benchmark failed; see '+str(stem)+'.log')
  report=json.loads(pathlib.Path(str(stem)+'.json').read_text());assert report['complete'] and report['cleanup'] and report['protectedCount']==16
  entry['complete']=True;entry['functionalPass']=all(x['native']['functionalPass'] for x in report['phases']);entry['functionalFailureCount']=sum(len(x['native']['functionalFailures']) for x in report['phases'])
  with open(str(stem)+'.analysis.log','w') as log: analysis=subprocess.run([node,str(root/'apps/awb-shell/test/signal-bench/dropout/analyse-input.mjs'),str(stem)],cwd=root,stdout=log,stderr=subprocess.STDOUT)
  entry['analysisExitCode']=analysis.returncode
  if analysis.returncode==0:
   analysed=json.loads(pathlib.Path(str(stem)+'.return.json').read_text());entry['returnClean']=all(p['returnClean'] for p in analysed['phases']);entry['recorderReliable']=all(p['recorderReliable'] for p in analysed['phases']);entry['badReturnCallbacks']=sum(p['input']['residualCallbacks'] for p in analysed['phases']);entry['silentReturnCallbacks']=sum(p['input']['silentCallbacks'] for p in analysed['phases'])
  else: entry['returnExcluded']=True
  save();print('CAPTURE_COMPLETE',outer_pass,size,bridge,direction,condition,'functionalPass',entry['functionalPass'],'failures',entry['functionalFailureCount'],'returnClean',entry.get('returnClean'),'badReturnCallbacks',entry.get('badReturnCallbacks'),flush=True)
 manifest['complete']=True;save();print('NATIVE_BATCHES_COMPLETE',flush=True)
finally:
 restored=subprocess.run(['/private/tmp/awb-motu-rate-20261004','44100'],capture_output=True,text=True)
 verified=subprocess.run(['/private/tmp/awb-motu-rate-20261004'],capture_output=True,text=True)
 for attempt in range(30):
  if verified.stdout.strip().endswith('rate 44100'):break
  time.sleep(1);verified=subprocess.run(['/private/tmp/awb-motu-rate-20261004'],capture_output=True,text=True)
 record={'setExitCode':restored.returncode,'setOutput':restored.stdout,'setError':restored.stderr,'queryExitCode':verified.returncode,'queryOutput':verified.stdout,'queryError':verified.stderr,'time':time.time()}
 pathlib.Path('/private/tmp/awb-motu-restoration-v3-20261005.json').write_text(json.dumps(record,indent=2)+'\n')
 print('MOTU_RESTORATION',json.dumps(record),flush=True)
