# NOT_DEPLOYABLE — API08 integrated source WIP

This publication candidate is source-only work in progress, NOT an operational release or approved feature. Do not run migrations, repair history, seed/reset hosted services, or deploy from this snapshot.

## Blocking database history

The migration directory deliberately retains historical duplicate version `20260722000000`, the byte-identical wallet migration rename `20260722000001_shared_ride_wallet_transactions.sql`, and the incompatible replacement/expansion enum history (`20260727000000_expand_bike_status_model.sql` followed by `20260804000000_expand_bike_status_enum.sql`). No historical migration was renamed, deleted, repaired or executed for publication. PROPOSED enum scripts are unapproved review material, not deployment instructions.

## Verification boundaries

Partial versioned inventory delivery remains incomplete, including tablet offline-sync UI, inventory UI, and offline/sync integration. Historical readiness documents are not current acceptance: an exported sync POST route exists in this snapshot, so older statements that the sync route does not exist are stale; its existence does not prove runtime/native acceptance. Historical guard-v12 local evidence reports API14/shared15/mobile201/web497 passed with11 existing native/TLS skips, four uncached typechecks and four lint tasks with55 warnings. Those results were inspected, NOT rerun in this publication worktree and do not establish runtime identity here. No dependencies/build artifacts/env files or runtime seals are transferred.

Root-level executor source and tests are retained as WIP. The required colocated source/plan/comparison/restore fixtures are intentionally excluded as uncurated runtime/restore material. Prior independent default discovery recorded57 tests:34 pass,7 missing-fixture errors,16 skips. Default executor discovery is NOT GREEN; historical relocated-fixture passes do not fix this. The executor also retains an absolute manual-worktree path; do not execute it as a portable or deployment-ready entrypoint.

The latest retained registry audit for the isolated dependency candidate reports **nine remaining findings: 0 critical, 5 high and 4 moderate**. These are saved historical audit results, not a fresh publication-worktree audit or a clean security verdict. Every residual advisory disposition, accountable owner, expiry and approver remains PENDING; no exception, grace period or risk acceptance is granted by publication.

Generated database types are reconciled provisional declarations, not final-schema regeneration. Native/Auth/Storage/provider integration, production web build/runtime, Android/device acceptance, residual dependency risk dispositions, hosted acceptance and business/operational approval remain open. Independent exact-candidate review is mandatory before publication.

## Automation

The three checked-in GitHub workflows are scheduled/manual OpenWiki documentation/PR writers, not push-triggered migration/deployment jobs. External hosting integrations and repository settings were not verified; no claim is made that a push cannot trigger an external deployment. Push approval is not deployment approval.

## Verification plan

1. Review the explicit source allowlist, hashes, provenance, exclusions, complete patch, secret-scan findings and migration blockers in the external preparation handoff. Recheck every hash before staging.
2. Resolve independent source/security review findings without modifying original worktrees. No stage-all, commit or push is authorized by this preparation.
3. Before installs or heavy tests, use the independently reviewed guard-v12 with the user-owned resource JSON monitor: three advancing samples; RAM>=2147483648 bytes; Dfree>=8000000000 bytes; age<=10s and future<=3s; actual D headroom and kernel safety checks. Stop on denial; no per-sample PowerShell or bypass.
4. Under serial resource admission, establish clean frozen dependency identity, standalone/subset/full workspace tests and uncached type/lint; retain skipped native gates. Inspect hooks first; no hosted writes, DB migration execution, reset/deploy, emulator or Android actions.
5. Track missing executor fixture/discovery failures separately. Do not import sensitive restore fixtures to make publication look green. Database history resolution requires separately authorized authority and review; publishing WIP does not resolve it.
