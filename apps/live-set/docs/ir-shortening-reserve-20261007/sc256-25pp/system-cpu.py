from pathlib import Path
import subprocess,time,json
p=Path('/private/tmp/awb-earth5-echo20-sc256-awake/system-cpu.jsonl')
with p.open('w') as f:
 for _ in range(180):
  if Path('/private/tmp/awb-earth5-echo20-sc256-awake/fixture/gui-stop').exists():break
  f.write(json.dumps({'utc':time.time(),'processes':subprocess.check_output(['/bin/ps','-axo','pid=,ppid=,pcpu=,time=,comm='],text=True)})+'\n');f.flush();time.sleep(5)
