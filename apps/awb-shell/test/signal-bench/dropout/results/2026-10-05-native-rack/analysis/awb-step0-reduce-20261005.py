import json,sys,pathlib,xml.etree.ElementTree as E,re,collections
p=pathlib.Path(sys.argv[1]);label=sys.argv[2];schema=sys.argv[3]
stem='/private/tmp/awb-step0-followups-ea338b9/replacement-pass1-canvas2d-30' if label=='fault-canvas2d30' else '/private/tmp/awb-step0-system-ea338b9/pass1-svg-30'
report=json.loads(pathlib.Path(stem+'.json').read_text());pid=report['session']['scPID'];cache={};rows=[];total=0;stack=[];columns=[]
def flat(e):
 if e.get('ref'):
  v=cache.get(e.get('ref'))
  return {'tag':v[0],'raw':v[1],'fmt':v[2]} if v else {'unresolved':e.get('ref')}
 return {'tag':e.tag,'raw':(e.text or '').strip(),'fmt':e.get('fmt')}
for event,e in E.iterparse(p,events=('start','end')):
 if event=='start':stack.append(e);continue
 if e.get('id'):cache[e.get('id')]=(e.tag,(e.text or '').strip(),e.get('fmt'))
 if e.tag=='schema':columns=[{'mnemonic':c.findtext('mnemonic'),'tag':c.findtext('engineering-type')} for c in e.findall('col')]
 if e.tag=='row':
  total+=1;thread=e.find('thread');desc=(flat(thread).get('fmt') or '') if thread is not None else ''
  if 'IOThread.client' in desc and (('pid: '+str(pid)) in desc or ('('+str(pid)+')') in desc):rows.append({columns[i]['mnemonic'] if i<len(columns) else child.tag:flat(child) for i,child in enumerate(e)})
  if len(stack)>1:stack[-2].remove(e)
 if e.tag=='schema' and len(stack)>1:stack[-2].remove(e)
 stack.pop()
result={'label':label,'schema':schema,'source':str(p),'scPID':pid,'columns':columns,'totalRows':total,'audioRows':len(rows),'rows':rows}
out=p.with_suffix('.audio.json');out.write_text(json.dumps(result,separators=(',',':'))+'\n');print('REDUCED',label,schema,'rows',total,'audioRows',len(rows),flush=True)
