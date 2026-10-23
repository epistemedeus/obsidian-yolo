#!/usr/bin/env bash
# Reproduce semantic failures against the fixed product pin, without touching
# the admitted writer checkout. Expected Jest exit: 1. Dependencies stay locked.
set -euo pipefail
task_repo=$(git rev-parse --show-toplevel)
task_scratch=$(mktemp -d /tmp/root4410-b-baseline-XXXXXX)
trap 'rm -rf -- "$task_scratch"' EXIT
git archive f5470e7ea1e3fcf5d972fc826b263e2fb0469f25 | tar -x -C "$task_scratch"
cp "$task_repo/src/settings/schema/migrations/89_to_90.test.ts" "$task_scratch/src/settings/schema/migrations/"
cp "$task_repo/src/settings/schema/migrations/89_to_90.fixtures.ts" "$task_scratch/src/settings/schema/migrations/"
ln -s "$task_repo/node_modules" "$task_scratch/node_modules"
cd "$task_scratch"
if [[ "${1:-settings}" == provider ]]; then
  # Isolate the justified provider seam: repaired catalog/migration/receiving,
  # but the actual provider source remains byte-for-byte at the product pin.
  for task_file in src/constants.ts src/utils/llm/model-capability-registry.ts \
    src/settings/schema/migrations/index.ts src/settings/schema/migrations/version.ts \
    src/settings/schema/migrations/89_to_90.ts src/settings/schema/migrations/89_to_90.receiving.test.ts; do
    cp "$task_repo/$task_file" "$task_scratch/$task_file"
  done
  npx --no-install jest src/settings/schema/migrations/89_to_90.receiving.test.ts --runInBand --testNamePattern='over openai-compatible and parses'
  exit $?
fi
npx --no-install jest src/settings/schema/migrations/89_to_90.test.ts --runInBand --testNamePattern='updates the catalog|migrates saved selections'
