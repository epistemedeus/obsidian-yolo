# Qualification sources

Product input: `f5470e7ea1e3fcf5d972fc826b263e2fb0469f25` from
`github.com/epistemedeus/obsidian-yolo` (the admitted project fork of
`Lapis0x0/obsidian-yolo`). Operating/assignment input:
`epistemedeus/pilot@8aded3ca3bb5f22b32454f962091ef3750715a76`.
The staged receipt SHA-256 is
`214cd8ef32c21041b90e79dc16353c9d1ae4b89c1c7b9a323471c4967c0f0474`.
No moving product branch was used as implementation input.

Official OpenAI pages were searched and opened on 2026-10-23 through the
OpenAI Docs skill. These are documentation observations, not authenticated
Models API observations or live inference qualification.

| Source | Received contract used here |
| --- | --- |
| [Deprecations](https://developers.openai.com/api/docs/deprecations) | Announced October 23, 2026 retirement of nano/o4 aliases and snapshots; candidate replacements are `gpt-5.6-luna` and `gpt-5.6-terra`, respectively. A date-only notice does not prove current endpoint shutdown. |
| [Luna model card](https://developers.openai.com/api/docs/models/gpt-5.6-luna) | Nano-tier, cost-sensitive role; text/image input, text output, reasoning efforts including none/high/max, 1,050,000 context, 128,000 maximum output. Standard text input/output: $0.20/$1.20 per million tokens. Both Responses and Chat Completions are listed. |
| [Terra model card](https://developers.openai.com/api/docs/models/gpt-5.6-terra) | Mini-tier role; text/image input, text output, reasoning efforts including none/high/max, 1,050,000 context, 128,000 maximum output. Standard text input/output: $2/$12 per million tokens. Both Responses and Chat Completions are listed. |
| [Chat Completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create) | `max_completion_tokens` bounds visible plus reasoning tokens; `max_tokens` is deprecated. Chat uses `reasoning_effort`; the Responses-style `reasoning` object is not in this request contract. |
| [GPT-5.6 guide](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6) | Preserve an explicit workload tier and effort where supported; `gpt-5.6` without a tier routes to Sol. This repair does not use that alias, change prompts, enable Pro mode, or adopt new orchestration. |

The existing cost calculator is a simple uncached standard-rate estimate. Its
new entries use the new cards' base rates, not retired-model rates. It still
does not model cache reads/writes, Fast pricing or the cards' >272K input
premium (2× input and 1.5× output). No broad pricing refresh or exact billing
claim is made. Existing context limits and explicit modalities on persisted
models remain user-owned; smaller old context values remain conservative.

The pinned `AGENTS.md`, `CONTRIBUTING.md`, settings loader/schema, migration
registration/helpers/tests, resolver and providers were read. The three phase
references in the assignment were read from the exact operating commit's Git
objects. Issue 624/prior PR search status is supplied Root evidence; this
worker did not re-query it, contact maintainers, open a PR or infer endorsement.
Contribution requires issue-first discussion for data migration and honest AI
disclosure. Root owns any upstream action.
