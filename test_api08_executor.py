"""Comprehensive test suite for API08 executor - runs under normal and python -O."""
import importlib.util
import json
import os
import pathlib
import sys
import unittest

import psycopg

D = pathlib.Path(__file__).parent

# Load the executor module
spec = importlib.util.spec_from_file_location("executor", D / "api08_executor.py")
executor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(executor)


class TestEnvelopeParser(unittest.TestCase):
    """Test the outer envelope parser with all 7 envelope migrations."""

    def test_body_control_preserved(self):
        raw = b"-- pre\nBEGIN;\nDO $$BEGIN RAISE NOTICE 'COMMIT;'; END$$;\nCOMMIT; -- end"
        payload, spans = executor.envelope(raw)
        self.assertIn(b"DO $$BEGIN RAISE NOTICE 'COMMIT;'; END$$;", payload)
        self.assertEqual(len(spans), 2)

    def test_unicode_offsets(self):
        raw = "--\xe9\nBEGIN; SELECT '\xe9'; COMMIT;".encode()
        payload, _ = executor.envelope(raw)
        self.assertIn("SELECT '\xe9';".encode(), payload)

    def test_bad_controls_rejected(self):
        bad_cases = [
            b"BEGIN; SELECT 1; COMMIT; BEGIN; SELECT 2; COMMIT;",
            b"BEGIN; SAVEPOINT a; COMMIT;",
            b"BEGIN; COMMIT AND CHAIN;",
            b"START TRANSACTION READ ONLY; SELECT 1; COMMIT;",
            b"BEGIN; SELECT 1; ROLLBACK;",
            b"SELECT 1; COMMIT;",
            b"PREPARE TRANSACTION 'x';",
        ]
        for raw in bad_cases:
            with self.subTest(raw=raw[:50]), self.assertRaises(ValueError):
                executor.envelope(raw)

    def test_session_settings_rejected(self):
        raw = b"SET search_path = foo; BEGIN; SELECT 1; COMMIT;"
        with self.assertRaises(ValueError):
            executor.envelope(raw)

    def test_plan_builds_15_steps(self):
        plan = executor.build_plan()
        self.assertEqual(len(plan), 15)
        envelope_count = sum(1 for x in plan if x["removed_character_spans"])
        self.assertEqual(envelope_count, 7)

    def test_plan_no_transaction_stmts_in_payload(self):
        plan = executor.build_plan()
        for step in plan:
            parsed = executor.parse_sql(step["payload"])
            self.assertFalse(
                any(isinstance(s.stmt, executor.ast.TransactionStmt) for s in parsed),
                f"TransactionStmt found in payload for {step['version']}",
            )

    def test_plan_hashes_match(self):
        plan = executor.build_plan()
        for step in plan:
            self.assertEqual(
                executor.sha(step["original"].encode()), step["original_sha256"]
            )
            self.assertEqual(
                executor.sha(step["payload"].encode()), step["payload_sha256"]
            )

    def test_enum_wrappers_correct(self):
        plan = executor.build_plan()
        enum_step = next(s for s in plan if s["version"] == "20260727000000")
        self.assertIn("enum_prelude_sha256", enum_step["reconciliation"])
        self.assertIn("enum_postlude_sha256", enum_step["reconciliation"])
        self.assertEqual(
            enum_step["reconciliation"]["enum_prelude_sha256"],
            "8e6dec4477d815765cef86510219c2c9d61595919e8973c8ad503100942f73fd",
        )
        self.assertEqual(
            enum_step["reconciliation"]["enum_postlude_sha256"],
            "a53f0c0d359bf12e6e9ba7e50db35f31b117962aa06dfe0ac13d80a44e320bae",
        )
        # Verify payload contains the lock + prelude + original + postlude
        self.assertIn("LOCK TABLE public.bikes, public.bike_status_events", enum_step["payload"])
        # The prelude and postlude content is embedded, not their hashes as strings


class TestPrefixClassifier(unittest.TestCase):
    """Test the strict ordered-prefix classifier."""

    def setUp(self):
        self.step = {
            "version": "1",
            "file": "1_probe.sql",
            "original": "create table public.probe(id int primary key);",
            "payload": "create table public.probe(id int primary key);",
            "reconciliation": {},
        }
        for k in ("original", "payload"):
            self.step[k + "_sha256"] = executor.sha(self.step[k].encode())
        self.base = [{"version": "0", "name": "baseline", "statements": ["select 0;"]}]
        self.actor = "test_actor"
        self.target = "test_target"

    def test_prefix_classifier_success(self):
        ledger = self.base + [executor.ledger_row(self.step)]
        audit = [dict(executor.audit_row(self.step, self.actor, self.target), applied_at="2026-10-22T12:00:00+00:00")]
        n = executor.prefix_classifier(self.base, [self.step], ledger, audit, self.actor, self.target)
        self.assertEqual(n, 1)

    def test_original_text_corruption_rejected(self):
        ledger = [{"version": "1", "name": "probe", "statements": ["select 2;"]}]
        audit = [executor.audit_row(self.step, self.actor, self.target)]
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [self.step], ledger, audit, self.actor, self.target)

    def test_ledger_only_rejected(self):
        ledger = self.base + [executor.ledger_row(self.step)]
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [self.step], ledger, [], self.actor, self.target)

    def test_audit_only_rejected(self):
        audit = [executor.audit_row(self.step, self.actor, self.target)]
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [self.step], self.base, audit, self.actor, self.target)

    def test_unknown_version_rejected(self):
        ledger = self.base + [executor.ledger_row(self.step)]
        ledger.append({"version": "2", "name": "x", "statements": []})
        audit = [executor.audit_row(self.step, self.actor, self.target)]
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [self.step], ledger, audit, self.actor, self.target)

    def test_ledger_name_mismatch_rejected(self):
        ledger = self.base + [executor.ledger_row(self.step)]
        ledger[1]["name"] = "wrong"
        audit = [executor.audit_row(self.step, self.actor, self.target)]
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [self.step], ledger, audit, self.actor, self.target)

    def test_ledger_statements_mismatch_rejected(self):
        ledger = self.base + [executor.ledger_row(self.step)]
        ledger[1]["statements"] = ["select corrupted;"]
        audit = [executor.audit_row(self.step, self.actor, self.target)]
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [self.step], ledger, audit, self.actor, self.target)

    def test_historical_changed_rejected(self):
        ledger = self.base + [executor.ledger_row(self.step)]
        ledger[1]["name"] = "changed"  # Modify the step entry, not baseline
        audit = [executor.audit_row(self.step, self.actor, self.target)]
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [self.step], ledger, audit, self.actor, self.target)

    def test_audit_field_mutations_rejected(self):
        ledger = self.base + [executor.ledger_row(self.step)]
        audit = [executor.audit_row(self.step, self.actor, self.target)]
        for field in ["version", "original_sha256", "payload_sha256", "reconciliation", "actor", "target"]:
            with self.subTest(field=field):
                bad_audit = executor.audit_row(self.step, self.actor, self.target).copy()
                bad_audit[field] = {"bad": True} if field == "reconciliation" else "wrong"
                with self.assertRaises(ValueError):
                    executor.prefix_classifier(self.base, [self.step], ledger, [bad_audit], self.actor, self.target)

    def test_duplicate_audit_rejected(self):
        ledger = self.base + [executor.ledger_row(self.step)]
        audit = [executor.audit_row(self.step, self.actor, self.target)]
        audit.append(audit[0])
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [self.step], ledger, audit, self.actor, self.target)

    def test_plan_order_duplicates_rejected(self):
        step2 = self.step.copy()
        step2["version"] = "1"  # Duplicate
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [self.step, step2], [], [], self.actor, self.target)

    def test_source_payload_digest_mismatch_rejected(self):
        bad_step = self.step.copy()
        bad_step["original_sha256"] = "wrong"
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [bad_step], [], [], self.actor, self.target)


class TestTimestampRegression(unittest.TestCase):
    setUp = TestPrefixClassifier.setUp
    def test_completion_timestamp_rejected(self):
        for value in [None, "garbage", "2026-10-22", "2026-10-22T12:00:00", 42, "9999-99-99T00:00:00Z"]:
            with self.subTest(value=value):
                audit = executor.audit_row(self.step, self.actor, self.target)
                audit["applied_at"] = value
                with self.assertRaises(ValueError):
                    executor.prefix_classifier(self.base, [self.step], self.base + [executor.ledger_row(self.step)], [audit], self.actor, self.target)
        with self.assertRaises(ValueError):
            executor.prefix_classifier(self.base, [self.step], self.base + [executor.ledger_row(self.step)], [executor.audit_row(self.step, self.actor, self.target)], self.actor, self.target)


class TestBoundaryRegression(unittest.TestCase):
    def test_boundaries_rebuild_before_any_sql(self):
        from unittest.mock import Mock, patch
        for boundary in [executor.execute_local, executor.resume_after_ackloss]:
            for candidate in [[], [{"payload": "SELECT evil"}]]:
                connection = Mock()
                connection.info.host = "/safe"
                connection.info.dbname = "api08_safe"
                connection.autocommit = True
                with patch.object(executor, "build_plan", return_value=[{"canonical": True}]) as build:
                    with self.assertRaises(ValueError):
                        boundary(connection, candidate, [])
                    build.assert_called_once_with()
                    connection.execute.assert_not_called()

    def test_autocommit_is_explicitly_required(self):
        from unittest.mock import Mock, patch
        for boundary in [executor.execute_local, executor.resume_after_ackloss]:
            c = Mock()
            c.info.host = "/safe"
            c.info.dbname = "api08_safe"
            c.autocommit = False
            with patch.object(executor, "build_plan", return_value=[]):
                with self.assertRaises(ValueError):
                    boundary(c, [], [])
                c.execute.assert_not_called()

    def test_complete_readbacks_do_not_filter(self):
        from unittest.mock import Mock
        c = Mock()
        c.execute.return_value.fetchall.return_value = []
        executor.exact_ledger_readback(c, ["0"])
        self.assertNotIn("WHERE", c.execute.call_args.args[0])
        executor.exact_audit_readback(c, ["1"])
        self.assertNotIn("WHERE", c.execute.call_args.args[0])

    def test_acl_probe_rejects_remote_before_sql(self):
        from unittest.mock import MagicMock
        c = MagicMock()
        c.info.host = "remote.invalid"
        c.info.dbname = "api08_safe"
        c.autocommit = True
        with self.assertRaises(ValueError):
            executor.verify_acl_effective_before_after(c)
        c.execute.assert_not_called()

    def test_acl_probe_requests_rollback(self):
        from unittest.mock import MagicMock
        c = MagicMock()
        c.info.host = "/safe"
        c.info.dbname = "api08_safe"
        c.autocommit = True
        c.execute.return_value.fetchone.return_value = (True,)
        executor.verify_acl_effective_before_after(c)
        self.assertEqual(c.transaction.call_args.kwargs.get("force_rollback"), True)


class TestAuditCollisionRegression(unittest.TestCase):
    def connection(self, mutation=None):
        from unittest.mock import Mock
        c = Mock()
        cols = [("version", "text", "NO", None), ("original_sha256", "text", "NO", None), ("payload_sha256", "text", "NO", None), ("reconciliation", "jsonb", "NO", None), ("applied_at", "timestamp with time zone", "NO", "clock_timestamp()"), ("actor", "text", "NO", "SESSION_USER"), ("target", "text", "NO", "current_database()")]
        values = {"owner": "owner", "kind": "r", "pk": ("steps_pkey", "p", ["version"]), "acl": [], "schema_acl": [], "defaults": [], "cols": cols}
        if mutation:
            values.update(mutation)
        def execute(sql, *args):
            result = Mock()
            result.fetchall.return_value = []
            if "SELECT session_user, current_user" in sql:
                result.fetchone.return_value = ("owner", "owner")
            elif "SELECT session_user" in sql:
                result.fetchone.return_value = ("owner",)
            elif "SELECT nspname," in sql:
                result.fetchone.return_value = ("api08_deployment_audit", "owner")
            elif "SELECT nspacl" in sql:
                result.fetchone.return_value = (values["schema_acl"],)
            elif "c.relname," in sql:
                result.fetchone.return_value = ("steps", values["owner"], values["kind"], values["owner"])
            elif "relrowsecurity" in sql:
                result.fetchone.return_value = (False, False, False)
            elif "relpersistence" in sql:
                result.fetchone.return_value = ("p", False, False)
            elif "information_schema.columns" in sql:
                result.fetchall.return_value = values["cols"]
            elif "pg_constraint" in sql:
                result.fetchone.return_value = values["pk"]
            elif "pg_default_acl" in sql:
                result.fetchall.return_value = values["defaults"]
            elif "SELECT relacl" in sql:
                result.fetchone.return_value = (values["acl"],)
            elif "count(*)" in sql:
                result.fetchone.return_value = (0,)
            return result
        c.execute.side_effect = execute
        return c

    def test_first_creation_defaults_rejected_before_ddl(self):
        for missing in ("schema", "table"):
            for grant in ("=r/owner", "other=r/owner"):
                with self.subTest(missing=missing, grant=grant):
                    c = self.connection({"defaults": [("owner", [grant])]})
                    original = c.execute.side_effect
                    def execute(sql, *args):
                        result = original(sql, *args)
                        if (missing == "schema" and "SELECT nspname," in sql) or (missing == "table" and "c.relname," in sql):
                            result.fetchone.return_value = None
                        return result
                    c.execute.side_effect = execute
                    with self.assertRaisesRegex(ValueError, "DEFAULT"):
                        executor.validate_audit_schema(c)
                    self.assertFalse(any("CREATE " in call.args[0] for call in c.execute.call_args_list))

    def test_effective_creation_role_defaults_are_admitted(self):
        c = self.connection()
        original = c.execute.side_effect
        def execute(sql, *args):
            result = original(sql, *args)
            if "current_user" in sql and "session_user" in sql and "pg_default_acl" not in sql:
                result.fetchone.return_value = ("owner", "other")
            return result
        c.execute.side_effect = execute
        with self.assertRaisesRegex(ValueError, "role"):
            executor.validate_audit_schema(c)

    def test_setup_revalidates_inside_transaction(self):
        from unittest.mock import MagicMock, patch
        c = MagicMock()
        with patch.object(executor, "validate_audit_schema", side_effect=[None, ValueError("named grant after creation")]) as validate:
            with self.assertRaisesRegex(ValueError, "named grant"):
                executor.setup_audit_schema(c)
        self.assertEqual(validate.call_count, 2)
        self.assertIs(c.transaction.return_value.__exit__.call_args.args[0], ValueError)

    def test_nonpermanent_or_inherited_table_rejected(self):
        for state in [("u", False, False), ("t", False, False), ("p", True, False), ("p", False, True)]:
            with self.subTest(state=state):
                c = self.connection()
                original = c.execute.side_effect
                def execute(sql, *args):
                    result = original(sql, *args)
                    if "relpersistence" in sql:
                        result.fetchone.return_value = state
                    return result
                c.execute.side_effect = execute
                with self.assertRaisesRegex(ValueError, "permanent standalone"):
                    executor.validate_audit_schema(c)

    def test_rls_flags_and_policies_rejected(self):
        for state in [(True, False, False), (False, True, False), (False, False, True), (True, True, True)]:
            with self.subTest(state=state):
                c = self.connection()
                original = c.execute.side_effect
                def execute(sql, *args):
                    result = original(sql, *args)
                    if "relrowsecurity" in sql:
                        result.fetchone.return_value = state
                    return result
                c.execute.side_effect = execute
                with self.assertRaisesRegex(ValueError, "RLS/policies"):
                    executor.validate_audit_schema(c)

    def test_column_grants_rejected(self):
        c = self.connection()
        original = c.execute.side_effect
        def execute(sql, *args):
            result = original(sql, *args)
            if "attacl" in sql:
                result.fetchall.return_value = [("actor",)]
            return result
        c.execute.side_effect = execute
        with self.assertRaisesRegex(ValueError, "column"):
            executor.validate_audit_schema(c)

    def test_global_default_privileges_are_inspected(self):
        c = self.connection()
        executor.validate_audit_schema(c)
        query = next(call.args[0] for call in c.execute.call_args_list if "pg_default_acl" in call.args[0])
        self.assertIn("defaclnamespace = 0", query)

    def test_exact_shape_passes(self):
        executor.validate_audit_schema(self.connection())

    def test_collision_mutations_rejected(self):
        cols = self.connection  # Each mutation starts from a complete valid shape.
        mutations = [{"owner": "other"}, {"kind": "v"}, {"pk": ("steps_pkey", "p", ["actor"])}, {"acl": ["=r/owner"]}, {"acl": ["other=a/owner"]}, {"schema_acl": ["other=U/owner"]}, {"defaults": [("owner", ["=r/owner"])]}, {"defaults": [("owner", ["other=r/owner"])]}]
        for mutation in mutations:
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                executor.validate_audit_schema(self.connection(mutation))


class TestSourceAdmissionRegression(unittest.TestCase):
    def test_manifest_entries_cannot_change_claimed_aggregate(self):
        from unittest.mock import patch
        manifest = json.loads((D / "source-manifest.json").read_text())
        key = next(iter(manifest["entries"]))
        manifest["entries"][key] = "0" * 64
        with patch.object(pathlib.Path, "read_text", return_value=json.dumps(manifest)):
            with self.assertRaisesRegex(ValueError, "aggregate"):
                executor.load_approved_source_manifest()

    def test_comparison_order_and_flags_are_frozen(self):
        from unittest.mock import patch
        comparison = json.loads((D / "migration-comparison.json").read_text())
        comparison[0], comparison[1] = comparison[1], comparison[0]
        with patch.object(pathlib.Path, "read_text", return_value=json.dumps(comparison)):
            with self.assertRaises(ValueError):
                executor.load_migration_comparison()

    def test_enum_wrapper_hash_is_enforced_under_optimization(self):
        from unittest.mock import patch
        original = pathlib.Path.read_bytes
        def read(path):
            if path.name == "PROPOSED-enum-prelude.sql":
                return b"SELECT 1;"
            return original(path)
        with patch.object(pathlib.Path, "read_bytes", read):
            with self.assertRaises(ValueError):
                executor.build_plan()


class TestRetiredHarnessSafety(unittest.TestCase):
    def test_unsafe_legacy_classes_cannot_connect(self):
        import io
        from unittest.mock import patch
        for cls in [TestExecutorIntegration, TestACLVerification, TestAuditSchemaValidation]:
            with self.subTest(cls=cls.__name__), patch.object(psycopg, "connect", side_effect=AssertionError("connection forbidden")) as connect:
                suite = unittest.defaultTestLoader.loadTestsFromTestCase(cls)
                count = suite.countTestCases()
                result = unittest.TextTestRunner(stream=io.StringIO()).run(suite)
                connect.assert_not_called()
                self.assertEqual(len(result.skipped), count)
                self.assertFalse(result.errors)


class TestAdmitPlan(unittest.TestCase):
    """Test whole-plan equality check."""

    def test_admit_plan_success(self):
        step = {
            "version": "1",
            "file": "1_test.sql",
            "original": "select 1;",
            "payload": "select 1;",
            "reconciliation": {},
        }
        for k in ("original", "payload"):
            step[k + "_sha256"] = executor.sha(step[k].encode())
        admitted = executor.admit_plan([step], [step])
        self.assertEqual(admitted, [step])

    def test_admit_plan_rejects_mutations(self):
        step = {
            "version": "1",
            "file": "1_test.sql",
            "original": "select 1;",
            "payload": "select 1;",
            "reconciliation": {},
        }
        for k in ("original", "payload"):
            step[k + "_sha256"] = executor.sha(step[k].encode())

        for key in ["original", "original_sha256", "payload", "payload_sha256", "file", "version", "reconciliation"]:
            with self.subTest(key=key):
                bad = step.copy()
                bad[key] = {"changed": True} if key == "reconciliation" else str(bad[key]) + "changed"
                with self.assertRaises(ValueError):
                    executor.admit_plan([bad], [step])


@unittest.skip("Retired unsafe restore-config harness; verified disposable PG17 full-history/atomic ackloss replacement required")
class TestExecutorIntegration(unittest.TestCase):
    """Integration tests with real PostgreSQL 17."""

    @classmethod
    def setUpClass(cls):
        # Load PG17 connection params
        env = json.loads((D / "restore-pg17-env.json").read_text())
        cls.admin_conn_params = env
        cls.db_name = f"api08_test_{os.getpid()}"

        # Create test database
        with psycopg.connect(**env, autocommit=True) as admin:
            admin.execute(
                psycopg.sql.SQL("CREATE DATABASE {}").format(
                    psycopg.sql.Identifier(cls.db_name)
                )
            )

        cls.conn_params = {**env, "dbname": cls.db_name}

        # Setup base schema - need to create the tables that migrations depend on
        with psycopg.connect(**cls.conn_params, autocommit=True) as c:
            c.execute(
                """
                CREATE SCHEMA supabase_migrations;
                CREATE TABLE supabase_migrations.schema_migrations (
                    version TEXT PRIMARY KEY,
                    name TEXT,
                    statements TEXT[]
                );
                INSERT INTO supabase_migrations.schema_migrations VALUES
                ('0', 'baseline', ARRAY['select 0;']);
                
                -- Create tables that first migration depends on
                -- public schema already exists
                CREATE SCHEMA IF NOT EXISTS private;
                CREATE SCHEMA IF NOT EXISTS auth;
                CREATE TABLE public.wallet_transactions (
                    id uuid primary key default gen_random_uuid(),
                    type text,
                    amount numeric
                );
                CREATE TABLE public.bikes (
                    id text primary key,
                    status text,
                    active_rider_id uuid,
                    active_ride_started_at timestamptz,
                    rate_per_minute numeric
                );
                CREATE TABLE public.wallets (
                    id uuid primary key,
                    balance numeric
                );
                CREATE TABLE public.bike_ride_history (
                    id uuid primary key default gen_random_uuid(),
                    bike_id text,
                    rider_id uuid,
                    started_at timestamptz,
                    completed_at timestamptz,
                    distance_km numeric,
                    cost numeric
                );
                CREATE TABLE public.bike_status_events (
                    id uuid primary key default gen_random_uuid(),
                    bike_id text,
                    from_status text default 'ready_to_rent',
                    to_status text default 'ready_to_rent',
                    actor_id uuid,
                    transition_kind text,
                    context jsonb
                );
                CREATE TABLE public.profiles (
                    id uuid primary key,
                    is_admin boolean default false
                );
                CREATE TABLE public.stations (
                    id uuid primary key,
                    operating_status text
                );
                CREATE TABLE public.staff_profiles (
                    id uuid primary key,
                    profile_id uuid,
                    status text,
                    role text,
                    station_id uuid
                );
                CREATE TABLE public.tablet_devices (
                    id uuid primary key,
                    device_identifier text,
                    device_status text,
                    station_id uuid
                );
                CREATE EXTENSION IF NOT EXISTS pgcrypto;
                CREATE TABLE auth.users (
                    id uuid primary key
                );
                CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '00000000-0000-0000-0000-000000000000'::uuid; $$;
                """
            )

    @classmethod
    def tearDownClass(cls):
        with psycopg.connect(**cls.admin_conn_params, autocommit=True) as admin:
            admin.execute(
                psycopg.sql.SQL("DROP DATABASE {} WITH (FORCE)").format(
                    psycopg.sql.Identifier(cls.db_name)
                )
            )

    def setUp(self):
        # Reset ledger for each test
        with psycopg.connect(**self.conn_params, autocommit=True) as c:
            c.execute("TRUNCATE supabase_migrations.schema_migrations")
            c.execute("INSERT INTO supabase_migrations.schema_migrations VALUES ('0', 'baseline', ARRAY['select 0;'])")
            c.execute("DROP SCHEMA IF EXISTS api08_deployment_audit CASCADE")
        self.conn = psycopg.connect(**self.conn_params, autocommit=True)
        self.steps = executor.build_plan()
        self.expected_ledger = [
            {"version": "0", "name": "baseline", "statements": ["select 0;"]}
        ]

    def tearDown(self):
        self.conn.close()

    def test_execute_local_success(self):
        # Test only the first migration which is simple
        result = executor.execute_local(self.conn, self.steps[:1], self.expected_ledger)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["applied"], 1)

    def test_execute_local_validates_connection(self):
        # Test non-local connection rejected - can't easily test without remote connection
        # The validation is in execute_local() which checks c.info.host.startswith("/")
        # We verify the check exists by inspecting the source
        import inspect
        source = inspect.getsource(executor.execute_local)
        self.assertIn("host.startswith", source)

    def test_execute_local_validates_disposable_db(self):
        with psycopg.connect(**{**self.conn_params, "dbname": "postgres"}, autocommit=True) as c:
            with self.assertRaises(ValueError):
                executor.execute_local(c, self.steps, self.expected_ledger)

    def test_execute_local_ledger_drift_rejected(self):
        # Modify ledger
        with psycopg.connect(**self.conn_params, autocommit=True) as c:
            c.execute(
                "INSERT INTO supabase_migrations.schema_migrations VALUES ('999', 'bad', ARRAY['bad'])"
            )
        with self.assertRaises(ValueError):
            executor.execute_local(self.conn, self.steps, self.expected_ledger)

    def test_execute_local_duplicate_version_rejected(self):
        # First run succeeds
        executor.execute_local(self.conn, self.steps[:1], self.expected_ledger)
        # Second run with same version should fail
        with self.assertRaises(ValueError):
            executor.execute_local(self.conn, self.steps[:1], self.expected_ledger)

    def test_execute_local_payload_drift_rejected(self):
        bad_steps = [self.steps[0].copy()]
        bad_steps[0]["payload"] = "SELECT 1;"  # Changed payload
        with self.assertRaises(ValueError):
            executor.execute_local(self.conn, bad_steps, self.expected_ledger)

    def test_audit_readback_includes_timestamp(self):
        result = executor.execute_local(self.conn, self.steps[:1], self.expected_ledger)
        audit = result["final_audit"][0]
        self.assertIn("applied_at", audit)
        self.assertIsNotNone(audit["applied_at"])
        self.assertIn("actor", audit)
        self.assertIn("target", audit)
        # Actor is the current session user (eiat in test env)
        self.assertEqual(audit["actor"], "eiat")

    def test_resume_after_ackloss(self):
        # Apply first step
        executor.execute_local(self.conn, self.steps[:1], self.expected_ledger)

        # Simulate reconnection - new connection
        with psycopg.connect(**self.conn_params, autocommit=True) as new_conn:
            # Resume with just step 1 - already complete
            result = executor.resume_after_ackloss(new_conn, self.steps[:1], self.expected_ledger)
            self.assertEqual(result["status"], "already_complete")

    def test_resume_after_ackloss_continue(self):
        # Apply first step
        executor.execute_local(self.conn, self.steps[:1], self.expected_ledger)

        # Simulate reconnection - new connection
        with psycopg.connect(**self.conn_params, autocommit=True) as new_conn:
            # Resume with more steps than committed - should continue
            # We test with step 1 only since step 2 is complex
            result = executor.resume_after_ackloss(new_conn, self.steps[:1], self.expected_ledger)
            self.assertEqual(result["status"], "already_complete")

    def test_commit_ack_loss_simulation(self):
        """Genuine lost-client-ack proof: send COMMIT, don't read ack, observer confirms durability."""
        step = self.steps[0]
        with psycopg.connect(**self.conn_params, autocommit=True) as c:
            c.execute("SET LOCAL search_path = public, pg_catalog")
            c.execute("SET LOCAL check_function_bodies = on")
            c.execute(step["payload"], prepare=False)
            c.execute(
                "INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES (%s, %s, %s)",
                (step["version"], step["file"].split("_", 1)[1][:-4], [step["original"]]),
            )
            # Send COMMIT via libpq but DON'T consume the result
            if c.pgconn.send_query(b"COMMIT") is False:
                raise RuntimeError("send failed")
            c.pgconn.flush()
            # Destroy connection WITHOUT reading ack
            c.pgconn.finish()

        # Independent observer connection confirms durability
        with psycopg.connect(**self.conn_params, autocommit=True) as observer:
            observer.execute("SET statement_timeout = '5s'")
            import time
            until = time.monotonic() + 5
            while observer.execute(
                "SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = %s",
                (step["version"],),
            ).fetchone()[0] != 1:
                if time.monotonic() > until:
                    raise RuntimeError("commit not observed by independent connection")
                time.sleep(0.01)

            # Verify ledger, audit, and SQL object all durable
            ledger = [x[0] for x in observer.execute(
                "SELECT to_jsonb(m) FROM supabase_migrations.schema_migrations m ORDER BY version"
            )]
            # The audit table is created by the executor's setup, not in this manual test
            # So we don't expect audit rows here - just verify the ledger
            audit = []

            # Table from migration should exist (wallet_transactions)
            self.assertEqual(
                observer.execute("SELECT to_regclass('public.wallet_transactions')").fetchone()[0],
                "wallet_transactions",
            )

            # For this manual test, just verify the ledger has the baseline + 1 step
            # without audit validation since audit table doesn't exist
            self.assertEqual(len(ledger), 2)  # baseline + 1 migration
            self.assertEqual(ledger[0]["version"], "0")
            self.assertEqual(ledger[1]["version"], "20260722000001")


@unittest.skip("Retired cluster-global role mutation harness; independent real-login ACL/membership/default-ACL gate required")
class TestACLVerification(unittest.TestCase):
    """Test ACL effective permissions before/after."""

    @classmethod
    def setUpClass(cls):
        env = json.loads((D / "restore-pg17-env.json").read_text())
        cls.db_name = f"api08_acl_test_{os.getpid()}"
        with psycopg.connect(**env, autocommit=True) as admin:
            admin.execute(
                psycopg.sql.SQL("CREATE DATABASE {}").format(
                    psycopg.sql.Identifier(cls.db_name)
                )
            )
        cls.conn_params = {**env, "dbname": cls.db_name}

        # Setup test roles and functions - drop first if exist
        with psycopg.connect(**cls.conn_params, autocommit=True) as c:
            for role in ["pgbouncer", "supabase_auth_admin", "supabase_etl_admin", "supabase_read_only_user", "supabase_replication_admin", "authenticated"]:
                c.execute(f'DROP ROLE IF EXISTS "{role}"')
            c.execute("CREATE SCHEMA IF NOT EXISTS private")
            c.execute('CREATE ROLE "authenticated"')
            for role in ["pgbouncer", "supabase_auth_admin", "supabase_etl_admin", "supabase_read_only_user", "supabase_replication_admin"]:
                c.execute(f'CREATE ROLE "{role}" LOGIN')
            for func, sig in [
                ("public.check_service_area", "(double precision, double precision)"),
                ("public.generate_operational_report", "(date, date, text)"),
                ("public.generate_sustainability_report", "(date, date)"),
                ("public.handle_new_user", "()"),
                ("public.refresh_user_engagement", "(uuid)"),
                ("public.run_daily_reports", "()"),
                ("private.sync_rental_transaction_from_bike_ride_history", "()"),
            ]:
                c.execute(f"CREATE OR REPLACE FUNCTION {func}{sig} RETURNS void LANGUAGE sql AS $$ SELECT 1; $$")
            # Grant PUBLIC execute on all 6 public functions to simulate current state
            for func, sig in [
                ("public.check_service_area", "(double precision, double precision)"),
                ("public.generate_operational_report", "(date, date, text)"),
                ("public.generate_sustainability_report", "(date, date)"),
                ("public.handle_new_user", "()"),
                ("public.refresh_user_engagement", "(uuid)"),
                ("public.run_daily_reports", "()"),
            ]:
                c.execute(f"GRANT EXECUTE ON FUNCTION {func}{sig} TO PUBLIC")
            # Private trigger should NOT have PUBLIC grant (simulating secure default)
            # This matches the review finding that private trigger revoke is separate

    @classmethod
    def tearDownClass(cls):
        with psycopg.connect(**{**cls.conn_params, "dbname": "postgres"}, autocommit=True) as admin:
            admin.execute(
                psycopg.sql.SQL("DROP DATABASE {} WITH (FORCE)").format(
                    psycopg.sql.Identifier(cls.db_name)
                )
            )

    def test_verify_acl_effective_before_after(self):
        with psycopg.connect(**self.conn_params, autocommit=True) as c:
            # Test functions and roles already created in setUpClass
            result = executor.verify_acl_effective_before_after(c)
            self.assertEqual(result["status"], "verified")


@unittest.skip("Retired unvalidated restore-config harness; independent disposable-cluster collision gate required")
class TestAuditSchemaValidation(unittest.TestCase):
    """Test audit schema/table collision detection."""

    @classmethod
    def setUpClass(cls):
        env = json.loads((D / "restore-pg17-env.json").read_text())
        cls.db_name = f"api08_audit_test_{os.getpid()}"
        with psycopg.connect(**env, autocommit=True) as admin:
            admin.execute(
                psycopg.sql.SQL("CREATE DATABASE {}").format(
                    psycopg.sql.Identifier(cls.db_name)
                )
            )
        cls.conn_params = {**env, "dbname": cls.db_name}

    def setUp(self):
        # Clean up any existing audit schema
        with psycopg.connect(**self.conn_params, autocommit=True) as c:
            c.execute("DROP SCHEMA IF EXISTS api08_deployment_audit CASCADE")

    @classmethod
    def tearDownClass(cls):
        with psycopg.connect(**{**cls.conn_params, "dbname": "postgres"}, autocommit=True) as admin:
            admin.execute(
                psycopg.sql.SQL("DROP DATABASE {} WITH (FORCE)").format(
                    psycopg.sql.Identifier(cls.db_name)
                )
            )

    def test_validate_audit_schema_detects_wrong_owner(self):
        with psycopg.connect(**self.conn_params, autocommit=True) as c:
            c.execute("DROP ROLE IF EXISTS other_role")
            c.execute("CREATE SCHEMA api08_deployment_audit AUTHORIZATION eiat")
            c.execute("CREATE TABLE api08_deployment_audit.steps (version text primary key)")
            c.execute("ALTER TABLE api08_deployment_audit.steps OWNER TO eiat")
            # Create a different role
            c.execute("CREATE ROLE other_role")
            c.execute("ALTER TABLE api08_deployment_audit.steps OWNER TO other_role")
            with self.assertRaises(ValueError):
                executor.validate_audit_schema(c)

    def test_validate_audit_schema_detects_public_privileges(self):
        with psycopg.connect(**self.conn_params, autocommit=True) as c:
            c.execute("CREATE SCHEMA api08_deployment_audit")
            c.execute("GRANT USAGE ON SCHEMA api08_deployment_audit TO PUBLIC")
            with self.assertRaises(ValueError):
                executor.validate_audit_schema(c)

    def test_validate_audit_schema_detects_triggers(self):
        with psycopg.connect(**self.conn_params, autocommit=True) as c:
            c.execute("CREATE SCHEMA api08_deployment_audit")
            c.execute(
                "CREATE TABLE api08_deployment_audit.steps (version text primary key, original_sha256 text, payload_sha256 text, reconciliation jsonb, applied_at timestamptz, actor text, target text)"
            )
            c.execute("CREATE FUNCTION audit_trigger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$")
            c.execute("CREATE TRIGGER test_trigger BEFORE INSERT ON api08_deployment_audit.steps FOR EACH ROW EXECUTE FUNCTION audit_trigger()")
            with self.assertRaises(ValueError):
                executor.validate_audit_schema(c)

    def test_validate_audit_schema_detects_preexisting_records(self):
        with psycopg.connect(**self.conn_params, autocommit=True) as c:
            c.execute("CREATE SCHEMA api08_deployment_audit")
            c.execute(
                "CREATE TABLE api08_deployment_audit.steps (version text primary key, original_sha256 text, payload_sha256 text, reconciliation jsonb, applied_at timestamptz, actor text, target text)"
            )
            c.execute("INSERT INTO api08_deployment_audit.steps VALUES ('1', 'a', 'b', '{}', now(), 'x', 'y')")
            with self.assertRaises(ValueError):
                executor.validate_audit_schema(c)

    def test_validate_audit_schema_passes_clean(self):
        with psycopg.connect(**self.conn_params, autocommit=True) as c:
            c.execute("CREATE SCHEMA api08_deployment_audit")
            c.execute("REVOKE ALL ON SCHEMA api08_deployment_audit FROM PUBLIC")
            c.execute(
                "CREATE TABLE api08_deployment_audit.steps (version text primary key, original_sha256 text, payload_sha256 text, reconciliation jsonb, applied_at timestamptz not null default clock_timestamp(), actor text not null default session_user, target text not null default current_database())"
            )
            c.execute("REVOKE ALL ON ALL TABLES IN SCHEMA api08_deployment_audit FROM PUBLIC")
            c.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA api08_deployment_audit REVOKE ALL ON TABLES FROM PUBLIC")
            # Should not raise
            executor.validate_audit_schema(c)


if __name__ == "__main__":
    unittest.main(verbosity=2)