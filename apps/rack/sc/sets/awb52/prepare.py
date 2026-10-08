#!/usr/bin/env python3
"""Prepare the bounded AWB 5.2 SC slice from observed Bitwig data, without running Bitwig."""
import argparse,json,hashlib,re,pathlib,math,wave
PLUGIN_NAMES={'spiral':'++spiralstretch','upper':'++pitchdelay','lower':'++pitchdelay','delay':'++delay','tailDeci':'++decimate','deci':'++decimate','sparkTexture':'Things Texture','verbTexture':'Things Texture','shimmer':'ValhallaShimmer'}
def walk(chain):
 for d in chain.get('items',[]):
  yield d
  for kind in ['layers','slots','drumPads']:
   for c in d.get(kind,{}).get('items',[]):yield from walk(c['chain'])
def amp(display):
 if display=='-Inf dB':return 0.0
 m=re.fullmatch(r'([+-]?[\d.]+) dB',display)
 if not m:raise ValueError('Unrecognized displayed dB: '+display)
 return 10**(float(m.group(1))/20)
def sc(x):
 if x is None:return 'nil'
 if isinstance(x,bool):return str(x).lower()
 if isinstance(x,str):return json.dumps(x,ensure_ascii=False)
 if isinstance(x,(int,float)):
  if not math.isfinite(x):raise ValueError('Non-finite specification')
  return repr(x)
 if isinstance(x,list):return '['+', '.join(sc(v)for v in x)+']'
 if any(not re.fullmatch(r'[A-Za-z_]\w*',k)for k in x):return 'Event.newFrom(['+', '.join(sc(k)+'.asSymbol, '+sc(v)for k,v in x.items())+'])'
 return '('+', '.join(k+': '+sc(v)for k,v in x.items())+')'
def cache_plugins(path):
 out={}
 for block in path.read_text().split('[plugin]\n')[1:]:
  lines=block.splitlines();fields={l.split('=',1)[0]:l.split('=',1)[1]for l in lines if '='in l and not l.startswith('n=')};params=[]
  if '[parameters]'in lines:
   j=lines.index('[parameters]');n=int(lines[j+1][2:]);params=[l.split(',')[0]for l in lines[j+2:j+2+n]]
  p=fields.get('path');
  if p and pathlib.Path(p).exists():out[p]={'name':fields['name'],'parameterNames':params,'version':fields['version'],'sdk':fields['sdkversion']}
 return out
def build(snapshot,cache,shared=False):
 tracks={t['index']:t for t in snapshot['tracks']};devices={i:list(walk(tracks[i]['chain']))for i in ([2,5,22,23,24,25]+([64]if shared else []))};components={};plugins=cache_plugins(cache)
 selected={'spiral':(22,'++spiralstretch',0),'upper':(22,'++pitchdelay',0),'lower':(22,'++pitchdelay',1),'delay':(22,'++delay',0),'tailDeci':(22,'++decimate',0),'deci':(23,'++decimate',0),'sparkTexture':(22,'Things Texture',0),'verbTexture':(25,'Things Texture',0),'shimmer':(25,'ValhallaShimmer',0)}
 if shared:selected['um']=(64,'ValhallaUberMod',0)
 for role,(index,name,occurrence)in selected.items():
  d=[d for d in devices[index]if d['name']==name][occurrence];candidate=[(p,info)for p,info in plugins.items()if info['name']==name];candidate.sort(key=lambda v:('.vst3'in v[0],v[0]));assert candidate,'Missing installed plugin '+name;p,info=candidate[0];params=[]
  for param in d['parameters']['items']:
   if param['name']not in info['parameterNames']:raise ValueError('Plugin parameter unavailable: '+name+'/'+param['name'])
   value=param['normalized'];assert isinstance(value,(int,float))and 0<=value<=1
   params.extend([info['parameterNames'].index(param['name']),value])
  components[role]={'path':p,'params':params,'name':name,'parameterNames':info['parameterNames'],'locator':d['locator'],'displays':{param['name']:param['display']for param in d['parameters']['items']}}
 # Matrix uses displayed dB, never the unrelated host-normalized fader curve.
 initial=[]
 for channel,i in [('vc',2),('pro2',5)]:
  sends={}
  for send in tracks[i]['sends']:
   if send['label']in ['Reverb','Mast']:sends[{'Reverb':'verb','Mast':'mast'}[send['label']]]=amp(send['display'])
  initial.append({'id':channel,'level':amp(tracks[i]['volume']['display']),'sends':sends})
 return {'schema':1,'rack':{'name':'AWB 5.2 — SC first pass','libraryID':'awb52-first-pass','width':2,'out':0,'channels':[{'id':'vc','label':'VC IN (mono)'},{'id':'pro2','label':'Pro 2 IN (stereo)'}],'fixedFX':['verb','deci','spark','fuzz','mast'],'dynamicFX':3,'fixedFollowers':[],'spareFollowers':3,'cleanSlot':'mast','tail':8},'inputWidths':{'vc':1,'pro2':2},'components':components,'initialMix':{'channels':initial,'returns':{key:amp(tracks[i]['volume']['display'])for key,i in [('verb',25),('deci',23),('spark',22),('fuzz',24)]}},'containerGains':{'spark':amp('-7.7 dB')*amp('-6.7 dB'),'deci':amp('-10.3 dB'),'fuzz':amp('-5.0 dB')},'irSeconds':[2.5,4.0,8.0],'fftSize':2048,'unresolved':['Select-4/modulator destinations and branch gain mapping','MDMX Fuzz: native approximation, no transferred plugin state','Convolution IRs: generated stand-ins, not captured Bitwig IRs','Layer mixer gains and device state blobs not captured','Input Scheps processing and UM omitted','Deci dry/wet starts at captured zero; audition explicitly','Verb parent Tool volume captured -Inf; audition mode opens it explicitly','Send destinations inferred from labels; capture does not prove edges','Some normalized/display pairs disagree (e.g. upper wetdry 0 versus 73.5); captured mode is unverified']}
def main():
 p=argparse.ArgumentParser();p.add_argument('--snapshot',type=pathlib.Path,required=True);p.add_argument('--cache',type=pathlib.Path,default=pathlib.Path.home()/'Library/Application Support/vstplugin/sc/cache_amd64.ini');p.add_argument('--ir-directory',type=pathlib.Path);p.add_argument('--ir-max-seconds',type=float,default=30);p.add_argument('--earth-ir-max-seconds',type=float,default=5);p.add_argument('--echo-ir-max-seconds',type=float,default=20);p.add_argument('--verb-profile',type=pathlib.Path);p.add_argument('--fx-profile',type=pathlib.Path);p.add_argument('--cello-scheps',action='store_true');p.add_argument('--fuzz-plugin',action='store_true');p.add_argument('--shared-fx',action='store_true');p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args();raw=a.snapshot.read_bytes();s=json.loads(raw);spec=build(s,a.cache,a.shared_fx);a.output.mkdir(parents=True,exist_ok=True)
 if a.verb_profile:
  profile=json.loads(a.verb_profile.read_text());assert profile['schema']==1 and profile['branchIDs']==['earth','composite','texture','shimmer','echo']
  spec['verbMix']=profile['configuration'];spec['verbMixProvenance']={k:profile[k] for k in ['source','sourceSha256','targets','notes']}
  spec['unresolved']=[v for v in spec['unresolved']if not v.startswith('Select-4/')];spec['unresolved'].append('Verb Select-4 depths captured; zero-position policy and inferred Tool gain taper need host comparison')
 if a.fx_profile:
  profile=json.loads(a.fx_profile.read_text());assert profile['schema']==1
  spec['fxModulationProvenance']=profile
  bases={role:{item['parameterNames'][pairs[0]]:pairs[1] for pairs in zip(item['params'][::2],item['params'][1::2])}for role,item in spec['components'].items()}
  spec['fxMixes']={'deci':{'gainDb':-10.3,'basePole':True,'pluginBases':bases,'defaults':{'depth':.49606299214065075,'folding':.49606299214065075,'lfoRate':.04}},'spark':{'gainDb':-7.7,'basePole':True,'pluginBases':bases,'defaults':{'aTail':.34645670652389526,'tailDepth':.5,'tailFolding':.5}}}
  spec['unresolved']=[v for v in spec['unresolved']if not v.startswith('Select-4/')]
  spec['unresolved']+=profile['assumptions']
 baselines=[]
 for enabled,role,filename,descriptor in [(a.cello_scheps,'celloScheps','scheps73-baseline.json','scheps73-plugin.ini'),(a.fuzz_plugin,'fuzz','fuzz-baseline.json','fuzz-plugin.ini'),(a.shared_fx,'stereoScheps','scheps73-stereo-baseline.json','scheps73-stereo-plugin.ini')]:
  if enabled:
   baseline=json.loads((pathlib.Path(__file__).parent/filename).read_text());assert baseline['normalizedValuesVerified']
   item=dict(baseline['hosting']);item['name']=baseline['pluginName'];ordered=sorted(baseline['parameters'],key=lambda v:v['index']);item['parameterNames']=[v['name']for v in ordered];item['params']=[x for v in ordered for x in [v['index'],v['normalized']]];item['displays']={v['name']:v['display']for v in ordered}
   assert pathlib.Path(item['path']).exists(),'Restored Waves shell is missing'
   spec['components'][role]=item;spec[role+'Provenance']=baseline;baselines.append(descriptor)
 if baselines:
  cache_dir=(a.output/'waves-cache').resolve();cache_dir.mkdir(exist_ok=True)
  (cache_dir/'cache_amd64.ini').write_text('[version]\n0.6.0\n[ignore]\nn=0\n[plugins]\nn='+str(len(baselines))+'\n'+''.join((pathlib.Path(__file__).parent/f).read_text()for f in baselines));spec['pluginCacheDirectory']=str(cache_dir)
 if a.fuzz_plugin or a.shared_fx:
  more=json.loads((pathlib.Path(__file__).parent/'additional-modulation-profile.json').read_text());spec['additionalModulationProvenance']=more;spec.setdefault('fxMixes',{})
  if a.fuzz_plugin:
   config=more['fuzz'].copy();item=spec['components']['fuzz'];config['pluginBases']=dict(zip(item['parameterNames'],item['params'][1::2]));spec['fxMixes']['fuzz']=config
  if a.shared_fx:
   config=more['um'].copy();item=spec['components']['um'];config['pluginBases']=dict(zip(item['parameterNames'],item['params'][1::2]));spec['sharedFX']=config
  spec['unresolved']+=more['assumptions']
 spec['unresolved']=[v for v in spec['unresolved']if not (a.fuzz_plugin and v.startswith('MDMX Fuzz:')) and not ((a.shared_fx or a.cello_scheps)and v.startswith('Input Scheps'))]
 if a.cello_scheps and not a.shared_fx:spec['unresolved'].append('UM shared processing omitted')
 if a.ir_directory:
  caps={'earth':a.earth_ir_max_seconds,'echo':a.echo_ir_max_seconds}
  if any(not math.isfinite(v)or not 0<v<=180 for v in [a.ir_max_seconds,*caps.values()]):raise ValueError('IR caps must be in (0,180] seconds')
  spec['irMaxSecondsByBranch']=caps
  names=['Mulching 1.wav','composite earth b.wav','214216__acs272__world-s-longest-echo-4th-impulse.wav'];spec['irFiles']=[str((a.ir_directory/n).resolve())for n in names];spec['irMaxSeconds']=a.ir_max_seconds;metadata=[]
  for branch,path in zip(['earth','composite','echo'],spec['irFiles']):
   with wave.open(path,'rb')as w:
    frames=min(w.getnframes(),int(min(a.ir_max_seconds,caps.get(branch,a.ir_max_seconds))*w.getframerate()));metadata.append(dict(path=path,sourceFrames=w.getnframes(),usedFrames=frames,sourceSeconds=w.getnframes()/w.getframerate(),usedSeconds=frames/w.getframerate(),channels=w.getnchannels(),sampleRate=w.getframerate(),sha256=hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()))
  spec['irSeconds']=[v['usedSeconds']for v in metadata];spec['irProvenance']=metadata;spec['unresolved']=[v for v in spec['unresolved']if not v.startswith('Convolution IRs:')];spec['unresolved'].append('Original IR files loaded from frame zero with a duration cap; Bitwig crop, fades, normalization and width are not reproduced')

 (a.output/'first-pass.scd').write_text('// Generated by prepare.py; values from observed capture, approximations listed in JSON.\n'+sc(spec)+'\n');(a.output/'first-pass.json').write_text(json.dumps(spec,indent=2)+'\n');(a.output/'source-provenance.json').write_text(json.dumps({'snapshot':str(a.snapshot.resolve()),'sha256':hashlib.sha256(raw).hexdigest(),'cache':str(a.cache),'cacheSha256':hashlib.sha256(a.cache.read_bytes()).hexdigest(),'host':s['host'],'tracks':[{'index':t['index'],'name':t['name'],'chain':t['chain'],'volume':t['volume']}for t in s['tracks']if t['index']in [2,5,22,23,24,25]],'note':'Read-only projection; observed parameters are not an exported plugin state or modulation graph.'},indent=2)+'\n');print('Prepared',a.output)
if __name__=='__main__':main()
