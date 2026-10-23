#!/usr/bin/env python3
"""One bounded sandboxed official-AppImage/display attempt; never passes lifecycle."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import select
import socketserver
import subprocess
import threading
import time

q = Path(__file__).resolve().parent
rt = Path('runtime/root4998-private').resolve()
manifest_bytes = (q / 'CASE-MANIFEST.json').read_bytes()
manifest = json.loads(manifest_bytes)
assert all(c['lifecycleStatus'] == 'unrun' for c in manifest['cases'])
for case in manifest['cases']:
    assert hashlib.sha256(Path(case['fixture']).read_bytes()).hexdigest() == case['sha256']
assert datetime.datetime.now(datetime.timezone.utc) < datetime.datetime.fromisoformat('2026-10-23T17:12:00+00:00')
for name in ['config', 'cache', 'data', 'state', 'tmp', 'xdg-run']:
    (rt / name).mkdir(exist_ok=True, mode=0o700)
env = dict(os.environ)
env.pop('NODE_OPTIONS', None)
env.update(XDG_CONFIG_HOME=str(rt/'config'), XDG_CACHE_HOME=str(rt/'cache'),
           XDG_DATA_HOME=str(rt/'data'), XDG_STATE_HOME=str(rt/'state'),
           XDG_RUNTIME_DIR=str(rt/'xdg-run'), TMPDIR=str(rt/'tmp'))
# Supported Electron proxy switch. Reject every request; never forward it.
class Deny(socketserver.BaseRequestHandler):
    def handle(self):
        self.request.recv(4096)
        self.request.sendall(b'HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')
proxy = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Deny)
proxy.daemon_threads = True
threading.Thread(target=proxy.serve_forever, daemon=True).start()
rfd, wfd = os.pipe()
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
owned = []
record = {'startedAt': started, 'sealedManifestSha256': hashlib.sha256(manifest_bytes).hexdigest(),
          'status': 'application-lifecycle-unreceived', 'sandboxDisabled': False,
          'runtime': str(rt), 'appProcessVersion': None, 'ownedPids': owned,
          'appInvoked': False, 'pluginLoaded': False, 'lifecycleCasesRun': 0,
          'networkProxy': 'owned loopback deny proxy; no forwarding; not a kernel egress guarantee'}
display = app = None
try:
    with (rt/'display.log').open('w') as log:
        display = subprocess.Popen(['Xvfb', '-displayfd', str(wfd), '-screen', '0', '1280x800x24', '-nolisten', 'tcp'], pass_fds=(wfd,), stdout=log, stderr=subprocess.STDOUT, env=env)
    os.close(wfd)
    owned.append({'pid': display.pid, 'role': 'private Xvfb'})
    if not select.select([rfd], [], [], 4)[0]:
        raise RuntimeError('Xvfb did not allocate a display within 4s')
    env['DISPLAY'] = ':' + os.read(rfd, 32).decode().strip()
    record['display'] = env['DISPLAY']
    command = ['dbus-run-session', '--', str(rt/'Obsidian-1.14.5.AppImage'),
               '--proxy-server=http://127.0.0.1:' + str(proxy.server_address[1])]
    record['appCommand'] = command
    with (rt/'app-first-launch.log').open('w') as log:
        app = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, env=env)
    owned.append({'pid': app.pid, 'role': 'owned application/dbus launcher'})
    record['appInvoked'] = True
    deadline = time.monotonic() + 8
    while app.poll() is None and time.monotonic() < deadline:
        time.sleep(.1)
    record['applicationExitBeforeControl'] = app.poll()
    if app.poll() is None:
        names = subprocess.run(['xdotool','search','--name','Obsidian'],env=env,capture_output=True,text=True,timeout=3)
        record['privateWindowSearch'] = {'exit': names.returncode,'ids': names.stdout.split()}
        record['actualWindowSeen'] = names.returncode == 0
        for window in names.stdout.split():
            subprocess.run(['xdotool','windowactivate','--sync',window],env=env,capture_output=True,timeout=2)
            subprocess.run(['xdotool','key','--clearmodifiers','ctrl+q'],env=env,capture_output=True,timeout=2)
            break
        try:
            app.wait(timeout=4)
            record['gracefulCloseObserved'] = True
        except subprocess.TimeoutExpired:
            record['gracefulCloseObserved'] = False
            app.terminate()
            app.wait(timeout=3)
        record['boundary'] = 'Display preflight only; no plugin or lifecycle case received.'
    else:
        record['firstApplicationDiagnostic'] = (rt/'app-first-launch.log').read_text()[:12000]
        record['boundary'] = 'Official AppImage failed before application UI/control. Stop without sandbox disabling or unsupported retry flags.'
except Exception as error:
    record['firstSetupFailure'] = {'type': type(error).__name__, 'message': str(error)}
finally:
    if app is not None and app.poll() is None:
        app.terminate()
        try: app.wait(timeout=3)
        except subprocess.TimeoutExpired:
            app.kill(); app.wait(timeout=2)
    if display is not None:
        display.terminate()
        display.wait(timeout=3)
    for entry in owned:
        entry['reaped'] = not Path('/proc/'+str(entry['pid'])).exists()
    proxy.shutdown();proxy.server_close()
    os.close(rfd)
    record['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    (q/'APP-PREFLIGHT.json').write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps(record))
    if (rt/'app-first-launch.log').exists():
        (q/'logs/app-first-launch.log').write_text((rt/'app-first-launch.log').read_text()[:12000])
    if (rt/'display.log').exists():
        (q/'logs/display.log').write_text((rt/'display.log').read_text()[:8000])
raise SystemExit(0 if record.get('actualWindowSeen') and record.get('gracefulCloseObserved') else 1)
