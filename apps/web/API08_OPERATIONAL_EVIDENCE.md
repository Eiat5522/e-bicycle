# API08 operational evidence candidate (not deployment approval)

This additive candidate enables the exported init/complete handlers only with all explicit server-only settings below. With absent/partial/invalid configuration they retain uncached 503 after the existing real Auth/PostgREST guard. The synthetic socket/psql adapters remain separate; no operational request launches a shell.

## Server configuration

- `API08_EVIDENCE_MODE=OPERATIONAL_DATABASE_SNAPSHOT_V1`
- `API08_DATABASE_URL`: PostgreSQL URL for a dedicated login, not an owner, superuser, service role or authenticator. No URL query parameters (including SSL overrides).
- `API08_DATABASE_CA`: PEM CA validating the database endpoint hostname. TLS certificate verification is mandatory.
- `API08_STORAGE_ORIGIN`: fixed HTTPS origin (no path/query/credentials), used only for `/storage/v1`.
- `API08_STORAGE_BUCKET`: existing private bucket. The adapter verifies `public=false` before signing/downloading.
- `API08_STORAGE_SERVICE_KEY`: server-only Storage credential; never used as the database transport or returned to clients.

Do not put these values in `NEXT_PUBLIC_*` variables, source files, reports or browser storage.

## Provisioning contract — operator action, NOT performed remotely

Apply the ordered reviewed migrations through the new `20260728220000` only after separate deployment authorization and hosted schema reconciliation. Accepted migrations42/43 are unchanged. New migration explicitly installs the approved JPEG/PNG v1 policy: 10MiB/file and 25 million pixels. BMP policy is not installed; its old validator remains solely for historical explicitly synthetic local fixtures.

Migration creates `api08_evidence_executor` as NOLOGIN, NOSUPERUSER, NOBYPASSRLS, NOCREATEROLE, NOCREATEDB, NOINHERIT and grants only private-schema usage and the reviewed `private.station_evidence_operate(text,uuid,uuid,uuid,jsonb,bytea)` entrypoint. It grants no direct table writes and no access to anon/authenticated/service_role. Do not expose `private` through PostgREST.

The operator must separately create a dedicated INHERIT LOGIN with NOSUPERUSER, NOBYPASSRLS, NOCREATEROLE, NOCREATEDB; grant it membership in `api08_evidence_executor` WITHOUT ADMIN OPTION and database CONNECT only as required. Supply its credential through the deployment secret manager. Do not grant other roles, ownership, schema CREATE, direct INSERT/UPDATE/DELETE/TRUNCATE, or direct underlying private-function execution. Verify effective ACLs, including inherited/PUBLIC grants; runtime checks fail closed if the login owns a DB/schema/table, has direct table writes, schema CREATE, privileged role attributes, additional membership or ADMIN OPTION. Existing incompatible PUBLIC grants require separately reviewed reconciliation, not widening this login.

The backend login is trusted to assert actor identity: compromise permits assertion of another valid staff actor. It must remain inaccessible to clients. The HTTP boundary derives user identity from real `auth.getUser` and maps the wire device identifier through the real guard to the database UUID. The pg adapter sets transaction-local identity and invokes the dispatcher on one checked-out connection. The dispatcher revalidates active actor/device/station and canonical parent/reference; errors roll back and destroy that checked-out connection. Successful commit clears LOCAL settings before pool reuse. Pool maximum is two.

## Byte lifecycle and policy

Init first commits a stable reservation, then issues a private non-upsert signed upload URL. Signing failure leaves a safely retryable reservation. Provider upload TTL is currently 7200 seconds, not configurable here. A revoked actor's outstanding signed token may still deposit staging bytes until expiry but cannot authorize finalization.

Complete authorizes before receipt replay. New completion downloads through fixed-origin authenticated private Storage, rejecting redirects, over-limit Content-Length, more than 4096 chunks and bodies above 10MiB. Requests have 10-second budgets and workflow cancellation has a 30-second deadline. At each database await cancellation rejects the caller, stops subsequent SQL, and destructively releases (never recycles) an in-flight checkout; late acquisition is destroyed once delivered. Pool acquisition is independently limited to five seconds; server statement timeout is ten seconds and client query timeout twelve seconds. These are event-loop/timer bounds, not hard real-time guarantees: a stalled process or network can delay backend disconnect observation, with server statement timeout the independent execution backstop. Cancellation during COMMIT is ambiguous: destruction cannot prove rollback or absence of a committed receipt. Retry the identical request through the reauthorizing durable-receipt path; do not invent a new identity or infer no effect from the error. Non-cancelled SQL errors attempt rollback before destroying the checkout. Two concurrent workflow slots bound retrieval and raster decoding. Sharp/libvips checks actual JPEG/PNG format and dimensions, rejects multiple pages and warning-level corruption, forces full raster decoding with a five-second processing timeout, and does not normalize submitted bytes. Tablet resizing must happen before its submitted SHA-256.

SQL independently rechecks size/hash/policy/current actor/canonical parent/immutable reference and structural format/dimensions. It is not a second JPEG/PNG decompressor: full decode is explicitly the trusted backend's responsibility. Snapshot bytes, attachment, immutable receipt and required-parent transition commit atomically. Return attachment ID only after commit; replay no longer reads staging. PostgreSQL snapshots are authoritative application durability, not privileged WORM. No cleanup, retention, backup or deletion job is implemented or claimed. Capacity/privacy/backup/retention and deployment remain separate admission decisions.

## Verification boundary

Use the exact scratch handoff report/manifest for executed gates. Local policy/ACL/native tests and compilation do not substitute for a combined real Auth + PostgREST + private Storage + TLS dedicated-login + deployed Next HTTP success flow. Do not deploy or mark API08 accepted until that combined gate and remaining operational security/retry/concurrency cases have actually executed and independent review has approved the sealed candidate.
