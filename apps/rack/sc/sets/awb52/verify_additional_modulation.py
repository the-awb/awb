"""Compare actual KR render against captured pole values and explicit math cases."""
import json, math, sys
from pathlib import Path
from verify import read_float_wav

def verify(root):
 root=Path(root);channels,rate,data=read_float_wav(root/'additional-modulation.wav');checks=[]
 spec=json.loads((root/'source/prepared/first-pass.json').read_text());f=spec['fxMixes']['fuzz'];u=spec['sharedFX'];fb=f['pluginBases'];ub=u['pluginBases']
 def check(label,ok,measured=None):
  assert ok,(label,measured);checks.append(dict(label=label,measured=measured))
 def near(label,t,c,wanted,tolerance=2e-4):
  got=data[round(t*rate)*channels+c];check(label,abs(got-wanted)<tolerance,dict(actual=got,expected=wanted))
 def clip(v):return min(1,max(0,v))
 check('33 diagnostic channels',channels==33)
 check('All samples finite',all(math.isfinite(v) for v in data))
 for i in range(4):
  t=1.5+i
  near('Fuzz pole position '+str(i+1),t,10,i/3)
  near('Fuzz pole output '+str(i+1),t,2,clip(fb['Output']+[.165,.2,.3,.325][i]))
  near('Fuzz pole input '+str(i+1),t,3,clip(fb['Input']+[0,0,.095,.105][i]))
  near('Fuzz pole mixer '+str(i+1),t,6,(2*[.5,.6,.75,.75][i])**3)
  near('Fuzz container -5 dB '+str(i+1),t,7,10**(-5/20))
  near('Unconfirmed Fuzz LFO disabled '+str(i+1),t,8,0)
  near('Earth drive '+str(i+1),5.5+i,18,clip(ub['DriveInGain']+[.45,.51,.74,.4][i]*.425))
  near('Earth noise '+str(i+1),5.5+i,19,clip(ub['DriveNoiseGain']+[0,.65,.8,1][i]))
  near('Rate vibrato '+str(i+1),9.5+i,17,clip(ub['VibratoRate']+[0,.19,.37,.63][i]*.515))
  near('Rate detune '+str(i+1),9.5+i,15,clip(ub['DetuneRate']+[.15,.15,.5,1][i]*.64))
  near('Inner vibrato depth '+str(i+1),13.5+i,16,clip(ub['VibratoDepth']+[.66,1,.75,.5][i]))
  near('Inner detune depth '+str(i+1),13.5+i,14,clip(ub['DetuneDepth']+[0,.25,.75,1][i]*.645))
  near('Main depth screenshot '+str(i+1),17.5+i,13,clip(ub['Depth']+[.25,.4,.66,.75][i]))
  near('Diffusion enable '+str(i+1),21.5+i,20,1)
  near('Diffusion '+str(i+1),21.5+i,21,clip(ub['Diffusion']+[0,.275,.425,.605][i]))
  near('Diffusion size '+str(i+1),21.5+i,22,clip(ub['DiffSize']+[0,.16,.37,.635][i]))
  near('Shaper Mix Math '+str(i+1),25.5+i,28,[.72,.8,.8,.9][i])
  near('Shaper Depth Math '+str(i+1),25.5+i,29,[.16,.35,.89,.82][i])
  near('Shaper Rate Math '+str(i+1),25.5+i,30,[.2,.49,.6,1.01][i])
 # Independent input values and B amounts, not shared/cloned envelope inputs.
 near('Drive multiplier before plugin scale',29.5,18,clip(ub['DriveInGain']+clip(.51+.4*.65)*.425))
 near('Noise independent multiplier',29.5,19,clip(ub['DriveNoiseGain']+.65+.4*.37))
 near('Main .48 is Math B, not another selector depth',29.5,28,.4*(.8+.5*.48))
 near('Independent Depth input',29.5,29,.4*.35)
 near('Independent Rate input',29.5,30,.4*.49)
 near('Independent Wonk input',29.5,31,.4*.3)
 near('Wonk delay',29.5,23,clip(ub['Delay']+.4*.3*.44))
 near('Wonk feedback',29.5,24,clip(ub['Feedback']+.4*.3*.27))
 near('Stereo Scheps external wet',29.5,26,.8*.5*.66)
 near('Timed Math source mid-transition',30.5,28,.6*(.8+.5*.48),.002)
 near('Timed Math source reaches target',31.5,28,.8*(.8+.5*.48))
 # Feedback changes Fuzz selection; solve its fixed point independently.
 def interp(p,values):return sum(max(0,1-abs(clip(p)*3-i))*v for i,v in enumerate(values))
 m=0
 for _ in range(100):m=.2*(.1+.2*.51+interp(.2+m*(1.52/3),[.74,.36,.48,.35]))
 near('Borrowed follower through Fuzz feedback',29.5,11,m)
 near('Fuzz Math reaches gain',29.5,1,clip(fb['Gain']+m*.105))
 near('Borrowed follower is retained after close',32.5,32,.7)
 result=dict(passed=True,checks=len(checks),rows=checks);(root/'additional-modulation-results.json').write_text(json.dumps(result,indent=2)+'\n');print('AWB_ADDITIONAL_MODULATION=PASS count='+str(len(checks)))
if __name__=='__main__':verify(sys.argv[1])
