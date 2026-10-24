#!/usr/bin/env python3
# Decline only the unwanted new-keyring prompt on this owned disposable display.
import json,os,subprocess
from pathlib import Path
h=json.loads(Path('runtime/root5084-private/HOST.json').read_text());env=dict(os.environ,DISPLAY=h['display'])
r=subprocess.run(['xdotool','search','--onlyvisible','--class','gcr-prompter'],env=env,capture_output=True,text=True)
if r.returncode==1:print(json.dumps({'newKeyringPromptPresent':False}));raise SystemExit(0)
assert r.returncode==0,r.stderr
for wid in r.stdout.split():
    g=subprocess.check_output(['xdotool','getwindowgeometry','--shell',wid],env=env,text=True)
    d=dict(line.split('=',1) for line in g.splitlines() if '=' in line)
    assert int(d['WIDTH'])>600 and int(d['HEIGHT'])>150,g
    subprocess.run(['xdotool','mousemove','--window',wid,str(int(d['WIDTH'])-136),str(int(d['HEIGHT'])-24),'click','1'],env=env,check=True)
    print(json.dumps({'newKeyringPromptPresent':True,'action':'Cancel only; no password entered','window':wid}))
