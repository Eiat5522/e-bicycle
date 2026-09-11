# Staff Tablet Manual Recovery And Integration Tasks

Last updated: 2026-09-11 08:38 +07
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
- [ ] `t_af561d14` — **ST02-R2B: secure bike-status RPC policy and tests** (in progress; review blocked retry authorization and payload identity)
  - Implement exhaustive actor/action authorization, rider ownership, active-rider invariants, concurrency, audit context, and idempotent retries.
  - Add exhaustive database tests and regenerate client types.

### Lane B — Tablet Sync Schema And RLS

- [x] `t_03105077` — **ST02-R3B: executable tablet-sync constraint recovery** (manually recovered as `e61e78b`; board reconciliation pending)
  - Base on API tip `c588cf4c8addefafef826bcadc25685daab45e9e`.
  - Keep `20260727210000_add_tablet_sync_schema.sql` byte-identical to the applied ST-API-01 version.
  - Replace the invalid draft with executable additive constraint remediation and focused database tests.
- [ ] `t_49158833` — **ST02-R4B: fail-closed tablet-sync RLS recovery** (in progress; 29/29 pgTAP passed; independent review restarted after provider failure)
  - Require active staff and active devices, exact station/device/staff tuples, fail-closed NULL handling, anti-spoofing, and API-policy-aligned elevated roles.
  - Add multi-role/multi-station database tests.

### Review And Integration

- [ ] `t_0cc8320c` — **ST02-R5B: independent recovery review gate** (`todo`; depends on R2B and R4B)
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

- [ ] Resolve R2B retry authorization, payload identity, timestamp and historical-cycle regressions; independently rereview.
- [ ] Complete R4B independent review and remediate findings.
- [ ] Validate final schema and regenerate app database types.
- [ ] Run integrated web and mobile quality gates.
- [ ] Start web demo and verify authentication and staff-tablet workflows against the new schema.
- [ ] Start mobile demo and verify bike discovery and authorized ride lifecycle against the new schema.
- [ ] Record demo access details, seed prerequisites, and actual smoke-test results.

Checkpoint: R1B and R3B are approved commits. R2B and R4B remain unapproved drafts; no production schema apply or delivery-branch merge follows from their test results alone.
