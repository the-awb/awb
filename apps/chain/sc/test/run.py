#!/usr/bin/env python3
"""Private class library, actual Tool framework; no live class-path changes."""
import argparse,json,os,shutil,subprocess,tempfile,signal,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',type=Path);p.add_argument('--shell',action='store_true');args=p.parse_args()
root=Path(__file__).resolve().parents[2];build=(args.output or Path(tempfile.mkdtemp(prefix='awb-chain-test-'))).resolve();build.mkdir(parents=True,exist_ok=True)
(build/'results.json').write_text(json.dumps(dict(passed=False,evidence=str(build)),indent=2))
framework=Path('/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider');app=Path('/Applications/SuperCollider.app/Contents');node=Path.home()/'.nvm/versions/node/v22.23.2/bin/node'
for sub in ['framework','classes','test']:(build/sub).mkdir(exist_ok=True)
for name,relative in json.loads((root.parent/'rack/sc/test/framework-files.json').read_text()).items():shutil.copy2(framework/relative,build/'framework'/name)
for source in (root/'sc/classes').glob('*.sc'):shutil.copy2(source,build/'classes'/source.name)
for source in (root/'sc/test').glob('*.scd'):shutil.copy2(source,build/'test'/source.name)
provenance={str(v):hashlib.sha256(v.read_bytes()).hexdigest() for v in list((build/'framework').glob('*.sc'))+list((build/'classes').glob('*.sc'))+list((root/'runtime').glob('*.mjs'))+list((root/'src').glob('*'))+list((root/'test').glob('*.mjs'))+list((root/'sc/test').glob('*.scd'))+list((root/'sc/test').glob('*.py'))+[root.parent/'awb-shell/shell/main.mjs']}
(build/'source-sha256.json').write_text(json.dumps(provenance,indent=2)+'\n')
conf='includePaths:\n'+''.join('  - '+json.dumps(str(v))+'\n' for v in [app/'Resources/SCClassLibrary',build/'framework',build/'classes'])+'excludeDefaultPaths: true\nexcludePaths: []\npostInlineWarnings: false\n';(build/'sclang_conf.yaml').write_text(conf)
env=dict(os.environ,AWB_CHAIN_TEST_ROOT=str(build),PATH=str(node.parent)+os.pathsep+os.environ['PATH']);env.pop('ELECTRON_RUN_AS_NODE',None)
def run(label,cmd,timeout=40):
 print('Running '+label,flush=True)
 process=subprocess.Popen([str(c) for c in cmd],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
 expired=False
 try: output,_=process.communicate(timeout=timeout)
 except subprocess.TimeoutExpired:
  expired=process.poll() is None
  try: os.killpg(process.pid,signal.SIGKILL)
  except ProcessLookupError: pass
  output,_=process.communicate(timeout=5)
 finally:
  try: os.killpg(process.pid,signal.SIGKILL)
  except ProcessLookupError: pass
 log=output.decode(errors='replace');(build/(label+'.log')).write_text(log)
 if expired: raise RuntimeError(label+' timed out; owned test process group was stopped')
 result=process
 if result.returncode or 'ERROR:' in log or 'FAILURE IN SERVER' in log:print(log[-9000:]);raise RuntimeError(label+' failed')
 return log
try:
 log=run('contract',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'test/contract.scd']);assert 'AWB_CHAIN_CONTRACT_RESULT=PASS' in log
 log=run('stages',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'test/stages.scd']);assert 'AWB_CHAIN_STAGE_RESULT=PASS' in log
 run('audio-score',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'test/audio.scd'])
 run('audio-render',[app/'Resources/scsynth','-N',build/'test/audio.osc','_',build/'test/audio.wav',48000,'WAV','float','-o',4,'-i',0,'-z',64,'-U',app/'Resources/plugins','-D',0,'-V',-1])
 run('audio-verify',['python3',root/'sc/test/verify_audio.py',build/'test/audio.wav'])
 run('managed-audio-score',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'test/managed-audio.scd'])
 run('managed-audio-render',[app/'Resources/scsynth','-N',build/'test/managed-audio.osc','_',build/'test/managed-audio.wav',48000,'WAV','float','-o',4,'-i',0,'-z',64,'-U',app/'Resources/plugins','-D',0,'-V',-1])
 run('managed-audio-verify',['python3',root/'sc/test/verify_managed_audio.py',build/'test/managed-audio.wav'])
 run('build',[node.parent/'npm','run','build'])
 run('node',[node,'--test','--test-concurrency=1','test/model.test.mjs','test/bridge.test.mjs','test/stage-bridge.test.mjs'])
 if args.shell:
  electron=subprocess.check_output([str(node),'-p',"require('electron')"],cwd=root,env=env).decode().strip();assert 'AWB_CHAIN_SHELL_RESULT=PASS' in run('shell',[electron,'test/shell.mjs'],40);assert 'AWB_CHAIN_STAGE_SHELL_RESULT=PASS' in run('stage-shell',[electron,'test/stage-shell.mjs'],50)
 (build/'results.json').write_text(json.dumps(dict(passed=True,evidence=str(build)),indent=2));print('AWB_CHAIN_COMPLETE_RESULT=PASS')
finally:print('Evidence: '+str(build),flush=True)
