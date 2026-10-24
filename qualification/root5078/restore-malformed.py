#!/usr/bin/env python3
"""Restore a separate sealed valid copy only while the real app is closed."""
import datetime,hashlib,json,shutil
from pathlib import Path
rt=Path('runtime/root5084-private');q=Path('qualification/root5078')
h=json.loads((rt/'HOST.json').read_text())
assert h['status']=='application-exited' and h['appExitBeforeCleanup']==0
assert all(not Path('/proc/'+str(p['pid'])).exists() for p in h['ownedPids'])
target=rt/'vaults/malformed/.obsidian/plugins/yolo/data.json';old=target.read_bytes();src=Path('qualification/root4958/fixtures/restored-v89.json');valid=src.read_bytes()
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(old)=='4b509c3ea525d0959fe047d87ac2d0f8239576ea815a22f7dabceec7206cd61f'
assert sha(valid)=='ce219ec134b475906db5ff10625ac9b1f61e5940064e32f8cd57b748a09d0d31'
backup=rt/'malformed-before-recovery.data.json';assert not backup.exists();backup.write_bytes(old)
shutil.copyfile(src,target)
record={'restoredAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'appWasClosed':True,'originalMalformedSha256':sha(old),'source':str(src),'sourceSha256':sha(valid),'target':str(target.resolve()),'restoredTargetSha256':sha(target.read_bytes()),'originalFixtureUnchanged':True,'recoveryLifecycle':'not yet run; restoration alone is not receiving'}
(q/'RECOVERY-PREPARATION.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))
