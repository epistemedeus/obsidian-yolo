#!/usr/bin/env python3
"""Close only identity-matched helpers orphaned by this operation's guard stop."""
import datetime,json,os,signal,time
from pathlib import Path
expected=[(103281,4255128,'dbus-daemon',103275),(103275,4255128,'at-spi-bus-laun',100894),(103273,4255128,'dbus-daemon',100894)]
assert Path('/proc/sys/kernel/random/boot_id').read_text().strip()=='d9551aaa-044f-4a54-90ae-4b19ff129cac'
records=[]
for pid,ticks,name,parent in expected:
 p=Path('/proc')/str(pid)
 if not p.exists():records.append({'pid':pid,'status':'already absent'});continue
 stat=(p/'stat').read_text().rsplit(')',1)[1].split()
 assert int(stat[19])==ticks and int(stat[1])==parent and (p/'comm').read_text().strip()==name,(pid,stat)
 before={'pid':pid,'startTicks':ticks,'name':name,'parentPid':parent,'beforeState':stat[0]}
 if stat[0]!='Z':os.kill(pid,signal.SIGTERM);before['signal']='SIGTERM'
 records.append(before)
for r in records:
 if 'startTicks' not in r:continue
 p=Path('/proc')/str(r['pid']);end=time.monotonic()+3
 while p.exists() and time.monotonic()<end:
  stat=(p/'stat').read_text().rsplit(')',1)[1].split()
  if stat[0]=='Z':break
  time.sleep(.05)
 r['afterState']=(p/'stat').read_text().rsplit(')',1)[1].split()[0] if p.exists() else 'absent'
 assert r['afterState'] in ['Z','absent'],r
# The guard killed this host before its finally block removed its own alias.
alias=Path('/tmp/r5078-3o_23lq2');removed=[]
if alias.exists():
 assert alias.stat().st_uid==os.getuid()
 for link in alias.iterdir():
  assert link.is_symlink() and link.resolve() in [Path('runtime/root5084-private/tmp').resolve(),Path('runtime/root5084-private/xdg-run').resolve()],link
  link.unlink();removed.append(str(link))
 alias.rmdir()
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Owned overlap-stop helpers only; identities joined to resource snapshot','processes':records,'aliasRemoved':str(alias),'removedOwnedLinks':removed,'nonChildReap':'Only admission supervisor100894 can reap its defunct children; worker does not signal that supervisor'}
Path('qualification/root5078/ORPHAN-HELPER-CLEANUP.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
