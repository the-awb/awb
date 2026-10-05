#!/usr/bin/env python3
"""Private class compilation and real offline FX audio, without booting a device."""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output',type=Path,help='Fresh evidence directory; defaults to a temporary directory')
    p.add_argument('--snapshot',type=Path)
    p.add_argument('--ir-mode',choices=['real','generated'],default='real')
    p.add_argument('--ir-directory',type=Path,default=Path('/Volumes/ARMED WITH SOUND/Samples/Convology samples'))
    p.add_argument('--ir-max-seconds',type=float,default=30)
    p.add_argument('--measure-controls',action='store_true',help='Owned muted hardware comparison of paused bank, detectors only and full envelope bank')
    p.add_argument('--control-sends',action='store_true',help='Include sixteen BaseLaunch inputs and independent envelopes')
    p.add_argument('--live-cpu',action='store_true',help='Also boot an owned server for a short engine CPU reading; hardware output is muted')
    p.add_argument('--quiet-window',action='store_true',help='Record agreement to avoid other intentional machine activity during live CPU readings')
    p.add_argument('--rack-root',type=Path,default=Path(__file__).resolve().parents[3])
    a = p.parse_args()
    if a.measure_controls: a.control_sends=True
    if (a.live_cpu or a.measure_controls) and not a.quiet_window: p.error('Live measurements require --quiet-window')
    here, rack = Path(__file__).resolve().parent, a.rack_root.resolve()
    snapshot = a.snapshot or rack.parent/'awb-shell/docs/bitwig-set-inspection-stage2/target-capture/snapshot.json'
    build = a.output.resolve() if a.output else Path(tempfile.mkdtemp(prefix='awb52-test-'))
    if a.output: build.mkdir(parents=True,exist_ok=False)
    for name in ['source','framework','rack','plugins']: (build/name).mkdir()
    framework = Path(os.environ.get('AWB_COLLIDER_ROOT','/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider'))
    extension = Path(os.environ.get('AWB_VST_EXTENSION','/Library/Application Support/SuperCollider/Extensions/VSTPlugin'))
    app = Path(os.environ.get('SUPERCOLLIDER_APP','/Applications/SuperCollider.app/Contents'))
    cache = Path.home()/'Library/Application Support/vstplugin/sc/cache_amd64.ini'
    provenance = {}
    for name, relative in json.loads((rack/'sc/test/framework-files.json').read_text()).items():
        path = framework/relative
        shutil.copy2(str(path),str(build/'framework'/name))
        provenance[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    for path in (rack/'sc/classes').glob('*.sc'):
        shutil.copy2(str(path),str(build/'rack'/path.name))
        provenance[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    for name in ['AWBFirstPassSet.sc','prepare.py']: shutil.copy2(str(here/name),str(build/'source'/name))
    for name in ['first-pass-test.scd','measure.scd','control-cost.scd']: shutil.copy2(str(here/name),str(build/name))
    # Loading both scsynth and Supernova plugin binaries causes duplicate Objective-C classes.
    shutil.copy2(str(extension/'plugins/VSTPlugin.scx'),str(build/'plugins/VSTPlugin.scx'))
    shutil.copy2(str(extension/'plugins/host'),str(build/'plugins/host'))
    if a.control_sends:
        detector_extension=Path('/Library/Application Support/SuperCollider/Extensions/EnvDetect3')
        for name,target in [('EnvDetect3.sc',build/'rack'),('EnvDetect3.scx',build/'plugins')]:
            path=detector_extension/name;shutil.copy2(str(path),str(target/name))
            provenance[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest()
    environment=dict(os.environ,AWB52_CONTROL_SENDS='1' if a.control_sends else '0')
    paths = [app/'Resources/SCClassLibrary',build/'framework',build/'rack',build/'source',extension/'classes']
    (build/'sclang_conf.yaml').write_text('includePaths:\n'+''.join('  - '+json.dumps(str(v))+'\n' for v in paths)+'excludeDefaultPaths: true\nexcludePaths: []\npostInlineWarnings: false\n')
    summary = dict(passed=False,evidence=str(build),fullLoad=True,memoryPoolKiB=262144,hardwareAudio=False,irMode=a.ir_mode,irMaxSeconds=a.ir_max_seconds)
    cache_hash = hashlib.sha256(cache.read_bytes()).hexdigest()

    def run(label,command,timeout=60):
        print('Running '+label,flush=True)
        result = subprocess.run(command,env=environment,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=timeout)
        log = result.stdout.decode(errors='replace')
        (build/(label+'.log')).write_text(log)
        errors = [line for line in log.splitlines() if 'ERROR:' in line or 'FAILURE IN SERVER' in line]
        # A pre-existing invalid entry in the user's cache is unrelated to these nine plugins.
        ignored = ['ERROR: /Library/Audio/Plug-Ins/VST/FL Studio VSTi.vst: not a plugin']
        failures = [line for line in errors if line not in ignored]
        if result.returncode or failures: raise RuntimeError(label+' failed: '+str(build/(label+'.log'))+'\n'+log[-3500:])
        summary.setdefault('existingCacheWarnings',[]).extend(line for line in errors if line in ignored)
        return log

    try:
        prepare_command = [sys.executable,str(build/'source/prepare.py'),'--snapshot',str(snapshot),'--output',str(build/'source/prepared')]
        if a.ir_mode == 'real': prepare_command += ['--ir-directory',str(a.ir_directory),'--ir-max-seconds',str(a.ir_max_seconds)]
        run('prepare',prepare_command)
        summary['irProvenance'] = json.loads((build/'source/prepared/first-pass.json').read_text()).get('irProvenance',[])
        log = run('score',[str(app/'MacOS/sclang'),'-l',str(build/'sclang_conf.yaml'),str(build/'first-pass-test.scd')])
        marker = re.search(r'AWB_FIRSTPASS_CONTRACT=PASS count=(\d+)',log)
        if not marker: raise RuntimeError('Missing SC completion marker')
        summary['contractChecks'] = int(marker.group(1))
        run('render',[str(app/'Resources/scsynth'),'-N',str(build/'first-pass.osc'),'_',str(build/'first-pass.wav'),'44100','WAV','float','-o','14','-i','3','-z','64','-m','262144','-U',str(app/'Resources/plugins')+':'+str(build/'plugins'),'-D','0','-V','-1'],timeout=120)
        run('verify',[sys.executable,str(here/'verify.py'),str(build)])
        summary['audio'] = json.loads((build/'audio-results.json').read_text())
        if a.live_cpu:
            log = run('measure',[str(app/'MacOS/sclang'),'-l',str(build/'sclang_conf.yaml'),str(build/'measure.scd')],timeout=110)
            if 'AWB52_LIVE_CPU=PASS' not in log: raise RuntimeError('Missing live CPU completion marker')
            summary['liveCPU'] = json.loads((build/'live-cpu.json').read_text())
            summary['hardwareAudio'] = True
        if a.measure_controls:
            log=run('control-cost',[str(app/'MacOS/sclang'),'-l',str(build/'sclang_conf.yaml'),str(build/'control-cost.scd')],timeout=160)
            if 'AWB_CONTROL_COST_RESULT=PASS' not in log: raise RuntimeError('Missing control cost completion marker')
            summary['controlCost']=json.loads((build/'control-cost.json').read_text())
            summary['hardwareAudio']=True
        summary['cacheUnchanged'] = hashlib.sha256(cache.read_bytes()).hexdigest() == cache_hash
        if not summary['cacheUnchanged']: raise RuntimeError('Plugin cache changed during validation')
        summary['passed'] = True
    finally:
        (build/'framework-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
        (build/'results.json').write_text(json.dumps(summary,indent=2)+'\n')
        print('Evidence: '+str(build),flush=True)
    print('AWB_FIRSTPASS_COMPLETE=PASS')


if __name__ == '__main__': main()
