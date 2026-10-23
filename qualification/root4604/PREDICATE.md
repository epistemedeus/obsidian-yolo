# Frozen eligibility and receiving plan — before implementation

Frozen at predecessor `9859d257feaf4cb13dc10a1f546504df7009f491`, 2026-10-23.
Use the existing unique direct-OpenAI identity and collision gates first. Only
seeded nano→Luna / o4→Terra are eligible. Custom application remains unchanged.
An active entry means the real consumer's trimmed nonempty string key and
trimmed nonempty string value. Empty/non-string values are inactive; duplicate
entries retain last-active-write semantics and cannot erase an earlier active
conflict by appending an empty entry.

| Resolved API | Active saved key | Evidence / automatic decision |
| --- | --- | --- |
| Chat Completions | `max_tokens` | Applied after target shaping; restores the field alongside `max_completion_tokens`. Hold. |
| Chat Completions | `reasoning` | Applied after target shaping; restores the Responses-only object alongside Chat's `reasoning_effort`. Hold. |
| Chat Completions | `max_output_tokens` | Forwarded unchanged to Chat alongside `max_completion_tokens`; wrong API contract. Hold. |
| Responses | `max_completion_tokens` | Forwarded unchanged alongside Responses' `max_output_tokens`; wrong API contract. Hold. |
| Responses | `max_output_tokens` | The adapter prepopulates this key from ordinary `max_tokens`, then skips the explicit custom value. Saved authority is ambiguous; hold rather than silently migrate it. |

Provider `apiType` absent uses its owning default (direct OpenAI: Responses).
No other custom key is newly held by this amendment. Existing active custom
`model` identity hold remains. This is a finite, source-bound eligibility check,
not arbitrary request validation. In particular Chat `max_completion_tokens`,
Responses `max_tokens`, and scalar `reasoning_effort` on both transports have
positive serialized controls. The existing `seed` preservation control stays.
Responses `reasoning` object behavior outside those controls remains unqualified.

Baseline: saved synthetic v89 `data.json`, real metadata extraction/parser,
resolver/provider/locked SDK; capture conflicting JSON before hold assertions.
Repaired: exact old records and all references remain; fixed diagnostic contains
no customization values. Both aliases, buffered/streaming, padded/duplicate and
inactive entries, correction/removal before v89 migration, repeat load, direct
reapplication and explicit v90 precedence are tested. No claim of healthy old
model access or universal new-model custom compatibility follows.

OY-3: both migrated aliases use real Responses SSE `response.output_text.delta`
and `response.completed` events; text and usage are parsed. A `response.failed`
event and an HTTP failure propagate, then a healthy stream on the same provider
recovers. The existing Chat stream and all buffered/error controls remain.
