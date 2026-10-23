#!/usr/bin/env python3
"""Run one serial check, recording its exit and sampled aggregate owned RSS.

The 2 GiB reservation includes this native Codex process. Only this check's
process group is terminated on a limit; no sibling job is inspected or stopped.
RSS sampling (50 ms) includes the native subtree and its admission supervisor /
CLI wrapper, double-counts shared pages, and is not a cgroup hard cap.
"""
import datetime
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

label, *command = sys.argv[1:]
out = Path(__file__).resolve().parent / "logs"
out.mkdir(exist_ok=True)


def processes():
    result = {}
    for entry in Path('/proc').iterdir():
        if entry.name.isdigit():
            try:
                stat = (entry / 'stat').read_text().rsplit(')', 1)[1].split()
                result[int(entry.name)] = (int(stat[1]), int(stat[21]) * os.sysconf('SC_PAGE_SIZE') // 1024,
                                           (entry / 'comm').read_text().strip())
            except (OSError, ValueError, IndexError):
                pass
    return result


native_pid = os.getppid()
initial = processes()
while native_pid in initial and initial[native_pid][2] != 'codex':
    native_pid = initial[native_pid][0]
if native_pid not in initial:
    native_pid = None
control_pids = set()
if native_pid in initial:
    parent_pid = initial[native_pid][0]
    if parent_pid in initial and initial[parent_pid][2] == 'node':
        control_pids.add(parent_pid)
        supervisor_pid = initial[parent_pid][0]
        if supervisor_pid in initial and initial[supervisor_pid][2] == 'python3':
            control_pids.add(supervisor_pid)
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
env = dict(os.environ)
env.setdefault('NODE_OPTIONS', '--max-old-space-size=1400')
with (out / (label + '.log')).open('w') as log:
    child = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, env=env, start_new_session=True)
    peak = 0
    limited = False
    peak_processes = []
    while True:
        snapshot = processes()
        owned = {os.getpid(), child.pid} | control_pids
        if native_pid in snapshot:
            owned.add(native_pid)
        # The native subtree is this one admitted job, including code-mode.
        # Kill targets remain the newly created check group only.
        descendants = {child.pid}
        if native_pid is not None:
            descendants.add(native_pid)
        while True:
            more = {pid for pid, (parent, _, _) in snapshot.items() if parent in descendants}
            if more <= descendants:
                break
            descendants |= more
        owned |= descendants
        rss = sum(snapshot[pid][1] for pid in owned if pid in snapshot)
        if rss > peak:
            peak = rss
            peak_processes = [dict(pid=pid, rssKiB=snapshot[pid][1], name=snapshot[pid][2])
                              for pid in owned if pid in snapshot]
        if rss >= 2097152 - 131072 and child.poll() is None:
            limited = True
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        status = child.poll()
        if status is not None:
            break
        time.sleep(.05)
    # Do not leave a check-created esbuild service/background child behind.
    try:
        os.killpg(child.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
receipt = dict(command=command, started=started, finished=datetime.datetime.now(datetime.timezone.utc).isoformat(),
               exit=status, aggregateSampledPeakKiB=peak, reserveKiB=2097152,
               guardMarginKiB=131072, resourceLimit=limited, nativePid=native_pid,
               measurementScope='native subtree + check + CLI wrapper + supervisor',
               peakProcesses=peak_processes, nodeOptions=env['NODE_OPTIONS'],
               log=str((out / (label + '.log')).relative_to(out.parent)))
(out / (label + '.json')).write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
print((out / (label + '.log')).read_text()[-2500:])
sys.exit(status if status >= 0 else 128 - status)
