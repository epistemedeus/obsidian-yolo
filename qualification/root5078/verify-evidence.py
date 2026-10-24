#!/usr/bin/env python3
"""Self-review identity and completeness of actual app observations, not a mock test."""
import datetime,hashlib,json,subprocess
from pathlib import Path
q=Path('qualification/root5078');manifest=Path('qualification/root4958/CASE-MANIFEST.json');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(manifest)=='bb1306821bfc8aa4549d85f5ff4a8dd776ead35d2b289016ade66cb6b1aea9c1'
m=json.loads(manifest.read_text());rows=[]
for c in m['cases']:
 assert sha(Path(c['fixture']))==c['sha256']
 stages={}
 for phase in ['initial','saved','reopened','reenabled','restarted-after-reenable']:
  candidates=list((q/'observations').glob(f"{c['id']}-{phase}*.json"));assert candidates
  p=max(candidates,key=lambda p:json.loads(p.read_text())['observedAt'])
  if phase=='initial':
   saved=json.loads(max((q/'observations').glob(f"{c['id']}-saved*.json"),key=lambda p:json.loads(p.read_text())['observedAt']).read_text())
   matches=[candidate for candidate in (q/'observations').glob(f"{c['id']}-initial*.json") if json.loads(candidate.read_text())['appPid']==saved['appPid']]
   assert len(matches)==1,(c['id'],matches)
   p=matches[0]
  x=json.loads(p.read_text());assert x['enabled']
  assert x['versions']['electron']=='43.8.3'
  assert x['installedMembers']==m['builtMembers']
  if c['id']!='malformed':
   assert x['liveProjection']==c['expected']
   if phase!='initial':assert x['persistedProjection']==c['expected'] and x['chatFontScale']==1.05
  else:
   assert x['data']['sha256']==c['sha256'] and x['malformedBytesUnchanged']
   if phase=='saved':assert x['actualUiSaveRefused']
  hostMatches=[hp for hp in [q/'APP-HOST-RESULT.json',*(q/'hosts').glob('*.json')] if any(pid['pid']==x['appPid'] and pid['role']=='official extracted application' for pid in json.loads(hp.read_text())['ownedPids'])]
  assert hostMatches,(c['id'],phase,x['appPid'],'No actual graceful-exit host receipt')
  hp=hostMatches[0];host=json.loads(hp.read_text());assert host.get('appExitBeforeCleanup')==0,(hp,host)
  stages[phase]={'path':str(p),'normalExitReceipt':str(hp),'appPid':x['appPid'],'dataSha256':x.get('data',{}).get('sha256',x.get('preparedDataSha256'))}
 assert stages['initial']['appPid']==stages['saved']['appPid']
 assert stages['reopened']['appPid']==stages['reenabled']['appPid']
 assert len({stages[p]['appPid'] for p in ['saved','reopened','restarted-after-reenable']})==3
 rows.append({'id':c['id'],'status':'received','stages':stages})
expected=next(c for c in m['cases'] if c['id']=='restored-v89')['expected'];recovery={}
for phase in ['initial','saved','reopened','reenabled','restarted-after-reenable']:
 p=q/'observations'/f'malformed-recovery-{phase}.json';x=json.loads(p.read_text());assert x['liveProjection']==expected
 if phase!='initial':assert x['persistedProjection']==expected and x['chatFontScale']==1.05
 matches=[hp for hp in (q/'hosts').glob('*.json') if any(pid['pid']==x['appPid'] and pid['role']=='official extracted application' for pid in json.loads(hp.read_text())['ownedPids'])]
 assert len(matches)==1 and json.loads(matches[0].read_text()).get('appExitBeforeCleanup')==0
 recovery[phase]={'path':str(p),'normalExitReceipt':str(matches[0]),'appPid':x['appPid'],'dataSha256':x['data']['sha256']}
assert len({recovery[p]['appPid'] for p in ['saved','reopened','restarted-after-reenable']})==3
# QA syntax only; accepted product suites/build are not replayed.
for p in sorted(q.glob('*.py')):compile(p.read_text(),str(p),'exec')
for p in sorted([*q.glob('*.js'),*q.glob('*.cjs')]):subprocess.run(['node','--check',str(p)],check=True)
subprocess.run(['git','diff','--exit-code','fa1c479fdcd3138400588f8388a0ffd6783c7bc1','--','src','package.json','package-lock.json','qualification/root4410-b','qualification/root4604','qualification/root4958'],check=True)
result={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'all-nine-application-cases-and-same-vault-recovery-received','caseCount':len(rows),'cases':rows,'malformedSameVaultRecovery':recovery,'sealedExpectationsChanged':False,'originalFixturesAndProductSourceUnchanged':True,'qaSyntaxChecks':'Python compile without output files; node --check on every exported JS/CJS helper; all exit0','productTestSuitesReplayed':False,'nanoInitialDiskSamplingLimit':'Target before hash sampled before app launch; no separate post-load/pre-save disk sample for the first manually controlled case.'}
(q/'CASE-OUTCOMES.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'casesReceived':len(rows),'sameVaultRecoveryReceived':True,'sourceChanged':False,'exit':0}))
