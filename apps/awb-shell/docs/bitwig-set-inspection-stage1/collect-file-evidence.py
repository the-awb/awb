"""Bounded file evidence, not a bwproject topology decoder. Python standard library only."""
from pathlib import Path
import collections, datetime, hashlib, json, re, struct, subprocess, zipfile

BASE = Path(__file__).resolve().parent
SOURCE = Path('/Users/willy/Documents/Bitwig Studio/Library/Templates/awb 5.2 (ef script).bwtemplate')
PROJECT = SOURCE / 'template.bwproject'
EXPECTED_HASH = 'c41ab2729aa00efa82586602705380d5b880542b2e7ecc1e26de1308d5cdae94'
data = PROJECT.read_bytes()
digest = hashlib.sha256(data).hexdigest()
assert digest == EXPECTED_HASH, f'Target changed: {digest}; do not silently substitute another project'
app_version = subprocess.check_output(['/usr/libexec/PlistBuddy','-c','Print :CFBundleShortVersionString',
    '/Applications/Bitwig Studio.app/Contents/Info.plist'], text=True).strip()
strings = [{'offset':m.start(), 'length':len(m[0]), 'text':m[0].decode('ascii')}
    for m in re.finditer(rb'[\x20-\x7e]{4,}',data)]
metadata = {}
for key in ['application_version_name','creator','branch']:
    pos = data[:512].find(key.encode()+b'\x08')
    if pos < 0: continue
    start = pos+len(key)+1
    length = struct.unpack('>I', data[start:start+4])[0]
    end = start+4+length
    assert end <= 512
    metadata[key] = {'status':'observed', 'value':data[start+4:end].decode('utf8'),
        'evidence':{'kind':'length-prefixed header string','keyOffset':pos,'valueOffset':start+4,'byteLength':length}}
plugin_paths = collections.defaultdict(list)
for item in strings:
    for match in re.finditer(r'/(?:Library|Users|Volumes)/.*?\.(?:vst3|vst|clap|component)(?=$|[^A-Za-z0-9])',item['text']):
        plugin_paths[match[0]].append(item['offset']+match.start())
plugins = [{'path':path, 'status':'observed', 'fileExistsAtExactPath':Path(path).exists(),
    'occurrenceOffsets':offsets, 'activeUseStatus':'unresolved', 'identityVersionLicenseStatus':'unresolved'}
    for path,offsets in sorted(plugin_paths.items())]
assets = [{'path':str(p.relative_to(SOURCE)), 'bytes':p.stat().st_size, 'status':'observed',
    'usedByCurrentProjectStatus':'unresolved'} for kind in ['samples','impulses']
    for p in sorted((SOURCE/'project'/kind).rglob('*')) if p.is_file()]
with zipfile.ZipFile(PROJECT) as archive:
    bad = archive.testzip()
    assert bad is None, f'Embedded ZIP CRC failure: {bad}'
    embedded = [{'entry':i.filename, 'bytes':i.file_size,'compressedBytes':i.compress_size,
        'headerOffset':i.header_offset,'crc32':f'{i.CRC:08x}','deviceAssociationStatus':'unresolved'}
        for i in archive.infolist()]
versions=json.loads((BASE/'source-versions.json').read_text())
commits={}
for name,version in versions.items():
    source=BASE/'sources'/name/version['controllerPath']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==version['controllerSha256'], f'Pinned source changed: {source}'
    commits[name]=version['commit']
result = {
    'artifactKind':'verified partial file evidence; not a controller capture or decoded set',
    'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'source':{'project':str(PROJECT),'bytes':len(data),'sha256':digest,'installedBitwigVersion':app_version,
        'templateBundle':str(SOURCE),'originalWritten':False},
    'extractor':{'script':'collect-file-evidence.py','kind':'bounded standard-library scan','candidates':commits},
    'headerMetadata':metadata,
    'coverage':{
        'identity':'observed','hierarchy':'unresolved','routingEdges':'unresolved','orderedDeviceChains':'unresolved',
        'parameters':'unimplemented','modulationMappings':'unresolved','dependencies':'observed file and string inventory only',
        'liveCompatibility':'unresolved; native host proof pending user enablement',
        'nameClues':{'status':'observed strings; musical roles unresolved','byteWindow':[512,3700]}},
    'tracks':{'status':'unresolved','reason':'Raw name strings do not establish tracks or parent relations','items':None},
    'routing':{'status':'unresolved','reason':'No controller/UI-confirmed edges','edges':None},
    'devices':{'status':'unresolved','reason':'Device names and preset files do not establish ordered chains','items':None},
    'nameStringClues':[s for s in strings if 512<=s['offset']<3700],
    'pluginPathClues':plugins,'bundleAssets':assets,
    'embeddedPluginStateArchive':{'status':'observed','crcValidation':'all entries passed','entries':embedded},
    'humanAnnotations':[]}
(BASE/'evidence/target-partial.json').write_text(json.dumps(result,indent=2)+'\n')
(BASE/'evidence/binary-string-clues.json').write_text(json.dumps(strings,indent=2)+'\n')
print(json.dumps({'sha256':digest,'version':app_version,'header':metadata,'pluginPaths':len(plugins),
    'missingExactPaths':[p['path'] for p in plugins if not p['fileExistsAtExactPath']],
    'assets':len(assets),'zipEntries':len(embedded),'crcFailures':0},indent=2))
