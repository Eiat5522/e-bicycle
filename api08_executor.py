"""Local-only API08 migration executor.

Canonical source admission and durable prefix checks precede migration writes.
Local unit tests are not restored full-history, real-login ACL or deployment
approval. See the independent review and scratch correction evidence for gaps.
"""
import hashlib
import json
import os
import pathlib
import sys
import time
from typing import Any

import psycopg
from pglast import parse_sql, ast, enums

D = pathlib.Path(__file__).parent
R = pathlib.Path("/home/eiat/projects/e-bicycle-manual-st02")


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def envelope(raw: bytes) -> tuple[bytes, list[tuple[int, int]]]:
    """Parse outer BEGIN/COMMIT envelope; return (derived_payload, removed_spans)."""
    text = raw.decode("utf8")
    parsed = parse_sql(text)

    # Reject any session/transaction settings at top level
    if any(isinstance(s.stmt, ast.VariableSetStmt) for s in parsed):
        raise ValueError("unsupported session/transaction settings")

    controls = [
        (i, s) for i, s in enumerate(parsed)
        if isinstance(s.stmt, ast.TransactionStmt)
    ]
    if not controls:
        return raw, []

    if len(controls) != 2 or controls[0][0] != 0 or controls[1][0] != len(parsed) - 1:
        raise ValueError("non-envelope transaction control")

    first, last = controls[0][1], controls[1][1]
    for s, kind in [
        (first, enums.TransactionStmtKind.TRANS_STMT_BEGIN),
        (last, enums.TransactionStmtKind.TRANS_STMT_COMMIT),
    ]:
        if (
            s.stmt.kind != kind
            or s.stmt.options
            or s.stmt.chain
            or s.stmt.savepoint_name
        ):
            raise ValueError("unsupported transaction envelope")

    # pglast source offsets are Unicode character offsets, not UTF8 byte offsets.
    spans: list[tuple[int, int]] = []
    for s in [first, last]:
        start = s.stmt_location
        end = start + s.stmt_len if s.stmt_len else len(text)
        fragment = text[start:end]
        # Source slices may begin with comments; AST, not spelling, decides boundaries.
        assert len(parse_sql(fragment)) == 1
        if end < len(text) and text[end] == ";":
            end += 1
        spans.append((start, end))

    derived = text
    for start, end in reversed(spans):
        derived = derived[:start] + derived[end:]

    assert not any(
        isinstance(s.stmt, ast.TransactionStmt) for s in parse_sql(derived)
    )
    return derived.encode(), spans


def load_approved_source_manifest() -> dict[str, Any]:
    """Load and verify the exact approved source manifest (39 entries, specific hash)."""
    manifest_path = D / "source-manifest.json"
    if not manifest_path.exists():
        manifest_path = D / "integration" / "candidate39.json"
    approved = json.loads(manifest_path.read_text())

    expected_aggregate = "9803f5934631573858de669be348c66afc6490b8401e26f8a103a8cb2cb59154"
    if approved.get("aggregate_sha256") != expected_aggregate:
        raise ValueError(f"source manifest aggregate drift: {approved.get('aggregate_sha256')}")

    if len(approved.get("entries", {})) != 39:
        raise ValueError(f"source manifest entry count drift: {len(approved.get('entries', {}))}")

    entries = approved.get("entries", {})
    aggregate = sha("".join(f"{digest}  {file}\n" for file, digest in sorted(entries.items())).encode())
    if aggregate != expected_aggregate:
        raise ValueError("source manifest recomputed aggregate drift")

    # Verify each file on disk matches
    for file, digest in approved["entries"].items():
        if sha((R / file).read_bytes()) != digest:
            raise ValueError(f"approved source drift: {file}")

    return approved


def load_migration_comparison() -> list[dict[str, Any]]:
    """Load migration comparison manifest (44 migrations)."""
    comparison = json.loads((D / "migration-comparison.json").read_text())
    canonical_bytes = (D / "migration-comparison.json").read_bytes()
    if sha(canonical_bytes) != "6679d61f7fec9a43116578e3a6fcdf4b6cf537e13312490ff0b7f92b20474ce2" or comparison != json.loads(canonical_bytes):
        raise ValueError("migration comparison approval drift")
    if len(comparison) != 44:
        raise ValueError(f"migration comparison count drift: {len(comparison)}")
    return comparison


def build_plan() -> list[dict[str, Any]]:
    """Build the exact 15-step deployment plan with all hashes and wrappers."""
    approved = load_approved_source_manifest()
    comparison = load_migration_comparison()
    steps = []

    for x in comparison:
        source = (R / "supabase" / "migrations" / x["file"]).read_bytes()
        if sha(source) != x["sha256"]:
            raise ValueError(f"migration source drift: {x['file']}")

        if x["ledger_present"]:
            continue

        payload, spans = envelope(source)
        extra = {}

        # Migration 20260727000000 gets enum prelude/postlude wrappers
        if x["version"] == "20260727000000":
            pre = (D / "PROPOSED-enum-prelude.sql").read_bytes()
            post = (D / "PROPOSED-enum-postlude.sql").read_bytes()
            if sha(pre) != "8e6dec4477d815765cef86510219c2c9d61595919e8973c8ad503100942f73fd" or sha(post) != "a53f0c0d359bf12e6e9ba7e50db35f31b117962aa06dfe0ac13d80a44e320bae":
                raise ValueError("enum wrapper approval drift")
            payload = (
                b"LOCK TABLE public.bikes, public.bike_status_events IN ACCESS EXCLUSIVE MODE;\n"
                + pre
                + b"\n"
                + payload
                + b"\n"
                + post
            )
            extra = {
                "enum_prelude_sha256": sha(pre),
                "enum_postlude_sha256": sha(post),
            }

        steps.append(
            dict(
                version=x["version"],
                file=x["file"],
                original_sha256=sha(source),
                payload_sha256=sha(payload),
                removed_character_spans=spans,
                reconciliation=extra,
                payload=payload.decode(),
                original=source.decode(),
            )
        )

    if len(steps) != 15:
        raise ValueError(f"expected 15 pending steps, got {len(steps)}")

    # Verify the 7 envelope migrations
    envelope_count = sum(1 for s in steps if s["removed_character_spans"])
    if envelope_count != 7:
        raise ValueError(f"expected 7 envelope migrations, got {envelope_count}")

    return steps


def ledger_row(step: dict) -> dict:
    """Build ledger row matching supabase_migrations.schema_migrations exactly."""
    return {
        "version": step["version"],
        "name": step["file"].split("_", 1)[1][:-4],
        "statements": [step["original"]],
    }


def audit_row(step: dict, actor: str, target: str) -> dict:
    """Build audit row matching the schema exactly."""
    return {
        "version": step["version"],
        "original_sha256": step["original_sha256"],
        "payload_sha256": step["payload_sha256"],
        "reconciliation": step["reconciliation"],
        "actor": actor,
        "target": target,
    }


def validate_audit_schema(c: psycopg.Connection, allow_preexisting: bool = False) -> None:
    """Validate audit schema/table owner, shape, ACL/default ACL, triggers, rules, preexisting records."""
    # Creation uses current_user; reject SET ROLE rather than inspecting the
    # login's defaults while creating objects with a different effective owner.
    session_role, current_user = c.execute("SELECT session_user, current_user").fetchone()
    if session_role != current_user:
        raise ValueError("audit creation role must equal session role")
    # Global defaults apply even when the schema does not exist yet. Avoid a
    # regnamespace cast which would itself fail on normal first creation.
    default_acls = c.execute(
        """
        SELECT defaclrole::regrole::text, defaclacl
        FROM pg_default_acl
        WHERE (defaclnamespace = 0 OR defaclnamespace IN
               (SELECT oid FROM pg_namespace WHERE nspname = 'api08_deployment_audit'))
          AND defaclrole = (SELECT oid FROM pg_roles WHERE rolname = current_user)
          AND defaclobjtype = 'r'
        """
    ).fetchall()
    for role, acls in default_acls:
        if any(acl.split("=", 1)[0].strip('"') != current_user for acl in acls):
            raise ValueError(f"audit schema has DEFAULT PRIVILEGES for non-owner: {acls}")
    # Check schema exists and ownership
    schema_row = c.execute(
        """
        SELECT nspname, nspowner::regrole::text
        FROM pg_namespace
        WHERE nspname = 'api08_deployment_audit'
        """
    ).fetchone()

    if schema_row:
        # Validate ownership - must be the deployment role (current user)
        current_user = c.execute("SELECT session_user").fetchone()[0]
        if schema_row[1] != current_user:
            raise ValueError(f"audit schema owner mismatch: {schema_row[1]} != {current_user}")

        # Validate no PUBLIC privileges on schema
        schema_acl = c.execute(
            """
            SELECT nspacl FROM pg_namespace WHERE nspname = 'api08_deployment_audit'
            """
        ).fetchone()[0]
        if schema_acl:
            for acl in schema_acl:
                # Check for actual PUBLIC privileges (role=0), not owner privileges
                # Format: "role=privileges/grantor" or "=privileges/grantor" for PUBLIC
                if acl.split("=", 1)[0].strip('"') != current_user:
                    raise ValueError(f"audit schema has PUBLIC privileges: {schema_acl}")

        # Validate table structure
        table_row = c.execute(
            """
            SELECT
                c.relname,
                c.relowner::regrole::text,
                c.relkind,
                pg_get_userbyid(c.relowner) as owner_name
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'api08_deployment_audit' AND c.relname = 'steps'
            """
        ).fetchone()

        if table_row:
            if table_row[1] != current_user or table_row[2] != "r":
                raise ValueError("audit table owner/kind mismatch")
            persistence = c.execute(
                """
                SELECT relpersistence, relispartition,
                       EXISTS (SELECT 1 FROM pg_inherits
                               WHERE inhrelid = c.oid OR inhparent = c.oid)
                FROM pg_class c
                WHERE c.oid = 'api08_deployment_audit.steps'::regclass
                """
            ).fetchone()
            if not persistence or tuple(persistence) != ("p", False, False):
                raise ValueError("audit table must be permanent standalone")
            security = c.execute(
                """
                SELECT relrowsecurity, relforcerowsecurity,
                       EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = c.oid)
                FROM pg_class c
                WHERE c.oid = 'api08_deployment_audit.steps'::regclass
                """
            ).fetchone()
            if not security or tuple(security) != (False, False, False):
                raise ValueError("audit table has unexpected RLS/policies")
            # Validate columns
            cols = c.execute(
                """
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'api08_deployment_audit' AND table_name = 'steps'
                ORDER BY ordinal_position
                """
            ).fetchall()

            expected_cols = {
                                "version": ("text", "NO", None),
                                "original_sha256": ("text", "NO", None),  # has no default but postgres reports NO when created by executor
                                "payload_sha256": ("text", "NO", None),
                                "reconciliation": ("jsonb", "NO", None),  # has no default but postgres reports YES
                                "applied_at": ("timestamp with time zone", "NO", "clock_timestamp()"),
                                "actor": ("text", "NO", "SESSION_USER"),  # postgres reports as SESSION_USER
                                "target": ("text", "NO", "current_database()"),
                            }

            if len(cols) != len(expected_cols):
                raise ValueError(f"audit table column count mismatch: {len(cols)} != {len(expected_cols)}")

            for col in cols:
                name, dtype, nullable, default = col
                if name not in expected_cols:
                    raise ValueError(f"audit table unexpected column: {name}")
                exp_dtype, exp_nullable, exp_default = expected_cols[name]
                if dtype != exp_dtype:
                    raise ValueError(f"audit table column {name} type mismatch: {dtype} != {exp_dtype}")
                if nullable != exp_nullable:
                    raise ValueError(f"audit table column {name} nullable mismatch")
                if default != exp_default:
                    raise ValueError(f"audit table column {name} default mismatch: {default} != {exp_default}")

            # Validate primary key
            pk = c.execute(
                """
                SELECT conname, contype,
                    ARRAY(SELECT a.attname::text FROM unnest(conkey) WITH ORDINALITY k(attnum, ord)
                          JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = k.attnum ORDER BY k.ord)
                FROM pg_constraint
                WHERE conrelid = 'api08_deployment_audit.steps'::regclass AND contype = 'p'
                """
            ).fetchone()
            if not pk or tuple(pk) != ("steps_pkey", "p", ["version"]):
                raise ValueError(f"audit table primary key missing or wrong: {pk}")

            # Validate NO triggers on audit table
            triggers = c.execute(
                """
                SELECT tgname FROM pg_trigger
                WHERE tgrelid = 'api08_deployment_audit.steps'::regclass
                AND NOT tgisinternal
                """
            ).fetchall()
            if triggers:
                raise ValueError(f"audit table has unexpected triggers: {triggers}")

            # Validate NO rules on audit table
            rules = c.execute(
                """
                SELECT rulename FROM pg_rewrite
                WHERE ev_class = 'api08_deployment_audit.steps'::regclass
                AND rulename != '_RETURN'
                """
            ).fetchall()
            if rules:
                raise ValueError(f"audit table has unexpected rules: {rules}")

            # Validate table ACLs - no PUBLIC
            table_acls = c.execute(
                """
                SELECT relacl FROM pg_class
                WHERE relname = 'steps' AND relnamespace = 'api08_deployment_audit'::regnamespace
                """
            ).fetchone()[0]
            if table_acls:
                for acl in table_acls:
                    # Check for actual PUBLIC privileges (starts with =)
                    if acl.split("=", 1)[0].strip('"') != current_user:
                        raise ValueError(f"audit table has PUBLIC privileges: {table_acls}")

            # Column ACLs can grant access even when the table ACL is private.
            column_acls = c.execute(
                """
                SELECT attname FROM pg_attribute
                WHERE attrelid = 'api08_deployment_audit.steps'::regclass
                  AND attnum > 0 AND NOT attisdropped AND attacl IS NOT NULL
                """
            ).fetchall()
            if column_acls:
                raise ValueError(f"audit table has unexpected column privileges: {column_acls}")

            # Check for preexisting records
            if not allow_preexisting:
                count = c.execute(
                    "SELECT count(*) FROM api08_deployment_audit.steps"
                ).fetchone()[0]
                if count > 0:
                    raise ValueError(f"audit table has preexisting records: {count}")

    else:
        # Schema doesn't exist - will be created in setup transaction
        pass


def validate_ledger_schema(c: psycopg.Connection) -> None:
    """Validate ledger schema/table structure matches expectations."""
    # supabase_migrations schema should exist
    schema_row = c.execute(
        "SELECT nspname FROM pg_namespace WHERE nspname = 'supabase_migrations'"
    ).fetchone()
    if not schema_row:
        raise ValueError("supabase_migrations schema missing")

    # schema_migrations table structure
    cols = c.execute(
        """
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
        ORDER BY ordinal_position
        """
    ).fetchall()

    expected = {
        "version": ("text", "NO"),
        "name": ("text", "YES"),
        "statements": ("ARRAY", "YES"),
    }

    if len(cols) != len(expected):
        raise ValueError(f"ledger table column count mismatch: {len(cols)} != {len(expected)}")

    for col in cols:
        name, dtype, nullable = col
        if name not in expected:
            raise ValueError(f"ledger table unexpected column: {name}")
        exp_dtype, exp_nullable = expected[name]
        if dtype != exp_dtype:
            raise ValueError(f"ledger table column {name} type mismatch: {dtype} != {exp_dtype}")
        if nullable != exp_nullable:
            raise ValueError(f"ledger table column {name} nullable mismatch: {nullable} != {exp_nullable}")


def exact_ledger_readback(c: psycopg.Connection, expected_versions: list[str]) -> list[dict]:
    """Read back exact ledger rows for verification."""
    rows = c.execute(
        "SELECT to_jsonb(m) FROM supabase_migrations.schema_migrations m ORDER BY version",
    ).fetchall()
    return [r[0] for r in rows]


def exact_audit_readback(c: psycopg.Connection, expected_versions: list[str]) -> list[dict]:
    """Read back exact audit rows including timestamp and reconciliation."""
    rows = c.execute(
        """
        SELECT version, original_sha256, payload_sha256, reconciliation, applied_at, actor, target
        FROM api08_deployment_audit.steps
        ORDER BY version
        """,
    ).fetchall()
    return [
        {
            "version": r[0],
            "original_sha256": r[1],
            "payload_sha256": r[2],
            "reconciliation": r[3],
            "applied_at": r[4].isoformat() if r[4] else None,
            "actor": r[5],
            "target": r[6],
        }
        for r in rows
    ]


def prefix_classifier(
    baseline: list[dict],
    steps: list[dict],
    ledger: list[dict],
    audit: list[dict],
    actor: str,
    target: str,
) -> int:
    """Strict reviewed ordered-prefix classifier. Never repairs or executes SQL."""
    versions = [s["version"] for s in steps]
    if versions != sorted(set(versions)):
        raise ValueError("plan order/duplicates")

    for s in steps:
        if sha(s["original"].encode()) != s["original_sha256"] or sha(s["payload"].encode()) != s["payload_sha256"]:
            raise ValueError(f"source/payload digest mismatch: {s['version']}")

    n = len(audit)
    if n > len(steps):
        raise ValueError("unexpected audit rows")

    expected_ledger = sorted(
        baseline + [ledger_row(s) for s in steps[:n]],
        key=lambda r: r["version"],
    )
    if ledger != expected_ledger:
        raise ValueError("complete ledger mismatch")

    from datetime import datetime
    for record in audit:
        value = record.get("applied_at")
        try:
            if not isinstance(value, str):
                raise ValueError("timestamp must be an ISO8601 string")
            timestamp = datetime.fromisoformat(value)
            if timestamp.tzinfo is None or timestamp.utcoffset() is None:
                raise ValueError("timestamp must include timezone")
        except (TypeError, ValueError) as exc:
            raise ValueError("invalid completion timestamp") from exc
    expected_audit = [audit_row(s, actor, target) for s in steps[:n]]
    # Compare core audit fields (excluding applied_at which is assigned at commit time)
    actual_core = [
        {k: v for k, v in a.items() if k != "applied_at"}
        for a in audit
    ]
    if actual_core != expected_audit:
        raise ValueError("complete audit mismatch")

    return n


def admit_plan(candidate: list[dict], canonical: list[dict]) -> list[dict]:
    """Compare all fields, not self-reported hashes. Canonical rebuilt from sources."""
    if candidate != canonical:
        raise ValueError("whole ordered plan mismatch")
    return canonical


def setup_audit_schema(c: psycopg.Connection) -> None:
    """Create audit schema and table with exact structure."""
    with c.transaction():
        validate_audit_schema(c, allow_preexisting=True)
        c.execute("CREATE SCHEMA IF NOT EXISTS api08_deployment_audit")
        c.execute("REVOKE ALL ON SCHEMA api08_deployment_audit FROM PUBLIC")
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS api08_deployment_audit.steps (
                version TEXT PRIMARY KEY,
                original_sha256 TEXT NOT NULL,
                payload_sha256 TEXT NOT NULL,
                reconciliation JSONB NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
                actor TEXT NOT NULL DEFAULT session_user,
                target TEXT NOT NULL DEFAULT current_database()
            )
            """
        )
        c.execute("REVOKE ALL ON ALL TABLES IN SCHEMA api08_deployment_audit FROM PUBLIC")
        c.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA api08_deployment_audit REVOKE ALL ON TABLES FROM PUBLIC")
        # Reject inherited named grants or unexpected created state before this
        # setup transaction commits, and before any migration payload runs.
        validate_audit_schema(c, allow_preexisting=True)


def execute_local(
    c: psycopg.Connection,
    steps: list[dict],
    expected_ledger: list[dict],
    fail_version: str | None = None,
    fail_at: str = "after_sql",
    allow_preexisting_audit: bool = False,
) -> dict[str, Any]:
    """Execute deployment with fail-closed guarantees."""
    # Validate connection is local disposable DB
    if not c.info.host.startswith("/"):
        raise ValueError("executor is local-only (Unix socket required)")
    if not c.info.dbname.startswith("api08_"):
        raise ValueError("disposable DB required (api08_ prefix)")
    if not c.autocommit:
        raise ValueError("autocommit required")
    steps = admit_plan(steps, build_plan())

    # Acquire advisory lock
    lock = c.execute("SELECT pg_try_advisory_lock(808, 20261022)").fetchone()[0]
    if not lock:
        raise ValueError("deployment lock unavailable")

    try:
        # Validate ledger schema
        validate_ledger_schema(c)

        # Read and verify exact current ledger
        actual_ledger = c.execute(
            "SELECT to_jsonb(m) FROM supabase_migrations.schema_migrations m ORDER BY version"
        ).fetchall()
        actual_ledger = [x[0] for x in actual_ledger]
        if not allow_preexisting_audit and actual_ledger != expected_ledger:
            raise ValueError("exact ledger drift")

        # Validate audit schema/table before any DDL
        validate_audit_schema(c, allow_preexisting=allow_preexisting_audit)

        actor = c.execute("SELECT session_user").fetchone()[0]
        committed = 0
        if allow_preexisting_audit:
            committed = prefix_classifier(expected_ledger, steps, actual_ledger, exact_audit_readback(c, []), actor, c.info.dbname)
        # Setup only after the entire durable prefix is admitted.
        setup_audit_schema(c)

        # Capture baseline for prefix classifier
        baseline = [
            {"version": r["version"], "name": r["name"], "statements": r["statements"]}
            for r in expected_ledger
        ]
        actor = c.execute("SELECT session_user").fetchone()[0]
        target = c.info.dbname

        # Execute each step
        for step in steps[committed:]:
            with c.transaction():
                c.execute("SET LOCAL search_path = public, pg_catalog")
                c.execute("SET LOCAL check_function_bodies = on")
                c.execute("SET LOCAL lock_timeout = '30s'")
                c.execute("SET LOCAL statement_timeout = '120s'")

                # Reject duplicate version
                if c.execute(
                    "SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = %s",
                    (step["version"],),
                ).fetchone():
                    raise ValueError(f"unexpected recorded version: {step['version']}")

                # Verify payload hash
                if sha(step["payload"].encode()) != step["payload_sha256"]:
                    raise ValueError(f"payload drift: {step['version']}")

                # Execute the migration payload
                c.execute(step["payload"], prepare=False)

                # Fail injection points
                if step["version"] == fail_version and fail_at == "after_sql":
                    c.execute("SELECT 1/0")

                # Insert ledger row with ORIGINAL source text
                c.execute(
                    "INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES (%s, %s, %s)",
                    (step["version"], step["file"].split("_", 1)[1][:-4], [step["original"]]),
                )

                # Insert audit row
                c.execute(
                    "INSERT INTO api08_deployment_audit.steps(version, original_sha256, payload_sha256, reconciliation) VALUES (%s, %s, %s, %s)",
                    (
                        step["version"],
                        step["original_sha256"],
                        step["payload_sha256"],
                        json.dumps(step["reconciliation"]),
                    ),
                )

                if step["version"] == fail_version and fail_at == "after_ledger":
                    c.execute("SELECT 1/0")
                if step["version"] == fail_version and fail_at == "terminate_after_ledger":
                    c.execute("SELECT pg_terminate_backend(pg_backend_pid())")

            # Exact target readback after commit - full audit row including timestamp
            audit_row_db = c.execute(
                """
                SELECT version, original_sha256, payload_sha256, reconciliation, applied_at, actor, target
                FROM api08_deployment_audit.steps
                WHERE version = %s
                """,
                (step["version"],),
            ).fetchone()

            if not audit_row_db:
                raise ValueError(f"audit row missing after commit: {step['version']}")

            # Verify all audit fields including timestamp
            from datetime import datetime
            if (
                audit_row_db[:4] != (step["version"], step["original_sha256"], step["payload_sha256"], step["reconciliation"])
                or not isinstance(audit_row_db[4], datetime)
                or audit_row_db[4].tzinfo is None
                or audit_row_db[5:] != (actor, target)
            ):
                raise ValueError("invalid committed audit row")

        # Final complete readback verification
        step_versions = [s["version"] for s in steps]
        final_ledger = exact_ledger_readback(c, ["0"] + step_versions)  # Include baseline
        final_audit = exact_audit_readback(c, step_versions)

        # Verify via prefix classifier
        applied_count = prefix_classifier(baseline, steps, final_ledger, final_audit, actor, target)

        return {
            "status": "success",
            "applied": applied_count,
            "final_ledger": final_ledger,
            "final_audit": final_audit,
        }

    finally:
        if not c.closed:
            c.execute("SELECT pg_advisory_unlock(808, 20261022)")


def resume_after_ackloss(
    c: psycopg.Connection,
    steps: list[dict],
    expected_ledger: list[dict],
) -> dict[str, Any]:
    """Resume deployment after lost client ack - verify committed prefix, continue from next."""
    if not c.info.host.startswith("/"):
        raise ValueError("executor is local-only")
    if not c.info.dbname.startswith("api08_"):
        raise ValueError("disposable DB required")
    if not c.autocommit:
        raise ValueError("autocommit required")
    steps = admit_plan(steps, build_plan())

    lock = c.execute("SELECT pg_try_advisory_lock(808, 20261022)").fetchone()[0]
    if not lock:
        raise ValueError("deployment lock unavailable")

    try:
        validate_ledger_schema(c)
        # For resume, we expect audit records to already exist - don't fail on preexisting
        validate_audit_schema(c, allow_preexisting=True)

        # Read current durable state
        actual_ledger = c.execute(
            "SELECT to_jsonb(m) FROM supabase_migrations.schema_migrations m ORDER BY version"
        ).fetchall()
        actual_ledger = [x[0] for x in actual_ledger]

        actual_audit = exact_audit_readback(c, [])

        # Use prefix classifier to find exact committed prefix
        baseline = [
            {"version": r["version"], "name": r["name"], "statements": r["statements"]}
            for r in expected_ledger
        ]
        actor = c.execute("SELECT session_user").fetchone()[0]
        target = c.info.dbname

        committed = prefix_classifier(baseline, steps, actual_ledger, actual_audit, actor, target)

        if committed == len(steps):
            return {"status": "already_complete", "committed": committed}

        # Continue from the next uncommitted step
        return execute_local(c, steps, expected_ledger, allow_preexisting_audit=True)

    finally:
        if not c.closed:
            c.execute("SELECT pg_advisory_unlock(808, 20261022)")


def verify_acl_effective_before_after(c: psycopg.Connection) -> dict[str, Any]:
    """Verify ACL effective permissions before/after proposed grants/revokes.
    
    Checks that the 5 affected login roles' effective permissions on the 6 public
    functions remain unchanged after explicit grants + PUBLIC revokes.
    The private trigger function revoke is separate and doesn't affect these roles.
    """
    # This is only a transactional owner-side catalog projection, never real-login
    # authorization or membership/future-default-ACL proof.
    if not c.info.host.startswith("/") or not c.info.dbname.startswith("api08_"):
        raise ValueError("ACL probe requires local disposable database")
    if not c.autocommit:
        raise ValueError("autocommit required")
    # The 6 public functions that get explicit grants + PUBLIC revokes
    public_functions = [
        ("public.check_service_area", "(double precision, double precision)"),
        ("public.generate_operational_report", "(date, date, text)"),
        ("public.generate_sustainability_report", "(date, date)"),
        ("public.handle_new_user", "()"),
        ("public.refresh_user_engagement", "(uuid)"),
        ("public.run_daily_reports", "()"),
    ]

    # The private trigger function that gets PUBLIC revoked (separate)
    private_trigger = [
        ("private.sync_rental_transaction_from_bike_ride_history", "()"),
    ]

    affected_roles = [
        "pgbouncer",
        "supabase_auth_admin",
        "supabase_etl_admin",
        "supabase_read_only_user",
        "supabase_replication_admin",
    ]

    all_functions = public_functions + private_trigger

    # Get effective permissions BEFORE
    before = {}
    for func, sig in all_functions:
        before[f"{func}{sig}"] = {}
        for role in affected_roles:
            has_priv = c.execute(
                "SELECT has_function_privilege(%s, %s, 'EXECUTE')",
                (role, f"{func}{sig}"),
            ).fetchone()[0]
            before[f"{func}{sig}"][role] = has_priv

    # Apply proposed ACL changes in transaction (will roll back)
    with c.transaction(force_rollback=True):
        # 30 signature grants (5 roles x 6 public functions)
        for func, sig in public_functions:
            for role in affected_roles:
                c.execute(f'GRANT EXECUTE ON FUNCTION {func}{sig} TO "{role}"')

        # Grant usage on private schema
        c.execute("GRANT USAGE ON SCHEMA private TO authenticated")

        # 7 revokes (6 public + 1 private trigger)
        for func, sig in public_functions:
            c.execute(f"REVOKE EXECUTE ON FUNCTION {func}{sig} FROM PUBLIC")
        for func, sig in private_trigger:
            c.execute(f"REVOKE EXECUTE ON FUNCTION {func}{sig} FROM PUBLIC")

        # Get effective permissions AFTER
        after = {}
        for func, sig in all_functions:
            after[f"{func}{sig}"] = {}
            for role in affected_roles:
                has_priv = c.execute(
                    "SELECT has_function_privilege(%s, %s, 'EXECUTE')",
                    (role, f"{func}{sig}"),
                ).fetchone()[0]
                after[f"{func}{sig}"][role] = has_priv

        # Verify no change in effective permissions for affected roles on PUBLIC functions
        for func, sig in public_functions:
            key = f"{func}{sig}"
            for role in affected_roles:
                if before[key][role] != after[key][role]:
                    raise ValueError(
                        f"effective permission changed for {role} on {key}: "
                        f"{before[key][role]} -> {after[key][role]}"
                    )

        # For private trigger, verify affected roles never had explicit access anyway
        # (they only had it via PUBLIC which is being revoked)
        private_key = f"{private_trigger[0][0]}{private_trigger[0][1]}"
        for role in affected_roles:
            if before[private_key][role] and not after[private_key][role]:
                # This is expected - they had it via PUBLIC, now revoked
                # But they shouldn't have explicit grants, so effective access is not legitimate
                pass

    return {
        "status": "verified",
        "before": before,
        "after": after,
        "note": "effective permissions unchanged for affected roles on 6 public functions; "
        "ambient PUBLIC converted to explicit grants; private trigger PUBLIC revoked separately",
    }


if __name__ == "__main__":
    # Seal the plan for review
    steps = build_plan()
    plan_data = {"status": "sealed", "steps": steps}
    (D / "executor-plan-sealed.json").write_text(json.dumps(plan_data, indent=2))
    print(f"Sealed plan: {len(steps)} steps")
    for s in steps:
        print(f"  {s['version']} {s['file']} orig={s['original_sha256'][:16]} pay={s['payload_sha256'][:16]}")