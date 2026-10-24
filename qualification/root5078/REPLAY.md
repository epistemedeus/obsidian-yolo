# Supported private Obsidian lifecycle receiving

Nine sealed synthetic cases and same-vault malformed recovery were received in
actual Obsidian 1.14.5 (Electron 43.8.3), using the unchanged qualified YOLO build.
`CASE-OUTCOMES.json` joins live observations, persisted hashes, installed member
hashes, distinct app PIDs and actual normal-exit receipts. Historical failed
attempts remain separate and are not counted as graceful restarts.

The original `qualification/root4958/` packet is immutable. Its missing-FUSE
failure and nine unrun cases were true at that operation; this later operation
supplies new evidence. Accepted ROOT4410-B/ROOT4604 source/SDK qualification was
reused, without replaying broad Jest/type/build/lint gates or changing source.

## Official setup and integrity

[Obsidian's Linux instructions](https://obsidian.md/help/install) identify the
AppImage route. Its sandbox-disabling example was not used. The
[AppImage FUSE documentation](https://github.com/AppImage/AppImageKit/wiki/FUSE)
and [AppImage user guide](https://docs.appimage.org/user-guide/run-appimages.html)
document private `--appimage-extract`; [Obsidian's URI documentation](https://obsidian.md/help/uri)
also describes unpacking an AppImage and pointing the executable at its unpacked
location. The retained official release artifact was hashed again before reuse:
139238201 bytes, SHA256
`306815f60d15dea8610d72886ef5e50ef4b7e7185e952ffc3bb21bee1582d952`.
`APP-PROVENANCE.json` binds the original official URL/redirect and publisher
release digest to extracted executable/AppRun/ASAR/helper hashes. No independent
signature attestation was established. No new download or dependency acquisition
was necessary.

Extraction exited0. AppRun's conditional sandbox fallback was inspected before
launch; its exact `unshare -Ur true` prerequisite passed, so the fallback was not
used. Application bytes, helper ownership/mode and sandbox switches were not
modified. The first extracted launch failed with `Socket path too long` and
signal5; original source and diagnostics are retained. Short, owned `/tmp` aliases
into the same ignored runtime fixed TMPDIR and the analogous CLI socket path.
The aliases were removed after use. No global install or application patch ran.

The actual application used private XDG config/cache/data/state/runtime/TMPDIR,
an owned Xvfb/xfwm4 display and foreground D-Bus, with HOME unchanged. Only the
[documented Electron switches](https://www.electronjs.org/docs/latest/api/command-line-switches)
for a loopback reject-only proxy and DevTools were supplied. No application
headless flag was used. The proxy never forwards; this is not a kernel no-egress
proof. Automatic app update checks failed at that proxy. CLI was not enabled or
used. Its earlier socket diagnostic is retained, not presented as a CLI pass.

## Sealed cases and real control path

`CASE-BINDING.json` measures all prepared target-file hashes before app execution
and binds them to the previously sealed manifest SHA256
`bb1306821bfc8aa4549d85f5ff4a8dd776ead35d2b289016ade66cb6b1aea9c1`.
Fixtures were copied without changing expectations. Original fixtures remain
unchanged. Every installed main.js/manifest.json/styles.css matches the qualified
build; actual vaults/profiles/binaries/screenshots/full captures remain ignored.

The actual vault manager's Open folder as vault button and native folder chooser
registered each new fixture vault. Only these authored synthetic fixtures were
enabled at Obsidian's plugin trust prompt. A new-keyring dialog was canceled;
no keyring/account/password was created. The first manual control attempt typed
only the synthetic vault path into an unconfirmed password field before that
hidden dialog was recognized. It was canceled without Continue. Subsequent
control checks and cancels this prompt before typing.

DevTools observes the actual running `app.plugins.getPlugin('yolo').settings`;
it does not supply a loader, shim or patched application. Settings navigation
opens the real YOLO settings UI. The benign edit focuses the actual Chat UI scale
range control, then sends an X11 Right key. Its existing React/Obsidian setting
handler calls YOLO's normal setSettings/saveData path and persists 1.05. No direct
settings assignment or data.json write substitutes for that save.

Registered-vault reopens use the documented `obsidian://open?vault=<case>` URI
and verify the actual vault path. This avoids relying on the last-used vault.
Each valid case receives initial load, UI save, normal app exit/reopen, actual
Community plugins disable/enable, enabled-plugin persistence, another normal
exit/restart, and unchanged expected references. App closure uses the
[DevTools Browser.close command](https://chromedevtools.github.io/devtools-protocol/tot/Browser/)
(the protocol specifies graceful close); normal process exit0 and owned-process
cleanup are independently observed. The first manual close used the actual
Ctrl+Q UI action. The startup record marked `starting` is a launch receipt;
final `hosts/*.json` records supply the actual exit and reap outcomes.

| Case | Received behavior |
| --- | --- |
| eligible-nano | Selected Luna, Terra title/continuation references; unrelated GPT-5 and disabled Terra preserved |
| eligible-o4 | Selected Terra, still disabled; other references and unrelated fields preserved |
| held-max-tokens | Chat-compatible nano customization/selection held; eligible o4 migrated |
| held-endpoint | Custom endpoint/provider records and old selections held |
| held-provider | OpenAI-compatible provider identity and old selections held |
| held-collision | Occupied Luna record preserved; nano held; eligible o4 migrated |
| explicit-v90 | Explicit Luna max_tokens customization preserved across saves/restarts |
| restored-v89 | Separate original valid fixture receives the whole lifecycle |
| malformed | Actual unreadable notice; real UI save refused; original28 bytes retained through restarts/re-enable |

The malformed vault was then closed and a separate sealed original-v89 copy
restored into that disposable vault. `RECOVERY-PREPARATION.json` binds the actual
closed-app check, backup and before/after hashes. The same vault then received
successful live migration, UI save, restarts and re-enable. This restoration is
preparation, not itself the recovery assertion.

Default-assistant/context enrichment is existing owning behavior; the sealed
oracle projects original saved record/reference fields rather than equating raw
v89 JSON with the whole normalized object. Providers and seeded custom fields
are compared exactly. Saved byte hashes can change with `__meta` revisions or a
second control commit on blur while reference projections remain deterministic.
For the first manually controlled nano load, the before hash was sampled before
launch; a separate post-load/pre-save disk sample was not taken. Its initial live
observation is retained and received explicitly by `receive-retained-initial.cjs`.
Other initial stages also confirm the live loader left fixture bytes unchanged.
No held model availability or live provider compatibility follows from these cases.

## Commands and evidence

This recipe is bound to the actual ROOT5084 finite admission, ending
2026-10-24T03:36:47.634Z. Do not replay its app host after expiry or under a new
operation without a fresh received binding. Historical sources are read-only
failure evidence and must not be rerun as failed routes.

Preparation ran separately under `run-bounded.py`; paired `logs/*.json` and bounded
logs contain command arrays, exits, times and sampled aggregate resource usage:

```sh
python3 qualification/root5078/run-bounded.py private-extraction timeout 90 sh -c 'cd runtime/root5084-private && ./Obsidian-1.14.5.AppImage --appimage-extract'
python3 qualification/root5078/run-bounded.py sandbox-user-namespace-probe unshare -Ur true
python3 qualification/root5078/run-bounded.py prepare-cases python3 qualification/root5078/prepare-runtime.py
```

The first two cases began with manual real UI actions and app-host invocations;
`MANUAL-DEVTOOLS-OBSERVATIONS.ndjson`, `hosts/`, and their resource receipts retain
those observations. The focused serial recipe then ran these commands (exit0
for the received repetitions; first failed attempts remain in the failure log):

```sh
python3 qualification/root5078/run-lifecycle.py eligible-o4 --finish-saved
python3 qualification/root5078/run-lifecycle.py held-max-tokens
python3 qualification/root5078/run-lifecycle.py held-endpoint
python3 qualification/root5078/run-lifecycle.py held-provider
python3 qualification/root5078/run-lifecycle.py held-collision
python3 qualification/root5078/run-lifecycle.py explicit-v90
python3 qualification/root5078/run-lifecycle.py restored-v89
python3 qualification/root5078/run-lifecycle.py malformed --existing-initial
python3 qualification/root5078/restore-malformed.py
python3 qualification/root5078/run-lifecycle.py malformed --existing-initial --recovery
python3 qualification/root5078/run-lifecycle.py eligible-nano --finish-saved
node qualification/root5078/receive-retained-initial.cjs
python3 qualification/root5078/run-bounded.py qa-evidence-normal-exits timeout 30 python3 qualification/root5078/verify-evidence.py
```

`CASE-COMMANDS.ndjson` records individual command argv, window target, exits,
timestamps and bounded output. `CASE-OUTCOMES.json` identifies the coherent final
observations, including normal-exit joins. `ADVERSE-AND-AMENDMENTS.json` retains
setup, control, observer, timing and resource failures and their consequential
remedies. The final QA verification checks evidence completeness, original
fixture/source preservation and Python/Node helper syntax. It is not another
product suite, source regression or substitute for the actual app observations.

## Resource and cleanup limits

Reservation stayed2097152KiB TOTAL, zero model children. Sampling at50ms includes
the native subtree, controller helpers, display/app and native wrapper/supervisor,
and double-counts shared pages. It is not a cgroup hard cap. The successful serial
application peak is recorded in RESOURCES.json. One owner sequencing error
briefly overlapped app hosts; the guard stopped that check at1970272KiB (exit137).
No larger single-app requirement was measured. The corrected recipe uses an
exclusive host lock, actual process exit/reap and persisted enabled-plugin state
before continuing. The nano post-re-enable sequence was repeated so its final
restart evidence does not use the guard stop as a graceful close.

OWNED-CLEANUP.json and ORPHAN-HELPER-CLEANUP.json show no live owned app/display/
helper processes or remaining short aliases. Only identity-matched orphaned
helpers from the guard stop received SIGTERM. Defunct children of the native
admission supervisor remain for that parent's reap; worker cannot wait on
non-children and did not signal the supervisor. Root receives native terminal,
export, claim and canonical cleanup separately. Every other useful job/cache/
enrollment was preserved.

No product defect was demonstrated and no product source fix was made. Original
baseline-red/green source evidence, OY-1 missing-record normalization limit, and
full-lint formatting/memory limitations remain unchanged. This evidence covers
these disposable Linux application cases. Installed customer vaults, other app
versions/platforms, provider inference, quality/parity/availability and maintainer
acceptance remain unclaimed. Root alone decides any issue624/upstream exchange,
publication or installation; none was sent or performed here.
