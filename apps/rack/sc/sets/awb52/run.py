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
    p.add_argument('--earth-ir-max-seconds',type=float,default=5)
    p.add_argument('--echo-ir-max-seconds',type=float,default=20)
    p.add_argument('--measure-controls',action='store_true',help='Owned muted hardware comparison of paused bank, detectors only and full envelope bank')
    p.add_argument('--verb-profiles',action='store_true',help='Offline captured Verb profile mode, separate from all-branches full load')
    p.add_argument('--fx-profiles',action='store_true',help='Captured Deci/Sparkle selectors, Math and Deci sine LFO')
    p.add_argument('--cello-scheps',action='store_true',help='Verified Scheps 73 Mono on the cello input')
    p.add_argument('--fuzz-plugin',action='store_true',help='Actual restored MDMX Fuzz Stereo with captured profile')
    p.add_argument('--shared-fx',action='store_true',help='Native shared UberMod / stereo Scheps chain, EQ deferred')
    p.add_argument('--control-sends',action='store_true',help='Include sixteen BaseLaunch inputs and independent envelopes')
    p.add_argument('--plugin-readback',action='store_true',help='Short owned muted server for actual parameter bus mapping readback; no CPU benchmark')
    p.add_argument('--live-cpu',action='store_true',help='Also boot an owned server for a short engine CPU reading; hardware output is muted')
    p.add_argument('--quiet-window',action='store_true',help='Record agreement to avoid other intentional machine activity during live CPU readings')
    p.add_argument('--rack-root',type=Path,default=Path(__file__).resolve().parents[3])
    a = p.parse_args()
    if (a.verb_profiles or a.fx_profiles or a.cello_scheps or a.fuzz_plugin or a.shared_fx) and (a.measure_controls or a.live_cpu): p.error('Verb profile mode is currently an offline functional check')
    if a.shared_fx and not a.fx_profiles:p.error('Shared FX requires --fx-profiles')
    if a.plugin_readback and not (a.fx_profiles and a.verb_profiles): p.error("Plugin readback requires both FX and Verb profiles")
    if a.measure_controls: a.control_sends=True
    if (a.live_cpu or a.measure_controls) and not a.quiet_window: p.error('Live measurements require --quiet-window')
    here, rack = Path(__file__).resolve().parent, a.rack_root.resolve()
    snapshot = a.snapshot or here/'source-snapshot.json'
    build = a.output.resolve() if a.output else Path(tempfile.mkdtemp(prefix='awb52-test-'))
    if a.output: build.mkdir(parents=True,exist_ok=False)
    for name in ['source','framework','rack','plugins']: (build/name).mkdir()
    framework = Path(os.environ.get('AWB_COLLIDER_ROOT','/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider'))
    extension = Path(os.environ.get('AWB_VST_EXTENSION','/Library/Application Support/SuperCollider/Extensions/VSTPlugin'))
    app = Path(os.environ.get('SUPERCOLLIDER_APP','/Applications/SuperCollider.app/Contents'))
    cache = Path.home()/'Library/Application Support/vstplugin/sc/cache_amd64.ini'
    provenance = {}
    framework_files=json.loads((rack/'sc/test/framework-files.json').read_text())
    framework_files['EventExtensions.sc']='Classes/EventExtensions.sc'
    for name, relative in framework_files.items():
        path = framework/relative
        shutil.copy2(str(path),str(build/'framework'/name))
        provenance[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    for path in (rack/'sc/classes').glob('*.sc'):
        shutil.copy2(str(path),str(build/'rack'/path.name))
        provenance[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    for path in (rack.parent/'chain/sc/classes').glob('*.sc'):
        shutil.copy2(str(path),str(build/'rack'/path.name))
        provenance[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    for path in (rack.parent/'core/sc/classes').glob('*.sc'):
        shutil.copy2(str(path),str(build/'rack'/path.name))
        provenance[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    for name in ['AWBFirstPassSet.sc','AWBConvolutionIR.sc','AWBConvolutionEditor.sc','AWBVerbMixProfile.sc','AWBFXMixProfile.sc','prepare.py','verb-profile.json','fx-modulation-profile.json','scheps73-baseline.json','scheps73-plugin.ini','AWBAdditionalFXProfile.sc','AWBSharedFXChain.sc','additional-modulation-profile.json','fuzz-baseline.json','fuzz-plugin.ini','scheps73-stereo-baseline.json','scheps73-stereo-plugin.ini','master-profile.json','source-snapshot.json']:
        shutil.copy2(str(here/name),str(build/'source'/name))
        provenance[str(here/name)] = hashlib.sha256((here/name).read_bytes()).hexdigest()
    for name in ['first-pass-test.scd','modulation-test.scd','plugin-map-test.scd','additional-modulation-test.scd','measure.scd','control-cost.scd']: shutil.copy2(str(here/name),str(build/name))
    # Loading both scsynth and Supernova plugin binaries causes duplicate Objective-C classes.
    shutil.copy2(str(extension/'plugins/VSTPlugin.scx'),str(build/'plugins/VSTPlugin.scx'))
    shutil.copy2(str(extension/'plugins/host'),str(build/'plugins/host'))
    if a.control_sends:
        detector_extension=Path('/Library/Application Support/SuperCollider/Extensions/EnvDetect3')
        for name,target in [('EnvDetect3.sc',build/'rack'),('EnvDetect3.scx',build/'plugins')]:
            path=detector_extension/name;shutil.copy2(str(path),str(target/name))
            provenance[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest()
    private_data=build/'vst-data'
    private_cache=private_data/'vstplugin/sc/cache_amd64.ini'
    private_cache.parent.mkdir(parents=True)
    shutil.copy2(str(cache),str(private_cache))
    environment=dict(os.environ,XDG_DATA_HOME=str(private_data),AWB52_CONTROL_SENDS='1' if a.control_sends else '0',AWB52_VERB_PROFILES='1' if a.verb_profiles else '0',AWB52_FX_PROFILES='1' if a.fx_profiles else '0',AWB52_CELLO_SCHEPS='1' if a.cello_scheps else '0',AWB52_FUZZ_PLUGIN='1' if a.fuzz_plugin else '0',AWB52_SHARED_FX='1' if a.shared_fx else '0')
    paths = [app/'Resources/SCClassLibrary',build/'framework',build/'rack',build/'source',extension/'classes']
    (build/'sclang_conf.yaml').write_text('includePaths:\n'+''.join('  - '+json.dumps(str(v))+'\n' for v in paths)+'excludeDefaultPaths: true\nexcludePaths: []\npostInlineWarnings: false\n')
    summary = dict(passed=False,evidence=str(build),fullLoad=not (a.verb_profiles or a.fx_profiles),verbProfiles=a.verb_profiles,fxProfiles=a.fx_profiles,celloScheps=a.cello_scheps,fuzzPlugin=a.fuzz_plugin,sharedFX=a.shared_fx,memoryPoolKiB=262144,hardwareAudio=False,irMode=a.ir_mode,irMaxSeconds=a.ir_max_seconds)
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
        prepare_command = [sys.executable,str(build/'source/prepare.py'),'--snapshot',str(snapshot),'--output',str(build/'source/prepared'),'--cache',str(private_cache)]
        prepare_command += ['--verb-profile',str(build/'source/verb-profile.json')]
        if a.fx_profiles: prepare_command += ['--fx-profile',str(build/'source/fx-modulation-profile.json')]
        if a.cello_scheps: prepare_command += ['--cello-scheps']
        if a.fuzz_plugin: prepare_command += ['--fuzz-plugin']
        if a.shared_fx: prepare_command += ['--shared-fx']
        if a.ir_mode == 'real': prepare_command += ['--ir-directory',str(a.ir_directory),'--ir-max-seconds',str(a.ir_max_seconds),'--earth-ir-max-seconds',str(a.earth_ir_max_seconds),'--echo-ir-max-seconds',str(a.echo_ir_max_seconds)]
        run('prepare',prepare_command)
        prepared_json=build/'source/prepared/first-pass.json'
        prepared=json.loads(prepared_json.read_text());prepared['validationVerbProfiles']=a.verb_profiles;prepared['validationFXProfiles']=a.fx_profiles;prepared['validationCelloScheps']=a.cello_scheps;prepared['validationFuzzPlugin']=a.fuzz_plugin;prepared['validationSharedFX']=a.shared_fx
        prepared_json.write_text(json.dumps(prepared,indent=2)+'\n')
        summary['irMaxSecondsByBranch'] = prepared.get('irMaxSecondsByBranch',{})
        summary['irProvenance'] = json.loads((build/'source/prepared/first-pass.json').read_text()).get('irProvenance',[])
        log = run('score',[str(app/'MacOS/sclang'),'-l',str(build/'sclang_conf.yaml'),str(build/'first-pass-test.scd')])
        marker = re.search(r'AWB_FIRSTPASS_CONTRACT=PASS count=(\d+)',log)
        if not marker: raise RuntimeError('Missing SC completion marker')
        summary['contractChecks'] = int(marker.group(1))
        run('render',[str(app/'Resources/scsynth'),'-N',str(build/'first-pass.osc'),'_',str(build/'first-pass.wav'),'44100','WAV','float','-o','14','-i','3','-z','64','-m','262144','-U',str(app/'Resources/plugins')+':'+str(build/'plugins'),'-D','0','-V','-1'],timeout=120)
        run('verify',[sys.executable,str(here/'verify.py'),str(build)])
        summary['audio'] = json.loads((build/'audio-results.json').read_text())
        if a.fx_profiles:
            run('modulation-score',[str(app/'MacOS/sclang'),'-l',str(build/'sclang_conf.yaml'),str(build/'modulation-test.scd')])
            run('modulation-render',[str(app/'Resources/scsynth'),'-N',str(build/'modulation.osc'),'_',str(build/'modulation.wav'),'44100','WAV','float','-o','36','-i','0','-z','64','-m','262144','-U',str(app/'Resources/plugins'),'-D','0','-V','-1'])
            run('modulation-verify',[sys.executable,str(here/'verify_modulation.py'),str(build)])
            summary['modulation']=json.loads((build/'modulation-results.json').read_text())
        if a.fuzz_plugin and a.shared_fx:
            run('additional-score',[str(app/'MacOS/sclang'),'-l',str(build/'sclang_conf.yaml'),str(build/'additional-modulation-test.scd')])
            run('additional-render',[str(app/'Resources/scsynth'),'-N',str(build/'additional-modulation.osc'),'_',str(build/'additional-modulation.wav'),'44100','WAV','float','-o','33','-i','0','-z','64','-m','262144','-U',str(app/'Resources/plugins'),'-D','0','-V','-1'])
            run('additional-verify',[sys.executable,str(here/'verify_additional_modulation.py'),str(build)])
            summary['additionalModulation']=json.loads((build/'additional-modulation-results.json').read_text())
        if a.plugin_readback:
            log=run('plugin-readback',[str(app/'MacOS/sclang'),'-l',str(build/'sclang_conf.yaml'),str(build/'plugin-map-test.scd')],timeout=85)
            marker=re.search(r'AWB_PLUGIN_READBACK=PASS count=(\d+)',log)
            if not marker: raise RuntimeError('Missing actual plugin readback marker')
            summary['pluginReadbackChecks']=int(marker.group(1));summary['hardwareAudio']=True;summary['hardwareMeasurement']='muted functional readback only'
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
        summary['privateCacheDirectory'] = str(private_data)
        summary['privateCacheChanged'] = hashlib.sha256(private_cache.read_bytes()).hexdigest() != cache_hash
        summary['cacheUnchanged'] = hashlib.sha256(cache.read_bytes()).hexdigest() == cache_hash
        if not summary['cacheUnchanged']: raise RuntimeError('Plugin cache changed during validation')
        summary['passed'] = True
    finally:
        (build/'framework-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
        (build/'results.json').write_text(json.dumps(summary,indent=2)+'\n')
        print('Evidence: '+str(build),flush=True)
    print('AWB_FIRSTPASS_COMPLETE=PASS')


if __name__ == '__main__': main()
