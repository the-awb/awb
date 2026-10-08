import os,json,time,signal,datetime
from pathlib import Path
root=Path('/private/tmp/awb-supernova-awb-functional-20261007-v1')
lock=Path('/private/tmp/awb-audio-hardware-test.lock')
lock.mkdir()
owner=dict(owner='AWB Supernova functional qualification',thread='01a10182-c25b-77a3-a12b-2b5266ded6f7',pid=os.getpid(),start=datetime.datetime.now(datetime.timezone.utc).isoformat(),configuration='Functionality only; silent private buses; MOTU44100/512; isolated combined engines; no capacity conclusions',output=str(root))
(lock/'owner.json').write_text(json.dumps(owner,indent=2));(root/'reservation.json').write_text(json.dumps(owner,indent=2))
print('RESERVATION '+json.dumps(owner),flush=True)
stopping=False
def stop(*args):
 global stopping
 stopping=True
signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
while not stopping and not(root/'release-request').exists(): time.sleep(.5)
# Caller must finish owned-engine cleanup before signalling release.
if json.loads((lock/'owner.json').read_text())['pid']==os.getpid():
 (lock/'owner.json').unlink();lock.rmdir()
print('RESERVATION_RELEASED',flush=True)
