#!/usr/bin/env python3
"""Emulated SC OSC peer: language protocol/lifecycle test, not DSP evidence."""
import json,os,socket,struct,subprocess,sys,threading
from pathlib import Path
build=Path(sys.argv[1]);sock=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);sock.bind(('127.0.0.1',0));sock.settimeout(.1)
nodes={};tree_nodes={0:[1],1:[]};parents={1:0};drop_tree=False;timers=[];commands=[];stopped=threading.Event()
def text(value):
 raw=value.encode()+b'\0';return raw+b'\0'*((-len(raw))%4)
def packet(address,args):
 tags=''.join('i' if isinstance(v,int) else 's' if isinstance(v,str) else 'f' for v in args)
 return text(address)+text(','+tags)+b''.join(text(value) if tag=='s' else struct.pack('>i' if tag=='i' else '>f',value) for tag,value in zip(tags,args))
def decode(raw):
 if raw.startswith(b'#bundle\0'):
  at=16
  while at<len(raw):
   size=struct.unpack_from('>I',raw,at)[0];at+=4;yield from decode(raw[at:at+size]);at+=size
  return
 def string(at):
  end=raw.index(b'\0',at);return raw[at:end].decode(),(end+4)&~3
 address,at=string(0)
 if not address:address=str(struct.unpack_from('>i',raw,0)[0]);at=4
 tags,at=string(at);args=[]
 for tag in tags[1:]:
  if tag in 'if':args.append(struct.unpack_from('>i' if tag=='i' else '>f',raw,at)[0]);at+=4
  elif tag=='s':value,at=string(at);args.append(value)
  elif tag=='b':size=struct.unpack_from('>I',raw,at)[0];at+=4;args.append(raw[at:at+size]);at+=(size+3)&~3
  else:raise ValueError(tag)
 yield address,args
def delayed(fn):
 timer=threading.Timer(.14,fn);timers.append(timer);timer.start()
def serve():
 global drop_tree
 while not stopped.is_set():
  try:raw,peer=sock.recvfrom(65535)
  except socket.timeout:continue
  except OSError:break
  for address,args in decode(raw):
   address={'9':'/s_new','15':'/n_set','11':'/n_free','/9':'/s_new','/15':'/n_set','/11':'/n_free','s_new':'/s_new','n_set':'/n_set','n_free':'/n_free'}.get(address,address)
   address={'21':'/g_new','/21':'/g_new','g_new':'/g_new','g_queryTree':'/g_queryTree'}.get(address,address)
   commands.append([address,args[:5]])
   if address=='/g_new':
    nid,add,target=args[:3];tree_nodes[nid]=[];parents[nid]=target
    tree_nodes[target].insert(0,nid) if add==0 else tree_nodes[target].append(nid)
   elif address=='/awb/test/dropTree':drop_tree=bool(args[0])
   elif address=='/g_queryTree' and not drop_tree:
    def visit(nid):
     if nid in tree_nodes:
      out=[nid,len(tree_nodes[nid])]
      for child in tree_nodes[nid]:out.extend(visit(child))
      return out
     return [nid,-1,nodes[nid]['def']]
    response=packet('/g_queryTree.reply',[0,*visit(args[0])])
    delayed(lambda response=response,peer=peer:sock.sendto(response,peer))
   elif address=='/n_free':
    def remove(nid):
     parent=parents.pop(nid,None)
     if parent in tree_nodes and nid in tree_nodes[parent]:tree_nodes[parent].remove(nid)
     is_group=int(nid in tree_nodes)
     for child in list(tree_nodes.get(nid,[])):remove(child)
     tree_nodes.pop(nid,None);nodes.pop(nid,None)
     sock.sendto(packet('/n_end',[nid,parent or 0,-1,-1,is_group]),peer)
    for nid in args:
     if nid in parents:remove(nid)
   if address=='/s_new':
    parents[args[1]]=args[3]
    tree_nodes[args[3]].insert(0,args[1]) if args[2]==0 else tree_nodes[args[3]].append(args[1])
    nodes[args[1]]=dict(zip(args[4::2],args[5::2]));nodes[args[1]]['def']=args[0]
    if args[0]=='udpVoice':
     nid=args[1]
     delayed(lambda nid=nid,peer=peer:sock.sendto(packet('/n_end',[nid,1,-1,-1,0]),peer))
   elif address=='/n_set':
    nid=args[0];node=nodes.get(nid,{})
    node.update(zip(args[1::2],args[2::2]))
    if node.get('replyRate',0)>0 and abs(node.get('baseTarget',0)-.991)>.0001:
     serials=(int(node.get('baseSerial',0)),int(node.get('amountSerial',0)))
     # A stale in-flight reply must not satisfy a request for newer commands.
     sock.sendto(packet('/awb/param/state',[nid,-1,.11,.2,.3,(serials[0]-1)%1000000,serials[1]]),peer)
     delayed(lambda nid=nid,peer=peer,serials=serials:sock.sendto(packet('/awb/param/state',[nid,-1,.42,.2,.9,*serials]),peer))
thread=threading.Thread(target=serve,daemon=True);thread.start()
env=dict(os.environ,AWB_CORE_TEST_PORT=str(sock.getsockname()[1]))
try:
 result=subprocess.run(['/Applications/SuperCollider.app/Contents/MacOS/sclang','-l',str(build/'sclang_conf.yaml'),str(build/'test/protocol.scd')],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=20)
 log=result.stdout.decode(errors='replace');(build/'protocol-sclang.log').write_text(log)
 if result.returncode or 'ERROR:' in log or 'AWB_CORE_PROTOCOL_RESULT=PASS' not in log:print(log[-12000:]);raise RuntimeError('language OSC protocol test failed')
 # The test's 12 simultaneous callbacks must produce one read request.
 requests=sum(1 for address,args in commands if address=='/n_set' and 'replyRate' in args and 64 in args)
 assert requests==6,('expected six read bursts: first, coalesced, MIDI coalesced, MIDI removed, timeout, close',requests)
 print('PASS OSC query coalescing: 12 callbacks and three pending MIDI CCs each share one request; latched CC adds no read')
 print(log[log.index('PASS UDP'):])
 result=subprocess.run(['/Applications/SuperCollider.app/Contents/MacOS/sclang','-l',str(build/'sclang_conf.yaml'),str(build/'test/registration-protocol.scd')],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=20)
 log=result.stdout.decode(errors='replace');(build/'registration-protocol-sclang.log').write_text(log)
 if result.returncode or 'ERROR:' in log or 'AWB_MODULATION_PROTOCOL_RESULT=PASS' not in log:print(log[-12000:]);raise RuntimeError('registry OSC protocol test failed')
 print(log[log.index('PASS registered'):])

 (build/'protocol-commands.json').write_text(json.dumps(commands,default=lambda value:f'<{len(value)} bytes>',indent=2))
finally:
 (build/'protocol-commands.json').write_text(json.dumps(commands,default=lambda value:f'<{len(value)} bytes>',indent=2))
 stopped.set()
 for timer in timers:timer.cancel()
 sock.close();thread.join(timeout=1)
