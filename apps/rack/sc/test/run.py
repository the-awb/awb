#!/usr/bin/env python3
"""Test the rack against real AWB framework source without changing SC class paths."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--gui', action='store_true', help='Also exercise both Electron renderers')
    parser.add_argument('--shell', action='store_true', help='Also open the normal AWB Shell in a disposable profile')
    parser.add_argument('--output', type=Path, help='Evidence directory; default is a fresh temporary directory')
    parser.add_argument('--rack-root', type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    rack_root = args.rack_root.resolve()
    sources = Path(__file__).resolve().parent
    build = (args.output or Path(tempfile.mkdtemp(prefix='awb-send-rack-tests-'))).resolve()
    build.mkdir(parents=True, exist_ok=True)
    framework_root = Path(os.environ.get('AWB_COLLIDER_ROOT', '/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider'))
    (build/'framework').mkdir(exist_ok=True)
    provenance = {}
    for name, relative in json.loads((sources/'framework-files.json').read_text()).items():
        original = framework_root/relative
        if not original.is_file(): raise RuntimeError('Missing actual AWB framework source: '+str(original))
        shutil.copy2(str(original), str(build/'framework'/name))
        provenance[name] = dict(source=str(original), sha256=hashlib.sha256(original.read_bytes()).hexdigest())
    (build/'framework-provenance.json').write_text(json.dumps(provenance, indent=2)+'\n')
    for sub in ['test', 'sc/classes']: (build/sub).mkdir(parents=True, exist_ok=True)
    for source in sources.glob('*.scd'): shutil.copy2(str(source), str(build/'test'/source.name))
    for source in (rack_root/'sc/classes').glob('*.sc'): shutil.copy2(str(source), str(build/'sc/classes'/source.name))
    shutil.copy2(str(sources/'verify_audio.py'), str(build/'test/verify_audio.py'))
    app = Path(os.environ.get('SUPERCOLLIDER_APP', '/Applications/SuperCollider.app/Contents'))
    config = 'includePaths:\n'+''.join('  - '+json.dumps(str(p))+'\n' for p in [app/'Resources/SCClassLibrary',build/'framework',build/'sc/classes'])+'excludeDefaultPaths: true\nexcludePaths: []\npostInlineWarnings: false\n'
    (build/'sclang_conf.yaml').write_text(config)
    node = os.environ.get('AWB_NODE') or str(Path.home()/'.nvm/versions/node/v22.23.2/bin/node')
    if not Path(node).is_file(): node = shutil.which('node')
    if not node or int(subprocess.check_output([node,'--version']).decode().lstrip('v').split('.')[0]) < 22: raise RuntimeError('Node 22+ required; set AWB_NODE or PATH')
    env = dict(os.environ, AWB_RACK_SC_TEST_ROOT=str(build), PATH=str(Path(node).parent)+os.pathsep+os.environ['PATH'])
    env.pop('ELECTRON_RUN_AS_NODE', None)
    summary = dict(passed=False, evidence=str(build), frameworkFiles=len(provenance))
    def run(label, command, timeout=40, cwd=None):
        print('Running '+label, flush=True)
        result = subprocess.run(command, cwd=str(cwd or rack_root), env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)
        log = result.stdout.decode(errors='replace')
        (build/'test'/(label+'.log')).write_text(log)
        if result.returncode or 'FAILURE IN SERVER' in log or 'ERROR:' in log:
            print(log[-8000:]);raise RuntimeError(label+' failed; see '+str(build/'test'/(label+'.log')))
        return log
    try:
        log = run('contract',[str(app/'MacOS/sclang'),'-l',str(build/'sclang_conf.yaml'),str(build/'test/contract.scd')])
        if 'AWB_RACK_CONTRACT_RESULT=PASS' not in log: raise RuntimeError('Contract completion marker missing')
        for script in ['audio','stereo']:
            run(script+'-score',[str(app/'MacOS/sclang'),'-l',str(build/'sclang_conf.yaml'),str(build/'test'/(script+'.scd'))])
            run(script+'-render',[str(app/'Resources/scsynth'),'-N',str(build/'test'/(script+'.osc')),'_',str(build/'test'/(script+'.wav')),'48000','WAV','float','-o','8','-i','0','-z','64','-U',str(app/'Resources/plugins'),'-D','0','-V','-1'])
        run('verify-audio',[sys.executable,str(build/'test/verify_audio.py')])
        run('build',[str(Path(node).parent/'npm'),'run','build'])
        run('node',[node,'--test','test/model.test.mjs','test/runtime.test.mjs','test/mixes.test.mjs','test/sc-bridge.test.mjs'])
        summary['audio'] = json.loads((build/'test/audio-results.json').read_text())
        if args.gui or args.shell:
            electron = subprocess.check_output([node,'-p',"require('electron')"],cwd=str(rack_root),env=env).decode().strip()
            if args.gui:
                log=run('electron',[electron,'test/sc-electron.mjs'],timeout=55)
                if 'AWB_RACK_SC_GUI_RESULT=PASS' not in log: raise RuntimeError('GUI completion marker missing')
                summary['gui'] = json.loads((build/'test/artifacts/sc-electron.json').read_text())
            if args.shell:
                log=run('shell',[electron,'test/sc-shell.mjs'],timeout=45)
                if 'AWB_RACK_SC_SHELL_RESULT=PASS' not in log: raise RuntimeError('Shell completion marker missing')
                summary['shell'] = json.loads((build/'test/artifacts/sc-shell.json').read_text())
        summary['passed']=True
    finally:
        (build/'test/results.json').write_text(json.dumps(summary,indent=2)+'\n')
        print('Evidence: '+str(build), flush=True)
    print('AWB_RACK_COMPLETE_RESULT=PASS')


if __name__ == '__main__': main()
