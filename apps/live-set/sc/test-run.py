"""Freeze the native Tool dependencies and run contracts without an audio engine."""
from pathlib import Path
import argparse,json,shutil,subprocess
parser=argparse.ArgumentParser();parser.add_argument('--output',default='/private/tmp/awb-live-set-class-test');args=parser.parse_args()
root=Path(__file__).resolve().parents[3];build=Path(args.output);app=Path('/Applications/SuperCollider.app/Contents');framework=Path('/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider')
for sub in ['framework','classes']:(build/sub).mkdir(parents=True,exist_ok=True)
manifest=json.loads((root/'apps/rack/sc/test/framework-files.json').read_text());manifest['EventExtensions.sc']='Classes/EventExtensions.sc'
for name,relative in manifest.items():shutil.copy2(framework/relative,build/'framework'/name)
for package in ['core','chain','rack','param','live-set']:
 for p in (root/f'apps/{package}/sc/classes').glob('*.sc'):shutil.copy2(p,build/'classes'/p.name)
for p in (root/'apps/live-set/sc/dependencies/unified-buffer').glob('*.sc'):shutil.copy2(p,build/'classes'/p.name)
shutil.copy2(root/'apps/core/sc/test/TestServer.sc',build/'framework/TestServer.sc')
# Metadata fixture only; tests never attach a native reader to this PID.
(build/'framework/LanguageTestServer.sc').write_text('AWBLiveLanguageTestServer : AWBCoreTestServer { pid { ^thisProcess.pid } }\n')
shutil.copy2(Path('/Library/Application Support/SuperCollider/Extensions/EnvDetect3/EnvDetect3.sc'),build/'classes/EnvDetect3.sc')
for p in (root/'apps/rack/sc/sets/awb52').glob('*.sc'):shutil.copy2(p,build/'classes'/p.name)
for p in Path('/Library/Application Support/SuperCollider/Extensions/VSTPlugin/classes').glob('*.sc'):shutil.copy2(p,build/'classes'/p.name)
conf='includePaths:\n'+''.join('  - '+json.dumps(str(v))+'\n' for v in [app/'Resources/SCClassLibrary',build/'framework',build/'classes'])+'excludeDefaultPaths: true\nexcludePaths: []\npostInlineWarnings: false\n'
config=build/'sclang_conf.yaml';config.write_text(conf)
with (build/'contract.log').open('w') as log:
 result=subprocess.run([str(app/'MacOS/sclang'),'-D','-l',str(config),str(root/'apps/live-set/sc/contract.scd')],stdout=log,stderr=subprocess.STDOUT,timeout=30)
if result.returncode:raise SystemExit(result.returncode)
print((build/'contract.log').read_text().split('AWB_LIVE_SURFACE_CONTRACT_RESULT=')[-1].strip())
print('Config: '+str(config))
