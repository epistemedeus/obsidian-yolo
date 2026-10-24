#!/usr/bin/env python3
import json,datetime,hashlib
from pathlib import Path
q=Path('qualification/root5078');rt=Path('runtime/root5084-private')
logs=[json.loads(p.read_text())|{'receipt':str(p)} for p in (q/'logs').glob('*.json')]
resources={'collectedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reserveKiB':2097152,'samplePeriodMs':50,'measurement':'Aggregate sampled RSS includes native subtree, CLI wrapper and admission supervisor; shared pages double-counted; not a cgroup hard cap','guardMarginKiB':131072,'zeroModelChildren':True,'peakAcrossAllAttemptsKiB':max(x['aggregateSampledPeakKiB'] for x in logs),'guardExceptions':[x for x in logs if x['resourceLimit']],'successfulSerialApplicationPeakKiB':max(x['aggregateSampledPeakKiB'] for x in logs if not x['resourceLimit'] and Path(x['receipt']).name!='nano-after-reenable.json' and any(c.endswith('/app-host.py') for c in x['command']) and x['exit']==0),'receipts':[{'path':x['receipt'],'exit':x['exit'],'peakKiB':x['aggregateSampledPeakKiB'],'resourceLimit':x['resourceLimit'],'started':x['started'],'finished':x['finished']} for x in logs],'largerSingleAppRequirementMeasured':False,'overlapException':'An owner sequencing mistake overlapped two app hosts; guard stopped the first check at 1970272KiB. The repeated serialized route fit. Reservation and host floors unchanged.'}
(q/'RESOURCES.json').write_text(json.dumps(resources,indent=2)+'\n')
pids={}
for p in [q/'APP-ATTEMPT-1.json',q/'APP-HOST-RESULT.json',*(q/'hosts').glob('*.json')]:
 x=json.loads(p.read_text())
 for v in x['ownedPids']:pids[v['pid']]=v['role']
for x in logs:
 if x['resourceLimit']:
  for v in x['peakProcesses']:
   if v['name'] in ['obsidian','Xvfb','xfwm4','dbus-daemon','gcr-prompter','gnome-keyring-d','at-spi-bus-laun','at-spi2-registr','dbus-launch','xfconfd']:pids.setdefault(v['pid'],v['name']+' (owned overlap snapshot)')
pids[102358]='separately owned initial window manager (tool session14061 reaped exit1 after display closed)'
state=[]
for pid,role in sorted(pids.items()):
 p=Path('/proc')/str(pid)
 if not p.exists():state.append({'pid':pid,'role':role,'status':'absent/reaped'})
 else:
  stat=(p/'stat').read_text().rsplit(')',1)[1].split();state.append({'pid':pid,'role':role,'state':stat[0],'parentPid':int(stat[1]),'startTicks':int(stat[19]),'rssKiB':int(stat[21])*4096//1024})
live=[x for x in state if x.get('state') and x['state']!='Z'];assert not live,live
cleanup={'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'liveOwnedAppDisplayProcesses':live,'ownedPidStates':state,'remainingZombies':[x for x in state if x.get('state')=='Z'],'allOrdinaryReceivedRunsExitZero':True,'exceptions':'Initial extracted-app socket signal5 and the overlap guard termination are preserved. The guard-killed check could not run its finally reaper. Listed defunct processes belong to native admission supervisor100894, which only its parent/controller can reap; no non-child wait or other-job termination attempted. Root receives native terminal/claim cleanup separately.','temporaryAliasesRemaining':[str(p) for p in Path('/tmp').glob('r5078-*') if p.is_dir() and p.stat().st_uid==1000]}
(q/'OWNED-CLEANUP.json').write_text(json.dumps(cleanup,indent=2)+'\n')
records=[json.loads(l) for l in (rt/'CDP-ACTIONS.ndjson').read_text().splitlines()]
exported=[]
for r in records:
 if r['startedAt']>='2026-10-24T02:04:00Z':continue
 value=r.get('result',{}).get('result',{}).get('value')
 if isinstance(value,dict) and isinstance(value.get('settings'),dict):
  settings=value.pop('settings');value['fullSettingsCapture']='private ignored runtime only';value['settingsSha256']=hashlib.sha256(json.dumps(settings,separators=(',',':'),ensure_ascii=False).encode()).hexdigest();value['selectedReferences']={k:settings.get(k) for k in ['version','chatModelId','chatTitleModelId']}
 exported.append(r)
(q/'MANUAL-DEVTOOLS-OBSERVATIONS.ndjson').write_text(''.join(json.dumps(r)+'\n' for r in exported))
print(json.dumps({'newResourcePeakKiB':resources['peakAcrossAllAttemptsKiB'],'successfulSerialPeakKiB':resources['successfulSerialApplicationPeakKiB'],'liveOwnedAppDisplay':len(live),'remainingDefunct':len(cleanup['remainingZombies']),'temporaryAliasesRemaining':cleanup['temporaryAliasesRemaining']}))
