"""Build a bounded follow-up for devices whose direct callbacks were unresolved."""
from pathlib import Path

root = Path(__file__).parent
source = (root / 'AWBSetMapper.control.js').read_text()
old = "function clearParameters(){parameterEpoch++;ids=[];idsSeen=false;names={};numbers={};displays={};\n  displayObserver.setObservedParameterIds([]);}"
new = """function clearParameters(){parameterEpoch++;displays={};
  // Preserve the host observer's current ID/name/numeric cache across rebinding.
  // Unchanged values need not emit another callback. Changed values arrive asynchronously.
  displayObserver.setObservedParameterIds([]);}"""
assert source.count(old) == 1
source = source.replace(old, new)
old = "cursor.addDirectParameterIdObserver(function(all){ids=array(all);idsSeen=true;names={};numbers={};displays={};});"
assert source.count(old) == 1
source = source.replace(old, "cursor.addDirectParameterIdObserver(function(all){ids=array(all);idsSeen=true;});")
source = source.replace("/capture.jsonl'", "/parameter-pass.jsonl'")
source = source.replace('later(captureTracks,2000);', 'later(parameterPass,2000);')
source += '\n' + (root / 'parameter-pass-tail.js').read_text()
(root / 'AWBParameterPass.control.js').write_text(source)
