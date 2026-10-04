"""Catalogue installed Bitwig interfaces/docs for an offline diagnostic, not host execution."""
from pathlib import Path
import html, json, re, subprocess, zipfile
BASE = Path(__file__).resolve().parent
JAR = '/Applications/Bitwig Studio.app/Contents/Java/bitwig.jar'
DOCS = Path('/Applications/Bitwig Studio.app/Contents/Resources/Documentation/control-surface/api')
out = BASE/'evidence'
out.mkdir(exist_ok=True)
with zipfile.ZipFile(JAR) as archive:
    names=[n[:-6].replace('/','.') for n in archive.namelist()
        if n.startswith('com/bitwig/extension/controller/api/') and n.endswith('.class') and '$' not in n]
names.append('com.bitwig.extension.api.Host')
raw=subprocess.check_output(['javap','-classpath',JAR,*names],text=True)
(out/'installed-api.javap.txt').write_text(raw)
classes={}; current=None
for line in raw.splitlines():
    declaration=re.search(r'public (?:interface|class|abstract class|final class) ([\w.]+)(.*)\{',line)
    if declaration:
        current=declaration[1].split('.')[-1]
        tail=declaration[2]
        classes[current]={'parents':[],'methods':{},'declaration':line}
        if ' extends ' in tail:
            classes[current]['parents']=[p.strip().split('<')[0].split('.')[-1]
                for p in tail.split(' extends ')[1].split(' implements ')[0].split(',')]
    elif current:
        method=re.match(r'\s+public (?:(?:abstract|default|static|final) )*([\w.$<>?\[\]]+) (\w+)\((.*?)\)',line)
        if method:
            classes[current]['methods'].setdefault(method[2],[]).append({
                'returnType':method[1].split('.')[-1], 'args':0 if not method[3] else len(method[3].split(','))})
(out/'installed-api-interface.json').write_text(json.dumps(classes,indent=2)+'\n')
files={}; catalog={}
strip=lambda x:re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',x))).strip()
for path in DOCS.glob('a*.html'):
    text=path.read_text(errors='replace')
    title=re.search(r'<title>(.*?)</title>',text,re.S)
    match=re.search(r'API: (\w+).*? (?:Interface|Class).*?Reference',html.unescape(title[1])) if title else None
    if not match: continue
    name=match[1];files[name]=path.name;methods=[]
    for part in text.split('<div class="memitem">')[1:]:
        prototype=part.split('<div class="memdoc">')[0];signature=strip(prototype)
        method=re.search(r'(\w+)\s*\(',signature)
        if not method:continue
        description=part.split('<div class="memdoc">')[1].split('</div>')[0]
        methods.append({'name':method[1],'signature':signature,'documentation':strip(description),'file':path.name})
    catalog[name]=methods
(out/'api-files.json').write_text(json.dumps(files,indent=2)+'\n')
(out/'api-catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
for target,filename,verbose in [('OBl','host-base.javap.txt',False),('OBl','host-base.verbose.javap.txt',True),
    ('com.bitwig.flt.control_surface.proxy.BitwigStudioHost','BitwigStudioHost.javap.txt',False)]:
    flags=['-v','-p'] if verbose else ['-c','-p']
    (out/filename).write_text(subprocess.check_output(['javap',*flags,'-classpath',JAR,target],text=True))
print(f'Catalogued {len(classes)} runtime interfaces/classes and {len(files)} reference pages')
