#!/usr/bin/env bash
# Expected exit 1: replay frozen hold regressions against the received predecessor.
set -euo pipefail
task_repo=$(git rev-parse --show-toplevel)
task_scratch=$(mktemp -d /tmp/root4604-baseline-XXXXXX)
trap 'rm -rf -- "$task_scratch"' EXIT
git archive 9859d257feaf4cb13dc10a1f546504df7009f491 | tar -x -C "$task_scratch"
for task_file in 89_to_90.fixtures.ts 89_to_90.customization.test.ts 89_to_90.receiving.test.ts; do
  cp "$task_repo/src/settings/schema/migrations/$task_file" "$task_scratch/src/settings/schema/migrations/"
done
ln -s "$task_repo/node_modules" "$task_scratch/node_modules"
cd "$task_scratch"
ROOT4604_CAPTURE=1 npx --no-install jest src/settings/schema/migrations/89_to_90.customization.test.ts src/settings/schema/migrations/89_to_90.receiving.test.ts --runInBand --testNamePattern='holds both full|holds saved|uses the owning default|holds the exact'
