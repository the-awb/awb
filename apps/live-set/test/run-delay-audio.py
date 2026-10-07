"""Shared functional audio check, private engine; hardware output remains muted."""
import subprocess,json,os,time,sys,socket
from pathlib import Path
root=Path(__file__).resolve().parents[3];out=Path('/private/tmp/awb-live-delay-audio');out.mkdir(exist_ok=True)
lock=Path('/private/tmp/awb-audio-hardware-test.lock')
if lock.exists():raise SystemExit('Exclusive audio reservation exists; no engine started')
config=Path(os.environ.get('AWB_DELAY_CLASS_CONFIG','/private/tmp/awb-live-delay-classes/sclang_conf.yaml'));binding=out/'binding.json'
if (out/'engine.log').exists():(out/'engine.log').rename(out/f'engine-attempt-{time.time_ns()}.log')
if binding.exists():binding.unlink()
if (out/'node-results.json').exists():(out/'node-results.json').unlink()
for port in [57975,57976]:
 probe=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
 try:probe.bind(('127.0.0.1',port))
 except OSError:raise SystemExit(f'Private fixture port {port} already in use; no engine started')
 finally:probe.close()
env=dict(os.environ,AWB_DELAY_ROOT=str(root),AWB_DELAY_BINDING=str(binding))
with (out/'engine.log').open('w') as log:
 p=subprocess.Popen(['/Applications/SuperCollider.app/Contents/MacOS/sclang','-a','-D','-u','57976','-l',str(config),str(root/'apps/live-set/sc/delay-audio-test.scd')],env=env,stdout=log,stderr=subprocess.STDOUT)
 (out/'process.json').write_text(json.dumps({'pid':p.pid,'useMode':'shared-functional','port':57975,'languagePort':57976,'hardwareOutput':'muted','sampleRate':44100,'otherPreviewUnchanged':True}))
 try:
  for _ in range(140):
   if binding.exists():break
   if p.poll() is not None:raise RuntimeError(f'SC fixture exited {p.returncode}')
   time.sleep(.5)
  else:raise RuntimeError('SC fixture did not become ready')
  r=subprocess.run(['/Users/willy/.nvm/versions/node/v22.23.2/bin/node',str(root/'apps/live-set/test/delay-audio.mjs'),str(binding)],env=env,stdout=log,stderr=subprocess.STDOUT,timeout=100)
  if r.returncode:raise RuntimeError('Node audio bridge test failed')
  p.wait(timeout=15)
  if p.returncode:raise RuntimeError('SC audio fixture failed')
 except Exception as e:
  print(str(e))
  # Give the fixture's finally/close protocol time to finish before forcing quit.
  try:p.wait(timeout=5)
  except subprocess.TimeoutExpired:pass
  sock=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);sock.sendto(b'/quit\0\0\0,\0\0\0',('127.0.0.1',57975));sock.close();time.sleep(1);p.terminate()
  try:p.wait(timeout=10)
  except subprocess.TimeoutExpired:p.kill();p.wait()
  raise
print((out/'engine.log').read_text()[-3500:])
