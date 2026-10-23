# Same-owner self-review

Reviewed the complete amendment against predecessor `9859d257`, the frozen
ROOT4604 brief and the full completed Sol5.6Pro review. No second model/reviewer
or child was started. Product changes are confined to v89→v90 eligibility and
its fixture/unit/SDK receiving tests. Runtime override precedence, provider/SDK
code, normalizer, catalog, version, dependencies and original evidence stay intact.

- Source identity still requires one direct OpenAI provider, exact seeded ID /
  model / provider tuple, no active custom `model`, no duplicate or occupied
  replacement, and no replacement reasoning-preference collision. Endpoint,
  custom-provider, alias and explicit unrelated-pin controls still pass.
- Active-entry matching follows the consumer's trimmed string keys / nonempty
  string values; empty duplicates do not erase active earlier writes. The
  finite API-specific field set is justified by actual SDK JSON, not model-name
  matching or a generic custom-parameter ban. Missing API type follows the
  existing direct-OpenAI default function.
- Held records and all raw references serialize identically apart from normal
  version progression. Parsed extant selections stay on their old provider and
  model. When only one alias holds, references to the other alias migrate
  independently; no reference to the held alias is rewritten. Diagnostics use
  only fixed IDs/reason strings. No custom value is printed by migration code.
- Compatible Chat `max_completion_tokens`, Responses `max_tokens` and scalar
  `reasoning_effort: low` remain effective in real SDK JSON. Existing seed,
  labels/tuning/order/credentials/disabled/unrelated selection controls remain.
  Correction/removal on fresh v89 input permits migration; held v90 data does
  not acquire an automatic retry. Explicit v90 overrides still win, including
  the deliberately conflicting Chat max_tokens example.
- Both migrated Responses aliases stream through the production adapter and
  locked SDK, with SDK-typed supported events, assembled text, final usage,
  response.failed and HTTP 401 propagation, then same-provider recovery. No
  production provider seam was needed. Existing Chat stream and buffered HTTP,
  network, malformed-response and recovery controls remain green.

Small findings fixed here: the optional reasoning-preference-map test access
(first type gate exit 2 retained); test import ordering and use of allowed debug
logging (first scoped ESLint exit 1 retained); SDK event fixtures now carry the
locked SDK's typed response/event contract. These are test-only amendments.

Unqualified: arbitrary custom keys/values, Responses reasoning-object precedence
outside tested controls, actual provider acceptance or semantic parity, old-model
health/current shutdown, installed Obsidian load/save/restart. OY-1 remains the
pre-existing missing-record normalization limit. Full lint remains incomplete
because of pinned unrelated formatting plus previous wide lint guard/OOM; it was
not rerun. Root owns maintainer discussion/issue-first alignment, AI disclosure
and any upstream/installation decision. Issue624 is not maintainer endorsement.
