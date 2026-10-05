import pathlib,json
source=pathlib.Path('/private/tmp/awb-native-rate-output-boundaries-20261005.py').read_text().split('save()\ntry:\n')[0].replace('base.mkdir(exist_ok=False)','base.mkdir(exist_ok=True)')
ns={};exec(source,ns)
ns['manifest']=json.loads((ns['base']/'manifest.json').read_text());ns['manifest']['complete']=False;ns['save']()
try:
 for repeat in [1,2]:ns['case'](44100,10,68,'canvas2d-15',repeat,'band')
 ns['manifest']['complete']=True
finally:
 ns['manifest']['deviceAfter']=ns['setrate'](44100);ns['save']();print('RESTORED',ns['manifest']['deviceAfter'],flush=True)
