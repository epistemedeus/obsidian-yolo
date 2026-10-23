# Receiving this repair

Use the existing lockfile, Node 22, and serial checks. Skip preparation when
the admitted locked dependencies and esbuild executable are already present;
the successful lean install was measured from an empty dependency directory.
From this repository:

```sh
# Preparation only; this path fits the admitted 2 GiB job reserve.
NODE_OPTIONS=--max-old-space-size=512 UV_THREADPOOL_SIZE=1 \
  python3 qualification/root4410-b/run-bounded.py install-replay \
  npm ci --no-audit --no-fund --maxsockets=1 --ignore-scripts --omit=optional --prefer-offline
NODE_OPTIONS=--max-old-space-size=512 \
  python3 qualification/root4410-b/run-bounded.py esbuild-replay \
  npm rebuild esbuild --no-audit --no-fund

# Expected baseline exit 1: two semantic failures at the immutable product pin.
python3 qualification/root4410-b/run-bounded.py baseline-replay \
  bash qualification/root4410-b/baseline.sh
# Expected exit 1: isolated pre-repair provider with the repaired migration.
python3 qualification/root4410-b/run-bounded.py provider-baseline-replay \
  bash qualification/root4410-b/baseline.sh provider

# Repaired receiving: normal migration chain plus actual saved data.json,
# host metadata extraction, resolver, provider, SDK serialization and parsing.
python3 qualification/root4410-b/run-bounded.py receiving-replay \
  npx jest src/settings/schema/migrations/89_to_90 --runInBand
python3 qualification/root4410-b/run-bounded.py focused-replay \
  npx jest src/settings/schema src/core/llm \
  src/utils/llm/provider-config.test.ts \
  src/utils/llm/model-capability-registry.test.ts --runInBand
python3 qualification/root4410-b/run-bounded.py types-replay npm run type:check
python3 qualification/root4410-b/run-bounded.py full-replay npx jest --runInBand
python3 qualification/root4410-b/run-bounded.py build-replay npm run build
```

Run commands separately: the expected baseline failure should not prevent the
repaired checks. `npm run lint:check` is the current full lint gate; this branch
retains its unrelated pinned formatting failure and resource-limited full ESLint
attempts. The exact successful scoped ESLint command is in
`logs/eslint-scoped-final.json`. None of these is a claim that full lint passed.
Build outputs are local preparation, not part of the source export.

The memory guard includes this native job's supervisor, CLI wrapper, code-mode
child and check descendants, samples RSS every 50 ms and stops only its own
check group at a 128 MiB margin below 2,097,152 KiB. Shared RSS may be counted
twice. It is not a kernel-enforced hard cap or a guaranteed maximum between
samples. The original install/typecheck receipts predate the control-overhead
correction; they retain their original narrower measurements. Do not add model
children or parallel heavy checks.

For another model retirement, reuse this failure corpus and the existing
versioned migration path. Qualify the exact source tuple, unique provider,
endpoint, free destination and every owning reference before changing it.
Keep a customized/duplicate/colliding record intact and make its hold explicit.
Do not use a global string replacement, infer provider authority from a model
name, or merge two user records. Capture the real locked SDK at a local
boundary and check the useful parsed result, failure and recovery.

The receiving tests intercept fetch in memory and forbid both Node HTTP
transports. Their credentials, inputs and outputs are synthetic; temporary
`data.json` files are removed in `finally`. They exercise the parser used by
`main.loadSettings`, whose load remains read-only. They do not launch Obsidian,
run a model, access an account, establish answer-quality parity or demonstrate
current shutdown. Customized request parameters remain explicit user choices;
arbitrary user overrides are not universally qualified for the new models.
