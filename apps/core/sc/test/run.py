#!/usr/bin/env python3
"""Private SC class path and offline server rendering; no live installs/devices."""
import argparse, hashlib, json, os, shutil, signal, subprocess, tempfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',type=Path);args=p.parse_args()
root=Path(__file__).resolve().parents[2]
build=(args.output or Path(tempfile.mkdtemp(prefix='awb-core-test-'))).resolve();build.mkdir(parents=True,exist_ok=True)
app=Path('/Applications/SuperCollider.app/Contents');framework=Path('/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider')
for sub in ['framework','classes','test']:(build/sub).mkdir(exist_ok=True)
manifest=json.loads((root.parent/'rack/sc/test/framework-files.json').read_text())
manifest['EventExtensions.sc']='Classes/EventExtensions.sc'
for name,relative in manifest.items():shutil.copy2(framework/relative,build/'framework'/name)
for package in [root,root.parent/'chain',root.parent/'rack',root.parent/'param']:
 for source in (package/'sc/classes').glob('*.sc'):shutil.copy2(source,build/'classes'/source.name)
shutil.copy2(root.parent/'rack/sc/sets/awb52/AWBVerbMixProfile.sc',build/'classes/AWBVerbMixProfile.sc')
for source in (root/'sc/test').glob('*.sc'):shutil.copy2(source,build/'framework'/source.name)
for source in (root/'sc/test').glob('*.scd'):shutil.copy2(source,build/'test'/source.name)
conf='includePaths:\n'+''.join('  - '+json.dumps(str(v))+'\n' for v in [app/'Resources/SCClassLibrary',build/'framework',build/'classes'])+'excludeDefaultPaths: true\nexcludePaths: []\npostInlineWarnings: false\n'
(build/'sclang_conf.yaml').write_text(conf)
(build/'source-sha256.json').write_text(json.dumps({str(v):hashlib.sha256(v.read_bytes()).hexdigest() for v in [*[v for sub in ['framework','classes','test'] for v in (build/sub).glob('*')],*(root/'sc/test').glob('*.py')]},indent=2))
(build/'results.json').write_text(json.dumps(dict(passed=False,evidence=str(build)),indent=2))
def run(label,cmd,timeout=45):
 print('Running '+label,flush=True)
 process=subprocess.Popen([str(c) for c in cmd],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
 try:output,_=process.communicate(timeout=timeout)
 except subprocess.TimeoutExpired:
  os.killpg(process.pid,signal.SIGKILL);output,_=process.communicate();(build/(label+'.log')).write_bytes(output);raise RuntimeError(label+' timed out')
 finally:
  try:os.killpg(process.pid,signal.SIGKILL)
  except ProcessLookupError:pass
 log=output.decode(errors='replace');(build/(label+'.log')).write_text(log)
 if process.returncode or 'ERROR:' in log or 'FAILURE IN SERVER' in log:print(log[-12000:]);raise RuntimeError(label+' failed')
 return log
log=run('contract',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'test/contract.scd']);assert 'AWB_CORE_CONTRACT_RESULT=PASS' in log
log=run('registration',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'test/registration.scd']);assert 'AWB_MODULATION_CONTRACT_RESULT=PASS' in log
log=run('param-gui',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'test/param-gui.scd']);assert 'AWB_PARAM_GUI_CONTRACT_RESULT=PASS' in log
if (build/'test/audio.scd').exists():
 run('audio-score',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'test/audio.scd'])
 run('audio-render',[app/'Resources/scsynth','-N',build/'test/audio.osc','_',build/'test/audio.wav',44100,'WAV','float','-o',8,'-i',0,'-z',64,'-U',app/'Resources/plugins','-D',0,'-V',-1])
 run('audio-verify',['python3',root/'sc/test/verify_audio.py',build/'test/audio.wav'])
run('select-score',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'test/select.scd'])
run('select-render',[app/'Resources/scsynth','-N',build/'test/select.osc','_',build/'test/select.wav',44100,'WAV','float','-o',8,'-i',0,'-z',64,'-U',app/'Resources/plugins','-D',0,'-V',-1])
run('select-verify',['python3',root/'sc/test/verify_select.py',build/'test/select.wav'])
run('tail-score',[app/'MacOS/sclang','-l',build/'sclang_conf.yaml',build/'test/tail.scd'])
run('tail-render',[app/'Resources/scsynth','-N',build/'test/tail.osc','_',build/'test/tail.wav',44100,'WAV','float','-o',8,'-i',0,'-z',64,'-U',app/'Resources/plugins','-D',0,'-V',-1])
run('tail-verify',['python3',root/'sc/test/verify_tail.py',build/'test/tail.wav'])
run('protocol',['python3',root/'sc/test/protocol.py',build])
(build/'results.json').write_text(json.dumps(dict(passed=True,evidence=str(build)),indent=2));print('AWB_CORE_COMPLETE_RESULT=PASS')
print('Evidence: '+str(build))
