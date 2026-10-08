import subprocess,json,time
from pathlib import Path
r=Path('/private/tmp/awb-supernova-awb-functional-20261007-v1');node='/Users/willy/.nvm/versions/node/v22.23.2/bin/node';rows=[]
for backend,kind,size in [('scsynth','plugins',24),('supernova','native',24),('scsynth','plugins',32),('supernova','native',32)]:
 script='plugin-functional.scd' if kind=='plugins' else 'rack-native.scd';run=r/(backend+('-plugins' if kind=='plugins' else '-rack-native')+str(size))
 p=subprocess.Popen(['/usr/bin/python3',str(r/'run-language.py'),backend,script,str(size)],stdout=(r/(run.name+'-controller.log')).open('w'),stderr=subprocess.STDOUT)
 command=[node,str(r/'rack-bridge-check.mjs'),backend,str(size)]+(['native']if kind=='native'else[])
 with (r/(run.name+'-node.log')).open('w')as log:
  q=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT,timeout=200)
 code=p.wait(timeout=20)
 rows.append(dict(backend=backend,kind=kind,destinations=size,nodeExit=q.returncode,languageExit=code))
 print(rows[-1],flush=True)
 if q.returncode or code:break
(r/'final-rack-controller.json').write_text(json.dumps(rows,indent=2))
