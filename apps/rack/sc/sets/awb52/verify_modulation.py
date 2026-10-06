"""Observe actual KR graph output, including selector feedback and sine timing."""
import json,math,sys
from pathlib import Path
from verify import read_float_wav

def verify(root):
 root=Path(root);channels,rate,data=read_float_wav(root/'modulation.wav');checks=[]
 def check(label,ok,value=None):
  assert ok,(label,value);checks.append(dict(label=label,measured=value))
 def value(t,c):return data[round(t*rate)*channels+c]
 def near(label,t,c,wanted,tolerance=2e-4):
  got=value(t,c);check(label,abs(got-wanted)<tolerance,dict(actual=got,expected=wanted))
 def weights(p):return [max(0,1-abs(max(0,min(1,p))*4-i-1))for i in range(4)]
 def dot(w,d):return sum(x*y for x,y in zip(w,d))
 spec=json.loads((root/'source/prepared/first-pass.json').read_text());b=spec['fxMixes']['spark']['pluginBases'];db=spec['fxMixes']['deci']['pluginBases']['deci']
 check('36 real diagnostic channels',channels==36)
 check('All modulation samples finite',all(math.isfinite(v)for v in data))
 for i,t in enumerate([1.5,3.5,5.5,7.5]):
  near('Deci pole '+str(i+1),t,9,(i+1)/4)
  near('Deci LFO remains 0.04 Hz without Math input',t,8,.04)
  near('Deci pole gain '+str(i+1),t,1,10**((-10.3+[6,6,6.48,8.4][i])/20))
  near('Deci pole mixer volume '+str(i+1),t,2,(2*min(1,[.583,.726,.919,1.033][i]))**3)
  near('Sparkle amount selector pole '+str(i+1),t,33,(i+1)/4)
  near('Sparkle follower times selected amount '+str(i+1),t,34,[.65,.6,1.05,.65][i])
  wet=weights(min(1,.84*[.65,.6,1.05,.65][i]))
  near('Sparkle main wet profile '+str(i+1),t,11,min(1,b['spiral']['wetdry']+dot(wet,[.52,.78,.665,.34])))
  near('Sparkle delay wet profile '+str(i+1),t,14,min(1,b['delay']['wetdry']+dot(wet,[.18,.43,.665,.75])))
  pitch=weights(min(1,.555*[0,.4,.91,1.1][i]))
  near('Sparkle upper wet profile '+str(i+1),t,12,min(1,b['upper']['wetdry']+dot(pitch,[.5,.66,.85,.15])))
  near('Sparkle lower wet profile '+str(i+1),t,13,min(1,b['lower']['wetdry']+dot(pitch,[0,.33,.84,1])))
 near('Empty Deci pole suppresses LFO',9.5,7,0)
 near('Empty Sparkle amount pole suppresses Math',9.5,34,0)
 near('Base LFO amount remains zero',.5,7,0)
 # Free sine is not reset when a profile changes. Fit against server-time phase.
 for t in [11,15,20,25,30,34]:
  expected=.695*math.sin(2*math.pi*.04*(t-.1))
  near('Free bipolar sine at '+str(t)+' seconds',t,7,expected,.0005)
 near('Mapped borrowed follower reaches Math',35.5,10,.6*1.1)
 near('Rate factor applied exponentially',35.5,8,.04*2.187**(.6*1.1))
 near('Timed AWParam change starts at current base',36.5,34,.5*.6,.003)
 near('Timed AWParam reaches exact target',37.5,34,.6)
 result=dict(passed=True,checks=len(checks),rows=checks);(root/'modulation-results.json').write_text(json.dumps(result,indent=2)+'\n');print('AWB_FX_MODULATION=PASS count='+str(len(checks)));return result
if __name__=='__main__':verify(sys.argv[1])
