# Bounded private tablet batch native gate

Run from the assigned worktree:

```sh
python3 supabase/tests/st02_tablet_batch_native.py
python3 -m unittest discover -s supabase/tests -p 'test_native_input_freeze.py'
```

The runner extends the historical 40-migration native gate without editing it.
It uses the existing local PG16 Unix-socket harness selected by
`ST02_NATIVE_WORKSPACE` (default documented in the runner), preserves the sealed
foundation and processor hashes, applies the 41-migration chain, replays the new
migration, and executes both historical and new tests from captured bytes.
Migration version prefixes must be unique 14-digit values. SQL/Python adapters
are included in the complete pre/post source inventory; runtime/configuration
inputs are also frozen. No hosted writes, Docker, sudo, or PGlite are used.

## Implemented seam

`private.station_sync_batch(text) -> jsonb` is owner-only. PUBLIC, anon,
authenticated and service_role have no execute grant. The text is the original
JSON envelope, not reconstructed JSONB; batch whitespace changes are identity
conflicts. Original per-record JSON token text is retained and compared across
batches, including formatting. Local record IDs are bounded to UUIDs because
the approved private start/return processors require UUID local IDs. Envelopes
contain 1–100 records. Existing pre-orchestrator receipts with no raw text or
actor binding fail closed instead of being adopted as trusted receipts.

The active actor comes from auth.uid(); caller staff/station fields are checked
against that actor and the locked active registered device. One transaction
retains immutable receipt outcomes and invokes registration/start/return
processors in dependency order. Expected known domain errors roll back the
record's subtransaction before returning conflict/rejection. Unknown failures
abort the entire batch. Accepted independent records can coexist with a failed
record; descendants of that failure never dispatch. Cyclic dependencies reject
the envelope transaction. Same-device serialization covers concurrent batch and
local-record replay. Successful receipts are never overwritten by failed retries.

## Native assertions

- Synthetic-only approved registration/start/return in reverse input order.
- Empty notice approvals, foreign actor/station/device, and inactive staff,
  device and station fail closed.
- Exact batch retry, response-loss retry, cross-batch local replay, changed batch
  bytes, changed local payload and changed local formatting.
- Missing/cyclic/failed dependencies; explicit unsupported and evidence rejection.
- Unknown late return-audit failure rolls back all earlier batch effects.
- Known domain failure rolls back its canonical subtransaction; independent
  accepted records and earlier successful retry receipts remain intact.
- Real concurrent same-batch and different-batch/same-local requests, observed
  PostgreSQL blocking and canonical rider/rental/audit/event counts.
- Public execution remains denied; all historical station/mobile gates run too.

## Cross-device lock inversion policy

The original 190000 function was reproduced on native PG16 with two authorized
actors/devices, independent first records, and opposite rental identity order:
one session returned real `40P01`. The new adapter also forces opposite bike
order with distinct rental identities. It waits for both first-record barriers,
then records the actual mutual `pg_blocking_pids` cycle (advisory locks for
rental order, transaction/tuple waits for bike order), not a timing assumption.

The chosen correction is **one bounded whole-batch retry**, not deterministic
prelocking and not global serialization. `40P01` escapes record dispatch and
rolls back the enclosing batch subtransaction, including authorization/device
locks, canonical effects and receipts. The original raw envelope is reused,
authorization and immutable identity checks run again, and PL/pgSQL accumulator
variables are explicitly reset (SQL rollback does not reset those variables).
A second `40P01` propagates; it is never a successful record or a durable rejected
receipt. Callers must retry an unchanged envelope in a new transaction after
rollback; no public HTTP retry adapter is supplied by this owner-only seam.
Existing caller work before invoking the function is outside this retry scope.

No unrelated devices are serialized. Contended batches can pay deadlock detection
latency twice and can still fail after the second attempt; this policy bounds
work rather than guaranteeing starvation freedom. The native regression accepts
that explicit failure only after verifying no partial batch receipt/rental, then
retries the exact unchanged request after the winner commits. Duplicate replay
returns identical responses; changed bytes conflict. A synthetic late `40P01`
on both attempts proves exactly two executions and byte-for-byte equivalent
canonical/receipt table state after exhaustion, including all previous receipts.
Triggers compare attempt identities against retained original input text, actor,
staff and station. Null/nonstaff callers fail with `42501` while resource locks
are held, without dispatching or incrementing the attempt counter.

The runner asserts the notice registry is empty immediately after the pristine
41-migration apply and **before any synthetic fixture**. Its final database is
not empty: two `SYNTHETIC` notice rows and native test fixtures intentionally
remain. Both stages are separately asserted/reported. The inversion adapter and
all SQL/Python inputs run from the prehashed snapshot; freeze unit tests are now
part of the full runner as well as runnable separately.

## Deliberately not delivered

This is NOT full API04/05/06 or public sync completion. No HTTP endpoint is wired.
No operational approvals are seeded. Evidence upload, attachment/hash checks,
required-evidence policy, undefined BikeCheckPayload policy, pricing and payment
verification remain unimplemented. Any explicit record or embedded inspection /
payment evidence reference is rejected, not acknowledged as uploaded or accepted
pending evidence. Other record types are explicit rejections. Conflict outcomes
are durable in sync record/batch receipts; a manager reconciliation workflow and
conflict-queue materialization are not implemented. Canonical writes remain the
approved private station-assisted ledger, not fabricated mobile rental rows.
The owner-only gate must remain closed until operational approvals, evidence
checks and remaining integration/reconciliation contracts are independently ready.
