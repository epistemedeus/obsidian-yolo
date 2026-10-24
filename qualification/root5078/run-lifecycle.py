#!/usr/bin/env python3
"""Focused real-app recipe for the nine sealed synthetic fixtures, serial only."""
import datetime,json,os,subprocess,time,sys,urllib.request
from pathlib import Path
q=Path('qualification/root5078');rt=Path('runtime/root5084-private');case=sys.argv[1];finish='--finish-saved' in sys.argv;existing='--existing-initial' in sys.argv;recovery='--recovery' in sys.argv
assert case in [c['id'] for c in json.loads(Path('qualification/root4958/CASE-MANIFEST.json').read_text())['cases']]
hostproc=None
community=rt/'vaults'/case/'.obsidian/community-plugins.json'

def cmd(args,settings=False,check=True):
    started=datetime.datetime.now(datetime.timezone.utc).isoformat();env=dict(os.environ)
    if settings:env['CDP_SETTINGS']='1'
    if (rt/'HOST.json').exists():env['DISPLAY']=json.loads((rt/'HOST.json').read_text())['display']
    r=subprocess.run(args,env=env,capture_output=True,text=True,timeout=30)
    entry={'case':case,'started':started,'finished':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':args,'settingsTarget':settings,'exit':r.returncode,'stdout':r.stdout[-14000:],'stderr':r.stderr[-4000:]}
    with (q/'CASE-COMMANDS.ndjson').open('a') as out:out.write(json.dumps(entry)+'\n')
    if check and r.returncode:raise RuntimeError(json.dumps(entry))
    return r

def action(name,settings=False):return cmd(['node',str(q/'cdp-eval.cjs'),str(q/name)],settings)
def poll(fn,timeout=12):
    until=time.monotonic()+timeout
    while time.monotonic()<until:
        try:
            value=fn()
            if value:return value
        except (OSError,ValueError,KeyError):pass
        time.sleep(.1)
    raise TimeoutError('Actual application readiness not received')
def targets():
    h=json.loads((rt/'HOST.json').read_text())
    return json.load(urllib.request.urlopen(f"http://127.0.0.1:{h['cdpPort']}/json/list",timeout=1))
def boot(phase,choose=False):
    global hostproc
    assert hostproc is None
    old=json.loads((rt/'HOST.json').read_text())
    assert not any(Path('/proc/'+str(p['pid'])).exists() for p in old['ownedPids']), 'Prior owned app/display still exists'
    label=case+'-'+phase+('-explicit-vault' if finish else '')+('-received' if finish else '-observer-received' if existing else '')+('-recovery' if recovery else '');env=dict(os.environ,APP_RUN_LABEL=label)
    if choose:env['APP_URI']='obsidian://choose-vault'
    else:env['APP_URI']='obsidian://open?vault='+case
    output=(rt/(label+'-controller.log')).open('w')
    args=['python3',str(q/'run-bounded.py'),label,'timeout','300','python3',str(q/'app-host.py')]
    hostproc=subprocess.Popen(args,env=env,stdout=output,stderr=subprocess.STDOUT);output.close()
    poll(lambda:(json.loads((rt/'HOST.json').read_text()).get('runLabel')==label and targets()))
    # Give the native credential prompt time to appear, then only decline it.
    time.sleep(.7);cmd(['python3',str(q/'cancel-keyring.py')])
    return label

def close():
    global hostproc
    if hostproc is None:return
    cmd(['node',str(q/'close-app.cjs')])
    rc=hostproc.wait(timeout=12);hostproc=None
    h=json.loads((rt/'HOST.json').read_text());assert rc==0 and h.get('appExitBeforeCleanup')==0,(rc,h)
    assert all(p['reaped'] for p in h['ownedPids']),h
    print(json.dumps({'case':case,'closedRun':h['runLabel'],'exit':rc}),flush=True)

def receive(phase):
    if recovery:phase='recovery-'+phase
    cmd(['node',str(q/'receive-case.cjs'),case,phase])
def choose():
    action('open-folder-dialog.js')
    def picker():
        r=cmd(['xdotool','search','--onlyvisible','--name','^Open folder as vault$'],check=False)
        return r.stdout.strip().splitlines()[0] if r.returncode==0 else None
    wid=poll(picker)
    cmd(['xdotool','windowactivate','--sync',wid,'key','--clearmodifiers','ctrl+l'])
    cmd(['xdotool','type','--clearmodifiers','--delay','1',str((rt/'vaults'/case).resolve())+'/'])
    cmd(['xdotool','key','--clearmodifiers','BackSpace'])
    g=cmd(['xdotool','getwindowgeometry','--shell',wid]).stdout
    d=dict(line.split('=',1) for line in g.splitlines() if '=' in line)
    cmd(['xdotool','mousemove','--window',wid,str(int(d['WIDTH'])-55),str(int(d['HEIGHT'])-28),'click','1'])
    poll(lambda:any(t.get('url')=='app://obsidian.md/index.html' for t in targets()))
    time.sleep(.2);action('enable-fixture-plugin.js');action('wait-ready.js')

def settings():
    action('open-yolo-scale.js');poll(lambda:any(t.get('title','').startswith('Settings -') for t in targets()))
    action('open-others.js',True)
    cmd(['python3',str(q/'cancel-keyring.py')])
    r=cmd(['xdotool','search','--onlyvisible','--name','^Settings -'])
    cmd(['xdotool','windowactivate','--sync',r.stdout.splitlines()[0]])
    action('focus-scale.js',True);cmd(['xdotool','key','--clearmodifiers','Right'])
    data=rt/'vaults'/case/'.obsidian/plugins/yolo/data.json'
    if case!='malformed' or recovery:poll(lambda:json.loads(data.read_text()).get('chatOptions',{}).get('chatFontScale')==1.05)
    else:time.sleep(.3)

try:
    if not finish:
        boot('initial',not existing);
        if existing:action('wait-ready.js')
        else:choose()
        receive('initial');settings();receive('saved');action('close-settings.js');close()
    boot('reopen');
    if 'yolo' not in json.loads(community.read_text()):
        action('open-community.js');poll(lambda:any(t.get('title','').startswith('Settings -') for t in targets()))
        action('toggle-plugin.js',True);poll(lambda:'yolo' in json.loads(community.read_text()),20);action('close-settings.js')
    action('wait-ready.js');receive('reopened')
    action('open-community.js');poll(lambda:any(t.get('title','').startswith('Settings -') for t in targets()))
    action('toggle-plugin.js',True);poll(lambda:'yolo' not in json.loads(community.read_text()),20);state=action('plugin-state.js');assert '"enabled":false,"loaded":false' in state.stdout,state.stdout
    action('toggle-plugin.js',True);poll(lambda:'yolo' in json.loads(community.read_text()),20);action('wait-ready.js');receive('reenabled');action('close-settings.js');close()
    boot('after-reenable');action('wait-ready.js');receive('restarted-after-reenable');close()
    print(json.dumps({'case':case,'status':'lifecycle-pass'}),flush=True)
except Exception as e:
    print(repr(e),file=sys.stderr)
    if hostproc is not None:
        try:close()
        except Exception as cleanup:print('Cleanup: '+repr(cleanup),file=sys.stderr)
    raise SystemExit(1)
