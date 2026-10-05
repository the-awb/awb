import json,math
from pathlib import Path
from verify_audio import read_float_wav
root=Path(__file__).parent
channels,rate,data=read_float_wav(root/'control-sends.wav')
checks=[]
def mean(t,c,duration=.01):
 start=int(t*rate);count=int(duration*rate)
 return sum(data[(start+i)*channels+c]for i in range(count))/count
def check(condition,label):
 assert condition,label
 checks.append(label)
peak=.1*10**(14.4/20)
check(channels==8 and rate==48000,'float render has expected format')
check(max(abs(v)for v in data[0::channels])<1e-8,'control sends have no audible master route')
check(all(max(abs(v)for v in data[c::channels])<1e-8 for c in range(5,8)),'control output stays on designated KR diagnostics')
check(abs(mean(.4,1)-peak)<.0001,'Peak detector applies +14.4 dB gain without normalization or clipping')
check(mean(.24,1)>mean(.24,2)>mean(.24,3)>0,'one fast measurement feeds independent short and long envelopes')
check(mean(.25,1)>.98*peak,'detector reaches near full amplitude well before long follower')
check(mean(.9,1)<.001,'opposed sources cancel before detection')
check(mean(.9,3)>.05,'long follower retains its own release after source cancellation')
check(abs(mean(1.4,1)-peak)<.0001,'shared measurement recovers when cancelling source ends')
check(mean(1.7,1)<.001 and mean(1.7,3)>.05,'raw detector returns near zero while musical follower continues')
check(mean(2.05,1)==0,'zero amount silences the common measurement output')
check(mean(2.05,3)>.05,'amount zero preserves downstream follower release')
check(abs(mean(2.6,1)-peak*.5)<.0001,'50 percent amount scales measurement independently of source sends')
check(mean(2.85,2)==0,'cleared follower resets its stable KR output')
check(mean(3.2,2)>.99*peak*.5,'cleared follower restarts on same output bus')
# Reference is the existing AWFollower krFollower envelope with blend=1.
start,end=int(.2*rate),int(2.8*rate)
error=max(abs(data[i*channels+2]-data[i*channels+4])for i in range(start,end))
check(error<1e-7,'native consumer matches EnvDetect3 reference sample for sample')
check(all(mean(3.5,c)==0 for c in range(1,4)),'Tool close clears measurement, consumers and ownership graph')
result=dict(passed=True,assertionCount=len(checks),referenceMaxError=error,checks=checks)
(root/'control-results.json').write_text(json.dumps(result,indent=2)+'\n')
print('AWB_CONTROL_SEND_RESULT=PASS',len(checks),'assertions')
