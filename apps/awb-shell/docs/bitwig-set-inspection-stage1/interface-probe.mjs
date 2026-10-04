// Source/interface diagnostic only. This does not run Bitwig or emulate observations.
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('.', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL('evidence/installed-api-interface.json', root)));
const docs = JSON.parse(fs.readFileSync(new URL('evidence/api-catalog.json', root)));
const banks = { TrackBank:'Track', DeviceBank:'Device', SendBank:'Send', SceneBank:'Scene', CueMarkerBank:'CueMarker', DrumPadBank:'DrumPad', DeviceLayerBank:'DeviceLayer', ClipLauncherSlotBank:'ClipLauncherSlot', BrowserResultsItemBank:'BrowserResultsItem', BrowserFilterItemBank:'BrowserFilterItem' };
const methods = (type, name, seen = new Set()) => {
  if (seen.has(type) || !catalog[type]) return [];
  seen.add(type);
  return [...(catalog[type].methods[name] || []), ...catalog[type].parents.flatMap(p => methods(p,name,seen))];
};
function run(file, bypassApiGate = false, skipMissing = false) {
  let api = null;
  const missing = [], calls = [], notes = [];
  function proxy(type, path = type) {
    return new Proxy({}, { get(_, name) {
      if (name === Symbol.toPrimitive) return () => `[interface:${type}]`;
      if (name === 'then') return undefined;
      return (...args) => {
        const overloads = methods(type, name);
        const match = overloads.find(m => m.args === args.length);
        calls.push({type, name, args:args.length});
        if (!match) {
          const error = `${type}.${name}(${args.length} arguments) is absent from installed interfaces`;
          missing.push({type,name,path,error});
          if (!skipMissing) throw new Error(error);
          // Explicit diagnostic stand-ins, never a compatibility adaptation.
          if (name === 'isModified') return proxy('BooleanValue', `${path}.${name}`);
          return undefined;
        }
        const doc = (docs[type] || []).find(m => m.name === name);
        const since = doc?.documentation.match(/Since API version (\d+)/)?.[1];
        if (since && Number(since) > api) notes.push(`${type}.${name}: documented since ${since}, selected ${api}`);
        let rt = match.returnType;
        if (name === 'getItemAt') rt = banks[type] || rt;
        if (rt === 'void') return undefined;
        if (rt === 'String' || rt === 'java.lang.String') return '';
        if (rt.endsWith('[]')) return [];
        if (rt === 'boolean' || rt === 'Boolean') return false;
        if (['int','long','double','float','Integer','Number'].includes(rt)) return 0;
        if (catalog[rt]) return proxy(rt, `${path}.${name}`);
        throw new Error(`Diagnostic harness needs a return-type model for ${type}.${name}: ${rt}`);
      };
    }});
  }
  const context = vm.createContext({host:proxy('ControllerHost'), println:s=>notes.push(String(s)),
    loadAPI:n=>{ api=n; if (n>17 && !bypassApiGate) throw new Error(`Cannot load API version ${n}: Supported version is 17`); },
    CursorDeviceFollowMode:{FOLLOW_SELECTION:0}, NoteExpression:{}, console});
  let outcome;
  try { vm.runInContext(fs.readFileSync(file,'utf8'), context, {filename:file}); vm.runInContext('init()',context,{timeout:5000}); outcome='init reached end against interface stand-ins'; }
  catch (e) { outcome=e.message; notes.push(e.stack); }
  return {file,kind:'offline source/interface diagnostic; not host execution',bypassApiGate,skipMissing,selectedApi:api,outcome,missing,calls: calls.length,notes};
}
const beat = new URL('sources/beat-twin/bitwig-controller/BeatTwin/BeatTwin.control.js',root).pathname;
const deck = new URL('sources/bitwig-control-deck/controller/ControlDeck.control.js',root).pathname;
const results=process.argv[2] ? [run(process.argv[2])] : [run(beat),run(deck),run(deck,true),run(deck,true,true)];
const output = process.argv[2] ? 'evidence/minimal-probe-interface-check.json' : 'evidence/interface-probe.json';
fs.writeFileSync(new URL(output,root),JSON.stringify(results,null,2)+'\n');
for(const r of results) console.log(JSON.stringify({file:r.file.split('/sources/')[1],api:r.selectedApi,bypass:r.bypassApiGate,skip:r.skipMissing,outcome:r.outcome,missing:r.missing,calls:r.calls,notes:r.notes.filter(n=>!n.includes('\n'))}));
