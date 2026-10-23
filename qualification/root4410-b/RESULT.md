# ROOT4410-B result

Implemented and received offline; ready for Root's integration/upstream decision.
No upstream PR, issue/comment, installation, provider inference or paid API was
performed. AI-assisted implementation and self-review by the admitted native
Sol6.1/xhigh owner; zero model children.

## Exact source and outcome

- Origin: `github.com/epistemedeus/obsidian-yolo.git`, HTTPS, no URL userinfo.
- Writer: `codex/root4410-b-yolo-model-migration-20261023` (preserved).
- Base: `f5470e7ea1e3fcf5d972fc826b263e2fb0469f25`.
- Base tree: `29cafb49f963fc2bc01fa70f24b4b5fb32e8f047`.
- Tested implementation head: `1e9e1e17b38a4208cb14f12b8969fca8f056a583`.
- Implementation tree: `26e574114727627c6930a8fd6a4ff72ff22317ea`.
- The following qualification-only commit adds this receiving packet. Its final
  export SHA/tree are returned with the branch; the source identity above avoids
  a self-referential report hash.

The active catalog now offers `gpt-5.6-luna` in nano's position and
`gpt-5.6-terra` in o4's position, retaining enabled/disabled defaults. Fresh empty
settings still have no models; reset/add-model consumers receive the updated
catalog. The unrelated primary default remains `openai/gpt-5` and title default
remains `openai/gpt-4.1-mini`.

v89→v90 uses the existing migration registration and loader. It renames only
the exact seeded ID/provider/model tuple with one direct OpenAI provider and a
default or exact official endpoint. The still-supported provider `type` alias
is recognized. Custom provider/type/endpoint/model pins, explicit model overrides,
renamed IDs, duplicates and occupied replacement IDs stay intact. A saved
replacement reasoning preference also holds the source rather than silently
changing the selected effort. Fixed, payload-free developer diagnostics make
holds explicit. Labels, order, credentials, tuning, modalities, enablement and
unrelated settings are preserved.

Successful renames update chat/title, continuation/tab completion, assistant,
subagent allowed/preferred and per-model reasoning references together. Missing
old records are not invented or guessed. The owning loader's existing invalid
reference fallback is unchanged and explicitly tested; conservation applies to
existing recognized records, not already-missing records.

The provider regression proved a necessary wider seam: the real locked SDK
serialized `max_tokens` plus a Responses-style `reasoning` object when a migrated
direct OpenAI selection retained Chat Completions. A small shared provider
preparation step now uses `max_completion_tokens` and the existing
`reasoning_effort` for these two targets, for both streaming and buffered calls.
It runs before explicit custom parameters, and is limited to direct OpenAI;
unrelated models, compatible providers and custom endpoints retain their shaping.
No second client or orchestration path was added.

Only nine source/test paths changed: `src/constants.ts`,
`src/core/llm/openaiCompatibleProvider.ts`,
`src/utils/llm/model-capability-registry.ts`, and migration registration/version
plus `89_to_90.ts`, `89_to_90.fixtures.ts`, `89_to_90.test.ts`, and
`89_to_90.receiving.test.ts`. Historical migrations, loader/schema semantics,
UI/copy, locks, releases, modules and generated assets are unchanged.

## Executed receiving

Commands, timestamps, exits, sampled memory and bounded output are in paired
`logs/*.json`/`*.log`; [LOG-INDEX.json](LOG-INDEX.json) records original hashes
and any bounded-log omissions. [RECIPE.md](RECIPE.md) is the reusable command
path. Dependencies are preparation, not a test pass.

| Check | Result |
| --- | --- |
| `bash qualification/root4410-b/baseline.sh` | Expected exit 1: two semantic failures at the exact base; 32 intentionally unselected controls. Catalog and saved selections still point to old models. |
| `bash qualification/root4410-b/baseline.sh provider` | Expected exit 1: two failures with the repaired migration but baseline provider; 17 intentionally unselected controls. Actual SDK body still contains `max_tokens`. |
| `npx jest src/settings/schema src/core/llm src/utils/llm/provider-config.test.ts src/utils/llm/model-capability-registry.test.ts --runInBand` | Exit 0: 109 suites, 763 tests. Includes 53 new migration/receiving cases. |
| `npx jest --runInBand` after esbuild preparation | Exit 0: 612 suites, 6,416 tests, no skips. Sampled whole-job peak 1,445,492 KiB. |
| `npm run type:check` | Exit 0; production build separately checks the final implementation. |
| `npm run build` | Exit 0: host/module/runtime type checks, styles/runtime/module/host builds, runtime boundary verification. Whole-job sampled peak 1,815,568 KiB. No generated tracked files changed. |
| Scoped Prettier and scoped typed ESLint across all nine changed files | Exit 0; scoped ESLint peak 1,546,972 KiB using a 1,250 MiB heap. |
| `npm run lint:check` | Exit 1 on untouched `src/core/rag/ragIndexService.test.ts`. Its base/worktree Git blob is identical: `6495db1cadf74caab9db95aad8c9f84b97222d43`. The focused baseline formatting command also exits 1. Full lint did **not** pass. |

The receiving tests write a synthetic v89 `data.json`, read it through the same
metadata extraction/parser used by `main.loadSettings`, then use the real
resolver, providers and OpenAI 4.91.1 serialization/parsing. They assert the
selected provider/model, request endpoint/parameters, useful output and usage,
including actual SDK streaming. Fetch is captured in memory; both Node HTTP
transports are guarded and asserted unused. HTTP 400/401/429/500, network failure
and malformed output reject; subsequent healthy calls on the same provider
recover. Custom/proxy and duplicate-ID resolver controls preserve identity.
Fixtures are removed in `finally`; loading leaves saved bytes unchanged.

Self-review corrected an invalid-field preservation edge, a padded custom
`model` override, and the reasoning preference collision. Test fixture/import
and scoped lint findings were also repaired. Intermediate failed runs remain in
the packet. No external review/acceptance or answer-quality equivalence is inferred.

## Preparation failures and resource boundary

Reservation remained **2,097,152 KiB total**, with zero model children and serial
heavy commands. The first `npm ci` was stopped by the guard at a partial sampled
2,049,692 KiB; a second smaller-heap attempt stopped at 2,041,952 KiB. Those early
measurements included the native process and check but omitted control overhead;
their full aggregate peaks are unknown and may have exceeded the reservation.
The omission was corrected, not rewritten in the original receipts. No claim
of a hard historical 2 GiB cap is made.

Preparation succeeded with a 512 MiB Node heap, one libuv thread, one download
socket, optional packages omitted and scripts disabled. The initial full Jest
run then failed four suites on the missing esbuild platform executable. Running
the locked `npm rebuild esbuild` restored it; the full suite subsequently passed.
The package/lock bytes stayed unchanged. There was no dependency upgrade.

Direct repository-wide ESLint at a 1,400 MiB heap was stopped at a corrected
whole-job sampled 1,968,048 KiB (128 MiB guard margin). A direct full-input
1,100 MiB heap attempt failed with V8 OOM at 1,665,384 KiB. Scoped ESLint then
completed with all findings fixed. The smallest larger reservation that would
complete global ESLint is **not established**; no larger-reserve run was made,
and a pre-completion lower bound is not reported as a successful requirement.
This remains a concrete receiving boundary for Root, alongside the unrelated
pinned formatting failure. No host floor or reservation was weakened.

The corrected guard samples the admitted native subtree, code-mode child,
CLI wrapper, supervisor and check every 50 ms, and terminates only the check's
own process group. RSS may double-count shared pages and cannot establish peaks
between samples. Build and test child processes completed; no watch process or
model child was launched. SPEC checkpoint/horizon are 13:34:13.591/13:49:13.591
UTC on October 23; this coherent export finishes before the checkpoint.

## Remaining limits and contribution constraints

[SOURCES.md](SOURCES.md) qualifies the announced retirement, tier candidates,
capabilities and base prices. This is offline compatibility, not live account
access, observed shutdown, output-quality parity, installation or commercial
acceptance. Arbitrary custom request overrides and exact billing (cache/Fast/
long-context premiums) are not universally qualified. Ambiguous held records
require a user/maintainer decision; they are intentionally not auto-merged.

The contribution guide asks for issue-first discussion for data migrations and
AI disclosure. Existing issue 624 is supplied Root context, not maintainer
endorsement. Root owns upstream PRs, shared integration and live installation.
