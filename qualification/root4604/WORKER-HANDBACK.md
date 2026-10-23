# ROOT4604 source and receiving handback

The automatic v89→v90 migration now holds the proved incompatible or ambiguous
saved request customizations, preserving each old record, selection and owning
reference. Explicit runtime custom-parameter precedence stays unchanged.
Both migrated aliases now have end-to-end Responses streaming receiving.

Tested source commit: `7cb0734050ebb0061bd9a312f468dfa276e9ad22`.
Tested source tree: `6d308c7d2652fa8520e451e423b130d75d2552e3`.
Predecessor: `9859d257feaf4cb13dc10a1f546504df7009f491`.
Original product base: `f5470e7ea1e3fcf5d972fc826b263e2fb0469f25`.
Origin: `github.com/epistemedeus/obsidian-yolo.git` (canonical HTTPS origin).
Branch: `codex/root4410-b-yolo-model-migration-20261023`.
The evidence-only packet follows the tested source; the controller handbacks
record the final exported HEAD/tree and push readback without a self-referential
commit hash inside this packet.

This is the same native session `01a16839-cd1f-7871-a243-c794eaaf81fd`, declared
Sol6.1/xhigh, zero model children, on the admitted Cursor VM. The new Pilot
publication is `62e31da4d78393f930a0df27db68d6ab36a5edd8`, distinct from the
product authority. Full assignment and completed review were read before code;
staged member hashes/blobs are verified in [INPUT-VERIFICATION.json](INPUT-VERIFICATION.json).
The early checkpoint was recorded at 11:54:55Z, before 11:55:38.059Z; the new
requiredUntil is 13:56:13.591Z. See [EARLY-CHECKPOINT.json](EARLY-CHECKPOINT.json).

## Eligibility and semantic evidence

The [predicate frozen before implementation](PREDICATE.md) is limited to the
existing exact source identity and replacement context. Chat holds active
`max_tokens`, `max_output_tokens` or `reasoning`; Responses holds active
`max_completion_tokens` or the adapter-ignored `max_output_tokens`. The owning
provider default is used when apiType is absent. Keys and string values use the
consumer's trimming/active-entry rules. Empty/inactive duplicates do not undo
an active earlier write. No fields are stripped, merged, sanitized or reordered.

The first baseline run failed 26 new assertions while 30 tests passed. The final
archived-predecessor replay fails 27/27 selected regressions (30 unrelated tests
intentionally skipped), including the exact unpadded single-entry counterexample:

```json
{"model":"gpt-5.6-luna","max_completion_tokens":128,"max_tokens":64}
```

The repaired capture uses the preserved old `gpt-4.1-nano` identity and explicit
`max_tokens:64`; it does not silently issue that saved customization as Luna.
This is preservation for a user/maintainer decision, not proof of old-model health.
Complete synthetic serialized bodies are in [BASELINE-FINAL-WIRE.json](BASELINE-FINAL-WIRE.json)
and [REPAIRED-WIRE.json](REPAIRED-WIRE.json); the original first 20 captures remain
in [BASELINE-WIRE.json](BASELINE-WIRE.json).

Both nano/o4, buffered/streamed paths, padded keys and duplicate entries are
covered. Raw held settings serialize identically except normal version
progression; parser/resolver selections stay extant. When only one model holds,
only the other model's references migrate. Deterministic/reapplied migration,
repeat load and input immutability pass. Fixed diagnostics disclose no values.
Compatible Chat `max_completion_tokens`, Responses `max_tokens`, and scalar
`reasoning_effort:low` remain effective after migration; the original benign seed,
labels, order, disabled state, modalities/tuning, credentials and unrelated
selection controls remain green. Correcting/removing the override on unmigrated
v89 data permits migration and useful parsed output. Held v90 records do not
receive an automatic retry. Explicitly configured v90 values retain last-write
authority, including the intentionally conflicting max_tokens example.

OY-3 receives saved synthetic data.json through real metadata extraction,
settings migration/parser, resolver, production Responses provider/adapter and
OpenAI4.91.1 SDK stream decoding. Both target requests use `/v1/responses`, the
migrated model, `max_output_tokens:128`, `reasoning.effort:high`, `stream:true`.
SDK-typed `response.output_text.delta` and `response.completed` frames produce
`Useful synthetic answer.` and usage 10 input / 2 output / 12 total. A
`response.failed` frame and HTTP401 propagate; healthy streams recover on the
same provider after each. Existing Chat streaming and buffered HTTP/network/
malformed-response/recovery tests remain green. All fetch calls are intercepted
in memory and Node HTTP transports guarded; temporary files are removed.

## Verification and resources

All heavy checks ran serially under **2097152KiB total**, including native/check
processes, wrapper and supervisor. No amendment resource guard fired; maximum
sampled aggregate RSS was **1830656KiB**, during production build. Sampling is
50ms with a 128MiB guard margin; shared RSS may be double-counted and this is not
a kernel hard cap or a guarantee about between-sample peaks. No larger minimum
requirement was measured. See [COMMANDS.json](COMMANDS.json), per-command receipts,
[bounded logs](LOG-INDEX.json), and exact [replay commands](REPLAY.md).

| Final check | Exit / outcome | Sampled aggregate peak KiB |
| --- | --- | --- |
| Predecessor baseline replay | 1 / 27 expected failures, 30 selected-out skips | 780060 |
| Migration + SDK receiving | 0 / 3 suites, 91 tests | 716588 |
| Settings/provider group | 0 / 110 suites, 801 tests | 872584 |
| `npm run type:check` | 0 | 1331432 |
| `npx jest --runInBand` | 0 / 613 suites, 6454 tests | 1550052 |
| `npm run build` | 0 / host/module/runtime types, build and boundary verification | 1830656 |
| Scoped Prettier | 0 / all four changed source/test files | 426496 |
| Scoped typed ESLint (1250MiB old-space cap) | 0 / all four files | 1534860 |

First typecheck exit2 (optional test map access) and scoped lint exit1 (test
imports/debug logging) are retained and repaired. [SELF-REVIEW.md](SELF-REVIEW.md)
records the complete same-owner review. No prerequisite install was repeated.
Node22.23.4 / npm10.9.9; resolved OpenAI4.91.1, TypeScript5.6.2, Jest29.7.0,
ts-jest29.2.5, esbuild0.17.3, Obsidian1.8.7. Package/lock hashes and exact changed
paths are in [IDENTITIES.json](IDENTITIES.json) and [CHANGED-PATHS.txt](CHANGED-PATHS.txt).
No provider, catalog, normalizer, version, lock, UI or tracked generated artifact
changed in this amendment. Original qualification subtree tree
`ce8ee890172810edbcb1b8e77e9667d4e2ae0628` is byte-identical.

## Receiving limits and contribution boundary

OY-1 remains the pre-existing missing-record normalizer limit: raw migration
keeps a genuinely dangling old reference, and ordinary parsing may select or
clear a fallback. Its existing test remains. Conservation here covers extant
recognized records, not a redesigned normalizer. Arbitrary override values/keys
and untested Responses reasoning-object precedence remain unqualified.

The complete original ROOT4410-B packet and every first failure remain unchanged.
Full lint is still incomplete: pinned unrelated `ragIndexService.test.ts`
formatting, prior wide ESLint guard-stop at1968048KiB and 1100MiB-heap OOM
at1665384KiB. The early install measurements omitted later-accounted control
overhead, so they are not full-total fit proofs. Prior missing-esbuild failure
and repair remain recorded. Wide lint/install were not rerun, and passing scoped
lint is not a full-lint pass.

No installed Obsidian/vault load-save-restart, live provider request, account
access, semantic parity, model shutdown, maintainer acceptance or paid outcome
is claimed. Issue624 is not maintainer alignment. Root owns issue-first exchange,
AI disclosure and any PR/installation decision. This implementation/tests/report
are AI-assisted in the original native context; no issue, PR, comment, release,
publication or deployment was submitted.

Controller handbacks (outside the product repository):
`/home/ubuntu/root-sol-window100337/root4604-yolo-migration-amendment-20261023/ROOT4604-WORKER-HANDBACK.md`
and `ROOT4604-WORKER-RESULT.json` in the same directory. Runner-owned receipts
were not edited. Root receives session/admission/cleanup separately.
