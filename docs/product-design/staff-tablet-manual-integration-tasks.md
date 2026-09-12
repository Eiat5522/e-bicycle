# Staff Tablet Manual Recovery And Integration Tasks

Last updated: 2026-09-11 14:13 +07
Kanban board: `glide-staff-tablet`
Delivery branch: `mvp-2/development` at `39db957433027c56b63cb43fc2ad33b4d53201d5`

## Goal

Manually recover, review, integrate, and verify the remaining ST02 work without trusting Kanban completion labels or dirty worker worktrees. Preserve existing worker branches and drafts as audit evidence. Merge only reviewed commits with verified ancestry and clean diffs.

## Safety Rules

- [ ] Keep the existing dirty primary worktree unchanged except for this tracking file until final integration.
- [x] Perform recovery in a separate manual worktree rooted at `origin/mvp-2/development`.
- [x] Treat uncommitted worker drafts as untrusted reference material.
- [x] Do not rewrite applied migrations.
- [ ] Do not use `sudo`, Docker, or PGlite for database validation.
- [ ] Use non-destructive linked Supabase validation before any production migration apply.
- [ ] Require exact commits, clean worktrees, tests, ancestry, and an independent fail-closed review before merging.

## Remaining Board Tasks

At inventory time the board had 9 non-terminal tasks: 2 blocked and 7 todo.

### Lane A — Canonical Bike Status

- [x] `t_c98efeb6` — **ST02-R1B: PostgreSQL-safe canonical bike enum recovery** (manually recovered as `45f3f08`; board reconciliation pending)
  - Repair the committed migration so it uses a valid replacement-enum procedure.
  - Preserve all dependent values, rows, event history, defaults, functions, and grants.
  - Replace hard-coded/count-dependent pgTAP assertions with repeatable fixtures and valid pgTAP syntax.
  - Commit a clean result with exact ancestry from the reviewed contract baseline.
- [x] `t_eac277a5` — **ST02-R1B verification: database validation of enum migration** (PostgreSQL 16/pgTAP verified; linked Supabase unavailable because this worktree is not linked)
  - Run the enum migration and tests against the linked Supabase/PostgreSQL workflow.
  - Record exact enum values, preserved counts, defaults, migration sequencing, and generated-type impact.
- [x] `t_af561d14` — **ST02-R2B: secure bike-status RPC policy and tests** (approved and pushed as `bf77591`; board reconciliation pending)
  - Implement exhaustive actor/action authorization, rider ownership, active-rider invariants, concurrency, audit context, and idempotent retries.
  - Database regression suite independently passed 84/84; final client-type regeneration remains in R6.

### Lane B — Tablet Sync Schema And RLS

- [x] `t_03105077` — **ST02-R3B: executable tablet-sync constraint recovery** (manually recovered as `e61e78b`; board reconciliation pending)
  - Base on API tip `c588cf4c8addefafef826bcadc25685daab45e9e`.
  - Keep `20260727210000_add_tablet_sync_schema.sql` byte-identical to the applied ST-API-01 version.
  - Replace the invalid draft with executable additive constraint remediation and focused database tests.
- [x] `t_49158833` — **ST02-R4B: fail-closed tablet-sync RLS recovery** (approved and pushed as `05e8c8c`; native PostgreSQL 29/29 suite plus 35/35 independent checks; board reconciliation pending)
  - Require active staff and active devices, exact station/device/staff tuples, fail-closed NULL handling, anti-spoofing, and API-policy-aligned elevated roles.
  - Add multi-role/multi-station database tests.

### Review And Integration

- [ ] `t_0cc8320c` — **ST02-R5B: independent recovery review gate** (blocked on review execution; latest agent failed before work with HTTP 400 unsupported model)
  - Review exact commits and rerun every required security/schema/test gate.
  - Approve a precise integration order or block with file-and-line findings.
- [ ] `t_cdeed400` — **ST02-R6: build clean reviewed integration branch** (`todo`; depends on R5B)
  - Integrate contract lineage `4e94f53` → `0597cb6`.
  - Integrate API lineage `03aefaf` → `c588cf4`.
  - Integrate only approved R1B/R2B/R3B/R4B commits.
  - Regenerate Supabase types once from the final validated schema.
- [ ] `t_316a25c4` — **ST02-R7: harden staff-tablet authorization guard** (`todo`; depends on R6)
  - Fail closed for every non-active/unknown device or staff state, invalid station relation, configuration/query failure, and unstable/sensitive errors.
  - Add route/architecture coverage against guard bypass.
- [ ] `t_6408bd66` — **ST02-R8: final integration and merge-readiness review** (`todo`; depends on R7)
  - Independently verify exact SHA, ancestry, clean worktree, migration ordering, generated types, security, and full quality gates.
  - Merge to `mvp-2/development` only after an evidence-backed approval.

## Required Final Gates

- [ ] `git diff --check`
- [ ] Added-line secret and unsafe-code scan
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] Focused shared/mobile/web tests
- [ ] Database migration and pgTAP tests
- [ ] `supabase db push --linked --dry-run --yes`
- [ ] Supabase generated types refreshed in mobile and web
- [ ] Independent review of the exact final commit
- [ ] Final integration merged into `mvp-2/development`
- [ ] Kanban tasks reconciled to terminal statuses with evidence comments

## Evidence Log

| Item | Evidence |
| --- | --- |
| Board inventory | 2 blocked, 7 todo, 11 done on 2026-09-10 |
| Primary worktree | Dirty before manual recovery; preserve existing staged, modified, and untracked work |
| R1B worker state | `wt/t_c98efeb6` at `d8d25f4`; two migration files modified after commit |
| R3B worker state | `wt/t_03105077` at `39db957`; invalid untracked migration draft |
| Reviewed contract lineage | `4e94f53` then `0597cb6` |
| Reviewed API lineage | `03aefaf` then `c588cf4` |
| Prior review | `t_64750215` archived after 12 blocking findings; replacement tasks above remain authoritative |
| Manual integration branch | `/home/eiat/projects/e-bicycle-manual-st02`, branch `manual/st02-recovery`, rooted at `39db957` |
| R1B recovery | `45f3f08`; PostgreSQL 16/pgTAP 25/25 on both four-label and nine-label paths plus 5/5 unknown-label rollback; independent review approved |
| R1B generated types | No signature change; existing mobile/web RPC types remain structurally valid; final schema regeneration remains an R6 gate |
| R3B recovery | `e61e78b`; historical API migration blob preserved as `019d5576bc95d31d63b7df45ccb17e20dd5029f4`; SHA-256 `b6e01d0ec1ba5dbce8aaaaf6e136ce9bd27ec1d94bb0844fc002088151355517` |
| R3B validation | PostgreSQL 16/pgTAP 43/43 main, 4/4 record preflight, 7/7 conflict preflight; replay, renamed constraint, duplicate-match fail-closed, and unrelated-check preservation verified; independent review approved |

## Demo Acceptance — Web And Mobile

- [x] Resolve R2B retry authorization, payload identity, timestamp and historical-cycle regressions; independently rereview.
- [x] Complete R4B independent review and remediate findings.
- [ ] Validate final schema and regenerate app database types.
- [ ] Run integrated web and mobile quality gates.
- [ ] Start web demo and verify authentication and staff-tablet workflows against the new schema.
- [ ] Start mobile demo and verify bike discovery and authorized ride lifecycle against the new schema.
- [ ] Record demo access details, seed prerequisites, and actual smoke-test results.

Checkpoint: R1B, R2B, R3B and R4B are individually approved and pushed on `manual/st02-recovery`. R5B integrated review has NOT run successfully. No production schema apply or delivery-branch merge has occurred. Board statuses above are manual delivery status, not a fresh Kanban inventory.

## App And Demo Enablement Tasks

These are task-file additions, not newly created Kanban cards. Dependencies define execution order; preparatory app fixes may proceed in isolation before integration approval.

- [ ] **DEMO-01 — Restore review execution.** Retry R5B with a supported model or perform an independent review through another working route. Latest R5B and mobile-fix agents both failed at startup with HTTP 400; neither performed its assigned work.
- [ ] **DEMO-02 — Final schema deployment rehearsal (R5B/R6).** Validate the complete ordered migration chain, existing-schema upgrade, grants, RLS and RPCs on a disposable supported PostgreSQL/Supabase target. Isolated fixture success is not full deployment approval. Confirm target and migration history, then run a non-destructive linked dry run; obtain explicit scope approval before remote schema changes.
- [ ] **DEMO-03 — Reproducible generated types (R6).** Establish a generation command from the validated final schema; refresh `apps/web/src/lib/supabase/database.types.ts` and `apps/mobile/src/lib/supabase.types.ts`. Verify RPC nullability and both schema-contract suites; avoid hand-editing generated files to conceal mismatches.
- [ ] **DEMO-04 — Mobile compilation.** Reproduce/fix auth-route tuple typing, URL/URLSearchParams definitions, Promise callbacks in auth/unlock/wallet, nullable bike-status RPC arguments, and shared API URLSearchParams typing. Run mobile and affected workspace typechecks.
- [ ] **DEMO-05 — Mobile retry integration.** Reconcile the client null-rider return shortcut with server authorization and exact retry receipts. Test real request payload preservation, response-loss retries and changed-state rejection.
- [ ] **DEMO-06 — Mobile suite stability.** Full run previously had 24 passing suites and one map timeout; isolated map rerun passed 18/18. Rerun the complete suite and fix reproducible timing failures without weakening assertions.
- [ ] **DEMO-07 — Fail-closed web guard (R7).** Reject all non-active/unknown device states; require valid non-null station relations for ordinary and elevated access; sanitize configuration/auth/query exceptions. Cover missing identities, NULL/mismatch combinations and thrown-query paths.
- [ ] **DEMO-08 — Staff-tablet route integration.** Inventory intended demo workflows against product requirements; readiness assessment found no `/api/staff-tablet/*` routes and no production usages of the guard. Implement required approved endpoints and wire the guard into every entry point; add route/bypass tests. Do not claim a staff-tablet demo based solely on an unused helper.
- [ ] **DEMO-09 — Safe demo configuration and real seed data.** Document and validate configuration without exposing secrets; select a demo database, provide admin/rider and active staff/device/station fixtures, and seed real discoverable ready-to-rent bikes. Prevent silent mock fallback from being mistaken for connectivity.
- [ ] **DEMO-10 — Integrated quality gates (R8).** Typecheck, complete tests, lint, production builds, schema contracts and web integration/E2E tests against the approved schema. Independently review the exact final commit before delivery-branch integration.
- [ ] **DEMO-11 — Live demo smoke tests.** Launch web and Expo; verify live authentication, real bike discovery, authorized ride lifecycle and the implemented staff workflows. Record URLs/device access and evidence. Browser fallback maps do not establish native map/location behavior.
- [ ] **DEMO-12 — Handoff and board reconciliation.** Publish reproducible launch/seed instructions, limitations and verified results; reconcile existing Kanban cards with commit evidence and create follow-up cards for uncovered app work as needed.

### Latest Review And Readiness Evidence

- R2B `bf77591`: independent approval; native PostgreSQL 16.15, 84/84 pgTAP assertions. Reviewed file hashes matched before commit.
- R4B `05e8c8c`: independent native approval; 29/29 repository assertions plus 35/35 additional checks. Initial PGlite review was superseded, not used to satisfy the native gate.
- Web readiness agent: TypeScript passed; 30 Jest suites / 131 tests passed. Live demo and production build remain unverified.
- Mobile readiness agent: typecheck failed; 161 tests passed with one map timeout in the full run; isolated map subsequently passed. No compile fixes have been completed.
- Latest R5B integrated-review and mobile-fix delegation: both failed immediately with `HTTP 400: The requested model is not supported.` This is an execution failure, not a code-review rejection or approval.
