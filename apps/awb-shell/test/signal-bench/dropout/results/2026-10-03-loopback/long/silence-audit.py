"""Offline zero-run lengths in verified MOTU PCM; does not run SC or alter captures."""
import array,json,pathlib,struct,sys
base=pathlib.Path(__file__).resolve().parent/'results/2026-10-03-loopback'
for name in sys.argv[1:] or ['steady','upper','focus','long']:
 folder=base/name;report=json.loads((folder/'return.json').read_text());full=json.loads((folder/'full.json').read_text());phases=[]
 with open(full['loopback']['path'],'rb') as f:
  header=struct.unpack('<12Q',f.read(96));pcm=4096+header[2]*80;rate=header[7]
  for phase in report['phases']:
   bounds=phase['inputRange'];f.seek(4096+bounds['firstSequence']*80);first=struct.unpack('<10d',f.read(80));f.seek(4096+bounds['lastSequence']*80);last=struct.unpack('<10d',f.read(80));start=int(first[5]);end=int(last[5]+last[4]);f.seek(pcm+start*4);samples=array.array('f');samples.frombytes(f.read((end-start)*4))
   if sys.byteorder!='little':samples.byteswap()
   runs=[];run=0
   for x in samples:
    if abs(x)<1e-9:run+=1
    else:
     if run>=32:runs.append(run)
     run=0
   if run>=32:runs.append(run)
   phases.append({'nodes':phase['nodes'],'condition':phase['condition'],'repeat':phase['repeat'],'scAverage':phase['scAverage'],'inputRange':bounds,'silenceRunsFrames':runs,'silenceRunsMs':[1000*n/rate for n in runs],'silenceRunCount':len(runs),'totalSilenceMs':1000*sum(runs)/rate,'maxSilenceMs':1000*max(runs,default=0)/rate,'recorderReliable':phase['recorderReliable']})
 result={'threshold':1e-9,'minimumFrames':32,'sampleRate':rate,'scope':'Zero-sample spans in the measured pilot channel; injected validation faults excluded by phase ranges. Audibility not graded. Runs meeting a phase boundary may be truncated.','phases':phases}
 (folder/'silence-analysis.json').write_text(json.dumps(result,indent=2)+'\n')
 print(name,'runs',sum(p['silenceRunCount'] for p in phases),'max ms',max(p['maxSilenceMs'] for p in phases))
