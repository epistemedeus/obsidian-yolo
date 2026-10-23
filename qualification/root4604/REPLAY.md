# Replay

Reuse the existing Node22 locked dependencies and working esbuild; no install
is needed. Run these separately and serially from the repository root:

```sh
# Expected exit 1: 27 hold regressions at the exact predecessor.
python3 qualification/root4604/run-bounded.py baseline-replay-2 bash qualification/root4604/baseline.sh
# Expected exit 0: 91 migration/real SDK receiving tests, with synthetic wire logs.
python3 qualification/root4604/run-bounded.py receiving-replay env ROOT4604_CAPTURE=1 npx jest src/settings/schema/migrations/89_to_90 --runInBand
python3 qualification/root4604/run-bounded.py focused-replay npx jest src/settings/schema src/core/llm src/utils/llm/provider-config.test.ts src/utils/llm/model-capability-registry.test.ts --runInBand
python3 qualification/root4604/run-bounded.py types-replay npm run type:check
python3 qualification/root4604/run-bounded.py full-replay npx jest --runInBand
python3 qualification/root4604/run-bounded.py build-replay npm run build
python3 qualification/root4604/run-bounded.py prettier-replay node node_modules/prettier/bin/prettier.cjs --check src/settings/schema/migrations/89_to_90.ts src/settings/schema/migrations/89_to_90.fixtures.ts src/settings/schema/migrations/89_to_90.customization.test.ts src/settings/schema/migrations/89_to_90.receiving.test.ts
NODE_OPTIONS=--max-old-space-size=1250 python3 qualification/root4604/run-bounded.py eslint-replay node node_modules/eslint/bin/eslint.js src/settings/schema/migrations/89_to_90.ts src/settings/schema/migrations/89_to_90.fixtures.ts src/settings/schema/migrations/89_to_90.customization.test.ts src/settings/schema/migrations/89_to_90.receiving.test.ts
```

The bounded runner was copied unchanged from the original qualification. Its
50ms sampled aggregate RSS covers native/check descendants, CLI wrapper and
supervisor and retains a 128MiB guard margin under the 2097152KiB total. It kills
only the newly created check process group. Shared RSS may be counted twice;
this is not a cgroup cap or a guarantee about between-sample peaks. No child
model or parallel heavy verification is permitted.

Do not rerun wide lint or dependency installation under this admission. The
original ROOT4410-B receipts remain the authority for their first failures,
partial install measurements, baseline and full-lint limitation. All receiving
inputs/credentials/replies are synthetic, fetch is captured in memory, Node HTTP
transports are guarded, and temporary saved files are deleted. No real API,
installed Obsidian, issue/PR, publication or live inference is exercised.
