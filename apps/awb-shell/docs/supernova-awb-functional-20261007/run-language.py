import os,sys,socket,subprocess,json,time,signal,shutil,hashlib
from pathlib import Path
root=Path('/private/tmp/awb-supernova-awb-functional-20261007-v1');backend=sys.argv[1]
script=sys.argv[2] if len(sys.argv)>2 else 'functional.scd'
destinations=int(sys.argv[3]) if len(sys.argv)>3 else 24
run=root/(backend+('-plugins'+str(destinations) if script=='plugin-functional.scd' else ('-'+Path(script).stem+str(destinations) if script!='functional.scd' else '')));run.mkdir(exist_ok=True)
for n in ['classes','framework']:
 if not (run/n).exists(): (run/n).symlink_to(root/n,target_is_directory=True)
(run/'plugins').mkdir(exist_ok=True)
for plugin in (root/'plugins').iterdir():
 if plugin.suffix=='.scx' and (('_supernova' in plugin.stem)==(backend=='supernova')): (run/'plugins'/plugin.name).symlink_to(plugin)
 if plugin.name=='host': (run/'plugins'/'host').symlink_to(plugin)
(run/'synthdefs').mkdir(exist_ok=True)
sock=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
sock=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);sock.bind(('127.0.0.1',0));lang=sock.getsockname()[1];sock.close()
base=Path('/private/tmp/awb-combined-control-queries-20261007/build')
env=dict(os.environ,AWB_FUNCTIONAL_ROOT=str(run),AWB_FUNCTIONAL_ENGINE=str(base/'server'/backend/backend),AWB_FUNCTIONAL_PORT=str(port),AWB_FUNCTIONAL_TOKEN='functional-'+backend,AWB_FUNCTIONAL_SPARES=str(destinations-24),AWB_TEST_VST_CACHE=str(root/'empty-vst-cache'),AWB_HOST_AUTOSTART='0',SC_SYNTHDEF_PATH=str(run/'synthdefs'))
cmd=[str(base/'lang/sclang'),'-D','-u',str(lang),'-l',str(root/'sclang.yaml'),str(root/script)]
with (run/'language.log').open('w') as log:
 p=subprocess.Popen(cmd,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 (run/'controller.json').write_text(json.dumps(dict(pid=os.getpid(),languagePID=p.pid,command=cmd,engine=env['AWB_FUNCTIONAL_ENGINE'],port=port,langPort=lang)))
 shutil.copy2(root/script,run/'executed-script.scd')
 (run/'fixture-hashes.json').write_text(json.dumps({str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for folder in ['framework','classes','plugins'] for f in (root/folder).glob('*') if f.is_file()},indent=2))
 print('LANGUAGE_STARTED',backend,p.pid,flush=True)
 try:
  code=p.wait(timeout=620)
 except (subprocess.TimeoutExpired,KeyboardInterrupt):
  os.killpg(p.pid,signal.SIGTERM)
  try: code=p.wait(timeout=8)
  except subprocess.TimeoutExpired: os.killpg(p.pid,signal.SIGKILL);code=p.wait()
 print('LANGUAGE_EXIT',backend,code,flush=True)
 (run/'exit.json').write_text(json.dumps(dict(returncode=code)))
 print((run/'language.log').read_text()[-3800:],flush=True)
 sys.exit(code)
