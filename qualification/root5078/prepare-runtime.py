#!/usr/bin/env python3
"""Copy immutable, already sealed cases into this operation's private runtime."""
import datetime
import hashlib
import json
from pathlib import Path
import shutil
q=Path(__file__).resolve().parent
rt=Path('runtime/root5084-private').resolve()
p=Path('qualification/root4958/CASE-MANIFEST.json')
assert hashlib.sha256(p.read_bytes()).hexdigest()=='bb1306821bfc8aa4549d85f5ff4a8dd776ead35d2b289016ade66cb6b1aea9c1'
m=json.loads(p.read_text())
records=[]
for c in m['cases']:
    raw=Path(c['fixture']).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==c['sha256']
    vault=rt/'vaults'/c['id']; plugin=vault/'.obsidian/plugins/yolo'
    assert not plugin.exists(), 'Never overwrite an existing application case'
    plugin.mkdir(parents=True)
    members={}
    for name,identity in m['builtMembers'].items():
        b=Path(name).read_bytes();assert hashlib.sha256(b).hexdigest()==identity['sha256']
        shutil.copyfile(name,plugin/name)
        members[name]={'bytes':(plugin/name).stat().st_size,'sha256':hashlib.sha256((plugin/name).read_bytes()).hexdigest()}
    (plugin/'data.json').write_bytes(raw)
    (vault/'Synthetic.md').write_text('# ROOT5078\nDisposable synthetic QA; no customer or synced data.\n')
    (vault/'.obsidian/community-plugins.json').write_text('["yolo"]\n')
    (vault/'.obsidian/app.json').write_text('{"safeMode":false}\n')
    records.append({'id':c['id'],'vault':str(vault),'fixture':c['fixture'],'beforeDataSha256':hashlib.sha256((plugin/'data.json').read_bytes()).hexdigest(),'copiedMembers':members,'lifecycleStatus':'unrun'})
(q/'CASE-BINDING.json').write_text(json.dumps({'preparedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'immutablePriorManifest':str(p),'immutablePriorManifestSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'expectedCasesUnchanged':True,'cases':records},indent=2)+'\n')
print(json.dumps({'cases':len(records),'beforeHashesMeasured':True,'fixtureExpectationsChanged':False}))
