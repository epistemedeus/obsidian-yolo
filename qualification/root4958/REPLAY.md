# Bounded disposable application receiving

This is a failed application prerequisite receiving, not an application or
migration test pass. Reuse the accepted ROOT4410-B/ROOT4604 source qualification;
do not rerun its broad tests. The exact case expectations were sealed before
this application attempt. No source change was made.

## Official route received

- [Obsidian installation](https://obsidian.md/help/install) links the official
  [download page](https://obsidian.md/download). Its x86-64 AppImage link resolved
  to the versioned official GitHub release `v1.14.5/Obsidian-1.14.5.AppImage`.
- [Official release metadata](https://api.github.com/repos/obsidianmd/obsidian-releases/releases/tags/v1.14.5)
  supplies the asset size and SHA-256 digest, both equal to the acquired bytes.
  APP-PROVENANCE.json freezes the exact public URL, final redirect host/path,
  signed-query hash, bytes and digest. Temporary signed redirect parameters and
  raw headers remain only in ignored runtime; they are omitted from export.
  No independent signing-key/signature attestation was established.
- [Obsidian CLI](https://obsidian.md/help/cli) requires a running app and installer
  1.12.7+, enabled under Settings → General. It documents `plugin:reload id=yolo`,
  `plugin:disable id=yolo`, `plugin:enable id=yolo`, `eval code=...`, `version`
  and `restart`. None was run: the app did not reach UI/CLI registration.
- [Electron supported switches](https://www.electronjs.org/docs/latest/api/command-line-switches)
  documents `--proxy-server`. The preflight uses an owned loopback reject-only
  HTTP proxy, never a forwarding service. This is not a kernel egress proof.
  The installation page's sandbox-disabling example was deliberately not used
  because the assignment prohibits disabling the sandbox.

## Executed preparation and first invocation

The existing build's main.js, manifest.json and styles.css were reused; no build
or dependency install ran. Exact copied-member hashes are sealed in
CASE-MANIFEST.json. The manifest is derived from the accepted literal v89 fixture
module without invoking the settings parser, provider or an Obsidian shim.
Provider API keys are removed before fixture generation. All notes are synthetic.

From the repository root, these commands ran separately, under the existing
2GiB aggregate sampler (paired logs/JSON contain exact times/exits):

```sh
mkdir -p qualification/root4958 runtime/root4998-private
chmod 700 runtime/root4998-private
cp qualification/root4604/run-bounded.py qualification/root4958/run-bounded.py
python3 qualification/root4958/run-bounded.py download-appimage timeout 100 curl --fail --location --max-time 90 --silent --show-error --dump-header runtime/root4998-private/download.headers --output runtime/root4998-private/Obsidian-1.14.5.AppImage --write-out 'http=%{http_code} bytes=%{size_download} final=%{url_effective}\n' https://github.com/obsidianmd/obsidian-releases/releases/download/v1.14.5/Obsidian-1.14.5.AppImage
python3 qualification/root4958/run-bounded.py seal-cases node qualification/root4958/prepare-cases.cjs
python3 qualification/root4958/run-bounded.py official-release-metadata timeout 30 curl --fail --location --max-time 25 --silent --show-error --output runtime/root4998-private/release.json https://api.github.com/repos/obsidianmd/obsidian-releases/releases/tags/v1.14.5
python3 qualification/root4958/run-bounded.py app-preflight timeout 30 python3 qualification/root4958/app-preflight.py
```

The download/metadata/setup commands exited0. Hashing established publisher asset
integrity before the private AppImage was chmod700 and invoked. The app preflight
exited1 at missing libfuse.so.2, before a window, Obsidian version output, vault
load, plugin load or settings lifecycle. The native library cache/standard-path
probe also exited1. The runtime itself suggested extraction as a possible route;
no extraction, private FUSE install, sandbox workaround, unsupported flags or
second app attempt was tried. This does not prove all sandboxed Obsidian routes
on this VM are impossible. The assignment's bounded-stop branch was selected.

The preflight starts a private Xvfb with an allocated display, uses private XDG
config/cache/data/state/runtime/TMPDIR paths without changing HOME, and invokes
only this official AppImage through an owned dbus session. It records command,
PIDs, exit and first stderr, then closes only its own processes. The app and
Xvfb were reaped. A defunct dbus-daemon adopted by native supervisor95765 remains
awaiting parent reap; see OWNED-CLEANUP.json. The worker cannot wait on a non-child
and did not touch that supervisor or another job. The resource guard's group
cleanup targets only this check group.

## Receiving still required

CASE-MANIFEST.json is the frozen pre-app oracle, not app-derived expected data.
Its record/reference fields project the original saved records; a future actual
observer must account for documented schema/default-assistant enrichment rather
than equate a full normalized settings object to raw v89 JSON. CASE-OBSERVATIONS.json
proves only that the prepared copies still equal the original fixture hashes
after the failed invocation. A separate pre-invocation target-file hash sample
was not taken; do not report an actual application before/after save comparison.

After a fresh applicable admission and a qualified private sandboxed installation
route, the receiving owner must open each separate vault through the actual UI,
inspect live plugin settings using supported developer tools/CLI, use a real
settings UI action and its setSettings/saveData path, gracefully close/reopen,
then documented plugin reload/disable-enable and another restart. The sealed
cases cover eligible nano/o4, unrelated primary/title/reference controls,
max_tokens/custom endpoint/provider/collision holds, explicitv90 customization,
and malformed input plus a separate original-v89 recovery copy. Do not overwrite
original fixtures or treat an already-v90 held record as automatically retried.
No model invocation or credentials are required or authorized.

The current preflight carries this admission's finite time guard; it must not be
replayed under expired authority. Future lifecycle execution needs its own fresh
received horizon. No current-window retry is recommended by this partial.
